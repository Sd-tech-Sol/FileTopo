//! The brain catalogue — `TASK-0018` §4.1 to §4.4.
//!
//! Four rules govern this module, and none of them is negotiable.
//!
//! * **A `brain_id` is a FileTopo identity, never a source.** It is not a
//!   path, not a fixture name, and it is **not required to differ** from
//!   another brain's source. `DEC-0017` makes the distinction structural:
//!   `brain-alpha` and `brain-gamma` share the fixture `quasi-empty` on
//!   purpose, and must stay completely independent.
//! * **Every public runtime operation on a map or a relation is scoped by
//!   `brain_id`.** The backend resolves `brain_id` → source afterwards. An
//!   unknown `brain_id` is an explicit error, never an empty result.
//! * **A `node_id` alone is never a global identity.** The logical boundary is
//!   [`BrainNodeRef`] — `brain_id` **plus** `node_id`.
//! * **The seed never overwrites what a person changed.** It creates what is
//!   missing and stops there; a renamed brain stays renamed.
//!
//! The catalogue holds the **non-reconstructible** state of a brain —
//! `DEC-0011` `S-C`. The derived index and the relations live **elsewhere, one
//! space per brain**, which is what [`super::sandbox::SandboxPaths`] lays out.

use super::{MapError, fixtures};
use crate::path_codec::{decode_path, encode_path};
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// Bump only together with a migration.
///
/// `2` — `TASK-0032`: `REAL_ROOT` joins `SYNTHETIC_FIXTURE`, a brain carries a
/// displayable `source_label`, and a real root's absolute path is persisted in
/// a `BLOB` column that no DTO ever reads.
pub const CATALOG_SCHEMA_VERSION: i64 = 2;

/// Key under which the catalogue remembers which brain is active.
///
/// The active brain is **non-reconstructible state**: nothing in an index or a
/// relations store could tell you which brain a person was last looking at.
const ACTIVE_BRAIN_KEY: &str = "active_brain_id";

/// Key under which the catalogue remembers whether the details panel is
/// shown — `TASK-0035` A. Same `catalog_meta` table as [`ACTIVE_BRAIN_KEY`];
/// no new store, no new file, no schema change.
const DETAILS_PANEL_VISIBLE_KEY: &str = "details_panel_visible";

/// Where a brain's content comes from.
///
/// Two variants since `TASK-0032`, and no third one that could mean "some
/// folder, somewhere": a `RealRoot` is a folder **the person chose through the
/// native picker**, whose absolute path lives in this catalogue's `BLOB` column
/// and nowhere else — `DEC-0033` A and B.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SourceKind {
    SyntheticFixture,
    RealRoot,
}

impl SourceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::SyntheticFixture => "SYNTHETIC_FIXTURE",
            Self::RealRoot => "REAL_ROOT",
        }
    }

    /// Parsed from storage exactly once, here, so an unknown string can never
    /// reach a resolution path.
    pub fn parse(value: &str) -> Result<Self, MapError> {
        match value {
            "SYNTHETIC_FIXTURE" => Ok(Self::SyntheticFixture),
            "REAL_ROOT" => Ok(Self::RealRoot),
            other => Err(MapError::UnsupportedSourceKind(other.to_string())),
        }
    }
}

/// Colours and shapes a newly registered brain is given, in order.
///
/// Distinct **shapes**, not only distinct colours — `DEC-0017` point 12. The
/// two lists have different lengths on purpose, so the pair repeats far later
/// than either list does. Choosing a brain's own colour and icon is interface
/// finish, and belongs to the redesign rather than to this slice.
const NEW_BRAIN_COLORS: [&str; 6] = [
    "#2F6DA8", "#7A3E9D", "#1F6F5C", "#9A5A18", "#A83247", "#3E6B2A",
];
const NEW_BRAIN_ICONS: [&str; 5] = ["●", "◆", "▲", "■", "★"];

/// One of the three brains `TASK-0018` §4.2 freezes.
#[derive(Debug, Clone, Copy)]
pub struct FrozenBrain {
    pub brain_id: &'static str,
    pub display_name: &'static str,
    pub color: &'static str,
    pub icon: &'static str,
    pub source_kind: SourceKind,
    pub source_ref: &'static str,
    pub position: i64,
}

/// `TASK-0018` §4.2, frozen before any code was written.
///
/// **`brain-alpha` and `brain-gamma` share `quasi-empty` on purpose.** Same
/// source, same relative paths, the same local node ids — and two brains that
/// must not be able to reach each other. That is the point of the slice, not
/// an oversight.
///
/// The three icons are three **distinct shapes**, readable without colour, so
/// no brain is identified by its colour alone — `DEC-0017` point 12.
pub const FROZEN_BRAINS: [FrozenBrain; 3] = [
    FrozenBrain {
        brain_id: "brain-alpha",
        display_name: "Cerveau Alpha",
        color: "#1F6F5C",
        icon: "▲",
        source_kind: SourceKind::SyntheticFixture,
        source_ref: "quasi-empty",
        position: 1,
    },
    FrozenBrain {
        brain_id: "brain-beta",
        display_name: "Cerveau Bêta",
        color: "#4A4FA8",
        icon: "■",
        source_kind: SourceKind::SyntheticFixture,
        source_ref: "deep",
        position: 2,
    },
    FrozenBrain {
        brain_id: "brain-gamma",
        display_name: "Cerveau Gamma",
        color: "#9A5A18",
        icon: "◆",
        source_kind: SourceKind::SyntheticFixture,
        source_ref: "quasi-empty",
        position: 3,
    },
];

/// The brain the catalogue opens on when it has never been told otherwise.
pub const DEFAULT_ACTIVE_BRAIN: &str = FROZEN_BRAINS[0].brain_id;

/// A brain, as the catalogue holds it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrainRecord {
    /// **A FileTopo identity.** Never a path, never a source name.
    pub brain_id: String,
    pub display_name: String,
    pub color: String,
    pub icon: String,
    pub source_kind: SourceKind,
    /// An **opaque** handle on the source. **Not** the brain's identity: two
    /// brains may legitimately carry the same value here.
    ///
    /// For a synthetic brain it is the fixture identifier, which is a frozen
    /// name in this repository. For a `REAL_ROOT` it is a UUID v4 drawn at
    /// registration — never the path, never derived from the path, so that a
    /// value which does reach the interface reveals nothing about the disk.
    pub source_ref: String,
    /// What to write on screen for the source. Lossy conversion is allowed
    /// **here** and only here — this is a label, never a value handed back to
    /// the filesystem.
    ///
    /// For a `REAL_ROOT` it is the chosen folder's **terminal name**, never its
    /// path: the person just picked that folder and already sees its name, and
    /// an absolute path would add their account name and private tree on top —
    /// `DEC-0033` B.
    pub source_label: String,
    pub position: i64,
}

/// There is deliberately **no path field above**.
///
/// A `BrainRecord` is serialized straight to the WebView, and a `PathBuf` in it
/// would reach the interface the first time somebody added the field and
/// nobody looked at the JSON. The absolute path of a `REAL_ROOT` is reachable
/// only through [`BrainCatalog::real_root_path`], which returns an owned
/// `PathBuf` that implements no `Serialize` at all — `DEC-0033` B.
const _: () = ();

impl BrainRecord {
    /// A brain built straight from the frozen table, without a catalogue.
    ///
    /// Used by the seed and by tests that need a brain before a catalogue
    /// exists. It is **not** a way to invent a brain: every field comes from
    /// [`FROZEN_BRAINS`].
    pub fn frozen(frozen: &FrozenBrain) -> Self {
        Self {
            brain_id: frozen.brain_id.to_string(),
            display_name: frozen.display_name.to_string(),
            color: frozen.color.to_string(),
            icon: frozen.icon.to_string(),
            source_kind: frozen.source_kind,
            source_ref: frozen.source_ref.to_string(),
            // A frozen brain reads a fixture, and the fixture's name is both
            // its handle and what the developer diagnostic shows.
            source_label: frozen.source_ref.to_string(),
            position: frozen.position,
        }
    }

    /// Looks up a frozen brain by identity.
    ///
    /// Test-only, and deliberately so: once the catalogue exists it is the
    /// single source of a brain's metadata, and production code that read the
    /// frozen table instead would silently ignore a rename — the very thing
    /// `K7` forbids.
    #[cfg(test)]
    pub fn frozen_by_id(brain_id: &str) -> Option<Self> {
        FROZEN_BRAINS
            .iter()
            .find(|candidate| candidate.brain_id == brain_id)
            .map(Self::frozen)
    }

    /// Resolves `brain_id` → the synthetic source it names.
    ///
    /// This is the **only** place the map pipeline learns which fixture a
    /// brain reads. Nothing above this function is allowed to treat a fixture
    /// identifier as a brain identity.
    pub fn source_fixture(&self) -> Result<&'static fixtures::FixtureSpec, MapError> {
        match self.source_kind {
            SourceKind::SyntheticFixture => fixtures::spec(&self.source_ref),
            // Refused by name rather than resolved to something plausible.
            // The synthetic-only features — the fixture plan, `H1`'s planned
            // paths, the integrity report — have no meaning on a real folder,
            // and answering them with an invented fixture would be worse than
            // answering with an error.
            SourceKind::RealRoot => Err(MapError::SourceNotSynthetic(self.brain_id.clone())),
        }
    }

    /// Whether this brain reads a folder the person chose.
    pub fn is_real_root(&self) -> bool {
        matches!(self.source_kind, SourceKind::RealRoot)
    }
}

/// The logical boundary of every map and relation operation — `TASK-0018`
/// §4.1 rule 4.
///
/// A `node_id` is an index row number. It is stable only inside one brain's
/// index, and two brains built from the same fixture hold the **same** ids for
/// **different** brains. Carrying the pair makes that impossible to forget.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrainNodeRef {
    pub brain_id: String,
    pub node_id: i64,
}

impl BrainNodeRef {
    pub fn new(brain_id: &str, node_id: i64) -> Self {
        Self {
            brain_id: brain_id.to_string(),
            node_id,
        }
    }

    /// Whether this reference belongs to `brain_id`.
    ///
    /// Written as a question rather than as an assertion: the caller decides
    /// what to do with a reference from elsewhere, and the answer is never
    /// "resolve it anyway".
    pub fn belongs_to(&self, brain_id: &str) -> bool {
        self.brain_id == brain_id
    }
}

/// What the interface needs to draw the brain selector.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrainCatalogView {
    pub brains: Vec<BrainRecord>,
    pub active_brain_id: String,
    pub schema_version: i64,
    /// Named relative to the sandbox root, never spelled out: a personal
    /// absolute path must not reach the repository, artefacts included.
    pub catalog_path: String,
    /// Brains created by this open. Zero on every open but the first.
    pub seeded: usize,
}

/// Non-sensitive, persisted UI preferences — `TASK-0035` A.
///
/// Global, not per-brain: which brain is shown is composition state, but
/// whether the details panel is shown at all is a preference about the
/// interface itself. Stored in `catalog_meta`, the same table
/// [`ACTIVE_BRAIN_KEY`] already uses — no new store, no new file, and
/// nothing here may ever carry a path, a file name or brain content.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiPreferences {
    pub details_panel_visible: bool,
}

/// Longest name a brain may carry. A synthetic bound, not a product one.
const MAX_DISPLAY_NAME: usize = 80;

/// Rejects a name, colour or icon that the catalogue must not store.
///
/// Validation lives here rather than in the interface because the interface is
/// not the only caller, and a constraint that only holds while callers behave
/// is not a constraint.
fn validate_metadata(display_name: &str, color: &str, icon: &str) -> Result<(), MapError> {
    let name = display_name.trim();
    if name.is_empty() || name.chars().count() > MAX_DISPLAY_NAME {
        return Err(MapError::BrainMetadataRejected(format!(
            "nom refusé: 1 à {MAX_DISPLAY_NAME} caractères attendus"
        )));
    }
    let colour_is_hex = color.len() == 7
        && color.starts_with('#')
        && color[1..].chars().all(|c| c.is_ascii_hexdigit());
    if !colour_is_hex {
        return Err(MapError::BrainMetadataRejected(format!(
            "couleur refusée: `{color}`, format `#RRGGBB` attendu"
        )));
    }
    let icon_length = icon.chars().count();
    if icon_length == 0 || icon_length > 2 {
        return Err(MapError::BrainMetadataRejected(format!(
            "icône refusée: 1 ou 2 caractères attendus, {icon_length} reçus"
        )));
    }
    Ok(())
}

pub struct BrainCatalog {
    connection: Connection,
}

impl BrainCatalog {
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
        let mut catalog = Self { connection };
        catalog.initialize()?;
        Ok(catalog)
    }

    #[cfg(test)]
    pub fn in_memory() -> Result<Self, MapError> {
        let connection = Connection::open_in_memory()?;
        connection.execute_batch("PRAGMA foreign_keys=ON;")?;
        let mut catalog = Self { connection };
        catalog.initialize()?;
        Ok(catalog)
    }

    /// Two tables, one deliberate omission, and one deliberate `CHECK`.
    ///
    /// **`source_ref` carries no `UNIQUE` constraint**, and neither does
    /// `source_path`. That is the whole point: two brains sharing a source is a
    /// supported, tested case, not an accident to be prevented — `DEC-0033` D.
    /// `brain_id` is the primary key, so the *identity* is unique while the
    /// *source* is free to repeat.
    ///
    /// The last `CHECK` is the one that keeps `source_kind` honest: a
    /// `REAL_ROOT` has a path and a `SYNTHETIC_FIXTURE` has none. Written as a
    /// constraint rather than as a convention because the alternative is a row
    /// that claims to read a folder and names none.
    const SCHEMA_V2: &'static str = "CREATE TABLE IF NOT EXISTS brains (
             brain_id TEXT PRIMARY KEY CHECK(length(brain_id) > 0),
             display_name TEXT NOT NULL CHECK(length(trim(display_name)) > 0),
             color TEXT NOT NULL CHECK(length(color) = 7 AND substr(color, 1, 1) = '#'),
             icon TEXT NOT NULL CHECK(length(icon) > 0),
             source_kind TEXT NOT NULL CHECK(source_kind IN ('SYNTHETIC_FIXTURE', 'REAL_ROOT')),
             source_ref TEXT NOT NULL CHECK(length(source_ref) > 0),
             source_label TEXT NOT NULL CHECK(length(source_label) > 0),
             source_path BLOB,
             position INTEGER NOT NULL,
             CHECK ((source_kind = 'REAL_ROOT') = (source_path IS NOT NULL))
         )";

    fn initialize(&mut self) -> Result<(), MapError> {
        self.connection.execute_batch(
            "CREATE TABLE IF NOT EXISTS catalog_meta (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );",
        )?;
        let stored: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        let brains_exists = self.connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'brains'",
            [],
            |row| row.get::<_, i64>(0),
        )? > 0;
        if brains_exists && stored < CATALOG_SCHEMA_VERSION {
            self.migrate_to_v2()?;
        } else if !brains_exists {
            self.connection.execute_batch(Self::SCHEMA_V2)?;
            self.connection
                .pragma_update(None, "user_version", CATALOG_SCHEMA_VERSION)?;
        }
        self.put_meta("schema_version", &CATALOG_SCHEMA_VERSION.to_string())?;
        Ok(())
    }

    /// Schema 1 to schema 2, in **one** transaction — `TASK-0032` `RR1`.
    ///
    /// SQLite cannot alter a `CHECK` constraint in place, and schema 1 pinned
    /// `source_kind IN ('SYNTHETIC_FIXTURE')`, so the table has to be rebuilt.
    /// Rebuilt, copied and swapped inside a single transaction: a failure
    /// anywhere rolls the whole thing back and leaves schema 1 exactly as it
    /// was, brains, names, colours and icons included. Nothing is deleted
    /// before its replacement is populated.
    ///
    /// `catalog_meta` is **not touched**, so `active_brain_id` survives by
    /// construction rather than by being copied carefully.
    ///
    /// Idempotent through `user_version`, which SQLite rolls back with the rest
    /// of the transaction: a second open reads 2 and does nothing.
    fn migrate_to_v2(&mut self) -> Result<(), MapError> {
        let transaction = self.connection.transaction()?;
        transaction.execute_batch(&format!(
            "{};
             INSERT INTO brains_next
                 (brain_id, display_name, color, icon,
                  source_kind, source_ref, source_label, source_path, position)
             SELECT brain_id, display_name, color, icon,
                    source_kind, source_ref, source_ref, NULL, position
               FROM brains;
             DROP TABLE brains;
             ALTER TABLE brains_next RENAME TO brains;",
            Self::SCHEMA_V2.replace("IF NOT EXISTS brains", "brains_next")
        ))?;
        transaction.pragma_update(None, "user_version", CATALOG_SCHEMA_VERSION)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn meta(&self, key: &str) -> Result<Option<String>, MapError> {
        Ok(self
            .connection
            .query_row(
                "SELECT value FROM catalog_meta WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()?)
    }

    pub fn put_meta(&self, key: &str, value: &str) -> Result<(), MapError> {
        self.connection.execute(
            "INSERT INTO catalog_meta (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    /// Creates the frozen brains that are missing, and **changes nothing
    /// else**.
    ///
    /// `INSERT ... ON CONFLICT DO NOTHING` rather than an upsert, deliberately:
    /// `K7` requires a renamed or recoloured brain to survive the next open,
    /// and an upsert would quietly undo the person's edit every time the
    /// application started. The seed creates; it never corrects.
    ///
    /// Returns how many brains it created — zero on every open but the first.
    pub fn seed_frozen(&mut self) -> Result<usize, MapError> {
        let transaction = self.connection.transaction()?;
        let mut created = 0;
        for frozen in FROZEN_BRAINS.iter().map(BrainRecord::frozen) {
            let inserted = transaction.execute(
                "INSERT INTO brains
                     (brain_id, display_name, color, icon,
                      source_kind, source_ref, source_label, source_path, position)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8)
                 ON CONFLICT(brain_id) DO NOTHING",
                params![
                    frozen.brain_id,
                    frozen.display_name,
                    frozen.color,
                    frozen.icon,
                    frozen.source_kind.as_str(),
                    frozen.source_ref,
                    frozen.source_label,
                    frozen.position,
                ],
            )?;
            created += inserted;
        }
        transaction.commit()?;
        self.put_meta("seed_version", "task-0018-v1")?;
        if self.meta(ACTIVE_BRAIN_KEY)?.is_none() {
            self.put_meta(ACTIVE_BRAIN_KEY, DEFAULT_ACTIVE_BRAIN)?;
        }
        Ok(created)
    }

    pub fn list(&self) -> Result<Vec<BrainRecord>, MapError> {
        // `source_path` is **not** selected here, and that is the point: the
        // query that feeds every `BrainRecord` the interface ever sees cannot
        // leak a column it never reads — `DEC-0033` B.
        let mut statement = self.connection.prepare(
            "SELECT brain_id, display_name, color, icon,
                    source_kind, source_ref, source_label, position
               FROM brains
              ORDER BY position, brain_id",
        )?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, i64>(7)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        rows.into_iter()
            .map(
                |(
                    brain_id,
                    display_name,
                    color,
                    icon,
                    source_kind,
                    source_ref,
                    source_label,
                    position,
                )| {
                    Ok(BrainRecord {
                        brain_id,
                        display_name,
                        color,
                        icon,
                        source_kind: SourceKind::parse(&source_kind)?,
                        source_ref,
                        source_label,
                        position,
                    })
                },
            )
            .collect()
    }

    pub fn get(&self, brain_id: &str) -> Result<Option<BrainRecord>, MapError> {
        Ok(self
            .list()?
            .into_iter()
            .find(|candidate| candidate.brain_id == brain_id))
    }

    /// The catalogue's answer to an unknown brain: an **error that names it**.
    ///
    /// `K2` asks for exactly this. An empty list, a default brain or a silent
    /// fallback would all turn a caller's mistake into a reading of the wrong
    /// brain's data.
    pub fn require(&self, brain_id: &str) -> Result<BrainRecord, MapError> {
        self.get(brain_id)?
            .ok_or_else(|| MapError::UnknownBrain(brain_id.to_string()))
    }

    /// The active brain, resolved.
    ///
    /// Falls back to the first frozen brain only when the stored value names a
    /// brain that no longer exists — and **says so by storing the correction**,
    /// rather than answering differently on every call.
    pub fn active(&mut self) -> Result<BrainRecord, MapError> {
        if let Some(stored) = self.meta(ACTIVE_BRAIN_KEY)? {
            if let Some(record) = self.get(&stored)? {
                return Ok(record);
            }
        }
        let fallback = self.require(DEFAULT_ACTIVE_BRAIN)?;
        self.put_meta(ACTIVE_BRAIN_KEY, &fallback.brain_id)?;
        Ok(fallback)
    }

    /// Makes a brain active. Refuses an unknown one rather than storing it.
    pub fn set_active(&mut self, brain_id: &str) -> Result<BrainRecord, MapError> {
        let record = self.require(brain_id)?;
        self.put_meta(ACTIVE_BRAIN_KEY, &record.brain_id)?;
        Ok(record)
    }

    /// Non-sensitive UI preferences — `TASK-0035` A. **Visible by default**
    /// when no value has ever been written, so a fresh catalogue and one that
    /// simply predates this preference behave identically.
    pub fn ui_preferences(&self) -> Result<UiPreferences, MapError> {
        let details_panel_visible = match self.meta(DETAILS_PANEL_VISIBLE_KEY)? {
            Some(value) => value == "true",
            None => true,
        };
        Ok(UiPreferences {
            details_panel_visible,
        })
    }

    /// Persists the details-panel visibility and returns the preferences as
    /// they now stand — the same round trip `set_active` makes, so a caller
    /// never has to re-read what it just wrote.
    pub fn set_details_panel_visible(&self, visible: bool) -> Result<UiPreferences, MapError> {
        self.put_meta(
            DETAILS_PANEL_VISIBLE_KEY,
            if visible { "true" } else { "false" },
        )?;
        self.ui_preferences()
    }

    /// The absolute path of a `REAL_ROOT`, decoded from its `BLOB`.
    ///
    /// **The only door to a real path in the whole program.** It returns an
    /// owned `PathBuf`, which is not `Serialize`, so what comes out of here
    /// cannot travel to the WebView by accident — it has to be handed to the
    /// scanner deliberately, which is exactly what `map_refresh` does and what
    /// `map_open` does not.
    ///
    /// `None` for a synthetic brain, which has no path and never had one. A
    /// `REAL_ROOT` whose blob is missing or undecodable is an **error**: a
    /// repaired path names a different folder, and scanning a folder the person
    /// did not choose is the failure this whole contract exists to prevent.
    pub fn real_root_path(&self, brain_id: &str) -> Result<Option<PathBuf>, MapError> {
        let record = self.require(brain_id)?;
        if !record.is_real_root() {
            return Ok(None);
        }
        let blob: Option<Vec<u8>> = self.connection.query_row(
            "SELECT source_path FROM brains WHERE brain_id = ?1",
            params![brain_id],
            |row| row.get(0),
        )?;
        let blob = blob.ok_or_else(|| {
            MapError::SourceUnresolved(format!("{brain_id}: aucune racine enregistrée"))
        })?;
        decode_path(&blob)
            .map(Some)
            .ok_or_else(|| MapError::SourceUnresolved(format!("{brain_id}: racine illisible")))
    }

    /// Records a folder the person chose, and **scans nothing**.
    ///
    /// The path arriving here is already canonical and already validated —
    /// `super::source::validate_real_root` is the single door, and it is a
    /// separate function because validation needs the sandbox and storage does
    /// not. This one draws the identities and writes the row.
    ///
    /// Both identities are drawn fresh and are **opaque**: `brain_id` is
    /// `real-<uuid>` and `source_ref` is a bare UUID. Neither is derived from
    /// the path, so registering the same folder twice gives two independent
    /// brains — `DEC-0033` D — and neither value tells a reader anything about
    /// the disk.
    pub fn register_real_root(&mut self, canonical: &Path) -> Result<BrainRecord, MapError> {
        // Lossy is correct **here**: this is the name on a chip, and the value
        // that will be handed back to the filesystem is the blob, not this.
        let label = canonical
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .filter(|name| !name.trim().is_empty())
            .unwrap_or_else(|| "Racine".to_string());
        let mut display_name = label.trim().to_string();
        if display_name.chars().count() > MAX_DISPLAY_NAME {
            display_name = display_name.chars().take(MAX_DISPLAY_NAME).collect();
        }

        let next_position: i64 = self.connection.query_row(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM brains",
            [],
            |row| row.get(0),
        )?;
        let slot = (next_position.max(1) - 1) as usize;
        let color = NEW_BRAIN_COLORS[slot % NEW_BRAIN_COLORS.len()].to_string();
        let icon = NEW_BRAIN_ICONS[slot % NEW_BRAIN_ICONS.len()].to_string();
        validate_metadata(&display_name, &color, &icon)?;

        let record = BrainRecord {
            brain_id: format!("real-{}", Uuid::new_v4()),
            display_name,
            color,
            icon,
            source_kind: SourceKind::RealRoot,
            source_ref: Uuid::new_v4().to_string(),
            source_label: label,
            position: next_position,
        };
        self.connection.execute(
            "INSERT INTO brains
                 (brain_id, display_name, color, icon,
                  source_kind, source_ref, source_label, source_path, position)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record.brain_id,
                record.display_name,
                record.color,
                record.icon,
                record.source_kind.as_str(),
                record.source_ref,
                record.source_label,
                encode_path(canonical),
                record.position,
            ],
        )?;
        Ok(record)
    }

    /// Changes the identity metadata of **one** brain.
    ///
    /// The `WHERE brain_id = ?` is not the guarantee — the guarantee is that
    /// every other row is left untouched and that `K7` reads them back to
    /// check. Source and kind are **not** editable here: changing what a brain
    /// reads is not a rename.
    pub fn update_metadata(
        &mut self,
        brain_id: &str,
        display_name: &str,
        color: &str,
        icon: &str,
    ) -> Result<BrainRecord, MapError> {
        let existing = self.require(brain_id)?;
        validate_metadata(display_name, color, icon)?;
        self.connection.execute(
            "UPDATE brains SET display_name = ?2, color = ?3, icon = ?4 WHERE brain_id = ?1",
            params![existing.brain_id, display_name.trim(), color, icon],
        )?;
        self.require(brain_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_three_frozen_brains_are_exactly_what_task_0018_froze() {
        assert_eq!(FROZEN_BRAINS.len(), 3);

        let ids = FROZEN_BRAINS
            .iter()
            .map(|brain| brain.brain_id)
            .collect::<Vec<_>>();
        assert_eq!(ids, vec!["brain-alpha", "brain-beta", "brain-gamma"]);

        // K1: identities are unique.
        let mut sorted = ids.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), 3, "brain_id must be unique");

        // K1: Alpha and Gamma share a source and differ in identity. This is
        // the frozen shape of the slice, not a coincidence to be tidied away.
        let alpha = &FROZEN_BRAINS[0];
        let gamma = &FROZEN_BRAINS[2];
        assert_eq!(alpha.source_ref, gamma.source_ref);
        assert_eq!(alpha.source_ref, "quasi-empty");
        assert_ne!(alpha.brain_id, gamma.brain_id);
        assert_eq!(FROZEN_BRAINS[1].source_ref, "deep");

        // The frozen visual identity, value for value.
        assert_eq!((alpha.icon, alpha.color), ("▲", "#1F6F5C"));
        assert_eq!(
            (FROZEN_BRAINS[1].icon, FROZEN_BRAINS[1].color),
            ("■", "#4A4FA8")
        );
        assert_eq!((gamma.icon, gamma.color), ("◆", "#9A5A18"));

        // DEC-0017 point 12: no two brains are told apart by colour alone —
        // the icons differ too, and so do the names.
        let icons = FROZEN_BRAINS.iter().map(|b| b.icon).collect::<Vec<_>>();
        let mut unique_icons = icons.clone();
        unique_icons.sort_unstable();
        unique_icons.dedup();
        assert_eq!(unique_icons.len(), 3, "each brain needs its own shape");
        let names = FROZEN_BRAINS
            .iter()
            .map(|b| b.display_name)
            .collect::<Vec<_>>();
        let mut unique_names = names.clone();
        unique_names.sort_unstable();
        unique_names.dedup();
        assert_eq!(unique_names.len(), 3);
    }

    #[test]
    fn every_frozen_brain_resolves_to_a_real_synthetic_fixture() {
        for frozen in &FROZEN_BRAINS {
            let record = BrainRecord::frozen(frozen);
            let spec = record.source_fixture().expect("source resolves");
            assert_eq!(spec.id, frozen.source_ref);
            assert_eq!(record.source_kind, SourceKind::SyntheticFixture);
        }
    }

    /// `K1`: the catalogue returns exactly the three frozen brains.
    #[test]
    fn seeding_creates_the_three_brains_and_nothing_more() {
        let mut catalog = BrainCatalog::in_memory().expect("catalog");
        assert_eq!(catalog.seed_frozen().expect("seed"), 3);

        let brains = catalog.list().expect("list");
        assert_eq!(brains.len(), 3);
        assert_eq!(
            brains
                .iter()
                .map(|b| b.brain_id.as_str())
                .collect::<Vec<_>>(),
            vec!["brain-alpha", "brain-beta", "brain-gamma"]
        );
        assert_eq!(catalog.active().expect("active").brain_id, "brain-alpha");
    }

    /// `K7`: the seed creates, it never corrects.
    #[test]
    fn a_second_seed_never_overwrites_a_changed_name_colour_or_icon() {
        let mut catalog = BrainCatalog::in_memory().expect("catalog");
        catalog.seed_frozen().expect("seed");
        catalog
            .update_metadata("brain-beta", "Bêta renommé", "#123456", "★")
            .expect("update");

        assert_eq!(catalog.seed_frozen().expect("re-seed"), 0);

        let beta = catalog.require("brain-beta").expect("beta");
        assert_eq!(beta.display_name, "Bêta renommé");
        assert_eq!(beta.color, "#123456");
        assert_eq!(beta.icon, "★");
        // And the source it reads is untouched by a rename.
        assert_eq!(beta.source_ref, "deep");
    }

    /// `K7`: editing one brain touches no other.
    #[test]
    fn editing_one_brain_leaves_every_other_brain_untouched() {
        let mut catalog = BrainCatalog::in_memory().expect("catalog");
        catalog.seed_frozen().expect("seed");
        let before = catalog.list().expect("before");

        catalog
            .update_metadata("brain-alpha", "Alpha modifié", "#0A0B0C", "●")
            .expect("update");

        let after = catalog.list().expect("after");
        for (was, is) in before.iter().zip(after.iter()) {
            if was.brain_id == "brain-alpha" {
                continue;
            }
            assert_eq!(was, is, "{} must not have moved", was.brain_id);
        }
    }

    /// `K2`: an unknown brain is an error that names it.
    #[test]
    fn an_unknown_brain_is_refused_by_name_rather_than_defaulted() {
        let mut catalog = BrainCatalog::in_memory().expect("catalog");
        catalog.seed_frozen().expect("seed");

        let error = catalog.require("brain-inconnu").expect_err("unknown");
        assert_eq!(error.to_string(), "map_unknown_brain: brain-inconnu");
        assert!(catalog.get("brain-inconnu").expect("get").is_none());
        assert!(catalog.set_active("brain-inconnu").is_err());
        // The refusal changed nothing.
        assert_eq!(catalog.active().expect("active").brain_id, "brain-alpha");
    }

    /// `K9`, at the storage layer: the active brain is persisted state.
    #[test]
    fn the_active_brain_survives_reopening_the_catalogue() {
        let temp = tempfile::tempdir().expect("temp");
        let path = temp.path().join("catalog.sqlite");
        {
            let mut catalog = BrainCatalog::open(&path).expect("open");
            catalog.seed_frozen().expect("seed");
            catalog.set_active("brain-gamma").expect("set active");
        }
        {
            let mut catalog = BrainCatalog::open(&path).expect("reopen");
            // The seed runs again on every open, exactly as production does.
            assert_eq!(catalog.seed_frozen().expect("re-seed"), 0);
            assert_eq!(catalog.active().expect("active").brain_id, "brain-gamma");
        }
    }

    /// `TASK-0035` A: absent preference reads as visible, the stated default.
    #[test]
    fn the_details_panel_preference_defaults_to_visible_when_absent() {
        let catalog = BrainCatalog::in_memory().expect("catalog");
        assert_eq!(
            catalog.ui_preferences().expect("preferences"),
            UiPreferences {
                details_panel_visible: true
            }
        );
    }

    /// `TASK-0035` A, at the storage layer: the preference is persisted state,
    /// exactly like the active brain above — same table, same guarantee.
    #[test]
    fn the_details_panel_preference_survives_reopening_the_catalogue() {
        let temp = tempfile::tempdir().expect("temp");
        let path = temp.path().join("catalog.sqlite");
        {
            let catalog = BrainCatalog::open(&path).expect("open");
            assert_eq!(
                catalog
                    .set_details_panel_visible(false)
                    .expect("persist hidden"),
                UiPreferences {
                    details_panel_visible: false
                }
            );
        }
        {
            let catalog = BrainCatalog::open(&path).expect("reopen");
            assert_eq!(
                catalog.ui_preferences().expect("preferences"),
                UiPreferences {
                    details_panel_visible: false
                }
            );
        }
        // Re-showing round-trips just as well — this is not a one-way latch.
        {
            let catalog = BrainCatalog::open(&path).expect("reopen again");
            catalog
                .set_details_panel_visible(true)
                .expect("persist visible");
        }
        {
            let catalog = BrainCatalog::open(&path).expect("reopen a third time");
            assert_eq!(
                catalog.ui_preferences().expect("preferences"),
                UiPreferences {
                    details_panel_visible: true
                }
            );
        }
    }

    /// `TASK-0035` A: the preference is a lone boolean under a fixed key —
    /// nothing that could carry a path, a file name or brain content.
    #[test]
    fn the_details_panel_preference_serializes_to_nothing_but_the_one_boolean() {
        let catalog = BrainCatalog::in_memory().expect("catalog");
        catalog.set_details_panel_visible(false).expect("persist");
        let json = serde_json::to_value(catalog.ui_preferences().expect("preferences"))
            .expect("serialize");
        assert_eq!(
            json,
            serde_json::json!({ "detailsPanelVisible": false }),
            "the DTO must carry nothing beyond the one documented field"
        );
    }

    /// `K7`: metadata survives a reopen, edits included.
    #[test]
    fn edited_metadata_survives_reopening_the_catalogue() {
        let temp = tempfile::tempdir().expect("temp");
        let path = temp.path().join("catalog.sqlite");
        {
            let mut catalog = BrainCatalog::open(&path).expect("open");
            catalog.seed_frozen().expect("seed");
            catalog
                .update_metadata("brain-gamma", "Gamma synthétique", "#334455", "◇")
                .expect("update");
        }
        {
            let mut catalog = BrainCatalog::open(&path).expect("reopen");
            catalog.seed_frozen().expect("re-seed");
            let gamma = catalog.require("brain-gamma").expect("gamma");
            assert_eq!(gamma.display_name, "Gamma synthétique");
            assert_eq!(gamma.color, "#334455");
            assert_eq!(gamma.icon, "◇");
        }
    }

    #[test]
    fn invalid_metadata_is_refused_and_leaves_the_row_alone() {
        let mut catalog = BrainCatalog::in_memory().expect("catalog");
        catalog.seed_frozen().expect("seed");

        for (name, color, icon, why) in [
            ("", "#1F6F5C", "▲", "empty name"),
            ("   ", "#1F6F5C", "▲", "blank name"),
            ("Alpha", "1F6F5C", "▲", "colour without #"),
            ("Alpha", "#1F6F5", "▲", "colour too short"),
            ("Alpha", "#GGGGGG", "▲", "colour not hexadecimal"),
            ("Alpha", "#1F6F5C", "", "empty icon"),
            ("Alpha", "#1F6F5C", "trois", "icon too long"),
        ] {
            let error = catalog
                .update_metadata("brain-alpha", name, color, icon)
                .expect_err(why);
            assert!(
                error.to_string().starts_with("map_brain_metadata_rejected"),
                "{why}: unexpected motif {error}"
            );
        }

        let alpha = catalog.require("brain-alpha").expect("alpha");
        assert_eq!(alpha.display_name, "Cerveau Alpha");
        assert_eq!(alpha.color, "#1F6F5C");
        assert_eq!(alpha.icon, "▲");
    }

    #[test]
    fn an_unsupported_source_kind_is_refused_rather_than_guessed() {
        let error = SourceKind::parse("USER_ROOT").expect_err("unsupported");
        assert_eq!(error.to_string(), "map_unsupported_source_kind: USER_ROOT");
    }

    /// `K5`, at the type level: the same `node_id` in two brains is two
    /// different references, and neither answers for the other.
    #[test]
    fn a_node_reference_never_belongs_to_two_brains() {
        let in_alpha = BrainNodeRef::new("brain-alpha", 7);
        let in_gamma = BrainNodeRef::new("brain-gamma", 7);

        assert_ne!(in_alpha, in_gamma);
        assert_eq!(in_alpha.node_id, in_gamma.node_id);
        assert!(in_alpha.belongs_to("brain-alpha"));
        assert!(!in_alpha.belongs_to("brain-gamma"));
        assert!(!in_gamma.belongs_to("brain-alpha"));
    }
}
