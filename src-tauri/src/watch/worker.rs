//! One brain's watcher: the OS reader and the **reconciler** — `TASK-0043`,
//! `DEC-0041` §2, §4–§7, §9.
//!
//! Two threads, and the seam between them is a type, not a habit:
//!
//! * the **reader** turns the operating system's stream into hints and losses and
//!   pushes them into a bounded queue. It never opens SQLite, never journals, never
//!   says what happened;
//! * the **reconciler** (this file's [`Machine`]) is the *only* thing that lets the
//!   Index move. It coalesces a burst, chooses `W-B` or `W-C`, and both go through
//!   `apply_update_batch` — the journal comes from a re-enumeration, never from an
//!   event.
//!
//! # The rules the loop keeps
//!
//! * **No `WATCHING` without a full verification behind it.** A started watcher
//!   verifies in full first (`InitialCheck`): whatever happened while FileTopo was
//!   closed, or before the handle existed, is caught there. The reader is opened
//!   *before* that verification so nothing after it is missed.
//! * **A cycle that knows it received something more is not finished.** After every
//!   reconciliation the queue must stay empty for a calm window; a signal that arrives
//!   during one — a `W-B` or a `W-C` — owes another cycle before `WATCHING`. After a
//!   bounded number of cycles without quiescence the watcher stays `VERIFYING` and
//!   reschedules; it never spins and never blocks the interface.
//! * **A loss is never dropped.** Overflow, an unparseable record, an unconfinable
//!   name, a full queue and a dead reader all send the next cycle to `W-C`.
//! * **The root is guarded separately** (`DEC-0041` §6): a moved or replaced root is an
//!   observation (`UNAVAILABLE` / `SOURCE_CHANGED`), never a batch of deletions, and the
//!   same root coming back is a full verification before any stable state.
//! * **No native mechanism, no lie.** `PERIODIC` re-verifies in full on a cadence and is
//!   never reported as `WATCHING`.
//! * **The watcher never replaces a corpus.** An Index that predates durable identities
//!   is left to the person's **Actualiser**.
//! * **Nothing sensitive leaves.** No name, path, key or OS text is logged or emitted.

use super::backend::{ChangeReader, OpenError, ReaderEvent};
use super::coalesce::{Plan, plan_burst};
use super::queue::SignalQueue;
use super::types::{
    LossReason, WatchConfig, WatchMetrics, WatchMode, WatchReason, WatchState, WatchStatus,
};
use super::{ManagerInner, Notifier};
use crate::map::brains::BrainRecord;
use crate::map::source_observation::SourceState;
use crate::map::watch_ops::{self, GuardOutcome, ScopedFailure};
use crate::scope::ScopeRequest;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

/// State shared between a brain's worker, its reader and the manager.
pub(super) struct BrainShared {
    pub(super) brain_id: String,
    pub(super) stop: AtomicBool,
    pub(super) queue: SignalQueue,
    pub(super) status: Mutex<WatchStatus>,
    pub(super) counters: Mutex<WatchMetrics>,
    /// A manual gesture finished or the entry was re-ensured: look at the source and
    /// the Index again now.
    pub(super) nudge: AtomicBool,
}

impl BrainShared {
    pub(super) fn new(brain_id: &str, config: &WatchConfig) -> Self {
        Self {
            brain_id: brain_id.to_string(),
            stop: AtomicBool::new(false),
            queue: SignalQueue::new(config.queue_capacity),
            status: Mutex::new(WatchStatus::stopped(brain_id)),
            counters: Mutex::new(WatchMetrics::default()),
            nudge: AtomicBool::new(false),
        }
    }

    pub(super) fn stopped(&self) -> bool {
        self.stop.load(Ordering::SeqCst)
    }

    pub(super) fn request_stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
        self.queue.close();
    }

    pub(super) fn metrics(&self) -> WatchMetrics {
        let mut merged = *self
            .counters
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let queue = self.queue.stats();
        merged.queue_max_len = queue.max_len;
        merged.signals_coalesced = queue.coalesced;
        merged.signals_received = queue.received;
        merged.losses = queue.losses;
        merged
    }

    fn count(&self, update: impl FnOnce(&mut WatchMetrics)) {
        let mut counters = self
            .counters
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        update(&mut counters);
    }
}

/// The live OS reader of one watcher, and how to end it.
struct ReaderHandle {
    stop: Arc<AtomicBool>,
    alive: Arc<AtomicBool>,
    join: Option<JoinHandle<()>>,
}

impl ReaderHandle {
    fn spawn(mut reader: Box<dyn ChangeReader>, shared: Arc<BrainShared>) -> Self {
        let stop = Arc::new(AtomicBool::new(false));
        let alive = Arc::new(AtomicBool::new(true));
        let thread_stop = stop.clone();
        let thread_alive = alive.clone();
        let join = std::thread::Builder::new()
            .name("filetopo-watch-reader".into())
            .spawn(move || {
                loop {
                    match reader.read(&thread_stop) {
                        ReaderEvent::Changes(hints) => {
                            for hint in hints {
                                shared.queue.push_hint(hint);
                            }
                        }
                        ReaderEvent::Lost(reason) => shared.queue.mark_lost(reason),
                        ReaderEvent::Stopped => break,
                        ReaderEvent::Failed => {
                            shared.queue.mark_lost(LossReason::ReaderFailed);
                            break;
                        }
                    }
                }
                thread_alive.store(false, Ordering::SeqCst);
                // The handle is released here, on the thread that owned the call.
                drop(reader);
            })
            .ok();
        if join.is_none() {
            alive.store(false, Ordering::SeqCst);
        }
        Self { stop, alive, join }
    }

    fn is_alive(&self) -> bool {
        self.alive.load(Ordering::SeqCst)
    }

    /// Asks the reader to stop and waits for it to have released its handle.
    fn close(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

impl Drop for ReaderHandle {
    fn drop(&mut self) {
        self.close();
    }
}

/// Exponential wait before retrying a reconciliation that failed.
struct Backoff {
    initial: Duration,
    max: Duration,
    current: Duration,
}

impl Backoff {
    fn new(config: &WatchConfig) -> Self {
        Self {
            initial: config.retry_backoff_initial,
            max: config.retry_backoff_max,
            current: config.retry_backoff_initial,
        }
    }

    fn next(&mut self) -> Duration {
        let wait = self.current;
        self.current = (self.current * 2).min(self.max);
        wait
    }

    fn reset(&mut self) {
        self.current = self.initial;
    }
}

/// Everything one watcher's loop remembers between two turns.
pub(super) struct Machine {
    inner: Arc<ManagerInner>,
    shared: Arc<BrainShared>,
    brain: BrainRecord,
    reader: Option<ReaderHandle>,
    mode: WatchMode,
    /// A full verification is owed, and why. Set at start, on a return, on a switch of
    /// mode; consumed by the next turn.
    need_full: Option<WatchReason>,
    /// The source is absent, replaced or unreadable: nothing is verified until the guard
    /// sees a usable root again.
    root_down: bool,
    /// The Index needs the person's **Actualiser** before the watcher may write.
    blocked: bool,
    next_guard: Instant,
    /// After a failure classified as the source's, the guard's "the root is back" is
    /// ignored until then — otherwise a root that is present but refused (replaced) would
    /// loop between "back" and "refused" every few seconds, each with a full scan.
    guard_hold_until: Option<Instant>,
    next_periodic: Instant,
    retry_at: Option<Instant>,
    backoff: Backoff,
    cycles: u32,
    revision: Option<u64>,
}

impl Machine {
    pub(super) fn new(
        inner: Arc<ManagerInner>,
        shared: Arc<BrainShared>,
        brain: BrainRecord,
    ) -> Self {
        let now = Instant::now();
        let backoff = Backoff::new(&inner.config);
        Self {
            next_guard: now + inner.config.root_guard_interval,
            next_periodic: now + inner.config.periodic_interval,
            inner,
            shared,
            brain,
            reader: None,
            mode: WatchMode::None,
            need_full: Some(WatchReason::InitialCheck),
            root_down: false,
            blocked: false,
            guard_hold_until: None,
            retry_at: None,
            backoff,
            cycles: 0,
            revision: None,
        }
    }

    fn config(&self) -> &WatchConfig {
        &self.inner.config
    }

    /// A proof's window into the loop: called at named points, so a test can make
    /// something arrive *during* a reconciliation. Absent from a product build.
    #[cfg(test)]
    fn hook(&self, point: &'static str) {
        let hook = self
            .inner
            .hook
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone();
        if let Some(hook) = hook {
            hook(point);
        }
    }

    #[cfg(not(test))]
    #[inline]
    fn hook(&self, _point: &'static str) {}

    fn stopped(&self) -> bool {
        self.shared.stopped()
    }

    // ---- status ---------------------------------------------------------------

    fn publish(&mut self, state: WatchState, reason: Option<WatchReason>) {
        let mode = match state {
            WatchState::Stopped | WatchState::Starting => WatchMode::None,
            _ if self.root_down => WatchMode::None,
            _ => self.mode,
        };
        self.publish_with_mode(state, mode, reason);
    }

    fn publish_with_mode(
        &mut self,
        state: WatchState,
        mode: WatchMode,
        reason: Option<WatchReason>,
    ) {
        publish_status(
            &self.inner.sequence,
            &self.inner.notifier,
            &self.shared,
            state,
            mode,
            reason,
            self.revision,
        );
    }

    // ---- the loop -------------------------------------------------------------

    pub(super) fn run(mut self) {
        self.publish_with_mode(WatchState::Starting, WatchMode::None, None);
        self.revision = watch_ops::served_revision(&self.inner.paths, &self.brain).ok();
        while !self.stopped() {
            self.turn();
        }
        if let Some(reader) = self.reader.as_mut() {
            reader.close();
        }
        self.reader = None;
        publish_status(
            &self.inner.sequence,
            &self.inner.notifier,
            &self.shared,
            WatchState::Stopped,
            WatchMode::None,
            None,
            self.revision,
        );
    }

    fn turn(&mut self) {
        let now = Instant::now();
        let nudged = self.shared.nudge.swap(false, Ordering::SeqCst);
        if nudged {
            self.sync_revision();
        }
        if nudged || now >= self.next_guard {
            self.run_guard();
        }
        if self.stopped() {
            return;
        }
        if self.blocked {
            if watch_ops::is_stamped(&self.inner.paths, &self.brain).unwrap_or(false) {
                self.blocked = false;
                self.need_full = Some(WatchReason::InitialCheck);
            } else {
                self.nap_until(self.next_guard);
                return;
            }
        }
        if self.root_down {
            self.nap_until(self.next_guard);
            return;
        }
        if !self.ensure_source() {
            return;
        }
        match self.choose_plan() {
            Some(plan) => self.execute(plan),
            None => self.idle(),
        }
    }

    /// Adopts a revision a manual gesture committed, so the status never lags it.
    fn sync_revision(&mut self) {
        if let Ok(revision) = watch_ops::served_revision(&self.inner.paths, &self.brain)
            && Some(revision) != self.revision
        {
            self.revision = Some(revision);
            let (state, reason) = {
                let status = self
                    .shared
                    .status
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner);
                (status.state, status.reason)
            };
            self.publish(state, reason);
        }
    }

    fn nap_until(&self, deadline: Instant) {
        let timeout = deadline
            .saturating_duration_since(Instant::now())
            .min(Duration::from_secs(1));
        self.shared.queue.nap(timeout.max(Duration::from_millis(5)));
    }

    // ---- the root guard -------------------------------------------------------

    fn run_guard(&mut self) {
        self.next_guard = Instant::now() + self.config().root_guard_interval;
        self.shared.count(|counters| counters.guard_checks += 1);
        match watch_ops::guard_root(&self.inner.paths, &self.brain) {
            GuardOutcome::Fine => {
                if self.root_down
                    && self
                        .guard_hold_until
                        .is_none_or(|until| Instant::now() >= until)
                {
                    self.root_down = false;
                    self.guard_hold_until = None;
                    // The old handle may watch a directory that is no longer the
                    // root: a fresh one, then a full verification, before anything
                    // stable is claimed.
                    self.close_reader();
                    self.need_full = Some(WatchReason::SourceReturned);
                    self.publish(WatchState::Verifying, Some(WatchReason::SourceReturned));
                }
            }
            GuardOutcome::Down { state, reason } => {
                watch_ops::record_guard_failure(&self.inner.paths, &self.brain, state, reason);
                if !self.root_down {
                    self.root_down = true;
                    self.close_reader();
                }
                let why = match state {
                    SourceState::SourceChanged => WatchReason::SourceChanged,
                    _ => WatchReason::SourceUnavailable,
                };
                self.publish(WatchState::Degraded, Some(why));
            }
        }
    }

    fn close_reader(&mut self) {
        if let Some(mut reader) = self.reader.take() {
            reader.close();
        }
    }

    // ---- the source: a native reader, or the honest fallback -------------------

    /// Makes sure something is watching (or that the periodic mode is declared).
    /// Returns whether the turn may go on.
    fn ensure_source(&mut self) -> bool {
        if self.mode == WatchMode::Periodic {
            return true;
        }
        if let Some(reader) = &self.reader {
            if reader.is_alive() {
                return true;
            }
            // The reader ended on its own; its loss is already queued.
            self.close_reader();
        }
        let root = match watch_ops::resolve_root(&self.inner.paths, &self.brain) {
            Ok(root) => root,
            Err(_) => {
                self.root_down = true;
                self.publish(WatchState::Degraded, Some(WatchReason::SourceUnavailable));
                self.nap_until(self.next_guard);
                return false;
            }
        };
        match self.inner.backend.open(&root) {
            Ok(reader) => {
                self.reader = Some(ReaderHandle::spawn(reader, self.shared.clone()));
                self.mode = WatchMode::Native;
                true
            }
            Err(OpenError::Unsupported) | Err(OpenError::Failed) => {
                self.mode = WatchMode::Periodic;
                self.next_periodic = Instant::now() + self.config().periodic_interval;
                if self.need_full.is_none() {
                    self.need_full = Some(WatchReason::NativeUnsupported);
                }
                true
            }
            Err(OpenError::RootUnavailable) => {
                // A fact about the source: let the guard classify and record it.
                self.next_guard = Instant::now();
                self.run_guard();
                if !self.root_down {
                    // The guard saw a usable root a moment after the open refused it:
                    // do not spin.
                    self.shared.queue.nap(Duration::from_millis(200));
                }
                false
            }
        }
    }

    // ---- choosing what to do ----------------------------------------------------

    fn choose_plan(&mut self) -> Option<Plan> {
        if let Some(reason) = self.need_full.take() {
            return Some(Plan::Full(reason));
        }
        let now = Instant::now();
        if let Some(due) = self.retry_at {
            // A full verification is owed: no targeted patch may claim "up to date"
            // in its place. Signals stay queued for it.
            if now >= due {
                self.retry_at = None;
                return Some(Plan::Full(WatchReason::Retry));
            }
            return None;
        }
        if self.shared.queue.has_pending() {
            // Let the burst finish before choosing: a loss returns at once.
            self.shared.queue.collect_for(self.config().coalesce_window);
            let drained = self.shared.queue.take();
            if let Some(plan) = plan_burst(&drained, self.config().max_scopes) {
                return Some(plan);
            }
        }
        if self.mode == WatchMode::Periodic && now >= self.next_periodic {
            return Some(Plan::Full(WatchReason::PeriodicCheck));
        }
        None
    }

    fn idle(&mut self) {
        let now = Instant::now();
        let mut deadline = self.next_guard;
        if self.mode == WatchMode::Periodic {
            deadline = deadline.min(self.next_periodic);
        }
        if let Some(due) = self.retry_at {
            deadline = deadline.min(due);
        }
        let timeout = deadline
            .saturating_duration_since(now)
            .clamp(Duration::from_millis(5), Duration::from_secs(1));
        if self.retry_at.is_some() {
            // Signals are deliberately left queued: sleep, do not spin on them.
            self.shared.queue.nap(timeout);
        } else {
            self.shared.queue.wait(timeout);
        }
    }

    // ---- doing it ---------------------------------------------------------------

    fn execute(&mut self, plan: Plan) {
        match plan {
            Plan::Full(reason) => self.run_full(reason),
            Plan::Scopes(requests) => self.run_scopes(&requests),
        }
    }

    fn run_scopes(&mut self, requests: &[ScopeRequest]) {
        self.publish(WatchState::Verifying, None);
        self.shared.count(|counters| counters.wb_cycles += 1);
        self.hook("before_wb");
        let shared = self.shared.clone();
        let result = watch_ops::apply_scopes(
            &self.inner.paths,
            &self.brain,
            requests,
            self.config().max_scope_nodes,
            &move || shared.stopped(),
        );
        if result.is_ok() {
            self.hook("after_wb");
        }
        match result {
            Ok(applied) => {
                self.shared.count(|counters| {
                    counters.scopes_read += applied.counts.scopes as u64;
                    counters.directories_listed += applied.listed as u64;
                });
                self.after_success(applied.revision, applied.applied);
            }
            Err(ScopedFailure::Cancelled) => {}
            Err(ScopedFailure::Escalate(_)) => {
                self.shared.count(|counters| counters.wb_escalations += 1);
                self.run_full(WatchReason::ScopeUnsafe);
            }
            Err(ScopedFailure::NeedsManualRefresh) => self.block_for_manual_refresh(),
            Err(ScopedFailure::Unusable) => self.after_failure(),
        }
    }

    fn run_full(&mut self, reason: WatchReason) {
        match watch_ops::is_stamped(&self.inner.paths, &self.brain) {
            Ok(true) => {}
            Ok(false) => {
                self.block_for_manual_refresh();
                return;
            }
            // Let the verification itself report what is wrong.
            Err(_) => {}
        }
        self.publish(WatchState::Verifying, Some(reason));
        self.shared.count(|counters| counters.wc_cycles += 1);
        self.hook("before_wc");
        let shared = self.shared.clone();
        let before = self.revision;
        let result =
            watch_ops::verify_full(&self.inner.paths, &self.brain, move || shared.stopped());
        if result.is_ok() {
            self.hook("after_wc");
        }
        match result {
            Ok(report) => self.after_success(report.revision, Some(report.revision) != before),
            Err(_) if self.stopped() => {}
            Err(_) => self.after_failure(),
        }
    }

    fn block_for_manual_refresh(&mut self) {
        self.blocked = true;
        self.publish(WatchState::Degraded, Some(WatchReason::NeedsManualRefresh));
    }

    fn after_success(&mut self, revision: u64, committed: bool) {
        self.revision = Some(revision);
        self.backoff.reset();
        self.retry_at = None;
        self.cycles += 1;
        if committed {
            self.shared.count(|counters| counters.commits += 1);
        }
        // The calm window: anything that arrived during the reconciliation (or arrives
        // now) owes another cycle before the watcher may say it is watching.
        let more = self.shared.queue.wait(self.config().calm_window);
        if self.stopped() {
            return;
        }
        if more || self.shared.queue.has_pending() {
            self.publish(WatchState::Verifying, Some(WatchReason::MoreSignals));
            if self.cycles >= self.config().max_consecutive_cycles {
                // No quiescence after many cycles: stay `VERIFYING`, reschedule, and
                // let the interface breathe.
                self.cycles = 0;
                self.shared
                    .queue
                    .nap(Duration::from_secs(1).min(self.config().calm_window * 4));
            }
            return;
        }
        self.cycles = 0;
        match self.mode {
            WatchMode::Native => self.publish(WatchState::Watching, None),
            WatchMode::Periodic => {
                self.next_periodic = Instant::now() + self.config().periodic_interval;
                self.publish(WatchState::Periodic, Some(WatchReason::NativeUnsupported));
            }
            WatchMode::None => self.publish(WatchState::Verifying, None),
        }
    }

    /// A reconciliation failed. The source observation (recorded by the pipeline) says
    /// why: a source that is absent or replaced is the guard's business; anything else
    /// is retried later, with a growing wait — the last reliable Index keeps being
    /// served meanwhile.
    fn after_failure(&mut self) {
        let observation = watch_ops::observation(&self.inner.paths, &self.brain);
        match observation.state {
            SourceState::Unavailable | SourceState::SourceChanged => {
                self.root_down = true;
                self.close_reader();
                self.guard_hold_until = Some(Instant::now() + self.backoff.next());
                let why = if observation.state == SourceState::SourceChanged {
                    WatchReason::SourceChanged
                } else {
                    WatchReason::SourceUnavailable
                };
                self.publish(WatchState::Degraded, Some(why));
            }
            SourceState::ScanIncomplete => {
                self.retry_at = Some(Instant::now() + self.backoff.next());
                self.publish(WatchState::Degraded, Some(WatchReason::ScanIncomplete));
            }
            SourceState::Synced | SourceState::Unknown | SourceState::ApplyFailed => {
                self.retry_at = Some(Instant::now() + self.backoff.next());
                self.publish(WatchState::Degraded, Some(WatchReason::ApplyFailed));
            }
        }
    }
}

/// Publishes a status if — and only if — it differs from the current one, with a fresh
/// sequence number, and hands it to the notifier. **Deduplicated**: a watcher that
/// re-asserts what is already true emits nothing.
pub(super) fn publish_status(
    sequence: &AtomicU64,
    notifier: &Notifier,
    shared: &BrainShared,
    state: WatchState,
    mode: WatchMode,
    reason: Option<WatchReason>,
    revision: Option<u64>,
) {
    let pending = shared.queue.has_pending();
    let status = {
        let mut current = shared
            .status
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if current.state == state
            && current.mode == mode
            && current.reason == reason
            && current.index_revision == revision
        {
            current.pending = pending;
            return;
        }
        let next = WatchStatus {
            brain_id: shared.brain_id.clone(),
            state,
            mode,
            reason,
            index_revision: revision,
            pending,
            sequence: sequence.fetch_add(1, Ordering::SeqCst) + 1,
        };
        *current = next.clone();
        next
    };
    // Outside the lock: the notifier may take its own locks.
    notifier(&status);
}
