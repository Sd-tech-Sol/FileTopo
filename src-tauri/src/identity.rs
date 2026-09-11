//! Stable node identity — `DEC-0009` I-E, productionised by `TASK-0036`.
//!
//! Two provenances, never a third:
//!
//! * [`IdentityProvenance::System`] — Windows `VolumeSerialNumber` + `FileId`
//!   128 bits, obtained by a metadata-only handle open. The technique is
//!   `spikes/b3-windows-identity/src/main.rs`, `VERIFIED` by `PERF-0003` /
//!   `TASK-0012` B3: adapted here on Rust **stable**, not reinvented. Survives
//!   an intra-volume rename or move. `DEC-0009`'s amendment is a hard
//!   invariant, not a preference: the identity is always the **couple**
//!   `VolumeSerialNumber` + `FileId`; `FileId` alone is never used, compared
//!   or stored anywhere in this codebase.
//! * [`IdentityProvenance::PathFallback`] — a deterministic, versioned
//!   fingerprint of the raw relative path and node kind, nothing else. It
//!   changes the instant the path changes: the known, declared limitation
//!   `DEC-0009` accepts wherever `System` is not used.
//!
//! Reparse points, skipped entries and online-only (cloud placeholder)
//! entries never get an extra handle opened on their behalf — `TASK-0036` B
//! requires the scanner's existing exclusions to be respected exactly, with
//! no implicit hydration, so those nodes always resolve to `PathFallback`.
//!
//! **Nothing here is exposed to the frontend.** A [`NodeIdentity`] travels
//! beside a [`crate::domain::NodeDto`] during scanning and publication, never
//! inside a DTO that reaches the WebView, a log or an artifact — see
//! `crate::index::Index::publish_with_identity`.

use crate::domain::NodeKind;
use crate::path_codec;
use std::path::Path;

/// Version tag of the path-fallback algorithm. Bumping it is a migration —
/// every existing fallback identity changes at once, on purpose — never a
/// silent reinterpretation of keys already stored. `DEC-0009`: "l'empreinte
/// de repli est versionnée".
const PATH_FALLBACK_VERSION: &str = "PFv1";

/// Version tag of the Windows system identity **encoding** (this module's
/// string shape), independent of the underlying Win32 contract. Lets a
/// stored key always be told apart from a future encoding.
const SYSTEM_TAG: &str = "SYS1";

/// The two — and only two — provenances I-E allows. Never a heuristic.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IdentityProvenance {
    System,
    PathFallback,
}

impl IdentityProvenance {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::System => "SYSTEM",
            Self::PathFallback => "PATH_FALLBACK",
        }
    }

    #[allow(dead_code)]
    pub fn from_db(value: &str) -> Option<Self> {
        match value {
            "SYSTEM" => Some(Self::System),
            "PATH_FALLBACK" => Some(Self::PathFallback),
            _ => None,
        }
    }
}

/// One node's stable identity, computed by the scanner and carried alongside
/// its [`crate::domain::NodeDto`] — never inside it, so an internal key can
/// never accidentally ride along a DTO serialized to the frontend.
#[derive(Debug, Clone)]
pub struct NodeIdentity {
    /// The scanner's own temporary id (`NodeDto::id`, before publication
    /// remaps it to a canonical `nodes.id`) — never a canonical id.
    pub node_id: i64,
    pub stable_key: String,
    pub provenance: IdentityProvenance,
}

/// FNV-1a, 64 bits — deliberately its own copy rather than a shared import of
/// `crate::map::fnv1a64`: identity is a core concern the scanner and index
/// depend on directly, and `map` already depends on the scanner, so sharing
/// the one in `map` would point the dependency the wrong way for five lines
/// of arithmetic. Same constants, same algorithm, and reproducible against
/// the independent JavaScript spike `spikes/b3-windows-identity` already
/// checked itself against.
fn fnv1a64(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

/// The deterministic, versioned repli of `DEC-0009`: a fingerprint of the raw
/// relative path and node kind, nothing else. No size, no date, no
/// resemblance score can ever enter it — and no content is read.
///
/// Hashed from the **raw OS representation** of `relative` —
/// [`crate::path_codec::encode_path`], the same lossless codec `DEC-0033` C
/// already requires for persisting a source path — never from a
/// `to_string_lossy()` projection. `ACTION-0057` D3: two distinct raw paths
/// that `to_string_lossy()` would fold to the same `U+FFFD`-repaired string
/// (an unpaired UTF-16 surrogate on Windows, a non-UTF-8 byte elsewhere) must
/// not collide here, where the display projection never does.
///
/// The encoded path is **length-prefixed** before the node kind is appended,
/// and the version tag is folded into the hashed material itself, not only
/// into the returned key's prefix: without an explicit boundary, a raw path
/// whose trailing bytes happened to read as a kind tag could hash identically
/// to a shorter path followed by that tag.
pub fn path_fallback_key(relative: &Path, kind: NodeKind) -> String {
    let encoded = path_codec::encode_path(relative);
    let mut bytes = Vec::with_capacity(encoded.len() + 32);
    bytes.extend_from_slice(PATH_FALLBACK_VERSION.as_bytes());
    bytes.push(0);
    bytes.extend_from_slice(&(encoded.len() as u64).to_le_bytes());
    bytes.extend_from_slice(&encoded);
    bytes.push(0);
    bytes.extend_from_slice(kind.as_str().as_bytes());
    format!("{PATH_FALLBACK_VERSION}:{:016x}", fnv1a64(&bytes))
}

/// Whether this node may even be considered for the Windows `SYSTEM`
/// identity. `TASK-0036` B: reparse points, skipped entries and online-only
/// placeholders never get an extra handle opened on their behalf — the
/// existing scanner exclusions are respected exactly, and no implicit
/// hydration is introduced by this feature.
fn eligible_for_system_identity(kind: NodeKind, reparse_point: bool, online_only: bool) -> bool {
    !reparse_point && !online_only && kind != NodeKind::Skipped
}

/// Resolves one node's stable identity: `SYSTEM` when eligible and
/// obtainable, `PathFallback` otherwise — the only two provenances I-E
/// allows, and always exactly one of them.
pub fn compute_identity(
    absolute_path: &Path,
    relative: &Path,
    kind: NodeKind,
    reparse_point: bool,
    online_only: bool,
) -> (String, IdentityProvenance) {
    if eligible_for_system_identity(kind, reparse_point, online_only)
        && let Some(key) = system_identity_key(absolute_path)
    {
        return (key, IdentityProvenance::System);
    }
    (
        path_fallback_key(relative, kind),
        IdentityProvenance::PathFallback,
    )
}

/// The Windows `SYSTEM` identity: `VolumeSerialNumber` + `FileId` 128 bits,
/// via `GetFileInformationByHandleEx(FileIdInfo)` on a handle opened for
/// metadata only. Adapted from `spikes/b3-windows-identity/src/main.rs`,
/// unchanged in technique: `dwDesiredAccess = 0` (no data access, ever),
/// `FILE_FLAG_BACKUP_SEMANTICS` (required to open a directory at all), and no
/// content is read. `None` on any failure — a missing identity is always a
/// fallback, never an error the caller must handle specially.
#[cfg(windows)]
fn system_identity_key(path: &Path) -> Option<String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_FLAG_BACKUP_SEMANTICS, FILE_ID_INFO,
        FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, FileIdInfo,
        GetFileInformationByHandleEx, OPEN_EXISTING,
    };

    let mut wide: Vec<u16> = OsStr::new(path).encode_wide().collect();
    wide.push(0);
    let handle: HANDLE = unsafe {
        CreateFileW(
            wide.as_ptr(),
            0, // metadata only — never GENERIC_READ, never file content.
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            std::ptr::null(),
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL | FILE_FLAG_BACKUP_SEMANTICS,
            std::ptr::null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        return None;
    }
    let mut info: FILE_ID_INFO = unsafe { std::mem::zeroed() };
    let ok = unsafe {
        GetFileInformationByHandleEx(
            handle,
            FileIdInfo,
            &mut info as *mut _ as *mut core::ffi::c_void,
            std::mem::size_of::<FILE_ID_INFO>() as u32,
        )
    };
    unsafe {
        CloseHandle(handle);
    }
    if ok == 0 {
        return None;
    }
    let mut file_id_hex = String::with_capacity(32);
    for byte in info.FileId.Identifier {
        file_id_hex.push_str(&format!("{byte:02x}"));
    }
    // The couple, never `FileId` alone — `DEC-0009`'s amendment.
    Some(format!(
        "{SYSTEM_TAG}:{:016x}:{file_id_hex}",
        info.VolumeSerialNumber
    ))
}

#[cfg(not(windows))]
fn system_identity_key(_path: &Path) -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn the_fallback_key_is_deterministic_and_versioned() {
        let a = path_fallback_key(Path::new("dossier/fichier.txt"), NodeKind::File);
        let b = path_fallback_key(Path::new("dossier/fichier.txt"), NodeKind::File);
        assert_eq!(
            a, b,
            "the same path and kind must always fold to the same key"
        );
        assert!(
            a.starts_with("PFv1:"),
            "the version tag must be explicit: {a}"
        );
    }

    #[test]
    fn the_fallback_key_changes_with_the_path() {
        let before = path_fallback_key(Path::new("dossier/avant.txt"), NodeKind::File);
        let after = path_fallback_key(Path::new("dossier/apres.txt"), NodeKind::File);
        assert_ne!(
            before, after,
            "a renamed path must not keep the old fallback key"
        );
    }

    #[test]
    fn the_fallback_key_changes_with_the_kind() {
        let as_file = path_fallback_key(Path::new("un-nom"), NodeKind::File);
        let as_directory = path_fallback_key(Path::new("un-nom"), NodeKind::Directory);
        assert_ne!(
            as_file, as_directory,
            "the same relative path must not collide across kinds"
        );
    }

    /// `ACTION-0057` D3 — the length-prefix rules out a concatenation
    /// ambiguity between a raw path and the kind tag appended after it: a
    /// path ending in bytes that happen to read as `"file"` must not collide
    /// with a shorter path genuinely followed by that tag.
    #[test]
    fn the_fallback_key_has_no_concatenation_ambiguity_between_path_and_kind() {
        let crafted = path_fallback_key(Path::new("dossier/xfile"), NodeKind::Directory);
        let shorter = path_fallback_key(Path::new("dossier/x"), NodeKind::File);
        assert_ne!(
            crafted, shorter,
            "a path/kind boundary must never be guessable from concatenated bytes"
        );
    }

    #[test]
    fn reparse_points_never_attempt_a_system_identity() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("reel.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        let (key, provenance) =
            compute_identity(&file, Path::new("reel.txt"), NodeKind::File, true, false);
        assert_eq!(provenance, IdentityProvenance::PathFallback);
        assert_eq!(
            key,
            path_fallback_key(Path::new("reel.txt"), NodeKind::File)
        );
    }

    #[test]
    fn online_only_entries_never_attempt_a_system_identity() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("nuage.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        let (key, provenance) =
            compute_identity(&file, Path::new("nuage.txt"), NodeKind::File, false, true);
        assert_eq!(provenance, IdentityProvenance::PathFallback);
        assert_eq!(
            key,
            path_fallback_key(Path::new("nuage.txt"), NodeKind::File)
        );
    }

    #[test]
    fn skipped_entries_never_attempt_a_system_identity() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("ignore.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        let (key, provenance) = compute_identity(
            &file,
            Path::new("ignore.txt"),
            NodeKind::Skipped,
            false,
            false,
        );
        assert_eq!(provenance, IdentityProvenance::PathFallback);
        assert_eq!(
            key,
            path_fallback_key(Path::new("ignore.txt"), NodeKind::Skipped)
        );
    }

    /// `ACTION-0057` D3 — the whole point of this correction: two distinct
    /// raw paths that `to_string_lossy()` would fold onto the same
    /// `U+FFFD`-repaired projection must still produce different fallback
    /// keys, because the hashed material is the raw OS encoding, never the
    /// lossy display string.
    #[test]
    #[cfg(windows)]
    fn two_distinct_raw_paths_with_unpaired_surrogates_never_collide_under_lossy_projection() {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;

        // Two different lone high surrogates (0xD800 and 0xD801), each
        // followed by an ordinary character. Both are legal in a Windows
        // filename and both are illegal in UTF-8, so `to_string_lossy()`
        // repairs each lone surrogate to the same U+FFFD and the two
        // projections collide as text — exactly the ambiguity `ACTION-0057`
        // D3 exists to close.
        let a = OsString::from_wide(&[0x0064, 0xD800, 0x0061]); // "d" + lone high surrogate + "a"
        let b = OsString::from_wide(&[0x0064, 0xD801, 0x0061]); // "d" + a DIFFERENT lone surrogate + "a"
        let path_a = PathBuf::from(&a);
        let path_b = PathBuf::from(&b);

        assert_eq!(
            path_a.to_string_lossy(),
            path_b.to_string_lossy(),
            "this test is only meaningful if the lossy projections actually collide"
        );
        assert_ne!(path_a, path_b, "the raw paths themselves must differ");

        let key_a = path_fallback_key(&path_a, NodeKind::File);
        let key_b = path_fallback_key(&path_b, NodeKind::File);
        assert_ne!(
            key_a, key_b,
            "two distinct raw paths must not fold to the same fallback key, \
             even when their lossy projection is identical"
        );
    }

    /// Non-Windows equivalent of the surrogate test above: two distinct raw
    /// byte sequences that are not valid UTF-8 and that `to_string_lossy()`
    /// would repair to the same replacement-character string.
    #[test]
    #[cfg(not(windows))]
    fn two_distinct_raw_paths_with_invalid_utf8_bytes_never_collide_under_lossy_projection() {
        use std::ffi::OsString;
        use std::os::unix::ffi::OsStringExt;

        let a = OsString::from_vec(vec![b'd', 0x80, b'a']);
        let b = OsString::from_vec(vec![b'd', 0x81, b'a']);
        let path_a = PathBuf::from(&a);
        let path_b = PathBuf::from(&b);

        assert_eq!(
            path_a.to_string_lossy(),
            path_b.to_string_lossy(),
            "this test is only meaningful if the lossy projections actually collide"
        );
        assert_ne!(path_a, path_b, "the raw paths themselves must differ");

        let key_a = path_fallback_key(&path_a, NodeKind::File);
        let key_b = path_fallback_key(&path_b, NodeKind::File);
        assert_ne!(
            key_a, key_b,
            "two distinct raw paths must not fold to the same fallback key, \
             even when their lossy projection is identical"
        );
    }

    #[cfg(windows)]
    mod windows_system_identity {
        use super::*;

        #[test]
        fn an_eligible_real_file_gets_a_system_identity_shaped_as_the_couple() {
            let temp = tempfile::tempdir().expect("tempdir");
            let file = temp.path().join("sonde.txt");
            std::fs::write(&file, b"synthetique").expect("write");

            let (key, provenance) =
                compute_identity(&file, Path::new("sonde.txt"), NodeKind::File, false, false);
            assert_eq!(provenance, IdentityProvenance::System);
            // `SYS1:<volume 16 hex>:<file id 32 hex>` — the couple, never
            // `FileId` alone.
            let parts: Vec<&str> = key.split(':').collect();
            assert_eq!(parts.len(), 3, "got {key}");
            assert_eq!(parts[0], "SYS1");
            assert_eq!(
                parts[1].len(),
                16,
                "volume serial must be the full 64 bits: {key}"
            );
            assert_eq!(
                parts[2].len(),
                32,
                "file id must be the full 128 bits: {key}"
            );
        }

        #[test]
        fn a_renamed_file_on_the_same_volume_keeps_its_system_identity() {
            let temp = tempfile::tempdir().expect("tempdir");
            let before = temp.path().join("avant.dat");
            std::fs::write(&before, b"synthetique").expect("write");
            let (before_key, _) = compute_identity(
                &before,
                Path::new("avant.dat"),
                NodeKind::File,
                false,
                false,
            );

            let after = temp.path().join("apres.dat");
            std::fs::rename(&before, &after).expect("rename");
            let (after_key, provenance) =
                compute_identity(&after, Path::new("apres.dat"), NodeKind::File, false, false);

            assert_eq!(provenance, IdentityProvenance::System);
            assert_eq!(
                before_key, after_key,
                "a same-volume rename must not change the identity"
            );
        }

        #[test]
        fn a_file_moved_to_a_subfolder_on_the_same_volume_keeps_its_system_identity() {
            let temp = tempfile::tempdir().expect("tempdir");
            let before = temp.path().join("depart.dat");
            std::fs::write(&before, b"synthetique").expect("write");
            let (before_key, _) = compute_identity(
                &before,
                Path::new("depart.dat"),
                NodeKind::File,
                false,
                false,
            );

            let sub = temp.path().join("sous-dossier");
            std::fs::create_dir(&sub).expect("mkdir");
            let after = sub.join("depart.dat");
            std::fs::rename(&before, &after).expect("move");
            let (after_key, provenance) = compute_identity(
                &after,
                Path::new("sous-dossier/depart.dat"),
                NodeKind::File,
                false,
                false,
            );

            assert_eq!(provenance, IdentityProvenance::System);
            assert_eq!(
                before_key, after_key,
                "a same-volume move must not change the identity"
            );
        }

        #[test]
        fn a_renamed_directory_on_the_same_volume_keeps_its_system_identity() {
            let temp = tempfile::tempdir().expect("tempdir");
            let before = temp.path().join("dossier-avant");
            std::fs::create_dir(&before).expect("mkdir");
            let (before_key, _) = compute_identity(
                &before,
                Path::new("dossier-avant"),
                NodeKind::Directory,
                false,
                false,
            );

            let after = temp.path().join("dossier-apres");
            std::fs::rename(&before, &after).expect("rename");
            let (after_key, provenance) = compute_identity(
                &after,
                Path::new("dossier-apres"),
                NodeKind::Directory,
                false,
                false,
            );

            assert_eq!(provenance, IdentityProvenance::System);
            assert_eq!(
                before_key, after_key,
                "a same-volume rename must not change the identity"
            );
        }

        #[test]
        fn two_distinct_files_never_share_a_system_identity() {
            let temp = tempfile::tempdir().expect("tempdir");
            let a = temp.path().join("a.dat");
            let b = temp.path().join("b.dat");
            std::fs::write(&a, b"synthetique").expect("write a");
            std::fs::write(&b, b"synthetique").expect("write b");

            let (key_a, _) = compute_identity(&a, Path::new("a.dat"), NodeKind::File, false, false);
            let (key_b, _) = compute_identity(&b, Path::new("b.dat"), NodeKind::File, false, false);
            assert_ne!(key_a, key_b);
        }

        #[test]
        fn a_copy_receives_a_different_system_identity_than_its_source() {
            // What an inter-volume move looks like — `DEC-0009` accepts this
            // as a new identity, deliberately: a copy is a different file.
            let temp = tempfile::tempdir().expect("tempdir");
            let source = temp.path().join("source.dat");
            std::fs::write(&source, b"synthetique").expect("write");
            let destination = temp.path().join("destination.dat");
            std::fs::copy(&source, &destination).expect("copy");

            let (source_key, _) = compute_identity(
                &source,
                Path::new("source.dat"),
                NodeKind::File,
                false,
                false,
            );
            let (destination_key, _) = compute_identity(
                &destination,
                Path::new("destination.dat"),
                NodeKind::File,
                false,
                false,
            );
            assert_ne!(source_key, destination_key);
        }
    }
}
