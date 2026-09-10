//! Brain metadata and operations over the one canonical Index. No node table or layout cache.
use super::layout::{LAYOUT_ALGORITHM, Rect};
use super::store::{MapNode, MapSnapshot, NodeDetail};
use super::{MapError, fnv1a64};
use crate::domain::{NodeDto, ScanDiagnostic};
use crate::index::Index;
use rusqlite::OptionalExtension;
use std::path::Path;

pub struct BrainIndex {
    pub index: Index,
}
impl BrainIndex {
    pub fn open(path: &Path) -> Result<Self, MapError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        Ok(Self {
            index: Index::open(path)?,
        })
    }
    pub fn meta(&self, key: &str) -> Result<Option<String>, MapError> {
        Ok(self
            .index
            .connection
            .query_row("SELECT value FROM schema_meta WHERE key=?1", [key], |r| {
                r.get(0)
            })
            .optional()?)
    }
    pub fn built_for_brain(&self) -> Result<Option<String>, MapError> {
        self.meta("brain_id")
    }
    pub fn is_built(&self) -> Result<bool, MapError> {
        let legacy: bool = self.index.connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='map_nodes')",
            [],
            |r| r.get(0),
        )?;
        Ok(!legacy
            && self.meta("build_complete")?.as_deref() == Some("1")
            && self.meta("projection_contract")?.as_deref() == Some("DEC-0031"))
    }
    pub fn replace(
        &mut self,
        brain: &str,
        fixture: &str,
        label: &str,
        nodes: &[NodeDto],
        diagnostics: &[ScanDiagnostic],
        built: i64,
    ) -> Result<(), MapError> {
        let root = nodes
            .iter()
            .find(|n| n.parent_id.is_none())
            .ok_or_else(|| MapError::View("missing root".into()))?;
        if nodes.iter().filter(|n| n.parent_id.is_none()).count() != 1 {
            return Err(MapError::View("multiple roots".into()));
        }
        self.index.replace_nodes_with_metadata(
            nodes,
            &[
                ("brain_id", brain.into()),
                ("fixture_id", fixture.into()),
                ("label", label.into()),
                ("node_count", nodes.len().to_string()),
                ("root_id", root.id.to_string()),
                ("built_unix_ms", built.to_string()),
                ("layout_algorithm", LAYOUT_ALGORITHM.into()),
                ("build_complete", "1".into()),
                ("projection_contract", "DEC-0031".into()),
            ],
            diagnostics,
        )?;
        Ok(())
    }
    pub fn count(&self) -> Result<usize, MapError> {
        self.meta("node_count")?
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| MapError::NotBuilt("node count".into()))
    }
    pub fn root_id(&self) -> Result<i64, MapError> {
        self.meta("root_id")?
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| MapError::NotBuilt("root id".into()))
    }
    pub fn snapshot(&self) -> Result<MapSnapshot, MapError> {
        super::projection::materialize_view(self, None, None)
    }
    pub fn resolve_path(&self, path: &str) -> Result<Option<i64>, MapError> {
        Ok(self
            .index
            .connection
            .query_row("SELECT id FROM nodes WHERE relative_path=?1", [path], |r| {
                r.get(0)
            })
            .optional()?)
    }
    /// Temporary metadata adapter for existing analysis engines. Rect is never rendered;
    /// only materialize_view may supply view geometry. No persisted second corpus.
    pub fn metadata_node(&self, n: NodeDto) -> Result<MapNode, MapError> {
        let diagnostic = self
            .index
            .connection
            .query_row(
                "SELECT code FROM node_diagnostics WHERE relative_path=?1",
                [&n.relative_path],
                |r| r.get(0),
            )
            .optional()?;
        Ok(MapNode {
            id: n.id,
            parent_id: n.parent_id,
            name: n.name,
            relative_path: n.relative_path,
            kind: n.kind,
            depth: n.depth,
            size_bytes: n.size_bytes,
            modified_unix_ms: n.modified_unix_ms,
            child_count: n.child_count,
            access_diagnostic: diagnostic,
            rect: Rect {
                x: 0.0,
                y: 0.0,
                w: 0.0,
                h: 0.0,
            },
        })
    }
    /// Explicit analysis input, never returned by an IPC command or laid out.
    pub fn analysis_nodes(&self) -> Result<Vec<MapNode>, MapError> {
        let mut result = Vec::new();
        let mut statement = self.index.connection.prepare(&format!(
            "SELECT {} FROM nodes ORDER BY id",
            crate::index::NODE_COLUMNS
        ))?;
        for node in statement.query_map([], crate::index::node_from_row)? {
            result.push(self.metadata_node(node?)?);
        }
        Ok(result)
    }
    pub fn detail(&self, id: i64) -> Result<NodeDetail, MapError> {
        let view = super::projection::materialize_view(self, Some(id), None)?;
        let node = view
            .nodes
            .iter()
            .find(|n| n.id == id)
            .cloned()
            .ok_or(MapError::NodeMissing(id))?;
        let parent = view
            .nodes
            .iter()
            .find(|n| Some(n.id) == node.parent_id)
            .cloned();
        let children = view
            .nodes
            .iter()
            .filter(|n| n.parent_id == Some(id))
            .cloned()
            .collect::<Vec<_>>();
        let omitted_children = u64::from(node.child_count).saturating_sub(children.len() as u64);
        let next_cursor = view
            .aggregates
            .iter()
            .find(|a| a.parent_id == id)
            .and_then(|a| a.next_cursor.clone());
        Ok(NodeDetail {
            node,
            parent,
            children,
            omitted_children,
            next_cursor,
        })
    }
    pub fn reconstructible_digest(&self) -> Result<String, MapError> {
        // Metadata only: view geometry and index revision cannot invalidate relations.
        let mut bytes = Vec::new();
        for n in self.analysis_nodes()? {
            bytes.extend_from_slice(n.relative_path.as_bytes());
            bytes.push(0);
            bytes.extend_from_slice(n.name.as_bytes());
            bytes.push(0);
            bytes.extend_from_slice(n.kind.as_str().as_bytes());
            bytes.extend_from_slice(&n.depth.to_le_bytes());
            bytes.extend_from_slice(&n.size_bytes.to_le_bytes());
            bytes.extend_from_slice(&n.child_count.to_le_bytes());
            bytes.extend_from_slice(&n.parent_id.unwrap_or(-1).to_le_bytes());
            bytes.extend_from_slice(n.access_diagnostic.as_deref().unwrap_or("").as_bytes());
            bytes.push(255);
        }
        Ok(format!("fnv1a64:{:016x}", fnv1a64(&bytes)))
    }
}
