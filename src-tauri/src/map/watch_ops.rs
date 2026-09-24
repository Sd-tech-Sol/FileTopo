//! What the automatic watcher does to a brain — `TASK-0043`, `DEC-0041`.
//!
//! The watcher (`crate::watch`) decides *when*; this module does *the work*, through
//! the same pipeline **Actualiser** uses and under the **same write lock**
//! ([`PUBLICATION_LOCK`]): two logical writers never compete for an Index.
//!
//! * [`verify_full`] is **`W-C`**: `full scan -> reconcile_full_scan -> U-B`, the very
//!   function behind the manual **Actualiser** (`publish_map`, gesture `Refresh`). The
//!   previous Index keeps being served while it runs and the commit is atomic. It also
//!   records the source observation (`DEC-0040`), exactly as the manual gesture does.
//! * [`apply_scopes`] is **`W-B`**: only the hinted directories are re-read
//!   (`crate::scope`), the batch goes through [`Index::apply_update_batch`], and a
//!   refusal of any kind is an **escalation** to `W-C`, never an error the person sees.
//! * [`guard_root`] is the **root guard** (`DEC-0041` §6, `F-032`): the root's own
//!   metadata and identity, nothing under it. A root that is gone or replaced becomes
//!   an observation (`UNAVAILABLE` / `SOURCE_CHANGED`) — **never a batch of deletions**.
//!
//! **The watcher never replaces a corpus.** An Index that predates durable identities or
//! the source binding is left to the person's explicit **Actualiser** (its one full
//! restamp); [`is_stamped`] is how the watcher knows.
//!
//! Nothing here returns a path, a name, a key or an operating-system message.

use super::MapError;
use super::brains::BrainRecord;
use super::commands::{
    self, Gesture, MapBuildReport, PUBLICATION_LOCK, now_ms, open_store_writable,
};
use super::sandbox::SandboxPaths;
use super::source::BrainSource;
use super::source_observation::{self, Failure, SourceObservation, SourceReason, SourceState};
use crate::domain::NodeKind;
use crate::identity::{self, IdentityProvenance};
use crate::scope::{self, ScopeCounts, ScopeLimits, ScopeRefusal, ScopeRequest};
use std::path::{Path, PathBuf};
use std::sync::MutexGuard;

/// The write lock, tolerant of a poisoned state: a panic elsewhere must not stop the
/// watcher from ever writing again.
fn lock_publication() -> MutexGuard<'static, ()> {
    PUBLICATION_LOCK
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

/// The directory a brain reads. Resolved from the catalogue for a `REAL_ROOT`.
pub(crate) fn resolve_root(paths: &SandboxPaths, brain: &BrainRecord) -> Result<PathBuf, MapError> {
    let source = BrainSource::resolve(paths, brain)?;
    Ok(source.root(paths))
}

/// Whether an Index exists for this brain at all.
pub(crate) fn is_indexed(paths: &SandboxPaths, brain: &BrainRecord) -> bool {
    paths
        .brain_map_database(&brain.brain_id)
        .try_exists()
        .unwrap_or(false)
}

/// Opens the Index read-only **only if it is already at the current schema**.
///
/// `commands::open_store` would migrate an older file (it is what the person's own
/// **Ouvrir** does). A background watcher must not be the thing that quietly rewrites a
/// file: an older schema is left exactly as it is until the person opens the brain.
fn open_current_schema(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<super::brain_index::BrainIndex, MapError> {
    let database = paths.brain_map_database(&brain.brain_id);
    if !database.is_file() {
        return Err(MapError::NotBuilt(brain.brain_id.clone()));
    }
    let version = super::brain_index::BrainIndex::peek_schema_version(&database)?;
    if version != super::store::MAP_SCHEMA_VERSION {
        return Err(MapError::IndexIncompatible(format!("schema {version}")));
    }
    commands::open_store(paths, brain)
}

/// The revision the Index currently serves. Read-only; never resolves the source.
pub(crate) fn served_revision(paths: &SandboxPaths, brain: &BrainRecord) -> Result<u64, MapError> {
    let store = open_current_schema(paths, brain)?;
    Ok(store.index.identity()?.revision)
}

/// Whether the Index carries durable identities **and** the current source binding —
/// the condition for anything but the manual **Actualiser** to write to it.
pub(crate) fn is_stamped(paths: &SandboxPaths, brain: &BrainRecord) -> Result<bool, MapError> {
    // `open_store` refuses an Index without a current binding: that *is* "not stamped"
    // for the watcher, and the person's Actualiser is what repairs it. An older schema
    // is not stamped either — and is not migrated from here.
    match open_current_schema(paths, brain) {
        Ok(store) => store.has_current_stamp(),
        Err(MapError::SourceMismatch { .. } | MapError::IndexIncompatible(_)) => Ok(false),
        Err(error) => Err(error),
    }
}

/// The last observation as the interface would read it now.
pub(crate) fn observation(paths: &SandboxPaths, brain: &BrainRecord) -> SourceObservation {
    let revision = served_revision(paths, brain).ok();
    source_observation::read(paths, &brain.brain_id, revision)
}

// ---------------------------------------------------------------------------------
// W-C
// ---------------------------------------------------------------------------------

/// **`W-C`** — a complete verification: the manual **Actualiser**'s pipeline, run by
/// the watcher. `cancelled` stops the scan (the watcher is shutting down); a
/// cancellation is not an observation of the source.
pub(crate) fn verify_full(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    cancelled: impl Fn() -> bool,
) -> Result<MapBuildReport, MapError> {
    commands::publish_map(paths, brain, Gesture::Refresh, cancelled)
}

// ---------------------------------------------------------------------------------
// W-B
// ---------------------------------------------------------------------------------

/// Why a targeted reconciliation was given up. Every reason but the last two sends
/// the watcher to a **full verification**.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Escalation {
    RootScope,
    Incomplete,
    TooLarge,
    Incoherent,
    /// The root itself could not be read: the full verification classifies it.
    RootUnreadable,
    /// The kernel or the reconciler refused the batch.
    BatchRefused,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ScopedFailure {
    /// Verify in full instead.
    Escalate(Escalation),
    /// The watcher is stopping.
    Cancelled,
    /// The Index predates durable identities or the binding: only a manual
    /// **Actualiser** may restamp it.
    NeedsManualRefresh,
    /// The Index or the brain could not be opened for writing.
    Unusable,
}

impl From<ScopeRefusal> for ScopedFailure {
    fn from(refusal: ScopeRefusal) -> Self {
        match refusal {
            ScopeRefusal::Cancelled => Self::Cancelled,
            ScopeRefusal::NotStamped => Self::NeedsManualRefresh,
            ScopeRefusal::RootScope => Self::Escalate(Escalation::RootScope),
            ScopeRefusal::Incomplete => Self::Escalate(Escalation::Incomplete),
            ScopeRefusal::TooLarge => Self::Escalate(Escalation::TooLarge),
            ScopeRefusal::Incoherent | ScopeRefusal::Store => {
                Self::Escalate(Escalation::Incoherent)
            }
        }
    }
}

/// What a targeted reconciliation did.
#[derive(Debug, Clone, Copy)]
pub(crate) struct ScopedApplied {
    /// The revision after the call (unchanged for a no-op).
    pub revision: u64,
    /// Whether the batch changed the Index (a revision was committed).
    pub applied: bool,
    pub counts: ScopeCounts,
    /// The stored directories that were actually listed — the proof surface for
    /// "the unrelated sibling was not walked".
    pub listed: usize,
}

/// **`W-B`** — re-reads only what the hints point at (`requests`: directories to re-list and
/// entries to observe alone; see `crate::scope::resolve_scopes`), derives
/// the minimal batch, and applies it with the `TASK-0040` kernel — **under the same
/// lock as Actualiser and Reconstruire**.
///
/// The source observation follows the Index: a commit that advances the revision while
/// the observation said `SYNCED` re-records `SYNCED` at the new revision (otherwise it
/// would read back `UNKNOWN`, by `ACTION-0069`'s rule). A failure state is **not**
/// promoted by a targeted commit — only a full verification can say the whole tree was
/// seen.
pub(crate) fn apply_scopes(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    requests: &[ScopeRequest],
    max_nodes: usize,
    cancelled: &dyn Fn() -> bool,
) -> Result<ScopedApplied, ScopedFailure> {
    let _publication = lock_publication();
    // Never the one that migrates: an older schema waits for the person's Ouvrir.
    if !is_stamped(paths, brain).unwrap_or(false) {
        return Err(ScopedFailure::NeedsManualRefresh);
    }
    let mut store = match open_store_writable(paths, brain) {
        Ok(store) => store,
        Err(MapError::SourceMismatch { .. }) => return Err(ScopedFailure::NeedsManualRefresh),
        Err(_) => return Err(ScopedFailure::Unusable),
    };
    if !store
        .has_current_stamp()
        .map_err(|_| ScopedFailure::Unusable)?
    {
        return Err(ScopedFailure::NeedsManualRefresh);
    }
    let root = resolve_root(paths, brain).map_err(|_| ScopedFailure::Unusable)?;
    // The root's own metadata first, so a vanished or replaced root is the full
    // verification's business (and its observation), not a scope that "sees nothing".
    if source_observation::probe_root(&root).is_err() {
        return Err(ScopedFailure::Escalate(Escalation::RootUnreadable));
    }

    let before = store
        .index
        .identity()
        .map_err(|_| ScopedFailure::Unusable)?
        .revision;
    let was_synced =
        source_observation::read(paths, &brain.brain_id, Some(before)).state == SourceState::Synced;

    let scopes = scope::resolve_scopes(&store.index, &root, requests)?;
    let scan = scope::scan_scopes(
        &store.index,
        &root,
        &scopes,
        ScopeLimits { max_nodes },
        cancelled,
    )?;
    let (batch, mut counts) = scope::reconcile_scopes(&store.index, &scan, now_ms())?;
    counts.scopes = scopes.len();
    let outcome = store
        .index
        .apply_update_batch(&batch)
        .map_err(|_| ScopedFailure::Escalate(Escalation::BatchRefused))?;
    if outcome.applied && was_synced {
        source_observation::record_success(paths, &brain.brain_id, outcome.revision, now_ms());
    }
    Ok(ScopedApplied {
        revision: outcome.revision,
        applied: outcome.applied,
        counts,
        listed: scan.listed.len(),
    })
}

// ---------------------------------------------------------------------------------
// The root guard
// ---------------------------------------------------------------------------------

/// What the root guard found — closed, path-free.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum GuardOutcome {
    /// The root is readable and is the indexed root (or its identity cannot be
    /// compared, which is not evidence of a change).
    Fine,
    /// The root is not an acceptable root now.
    Down {
        state: SourceState,
        reason: SourceReason,
    },
}

/// The root's own metadata and identity — **no scan, nothing under the root**.
///
/// * cannot be read → `UNAVAILABLE` (with the reason from the error's kind only);
/// * not a directory / a link → `SOURCE_CHANGED`;
/// * a directory whose **system identity** is not the indexed root's →
///   `SOURCE_CHANGED / ROOT_IDENTITY_CHANGED`: the same path now names another folder.
///
/// An identity that cannot be compared (a fallback identity on one side, a store that
/// will not open) is *not* a change: the guard only ever raises what it can show.
pub(crate) fn guard_root(paths: &SandboxPaths, brain: &BrainRecord) -> GuardOutcome {
    let Ok(root) = resolve_root(paths, brain) else {
        return GuardOutcome::Fine;
    };
    if let Err(failure) = source_observation::probe_root(&root) {
        return GuardOutcome::Down {
            state: failure.state,
            reason: failure.reason,
        };
    }
    let Some((stored_key, stored_provenance)) = stored_root_identity(paths, brain) else {
        return GuardOutcome::Fine;
    };
    let (observed_key, observed_provenance) =
        identity::compute_identity(&root, Path::new(""), NodeKind::Root, false, false);
    if stored_provenance.as_deref() == Some(IdentityProvenance::System.as_str())
        && observed_provenance == IdentityProvenance::System
        && stored_key != observed_key
    {
        return GuardOutcome::Down {
            state: SourceState::SourceChanged,
            reason: SourceReason::RootIdentityChanged,
        };
    }
    GuardOutcome::Fine
}

/// The stored root row's stable key and provenance, read-only.
fn stored_root_identity(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Option<(String, Option<String>)> {
    let store = open_current_schema(paths, brain).ok()?;
    let root_id = store.root_id().ok()?;
    let (key, provenance): (Option<String>, Option<String>) = store
        .index
        .connection
        .query_row(
            "SELECT stable_key, identity_provenance FROM nodes WHERE id = ?1",
            [root_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok()?;
    Some((key?, provenance))
}

/// Records what the guard found as the current observation — **only when it differs**
/// from the one already recorded, so a source that stays absent does not rewrite the
/// catalogue every few seconds. Never touches the Index, the journal, a revision or a
/// preference. Returns whether a record was written.
pub(crate) fn record_guard_failure(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    state: SourceState,
    reason: SourceReason,
) -> bool {
    let _publication = lock_publication();
    // No Index, nothing to keep serving: no observation (the same rule as
    // `publish_map`).
    if !is_indexed(paths, brain) {
        return false;
    }
    let revision = served_revision(paths, brain).ok();
    let current = source_observation::read(paths, &brain.brain_id, revision);
    if current.state == state && current.reason == Some(reason) {
        return false;
    }
    source_observation::record_failure(
        paths,
        &brain.brain_id,
        Failure::new(state, reason),
        now_ms(),
    );
    true
}
