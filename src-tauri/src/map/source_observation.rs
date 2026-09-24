//! The last source observation of a brain — `TASK-0042`, `DEC-0040`.
//!
//! FileTopo can now refresh an Index in place, and it already keeps the previous
//! Index when a scan or an application fails. What was missing is a *product
//! meaning* for "the source cannot be read right now" that survives a restart and
//! never turns an absent root into a mass of deletions. This module is that
//! meaning, and nothing more:
//!
//! * a **closed** [`SourceState`] and a **closed** [`SourceReason`], neither of
//!   which can carry a path, a stable key, a file identity, a volume serial or an
//!   OS message — the reason is chosen from a fixed list, never formatted from an
//!   error;
//! * the state means **the last explicit observation**, never real-time
//!   availability. A person who opens FileTopo with the drive unplugged reads what
//!   the last *Actualiser* saw, not what is true now, and the wording says so;
//! * a small persisted record **per brain**, kept in the catalogue's existing
//!   `catalog_meta` table.
//!
//! # Where it is stored, and what that costs
//!
//! `catalog_meta`, one key per brain. Not the Index's `schema_meta`, for four
//! reasons that each matter:
//!
//! 1. an observation of *failure* must be writable when the Index was, by
//!    definition, **not** touched — writing it into the Index would open the
//!    corpus for writing on every failed refresh and would make a no-op or a
//!    failure share a file with the revision it must not advance;
//! 2. it survives an Index that is rebuilt from scratch or replaced, which is
//!    exactly when "what did we last see of the source" is most useful;
//! 3. the Index's reconstructible digest and its schema validation never see it, so
//!    the loss or corruption of this record can **never** make an Index invalid
//!    (`DEC-0040` §4);
//! 4. no new database file: the catalogue already holds the preferences and the
//!    active brain.
//!
//! The price is **atomicity**. The Index commit and this write are two commits: a
//! crash in the window between them leaves the previous observation next to a newer
//! Index. It is bounded and detected rather than hidden — a `SYNCED` observation
//! only counts when its `lastSuccessfulRevision` is the revision actually served,
//! and otherwise reads back as `UNKNOWN`. A failed *write* of the observation never
//! turns a correctly applied Index into a failed refresh: the report carries
//! `persisted: false` instead.
//!
//! **Not here:** any watcher, any polling, any automatic action. A future watcher
//! (`F-030`) must go through this state machine before anything else (`DEC-0040` §8).

use super::MapError;
use super::brains::BrainCatalog;
use super::sandbox::SandboxPaths;
use crate::path_codec::is_reparse_point;
use crate::scanner::ScanError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;

/// The closed set of states — `DEC-0040` §1. `Serialize` as one SCREAMING word.
///
/// Each failure state means the same thing for the corpus: **the last reliable
/// Index keeps being served, untouched**.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SourceState {
    /// No reliable observation is recorded.
    Unknown,
    /// The last complete source operation succeeded and the served Index matched
    /// that scan at the time given.
    Synced,
    /// The root's own metadata could not be read.
    Unavailable,
    /// The root is readable but is no longer an acceptable root.
    SourceChanged,
    /// The root is readable but the whole tree could not be established reliably.
    ScanIncomplete,
    /// A complete, valid scan existed, and applying it to the Index failed or was refused.
    ApplyFailed,
}

/// The closed set of reasons — never formatted from an OS error.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SourceReason {
    // `Unavailable`
    RootNotFound,
    RootAccessDenied,
    /// A root whose metadata cannot be read for a reason that is none of the two
    /// above (device or network not ready, …). The raw OS code is **not** kept.
    RootMetadataUnavailable,
    // `SourceChanged`
    RootNotDirectory,
    RootReparsePoint,
    RootIdentityChanged,
    // `ScanIncomplete`
    ScanDiagnostics,
    FingerprintDrift,
    FingerprintFailed,
    // `ApplyFailed`
    ReconcileRefused,
    ApplyRefused,
    IdentityRefused,
    StoreWriteFailed,
}

/// What the interface and a proof read — `DEC-0040` §3. **No path, no key, no
/// identity, no OS text**, by construction: every field is a number, a bool or a
/// member of a closed set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceObservation {
    pub state: SourceState,
    pub reason: Option<SourceReason>,
    /// When this observation was made. `None` only for `UNKNOWN`.
    pub observed_unix_ms: Option<i64>,
    /// The revision of the Index at the last successful synchronisation, if any.
    pub last_successful_revision: Option<u64>,
    pub last_successful_unix_ms: Option<i64>,
    /// `true` when this is exactly what the local state holds. `false` only when an
    /// attempt to write it failed, or when it could not be read back: the value
    /// shown is then the truth of the moment, not something that will survive a
    /// restart.
    pub persisted: bool,
}

impl SourceObservation {
    pub(super) fn unknown(persisted: bool) -> Self {
        Self {
            state: SourceState::Unknown,
            reason: None,
            observed_unix_ms: None,
            last_successful_revision: None,
            last_successful_unix_ms: None,
            persisted,
        }
    }
}

/// A classified refusal of the source, produced where the **structured** error is
/// still in hand (never parsed back out of a message).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct Failure {
    pub state: SourceState,
    pub reason: SourceReason,
}

impl Failure {
    pub(super) const fn new(state: SourceState, reason: SourceReason) -> Self {
        Self { state, reason }
    }

    pub(super) const fn scan_incomplete(reason: SourceReason) -> Self {
        Self::new(SourceState::ScanIncomplete, reason)
    }

    pub(super) const fn apply_failed(reason: SourceReason) -> Self {
        Self::new(SourceState::ApplyFailed, reason)
    }
}

/// The root's metadata could not be read: `UNAVAILABLE`, with the reason chosen from
/// the error's **kind** only. The OS code and message never leave this function.
fn unavailable(error: &io::Error) -> Failure {
    let reason = match error.kind() {
        io::ErrorKind::NotFound => SourceReason::RootNotFound,
        io::ErrorKind::PermissionDenied => SourceReason::RootAccessDenied,
        _ => SourceReason::RootMetadataUnavailable,
    };
    Failure::new(SourceState::Unavailable, reason)
}

/// Classifies the scanner's own structured error. `None` for a cancellation, which
/// is a gesture of the person and **not** an observation of the source.
pub(super) fn classify_scan_error(error: &ScanError) -> Option<Failure> {
    match error {
        ScanError::Cancelled => None,
        ScanError::RootMetadata(io) => Some(unavailable(io)),
        ScanError::RootNotDirectory => Some(Failure::new(
            SourceState::SourceChanged,
            SourceReason::RootNotDirectory,
        )),
        ScanError::RootReparsePoint => Some(Failure::new(
            SourceState::SourceChanged,
            SourceReason::RootReparsePoint,
        )),
    }
}

/// Reads **the root's own metadata and nothing under it**, with the same three
/// questions the scanner asks first, and the same answers.
///
/// It exists for the one path that touches the source *before* the scanner does —
/// the synthetic fixtures' fingerprint — so a vanished root is `UNAVAILABLE` there
/// too instead of an anonymous I/O error. A real root goes straight to the scanner
/// and is classified from its structured error.
pub(super) fn probe_root(root: &Path) -> Result<(), Failure> {
    let metadata = fs::symlink_metadata(root).map_err(|error| unavailable(&error))?;
    if !metadata.is_dir() {
        return Err(Failure::new(
            SourceState::SourceChanged,
            SourceReason::RootNotDirectory,
        ));
    }
    if is_reparse_point(&metadata) || metadata.file_type().is_symlink() {
        return Err(Failure::new(
            SourceState::SourceChanged,
            SourceReason::RootReparsePoint,
        ));
    }
    Ok(())
}

fn key_for(brain_id: &str) -> String {
    format!("source_observation.{brain_id}")
}

/// Decodes one stored record. **Anything unexpected is `None`** — an unknown word, a
/// wrong shape, a state/reason pair that no version writes — because the loss of this
/// record must read as `UNKNOWN`, never as an error and never as a guess.
fn decode(stored: &str) -> Option<SourceObservation> {
    let mut observation: SourceObservation = serde_json::from_str(stored).ok()?;
    let coherent = match (observation.state, observation.reason) {
        (SourceState::Unknown | SourceState::Synced, None) => true,
        (SourceState::Unknown | SourceState::Synced, Some(_)) => false,
        (SourceState::Unavailable, Some(reason)) => matches!(
            reason,
            SourceReason::RootNotFound
                | SourceReason::RootAccessDenied
                | SourceReason::RootMetadataUnavailable
        ),
        (SourceState::SourceChanged, Some(reason)) => matches!(
            reason,
            SourceReason::RootNotDirectory
                | SourceReason::RootReparsePoint
                | SourceReason::RootIdentityChanged
        ),
        (SourceState::ScanIncomplete, Some(reason)) => matches!(
            reason,
            SourceReason::ScanDiagnostics
                | SourceReason::FingerprintDrift
                | SourceReason::FingerprintFailed
        ),
        (SourceState::ApplyFailed, Some(reason)) => matches!(
            reason,
            SourceReason::ReconcileRefused
                | SourceReason::ApplyRefused
                | SourceReason::IdentityRefused
                | SourceReason::StoreWriteFailed
        ),
        (_, None) => false,
    };
    if !coherent {
        return None;
    }
    // What is read back *is* what is stored.
    observation.persisted = true;
    Some(observation)
}

fn open_catalog(paths: &SandboxPaths) -> Result<Option<BrainCatalog>, MapError> {
    // Never create the catalogue to answer a question about it: reading an
    // observation is not a reason to make a file appear.
    if !paths.catalog_database().is_file() {
        return Ok(None);
    }
    BrainCatalog::open(&paths.catalog_database()).map(Some)
}

fn stored(paths: &SandboxPaths, brain_id: &str) -> Result<Option<SourceObservation>, MapError> {
    let Some(catalog) = open_catalog(paths)? else {
        return Ok(None);
    };
    Ok(catalog
        .meta(&key_for(brain_id))?
        .and_then(|value| decode(&value)))
}

/// The observation to show, given the revision the Index actually serves.
///
/// **Never fails and never touches the source.** A missing catalogue, a missing key,
/// a record that does not decode, a catalogue that cannot be opened: all read as
/// `UNKNOWN` — the loss of this metadata must never make anything else fail.
///
/// A `SYNCED` observation whose revision is not the served one describes an Index
/// that is no longer the served one (a crash between the two commits, or an Index
/// replaced from outside); it reads as `UNKNOWN` rather than claiming a
/// synchronisation nobody observed.
pub(super) fn read(
    paths: &SandboxPaths,
    brain_id: &str,
    served_revision: Option<u64>,
) -> SourceObservation {
    let Ok(found) = stored(paths, brain_id) else {
        return SourceObservation::unknown(false);
    };
    match found {
        None => SourceObservation::unknown(true),
        Some(observation)
            if observation.state == SourceState::Synced
                && (served_revision.is_none()
                    || observation.last_successful_revision != served_revision) =>
        {
            SourceObservation::unknown(true)
        }
        Some(observation) => observation,
    }
}

fn write(paths: &SandboxPaths, brain_id: &str, observation: &SourceObservation) -> bool {
    let Ok(text) = serde_json::to_string(observation) else {
        return false;
    };
    let result = (|| -> Result<(), MapError> {
        let catalog = open_catalog(paths)?.ok_or_else(|| {
            MapError::Io(io::Error::new(io::ErrorKind::NotFound, "catalogue absent"))
        })?;
        catalog.put_meta(&key_for(brain_id), &text)
    })();
    result.is_ok()
}

/// A complete source operation succeeded and the Index now serves `revision`:
/// `SYNCED`. Covers a baseline, a restamp, an incremental refresh — **including a
/// no-op, whose revision did not move** — and an explicit rebuild.
///
/// Best effort by design: if the write fails the returned observation says
/// `persisted: false` and the Index — already committed — is not reported as failed.
pub(super) fn record_success(
    paths: &SandboxPaths,
    brain_id: &str,
    revision: u64,
    now: i64,
) -> SourceObservation {
    let mut observation = SourceObservation {
        state: SourceState::Synced,
        reason: None,
        observed_unix_ms: Some(now),
        last_successful_revision: Some(revision),
        last_successful_unix_ms: Some(now),
        persisted: true,
    };
    observation.persisted = write(paths, brain_id, &observation);
    observation
}

/// A source operation failed for a reason the source explains. **Only the
/// observation moves**: the last successful revision and instant are kept from the
/// previous record, and nothing about the Index, its journal, its seen state or any
/// preference is written.
pub(super) fn record_failure(
    paths: &SandboxPaths,
    brain_id: &str,
    failure: Failure,
    now: i64,
) -> SourceObservation {
    let previous = stored(paths, brain_id).ok().flatten();
    let mut observation = SourceObservation {
        state: failure.state,
        reason: Some(failure.reason),
        observed_unix_ms: Some(now),
        last_successful_revision: previous.as_ref().and_then(|p| p.last_successful_revision),
        last_successful_unix_ms: previous.as_ref().and_then(|p| p.last_successful_unix_ms),
        persisted: true,
    };
    observation.persisted = write(paths, brain_id, &observation);
    observation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_state_reason_pair_no_version_writes_reads_back_as_nothing() {
        let good = r#"{"state":"UNAVAILABLE","reason":"ROOT_NOT_FOUND","observedUnixMs":5,"lastSuccessfulRevision":2,"lastSuccessfulUnixMs":1,"persisted":true}"#;
        assert!(decode(good).is_some());
        for bad in [
            // A reason from another state.
            r#"{"state":"UNAVAILABLE","reason":"SCAN_DIAGNOSTICS","observedUnixMs":5,"lastSuccessfulRevision":null,"lastSuccessfulUnixMs":null,"persisted":true}"#,
            // A failure without a reason, a success with one.
            r#"{"state":"APPLY_FAILED","reason":null,"observedUnixMs":5,"lastSuccessfulRevision":null,"lastSuccessfulUnixMs":null,"persisted":true}"#,
            r#"{"state":"SYNCED","reason":"ROOT_NOT_FOUND","observedUnixMs":5,"lastSuccessfulRevision":1,"lastSuccessfulUnixMs":5,"persisted":true}"#,
            // An unknown word, and not even JSON.
            r#"{"state":"OFFLINE","reason":null,"observedUnixMs":5,"lastSuccessfulRevision":null,"lastSuccessfulUnixMs":null,"persisted":true}"#,
            "not json",
            "",
        ] {
            assert!(decode(bad).is_none(), "{bad}");
        }
    }

    #[test]
    fn the_scanners_structured_errors_map_to_closed_states_and_a_cancel_to_none() {
        assert_eq!(classify_scan_error(&ScanError::Cancelled), None);
        assert_eq!(
            classify_scan_error(&ScanError::RootNotDirectory),
            Some(Failure::new(
                SourceState::SourceChanged,
                SourceReason::RootNotDirectory
            ))
        );
        assert_eq!(
            classify_scan_error(&ScanError::RootReparsePoint),
            Some(Failure::new(
                SourceState::SourceChanged,
                SourceReason::RootReparsePoint
            ))
        );
        for (kind, reason) in [
            (io::ErrorKind::NotFound, SourceReason::RootNotFound),
            (
                io::ErrorKind::PermissionDenied,
                SourceReason::RootAccessDenied,
            ),
            (
                io::ErrorKind::TimedOut,
                SourceReason::RootMetadataUnavailable,
            ),
            (io::ErrorKind::Other, SourceReason::RootMetadataUnavailable),
        ] {
            assert_eq!(
                classify_scan_error(&ScanError::RootMetadata(io::Error::from(kind))),
                Some(Failure::new(SourceState::Unavailable, reason)),
                "{kind:?}"
            );
        }
        // A raw OS message and code must not survive the classification.
        let raw = io::Error::from_raw_os_error(21);
        let classified = classify_scan_error(&ScanError::RootMetadata(raw)).unwrap();
        assert_eq!(classified.state, SourceState::Unavailable);
        assert!(!format!("{classified:?}").contains("21"));
    }
}
