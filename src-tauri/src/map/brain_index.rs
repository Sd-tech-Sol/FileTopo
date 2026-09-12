//! Brain metadata and operations over the one canonical Index. No node table or layout cache.
use super::brains::{BrainRecord, SourceKind};
use super::layout::{LAYOUT_ALGORITHM, Rect};
use super::store::{MapNode, MapSnapshot, NodeDetail};
use super::{MapError, fnv1a64};
use crate::domain::{NodeDto, ScanDiagnostic};
use crate::identity::NodeIdentity;
use crate::index::Index;
use rusqlite::OptionalExtension;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

/// What an index claims about its own source — see [`BrainIndex::binding`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IndexBinding {
    /// Written under `DEC-0033`: it names both its kind and its handle.
    Bound {
        kind: SourceKind,
        source_ref: String,
    },
    /// Written before `DEC-0033`: neither key is present. `fixture_id` is what
    /// `TASK-0016`..`TASK-0031` wrote in their place, and it is the only thing
    /// a legacy index can be recognised by.
    Legacy { fixture_id: Option<String> },
    /// One key without the other. No version of this program writes that.
    Incoherent,
}

/// **What an index was built from**, travelling as one value — `DEC-0033` D.
///
/// The three facts are meaningless apart: a `source_ref` without its `kind` is
/// a string of unknown provenance, and a label without either is decoration.
/// Grouping them also keeps [`BrainIndex::replace`] inside the argument budget
/// that a reader — and Clippy — can hold at once.
///
/// **No path.** An index file is a derived artefact that could be copied
/// between machines; a path written into it would be a personal path travelling
/// inside a database. The opaque handle is enough to prove the index matches
/// the brain the catalogue holds, which is the only question `open_store` asks.
#[derive(Debug, Clone, Copy)]
pub struct SourceStamp<'a> {
    pub kind: SourceKind,
    pub source_ref: &'a str,
    pub label: &'a str,
}

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
    /// Opens only an existing canonical schema. No CREATE, migration or source access.
    ///
    /// Strictly `MAP_SCHEMA_VERSION`-only, deliberately never widened by
    /// `ACTION-0057` D1: the product's one migratable path is
    /// [`Self::open_existing_migrating`], reached through
    /// `map::commands::open_for_brain`. `DEC-0011` — "une version de schéma
    /// inconnue et plus récente doit provoquer un refus" — applies here
    /// unconditionally.
    pub fn open_existing(path: &Path, writable: bool) -> Result<Self, MapError> {
        let flags = if writable {
            rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE
        } else {
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY
        };
        let connection = rusqlite::Connection::open_with_flags(path, flags)?;
        connection.execute_batch("PRAGMA foreign_keys=ON;")?;
        let version: i64 = connection.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        if version != super::store::MAP_SCHEMA_VERSION {
            return Err(MapError::IndexIncompatible(format!("schema {version}")));
        }
        Self::finish_open_existing(connection)
    }

    /// The schema version stamped in a file's header, read without any other
    /// check or side effect — `ACTION-0057` D1's cheap first look, so a
    /// caller can decide whether [`Self::open_existing_migrating`] might
    /// apply before opening the file a second time for real. Never resolves,
    /// scans or reads a source; the connection this opens is closed again
    /// immediately.
    pub fn peek_schema_version(path: &Path) -> Result<i64, MapError> {
        let connection = rusqlite::Connection::open_with_flags(
            path,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )?;
        Ok(connection.query_row("PRAGMA user_version", [], |r| r.get(0))?)
    }

    /// Opens an existing canonical index for `brain`, migrating it from the
    /// immediately previous schema first — but only when that is provably
    /// safe — `ACTION-0057` D1, `ACTION-0058` D4, `DEC-0013` B (`M-B`).
    ///
    /// Three schema shapes, and only the narrow middle one does any writing:
    ///
    /// * **Current** (`MAP_SCHEMA_VERSION`) — opened exactly as
    ///   [`Self::open_existing`] always has; nothing below this branch runs.
    /// * **Immediately previous** (`MAP_PREVIOUS_SCHEMA_VERSION`) — this
    ///   file's own `brain_id` and [`Self::binding_matches`] are checked
    ///   against `brain` **first**, before a single schema-altering statement
    ///   runs and before the source is resolved or read. A mismatch on
    ///   either is refused — [`MapError::BrainMismatch`] or
    ///   [`MapError::SourceMismatch`] — and the file is left exactly as it
    ///   was: not migrated, not deleted, not read for its source, **no
    ///   safety copy taken**. Only once both agree does the `M-B` sequence
    ///   run: a per-brain lock (see [`migration_lock_for`]) serialises
    ///   concurrent attempts on the same file; the index is quiesced with a
    ///   `TRUNCATE` WAL checkpoint so the physical file alone is a complete
    ///   snapshot; a safety copy is taken **in the brain's own application
    ///   space** and independently verified openable as the previous schema
    ///   **before** [`crate::index::Index::migrate_previous_schema`] runs
    ///   its first `ALTER TABLE`; a migration failure restores that copy
    ///   over the live file and reports the failure; a migration success
    ///   deletes the now-unneeded copy. The now-current connection is then
    ///   opened exactly like the first case.
    /// * **Anything else** — older, unknown or newer — refused as
    ///   [`MapError::IndexIncompatible`], never migrated: `DEC-0011` forbids
    ///   a backward migration or a migration run on a guess.
    ///
    /// `writable` must be `true` for the previous-schema branch to have any
    /// chance of succeeding — a migration cannot write through a read-only
    /// connection — so a read-only caller refusing there is not a special
    /// case, it is simply the schema mismatch it would have hit anyway.
    pub fn open_existing_migrating(
        path: &Path,
        writable: bool,
        brain: &BrainRecord,
    ) -> Result<Self, MapError> {
        let flags = if writable {
            rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE
        } else {
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY
        };
        let connection = rusqlite::Connection::open_with_flags(path, flags)?;
        connection.execute_batch("PRAGMA foreign_keys=ON;")?;
        let version: i64 = connection.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        if version == super::store::MAP_SCHEMA_VERSION {
            return Self::finish_open_existing(connection);
        }
        if !writable || version != super::store::MAP_PREVIOUS_SCHEMA_VERSION {
            return Err(MapError::IndexIncompatible(format!("schema {version}")));
        }

        let probe = Self {
            index: Index { connection },
        };
        match probe.built_for_brain()? {
            Some(found) if found == brain.brain_id => {}
            Some(found) => {
                return Err(MapError::BrainMismatch {
                    expected: brain.brain_id.clone(),
                    found,
                });
            }
            None => {
                return Err(MapError::BrainMismatch {
                    expected: brain.brain_id.clone(),
                    found: format!("index sans cerveau (schema v{version})"),
                });
            }
        }
        probe.binding_matches(brain)?;

        // Both checks passed: neither `brain_id` nor the source binding
        // disagrees, and nothing above this line has altered a byte of the
        // file. `ACTION-0058` D4 / `DEC-0013` B (`M-B`) from here on: a
        // per-brain lock, then quiesce -> safety copy -> verify -> migrate,
        // restoring the copy on any migration failure.
        let migration_lock = migration_lock_for(&brain.brain_id);
        let _migration_guard = migration_lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);

        // Re-read the version under the lock: another thread may already
        // have migrated this exact file while this one was waiting.
        let version_under_lock: i64 =
            probe
                .index
                .connection
                .query_row("PRAGMA user_version", [], |r| r.get(0))?;
        if version_under_lock == super::store::MAP_SCHEMA_VERSION {
            return Self::finish_open_existing(probe.index.connection);
        }
        if version_under_lock != super::store::MAP_PREVIOUS_SCHEMA_VERSION {
            return Err(MapError::IndexIncompatible(format!(
                "schema {version_under_lock}"
            )));
        }

        quiesce_before_safety_copy(&probe.index.connection)?;
        let safety_copy = migration_safety_copy_path(path);
        std::fs::copy(path, &safety_copy).map_err(|error| {
            MapError::MigrationUnavailable(format!("safety copy failed: {error}"))
        })?;
        if let Err(error) = verify_safety_copy(&safety_copy) {
            let _ = std::fs::remove_file(&safety_copy);
            return Err(error);
        }

        if let Err(error) = probe.index.migrate_previous_schema() {
            use crate::index::MigrationError;
            // `DEC-0013` B — restore over the live file before reporting the
            // failure. The connection is closed first: Windows refuses to
            // overwrite a file another handle still has open.
            let Index { connection } = probe.index;
            let _ = connection.close();
            restore_safety_copy(path, &safety_copy)?;
            let _ = std::fs::remove_file(&safety_copy);
            return Err(match error {
                MigrationError::Sqlite(sqlite) => MapError::from(sqlite),
                MigrationError::UnsupportedVersion { actual, .. } => {
                    MapError::IndexIncompatible(format!("schema {actual}"))
                }
            });
        }
        let _ = std::fs::remove_file(&safety_copy);
        Self::finish_open_existing(probe.index.connection)
    }

    /// The tail shared by [`Self::open_existing`] and
    /// [`Self::open_existing_migrating`] once a connection is known to be at
    /// `MAP_SCHEMA_VERSION`: the same canonical-contract checks either way.
    fn finish_open_existing(connection: rusqlite::Connection) -> Result<Self, MapError> {
        let store = Self {
            index: Index { connection },
        };
        if !store
            .is_built()
            .map_err(|_| MapError::IndexIncompatible("canonical metadata".into()))?
        {
            return Err(MapError::IndexIncompatible("canonical contract".into()));
        }
        store.index.identity()?;
        store.count()?;
        store.root_id()?;
        Ok(store)
    }

    /// Whether this index's binding — `DEC-0033` D — matches `brain`'s
    /// current catalogue record; refused otherwise. Shared by
    /// `commands::check_publishable` (accepting a current-schema legacy
    /// binding on republish) and [`Self::open_existing_migrating`] (accepting
    /// the same legacy shape on a previous-schema file before migrating it):
    /// one rule, written once, so the two callers can never quietly diverge.
    pub fn binding_matches(&self, brain: &BrainRecord) -> Result<(), MapError> {
        let refused = || MapError::SourceMismatch {
            brain_id: brain.brain_id.clone(),
        };
        match self.binding()? {
            IndexBinding::Bound { kind, source_ref } => {
                if kind != brain.source_kind || source_ref != brain.source_ref {
                    return Err(refused());
                }
            }
            IndexBinding::Legacy { fixture_id } => {
                if brain.source_kind != SourceKind::SyntheticFixture {
                    return Err(refused());
                }
                if fixture_id.as_deref() != Some(brain.source_ref.as_str()) {
                    return Err(refused());
                }
            }
            IndexBinding::Incoherent => return Err(refused()),
        }
        Ok(())
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
    /// What an existing index says about the source it was built from.
    ///
    /// Three answers, and the third is the one that matters: an index written
    /// before `DEC-0033` carries **neither** `source_kind` nor `source_ref`,
    /// because `TASK-0031`'s `replace` did not write them. That is not a
    /// corruption and not an attack — it is simply an older file, and
    /// `DEC-0033` D promises it can be republished by an explicit refresh
    /// rather than being stranded.
    ///
    /// Half a binding is a different matter. A file carrying one key without
    /// the other was never written by any version of this program, so it is
    /// reported as [`IndexBinding::Incoherent`] and trusted by nobody.
    pub fn binding(&self) -> Result<IndexBinding, MapError> {
        let kind = self.meta("source_kind")?;
        let source_ref = self.meta("source_ref")?;
        Ok(match (kind, source_ref) {
            (Some(kind), Some(source_ref)) => IndexBinding::Bound {
                kind: SourceKind::parse(&kind)?,
                source_ref,
            },
            (None, None) => IndexBinding::Legacy {
                fixture_id: self.meta("fixture_id")?,
            },
            _ => IndexBinding::Incoherent,
        })
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
        source: SourceStamp<'_>,
        nodes: &[NodeDto],
        diagnostics: &[ScanDiagnostic],
        built: i64,
    ) -> Result<(), MapError> {
        Self::validate_single_root(nodes)?;
        self.index.replace_nodes_with_metadata(
            nodes,
            &Self::build_metadata(brain, source, built),
            diagnostics,
        )?;
        Ok(())
    }

    /// Identity-aware publication — `TASK-0036`, `DEC-0009` I-E. The only
    /// caller is the real scanner pipeline
    /// (`map::commands::publish_map`): `identities` must be the
    /// [`NodeIdentity`] list the same scan produced alongside `nodes`.
    ///
    /// `root_id` and `node_count` in [`build_metadata`](Self::build_metadata)
    /// are computed from the **pre-remap** `nodes` slice and are therefore
    /// placeholders here — `Index::publish_with_identity` overwrites both
    /// with the canonical, post-remap truth as the authoritative last write
    /// of its own transaction, so nothing downstream ever reads the
    /// placeholder.
    pub fn replace_with_identity(
        &mut self,
        brain: &str,
        source: SourceStamp<'_>,
        nodes: &[NodeDto],
        identities: &[NodeIdentity],
        diagnostics: &[ScanDiagnostic],
        built: i64,
    ) -> Result<(), MapError> {
        Self::validate_single_root(nodes)?;
        self.index
            .publish_with_identity(
                nodes,
                identities,
                &Self::build_metadata(brain, source, built),
                diagnostics,
            )
            .map_err(|error| match error {
                crate::index::PublishError::Sqlite(sqlite) => MapError::from(sqlite),
                crate::index::PublishError::IdentityCollision => MapError::IdentityCollision,
                crate::index::PublishError::IdentityNotBijective => MapError::IdentityNotBijective,
            })?;
        Ok(())
    }

    fn validate_single_root(nodes: &[NodeDto]) -> Result<(), MapError> {
        match nodes.iter().filter(|n| n.parent_id.is_none()).count() {
            0 => Err(MapError::View("missing root".into())),
            1 => Ok(()),
            _ => Err(MapError::View("multiple roots".into())),
        }
    }

    fn build_metadata<'a>(
        brain: &'a str,
        source: SourceStamp<'a>,
        built: i64,
    ) -> Vec<(&'a str, String)> {
        vec![
            ("brain_id", brain.into()),
            ("source_kind", source.kind.as_str().into()),
            ("source_ref", source.source_ref.into()),
            // Kept under its historical key for a synthetic build so the
            // `TASK-0016`..`TASK-0026` evidence keeps reading; **empty** for
            // a real root rather than filled with something that is not a
            // fixture — `DEC-0033` D.
            (
                "fixture_id",
                match source.kind {
                    SourceKind::SyntheticFixture => source.source_ref.to_string(),
                    SourceKind::RealRoot => String::new(),
                },
            ),
            ("label", source.label.into()),
            ("built_unix_ms", built.to_string()),
            ("layout_algorithm", LAYOUT_ALGORITHM.into()),
            ("build_complete", "1".into()),
            ("projection_contract", "DEC-0031".into()),
        ]
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

// -- `ACTION-0058` D4 / `DEC-0013` B — `M-B`: quiesce, safety copy, restore --

/// One mutex per `brain_id`, created on first use and kept for the life of
/// the process. Narrow and per-brain, exactly as the corrective prompt asks:
/// it serialises only the `M-B` critical section of
/// [`BrainIndex::open_existing_migrating`] for **one** brain at a time — a
/// concurrent migration attempt on a *different* brain is never blocked by
/// it — and it is a plain in-memory map, not a second store or a new
/// architecture. Guards against two IPC calls racing the same v3 file: the
/// SQL transaction inside `migrate_previous_schema` is already idempotent
/// under a race, but the **file-level** safety copy this function takes is
/// not — an `fs::copy` reading a file another thread is mid-`ALTER TABLE`
/// on could capture a torn snapshot.
fn migration_lock_for(brain_id: &str) -> Arc<Mutex<()>> {
    static LOCKS: OnceLock<Mutex<HashMap<String, Arc<Mutex<()>>>>> = OnceLock::new();
    let registry = LOCKS.get_or_init(|| Mutex::new(HashMap::new()));
    let mut locks = registry
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    locks
        .entry(brain_id.to_string())
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone()
}

/// The safety copy's path — a sibling of the index, in the brain's own
/// `map/` directory, never under the analysed source. One bounded name per
/// brain: a migration attempt overwrites the previous attempt's copy rather
/// than accumulating one per open, and the copy is deleted again as soon as
/// the migration or its restoration settles — see
/// [`BrainIndex::open_existing_migrating`]. Never returned by any command,
/// written to any log, or embedded in any artefact: this `PathBuf` lives
/// only inside this module's own control flow.
fn migration_safety_copy_path(database: &Path) -> PathBuf {
    let mut name = database.file_name().unwrap_or_default().to_os_string();
    name.push(".v3-safety-copy");
    database.with_file_name(name)
}

/// Quiesces the index **before** the safety copy is taken — `DEC-0013` B's
/// first step, and the reason this migration never needs to touch a `-wal`
/// sidecar at all: a `TRUNCATE` checkpoint folds every committed page back
/// into the main file, so a plain `fs::copy` of that one file afterwards is
/// already "a v3 coherent and openable" snapshot, never a `main.db` missing
/// commits still only in `-wal`.
///
/// `PRAGMA wal_checkpoint(TRUNCATE)` reports whether it fully succeeded as
/// its first returned column (`busy`): nonzero means another connection's
/// held snapshot or lock kept some pages in the WAL. Read literally — this
/// is exactly `ACTION-0058`'s "busy/quiescence impossible ⇒ refus sans
/// migration et sans backup trompeur": refuse rather than copy a file that
/// is not actually a complete snapshot.
fn quiesce_before_safety_copy(connection: &rusqlite::Connection) -> Result<(), MapError> {
    let (busy, _log, _checkpointed): (i64, i64, i64) =
        connection.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?;
    if busy != 0 {
        return Err(MapError::MigrationUnavailable(
            "quiesce_busy: could not fully checkpoint the index before the safety copy".into(),
        ));
    }
    Ok(())
}

/// Independently confirms the safety copy is exactly what `DEC-0013` B
/// requires it to be **before** the first `v4` `ALTER TABLE` runs: a file
/// that genuinely opens, at the expected previous schema, with its `nodes`
/// table readable. A copy that fails any of these is refused immediately —
/// the caller never proceeds to migrate on the strength of an unverified
/// copy.
fn verify_safety_copy(copy: &Path) -> Result<(), MapError> {
    let unreadable = |error: rusqlite::Error| {
        MapError::MigrationUnavailable(format!("safety copy not openable: {error}"))
    };
    let connection =
        rusqlite::Connection::open_with_flags(copy, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(unreadable)?;
    let version: i64 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(unreadable)?;
    if version != super::store::MAP_PREVIOUS_SCHEMA_VERSION {
        return Err(MapError::MigrationUnavailable(format!(
            "safety copy is schema {version}, not the expected previous schema"
        )));
    }
    connection
        .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get::<_, i64>(0))
        .map_err(unreadable)?;
    Ok(())
}

/// Restores `target` from its safety `copy` — `DEC-0013` B's last step, run
/// whenever [`crate::index::Index::migrate_previous_schema`] fails. Any
/// `-wal`/`-shm` sidecar left by the failed attempt is removed first, so the
/// restored main file is read back on its own rather than replayed against a
/// stale journal that no longer matches it.
fn restore_safety_copy(target: &Path, copy: &Path) -> Result<(), MapError> {
    for suffix in ["-wal", "-shm"] {
        let mut sidecar = target.as_os_str().to_os_string();
        sidecar.push(suffix);
        let sidecar = PathBuf::from(sidecar);
        if sidecar.is_file() {
            let _ = std::fs::remove_file(&sidecar);
        }
    }
    std::fs::copy(copy, target)
        .map_err(|error| MapError::MigrationUnavailable(format!("restore failed: {error}")))?;
    Ok(())
}
