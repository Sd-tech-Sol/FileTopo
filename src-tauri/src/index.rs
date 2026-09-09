use crate::domain::{NodeDto, NodeKind};
use crate::hierarchy::{self, ChildCursor, ChildrenPage, HierarchyError, IndexIdentity};
use rusqlite::{Connection, Result, params};
use std::collections::HashSet;
use std::path::Path;

/// Current schema version of the node index.
///
/// `3` since `TASK-0029`: the two generated sort columns and the child-order
/// index of [`DEC-0030`](../../docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md).
const SCHEMA_VERSION: i64 = 3;

/// The node columns, in the exact order [`node_from_row`] reads them.
///
/// One definition for every query, so a column added on one side and forgotten
/// on the other cannot silently shift a field.
pub(crate) const NODE_COLUMNS: &str = "id, parent_id, name, relative_path, kind, depth, \
     size_bytes, modified_unix_ms, online_only, reparse_point, child_count, seen";

pub struct Index {
    connection: Connection,
}

impl Index {
    /// Used by the tests only: the current runtime reaches neither the
    /// development fixture nor the prototype index — reserve `X2`.
    #[allow(dead_code)]
    pub fn in_memory() -> Result<Self> {
        let connection = Connection::open_in_memory()?;
        let index = Self { connection };
        index.initialize()?;
        Ok(index)
    }

    #[allow(dead_code)]
    pub fn open(path: &Path) -> Result<Self> {
        let connection = Connection::open(path)?;
        connection.execute_batch(
            "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;",
        )?;
        let index = Self { connection };
        index.initialize()?;
        Ok(index)
    }

    fn initialize(&self) -> Result<()> {
        self.connection.execute_batch(
            "
            PRAGMA foreign_keys=ON;
            CREATE TABLE IF NOT EXISTS schema_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS nodes (
                id INTEGER PRIMARY KEY,
                parent_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                kind TEXT NOT NULL,
                depth INTEGER NOT NULL,
                size_bytes INTEGER NOT NULL,
                modified_unix_ms INTEGER,
                online_only INTEGER NOT NULL,
                reparse_point INTEGER NOT NULL,
                child_count INTEGER NOT NULL,
                seen INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id, name);
            CREATE INDEX IF NOT EXISTS idx_nodes_relative_path ON nodes(relative_path);
            ",
        )?;
        let has_seen: i64 = self.connection.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('nodes') WHERE name = 'seen'",
            [],
            |row| row.get(0),
        )?;
        if has_seen == 0 {
            self.connection.execute(
                "ALTER TABLE nodes ADD COLUMN seen INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
        }
        self.migrate_to_bounded_hierarchy()?;
        self.connection.execute_batch(&format!(
            "PRAGMA user_version={SCHEMA_VERSION};
             INSERT OR REPLACE INTO schema_meta(key, value)
             VALUES ('schema_version', '{SCHEMA_VERSION}');",
        ))
    }

    /// Schema `2 → 3` — `DEC-0030 §E`. Idempotent, and safe on a populated
    /// database.
    ///
    /// The two sort columns are **generated and `VIRTUAL`**: they occupy no
    /// table byte, they are recomputed from `kind` and `name`, and they
    /// therefore cannot drift away from the row they describe the way a column
    /// written by hand could. Adding them rewrites no row, so an existing index
    /// keeps every node, every metadata field and — the one that matters — its
    /// `seen` state.
    ///
    /// `name_fold` is `lower(name)` rather than `name COLLATE NOCASE` for one
    /// measured reason: SQLite can only turn a row-value comparison into an
    /// index seek when the collation is the index's own. `TASK-0029` measured
    /// the `COLLATE` variant degrading to a filtered scan — ≈ 31 700 µs against
    /// ≈ 60 µs on 200 000 siblings. Both orders are identical because `lower()`
    /// and `NOCASE` fold ASCII and nothing else, which
    /// `the_fold_orders_exactly_as_collate_nocase_would` checks rather than
    /// assumes.
    fn migrate_to_bounded_hierarchy(&self) -> Result<()> {
        // `pragma_table_info` hides generated columns; `pragma_table_xinfo`
        // lists them. Asking the wrong one would re-run the migration forever.
        let mut missing = self.connection.prepare(
            "SELECT COUNT(*) FROM pragma_table_xinfo('nodes') WHERE name = ?1",
        )?;
        for (column, definition) in [
            (
                "child_order_rank",
                "INTEGER GENERATED ALWAYS AS (CASE WHEN kind = 'directory' THEN 0 ELSE 1 END) VIRTUAL",
            ),
            ("name_fold", "TEXT GENERATED ALWAYS AS (lower(name)) VIRTUAL"),
        ] {
            let present: i64 = missing.query_row([column], |row| row.get(0))?;
            if present == 0 {
                self.connection
                    .execute(&format!("ALTER TABLE nodes ADD COLUMN {column} {definition}"), [])?;
            }
        }
        drop(missing);

        self.connection.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_nodes_child_order
                 ON nodes(parent_id, child_order_rank, name_fold, id);",
        )?;

        // The durable identity is written once and never rewritten: it is what
        // keeps two brains from ever accepting each other's cursors, however
        // their revision counters happen to line up.
        self.connection.execute(
            "INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('index_id', ?1)",
            [uuid::Uuid::new_v4().to_string()],
        )?;
        self.connection.execute(
            "INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('index_revision', '0')",
            [],
        )?;
        Ok(())
    }

    pub fn replace_nodes(&mut self, nodes: &[NodeDto]) -> Result<()> {
        let seen_paths = {
            let mut statement = self
                .connection
                .prepare("SELECT relative_path FROM nodes WHERE seen = 1")?;
            statement
                .query_map([], |row| row.get::<_, String>(0))?
                .collect::<Result<HashSet<_>>>()?
        };
        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM nodes", [])?;
        {
            let mut statement = transaction.prepare(
                "INSERT INTO nodes (
                    id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count, seen
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            )?;
            for node in nodes {
                statement.execute(params![
                    node.id,
                    node.parent_id,
                    node.name,
                    node.relative_path,
                    node.kind.as_str(),
                    i64::from(node.depth),
                    i64::try_from(node.size_bytes).unwrap_or(i64::MAX),
                    node.modified_unix_ms,
                    node.online_only,
                    node.reparse_point,
                    i64::from(node.child_count),
                    node.seen || seen_paths.contains(&node.relative_path),
                ])?;
            }
        }
        // `DEC-0030 §C` — the revision advances **inside** the transaction that
        // replaces the rows. A reader therefore never sees new data under an
        // old revision, nor an old cursor accepted against new data: the two
        // become visible together, or neither does.
        hierarchy::advance_revision(&transaction)?;
        transaction.commit()
    }
}

#[allow(dead_code)]
impl Index {
    /// The bounded hierarchy primitives of `DEC-0030`.
    ///
    /// They are **product-internal foundation**: `TASK-0029` builds what the
    /// future progressive materializer needs, and `DEC-0030` refuses to freeze
    /// an IPC shape before that materializer exists. Nothing in the current
    /// runtime therefore calls them yet — hence the allowance, which states
    /// that reason rather than hiding an oversight. The tests and the
    /// `TASK-0029` campaigns exercise every one of them.
    ///
    /// Which index this is, and which revision of it — `DEC-0030 §C`.
    pub fn identity(&self) -> std::result::Result<IndexIdentity, HierarchyError> {
        hierarchy::identity(&self.connection)
    }

    /// One bounded, keyset-paged page of direct children — `DEC-0030 §B`.
    ///
    /// Product-internal: no command exposes it, and `DEC-0030` deliberately
    /// declines to freeze an IPC shape before the materializer that will use it
    /// exists.
    pub fn children_page(
        &self,
        parent_id: i64,
        page_size: usize,
        after: Option<&ChildCursor>,
    ) -> std::result::Result<ChildrenPage, HierarchyError> {
        hierarchy::children_page(&self.connection, parent_id, page_size, after)
    }

    /// Exact direct children of a node, from the durable count — `DEC-0030 §D`.
    pub fn direct_child_count(&self, parent_id: i64) -> std::result::Result<u64, HierarchyError> {
        hierarchy::direct_child_count(&self.connection, parent_id)
    }

    /// The chain to the root, nearest ancestor first, bounded by depth.
    pub fn ancestor_chain(
        &self,
        node_id: i64,
    ) -> std::result::Result<Vec<NodeDto>, HierarchyError> {
        hierarchy::ancestor_chain(&self.connection, node_id)
    }
}

impl Index {
    /// Used by the tests only — reserve `X2`.
    #[allow(dead_code)]
    pub fn list_nodes(&self, limit: usize, offset: usize) -> Result<Vec<NodeDto>> {
        let bounded_limit = limit.clamp(1, 50_000) as i64;
        let bounded_offset = offset as i64;
        let mut statement = self.connection.prepare(
            &format!(
            "SELECT {NODE_COLUMNS} FROM nodes ORDER BY id LIMIT ?1 OFFSET ?2"
        ),
        )?;
        let rows = statement.query_map(params![bounded_limit, bounded_offset], node_from_row)?;
        rows.collect()
    }

    pub fn query_nodes(
        &self,
        query: &str,
        kind: Option<&str>,
        online_only: Option<bool>,
        unseen_only: bool,
        limit: usize,
        offset: usize,
    ) -> Result<(Vec<NodeDto>, usize)> {
        let escaped = query
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let pattern = format!("%{escaped}%");
        let kind = kind.filter(|value| matches!(*value, "directory" | "file" | "skipped"));
        let online = online_only.map(i64::from);
        let unseen = i64::from(unseen_only);
        let where_clause = "kind != 'root'
             AND (?1 = '' OR name LIKE ?2 ESCAPE '\\' OR relative_path LIKE ?2 ESCAPE '\\')
             AND (?3 IS NULL OR kind = ?3)
             AND (?4 IS NULL OR online_only = ?4)
             AND (?5 = 0 OR seen = 0)";
        let total: i64 = self.connection.query_row(
            &format!("SELECT COUNT(*) FROM nodes WHERE {where_clause}"),
            params![query, pattern, kind, online, unseen],
            |row| row.get(0),
        )?;
        let bounded_limit = limit.clamp(1, 500);
        let mut statement = self.connection.prepare(&format!(
            "SELECT {NODE_COLUMNS} FROM nodes WHERE {where_clause}
             ORDER BY kind = 'directory' DESC, name COLLATE NOCASE, id
             LIMIT ?6 OFFSET ?7"
        ))?;
        let rows = statement.query_map(
            params![
                query,
                pattern,
                kind,
                online,
                unseen,
                bounded_limit as i64,
                offset as i64
            ],
            node_from_row,
        )?;
        Ok((rows.collect::<Result<Vec<_>>>()?, total.max(0) as usize))
    }

    /// Read-only handle for the `TASK-0028` bench harness.
    ///
    /// `#[cfg(test)]`, so it exists in no product binary and adds no command.
    /// The spike prototypes bounded queries against the **real** schema through
    /// it rather than duplicating the data model.
    #[cfg(test)]
    pub fn connection_for_bench(&self) -> &Connection {
        &self.connection
    }

    pub fn mark_seen(&self, node_id: i64) -> Result<bool> {
        Ok(self
            .connection
            .execute("UPDATE nodes SET seen = 1 WHERE id = ?1", [node_id])?
            > 0)
    }

    /// Read by a prototype command the current runtime does not expose —
    /// reserve `X2`.
    #[allow(dead_code)]
    pub fn node(&self, node_id: i64) -> Result<Option<NodeDto>> {
        let mut statement = self
            .connection
            .prepare(&format!("SELECT {NODE_COLUMNS} FROM nodes WHERE id = ?1"))?;
        let mut rows = statement.query_map([node_id], node_from_row)?;
        rows.next().transpose()
    }
}

pub(crate) fn node_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeDto> {
    let kind: String = row.get(4)?;
    let size: i64 = row.get(6)?;
    Ok(NodeDto {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        name: row.get(2)?,
        relative_path: row.get(3)?,
        kind: NodeKind::from_db(&kind),
        depth: row.get::<_, i64>(5)?.max(0) as u32,
        size_bytes: size.max(0) as u64,
        modified_unix_ms: row.get(7)?,
        online_only: row.get(8)?,
        reparse_point: row.get(9)?,
        child_count: row.get::<_, i64>(10)?.max(0) as u32,
        seen: row.get(11)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::synthetic;
    use std::time::Instant;

    /// The schema exactly as `TASK-0016` left it, at `user_version = 2`.
    ///
    /// Written out in full rather than derived from the current code: a
    /// migration test that builds its "before" state with the "after" code
    /// proves nothing.
    const SCHEMA_V2: &str = "
        CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE nodes (
            id INTEGER PRIMARY KEY,
            parent_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            kind TEXT NOT NULL,
            depth INTEGER NOT NULL,
            size_bytes INTEGER NOT NULL,
            modified_unix_ms INTEGER,
            online_only INTEGER NOT NULL,
            reparse_point INTEGER NOT NULL,
            child_count INTEGER NOT NULL,
            seen INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX idx_nodes_parent ON nodes(parent_id, name);
        CREATE INDEX idx_nodes_relative_path ON nodes(relative_path);
        INSERT INTO nodes VALUES
            (1, NULL, 'root',      '',           'root',      0, 0, NULL, 0, 0, 3, 0),
            (2, 1,    'Alpha',     'Alpha',      'directory', 1, 0, NULL, 0, 0, 0, 1),
            (3, 1,    'beta.txt',  'beta.txt',   'file',      1, 7, NULL, 0, 0, 0, 0),
            (4, 1,    'BETA.txt',  'BETA.txt',   'file',      1, 9, NULL, 0, 0, 0, 1);
        PRAGMA user_version=2;
        INSERT INTO schema_meta(key, value) VALUES ('schema_version', '2');
    ";

    #[test]
    fn migrating_from_schema_two_keeps_every_node_and_every_seen_flag() {
        let temp = tempfile::tempdir().expect("tempdir");
        let path = temp.path().join("legacy.sqlite");
        {
            let legacy = Connection::open(&path).expect("legacy");
            legacy.execute_batch(SCHEMA_V2).expect("v2 schema");
        }

        let index = Index::open(&path).expect("migrate");
        let version: i64 = index
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("version");
        assert_eq!(version, SCHEMA_VERSION);

        let nodes = index.list_nodes(100, 0).expect("nodes");
        assert_eq!(nodes.len(), 4, "no node may be lost by a migration");
        let seen: Vec<i64> = nodes
            .iter()
            .filter(|node| node.seen)
            .map(|node| node.id)
            .collect();
        assert_eq!(seen, vec![2, 4], "seen state must survive verbatim");
        let beta = nodes.iter().find(|node| node.id == 3).expect("beta");
        assert_eq!(
            (beta.name.as_str(), beta.size_bytes, beta.depth),
            ("beta.txt", 7, 1),
            "metadata must survive verbatim"
        );

        // The migrated database serves the bounded page, on the new index.
        let page = index.children_page(1, 10, None).expect("page");
        assert_eq!(
            page.items.iter().map(|node| node.id).collect::<Vec<_>>(),
            vec![2, 3, 4],
            "directory first, then the two names that fold equal, in id order"
        );
        assert_eq!(page.total_direct_children, 3);
        let plan = crate::hierarchy::children_page_plan(&index.connection, false)
            .expect("plan")
            .join(" | ");
        assert!(plan.contains("idx_nodes_child_order"), "got {plan}");
    }

    #[test]
    fn reopening_keeps_the_identity_and_never_rewinds_the_revision() {
        let temp = tempfile::tempdir().expect("tempdir");
        let path = temp.path().join("index.sqlite");
        let snapshot = synthetic::demo_snapshot(64);

        let (first_id, revision_after_two_builds) = {
            let mut index = Index::open(&path).expect("open");
            assert_eq!(index.identity().expect("identity").revision, 0);
            index.replace_nodes(&snapshot.nodes).expect("build");
            index.replace_nodes(&snapshot.nodes).expect("rebuild");
            let identity = index.identity().expect("identity");
            (identity.index_id, identity.revision)
        };
        assert_eq!(revision_after_two_builds, 2, "each rebuild moves it by one");

        let reopened = Index::open(&path).expect("reopen");
        let identity = reopened.identity().expect("identity");
        assert_eq!(identity.index_id, first_id, "the identity is written once");
        assert_eq!(
            identity.revision, revision_after_two_builds,
            "reopening is not a rebuild and must not move the revision"
        );
    }

    #[test]
    fn round_trips_nodes_and_uses_fixed_sqlite() {
        assert!(
            rusqlite::version_number() >= 3_051_003,
            "bundled SQLite must include the WAL-reset fix"
        );
        let snapshot = synthetic::demo_snapshot(32);
        let mut index = Index::in_memory().expect("index");
        index.replace_nodes(&snapshot.nodes).expect("replace");
        let listed = index.list_nodes(1_000, 0).expect("list");
        assert_eq!(listed.len(), snapshot.nodes.len());
        assert_eq!(listed[0].kind, NodeKind::Root);
    }

    #[test]
    fn queries_pages_and_preserves_seen_state_across_rebuilds() {
        let snapshot = synthetic::demo_snapshot(120);
        let mut index = Index::in_memory().expect("index");
        index.replace_nodes(&snapshot.nodes).expect("replace");

        let (first_page, total) = index
            .query_nodes("document-00", Some("file"), Some(false), false, 10, 0)
            .expect("query");
        assert_eq!(first_page.len(), 10);
        assert!(total > first_page.len());
        let marked = first_page[0].clone();
        assert!(index.mark_seen(marked.id).expect("mark"));

        let (unseen, unseen_total) = index
            .query_nodes("document-00", Some("file"), Some(false), true, 500, 0)
            .expect("unseen");
        assert_eq!(unseen_total, total - 1);
        assert!(unseen.iter().all(|node| node.id != marked.id));

        index.replace_nodes(&snapshot.nodes).expect("rebuild");
        let rebuilt = index.list_nodes(500, 0).expect("listed");
        assert!(
            rebuilt
                .iter()
                .find(|node| node.relative_path == marked.relative_path)
                .expect("marked")
                .seen
        );
    }

    #[test]
    fn measures_synthetic_10k_and_100k_pipeline() {
        for count in [10_000, 100_000] {
            let generation_started = Instant::now();
            let snapshot = synthetic::scale_snapshot(count);
            let generation_ms = generation_started.elapsed().as_millis();

            let indexing_started = Instant::now();
            let mut index = Index::in_memory().expect("index");
            index.replace_nodes(&snapshot.nodes).expect("replace");
            let indexing_ms = indexing_started.elapsed().as_millis();

            let query_started = Instant::now();
            let first_page = index.list_nodes(50_000, 0).expect("first page");
            let second_page = index.list_nodes(50_000, 50_000).expect("second page");
            let query_ms = query_started.elapsed().as_millis();

            let filtered_started = Instant::now();
            let (filtered_first, filtered_total) = index
                .query_nodes("document", Some("file"), Some(true), false, 120, 0)
                .expect("filtered first page");
            let (filtered_second, repeated_total) = index
                .query_nodes("document", Some("file"), Some(true), false, 120, 120)
                .expect("filtered second page");
            let filtered_ms = filtered_started.elapsed().as_millis();

            assert_eq!(first_page.len() + second_page.len(), count);
            assert_eq!(filtered_first.len(), 120);
            assert_eq!(filtered_second.len(), 120);
            assert_eq!(filtered_total, repeated_total);
            assert!(filtered_total > 240);
            assert!(filtered_first.iter().all(|node| node.online_only));
            assert!(filtered_second.iter().all(|node| node.online_only));
            assert!(
                filtered_first
                    .iter()
                    .all(|left| filtered_second.iter().all(|right| left.id != right.id))
            );
            println!(
                "PERF nodes={count} generation_ms={generation_ms} indexing_ms={indexing_ms} query_ms={query_ms} filtered_ms={filtered_ms}"
            );
        }
    }
}
