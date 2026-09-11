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
pub fn path_fallback_key(relative_path: &str, kind: NodeKind) -> String {
    let mut bytes = Vec::with_capacity(relative_path.len() + 16);
    bytes.extend_from_slice(relative_path.as_bytes());
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
    relative_path: &str,
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
        path_fallback_key(relative_path, kind),
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

    #[test]
    fn the_fallback_key_is_deterministic_and_versioned() {
        let a = path_fallback_key("dossier/fichier.txt", NodeKind::File);
        let b = path_fallback_key("dossier/fichier.txt", NodeKind::File);
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
        let before = path_fallback_key("dossier/avant.txt", NodeKind::File);
        let after = path_fallback_key("dossier/apres.txt", NodeKind::File);
        assert_ne!(
            before, after,
            "a renamed path must not keep the old fallback key"
        );
    }

    #[test]
    fn the_fallback_key_changes_with_the_kind() {
        let as_file = path_fallback_key("un-nom", NodeKind::File);
        let as_directory = path_fallback_key("un-nom", NodeKind::Directory);
        assert_ne!(
            as_file, as_directory,
            "the same relative path must not collide across kinds"
        );
    }

    #[test]
    fn reparse_points_never_attempt_a_system_identity() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("reel.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        let (key, provenance) = compute_identity(&file, "reel.txt", NodeKind::File, true, false);
        assert_eq!(provenance, IdentityProvenance::PathFallback);
        assert_eq!(key, path_fallback_key("reel.txt", NodeKind::File));
    }

    #[test]
    fn online_only_entries_never_attempt_a_system_identity() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("nuage.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        let (key, provenance) = compute_identity(&file, "nuage.txt", NodeKind::File, false, true);
        assert_eq!(provenance, IdentityProvenance::PathFallback);
        assert_eq!(key, path_fallback_key("nuage.txt", NodeKind::File));
    }

    #[test]
    fn skipped_entries_never_attempt_a_system_identity() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("ignore.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        let (key, provenance) =
            compute_identity(&file, "ignore.txt", NodeKind::Skipped, false, false);
        assert_eq!(provenance, IdentityProvenance::PathFallback);
        assert_eq!(key, path_fallback_key("ignore.txt", NodeKind::Skipped));
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
                compute_identity(&file, "sonde.txt", NodeKind::File, false, false);
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
            let (before_key, _) =
                compute_identity(&before, "avant.dat", NodeKind::File, false, false);

            let after = temp.path().join("apres.dat");
            std::fs::rename(&before, &after).expect("rename");
            let (after_key, provenance) =
                compute_identity(&after, "apres.dat", NodeKind::File, false, false);

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
            let (before_key, _) =
                compute_identity(&before, "depart.dat", NodeKind::File, false, false);

            let sub = temp.path().join("sous-dossier");
            std::fs::create_dir(&sub).expect("mkdir");
            let after = sub.join("depart.dat");
            std::fs::rename(&before, &after).expect("move");
            let (after_key, provenance) = compute_identity(
                &after,
                "sous-dossier/depart.dat",
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
            let (before_key, _) =
                compute_identity(&before, "dossier-avant", NodeKind::Directory, false, false);

            let after = temp.path().join("dossier-apres");
            std::fs::rename(&before, &after).expect("rename");
            let (after_key, provenance) =
                compute_identity(&after, "dossier-apres", NodeKind::Directory, false, false);

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

            let (key_a, _) = compute_identity(&a, "a.dat", NodeKind::File, false, false);
            let (key_b, _) = compute_identity(&b, "b.dat", NodeKind::File, false, false);
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

            let (source_key, _) =
                compute_identity(&source, "source.dat", NodeKind::File, false, false);
            let (destination_key, _) = compute_identity(
                &destination,
                "destination.dat",
                NodeKind::File,
                false,
                false,
            );
            assert_ne!(source_key, destination_key);
        }
    }
}
