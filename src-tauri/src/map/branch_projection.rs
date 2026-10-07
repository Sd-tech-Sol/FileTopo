//! `TASK-0052` — branch focus and collapse (`DEC-0050`, `F-042`).
//!
//! A **real bounded projection** of one branch, materialised by the backend
//! from the canonical Index: it starts at the focused folder and holds nothing
//! but that folder and its descendants — no ancestor, no sibling, no other
//! brain. It is not a mask over the whole-brain view; the frontend never
//! receives a node that is outside the subtree.
//!
//! * **Fill.** Breadth-first from the focused folder, children read through the
//!   existing keyset `children_page` in canonical order, up to the ordinary
//!   target of `DEC-0034` B; `MATERIAL_BUDGET` stays the only hard stop. Every
//!   folder whose children are not all shown carries an aggregate, exactly as
//!   in the ordinary view — nothing is lost silently.
//! * **Collapse.** The *reference* projection is computed **ignoring** the
//!   collapsed set, then each collapsed folder keeps itself and loses every
//!   materialised descendant. So collapsing is a pure removal and expanding is
//!   exactly the reference: same focus, same pagination, same budget ⇒ same
//!   projection, and one collapse can never move a node of another branch.
//! * **The focused folder collapses like any other** (`DEC-0050` §L): it stays,
//!   alone, with the exact count of all its real descendants and no aggregate.
//! * **Exact hidden count.** `hiddenDescendantCount` is
//!   [`crate::hierarchy::descendant_count`]: every real descendant, from the
//!   Index, never `child_count`, never an estimate, never a list.
//! * **Aggregates are not collapse.** An aggregate means "more children exist
//!   than the budget showed" and pages; a collapsed folder is a person's
//!   decision and carries no aggregate. The two are separate fields.

use super::projection::{HierarchyEdge, MATERIAL_BUDGET, ORDINARY_MATERIAL_TARGET, VIEW_BUDGET, ViewAggregate};
use super::{MapError, brain_index::BrainIndex, layout, store::MapSnapshot};
use crate::domain::{NodeDto, NodeKind};
use crate::hierarchy::{ChildCursor, MAX_CHILDREN_PAGE_SIZE};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

/// What a branch projection adds to the projection DTO. Ids and counts only:
/// no path, no stable key, no volume identity. Absent from the serialised DTO
/// for every other projection, which therefore stays byte-identical.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchProjection {
    /// The focused folder — the root of this view.
    pub root_node_id: i64,
    /// The collapsed folders that are **in this view**, in node-id order. A
    /// collapsed id outside the subtree, or not reached, is not listed and
    /// changes nothing.
    pub collapsed: Vec<CollapsedFolder>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollapsedFolder {
    pub node_id: i64,
    /// Exact number of real descendants hidden by the collapse.
    pub hidden_descendant_count: u64,
}

pub fn materialize_branch_view(
    store: &BrainIndex,
    root: i64,
    collapsed_ids: &[i64],
    after: Option<&str>,
) -> Result<MapSnapshot, MapError> {
    if !store.is_built()? {
        return Err(MapError::NotBuilt("canonical brain index".into()));
    }
    // One read transaction: identity, pages and counts describe one revision.
    let tx = store.index.connection.unchecked_transaction()?;
    let identity = store.index.identity()?;
    let brain_root_id = store.root_id()?;
    let root_node = store
        .index
        .node(root)?
        .ok_or(MapError::NodeMissing(root))?;
    if matches!(root_node.kind, NodeKind::File | NodeKind::Skipped) {
        return Err(MapError::View("branch focus needs a folder".into()));
    }
    // Only materialised folders can be collapsed, so a longer list is a malformed call.
    if collapsed_ids.len() > VIEW_BUDGET {
        return Err(MapError::View("too many collapsed folders".into()));
    }
    let cursor = after.map(ChildCursor::decode).transpose()?;

    // ---- reference projection: the collapsed set is deliberately ignored.
    let mut reference: Vec<NodeDto> = vec![root_node];
    let mut next_by_parent: HashMap<i64, Option<String>> = HashMap::new();
    let mut queue: VecDeque<i64> = VecDeque::from([root]);
    let mut first = true;
    while let Some(parent_id) = queue.pop_front() {
        let remaining = ORDINARY_MATERIAL_TARGET.saturating_sub(reference.len());
        if remaining == 0 {
            break;
        }
        let page = store.index.children_page(
            parent_id,
            remaining.min(MAX_CHILDREN_PAGE_SIZE),
            if first { cursor.as_ref() } else { None },
        )?;
        first = false;
        next_by_parent.insert(parent_id, page.next_cursor.map(|c| c.encode()));
        for child in page.items {
            if matches!(child.kind, NodeKind::Directory) && child.child_count > 0 {
                queue.push_back(child.id);
            }
            reference.push(child);
        }
    }
    if reference.len() > MATERIAL_BUDGET {
        return Err(MapError::View("branch view exceeds view budget".into()));
    }

    // ---- collapse: a pure removal from the reference.
    let in_reference: HashMap<i64, &NodeDto> = reference.iter().map(|n| (n.id, n)).collect();
    let collapsed_in_view: HashSet<i64> = collapsed_ids
        .iter()
        .copied()
        .filter(|id| {
            in_reference
                .get(id)
                .is_some_and(|n| matches!(n.kind, NodeKind::Directory | NodeKind::Root))
        })
        .collect();
    let hidden_by_collapse = |node: &NodeDto| -> bool {
        let mut parent = node.parent_id;
        while let Some(id) = parent {
            if collapsed_in_view.contains(&id) {
                return true;
            }
            if id == root {
                return false;
            }
            parent = in_reference.get(&id).and_then(|n| n.parent_id);
        }
        false
    };
    let kept: Vec<NodeDto> = reference
        .iter()
        .filter(|n| !hidden_by_collapse(n))
        .cloned()
        .collect();
    drop(in_reference);
    let mut selected = kept;
    // Scanner ids keep the historical order of a complete small view.
    selected.sort_by_key(|n| n.id);

    let mut collapsed: Vec<CollapsedFolder> = Vec::new();
    for node in &selected {
        if collapsed_in_view.contains(&node.id) {
            collapsed.push(CollapsedFolder {
                node_id: node.id,
                hidden_descendant_count: store.index.descendant_count(node.id)?,
            });
        }
    }

    let ids = selected.iter().map(|n| n.id).collect::<HashSet<_>>();
    let positions = selected
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id, i))
        .collect::<HashMap<_, _>>();
    // The focused folder is the layout root even though its parent exists in
    // the Index: the parent is outside the subtree and therefore not here.
    let mut parents = selected
        .iter()
        .map(|n| {
            if n.id == root {
                None
            } else {
                n.parent_id.and_then(|p| positions.get(&p).copied())
            }
        })
        .collect::<Vec<_>>();
    let mut direct = HashMap::<i64, u64>::new();
    let mut edges = Vec::new();
    for n in &selected {
        if n.id == root {
            continue;
        }
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
        // A collapsed folder is a decision, not an omission: no aggregate.
        if collapsed_in_view.contains(&n.id) {
            continue;
        }
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
        root_id: brain_root_id,
        node_count,
        layout_width: laid_out.width,
        layout_height: laid_out.height,
        schema_version: super::store::MAP_SCHEMA_VERSION,
        layout_algorithm: layout::LAYOUT_ALGORITHM.into(),
        nodes,
        diagnostics,
        index_revision: identity.revision,
        focus_id: root,
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
        filtered: None,
        branch: Some(BranchProjection {
            root_node_id: root,
            collapsed,
        }),
    };
    tx.commit()?;
    Ok(result)
}

#[cfg(test)]
#[path = "branch_projection_tests.rs"]
mod tests;
