//! The OS side of the watcher — `TASK-0043` C, `DEC-0041` §1 and §2.
//!
//! A [`ChangeReader`] does exactly one thing: turn the operating system's stream
//! into **hints** and **losses**. It never touches SQLite, never journals, never
//! decides that something was created, removed or renamed, and never logs a name.
//! That separation is visible in [`ReaderEvent`]: a list of [`Hint`]s (a confined
//! relative name and one closed bit about *where to look*), or a loss, or the end —
//! there is no field in which an action or an identity could travel.
//!
//! [`WatchBackend`] is the seam that lets a proof drive the **real** reconciler with
//! a scripted reader (loss injection, native-unsupported) while the product uses the
//! native one on Windows.

use super::parser::{confine_name, parse_notify_buffer};
use super::queue::Hint;
use super::types::LossReason;
use std::path::Path;
use std::sync::atomic::AtomicBool;

/// What one call of [`ChangeReader::read`] produced.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum ReaderEvent {
    /// Confined relative names — hints of *where to look*, nothing about *what
    /// happened*. Never empty.
    Changes(Vec<Hint>),
    /// The stream can no longer be trusted to be complete.
    Lost(LossReason),
    /// The reader was asked to stop and has released its handle.
    Stopped,
    /// The reader cannot continue (the handle failed). The caller treats it as a
    /// loss and re-evaluates the source.
    Failed,
}

/// Why a reader could not be opened.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum OpenError {
    /// The root cannot be opened as a directory at all (absent, denied, not ready).
    /// That is a fact about the **source**, handled by the root guard.
    RootUnavailable,
    /// The native mechanism is not available here (a file system or a platform that
    /// does not support it). The watcher declares it and falls back to periodic
    /// verification — it never pretends to watch.
    Unsupported,
    /// Any other failure to open. Treated like [`OpenError::Unsupported`] for the
    /// mode (verification stays honest and periodic), never as a silent success.
    Failed,
}

/// One live stream of change hints for one root.
pub(crate) trait ChangeReader: Send {
    /// Blocks until there is something to report, and returns it. Must return
    /// [`ReaderEvent::Stopped`] promptly once `stop` is set, having released
    /// whatever handle it holds — this is what makes shutdown clean.
    fn read(&mut self, stop: &AtomicBool) -> ReaderEvent;
}

/// Opens readers. One per watched brain root.
pub(crate) trait WatchBackend: Send + Sync {
    fn open(&self, root: &Path) -> Result<Box<dyn ChangeReader>, OpenError>;
}

/// `ERROR_NOTIFY_ENUM_DIR` — the documented "the system was unable to record all the
/// changes to the directory". Held here as a plain number so the interpretation below is
/// platform independent; a Windows-only test pins it to the `windows-sys` constant.
pub(crate) const ERROR_NOTIFY_ENUM_DIR_CODE: u32 = 1022;

/// What a **completed** call means, given the bytes it reported.
///
/// * zero bytes — the documented buffer overflow: the call *succeeded* and the buffer
///   was discarded → a loss;
/// * more bytes than the buffer holds — impossible, hence untrustworthy → a loss;
/// * a buffer that does not parse, or a name that cannot be confined to the root — one
///   bad record makes the whole burst untrustworthy → a loss, never a skipped event;
/// * otherwise the hints, in order.
///
/// Pure and platform independent, so every branch is proven on synthetic bytes.
pub(crate) fn interpret_completion(buffer: &[u8], transferred: usize) -> ReaderEvent {
    if transferred == 0 {
        return ReaderEvent::Lost(LossReason::OsOverflow);
    }
    if transferred > buffer.len() {
        return ReaderEvent::Lost(LossReason::ParserInvalid);
    }
    let changes = match parse_notify_buffer(&buffer[..transferred]) {
        Ok(changes) => changes,
        Err(_) => return ReaderEvent::Lost(LossReason::ParserInvalid),
    };
    let mut hints = Vec::with_capacity(changes.len());
    for change in &changes {
        match confine_name(&change.name) {
            Ok(path) => hints.push(Hint {
                path,
                membership: change.membership,
            }),
            Err(_) => return ReaderEvent::Lost(LossReason::HintInvalid),
        }
    }
    ReaderEvent::Changes(hints)
}

/// What a **failed** call means, from its error code: `ERROR_NOTIFY_ENUM_DIR` is a loss;
/// anything else is the reader's own failure (the caller re-evaluates the source).
#[allow(dead_code)]
pub(crate) fn interpret_error(code: u32) -> ReaderEvent {
    if code == ERROR_NOTIFY_ENUM_DIR_CODE {
        ReaderEvent::Lost(LossReason::EnumDir)
    } else {
        ReaderEvent::Failed
    }
}

/// The product backend: `ReadDirectoryChangesExW` on Windows, and an honest
/// "unsupported" everywhere else.
pub(crate) struct NativeBackend;

impl WatchBackend for NativeBackend {
    #[cfg(windows)]
    fn open(&self, root: &Path) -> Result<Box<dyn ChangeReader>, OpenError> {
        super::native::NativeReader::open(root)
            .map(|reader| Box::new(reader) as Box<dyn ChangeReader>)
    }

    #[cfg(not(windows))]
    fn open(&self, _root: &Path) -> Result<Box<dyn ChangeReader>, OpenError> {
        Err(OpenError::Unsupported)
    }
}

/// A backend that declares the native mechanism unavailable — what a file system or a
/// platform without it looks like. Used by the proofs (and by a development build's
/// `FILETOPO_WATCH_FORCE_PERIODIC`) to exercise the honest fallback on a machine that
/// does have the mechanism.
#[allow(dead_code)]
pub(crate) struct UnsupportedBackend;

impl WatchBackend for UnsupportedBackend {
    fn open(&self, _root: &Path) -> Result<Box<dyn ChangeReader>, OpenError> {
        Err(OpenError::Unsupported)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::watch::parser::tests::{buffer, record};

    #[test]
    fn zero_bytes_is_the_documented_overflow_and_a_loss() {
        assert_eq!(
            interpret_completion(&[0u8; 64], 0),
            ReaderEvent::Lost(LossReason::OsOverflow)
        );
    }

    #[test]
    fn error_notify_enum_dir_is_a_loss_and_any_other_error_is_the_readers_failure() {
        assert_eq!(
            interpret_error(ERROR_NOTIFY_ENUM_DIR_CODE),
            ReaderEvent::Lost(LossReason::EnumDir)
        );
        for code in [5u32, 6, 87, 995, 996] {
            assert_eq!(interpret_error(code), ReaderEvent::Failed, "{code}");
        }
    }

    #[cfg(windows)]
    #[test]
    fn the_enum_dir_code_is_the_one_windows_defines() {
        assert_eq!(
            ERROR_NOTIFY_ENUM_DIR_CODE,
            windows_sys::Win32::Foundation::ERROR_NOTIFY_ENUM_DIR
        );
    }

    #[test]
    fn a_well_formed_buffer_becomes_confined_hints_with_their_bit() {
        let bytes = buffer(&[(1, "a\\b\\neuf.txt"), (3, "a\\b"), (5, "c")]);
        let mut storage = bytes.clone();
        storage.resize(256, 0);
        match interpret_completion(&storage, bytes.len()) {
            ReaderEvent::Changes(hints) => assert_eq!(
                hints,
                vec![
                    Hint::member("a/b/neuf.txt"),
                    Hint::modified("a/b"),
                    Hint::member("c")
                ]
            ),
            other => panic!("{other:?}"),
        }
    }

    #[test]
    fn a_malformed_record_is_a_loss_and_never_a_panic_or_a_skipped_event() {
        let mut bad = record(1, "abcdef", 0);
        bad[8..12].copy_from_slice(&1000u32.to_le_bytes());
        let mut storage = bad.clone();
        storage.resize(64, 0);
        assert_eq!(
            interpret_completion(&storage, bad.len()),
            ReaderEvent::Lost(LossReason::ParserInvalid)
        );
        // More bytes reported than the buffer holds.
        assert_eq!(
            interpret_completion(&[0u8; 8], 9),
            ReaderEvent::Lost(LossReason::ParserInvalid)
        );
    }

    #[test]
    fn one_name_that_cannot_be_confined_makes_the_whole_burst_a_loss() {
        let bytes = buffer(&[(1, "bon\\fichier.txt"), (1, "..\\dehors.txt"), (1, "autre")]);
        let mut storage = bytes.clone();
        storage.resize(256, 0);
        assert_eq!(
            interpret_completion(&storage, bytes.len()),
            ReaderEvent::Lost(LossReason::HintInvalid)
        );
    }
}
