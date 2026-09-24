//! `TASK-0039` — the filtered projection (`DEC-0037` §3–§6).
//!
//! With a filter active, the projection is built from one **bounded page of
//! matches** read by SQLite over the whole brain, not from the nodes that
//! happen to be on screen (which would give a wrong total and hide matches
//! outside the projection). Each accepted match brings only the ancestors it
//! needs, so every drawn edge is a real parent/child edge and every non-match
//! is explicitly *context*.
//!
//! The budgets are `DEC-0031` / `DEC-0034`'s, unchanged: the ordinary target of
//! [`ORDINARY_MATERIAL_TARGET`] real nodes context included, and
//! [`MATERIAL_BUDGET`] as the only hard stop. Matches are consumed one at a
//! time; one that would overflow the target **with its ancestry** becomes the
//! first match of the next page — never lost, never half-materialised.
//!
//! The "omitted children" aggregates of the normal topographic view are **not**
//! reinterpreted as filter results: in a filtered view there are none, and
//! paging is the filter's own keyset cursor over matches.

use super::projection::{HierarchyEdge, MATERIAL_BUDGET, ORDINARY_MATERIAL_TARGET, VIEW_BUDGET};
use super::{MapError, brain_index::BrainIndex, layout, store::MapSnapshot};
use crate::domain::NodeDto;
use crate::hierarchy::MAX_ANCESTOR_CHAIN;
use crate::node_filter::{FilterCursor, NodeFilter};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// What a filtered page adds to the projection DTO. No path, no stable key, no
/// `FileId`, no volume identity — ids and counts only.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilteredProjection {
    /// The canonical (normalised) filter that was applied.
    pub filter: NodeFilter,
    /// Exact number of matches in the whole brain, computed by SQLite.
    pub filtered_total: u64,
    /// Matches materialised **on this page**.
    pub materialized_match_count: usize,
    /// The materialised nodes that are this page's matches.
    pub filter_match_ids: Vec<i64>,
    /// The materialised nodes that are only there as ancestry. They may
    /// themselves satisfy the filter: such a node is counted and paged as a
    /// match only where the keyset reaches it.
    pub filter_context_ids: Vec<i64>,
    /// Opaque cursor of the next page of matches, `None` on the last page.
    pub filter_next_cursor: Option<String>,
}

/// The one dispatch of `map_view`: an absent or **inactive** filter is the
/// normal projection — same function, same arguments, same DTO — and only an
/// active one takes the filtered path.
pub fn materialize(
    store: &BrainIndex,
    focus: Option<i64>,
    after: Option<&str>,
    filter: Option<&NodeFilter>,
) -> Result<MapSnapshot, MapError> {
    match filter.filter(|filter| !filter.is_inactive()) {
        Some(filter) => materialize_filtered_view(store, filter, after),
        None => super::projection::materialize_view(store, focus, after),
    }
}

pub fn materialize_filtered_view(
    store: &BrainIndex,
    filter: &NodeFilter,
    after: Option<&str>,
) -> Result<MapSnapshot, MapError> {
    if !store.is_built()? {
        return Err(MapError::NotBuilt("canonical brain index".into()));
    }
    let filter = filter.normalized();
    let cursor = after.map(FilterCursor::decode).transpose()?;
    // One SQLite read transaction: the identity, the exact total, the page of
    // matches, the ancestors and the counts all describe one revision.
    let tx = store.index.connection.unchecked_transaction()?;
    let root_id = store.root_id()?;
    let read = store
        .index
        .filtered_matches(&filter, ORDINARY_MATERIAL_TARGET, cursor.as_ref())?;

    let root = store
        .index
        .node(root_id)?
        .ok_or(MapError::NodeMissing(root_id))?;
    let mut ids = HashSet::from([root_id]);
    let mut selected = vec![root];
    let mut consumed: Vec<i64> = Vec::new();

    // Only the first `limit` rows are candidates: the row after them is the
    // "is there more?" probe and must stay for the next page.
    for row in read.rows.iter().take(read.limit) {
        let mut additions: Vec<NodeDto> = Vec::new();
        let mut added = HashSet::new();
        if !ids.contains(&row.id) {
            added.insert(row.id);
            additions.push(row.clone());
        }
        let mut parent = row.parent_id;
        let mut hops = 0usize;
        while let Some(parent_id) = parent {
            if ids.contains(&parent_id) || added.contains(&parent_id) {
                break;
            }
            hops += 1;
            if hops > MAX_ANCESTOR_CHAIN {
                return Err(MapError::View("filtered match ancestry too deep".into()));
            }
            let node = store
                .index
                .node(parent_id)?
                .ok_or(MapError::NodeMissing(parent_id))?;
            parent = node.parent_id;
            added.insert(parent_id);
            additions.push(node);
        }
        let projected = selected.len() + additions.len();
        // The first match is always taken — it can only be deferred to a page
        // that would start with it anyway — and only the technical ceiling can
        // refuse it.
        if !consumed.is_empty() && projected > ORDINARY_MATERIAL_TARGET {
            break;
        }
        if projected >= MATERIAL_BUDGET {
            return Err(MapError::View(
                "filtered match ancestry exceeds view budget".into(),
            ));
        }
        ids.extend(added);
        selected.extend(additions);
        consumed.push(row.id);
    }

    let candidates = read.rows.len().min(read.limit);
    let has_more = consumed.len() < candidates || read.rows.len() > read.limit;
    let next_cursor = match (has_more, consumed.last()) {
        (true, Some(last)) => Some(
            FilterCursor {
                index_id: read.identity.index_id.clone(),
                revision: read.identity.revision,
                canonical: filter.canonical(),
                after_id: *last,
            }
            .encode(),
        ),
        _ => None,
    };

    // Parents before children — what the layout requires — and, within one
    // depth, the scanner order. A subtree moved under a newer folder keeps its
    // old (smaller) id, so plain id order could put a child before its parent.
    selected.sort_by_key(|n| (n.depth, n.id));
    let positions = selected
        .iter()
        .enumerate()
        .map(|(i, n)| (n.id, i))
        .collect::<HashMap<_, _>>();
    let parents = selected
        .iter()
        .map(|n| n.parent_id.and_then(|p| positions.get(&p).copied()))
        .collect::<Vec<_>>();
    // Ancestry is closed under "parent", so this is exactly the real edges.
    let edges = selected
        .iter()
        .filter_map(|n| {
            n.parent_id
                .filter(|p| ids.contains(p))
                .map(|p| HierarchyEdge {
                    parent_id: p,
                    child_id: n.id,
                })
        })
        .collect::<Vec<_>>();
    let laid_out = layout::compute(layout::LayoutInput { parents: &parents });

    let consumed_set = consumed.iter().copied().collect::<HashSet<_>>();
    let match_ids = selected
        .iter()
        .map(|n| n.id)
        .filter(|id| consumed_set.contains(id))
        .collect::<Vec<_>>();
    let context_ids = selected
        .iter()
        .map(|n| n.id)
        .filter(|id| !consumed_set.contains(id))
        .collect::<Vec<_>>();

    let mut nodes = selected
        .into_iter()
        .map(|n| store.metadata_node(n))
        .collect::<Result<Vec<_>, _>>()?;
    for (n, r) in nodes.iter_mut().zip(&laid_out.rects) {
        n.rect = *r;
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
        index_revision: read.identity.revision,
        focus_id: root_id,
        view_budget: VIEW_BUDGET,
        materialized_count,
        non_materialized_count,
        hidden_reason: if non_materialized_count > 0 {
            Some("outside_current_filter".into())
        } else {
            None
        },
        aggregates: Vec::new(),
        hierarchy_edges: edges,
        filtered: Some(FilteredProjection {
            filter,
            filtered_total: read.total,
            materialized_match_count: consumed.len(),
            filter_match_ids: match_ids,
            filter_context_ids: context_ids,
            filter_next_cursor: next_cursor,
        }),
    };
    tx.commit()?;
    Ok(result)
}
