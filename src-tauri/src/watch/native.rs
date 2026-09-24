//! `ReadDirectoryChangesExW` reader — `TASK-0043` C, `DEC-0041` §1.
//!
//! Reuses `windows-sys = 0.61.2` with the features already enabled
//! (`Win32_Foundation`, `Win32_Storage_FileSystem`, `Win32_System_IO`): the audit
//! found every binding this needs there — the call itself, its notify-information
//! class, `OVERLAPPED`, `GetOverlappedResultEx`, `CancelIoEx` — so **no crate and no
//! feature is added**.
//!
//! * Handle: `FILE_LIST_DIRECTORY` only (notification, no data access), shared
//!   READ | WRITE | DELETE so the watcher never blocks the person's own work, opened
//!   `FILE_FLAG_BACKUP_SEMANTICS` (required for a directory) and
//!   `FILE_FLAG_OVERLAPPED`.
//! * Recursive, one fixed **64 KiB** buffer, the basic notify-information class:
//!   names only — no size, no time, no file identity ever comes back from here.
//! * Overlapped, waited on in short slices (`GetOverlappedResultEx`), so a stop is
//!   noticed within one slice without ever abandoning a pending call: on stop the
//!   call is cancelled (`CancelIoEx`) and **awaited** before the buffer is freed
//!   and the handle closed. No thread is left blocked, no buffer is written to
//!   after it is released.
//! * Losses are explicit: zero bytes returned is the documented buffer overflow, and
//!   `ERROR_NOTIFY_ENUM_DIR` is the documented "could not record every change".
//!   Both — and any unparseable buffer or unconfinable name — become
//!   [`ReaderEvent::Lost`], never a dropped event.
//! * Nothing here logs, and no name leaves this module except inside a
//!   [`ReaderEvent::Changes`].

use super::backend::{ChangeReader, OpenError, ReaderEvent, interpret_completion, interpret_error};
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use windows_sys::Win32::Foundation::{
    CloseHandle, ERROR_ACCESS_DENIED, ERROR_BAD_NETPATH, ERROR_BAD_PATHNAME,
    ERROR_CALL_NOT_IMPLEMENTED, ERROR_DIRECTORY, ERROR_FILE_NOT_FOUND, ERROR_INVALID_FUNCTION,
    ERROR_INVALID_NAME, ERROR_INVALID_PARAMETER, ERROR_IO_INCOMPLETE, ERROR_NOT_READY,
    ERROR_NOT_SUPPORTED, ERROR_OPERATION_ABORTED, ERROR_PATH_NOT_FOUND, GetLastError, HANDLE,
    INVALID_HANDLE_VALUE, WAIT_TIMEOUT,
};
use windows_sys::Win32::Storage::FileSystem::{
    CreateFileW, FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OVERLAPPED, FILE_LIST_DIRECTORY,
    FILE_NOTIFY_CHANGE_ATTRIBUTES, FILE_NOTIFY_CHANGE_CREATION, FILE_NOTIFY_CHANGE_DIR_NAME,
    FILE_NOTIFY_CHANGE_FILE_NAME, FILE_NOTIFY_CHANGE_LAST_WRITE, FILE_NOTIFY_CHANGE_SIZE,
    FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING, ReadDirectoryChangesExW,
    ReadDirectoryNotifyInformation,
};
use windows_sys::Win32::System::IO::{
    CancelIoEx, GetOverlappedResult, GetOverlappedResultEx, OVERLAPPED,
};

/// The one buffer, fixed for the life of the handle (the size cannot change once the
/// first call is made) and no larger than 64 KiB — the documented ceiling that also
/// works over a network share.
pub(crate) const BUFFER_BYTES: usize = 64 * 1024;

/// How long one wait slice lasts: the latency of noticing a stop.
const POLL_MILLISECONDS: u32 = 100;

/// What we ask to be told about. Names, sizes, attributes, last write, creation:
/// enough to know **where** something changed, and nothing about content.
const FILTER: u32 = FILE_NOTIFY_CHANGE_FILE_NAME
    | FILE_NOTIFY_CHANGE_DIR_NAME
    | FILE_NOTIFY_CHANGE_ATTRIBUTES
    | FILE_NOTIFY_CHANGE_SIZE
    | FILE_NOTIFY_CHANGE_LAST_WRITE
    | FILE_NOTIFY_CHANGE_CREATION;

/// `ReadDirectoryChangesExW` needs a `DWORD`-aligned buffer.
#[repr(C, align(8))]
struct Buffer([u8; BUFFER_BYTES]);

/// Roots that currently have a live native handle — **a proof's window, absent from a
/// product build**. Keyed by path, so parallel tests never disturb each other's answer.
#[cfg(test)]
pub(crate) static OPEN_ROOTS: std::sync::Mutex<Vec<std::path::PathBuf>> =
    std::sync::Mutex::new(Vec::new());

pub(crate) struct NativeReader {
    #[cfg(test)]
    root: std::path::PathBuf,
    handle: HANDLE,
    buffer: Box<Buffer>,
    overlapped: Box<OVERLAPPED>,
    /// Whether a call is in flight on `buffer` / `overlapped`.
    pending: bool,
}

// SAFETY: the handle, the buffer and the `OVERLAPPED` are owned by this value alone
// and are only ever used through `&mut self`; a `HANDLE` is a plain kernel object
// identifier that may be used from any thread.
unsafe impl Send for NativeReader {}

impl NativeReader {
    /// Opens the root and **issues the first call before returning**, so there is no
    /// gap between "the handle exists" and "the system is recording for it" — and so
    /// a file system that does not support the call is discovered here, at open time.
    pub(crate) fn open(root: &Path) -> Result<Self, OpenError> {
        let mut wide: Vec<u16> = OsStr::new(root).encode_wide().collect();
        wide.push(0);
        // SAFETY: `wide` is a NUL-terminated UTF-16 string that outlives the call.
        let handle = unsafe {
            CreateFileW(
                wide.as_ptr(),
                FILE_LIST_DIRECTORY,
                FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                std::ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED,
                std::ptr::null_mut(),
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            // SAFETY: reads the calling thread's last error, straight after the call.
            return Err(match unsafe { GetLastError() } {
                ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND | ERROR_ACCESS_DENIED
                | ERROR_NOT_READY | ERROR_BAD_NETPATH | ERROR_BAD_PATHNAME | ERROR_INVALID_NAME
                | ERROR_DIRECTORY => OpenError::RootUnavailable,
                ERROR_INVALID_FUNCTION | ERROR_NOT_SUPPORTED | ERROR_CALL_NOT_IMPLEMENTED => {
                    OpenError::Unsupported
                }
                _ => OpenError::Failed,
            });
        }
        let mut reader = Self {
            #[cfg(test)]
            root: root.to_path_buf(),
            handle,
            buffer: Box::new(Buffer([0; BUFFER_BYTES])),
            // SAFETY: `OVERLAPPED` is plain data for which all-zero is the
            // documented initial value.
            overlapped: Box::new(unsafe { std::mem::zeroed() }),
            pending: false,
        };
        match reader.issue() {
            Ok(()) => {
                #[cfg(test)]
                OPEN_ROOTS
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .push(reader.root.clone());
                Ok(reader)
            }
            Err(code) => Err(match code {
                ERROR_INVALID_FUNCTION
                | ERROR_NOT_SUPPORTED
                | ERROR_CALL_NOT_IMPLEMENTED
                | ERROR_INVALID_PARAMETER => OpenError::Unsupported,
                ERROR_ACCESS_DENIED | ERROR_FILE_NOT_FOUND | ERROR_PATH_NOT_FOUND => {
                    OpenError::RootUnavailable
                }
                _ => OpenError::Failed,
            }),
        }
    }

    /// Starts one asynchronous call on the buffer. Returns the Win32 error code on
    /// failure. Must not be called while a call is in flight.
    fn issue(&mut self) -> Result<(), u32> {
        debug_assert!(!self.pending);
        *self.overlapped = unsafe { std::mem::zeroed() };
        // SAFETY: the buffer and the `OVERLAPPED` are heap allocations owned by
        // `self`, stable in memory, and kept alive until the call completes or is
        // cancelled and awaited (see `cancel`, called by `Drop`). `lpBytesReturned`
        // is unused for an asynchronous call; the count comes from
        // `GetOverlappedResultEx`.
        let ok = unsafe {
            ReadDirectoryChangesExW(
                self.handle,
                self.buffer.0.as_mut_ptr().cast(),
                BUFFER_BYTES as u32,
                1, // recursive: the whole subtree of the root
                FILTER,
                std::ptr::null_mut(),
                &mut *self.overlapped,
                None,
                ReadDirectoryNotifyInformation,
            )
        };
        if ok == 0 {
            // SAFETY: last error of this thread, read straight after the call.
            return Err(unsafe { GetLastError() });
        }
        self.pending = true;
        Ok(())
    }

    /// Cancels the call in flight, if any, and **waits for it to end** — the buffer
    /// must not be freed, nor the handle closed, while the kernel may still write.
    fn cancel(&mut self) {
        if !self.pending {
            return;
        }
        // SAFETY: `handle` and `overlapped` identify the call started by `issue`.
        unsafe {
            CancelIoEx(self.handle, &*self.overlapped);
            let mut transferred = 0u32;
            // Wait until the cancelled call has really completed.
            GetOverlappedResult(self.handle, &*self.overlapped, &mut transferred, 1);
        }
        self.pending = false;
    }
}

impl ChangeReader for NativeReader {
    fn read(&mut self, stop: &AtomicBool) -> ReaderEvent {
        loop {
            if stop.load(Ordering::SeqCst) {
                self.cancel();
                return ReaderEvent::Stopped;
            }
            if !self.pending && self.issue().is_err() {
                return ReaderEvent::Failed;
            }
            let mut transferred = 0u32;
            // SAFETY: waits, for a bounded slice, on the call `issue` started.
            let ok = unsafe {
                GetOverlappedResultEx(
                    self.handle,
                    &*self.overlapped,
                    &mut transferred,
                    POLL_MILLISECONDS,
                    0,
                )
            };
            if ok == 0 {
                // SAFETY: last error of this thread, read straight after the call.
                let code = unsafe { GetLastError() };
                match code {
                    // Still in flight: look at the stop flag and wait again.
                    WAIT_TIMEOUT | ERROR_IO_INCOMPLETE => continue,
                    ERROR_OPERATION_ABORTED => {
                        self.pending = false;
                        return if stop.load(Ordering::SeqCst) {
                            ReaderEvent::Stopped
                        } else {
                            ReaderEvent::Failed
                        };
                    }
                    // `ERROR_NOTIFY_ENUM_DIR` is a loss; anything else is the reader's own
                    // failure — both decided by the platform-independent interpretation.
                    _ => {
                        self.pending = false;
                        return interpret_error(code);
                    }
                }
            }
            self.pending = false;
            // Interpret **before** re-arming: the next call overwrites this buffer. Zero
            // bytes (the documented overflow), an unparseable buffer and a name that cannot
            // be confined are all losses there — never a dropped event.
            return interpret_completion(&self.buffer.0, transferred as usize);
        }
    }
}

impl Drop for NativeReader {
    fn drop(&mut self) {
        #[cfg(test)]
        {
            let mut roots = OPEN_ROOTS
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner);
            if let Some(at) = roots.iter().position(|open| open == &self.root) {
                roots.remove(at);
            }
        }
        self.cancel();
        // SAFETY: the handle is valid and owned; no call is in flight any more.
        unsafe {
            CloseHandle(self.handle);
        }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use std::fs;
    use std::sync::Arc;
    use std::time::{Duration, Instant};

    /// Reads until `wanted` shows up as a hint, or `deadline` passes.
    fn wait_for_hint(reader: &mut NativeReader, wanted: &str, seconds: u64) -> bool {
        let deadline = Instant::now() + Duration::from_secs(seconds);
        while Instant::now() < deadline {
            // Bound each blocking read with a stopper thread.
            let flag = Arc::new(AtomicBool::new(false));
            let flag_for_timer = flag.clone();
            let timer = std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(400));
                flag_for_timer.store(true, Ordering::SeqCst);
            });
            let outcome = reader.read(&flag);
            let _ = timer.join();
            match outcome {
                ReaderEvent::Changes(hints) if hints.iter().any(|hint| hint.path == wanted) => {
                    return true;
                }
                ReaderEvent::Changes(_) | ReaderEvent::Stopped => continue,
                ReaderEvent::Lost(_) | ReaderEvent::Failed => return false,
            }
        }
        false
    }

    #[test]
    fn a_real_change_deep_in_the_tree_arrives_as_a_confined_relative_hint() {
        let temp = tempfile::tempdir().expect("temp");
        fs::create_dir_all(temp.path().join("a").join("b")).expect("tree");
        let mut reader = NativeReader::open(temp.path()).expect("native reader");

        fs::write(temp.path().join("a").join("b").join("nouveau.txt"), b"x").expect("write");

        assert!(
            wait_for_hint(&mut reader, "a/b/nouveau.txt", 10),
            "the created file must be reported by its relative, `/`-separated name"
        );
    }

    #[test]
    fn a_stop_cancels_the_pending_call_and_returns_promptly_with_nothing_left_blocked() {
        let temp = tempfile::tempdir().expect("temp");
        let mut reader = NativeReader::open(temp.path()).expect("native reader");
        let stop = Arc::new(AtomicBool::new(false));
        let stopper = stop.clone();
        let handle = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(250));
            stopper.store(true, Ordering::SeqCst);
        });
        let started = Instant::now();
        // Nothing changes: the read blocks until the stop flag is noticed.
        let outcome = reader.read(&stop);
        assert_eq!(outcome, ReaderEvent::Stopped);
        assert!(
            started.elapsed() < Duration::from_secs(3),
            "a stop must be noticed within a few wait slices"
        );
        handle.join().expect("stopper");
        // Dropping after a cancelled call is clean (the buffer is not written to
        // once released); doing it in a loop would surface a use-after-free fast.
        drop(reader);
        for _ in 0..20 {
            let mut again = NativeReader::open(temp.path()).expect("re-open");
            let flag = AtomicBool::new(true);
            assert_eq!(again.read(&flag), ReaderEvent::Stopped);
        }
    }

    /// Whether a **read-sharing-free** open of the directory succeeds: it fails with a
    /// sharing violation while another handle with read access is open on it. This is the
    /// operating system's own answer to "is a handle still held?".
    pub(crate) fn is_free_of_other_handles(directory: &Path) -> bool {
        use std::os::windows::ffi::OsStrExt;
        let mut wide: Vec<u16> = OsStr::new(directory).encode_wide().collect();
        wide.push(0);
        // SAFETY: a NUL-terminated string that outlives the call; the handle, if any, is
        // closed straight away.
        unsafe {
            let handle = CreateFileW(
                wide.as_ptr(),
                FILE_LIST_DIRECTORY,
                0, // share nothing: any other open handle with read access conflicts
                std::ptr::null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS,
                std::ptr::null_mut(),
            );
            if handle == INVALID_HANDLE_VALUE {
                return false;
            }
            CloseHandle(handle);
        }
        true
    }

    /// The operating system's own proof that the reader holds a handle while it lives and
    /// releases it when it is dropped — the meaning of "shutdown closes the handle".
    #[test]
    fn an_open_reader_holds_a_real_handle_and_dropping_it_releases_it() {
        let temp = tempfile::tempdir().expect("temp");
        let watched = temp.path().join("surveille");
        fs::create_dir(&watched).expect("dir");
        assert!(
            is_free_of_other_handles(&watched),
            "control: nothing holds it yet"
        );
        let reader = NativeReader::open(&watched).expect("native reader");
        assert!(
            !is_free_of_other_handles(&watched),
            "while the reader lives, an exclusive open hits a sharing violation"
        );
        assert!(OPEN_ROOTS.lock().unwrap().contains(&watched));
        drop(reader);
        assert!(is_free_of_other_handles(&watched), "released on drop");
        assert!(!OPEN_ROOTS.lock().unwrap().contains(&watched));
    }

    #[test]
    fn a_missing_root_is_a_source_fact_not_a_panic() {
        let temp = tempfile::tempdir().expect("temp");
        let absent = temp.path().join("jamais-cree");
        assert!(matches!(
            NativeReader::open(&absent),
            Err(OpenError::RootUnavailable)
        ));
    }

    #[test]
    fn a_file_is_not_a_root_to_watch() {
        let temp = tempfile::tempdir().expect("temp");
        let file = temp.path().join("fichier.txt");
        fs::write(&file, b"x").expect("file");
        assert!(NativeReader::open(&file).is_err());
    }
}
