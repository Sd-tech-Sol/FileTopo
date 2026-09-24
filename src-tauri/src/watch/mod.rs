//! Automatic watching — `F-030`, `TASK-0043`, `DEC-0041`.
//!
//! **An operating-system event is a hint, never the truth.** The pipeline is
//!
//! `OS reader -> bounded hints -> coalesce -> W-B / W-C -> UpdateBatch -> apply_update_batch`
//!
//! and the change journal is produced *after* a re-enumeration and a canonical
//! comparison, never from an event. The reader ([`backend`], [`native`]) cannot touch
//! SQLite or say what happened — its output type has no room for either. The worker
//! ([`worker`]) is the only thing that lets the Index move, and it does so through the
//! same pipeline, and under the same write lock, as the manual **Actualiser**.
//!
//! What lives here:
//!
//! * [`types`] — the closed vocabulary (`WatchStatus` and friends): no path, no name, no
//!   key, no identity, no OS text can be expressed in it;
//! * [`queue`] — the bounded queue: a full queue is an explicit **loss**, never a drop;
//! * [`parser`] — the defensive notification parser and the confinement of names;
//! * [`coalesce`] — a burst becomes a set of candidate directories or a full verification;
//! * [`backend`] / [`native`] — the OS seam, and `ReadDirectoryChangesExW` behind it;
//! * [`worker`] — the reconciler loop (initial verification, calm window, root guard,
//!   periodic fallback);
//! * [`WatchManager`] — one process-wide owner, one worker per watched brain.
//!
//! Only `REAL_ROOT` brains that already have an Index are watched, and a watcher is
//! **backend-owned**: nothing in the interface starts one.

pub(crate) mod backend;
pub(crate) mod coalesce;
#[cfg(windows)]
pub(crate) mod native;
pub(crate) mod parser;
pub(crate) mod queue;
pub mod types;
pub(crate) mod worker;

#[cfg(test)]
mod tests;

use crate::map::brains::{BrainCatalog, BrainRecord, SourceKind};
use crate::map::sandbox::SandboxPaths;
use crate::map::watch_ops;
use backend::WatchBackend;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};
pub use types::{WatchConfig, WatchMetrics, WatchMode, WatchState, WatchStatus};
use worker::{BrainShared, Machine};

/// A proof's callback at the named points of the worker loop.
#[cfg(test)]
pub(crate) type TestHook = Arc<dyn Fn(&'static str) + Send + Sync>;

/// Receives every status change. Called from the worker thread, outside any lock.
pub type Notifier = Arc<dyn Fn(&WatchStatus) + Send + Sync>;

pub(crate) struct ManagerInner {
    pub(crate) paths: SandboxPaths,
    pub(crate) config: WatchConfig,
    pub(crate) backend: Arc<dyn WatchBackend>,
    pub(crate) notifier: Notifier,
    /// Strictly increasing across every brain and every restart of a watcher, so an
    /// interface that keeps the highest value it saw can ignore a late, older event.
    pub(crate) sequence: AtomicU64,
    /// A proof's window into the worker loop (see `Machine::hook`).
    #[cfg(test)]
    pub(crate) hook: Mutex<Option<TestHook>>,
}

struct Entry {
    shared: Arc<BrainShared>,
    join: Option<JoinHandle<()>>,
}

/// The process-wide owner of the watchers. Idempotent to start, stop and ask.
pub struct WatchManager {
    inner: Arc<ManagerInner>,
    watchers: Mutex<HashMap<String, Entry>>,
}

impl WatchManager {
    pub(crate) fn new(
        paths: SandboxPaths,
        config: WatchConfig,
        backend: Arc<dyn WatchBackend>,
        notifier: Notifier,
    ) -> Self {
        Self {
            inner: Arc::new(ManagerInner {
                paths,
                config,
                backend,
                notifier,
                sequence: AtomicU64::new(0),
                #[cfg(test)]
                hook: Mutex::new(None),
            }),
            watchers: Mutex::new(HashMap::new()),
        }
    }

    /// The product manager: the native backend, the product cadences.
    ///
    /// A **development** build (never a release one — the same rule as the sandbox
    /// variant) may shorten the cadences or force the periodic fallback so a proof does
    /// not have to wait five real seconds or find a file system without the native
    /// mechanism: `FILETOPO_WATCH_GUARD_MS`, `FILETOPO_WATCH_COALESCE_MS`,
    /// `FILETOPO_WATCH_CALM_MS`, `FILETOPO_WATCH_PERIODIC_MS`,
    /// `FILETOPO_WATCH_FORCE_PERIODIC=1`. Each carries a number or a flag — never a path.
    pub fn from_environment(paths: SandboxPaths, notifier: Notifier) -> Self {
        let config = WatchConfig::default();
        let backend: Arc<dyn WatchBackend> = Arc::new(backend::NativeBackend);
        #[cfg(debug_assertions)]
        let (config, backend) = development_overrides(config, backend);
        Self::new(paths, config, backend, notifier)
    }

    fn entries(&self) -> std::sync::MutexGuard<'_, HashMap<String, Entry>> {
        self.watchers
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// Starts a watcher for `brain` if it deserves one and has none running; otherwise
    /// wakes the running one (a manual gesture just finished). Returns the status.
    ///
    /// A brain is watched only if it is a `REAL_ROOT` **and already has an Index**: a
    /// synthetic fixture is not a folder anyone edits, and a brain never indexed has no
    /// state to keep current — its first **Indexer** is what earns it a watcher.
    pub fn ensure(&self, brain: &BrainRecord) -> WatchStatus {
        if brain.source_kind != SourceKind::RealRoot
            || !watch_ops::is_indexed(&self.inner.paths, brain)
        {
            return WatchStatus::stopped(&brain.brain_id);
        }
        let mut entries = self.entries();
        if let Some(entry) = entries.get(&brain.brain_id) {
            let running = entry
                .join
                .as_ref()
                .is_some_and(|join| !join.is_finished() && !entry.shared.stopped());
            if running {
                entry.shared.nudge.store(true, Ordering::SeqCst);
                entry.shared.queue.poke();
                return current_status(&entry.shared);
            }
        }
        // A finished or stopped entry is replaced by a fresh one.
        if let Some(mut old) = entries.remove(&brain.brain_id) {
            old.shared.request_stop();
            if let Some(join) = old.join.take() {
                let _ = join.join();
            }
        }
        let shared = Arc::new(BrainShared::new(&brain.brain_id, &self.inner.config));
        // Visible at once: a watcher that has been asked for is `STARTING`, never absent.
        worker::publish_status(
            &self.inner.sequence,
            &self.inner.notifier,
            &shared,
            WatchState::Starting,
            WatchMode::None,
            None,
            None,
        );
        let machine = Machine::new(self.inner.clone(), shared.clone(), brain.clone());
        let join = std::thread::Builder::new()
            .name("filetopo-watch".into())
            .spawn(move || machine.run())
            .ok();
        let status = current_status(&shared);
        entries.insert(brain.brain_id.clone(), Entry { shared, join });
        status
    }

    /// Starts a watcher for every `REAL_ROOT` brain that already has an Index — the
    /// application launch. Each one begins with a mandatory full verification.
    pub fn start_all(&self) {
        let database = self.inner.paths.catalog_database();
        if !database.is_file() {
            return;
        }
        let Ok(catalog) = BrainCatalog::open(&database) else {
            return;
        };
        let Ok(brains) = catalog.list() else {
            return;
        };
        for brain in brains {
            self.ensure(&brain);
        }
    }

    /// Tells the watcher of `brain` that a manual gesture (Actualiser, Reconstruire)
    /// just finished: it adopts the revision, re-checks the source, and starts one if
    /// the brain has just earned one.
    pub fn after_manual(&self, brain: &BrainRecord) -> WatchStatus {
        self.ensure(brain)
    }

    /// The current status of a brain's watcher; `STOPPED` for one never started.
    pub fn status(&self, brain_id: &str) -> WatchStatus {
        self.entries()
            .get(brain_id)
            .map(|entry| current_status(&entry.shared))
            .unwrap_or_else(|| WatchStatus::stopped(brain_id))
    }

    /// Engineering counters for a proof; `None` for a brain never started.
    #[allow(dead_code)]
    pub(crate) fn metrics(&self, brain_id: &str) -> Option<WatchMetrics> {
        self.entries()
            .get(brain_id)
            .map(|entry| entry.shared.metrics())
    }

    /// Stops one brain's watcher and waits for its threads and its native handle to be
    /// released. (Nothing in V1 removes a brain, so only a proof stops a single watcher;
    /// the application stops all of them, through [`WatchManager::shutdown`].)
    #[cfg(test)]
    pub(crate) fn stop(&self, brain_id: &str) {
        let entry = self.entries().remove(brain_id);
        if let Some(mut entry) = entry {
            entry.shared.request_stop();
            if let Some(join) = entry.join.take() {
                let _ = join.join();
            }
        }
    }

    /// Stops every watcher — the application is closing. Waits, but never forever: a
    /// worker that is inside a long manual publication is abandoned after `patience`
    /// rather than holding the process open.
    pub fn shutdown(&self, patience: Duration) {
        let drained: Vec<(String, Entry)> = self.entries().drain().collect();
        for (_, entry) in &drained {
            entry.shared.request_stop();
        }
        let deadline = Instant::now() + patience;
        for (_, mut entry) in drained {
            if let Some(join) = entry.join.take() {
                while !join.is_finished() && Instant::now() < deadline {
                    std::thread::sleep(Duration::from_millis(10));
                }
                if join.is_finished() {
                    let _ = join.join();
                }
            }
        }
    }

    /// Proof hook: runs `hook` at the named points of the worker loop
    /// (`before_wb`, `after_wb`, `before_wc`, `after_wc`).
    #[cfg(test)]
    pub(crate) fn set_hook(&self, hook: impl Fn(&'static str) + Send + Sync + 'static) {
        *self
            .inner
            .hook
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = Some(Arc::new(hook));
    }

    /// Proof hook: raises a **loss** exactly as the reader would, in the product queue.
    /// The next cycle must be a full verification.
    #[cfg(test)]
    pub(crate) fn inject_loss(&self, brain_id: &str) {
        if let Some(entry) = self.entries().get(brain_id) {
            entry.shared.queue.mark_lost(types::LossReason::Injected);
        }
    }
}

impl Drop for WatchManager {
    fn drop(&mut self) {
        self.shutdown(Duration::from_secs(5));
    }
}

#[cfg(debug_assertions)]
fn development_overrides(
    mut config: WatchConfig,
    mut backend: Arc<dyn WatchBackend>,
) -> (WatchConfig, Arc<dyn WatchBackend>) {
    let milliseconds = |name: &str| {
        std::env::var(name)
            .ok()
            .and_then(|raw| raw.parse::<u64>().ok())
            .filter(|value| (1..=3_600_000).contains(value))
            .map(Duration::from_millis)
    };
    if let Some(value) = milliseconds("FILETOPO_WATCH_GUARD_MS") {
        config.root_guard_interval = value;
    }
    if let Some(value) = milliseconds("FILETOPO_WATCH_COALESCE_MS") {
        config.coalesce_window = value;
    }
    if let Some(value) = milliseconds("FILETOPO_WATCH_CALM_MS") {
        config.calm_window = value;
    }
    if let Some(value) = milliseconds("FILETOPO_WATCH_PERIODIC_MS") {
        config.periodic_interval = value;
    }
    if std::env::var("FILETOPO_WATCH_FORCE_PERIODIC").is_ok_and(|value| value == "1") {
        backend = Arc::new(backend::UnsupportedBackend);
    }
    (config, backend)
}

fn current_status(shared: &BrainShared) -> WatchStatus {
    shared
        .status
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clone()
}
