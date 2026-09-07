use crate::domain::{NodeDto, NodeKind};
use rusqlite::{Connection, Result, params};
use std::collections::HashSet;
use std::path::Path;

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
        self.connection.execute_batch(
            "PRAGMA user_version=2;
             INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('schema_version', '2');",
        )
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
        transaction.commit()
    }

    /// Used by the tests only — reserve `X2`.
    #[allow(dead_code)]
    pub fn list_nodes(&self, limit: usize, offset: usize) -> Result<Vec<NodeDto>> {
        let bounded_limit = limit.clamp(1, 50_000) as i64;
        let bounded_offset = offset as i64;
        let mut statement = self.connection.prepare(
            "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count, seen
             FROM nodes ORDER BY id LIMIT ?1 OFFSET ?2",
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
            "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count, seen
             FROM nodes WHERE {where_clause}
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
        let mut statement = self.connection.prepare(
            "SELECT id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count, seen
             FROM nodes WHERE id = ?1",
        )?;
        let mut rows = statement.query_map([node_id], node_from_row)?;
        rows.next().transpose()
    }
}

fn node_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<NodeDto> {
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
