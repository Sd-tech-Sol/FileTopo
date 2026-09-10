//! Exact, dated observations of indexed file bytes — `TASK-0023`.
//!
//! This module deliberately stops before relations. A SHA-256 digest is an
//! observed fact about bytes read during one campaign. It is not a physical
//! identity, a copy claim, a version, a suggestion or a `RelationEdge`.

use super::brains::{BrainNodeRef, BrainRecord};
use super::fixtures;
use super::sandbox::SandboxPaths;
use super::store::MapNode;
use super::{MapError, commands};
use crate::domain::NodeKind;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fmt::Write as _;
#[cfg(windows)]
use std::fs::OpenOptions;
use std::fs::{self, File, Metadata};
use std::io::{self, Read};
use std::path::{Component, Path, PathBuf};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub const CONTENT_SIGNALS_SCHEMA_VERSION: i64 = 1;
pub const SIGNAL_ENGINE_VERSION: &str = "sha256-v1";
pub const HASH_ALGORITHM: &str = SIGNAL_ENGINE_VERSION;
pub const HASH_BUFFER_BYTES: usize = 64 * 1024;
pub const MAX_EXACT_DUPLICATE_PAGE_LIMIT: usize = 100;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ObservationStatus {
    Hashed,
    Unreadable,
    UnstableDuringRead,
    Unsupported,
}

impl ObservationStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Hashed => "HASHED",
            Self::Unreadable => "UNREADABLE",
            Self::UnstableDuringRead => "UNSTABLE_DURING_READ",
            Self::Unsupported => "UNSUPPORTED",
        }
    }

    fn parse(value: &str) -> Result<Self, rusqlite::Error> {
        match value {
            "HASHED" => Ok(Self::Hashed),
            "UNREADABLE" => Ok(Self::Unreadable),
            "UNSTABLE_DURING_READ" => Ok(Self::UnstableDuringRead),
            "UNSUPPORTED" => Ok(Self::Unsupported),
            _ => Err(rusqlite::Error::InvalidQuery),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentObservation {
    pub relative_path: String,
    pub size_bytes: u64,
    pub modified_unix_ms: Option<i64>,
    pub observation_status: ObservationStatus,
    pub hash_algorithm: Option<String>,
    pub hash_hex: Option<String>,
    pub observed_at_unix_ms: i64,
    pub generation_id: String,
    pub diagnostic: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentObservationSummary {
    pub brain_id: String,
    pub store_path: String,
    pub schema_version: i64,
    pub signal_engine_version: String,
    pub current_generation_id: Option<String>,
    pub current_generation_observed_at: Option<i64>,
    pub source_fingerprint: Option<String>,
    pub observation_count: usize,
    pub hashed_count: usize,
    pub unreadable_count: usize,
    pub unstable_count: usize,
    pub unsupported_count: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentObservationReport {
    pub brain_id: String,
    pub store_path: String,
    pub schema_version: i64,
    pub signal_engine_version: String,
    pub generation_id: String,
    pub observed_at: i64,
    pub source_fingerprint_before: String,
    pub source_fingerprint_after: String,
    pub source_stable: bool,
    pub indexed_file_count: usize,
    pub hashed_count: usize,
    pub unreadable_count: usize,
    pub unstable_count: usize,
    pub unsupported_count: usize,
    pub files_opened_for_hash: usize,
    pub bytes_read: u64,
    pub digests_computed: usize,
    pub hash_algorithm: String,
    pub read_only_confirmed: bool,
    pub duration_ms: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExactDuplicateAvailability {
    NotObserved,
    Available,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExactDuplicateSummary {
    pub brain_id: String,
    pub availability: ExactDuplicateAvailability,
    pub generation_id: Option<String>,
    pub observed_at_unix_ms: Option<i64>,
    pub hash_algorithm: String,
    pub exact_group_count: usize,
    pub grouped_occurrence_count: usize,
    pub empty_group_count: usize,
    pub query_duration_ms: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExactDuplicateGroup {
    pub group_id: String,
    pub hash_algorithm: String,
    pub hash_hex: String,
    pub size_bytes: u64,
    pub member_count: usize,
    pub empty_content: bool,
    pub generation_id: String,
    pub observed_at_unix_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExactDuplicateGroupPage {
    pub brain_id: String,
    pub availability: ExactDuplicateAvailability,
    pub generation_id: Option<String>,
    pub observed_at_unix_ms: Option<i64>,
    pub hash_algorithm: String,
    pub total_groups: usize,
    pub offset: usize,
    pub limit: usize,
    pub max_limit: usize,
    pub returned: usize,
    pub has_more: bool,
    pub order: String,
    pub query_duration_ms: f64,
    pub groups: Vec<ExactDuplicateGroup>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExactDuplicateMember {
    pub relative_path: String,
    pub name: String,
    pub size_bytes: u64,
    pub observation_status: ObservationStatus,
    pub hash_algorithm: String,
    pub hash_hex: String,
    pub observed_at_unix_ms: i64,
    pub generation_id: String,
    pub node_ref: Option<BrainNodeRef>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExactDuplicateMemberPage {
    pub brain_id: String,
    pub group_id: String,
    pub generation_id: String,
    pub observed_at_unix_ms: i64,
    pub hash_algorithm: String,
    pub hash_hex: String,
    pub total_members: usize,
    pub unresolved_returned: usize,
    pub offset: usize,
    pub limit: usize,
    pub max_limit: usize,
    pub returned: usize,
    pub has_more: bool,
    pub order: String,
    pub query_duration_ms: f64,
    pub members: Vec<ExactDuplicateMember>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task0026Ed15Preparation {
    pub source_id: String,
    pub total_files: usize,
    pub expected_groups: usize,
    pub expected_grouped_occurrences: usize,
    pub expected_empty_members: usize,
    pub map_node_count: usize,
    pub report: ContentObservationReport,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum ObservationEvent {
    BeforeConfinedFileOpen {
        relative_path: String,
    },
    DirectoryPinned {
        relative_path: String,
    },
    AfterChunk {
        relative_path: String,
        bytes_read: u64,
    },
    BeforeFingerprintAfter,
    BeforeCommit,
}

#[derive(Default)]
struct CampaignCounters {
    files_opened_for_hash: usize,
    bytes_read: u64,
    digests_computed: usize,
}

pub struct ContentSignalStore {
    connection: Connection,
}

impl ContentSignalStore {
    pub fn open(path: &Path) -> Result<Self, MapError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
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
    fn in_memory() -> Result<Self, MapError> {
        let connection = Connection::open_in_memory()?;
        let store = Self { connection };
        store.initialize()?;
        Ok(store)
    }

    fn initialize(&self) -> Result<(), MapError> {
        let version: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version != 0 && version != CONTENT_SIGNALS_SCHEMA_VERSION {
            return Err(MapError::ContentObservation(format!(
                "unsupported_content_signals_schema:{version}"
            )));
        }
        self.connection.execute_batch(&format!(
            "CREATE TABLE IF NOT EXISTS metadata (
                 key TEXT PRIMARY KEY,
                 value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS content_observations (
                 relative_path TEXT PRIMARY KEY
                   CHECK(length(relative_path) > 0)
                   CHECK(substr(relative_path, 1, 1) <> '/')
                   CHECK(substr(relative_path, 1, 1) <> '\\')
                   CHECK(instr(relative_path, '\\') = 0),
                 size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
                 modified_unix_ms INTEGER,
                 observation_status TEXT NOT NULL
                   CHECK(observation_status IN
                     ('HASHED','UNREADABLE','UNSTABLE_DURING_READ','UNSUPPORTED')),
                 hash_algorithm TEXT,
                 hash_hex TEXT,
                 observed_at_unix_ms INTEGER NOT NULL CHECK(observed_at_unix_ms >= 0),
                 generation_id TEXT NOT NULL CHECK(length(generation_id) > 0),
                 diagnostic TEXT,
                 CHECK(
                   (observation_status = 'HASHED'
                    AND hash_algorithm = '{SIGNAL_ENGINE_VERSION}'
                    AND hash_hex IS NOT NULL
                    AND length(hash_hex) = 64
                    AND hash_hex = lower(hash_hex)
                    AND hash_hex NOT GLOB '*[^0-9a-f]*'
                    AND diagnostic IS NULL)
                   OR
                   (observation_status <> 'HASHED'
                    AND hash_algorithm IS NULL
                    AND hash_hex IS NULL)
                 )
             );
             CREATE INDEX IF NOT EXISTS idx_content_observations_digest
               ON content_observations(hash_algorithm, hash_hex)
               WHERE observation_status = 'HASHED';
             PRAGMA user_version={CONTENT_SIGNALS_SCHEMA_VERSION};"
        ))?;
        self.put_meta(
            "schema_version",
            &CONTENT_SIGNALS_SCHEMA_VERSION.to_string(),
        )?;
        self.put_meta("signal_engine_version", SIGNAL_ENGINE_VERSION)?;
        Ok(())
    }

    fn put_meta(&self, key: &str, value: &str) -> Result<(), MapError> {
        self.connection.execute(
            "INSERT INTO metadata (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    fn meta(&self, key: &str) -> Result<Option<String>, MapError> {
        Ok(self
            .connection
            .query_row("SELECT value FROM metadata WHERE key=?1", [key], |row| {
                row.get(0)
            })
            .optional()?)
    }

    fn replace_generation(
        &mut self,
        generation_id: &str,
        observed_at: i64,
        source_fingerprint: &str,
        observations: &[ContentObservation],
    ) -> Result<(), MapError> {
        let transaction = self.connection.transaction()?;
        transaction.execute("DELETE FROM content_observations", [])?;
        for observation in observations {
            insert_observation(&transaction, observation)?;
        }
        put_transaction_meta(
            &transaction,
            "schema_version",
            &CONTENT_SIGNALS_SCHEMA_VERSION.to_string(),
        )?;
        put_transaction_meta(&transaction, "signal_engine_version", SIGNAL_ENGINE_VERSION)?;
        put_transaction_meta(&transaction, "source_fingerprint", source_fingerprint)?;
        put_transaction_meta(
            &transaction,
            "current_generation_observed_at",
            &observed_at.to_string(),
        )?;
        // The current pointer is deliberately last, inside the same transaction.
        put_transaction_meta(&transaction, "current_generation_id", generation_id)?;
        transaction.commit()?;
        Ok(())
    }

    pub fn observation(&self, relative_path: &str) -> Result<Option<ContentObservation>, MapError> {
        validate_relative_path(relative_path)?;
        Ok(self
            .connection
            .query_row(
                "SELECT relative_path,size_bytes,modified_unix_ms,observation_status,
                        hash_algorithm,hash_hex,observed_at_unix_ms,generation_id,diagnostic
                 FROM content_observations WHERE relative_path=?1",
                [relative_path],
                observation_from_row,
            )
            .optional()?)
    }

    pub fn identical_members(&self, hash: &str) -> Result<Vec<ContentObservation>, MapError> {
        validate_digest(hash)?;
        let mut statement = self.connection.prepare(
            "SELECT relative_path,size_bytes,modified_unix_ms,observation_status,
                    hash_algorithm,hash_hex,observed_at_unix_ms,generation_id,diagnostic
             FROM content_observations
             WHERE observation_status='HASHED' AND hash_algorithm=?1 AND hash_hex=?2
             ORDER BY relative_path",
        )?;
        Ok(statement
            .query_map(params![HASH_ALGORITHM, hash], observation_from_row)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn diagnostics(&self) -> Result<Vec<ContentObservation>, MapError> {
        let mut statement = self.connection.prepare(
            "SELECT relative_path,size_bytes,modified_unix_ms,observation_status,
                    hash_algorithm,hash_hex,observed_at_unix_ms,generation_id,diagnostic
             FROM content_observations WHERE observation_status <> 'HASHED'
             ORDER BY relative_path",
        )?;
        Ok(statement
            .query_map([], observation_from_row)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn all_observations(&self) -> Result<Vec<ContentObservation>, MapError> {
        let mut statement = self.connection.prepare(
            "SELECT relative_path,size_bytes,modified_unix_ms,observation_status,
                    hash_algorithm,hash_hex,observed_at_unix_ms,generation_id,diagnostic
             FROM content_observations ORDER BY relative_path",
        )?;
        Ok(statement
            .query_map([], observation_from_row)?
            .collect::<Result<Vec<_>, _>>()?)
    }

    pub fn summary(
        &self,
        brain_id: &str,
        store_path: String,
    ) -> Result<ContentObservationSummary, MapError> {
        let counts = self.connection.query_row(
            "SELECT COUNT(*),
                    SUM(observation_status='HASHED'),
                    SUM(observation_status='UNREADABLE'),
                    SUM(observation_status='UNSTABLE_DURING_READ'),
                    SUM(observation_status='UNSUPPORTED')
             FROM content_observations",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(2)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(3)?.unwrap_or(0),
                    row.get::<_, Option<i64>>(4)?.unwrap_or(0),
                ))
            },
        )?;
        Ok(ContentObservationSummary {
            brain_id: brain_id.to_string(),
            store_path,
            schema_version: CONTENT_SIGNALS_SCHEMA_VERSION,
            signal_engine_version: SIGNAL_ENGINE_VERSION.to_string(),
            current_generation_id: self.meta("current_generation_id")?,
            current_generation_observed_at: self
                .meta("current_generation_observed_at")?
                .and_then(|value| value.parse().ok()),
            source_fingerprint: self.meta("source_fingerprint")?,
            observation_count: usize_of(counts.0),
            hashed_count: usize_of(counts.1),
            unreadable_count: usize_of(counts.2),
            unstable_count: usize_of(counts.3),
            unsupported_count: usize_of(counts.4),
        })
    }
}

fn insert_observation(
    transaction: &Transaction<'_>,
    observation: &ContentObservation,
) -> rusqlite::Result<()> {
    transaction.execute(
        "INSERT INTO content_observations
          (relative_path,size_bytes,modified_unix_ms,observation_status,
           hash_algorithm,hash_hex,observed_at_unix_ms,generation_id,diagnostic)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![
            observation.relative_path,
            i64_of(observation.size_bytes),
            observation.modified_unix_ms,
            observation.observation_status.as_str(),
            observation.hash_algorithm,
            observation.hash_hex,
            observation.observed_at_unix_ms,
            observation.generation_id,
            observation.diagnostic,
        ],
    )?;
    Ok(())
}

fn put_transaction_meta(
    transaction: &Transaction<'_>,
    key: &str,
    value: &str,
) -> rusqlite::Result<()> {
    transaction.execute(
        "INSERT INTO metadata (key,value) VALUES (?1,?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )?;
    Ok(())
}

fn observation_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ContentObservation> {
    let size: i64 = row.get(1)?;
    let status: String = row.get(3)?;
    Ok(ContentObservation {
        relative_path: row.get(0)?,
        size_bytes: size.max(0) as u64,
        modified_unix_ms: row.get(2)?,
        observation_status: ObservationStatus::parse(&status)?,
        hash_algorithm: row.get(4)?,
        hash_hex: row.get(5)?,
        observed_at_unix_ms: row.get(6)?,
        generation_id: row.get(7)?,
        diagnostic: row.get(8)?,
    })
}

/// Version tag of the campaign source fingerprint — `TASK-0023`, `X9`.
///
/// `sha256-tree-v1` is not `sha256-v1`. `sha256-v1` digests the bytes of one
/// file; this one digests the observable shape of a whole source tree. Both
/// use SHA-256, they answer different questions and are never interchangeable.
pub const SOURCE_FINGERPRINT_VERSION: &str = "sha256-tree-v1";

const TREE_MARKER_DIRECTORY: u8 = 1;
const TREE_MARKER_FILE: u8 = 2;
/// A symlink, junction or any other reparse point. Its presence is recorded,
/// its target is never opened, read or entered.
const TREE_MARKER_LINK: u8 = 3;
/// An entry whose type cannot be interpreted. Treated as non traversable:
/// confinement before exhaustiveness.
const TREE_MARKER_OTHER: u8 = 4;
const TREE_MARKER_END: u8 = 0xff;

/// Fingerprint of the observable source tree, streaming and confined.
///
/// Three properties matter more than the value itself:
///
/// - a link never becomes a permission to leave the root: symlinks, junctions
///   and reparse points are recorded as links, never followed and never
///   descended into;
/// - file bytes go through one bounded, reused buffer — never `fs::read`, so
///   memory stays bounded by a buffer and not by the size of a brain;
/// - only paths relative to `root` enter the digest, and the published value
///   is a prefix plus lowercase hex.
pub fn content_source_fingerprint(root: &Path) -> Result<String, MapError> {
    fingerprint_source_tree(root, &mut |_| {})
}

/// Same engine, with a read observer so streaming can be proven by a test
/// instead of asserted by a comment.
fn fingerprint_source_tree(
    root: &Path,
    observer: &mut dyn FnMut(usize),
) -> Result<String, MapError> {
    fingerprint_source_tree_with_hook(root, observer, &mut |_, _| Ok(()))
}

fn fingerprint_source_tree_with_hook(
    root: &Path,
    observer: &mut dyn FnMut(usize),
    before_entry_open: &mut dyn FnMut(&str, u8) -> Result<(), MapError>,
) -> Result<String, MapError> {
    let mut hasher = Sha256::new();
    hasher.update(SOURCE_FINGERPRINT_VERSION.as_bytes());
    hasher.update([0]);
    let mut buffer = vec![0_u8; HASH_BUFFER_BYTES];
    let root_guard = open_confined_directory(root)?.ok_or_else(|| {
        MapError::FixtureMismatch("source root is not a regular directory".into())
    })?;
    visit_source_tree(
        root,
        root,
        &root_guard,
        &mut hasher,
        &mut buffer,
        observer,
        before_entry_open,
    )?;
    Ok(format!(
        "{SOURCE_FINGERPRINT_VERSION}:{}",
        hex_lower(&hasher.finalize())
    ))
}

fn visit_source_tree(
    base: &Path,
    current: &Path,
    _current_guard: &File,
    hasher: &mut Sha256,
    buffer: &mut [u8],
    observer: &mut dyn FnMut(usize),
    before_entry_open: &mut dyn FnMut(&str, u8) -> Result<(), MapError>,
) -> Result<(), MapError> {
    let mut entries = fs::read_dir(current)?.collect::<Result<Vec<_>, _>>()?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        let path = entry.path();
        let relative = path
            .strip_prefix(base)
            .map_err(|_| MapError::FixtureMismatch("path escaped the source root".into()))?
            .to_string_lossy()
            .replace('\\', "/");
        // This observation exists only for the deterministic TOCTOU seam. It
        // never authorizes a read: the decision below uses metadata queried
        // from the handle that was actually opened.
        let initially_observed = entry.metadata()?;
        before_entry_open(&relative, tree_marker(&initially_observed))?;
        let mut opened = open_confined_tree_entry(&path)?;
        let marker = tree_marker(&opened.metadata);
        let metadata = &opened.metadata;
        hasher.update(relative.as_bytes());
        hasher.update([0, marker]);
        hasher.update(metadata.len().to_le_bytes());
        match modified_ms(&metadata) {
            Some(modified) => {
                hasher.update([1]);
                hasher.update(modified.to_le_bytes());
            }
            None => hasher.update([0]),
        }
        match marker {
            TREE_MARKER_FILE => {
                let file = opened.file.as_mut().ok_or_else(|| {
                    MapError::FixtureMismatch("regular file was not opened".into())
                })?;
                stream_open_file_into(file, hasher, buffer, observer)?;
            }
            TREE_MARKER_DIRECTORY => {
                let directory_guard = opened
                    .file
                    .as_ref()
                    .ok_or_else(|| MapError::FixtureMismatch("directory was not opened".into()))?;
                visit_source_tree(
                    base,
                    &path,
                    directory_guard,
                    hasher,
                    buffer,
                    observer,
                    before_entry_open,
                )?;
            }
            // A link or an uninterpretable entry stops here: no open, no read,
            // no descent, no canonicalisation of a target.
            _ => {}
        }
        hasher.update([TREE_MARKER_END]);
    }
    Ok(())
}

fn stream_open_file_into(
    file: &mut File,
    hasher: &mut Sha256,
    buffer: &mut [u8],
    observer: &mut dyn FnMut(usize),
) -> Result<(), MapError> {
    loop {
        let read = file.read(buffer)?;
        if read == 0 {
            break;
        }
        observer(read);
        hasher.update(&buffer[..read]);
    }
    Ok(())
}

struct OpenedTreeEntry {
    file: Option<File>,
    metadata: Metadata,
}

struct OpenedRegularFile {
    file: File,
    metadata: Metadata,
    // The handles are semantically significant: on Windows they keep every
    // directory component non-replaceable until the returned file is done.
    _directory_guards: Vec<File>,
}

#[cfg(windows)]
const WINDOWS_FILE_SHARE_READ: u32 = 0x0000_0001;
#[cfg(windows)]
const WINDOWS_FILE_SHARE_WRITE: u32 = 0x0000_0002;
#[cfg(windows)]
const WINDOWS_FILE_FLAG_OPEN_REPARSE_POINT: u32 = 0x0020_0000;
#[cfg(windows)]
const WINDOWS_FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;

/// Open one pathname component without following a final Windows reparse
/// point, then obtain metadata from that exact handle. Omitting
/// `FILE_SHARE_DELETE` pins the directory entry against rename/replacement.
#[cfg(windows)]
fn open_path_no_follow(path: &Path, allow_concurrent_write: bool) -> io::Result<OpenedTreeEntry> {
    use std::os::windows::fs::OpenOptionsExt;

    let share_mode = WINDOWS_FILE_SHARE_READ
        | if allow_concurrent_write {
            WINDOWS_FILE_SHARE_WRITE
        } else {
            0
        };
    let file = OpenOptions::new()
        .read(true)
        .share_mode(share_mode)
        .custom_flags(
            WINDOWS_FILE_FLAG_OPEN_REPARSE_POINT | WINDOWS_FILE_FLAG_BACKUP_SEMANTICS,
        )
        .open(path)?;
    let metadata = file.metadata()?;
    Ok(OpenedTreeEntry {
        file: Some(file),
        metadata,
    })
}

#[cfg(not(windows))]
fn open_path_no_follow(path: &Path, _allow_concurrent_write: bool) -> io::Result<OpenedTreeEntry> {
    let metadata = fs::symlink_metadata(path)?;
    if metadata.file_type().is_symlink() {
        return Ok(OpenedTreeEntry {
            file: None,
            metadata,
        });
    }
    let file = File::open(path)?;
    let metadata = file.metadata()?;
    Ok(OpenedTreeEntry {
        file: Some(file),
        metadata,
    })
}

fn open_confined_tree_entry(path: &Path) -> io::Result<OpenedTreeEntry> {
    // Tree reads deny concurrent write and delete/rename while the handle is
    // alive. A directory can therefore still be enumerated through its path:
    // that pathname cannot become a junction between validation and read_dir.
    open_path_no_follow(path, false)
}

fn open_confined_directory(path: &Path) -> io::Result<Option<File>> {
    let opened = open_confined_tree_entry(path)?;
    if tree_marker(&opened.metadata) != TREE_MARKER_DIRECTORY {
        return Ok(None);
    }
    Ok(opened.file)
}

fn open_confined_regular_file(
    root: &Path,
    relative_path: &Path,
    hook: &mut dyn FnMut(&ObservationEvent) -> Result<(), MapError>,
) -> Result<Option<OpenedRegularFile>, MapError> {
    let mut directory_guards = Vec::new();
    let root_guard = match open_confined_directory(root)? {
        Some(guard) => guard,
        None => return Ok(None),
    };
    directory_guards.push(root_guard);

    let mut candidate = root.to_path_buf();
    let mut components = relative_path.components().peekable();
    while let Some(component) = components.next() {
        let Component::Normal(name) = component else {
            return Ok(None);
        };
        candidate.push(name);
        if components.peek().is_some() {
            let guard = match open_confined_directory(&candidate)? {
                Some(guard) => guard,
                None => return Ok(None),
            };
            hook(&ObservationEvent::DirectoryPinned {
                relative_path: candidate
                    .strip_prefix(root)
                    .unwrap_or(&candidate)
                    .to_string_lossy()
                    .replace('\\', "/"),
            })?;
            directory_guards.push(guard);
        }
    }

    hook(&ObservationEvent::BeforeConfinedFileOpen {
        relative_path: relative_path.to_string_lossy().replace('\\', "/"),
    })?;
    let opened = open_path_no_follow(&candidate, true)?;
    if tree_marker(&opened.metadata) != TREE_MARKER_FILE {
        return Ok(None);
    }
    let Some(file) = opened.file else {
        return Ok(None);
    };
    Ok(Some(OpenedRegularFile {
        file,
        metadata: opened.metadata,
        _directory_guards: directory_guards,
    }))
}

fn tree_marker(metadata: &Metadata) -> u8 {
    marker_of(
        metadata.file_type().is_symlink() || metadata_is_reparse_point(metadata),
        metadata.is_dir(),
        metadata.is_file(),
    )
}

/// Pure classification, so the confinement rule stays testable on a host with
/// no privilege to create a link.
fn marker_of(is_link: bool, is_dir: bool, is_file: bool) -> u8 {
    if is_link {
        TREE_MARKER_LINK
    } else if is_dir {
        TREE_MARKER_DIRECTORY
    } else if is_file {
        TREE_MARKER_FILE
    } else {
        TREE_MARKER_OTHER
    }
}

pub fn observe_content(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<ContentObservationReport, MapError> {
    let store = commands::open_store(paths, brain)?;
    let nodes = store.analysis_nodes()?;
    let root = fixtures::fixture_root(&paths.fixtures, &brain.source_ref);
    observe_root_with_hook(paths, &brain.brain_id, &root, &nodes, &mut |_| Ok(()))
}

/// Development-proof hook for TASK-0024. The caller supplies an explicitly
/// synthetic, repository-sandboxed root and its already-planned nodes. It uses
/// the exact same confined, streaming SHA-256 campaign as the product command.
#[cfg(debug_assertions)]
pub(crate) fn observe_task0024_fixture(
    paths: &SandboxPaths,
    brain_id: &str,
    root: &Path,
    nodes: &[MapNode],
) -> Result<ContentObservationReport, MapError> {
    observe_root_with_hook(paths, brain_id, root, nodes, &mut |_| Ok(()))
}

#[cfg(debug_assertions)]
const TASK0026_ED15_SOURCE_ID: &str = "task0026-ed15-scale";
#[cfg(debug_assertions)]
const TASK0026_ED15_TOTAL_FILES: usize = 1_200;
#[cfg(debug_assertions)]
const TASK0026_ED15_EXPECTED_GROUPS: usize = 125;
#[cfg(debug_assertions)]
const TASK0026_ED15_EXPECTED_GROUPED_OCCURRENCES: usize = 373;
#[cfg(debug_assertions)]
const TASK0026_ED15_EMPTY_MEMBERS: usize = 125;

#[cfg(debug_assertions)]
fn task0026_ed15_file_plan() -> Vec<(String, Vec<u8>)> {
    let mut files = Vec::with_capacity(TASK0026_ED15_TOTAL_FILES);
    for member in 0..TASK0026_ED15_EMPTY_MEMBERS {
        files.push((format!("empty-{member:03}.bin"), Vec::new()));
    }
    for group in 1..TASK0026_ED15_EXPECTED_GROUPS {
        let bytes = format!("exact-group-{group:03}").into_bytes();
        for member in 0..2 {
            files.push((
                format!("group-{group:03}-member-{member}.bin"),
                bytes.clone(),
            ));
        }
    }
    let unique_count = TASK0026_ED15_TOTAL_FILES - files.len();
    for index in 0..unique_count {
        files.push((
            format!("unique-{index:04}.bin"),
            format!("unique-task0026-payload-{index:04}").into_bytes(),
        ));
    }
    files
}

/// Generates and observes the dedicated ED15 source entirely inside the
/// application sandbox. A pre-existing source is verified byte for byte and
/// never repaired, overwritten or deleted.
#[cfg(debug_assertions)]
pub fn prepare_task0026_ed15(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<Task0026Ed15Preparation, MapError> {
    use crate::domain::NodeDto;
    use std::collections::BTreeSet;

    if brain.brain_id != "brain-alpha" {
        return Err(MapError::ContentObservation(
            "TASK-0026 ED15 proof input is scoped to brain-alpha".into(),
        ));
    }
    let root = paths.fixtures.join(TASK0026_ED15_SOURCE_ID);
    let plan = task0026_ed15_file_plan();
    let expected_paths = plan
        .iter()
        .map(|(path, _)| path.clone())
        .collect::<BTreeSet<_>>();
    if root.exists() {
        let observed = fixtures::observed_paths(&root)?
            .into_iter()
            .filter(|path| root.join(path).is_file())
            .collect::<BTreeSet<_>>();
        if observed != expected_paths {
            return Err(MapError::FixtureMismatch(
                "TASK-0026 ED15 source differs from its frozen synthetic plan; nothing was deleted"
                    .into(),
            ));
        }
        for (path, bytes) in &plan {
            if fs::read(root.join(path))? != *bytes {
                return Err(MapError::FixtureMismatch(format!(
                    "TASK-0026 ED15 synthetic file `{path}` differs; nothing was overwritten"
                )));
            }
        }
    } else {
        fs::create_dir_all(&root)?;
        for (path, bytes) in &plan {
            fs::write(root.join(path), bytes)?;
        }
    }

    let mut nodes = Vec::with_capacity(plan.len() + 1);
    nodes.push(NodeDto {
        id: 1,
        parent_id: None,
        name: TASK0026_ED15_SOURCE_ID.to_string(),
        relative_path: String::new(),
        kind: NodeKind::Root,
        depth: 0,
        size_bytes: plan.iter().map(|(_, bytes)| bytes.len() as u64).sum(),
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: plan.len() as u32,
        seen: true,
    });
    for (index, (path, bytes)) in plan.iter().enumerate() {
        nodes.push(NodeDto {
            id: index as i64 + 2,
            parent_id: Some(1),
            name: path.clone(),
            relative_path: path.clone(),
            kind: NodeKind::File,
            depth: 1,
            size_bytes: bytes.len() as u64,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: true,
        });
    }
    let database = paths.brain_map_database(&brain.brain_id);
    let mut map_store = super::brain_index::BrainIndex::open(&database)?;
    map_store.replace(
        &brain.brain_id,
        // The binding is the **brain's**, not this harness's: the product then
        // opens the prepared index through the ordinary door — `DEC-0033` D.
        // What the harness contributes is the label below.
        super::brain_index::SourceStamp {
            kind: brain.source_kind,
            source_ref: &brain.source_ref,
            label: "Source synthétique ED15",
        },
        &nodes,
        &[],
        now_ms(),
    )?;
    let analysis_nodes = map_store.analysis_nodes()?;
    let map_node_count = map_store.count()?;
    drop(map_store);
    let report =
        observe_root_with_hook(paths, &brain.brain_id, &root, &analysis_nodes, &mut |_| {
            Ok(())
        })?;
    Ok(Task0026Ed15Preparation {
        source_id: TASK0026_ED15_SOURCE_ID.to_string(),
        total_files: TASK0026_ED15_TOTAL_FILES,
        expected_groups: TASK0026_ED15_EXPECTED_GROUPS,
        expected_grouped_occurrences: TASK0026_ED15_EXPECTED_GROUPED_OCCURRENCES,
        expected_empty_members: TASK0026_ED15_EMPTY_MEMBERS,
        map_node_count,
        report,
    })
}

fn observe_root_with_hook(
    paths: &SandboxPaths,
    brain_id: &str,
    root: &Path,
    nodes: &[MapNode],
    hook: &mut dyn FnMut(&ObservationEvent) -> Result<(), MapError>,
) -> Result<ContentObservationReport, MapError> {
    let started = std::time::Instant::now();
    let source_fingerprint_before = content_source_fingerprint(root)?;
    let generation_id = Uuid::new_v4().to_string();
    let observed_at = now_ms();
    let indexed = nodes
        .iter()
        .filter(|node| node.kind == NodeKind::File)
        .collect::<Vec<_>>();
    let mut counters = CampaignCounters::default();
    let mut observations = Vec::with_capacity(indexed.len());

    for node in &indexed {
        observations.push(observe_file(
            root,
            node,
            observed_at,
            &generation_id,
            &mut counters,
            hook,
        )?);
    }

    hook(&ObservationEvent::BeforeFingerprintAfter)?;
    let source_fingerprint_after = content_source_fingerprint(root)?;
    if source_fingerprint_before != source_fingerprint_after {
        return Err(MapError::ContentObservation(
            "SOURCE_CHANGED_DURING_OBSERVATION".to_string(),
        ));
    }

    hook(&ObservationEvent::BeforeCommit)?;
    let database = paths.brain_content_signals_database(brain_id);
    let mut store = ContentSignalStore::open(&database)?;
    store.replace_generation(
        &generation_id,
        observed_at,
        &source_fingerprint_after,
        &observations,
    )?;

    let hashed_count = count_status(&observations, ObservationStatus::Hashed);
    let unreadable_count = count_status(&observations, ObservationStatus::Unreadable);
    let unstable_count = count_status(&observations, ObservationStatus::UnstableDuringRead);
    let unsupported_count = count_status(&observations, ObservationStatus::Unsupported);
    Ok(ContentObservationReport {
        brain_id: brain_id.to_string(),
        store_path: paths.relative_name(&database),
        schema_version: CONTENT_SIGNALS_SCHEMA_VERSION,
        signal_engine_version: SIGNAL_ENGINE_VERSION.to_string(),
        generation_id,
        observed_at,
        source_fingerprint_before,
        source_fingerprint_after,
        source_stable: true,
        indexed_file_count: indexed.len(),
        hashed_count,
        unreadable_count,
        unstable_count,
        unsupported_count,
        files_opened_for_hash: counters.files_opened_for_hash,
        bytes_read: counters.bytes_read,
        digests_computed: counters.digests_computed,
        hash_algorithm: HASH_ALGORITHM.to_string(),
        read_only_confirmed: true,
        duration_ms: started.elapsed().as_secs_f64() * 1_000.0,
    })
}

fn observe_file(
    root: &Path,
    node: &MapNode,
    observed_at: i64,
    generation_id: &str,
    counters: &mut CampaignCounters,
    hook: &mut dyn FnMut(&ObservationEvent) -> Result<(), MapError>,
) -> Result<ContentObservation, MapError> {
    let relative_path = match validate_relative_path(&node.relative_path) {
        Ok(path) => path,
        Err(_) => {
            return Ok(non_hashed(
                node,
                observed_at,
                generation_id,
                ObservationStatus::Unsupported,
                "relative_path_refused",
            ));
        }
    };
    let candidate = root.join(&relative_path);
    if !lexically_contained(root, &candidate) {
        return Ok(non_hashed(
            node,
            observed_at,
            generation_id,
            ObservationStatus::Unsupported,
            "path_outside_root",
        ));
    }

    let mut opened = match open_confined_regular_file(root, &relative_path, hook) {
        Ok(Some(opened)) => opened,
        Ok(None) => {
            return Ok(non_hashed(
                node,
                observed_at,
                generation_id,
                ObservationStatus::Unsupported,
                "not_supported_regular_file",
            ));
        }
        Err(_) => {
            return Ok(non_hashed(
                node,
                observed_at,
                generation_id,
                ObservationStatus::Unreadable,
                "metadata_unreadable",
            ));
        }
    };
    let before = opened.metadata.clone();
    let file = &mut opened.file;
    counters.files_opened_for_hash += 1;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; HASH_BUFFER_BYTES];
    let mut file_bytes = 0_u64;
    loop {
        let read = match file.read(&mut buffer) {
            Ok(read) => read,
            Err(_) => {
                return Ok(non_hashed(
                    node,
                    observed_at,
                    generation_id,
                    ObservationStatus::Unreadable,
                    "read_failed",
                ));
            }
        };
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
        file_bytes = file_bytes.saturating_add(read as u64);
        counters.bytes_read = counters.bytes_read.saturating_add(read as u64);
        hook(&ObservationEvent::AfterChunk {
            relative_path: node.relative_path.clone(),
            bytes_read: file_bytes,
        })?;
    }

    let after = match file.metadata() {
        Ok(metadata) => metadata,
        Err(_) => {
            return Ok(non_hashed(
                node,
                observed_at,
                generation_id,
                ObservationStatus::Unreadable,
                "post_read_metadata_unreadable",
            ));
        }
    };
    if stability_tuple(&before) != stability_tuple(&after) {
        return Ok(ContentObservation {
            relative_path: node.relative_path.clone(),
            size_bytes: before.len(),
            modified_unix_ms: modified_ms(&before),
            observation_status: ObservationStatus::UnstableDuringRead,
            hash_algorithm: None,
            hash_hex: None,
            observed_at_unix_ms: observed_at,
            generation_id: generation_id.to_string(),
            diagnostic: Some("metadata_changed_during_read".to_string()),
        });
    }

    let digest = hasher.finalize();
    counters.digests_computed += 1;
    Ok(ContentObservation {
        relative_path: node.relative_path.clone(),
        size_bytes: before.len(),
        modified_unix_ms: modified_ms(&before),
        observation_status: ObservationStatus::Hashed,
        hash_algorithm: Some(HASH_ALGORITHM.to_string()),
        hash_hex: Some(hex_lower(&digest)),
        observed_at_unix_ms: observed_at,
        generation_id: generation_id.to_string(),
        diagnostic: None,
    })
}

fn non_hashed(
    node: &MapNode,
    observed_at: i64,
    generation_id: &str,
    status: ObservationStatus,
    diagnostic: &str,
) -> ContentObservation {
    ContentObservation {
        relative_path: node.relative_path.clone(),
        size_bytes: node.size_bytes,
        modified_unix_ms: node.modified_unix_ms,
        observation_status: status,
        hash_algorithm: None,
        hash_hex: None,
        observed_at_unix_ms: observed_at,
        generation_id: generation_id.to_string(),
        diagnostic: Some(diagnostic.to_string()),
    }
}

pub fn content_observation_summary(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<ContentObservationSummary, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    ContentSignalStore::open(&database)?.summary(&brain.brain_id, paths.relative_name(&database))
}

/// A read-only handle to the current complete observation generation.
///
/// Unlike [`ContentSignalStore::open`], this never creates a directory,
/// initializes a schema or changes a journal mode. Merely opening the explorer
/// therefore cannot turn “not observed” into an empty store.
fn current_generation_read_only(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<Option<(Connection, String, i64)>, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    if !database.is_file() {
        return Ok(None);
    }
    let connection = Connection::open_with_flags(
        database,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )?;
    let version: i64 = connection.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version != CONTENT_SIGNALS_SCHEMA_VERSION {
        return Err(MapError::ContentObservation(format!(
            "unsupported_content_signals_schema:{version}"
        )));
    }
    let generation = connection
        .query_row(
            "SELECT value FROM metadata WHERE key='current_generation_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    let observed_at = connection
        .query_row(
            "SELECT value FROM metadata WHERE key='current_generation_observed_at'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?
        .and_then(|value| value.parse::<i64>().ok());
    match (generation, observed_at) {
        (Some(generation), Some(observed_at)) => Ok(Some((connection, generation, observed_at))),
        _ => Ok(None),
    }
}

fn validate_duplicate_size_invariant(
    connection: &Connection,
    generation_id: &str,
) -> Result<(), MapError> {
    let mismatch = connection
        .query_row(
            "SELECT hash_hex
             FROM content_observations
             WHERE generation_id=?1 AND observation_status='HASHED'
               AND hash_algorithm=?2 AND length(hash_hex)=64
               AND hash_hex=lower(hash_hex) AND hash_hex NOT GLOB '*[^0-9a-f]*'
             GROUP BY hash_hex
             HAVING COUNT(*) >= 2 AND COUNT(DISTINCT size_bytes) <> 1
             LIMIT 1",
            params![generation_id, HASH_ALGORITHM],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    if let Some(hash) = mismatch {
        return Err(MapError::ContentObservation(format!(
            "duplicate_digest_size_mismatch:{hash}"
        )));
    }
    Ok(())
}

fn exact_group_counts(
    connection: &Connection,
    generation_id: &str,
) -> Result<(usize, usize, usize), MapError> {
    validate_duplicate_size_invariant(connection, generation_id)?;
    let counts = connection.query_row(
        "SELECT COUNT(*), COALESCE(SUM(member_count),0),
                COALESCE(SUM(size_bytes=0),0)
         FROM (
           SELECT hash_hex, MIN(size_bytes) AS size_bytes, COUNT(*) AS member_count
           FROM content_observations
           WHERE generation_id=?1 AND observation_status='HASHED'
             AND hash_algorithm=?2 AND length(hash_hex)=64
             AND hash_hex=lower(hash_hex) AND hash_hex NOT GLOB '*[^0-9a-f]*'
           GROUP BY hash_hex
           HAVING COUNT(*) >= 2
         )",
        params![generation_id, HASH_ALGORITHM],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
            ))
        },
    )?;
    Ok((
        usize_of(counts.0),
        usize_of(counts.1),
        usize_of(counts.2),
    ))
}

pub fn exact_duplicate_summary(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<ExactDuplicateSummary, MapError> {
    let started = Instant::now();
    let Some((connection, generation_id, observed_at)) =
        current_generation_read_only(paths, brain)?
    else {
        return Ok(ExactDuplicateSummary {
            brain_id: brain.brain_id.clone(),
            availability: ExactDuplicateAvailability::NotObserved,
            generation_id: None,
            observed_at_unix_ms: None,
            hash_algorithm: HASH_ALGORITHM.to_string(),
            exact_group_count: 0,
            grouped_occurrence_count: 0,
            empty_group_count: 0,
            query_duration_ms: started.elapsed().as_secs_f64() * 1_000.0,
        });
    };
    let (exact_group_count, grouped_occurrence_count, empty_group_count) =
        exact_group_counts(&connection, &generation_id)?;
    Ok(ExactDuplicateSummary {
        brain_id: brain.brain_id.clone(),
        availability: ExactDuplicateAvailability::Available,
        generation_id: Some(generation_id),
        observed_at_unix_ms: Some(observed_at),
        hash_algorithm: HASH_ALGORITHM.to_string(),
        exact_group_count,
        grouped_occurrence_count,
        empty_group_count,
        query_duration_ms: started.elapsed().as_secs_f64() * 1_000.0,
    })
}

pub fn exact_duplicate_groups(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    offset: usize,
    limit: usize,
) -> Result<ExactDuplicateGroupPage, MapError> {
    let started = Instant::now();
    let limit = limit.clamp(1, MAX_EXACT_DUPLICATE_PAGE_LIMIT);
    let Some((connection, generation_id, observed_at)) =
        current_generation_read_only(paths, brain)?
    else {
        return Ok(ExactDuplicateGroupPage {
            brain_id: brain.brain_id.clone(),
            availability: ExactDuplicateAvailability::NotObserved,
            generation_id: None,
            observed_at_unix_ms: None,
            hash_algorithm: HASH_ALGORITHM.to_string(),
            total_groups: 0,
            offset: 0,
            limit,
            max_limit: MAX_EXACT_DUPLICATE_PAGE_LIMIT,
            returned: 0,
            has_more: false,
            order: "size_bytes descending, hash_hex ascending".to_string(),
            query_duration_ms: started.elapsed().as_secs_f64() * 1_000.0,
            groups: Vec::new(),
        });
    };
    let (total_groups, _, _) = exact_group_counts(&connection, &generation_id)?;
    let offset = offset.min(total_groups);
    let mut statement = connection.prepare(
        "SELECT hash_hex, MIN(size_bytes), COUNT(*), MAX(observed_at_unix_ms)
         FROM content_observations
         WHERE generation_id=?1 AND observation_status='HASHED'
           AND hash_algorithm=?2 AND length(hash_hex)=64
           AND hash_hex=lower(hash_hex) AND hash_hex NOT GLOB '*[^0-9a-f]*'
         GROUP BY hash_hex
         HAVING COUNT(*) >= 2
         ORDER BY MIN(size_bytes) DESC, hash_hex ASC
         LIMIT ?3 OFFSET ?4",
    )?;
    let groups = statement
        .query_map(
            params![generation_id, HASH_ALGORITHM, limit as i64, offset as i64],
            |row| {
                let hash_hex = row.get::<_, String>(0)?;
                let size_bytes = row.get::<_, i64>(1)?.max(0) as u64;
                Ok(ExactDuplicateGroup {
                    group_id: format!("{HASH_ALGORITHM}:{hash_hex}"),
                    hash_algorithm: HASH_ALGORITHM.to_string(),
                    hash_hex,
                    size_bytes,
                    member_count: usize_of(row.get::<_, i64>(2)?),
                    empty_content: size_bytes == 0,
                    generation_id: generation_id.clone(),
                    observed_at_unix_ms: row.get(3)?,
                })
            },
        )?
        .collect::<Result<Vec<_>, _>>()?;
    let returned = groups.len();
    Ok(ExactDuplicateGroupPage {
        brain_id: brain.brain_id.clone(),
        availability: ExactDuplicateAvailability::Available,
        generation_id: Some(generation_id),
        observed_at_unix_ms: Some(observed_at),
        hash_algorithm: HASH_ALGORITHM.to_string(),
        total_groups,
        offset,
        limit,
        max_limit: MAX_EXACT_DUPLICATE_PAGE_LIMIT,
        returned,
        has_more: offset + returned < total_groups,
        order: "size_bytes descending, hash_hex ascending".to_string(),
        query_duration_ms: started.elapsed().as_secs_f64() * 1_000.0,
        groups,
    })
}

fn map_node_ref_for_path(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    relative_path: &str,
) -> Result<Option<BrainNodeRef>, MapError> {
    let database = paths.brain_map_database(&brain.brain_id);
    if !database.is_file() {
        return Ok(None);
    }
    let connection =
        Connection::open_with_flags(database, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    let built_for = connection
        .query_row(
            "SELECT value FROM schema_meta WHERE key='brain_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    if built_for.as_deref() != Some(brain.brain_id.as_str()) {
        return Ok(None);
    }
    Ok(connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path=?1",
            [relative_path],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .map(|node_id| BrainNodeRef::new(&brain.brain_id, node_id)))
}

pub fn exact_duplicate_members(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    group_id: &str,
    offset: usize,
    limit: usize,
) -> Result<ExactDuplicateMemberPage, MapError> {
    let started = Instant::now();
    let hash_hex = group_id
        .strip_prefix(&format!("{HASH_ALGORITHM}:"))
        .ok_or_else(|| MapError::ContentObservation("duplicate_group_id_refused".into()))?;
    validate_digest(hash_hex)?;
    let Some((connection, generation_id, observed_at)) =
        current_generation_read_only(paths, brain)?
    else {
        return Err(MapError::ContentObservation(
            "duplicate_group_not_observed".into(),
        ));
    };
    let total_members = usize_of(connection.query_row(
        "SELECT COUNT(*) FROM content_observations
         WHERE generation_id=?1 AND observation_status='HASHED'
           AND hash_algorithm=?2 AND hash_hex=?3",
        params![generation_id, HASH_ALGORITHM, hash_hex],
        |row| row.get::<_, i64>(0),
    )?);
    if total_members < 2 {
        return Err(MapError::ContentObservation(
            "duplicate_group_not_found".into(),
        ));
    }
    let limit = limit.clamp(1, MAX_EXACT_DUPLICATE_PAGE_LIMIT);
    let offset = offset.min(total_members);
    let mut statement = connection.prepare(
        "SELECT relative_path,size_bytes,modified_unix_ms,observation_status,
                hash_algorithm,hash_hex,observed_at_unix_ms,generation_id,diagnostic
         FROM content_observations
         WHERE generation_id=?1 AND observation_status='HASHED'
           AND hash_algorithm=?2 AND hash_hex=?3
         ORDER BY relative_path ASC LIMIT ?4 OFFSET ?5",
    )?;
    let observations = statement
        .query_map(
            params![
                generation_id,
                HASH_ALGORITHM,
                hash_hex,
                limit as i64,
                offset as i64
            ],
            observation_from_row,
        )?
        .collect::<Result<Vec<_>, _>>()?;
    let mut members = Vec::with_capacity(observations.len());
    let mut unresolved_returned = 0;
    for observation in observations {
        let node_ref = map_node_ref_for_path(paths, brain, &observation.relative_path)?;
        if node_ref.is_none() {
            unresolved_returned += 1;
        }
        let name = Path::new(&observation.relative_path)
            .file_name()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_else(|| observation.relative_path.clone());
        members.push(ExactDuplicateMember {
            relative_path: observation.relative_path,
            name,
            size_bytes: observation.size_bytes,
            observation_status: observation.observation_status,
            hash_algorithm: HASH_ALGORITHM.to_string(),
            hash_hex: hash_hex.to_string(),
            observed_at_unix_ms: observation.observed_at_unix_ms,
            generation_id: observation.generation_id,
            node_ref,
        });
    }
    let returned = members.len();
    Ok(ExactDuplicateMemberPage {
        brain_id: brain.brain_id.clone(),
        group_id: group_id.to_string(),
        generation_id,
        observed_at_unix_ms: observed_at,
        hash_algorithm: HASH_ALGORITHM.to_string(),
        hash_hex: hash_hex.to_string(),
        total_members,
        unresolved_returned,
        offset,
        limit,
        max_limit: MAX_EXACT_DUPLICATE_PAGE_LIMIT,
        returned,
        has_more: offset + returned < total_members,
        order: "relative_path ascending".to_string(),
        query_duration_ms: started.elapsed().as_secs_f64() * 1_000.0,
        members,
    })
}

/// Reads only the freshness token needed by the relation-engine status. An
/// absent content store means “no generation”; unlike `ContentSignalStore::open`
/// this helper never creates or migrates anything.
pub fn current_generation_id_if_present(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<Option<String>, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    if !database.exists() {
        return Ok(None);
    }
    let connection = Connection::open_with_flags(
        database,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )?;
    Ok(connection
        .query_row(
            "SELECT value FROM metadata WHERE key='current_generation_id'",
            [],
            |row| row.get(0),
        )
        .optional()?)
}

pub fn content_observation_for_path(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    relative_path: &str,
) -> Result<Option<ContentObservation>, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    ContentSignalStore::open(&database)?.observation(relative_path)
}

pub fn identical_content_members(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    hash: &str,
) -> Result<Vec<ContentObservation>, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    ContentSignalStore::open(&database)?.identical_members(hash)
}

pub fn content_observation_diagnostics(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<Vec<ContentObservation>, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    ContentSignalStore::open(&database)?.diagnostics()
}

pub fn content_observations(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<Vec<ContentObservation>, MapError> {
    let database = paths.brain_content_signals_database(&brain.brain_id);
    ContentSignalStore::open(&database)?.all_observations()
}

fn validate_relative_path(relative_path: &str) -> Result<PathBuf, MapError> {
    if relative_path.is_empty() || relative_path.contains('\\') {
        return Err(MapError::ContentObservation("relative_path_refused".into()));
    }
    let path = Path::new(relative_path);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err(MapError::ContentObservation("relative_path_refused".into()));
    }
    Ok(path.to_path_buf())
}

fn validate_digest(hash: &str) -> Result<(), MapError> {
    if hash.len() != 64
        || !hash
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    {
        return Err(MapError::ContentObservation("sha256_digest_refused".into()));
    }
    Ok(())
}

fn lexically_contained(root: &Path, candidate: &Path) -> bool {
    candidate.starts_with(root)
}

fn stability_tuple(metadata: &Metadata) -> (u64, Option<i64>) {
    (metadata.len(), modified_ms(metadata))
}

fn modified_ms(metadata: &Metadata) -> Option<i64> {
    metadata
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_millis().min(i64::MAX as u128) as i64)
}

/// `FILE_ATTRIBUTE_REPARSE_POINT`.
#[cfg(windows)]
const WINDOWS_REPARSE_POINT_ATTRIBUTE: u32 = 0x0000_0400;

#[cfg(windows)]
fn attributes_are_reparse_point(attributes: u32) -> bool {
    attributes & WINDOWS_REPARSE_POINT_ATTRIBUTE != 0
}

#[cfg(windows)]
fn metadata_is_reparse_point(metadata: &Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    attributes_are_reparse_point(metadata.file_attributes())
}

#[cfg(not(windows))]
fn metadata_is_reparse_point(_metadata: &Metadata) -> bool {
    false
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

fn hex_lower(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        write!(&mut output, "{byte:02x}").expect("writing into String cannot fail");
    }
    output
}

fn count_status(observations: &[ContentObservation], status: ObservationStatus) -> usize {
    observations
        .iter()
        .filter(|observation| observation.observation_status == status)
        .count()
}

fn i64_of(value: u64) -> i64 {
    value.min(i64::MAX as u64) as i64
}

fn usize_of(value: i64) -> usize {
    value.max(0) as usize
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::map::layout::Rect;
    use std::collections::BTreeMap;

    #[test]
    fn freshness_read_does_not_create_an_absent_content_store() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().to_path_buf());
        let brain = BrainRecord::frozen_by_id("brain-alpha").expect("brain");
        let database = paths.brain_content_signals_database(&brain.brain_id);
        assert!(
            current_generation_id_if_present(&paths, &brain)
                .expect("read")
                .is_none()
        );
        assert!(!database.exists());
    }

    #[cfg(windows)]
    fn create_junction(junction: &Path, target: &Path) -> io::Result<()> {
        let output = std::process::Command::new("cmd")
            .args(["/c", "mklink", "/J"])
            .arg(junction)
            .arg(target)
            .output()?;
        if output.status.success() {
            Ok(())
        } else {
            Err(io::Error::other("mklink /J failed"))
        }
    }

    fn file_node(id: i64, path: &str, size: u64) -> MapNode {
        MapNode {
            id,
            parent_id: Some(1),
            name: Path::new(path)
                .file_name()
                .expect("name")
                .to_string_lossy()
                .into_owned(),
            relative_path: path.to_string(),
            kind: NodeKind::File,
            depth: 1,
            size_bytes: size,
            modified_unix_ms: None,
            child_count: 0,
            access_diagnostic: None,
            rect: Rect {
                x: 0.0,
                y: 0.0,
                w: 240.0,
                h: 64.0,
            },
        }
    }

    fn directory_node(id: i64, path: &str) -> MapNode {
        let mut node = file_node(id, path, 0);
        node.kind = NodeKind::Directory;
        node
    }

    fn paths(temp: &tempfile::TempDir) -> SandboxPaths {
        SandboxPaths::under(temp.path().join("sandbox"))
    }

    fn run(
        paths: &SandboxPaths,
        brain_id: &str,
        root: &Path,
        nodes: &[MapNode],
    ) -> Result<ContentObservationReport, MapError> {
        observe_root_with_hook(paths, brain_id, root, nodes, &mut |_| Ok(()))
    }

    fn hashed_observation(
        relative_path: String,
        size_bytes: u64,
        hash_hex: String,
        generation_id: &str,
        observed_at: i64,
    ) -> ContentObservation {
        ContentObservation {
            relative_path,
            size_bytes,
            modified_unix_ms: Some(observed_at),
            observation_status: ObservationStatus::Hashed,
            hash_algorithm: Some(HASH_ALGORITHM.to_string()),
            hash_hex: Some(hash_hex),
            observed_at_unix_ms: observed_at,
            generation_id: generation_id.to_string(),
            diagnostic: None,
        }
    }

    #[test]
    fn exact_duplicate_summary_does_not_create_an_absent_store() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));
        let brain = BrainRecord::frozen_by_id("brain-alpha").expect("brain");
        let database = paths.brain_content_signals_database(&brain.brain_id);
        let summary = exact_duplicate_summary(&paths, &brain).expect("summary");
        assert_eq!(summary.availability, ExactDuplicateAvailability::NotObserved);
        assert_eq!(summary.exact_group_count, 0);
        assert!(!database.exists(), "a read created content.sqlite");
    }

    #[test]
    fn task0026_ed15_plan_is_bounded_and_exercises_both_paginators() {
        let plan = task0026_ed15_file_plan();
        assert_eq!(plan.len(), TASK0026_ED15_TOTAL_FILES);
        assert!((1_000..=3_000).contains(&plan.len()));
        assert_eq!(
            plan.iter().filter(|(_, bytes)| bytes.is_empty()).count(),
            TASK0026_ED15_EMPTY_MEMBERS
        );

        let mut frequencies = BTreeMap::<Vec<u8>, usize>::new();
        for (_, bytes) in plan {
            *frequencies.entry(bytes).or_default() += 1;
        }
        let groups = frequencies.values().filter(|count| **count >= 2).count();
        let grouped_occurrences = frequencies
            .values()
            .filter(|count| **count >= 2)
            .sum::<usize>();
        assert_eq!(groups, TASK0026_ED15_EXPECTED_GROUPS);
        assert_eq!(
            grouped_occurrences,
            TASK0026_ED15_EXPECTED_GROUPED_OCCURRENCES
        );
        assert!(groups > 100, "group pagination is not exercised");
        assert!(
            TASK0026_ED15_EMPTY_MEMBERS > 100,
            "member pagination is not exercised"
        );
    }

    #[test]
    fn exact_duplicate_queries_are_current_bounded_stable_and_isolated() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));
        let alpha = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
        let gamma = BrainRecord::frozen_by_id("brain-gamma").expect("gamma");
        let observed_at = 1_788_555_000_000;
        let generation = "current-generation";
        let mut observations = Vec::new();
        for group in 0..125_u64 {
            let hash = format!("{group:064x}");
            let member_count = if group == 0 { 105 } else { 2 };
            let size = if group == 0 { 0 } else { 10_000 - group };
            for member in 0..member_count {
                observations.push(hashed_observation(
                    format!("groups/g{group:03}/member-{member:03}.bin"),
                    size,
                    hash.clone(),
                    generation,
                    observed_at,
                ));
            }
        }
        observations.push(hashed_observation(
            "unique.bin".into(),
            42,
            "f".repeat(64),
            generation,
            observed_at,
        ));
        let mut alpha_store =
            ContentSignalStore::open(&paths.brain_content_signals_database(&alpha.brain_id))
                .expect("alpha store");
        alpha_store
            .replace_generation(generation, observed_at, "synthetic-fingerprint", &observations)
            .expect("generation");
        drop(alpha_store);

        let summary = exact_duplicate_summary(&paths, &alpha).expect("summary");
        assert_eq!(summary.availability, ExactDuplicateAvailability::Available);
        assert_eq!(summary.generation_id.as_deref(), Some(generation));
        assert_eq!(summary.exact_group_count, 125);
        assert_eq!(summary.grouped_occurrence_count, 105 + 124 * 2);
        assert_eq!(summary.empty_group_count, 1);

        let first = exact_duplicate_groups(&paths, &alpha, 0, 10_000).expect("first");
        assert_eq!(first.limit, MAX_EXACT_DUPLICATE_PAGE_LIMIT);
        assert_eq!(first.returned, 100);
        assert_eq!(first.total_groups, 125);
        assert!(first.has_more);
        assert!(first.groups.windows(2).all(|pair| {
            pair[0].size_bytes > pair[1].size_bytes
                || (pair[0].size_bytes == pair[1].size_bytes
                    && pair[0].hash_hex < pair[1].hash_hex)
        }));
        let second = exact_duplicate_groups(&paths, &alpha, 100, 100).expect("second");
        assert_eq!(second.returned, 25);
        assert!(!second.has_more);
        assert!(second.groups.last().expect("empty group").empty_content);

        let empty = second.groups.last().expect("empty group");
        let members_one = exact_duplicate_members(&paths, &alpha, &empty.group_id, 0, 100)
            .expect("member page one");
        let members_two = exact_duplicate_members(&paths, &alpha, &empty.group_id, 100, 100)
            .expect("member page two");
        assert_eq!(members_one.total_members, 105);
        assert_eq!(members_one.returned, 100);
        assert!(members_one.has_more);
        assert_eq!(members_two.returned, 5);
        assert!(!members_two.has_more);
        assert_eq!(members_one.unresolved_returned, 100);
        assert!(members_one.members.windows(2).all(|pair| {
            pair[0].relative_path < pair[1].relative_path
        }));

        let shared_hash = "0".repeat(64);
        let gamma_observations = [
            hashed_observation("gamma/a.bin".into(), 7, shared_hash.clone(), "gamma-gen", observed_at),
            hashed_observation("gamma/b.bin".into(), 7, shared_hash, "gamma-gen", observed_at),
        ];
        let mut gamma_store =
            ContentSignalStore::open(&paths.brain_content_signals_database(&gamma.brain_id))
                .expect("gamma store");
        gamma_store
            .replace_generation("gamma-gen", observed_at, "gamma-fingerprint", &gamma_observations)
            .expect("gamma generation");
        drop(gamma_store);
        let gamma_summary = exact_duplicate_summary(&paths, &gamma).expect("gamma summary");
        assert_eq!(gamma_summary.exact_group_count, 1);
        assert_eq!(gamma_summary.grouped_occurrence_count, 2);
        let alpha_after_gamma = exact_duplicate_summary(&paths, &alpha).unwrap();
        assert_eq!(alpha_after_gamma.generation_id, summary.generation_id);
        assert_eq!(alpha_after_gamma.exact_group_count, summary.exact_group_count);
        assert_eq!(
            alpha_after_gamma.grouped_occurrence_count,
            summary.grouped_occurrence_count
        );
    }

    #[test]
    fn exact_duplicate_query_rejects_a_digest_with_inconsistent_sizes() {
        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));
        let brain = BrainRecord::frozen_by_id("brain-alpha").expect("brain");
        let hash = "a".repeat(64);
        let observations = [
            hashed_observation("a.bin".into(), 1, hash.clone(), "g", 1),
            hashed_observation("b.bin".into(), 2, hash, "g", 1),
        ];
        let mut store =
            ContentSignalStore::open(&paths.brain_content_signals_database(&brain.brain_id))
                .expect("store");
        store
            .replace_generation("g", 1, "fingerprint", &observations)
            .expect("generation");
        drop(store);
        assert!(matches!(
            exact_duplicate_summary(&paths, &brain),
            Err(MapError::ContentObservation(message))
                if message.starts_with("duplicate_digest_size_mismatch:")
        ));
    }

    #[test]
    fn known_sha256_vectors_and_streaming_chunks_are_exact() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let binary = (0..(HASH_BUFFER_BYTES * 2 + 17))
            .map(|index| (index % 251) as u8)
            .collect::<Vec<_>>();
        fs::write(root.join("empty.bin"), []).expect("empty");
        fs::write(root.join("abc.bin"), b"abc").expect("abc");
        fs::write(root.join("binary.bin"), &binary).expect("binary");
        let nodes = vec![
            file_node(2, "empty.bin", 0),
            file_node(3, "abc.bin", 3),
            file_node(4, "binary.bin", binary.len() as u64),
        ];
        run(&paths(&temp), "brain-test", &root, &nodes).expect("campaign");
        let store =
            ContentSignalStore::open(&paths(&temp).brain_content_signals_database("brain-test"))
                .expect("store");
        assert_eq!(
            store
                .observation("empty.bin")
                .expect("read")
                .unwrap()
                .hash_hex
                .as_deref(),
            Some("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        );
        assert_eq!(
            store
                .observation("abc.bin")
                .expect("read")
                .unwrap()
                .hash_hex
                .as_deref(),
            Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        );
        let expected = hex_lower(&Sha256::digest(&binary));
        assert_eq!(
            store
                .observation("binary.bin")
                .expect("read")
                .unwrap()
                .hash_hex,
            Some(expected)
        );
    }

    #[test]
    fn same_bytes_empty_files_and_same_length_different_bytes_are_distinguished() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("a")).expect("a");
        fs::create_dir_all(root.join("b")).expect("b");
        for path in ["a/original.bin", "b/autre-nom.bin"] {
            fs::write(root.join(path), b"same bytes").expect("same");
        }
        fs::write(root.join("empty-a"), []).expect("empty");
        fs::write(root.join("empty-b"), []).expect("empty");
        fs::write(root.join("left"), b"AAAA").expect("left");
        fs::write(root.join("right"), b"BBBB").expect("right");
        let nodes = [
            file_node(2, "a/original.bin", 10),
            file_node(3, "b/autre-nom.bin", 10),
            file_node(4, "empty-a", 0),
            file_node(5, "empty-b", 0),
            file_node(6, "left", 4),
            file_node(7, "right", 4),
        ];
        run(&paths(&temp), "brain-test", &root, &nodes).expect("campaign");
        let store =
            ContentSignalStore::open(&paths(&temp).brain_content_signals_database("brain-test"))
                .expect("store");
        let same = store.observation("a/original.bin").unwrap().unwrap();
        let renamed = store.observation("b/autre-nom.bin").unwrap().unwrap();
        assert_eq!(same.hash_hex, renamed.hash_hex);
        assert_ne!(same.relative_path, renamed.relative_path);
        assert_eq!(
            store
                .identical_members(same.hash_hex.as_deref().unwrap())
                .unwrap()
                .len(),
            2
        );
        let empty = store.observation("empty-a").unwrap().unwrap();
        assert_eq!(
            store
                .identical_members(empty.hash_hex.as_deref().unwrap())
                .unwrap()
                .len(),
            2
        );
        assert_ne!(
            store.observation("left").unwrap().unwrap().hash_hex,
            store.observation("right").unwrap().unwrap().hash_hex
        );
        // This store has no representation for a relation or suggestion.
        let columns = store
            .connection
            .prepare("PRAGMA table_info(content_observations)")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        for forbidden in ["relation_id", "provenance", "suggestion", "approved"] {
            assert!(!columns.iter().any(|column| column == forbidden));
        }
    }

    #[test]
    fn directories_are_not_hashed_and_paths_are_relative_only() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("folder")).expect("root");
        fs::write(root.join("folder/file.bin"), b"x").expect("file");
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[
                directory_node(2, "folder"),
                file_node(3, "folder/file.bin", 1),
            ],
        )
        .expect("campaign");
        assert_eq!(report.indexed_file_count, 1);
        assert_eq!(report.files_opened_for_hash, 1);
        let store =
            ContentSignalStore::open(&paths(&temp).brain_content_signals_database("brain-test"))
                .unwrap();
        assert!(store.observation("folder").unwrap().is_none());
        assert!(store
            .all_observations()
            .unwrap()
            .iter()
            .all(|entry| !Path::new(&entry.relative_path).is_absolute()
                && !entry.relative_path.contains('\\')));
    }

    #[test]
    fn traversal_is_refused_without_opening_anything() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[file_node(2, "../outside", 1)],
        )
        .expect("campaign");
        assert_eq!(report.unsupported_count, 1);
        assert_eq!(report.files_opened_for_hash, 0);
    }

    #[test]
    fn schema_and_sql_checks_reject_false_digests() {
        let store = ContentSignalStore::in_memory().expect("store");
        assert_eq!(
            store
                .connection
                .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
                .unwrap(),
            CONTENT_SIGNALS_SCHEMA_VERSION
        );
        let invalid_nonhashed = store.connection.execute(
            "INSERT INTO content_observations VALUES
             ('a',1,NULL,'UNREADABLE','sha256-v1',?1,1,'g','read_failed')",
            ["0".repeat(64)],
        );
        assert!(invalid_nonhashed.is_err());
        let invalid_upper = store.connection.execute(
            "INSERT INTO content_observations VALUES
             ('b',1,NULL,'HASHED','sha256-v1',?1,1,'g',NULL)",
            ["A".repeat(64)],
        );
        assert!(invalid_upper.is_err());
    }

    #[test]
    fn brains_are_physically_isolated_even_on_the_same_source() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("same.bin"), b"same").expect("file");
        let paths = paths(&temp);
        let nodes = [file_node(2, "same.bin", 4)];
        run(&paths, "brain-alpha", &root, &nodes).expect("alpha");
        run(&paths, "brain-gamma", &root, &nodes).expect("gamma");
        let alpha_path = paths.brain_content_signals_database("brain-alpha");
        let gamma_path = paths.brain_content_signals_database("brain-gamma");
        assert_ne!(alpha_path, gamma_path);
        let alpha = ContentSignalStore::open(&alpha_path)
            .unwrap()
            .observation("same.bin")
            .unwrap()
            .unwrap();
        let gamma = ContentSignalStore::open(&gamma_path)
            .unwrap()
            .observation("same.bin")
            .unwrap()
            .unwrap();
        assert_eq!(alpha.hash_hex, gamma.hash_hex);
    }

    #[test]
    fn replacement_is_atomic_and_failed_campaign_preserves_previous_generation() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("file.bin"), b"first").expect("file");
        let paths = paths(&temp);
        let nodes = [file_node(2, "file.bin", 5)];
        let first = run(&paths, "brain-test", &root, &nodes).expect("first");
        let mut hook = |event: &ObservationEvent| {
            if matches!(event, ObservationEvent::BeforeCommit) {
                Err(MapError::ContentObservation(
                    "injected_before_commit".into(),
                ))
            } else {
                Ok(())
            }
        };
        let failed = observe_root_with_hook(&paths, "brain-test", &root, &nodes, &mut hook);
        assert!(failed.is_err());
        let summary = ContentSignalStore::open(&paths.brain_content_signals_database("brain-test"))
            .unwrap()
            .summary("brain-test", "relative".into())
            .unwrap();
        assert_eq!(
            summary.current_generation_id.as_deref(),
            Some(first.generation_id.as_str())
        );
        assert!(
            ContentSignalStore::open(&paths.brain_content_signals_database("brain-test"))
                .unwrap()
                .all_observations()
                .unwrap()
                .iter()
                .all(|entry| entry.generation_id == first.generation_id)
        );
    }

    #[test]
    fn every_campaign_reopens_rehashes_and_replaces_changed_content() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let file = root.join("file.bin");
        fs::write(&file, b"AAAA").expect("file");
        let paths = paths(&temp);
        let nodes = [file_node(2, "file.bin", 4)];
        let first = run(&paths, "brain-test", &root, &nodes).expect("first");
        let first_digest =
            ContentSignalStore::open(&paths.brain_content_signals_database("brain-test"))
                .unwrap()
                .observation("file.bin")
                .unwrap()
                .unwrap()
                .hash_hex
                .unwrap();
        fs::write(&file, b"BBBB").expect("same size mutation");
        let second = run(&paths, "brain-test", &root, &nodes).expect("second");
        let second_digest =
            ContentSignalStore::open(&paths.brain_content_signals_database("brain-test"))
                .unwrap()
                .observation("file.bin")
                .unwrap()
                .unwrap()
                .hash_hex
                .unwrap();
        assert_ne!(first.generation_id, second.generation_id);
        assert_ne!(first_digest, second_digest);
        assert_eq!(second.files_opened_for_hash, 1);
        assert_eq!(second.bytes_read, 4);
        assert_eq!(second.digests_computed, second.hashed_count);
    }

    #[test]
    fn unstable_read_never_publishes_a_digest() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let file = root.join("large.bin");
        fs::write(&file, vec![7_u8; HASH_BUFFER_BYTES * 2]).expect("file");
        let paths = paths(&temp);
        let nodes = [file_node(2, "large.bin", (HASH_BUFFER_BYTES * 2) as u64)];
        let mut changed = false;
        let mut hook = |event: &ObservationEvent| {
            if !changed && matches!(event, ObservationEvent::AfterChunk { .. }) {
                let mut bytes = fs::read(&file)?;
                bytes.push(9);
                fs::write(&file, bytes)?;
                changed = true;
            }
            Ok(())
        };
        let result = observe_root_with_hook(&paths, "brain-test", &root, &nodes, &mut hook);
        assert!(matches!(
            result,
            Err(MapError::ContentObservation(message)) if message == "SOURCE_CHANGED_DURING_OBSERVATION"
        ));
        // Exercise the file-level status independently of the global refusal.
        let mut counters = CampaignCounters::default();
        let before_len = fs::metadata(&file).unwrap().len();
        let mut changed_again = false;
        let mut hook = |event: &ObservationEvent| {
            if !changed_again && matches!(event, ObservationEvent::AfterChunk { .. }) {
                let mut bytes = fs::read(&file)?;
                bytes.push(10);
                fs::write(&file, bytes)?;
                changed_again = true;
            }
            Ok(())
        };
        let observation = observe_file(
            &root,
            &file_node(2, "large.bin", before_len),
            now_ms(),
            "generation",
            &mut counters,
            &mut hook,
        )
        .expect("observation");
        assert_eq!(
            observation.observation_status,
            ObservationStatus::UnstableDuringRead
        );
        assert!(observation.hash_hex.is_none());
        assert_eq!(counters.digests_computed, 0);
    }

    #[test]
    fn unreadable_or_disappeared_file_has_no_digest() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[file_node(2, "gone.bin", 9)],
        )
        .expect("campaign");
        assert_eq!(report.unreadable_count, 1);
        let observation =
            ContentSignalStore::open(&paths(&temp).brain_content_signals_database("brain-test"))
                .unwrap()
                .observation("gone.bin")
                .unwrap()
                .unwrap();
        assert!(observation.hash_algorithm.is_none());
        assert!(observation.hash_hex.is_none());
    }

    #[test]
    fn disappeared_paths_are_not_silently_current() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("keep.bin"), b"keep").unwrap();
        fs::write(root.join("remove.bin"), b"remove").unwrap();
        let paths = paths(&temp);
        let first = run(
            &paths,
            "brain-test",
            &root,
            &[file_node(2, "keep.bin", 4), file_node(3, "remove.bin", 6)],
        )
        .unwrap();
        fs::remove_file(root.join("remove.bin")).unwrap();
        let second = run(&paths, "brain-test", &root, &[file_node(2, "keep.bin", 4)]).unwrap();
        let store =
            ContentSignalStore::open(&paths.brain_content_signals_database("brain-test")).unwrap();
        assert_ne!(first.generation_id, second.generation_id);
        assert!(store.observation("remove.bin").unwrap().is_none());
        assert_eq!(store.all_observations().unwrap().len(), 1);
    }

    #[test]
    fn source_change_before_final_fingerprint_refuses_the_generation() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("file.bin"), b"stable").unwrap();
        let paths = paths(&temp);
        let nodes = [file_node(2, "file.bin", 6)];
        let first = run(&paths, "brain-test", &root, &nodes).unwrap();
        let mut hook = |event: &ObservationEvent| {
            if matches!(event, ObservationEvent::BeforeFingerprintAfter) {
                fs::write(root.join("late.bin"), b"change")?;
            }
            Ok(())
        };
        let result = observe_root_with_hook(&paths, "brain-test", &root, &nodes, &mut hook);
        assert!(result.is_err());
        let current = ContentSignalStore::open(&paths.brain_content_signals_database("brain-test"))
            .unwrap()
            .summary("brain-test", "relative".into())
            .unwrap();
        assert_eq!(current.current_generation_id, Some(first.generation_id));
    }

    #[test]
    fn content_store_contains_no_physical_identity_or_absolute_path_columns() {
        let store = ContentSignalStore::in_memory().unwrap();
        let mut statement = store
            .connection
            .prepare("PRAGMA table_info(content_observations)")
            .unwrap();
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        for forbidden in [
            "volume_serial_number",
            "file_id",
            "physical_file_identity",
            "stable_file_identity",
            "absolute_path",
        ] {
            assert!(!columns.iter().any(|column| column == forbidden));
        }
    }

    #[test]
    fn report_counts_partition_every_indexed_file() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("source");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("ok"), b"ok").unwrap();
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[
                file_node(2, "ok", 2),
                file_node(3, "missing", 0),
                file_node(4, "../bad", 0),
            ],
        )
        .unwrap();
        assert_eq!(
            report.indexed_file_count,
            report.hashed_count
                + report.unreadable_count
                + report.unstable_count
                + report.unsupported_count
        );
        assert_eq!(report.digests_computed, report.hashed_count);
    }

    #[test]
    fn diagnostics_never_contain_a_personal_or_absolute_path() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("source");
        fs::create_dir_all(&root).unwrap();
        run(
            &paths(&temp),
            "brain-test",
            &root,
            &[file_node(2, "missing", 0)],
        )
        .unwrap();
        let diagnostics =
            ContentSignalStore::open(&paths(&temp).brain_content_signals_database("brain-test"))
                .unwrap()
                .diagnostics()
                .unwrap();
        assert_eq!(diagnostics.len(), 1);
        assert!(diagnostics.iter().all(|entry| {
            entry.diagnostic.as_deref() == Some("metadata_unreadable")
                && !Path::new(&entry.relative_path).is_absolute()
        }));
    }

    #[cfg(unix)]
    #[test]
    fn symlink_escape_is_refused() {
        use std::os::unix::fs::symlink;
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("source");
        fs::create_dir_all(&root).unwrap();
        let outside = temp.path().join("outside");
        fs::write(&outside, b"outside").unwrap();
        symlink(&outside, root.join("link")).unwrap();
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[file_node(2, "link", 7)],
        )
        .unwrap();
        assert_eq!(report.unsupported_count, 1);
        assert_eq!(report.files_opened_for_hash, 0);
    }

    #[cfg(windows)]
    #[test]
    fn reparse_or_symlink_escape_is_refused_when_the_platform_allows_creation() {
        use std::os::windows::fs::symlink_file;
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("source");
        fs::create_dir_all(&root).unwrap();
        let outside = temp.path().join("outside");
        fs::write(&outside, b"outside").unwrap();
        if symlink_file(&outside, root.join("link")).is_err() {
            return;
        }
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[file_node(2, "link", 7)],
        )
        .unwrap();
        assert_eq!(report.unsupported_count, 1);
        assert_eq!(report.files_opened_for_hash, 0);
    }

    #[test]
    fn identical_groups_are_scoped_to_one_store() {
        let mut store = ContentSignalStore::in_memory().unwrap();
        let digest = "0".repeat(64);
        let observations = ["a", "b"].map(|path| ContentObservation {
            relative_path: path.into(),
            size_bytes: 0,
            modified_unix_ms: None,
            observation_status: ObservationStatus::Hashed,
            hash_algorithm: Some(HASH_ALGORITHM.into()),
            hash_hex: Some(digest.clone()),
            observed_at_unix_ms: 1,
            generation_id: "g".into(),
            diagnostic: None,
        });
        store
            .replace_generation("g", 1, "fingerprint", &observations)
            .unwrap();
        let members = store.identical_members(&digest).unwrap();
        assert_eq!(
            members
                .iter()
                .map(|entry| entry.relative_path.as_str())
                .collect::<Vec<_>>(),
            ["a", "b"]
        );
        assert_eq!(
            members
                .iter()
                .map(|entry| &entry.generation_id)
                .collect::<std::collections::BTreeSet<_>>()
                .len(),
            1
        );
    }

    #[test]
    fn store_metadata_has_only_the_current_complete_generation() {
        let mut store = ContentSignalStore::in_memory().unwrap();
        let observation = ContentObservation {
            relative_path: "a".into(),
            size_bytes: 0,
            modified_unix_ms: None,
            observation_status: ObservationStatus::Hashed,
            hash_algorithm: Some(HASH_ALGORITHM.into()),
            hash_hex: Some("0".repeat(64)),
            observed_at_unix_ms: 1,
            generation_id: "opaque-a".into(),
            diagnostic: None,
        };
        store
            .replace_generation("opaque-a", 1, "fp-a", &[observation])
            .unwrap();
        let metadata = [
            "schema_version",
            "signal_engine_version",
            "current_generation_id",
            "current_generation_observed_at",
            "source_fingerprint",
        ]
        .into_iter()
        .map(|key| (key, store.meta(key).unwrap()))
        .collect::<BTreeMap<_, _>>();
        assert_eq!(
            metadata["current_generation_id"].as_deref(),
            Some("opaque-a")
        );
        assert_eq!(
            metadata["signal_engine_version"].as_deref(),
            Some(SIGNAL_ENGINE_VERSION)
        );
    }

    #[test]
    fn real_pipeline_isolated_brains_rebuild_and_relation_stores_stay_unchanged() {
        use super::super::brains::BrainNodeRef;
        use super::super::relation_commands;

        let temp = tempfile::tempdir().expect("temp");
        let paths = SandboxPaths::under(temp.path().join("sandbox"));
        let alpha = BrainRecord::frozen_by_id("brain-alpha").expect("alpha");
        let gamma = BrainRecord::frozen_by_id("brain-gamma").expect("gamma");
        assert_eq!(alpha.source_ref, gamma.source_ref);

        commands::build_map(&paths, &alpha, false).expect("alpha map");
        commands::build_map(&paths, &gamma, false).expect("gamma map");
        let relations_before =
            relation_commands::open_relations(&paths, &alpha).expect("seeded relation store");
        let relation_storage_digest = || {
            let directory = paths
                .brain_relations_database(&alpha.brain_id)
                .parent()
                .expect("relations directory")
                .to_path_buf();
            let mut entries = fs::read_dir(directory)
                .expect("relation files")
                .map(|entry| entry.expect("relation file").path())
                .collect::<Vec<_>>();
            entries.sort();
            let mut digest = Sha256::new();
            for path in entries {
                digest.update(
                    path.file_name()
                        .expect("file name")
                        .to_string_lossy()
                        .as_bytes(),
                );
                digest.update(fs::read(path).expect("relation bytes"));
            }
            hex_lower(&digest.finalize())
        };
        let relation_bytes_before = relation_storage_digest();

        let alpha_report = observe_content(&paths, &alpha).expect("alpha observation");
        let gamma_report = observe_content(&paths, &gamma).expect("gamma observation");
        assert_eq!(relation_bytes_before, relation_storage_digest());
        assert!(alpha_report.read_only_confirmed && gamma_report.read_only_confirmed);
        assert_eq!(
            alpha_report.source_fingerprint_before,
            alpha_report.source_fingerprint_after
        );
        assert_ne!(alpha_report.store_path, gamma_report.store_path);
        assert_eq!(
            alpha_report.store_path,
            "brains/brain-alpha/signals/content.sqlite"
        );
        assert_eq!(
            gamma_report.store_path,
            "brains/brain-gamma/signals/content.sqlite"
        );

        let alpha_snapshot = commands::snapshot(&paths, &alpha).expect("alpha snapshot");
        let same_path = alpha_snapshot
            .nodes
            .iter()
            .find(|node| node.kind == NodeKind::File)
            .expect("indexed file");
        let alpha_observation =
            content_observation_for_path(&paths, &alpha, &same_path.relative_path)
                .expect("alpha read")
                .expect("alpha observation");
        let gamma_observation =
            content_observation_for_path(&paths, &gamma, &same_path.relative_path)
                .expect("gamma read")
                .expect("gamma observation");
        assert_eq!(alpha_observation.hash_hex, gamma_observation.hash_hex);
        assert_ne!(
            BrainNodeRef {
                brain_id: alpha.brain_id.clone(),
                node_id: same_path.id,
            },
            BrainNodeRef {
                brain_id: gamma.brain_id.clone(),
                node_id: same_path.id,
            }
        );

        let alpha_summary_before = content_observation_summary(&paths, &alpha).unwrap();
        commands::build_map(&paths, &alpha, true).expect("alpha rebuild");
        let alpha_summary_after = content_observation_summary(&paths, &alpha).unwrap();
        let alpha_observation_after =
            content_observation_for_path(&paths, &alpha, &same_path.relative_path)
                .unwrap()
                .unwrap();
        assert_eq!(alpha_summary_before, alpha_summary_after);
        assert_eq!(alpha_observation, alpha_observation_after);

        let relations_after = relation_commands::open_relations(&paths, &alpha)
            .expect("relation store after hashing and rebuild");
        assert_eq!(
            relations_before.deterministic_count,
            relations_after.deterministic_count
        );
        assert_eq!(
            relations_before.approved_count,
            relations_after.approved_count
        );
        assert_eq!(
            relations_before.pending_suggestion_count,
            relations_after.pending_suggestion_count
        );
        assert_eq!(
            relations_before.deterministic_digest,
            relations_after.deterministic_digest
        );
    }

    // --- X9: campaign source fingerprint (`sha256-tree-v1`) ---------------

    #[test]
    fn the_campaign_publishes_the_confined_tree_fingerprint() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("nested")).expect("root");
        fs::write(root.join("nested/file.bin"), b"payload").expect("file");
        let paths = paths(&temp);
        let report = run(
            &paths,
            "brain-test",
            &root,
            &[file_node(2, "nested/file.bin", 7)],
        )
        .expect("campaign");
        assert!(report
            .source_fingerprint_before
            .starts_with("sha256-tree-v1:"));
        assert_eq!(
            report.source_fingerprint_before,
            report.source_fingerprint_after
        );
        let digest = report
            .source_fingerprint_before
            .trim_start_matches("sha256-tree-v1:");
        assert_eq!(digest.len(), 64);
        assert!(digest
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase()));
        // The file digest engine keeps its own, different identity.
        assert_eq!(report.hash_algorithm, "sha256-v1");
        let summary = ContentSignalStore::open(&paths.brain_content_signals_database("brain-test"))
            .expect("store")
            .summary("brain-test", "relative".into())
            .expect("summary");
        assert_eq!(
            summary.source_fingerprint.as_deref(),
            Some(report.source_fingerprint_after.as_str())
        );
    }

    #[test]
    fn the_source_fingerprint_streams_files_in_bounded_chunks() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let payload = (0..(HASH_BUFFER_BYTES * 2 + 17))
            .map(|index| (index % 251) as u8)
            .collect::<Vec<_>>();
        fs::write(root.join("big.bin"), &payload).expect("big");
        let mut chunks = Vec::new();
        let fingerprint =
            fingerprint_source_tree(&root, &mut |read| chunks.push(read)).expect("fingerprint");
        // A single `fs::read` of the whole file would show one unbounded read.
        assert!(chunks.len() >= 3, "the engine stopped streaming: {chunks:?}");
        assert!(chunks.iter().all(|read| *read <= HASH_BUFFER_BYTES));
        assert_eq!(chunks.iter().sum::<usize>(), payload.len());
        assert!(fingerprint.starts_with("sha256-tree-v1:"));
    }

    #[test]
    fn the_source_fingerprint_is_deterministic_sensitive_and_path_independent() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("nested")).expect("root");
        fs::write(root.join("nested/a.bin"), b"AAAA").expect("a");
        let first = content_source_fingerprint(&root).expect("first");
        assert_eq!(first, content_source_fingerprint(&root).expect("stable"));
        fs::write(root.join("nested/a.bin"), b"BBBB").expect("same size mutation");
        let mutated = content_source_fingerprint(&root).expect("mutated");
        assert_ne!(first, mutated);
        fs::write(root.join("nested/b.bin"), b"BBBB").expect("new entry");
        assert_ne!(mutated, content_source_fingerprint(&root).expect("grown"));
        // The value depends on the observable tree, not on where it lives.
        let moved = temp.path().join("moved-elsewhere");
        let before_move = content_source_fingerprint(&root).expect("before move");
        fs::rename(&root, &moved).expect("rename");
        assert_eq!(
            before_move,
            content_source_fingerprint(&moved).expect("moved")
        );
        assert!(!before_move.contains(&*temp.path().to_string_lossy()));
    }

    #[test]
    fn a_reparse_point_is_a_link_even_when_it_looks_like_a_directory() {
        assert_eq!(marker_of(true, true, false), TREE_MARKER_LINK);
        assert_eq!(marker_of(true, false, true), TREE_MARKER_LINK);
        assert_eq!(marker_of(false, true, false), TREE_MARKER_DIRECTORY);
        assert_eq!(marker_of(false, false, true), TREE_MARKER_FILE);
        assert_eq!(marker_of(false, false, false), TREE_MARKER_OTHER);
    }

    #[cfg(windows)]
    #[test]
    fn windows_reparse_attribute_detection_is_deterministic() {
        // FILE_ATTRIBUTE_DIRECTORY, FILE_ATTRIBUTE_ARCHIVE, FILE_ATTRIBUTE_NORMAL.
        assert!(!attributes_are_reparse_point(0x0000_0010));
        assert!(!attributes_are_reparse_point(0x0000_0020));
        assert!(!attributes_are_reparse_point(0x0000_0080));
        assert!(attributes_are_reparse_point(WINDOWS_REPARSE_POINT_ATTRIBUTE));
        // A junction is a directory *and* a reparse point.
        assert!(attributes_are_reparse_point(
            0x0000_0010 | WINDOWS_REPARSE_POINT_ATTRIBUTE
        ));
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("nested")).expect("root");
        fs::write(root.join("file.bin"), b"plain").expect("file");
        assert!(!metadata_is_reparse_point(
            &fs::symlink_metadata(root.join("file.bin")).expect("file metadata")
        ));
        assert!(!metadata_is_reparse_point(
            &fs::symlink_metadata(root.join("nested")).expect("dir metadata")
        ));
        assert_eq!(
            tree_marker(&fs::symlink_metadata(root.join("file.bin")).expect("file metadata")),
            TREE_MARKER_FILE
        );
        assert_eq!(
            tree_marker(&fs::symlink_metadata(root.join("nested")).expect("dir metadata")),
            TREE_MARKER_DIRECTORY
        );
    }

    #[cfg(unix)]
    #[test]
    fn the_source_fingerprint_never_reads_through_a_file_link_leaving_the_root() {
        use std::os::unix::fs::symlink;
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("inside.bin"), b"inside").expect("inside");
        let outside = temp.path().join("outside.bin");
        fs::write(&outside, b"outside-v1").expect("outside");
        symlink(&outside, root.join("link")).expect("symlink");

        let first = content_source_fingerprint(&root).expect("with target");
        // The historical fixture fingerprint read the target through the link.
        fs::write(&outside, b"outside-v2").expect("mutate outside");
        assert_eq!(
            first,
            content_source_fingerprint(&root).expect("target mutated"),
            "the fingerprint followed a link out of the root"
        );
        // A dangling link stays fingerprintable: nothing is ever opened.
        fs::remove_file(&outside).expect("remove outside");
        assert_eq!(
            first,
            content_source_fingerprint(&root).expect("dangling link"),
            "the fingerprint depended on a target outside the root"
        );
    }

    #[cfg(unix)]
    #[test]
    fn the_source_fingerprint_never_descends_into_a_directory_link() {
        use std::os::unix::fs::symlink;
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let outside = temp.path().join("outside");
        fs::create_dir_all(&outside).expect("outside");
        fs::write(outside.join("first.bin"), b"first").expect("first");
        symlink(&outside, root.join("dirlink")).expect("symlink dir");

        let first = content_source_fingerprint(&root).expect("with directory link");
        fs::write(outside.join("second.bin"), b"second").expect("second");
        assert_eq!(
            first,
            content_source_fingerprint(&root).expect("outside grown"),
            "the fingerprint walked into a directory link"
        );
    }

    #[cfg(windows)]
    #[test]
    fn the_source_fingerprint_never_follows_windows_links_when_creation_is_allowed() {
        use std::os::windows::fs::{symlink_dir, symlink_file};
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("inside.bin"), b"inside").expect("inside");
        let outside_file = temp.path().join("outside.bin");
        fs::write(&outside_file, b"outside-v1").expect("outside file");
        let outside_dir = temp.path().join("outside");
        fs::create_dir_all(&outside_dir).expect("outside dir");
        fs::write(outside_dir.join("first.bin"), b"first").expect("first");
        // Creating a symlink needs a privilege this host may not grant; only
        // the creation is skipped, the detection stays covered above.
        if symlink_file(&outside_file, root.join("link")).is_err() {
            return;
        }
        if symlink_dir(&outside_dir, root.join("dirlink")).is_err() {
            return;
        }

        let first = content_source_fingerprint(&root).expect("with links");
        fs::write(&outside_file, b"outside-v2").expect("mutate outside file");
        fs::write(outside_dir.join("second.bin"), b"second").expect("grow outside dir");
        assert_eq!(
            first,
            content_source_fingerprint(&root).expect("outside mutated"),
            "the fingerprint followed a link out of the root"
        );
        fs::remove_file(&outside_file).expect("remove outside file");
        assert!(
            content_source_fingerprint(&root).is_ok(),
            "dangling link refused"
        );
    }

    /// A directory junction is a real reparse point that an ordinary Windows
    /// account can create, so this proof runs without any privilege.
    #[cfg(windows)]
    #[test]
    fn a_windows_junction_out_of_the_root_is_never_entered() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("inside.bin"), b"inside").expect("inside");
        let outside = temp.path().join("outside");
        fs::create_dir_all(&outside).expect("outside");
        fs::write(outside.join("first.bin"), b"first").expect("first");
        let junction = root.join("junction");
        let created = std::process::Command::new("cmd")
            .args(["/c", "mklink", "/J"])
            .arg(&junction)
            .arg(&outside)
            .output();
        let available = matches!(&created, Ok(output) if output.status.success());
        if !available {
            // Only the creation is skipped; classification stays covered by
            // `windows_reparse_attribute_detection_is_deterministic`.
            return;
        }

        let metadata = fs::symlink_metadata(&junction).expect("junction metadata");
        assert!(metadata_is_reparse_point(&metadata));
        assert_eq!(tree_marker(&metadata), TREE_MARKER_LINK);

        let first = content_source_fingerprint(&root).expect("with junction");
        fs::write(outside.join("second.bin"), b"second").expect("grow outside");
        assert_eq!(
            first,
            content_source_fingerprint(&root).expect("outside grown"),
            "the fingerprint walked through a junction out of the root"
        );

        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[
                file_node(2, "inside.bin", 6),
                file_node(3, "junction/first.bin", 5),
            ],
        )
        .expect("campaign");
        assert_eq!(report.hashed_count, 1);
        assert_eq!(report.files_opened_for_hash, 1);
        assert_eq!(report.unsupported_count + report.unreadable_count, 1);

        // Remove the link itself, never the tree it points at.
        fs::remove_dir(&junction).expect("remove junction");
        assert!(outside.join("first.bin").exists());
    }

    // --- X10: opened-object confinement ---------------------------------

    #[cfg(windows)]
    #[test]
    fn file_replacement_after_validation_never_hashes_outside_bytes() {
        use std::os::windows::fs::symlink_file;

        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        let victim = root.join("victim.bin");
        fs::write(&victim, b"inside").expect("inside file");
        let outside_file = temp.path().join("outside.bin");
        fs::write(&outside_file, b"OUTSIDE-SECRET").expect("outside file");
        let outside_directory = temp.path().join("outside-directory");
        fs::create_dir_all(&outside_directory).expect("outside directory");
        fs::write(outside_directory.join("secret.bin"), b"OUTSIDE-SECRET")
            .expect("outside secret");

        let mut replaced = false;
        let mut hook = |event: &ObservationEvent| {
            if !replaced
                && matches!(
                    event,
                    ObservationEvent::BeforeConfinedFileOpen { relative_path }
                        if relative_path == "victim.bin"
                )
            {
                fs::remove_file(&victim)?;
                if symlink_file(&outside_file, &victim).is_err() {
                    // A directory junction is an unprivileged reparse point
                    // and deterministically exercises the same final-component
                    // no-follow decision when file symlinks are unavailable.
                    create_junction(&victim, &outside_directory)?;
                }
                replaced = true;
            }
            Ok(())
        };
        let mut counters = CampaignCounters::default();
        let observation = observe_file(
            &root,
            &file_node(2, "victim.bin", 6),
            now_ms(),
            "generation",
            &mut counters,
            &mut hook,
        )
        .expect("observation");

        assert!(replaced, "the synchronized replacement did not run");
        assert_eq!(observation.observation_status, ObservationStatus::Unsupported);
        assert!(observation.hash_hex.is_none());
        assert_eq!(counters.files_opened_for_hash, 0);
        assert_eq!(counters.bytes_read, 0);
        assert_eq!(counters.digests_computed, 0);
    }

    #[cfg(windows)]
    #[test]
    fn directory_replacement_after_listing_never_traverses_the_junction() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("swap")).expect("root");
        fs::write(root.join("inside.bin"), b"inside").expect("inside");
        let outside = temp.path().join("outside");
        fs::create_dir_all(&outside).expect("outside");
        fs::write(outside.join("secret.bin"), b"OUTSIDE-SECRET").expect("outside secret");

        let mut replaced = false;
        let mut bytes_read = 0_usize;
        let first = fingerprint_source_tree_with_hook(
            &root,
            &mut |read| bytes_read += read,
            &mut |relative, initially_observed_marker| {
                if !replaced
                    && relative == "swap"
                    && initially_observed_marker == TREE_MARKER_DIRECTORY
                {
                    fs::remove_dir(root.join("swap"))?;
                    create_junction(&root.join("swap"), &outside)?;
                    replaced = true;
                }
                Ok(())
            },
        )
        .expect("fingerprint");

        assert!(replaced, "the synchronized replacement did not run");
        assert_eq!(bytes_read, b"inside".len());
        fs::write(outside.join("second-secret.bin"), b"more outside")
            .expect("mutate outside");
        assert_eq!(
            first,
            content_source_fingerprint(&root).expect("fingerprint after outside mutation")
        );
    }

    #[cfg(windows)]
    #[test]
    fn intermediate_directories_remain_pinned_until_the_open_file_is_read() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(root.join("a/b")).expect("tree");
        fs::write(root.join("a/b/file.bin"), b"inside").expect("inside");
        let mut replacement_was_refused = false;
        let mut attempted = false;
        let mut hook = |event: &ObservationEvent| {
            if !attempted
                && matches!(
                    event,
                    ObservationEvent::DirectoryPinned { relative_path }
                        if relative_path == "a"
                )
            {
                attempted = true;
                replacement_was_refused =
                    fs::rename(root.join("a"), root.join("moved-a")).is_err();
            }
            Ok(())
        };
        let mut counters = CampaignCounters::default();
        let observation = observe_file(
            &root,
            &file_node(2, "a/b/file.bin", 6),
            now_ms(),
            "generation",
            &mut counters,
            &mut hook,
        )
        .expect("observation");

        assert!(attempted);
        assert!(replacement_was_refused);
        assert_eq!(observation.observation_status, ObservationStatus::Hashed);
        assert_eq!(counters.bytes_read, 6);
    }

    #[cfg(unix)]
    #[test]
    fn a_campaign_survives_a_dangling_link_under_the_root() {
        use std::os::unix::fs::symlink;
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("source");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("inside.bin"), b"inside").expect("inside");
        let outside = temp.path().join("outside.bin");
        fs::write(&outside, b"outside").expect("outside");
        symlink(&outside, root.join("link")).expect("symlink");
        fs::remove_file(&outside).expect("remove outside");

        // The historical fixture fingerprint failed here: it tried to read the
        // vanished target through the link.
        let report = run(
            &paths(&temp),
            "brain-test",
            &root,
            &[file_node(2, "inside.bin", 6), file_node(3, "link", 0)],
        )
        .expect("campaign");
        assert_eq!(report.hashed_count, 1);
        assert_eq!(report.unsupported_count, 1);
        assert_eq!(report.files_opened_for_hash, 1);
    }
}
