//! Defensive parser of a `ReadDirectoryChangesExW` notification buffer, and the
//! confinement of the names it carries — `TASK-0043` C, `DEC-0041` §1.
//!
//! Platform independent on purpose: it works on plain bytes, so a synthetic
//! buffer proves every refusal without a Windows call.
//!
//! **The action is dropped here.** A record carries an action (added, removed,
//! renamed, modified) and a name. An action is an operating-system claim about what
//! happened, and FileTopo never lets one become a journal event: it derives its own
//! events from a re-enumeration (`DEC-0041` "Principe"). What leaves this module is the
//! name plus **one closed bit** about *where to look* — [`RawChange::membership`]:
//! "the entry may have appeared, disappeared or been renamed, so the directory that lists
//! it may differ" versus "only this entry's own attributes or date moved". That bit chooses
//! between re-listing a parent and re-observing one entry; it cannot say *created*,
//! *moved* or *deleted*, so it cannot become a journal nature. Keeping the action itself
//! out of the return type makes that visible in the types, not just in the reading.
//!
//! **Never a panic, never a guess.** Any record that does not check out — a length
//! that runs past the buffer, an offset that does not advance, an odd byte count for
//! UTF-16, an action FileTopo does not know — refuses the **whole buffer**, and the
//! caller turns that into a loss and a full verification.

/// Size of the fixed part of a `FILE_NOTIFY_INFORMATION` record: `NextEntryOffset`,
/// `Action`, `FileNameLength`, each a 32-bit little-endian integer.
const HEADER_BYTES: usize = 12;
/// Actions `FILE_NOTIFY_INFORMATION` documents: added, removed, modified, renamed
/// (old name), renamed (new name).
const KNOWN_ACTIONS: std::ops::RangeInclusive<u32> = 1..=5;
/// A path longer than this is not confinable to anything FileTopo indexes.
pub(crate) const MAX_HINT_CHARS: usize = 32_768;

/// Why a buffer or a name was refused. Internal; it becomes a loss.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ParseError {
    /// Fewer bytes than one header, or a header cut short.
    Truncated,
    /// A name that runs past the end of the buffer.
    NameOutOfBounds,
    /// A name length that is not a whole number of UTF-16 code units.
    OddNameLength,
    /// A next-entry offset that is misaligned, overlaps the current record or leaves
    /// the buffer.
    BadNextOffset,
    /// An action outside the documented five.
    UnknownAction,
    /// A name that cannot be confined to the root (see [`confine_name`]).
    InvalidName,
}

/// One record of a buffer, reduced to where to look.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct RawChange {
    /// The name as the system reported it, relative to the root, UTF-16.
    pub name: Vec<u16>,
    /// `true` for added, removed and both halves of a rename — the entry's *membership*
    /// of its directory may have changed. `false` for modified — only the entry itself.
    pub membership: bool,
}

/// Parses one notification buffer into the **names** it carries, in order.
///
/// `buffer` is exactly the bytes the call reported (`lpBytesReturned`), no more.
/// Zero bytes is not an empty list: it is the documented overflow signal, and the
/// caller handles it before calling here — passed in, it is refused as
/// [`ParseError::Truncated`].
pub(crate) fn parse_notify_buffer(buffer: &[u8]) -> Result<Vec<RawChange>, ParseError> {
    if buffer.len() < HEADER_BYTES {
        return Err(ParseError::Truncated);
    }
    let mut names = Vec::new();
    let mut offset = 0usize;
    loop {
        // The header must fit entirely.
        let header_end = offset
            .checked_add(HEADER_BYTES)
            .ok_or(ParseError::Truncated)?;
        if header_end > buffer.len() {
            return Err(ParseError::Truncated);
        }
        let next = read_u32(buffer, offset) as usize;
        let action = read_u32(buffer, offset + 4);
        let name_bytes = read_u32(buffer, offset + 8) as usize;
        if !KNOWN_ACTIONS.contains(&action) {
            return Err(ParseError::UnknownAction);
        }
        if !name_bytes.is_multiple_of(2) {
            return Err(ParseError::OddNameLength);
        }
        let name_end = header_end
            .checked_add(name_bytes)
            .ok_or(ParseError::NameOutOfBounds)?;
        if name_end > buffer.len() {
            return Err(ParseError::NameOutOfBounds);
        }
        names.push(RawChange {
            name: buffer[header_end..name_end]
                .as_chunks::<2>()
                .0
                .iter()
                .map(|pair| u16::from_le_bytes(*pair))
                .collect::<Vec<u16>>(),
            // 3 is "modified"; 1, 2, 4 and 5 all move an entry in or out of its directory.
            membership: action != 3,
        });
        if next == 0 {
            return Ok(names);
        }
        // Records are 4-byte aligned, must not overlap the one just read, and the
        // next one must start inside the buffer. Because `next` is always positive
        // here, `offset` strictly increases: the loop cannot spin.
        if !next.is_multiple_of(4) || next < HEADER_BYTES + name_bytes {
            return Err(ParseError::BadNextOffset);
        }
        offset = offset.checked_add(next).ok_or(ParseError::BadNextOffset)?;
        if offset >= buffer.len() {
            return Err(ParseError::BadNextOffset);
        }
    }
}

fn read_u32(buffer: &[u8], at: usize) -> u32 {
    u32::from_le_bytes([buffer[at], buffer[at + 1], buffer[at + 2], buffer[at + 3]])
}

/// Turns a name from the OS into a **relative, `/`-separated hint** confined to the
/// root — or refuses it.
///
/// Refused: an empty name, a NUL, a drive or stream separator (`:`), an absolute
/// path, an empty component (`a\\b`, a trailing separator), a `.` or `..`
/// component, and anything past [`MAX_HINT_CHARS`]. A refusal is not "skip this
/// event": the caller treats it as a **loss**, because a signal that cannot be
/// confined is a signal whose scope cannot be trusted.
///
/// The text is decoded lossily. That is coherent with how the scanner stores a
/// path (`to_string_lossy`), and a name that does not round-trip simply fails to
/// resolve later, which sends the scope to an ancestor — never to a guess.
pub(crate) fn confine_name(units: &[u16]) -> Result<String, ParseError> {
    if units.is_empty() || units.len() > MAX_HINT_CHARS || units.contains(&0) {
        return Err(ParseError::InvalidName);
    }
    let text = String::from_utf16_lossy(units);
    if text.contains(':') || text.starts_with('\\') || text.starts_with('/') {
        return Err(ParseError::InvalidName);
    }
    let normalised = text.replace('\\', "/");
    for component in normalised.split('/') {
        if component.is_empty() || component == "." || component == ".." {
            return Err(ParseError::InvalidName);
        }
    }
    Ok(normalised)
}

/// The directory that lists a hint — its parent — or `None` for a top-level entry
/// (whose parent is the root).
pub(crate) fn parent_of(hint: &str) -> Option<&str> {
    hint.rsplit_once('/').map(|(parent, _)| parent)
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    /// Builds one record, with `next` chosen by the caller.
    pub(crate) fn record(action: u32, name: &str, next: u32) -> Vec<u8> {
        let units: Vec<u16> = name.encode_utf16().collect();
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&next.to_le_bytes());
        bytes.extend_from_slice(&action.to_le_bytes());
        bytes.extend_from_slice(&((units.len() * 2) as u32).to_le_bytes());
        for unit in units {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        bytes
    }

    /// A well-formed buffer of several records, 4-byte aligned like the system's.
    pub(crate) fn buffer(records: &[(u32, &str)]) -> Vec<u8> {
        let mut out = Vec::new();
        for (index, (action, name)) in records.iter().enumerate() {
            let mut one = record(*action, name, 0);
            while !one.len().is_multiple_of(4) {
                one.push(0);
            }
            let last = index + 1 == records.len();
            let next = if last { 0 } else { one.len() as u32 };
            one[..4].copy_from_slice(&next.to_le_bytes());
            out.extend_from_slice(&one);
        }
        out
    }

    fn text(name: &[u16]) -> String {
        String::from_utf16_lossy(name)
    }

    #[test]
    fn several_records_are_parsed_in_order_and_only_their_names_come_out() {
        let bytes = buffer(&[
            (1, "dossier\\nouveau.txt"),
            (3, "dossier\\autre.txt"),
            (4, "ancien"),
            (5, "récent-é"),
            (2, "gone"),
        ]);
        let changes = parse_notify_buffer(&bytes).expect("well-formed");
        let names: Vec<String> = changes.iter().map(|change| text(&change.name)).collect();
        assert_eq!(
            names,
            vec![
                "dossier\\nouveau.txt",
                "dossier\\autre.txt",
                "ancien",
                "récent-é",
                "gone"
            ]
        );
        // Only a modification leaves the entry's membership alone; added, removed and
        // both halves of a rename may change what the parent directory lists.
        let membership: Vec<bool> = changes.iter().map(|change| change.membership).collect();
        assert_eq!(membership, vec![true, false, true, true, true]);
    }

    #[test]
    fn a_single_record_with_no_next_entry_is_accepted() {
        let bytes = buffer(&[(3, "a")]);
        assert_eq!(parse_notify_buffer(&bytes).expect("ok").len(), 1);
    }

    #[test]
    fn every_malformed_buffer_is_refused_without_panicking() {
        // Zero bytes and a header cut short.
        assert_eq!(parse_notify_buffer(&[]), Err(ParseError::Truncated));
        assert_eq!(parse_notify_buffer(&[0; 11]), Err(ParseError::Truncated));

        // A name that runs past the end.
        let mut too_long = record(1, "abcdef", 0);
        too_long[8..12].copy_from_slice(&1000u32.to_le_bytes());
        assert_eq!(
            parse_notify_buffer(&too_long),
            Err(ParseError::NameOutOfBounds)
        );

        // An odd number of bytes for UTF-16.
        let mut odd = record(1, "abc", 0);
        odd[8..12].copy_from_slice(&5u32.to_le_bytes());
        assert_eq!(parse_notify_buffer(&odd), Err(ParseError::OddNameLength));

        // Unknown actions, either side of the documented range.
        assert_eq!(
            parse_notify_buffer(&record(0, "a", 0)),
            Err(ParseError::UnknownAction)
        );
        assert_eq!(
            parse_notify_buffer(&record(6, "a", 0)),
            Err(ParseError::UnknownAction)
        );

        // A next offset that points back onto the same record (a loop), that is not
        // aligned, that overlaps the name, or that leaves the buffer.
        for next in [4u32, 13, 14, 1_000_000] {
            let mut bad = record(1, "abcd", next);
            bad.resize(40, 0);
            assert_eq!(
                parse_notify_buffer(&bad),
                Err(ParseError::BadNextOffset),
                "next offset {next}"
            );
        }
    }

    #[test]
    fn a_record_that_would_loop_forever_is_refused_not_followed() {
        // `next` equal to the record size but the second record is garbage that
        // again claims a huge name: refused at the second header, never a spin.
        let mut bytes = record(1, "ab", 16);
        bytes.resize(16, 0);
        let mut second = record(1, "cd", 0);
        second[8..12].copy_from_slice(&u32::MAX.to_le_bytes());
        bytes.extend_from_slice(&second);
        assert!(parse_notify_buffer(&bytes).is_err());
    }

    #[test]
    fn arbitrary_bytes_never_panic() {
        // A cheap deterministic sweep, not a fuzzer: xorshift over many lengths.
        let mut state = 0x9e37_79b9_7f4a_7c15u64;
        for length in 0..200usize {
            let mut bytes = Vec::with_capacity(length);
            for _ in 0..length {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                bytes.push((state & 0xff) as u8);
            }
            let _ = parse_notify_buffer(&bytes);
        }
    }

    #[test]
    fn names_are_confined_to_the_root() {
        let ok = |raw: &str| confine_name(&raw.encode_utf16().collect::<Vec<_>>());
        assert_eq!(ok("a\\b\\c.txt").as_deref(), Ok("a/b/c.txt"));
        assert_eq!(ok("seul").as_deref(), Ok("seul"));
        for refused in [
            "",
            "..\\dehors",
            "a\\..\\..\\b",
            "a\\.\\b",
            "\\absolu",
            "/absolu",
            "C:\\x",
            "a\\b:flux",
            "a\\\\b",
            "a\\",
        ] {
            assert!(ok(refused).is_err(), "{refused:?} must be refused");
        }
        assert!(confine_name(&[0x61, 0, 0x62]).is_err(), "a NUL is refused");
        assert!(confine_name(&vec![0x61; MAX_HINT_CHARS + 1]).is_err());
    }

    #[test]
    fn the_parent_of_a_hint_is_the_directory_that_lists_it() {
        assert_eq!(parent_of("a/b/c.txt"), Some("a/b"));
        assert_eq!(parent_of("a/b"), Some("a"));
        assert_eq!(parent_of("top"), None);
    }
}
