//! Exact subtree census — a **verification aid**, not part of the materializer.
//!
//! `SS9` condition 4 says every element a bounded view does not render must
//! still be represented by an exact count and a way to reach it. Checking that
//! needs the true subtree size of every node, which the census computes once,
//! in Rust, in `O(n)`.
//!
//! It is kept deliberately separate from [`super::bounded`] and timed
//! separately: the materializer must never be credited with work done by the
//! auditor that checks it. The census is also a second opinion on SQLite's
//! recursive `WITH` counts — two independent methods that must agree.

use rusqlite::Connection;
use std::collections::HashMap;

/// Exact structure of a corpus: parents, depths, and subtree sizes.
pub struct Census {
    parent_of: HashMap<i64, Option<i64>>,
    /// Number of **descendants**, the node itself excluded.
    subtree: HashMap<i64, u64>,
    direct_children: HashMap<i64, u64>,
    pub total_nodes: usize,
}

impl Census {
    /// Reads `(id, parent_id, depth)` for the whole corpus and folds it once.
    ///
    /// Deepest-first accumulation, so a node's descendants are already counted
    /// when its own total is written. Three small maps over a million rows is a
    /// few tens of megabytes — cheap enough that the auditor never becomes the
    /// bottleneck it is auditing.
    pub fn read(connection: &Connection) -> rusqlite::Result<Self> {
        let mut statement =
            connection.prepare("SELECT id, parent_id, depth FROM nodes ORDER BY depth DESC, id")?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, Option<i64>>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        let mut parent_of = HashMap::with_capacity(rows.len());
        let mut subtree = HashMap::<i64, u64>::with_capacity(rows.len());
        let mut direct_children = HashMap::<i64, u64>::with_capacity(rows.len());
        for (id, parent, _depth) in &rows {
            parent_of.insert(*id, *parent);
            subtree.entry(*id).or_insert(0);
            direct_children.entry(*id).or_insert(0);
        }
        for (id, parent, _depth) in &rows {
            if let Some(parent_id) = parent {
                let own = subtree.get(id).copied().unwrap_or_default();
                *subtree.entry(*parent_id).or_default() += own + 1;
                *direct_children.entry(*parent_id).or_default() += 1;
            }
        }
        Ok(Self {
            parent_of,
            subtree,
            direct_children,
            total_nodes: rows.len(),
        })
    }

    /// Exact descendants of `node_id`, itself excluded.
    pub fn subtree_of(&self, node_id: i64) -> u64 {
        self.subtree.get(&node_id).copied().unwrap_or_default()
    }

    /// Exact direct children of `node_id`.
    pub fn direct_children_of(&self, node_id: i64) -> u64 {
        self.direct_children
            .get(&node_id)
            .copied()
            .unwrap_or_default()
    }

    /// The chain from `node_id` up to the root, `node_id` excluded, nearest
    /// ancestor first. Bounded by the depth ceiling by construction.
    pub fn ancestors_of(&self, node_id: i64) -> Vec<i64> {
        let mut chain = Vec::new();
        let mut cursor = self.parent_of.get(&node_id).copied().flatten();
        while let Some(id) = cursor {
            chain.push(id);
            cursor = self.parent_of.get(&id).copied().flatten();
            // Defensive: a cycle cannot exist in a scanned tree, but an auditor
            // that can hang is not an auditor.
            if chain.len() > crate::map::MAX_FIXTURE_DEPTH as usize * 4 {
                break;
            }
        }
        chain
    }

    /// The node holding the most direct children — the hardest case for a
    /// bounded materializer, and therefore the one worth focusing on.
    pub fn widest_node(&self) -> Option<i64> {
        self.direct_children
            .iter()
            .max_by_key(|(id, count)| (**count, -**id))
            .map(|(id, _)| *id)
    }

    pub fn root(&self) -> Option<i64> {
        self.parent_of
            .iter()
            .find(|(_, parent)| parent.is_none())
            .map(|(id, _)| *id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::Index;
    use crate::scale_spike::generator;

    fn indexed(total: usize) -> Index {
        let mut index = Index::in_memory().expect("index");
        index
            .replace_nodes(&generator::as_nodes(&generator::plan(total)))
            .expect("replace");
        index
    }

    #[test]
    fn subtree_sizes_agree_with_sqlite_recursive_counts() {
        let index = indexed(1_200);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let root = census.root().expect("root");
        assert_eq!(census.subtree_of(root) as usize, census.total_nodes - 1);

        // Second opinion, computed by SQLite itself on a handful of nodes.
        for node_id in [root, census.widest_node().expect("widest")] {
            let sql_count: i64 = connection
                .query_row(
                    "WITH RECURSIVE sub(id) AS (
                         SELECT id FROM nodes WHERE parent_id = ?1
                         UNION ALL
                         SELECT n.id FROM nodes n JOIN sub ON n.parent_id = sub.id
                     )
                     SELECT COUNT(*) FROM sub",
                    [node_id],
                    |row| row.get(0),
                )
                .expect("recursive count");
            assert_eq!(
                sql_count as u64,
                census.subtree_of(node_id),
                "the two independent methods must agree on node {node_id}"
            );
        }
    }

    #[test]
    fn the_widest_node_is_the_hub_and_ancestors_reach_the_root() {
        let index = indexed(2_000);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let widest = census.widest_node().expect("widest");
        let hub_id: i64 = connection
            .query_row(
                "SELECT id FROM nodes WHERE relative_path = 'wide/hub'",
                [],
                |row| row.get(0),
            )
            .expect("hub");
        assert_eq!(widest, hub_id);

        let chain = census.ancestors_of(hub_id);
        assert_eq!(chain.last().copied(), census.root());
        assert!(chain.len() >= 2, "hub sits under wide, under the root");
    }

    #[test]
    fn a_leaf_has_no_descendants_and_no_children() {
        let index = indexed(600);
        let connection = index.connection_for_bench();
        let census = Census::read(connection).expect("census");
        let leaf: i64 = connection
            .query_row(
                "SELECT id FROM nodes WHERE kind = 'file' ORDER BY id LIMIT 1",
                [],
                |row| row.get(0),
            )
            .expect("leaf");
        assert_eq!(census.subtree_of(leaf), 0);
        assert_eq!(census.direct_children_of(leaf), 0);
    }
}
