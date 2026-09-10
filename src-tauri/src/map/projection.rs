//! DEC-0031 product boundary: no whole-corpus read, no recursive subtree count.
use super::{MapError, brain_index::BrainIndex, layout, store::MapSnapshot};
use crate::hierarchy::ChildCursor;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

pub const VIEW_BUDGET: usize = 512;
// One aggregate slot reserved per material node. Thus even an adversarial tree
// with omitted children at every level cannot exceed the declared budget. This
// stays the absolute technical ceiling — `DEC-0034` B never reinterprets it as
// a display target.
const MATERIAL_BUDGET: usize = VIEW_BUDGET / 2;
// `DEC-0034` B: an ordinary projection is a small, human-readable map, well
// under the technical ceiling above. Ancestry and focus are always included
// even past this target — `MATERIAL_BUDGET` remains the only hard stop — and
// `idx_nodes_child_order` (`CHILD_ORDER` in `hierarchy.rs`) already orders
// every page directory-first, so filling up to this smaller target is what
// keeps directories over files without any extra sorting here.
const ORDINARY_MATERIAL_TARGET: usize = 64;
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewAggregate {
    pub parent_id: i64,
    pub omitted_direct_children: u64,
    pub reason: String,
    pub next_cursor: Option<String>,
    pub rect: layout::Rect,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HierarchyEdge {
    pub parent_id: i64,
    pub child_id: i64,
}

pub fn materialize_view(
    store: &BrainIndex,
    focus: Option<i64>,
    after: Option<&str>,
) -> Result<MapSnapshot, MapError> {
    if !store.is_built()? {
        return Err(MapError::NotBuilt("canonical brain index".into()));
    }
    // One SQLite read transaction gives the identity, pages and counts one revision.
    let tx = store.index.connection.unchecked_transaction()?;
    let identity = store.index.identity()?;
    let root_id = store.root_id()?;
    let focus_id = focus.unwrap_or(root_id);
    let focus_node = store
        .index
        .node(focus_id)?
        .ok_or(MapError::NodeMissing(focus_id))?;
    let mut selected = store.index.ancestor_chain(focus_id)?;
    selected.reverse();
    selected.push(focus_node);
    if selected.len() >= MATERIAL_BUDGET {
        return Err(MapError::View("focus ancestry exceeds view budget".into()));
    }
    // The target this call fills up to. Mandatory ancestry can already exceed
    // the ordinary product target on a very deep focus; when it does, this
    // call adds nothing beyond it rather than erroring, and the technical
    // ceiling above remains the only refusal.
    let effective_target = ORDINARY_MATERIAL_TARGET
        .max(selected.len())
        .min(MATERIAL_BUDGET);
    let cursor = after.map(ChildCursor::decode).transpose()?;
    let mut next_by_parent = HashMap::new();
    // Validate even a cursor submitted for a leaf or a full ancestry chain.
    //
    // Only the focus's own direct children are paged in here — never a
    // grandchild. An earlier version kept walking into whichever child
    // happened to sort first and paginating *its* children too, which spent
    // most of an ordinary 64-block target on one arbitrary branch's own
    // descendants instead of showing the focus's real siblings; a live
    // WebView2 replay of `TASK-0033` caught it. `DEC-0034` C's "explorer une
    // branche" is what descends a level, by asking again with that child as
    // the new focus — never a side effect of viewing its parent.
    let first =
        store
            .index
            .children_page(focus_id, effective_target - selected.len(), cursor.as_ref())?;
    next_by_parent.insert(focus_id, first.next_cursor.map(|c| c.encode()));
    selected.extend(first.items);
    // Scanner IDs preserve the historical ordering for complete small views.
    selected.sort_by_key(|n| n.id);
    let ids = selected.iter().map(|n| n.id).collect::<HashSet<_>>();
    let positions = selected
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id, i))
        .collect::<HashMap<_, _>>();
    let mut parents = selected
        .iter()
        .map(|n| n.parent_id.and_then(|p| positions.get(&p).copied()))
        .collect::<Vec<_>>();
    let mut direct = HashMap::<i64, u64>::new();
    let mut edges = Vec::new();
    for n in &selected {
        if let Some(p) = n.parent_id.filter(|p| ids.contains(p)) {
            *direct.entry(p).or_default() += 1;
            edges.push(HierarchyEdge {
                parent_id: p,
                child_id: n.id,
            });
        }
    }
    let mut aggregates = Vec::new();
    for n in &selected {
        let omitted = u64::from(n.child_count).saturating_sub(*direct.get(&n.id).unwrap_or(&0));
        if omitted > 0 {
            aggregates.push(ViewAggregate {
                parent_id: n.id,
                omitted_direct_children: omitted,
                reason: "view_budget_or_focus".into(),
                next_cursor: next_by_parent.get(&n.id).cloned().flatten(),
                rect: layout::Rect {
                    x: 0.0,
                    y: 0.0,
                    w: 0.0,
                    h: 0.0,
                },
            });
            parents.push(positions.get(&n.id).copied());
        }
    }
    let laid_out = layout::compute(layout::LayoutInput { parents: &parents });
    let mut nodes = selected
        .into_iter()
        .map(|n| store.metadata_node(n))
        .collect::<Result<Vec<_>, _>>()?;
    for (n, r) in nodes.iter_mut().zip(&laid_out.rects) {
        n.rect = *r;
    }
    for (a, r) in aggregates.iter_mut().zip(&laid_out.rects[nodes.len()..]) {
        a.rect = *r;
    }
    let node_count = store.count()?;
    let materialized_count = nodes.len();
    let non_materialized_count = node_count
        .checked_sub(materialized_count)
        .ok_or_else(|| MapError::View("inconsistent corpus count".into()))?;
    let diagnostics = nodes
        .iter()
        .filter_map(|n| {
            n.access_diagnostic
                .as_ref()
                .map(|code| crate::domain::ScanDiagnostic {
                    code: code.clone(),
                    relative_path: n.relative_path.clone(),
                })
        })
        .collect();
    let result = MapSnapshot {
        brain_id: store
            .built_for_brain()?
            .ok_or_else(|| MapError::NotBuilt("brain id".into()))?,
        fixture_id: store.meta("fixture_id")?.unwrap_or_default(),
        label: store.meta("label")?.unwrap_or_default(),
        root_id,
        node_count,
        layout_width: laid_out.width,
        layout_height: laid_out.height,
        schema_version: super::store::MAP_SCHEMA_VERSION,
        layout_algorithm: layout::LAYOUT_ALGORITHM.into(),
        nodes,
        diagnostics,
        index_revision: identity.revision,
        focus_id,
        view_budget: VIEW_BUDGET,
        materialized_count,
        non_materialized_count,
        hidden_reason: if non_materialized_count > 0 {
            Some("outside_current_projection".into())
        } else {
            None
        },
        aggregates,
        hierarchy_edges: edges,
    };
    tx.commit()?;
    Ok(result)
}

#[cfg(test)]
#[path = "projection_tests.rs"]
mod tests;
