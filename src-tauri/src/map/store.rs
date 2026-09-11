//! View DTOs. Corpus storage belongs exclusively to crate::index::Index.
use super::layout::Rect;
use crate::domain::{NodeKind, ScanDiagnostic};
use serde::{Deserialize, Serialize};
/// Kept in lockstep with `crate::index::SCHEMA_VERSION` by hand: the two
/// constants describe the same `PRAGMA user_version`, one from the canonical
/// `Index`'s side and one from `BrainIndex::open_existing`'s compatibility
/// check. `4` since `TASK-0036` — the durable stable-identity columns.
pub const MAP_SCHEMA_VERSION: i64 = 4;
/// The one schema version the product will ever migrate automatically —
/// `ACTION-0057` D1. `BrainIndex::open_existing_migrating` upgrades exactly
/// this version in place, after checking the file's `brain_id` and source
/// binding; anything older, unknown or newer is refused, never guessed at.
pub const MAP_PREVIOUS_SCHEMA_VERSION: i64 = MAP_SCHEMA_VERSION - 1;
pub const NON_RECONSTRUCTIBLE_KEYS: [&str; 1] = ["built_unix_ms"];

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
    pub index_revision: u64,
    pub focus_id: i64,
    pub view_budget: usize,
    pub materialized_count: usize,
    pub non_materialized_count: usize,
    pub hidden_reason: Option<String>,
    pub aggregates: Vec<super::projection::ViewAggregate>,
    pub hierarchy_edges: Vec<super::projection::HierarchyEdge>,
    /// Brain identity read from the canonical index metadata.
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
    /// Computed by the bounded projection, never inferred by the frontend.
    pub layout_algorithm: String,
    pub nodes: Vec<MapNode>,
    pub diagnostics: Vec<ScanDiagnostic>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeDetail {
    pub omitted_children: u64,
    pub next_cursor: Option<String>,
    pub node: MapNode,
    pub parent: Option<MapNode>,
    pub children: Vec<MapNode>,
}
