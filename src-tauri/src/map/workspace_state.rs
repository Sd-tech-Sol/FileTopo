//! The global workspace and its preferences — `TASK-0053`, `DEC-0051`, `F-052`.
//!
//! What a person would lose by closing the application that is **not** already
//! owned by something else: which brains were on screen and which one was
//! focused, where the composed camera and its selection were, whether the
//! legend was open, the density, the motion preference, and — when the product
//! is closed in the middle of it — the focused branch and its collapsed folders.
//!
//! Five rules govern this module (the first four are `resume_state.rs`'s).
//!
//! * **No new store.** One record in `catalog_meta`, under one versioned key.
//!   No file, no table, no schema change.
//! * **Closed and bounded.** The DTO has exactly the keys below, every list is
//!   capped, the stored envelope is capped, and unknown fields are refused.
//!   No path, no name, no stable key, no cursor, no content, no hash.
//! * **A record never makes a node valid.** Every node reference is bound, **by
//!   the backend**, to the Index generation (`index_id` + revision) it was read
//!   from; at restore it is checked against the **current** generation of the
//!   same brain, then against the Index itself. A number is never remapped.
//! * **A damaged record is a visible correction, not a failure.** Invalid JSON,
//!   an unknown version, an unknown field, an oversized record: the workspace
//!   opens on safe defaults and says `RECORD_UNREADABLE`.
//! * **One truth per value.** The per-brain branch/selection/camera/filter/panel
//!   stay in the resume state, the language in `filetopo.locale`, seen/unseen in
//!   its own store. Nothing here copies them.
//!
//! Reading and writing touch `catalog_meta` and, to bind or check node
//! references, read-only connections to the brains' Indexes. The source, the
//! journal, the relations, the exclusions and the seen state are never touched.

use super::MapError;
use super::brain_index::BrainIndex;
use super::brains::{ACTIVE_BRAIN_KEY, BrainCatalog, BrainNodeRef, BrainRecord};
use super::projection::VIEW_BUDGET;
use super::resume_state::{MAX_NODE_ID, MAX_VIEW_SCALE, MAX_VIEW_TRANSLATION, ResumeView};
use crate::domain::NodeKind;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

/// Bump only together with a reader for the previous one.
pub const WORKSPACE_VERSION: u32 = 1;
/// The `catalog_meta` key. Global: it is not scoped to a brain.
const WORKSPACE_KEY: &str = "workspace.v1";
/// A record is a handful of ids and numbers: anything larger is not one of ours.
const MAX_RECORD_BYTES: usize = 16 * 1024;
/// Far above any composition (the catalogue holds a handful of brains), small
/// enough that a corrupted list is recognised as one.
const MAX_DISPLAYED_BRAINS: usize = 64;
const MAX_BRAIN_ID_BYTES: usize = 128;
/// Walking up from a node: no tree is deeper, so a longer chain is a cycle.
const MAX_ANCESTOR_STEPS: usize = 4096;

/// Chrome density. **Never** a map concern: it changes paddings and gaps of the
/// application's own controls and panels, not a single coordinate of the map.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Density {
    #[default]
    Comfortable,
    Compact,
}

/// Motion preference. There is deliberately **no** "force motion" value:
/// `System` keeps `prefers-reduced-motion` in charge, `Reduce` removes motion
/// whatever the system says.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Motion {
    #[default]
    System,
    Reduce,
}

/// The branch focus (`TASK-0052`) a closed product comes back to.
///
/// The camera and the selection **on screen** while a branch is focused are the
/// workspace's own `view` and `selected`; what leaving the focus puts back is
/// `saved_view` and `saved_selected`. Neither the page cursor nor any projection
/// is stored: a restored branch opens on its first page.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BranchFocusRecord {
    pub brain_id: String,
    pub root_node_id: i64,
    /// Collapsed folders, in the order they were collapsed.
    pub collapsed_ids: Vec<i64>,
    /// The camera of the composition the focus was entered from.
    pub saved_view: Option<ResumeView>,
    /// The selection of the composition the focus was entered from.
    pub saved_selected: Option<BrainNodeRef>,
}

/// The whole workspace. **Exactly** these eight keys.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkspaceState {
    /// Non-empty, duplicate-free, in catalogue order.
    pub displayed_brain_ids: Vec<String>,
    /// Always one of `displayed_brain_ids`.
    pub focused_brain_id: String,
    /// The camera of what is on screen — the composition's, or the branch's.
    /// `None` for one brain alone and no branch: that camera is the brain's own
    /// (resume state), never copied here.
    pub view: Option<ResumeView>,
    /// The selection of what is on screen, same rule as `view`.
    pub selected: Option<BrainNodeRef>,
    pub legend_open: bool,
    pub density: Density,
    pub motion: Motion,
    pub branch_focus: Option<BranchFocusRecord>,
}

/// One node-bearing brain and the Index generation its references were read from.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Binding {
    brain_id: String,
    /// `index_id@revision`; `None` when the brain had no readable Index.
    generation: Option<String>,
}

/// The closed, versioned envelope that is written. The bindings are
/// backend-owned: they never enter the public [`WorkspaceState`].
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope {
    version: u32,
    bindings: Vec<Binding>,
    state: WorkspaceState,
}

#[derive(Debug, Clone)]
struct StoredWorkspace {
    bindings: HashMap<String, Option<String>>,
    state: WorkspaceState,
}

fn rejected(reason: &str) -> MapError {
    MapError::WorkspaceRejected(reason.to_string())
}

/// The generation a node reference is bound to.
pub fn generation_of(store: &BrainIndex) -> Result<String, MapError> {
    let identity = store.index.identity()?;
    Ok(format!("{}@{}", identity.index_id, identity.revision))
}

fn valid_brain_id(brain_id: &str) -> bool {
    !brain_id.is_empty() && brain_id.len() <= MAX_BRAIN_ID_BYTES
}

fn valid_node_id(id: i64) -> bool {
    (1..=MAX_NODE_ID).contains(&id)
}

fn valid_view(view: &ResumeView) -> bool {
    let shift = |value: f64| value.is_finite() && value.abs() <= MAX_VIEW_TRANSLATION;
    view.scale.is_finite()
        && view.scale > 0.0
        && view.scale <= MAX_VIEW_SCALE
        && shift(view.tx)
        && shift(view.ty)
}

fn valid_ref(reference: &BrainNodeRef) -> bool {
    valid_brain_id(&reference.brain_id) && valid_node_id(reference.node_id)
}

impl WorkspaceState {
    /// A workspace that has nothing stored: the given brain alone, nothing
    /// remembered, the preferences as the product has always had them.
    pub fn defaults(brain_id: &str) -> Self {
        Self {
            displayed_brain_ids: vec![brain_id.to_string()],
            focused_brain_id: brain_id.to_string(),
            view: None,
            selected: None,
            legend_open: false,
            density: Density::Comfortable,
            motion: Motion::System,
            branch_focus: None,
        }
    }

    /// The canonical form of a state **or a refusal** — never a guess. Structure
    /// and bounds only: whether a node still exists is the restore's question.
    pub fn validated(&self) -> Result<Self, MapError> {
        let displayed = &self.displayed_brain_ids;
        if displayed.is_empty() {
            return Err(rejected("displayed_empty"));
        }
        if displayed.len() > MAX_DISPLAYED_BRAINS || !displayed.iter().all(|id| valid_brain_id(id))
        {
            return Err(rejected("displayed_out_of_bounds"));
        }
        if displayed.iter().collect::<HashSet<_>>().len() != displayed.len() {
            return Err(rejected("displayed_duplicate"));
        }
        if !displayed.contains(&self.focused_brain_id) {
            return Err(rejected("focused_not_displayed"));
        }
        if self.view.as_ref().is_some_and(|view| !valid_view(view)) {
            return Err(rejected("view_out_of_bounds"));
        }
        if self.selected.as_ref().is_some_and(|node| !valid_ref(node)) {
            return Err(rejected("selection_out_of_bounds"));
        }
        if let Some(branch) = &self.branch_focus {
            if !valid_brain_id(&branch.brain_id) || !valid_node_id(branch.root_node_id) {
                return Err(rejected("branch_out_of_bounds"));
            }
            if branch.collapsed_ids.len() > VIEW_BUDGET
                || !branch.collapsed_ids.iter().all(|id| valid_node_id(*id))
            {
                return Err(rejected("collapsed_out_of_bounds"));
            }
            if branch.collapsed_ids.iter().collect::<HashSet<_>>().len()
                != branch.collapsed_ids.len()
            {
                return Err(rejected("collapsed_duplicate"));
            }
            if branch
                .saved_view
                .as_ref()
                .is_some_and(|view| !valid_view(view))
            {
                return Err(rejected("saved_view_out_of_bounds"));
            }
            if branch
                .saved_selected
                .as_ref()
                .is_some_and(|node| !valid_ref(node))
            {
                return Err(rejected("saved_selection_out_of_bounds"));
            }
        }
        Ok(self.clone())
    }

    /// The brains whose node references this state carries, once each, in a
    /// stable order. These are the brains the backend binds a generation to.
    pub fn referenced_brains(&self) -> Vec<String> {
        let mut brains: Vec<String> = Vec::new();
        let mut push = |brain_id: &str| {
            if !brains.iter().any(|known| known == brain_id) {
                brains.push(brain_id.to_string());
            }
        };
        if let Some(selected) = &self.selected {
            push(&selected.brain_id);
        }
        if let Some(branch) = &self.branch_focus {
            push(&branch.brain_id);
            if let Some(saved) = &branch.saved_selected {
                push(&saved.brain_id);
            }
        }
        brains
    }
}

/// Parses what is stored. `None` for **anything** that is not a valid record of
/// the current version.
fn read_record(raw: &str) -> Option<StoredWorkspace> {
    if raw.len() > MAX_RECORD_BYTES {
        return None;
    }
    let envelope: Envelope = serde_json::from_str(raw).ok()?;
    if envelope.version != WORKSPACE_VERSION {
        return None;
    }
    let state = envelope.state.validated().ok()?;
    let mut bindings = HashMap::new();
    for binding in envelope.bindings {
        if !valid_brain_id(&binding.brain_id)
            || binding
                .generation
                .as_ref()
                .is_some_and(|value| value.is_empty())
            || bindings
                .insert(binding.brain_id, binding.generation)
                .is_some()
        {
            return None;
        }
    }
    Some(StoredWorkspace { bindings, state })
}

impl BrainCatalog {
    /// Stores the workspace and returns it as stored.
    ///
    /// `generations` is what the **backend** read for each brain named by
    /// [`WorkspaceState::referenced_brains`] (`None` = no readable Index); a
    /// reference whose brain has no entry is stored unbound, and restore will
    /// not trust it. Touches `catalog_meta` and nothing else.
    pub fn set_workspace_state(
        &self,
        state: &WorkspaceState,
        generations: &BTreeMap<String, Option<String>>,
    ) -> Result<WorkspaceState, MapError> {
        let state = state.validated()?;
        let bindings = state
            .referenced_brains()
            .into_iter()
            .map(|brain_id| {
                let generation = generations.get(&brain_id).cloned().flatten();
                Binding {
                    brain_id,
                    generation: generation.filter(|value| !value.is_empty()),
                }
            })
            .collect();
        let raw = serde_json::to_string(&Envelope {
            version: WORKSPACE_VERSION,
            bindings,
            state: state.clone(),
        })
        .map_err(|_| rejected("not_serialisable"))?;
        if raw.len() > MAX_RECORD_BYTES {
            return Err(rejected("record_too_large"));
        }
        self.put_meta(WORKSPACE_KEY, &raw)?;
        Ok(state)
    }
}

/// Why a stored value was not kept. Closed words, never a name or a path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WorkspaceCorrection {
    /// Invalid JSON, an unknown version or field, or an oversized record.
    RecordUnreadable,
    /// A displayed brain is no longer in the catalogue.
    BrainMissing,
    /// No remembered brain is left: the active brain is shown alone.
    CompositionFallback,
    /// The focused brain is gone: another displayed brain took the focus.
    FocusedBrainMissing,
    /// The camera belonged to a composition that no longer exists.
    ViewCompositionChanged,
    /// The selection's brain is not on screen any more.
    SelectionBrainNotDisplayed,
    /// The selection was read from another Index generation.
    SelectionGenerationChanged,
    /// The selection is no longer in the Index.
    SelectionMissing,
    /// The focused branch's brain is not on screen any more.
    BranchBrainNotDisplayed,
    /// The focused branch was read from another Index generation.
    BranchGenerationChanged,
    /// The focused branch's root is gone or is not a folder.
    BranchRootInvalid,
    /// At least one collapsed folder is gone or is outside the focused branch.
    BranchCollapsedInvalid,
    /// The selection made inside the branch is outside it: the root is selected.
    BranchSelectionOutside,
    /// What leaving the focus would select is no longer valid.
    BranchSavedSelectionInvalid,
}

/// The workspace as it now stands, and every correction that was made to get
/// there. An empty list on a stored record means it was restored exactly.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRestore {
    pub workspace: WorkspaceState,
    pub corrections: Vec<WorkspaceCorrection>,
}

/// What restore knows about one brain's Index, read at most once.
struct Probe {
    index: Option<BrainIndex>,
    generation: Option<String>,
}

/// Read-only access to the brains' Indexes through `open`, which answers `None`
/// when a brain has no Index that can be read, for whatever reason.
struct Probes<F> {
    catalogue: HashMap<String, BrainRecord>,
    open: F,
    cache: HashMap<String, Probe>,
}

impl<F: FnMut(&BrainRecord) -> Option<BrainIndex>> Probes<F> {
    fn probe(&mut self, brain_id: &str) -> &Probe {
        if !self.cache.contains_key(brain_id) {
            let index = self
                .catalogue
                .get(brain_id)
                .and_then(|record| (self.open)(record));
            let generation = index.as_ref().and_then(|store| generation_of(store).ok());
            self.cache
                .insert(brain_id.to_string(), Probe { index, generation });
        }
        &self.cache[brain_id]
    }

    /// The generation each referenced brain has **now**, for the record that is
    /// about to be written.
    fn generations(&mut self, brains: &[String]) -> BTreeMap<String, Option<String>> {
        brains
            .iter()
            .map(|brain_id| (brain_id.clone(), self.probe(brain_id).generation.clone()))
            .collect()
    }
}

/// `Err(correction)` when the reference cannot be trusted against the **current**
/// Index of its brain: wrong generation first, existence second.
fn check_ref<F: FnMut(&BrainRecord) -> Option<BrainIndex>>(
    probes: &mut Probes<F>,
    stored: Option<&StoredWorkspace>,
    reference: &BrainNodeRef,
    generation_changed: WorkspaceCorrection,
    missing: WorkspaceCorrection,
) -> Result<(), WorkspaceCorrection> {
    let bound =
        stored.and_then(|record| record.bindings.get(&reference.brain_id).cloned().flatten());
    let probe = probes.probe(&reference.brain_id);
    match (&bound, &probe.generation) {
        (Some(bound), Some(current)) if bound == current => {}
        _ => return Err(generation_changed),
    }
    match probe
        .index
        .as_ref()
        .map(|store| store.index.node(reference.node_id))
    {
        Some(Ok(Some(_))) => Ok(()),
        _ => Err(missing),
    }
}

/// Whether `node_id` is `root` or lies below it, walking the Index upwards.
fn is_in_subtree(store: &BrainIndex, root: i64, node_id: i64) -> bool {
    let mut current = Some(node_id);
    for _ in 0..MAX_ANCESTOR_STEPS {
        let Some(id) = current else { return false };
        if id == root {
            return true;
        }
        current = match store.index.node(id) {
            Ok(Some(node)) => node.parent_id,
            _ => return false,
        };
    }
    false
}

/// Restores the workspace against the **current** catalogue and Indexes.
///
/// The catalogue answers "what was on screen"; the Indexes answer "is that still
/// there". Whatever they refuse is replaced by a valid target **and named**, and
/// the corrected workspace is stored, so a record never keeps a stale id and a
/// correction is shown once.
pub fn restore<F: FnMut(&BrainRecord) -> Option<BrainIndex>>(
    catalog: &BrainCatalog,
    open: F,
) -> Result<WorkspaceRestore, MapError> {
    let brains = catalog.list()?;
    let order: Vec<String> = brains.iter().map(|brain| brain.brain_id.clone()).collect();
    let active = catalog
        .meta(ACTIVE_BRAIN_KEY)?
        .filter(|stored| order.contains(stored))
        .or_else(|| order.first().cloned())
        .ok_or_else(|| rejected("catalogue_empty"))?;

    let raw = catalog.meta(WORKSPACE_KEY)?;
    let mut corrections = Vec::new();
    let stored = match raw.as_deref() {
        None => None,
        Some(text) => match read_record(text) {
            Some(record) => Some(record),
            None => {
                corrections.push(WorkspaceCorrection::RecordUnreadable);
                None
            }
        },
    };
    let had_record = raw.is_some();
    let original = stored
        .as_ref()
        .map(|record| record.state.clone())
        .unwrap_or_else(|| WorkspaceState::defaults(&active));
    let mut state = original.clone();

    let mut probes = Probes {
        catalogue: brains
            .iter()
            .map(|brain| (brain.brain_id.clone(), brain.clone()))
            .collect(),
        open,
        cache: HashMap::new(),
    };

    // ---- composition: catalogue order, at least one brain, a focused one.
    let mut composition_changed = false;
    let kept: Vec<String> = order
        .iter()
        .filter(|id| state.displayed_brain_ids.contains(id))
        .cloned()
        .collect();
    if kept.len() != state.displayed_brain_ids.len() {
        corrections.push(WorkspaceCorrection::BrainMissing);
        composition_changed = true;
    }
    if kept.is_empty() {
        corrections.push(WorkspaceCorrection::CompositionFallback);
        state.displayed_brain_ids = vec![active.clone()];
        state.focused_brain_id = active.clone();
    } else {
        state.displayed_brain_ids = kept;
        if !state.displayed_brain_ids.contains(&state.focused_brain_id) {
            corrections.push(WorkspaceCorrection::FocusedBrainMissing);
            state.focused_brain_id = if state.displayed_brain_ids.contains(&active) {
                active.clone()
            } else {
                state.displayed_brain_ids[0].clone()
            };
            composition_changed = true;
        }
    }
    if state.displayed_brain_ids.len() != original.displayed_brain_ids.len() {
        composition_changed = true;
    }

    // ---- branch focus: whole or not at all. When it cannot come back, what is on
    // screen was the branch's, so the composition's own camera and selection —
    // the ones leaving the focus would have put back — are what is left.
    if let Some(branch) = state.branch_focus.clone() {
        let outcome = restore_branch(&mut probes, stored.as_ref(), &state, &branch);
        match outcome {
            Ok((valid, dropped_collapsed, saved_selection_invalid)) => {
                if dropped_collapsed {
                    corrections.push(WorkspaceCorrection::BranchCollapsedInvalid);
                }
                if saved_selection_invalid {
                    corrections.push(WorkspaceCorrection::BranchSavedSelectionInvalid);
                }
                state.branch_focus = Some(valid);
            }
            Err(correction) => {
                corrections.push(correction);
                state.view = branch.saved_view;
                state.selected = branch.saved_selected;
                state.branch_focus = None;
            }
        }
    }

    // ---- camera: only meaningful for the composition it was taken in.
    if composition_changed {
        if state.branch_focus.is_none() {
            if state.view.take().is_some() {
                corrections.push(WorkspaceCorrection::ViewCompositionChanged);
            }
        } else if let Some(branch) = state.branch_focus.as_mut()
            && branch.saved_view.take().is_some()
        {
            corrections.push(WorkspaceCorrection::ViewCompositionChanged);
        }
    }

    // ---- selection: on screen, bound to the current generation, still there.
    if let Some(reference) = state.selected.clone() {
        let verdict = if !state.displayed_brain_ids.contains(&reference.brain_id) {
            Err(WorkspaceCorrection::SelectionBrainNotDisplayed)
        } else {
            check_ref(
                &mut probes,
                stored.as_ref(),
                &reference,
                WorkspaceCorrection::SelectionGenerationChanged,
                WorkspaceCorrection::SelectionMissing,
            )
        };
        match verdict {
            Ok(()) => {}
            Err(correction) => {
                corrections.push(correction);
                state.selected = None;
            }
        }
    }
    // Inside a branch the selection is part of the branch: outside it, the root.
    if let Some(branch) = &state.branch_focus {
        let inside = state.selected.as_ref().is_some_and(|reference| {
            reference.brain_id == branch.brain_id
                && probes
                    .probe(&branch.brain_id)
                    .index
                    .as_ref()
                    .is_some_and(|store| {
                        is_in_subtree(store, branch.root_node_id, reference.node_id)
                    })
        });
        if !inside {
            if state.selected.is_some() {
                corrections.push(WorkspaceCorrection::BranchSelectionOutside);
            }
            state.selected = Some(BrainNodeRef::new(&branch.brain_id, branch.root_node_id));
        }
    }

    // ---- store the correction — and only a correction: a workspace that had
    // nothing stored keeps having nothing stored.
    if had_record && (state != original || !corrections.is_empty()) {
        let generations = probes.generations(&state.referenced_brains());
        state = catalog.set_workspace_state(&state, &generations)?;
    }
    Ok(WorkspaceRestore {
        workspace: state,
        corrections,
    })
}

/// A focused branch checked against its brain's current Index. `Ok` carries the
/// branch as it stands, whether collapsed ids were dropped, and whether the
/// "leave the focus" selection was dropped; `Err` is why it cannot come back.
fn restore_branch<F: FnMut(&BrainRecord) -> Option<BrainIndex>>(
    probes: &mut Probes<F>,
    stored: Option<&StoredWorkspace>,
    state: &WorkspaceState,
    branch: &BranchFocusRecord,
) -> Result<(BranchFocusRecord, bool, bool), WorkspaceCorrection> {
    if !state.displayed_brain_ids.contains(&branch.brain_id) {
        return Err(WorkspaceCorrection::BranchBrainNotDisplayed);
    }
    let root = BrainNodeRef::new(&branch.brain_id, branch.root_node_id);
    check_ref(
        probes,
        stored,
        &root,
        WorkspaceCorrection::BranchGenerationChanged,
        WorkspaceCorrection::BranchRootInvalid,
    )?;
    let store_ok = |probes: &mut Probes<F>, id: i64| -> Option<bool> {
        let index = probes.probe(&branch.brain_id).index.as_ref()?;
        let node = index.index.node(id).ok().flatten()?;
        Some(matches!(node.kind, NodeKind::Directory | NodeKind::Root))
    };
    if store_ok(probes, branch.root_node_id) != Some(true) {
        return Err(WorkspaceCorrection::BranchRootInvalid);
    }
    let mut valid = branch.clone();
    valid.collapsed_ids = branch
        .collapsed_ids
        .iter()
        .copied()
        .filter(|id| {
            store_ok(probes, *id) == Some(true)
                && probes
                    .probe(&branch.brain_id)
                    .index
                    .as_ref()
                    .is_some_and(|store| is_in_subtree(store, branch.root_node_id, *id))
        })
        .collect();
    let dropped_collapsed = valid.collapsed_ids.len() != branch.collapsed_ids.len();
    let mut saved_selection_invalid = false;
    if let Some(saved) = &branch.saved_selected {
        let verdict = if state.displayed_brain_ids.contains(&saved.brain_id) {
            check_ref(
                probes,
                stored,
                saved,
                WorkspaceCorrection::BranchSavedSelectionInvalid,
                WorkspaceCorrection::BranchSavedSelectionInvalid,
            )
        } else {
            Err(WorkspaceCorrection::BranchSavedSelectionInvalid)
        };
        if verdict.is_err() {
            valid.saved_selected = None;
            saved_selection_invalid = true;
        }
    }
    Ok((valid, dropped_collapsed, saved_selection_invalid))
}

#[cfg(test)]
#[path = "workspace_state_tests.rs"]
mod tests;
