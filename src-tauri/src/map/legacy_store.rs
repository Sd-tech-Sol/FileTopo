//! Historical schema fixture and its tests, compiled ONLY under cfg(test).
//! Used to construct real v1/v2/v3 migration inputs; never a runtime store.
//! The persistent, versioned, rebuildable map index.
//!
//! It lives **beside** the analysed tree, never inside it (`I-2`), holds the
//! scanned nodes and the layout rectangles computed once per tree, and can be
//! deleted and rebuilt into an equivalent database (`H7`).
//!
//! Schema versioning follows `DEC-0004` and `DEC-0013`: `user_version` and a
//! `map_meta` row, both written in the same transaction as the data, so a
//! half-written index is never mistaken for a complete one.

use super::layout::{LAYOUT_ALGORITHM, Rect};
use super::{MAX_NODES_PER_MAP, MapError, fnv1a64};
use crate::domain::{NodeDto, NodeKind, ScanDiagnostic};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// Bump only with an explicit compatibility rule. `TASK-0016` shipped version
/// 1, `TASK-0018` version 2 for brain identity, and `TASK-0022` version 3
/// because rectangles now mean independent node cards rather than a treemap.
///
/// A v1/v2 rectangle cannot be reinterpreted as a v3 node card. It is rebuilt
/// from the read-only source, never guessed at.
pub const MAP_SCHEMA_VERSION: i64 = 3;

/// State that a rebuild cannot reproduce, enumerated rather than presumed
/// empty — `H7` requires the list, not the reassurance.

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapNode {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
    pub relative_path: String,
    pub kind: NodeKind,
    pub depth: u32,
    pub size_bytes: u64,
    pub modified_unix_ms: Option<i64>,
    pub child_count: u32,
    /// Access diagnostic attached to this node, if the scanner raised one.
    /// Surfaced in the details panel and never hidden — `P-12`, `H5`.
    pub access_diagnostic: Option<String>,
    pub rect: Rect,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapSnapshot {
    /// **Whose map this is.** Read back from the index rather than passed in
    /// by the caller, so a snapshot cannot be labelled with a brain it does
    /// not belong to.
    pub brain_id: String,
    /// The synthetic source behind the brain. A developer diagnostic —
    /// `TASK-0018` §4.6 — never the brain's identity.
    pub fixture_id: String,
    pub label: String,
    pub root_id: i64,
    pub node_count: usize,
    pub layout_width: f64,
    pub layout_height: f64,
    pub schema_version: i64,
    /// Read from `map_meta`, never inferred by the frontend.
    pub layout_algorithm: String,
    pub nodes: Vec<MapNode>,
    pub diagnostics: Vec<ScanDiagnostic>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeDetail {
    pub node: MapNode,
    pub parent: Option<MapNode>,
    pub children: Vec<MapNode>,
}

pub struct MapStore {
    connection: Connection,
}

impl MapStore {
    pub fn open(path: &Path) -> Result<Self, MapError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let connection = Connection::open(path)?;
        connection.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA foreign_keys=ON;",
        )?;
        let store = Self { connection };
        store.initialize()?;
        Ok(store)
    }

    #[cfg(test)]
    pub fn in_memory() -> Result<Self, MapError> {
        let connection = Connection::open_in_memory()?;
        connection.execute_batch("PRAGMA foreign_keys=ON;")?;
        let store = Self { connection };
        store.initialize()?;
        Ok(store)
    }

    fn initialize(&self) -> Result<(), MapError> {
        self.connection.execute_batch(&format!(
            "CREATE TABLE IF NOT EXISTS map_meta (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS map_nodes (
                 id INTEGER PRIMARY KEY,
                 parent_id INTEGER REFERENCES map_nodes(id) ON DELETE CASCADE,
                 name TEXT NOT NULL,
                 relative_path TEXT NOT NULL,
                 kind TEXT NOT NULL,
                 depth INTEGER NOT NULL,
                 size_bytes INTEGER NOT NULL,
                 modified_unix_ms INTEGER,
                 child_count INTEGER NOT NULL,
                 access_diagnostic TEXT,
                 rect_x REAL NOT NULL,
                 rect_y REAL NOT NULL,
                 rect_w REAL NOT NULL,
                 rect_h REAL NOT NULL
             );
             CREATE UNIQUE INDEX IF NOT EXISTS idx_map_nodes_path
                 ON map_nodes(relative_path);
             CREATE INDEX IF NOT EXISTS idx_map_nodes_parent
                 ON map_nodes(parent_id, name);
             CREATE TABLE IF NOT EXISTS map_diagnostics (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 code TEXT NOT NULL,
                 relative_path TEXT NOT NULL
             );
             PRAGMA user_version={MAP_SCHEMA_VERSION};"
        ))?;
        Ok(())
    }

    /// The brain this index was built for, when it says so.
    ///
    /// `None` for a version-1 index, which predates brains entirely. The
    /// caller treats that as "not built for me" rather than as "built for
    /// whoever is asking" — `K3`.
    pub fn built_for_brain(&self) -> Result<Option<String>, MapError> {
        self.meta("brain_id")
    }

    /// True when the database holds a complete build of the current schema.
    pub fn is_built(&self) -> Result<bool, MapError> {
        let version = self.meta("schema_version")?;
        let complete = self.meta("build_complete")?;
        let algorithm = self.meta("layout_algorithm")?;
        Ok(version.as_deref() == Some(&MAP_SCHEMA_VERSION.to_string())
            && complete.as_deref() == Some("1")
            && algorithm.as_deref() == Some(LAYOUT_ALGORITHM))
    }

    pub fn meta(&self, key: &str) -> Result<Option<String>, MapError> {
        Ok(self
            .connection
            .query_row("SELECT value FROM map_meta WHERE key = ?1", [key], |row| {
                row.get::<_, String>(0)
            })
            .optional()?)
    }

    /// Replaces the whole map in one transaction.
    ///
    /// `build_complete` is written last, inside the same transaction: an
    /// interrupted rebuild leaves a database that reports itself unbuilt rather
    /// than a half-map that looks finished.
    pub fn replace(
        &mut self,
        brain_id: &str,
        fixture_id: &str,
        label: &str,
        nodes: &[NodeDto],
        rects: &[Rect],
        layout_width: f64,
        layout_height: f64,
        diagnostics: &[ScanDiagnostic],
        built_unix_ms: i64,
    ) -> Result<(), MapError> {
        if nodes.len() > MAX_NODES_PER_MAP {
            return Err(MapError::NodeBudgetExceeded {
                found: nodes.len(),
                ceiling: MAX_NODES_PER_MAP,
            });
        }
        debug_assert_eq!(nodes.len(), rects.len());

        let by_path = diagnostics
            .iter()
            .map(|diagnostic| (diagnostic.relative_path.as_str(), diagnostic.code.as_str()))
            .collect::<HashMap<_, _>>();

        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM map_meta", [])?;
        transaction.execute("DELETE FROM map_nodes", [])?;
        transaction.execute("DELETE FROM map_diagnostics", [])?;
        {
            let mut insert = transaction.prepare(
                "INSERT INTO map_nodes (
                     id, parent_id, name, relative_path, kind, depth, size_bytes,
                     modified_unix_ms, child_count, access_diagnostic,
                     rect_x, rect_y, rect_w, rect_h
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            )?;
            for (node, rect) in nodes.iter().zip(rects) {
                insert.execute(params![
                    node.id,
                    node.parent_id,
                    node.name,
                    node.relative_path,
                    node.kind.as_str(),
                    i64::from(node.depth),
                    i64::try_from(node.size_bytes).unwrap_or(i64::MAX),
                    node.modified_unix_ms,
                    i64::from(node.child_count),
                    by_path.get(node.relative_path.as_str()),
                    rect.x,
                    rect.y,
                    rect.w,
                    rect.h,
                ])?;
            }
            let mut insert_diagnostic = transaction
                .prepare("INSERT INTO map_diagnostics (code, relative_path) VALUES (?1, ?2)")?;
            for diagnostic in diagnostics {
                insert_diagnostic.execute(params![diagnostic.code, diagnostic.relative_path])?;
            }
            let mut insert_meta =
                transaction.prepare("INSERT INTO map_meta (key, value) VALUES (?1, ?2)")?;
            for (key, value) in [
                ("schema_version", MAP_SCHEMA_VERSION.to_string()),
                ("brain_id", brain_id.to_string()),
                ("fixture_id", fixture_id.to_string()),
                ("label", label.to_string()),
                ("node_count", nodes.len().to_string()),
                ("layout_width", format!("{layout_width}")),
                ("layout_height", format!("{layout_height}")),
                ("layout_algorithm", LAYOUT_ALGORITHM.to_string()),
                ("built_unix_ms", built_unix_ms.to_string()),
                ("build_complete", "1".to_string()),
            ] {
                insert_meta.execute(params![key, value])?;
            }
        }
        transaction.commit()?;
        Ok(())
    }

    pub fn snapshot(&self) -> Result<MapSnapshot, MapError> {
        if !self.is_built()? {
            return Err(MapError::NotBuilt(format!(
                "map schema or layout is not current; rebuild required ({LAYOUT_ALGORITHM})"
            )));
        }
        let brain_id = self
            .meta("brain_id")?
            .ok_or_else(|| MapError::NotBuilt("map_meta.brain_id".into()))?;
        let fixture_id = self
            .meta("fixture_id")?
            .ok_or_else(|| MapError::NotBuilt("map_meta.fixture_id".into()))?;
        let label = self.meta("label")?.unwrap_or_else(|| fixture_id.clone());
        let layout_width = self
            .meta("layout_width")?
            .and_then(|value| value.parse::<f64>().ok())
            .unwrap_or_default();
        let layout_height = self
            .meta("layout_height")?
            .and_then(|value| value.parse::<f64>().ok())
            .unwrap_or_default();
        let layout_algorithm = self
            .meta("layout_algorithm")?
            .ok_or_else(|| MapError::NotBuilt("map_meta.layout_algorithm".into()))?;

        let nodes = self.all_nodes()?;
        let root_id = nodes
            .iter()
            .find(|node| node.parent_id.is_none())
            .map(|node| node.id)
            .ok_or_else(|| MapError::NotBuilt("map has no root".into()))?;

        let mut statement = self
            .connection
            .prepare("SELECT code, relative_path FROM map_diagnostics ORDER BY id")?;
        let diagnostics = statement
            .query_map([], |row| {
                Ok(ScanDiagnostic {
                    code: row.get(0)?,
                    relative_path: row.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(MapSnapshot {
            brain_id,
            fixture_id,
            label,
            root_id,
            node_count: nodes.len(),
            layout_width,
            layout_height,
            schema_version: MAP_SCHEMA_VERSION,
            layout_algorithm,
            nodes,
            diagnostics,
        })
    }

    pub fn all_nodes(&self) -> Result<Vec<MapNode>, MapError> {
        let mut statement = self
            .connection
            .prepare(&format!("{NODE_COLUMNS} FROM map_nodes ORDER BY id"))?;
        Ok(statement
            .query_map([], node_from_row)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn node(&self, node_id: i64) -> Result<Option<MapNode>, MapError> {
        let mut statement = self
            .connection
            .prepare(&format!("{NODE_COLUMNS} FROM map_nodes WHERE id = ?1"))?;
        Ok(statement
            .query_map([node_id], node_from_row)?
            .next()
            .transpose()?)
    }

    /// Direct children only — never grandchildren, never a filtered global
    /// list. `P-03` and `H3` both hinge on that distinction.
    pub fn children(&self, node_id: i64) -> Result<Vec<MapNode>, MapError> {
        let mut statement = self.connection.prepare(&format!(
            "{NODE_COLUMNS} FROM map_nodes WHERE parent_id = ?1
             ORDER BY kind = 'directory' DESC, name COLLATE NOCASE, id"
        ))?;
        Ok(statement
            .query_map([node_id], node_from_row)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn detail(&self, node_id: i64) -> Result<NodeDetail, MapError> {
        let node = self.node(node_id)?.ok_or(MapError::NodeMissing(node_id))?;
        let parent = match node.parent_id {
            Some(parent_id) => self.node(parent_id)?,
            None => None,
        };
        Ok(NodeDetail {
            node,
            parent,
            children: self.children(node_id)?,
        })
    }

    /// Digest of everything a rebuild must reproduce: nodes, hierarchy and
    /// layout rectangles. Deliberately excludes `built_unix_ms`, which is the
    /// one value `NON_RECONSTRUCTIBLE_KEYS` declares as unreproducible.
    pub fn reconstructible_digest(&self) -> Result<String, MapError> {
        let mut accumulator = Vec::new();
        for node in self.all_nodes()? {
            accumulator.extend_from_slice(node.relative_path.as_bytes());
            accumulator.push(0);
            accumulator.extend_from_slice(node.name.as_bytes());
            accumulator.push(0);
            accumulator.extend_from_slice(node.kind.as_str().as_bytes());
            accumulator.extend_from_slice(&node.depth.to_le_bytes());
            accumulator.extend_from_slice(&node.size_bytes.to_le_bytes());
            accumulator.extend_from_slice(&node.child_count.to_le_bytes());
            accumulator.extend_from_slice(&node.parent_id.unwrap_or(-1).to_le_bytes());
            accumulator
                .extend_from_slice(node.access_diagnostic.as_deref().unwrap_or("").as_bytes());
            for value in [node.rect.x, node.rect.y, node.rect.w, node.rect.h] {
                accumulator.extend_from_slice(&value.to_bits().to_le_bytes());
            }
            accumulator.push(0xff);
        }
        Ok(format!("fnv1a64:{:016x}", fnv1a64(&accumulator)))
    }
}

const NODE_COLUMNS: &str = "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
            modified_unix_ms, child_count, access_diagnostic, rect_x, rect_y, rect_w, rect_h";

fn node_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<MapNode> {
    let kind: String = row.get(4)?;
    let size: i64 = row.get(6)?;
    Ok(MapNode {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        name: row.get(2)?,
        relative_path: row.get(3)?,
        kind: NodeKind::from_db(&kind),
        depth: row.get::<_, i64>(5)?.max(0) as u32,
        size_bytes: size.max(0) as u64,
        modified_unix_ms: row.get(7)?,
        child_count: row.get::<_, i64>(8)?.max(0) as u32,
        access_diagnostic: row.get(9)?,
        rect: Rect {
            x: row.get(10)?,
            y: row.get(11)?,
            w: row.get(12)?,
            h: row.get(13)?,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_nodes() -> (Vec<NodeDto>, Vec<Rect>) {
        let nodes = vec![
            NodeDto {
                id: 1,
                parent_id: None,
                name: "racine".into(),
                relative_path: String::new(),
                kind: NodeKind::Root,
                depth: 0,
                size_bytes: 0,
                modified_unix_ms: Some(1_000),
                online_only: false,
                reparse_point: false,
                child_count: 2,
                seen: false,
            },
            NodeDto {
                id: 2,
                parent_id: Some(1),
                name: "dossier".into(),
                relative_path: "dossier".into(),
                kind: NodeKind::Directory,
                depth: 1,
                size_bytes: 0,
                modified_unix_ms: Some(1_100),
                online_only: false,
                reparse_point: false,
                child_count: 1,
                seen: false,
            },
            NodeDto {
                id: 3,
                parent_id: Some(2),
                name: "note.txt".into(),
                relative_path: "dossier/note.txt".into(),
                kind: NodeKind::File,
                depth: 2,
                size_bytes: 42,
                modified_unix_ms: Some(1_200),
                online_only: false,
                reparse_point: false,
                child_count: 0,
                seen: false,
            },
            NodeDto {
                id: 4,
                parent_id: Some(1),
                name: "illisible".into(),
                relative_path: "illisible".into(),
                kind: NodeKind::Directory,
                depth: 1,
                size_bytes: 0,
                modified_unix_ms: None,
                online_only: false,
                reparse_point: false,
                child_count: 0,
                seen: false,
            },
        ];
        let rects = (0..nodes.len())
            .map(|index| Rect {
                x: index as f64,
                y: index as f64 * 2.0,
                w: 10.0,
                h: 20.0,
            })
            .collect();
        (nodes, rects)
    }

    #[test]
    fn round_trips_nodes_layout_and_diagnostics() {
        let (nodes, rects) = sample_nodes();
        let diagnostics = vec![ScanDiagnostic {
            code: "directory_unreadable".into(),
            relative_path: "illisible".into(),
        }];
        let mut store = MapStore::in_memory().expect("store");
        store
            .replace(
                "brain-demo",
                "demo",
                "Demo",
                &nodes,
                &rects,
                100.0,
                100.0,
                &diagnostics,
                7,
            )
            .expect("replace");

        assert!(store.is_built().expect("built"));
        let snapshot = store.snapshot().expect("snapshot");
        assert_eq!(snapshot.node_count, 4);
        assert_eq!(snapshot.root_id, 1);
        assert_eq!(snapshot.schema_version, MAP_SCHEMA_VERSION);
        assert_eq!(snapshot.layout_algorithm, LAYOUT_ALGORITHM);
        // The access diagnostic reaches the node it belongs to, so the details
        // panel can show it instead of burying it in a global list.
        let unreadable = snapshot
            .nodes
            .iter()
            .find(|node| node.relative_path == "illisible")
            .expect("node");
        assert_eq!(
            unreadable.access_diagnostic.as_deref(),
            Some("directory_unreadable")
        );
        assert_eq!(snapshot.diagnostics.len(), 1);
    }

    #[test]
    fn detail_returns_the_parent_and_only_direct_children() {
        let (nodes, rects) = sample_nodes();
        let mut store = MapStore::in_memory().expect("store");
        store
            .replace(
                "brain-demo",
                "demo",
                "Demo",
                &nodes,
                &rects,
                100.0,
                100.0,
                &[],
                7,
            )
            .expect("replace");

        let root = store.detail(1).expect("root detail");
        assert!(root.parent.is_none());
        assert_eq!(
            root.children.iter().map(|node| node.id).collect::<Vec<_>>(),
            vec![2, 4],
            "grandchild 3 must not appear among the root's direct children"
        );

        let folder = store.detail(2).expect("folder detail");
        assert_eq!(folder.parent.expect("parent").id, 1);
        assert_eq!(folder.children.len(), 1);
    }

    #[test]
    fn a_second_build_replaces_rather_than_accumulates() {
        let (nodes, rects) = sample_nodes();
        let mut store = MapStore::in_memory().expect("store");
        store
            .replace(
                "brain-demo",
                "demo",
                "Demo",
                &nodes,
                &rects,
                100.0,
                100.0,
                &[],
                7,
            )
            .expect("first");
        let first = store.reconstructible_digest().expect("digest");
        store
            .replace(
                "brain-demo",
                "demo",
                "Demo",
                &nodes,
                &rects,
                100.0,
                100.0,
                &[],
                999,
            )
            .expect("second");

        assert_eq!(store.snapshot().expect("snapshot").node_count, 4);
        // The build timestamp changed; nothing reconstructible did.
        assert_eq!(first, store.reconstructible_digest().expect("digest"));
        assert_eq!(
            store.meta("built_unix_ms").expect("meta").as_deref(),
            Some("999")
        );
    }

    #[test]
    fn schema_two_treemap_is_never_served_as_schema_three() {
        let (nodes, mut rects) = sample_nodes();
        for rect in &mut rects {
            rect.w = 13.0;
            rect.h = 17.0;
        }
        let mut store = MapStore::in_memory().expect("store");
        store
            .replace(
                "brain-demo",
                "demo",
                "Demo",
                &nodes,
                &rects,
                100.0,
                100.0,
                &[],
                7,
            )
            .expect("replace");
        store
            .connection
            .execute(
                "UPDATE map_meta SET value = '2' WHERE key = 'schema_version'",
                [],
            )
            .expect("schema v2");
        store
            .connection
            .execute(
                "UPDATE map_meta SET value = 'squarified-min-area-v1' WHERE key = 'layout_algorithm'",
                [],
            )
            .expect("old layout");

        assert!(!store.is_built().expect("compatibility"));
        assert!(matches!(store.snapshot(), Err(MapError::NotBuilt(_))));
    }

    #[test]
    fn the_node_ceiling_refuses_instead_of_truncating() {
        let mut store = MapStore::in_memory().expect("store");
        let nodes = (0..MAX_NODES_PER_MAP + 1)
            .map(|index| NodeDto {
                id: index as i64 + 1,
                parent_id: if index == 0 { None } else { Some(1) },
                name: format!("n{index}"),
                relative_path: format!("n{index}"),
                kind: NodeKind::File,
                depth: 1,
                size_bytes: 0,
                modified_unix_ms: None,
                online_only: false,
                reparse_point: false,
                child_count: 0,
                seen: false,
            })
            .collect::<Vec<_>>();
        let rects = vec![
            Rect {
                x: 0.0,
                y: 0.0,
                w: 1.0,
                h: 1.0
            };
            nodes.len()
        ];

        let error = store
            .replace(
                "brain-demo",
                "demo",
                "Demo",
                &nodes,
                &rects,
                1.0,
                1.0,
                &[],
                0,
            )
            .expect_err("over budget");

        assert!(matches!(error, MapError::NodeBudgetExceeded { .. }));
        assert!(!store.is_built().expect("nothing was written"));
    }
}
