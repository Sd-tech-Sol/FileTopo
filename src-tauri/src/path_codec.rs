//! Storing a filesystem path **exactly** — `DEC-0033` C.
//!
//! A path is not text. On Windows it is a sequence of UTF-16 code units that
//! may contain unpaired surrogates; on Unix it is a sequence of bytes that need
//! not be UTF-8. `to_string_lossy()` turns either of those into a `String` by
//! **replacing** what it cannot represent, and a path that has been through it
//! may no longer name the folder the person chose.
//!
//! That is tolerable for a name shown on screen and unacceptable for the value
//! FileTopo will later hand to the scanner. So the catalogue persists a path as
//! a `BLOB` through this codec, and never as a `TEXT` column.
//!
//! The Windows half is lifted verbatim from `registry.rs`, where it has stood
//! since the 0.1 prototype; `registry.rs` now calls in here rather than keeping
//! a second copy. The non-Windows half is **not** lifted: the historical one
//! went through `to_string_lossy()`, which is exactly what this module exists
//! to avoid, and it is replaced by the raw `OsStr` bytes.

use std::fs;
use std::path::{Path, PathBuf};

/// A path, as bytes that can be decoded back into the same path.
#[cfg(windows)]
pub fn encode_path(path: &Path) -> Vec<u8> {
    use std::os::windows::ffi::OsStrExt;
    path.as_os_str()
        .encode_wide()
        .flat_map(u16::to_le_bytes)
        .collect()
}

/// The inverse of [`encode_path`], or `None` for a blob this codec did not
/// write.
///
/// An odd number of bytes cannot be UTF-16, so it is refused rather than
/// truncated: a repaired path names a different folder, and naming a different
/// folder is the one failure this codec must never produce.
#[cfg(windows)]
pub fn decode_path(blob: &[u8]) -> Option<PathBuf> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    let (pairs, remainder) = blob.as_chunks::<2>();
    if !remainder.is_empty() {
        return None;
    }
    let words = pairs
        .iter()
        .map(|pair| u16::from_le_bytes(*pair))
        .collect::<Vec<_>>();
    Some(PathBuf::from(OsString::from_wide(&words)))
}

#[cfg(not(windows))]
pub fn encode_path(path: &Path) -> Vec<u8> {
    use std::os::unix::ffi::OsStrExt;
    path.as_os_str().as_bytes().to_vec()
}

#[cfg(not(windows))]
pub fn decode_path(blob: &[u8]) -> Option<PathBuf> {
    use std::ffi::OsString;
    use std::os::unix::ffi::OsStringExt;
    Some(PathBuf::from(OsString::from_vec(blob.to_vec())))
}

/// Whether an entry is a Windows reparse point — a junction, a mount point or
/// a symbolic link.
///
/// Read from the metadata of the entry **itself**, so it must come from
/// [`fs::symlink_metadata`]; `fs::metadata` follows the link and would describe
/// the target instead.
#[cfg(windows)]
pub fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    metadata.file_attributes() & 0x0000_0400 != 0
}

#[cfg(not(windows))]
pub fn is_reparse_point(_metadata: &fs::Metadata) -> bool {
    false
}

/// Whether `ancestor` contains `descendant`, or is it.
///
/// Compared **component by component** rather than by string prefix: `C:\a\bc`
/// starts with the text `C:\a\b` and is not inside it. `DEC-0033` G rests on
/// this distinction, so it is a function with its own test rather than a
/// `starts_with` spelled out at each of the three call sites.
///
/// Both paths are expected to be canonical already; this function does not
/// touch the filesystem.
pub fn contains_or_equals(ancestor: &Path, descendant: &Path) -> bool {
    descendant.components().count() >= ancestor.components().count()
        && descendant
            .components()
            .zip(ancestor.components())
            .all(|(mine, theirs)| mine == theirs)
        && ancestor.components().count() > 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsString;

    #[test]
    fn a_path_survives_the_round_trip_unchanged() {
        for raw in [
            "C:\\Users\\Test\\Dossier",
            "/tmp/dossier",
            "relatif/enfant",
            "Dossier avec accents éàü and 漢字 and 🌲",
        ] {
            let path = PathBuf::from(raw);
            let decoded = decode_path(&encode_path(&path)).expect("decodes");
            assert_eq!(decoded, path, "{raw} must survive the codec");
        }
    }

    /// The property that rules out `to_string_lossy()`: a path whose OS
    /// representation is not valid Unicode must come back **identical**, not
    /// repaired with replacement characters.
    #[test]
    fn an_unpaired_surrogate_or_invalid_byte_survives_intact() {
        #[cfg(windows)]
        let odd: OsString = {
            use std::os::windows::ffi::OsStringExt;
            // A lone high surrogate: legal in a Windows filename, illegal in
            // UTF-8, and turned into U+FFFD by `to_string_lossy`.
            OsString::from_wide(&[0x0043, 0x003A, 0x005C, 0xD800, 0x0061])
        };
        #[cfg(not(windows))]
        let odd: OsString = {
            use std::os::unix::ffi::OsStringExt;
            OsString::from_vec(vec![b'/', b't', 0x80, b'p'])
        };

        let path = PathBuf::from(&odd);
        assert!(
            path.to_str().is_none(),
            "this test is only meaningful on a path that is not valid Unicode"
        );
        assert_ne!(
            PathBuf::from(path.to_string_lossy().into_owned()),
            path,
            "the lossy conversion must really lose something here"
        );

        let decoded = decode_path(&encode_path(&path)).expect("decodes");
        assert_eq!(decoded, path);
    }

    #[test]
    fn a_blob_this_codec_did_not_write_is_refused_rather_than_repaired() {
        #[cfg(windows)]
        assert!(
            decode_path(&[0x41, 0x00, 0x42]).is_none(),
            "an odd byte count is not UTF-16 and must not be truncated"
        );
        // Every byte string is a valid Unix path, so there is nothing to refuse
        // there; the guarantee that matters on both platforms is that a decoded
        // blob is either the original path or nothing.
        #[cfg(not(windows))]
        assert_eq!(
            decode_path(&[0x41, 0x00, 0x42]),
            Some(PathBuf::from(OsString::from(unsafe {
                String::from_utf8_unchecked(vec![0x41, 0x00, 0x42])
            })))
        );
    }

    #[test]
    fn containment_compares_components_and_not_text_prefixes() {
        let base = PathBuf::from("C:\\a\\b");
        assert!(contains_or_equals(&base, &base), "a path contains itself");
        assert!(contains_or_equals(&base, &PathBuf::from("C:\\a\\b\\c")));
        // The whole reason this is not `starts_with` on a string.
        assert!(!contains_or_equals(&base, &PathBuf::from("C:\\a\\bc")));
        assert!(!contains_or_equals(&base, &PathBuf::from("C:\\a")));
        assert!(!contains_or_equals(&base, &PathBuf::from("D:\\a\\b\\c")));
        // An empty ancestor would otherwise contain everything.
        assert!(!contains_or_equals(Path::new(""), &base));
    }
}
