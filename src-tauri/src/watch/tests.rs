//! `TASK-0043` — the automatic watcher, proven on the code the product runs.
//!
//! Two backends drive the **same** manager, worker and reconciler:
//!
//! * the **native** one (`ReadDirectoryChangesExW`) against a real tree on a real Windows
//!   volume, where the operating system itself produces the events; and
//! * a **scripted** one, where a proof decides exactly which hints and which losses the
//!   reader reports — so a loss, an overflow, a dead reader or an unsupported mechanism
//!   are injected into the *product* engine, not into a copy of it.
//!
//! **The reference is always a full scan**: after each scenario the Index must equal the
//! Index a brand-new brain builds from the same tree in a second sandbox
//! (`watch_scope_tests::reference_rows`). Where the claim is "before a stable state", the
//! Index is captured **inside the notifier**, at the very moment `WATCHING` is announced.
//!
//! Every tree is built here, from synthetic names, under a `tempfile` directory.

use super::backend::{
    ChangeReader, NativeBackend, OpenError, ReaderEvent, UnsupportedBackend, WatchBackend,
};
use super::queue::Hint;
use super::types::{LossReason, WatchConfig, WatchMode, WatchReason, WatchState, WatchStatus};
use super::{Notifier, WatchManager};
use crate::map::commands::watch_scope_tests::{
    Dump, Fx, diff, dump_rows, journal_of, reference_rows,
};
use crate::map::commands::{open_map, rebuild_map, refresh_map, register_real_root};
use crate::map::source_observation::SourceState;
use std::collections::VecDeque;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};

// ==========================================================================
// The scripted backend
// ==========================================================================

#[derive(Default)]
struct Script {
    events: Mutex<VecDeque<ReaderEvent>>,
    wake: Condvar,
    open_error: Mutex<Option<OpenError>>,
    opens: AtomicUsize,
    live: AtomicUsize,
}

/// A reader whose output a proof writes by hand.
#[derive(Clone, Default)]
struct ScriptedBackend {
    script: Arc<Script>,
}

impl ScriptedBackend {
    fn push(&self, event: ReaderEvent) {
        self.script.events.lock().unwrap().push_back(event);
        self.script.wake.notify_all();
    }

    /// Names whose **membership** may have changed (added, removed, renamed).
    fn hints(&self, hints: &[&str]) {
        self.push(ReaderEvent::Changes(
            hints.iter().map(|hint| Hint::member(hint)).collect(),
        ));
    }

    /// Names of entries that only **themselves** moved (modified).
    fn modified(&self, hints: &[&str]) {
        self.push(ReaderEvent::Changes(
            hints.iter().map(|hint| Hint::modified(hint)).collect(),
        ));
    }

    fn lose(&self, reason: LossReason) {
        self.push(ReaderEvent::Lost(reason));
    }

    fn fail_open_with(&self, error: Option<OpenError>) {
        *self.script.open_error.lock().unwrap() = error;
    }

    fn opens(&self) -> usize {
        self.script.opens.load(Ordering::SeqCst)
    }

    fn live(&self) -> usize {
        self.script.live.load(Ordering::SeqCst)
    }
}

struct ScriptedReader {
    script: Arc<Script>,
}

impl ChangeReader for ScriptedReader {
    fn read(&mut self, stop: &AtomicBool) -> ReaderEvent {
        loop {
            let mut queue = self.script.events.lock().unwrap();
            if let Some(event) = queue.pop_front() {
                return event;
            }
            if stop.load(Ordering::SeqCst) {
                return ReaderEvent::Stopped;
            }
            let _ = self
                .script
                .wake
                .wait_timeout(queue, Duration::from_millis(15))
                .unwrap();
        }
    }
}

impl Drop for ScriptedReader {
    fn drop(&mut self) {
        self.script.live.fetch_sub(1, Ordering::SeqCst);
    }
}

impl WatchBackend for ScriptedBackend {
    fn open(&self, _root: &std::path::Path) -> Result<Box<dyn ChangeReader>, OpenError> {
        if let Some(error) = *self.script.open_error.lock().unwrap() {
            return Err(error);
        }
        self.script.opens.fetch_add(1, Ordering::SeqCst);
        self.script.live.fetch_add(1, Ordering::SeqCst);
        Ok(Box::new(ScriptedReader {
            script: self.script.clone(),
        }))
    }
}

// ==========================================================================
// The rig
// ==========================================================================

/// The product cadences, scaled down so a proof does not wait five real seconds.
fn fast() -> WatchConfig {
    WatchConfig {
        coalesce_window: Duration::from_millis(30),
        calm_window: Duration::from_millis(60),
        root_guard_interval: Duration::from_millis(150),
        periodic_interval: Duration::from_millis(250),
        queue_capacity: 4096,
        max_scopes: 128,
        max_scope_nodes: 20_000,
        max_consecutive_cycles: 8,
        retry_backoff_initial: Duration::from_millis(100),
        retry_backoff_max: Duration::from_millis(400),
    }
}

fn sleep(milliseconds: u64) {
    std::thread::sleep(Duration::from_millis(milliseconds));
}

fn wait_until(seconds: u64, what: &str, mut condition: impl FnMut() -> bool) {
    let deadline = Instant::now() + Duration::from_secs(seconds);
    while Instant::now() < deadline {
        if condition() {
            return;
        }
        sleep(20);
    }
    panic!("timed out after {seconds}s waiting for: {what}");
}

/// One manager, and what it announced.
struct Running {
    manager: WatchManager,
    history: Arc<Mutex<Vec<WatchStatus>>>,
    /// The Index, captured inside the notifier each time `WATCHING` was announced.
    snapshots: Arc<Mutex<Vec<(u64, Dump)>>>,
}

fn run_manager(
    fx: &Fx,
    backend: Arc<dyn WatchBackend>,
    config: WatchConfig,
    capture: bool,
) -> Running {
    let history = Arc::new(Mutex::new(Vec::<WatchStatus>::new()));
    let snapshots = Arc::new(Mutex::new(Vec::<(u64, Dump)>::new()));
    let notifier: Notifier = {
        let history = history.clone();
        let snapshots = snapshots.clone();
        let paths = fx.paths.clone();
        let brain = fx.brain.clone();
        Arc::new(move |status: &WatchStatus| {
            history.lock().unwrap().push(status.clone());
            if capture && status.state == WatchState::Watching {
                let rows = dump_rows(&paths, &brain, true);
                snapshots.lock().unwrap().push((status.sequence, rows));
            }
        })
    };
    Running {
        manager: WatchManager::new(fx.paths.clone(), config, backend, notifier),
        history,
        snapshots,
    }
}

struct Rig {
    fx: Fx,
    script: ScriptedBackend,
    run: Running,
}

impl Rig {
    fn scripted(name: &str) -> Self {
        Self::scripted_with(name, fast())
    }

    fn scripted_with(name: &str, config: WatchConfig) -> Self {
        let fx = Fx::new(name);
        let script = ScriptedBackend::default();
        let run = run_manager(&fx, Arc::new(script.clone()), config, true);
        Self { fx, script, run }
    }

    fn native(name: &str) -> Self {
        let fx = Fx::new(name);
        let run = run_manager(&fx, Arc::new(NativeBackend), fast(), true);
        Self {
            fx,
            script: ScriptedBackend::default(),
            run,
        }
    }

    fn with_backend(name: &str, backend: Arc<dyn WatchBackend>) -> Self {
        let fx = Fx::new(name);
        let run = run_manager(&fx, backend, fast(), true);
        Self {
            fx,
            script: ScriptedBackend::default(),
            run,
        }
    }

    fn start(&self) -> WatchStatus {
        self.run.manager.ensure(&self.fx.brain)
    }

    fn status(&self) -> WatchStatus {
        self.run.manager.status(&self.fx.brain.brain_id)
    }

    fn metrics(&self) -> super::types::WatchMetrics {
        self.run
            .manager
            .metrics(&self.fx.brain.brain_id)
            .expect("a started watcher has metrics")
    }

    /// Waits for `state` and returns the status **as it was when it held** — a second
    /// read could already be the next state.
    fn wait_state(&self, seconds: u64, state: WatchState) -> WatchStatus {
        let mut seen = None;
        wait_until(seconds, &format!("state {state:?}"), || {
            let status = self.status();
            if status.state == state {
                seen = Some(status);
                true
            } else {
                false
            }
        });
        seen.expect("the condition held")
    }

    fn wait_watching(&self) -> WatchStatus {
        let status = self.wait_state(30, WatchState::Watching);
        // The status is visible a moment before the notifier has captured the Index at that
        // instant: wait for the capture, so a proof reads a complete record.
        wait_until(30, "the notifier to have captured the Index", || {
            let announced = self
                .history()
                .iter()
                .filter(|s| s.state == WatchState::Watching)
                .count();
            self.run.snapshots.lock().unwrap().len() >= announced
        });
        status
    }

    /// `WATCHING`, **and** the Index equal to a full scan of the tree as it is now.
    fn converge(&self, label: &str) {
        let deadline = Instant::now() + Duration::from_secs(60);
        loop {
            if self.status().state == WatchState::Watching
                && diff(&self.fx.rows(), &reference_rows(&self.fx.root, true)).is_none()
            {
                return;
            }
            if Instant::now() > deadline {
                let difference = diff(&self.fx.rows(), &reference_rows(&self.fx.root, true));
                panic!(
                    "{label}: no convergence in 60s; status {:?}\n{}\nmetrics {:?}",
                    self.status(),
                    difference.unwrap_or_default(),
                    self.run.manager.metrics(&self.fx.brain.brain_id)
                );
            }
            sleep(100);
        }
    }

    fn history(&self) -> Vec<WatchStatus> {
        self.run.history.lock().unwrap().clone()
    }

    /// The states announced, consecutive repeats collapsed.
    fn trail(&self) -> Vec<(WatchState, Option<WatchReason>)> {
        let mut trail: Vec<(WatchState, Option<WatchReason>)> = Vec::new();
        for status in self.history() {
            let item = (status.state, status.reason);
            if trail.last() != Some(&item) {
                trail.push(item);
            }
        }
        trail
    }

    fn snapshot_after(&self, sequence: u64) -> Option<(u64, Dump)> {
        self.run
            .snapshots
            .lock()
            .unwrap()
            .iter()
            .find(|(at, _)| *at > sequence)
            .cloned()
    }

    fn last_sequence(&self) -> u64 {
        self.history().last().map_or(0, |status| status.sequence)
    }

    fn observation(&self) -> SourceState {
        open_map(&self.fx.paths, &self.fx.brain)
            .expect("open")
            .source_observation
            .state
    }

    fn journal(&self) -> Vec<String> {
        journal_of(&self.fx.paths, &self.fx.brain)
    }
}

// ==========================================================================
// Startup: no WATCHING without a full verification behind it
// ==========================================================================

#[test]
fn a_started_watcher_is_starting_then_verifies_in_full_before_it_says_watching() {
    let rig = Rig::scripted("racine-start");
    let first = rig.start();
    assert_eq!(
        first.state,
        WatchState::Starting,
        "asked for means starting"
    );
    assert_eq!(first.mode, WatchMode::None);
    rig.wait_watching();

    let trail = rig.trail();
    assert_eq!(trail[0], (WatchState::Starting, None));
    assert_eq!(
        trail[1],
        (WatchState::Verifying, Some(WatchReason::InitialCheck)),
        "{trail:?}"
    );
    assert_eq!(trail[2], (WatchState::Watching, None), "{trail:?}");
    // Nothing announced WATCHING before the verification began.
    let watching_at = rig
        .history()
        .iter()
        .position(|status| status.state == WatchState::Watching)
        .unwrap();
    let verifying_at = rig
        .history()
        .iter()
        .position(|status| status.reason == Some(WatchReason::InitialCheck))
        .unwrap();
    assert!(verifying_at < watching_at);
    let metrics = rig.metrics();
    assert_eq!(
        (metrics.wc_cycles, metrics.wb_cycles),
        (1, 0),
        "{metrics:?}"
    );
    rig.converge("start");
}

#[test]
fn changes_made_while_the_application_was_closed_are_caught_before_a_stable_state() {
    let mut rig = Rig::scripted("racine-offline");
    rig.start();
    rig.wait_watching();
    rig.run.manager.shutdown(Duration::from_secs(5));
    assert_eq!(
        rig.run.history.lock().unwrap().last().unwrap().state,
        WatchState::Stopped
    );
    let revision_when_closed = rig.fx.revision();

    // The application is closed: the source moves on, in every way a person's does.
    fs::write(rig.fx.path("alpha/hors-ligne.txt"), b"cree hors ligne").unwrap();
    fs::write(
        rig.fx.path("alpha/a1.txt"),
        b"modifie hors ligne, plus long",
    )
    .unwrap();
    fs::remove_file(rig.fx.path("small/deep/leaf.txt")).unwrap();
    fs::rename(rig.fx.path("alpha/sub"), rig.fx.path("beta/sub-deplace")).unwrap();
    fs::write(rig.fx.path("tout-en-haut.txt"), b"racine").unwrap();
    fs::remove_dir_all(rig.fx.path("big/g3")).unwrap();
    assert_eq!(
        rig.fx.revision(),
        revision_when_closed,
        "nobody observed it"
    );

    // The application is relaunched.
    rig.script = ScriptedBackend::default();
    rig.run = run_manager(&rig.fx, Arc::new(rig.script.clone()), fast(), true);
    rig.start();
    rig.wait_watching();

    // The Index *at the very moment `WATCHING` was first announced* is the full scan.
    let (_, at_first_watching) = rig.snapshot_after(0).expect("a WATCHING was announced");
    assert_eq!(
        diff(&at_first_watching, &reference_rows(&rig.fx.root, true)),
        None,
        "the initial full verification must have caught everything before any stable state"
    );
    let metrics = rig.metrics();
    assert_eq!(
        metrics.wc_cycles, 1,
        "one full verification, before WATCHING"
    );
    assert!(rig.fx.revision() > revision_when_closed);
}

// ==========================================================================
// Hints become targeted reconciliations; the OS is never the truth
// ==========================================================================

#[test]
fn a_hint_is_a_targeted_reconciliation_and_the_journal_comes_from_the_comparison() {
    let rig = Rig::scripted("racine-hint");
    rig.start();
    rig.wait_watching();
    let before = rig.fx.revision();

    fs::write(rig.fx.path("alpha/cree.txt"), b"cree").unwrap();
    // A hint that *lies* about what happened cannot matter: only its place counts. The
    // reader reports names only, so there is no action to lie with; here the name is
    // simply where to look.
    rig.script.hints(&["alpha/cree.txt"]);
    rig.converge("a hint");

    let metrics = rig.metrics();
    assert_eq!(
        (metrics.wc_cycles, metrics.wb_cycles),
        (1, 1),
        "{metrics:?}"
    );
    assert!(rig.fx.revision() > before);
    let journal = rig.journal();
    assert_eq!(
        journal.iter().filter(|l| l.starts_with("CREATED")).count(),
        1,
        "{journal:#?}"
    );
}

#[test]
fn a_hint_for_something_that_did_not_change_journals_nothing() {
    let rig = Rig::scripted("racine-false-hint");
    rig.start();
    rig.wait_watching();
    let (revision, journal) = (rig.fx.revision(), rig.journal());
    // The operating system says "something happened here"; nothing did.
    rig.script
        .hints(&["alpha/a1.txt", "small/deep/leaf.txt", "alpha/sub"]);
    wait_until(20, "the targeted cycle", || rig.metrics().wb_cycles >= 1);
    rig.wait_watching();
    assert_eq!(rig.fx.revision(), revision, "a false hint moves nothing");
    assert_eq!(rig.journal(), journal, "and invents no event");
}

#[test]
fn a_hint_on_a_top_level_entry_is_a_full_verification() {
    let rig = Rig::scripted("racine-top");
    rig.start();
    rig.wait_watching();
    fs::write(rig.fx.path("nouveau-au-sommet.txt"), b"x").unwrap();
    rig.script.hints(&["nouveau-au-sommet.txt"]);
    rig.converge("top-level");
    let metrics = rig.metrics();
    assert_eq!(
        metrics.wc_cycles, 2,
        "the root's own scope is a full verification"
    );
    assert_eq!(
        metrics.wb_escalations, 0,
        "decided by the plan, not by an escalation"
    );
    assert!(
        rig.trail()
            .contains(&(WatchState::Verifying, Some(WatchReason::ScopeUnsafe)))
    );
}

/// The real-world shape: the system reports a directory as *modified* whenever something
/// inside it changes. A change inside a top-level directory must not become a full scan.
#[test]
fn a_modified_top_level_directory_alongside_its_changed_entry_stays_targeted() {
    let rig = Rig::scripted("racine-top-modified");
    rig.start();
    rig.wait_watching();
    fs::write(rig.fx.path("alpha/dans-le-dossier.txt"), b"x").unwrap();
    rig.script.hints(&["alpha/dans-le-dossier.txt"]);
    rig.script.modified(&["alpha"]);
    rig.converge("a change inside a top-level directory");
    let metrics = rig.metrics();
    assert_eq!(metrics.wc_cycles, 1, "no full verification: {metrics:?}");
    assert_eq!(metrics.wb_cycles, 1, "{metrics:?}");
    assert!(rig.fx.has("alpha/dans-le-dossier.txt"));
}

#[test]
fn a_targeted_reconciliation_that_is_refused_escalates_to_a_full_verification() {
    let rig = Rig::scripted("racine-escalate");
    rig.start();
    rig.wait_watching();
    // A removed directory whose hints name the *root's* entry only through a scope that
    // rises to the root: the plan is targeted, the resolution is not.
    fs::create_dir_all(rig.fx.path("neuf/profond")).unwrap();
    fs::write(rig.fx.path("neuf/profond/f.txt"), b"f").unwrap();
    rig.script.hints(&["neuf/profond/f.txt"]);
    rig.converge("escalation");
    let metrics = rig.metrics();
    assert_eq!(metrics.wb_cycles, 1);
    assert_eq!(metrics.wb_escalations, 1, "{metrics:?}");
    assert_eq!(metrics.wc_cycles, 2);
}

// ==========================================================================
// Loss is never silent
// ==========================================================================

#[test]
fn a_forced_loss_in_the_product_engine_is_a_full_verification_and_converges() {
    let rig = Rig::scripted("racine-loss");
    rig.start();
    rig.wait_watching();
    // The source changes and *no signal at all* says so: only a loss is reported.
    fs::write(rig.fx.path("alpha/silencieux.txt"), b"x").unwrap();
    fs::remove_file(rig.fx.path("small/side.txt")).unwrap();
    fs::rename(rig.fx.path("alpha/sub"), rig.fx.path("beta/sub-silencieux")).unwrap();
    let mark = rig.last_sequence();

    rig.run.manager.inject_loss(&rig.fx.brain.brain_id);
    wait_until(20, "a second full verification", || {
        rig.metrics().wc_cycles >= 2
    });
    rig.converge("injected loss");

    assert!(
        rig.history().iter().any(|s| s.sequence > mark
            && s.state == WatchState::Verifying
            && s.reason == Some(WatchReason::SignalsLost)),
        "{:?}",
        rig.trail()
    );
    assert_eq!(rig.status().state, WatchState::Watching);
}

#[test]
fn every_kind_of_loss_from_the_reader_sends_the_next_cycle_to_a_full_verification() {
    for (index, loss) in [
        LossReason::OsOverflow,
        LossReason::EnumDir,
        LossReason::ParserInvalid,
        LossReason::HintInvalid,
    ]
    .into_iter()
    .enumerate()
    {
        let rig = Rig::scripted(&format!("racine-loss-{index}"));
        rig.start();
        rig.wait_watching();
        fs::write(rig.fx.path(&format!("alpha/perdu-{index}.txt")), b"x").unwrap();
        rig.script.lose(loss);
        wait_until(20, "a second full verification", || {
            rig.metrics().wc_cycles >= 2
        });
        rig.converge(&format!("{loss:?}"));
        assert!(rig.fx.has(&format!("alpha/perdu-{index}.txt")), "{loss:?}");
        assert!(rig.metrics().losses >= 1);
    }
}

#[test]
fn a_full_queue_is_a_loss_then_a_full_verification_and_never_a_silent_drop() {
    let mut config = fast();
    config.queue_capacity = 8;
    let rig = Rig::scripted_with("racine-saturated", config);
    rig.start();
    rig.wait_watching();
    let mut hints = Vec::new();
    for index in 0..40 {
        let relative = format!("alpha/sat-{index}.txt");
        fs::write(rig.fx.path(&relative), b"s").unwrap();
        hints.push(relative);
    }
    let hint_refs: Vec<&str> = hints.iter().map(String::as_str).collect();
    rig.script.hints(&hint_refs);
    rig.converge("saturated queue");
    let metrics = rig.metrics();
    assert!(metrics.losses >= 1, "{metrics:?}");
    assert!(
        metrics.queue_max_len <= 8,
        "the queue never exceeded its bound: {metrics:?}"
    );
    assert!(metrics.wc_cycles >= 2);
    assert!(
        rig.trail()
            .contains(&(WatchState::Verifying, Some(WatchReason::QueueSaturated))),
        "{:?}",
        rig.trail()
    );
    for index in 0..40 {
        assert!(rig.fx.has(&format!("alpha/sat-{index}.txt")));
    }
}

#[test]
fn a_dead_reader_is_a_loss_and_is_reopened_never_left_silent() {
    let rig = Rig::scripted("racine-dead-reader");
    rig.start();
    rig.wait_watching();
    assert_eq!(rig.script.opens(), 1);
    fs::write(rig.fx.path("alpha/pendant-la-panne.txt"), b"x").unwrap();
    rig.script.push(ReaderEvent::Failed);
    wait_until(20, "the reader to be reopened", || rig.script.opens() >= 2);
    rig.converge("dead reader");
    assert!(rig.fx.has("alpha/pendant-la-panne.txt"));
    assert!(rig.metrics().wc_cycles >= 2);
    assert_eq!(rig.script.live(), 1, "exactly one reader is open again");
}

// ==========================================================================
// A signal during a reconciliation owes another cycle
// ==========================================================================

#[test]
fn a_signal_during_a_targeted_reconciliation_owes_another_cycle_before_watching() {
    let rig = Rig::scripted("racine-during-wb");
    rig.start();
    rig.wait_watching();
    let fired_at = Arc::new(Mutex::new(None::<u64>));
    {
        let script = rig.script.clone();
        let root = rig.fx.root.clone();
        let history = rig.run.history.clone();
        let fired_at = fired_at.clone();
        rig.run.manager.set_hook(move |point| {
            let mut slot = fired_at.lock().unwrap();
            if point == "after_wb" && slot.is_none() {
                *slot = Some(history.lock().unwrap().last().unwrap().sequence);
                fs::write(root.join("alpha/pendant.txt"), b"pendant").unwrap();
                script.hints(&["alpha/pendant.txt"]);
            }
        });
    }
    fs::write(rig.fx.path("alpha/avant.txt"), b"avant").unwrap();
    rig.script.hints(&["alpha/avant.txt"]);
    rig.converge("during W-B");

    let fired = fired_at.lock().unwrap().expect("the hook fired");
    assert!(
        rig.history()
            .iter()
            .any(|s| s.sequence > fired && s.reason == Some(WatchReason::MoreSignals)),
        "the cycle that knew about new signals must not be announced as finished: {:?}",
        rig.trail()
    );
    // The first WATCHING after the signal already contains what the signal was about.
    let (_, at_watching) = rig
        .snapshot_after(fired)
        .expect("a WATCHING after the signal");
    assert!(at_watching.contains_key("alpha/pendant.txt"), "no gap");
    assert!(rig.metrics().wb_cycles >= 2);
}

#[test]
fn a_signal_during_a_full_verification_owes_another_cycle_before_watching() {
    let rig = Rig::scripted("racine-during-wc");
    let fired_at = Arc::new(Mutex::new(None::<u64>));
    {
        let script = rig.script.clone();
        let root = rig.fx.root.clone();
        let history = rig.run.history.clone();
        let fired_at = fired_at.clone();
        rig.run.manager.set_hook(move |point| {
            let mut slot = fired_at.lock().unwrap();
            if point == "after_wc" && slot.is_none() {
                *slot = Some(history.lock().unwrap().last().unwrap().sequence);
                fs::write(root.join("alpha/pendant-wc.txt"), b"pendant").unwrap();
                script.hints(&["alpha/pendant-wc.txt"]);
            }
        });
    }
    rig.start();
    rig.wait_watching();
    rig.converge("during W-C");
    let fired = fired_at.lock().unwrap().expect("the hook fired");
    let (_, at_watching) = rig
        .snapshot_after(fired)
        .expect("a WATCHING after the signal");
    assert!(
        at_watching.contains_key("alpha/pendant-wc.txt"),
        "WATCHING was announced with a signal still owed"
    );
    assert!(
        rig.trail()
            .contains(&(WatchState::Verifying, Some(WatchReason::MoreSignals)))
    );
}

#[test]
fn an_overflow_during_a_full_verification_starts_another_full_verification() {
    let rig = Rig::scripted("racine-overflow-during-wc");
    let fired = Arc::new(AtomicBool::new(false));
    {
        let script = rig.script.clone();
        let root = rig.fx.root.clone();
        let fired = fired.clone();
        rig.run.manager.set_hook(move |point| {
            if point == "after_wc" && !fired.swap(true, Ordering::SeqCst) {
                // Something changed *and* the system reports that it lost track.
                fs::write(root.join("alpha/apres-le-scan.txt"), b"x").unwrap();
                script.lose(LossReason::OsOverflow);
            }
        });
    }
    rig.start();
    rig.wait_watching();
    rig.converge("overflow during W-C");
    assert!(rig.metrics().wc_cycles >= 2, "{:?}", rig.metrics());
    let (_, at_watching) = rig.snapshot_after(0).expect("a WATCHING");
    assert!(at_watching.contains_key("alpha/apres-le-scan.txt"));
}

#[test]
fn signals_that_never_stop_keep_the_watcher_verifying_and_never_spin_or_hang() {
    let mut config = fast();
    config.max_consecutive_cycles = 3;
    let rig = Rig::scripted_with("racine-churn", config);
    rig.start();
    rig.wait_watching();
    let counter = Arc::new(AtomicUsize::new(0));
    {
        let script = rig.script.clone();
        let root = rig.fx.root.clone();
        let counter = counter.clone();
        rig.run.manager.set_hook(move |point| {
            if point == "after_wb" && counter.load(Ordering::SeqCst) < 12 {
                let n = counter.fetch_add(1, Ordering::SeqCst);
                let relative = format!("alpha/churn-{n}.txt");
                fs::write(root.join(&relative), b"c").unwrap();
                script.hints(&[relative.as_str()]);
            }
        });
    }
    let mark = rig.last_sequence();
    fs::write(rig.fx.path("alpha/churn-start.txt"), b"c").unwrap();
    rig.script.hints(&["alpha/churn-start.txt"]);
    wait_until(60, "the churn to be exhausted", || {
        counter.load(Ordering::SeqCst) >= 12
    });
    rig.converge("after the churn");

    // While the churn lasted, no status claimed a stable state: the single WATCHING after
    // the mark is the one that follows the last signal.
    let stable_after_mark = rig
        .history()
        .iter()
        .filter(|s| s.sequence > mark && s.state == WatchState::Watching)
        .count();
    assert_eq!(stable_after_mark, 1, "{:?}", rig.trail());
    assert!(rig.metrics().wb_cycles >= 3);
}

// ==========================================================================
// The root guard (F-032)
// ==========================================================================

fn move_root_away_and_back(rig: &Rig, native: bool) {
    let before = rig.fx.rows();
    let journal = rig.journal();
    let revision = rig.fx.revision();
    let moved: PathBuf = rig.fx._temp.path().join("racine-emportee");

    fs::rename(&rig.fx.root, &moved).unwrap();
    wait_until(20, "UNAVAILABLE", || {
        let status = rig.status();
        status.state == WatchState::Degraded
            && status.reason == Some(WatchReason::SourceUnavailable)
    });
    assert_eq!(
        rig.status().mode,
        WatchMode::None,
        "nothing is being watched now"
    );
    // The last Index is served untouched, and nothing was turned into a deletion.
    assert_eq!(rig.fx.rows(), before, "the Index is intact");
    assert_eq!(rig.fx.revision(), revision);
    assert_eq!(rig.journal(), journal, "zero DELETED, zero anything");
    assert!(!rig.journal().iter().any(|l| l.starts_with("DELETED")));
    assert_eq!(rig.observation(), SourceState::Unavailable);

    // The same root comes back.
    let wc_before = rig.metrics().wc_cycles;
    let mark = rig.last_sequence();
    fs::rename(&moved, &rig.fx.root).unwrap();
    wait_until(30, "the return to a stable state", || {
        rig.status().state == WatchState::Watching && rig.last_sequence() > mark
    });
    assert!(
        rig.history().iter().any(|s| s.sequence > mark
            && s.state == WatchState::Verifying
            && s.reason == Some(WatchReason::SourceReturned)),
        "{:?}",
        rig.trail()
    );
    assert!(
        rig.metrics().wc_cycles > wc_before,
        "a full verification before stable"
    );
    assert_eq!(rig.observation(), SourceState::Synced);
    if native {
        assert_eq!(
            rig.status().mode,
            WatchMode::Native,
            "a fresh handle was opened"
        );
    }
    rig.converge("the root came back");
}

#[test]
fn a_root_that_leaves_is_unavailable_without_a_single_deletion_and_a_return_is_verified() {
    let rig = Rig::scripted("racine-guard");
    rig.start();
    rig.wait_watching();
    move_root_away_and_back(&rig, false);
}

#[test]
fn the_same_holds_with_the_real_native_handle_which_stays_valid_on_a_moved_directory() {
    // The point of F-032: a renamed directory leaves its handle *valid*, so the loss of
    // the root cannot be inferred from the handle. Only the guard sees it.
    let rig = Rig::native("racine-guard-native");
    rig.start();
    rig.wait_watching();
    move_root_away_and_back(&rig, true);
}

#[test]
fn a_root_replaced_by_another_folder_is_source_changed_and_nothing_is_deleted() {
    let rig = Rig::scripted("racine-replaced");
    rig.start();
    rig.wait_watching();
    let before = rig.fx.rows();
    let journal = rig.journal();
    let moved = rig.fx._temp.path().join("ancienne-racine");

    fs::rename(&rig.fx.root, &moved).unwrap();
    fs::create_dir(&rig.fx.root).unwrap();
    fs::write(rig.fx.path("autre.txt"), b"un autre dossier").unwrap();
    wait_until(20, "SOURCE_CHANGED", || {
        rig.status().reason == Some(WatchReason::SourceChanged)
    });
    assert_eq!(rig.status().state, WatchState::Degraded);
    assert_eq!(rig.fx.rows(), before, "the Index is intact");
    assert_eq!(rig.journal(), journal, "no deletion, no creation");
    assert_eq!(rig.observation(), SourceState::SourceChanged);
    // It does not loop through full scans while the root stays replaced.
    let wc = rig.metrics().wc_cycles;
    sleep(800);
    assert_eq!(
        rig.metrics().wc_cycles,
        wc,
        "no scan while the root is refused"
    );

    // The person accepts the new folder: **Reconstruire**. The watcher follows.
    rebuild_map(&rig.fx.paths, &rig.fx.brain).expect("explicit rebuild");
    rig.run.manager.after_manual(&rig.fx.brain);
    wait_until(30, "a stable state on the new root", || {
        rig.status().state == WatchState::Watching
    });
    assert_eq!(rig.observation(), SourceState::Synced);
    rig.converge("after accepting the replaced root");
    assert!(rig.fx.has("autre.txt"));
    assert!(!rig.fx.has("alpha/a1.txt"));
}

#[test]
fn a_root_that_is_absent_at_launch_is_degraded_and_never_reported_as_watching() {
    let rig = Rig::scripted("racine-absente-au-lancement");
    let moved = rig.fx._temp.path().join("racine-absente");
    fs::rename(&rig.fx.root, &moved).unwrap();
    let before = rig.fx.rows();
    rig.start();
    wait_until(20, "DEGRADED", || {
        rig.status().state == WatchState::Degraded
    });
    assert_eq!(rig.status().reason, Some(WatchReason::SourceUnavailable));
    assert!(
        !rig.trail()
            .iter()
            .any(|(state, _)| *state == WatchState::Watching)
    );
    assert_eq!(rig.fx.rows(), before);
    assert_eq!(rig.observation(), SourceState::Unavailable);
    fs::rename(&moved, &rig.fx.root).unwrap();
    rig.wait_watching();
    assert_eq!(rig.observation(), SourceState::Synced);
    rig.converge("the source came back after a degraded launch");
}

// ==========================================================================
// No native mechanism: honest periodic verification
// ==========================================================================

#[test]
fn without_a_native_mechanism_the_watcher_is_periodic_and_never_says_watching() {
    let rig = Rig::with_backend("racine-periodic", Arc::new(UnsupportedBackend));
    rig.start();
    let periodic = rig.wait_state(30, WatchState::Periodic);
    assert_eq!(periodic.mode, WatchMode::Periodic);
    assert_eq!(periodic.reason, Some(WatchReason::NativeUnsupported));
    assert!(
        !rig.trail()
            .iter()
            .any(|(state, _)| *state == WatchState::Watching),
        "{:?}",
        rig.trail()
    );

    // A change nobody signalled is found by the cadence, and converges.
    fs::write(rig.fx.path("alpha/periodique.txt"), b"x").unwrap();
    fs::remove_file(rig.fx.path("small/side.txt")).unwrap();
    wait_until(30, "the periodic verification", || {
        rig.fx.has("alpha/periodique.txt") && !rig.fx.has("small/side.txt")
    });
    assert!(rig.metrics().wc_cycles >= 2);
    wait_until(30, "periodic again", || {
        rig.status().state == WatchState::Periodic
    });
    assert_eq!(
        diff(&rig.fx.rows(), &reference_rows(&rig.fx.root, true)),
        None
    );
}

#[test]
fn a_backend_that_declares_itself_unsupported_at_open_is_periodic_too() {
    let rig = Rig::scripted("racine-unsupported-open");
    rig.script.fail_open_with(Some(OpenError::Unsupported));
    rig.start();
    rig.wait_state(30, WatchState::Periodic);
    assert_eq!(rig.script.opens(), 0);
    rig.script.fail_open_with(None);
}

#[test]
fn a_healthy_native_watcher_does_not_use_the_periodic_fallback() {
    let rig = Rig::native("racine-native-idle");
    rig.start();
    rig.wait_watching();
    sleep(1500); // six periodic intervals of the fast configuration
    assert_eq!(rig.status().state, WatchState::Watching);
    assert_eq!(rig.status().mode, WatchMode::Native);
    assert_eq!(rig.metrics().wc_cycles, 1, "only the initial verification");
}

// ==========================================================================
// The real operating system
// ==========================================================================

#[test]
fn real_changes_deep_in_the_tree_reach_the_index_without_any_manual_action() {
    let rig = Rig::native("racine-native");
    rig.start();
    let watching = rig.wait_watching();
    assert_eq!(watching.mode, WatchMode::Native);
    let before = rig.fx.revision();

    fs::write(rig.fx.path("alpha/sub/cree.txt"), b"cree").unwrap();
    fs::write(
        rig.fx.path("small/deep/leaf.txt"),
        b"feuille modifiee par un tiers",
    )
    .unwrap();
    fs::remove_file(rig.fx.path("small/deep/other.txt")).unwrap();
    fs::rename(
        rig.fx.path("alpha/a1.txt"),
        rig.fx.path("alpha/a1-renomme.txt"),
    )
    .unwrap();
    fs::create_dir_all(rig.fx.path("big/g4/nouveau/dessous")).unwrap();
    fs::write(rig.fx.path("big/g4/nouveau/dessous/f.txt"), b"f").unwrap();
    fs::rename(rig.fx.path("small/side.txt"), rig.fx.path("beta/side.txt")).unwrap();
    rig.converge("real changes");

    let metrics = rig.metrics();
    assert!(
        metrics.wb_cycles >= 1,
        "changes were absorbed by targeted cycles: {metrics:?}"
    );
    assert!(rig.fx.revision() > before, "no Actualiser was pressed");
    let journal = rig.journal();
    for nature in ["CREATED", "MODIFIED", "DELETED", "RENAMED", "MOVED"] {
        assert!(
            journal.iter().any(|l| l.starts_with(nature)),
            "{nature}: {journal:#?}"
        );
    }
    // The same rows that the interface's "new / unseen" reads: the events are unseen.
    let store = crate::map::commands::open_store(&rig.fx.paths, &rig.fx.brain).unwrap();
    let unseen: i64 = store
        .index
        .connection
        .query_row(
            "SELECT COUNT(*) FROM change_events e
              WHERE e.event_id NOT IN (SELECT event_id FROM seen_change_events)
                AND e.event_id > COALESCE((SELECT CAST(value AS INTEGER) FROM schema_meta
                                            WHERE key = 'seen_through_event_id'), 0)",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert!(
        unseen >= 5,
        "new events are unseen by DEC-0036's own rule: {unseen}"
    );
}

/// Hint bursts through the real reader and the real product engine, several times over.
#[test]
fn a_real_burst_of_a_few_hundred_changes_converges_to_the_full_scan() {
    let rig = Rig::native("racine-native-burst");
    rig.start();
    rig.wait_watching();
    for round in 0..3 {
        for index in 0..120 {
            let dir = format!("big/g{}", index % 10);
            fs::write(
                rig.fx.path(&format!("{dir}/rafale-{round}-{index}.txt")),
                vec![b'r'; index + 1],
            )
            .unwrap();
        }
        for index in 0..40 {
            let _ = fs::remove_file(rig.fx.path(&format!("big/g{}/f{}.txt", index % 10, index)));
        }
        rig.converge(&format!("round {round}"));
    }
}

// ==========================================================================
// The 10 000-event rejection test (F-030, O1)
// ==========================================================================

/// Ten thousand external operations on a real Windows tree, through the real reader and
/// the product engine, with `config`. Returns the metrics for the caller's own claim.
fn ten_thousand_external_changes(name: &str, config: WatchConfig) -> super::types::WatchMetrics {
    let fx = Fx::new(name);
    let run = run_manager(&fx, Arc::new(NativeBackend), config, true);
    let rig = Rig {
        fx,
        script: ScriptedBackend::default(),
        run,
    };
    // A wider synthetic tree: 100 directories of 20 files.
    for dir in 0..100 {
        let path = rig.fx.path(&format!("mass/d{dir:03}"));
        fs::create_dir_all(&path).unwrap();
        for file in 0..20 {
            fs::write(path.join(format!("f{file:02}.txt")), b"base").unwrap();
        }
    }
    refresh_map(&rig.fx.paths, &rig.fx.brain).expect("baseline with the wide tree");
    let before_keys: std::collections::BTreeMap<String, String> = rig.fx.rows();
    rig.start();
    rig.wait_watching();
    let revision_before = rig.fx.revision();

    // Ten thousand operations, as fast as the volume takes them, from outside FileTopo.
    let started = Instant::now();
    let root = rig.fx.root.clone();
    let mut operations = 0usize;
    for dir in 0..100 {
        let path = root.join(format!("mass/d{dir:03}"));
        for file in 0..20 {
            fs::write(path.join(format!("n{file:02}.txt")), b"neuf").unwrap(); // 2 000 creates
            operations += 1;
        }
        for file in 0..20 {
            fs::write(path.join(format!("f{file:02}.txt")), b"modifie plus long").unwrap(); // 2 000
            operations += 1;
        }
        for file in 0..10 {
            fs::remove_file(path.join(format!("f{file:02}.txt"))).unwrap(); // 1 000 deletes
            operations += 1;
        }
        for file in 10..20 {
            fs::rename(
                path.join(format!("f{file:02}.txt")),
                path.join(format!("r{file:02}.txt")),
            )
            .unwrap(); // 1 000 renames
            operations += 1;
        }
        for file in 0..20 {
            fs::write(path.join(format!("n{file:02}.txt")), b"neuf, retouche").unwrap(); // 2 000
            operations += 1;
        }
        for file in 0..10 {
            fs::write(path.join(format!("z{file:02}.txt")), b"z").unwrap(); // 1 000 creates
            fs::remove_file(path.join(format!("z{file:02}.txt"))).unwrap(); // 1 000 deletes
            operations += 2;
        }
    }
    assert_eq!(operations, 10_000, "ten thousand external operations");
    let mutated_in = started.elapsed();

    let converge_started = Instant::now();
    rig.converge("ten thousand changes");
    let converged_in = converge_started.elapsed();

    let metrics = rig.metrics();
    println!(
        "F030-10K operations={operations} mutated_ms={} converged_ms={} queue_max_len={} \
         wb_cycles={} wb_escalations={} wc_cycles={} signals_received={} signals_coalesced={} \
         losses={} commits={}",
        mutated_in.as_millis(),
        converged_in.as_millis(),
        metrics.queue_max_len,
        metrics.wb_cycles,
        metrics.wb_escalations,
        metrics.wc_cycles,
        metrics.signals_received,
        metrics.signals_coalesced,
        metrics.losses,
        metrics.commits
    );
    assert!(rig.fx.revision() > revision_before);
    assert!(
        metrics.queue_max_len <= 4096,
        "the queue stayed within its bound"
    );

    // The journal is coherent with the net effect: every object that exists now and did
    // not before was created; every one that existed before and is gone was deleted.
    let now = rig.fx.rows();
    let store = crate::map::commands::open_store(&rig.fx.paths, &rig.fx.brain).unwrap();
    let event_paths = |nature: &str, column: &str| -> std::collections::BTreeSet<String> {
        let mut statement = store
            .index
            .connection
            .prepare(&format!(
                "SELECT {column} FROM change_events WHERE nature = ?1 AND {column} IS NOT NULL"
            ))
            .unwrap();
        statement
            .query_map([nature], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap()
    };
    let created = event_paths("CREATED", "new_relative_path");
    let deleted = event_paths("DELETED", "old_relative_path");
    let renamed_to = event_paths("RENAMED", "new_relative_path");
    let renamed_from = event_paths("RENAMED", "old_relative_path");
    for path in now.keys().filter(|path| !before_keys.contains_key(*path)) {
        // Renamed objects appear under a new path as RENAMED, not CREATED.
        assert!(
            created.contains(path) || renamed_to.contains(path),
            "no creation for {path}"
        );
    }
    for path in before_keys.keys().filter(|path| !now.contains_key(*path)) {
        assert!(
            deleted.contains(path) || renamed_from.contains(path),
            "no deletion for {path}"
        );
    }
    // FileTopo's own state lives outside the analysed root, and nothing of it was written
    // into the source.
    assert!(!rig.fx.paths.state_root().starts_with(&rig.fx.root));
    metrics
}

/// The targeted path: the queue holds the burst and `W-B` absorbs it.
#[test]
fn ten_thousand_external_changes_converge_to_the_exact_full_scan() {
    let metrics = ten_thousand_external_changes("racine-10k", fast());
    // Whichever way the burst was absorbed — targeted, or (when the machine is busy and the
    // reader outruns the reconciler) overflowed into a full verification — the result was
    // checked to be exactly the full scan. Something reconciled it, on its own.
    assert!(
        metrics.wb_cycles >= 1 || metrics.wc_cycles >= 2,
        "the burst was reconciled by the watcher: {metrics:?}"
    );
    assert!(metrics.commits >= 1, "{metrics:?}");
}

/// The overflow path: a queue far smaller than the burst turns it into a loss, and the loss
/// into a full verification — and the result is exactly as right.
#[test]
fn ten_thousand_external_changes_through_an_overflowing_queue_converge_via_a_full_verification() {
    let mut config = fast();
    config.queue_capacity = 64;
    config.max_scopes = 8;
    let metrics = ten_thousand_external_changes("racine-10k-overflow", config);
    assert!(metrics.losses >= 1, "the queue overflowed: {metrics:?}");
    assert!(
        metrics.wc_cycles >= 2,
        "the loss was verified in full: {metrics:?}"
    );
    assert!(metrics.queue_max_len <= 64, "{metrics:?}");
}

// ==========================================================================
// Coordination with Actualiser / Reconstruire
// ==========================================================================

#[test]
fn a_manual_actualiser_racing_the_watcher_is_serialised_and_nothing_is_journalled_twice() {
    let rig = Rig::native("racine-concurrent");
    rig.start();
    rig.wait_watching();
    let paths = rig.fx.paths.clone();
    let brain = rig.fx.brain.clone();
    let stop = Arc::new(AtomicBool::new(false));
    let completed = Arc::new(AtomicUsize::new(0));
    let refreshes = {
        let stop = stop.clone();
        let completed = completed.clone();
        std::thread::spawn(move || {
            while !stop.load(Ordering::SeqCst) {
                refresh_map(&paths, &brain).expect("a manual Actualiser never fails here");
                completed.fetch_add(1, Ordering::SeqCst);
                std::thread::sleep(Duration::from_millis(25));
            }
        })
    };
    for index in 0..30 {
        fs::write(
            rig.fx.path(&format!("alpha/sub/course-{index:02}.txt")),
            b"course",
        )
        .unwrap();
        sleep(20);
    }
    wait_until(60, "the manual gesture to have run alongside", || {
        completed.load(Ordering::SeqCst) >= 3
    });
    stop.store(true, Ordering::SeqCst);
    refreshes.join().expect("refresh thread");
    rig.converge("watcher and Actualiser together");

    let journal = rig.journal();
    let created = journal
        .iter()
        .filter(|line| line.starts_with("CREATED") && line.contains("course-"))
        .count();
    assert_eq!(
        created, 30,
        "each file is journalled exactly once: {journal:#?}"
    );
}

#[test]
fn an_index_that_needs_the_manual_actualiser_is_never_written_by_the_watcher() {
    let rig = Rig::scripted("racine-needs-manual");
    rig.fx.downgrade_to_v3();
    let before = rig.fx.dump_file();
    rig.start();
    wait_until(20, "DEGRADED", || {
        rig.status().state == WatchState::Degraded
    });
    assert_eq!(rig.status().reason, Some(WatchReason::NeedsManualRefresh));
    fs::write(rig.fx.path("alpha/pas-touche.txt"), b"x").unwrap();
    rig.script.hints(&["alpha/pas-touche.txt"]);
    sleep(600);
    assert_eq!(
        rig.fx.dump_file(),
        before,
        "no migration, no restamp, no write"
    );
    assert_eq!(rig.metrics().wc_cycles, 0);
}

// ==========================================================================
// Brains stay isolated
// ==========================================================================

#[test]
fn two_brains_are_watched_independently_and_never_bleed_into_each_other() {
    let rig = Rig::native("racine-a");
    let root_b = rig.fx._temp.path().join("racine-b");
    fs::create_dir_all(root_b.join("dossier")).unwrap();
    fs::write(root_b.join("dossier/b.txt"), b"b").unwrap();
    let brain_b = register_real_root(&rig.fx.paths, &root_b).expect("brain b");
    refresh_map(&rig.fx.paths, &brain_b).expect("index b");
    let revision_b = open_map(&rig.fx.paths, &brain_b).unwrap().revision;

    rig.start();
    rig.run.manager.ensure(&brain_b);
    rig.wait_watching();
    wait_until(30, "brain b", || {
        rig.run.manager.status(&brain_b.brain_id).state == WatchState::Watching
    });

    fs::write(rig.fx.path("alpha/seulement-a.txt"), b"a").unwrap();
    rig.converge("brain a");
    assert_eq!(
        open_map(&rig.fx.paths, &brain_b).unwrap().revision,
        revision_b,
        "brain b was not touched by a change in brain a"
    );
    // (A late notification for brain b's own creation may briefly make it verify.)
    wait_until(30, "brain b watching", || {
        rig.run.manager.status(&brain_b.brain_id).state == WatchState::Watching
    });

    // Stopping a leaves b watching, and a change in b converges alone.
    rig.run.manager.stop(&rig.fx.brain.brain_id);
    assert_eq!(rig.status().state, WatchState::Stopped);
    fs::write(root_b.join("dossier/seulement-b.txt"), b"b").unwrap();
    wait_until(30, "brain b converges", || {
        diff(
            &dump_rows(&rig.fx.paths, &brain_b, true),
            &reference_rows(&root_b, true),
        )
        .is_none()
    });
    wait_until(30, "brain b watching", || {
        rig.run.manager.status(&brain_b.brain_id).state == WatchState::Watching
    });
}

#[test]
fn a_synthetic_brain_and_a_brain_never_indexed_are_not_watched() {
    let rig = Rig::scripted("racine-eligibility");
    let fresh_root = rig.fx._temp.path().join("racine-neuve");
    fs::create_dir_all(&fresh_root).unwrap();
    let unindexed = register_real_root(&rig.fx.paths, &fresh_root).unwrap();
    assert_eq!(
        rig.run.manager.ensure(&unindexed).state,
        WatchState::Stopped
    );
    let catalog = crate::map::brains::BrainCatalog::open(&rig.fx.paths.catalog_database()).unwrap();
    let synthetic = catalog
        .list()
        .unwrap()
        .into_iter()
        .find(|brain| brain.source_kind == crate::map::brains::SourceKind::SyntheticFixture);
    if let Some(synthetic) = synthetic {
        assert_eq!(
            rig.run.manager.ensure(&synthetic).state,
            WatchState::Stopped
        );
    }
    assert_eq!(rig.script.opens(), 0, "no reader was opened for either");
}

#[test]
fn ensure_is_idempotent_and_a_restart_gets_a_higher_sequence() {
    let rig = Rig::scripted("racine-idempotent");
    rig.start();
    rig.start();
    rig.start();
    rig.wait_watching();
    assert_eq!(
        rig.script.opens(),
        1,
        "one reader, however many times it was asked for"
    );
    let sequence = rig.last_sequence();
    rig.run.manager.stop(&rig.fx.brain.brain_id);
    assert_eq!(rig.status().state, WatchState::Stopped);
    rig.start();
    rig.wait_watching();
    assert!(rig.last_sequence() > sequence);
    let sequences: Vec<u64> = rig.history().iter().map(|s| s.sequence).collect();
    assert!(
        sequences.windows(2).all(|pair| pair[0] < pair[1]),
        "strictly increasing: {sequences:?}"
    );
}

// ==========================================================================
// A clean shutdown
// ==========================================================================

#[test]
fn shutdown_releases_the_reader_and_leaves_nothing_blocked() {
    let rig = Rig::scripted("racine-shutdown");
    rig.start();
    rig.wait_watching();
    assert_eq!(rig.script.live(), 1);
    let started = Instant::now();
    rig.run.manager.shutdown(Duration::from_secs(5));
    assert!(
        started.elapsed() < Duration::from_secs(3),
        "{:?}",
        started.elapsed()
    );
    assert_eq!(rig.script.live(), 0, "the reader was dropped");
    assert_eq!(rig.status().state, WatchState::Stopped);
}

/// The native handle is released for real, and the operating system says so: while the
/// watcher lives an exclusive open of the root hits a sharing violation; once it is shut down
/// it does not.
#[test]
fn shutdown_closes_the_native_handle_and_the_operating_system_agrees() {
    use super::native::{OPEN_ROOTS, tests::is_free_of_other_handles};
    let rig = Rig::native("racine-native-shutdown");
    assert!(
        is_free_of_other_handles(&rig.fx.root),
        "control: nothing holds the root yet"
    );
    rig.start();
    rig.wait_watching();
    assert!(
        !is_free_of_other_handles(&rig.fx.root),
        "while the watcher lives, the root is held by its handle"
    );
    // The catalogue holds the canonical form of the root the person chose.
    let canonical = fs::canonicalize(&rig.fx.root).unwrap();
    assert!(OPEN_ROOTS.lock().unwrap().contains(&canonical));
    let started = Instant::now();
    rig.run.manager.shutdown(Duration::from_secs(5));
    assert!(
        started.elapsed() < Duration::from_secs(3),
        "{:?}",
        started.elapsed()
    );
    assert!(
        is_free_of_other_handles(&rig.fx.root),
        "the handle was closed"
    );
    assert!(!OPEN_ROOTS.lock().unwrap().contains(&canonical));
}

#[test]
fn a_shutdown_during_a_full_verification_cancels_it_and_leaves_the_index_untouched() {
    let rig = Rig::scripted("racine-cancel");
    // Slow the initial verification down so the shutdown lands inside it.
    rig.run.manager.set_hook(|point| {
        if point == "before_wc" {
            std::thread::sleep(Duration::from_millis(400));
        }
    });
    let before = rig.fx.dump_file();
    rig.start();
    wait_until(10, "the verification to begin", || {
        rig.history()
            .iter()
            .any(|s| s.reason == Some(WatchReason::InitialCheck))
    });
    let started = Instant::now();
    rig.run.manager.shutdown(Duration::from_secs(5));
    assert!(
        started.elapsed() < Duration::from_secs(4),
        "{:?}",
        started.elapsed()
    );
    assert_eq!(
        rig.fx.dump_file(),
        before,
        "a cancelled verification writes nothing"
    );
    assert_eq!(
        rig.observation(),
        SourceState::Synced,
        "and is no observation of the source"
    );
}

// ==========================================================================
// ACTION-0071 — a shutdown never detaches a worker, even one waiting for the lock
// ==========================================================================
//
// Before `ACTION-0071`, a watcher took `PUBLICATION_LOCK` with a blocking `Mutex::lock`, and
// `shutdown(patience)` dropped — **detached** — any `JoinHandle` still running at its
// deadline. With a manual gesture holding the lock, the worker never reached a point that
// looks at its stop flag: `shutdown` returned with the worker alive (no `STOPPED` announced,
// its reader still open), and once the lock was released the detached worker published a
// late revision and late statuses. Each proof below reproduces exactly that situation and
// fails on that code at "the last status at return is STOPPED", "the reader is released",
// and "nothing late".

/// What a shutdown looked like while a "manual gesture" held the publication lock. Captured
/// with the lock held and asserted only **after** it is released: a failing assertion must not
/// poison the process-wide lock for every other test.
struct HeldLockShutdown {
    reached: bool,
    status_while_waiting: Option<WatchStatus>,
    metrics_while_waiting: super::types::WatchMetrics,
    report: super::ShutdownReport,
    took: Duration,
    last_at_return: Option<WatchState>,
    history_at_return: usize,
    live_at_return: usize,
    file_at_return: String,
}

/// Arms the hook `point`, runs `trigger`, waits until the worker has reached the hook — after
/// which nothing stands between it and the wait for the publication lock — lets it wait,
/// then shuts the manager down with a **very short patience, the lock still held**. The lock
/// is released only after `shutdown` has returned.
fn shutdown_while_the_lock_is_held(
    rig: &Rig,
    point: &'static str,
    trigger: impl FnOnce(),
) -> HeldLockShutdown {
    let armed = Arc::new(AtomicBool::new(false));
    let reached = Arc::new(AtomicBool::new(false));
    {
        let armed = armed.clone();
        let reached = reached.clone();
        rig.run.manager.set_hook(move |at| {
            if at == point && armed.load(Ordering::SeqCst) {
                reached.store(true, Ordering::SeqCst);
            }
        });
    }
    // "A manual Actualiser is running": it holds the one publication lock.
    let manual = crate::map::watch_ops::hold_publication_lock();
    armed.store(true, Ordering::SeqCst);
    trigger();
    let deadline = Instant::now() + Duration::from_secs(20);
    while !reached.load(Ordering::SeqCst) && Instant::now() < deadline {
        sleep(10);
    }
    // Inside the wait for the lock, and staying there.
    sleep(300);
    let status_while_waiting = rig.history().last().cloned();
    let metrics_while_waiting = rig.metrics();

    let started = Instant::now();
    let report = rig.run.manager.shutdown(Duration::from_millis(1));
    let took = started.elapsed();
    let history = rig.history();
    let outcome = HeldLockShutdown {
        reached: reached.load(Ordering::SeqCst),
        status_while_waiting,
        metrics_while_waiting,
        report,
        took,
        last_at_return: history.last().map(|status| status.state),
        history_at_return: history.len(),
        live_at_return: rig.script.live(),
        file_at_return: rig.fx.dump_file(),
    };
    // Only now does the "manual gesture" finish.
    drop(manual);
    outcome
}

/// After the lock is released, a detached worker would have gone on: wait well beyond every
/// cadence and check that nothing happened.
fn assert_nothing_late(rig: &Rig, outcome: &HeldLockShutdown, revision: u64, file: &str) {
    sleep(1_000);
    assert_eq!(
        rig.history().len(),
        outcome.history_at_return,
        "no status after shutdown returned: {:?}",
        rig.trail()
    );
    assert_eq!(rig.fx.revision(), revision, "no late revision");
    assert_eq!(rig.fx.dump_file(), file, "no late write, no partial batch");
    assert_eq!(rig.script.live(), 0, "the reader stays released");
    assert_eq!(rig.status().state, WatchState::Stopped);
}

fn assert_joined_while_held(outcome: &HeldLockShutdown, file: &str) {
    assert!(
        outcome.reached,
        "the worker reached the publication attempt"
    );
    assert_eq!(
        outcome.report.joined, 1,
        "the worker was joined, not detached"
    );
    assert!(
        outcome.took < Duration::from_secs(3),
        "bounded without releasing the lock: {:?}",
        outcome.took
    );
    assert_eq!(
        outcome.last_at_return,
        Some(WatchState::Stopped),
        "the worker announced STOPPED before shutdown returned"
    );
    assert_eq!(
        outcome.live_at_return, 0,
        "the reader was released before return"
    );
    assert_eq!(outcome.file_at_return, file, "nothing was written");
}

/// `T1` — a full verification (`W-C`) waiting for a lock a manual gesture holds.
#[test]
fn a_shutdown_while_a_full_verification_waits_for_the_publication_lock_joins_the_worker() {
    let rig = Rig::scripted("racine-verrou-wc");
    rig.start();
    rig.wait_watching();
    // A change only a publication would record: a late one would show.
    fs::write(rig.fx.path("alpha/tardif.txt"), b"ecrit pendant le verrou").unwrap();
    let revision = rig.fx.revision();
    let file = rig.fx.dump_file();

    let outcome = shutdown_while_the_lock_is_held(&rig, "before_wc", || {
        rig.run.manager.inject_loss(&rig.fx.brain.brain_id);
    });

    let waiting = outcome.status_while_waiting.clone().expect("a status");
    assert_eq!(
        (waiting.state, waiting.reason),
        (WatchState::Verifying, Some(WatchReason::SignalsLost)),
        "the worker was inside the loss's W-C, waiting"
    );
    assert_eq!(
        outcome.metrics_while_waiting.wc_cycles, 2,
        "the initial W-C, then the loss's"
    );
    assert_joined_while_held(&outcome, &file);
    assert_nothing_late(&rig, &outcome, revision, &file);

    // Control: the change was real — the manual gesture does publish it.
    refresh_map(&rig.fx.paths, &rig.fx.brain).unwrap();
    assert!(rig.fx.revision() > revision);
}

/// `T2` — a targeted reconciliation (`W-B`) takes the **same** cancellable acquisition: a
/// hint while the lock is held, then a shutdown. No batch, partial or whole.
#[test]
fn a_shutdown_while_a_targeted_reconciliation_waits_for_the_publication_lock_joins_the_worker() {
    let rig = Rig::scripted("racine-verrou-wb");
    rig.start();
    rig.wait_watching();
    fs::write(rig.fx.path("alpha/tardif.txt"), b"ecrit pendant le verrou").unwrap();
    let revision = rig.fx.revision();
    let file = rig.fx.dump_file();

    let outcome = shutdown_while_the_lock_is_held(&rig, "before_wb", || {
        rig.script.hints(&["alpha/tardif.txt"]);
    });

    let waiting = outcome.status_while_waiting.clone().expect("a status");
    assert_eq!(
        (waiting.state, waiting.reason),
        (WatchState::Verifying, None),
        "the worker was inside the hint's W-B, waiting"
    );
    let metrics = outcome.metrics_while_waiting;
    assert_eq!(
        (metrics.wc_cycles, metrics.wb_cycles, metrics.wb_escalations),
        (1, 1, 0),
        "a targeted reconciliation, not an escalation: {metrics:?}"
    );
    assert_joined_while_held(&outcome, &file);
    assert_nothing_late(&rig, &outcome, revision, &file);
    assert_eq!(rig.observation(), SourceState::Synced, "no observation");

    refresh_map(&rig.fx.paths, &rig.fx.brain).unwrap();
    assert!(rig.fx.revision() > revision, "control: the change was real");
}

/// The root guard's record takes the lock too, and just as cancellably: a root that leaves
/// while the lock is held, then a shutdown — no observation is written afterwards.
#[test]
fn a_shutdown_while_the_root_guard_waits_for_the_publication_lock_joins_the_worker() {
    let rig = Rig::scripted("racine-verrou-garde");
    rig.start();
    rig.wait_watching();
    let revision = rig.fx.revision();
    let file = rig.fx.dump_file();
    let moved = rig.fx._temp.path().join("racine-emportee");

    let outcome = shutdown_while_the_lock_is_held(&rig, "before_guard_record", || {
        fs::rename(&rig.fx.root, &moved).unwrap();
    });

    assert_joined_while_held(&outcome, &file);
    assert_nothing_late(&rig, &outcome, revision, &file);
    assert_eq!(
        rig.observation(),
        SourceState::Synced,
        "the cancelled guard recorded nothing, now or later"
    );
}

// ==========================================================================
// Nothing sensitive leaves, and nothing is logged
// ==========================================================================

#[test]
fn no_status_carries_a_path_a_name_a_key_or_an_os_message() {
    let rig = Rig::scripted("racine-CONFIDENTIELLE-9F3A");
    rig.start();
    rig.wait_watching();
    fs::create_dir_all(rig.fx.path("alpha/dossier-SECRET-7Q2")).unwrap();
    fs::write(
        rig.fx
            .path("alpha/dossier-SECRET-7Q2/fichier-SECRET-7Q2.txt"),
        b"s",
    )
    .unwrap();
    rig.script
        .hints(&["alpha/dossier-SECRET-7Q2/fichier-SECRET-7Q2.txt"]);
    rig.converge("secret names");
    // A loss, a source refusal and a return, to exercise every kind of status.
    rig.run.manager.inject_loss(&rig.fx.brain.brain_id);
    let moved = rig.fx._temp.path().join("emportee-SECRET");
    fs::rename(&rig.fx.root, &moved).unwrap();
    wait_until(20, "degraded", || {
        rig.status().state == WatchState::Degraded
    });
    fs::rename(&moved, &rig.fx.root).unwrap();
    rig.wait_watching();

    let temp = rig.fx._temp.path().to_string_lossy().to_string();
    let history = rig.history();
    assert!(history.len() >= 6);
    let mut keys: std::collections::BTreeSet<String> = Default::default();
    for status in &history {
        let json = serde_json::to_string(status).unwrap();
        for forbidden in [
            "SECRET",
            "CONFIDENTIELLE",
            "fichier",
            "dossier",
            "alpha",
            "\\\\",
            "C:",
            "SYS1",
            "PFv1",
            temp.as_str(),
        ] {
            assert!(!json.contains(forbidden), "{forbidden} leaked into {json}");
        }
        let value: serde_json::Value = serde_json::from_str(&json).unwrap();
        keys.extend(value.as_object().unwrap().keys().cloned());
    }
    assert_eq!(
        keys.into_iter().collect::<Vec<_>>(),
        vec![
            "brainId",
            "indexRevision",
            "mode",
            "pending",
            "reason",
            "sequence",
            "state"
        ],
        "the closed envelope, and nothing else"
    );
}

/// The watcher module contains no logging at all: nothing it does can print a name.
#[test]
fn the_watcher_sources_never_log_or_print() {
    for (name, source) in [
        ("mod.rs", include_str!("mod.rs")),
        ("worker.rs", include_str!("worker.rs")),
        ("queue.rs", include_str!("queue.rs")),
        ("parser.rs", include_str!("parser.rs")),
        ("backend.rs", include_str!("backend.rs")),
        ("coalesce.rs", include_str!("coalesce.rs")),
        ("types.rs", include_str!("types.rs")),
        ("native.rs", include_str!("native.rs")),
        ("../scope.rs", include_str!("../scope.rs")),
        ("../map/watch_ops.rs", include_str!("../map/watch_ops.rs")),
    ] {
        let code: String = source
            .split("mod tests {")
            .next()
            .unwrap_or_default()
            .lines()
            .filter(|line| !line.trim_start().starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n");
        for forbidden in [
            "println!",
            "eprintln!",
            "dbg!",
            "log::",
            "tracing::",
            "print!(",
        ] {
            // A whole word: `Catalog::open` is not `log::`.
            let mut from = 0;
            while let Some(at) = code[from..].find(forbidden) {
                let start = from + at;
                let boundary = code[..start]
                    .chars()
                    .next_back()
                    .is_none_or(|c| !(c.is_alphanumeric() || c == '_'));
                assert!(!boundary, "{name} uses {forbidden}");
                from = start + forbidden.len();
            }
        }
    }
}
