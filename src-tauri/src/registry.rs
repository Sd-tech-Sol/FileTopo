use crate::domain::CollectionSummary;
use rusqlite::{Connection, OptionalExtension, params};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;
use uuid::Uuid;

const COLORS: [&str; 6] = [
    "#b8db82", "#78c9ac", "#d8bd7d", "#8bb7d4", "#c7a0d8", "#e59d83",
];

#[derive(Debug, Error)]
pub enum RegistryError {
    #[error("registry_io_failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("registry_sqlite_failed: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("collection_root_not_directory")]
    RootNotDirectory,
    #[error("collection_root_reparse_point_not_allowed")]
    RootReparsePoint,
    #[error("collection_not_found")]
    NotFound,
}

#[derive(Debug, Clone)]
pub struct CollectionRecord {
    pub summary: CollectionSummary,
    pub root: PathBuf,
}

pub struct Registry {
    database_path: PathBuf,
}

impl Registry {
    pub fn open(database_path: PathBuf) -> Result<Self, RegistryError> {
        if let Some(parent) = database_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let registry = Self { database_path };
        registry.initialize()?;
        Ok(registry)
    }

    fn connection(&self) -> Result<Connection, RegistryError> {
        let connection = Connection::open(&self.database_path)?;
        connection.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA synchronous=NORMAL;
             PRAGMA foreign_keys=ON;
             PRAGMA user_version=1;",
        )?;
        Ok(connection)
    }

    fn initialize(&self) -> Result<(), RegistryError> {
        self.connection()?.execute_batch(
            "CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                root_path BLOB NOT NULL UNIQUE,
                root_label TEXT NOT NULL,
                color TEXT NOT NULL,
                node_count INTEGER NOT NULL DEFAULT 0,
                total_size_bytes INTEGER NOT NULL DEFAULT 0,
                created_unix_ms INTEGER NOT NULL,
                last_indexed_unix_ms INTEGER
             );
             CREATE INDEX IF NOT EXISTS idx_collections_created
                ON collections(created_unix_ms, id);",
        )?;
        Ok(())
    }

    pub fn register(&self, root: &Path) -> Result<CollectionSummary, RegistryError> {
        let metadata = fs::symlink_metadata(root)?;
        if !metadata.is_dir() {
            return Err(RegistryError::RootNotDirectory);
        }
        if metadata.file_type().is_symlink() || is_reparse_point(&metadata) {
            return Err(RegistryError::RootReparsePoint);
        }
        let root = fs::canonicalize(root)?;
        let root_blob = encode_path(&root);
        let connection = self.connection()?;
        if let Some(existing) = find_by_path(&connection, &root_blob)? {
            return Ok(existing);
        }

        let count: i64 =
            connection.query_row("SELECT COUNT(*) FROM collections", [], |row| row.get(0))?;
        let root_label = root
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .filter(|name| !name.is_empty())
            .unwrap_or_else(|| root.display().to_string());
        let name = root_label.clone();
        let id = Uuid::new_v4().to_string();
        let color = COLORS[(count.max(0) as usize) % COLORS.len()].to_string();
        let created_unix_ms = now_ms();
        connection.execute(
            "INSERT INTO collections (
                id, name, root_path, root_label, color, node_count,
                total_size_bytes, created_unix_ms, last_indexed_unix_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6, NULL)",
            params![id, name, root_blob, root_label, color, created_unix_ms],
        )?;

        Ok(CollectionSummary {
            id,
            name,
            root_label,
            color,
            node_count: 0,
            total_size_bytes: 0,
            created_unix_ms,
            last_indexed_unix_ms: None,
        })
    }

    pub fn list(&self) -> Result<Vec<CollectionSummary>, RegistryError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(
            "SELECT id, name, root_label, color, node_count, total_size_bytes,
                    created_unix_ms, last_indexed_unix_ms
             FROM collections ORDER BY created_unix_ms, id",
        )?;
        let rows = statement.query_map([], summary_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn resolve(&self, collection_id: &str) -> Result<CollectionRecord, RegistryError> {
        let connection = self.connection()?;
        connection
            .query_row(
                "SELECT id, name, root_label, color, node_count, total_size_bytes,
                        created_unix_ms, last_indexed_unix_ms, root_path
                 FROM collections WHERE id = ?1",
                [collection_id],
                |row| {
                    let summary = summary_from_row(row)?;
                    let blob: Vec<u8> = row.get(8)?;
                    let root = decode_path(&blob).ok_or_else(|| {
                        rusqlite::Error::FromSqlConversionFailure(
                            8,
                            rusqlite::types::Type::Blob,
                            Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, "path")),
                        )
                    })?;
                    Ok(CollectionRecord { summary, root })
                },
            )
            .optional()?
            .ok_or(RegistryError::NotFound)
    }

    pub fn update_statistics(
        &self,
        collection_id: &str,
        node_count: usize,
        total_size_bytes: u64,
    ) -> Result<CollectionSummary, RegistryError> {
        let connection = self.connection()?;
        let changed = connection.execute(
            "UPDATE collections
             SET node_count = ?2, total_size_bytes = ?3, last_indexed_unix_ms = ?4
             WHERE id = ?1",
            params![
                collection_id,
                i64::try_from(node_count).unwrap_or(i64::MAX),
                i64::try_from(total_size_bytes).unwrap_or(i64::MAX),
                now_ms(),
            ],
        )?;
        if changed == 0 {
            return Err(RegistryError::NotFound);
        }
        Ok(self.resolve(collection_id)?.summary)
    }
}

fn summary_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<CollectionSummary> {
    let node_count: i64 = row.get(4)?;
    let total_size_bytes: i64 = row.get(5)?;
    Ok(CollectionSummary {
        id: row.get(0)?,
        name: row.get(1)?,
        root_label: row.get(2)?,
        color: row.get(3)?,
        node_count: node_count.max(0) as usize,
        total_size_bytes: total_size_bytes.max(0) as u64,
        created_unix_ms: row.get(6)?,
        last_indexed_unix_ms: row.get(7)?,
    })
}

fn find_by_path(
    connection: &Connection,
    root_blob: &[u8],
) -> rusqlite::Result<Option<CollectionSummary>> {
    connection
        .query_row(
            "SELECT id, name, root_label, color, node_count, total_size_bytes,
                    created_unix_ms, last_indexed_unix_ms
             FROM collections WHERE root_path = ?1",
            [root_blob],
            summary_from_row,
        )
        .optional()
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

// The path codec and the reparse-point test now live in `crate::path_codec`,
// shared with the brain catalogue rather than copied into it — `DEC-0033` C.
// Nothing else of the 0.1 registry moved: retiring it is a separate slice.
use crate::path_codec::{decode_path, encode_path, is_reparse_point};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn persists_collections_without_exposing_roots_in_summaries() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("synthetic-collection");
        fs::create_dir(&root).expect("root");
        let registry =
            Registry::open(temp.path().join("app-data/registry.sqlite")).expect("registry");

        let created = registry.register(&root).expect("register");
        let duplicate = registry.register(&root).expect("duplicate");
        assert_eq!(created.id, duplicate.id);
        assert_eq!(created.root_label, "synthetic-collection");
        assert_eq!(
            registry.resolve(&created.id).expect("resolve").root,
            fs::canonicalize(&root).expect("canonical root")
        );

        let updated = registry
            .update_statistics(&created.id, 42, 8_192)
            .expect("stats");
        assert_eq!(updated.node_count, 42);
        assert_eq!(updated.total_size_bytes, 8_192);
        assert!(updated.last_indexed_unix_ms.is_some());
        assert_eq!(registry.list().expect("list"), vec![updated]);
    }
}
