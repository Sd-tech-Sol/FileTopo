//! `SS4` and `SS5` — bounded queries and the experimental progressive
//! materializer. **Benchmark-only prototype.**
//!
//! Nothing here is an API, a command, an IPC contract or a signature. It exists
//! to answer one falsifiable question: at a **fixed view budget**, does the
//! number of renderable entities stay bounded as the corpus grows from ten
//! thousand to a million? `DEC-0029` stands or falls on that.
//!
//! The aggregate semantics of `F-051` are enforced by assertion, not merely
//! described:
//!
//! * an aggregate carries an **exact** count — never an estimate, never
//!   "999+";
//! * it carries a **reason** and an **expansion cursor**, so what it summarises
//!   stays reachable;
//! * it is **never a folder** — it has no path, and [`ViewEntity::is_directory`]
//!   is false for it;
//! * it is **never a relation** — it creates no edge between the elements it
//!   summarises; its single edge attaches it to the parent it stands under, and
//!   that edge is tagged [`ViewEdgeKind::AggregateAttachment`], never
//!   [`ViewEdgeKind::Hierarchy`].

use rusqlite::{Connection, params};

/// Deterministic child order, identical to the production
/// [`crate::index::Index::query_nodes`] ordering, so paging is stable.
const CHILD_ORDER: &str = "kind = 'directory' DESC, name COLLATE NOCASE, id";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntityKind {
    RealNode,
    Aggregate,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ViewEdgeKind {
    /// A real parent/child link, observed in the source.
    Hierarchy,
    /// Attaches an aggregate to the node it summarises under. Deliberately not
    /// a hierarchy edge: `F-051` forbids an aggregate from reading as
    /// structure.
    AggregateAttachment,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AggregateInfo {
    /// The real node whose children this aggregate stands for.
    pub under_node_id: i64,
    /// Where expansion resumes — the cursor into the deterministic child order.
    pub first_hidden_offset: u64,
    /// Exact number of direct children not materialised.
    pub hidden_direct_children: u64,
    /// Exact number of elements represented — those children and all their
    /// descendants. `None` when the run measured the cheap variant that counts
    /// direct children only; never an estimate in either case.
    pub hidden_elements_total: Option<u64>,
    /// Human-readable provenance, as `F-051 §5.2` requires.
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ViewEntity {
    pub kind: EntityKind,
    /// Real nodes only. An aggregate is not a node and has no node identity.
    pub node_id: Option<i64>,
    pub name: String,
    /// Real nodes only. An aggregate has **no path**: it must never be
    /// copyable as one, nor openable in the explorer.
    pub relative_path: Option<String>,
    pub is_directory: bool,
    /// Exact direct-children count from the index, for real nodes.
    pub direct_children: u64,
    /// Whether the view materialised this node's children at all.
    pub expanded: bool,
    pub aggregate: Option<AggregateInfo>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ViewEdge {
    pub from: usize,
    pub to: usize,
    pub kind: ViewEdgeKind,
}

#[derive(Debug, Clone, PartialEq)]
pub struct BoundedView {
    pub focus_node_id: i64,
    pub budget: usize,
    /// Ancestors of the focus, included as context and paid for out of budget.
    pub ancestor_count: usize,
    pub entities: Vec<ViewEntity>,
    pub edges: Vec<ViewEdge>,
}

impl BoundedView {
    pub fn real_node_count(&self) -> usize {
        self.entities
            .iter()
            .filter(|entity| entity.kind == EntityKind::RealNode)
            .count()
    }

    pub fn aggregate_count(&self) -> usize {
        self.entities
            .iter()
            .filter(|entity| entity.kind == EntityKind::Aggregate)
            .count()
    }

    /// Exact number of direct children summarised by every aggregate.
    pub fn hidden_direct_total(&self) -> u64 {
        self.entities
            .iter()
            .filter_map(|entity| entity.aggregate.as_ref())
            .map(|aggregate| aggregate.hidden_direct_children)
            .sum()
    }

    /// Real nodes the view shows but did not expand. Each keeps its exact
    /// direct-children count, so nothing it hides is silent.
    pub fn unexpanded_directories(&self) -> Vec<&ViewEntity> {
        self.entities
            .iter()
            .filter(|entity| {
                entity.kind == EntityKind::RealNode && entity.is_directory && !entity.expanded
            })
            .collect()
    }

    /// Bytes a frontend would actually receive for this view, as JSON.
    ///
    /// Serialises **every entity and every edge**, not a summary of them: `SS9`
    /// condition 2 has to be checked against the real payload, and a number
    /// derived from a digest would prove nothing.
    pub fn payload_bytes(&self) -> usize {
        serde_json::to_string(&self.to_payload_json())
            .map(|text| text.len())
            .unwrap_or_default()
    }

    /// The full wire payload: what the frontend would be handed, entity by
    /// entity. Never the corpus — only what fits the budget.
    pub fn to_payload_json(&self) -> serde_json::Value {
        serde_json::json!({
            "focusNodeId": self.focus_node_id,
            "entities": self
                .entities
                .iter()
                .map(|entity| serde_json::json!({
                    "kind": match entity.kind {
                        EntityKind::RealNode => "node",
                        EntityKind::Aggregate => "aggregate",
                    },
                    "nodeId": entity.node_id,
                    "name": entity.name,
                    "relativePath": entity.relative_path,
                    "isDirectory": entity.is_directory,
                    "directChildren": entity.direct_children,
                    "expanded": entity.expanded,
                    "aggregate": entity.aggregate.as_ref().map(|aggregate| serde_json::json!({
                        "underNodeId": aggregate.under_node_id,
                        "firstHiddenOffset": aggregate.first_hidden_offset,
                        "hiddenDirectChildren": aggregate.hidden_direct_children,
                        "hiddenElementsTotal": aggregate.hidden_elements_total,
                        "reason": aggregate.reason,
                    })),
                }))
                .collect::<Vec<_>>(),
            "edges": self
                .edges
                .iter()
                .map(|edge| serde_json::json!({
                    "from": edge.from,
                    "to": edge.to,
                    "kind": match edge.kind {
                        ViewEdgeKind::Hierarchy => "hierarchy",
                        ViewEdgeKind::AggregateAttachment => "aggregate-attachment",
                    },
                }))
                .collect::<Vec<_>>(),
        })
    }

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "focusNodeId": self.focus_node_id,
            "budget": self.budget,
            "ancestorCount": self.ancestor_count,
            "entityCount": self.entities.len(),
            "realNodeCount": self.real_node_count(),
            "aggregateCount": self.aggregate_count(),
            "edgeCount": self.edges.len(),
            "hierarchyEdges": self
                .edges
                .iter()
                .filter(|edge| edge.kind == ViewEdgeKind::Hierarchy)
                .count(),
            "aggregateAttachmentEdges": self
                .edges
                .iter()
                .filter(|edge| edge.kind == ViewEdgeKind::AggregateAttachment)
                .count(),
            "hiddenDirectChildrenExact": self.hidden_direct_total(),
            "unexpandedDirectories": self.unexpanded_directories().len(),
        })
    }
}

/// One page of direct children, in the deterministic production order.
///
/// `SS4` — bounded, cursorised, never a whole collection.
pub fn children_page(
    connection: &Connection,
    parent_id: i64,
    limit: usize,
    offset: u64,
) -> rusqlite::Result<Vec<(i64, String, String, bool, u64)>> {
    let mut statement = connection.prepare(&format!(
        "SELECT id, name, relative_path, kind, child_count
         FROM nodes WHERE parent_id = ?1
         ORDER BY {CHILD_ORDER} LIMIT ?2 OFFSET ?3"
    ))?;
    let rows = statement.query_map(params![parent_id, limit as i64, offset as i64], |row| {
        let kind: String = row.get(3)?;
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            kind == "directory" || kind == "root",
            row.get::<_, i64>(4)?.max(0) as u64,
        ))
    })?;
    rows.collect()
}

/// The chain to the root, nearest ancestor first. `SS4` — bounded by depth.
pub fn ancestors(connection: &Connection, node_id: i64) -> rusqlite::Result<Vec<i64>> {
    let mut statement = connection.prepare(
        "WITH RECURSIVE chain(id, parent_id) AS (
             SELECT id, parent_id FROM nodes WHERE id = ?1
             UNION ALL
             SELECT n.id, n.parent_id FROM nodes n JOIN chain ON n.id = chain.parent_id
         )
         SELECT id FROM chain WHERE id != ?1",
    )?;
    let rows = statement.query_map([node_id], |row| row.get::<_, i64>(0))?;
    rows.collect()
}

/// Exact direct-children count. `SS4` — computed core-side, never derived from
/// what a frontend happened to receive.
pub fn direct_child_count(connection: &Connection, parent_id: i64) -> rusqlite::Result<u64> {
    connection.query_row(
        "SELECT COUNT(*) FROM nodes WHERE parent_id = ?1",
        [parent_id],
        |row| row.get::<_, i64>(0).map(|count| count.max(0) as u64),
    )
}

/// Exact element count of an unmaterialised subtree. `SS4`.
pub fn subtree_count(connection: &Connection, node_id: i64) -> rusqlite::Result<u64> {
    connection.query_row(
        "WITH RECURSIVE sub(id) AS (
             SELECT id FROM nodes WHERE parent_id = ?1
             UNION ALL
             SELECT n.id FROM nodes n JOIN sub ON n.parent_id = sub.id
         )
         SELECT COUNT(*) FROM sub",
        [node_id],
        |row| row.get::<_, i64>(0).map(|count| count.max(0) as u64),
    )
}

/// Exact element count behind an aggregate: the hidden children from `offset`
/// onward, plus every one of their descendants.
pub fn hidden_elements_total(
    connection: &Connection,
    parent_id: i64,
    offset: u64,
) -> rusqlite::Result<u64> {
    connection.query_row(
        &format!(
            "WITH RECURSIVE hidden(id) AS (
                 SELECT id FROM (
                     SELECT id FROM nodes WHERE parent_id = ?1
                     ORDER BY {CHILD_ORDER} LIMIT -1 OFFSET ?2
                 )
                 UNION ALL
                 SELECT n.id FROM nodes n JOIN hidden ON n.parent_id = hidden.id
             )
             SELECT COUNT(*) FROM hidden"
        ),
        params![parent_id, offset as i64],
        |row| row.get::<_, i64>(0).map(|count| count.max(0) as u64),
    )
}

/// Builds a bounded view around `focus`, never exceeding `budget` entities.
///
/// Breadth-first, so the budget buys context around the focus rather than one
/// arbitrarily deep thread. When a node's children do not fit, one slot is
/// spent on an aggregate that carries their **exact** count and the cursor to
/// resume from — the view shrinks, the truth does not.
///
/// `exact_hidden_elements` selects what the aggregates count. Both variants are
/// exact; they differ in scope and in cost, and the report publishes both:
///
/// * `false` — exact **direct** hidden children, one `COUNT` per aggregate;
/// * `true` — additionally the exact **total elements** behind each aggregate,
///   which costs a recursive walk and is the expensive half.
pub fn materialize(
    connection: &Connection,
    focus: i64,
    budget: usize,
    exact_hidden_elements: bool,
) -> rusqlite::Result<BoundedView> {
    assert!(budget > 0, "a view budget of zero renders nothing");

    let mut entities = Vec::<ViewEntity>::new();
    let mut edges = Vec::<ViewEdge>::new();

    // Ancestors first, root-most first, so the focus keeps a readable path.
    let mut chain = ancestors(connection, focus)?;
    chain.reverse();
    let ancestor_count = chain.len().min(budget);
    for (position, id) in chain.iter().take(ancestor_count).enumerate() {
        let (name, path, is_directory, children) = node_row(connection, *id)?;
        entities.push(ViewEntity {
            kind: EntityKind::RealNode,
            node_id: Some(*id),
            name,
            relative_path: Some(path),
            is_directory,
            direct_children: children,
            // Ancestors show the path, not their siblings: they are context,
            // and the view never claims to have expanded them.
            expanded: false,
            aggregate: None,
        });
        if position > 0 {
            edges.push(ViewEdge {
                from: position - 1,
                to: position,
                kind: ViewEdgeKind::Hierarchy,
            });
        }
    }

    if entities.len() >= budget {
        return Ok(BoundedView {
            focus_node_id: focus,
            budget,
            ancestor_count,
            entities,
            edges,
        });
    }

    let (name, path, is_directory, children) = node_row(connection, focus)?;
    let focus_slot = entities.len();
    entities.push(ViewEntity {
        kind: EntityKind::RealNode,
        node_id: Some(focus),
        name,
        relative_path: Some(path),
        is_directory,
        direct_children: children,
        expanded: false,
        aggregate: None,
    });
    if focus_slot > 0 {
        edges.push(ViewEdge {
            from: focus_slot - 1,
            to: focus_slot,
            kind: ViewEdgeKind::Hierarchy,
        });
    }

    let mut frontier = std::collections::VecDeque::from([(focus_slot, focus)]);
    while let Some((slot, node_id)) = frontier.pop_front() {
        if entities.len() >= budget {
            break;
        }
        let total = entities[slot].direct_children;
        if total == 0 {
            entities[slot].expanded = true;
            continue;
        }
        let room = budget - entities.len();
        // One slot is reserved for the aggregate whenever the children do not
        // all fit. A view that silently truncated would breach `F-051 §5.3`.
        let take = if (total as usize) <= room {
            total as usize
        } else {
            room.saturating_sub(1)
        };

        for (id, child_name, child_path, child_is_directory, child_children) in
            children_page(connection, node_id, take, 0)?
        {
            let child_slot = entities.len();
            entities.push(ViewEntity {
                kind: EntityKind::RealNode,
                node_id: Some(id),
                name: child_name,
                relative_path: Some(child_path),
                is_directory: child_is_directory,
                direct_children: child_children,
                expanded: false,
                aggregate: None,
            });
            edges.push(ViewEdge {
                from: slot,
                to: child_slot,
                kind: ViewEdgeKind::Hierarchy,
            });
            if child_is_directory {
                frontier.push_back((child_slot, id));
            }
        }

        if (take as u64) < total {
            let hidden = total - take as u64;
            let elements = if exact_hidden_elements {
                Some(hidden_elements_total(connection, node_id, take as u64)?)
            } else {
                None
            };
            let aggregate_slot = entities.len();
            entities.push(ViewEntity {
                kind: EntityKind::Aggregate,
                node_id: None,
                name: format!("{hidden} éléments non matérialisés"),
                // No path: an aggregate is never a folder.
                relative_path: None,
                is_directory: false,
                direct_children: 0,
                expanded: false,
                aggregate: Some(AggregateInfo {
                    under_node_id: node_id,
                    first_hidden_offset: take as u64,
                    hidden_direct_children: hidden,
                    hidden_elements_total: elements,
                    reason: format!(
                        "{hidden} enfants directs non matérialisés sous ce dossier — reprise à l'offset {take}"
                    ),
                }),
            });
            edges.push(ViewEdge {
                from: slot,
                to: aggregate_slot,
                kind: ViewEdgeKind::AggregateAttachment,
            });
        }
        entities[slot].expanded = true;
    }

    Ok(BoundedView {
        focus_node_id: focus,
        budget,
        ancestor_count,
        entities,
        edges,
    })
}

fn node_row(connection: &Connection, id: i64) -> rusqlite::Result<(String, String, bool, u64)> {
    connection.query_row(
        "SELECT name, relative_path, kind, child_count FROM nodes WHERE id = ?1",
        [id],
        |row| {
            let kind: String = row.get(2)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                kind == "directory" || kind == "root",
                row.get::<_, i64>(3)?.max(0) as u64,
            ))
        },
    )
}

/// The `F-051` invariants, checked rather than asserted in prose.
///
/// Returns the list of breaches, empty when the view is honest.
pub fn aggregate_breaches(view: &BoundedView) -> Vec<String> {
    let mut breaches = Vec::new();
    for (slot, entity) in view.entities.iter().enumerate() {
        match entity.kind {
            EntityKind::Aggregate => {
                let Some(aggregate) = &entity.aggregate else {
                    breaches.push(format!("slot {slot}: aggregate without exact counts"));
                    continue;
                };
                if entity.relative_path.is_some() {
                    breaches.push(format!("slot {slot}: aggregate carries a path"));
                }
                if entity.is_directory {
                    breaches.push(format!("slot {slot}: aggregate presented as a folder"));
                }
                if entity.node_id.is_some() {
                    breaches.push(format!("slot {slot}: aggregate claims a node identity"));
                }
                if aggregate.hidden_direct_children == 0 {
                    breaches.push(format!("slot {slot}: aggregate summarising nothing"));
                }
                if aggregate.reason.is_empty() {
                    breaches.push(format!("slot {slot}: aggregate without provenance"));
                }
                let attachments = view
                    .edges
                    .iter()
                    .filter(|edge| edge.to == slot || edge.from == slot)
                    .collect::<Vec<_>>();
                if attachments.len() != 1 {
                    breaches.push(format!(
                        "slot {slot}: aggregate has {} edges, expected exactly one attachment",
                        attachments.len()
                    ));
                }
                if attachments
                    .iter()
                    .any(|edge| edge.kind != ViewEdgeKind::AggregateAttachment)
                {
                    breaches.push(format!("slot {slot}: aggregate edge tagged as hierarchy"));
                }
            }
            EntityKind::RealNode => {
                if entity.relative_path.is_none() {
                    breaches.push(format!("slot {slot}: real node without a source path"));
                }
                if entity.aggregate.is_some() {
                    breaches.push(format!("slot {slot}: real node carrying aggregate counts"));
                }
            }
        }
    }
    if view.entities.len() > view.budget {
        breaches.push(format!(
            "view holds {} entities over a budget of {}",
            view.entities.len(),
            view.budget
        ));
    }
    breaches
}

/// Exact reachability audit — `SS9` condition 4.
///
/// Every element of the focus subtree must be either rendered, or covered by an
/// aggregate's exact count, or inside an unexpanded node whose exact subtree is
/// known. Returns `(covered, expected)`; they must be equal.
pub fn coverage(view: &BoundedView, census: &super::census::Census) -> (u64, u64) {
    let expected = 1 + census.subtree_of(view.focus_node_id);
    let ancestors = view.ancestor_count;
    let mut covered = 0u64;
    for entity in view.entities.iter().skip(ancestors) {
        match entity.kind {
            EntityKind::RealNode => {
                covered += 1;
                if !entity.expanded {
                    covered += census.subtree_of(entity.node_id.expect("real node id"));
                }
            }
            EntityKind::Aggregate => {
                let aggregate = entity.aggregate.as_ref().expect("aggregate info");
                // Count the hidden children and everything beneath them, from
                // the independent census rather than from the prototype's own
                // arithmetic.
                covered += hidden_span(view, census, aggregate);
            }
        }
    }
    (covered, expected)
}

fn hidden_span(
    view: &BoundedView,
    census: &super::census::Census,
    aggregate: &AggregateInfo,
) -> u64 {
    // The census knows the parent's total span; the materialised siblings are
    // exactly the ones the view already accounts for, so the aggregate's share
    // is what remains.
    let parent = aggregate.under_node_id;
    let materialised_children: u64 = view
        .entities
        .iter()
        .filter(|entity| entity.kind == EntityKind::RealNode)
        .filter_map(|entity| entity.node_id)
        .filter(|id| census.ancestors_of(*id).first() == Some(&parent))
        .map(|id| 1 + census.subtree_of(id))
        .sum();
    census
        .subtree_of(parent)
        .saturating_sub(materialised_children)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::Index;
    use crate::scale_spike::census::Census;
    use crate::scale_spike::generator;

    fn indexed(total: usize) -> Index {
        let mut index = Index::in_memory().expect("index");
        index
            .replace_nodes(&generator::as_nodes(&generator::plan(total)))
            .expect("replace");
        index
    }

    #[test]
    fn a_view_never_exceeds_its_budget_and_never_lies() {
        let index = indexed(5_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let root = census.root().expect("root");
        for budget in crate::scale_spike::VIEW_BUDGETS {
            let view = materialize(connection, root, budget, true).expect("materialize");
            assert!(
                view.entities.len() <= budget,
                "budget {budget} produced {} entities",
                view.entities.len()
            );
            assert_eq!(
                aggregate_breaches(&view),
                Vec::<String>::new(),
                "budget {budget} broke an F-051 invariant"
            );
        }
    }

    #[test]
    fn every_hidden_element_stays_counted_and_reachable() {
        let index = indexed(6_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let root = census.root().expect("root");
        for budget in crate::scale_spike::VIEW_BUDGETS {
            let view = materialize(connection, root, budget, false).expect("materialize");
            let (covered, expected) = coverage(&view, &census);
            assert_eq!(
                covered, expected,
                "budget {budget}: {covered} elements accounted for, {expected} exist"
            );
        }
    }

    #[test]
    fn sqlite_and_the_census_agree_on_every_aggregate_count() {
        let index = indexed(4_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let root = census.root().expect("root");
        let view = materialize(connection, root, 256, true).expect("materialize");
        assert!(view.aggregate_count() > 0, "the shape must force aggregates");
        for entity in &view.entities {
            let Some(aggregate) = &entity.aggregate else {
                continue;
            };
            let by_sql = aggregate
                .hidden_elements_total
                .expect("exact variant fills the total");
            let by_census = hidden_span(&view, &census, aggregate);
            assert_eq!(
                by_sql, by_census,
                "two independent methods disagree under node {}",
                aggregate.under_node_id
            );
            assert!(
                !aggregate.reason.is_empty() && aggregate.reason.contains("non matérialisés"),
                "an aggregate must say what it stands for"
            );
        }
    }

    #[test]
    fn the_widest_folder_is_summarised_not_truncated() {
        let index = indexed(8_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let hub = census.widest_node().expect("hub");
        let view = materialize(connection, hub, 128, true).expect("materialize");
        assert!(view.entities.len() <= 128);
        let aggregate = view
            .entities
            .iter()
            .find_map(|entity| entity.aggregate.as_ref())
            .expect("a folder this wide cannot fit and must be summarised");
        assert_eq!(
            aggregate.hidden_direct_children + view.real_node_count() as u64
                - 1
                - view.ancestor_count as u64,
            census.direct_children_of(hub),
            "materialised plus hidden must equal the exact direct-children count"
        );
    }

    #[test]
    fn paging_children_is_deterministic_and_never_overlaps() {
        let index = indexed(3_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let hub = census.widest_node().expect("hub");
        let first = children_page(connection, hub, 50, 0).expect("page 1");
        let second = children_page(connection, hub, 50, 50).expect("page 2");
        let again = children_page(connection, hub, 50, 0).expect("page 1 again");
        assert_eq!(first, again, "a cursor must be stable");
        assert_eq!(first.len(), 50);
        assert!(
            first
                .iter()
                .all(|left| second.iter().all(|right| left.0 != right.0)),
            "pages must not overlap"
        );
    }

    #[test]
    fn ancestors_reach_the_root_and_stay_bounded() {
        let index = indexed(3_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let deep: i64 = connection
            .query_row(
                "SELECT id FROM nodes ORDER BY depth DESC, id LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("deepest");
        let chain = ancestors(connection, deep).expect("ancestors");
        assert_eq!(chain.last().copied(), census.root());
        assert!(chain.len() <= crate::map::MAX_FIXTURE_DEPTH as usize);
    }

    #[test]
    fn a_budget_of_one_still_refuses_to_hide_anything_silently() {
        let index = indexed(2_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let root = census.root().expect("root");
        let view = materialize(connection, root, 1, false).expect("materialize");
        assert_eq!(view.entities.len(), 1);
        // The single slot goes to the focus, which is shown unexpanded with its
        // exact direct-children count — declared, not silent.
        assert!(!view.entities[0].expanded);
        let (covered, expected) = coverage(&view, &census);
        assert_eq!(covered, expected);
    }
}
