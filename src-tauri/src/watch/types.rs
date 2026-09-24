//! Closed vocabulary of the automatic watcher — `TASK-0043`, `DEC-0041` §8.
//!
//! Everything here is a number, a bool or a member of a **closed** set. There is
//! no path, no file name, no stable key, no file identity, no volume number and no
//! operating-system message in any of these types, so none of them can carry one to
//! the interface, to an event or to a log. That is a property of the **types**, not
//! of the discipline of whoever fills them.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// `DEC-0041` §8. Process-local, not persisted, not rebuildable: a fresh process
/// starts at [`WatchState::Stopped`] and earns every other state again.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WatchState {
    /// No worker runs for this brain.
    Stopped,
    /// A worker is starting: the native handle is being opened. **Never** shown as
    /// watching.
    Starting,
    /// A reconciliation (`W-B` or `W-C`) is running or is owed. The Index served is
    /// the last committed one; it is **not** claimed to be current.
    Verifying,
    /// The native mechanism is active and the last reconciliation converged with a
    /// calm window behind it.
    Watching,
    /// The native mechanism is unavailable: the brain is re-verified in full on a
    /// fixed cadence instead. Never presented as [`WatchState::Watching`].
    Periodic,
    /// The source cannot be read reliably (or a reconciliation keeps failing): the
    /// last reliable Index keeps being served, and the reason says why.
    Degraded,
}

/// How changes are noticed for this brain.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WatchMode {
    Native,
    Periodic,
    None,
}

/// Why the watcher is in the state it is in. Closed: chosen from this list, never
/// formatted from an error.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WatchReason {
    // ---- why a verification is running
    /// The mandatory first full verification after a start (nothing produced while
    /// the application was closed could have been observed).
    InitialCheck,
    /// The operating system or FileTopo lost signals (buffer overflow, an
    /// unparseable record, a reader failure).
    SignalsLost,
    /// FileTopo's own bounded queue was full.
    QueueSaturated,
    /// The changed area could not be established honestly (or was too wide).
    ScopeUnsafe,
    /// The periodic cadence came round.
    PeriodicCheck,
    /// The same source came back after having been absent or unreadable.
    SourceReturned,
    /// Signals arrived while a reconciliation was running: another cycle is owed.
    MoreSignals,
    /// A previous reconciliation failed and is being retried.
    Retry,
    // ---- why the mode is periodic
    NativeUnsupported,
    // ---- why the watcher is degraded
    SourceUnavailable,
    SourceChanged,
    ScanIncomplete,
    ApplyFailed,
    /// The Index predates durable identities or the source binding: only a manual
    /// **Actualiser** may restamp it — the watcher never replaces a corpus.
    NeedsManualRefresh,
}

/// **The whole of what the interface reads about a watcher** — and the payload of
/// the backend event. One brain, a closed state, a closed mode, a revision, a
/// bool and a sequence number. **No path, no name, no key, no identity, no OS text.**
///
/// `sequence` is strictly increasing per process, across watcher restarts, so an
/// interface that keeps the highest value it has seen for a brain can ignore any
/// older event that arrives late.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchStatus {
    pub brain_id: String,
    pub state: WatchState,
    pub mode: WatchMode,
    pub reason: Option<WatchReason>,
    /// The revision of the Index the watcher last saw committed. `None` until the
    /// first read.
    pub index_revision: Option<u64>,
    /// Signals were queued or a reconciliation was owed at the time of this status.
    pub pending: bool,
    pub sequence: u64,
}

impl WatchStatus {
    pub(crate) fn stopped(brain_id: &str) -> Self {
        Self {
            brain_id: brain_id.to_string(),
            state: WatchState::Stopped,
            mode: WatchMode::None,
            reason: None,
            index_revision: None,
            pending: false,
            sequence: 0,
        }
    }
}

/// Why signals were lost. Internal: it becomes a [`WatchReason`] before it reaches
/// anything visible. **A loss is never silent** — every variant sends the next
/// cycle to a full verification.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LossReason {
    /// The operating system's buffer overflowed: the call succeeded with zero bytes.
    OsOverflow,
    /// `ERROR_NOTIFY_ENUM_DIR`: the system could not record every change.
    EnumDir,
    /// A record of the notification buffer was malformed.
    ParserInvalid,
    /// A name could not be confined to the root.
    HintInvalid,
    /// FileTopo's bounded queue was full.
    QueueFull,
    /// The native reader stopped for a reason of its own.
    ReaderFailed,
    /// Injected by a proof: the product engine treats it exactly like a real loss. Never
    /// constructed by the product itself.
    #[allow(dead_code)]
    Injected,
}

impl LossReason {
    pub(crate) fn as_watch_reason(self) -> WatchReason {
        match self {
            Self::QueueFull => WatchReason::QueueSaturated,
            _ => WatchReason::SignalsLost,
        }
    }
}

/// The product's bounds and cadences. Every duration is injectable so a proof does
/// not have to wait five seconds to see a root guard tick.
#[derive(Debug, Clone)]
pub struct WatchConfig {
    /// After the first signal of a burst, how long to keep collecting before
    /// choosing a plan.
    pub coalesce_window: Duration,
    /// After a reconciliation, how long the queue must stay empty before the
    /// watcher may report `WATCHING`.
    pub calm_window: Duration,
    /// `DEC-0041` §6 — how often the root's own metadata and identity are checked.
    pub root_guard_interval: Duration,
    /// `DEC-0041` §7 — the cadence of full verifications without a native mechanism.
    pub periodic_interval: Duration,
    /// Distinct pending hints the queue holds. One more is a **loss**.
    pub queue_capacity: usize,
    /// Distinct changed areas a `W-B` may take; beyond it a full verification is
    /// cheaper and safer.
    pub max_scopes: usize,
    /// Entries a `W-B` may observe; beyond it a full verification is cheaper.
    pub max_scope_nodes: usize,
    /// Reconciliation cycles in a row while signals keep arriving. Past it the
    /// watcher stays `VERIFYING` and reschedules instead of looping.
    pub max_consecutive_cycles: u32,
    /// First wait before retrying a failed reconciliation; doubled up to
    /// [`WatchConfig::retry_backoff_max`].
    pub retry_backoff_initial: Duration,
    pub retry_backoff_max: Duration,
}

impl Default for WatchConfig {
    fn default() -> Self {
        Self {
            coalesce_window: Duration::from_millis(300),
            calm_window: Duration::from_millis(300),
            root_guard_interval: Duration::from_secs(5),
            periodic_interval: Duration::from_secs(30),
            queue_capacity: 4096,
            max_scopes: 128,
            max_scope_nodes: 20_000,
            max_consecutive_cycles: 8,
            retry_backoff_initial: Duration::from_secs(5),
            retry_backoff_max: Duration::from_secs(300),
        }
    }
}

/// Engineering counters of one watcher, for a proof and never for the interface.
/// Plain numbers: nothing here can name a file.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct WatchMetrics {
    /// Highest number of distinct hints the queue held at once.
    pub queue_max_len: usize,
    /// Hints that arrived and were merged into an identical pending one.
    pub signals_coalesced: u64,
    /// Hints accepted into the queue.
    pub signals_received: u64,
    /// Losses raised (each one owes a full verification).
    pub losses: u64,
    /// Targeted reconciliations attempted.
    pub wb_cycles: u64,
    /// Targeted reconciliations that were refused and sent to a full one.
    pub wb_escalations: u64,
    /// Full verifications run (the initial one included).
    pub wc_cycles: u64,
    /// Root guard checks made.
    pub guard_checks: u64,
    /// Batches that changed the Index (a revision was committed).
    pub commits: u64,
    /// Scopes (directories re-listed, entries observed alone) read by targeted
    /// reconciliations that completed.
    pub scopes_read: u64,
    /// Directories whose entries were actually listed by those reconciliations — the number
    /// a full scan would have multiplied by the size of the tree.
    pub directories_listed: u64,
}
