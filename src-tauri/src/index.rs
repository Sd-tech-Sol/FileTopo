use crate::domain::{NodeDto, NodeKind, ScanDiagnostic};
use crate::hierarchy::{self, ChildCursor, ChildrenPage, HierarchyError, IndexIdentity};
use crate::identity::{self, IdentityProvenance, NodeIdentity};
use rusqlite::{Connection, Result, params};
use std::collections::{HashMap, HashSet};
use std::path::Path;

/// Current schema version of the node index.
///
/// `4` since `TASK-0036`: the durable stable-identity columns and the
/// monotone id counter of
/// [`DEC-0009`](../../docs/decisions/DEC-0009-data-model-and-relations.md) I-E.
/// `3` was `TASK-0029`'s two generated sort columns and child-order index
/// ([`DEC-0030`](../../docs/decisions/DEC-0030-bounded-hierarchy-query-contract.md)).
const SCHEMA_VERSION: i64 = 4;

/// The node columns, in the exact order [`node_from_row`] reads them.
///
/// One definition for every query, so a column added on one side and forgotten
/// on the other cannot silently shift a field.
pub(crate) const NODE_COLUMNS: &str = "id, parent_id, name, relative_path, kind, depth, \
     size_bytes, modified_unix_ms, online_only, reparse_point, child_count, seen";

pub struct Index {
    pub(crate) connection: Connection,
}

impl Index {
    /// In-memory constructor used by synthetic tests.
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
            CREATE TABLE IF NOT EXISTS node_diagnostics (
                relative_path TEXT PRIMARY KEY, code TEXT NOT NULL
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
        self.migrate_to_stable_identity()
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
        let mut missing = self
            .connection
            .prepare("SELECT COUNT(*) FROM pragma_table_xinfo('nodes') WHERE name = ?1")?;
        for (column, definition) in [
            (
                "child_order_rank",
                "INTEGER GENERATED ALWAYS AS (CASE WHEN kind = 'directory' THEN 0 ELSE 1 END) VIRTUAL",
            ),
            (
                "name_fold",
                "TEXT GENERATED ALWAYS AS (lower(name)) VIRTUAL",
            ),
        ] {
            let present: i64 = missing.query_row([column], |row| row.get(0))?;
            if present == 0 {
                self.connection.execute(
                    &format!("ALTER TABLE nodes ADD COLUMN {column} {definition}"),
                    [],
                )?;
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

    /// Schema `3 → 4` — `TASK-0036`, `DEC-0009` I-E. Called unconditionally by
    /// [`initialize`](Self::initialize) (idempotent: a no-op the instant the
    /// file is already at [`SCHEMA_VERSION`]).
    ///
    /// Corrected by `ACTION-0057` D2: the first delivery ran the two
    /// `ALTER TABLE`s, the unique index and `next_node_id`'s bootstrap as
    /// separate autocommit statements, then let `initialize` write
    /// `PRAGMA user_version`/`schema_version` in a **later, separate**
    /// statement — so a crash between any two of those steps could leave a
    /// half-widened `nodes` table still claiming `user_version = 3`. The
    /// whole transition now runs inside one transaction and commits once, via
    /// [`Self::run_stable_identity_migration`]: any failure rolls the
    /// connection back to the exact v3 file it started from, verified by
    /// `migration_v3_to_v4_rolls_back_completely_on_injected_failure`.
    fn migrate_to_stable_identity(&self) -> Result<()> {
        let version: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version >= SCHEMA_VERSION {
            return Ok(());
        }
        self.run_stable_identity_migration()
    }

    /// The product-reachable `v3 → v4` upgrade — `ACTION-0057` D1.
    ///
    /// Unlike [`migrate_to_stable_identity`](Self::migrate_to_stable_identity),
    /// which [`initialize`](Self::initialize) runs unconditionally and which
    /// therefore has to tolerate a fresh, empty or already-current file, this
    /// entry point is reached only through `BrainIndex::open_existing_migrating`
    /// — after the caller has already verified the file's `brain_id` and
    /// source binding against the catalogue — and refuses anything that is
    /// not **exactly** [`SCHEMA_VERSION`] `- 1`: no chain of intermediate
    /// versions, no guess for an older or newer schema, never a migration run
    /// backward. The migration itself is the same atomic transaction either
    /// way; see [`Self::run_stable_identity_migration`].
    pub(crate) fn migrate_previous_schema(&self) -> MigrationResult<()> {
        let version: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version != SCHEMA_VERSION - 1 {
            return Err(MigrationError::UnsupportedVersion {
                actual: version,
                expected: SCHEMA_VERSION - 1,
            });
        }
        Ok(self.run_stable_identity_migration()?)
    }

    /// The atomic body of the `3 → 4` transition — `ACTION-0057` D2.
    ///
    /// Two ordinary (non-generated) nullable columns, so an existing row is
    /// never rewritten and never loses a field: the migration only widens the
    /// table. A row published before this migration has `stable_key = NULL`
    /// until its brain's next republish — remap has nothing to match against
    /// on that one republish, so ids are reassigned fresh exactly once, and
    /// stabilise from the republish after that onward. Declared, not hidden;
    /// see `RESULT.md`.
    ///
    /// `next_node_id` is bootstrapped from the current maximum `id` — `0` on
    /// an empty table — so the durable counter [`read_next_node_id`] reads
    /// can never collide with an id a pre-migration row still holds.
    ///
    /// `PRAGMA user_version`/`schema_meta.schema_version` are written **last,
    /// inside this same transaction**: on any earlier failure the connection
    /// rolls back to `unchecked_transaction`'s default (rollback on drop
    /// without an explicit commit), so the file is never left claiming a
    /// version it has not actually reached.
    fn run_stable_identity_migration(&self) -> Result<()> {
        let transaction = self.connection.unchecked_transaction()?;
        {
            let mut missing = transaction
                .prepare("SELECT COUNT(*) FROM pragma_table_info('nodes') WHERE name = ?1")?;
            for column in ["stable_key", "identity_provenance"] {
                let present: i64 = missing.query_row([column], |row| row.get(0))?;
                if present == 0 {
                    transaction
                        .execute(&format!("ALTER TABLE nodes ADD COLUMN {column} TEXT"), [])?;
                }
            }
        }

        // Defence in depth: even if the application-level collision check in
        // `publish` were ever bypassed, two active rows cannot silently share
        // a stable key. `WHERE stable_key IS NOT NULL` keeps a still-NULL
        // pre-migration row (or a brand-new empty table) from ever tripping it.
        transaction.execute_batch(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_stable_key
                 ON nodes(stable_key) WHERE stable_key IS NOT NULL;",
        )?;
        transaction.execute(
            "INSERT OR IGNORE INTO schema_meta(key, value)
                 SELECT 'next_node_id', CAST(COALESCE(MAX(id), 0) + 1 AS TEXT) FROM nodes",
            [],
        )?;
        transaction.execute_batch(&format!(
            "PRAGMA user_version={SCHEMA_VERSION};
             INSERT OR REPLACE INTO schema_meta(key, value)
             VALUES ('schema_version', '{SCHEMA_VERSION}');",
        ))?;
        transaction.commit()
    }

    pub fn replace_nodes(&mut self, nodes: &[NodeDto]) -> Result<()> {
        self.replace_nodes_with_metadata(nodes, &[], &[])
    }

    /// Atomically publishes corpus, diagnostics, brain metadata and revision.
    ///
    /// No identity remap: every node keeps the `id`/`parent_id` its caller
    /// supplied, exactly as before `TASK-0036`. Used by every synthetic/test
    /// corpus builder in this codebase, and unaffected by the identity work —
    /// see [`publish`](Self::publish) for why that split is safe.
    pub(crate) fn replace_nodes_with_metadata(
        &mut self,
        nodes: &[NodeDto],
        metadata: &[(&str, String)],
        diagnostics: &[ScanDiagnostic],
    ) -> Result<()> {
        match self.publish(nodes, None, metadata, diagnostics) {
            Ok(_) => Ok(()),
            Err(PublishError::Sqlite(error)) => Err(error),
            Err(PublishError::IdentityCollision | PublishError::IdentityNotBijective) => {
                unreachable!(
                    "identities are only checked for a collision or a bijection \
                     when identities are supplied"
                )
            }
        }
    }

    /// Atomically publishes corpus, diagnostics, brain metadata and revision,
    /// **remapping** the scanner's temporary ids to the durable canonical ids
    /// of `DEC-0009` I-E — `TASK-0036` D.
    ///
    /// The only caller is the real scanner pipeline
    /// (`map::commands::publish_map`): every `identities` entry must name the
    /// `node_id` of some node in `nodes`, one to one, or the two slices
    /// disagree about what was scanned.
    pub(crate) fn publish_with_identity(
        &mut self,
        nodes: &[NodeDto],
        identities: &[NodeIdentity],
        metadata: &[(&str, String)],
        diagnostics: &[ScanDiagnostic],
    ) -> PublishResult<PublishOutcome> {
        self.publish(nodes, Some(identities), metadata, diagnostics)
    }

    /// The one publication path, shared by both modes above.
    ///
    /// `identities: None` is the pre-`TASK-0036` behaviour verbatim: rows are
    /// inserted with the `id`/`parent_id` their caller already chose, and a
    /// `PATH_FALLBACK` key is still computed and stored for every row (so the
    /// stable-identity columns are always populated, never half-written) —
    /// but nothing is remapped and no collision can be detected, because a
    /// synthetic corpus is free to reuse a path/kind pair across unrelated
    /// test brains with no meaning attached.
    ///
    /// `identities: Some(list)` is `DEC-0009` I-E in full: a node whose
    /// stable key matches a key already stored keeps that node's canonical
    /// `id` — surviving an intra-volume rename or move; an unmatched node
    /// gets a fresh id from the durable, monotone `next_node_id` counter,
    /// which never rewinds and therefore never recycles a deleted id. A
    /// duplicate stable key **within the new scan** is refused before this
    /// function opens a write transaction, so a collision never leaves a
    /// half-published or corrupted index — `TASK-0036` C and D.
    ///
    /// `seen` is carried two ways, unconditionally OR'd together: by
    /// `relative_path`, exactly as before `TASK-0036` (the only mechanism
    /// `identities: None` ever had, and still the only one it gets); and,
    /// only when an identity remap ran, by the previous canonical id a
    /// matched node's stable key resolved to. A `PATH_FALLBACK` node whose
    /// path changes therefore does **not** recover the old node's `seen` —
    /// `TASK-0036` E, the honest limitation `DEC-0009` accepts for the
    /// fallback provenance.
    fn publish(
        &mut self,
        nodes: &[NodeDto],
        identities: Option<&[NodeIdentity]>,
        metadata: &[(&str, String)],
        diagnostics: &[ScanDiagnostic],
    ) -> PublishResult<PublishOutcome> {
        let mut seen_paths = HashSet::<String>::new();
        let mut seen_ids = HashSet::<i64>::new();
        let mut previous_by_key = HashMap::<String, i64>::new();
        {
            let mut statement = self
                .connection
                .prepare("SELECT id, relative_path, stable_key, seen FROM nodes")?;
            let mut rows = statement.query([])?;
            while let Some(row) = rows.next()? {
                let id: i64 = row.get(0)?;
                let relative_path: String = row.get(1)?;
                let stable_key: Option<String> = row.get(2)?;
                let seen: bool = row.get(3)?;
                if seen {
                    seen_paths.insert(relative_path);
                    seen_ids.insert(id);
                }
                if let Some(key) = stable_key {
                    previous_by_key.insert(key, id);
                }
            }
        }

        let mut remap = HashMap::<i64, i64>::new();
        let mut row_identity = HashMap::<i64, (String, &'static str)>::new();
        let mut next_node_id_to_persist: Option<i64> = None;
        let mut outcome = PublishOutcome::default();

        match identities {
            None => {
                for node in nodes {
                    let key =
                        identity::path_fallback_key(Path::new(&node.relative_path), node.kind);
                    row_identity.insert(node.id, (key, IdentityProvenance::PathFallback.as_str()));
                }
            }
            Some(list) => {
                let mut seen_in_scan = HashMap::<&str, i64>::with_capacity(list.len());
                let mut identity_node_ids = HashSet::<i64>::with_capacity(list.len());
                for candidate in list {
                    if seen_in_scan
                        .insert(candidate.stable_key.as_str(), candidate.node_id)
                        .is_some()
                    {
                        return Err(PublishError::IdentityCollision);
                    }
                    // `ACTION-0057` §4 — a duplicate `node_id` within
                    // `identities` is refused explicitly here, before it
                    // could otherwise silently overwrite an earlier remap
                    // entry a few lines below.
                    if !identity_node_ids.insert(candidate.node_id) {
                        return Err(PublishError::IdentityNotBijective);
                    }
                }
                // The public precondition documented on
                // `publish_with_identity` — "every `identities` entry must
                // name the `node_id` of some node in `nodes`, one to one" —
                // was unverified: a missing or unknown `node_id` could reach
                // the `row_identity.get(&canonical_id).expect(...)` below,
                // a real, input-reachable panic rather than a refusal. The
                // real scanner pipeline always produces a bijection, but
                // this function is `pub(crate)` and must not trust a future
                // caller to preserve that by construction.
                let node_ids = nodes.iter().map(|node| node.id).collect::<HashSet<_>>();
                if node_ids.len() != nodes.len() || identity_node_ids != node_ids {
                    return Err(PublishError::IdentityNotBijective);
                }
                let mut next_id = read_next_node_id(&self.connection)?;
                for candidate in list {
                    let canonical =
                        if let Some(&previous_id) = previous_by_key.get(&candidate.stable_key) {
                            outcome.matched += 1;
                            previous_id
                        } else {
                            outcome.created += 1;
                            let assigned = next_id;
                            next_id += 1;
                            assigned
                        };
                    remap.insert(candidate.node_id, canonical);
                    row_identity.insert(
                        canonical,
                        (candidate.stable_key.clone(), candidate.provenance.as_str()),
                    );
                }
                next_node_id_to_persist = Some(next_id);
            }
        }

        let canonical_root_id = nodes
            .iter()
            .find(|node| node.parent_id.is_none())
            .map(|root| remap.get(&root.id).copied().unwrap_or(root.id));

        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM nodes", [])?;
        {
            let mut statement = transaction.prepare(
                "INSERT INTO nodes (
                    id, parent_id, name, relative_path, kind, depth, size_bytes,
                    modified_unix_ms, online_only, reparse_point, child_count, seen,
                    stable_key, identity_provenance
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            )?;
            for node in nodes {
                let canonical_id = remap.get(&node.id).copied().unwrap_or(node.id);
                let canonical_parent = node
                    .parent_id
                    .map(|parent| remap.get(&parent).copied().unwrap_or(parent));
                let (stable_key, provenance) = row_identity
                    .get(&canonical_id)
                    .expect("an identity was computed for every published node");
                let seen = match identities {
                    None => node.seen || seen_paths.contains(&node.relative_path),
                    Some(_) => {
                        node.seen
                            || seen_paths.contains(&node.relative_path)
                            || seen_ids.contains(&canonical_id)
                    }
                };
                statement.execute(params![
                    canonical_id,
                    canonical_parent,
                    node.name,
                    node.relative_path,
                    node.kind.as_str(),
                    i64::from(node.depth),
                    i64::try_from(node.size_bytes).unwrap_or(i64::MAX),
                    node.modified_unix_ms,
                    node.online_only,
                    node.reparse_point,
                    i64::from(node.child_count),
                    seen,
                    stable_key,
                    provenance,
                ])?;
            }
        }
        // `DEC-0030 §C` — the revision advances **inside** the transaction that
        // replaces the rows. A reader therefore never sees new data under an
        // old revision, nor an old cursor accepted against new data: the two
        // become visible together, or neither does.
        transaction.execute("DELETE FROM node_diagnostics", [])?;
        for diagnostic in diagnostics {
            transaction.execute(
                "INSERT OR REPLACE INTO node_diagnostics VALUES (?1, ?2)",
                params![diagnostic.relative_path, diagnostic.code],
            )?;
        }
        for (key, value) in metadata {
            transaction.execute(
                "INSERT OR REPLACE INTO schema_meta VALUES (?1, ?2)",
                params![key, value],
            )?;
        }
        // Authoritative, and therefore written last: whatever placeholder the
        // caller's metadata carried for these two keys (if any) is not the
        // post-remap truth, so it is never allowed to be the final write.
        transaction.execute(
            "INSERT OR REPLACE INTO schema_meta VALUES ('node_count', ?1)",
            params![nodes.len().to_string()],
        )?;
        if let Some(root_id) = canonical_root_id {
            transaction.execute(
                "INSERT OR REPLACE INTO schema_meta VALUES ('root_id', ?1)",
                params![root_id.to_string()],
            )?;
        }
        if let Some(next_id) = next_node_id_to_persist {
            transaction.execute(
                "INSERT OR REPLACE INTO schema_meta VALUES ('next_node_id', ?1)",
                params![next_id.to_string()],
            )?;
        }
        hierarchy::advance_revision(&transaction)?;
        transaction.commit()?;
        Ok(outcome)
    }
}

/// A refusal from [`Index::publish`]. `Sqlite` covers every I/O and
/// constraint failure (the `idx_nodes_stable_key` partial unique index is a
/// defence-in-depth backstop and would surface here too, as an ordinary
/// constraint violation, if the application-level check below it were ever
/// bypassed); `IdentityCollision` is the explicit, pre-transaction refusal
/// `TASK-0036` C requires. `IdentityNotBijective` — `ACTION-0057` §4 — is the
/// explicit, pre-transaction refusal of a caller that violated
/// `publish_with_identity`'s documented precondition: an `identities` entry
/// missing for some node, naming an unknown `node_id`, or repeating a
/// `node_id`. The real scanner pipeline never produces this; the check exists
/// so a future caller's bug becomes a named refusal instead of a panic.
#[derive(Debug, thiserror::Error)]
pub(crate) enum PublishError {
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error("identity_collision: duplicate stable key refused")]
    IdentityCollision,
    #[error("identity_not_bijective: identities must name each published node exactly once")]
    IdentityNotBijective,
}

pub(crate) type PublishResult<T> = std::result::Result<T, PublishError>;

/// A refusal from [`Index::migrate_previous_schema`] — `ACTION-0057` D1. The
/// guard exists because [`Index::run_stable_identity_migration`] stamps
/// `user_version = SCHEMA_VERSION` unconditionally at the end of its
/// transaction: calling it on anything but exactly the migratable previous
/// version would silently relabel an unrelated schema as current.
#[derive(Debug, thiserror::Error)]
pub(crate) enum MigrationError {
    #[error("schema {actual} is not the migratable previous version {expected}")]
    UnsupportedVersion { actual: i64, expected: i64 },
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
}

pub(crate) type MigrationResult<T> = std::result::Result<T, MigrationError>;

/// How many published nodes reused a previous canonical id versus received a
/// fresh one — diagnostic only, never serialized to the frontend.
#[derive(Debug, Clone, Copy, Default)]
pub(crate) struct PublishOutcome {
    pub matched: usize,
    pub created: usize,
}

/// Reads the durable id counter, bootstrapping it from `MAX(id) + 1` if it is
/// absent rather than failing.
///
/// The migration normally guarantees this key exists — but a republish can
/// reach here through `BrainIndex::open_existing`, which never re-runs a
/// migration (`Index::open`'s `initialize()` is not on that path by design:
/// re-opening an already-compatible file must not re-migrate it). This is
/// the same bootstrap `migrate_to_stable_identity` performs, kept available
/// here too so the counter is never the reason a republish fails.
fn read_next_node_id(connection: &Connection) -> rusqlite::Result<i64> {
    match connection.query_row(
        "SELECT value FROM schema_meta WHERE key = 'next_node_id'",
        [],
        |row| row.get::<_, String>(0),
    ) {
        Ok(raw) => Ok(raw.parse::<i64>().unwrap_or(1)),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            connection.query_row("SELECT COALESCE(MAX(id), 0) + 1 FROM nodes", [], |row| {
                row.get(0)
            })
        }
        Err(other) => Err(other),
    }
}

#[allow(dead_code)]
impl Index {
    /// The bounded hierarchy primitives of `DEC-0030`.
    ///
    /// Used by the DEC-0031 product projection; benchmark-only helpers remain
    /// available to the TASK-0029 test campaigns.
    ///
    /// Which index this is, and which revision of it — `DEC-0030 §C`.
    pub fn identity(&self) -> std::result::Result<IndexIdentity, HierarchyError> {
        hierarchy::identity(&self.connection)
    }

    /// One bounded, keyset-paged page of direct children — `DEC-0030 §B`.
    ///
    /// Internal primitive; DEC-0031 transports its cursor in bounded view DTOs.
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
        let mut statement = self.connection.prepare(&format!(
            "SELECT {NODE_COLUMNS} FROM nodes ORDER BY id LIMIT ?1 OFFSET ?2"
        ))?;
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

    /// Test-only window on the two stable-identity columns — `TASK-0036`.
    /// Never used by product code: no command or DTO reads these columns.
    #[cfg(test)]
    pub(crate) fn identity_of(&self, node_id: i64) -> Result<Option<(String, IdentityProvenance)>> {
        use rusqlite::OptionalExtension;
        self.connection
            .query_row(
                "SELECT stable_key, identity_provenance FROM nodes WHERE id = ?1",
                [node_id],
                |row| {
                    let key: Option<String> = row.get(0)?;
                    let provenance: Option<String> = row.get(1)?;
                    Ok(key.zip(provenance))
                },
            )
            .optional()
            .map(|outer| {
                outer.flatten().map(|(key, provenance)| {
                    (
                        key,
                        IdentityProvenance::from_db(&provenance)
                            .expect("only the two I-E provenances are ever written"),
                    )
                })
            })
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

    // -- TASK-0036: schema 3 → 4 migration and identity-aware publication ---

    /// The schema exactly as `TASK-0029` left it, at `user_version = 3` —
    /// written out in full, like `SCHEMA_V2` above, rather than derived from
    /// the current code.
    const SCHEMA_V3: &str = "
        CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE node_diagnostics (relative_path TEXT PRIMARY KEY, code TEXT NOT NULL);
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
            seen INTEGER NOT NULL DEFAULT 0,
            child_order_rank INTEGER GENERATED ALWAYS AS
                (CASE WHEN kind = 'directory' THEN 0 ELSE 1 END) VIRTUAL,
            name_fold TEXT GENERATED ALWAYS AS (lower(name)) VIRTUAL
        );
        CREATE INDEX idx_nodes_parent ON nodes(parent_id, name);
        CREATE INDEX idx_nodes_relative_path ON nodes(relative_path);
        CREATE INDEX idx_nodes_child_order ON nodes(parent_id, child_order_rank, name_fold, id);
        INSERT INTO nodes
            (id, parent_id, name, relative_path, kind, depth, size_bytes,
             modified_unix_ms, online_only, reparse_point, child_count, seen)
        VALUES
            (1, NULL, 'root',     '',          'root',      0, 0, NULL, 0, 0, 2, 0),
            (2, 1,    'Alpha',    'Alpha',     'directory', 1, 0, NULL, 0, 0, 0, 1),
            (3, 1,    'beta.txt', 'beta.txt',  'file',      1, 7, NULL, 0, 0, 0, 0);
        INSERT INTO schema_meta(key, value) VALUES
            ('schema_version', '3'),
            ('index_id', '11111111-1111-1111-1111-111111111111'),
            ('index_revision', '5');
        PRAGMA user_version=3;
    ";

    #[test]
    fn migrating_from_schema_three_keeps_every_node_the_identity_and_the_revision() {
        let temp = tempfile::tempdir().expect("tempdir");
        let path = temp.path().join("legacy-v3.sqlite");
        {
            let legacy = Connection::open(&path).expect("legacy");
            legacy.execute_batch(SCHEMA_V3).expect("v3 schema");
        }

        let index = Index::open(&path).expect("migrate");
        let version: i64 = index
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("version");
        assert_eq!(version, SCHEMA_VERSION);

        let nodes = index.list_nodes(100, 0).expect("nodes");
        assert_eq!(nodes.len(), 3, "no node may be lost by the migration");
        assert!(
            nodes.iter().find(|node| node.id == 2).expect("alpha").seen,
            "seen must survive verbatim"
        );

        let identity = index.identity().expect("identity");
        assert_eq!(
            identity.index_id, "11111111-1111-1111-1111-111111111111",
            "index_id must never be rewritten by a migration"
        );
        assert_eq!(
            identity.revision, 5,
            "a migration is not a rebuild and must not move the revision"
        );

        // Every pre-migration row starts with no stable key: nothing to
        // remap against yet, honestly — see `migrate_to_stable_identity`.
        assert_eq!(index.identity_of(1).expect("meta"), None);
        assert_eq!(index.identity_of(2).expect("meta"), None);

        // The migrated database is immediately writable through the new
        // identity-aware path — no `BLOCKED` state left behind.
        let corpus = vec![node(1, None, "root", "", NodeKind::Root, 0)];
        let identities = vec![identity_input(
            1,
            "PFv1:migrated",
            IdentityProvenance::PathFallback,
        )];
        let mut writable = index;
        writable
            .publish_with_identity(&corpus, &identities, &[], &[])
            .expect("publish after migration");
    }

    /// `ACTION-0057` D2 — the `3 → 4` transition commits once or not at all.
    ///
    /// The obstruction is a real schema object, not a test-only hook: a
    /// `TABLE` named `idx_nodes_stable_key` blocks
    /// `CREATE UNIQUE INDEX IF NOT EXISTS idx_nodes_stable_key ...`, because
    /// `IF NOT EXISTS` only tolerates an existing *index* of that name, never
    /// an object of a different kind. Both `ALTER TABLE`s run and succeed
    /// **before** that statement, so this proves a failure genuinely **after**
    /// schema mutation has begun rolls back completely — not merely a refusal
    /// before anything happened.
    #[test]
    fn migration_v3_to_v4_rolls_back_completely_on_injected_failure() {
        use rusqlite::OptionalExtension;
        let temp = tempfile::tempdir().expect("tempdir");
        let path = temp.path().join("legacy-v3-obstructed.sqlite");
        {
            let legacy = Connection::open(&path).expect("legacy");
            legacy.execute_batch(SCHEMA_V3).expect("v3 schema");
            legacy
                .execute_batch("CREATE TABLE idx_nodes_stable_key (blocker INTEGER);")
                .expect("obstruction");
        }

        let open_error = Index::open(&path)
            .err()
            .expect("the obstructed migration must fail");
        assert!(
            matches!(open_error, rusqlite::Error::SqliteFailure(_, _)),
            "expected a genuine SQL failure from the collision, got {open_error:?}"
        );

        // The whole transaction rolled back: version, schema shape, data,
        // `seen`, `index_id` and `index_revision` are all exactly the v3
        // fixture, byte for byte in every column that matters.
        let reopened = Connection::open(&path).expect("reopen the untouched v3 file");
        let version: i64 = reopened
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("version");
        assert_eq!(
            version, 3,
            "a failed migration must leave user_version at 3"
        );

        for column in ["stable_key", "identity_provenance"] {
            let present: i64 = reopened
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('nodes') WHERE name = ?1",
                    [column],
                    |row| row.get(0),
                )
                .expect("column probe");
            assert_eq!(
                present, 0,
                "the {column} column must not exist after a rolled-back migration"
            );
        }
        let next_node_id: Option<String> = reopened
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'next_node_id'",
                [],
                |row| row.get(0),
            )
            .optional()
            .expect("next_node_id probe");
        assert_eq!(
            next_node_id, None,
            "next_node_id must not have been bootstrapped by a rolled-back migration"
        );
        let schema_version_meta: String = reopened
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .expect("schema_version meta");
        assert_eq!(schema_version_meta, "3");

        let node_count: i64 = reopened
            .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
            .expect("node count");
        assert_eq!(
            node_count, 3,
            "no node may be lost by a rolled-back migration"
        );
        let alpha_seen: bool = reopened
            .query_row("SELECT seen FROM nodes WHERE id = 2", [], |row| row.get(0))
            .expect("alpha seen");
        assert!(
            alpha_seen,
            "seen must survive a rolled-back migration verbatim"
        );
        let index_id: String = reopened
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'index_id'",
                [],
                |row| row.get(0),
            )
            .expect("index_id");
        assert_eq!(index_id, "11111111-1111-1111-1111-111111111111");
        let index_revision: String = reopened
            .query_row(
                "SELECT value FROM schema_meta WHERE key = 'index_revision'",
                [],
                |row| row.get(0),
            )
            .expect("index_revision");
        assert_eq!(index_revision, "5");
        drop(reopened);

        // Remove the obstruction: the same file migrates correctly afterwards,
        // exactly as `migrating_from_schema_three_...` proves for a clean v3
        // file — the rollback did not leave the file permanently stuck.
        {
            let unblock = Connection::open(&path).expect("unblock");
            unblock
                .execute_batch("DROP TABLE idx_nodes_stable_key;")
                .expect("remove obstruction");
        }
        let migrated = Index::open(&path).expect("migration now succeeds");
        let version: i64 = migrated
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("version");
        assert_eq!(version, SCHEMA_VERSION);
        assert_eq!(migrated.list_nodes(100, 0).expect("nodes").len(), 3);
        let identity = migrated.identity().expect("identity");
        assert_eq!(identity.index_id, "11111111-1111-1111-1111-111111111111");
        assert_eq!(identity.revision, 5);
    }

    fn node(
        id: i64,
        parent: Option<i64>,
        name: &str,
        relative_path: &str,
        kind: NodeKind,
        child_count: u32,
    ) -> NodeDto {
        NodeDto {
            id,
            parent_id: parent,
            name: name.to_string(),
            relative_path: relative_path.to_string(),
            kind,
            depth: u32::from(parent.is_some()),
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count,
            seen: false,
        }
    }

    fn identity_input(
        node_id: i64,
        stable_key: &str,
        provenance: IdentityProvenance,
    ) -> NodeIdentity {
        NodeIdentity {
            node_id,
            stable_key: stable_key.to_string(),
            provenance,
        }
    }

    #[test]
    fn publish_with_identity_keeps_the_canonical_id_across_a_rename() {
        let mut index = Index::in_memory().expect("index");
        let first_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "avant.txt", "avant.txt", NodeKind::File, 0),
        ];
        let first_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(2, "SYS1:file-a", IdentityProvenance::System),
        ];
        index
            .publish_with_identity(&first_scan, &first_identities, &[], &[])
            .expect("first publish");
        let canonical_before = 2; // no previous state to match against yet.
        assert!(index.node(canonical_before).expect("row").is_some());

        // A fresh scan of the SAME tree after a rename: a new scanner
        // temporary id (7, not 2), but the SAME stable key.
        let second_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(7, Some(1), "apres.txt", "apres.txt", NodeKind::File, 0),
        ];
        let second_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(7, "SYS1:file-a", IdentityProvenance::System),
        ];
        let outcome = index
            .publish_with_identity(&second_scan, &second_identities, &[], &[])
            .expect("second publish");
        assert_eq!(outcome.matched, 2, "both root and the renamed file matched");
        assert_eq!(outcome.created, 0);

        let renamed = index
            .list_nodes(10, 0)
            .expect("nodes")
            .into_iter()
            .find(|n| n.relative_path == "apres.txt")
            .expect("renamed node");
        assert_eq!(
            renamed.id, canonical_before,
            "the same stable key must keep the same canonical id across a rename"
        );
        assert_eq!(
            index.identity_of(canonical_before).expect("meta"),
            Some(("SYS1:file-a".to_string(), IdentityProvenance::System))
        );
    }

    #[test]
    fn publish_with_identity_remaps_parent_ids_for_a_moved_subtree() {
        let mut index = Index::in_memory().expect("index");
        let first_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "dossier", "dossier", NodeKind::Directory, 1),
            node(
                3,
                Some(2),
                "enfant.txt",
                "dossier/enfant.txt",
                NodeKind::File,
                0,
            ),
        ];
        let first_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(2, "SYS1:dossier", IdentityProvenance::System),
            identity_input(3, "SYS1:enfant", IdentityProvenance::System),
        ];
        index
            .publish_with_identity(&first_scan, &first_identities, &[], &[])
            .expect("first publish");
        let (folder_id_before, child_id_before) = (2, 3);

        // The directory moved under a new sibling, one level deeper — new
        // scanner temp ids throughout, same stable keys.
        let second_scan = vec![
            node(10, None, "root", "", NodeKind::Root, 1),
            node(11, Some(10), "ailleurs", "ailleurs", NodeKind::Directory, 1),
            node(
                12,
                Some(11),
                "dossier",
                "ailleurs/dossier",
                NodeKind::Directory,
                1,
            ),
            node(
                13,
                Some(12),
                "enfant.txt",
                "ailleurs/dossier/enfant.txt",
                NodeKind::File,
                0,
            ),
        ];
        let second_identities = vec![
            identity_input(10, "SYS1:root", IdentityProvenance::System),
            identity_input(11, "SYS1:ailleurs", IdentityProvenance::System),
            identity_input(12, "SYS1:dossier", IdentityProvenance::System),
            identity_input(13, "SYS1:enfant", IdentityProvenance::System),
        ];
        let outcome = index
            .publish_with_identity(&second_scan, &second_identities, &[], &[])
            .expect("second publish");
        assert_eq!(outcome.matched, 3, "root, dossier and enfant all matched");
        assert_eq!(outcome.created, 1, "only ailleurs is new");

        let nodes = index.list_nodes(10, 0).expect("nodes");
        let folder = nodes
            .iter()
            .find(|n| n.relative_path == "ailleurs/dossier")
            .expect("moved folder");
        let child = nodes
            .iter()
            .find(|n| n.relative_path == "ailleurs/dossier/enfant.txt")
            .expect("moved child");
        assert_eq!(folder.id, folder_id_before);
        assert_eq!(child.id, child_id_before);
        assert_eq!(
            child.parent_id,
            Some(folder_id_before),
            "the child's parent_id must point at the folder's own canonical id"
        );
    }

    #[test]
    fn publish_with_identity_gives_a_new_object_a_fresh_id_never_recycled() {
        let mut index = Index::in_memory().expect("index");
        let first_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "a.txt", "a.txt", NodeKind::File, 0),
        ];
        let first_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(2, "SYS1:a", IdentityProvenance::System),
        ];
        index
            .publish_with_identity(&first_scan, &first_identities, &[], &[])
            .expect("first publish");
        let deleted_id = 2;

        // `a.txt` is deleted; an unrelated `b.txt` is created instead.
        let second_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(5, Some(1), "b.txt", "b.txt", NodeKind::File, 0),
        ];
        let second_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(5, "SYS1:b", IdentityProvenance::System),
        ];
        let outcome = index
            .publish_with_identity(&second_scan, &second_identities, &[], &[])
            .expect("second publish");
        assert_eq!(outcome.created, 1);

        let created = index
            .list_nodes(10, 0)
            .expect("nodes")
            .into_iter()
            .find(|n| n.relative_path == "b.txt")
            .expect("b.txt");
        assert_ne!(
            created.id, deleted_id,
            "a deleted object's id must never be handed to an unrelated new object"
        );
        assert!(
            created.id > deleted_id,
            "the durable counter only ever increases"
        );

        // A THIRD object, after the deleted id has had a chance to be
        // reused by coincidence, still never collides with it.
        let third_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(5, Some(1), "b.txt", "b.txt", NodeKind::File, 0),
            node(6, Some(1), "c.txt", "c.txt", NodeKind::File, 0),
        ];
        let third_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(5, "SYS1:b", IdentityProvenance::System),
            identity_input(6, "SYS1:c", IdentityProvenance::System),
        ];
        index
            .publish_with_identity(&third_scan, &third_identities, &[], &[])
            .expect("third publish");
        let all_ids: Vec<i64> = index
            .list_nodes(10, 0)
            .expect("nodes")
            .into_iter()
            .map(|n| n.id)
            .collect();
        assert_eq!(
            all_ids.len(),
            all_ids.iter().collect::<HashSet<_>>().len(),
            "no two live rows may ever share an id: {all_ids:?}"
        );
        assert!(!all_ids.contains(&deleted_id));
    }

    #[test]
    fn publish_with_identity_refuses_a_duplicate_stable_key_and_keeps_the_previous_index_intact() {
        let mut index = Index::in_memory().expect("index");
        let first_scan = vec![node(1, None, "root", "", NodeKind::Root, 0)];
        let first_identities = vec![identity_input(1, "SYS1:root", IdentityProvenance::System)];
        index
            .publish_with_identity(&first_scan, &first_identities, &[], &[])
            .expect("first publish");
        let revision_before = index.identity().expect("identity").revision;

        let colliding_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 2),
            node(2, Some(1), "a.txt", "a.txt", NodeKind::File, 0),
            node(3, Some(1), "b.txt", "b.txt", NodeKind::File, 0),
        ];
        let colliding_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            // Two DIFFERENT files claiming the SAME stable key — an
            // artificial collision, refused explicitly.
            identity_input(2, "SYS1:duplicated", IdentityProvenance::System),
            identity_input(3, "SYS1:duplicated", IdentityProvenance::System),
        ];
        let error = index
            .publish_with_identity(&colliding_scan, &colliding_identities, &[], &[])
            .expect_err("a duplicate stable key must be refused");
        assert!(matches!(error, PublishError::IdentityCollision));

        // The previous index is untouched: still exactly one node, still
        // openable, still at the same revision.
        let nodes = index.list_nodes(10, 0).expect("nodes after refusal");
        assert_eq!(nodes.len(), 1);
        assert_eq!(
            index.identity().expect("identity").revision,
            revision_before
        );
    }

    /// `ACTION-0057` §4 — the caller-side bijection `publish_with_identity`
    /// documents as a precondition is now checked, not merely assumed.
    /// Before this, a missing entry could reach an internal `.expect()` and
    /// panic rather than return a refusal.
    #[test]
    fn publish_with_identity_refuses_a_missing_identity_instead_of_panicking() {
        let mut index = Index::in_memory().expect("index");
        let scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "a.txt", "a.txt", NodeKind::File, 0),
        ];
        // Only the root has an identity; `a.txt` (node 2) has none.
        let identities = vec![identity_input(1, "SYS1:root", IdentityProvenance::System)];
        let error = index
            .publish_with_identity(&scan, &identities, &[], &[])
            .expect_err("a missing identity must be refused, not panic");
        assert!(matches!(error, PublishError::IdentityNotBijective));
        // Nothing was published: the in-memory index still has no rows.
        assert_eq!(index.list_nodes(10, 0).expect("nodes").len(), 0);
    }

    #[test]
    fn publish_with_identity_refuses_an_identity_for_an_unknown_node_id() {
        let mut index = Index::in_memory().expect("index");
        let scan = vec![node(1, None, "root", "", NodeKind::Root, 0)];
        let identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            // Node 99 does not exist in `scan` at all.
            identity_input(99, "SYS1:phantom", IdentityProvenance::System),
        ];
        let error = index
            .publish_with_identity(&scan, &identities, &[], &[])
            .expect_err("an identity for an unknown node_id must be refused");
        assert!(matches!(error, PublishError::IdentityNotBijective));
        assert_eq!(index.list_nodes(10, 0).expect("nodes").len(), 0);
    }

    #[test]
    fn publish_with_identity_refuses_a_duplicated_node_id_in_the_identity_list() {
        let mut index = Index::in_memory().expect("index");
        let scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "a.txt", "a.txt", NodeKind::File, 0),
        ];
        // Node 2 is named twice, under two DIFFERENT stable keys — a
        // duplicate `node_id`, not a duplicate stable key, so the earlier
        // collision check alone would not have caught it.
        let identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(2, "SYS1:a-first", IdentityProvenance::System),
            identity_input(2, "SYS1:a-second", IdentityProvenance::System),
        ];
        let error = index
            .publish_with_identity(&scan, &identities, &[], &[])
            .expect_err("a duplicated node_id must be refused");
        assert!(matches!(error, PublishError::IdentityNotBijective));
        assert_eq!(index.list_nodes(10, 0).expect("nodes").len(), 0);
    }

    #[test]
    fn publish_with_identity_carries_seen_by_matched_id_even_when_the_path_changes() {
        let mut index = Index::in_memory().expect("index");
        let first_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "avant.txt", "avant.txt", NodeKind::File, 0),
        ];
        let first_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(2, "SYS1:file-a", IdentityProvenance::System),
        ];
        index
            .publish_with_identity(&first_scan, &first_identities, &[], &[])
            .expect("first publish");
        assert!(index.mark_seen(2).expect("mark seen"));

        let renamed_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(9, Some(1), "apres.txt", "apres.txt", NodeKind::File, 0),
        ];
        let renamed_identities = vec![
            identity_input(1, "SYS1:root", IdentityProvenance::System),
            identity_input(9, "SYS1:file-a", IdentityProvenance::System),
        ];
        index
            .publish_with_identity(&renamed_scan, &renamed_identities, &[], &[])
            .expect("second publish");

        let renamed = index
            .list_nodes(10, 0)
            .expect("nodes")
            .into_iter()
            .find(|n| n.relative_path == "apres.txt")
            .expect("renamed node");
        assert_eq!(renamed.id, 2, "a SYSTEM rename keeps the canonical id");
        assert!(
            renamed.seen,
            "seen must survive a SYSTEM rename via the matched canonical id, not the path"
        );
    }

    #[test]
    fn publish_with_identity_does_not_carry_seen_across_a_path_fallback_rename() {
        // I-E's declared, honest limitation: a PATH_FALLBACK object's
        // identity IS its path, so a rename is, provably, a new object.
        let mut index = Index::in_memory().expect("index");
        let first_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "avant.txt", "avant.txt", NodeKind::File, 0),
        ];
        let first_identities = vec![
            identity_input(1, "PFv1:root", IdentityProvenance::PathFallback),
            identity_input(
                2,
                &identity::path_fallback_key(Path::new("avant.txt"), NodeKind::File),
                IdentityProvenance::PathFallback,
            ),
        ];
        index
            .publish_with_identity(&first_scan, &first_identities, &[], &[])
            .expect("first publish");
        assert!(index.mark_seen(2).expect("mark seen"));

        let renamed_scan = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(9, Some(1), "apres.txt", "apres.txt", NodeKind::File, 0),
        ];
        let renamed_identities = vec![
            identity_input(1, "PFv1:root", IdentityProvenance::PathFallback),
            identity_input(
                9,
                &identity::path_fallback_key(Path::new("apres.txt"), NodeKind::File),
                IdentityProvenance::PathFallback,
            ),
        ];
        let outcome = index
            .publish_with_identity(&renamed_scan, &renamed_identities, &[], &[])
            .expect("second publish");
        assert_eq!(
            outcome.created, 1,
            "the renamed fallback node is a new object"
        );

        let renamed = index
            .list_nodes(10, 0)
            .expect("nodes")
            .into_iter()
            .find(|n| n.relative_path == "apres.txt")
            .expect("renamed node");
        assert_ne!(
            renamed.id, 2,
            "a PATH_FALLBACK rename must not keep the old id"
        );
        assert!(
            !renamed.seen,
            "a PATH_FALLBACK rename must not silently inherit the old node's seen state"
        );
    }

    #[test]
    fn replace_nodes_without_identity_still_populates_a_fallback_stable_key() {
        // The legacy/synthetic path (`identities: None`) is never remapped,
        // but every row still carries a real stable key and provenance —
        // the columns are never half-written.
        let mut index = Index::in_memory().expect("index");
        let nodes = vec![
            node(1, None, "root", "", NodeKind::Root, 1),
            node(2, Some(1), "a.txt", "a.txt", NodeKind::File, 0),
        ];
        index.replace_nodes(&nodes).expect("replace");
        assert_eq!(
            index.identity_of(2).expect("meta"),
            Some((
                identity::path_fallback_key(Path::new("a.txt"), NodeKind::File),
                IdentityProvenance::PathFallback
            ))
        );
    }
}
