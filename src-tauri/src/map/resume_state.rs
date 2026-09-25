//! Per-brain resume state — `TASK-0044`, `DEC-0042`.
//!
//! What a person would lose by closing the application and that nothing can
//! rebuild: the branch they were on, what they had selected, where the camera
//! was, which filter was on, and whether the details panel was open.
//!
//! Four rules govern this module.
//!
//! * **No new store.** The record lives in `catalog_meta`, the table
//!   `ACTIVE_BRAIN_KEY` and the historical panel preference already use, under
//!   a versioned, brain-scoped key. No new file, no schema change.
//! * **Closed and small.** Five fields, exactly. No path, no name, no stable
//!   key, no `FileId`, no cursor, no page, no projection — and nothing the
//!   catalogue or the Index already owns (name/colour/icon, seen/unseen).
//! * **A record never makes a node valid.** Ids are checked against the
//!   **current Index of the same brain** at restore time; an id that is gone
//!   falls back to a valid target and the correction is stored. The Index stays
//!   the truth of the corpus.
//! * **A damaged record is an absent record.** Invalid JSON, an unknown
//!   version, an unknown filter word, a number that is not finite or is out of
//!   bounds: all of them read as "nothing stored", never as a reason not to
//!   open the brain. Reading it touches neither the source nor the Index.

use super::MapError;
use super::brain_index::BrainIndex;
use super::brains::{BrainCatalog, BrainRecord};
use super::filtered_projection::materialize_filtered_view;
use super::projection::materialize_view;
use super::store::MapSnapshot;
use crate::node_filter::{FilterCursor, FilterError, NodeFilter};
use serde::{Deserialize, Serialize};

/// Bump only together with a reader for the previous one.
pub const RESUME_VERSION: u32 = 1;
/// `catalog_meta` key prefix; the brain id completes it.
const RESUME_KEY_PREFIX: &str = "brain_resume.v1.";
/// A record is a handful of numbers: anything larger is not one of ours.
const MAX_RECORD_BYTES: usize = 2048;
/// Largest node id an interface number can carry without losing precision.
pub const MAX_NODE_ID: i64 = 9_007_199_254_740_991;
/// Declared bounds of a stored camera. Wider than any reachable view
/// (`viewState` allows the fit scale times 4096) and narrow enough that a
/// corrupted number is recognised as one.
pub const MAX_VIEW_SCALE: f64 = 1.0e6;
pub const MAX_VIEW_TRANSLATION: f64 = 1.0e9;

/// The camera, as `viewState.ts` keeps it: `screen = world * scale + translation`.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResumeView {
    pub scale: f64,
    pub tx: f64,
    pub ty: f64,
}

/// The whole resume state of one brain. **Exactly** these five keys.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ResumeState {
    /// The branch the map was focused on. `None` = the root.
    pub focus_node_id: Option<i64>,
    /// The selected element. `None` = nothing remembered.
    pub selected_node_id: Option<i64>,
    /// The camera. `None` = open on the normal view.
    pub view: Option<ResumeView>,
    /// The **logical** dynamic filter (`TASK-0039`). Never its cursor.
    pub filter: NodeFilter,
    pub details_panel_visible: bool,
}

/// The closed, versioned envelope that is actually written.
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope {
    version: u32,
    state: ResumeState,
}

fn rejected(reason: &str) -> MapError {
    MapError::ResumeRejected(reason.to_string())
}

impl ResumeState {
    /// The state of a brain that has none stored: the root, the normal view,
    /// no filter — and the panel as the historical global preference says.
    pub fn defaults(details_panel_visible: bool) -> Self {
        Self {
            focus_node_id: None,
            selected_node_id: None,
            view: None,
            filter: NodeFilter::default(),
            details_panel_visible,
        }
    }

    /// The canonical form of a state **or a refusal** — never a guess.
    ///
    /// Validated here, in Rust, even though the interface normalises too: the
    /// interface is not the only caller, and a bound that only holds while
    /// callers behave is not a bound.
    pub fn validated(&self) -> Result<Self, MapError> {
        for id in [self.focus_node_id, self.selected_node_id]
            .into_iter()
            .flatten()
        {
            if !(1..=MAX_NODE_ID).contains(&id) {
                return Err(rejected("node_id_out_of_bounds"));
            }
        }
        if let Some(view) = &self.view {
            let scale_ok =
                view.scale.is_finite() && view.scale > 0.0 && view.scale <= MAX_VIEW_SCALE;
            let shift_ok = |value: f64| value.is_finite() && value.abs() <= MAX_VIEW_TRANSLATION;
            if !scale_ok || !shift_ok(view.tx) || !shift_ok(view.ty) {
                return Err(rejected("view_out_of_bounds"));
            }
        }
        Ok(Self {
            filter: self.filter.normalized(),
            ..self.clone()
        })
    }
}

fn key_for(brain_id: &str) -> String {
    format!("{RESUME_KEY_PREFIX}{brain_id}")
}

/// Parses what is stored. `None` for **anything** that is not a valid record of
/// the current version — the reader never reports why, because the answer is
/// the same in every case.
fn read_record(raw: &str) -> Option<ResumeState> {
    if raw.len() > MAX_RECORD_BYTES {
        return None;
    }
    let envelope: Envelope = serde_json::from_str(raw).ok()?;
    if envelope.version != RESUME_VERSION {
        return None;
    }
    envelope.state.validated().ok()
}

impl BrainCatalog {
    /// The state a brain has **without** any record: defaults, with the panel
    /// taken from the historical global preference — `DEC-0042` §3.
    fn default_resume_state(&self) -> Result<ResumeState, MapError> {
        Ok(ResumeState::defaults(
            self.ui_preferences()?.details_panel_visible,
        ))
    }

    /// The stored state of `brain_id`, or `None` when nothing valid is stored.
    /// An unknown brain is an **error that names it**, exactly like every other
    /// brain-scoped operation.
    pub fn stored_resume_state(&self, brain_id: &str) -> Result<Option<ResumeState>, MapError> {
        self.require(brain_id)?;
        Ok(self
            .meta(&key_for(brain_id))?
            .as_deref()
            .and_then(read_record))
    }

    /// The resume state of one brain — stored, or the defaults. Never touches
    /// the source or the Index.
    pub fn resume_state(&self, brain_id: &str) -> Result<ResumeState, MapError> {
        match self.stored_resume_state(brain_id)? {
            Some(state) => Ok(state),
            None => self.default_resume_state(),
        }
    }

    /// Stores the resume state of **one** brain and returns it as stored.
    ///
    /// Touches `catalog_meta` and nothing else: no publication lock, no
    /// watcher, no Index, no journal — `DEC-0042` §9.
    pub fn set_resume_state(
        &self,
        brain_id: &str,
        state: &ResumeState,
    ) -> Result<ResumeState, MapError> {
        self.require(brain_id)?;
        let state = state.validated()?;
        let raw = serde_json::to_string(&Envelope {
            version: RESUME_VERSION,
            state: state.clone(),
        })
        .map_err(|_| rejected("not_serialisable"))?;
        if raw.len() > MAX_RECORD_BYTES {
            return Err(rejected("record_too_large"));
        }
        self.put_meta(&key_for(brain_id), &raw)?;
        Ok(state)
    }
}

/// Why a stored id was not kept. Closed words, never a name or a path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ResumeCorrection {
    /// The remembered branch is no longer in the Index.
    FocusMissing,
    /// The remembered selection is no longer in the Index.
    SelectionMissing,
    /// The selection still exists but no longer satisfies the filter, and the
    /// filter stays authoritative: the selection falls back to the root.
    SelectionNotAMatch,
}

/// One restored brain: the state as it now stands, and the bounded projection
/// it opens on.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResumeRestore {
    /// The state **after** validation against the current Index.
    pub resume: ResumeState,
    /// Normal view on the restored branch, or the filtered page.
    pub projection: MapSnapshot,
    /// A **fresh** cursor of the current revision, present only when the
    /// selected match is not on the first page of the filter.
    pub filter_cursor: Option<String>,
    pub corrections: Vec<ResumeCorrection>,
}

/// Restores one brain against its **current** Index.
///
/// The catalogue answers "where was this brain left"; the Index answers "is
/// that still there". Whatever the Index refuses is replaced by a valid target
/// and the corrected state is stored, so the record never keeps a stale id.
///
/// * **Filter off.** The remembered branch is read; a selection that is not on
///   its bounded projection makes that selection the branch (the same rule as
///   selecting a node the map does not show).
/// * **Filter on.** The filter is re-read from the current revision. A selected
///   match is restored **on the page that starts with it**, rebuilt from the
///   current Index with the filter's own order — a cursor is never stored. A
///   selection that no longer matches falls back to the root and the filter
///   stays.
pub fn restore(
    catalog: &BrainCatalog,
    brain: &BrainRecord,
    store: &BrainIndex,
) -> Result<ResumeRestore, MapError> {
    if !store.is_built()? {
        return Err(MapError::NotBuilt("canonical brain index".into()));
    }
    let stored = catalog.stored_resume_state(&brain.brain_id)?;
    let original = match &stored {
        Some(state) => state.clone(),
        None => catalog.default_resume_state()?,
    };
    let mut state = original.clone();
    let mut corrections = Vec::new();
    let root_id = store.root_id()?;
    let exists = |id: i64| -> Result<bool, MapError> { Ok(store.index.node(id)?.is_some()) };

    // The remembered branch: kept only if this Index still has it. The root is
    // the default and is stored as "no focus".
    state.focus_node_id = match state.focus_node_id {
        Some(id) if id == root_id => None,
        Some(id) if exists(id)? => Some(id),
        Some(_) => {
            corrections.push(ResumeCorrection::FocusMissing);
            None
        }
        None => None,
    };

    let filter = state.filter.normalized();
    state.filter = filter.clone();
    let (projection, filter_cursor) = if filter.is_inactive() {
        state.selected_node_id = match state.selected_node_id {
            Some(id) if exists(id)? => Some(id),
            Some(_) => {
                corrections.push(ResumeCorrection::SelectionMissing);
                None
            }
            None => None,
        };
        let mut shown = materialize_view(store, state.focus_node_id, None)?;
        if let Some(selected) = state.selected_node_id
            && !shown.nodes.iter().any(|node| node.id == selected)
        {
            shown = materialize_view(store, Some(selected), None)?;
            state.focus_node_id = (selected != root_id).then_some(selected);
        }
        (shown, None)
    } else {
        // A revision that moves between the anchor and the page makes the fresh
        // cursor stale; one more attempt reads both from the new revision.
        let settled_corrections = corrections.len();
        let mut attempt = 0;
        loop {
            attempt += 1;
            let first_page = materialize_filtered_view(store, &filter, None)?;
            let mut shown = first_page;
            let mut cursor = None;
            // The root is never a match and is always on the page: selecting it is
            // the default, not a correction.
            if let Some(selected) = state.selected_node_id.filter(|id| *id != root_id) {
                match store.index.filter_anchor(&filter, selected)? {
                    // A match already on the first page keeps the canonical
                    // first page. Only a match beyond it moves the page.
                    Some(anchor) => {
                        let on_first_page = shown
                            .filtered
                            .as_ref()
                            .is_some_and(|page| page.filter_match_ids.contains(&selected));
                        if !on_first_page {
                            cursor = anchor.cursor(&filter).as_ref().map(FilterCursor::encode);
                        }
                    }
                    None => {
                        corrections.push(if exists(selected)? {
                            ResumeCorrection::SelectionNotAMatch
                        } else {
                            ResumeCorrection::SelectionMissing
                        });
                        state.selected_node_id = None;
                    }
                }
            }
            if let Some(encoded) = cursor.as_deref() {
                match materialize_filtered_view(store, &filter, Some(encoded)) {
                    Ok(page) => shown = page,
                    Err(MapError::Filter(FilterError::StaleCursor { .. })) if attempt < 2 => {
                        corrections.truncate(settled_corrections);
                        continue;
                    }
                    Err(other) => return Err(other),
                }
            }
            break (shown, cursor);
        }
    };

    // Store the correction — and only a correction: a brain that had nothing
    // stored keeps having nothing stored.
    if stored.is_some() && state != original {
        state = catalog.set_resume_state(&brain.brain_id, &state)?;
    }
    Ok(ResumeRestore {
        resume: state,
        projection,
        filter_cursor,
        corrections,
    })
}

#[cfg(test)]
#[path = "resume_state_tests.rs"]
mod tests;
