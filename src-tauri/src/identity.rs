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
///
/// `ACTION-0058` D5 / `DEC-0035`: a node otherwise eligible for `SYSTEM`
/// still never attempts it when Windows recognises the path as a managed
/// Cloud Files placeholder — hydrated or not. This closes `DEC-0013` F: the
/// existing `online_only` exclusion alone is insufficient, because a
/// hydrated placeholder can lose its `RECALL_*` attributes and would
/// otherwise fall straight through to `SYSTEM`, changing this node's
/// provenance — and therefore its `nodes.id` on the next publish — for no
/// reason visible in the file itself.
pub fn compute_identity(
    absolute_path: &Path,
    relative: &Path,
    kind: NodeKind,
    reparse_point: bool,
    online_only: bool,
) -> (String, IdentityProvenance) {
    if eligible_for_system_identity(kind, reparse_point, online_only)
        && !blocks_system_identity(cloud_files_detection(absolute_path))
        && let Some(key) = system_identity_key(absolute_path)
    {
        return (key, IdentityProvenance::System);
    }
    (
        path_fallback_key(relative, kind),
        IdentityProvenance::PathFallback,
    )
}

/// The three outcomes of asking Windows whether a path is a managed Cloud
/// Files placeholder — `ACTION-0058` D5 / `DEC-0035`. Detection only:
/// `CfGetPlaceholderInfo` does not modify the file and needs only
/// `FILE_READ_ATTRIBUTES`, per the Microsoft documentation `DEC-0035` cites
/// in full.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CloudFilesDetection {
    /// `CfGetPlaceholderInfo` succeeded: a managed placeholder, hydrated or
    /// not. `DEC-0035` never reads its `FileId`/`FileIdentity` as an
    /// identity — the mere success of this call is the whole answer.
    Placeholder,
    /// The official negative answer: `ERROR_NOT_A_CLOUD_FILE`.
    NotCloudFile,
    /// A metadata handle could not be opened, or the call failed with any
    /// other error. Never read as proof of either state.
    Ambiguous,
}

/// `DEC-0035`'s rule, as one pure, platform-independent function: only a
/// **confirmed** "not a cloud file" answer leaves `SYSTEM` available: both a
/// positive detection and an ambiguous one are conservative refusals. Kept
/// separate from [`cloud_files_detection`] so the decision itself is
/// testable without a real Windows call — see
/// `tests::cloud_files_placeholder_detection_blocks_system_identity` and its
/// siblings.
fn blocks_system_identity(detection: CloudFilesDetection) -> bool {
    !matches!(detection, CloudFilesDetection::NotCloudFile)
}

/// Converts a Win32 error code to the `HRESULT` `CfGetPlaceholderInfo`
/// returns on failure — the standard `HRESULT_FROM_WIN32` macro, not
/// hand-picked from a single observed value, so the comparison in
/// [`cloud_files_detection`] is exact rather than a magic number.
#[cfg(windows)]
fn hresult_from_win32(code: u32) -> i32 {
    if code == 0 {
        0
    } else {
        ((code & 0xFFFF) | (7 << 16) | 0x8000_0000) as i32
    }
}

/// The real Windows call behind [`CloudFilesDetection`] — `DEC-0035`'s
/// contract exactly: a handle opened for `FILE_READ_ATTRIBUTES` only (never
/// `GENERIC_READ`, no content, no data access), `CfGetPlaceholderInfo` used
/// purely as detection, and no hydration/dehydration/pin-state API ever
/// called or imported here.
#[cfg(windows)]
fn cloud_files_detection(path: &Path) -> CloudFilesDetection {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::{
        CloseHandle, ERROR_NOT_A_CLOUD_FILE, HANDLE, INVALID_HANDLE_VALUE,
    };
    use windows_sys::Win32::Storage::CloudFilters::{
        CF_PLACEHOLDER_INFO_STANDARD, CF_PLACEHOLDER_STANDARD_INFO, CfGetPlaceholderInfo,
    };
    use windows_sys::Win32::Storage::FileSystem::{
        CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_FLAG_BACKUP_SEMANTICS, FILE_READ_ATTRIBUTES,
        FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
    };

    let mut wide: Vec<u16> = OsStr::new(path).encode_wide().collect();
    wide.push(0);
    let handle: HANDLE = unsafe {
        CreateFileW(
            wide.as_ptr(),
            FILE_READ_ATTRIBUTES,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            std::ptr::null(),
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL | FILE_FLAG_BACKUP_SEMANTICS,
            std::ptr::null_mut(),
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        // Cannot even confirm the path is a plain local file — conservative:
        // never affirm SYSTEM on an unresolved question.
        return CloudFilesDetection::Ambiguous;
    }
    // Sized generously past the fixed header for `CF_PLACEHOLDER_STANDARD_INFO`'s
    // trailing `FileIdentity` byte(s); their contents are never read — only
    // whether the call itself succeeds is DEC-0035's signal.
    let mut buffer = [0u8; size_of::<CF_PLACEHOLDER_STANDARD_INFO>() + 64];
    let mut returned: u32 = 0;
    let hr = unsafe {
        CfGetPlaceholderInfo(
            handle,
            CF_PLACEHOLDER_INFO_STANDARD,
            buffer.as_mut_ptr() as *mut core::ffi::c_void,
            buffer.len() as u32,
            &mut returned,
        )
    };
    unsafe {
        CloseHandle(handle);
    }
    if hr >= 0 {
        CloudFilesDetection::Placeholder
    } else if hr == hresult_from_win32(ERROR_NOT_A_CLOUD_FILE) {
        CloudFilesDetection::NotCloudFile
    } else {
        CloudFilesDetection::Ambiguous
    }
}

#[cfg(not(windows))]
fn cloud_files_detection(_path: &Path) -> CloudFilesDetection {
    CloudFilesDetection::NotCloudFile
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

    // -- `ACTION-0058` D5 / `DEC-0035` — the Cloud Files identity boundary --
    //
    // Pure decision-table tests, platform-independent by construction: they
    // exercise `blocks_system_identity` directly against each of the three
    // `CloudFilesDetection` outcomes, never the real Win32 call. This is
    // deliberate — `DEC-0035`'s rule is a decision, and a decision is
    // testable in full without a cloud account or even a Windows host.

    #[test]
    fn a_detected_placeholder_blocks_system_identity() {
        assert!(
            blocks_system_identity(CloudFilesDetection::Placeholder),
            "a confirmed Cloud Files placeholder must never reach SYSTEM, hydrated or not"
        );
    }

    #[test]
    fn an_ambiguous_detection_is_conservative_and_blocks_system_identity() {
        assert!(
            blocks_system_identity(CloudFilesDetection::Ambiguous),
            "DEC-0035: an unresolved detection must never be read as proof either way"
        );
    }

    #[test]
    fn a_confirmed_non_cloud_file_leaves_system_identity_available() {
        assert!(
            !blocks_system_identity(CloudFilesDetection::NotCloudFile),
            "the official ERROR_NOT_A_CLOUD_FILE answer must not block the generic SYSTEM path"
        );
    }

    /// `HRESULT_FROM_WIN32(0) == 0` — the one case the macro special-cases
    /// (a "successful" Win32 code has no `HRESULT` mapping) — and a real
    /// nonzero code, `ERROR_NOT_A_CLOUD_FILE` itself, must round-trip to the
    /// exact value `cloud_files_detection` compares against.
    #[test]
    #[cfg(windows)]
    fn hresult_from_win32_matches_the_standard_macro() {
        assert_eq!(hresult_from_win32(0), 0);
        // FACILITY_WIN32 = 7, SEVERITY_ERROR bit set: 0x8007_0000 | code.
        assert_eq!(hresult_from_win32(376), 0x8007_0178_u32 as i32);
    }

    /// Structural proof, not a Win32 call: `DEC-0035` forbids ever importing
    /// or calling a hydration/dehydration/pin-state mutation API from this
    /// module. Scanning the compiled-in source text is the same technique
    /// `DEC-0033` I already uses elsewhere in this codebase to prove a
    /// forbidden command is never registered.
    #[test]
    fn no_hydrate_dehydrate_or_pin_state_api_is_referenced_in_source() {
        // Scanned up to this test module's own opening brace: the module
        // below it necessarily *names* every forbidden symbol, in this very
        // assertion list, to prove none of them is ever called from
        // production code — scanning past that point would make the test
        // fail against itself.
        let full_source = include_str!("identity.rs");
        let production_source = full_source
            .split_once("mod tests {")
            .map(|(before, _)| before)
            .unwrap_or(full_source);
        for forbidden in [
            "CfHydratePlaceholder",
            "CfDehydratePlaceholder",
            "CfSetPinState",
            "CfSetInSyncState",
        ] {
            assert!(
                !production_source.contains(forbidden),
                "identity.rs must never reference {forbidden} outside its own test module"
            );
        }
    }

    /// The real Windows call, against an ordinary file this test creates
    /// itself — never a real cloud placeholder (registering one would need
    /// `CfRegisterSyncRoot`, a real sync-provider registration this task
    /// declines to make: see `RESULT.md` for why). This proves the actual
    /// `CfGetPlaceholderInfo` call correctly answers "not a cloud file" for
    /// the overwhelmingly common case, and that `compute_identity` still
    /// reaches `SYSTEM` for it exactly as before `DEC-0035`.
    #[test]
    #[cfg(windows)]
    fn an_ordinary_local_file_is_confirmed_not_a_cloud_file_and_still_reaches_system() {
        let temp = tempfile::tempdir().expect("tempdir");
        let file = temp.path().join("ordinaire.txt");
        std::fs::write(&file, b"synthetique").expect("write");

        assert_eq!(
            cloud_files_detection(&file),
            CloudFilesDetection::NotCloudFile,
            "a plain local file must be confirmed as not a Cloud Files placeholder"
        );

        let (_, provenance) = compute_identity(
            &file,
            Path::new("ordinaire.txt"),
            NodeKind::File,
            false,
            false,
        );
        assert_eq!(
            provenance,
            IdentityProvenance::System,
            "DEC-0035 must not block SYSTEM for a file that is confirmed not a placeholder"
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
