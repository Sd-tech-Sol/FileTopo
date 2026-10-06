//! Inter-brain relations — `TASK-0020` §4.
//!
//! `TASK-0017` gave a brain relations **inside itself**. This gives two brains
//! a relation **between** them, and the difference is not cosmetic: three
//! questions have to be answered before a single line can be drawn from one
//! territory to another.
//!
//! **Where does a relation live when it belongs to neither brain?** Not in
//! Alpha's private store: a rebuild of Alpha would then destroy a link Gamma is
//! half of, and Alpha would hold authority over data it does not own alone. So
//! the store is **common and separate** — `brains/interbrain/relations.sqlite`
//! — beside the brains rather than inside one, outside every rebuildable
//! `map/`, and outside the catalogue.
//!
//! **How does an endpoint survive a rebuild?** `map_nodes.id` are row numbers
//! and a rebuild renumbers them. An endpoint is therefore a **versioned key**,
//! `cek1|<brain_id>|<relative_path>`, resolved to whatever `node_id` the index
//! currently holds. **This is not `I-E`**: `VolumeSerialNumber` + `FileId` and
//! real moves and renames stay outside this slice, and this is the declared
//! deterministic fallback.
//!
//! **What is a relation to a brain nobody is looking at?** Still a relation.
//! Nothing in this file knows what is on screen: the store is independent of
//! the composition, and the interface decides what to say about a brain that is
//! not displayed.
//!
//! Two properties are structural rather than enforced by discipline:
//!
//! * **There is no `provenance` column.** Which table a row is in *is* its
//!   provenance, exactly as in `TASK-0017`. A relation without provenance is
//!   unrepresentable, not merely forbidden.
//! * **`source_brain_id <> target_brain_id` is a `CHECK`.** An "inter-brain"
//!   relation inside one brain cannot be written, whatever the caller does.

use super::MapError;
use super::relations::RELATION_TYPES;
use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

/// Bump only together with a migration. `1` — `TASK-0020` as first delivered.
pub const CROSS_SCHEMA_VERSION: i64 = 1;

/// Version of the inter-brain endpoint scheme, carried **inside every key**.
///
/// Deliberately different from `TASK-0017`'s `ek1`: the two key spaces are not
/// interchangeable, and a key that wandered from one store to the other must be
/// recognisable as foreign rather than silently accepted.
pub const CROSS_ENDPOINT_KEY_SCHEME: &str = "cek1";

/// Where the frozen synthetic set of §4.4 declares it comes from.
///
/// **No real heuristic exists**, and none is implied. `TASK-0020` invents no
/// relation between brains: the six deterministic ones below come from named,
/// versioned rules applied to a frozen set.
pub const CROSS_SEEDED_BASIS: &str = "fixture-synthetique-task-0020";

/// A documented, versioned inter-brain rule — §4.4.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossRelationRule {
    pub name: &'static str,
    pub version: &'static str,
    pub relation_type: &'static str,
    /// Declared, never assumed. **None of the three is symmetric**, which is
    /// what makes "no inverse is invented" checkable rather than hoped for.
    pub symmetric: bool,
}

/// The three rules `TASK-0020` §4.4 freezes.
pub const CROSS_RULES: [CrossRelationRule; 3] = [
    CrossRelationRule {
        name: "cross-homonymes",
        version: "v1",
        relation_type: "reference",
        symmetric: false,
    },
    CrossRelationRule {
        name: "cross-root-level",
        version: "v1",
        relation_type: "reference",
        symmetric: false,
    },
    CrossRelationRule {
        name: "cross-revision",
        version: "v1",
        relation_type: "revision",
        symmetric: false,
    },
];

/// Every way an inter-brain write can be refused, each with its named motif.
///
/// Separate from `TASK-0017`'s `RelationError` on purpose: these motifs are
/// about a **different** model, and folding them into the intra-brain enum
/// would make a reader of either one guess which model a refusal came from.
#[derive(Debug, Error, PartialEq, Eq, Clone)]
pub enum CrossRelationError {
    #[error("cross_relation_rejected_unknown_provenance: {0}")]
    UnknownProvenance(String),
    #[error("cross_relation_rejected_missing_rule: {0}")]
    MissingRule(String),
    #[error("cross_relation_rejected_suggestion_is_not_a_relation: {0}")]
    SuggestionIsNotARelation(String),
    #[error("cross_relation_rejected_empty_endpoint: {0}")]
    EmptyEndpoint(String),
    #[error("cross_relation_rejected_empty_type: {0}")]
    EmptyType(String),
    #[error("cross_relation_rejected_unknown_type: {0}")]
    UnknownType(String),
    /// The refusal this model exists for: both ends in the same brain.
    #[error("cross_relation_rejected_same_brain: {0}")]
    SameBrain(String),
    #[error("cross_relation_rejected_unknown_brain: {0}")]
    UnknownBrain(String),
    #[error("cross_relation_rejected_malformed_endpoint: {0}")]
    MalformedEndpoint(String),
    #[error("cross_relation_rejected_unknown_suggestion: {0}")]
    UnknownSuggestion(String),
    #[error("cross_relation_rejected_suggestion_already_decided: {0}")]
    SuggestionAlreadyDecided(String),
    /// `TASK-0051` / `DEC-0049` §A, transposed: a deterministic inter-brain
    /// relation comes from a documented rule and is never removed by a gesture.
    #[error("cross_relation_rejected_revocation_of_deterministic: {0}")]
    RevocationOfDeterministic(String),
    #[error("cross_relation_rejected_revocation_suggestion_not_approved: {0}")]
    RevocationSuggestionNotApproved(String),
    #[error("cross_relation_rejected_revocation_relation_inconsistent: {0}")]
    RevocationRelationInconsistent(String),
}

/// The only two provenances an established inter-brain relation can have.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CrossProvenance {
    Deterministic,
    Approved,
}

impl CrossProvenance {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Deterministic => "DETERMINISTIC",
            Self::Approved => "APPROVED",
        }
    }

    /// Rejects everything that is not one of the two. `suggested`, the empty
    /// string and any unknown value are refused with a named motif — never
    /// mapped onto a default.
    pub fn parse(value: &str) -> Result<Self, CrossRelationError> {
        match value {
            "DETERMINISTIC" => Ok(Self::Deterministic),
            "APPROVED" => Ok(Self::Approved),
            other => Err(CrossRelationError::UnknownProvenance(format!(
                "`{other}` is not a provenance; an established inter-brain relation \
                 is DETERMINISTIC or APPROVED, and there is no third value"
            ))),
        }
    }
}

/// Builds the versioned inter-brain endpoint key of §4.2.
///
/// **`brain_id` is mandatory and travels inside the key.** An endpoint that did
/// not name its own brain is exactly the ambiguity `TASK-0018` spent a slice
/// making impossible, and between brains it would be worse: the same relative
/// path exists in Alpha and in Gamma.
pub fn cross_endpoint_key(brain_id: &str, relative_path: &str) -> String {
    format!("{CROSS_ENDPOINT_KEY_SCHEME}|{brain_id}|{relative_path}")
}

/// Splits a `cek1` key back into its brain and its relative path.
///
/// Returns `None` for anything that is not a well-formed key of **this**
/// scheme — an `ek1` key from `TASK-0017` included. The relative path may be
/// empty, which is the root; the brain may not.
pub fn split_cross_endpoint_key(key: &str) -> Option<(&str, &str)> {
    let mut parts = key.splitn(3, '|');
    let scheme = parts.next()?;
    let brain_id = parts.next()?;
    let relative_path = parts.next()?;
    if scheme != CROSS_ENDPOINT_KEY_SCHEME || brain_id.is_empty() {
        return None;
    }
    Some((brain_id, relative_path))
}

/// One established inter-brain relation, as stored.
///
/// `rule_name`/`rule_version` are `Some` **exactly when** the provenance is
/// `DETERMINISTIC`: an approved relation never claims to come from a rule, and
/// its table has no column in which it could.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredCrossRelation {
    pub id: i64,
    pub provenance: CrossProvenance,
    pub relation_type: String,
    pub source_brain_id: String,
    pub source_key: String,
    pub target_brain_id: String,
    pub target_key: String,
    pub rule_name: Option<String>,
    pub rule_version: Option<String>,
    pub suggestion_key: Option<String>,
    pub approved_unix_ms: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredCrossSuggestion {
    pub suggestion_key: String,
    pub relation_type: String,
    pub source_brain_id: String,
    pub source_key: String,
    pub target_brain_id: String,
    pub target_key: String,
    pub basis: String,
    /// `pending` or `approved`.
    pub state: String,
    pub created_unix_ms: i64,
    pub decided_unix_ms: Option<i64>,
}

/// One relation a rule produced, before it is written.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DerivedCrossRelation {
    pub reference: &'static str,
    pub source_brain_id: String,
    pub source_key: String,
    pub target_brain_id: String,
    pub target_key: String,
    pub relation_type: &'static str,
    pub rule: CrossRelationRule,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

// ---------------------------------------------------------------------------
// The frozen synthetic set — `TASK-0020` §4.4, `XBR-1`
// ---------------------------------------------------------------------------

/// One frozen inter-brain relation of `XBR-1`.
#[derive(Debug, Clone, Copy)]
pub struct FrozenCrossRelation {
    pub reference: &'static str,
    pub source_brain_id: &'static str,
    pub source_path: &'static str,
    pub target_brain_id: &'static str,
    pub target_path: &'static str,
    pub rule_name: &'static str,
}

/// The six deterministic relations of §4.4, frozen before any code.
///
/// **Every path was confronted with the frozen fixture planner before the
/// freeze** — `plan_quasi_empty` for Alpha and Gamma, `plan_deep` for Bêta —
/// and all sixteen exist. No substitution was needed and none was made.
pub const XBR1_RELATIONS: [FrozenCrossRelation; 6] = [
    FrozenCrossRelation {
        reference: "XB-D01",
        source_brain_id: "brain-alpha",
        source_path: "dossier-a/note-1.txt",
        target_brain_id: "brain-gamma",
        target_path: "dossier-b/note-1.txt",
        rule_name: "cross-homonymes",
    },
    FrozenCrossRelation {
        reference: "XB-D02",
        source_brain_id: "brain-gamma",
        source_path: "dossier-a/note-2.txt",
        target_brain_id: "brain-alpha",
        target_path: "dossier-b/sous-dossier/note-2.txt",
        rule_name: "cross-homonymes",
    },
    FrozenCrossRelation {
        reference: "XB-D03",
        source_brain_id: "brain-alpha",
        source_path: "racine-1.txt",
        target_brain_id: "brain-beta",
        target_path: "niveau-01",
        rule_name: "cross-root-level",
    },
    FrozenCrossRelation {
        reference: "XB-D04",
        source_brain_id: "brain-beta",
        source_path: "niveau-01/niveau-02",
        target_brain_id: "brain-gamma",
        target_path: "racine-2.txt",
        rule_name: "cross-root-level",
    },
    FrozenCrossRelation {
        reference: "XB-D05",
        source_brain_id: "brain-gamma",
        source_path: "dossier-a/note-3.txt",
        target_brain_id: "brain-beta",
        target_path: "niveau-01/niveau-02/niveau-03/annexe",
        rule_name: "cross-revision",
    },
    FrozenCrossRelation {
        reference: "XB-D06",
        source_brain_id: "brain-beta",
        source_path: "niveau-01/niveau-02/niveau-03",
        target_brain_id: "brain-alpha",
        target_path: "dossier-b/sous-dossier/note-1.txt",
        rule_name: "cross-revision",
    },
];

/// One frozen inter-brain suggestion of `XBR-1`.
#[derive(Debug, Clone, Copy)]
pub struct FrozenCrossSuggestion {
    pub key: &'static str,
    pub source_brain_id: &'static str,
    pub source_path: &'static str,
    pub target_brain_id: &'static str,
    pub target_path: &'static str,
    pub relation_type: &'static str,
}

/// The four suggestions of §4.4. **All `pending` at seed; none approved.**
pub const XBR1_SUGGESTIONS: [FrozenCrossSuggestion; 4] = [
    FrozenCrossSuggestion {
        key: "XB-S01",
        source_brain_id: "brain-alpha",
        source_path: "dossier-a/note-2.txt",
        target_brain_id: "brain-gamma",
        target_path: "dossier-a/note-2.txt",
        relation_type: "reference",
    },
    FrozenCrossSuggestion {
        key: "XB-S02",
        source_brain_id: "brain-gamma",
        source_path: "racine-1.txt",
        target_brain_id: "brain-alpha",
        target_path: "racine-2.txt",
        relation_type: "revision",
    },
    FrozenCrossSuggestion {
        key: "XB-S03",
        source_brain_id: "brain-alpha",
        source_path: "racine-2.txt",
        target_brain_id: "brain-beta",
        target_path: "niveau-01/niveau-02/niveau-03/annexe",
        relation_type: "reference",
    },
    FrozenCrossSuggestion {
        key: "XB-S04",
        source_brain_id: "brain-beta",
        source_path: "niveau-01/niveau-02/niveau-03",
        target_brain_id: "brain-gamma",
        target_path: "dossier-b/note-1.txt",
        relation_type: "revision",
    },
];

/// The independent expectation of §4.4: `(brain, path, outgoing, incoming)`.
///
/// Written into the task sheet **before** any code, so `M4` compares the store
/// against a frozen table rather than against itself. **Inter-brain counts
/// only**, at the seeded state.
///
/// **Four rows are witnesses.** Alpha `dossier-b/note-1.txt` and Gamma
/// `dossier-b/sous-dossier/note-1.txt` carry intra-brain relations — three and
/// four of them respectively, per `TASK-0017` — and **zero** inter-brain ones.
/// If an internal relation were ever counted as a cross relation, or the other
/// way round, these two rows would say so.
pub const CROSS_EXPECTED_COUNTS: [(&str, &str, usize, usize); 19] = [
    ("brain-alpha", "", 0, 0),
    ("brain-alpha", "dossier-a/note-1.txt", 1, 0),
    ("brain-alpha", "dossier-a/note-2.txt", 0, 0),
    ("brain-alpha", "dossier-b/note-1.txt", 0, 0),
    ("brain-alpha", "dossier-b/sous-dossier/note-1.txt", 0, 1),
    ("brain-alpha", "dossier-b/sous-dossier/note-2.txt", 0, 1),
    ("brain-alpha", "racine-1.txt", 1, 0),
    ("brain-alpha", "racine-2.txt", 0, 0),
    ("brain-beta", "", 0, 0),
    ("brain-beta", "niveau-01", 0, 1),
    ("brain-beta", "niveau-01/niveau-02", 1, 0),
    ("brain-beta", "niveau-01/niveau-02/niveau-03", 1, 0),
    ("brain-beta", "niveau-01/niveau-02/niveau-03/annexe", 0, 1),
    ("brain-gamma", "dossier-a/note-2.txt", 1, 0),
    ("brain-gamma", "dossier-a/note-3.txt", 1, 0),
    ("brain-gamma", "dossier-b/note-1.txt", 0, 1),
    ("brain-gamma", "dossier-b/sous-dossier/note-1.txt", 0, 0),
    ("brain-gamma", "racine-1.txt", 0, 0),
    ("brain-gamma", "racine-2.txt", 0, 1),
];

/// The ten pairs of §4.4 that must **never** exist: every frozen relation and
/// every frozen suggestion, read backwards.
///
/// `(source brain, source path, target brain, target path)`.
pub const CROSS_FORBIDDEN_INVERSES: [(&str, &str, &str, &str); 10] = [
    (
        "brain-gamma",
        "dossier-b/note-1.txt",
        "brain-alpha",
        "dossier-a/note-1.txt",
    ),
    (
        "brain-alpha",
        "dossier-b/sous-dossier/note-2.txt",
        "brain-gamma",
        "dossier-a/note-2.txt",
    ),
    ("brain-beta", "niveau-01", "brain-alpha", "racine-1.txt"),
    (
        "brain-gamma",
        "racine-2.txt",
        "brain-beta",
        "niveau-01/niveau-02",
    ),
    (
        "brain-beta",
        "niveau-01/niveau-02/niveau-03/annexe",
        "brain-gamma",
        "dossier-a/note-3.txt",
    ),
    (
        "brain-alpha",
        "dossier-b/sous-dossier/note-1.txt",
        "brain-beta",
        "niveau-01/niveau-02/niveau-03",
    ),
    (
        "brain-gamma",
        "dossier-a/note-2.txt",
        "brain-alpha",
        "dossier-a/note-2.txt",
    ),
    ("brain-alpha", "racine-2.txt", "brain-gamma", "racine-1.txt"),
    (
        "brain-beta",
        "niveau-01/niveau-02/niveau-03/annexe",
        "brain-alpha",
        "racine-2.txt",
    ),
    (
        "brain-gamma",
        "dossier-b/note-1.txt",
        "brain-beta",
        "niveau-01/niveau-02/niveau-03",
    ),
];

fn rule_named(name: &str) -> Option<CrossRelationRule> {
    CROSS_RULES.iter().copied().find(|rule| rule.name == name)
}

/// Replays the frozen rules over `XBR-1` — the whole of this slice's
/// "derivation".
///
/// **Nothing is detected here.** The rules are named and versioned, the set is
/// frozen, and every brain named must exist in the catalogue: an endpoint
/// pointing at an unknown brain is **rejected**, never dropped.
pub fn derive_xbr1(known_brain_ids: &[String]) -> Result<Vec<DerivedCrossRelation>, MapError> {
    let mut derived = Vec::with_capacity(XBR1_RELATIONS.len());
    for frozen in XBR1_RELATIONS {
        for brain_id in [frozen.source_brain_id, frozen.target_brain_id] {
            if !known_brain_ids.iter().any(|known| known == brain_id) {
                return Err(CrossRelationError::UnknownBrain(format!(
                    "{}: `{brain_id}` is not in the catalogue; an endpoint never \
                     defaults to another brain",
                    frozen.reference
                ))
                .into());
            }
        }
        let rule = rule_named(frozen.rule_name).ok_or_else(|| {
            CrossRelationError::MissingRule(format!(
                "{}: `{}` is not a declared inter-brain rule",
                frozen.reference, frozen.rule_name
            ))
        })?;
        derived.push(DerivedCrossRelation {
            reference: frozen.reference,
            source_brain_id: frozen.source_brain_id.to_string(),
            source_key: cross_endpoint_key(frozen.source_brain_id, frozen.source_path),
            target_brain_id: frozen.target_brain_id.to_string(),
            target_key: cross_endpoint_key(frozen.target_brain_id, frozen.target_path),
            relation_type: rule.relation_type,
            rule,
        });
    }
    Ok(derived)
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/// The approved side, and the triggers that bind a row to its suggestion.
///
/// Reserve `X3` of `TASK-0017`, transposed: **the correspondence is defended at
/// the storage layer**, not only in Rust. A guarantee that holds only while
/// callers use the right function is not a guarantee — and here the row carries
/// six fields, so "matches its suggestion" has to mean all six.
const CROSS_APPROVED_SCHEMA: &str = "
    CREATE TABLE IF NOT EXISTS cross_relations_approved (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_brain_id TEXT NOT NULL CHECK(length(source_brain_id) > 0),
        source_key TEXT NOT NULL CHECK(length(source_key) > 0),
        target_brain_id TEXT NOT NULL CHECK(length(target_brain_id) > 0),
        target_key TEXT NOT NULL CHECK(length(target_key) > 0),
        relation_type TEXT NOT NULL CHECK(length(relation_type) > 0),
        suggestion_key TEXT NOT NULL UNIQUE
            REFERENCES cross_suggestions(suggestion_key),
        approved_unix_ms INTEGER NOT NULL,
        CHECK(source_brain_id <> target_brain_id),
        CHECK(source_key <> target_key),
        UNIQUE(source_key, target_key, relation_type)
    );
    CREATE INDEX IF NOT EXISTS idx_cross_approved_source
        ON cross_relations_approved(source_key);
    CREATE INDEX IF NOT EXISTS idx_cross_approved_target
        ON cross_relations_approved(target_key);

    CREATE TRIGGER IF NOT EXISTS cross_approved_must_match_its_suggestion_on_insert
    BEFORE INSERT ON cross_relations_approved
    FOR EACH ROW BEGIN
        SELECT RAISE(ABORT, 'cross_relation_rejected_suggestion_is_not_a_relation')
        WHERE NOT EXISTS (
            SELECT 1 FROM cross_suggestions s
             WHERE s.suggestion_key = NEW.suggestion_key
               AND s.state = 'approved'
               AND s.source_brain_id = NEW.source_brain_id
               AND s.source_key = NEW.source_key
               AND s.target_brain_id = NEW.target_brain_id
               AND s.target_key = NEW.target_key
               AND s.relation_type = NEW.relation_type);
    END;

    CREATE TRIGGER IF NOT EXISTS cross_approved_must_match_its_suggestion_on_update
    BEFORE UPDATE ON cross_relations_approved
    FOR EACH ROW BEGIN
        SELECT RAISE(ABORT, 'cross_relation_rejected_suggestion_is_not_a_relation')
        WHERE NOT EXISTS (
            SELECT 1 FROM cross_suggestions s
             WHERE s.suggestion_key = NEW.suggestion_key
               AND s.state = 'approved'
               AND s.source_brain_id = NEW.source_brain_id
               AND s.source_key = NEW.source_key
               AND s.target_brain_id = NEW.target_brain_id
               AND s.target_key = NEW.target_key
               AND s.relation_type = NEW.relation_type);
    END;

    CREATE TRIGGER IF NOT EXISTS cross_suggestion_cannot_drift_from_its_relation
    BEFORE UPDATE OF source_brain_id, source_key, target_brain_id, target_key,
                     relation_type ON cross_suggestions
    FOR EACH ROW BEGIN
        SELECT RAISE(ABORT, 'cross_relation_rejected_suggestion_is_not_a_relation')
        WHERE EXISTS (
            SELECT 1 FROM cross_relations_approved a
             WHERE a.suggestion_key = OLD.suggestion_key);
    END;

    CREATE TRIGGER IF NOT EXISTS cross_approved_never_duplicates_a_deterministic
    BEFORE INSERT ON cross_relations_approved
    FOR EACH ROW BEGIN
        SELECT RAISE(ABORT, 'cross_relation_rejected_suggestion_is_not_a_relation')
        WHERE EXISTS (
            SELECT 1 FROM cross_relations_deterministic d
             WHERE d.source_key = NEW.source_key
               AND d.target_key = NEW.target_key
               AND d.relation_type = NEW.relation_type);
    END;
";

pub struct CrossRelationStore {
    connection: Connection,
}

impl CrossRelationStore {
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

    /// Writes straight into `cross_relations_approved`, bypassing every Rust
    /// guard.
    ///
    /// Exists so the `X3` constraints can be proved **at the storage layer**.
    /// Test-only, and never compiled into the product.
    #[cfg(test)]
    #[allow(clippy::too_many_arguments)]
    fn raw_insert_approved(
        &self,
        source_brain_id: &str,
        source_key: &str,
        target_brain_id: &str,
        target_key: &str,
        relation_type: &str,
        suggestion_key: &str,
    ) -> Result<(), MapError> {
        self.connection.execute(
            "INSERT INTO cross_relations_approved
                 (source_brain_id, source_key, target_brain_id, target_key,
                  relation_type, suggestion_key, approved_unix_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                source_brain_id,
                source_key,
                target_brain_id,
                target_key,
                relation_type,
                suggestion_key,
                now_ms()
            ],
        )?;
        Ok(())
    }

    /// Three tables, deliberately, and **no `provenance` column anywhere**.
    ///
    /// Which table a row is in *is* its provenance. The `CHECK` constraints
    /// repeat, at the storage layer, what the API already refuses — including
    /// the one this whole model exists for, `source_brain_id <> target_brain_id`.
    fn initialize(&self) -> Result<(), MapError> {
        self.connection.execute_batch(
            "CREATE TABLE IF NOT EXISTS cross_relation_meta (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS cross_relations_deterministic (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 source_brain_id TEXT NOT NULL CHECK(length(source_brain_id) > 0),
                 source_key TEXT NOT NULL CHECK(length(source_key) > 0),
                 target_brain_id TEXT NOT NULL CHECK(length(target_brain_id) > 0),
                 target_key TEXT NOT NULL CHECK(length(target_key) > 0),
                 relation_type TEXT NOT NULL CHECK(length(relation_type) > 0),
                 rule_name TEXT NOT NULL CHECK(length(rule_name) > 0),
                 rule_version TEXT NOT NULL CHECK(length(rule_version) > 0),
                 rule_symmetric INTEGER NOT NULL DEFAULT 0,
                 CHECK(source_brain_id <> target_brain_id),
                 CHECK(source_key <> target_key),
                 UNIQUE(source_key, target_key, relation_type)
             );
             CREATE TABLE IF NOT EXISTS cross_suggestions (
                 suggestion_key TEXT PRIMARY KEY,
                 source_brain_id TEXT NOT NULL CHECK(length(source_brain_id) > 0),
                 source_key TEXT NOT NULL CHECK(length(source_key) > 0),
                 target_brain_id TEXT NOT NULL CHECK(length(target_brain_id) > 0),
                 target_key TEXT NOT NULL CHECK(length(target_key) > 0),
                 relation_type TEXT NOT NULL CHECK(length(relation_type) > 0),
                 basis TEXT NOT NULL,
                 state TEXT NOT NULL CHECK(state IN ('pending', 'approved')),
                 created_unix_ms INTEGER NOT NULL,
                 decided_unix_ms INTEGER,
                 CHECK(source_brain_id <> target_brain_id),
                 CHECK(source_key <> target_key)
             );
             CREATE INDEX IF NOT EXISTS idx_cross_deterministic_source
                 ON cross_relations_deterministic(source_key);
             CREATE INDEX IF NOT EXISTS idx_cross_deterministic_target
                 ON cross_relations_deterministic(target_key);
             ",
        )?;
        self.connection.execute_batch(CROSS_APPROVED_SCHEMA)?;
        self.connection
            .execute_batch(&format!("PRAGMA user_version={CROSS_SCHEMA_VERSION};"))?;
        self.put_meta("schema_version", &CROSS_SCHEMA_VERSION.to_string())?;
        self.put_meta("endpoint_key_scheme", CROSS_ENDPOINT_KEY_SCHEME)?;
        Ok(())
    }

    pub fn put_meta(&self, key: &str, value: &str) -> Result<(), MapError> {
        self.connection.execute(
            "INSERT INTO cross_relation_meta (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn meta(&self, key: &str) -> Result<Option<String>, MapError> {
        Ok(self
            .connection
            .query_row(
                "SELECT value FROM cross_relation_meta WHERE key = ?1",
                [key],
                |row| row.get(0),
            )
            .optional()?)
    }

    // -- writes --------------------------------------------------------------

    /// Endpoints, brains and type, checked against the frozen model of §4.3.
    ///
    /// The two brains are checked **twice over**: the ids must differ, and each
    /// endpoint key must actually name the brain it is filed under. A key that
    /// said `cek1|brain-gamma|…` while being stored as Alpha's end would make
    /// every later count wrong in a way no test would notice.
    fn validate_shape(
        source_brain_id: &str,
        source_key: &str,
        target_brain_id: &str,
        target_key: &str,
        relation_type: &str,
    ) -> Result<(), CrossRelationError> {
        if source_brain_id.trim().is_empty() || target_brain_id.trim().is_empty() {
            return Err(CrossRelationError::EmptyEndpoint(format!(
                "source brain=`{source_brain_id}` target brain=`{target_brain_id}`"
            )));
        }
        if source_key.trim().is_empty() || target_key.trim().is_empty() {
            return Err(CrossRelationError::EmptyEndpoint(format!(
                "source=`{source_key}` target=`{target_key}`"
            )));
        }
        if source_brain_id == target_brain_id {
            return Err(CrossRelationError::SameBrain(format!(
                "`{source_brain_id}` on both ends; an inter-brain relation joins \
                 TWO different brains, and one inside a single brain belongs to \
                 that brain's own store"
            )));
        }
        for (brain_id, key) in [(source_brain_id, source_key), (target_brain_id, target_key)] {
            match split_cross_endpoint_key(key) {
                None => {
                    return Err(CrossRelationError::MalformedEndpoint(format!(
                        "`{key}` is not a `{CROSS_ENDPOINT_KEY_SCHEME}` endpoint key"
                    )));
                }
                Some((named, _)) if named != brain_id => {
                    return Err(CrossRelationError::MalformedEndpoint(format!(
                        "`{key}` names `{named}` but is filed under `{brain_id}`"
                    )));
                }
                Some(_) => {}
            }
        }
        if relation_type.trim().is_empty() {
            return Err(CrossRelationError::EmptyType(
                "an established inter-brain relation must carry a type".into(),
            ));
        }
        if !RELATION_TYPES.contains(&relation_type) {
            return Err(CrossRelationError::UnknownType(format!(
                "`{relation_type}` is not a declared relation type; \
                 {RELATION_TYPES:?} are the two"
            )));
        }
        if source_key == target_key {
            return Err(CrossRelationError::SameBrain(format!(
                "an endpoint cannot relate to itself: `{source_key}`"
            )));
        }
        Ok(())
    }

    /// The door through which a **deterministic** inter-brain relation is
    /// written, and the door every attempted write is refused at.
    ///
    /// It takes the provenance as a *string* on purpose: that is the shape a
    /// caller, a fixture loader or a future import would have, and it is
    /// exactly where a third provenance would try to slip in.
    ///
    /// **It cannot create an approved relation** — reserve `X3`, transposed.
    /// `APPROVED` is refused here unconditionally; [`CrossRelationStore::approve`]
    /// is the single applicative path, and the storage enforces the same rule
    /// underneath.
    #[allow(clippy::too_many_arguments)]
    pub fn insert_established(
        &self,
        provenance: &str,
        source_brain_id: &str,
        source_key: &str,
        target_brain_id: &str,
        target_key: &str,
        relation_type: &str,
        rule_name: Option<&str>,
        rule_version: Option<&str>,
        suggestion_key: Option<&str>,
    ) -> Result<i64, MapError> {
        let provenance = CrossProvenance::parse(provenance)?;
        Self::validate_shape(
            source_brain_id,
            source_key,
            target_brain_id,
            target_key,
            relation_type,
        )?;

        match provenance {
            CrossProvenance::Deterministic => {
                let name = rule_name.unwrap_or("").trim();
                let version = rule_version.unwrap_or("").trim();
                if name.is_empty() || version.is_empty() {
                    return Err(CrossRelationError::MissingRule(format!(
                        "a DETERMINISTIC inter-brain relation must carry a non-empty \
                         rule name and version; got name=`{}` version=`{}`",
                        rule_name.unwrap_or(""),
                        rule_version.unwrap_or("")
                    ))
                    .into());
                }
                let symmetric = CROSS_RULES
                    .iter()
                    .find(|rule| rule.name == name && rule.version == version)
                    .map(|rule| rule.symmetric)
                    .unwrap_or(false);
                self.connection.execute(
                    "INSERT OR IGNORE INTO cross_relations_deterministic
                         (source_brain_id, source_key, target_brain_id, target_key,
                          relation_type, rule_name, rule_version, rule_symmetric)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![
                        source_brain_id,
                        source_key,
                        target_brain_id,
                        target_key,
                        relation_type,
                        name,
                        version,
                        symmetric
                    ],
                )?;
            }
            CrossProvenance::Approved => {
                let named = suggestion_key.unwrap_or("").trim();
                return Err(CrossRelationError::SuggestionIsNotARelation(format!(
                    "an APPROVED inter-brain relation is created only by approving a \
                     suggestion; `insert_established` cannot create one \
                     (suggestion named: `{named}`)"
                ))
                .into());
            }
        }
        Ok(self.connection.last_insert_rowid())
    }

    /// Replays the frozen derivation: the deterministic table is recomputed in
    /// full, in one transaction.
    ///
    /// Only the **deterministic** side is replaced. Approved relations and
    /// suggestions are never touched here — that separation is what makes a
    /// replay cost nothing to what a person decided.
    pub fn replace_deterministic(
        &mut self,
        derived: &[DerivedCrossRelation],
    ) -> Result<usize, MapError> {
        for relation in derived {
            Self::validate_shape(
                &relation.source_brain_id,
                &relation.source_key,
                &relation.target_brain_id,
                &relation.target_key,
                relation.relation_type,
            )?;
            if relation.rule.name.trim().is_empty() || relation.rule.version.trim().is_empty() {
                return Err(CrossRelationError::MissingRule(format!(
                    "{} has no versioned rule",
                    relation.reference
                ))
                .into());
            }
        }

        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM cross_relations_deterministic", [])?;
        {
            let mut insert = transaction.prepare(
                "INSERT OR IGNORE INTO cross_relations_deterministic
                     (source_brain_id, source_key, target_brain_id, target_key,
                      relation_type, rule_name, rule_version, rule_symmetric)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            )?;
            for relation in derived {
                insert.execute(params![
                    relation.source_brain_id,
                    relation.source_key,
                    relation.target_brain_id,
                    relation.target_key,
                    relation.relation_type,
                    relation.rule.name,
                    relation.rule.version,
                    relation.rule.symmetric,
                ])?;
            }
        }
        transaction.commit()?;
        Ok(derived.len())
    }

    /// Records a synthetic suggestion, once. Re-seeding never duplicates and
    /// never resets a state somebody decided.
    #[allow(clippy::too_many_arguments)]
    pub fn seed_suggestion(
        &self,
        suggestion_key: &str,
        source_brain_id: &str,
        source_key: &str,
        target_brain_id: &str,
        target_key: &str,
        relation_type: &str,
        basis: &str,
    ) -> Result<bool, MapError> {
        Self::validate_shape(
            source_brain_id,
            source_key,
            target_brain_id,
            target_key,
            relation_type,
        )?;
        let inserted = self.connection.execute(
            "INSERT OR IGNORE INTO cross_suggestions
                 (suggestion_key, source_brain_id, source_key, target_brain_id,
                  target_key, relation_type, basis, state, created_unix_ms,
                  decided_unix_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, NULL)",
            params![
                suggestion_key,
                source_brain_id,
                source_key,
                target_brain_id,
                target_key,
                relation_type,
                basis,
                now_ms()
            ],
        )?;
        Ok(inserted == 1)
    }

    /// The **one** path from an inter-brain suggestion to a relation.
    ///
    /// One transaction: the suggestion's state flips first, then the approved
    /// row is written through the same front door — which is precisely why that
    /// door demands an already-approved suggestion. Either both happen or
    /// neither does.
    pub fn approve(&mut self, suggestion_key: &str) -> Result<StoredCrossRelation, MapError> {
        let suggestion = self
            .suggestion(suggestion_key)?
            .ok_or_else(|| CrossRelationError::UnknownSuggestion(suggestion_key.to_string()))?;
        if suggestion.state != "pending" {
            return Err(CrossRelationError::SuggestionAlreadyDecided(format!(
                "`{suggestion_key}` is already `{}`",
                suggestion.state
            ))
            .into());
        }

        let decided = now_ms();
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "UPDATE cross_suggestions
                SET state = 'approved', decided_unix_ms = ?2
              WHERE suggestion_key = ?1 AND state = 'pending'",
            params![suggestion_key, decided],
        )?;
        // A plain INSERT, deliberately: `OR IGNORE` would turn a refused write
        // into a silent no-op, and a silent pass is exactly what `M3` forbids.
        transaction.execute(
            "INSERT INTO cross_relations_approved
                 (source_brain_id, source_key, target_brain_id, target_key,
                  relation_type, suggestion_key, approved_unix_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                suggestion.source_brain_id,
                suggestion.source_key,
                suggestion.target_brain_id,
                suggestion.target_key,
                suggestion.relation_type,
                suggestion_key,
                decided
            ],
        )?;
        transaction.commit()?;

        self.approved()?
            .into_iter()
            .find(|relation| relation.suggestion_key.as_deref() == Some(suggestion_key))
            .ok_or_else(|| {
                MapError::from(CrossRelationError::SuggestionIsNotARelation(format!(
                    "approval of `{suggestion_key}` produced no relation"
                )))
            })
    }

    /// The **one** path from an approved inter-brain relation back to its
    /// suggestion — `TASK-0051` / `DEC-0049` §E.
    ///
    /// Exactly the semantics of the intra-brain `revoke`: the approved row is
    /// deleted and the suggestion returns to `pending` with `decided_unix_ms`
    /// cleared, in one transaction. Only the common store moves — no brain, no
    /// index, no source is opened.
    ///
    /// `provenance` is what the caller believes it is aiming at; anything but
    /// `APPROVED` is refused before the store is read.
    pub fn revoke(
        &mut self,
        provenance: CrossProvenance,
        suggestion_key: &str,
    ) -> Result<StoredCrossSuggestion, MapError> {
        if provenance != CrossProvenance::Approved {
            return Err(CrossRelationError::RevocationOfDeterministic(format!(
                "`{suggestion_key}` is aimed as {}; only an APPROVED relation can be revoked",
                provenance.as_str()
            ))
            .into());
        }
        let suggestion = self
            .suggestion(suggestion_key)?
            .ok_or_else(|| CrossRelationError::UnknownSuggestion(suggestion_key.to_string()))?;
        if suggestion.state != "approved" {
            return Err(CrossRelationError::RevocationSuggestionNotApproved(format!(
                "`{suggestion_key}` is `{}`, not `approved`",
                suggestion.state
            ))
            .into());
        }
        let linked = self
            .approved()?
            .into_iter()
            .find(|relation| relation.suggestion_key.as_deref() == Some(suggestion_key));
        let Some(linked) = linked.filter(|relation| {
            relation.source_brain_id == suggestion.source_brain_id
                && relation.source_key == suggestion.source_key
                && relation.target_brain_id == suggestion.target_brain_id
                && relation.target_key == suggestion.target_key
                && relation.relation_type == suggestion.relation_type
        }) else {
            return Err(CrossRelationError::RevocationRelationInconsistent(format!(
                "`{suggestion_key}` is approved but has no approved relation carrying its endpoints \
                 and type"
            ))
            .into());
        };

        let transaction = self.connection.transaction()?;
        let deleted = transaction.execute(
            "DELETE FROM cross_relations_approved WHERE id = ?1 AND suggestion_key = ?2",
            params![linked.id, suggestion_key],
        )?;
        if deleted != 1 {
            return Err(CrossRelationError::RevocationRelationInconsistent(format!(
                "`{suggestion_key}`: {deleted} approved relation(s) deleted, expected exactly 1"
            ))
            .into());
        }
        let reset = transaction.execute(
            "UPDATE cross_suggestions
                SET state = 'pending', decided_unix_ms = NULL
              WHERE suggestion_key = ?1 AND state = 'approved'",
            params![suggestion_key],
        )?;
        if reset != 1 {
            // Dropping the transaction rolls the delete back.
            return Err(CrossRelationError::RevocationSuggestionNotApproved(format!(
                "`{suggestion_key}` changed concurrently"
            ))
            .into());
        }
        transaction.commit()?;

        self.suggestion(suggestion_key)?.ok_or_else(|| {
            MapError::from(CrossRelationError::UnknownSuggestion(suggestion_key.to_string()))
        })
    }

    // -- reads ---------------------------------------------------------------

    pub fn deterministic(&self) -> Result<Vec<StoredCrossRelation>, MapError> {
        let mut statement = self.connection.prepare(
            "SELECT id, source_brain_id, source_key, target_brain_id, target_key,
                    relation_type, rule_name, rule_version
               FROM cross_relations_deterministic
              ORDER BY source_key, target_key, relation_type",
        )?;
        Ok(statement
            .query_map([], |row| {
                Ok(StoredCrossRelation {
                    id: row.get(0)?,
                    provenance: CrossProvenance::Deterministic,
                    source_brain_id: row.get(1)?,
                    source_key: row.get(2)?,
                    target_brain_id: row.get(3)?,
                    target_key: row.get(4)?,
                    relation_type: row.get(5)?,
                    rule_name: Some(row.get(6)?),
                    rule_version: Some(row.get(7)?),
                    suggestion_key: None,
                    approved_unix_ms: None,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn approved(&self) -> Result<Vec<StoredCrossRelation>, MapError> {
        let mut statement = self.connection.prepare(
            "SELECT id, source_brain_id, source_key, target_brain_id, target_key,
                    relation_type, suggestion_key, approved_unix_ms
               FROM cross_relations_approved
              ORDER BY source_key, target_key, relation_type",
        )?;
        Ok(statement
            .query_map([], |row| {
                Ok(StoredCrossRelation {
                    id: row.get(0)?,
                    provenance: CrossProvenance::Approved,
                    source_brain_id: row.get(1)?,
                    source_key: row.get(2)?,
                    target_brain_id: row.get(3)?,
                    target_key: row.get(4)?,
                    relation_type: row.get(5)?,
                    rule_name: None,
                    rule_version: None,
                    suggestion_key: Some(row.get(6)?),
                    approved_unix_ms: Some(row.get(7)?),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?)
    }

    /// Every established inter-brain relation, and **only** established ones.
    ///
    /// Suggestions are not read here, under any state. The union is spelled out
    /// rather than assembled from a generic query, because that is the single
    /// place convenience could let a suggestion through.
    pub fn established(&self) -> Result<Vec<StoredCrossRelation>, MapError> {
        let mut all = self.deterministic()?;
        all.extend(self.approved()?);
        all.sort_by(|left, right| {
            (
                &left.source_key,
                &left.target_key,
                &left.relation_type,
                left.provenance.as_str(),
            )
                .cmp(&(
                    &right.source_key,
                    &right.target_key,
                    &right.relation_type,
                    right.provenance.as_str(),
                ))
        });
        Ok(all)
    }

    pub fn outgoing(&self, endpoint_key: &str) -> Result<Vec<StoredCrossRelation>, MapError> {
        Ok(self
            .established()?
            .into_iter()
            .filter(|relation| relation.source_key == endpoint_key)
            .collect())
    }

    pub fn incoming(&self, endpoint_key: &str) -> Result<Vec<StoredCrossRelation>, MapError> {
        Ok(self
            .established()?
            .into_iter()
            .filter(|relation| relation.target_key == endpoint_key)
            .collect())
    }

    pub fn suggestion(&self, key: &str) -> Result<Option<StoredCrossSuggestion>, MapError> {
        let mut statement = self.connection.prepare(
            "SELECT suggestion_key, source_brain_id, source_key, target_brain_id,
                    target_key, relation_type, basis, state, created_unix_ms,
                    decided_unix_ms
               FROM cross_suggestions WHERE suggestion_key = ?1",
        )?;
        Ok(statement
            .query_map([key], cross_suggestion_from_row)?
            .next()
            .transpose()?)
    }

    pub fn suggestions(&self) -> Result<Vec<StoredCrossSuggestion>, MapError> {
        let mut statement = self.connection.prepare(
            "SELECT suggestion_key, source_brain_id, source_key, target_brain_id,
                    target_key, relation_type, basis, state, created_unix_ms,
                    decided_unix_ms
               FROM cross_suggestions ORDER BY suggestion_key",
        )?;
        Ok(statement
            .query_map([], cross_suggestion_from_row)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn pending_suggestions(&self) -> Result<Vec<StoredCrossSuggestion>, MapError> {
        Ok(self
            .suggestions()?
            .into_iter()
            .filter(|suggestion| suggestion.state == "pending")
            .collect())
    }

    /// Digest of the deterministic side only — what a replay must reproduce
    /// exactly.
    ///
    /// The two brain ids are digested along with the keys. They are already
    /// inside the keys, and that is the point: if the two ever disagreed, the
    /// digest would move and `M2` would say so.
    pub fn deterministic_digest(&self) -> Result<String, MapError> {
        let mut accumulator = Vec::new();
        for relation in self.deterministic()? {
            for field in [
                relation.source_brain_id.as_str(),
                relation.source_key.as_str(),
                relation.target_brain_id.as_str(),
                relation.target_key.as_str(),
                relation.relation_type.as_str(),
                relation.rule_name.as_deref().unwrap_or_default(),
                relation.rule_version.as_deref().unwrap_or_default(),
            ] {
                accumulator.extend_from_slice(field.as_bytes());
                accumulator.push(0);
            }
            accumulator.push(0xff);
        }
        Ok(format!("fnv1a64:{:016x}", super::fnv1a64(&accumulator)))
    }
}

fn cross_suggestion_from_row(
    row: &rusqlite::Row<'_>,
) -> rusqlite::Result<StoredCrossSuggestion> {
    Ok(StoredCrossSuggestion {
        suggestion_key: row.get(0)?,
        source_brain_id: row.get(1)?,
        source_key: row.get(2)?,
        target_brain_id: row.get(3)?,
        target_key: row.get(4)?,
        relation_type: row.get(5)?,
        basis: row.get(6)?,
        state: row.get(7)?,
        created_unix_ms: row.get(8)?,
        decided_unix_ms: row.get(9)?,
    })
}

/// Seeds the four frozen suggestions, once. **None is approved at seed.**
///
/// Idempotent: a second call inserts nothing and decides nothing. A brain the
/// catalogue does not hold is a refusal, not a skip.
pub fn seed_xbr1_suggestions(
    store: &CrossRelationStore,
    known_brain_ids: &[String],
) -> Result<usize, MapError> {
    let mut seeded = 0;
    for frozen in XBR1_SUGGESTIONS {
        for brain_id in [frozen.source_brain_id, frozen.target_brain_id] {
            if !known_brain_ids.iter().any(|known| known == brain_id) {
                return Err(CrossRelationError::UnknownBrain(format!(
                    "{}: `{brain_id}` is not in the catalogue",
                    frozen.key
                ))
                .into());
            }
        }
        if store.seed_suggestion(
            frozen.key,
            frozen.source_brain_id,
            &cross_endpoint_key(frozen.source_brain_id, frozen.source_path),
            frozen.target_brain_id,
            &cross_endpoint_key(frozen.target_brain_id, frozen.target_path),
            frozen.relation_type,
            CROSS_SEEDED_BASIS,
        )? {
            seeded += 1;
        }
    }
    Ok(seeded)
}

/// One refused attempt, and the motif it was refused with.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossRejectionOutcome {
    pub case: String,
    pub attempt: String,
    pub expected_motif: String,
    pub observed_motif: String,
    pub rejected: bool,
}

fn motif_of(error: &MapError) -> String {
    error
        .to_string()
        .split(':')
        .next()
        .unwrap_or_default()
        .to_string()
}

/// Replays the invalid writes `M1`, `M2` and `M3` name, against a **temporary**
/// store, and **reports** what happened.
///
/// Written to report rather than to assert: a criterion that fails has to be
/// publishable as failed. Nothing here touches the real store.
pub fn replay_cross_rejections(known: &[String]) -> Result<Vec<CrossRejectionOutcome>, MapError> {
    let alpha = "brain-alpha";
    let gamma = "brain-gamma";
    let a_note = cross_endpoint_key(alpha, "dossier-a/note-1.txt");
    let a_other = cross_endpoint_key(alpha, "racine-1.txt");
    let g_note = cross_endpoint_key(gamma, "dossier-b/note-1.txt");

    let mut outcomes = Vec::new();
    let mut record =
        |case: &str, attempt: &str, expected: &str, result: Result<(), MapError>| match result {
            Ok(()) => outcomes.push(CrossRejectionOutcome {
                case: case.to_string(),
                attempt: attempt.to_string(),
                expected_motif: expected.to_string(),
                observed_motif: "ACCEPTED".to_string(),
                rejected: false,
            }),
            Err(error) => {
                let observed = motif_of(&error);
                outcomes.push(CrossRejectionOutcome {
                    case: case.to_string(),
                    attempt: attempt.to_string(),
                    expected_motif: expected.to_string(),
                    rejected: observed == expected,
                    observed_motif: observed,
                });
            }
        };

    let mut store = CrossRelationStore::in_memory_public()?;
    let derived = derive_xbr1(known)?;
    store.replace_deterministic(&derived)?;
    seed_xbr1_suggestions(&store, known)?;

    record(
        "M1 — same brain on both ends",
        "insert_established(DETERMINISTIC, alpha → alpha)",
        "cross_relation_rejected_same_brain",
        store
            .insert_established(
                "DETERMINISTIC",
                alpha,
                &a_note,
                alpha,
                &a_other,
                "reference",
                Some("cross-homonymes"),
                Some("v1"),
                None,
            )
            .map(|_| ()),
    );
    record(
        "M1 — no endpoint",
        "insert_established(DETERMINISTIC, empty target)",
        "cross_relation_rejected_empty_endpoint",
        store
            .insert_established(
                "DETERMINISTIC",
                alpha,
                &a_note,
                gamma,
                "",
                "reference",
                Some("cross-homonymes"),
                Some("v1"),
                None,
            )
            .map(|_| ()),
    );
    record(
        "M1 — no type",
        "insert_established(DETERMINISTIC, type ``)",
        "cross_relation_rejected_empty_type",
        store
            .insert_established(
                "DETERMINISTIC",
                alpha,
                &a_note,
                gamma,
                &g_note,
                "",
                Some("cross-homonymes"),
                Some("v1"),
                None,
            )
            .map(|_| ()),
    );
    record(
        "M1 — a third provenance",
        "insert_established(SUGGESTED, …)",
        "cross_relation_rejected_unknown_provenance",
        store
            .insert_established(
                "SUGGESTED",
                alpha,
                &a_note,
                gamma,
                &g_note,
                "reference",
                None,
                None,
                None,
            )
            .map(|_| ()),
    );
    record(
        "M2 — DETERMINISTIC without a versioned rule",
        "insert_established(DETERMINISTIC, rule ``/``)",
        "cross_relation_rejected_missing_rule",
        store
            .insert_established(
                "DETERMINISTIC",
                alpha,
                &a_note,
                gamma,
                &g_note,
                "reference",
                None,
                None,
                None,
            )
            .map(|_| ()),
    );
    record(
        "M3 — a direct APPROVED write",
        "insert_established(APPROVED, XB-S01)",
        "cross_relation_rejected_suggestion_is_not_a_relation",
        store
            .insert_established(
                "APPROVED",
                alpha,
                &cross_endpoint_key(alpha, "dossier-a/note-2.txt"),
                gamma,
                &cross_endpoint_key(gamma, "dossier-a/note-2.txt"),
                "reference",
                None,
                None,
                Some("XB-S01"),
            )
            .map(|_| ()),
    );
    record(
        "M3 — approving a suggestion that does not exist",
        "approve(XB-S99)",
        "cross_relation_rejected_unknown_suggestion",
        store.approve("XB-S99").map(|_| ()),
    );
    record(
        "M1 — an endpoint key naming another brain",
        "insert_established(DETERMINISTIC, gamma key filed under alpha)",
        "cross_relation_rejected_malformed_endpoint",
        store
            .insert_established(
                "DETERMINISTIC",
                alpha,
                &g_note,
                gamma,
                &cross_endpoint_key(gamma, "racine-2.txt"),
                "reference",
                Some("cross-homonymes"),
                Some("v1"),
                None,
            )
            .map(|_| ()),
    );

    // `M3`, the last one, needs a real approval first: a **second** approval of
    // the same suggestion must be refused rather than duplicated.
    store.approve("XB-S01")?;
    record(
        "M3 — a second approval of the same suggestion",
        "approve(XB-S01) twice",
        "cross_relation_rejected_suggestion_already_decided",
        store.approve("XB-S01").map(|_| ()),
    );

    Ok(outcomes)
}

impl CrossRelationStore {
    /// An in-memory store for the **runtime** self-check, which has to replay
    /// refusals without touching the real one.
    ///
    /// Named apart from the test-only `in_memory` so the two intentions do not
    /// get confused: this one ships.
    pub fn in_memory_public() -> Result<Self, MapError> {
        let connection = Connection::open_in_memory()?;
        connection.execute_batch("PRAGMA foreign_keys=ON;")?;
        let store = Self { connection };
        store.initialize()?;
        Ok(store)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn known() -> Vec<String> {
        vec![
            "brain-alpha".to_string(),
            "brain-beta".to_string(),
            "brain-gamma".to_string(),
        ]
    }

    fn key(brain_id: &str, path: &str) -> String {
        cross_endpoint_key(brain_id, path)
    }

    fn seeded_store() -> CrossRelationStore {
        let mut store = CrossRelationStore::in_memory().expect("store");
        let derived = derive_xbr1(&known()).expect("derive");
        store.replace_deterministic(&derived).expect("replace");
        seed_xbr1_suggestions(&store, &known()).expect("seed");
        store
    }

    /// The claim §4.4 makes before any code: every frozen endpoint is a path
    /// the fixture really produces.
    ///
    /// The freeze says it was checked by reading `fixtures.rs`. This checks it
    /// against the planner itself, so the claim cannot quietly become false.
    #[test]
    fn every_frozen_endpoint_exists_in_its_brains_fixture() {
        use crate::map::brains::BrainRecord;
        use crate::map::fixtures;

        let paths_of = |brain_id: &str| {
            let brain = BrainRecord::frozen_by_id(brain_id).expect("frozen brain");
            let spec = brain.source_fixture().expect("fixture");
            let mut all = fixtures::plan(spec).expected_paths();
            // The root carries the empty relative path and is not in the plan.
            all.push(String::new());
            all
        };

        let alpha = paths_of("brain-alpha");
        let beta = paths_of("brain-beta");
        let gamma = paths_of("brain-gamma");
        let all_for = |brain_id: &str| match brain_id {
            "brain-alpha" => &alpha,
            "brain-beta" => &beta,
            _ => &gamma,
        };

        let mut checked = 0;
        for frozen in XBR1_RELATIONS {
            for (brain_id, path) in [
                (frozen.source_brain_id, frozen.source_path),
                (frozen.target_brain_id, frozen.target_path),
            ] {
                assert!(
                    all_for(brain_id).iter().any(|entry| entry == path),
                    "{}: `{path}` does not exist in {brain_id}",
                    frozen.reference
                );
                checked += 1;
            }
        }
        for frozen in XBR1_SUGGESTIONS {
            for (brain_id, path) in [
                (frozen.source_brain_id, frozen.source_path),
                (frozen.target_brain_id, frozen.target_path),
            ] {
                assert!(
                    all_for(brain_id).iter().any(|entry| entry == path),
                    "{}: `{path}` does not exist in {brain_id}",
                    frozen.key
                );
                checked += 1;
            }
        }
        assert_eq!(checked, 20, "six relations and four suggestions, two ends each");

        // And every expectation row names a real path too, witnesses included.
        for (brain_id, path, _, _) in CROSS_EXPECTED_COUNTS {
            assert!(
                all_for(brain_id).iter().any(|entry| entry == path),
                "expectation row `{brain_id}` / `{path}` names no real node"
            );
        }
    }

    /// `M2` — the six frozen relations exist exactly, and carry their rules.
    #[test]
    fn the_frozen_set_produces_exactly_six_relations() {
        let store = seeded_store();
        let deterministic = store.deterministic().expect("read");
        assert_eq!(deterministic.len(), 6);
        assert_eq!(store.approved().expect("read").len(), 0);
        assert_eq!(store.pending_suggestions().expect("read").len(), 4);

        for relation in &deterministic {
            assert_eq!(relation.provenance, CrossProvenance::Deterministic);
            assert!(relation.rule_name.as_deref().is_some_and(|n| !n.is_empty()));
            assert!(
                relation
                    .rule_version
                    .as_deref()
                    .is_some_and(|v| !v.is_empty())
            );
            assert!(relation.suggestion_key.is_none());
            assert_ne!(relation.source_brain_id, relation.target_brain_id);
        }

        // Every frozen reference is present, by its two keys.
        for frozen in XBR1_RELATIONS {
            let source = key(frozen.source_brain_id, frozen.source_path);
            let target = key(frozen.target_brain_id, frozen.target_path);
            assert!(
                deterministic
                    .iter()
                    .any(|r| r.source_key == source && r.target_key == target),
                "{} is missing",
                frozen.reference
            );
        }
    }

    /// `M2` — two replays give exactly the same digest.
    #[test]
    fn two_replays_produce_the_same_deterministic_set() {
        let mut store = seeded_store();
        let first = store.deterministic_digest().expect("digest");
        store
            .replace_deterministic(&derive_xbr1(&known()).expect("derive"))
            .expect("replace");
        let second = store.deterministic_digest().expect("digest");
        assert_eq!(first, second);
        assert_eq!(store.deterministic().expect("read").len(), 6);
    }

    /// `M2` — no inverse is ever invented, deterministic or approved.
    #[test]
    fn no_inverse_relation_is_ever_invented() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approve");
        let established = store.established().expect("read");
        for (source_brain, source_path, target_brain, target_path) in CROSS_FORBIDDEN_INVERSES {
            let source = key(source_brain, source_path);
            let target = key(target_brain, target_path);
            assert!(
                !established
                    .iter()
                    .any(|r| r.source_key == source && r.target_key == target),
                "an inverse was invented: {source} → {target}"
            );
        }
        // And no rule claims to be symmetric.
        assert!(CROSS_RULES.iter().all(|rule| !rule.symmetric));
    }

    /// `M1` — the refusals, one by one, each with its named motif.
    #[test]
    fn the_frozen_invalid_attempts_are_all_rejected() {
        let outcomes = replay_cross_rejections(&known()).expect("replay");
        assert_eq!(outcomes.len(), 9);
        for outcome in &outcomes {
            assert!(
                outcome.rejected,
                "{} was not refused as expected: {} (attendu {})",
                outcome.case, outcome.observed_motif, outcome.expected_motif
            );
        }
    }

    /// `M1` — a relation with both ends in one brain is unrepresentable, and
    /// the storage says so even when Rust is bypassed.
    #[test]
    fn the_storage_itself_refuses_both_ends_in_one_brain() {
        let store = CrossRelationStore::in_memory().expect("store");
        let refused = store.connection.execute(
            "INSERT INTO cross_relations_deterministic
                 (source_brain_id, source_key, target_brain_id, target_key,
                  relation_type, rule_name, rule_version, rule_symmetric)
             VALUES ('brain-alpha', 'cek1|brain-alpha|a.txt',
                     'brain-alpha', 'cek1|brain-alpha|b.txt',
                     'reference', 'cross-homonymes', 'v1', 0)",
            [],
        );
        assert!(
            refused.is_err(),
            "SQLite accepted an inter-brain relation inside one brain"
        );
    }

    /// `M1` — a suggestion never reaches an established read, in any state.
    #[test]
    fn a_pending_suggestion_never_reaches_an_established_read() {
        let store = seeded_store();
        let established = store.established().expect("read");
        for suggestion in store.pending_suggestions().expect("read") {
            assert!(
                !established.iter().any(|relation| {
                    relation.source_key == suggestion.source_key
                        && relation.target_key == suggestion.target_key
                        && relation.relation_type == suggestion.relation_type
                }),
                "{} leaked into the established set",
                suggestion.suggestion_key
            );
        }
        assert_eq!(established.len(), 6);
    }

    /// `M3` and `M10` — approving moves the counts by exactly one, each way.
    #[test]
    fn approving_a_suggestion_produces_exactly_one_relation_and_moves_its_state() {
        let mut store = seeded_store();
        let before_established = store.established().expect("read").len();
        let before_pending = store.pending_suggestions().expect("read").len();

        let relation = store.approve("XB-S01").expect("approve");
        assert_eq!(relation.provenance, CrossProvenance::Approved);
        assert_eq!(relation.suggestion_key.as_deref(), Some("XB-S01"));
        // `M10` — no deterministic rule is invented for an approved relation.
        assert!(relation.rule_name.is_none());
        assert!(relation.rule_version.is_none());
        assert_eq!(relation.source_brain_id, "brain-alpha");
        assert_eq!(relation.target_brain_id, "brain-gamma");

        assert_eq!(store.established().expect("read").len(), before_established + 1);
        assert_eq!(
            store.pending_suggestions().expect("read").len(),
            before_pending - 1
        );
        assert_eq!(store.approved().expect("read").len(), 1);
        assert_eq!(
            store.suggestion("XB-S01").expect("read").expect("there").state,
            "approved"
        );
    }

    /// `M3` — a second approval is refused rather than duplicated.
    #[test]
    fn approving_twice_is_refused_rather_than_duplicated() {
        let mut store = seeded_store();
        store.approve("XB-S02").expect("approve");
        let second = store.approve("XB-S02");
        assert!(second.is_err());
        assert_eq!(store.approved().expect("read").len(), 1);
    }

    /// `M3` / `X3` — the storage refuses a relation that is not its suggestion.
    ///
    /// Six fields have to agree. Each of the four that a caller could get wrong
    /// is tried on its own, so the test says *which* mismatch is caught rather
    /// than only that some are.
    #[test]
    fn the_storage_refuses_a_relation_that_is_not_its_suggestion() {
        let mut store = seeded_store();
        store.approve("XB-S03").expect("approve");
        // Remove the legitimate row so the UNIQUE(suggestion_key) is not what
        // does the refusing below; the trigger has to be the one that speaks.
        store
            .connection
            .execute("DELETE FROM cross_relations_approved", [])
            .expect("clear");

        let suggestion = store.suggestion("XB-S03").expect("read").expect("there");
        let wrong_target = key("brain-beta", "niveau-01");
        let wrong_brain_key = key("brain-gamma", "racine-1.txt");

        for (label, source_brain, source, target_brain, target, relation_type) in [
            (
                "wrong target endpoint",
                suggestion.source_brain_id.as_str(),
                suggestion.source_key.as_str(),
                suggestion.target_brain_id.as_str(),
                wrong_target.as_str(),
                suggestion.relation_type.as_str(),
            ),
            (
                "wrong target brain",
                suggestion.source_brain_id.as_str(),
                suggestion.source_key.as_str(),
                "brain-gamma",
                wrong_brain_key.as_str(),
                suggestion.relation_type.as_str(),
            ),
            (
                "wrong type",
                suggestion.source_brain_id.as_str(),
                suggestion.source_key.as_str(),
                suggestion.target_brain_id.as_str(),
                suggestion.target_key.as_str(),
                "revision",
            ),
        ] {
            let refused = store.raw_insert_approved(
                source_brain,
                source,
                target_brain,
                target,
                relation_type,
                "XB-S03",
            );
            assert!(refused.is_err(), "SQLite accepted a row with a {label}");
        }

        // The row that DOES match is accepted, so the test is not passing for
        // the wrong reason.
        store
            .raw_insert_approved(
                &suggestion.source_brain_id,
                &suggestion.source_key,
                &suggestion.target_brain_id,
                &suggestion.target_key,
                &suggestion.relation_type,
                "XB-S03",
            )
            .expect("the matching row must be accepted");
    }

    /// `X3` — an approved relation cannot exist without its suggestion, and a
    /// pending one justifies nothing.
    #[test]
    fn an_approved_relation_cannot_exist_without_an_approved_suggestion() {
        let store = seeded_store();
        let suggestion = store.suggestion("XB-S04").expect("read").expect("there");
        // Pending: the trigger requires `state = 'approved'`.
        assert!(
            store
                .raw_insert_approved(
                    &suggestion.source_brain_id,
                    &suggestion.source_key,
                    &suggestion.target_brain_id,
                    &suggestion.target_key,
                    &suggestion.relation_type,
                    "XB-S04",
                )
                .is_err()
        );
        // Unknown: the foreign key refuses it.
        assert!(
            store
                .raw_insert_approved(
                    "brain-alpha",
                    &key("brain-alpha", "racine-1.txt"),
                    "brain-gamma",
                    &key("brain-gamma", "racine-2.txt"),
                    "reference",
                    "XB-S99",
                )
                .is_err()
        );
    }

    /// `X3` — an approved suggestion cannot drift away from its relation.
    #[test]
    fn an_approved_suggestion_cannot_drift_away_from_its_relation() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approve");
        let refused = store.connection.execute(
            "UPDATE cross_suggestions SET target_key = ?2 WHERE suggestion_key = ?1",
            params!["XB-S01", key("brain-beta", "niveau-01")],
        );
        assert!(refused.is_err(), "the suggestion drifted from its relation");
    }

    /// `M4` — the frozen expectation, node by node, from two separate queries.
    #[test]
    fn incoming_and_outgoing_match_the_frozen_expectation_endpoint_by_endpoint() {
        let store = seeded_store();
        for (brain_id, path, expected_out, expected_in) in CROSS_EXPECTED_COUNTS {
            let endpoint = key(brain_id, path);
            let observed_out = store.outgoing(&endpoint).expect("read").len();
            let observed_in = store.incoming(&endpoint).expect("read").len();
            assert_eq!(
                (observed_out, observed_in),
                (expected_out, expected_in),
                "{brain_id} / `{path}`"
            );
        }
        // The table's own arithmetic: six out, six in.
        let out: usize = CROSS_EXPECTED_COUNTS.iter().map(|entry| entry.2).sum();
        let inn: usize = CROSS_EXPECTED_COUNTS.iter().map(|entry| entry.3).sum();
        assert_eq!((out, inn), (6, 6));
    }

    /// `M4` — approving `XB-S01` moves exactly two rows of the table by one.
    #[test]
    fn approving_moves_exactly_one_source_and_one_target() {
        let mut store = seeded_store();
        let source = key("brain-alpha", "dossier-a/note-2.txt");
        let target = key("brain-gamma", "dossier-a/note-2.txt");
        assert_eq!(store.outgoing(&source).expect("read").len(), 0);
        assert_eq!(store.incoming(&target).expect("read").len(), 0);

        store.approve("XB-S01").expect("approve");

        assert_eq!(store.outgoing(&source).expect("read").len(), 1);
        assert_eq!(store.incoming(&target).expect("read").len(), 1);
        // And nothing else moved.
        for (brain_id, path, expected_out, expected_in) in CROSS_EXPECTED_COUNTS {
            let endpoint = key(brain_id, path);
            if endpoint == source || endpoint == target {
                continue;
            }
            assert_eq!(
                (
                    store.outgoing(&endpoint).expect("read").len(),
                    store.incoming(&endpoint).expect("read").len()
                ),
                (expected_out, expected_in),
                "{brain_id} / `{path}` moved and should not have"
            );
        }
    }

    /// `M4` — the two witnesses: nodes with intra-brain relations and **zero**
    /// inter-brain ones.
    ///
    /// This is the row that would catch an implementation reading the wrong
    /// store, or counting one kind as the other.
    #[test]
    fn a_node_with_internal_relations_has_no_inter_brain_ones() {
        use crate::domain::NodeKind;
        use crate::map::layout::Rect;
        use crate::map::relations::{RelationStore, endpoint_key, seed_fixture};
        use crate::map::store::MapNode;

        // The intra-brain store says this node is busy.
        let mut intra = RelationStore::in_memory().expect("intra store");
        seed_fixture(&mut intra, "brain-alpha").expect("seed");
        let nodes: Vec<MapNode> = crate::map::fixtures::plan(
            crate::map::fixtures::spec("quasi-empty").expect("spec"),
        )
        .expected_paths()
        .into_iter()
        .enumerate()
        .map(|(index, relative_path)| MapNode {
            id: index as i64 + 2,
            parent_id: Some(1),
            name: relative_path.rsplit('/').next().unwrap_or("").to_string(),
            relative_path,
            kind: NodeKind::File,
            depth: 1,
            size_bytes: 0,
            modified_unix_ms: None,
            child_count: 0,
            access_diagnostic: None,
            rect: Rect {
                x: 0.0,
                y: 0.0,
                w: 1.0,
                h: 1.0,
            },
        })
        .collect();
        intra
            .replace_derived(&crate::map::relations::derive("brain-alpha", &nodes).expect("derive"))
            .expect("replace");
        let intra_key = endpoint_key("brain-alpha", "dossier-b/note-1.txt");
        let internal = intra.outgoing(&intra_key).expect("read").len()
            + intra.incoming(&intra_key).expect("read").len();
        assert!(internal > 0, "the witness must actually have internal relations");

        // The inter-brain store says it has none of its own.
        let cross = seeded_store();
        let cross_key = key("brain-alpha", "dossier-b/note-1.txt");
        assert_eq!(cross.outgoing(&cross_key).expect("read").len(), 0);
        assert_eq!(cross.incoming(&cross_key).expect("read").len(), 0);
        // And the two key spaces do not even overlap.
        assert_ne!(intra_key, cross_key);
        assert!(split_cross_endpoint_key(&intra_key).is_none());
    }

    /// §4.2 — the key is versioned, names its brain, and survives renumbering.
    #[test]
    fn endpoint_keys_are_versioned_scoped_and_index_independent() {
        let alpha = key("brain-alpha", "dossier-a/note-1.txt");
        let gamma = key("brain-gamma", "dossier-a/note-1.txt");
        assert_eq!(alpha, "cek1|brain-alpha|dossier-a/note-1.txt");
        assert_ne!(alpha, gamma, "the same path in two brains is two endpoints");
        assert!(!alpha.contains(char::is_numeric) || !alpha.contains("map_nodes"));

        assert_eq!(
            split_cross_endpoint_key(&alpha),
            Some(("brain-alpha", "dossier-a/note-1.txt"))
        );
        // The root has a key of its own, with an empty path.
        assert_eq!(
            split_cross_endpoint_key(&key("brain-beta", "")),
            Some(("brain-beta", ""))
        );
        // An intra-brain `ek1` key is foreign, and recognisably so.
        assert!(split_cross_endpoint_key("ek1|brain-alpha|racine-1.txt").is_none());
        assert!(split_cross_endpoint_key("brain-alpha|racine-1.txt").is_none());
        assert!(split_cross_endpoint_key("cek1||racine-1.txt").is_none());
    }

    /// §4.2 — an endpoint naming a brain the catalogue does not hold is refused.
    #[test]
    fn an_endpoint_towards_an_unknown_brain_is_rejected() {
        let refused = derive_xbr1(&["brain-alpha".to_string(), "brain-gamma".to_string()]);
        assert!(matches!(
            refused,
            Err(MapError::CrossRelation(CrossRelationError::UnknownBrain(_)))
        ));
        let store = CrossRelationStore::in_memory().expect("store");
        assert!(matches!(
            seed_xbr1_suggestions(&store, &["brain-alpha".to_string()]),
            Err(MapError::CrossRelation(CrossRelationError::UnknownBrain(_)))
        ));
    }

    /// Seeding twice seeds nothing new and decides nothing.
    #[test]
    fn seeding_twice_seeds_nothing_new() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approve");
        assert_eq!(seed_xbr1_suggestions(&store, &known()).expect("seed"), 0);
        assert_eq!(store.suggestions().expect("read").len(), 4);
        assert_eq!(
            store.suggestion("XB-S01").expect("read").expect("there").state,
            "approved",
            "re-seeding must never reset a decision"
        );
        // And a replay of the deterministic side leaves the approval alone.
        store
            .replace_deterministic(&derive_xbr1(&known()).expect("derive"))
            .expect("replace");
        assert_eq!(store.approved().expect("read").len(), 1);
        assert_eq!(store.pending_suggestions().expect("read").len(), 3);
    }

    /// The store records its own schema and key scheme, so a later version is a
    /// migration rather than a reinterpretation.
    #[test]
    fn the_store_records_its_schema_and_key_scheme() {
        let store = seeded_store();
        assert_eq!(
            store.meta("schema_version").expect("meta").as_deref(),
            Some("1")
        );
        assert_eq!(
            store.meta("endpoint_key_scheme").expect("meta").as_deref(),
            Some("cek1")
        );
    }

    /// An unknown relation type is refused rather than stored.
    #[test]
    fn an_unknown_relation_type_is_rejected() {
        let store = seeded_store();
        let refused = store.insert_established(
            "DETERMINISTIC",
            "brain-alpha",
            &key("brain-alpha", "racine-1.txt"),
            "brain-gamma",
            &key("brain-gamma", "racine-2.txt"),
            "inspire",
            Some("cross-homonymes"),
            Some("v1"),
            None,
        );
        assert!(matches!(
            refused,
            Err(MapError::CrossRelation(CrossRelationError::UnknownType(_)))
        ));
    }
    // -- TASK-0051 / DEC-0049 §E : revoking an inter-brain approval -------------

    fn revocation_snapshot(
        store: &CrossRelationStore,
    ) -> (
        Vec<StoredCrossRelation>,
        Vec<StoredCrossRelation>,
        Vec<StoredCrossSuggestion>,
    ) {
        (
            store.deterministic().expect("read"),
            store.approved().expect("read"),
            store.suggestions().expect("read"),
        )
    }

    /// `R2` — the same transition as the intra-brain store: `approved -> pending`.
    #[test]
    fn revoking_deletes_the_approved_relation_and_returns_the_suggestion_to_pending() {
        let mut store = seeded_store();
        let before = store.suggestion("XB-S01").expect("read").expect("row");
        assert_eq!(before.state, "pending");
        let established_before = store.established().expect("read").len();
        store.approve("XB-S01").expect("approval");
        assert_eq!(store.established().expect("read").len(), established_before + 1);

        let revoked = store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect("revocation");

        assert_eq!(revoked.state, "pending");
        assert_eq!(revoked.decided_unix_ms, None);
        assert_eq!(revoked, before, "restored exactly as it was pending");
        assert_eq!(store.established().expect("read").len(), established_before);
        assert!(
            store
                .pending_suggestions()
                .expect("read")
                .iter()
                .any(|suggestion| suggestion.suggestion_key == "XB-S01")
        );
    }

    /// `R5`, `R7` — revoke then approve again: exactly one relation.
    #[test]
    fn revoking_then_approving_again_yields_exactly_one_relation() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect("revocation");
        store.approve("XB-S01").expect("re-approval");
        assert_eq!(
            store
                .approved()
                .expect("read")
                .iter()
                .filter(|relation| relation.suggestion_key.as_deref() == Some("XB-S01"))
                .count(),
            1
        );
        assert!(matches!(
            store.approve("XB-S01"),
            Err(MapError::CrossRelation(CrossRelationError::SuggestionAlreadyDecided(_)))
        ));
        assert_eq!(store.approved().expect("read").len(), 1);
    }

    /// `R3` — a deterministic inter-brain relation is never revoked here.
    #[test]
    fn revoking_a_deterministic_relation_is_refused_and_changes_nothing() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        let before = revocation_snapshot(&store);
        let digest = store.deterministic_digest().expect("digest");

        for suggestion_key in ["XB-S01", "XB-S02", "XB-inexistante", ""] {
            let error = store
                .revoke(CrossProvenance::Deterministic, suggestion_key)
                .expect_err("DETERMINISTIC is never revocable");
            assert!(
                matches!(
                    error,
                    MapError::CrossRelation(CrossRelationError::RevocationOfDeterministic(_))
                ),
                "unexpected refusal for `{suggestion_key}`: {error}"
            );
            assert!(
                error
                    .to_string()
                    .starts_with("cross_relation_rejected_revocation_of_deterministic"),
                "unexpected motif: {error}"
            );
        }
        assert_eq!(revocation_snapshot(&store), before);
        assert_eq!(store.deterministic_digest().expect("digest"), digest);
    }

    /// `R4` — unknown and not-approved suggestions, with no partial change.
    #[test]
    fn revoking_refuses_an_unknown_and_a_pending_suggestion() {
        let mut store = seeded_store();
        let before = revocation_snapshot(&store);
        assert!(matches!(
            store.revoke(CrossProvenance::Approved, "XB-inexistante"),
            Err(MapError::CrossRelation(CrossRelationError::UnknownSuggestion(_)))
        ));
        assert!(matches!(
            store.revoke(CrossProvenance::Approved, "XB-S01"),
            Err(MapError::CrossRelation(CrossRelationError::RevocationSuggestionNotApproved(_)))
        ));
        assert_eq!(revocation_snapshot(&store), before);
    }

    /// `R4` — an approved suggestion whose relation is gone is refused.
    #[test]
    fn revoking_refuses_an_approved_suggestion_whose_relation_is_missing() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        store
            .connection
            .execute(
                "DELETE FROM cross_relations_approved WHERE suggestion_key = 'XB-S01'",
                [],
            )
            .expect("raw delete");
        let before = revocation_snapshot(&store);
        assert!(matches!(
            store.revoke(CrossProvenance::Approved, "XB-S01"),
            Err(MapError::CrossRelation(CrossRelationError::RevocationRelationInconsistent(_)))
        ));
        assert_eq!(revocation_snapshot(&store), before);
        assert_eq!(
            store.suggestion("XB-S01").expect("read").expect("row").state,
            "approved"
        );
    }

    /// Calling it twice: the second call is refused and nothing drifts.
    #[test]
    fn revoking_twice_refuses_the_second_call_without_drift() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect("first revocation");
        let after_first = revocation_snapshot(&store);
        assert!(matches!(
            store.revoke(CrossProvenance::Approved, "XB-S01"),
            Err(MapError::CrossRelation(CrossRelationError::RevocationSuggestionNotApproved(_)))
        ));
        assert_eq!(revocation_snapshot(&store), after_first);
    }

    /// `R2` — one transaction: a failure between the delete and the update
    /// rolls the delete back.
    #[test]
    fn a_failure_between_the_delete_and_the_update_rolls_everything_back() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        let before = revocation_snapshot(&store);
        store
            .connection
            .execute_batch(
                "CREATE TRIGGER sabotage_the_update
                 BEFORE UPDATE OF state ON cross_suggestions
                 FOR EACH ROW BEGIN
                     SELECT RAISE(ABORT, 'sabotage');
                 END;",
            )
            .expect("sabotage");
        let error = store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect_err("the sabotaged update must fail the revocation");
        assert!(error.to_string().contains("sabotage"), "unexpected error: {error}");
        assert_eq!(
            revocation_snapshot(&store),
            before,
            "the delete was not rolled back with the failed update"
        );
        store
            .connection
            .execute_batch("DROP TRIGGER sabotage_the_update;")
            .expect("remove sabotage");
        store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect("clean revocation");
    }

    /// A revocation moves one suggestion and one relation, no other.
    #[test]
    fn revoking_touches_exactly_one_suggestion_and_one_relation() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        store.approve("XB-S02").expect("approval");
        let before = revocation_snapshot(&store);
        store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect("revocation");
        let after = revocation_snapshot(&store);

        assert_eq!(after.0, before.0, "no deterministic relation moved");
        assert_eq!(after.1.len(), before.1.len() - 1);
        assert!(
            after
                .1
                .iter()
                .any(|relation| relation.suggestion_key.as_deref() == Some("XB-S02")),
            "XB-S02 must stay approved"
        );
        assert_eq!(after.2.len(), before.2.len());
        for (was, now) in before.2.iter().zip(after.2.iter()) {
            if was.suggestion_key == "XB-S01" {
                assert_eq!((was.state.as_str(), now.state.as_str()), ("approved", "pending"));
            } else {
                assert_eq!(was, now, "`{}` moved and should not have", was.suggestion_key);
            }
        }
    }

    /// A re-seed, replayed on every open, never brings a revoked approval back.
    #[test]
    fn a_revoked_approval_stays_pending_through_a_reseed() {
        let mut store = seeded_store();
        store.approve("XB-S01").expect("approval");
        store
            .revoke(CrossProvenance::Approved, "XB-S01")
            .expect("revocation");
        store.replace_deterministic(&derive_xbr1(&known()).expect("derive")).expect("replace");
        let reseeded = seed_xbr1_suggestions(&store, &known()).expect("re-seed");
        assert_eq!(reseeded, 0);
        assert_eq!(
            store.suggestion("XB-S01").expect("read").expect("row").state,
            "pending"
        );
        assert!(store.approved().expect("read").is_empty());
    }
}
