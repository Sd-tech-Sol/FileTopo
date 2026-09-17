# Local privacy policy

FileTopo is designed to work offline. The MVP sends no data to any server and
contains no telemetry, advertising, remote AI or automatic updates.

## Data processed

A collection is added only after you explicitly choose a folder. Indexing
starts only after another explicit action. The scanner processes filesystem
metadata: names, relative paths, kind, size, dates, useful attributes and
online-only status. It does not read document contents and never forces the
download of an online-only file.

## Storage

The root path is kept locally in a native registry; on Windows its
representation is stored as UTF-16LE data. The web interface never receives the
absolute value. SQLite indexes are written to FileTopo's local application data
directory, separately from the collections. Seen/unseen state is local too.

The current application identifier is `io.github.sd-tech-sol.filetopo`. Tauri
uses that identifier as part of the application-data directory. Data created by
development builds using the pre-2026-09-16 identifier is not imported
automatically; the current build starts with a new registry and can rebuild its
indexes from folders chosen explicitly by the user. The original folders are
never modified during that rebuild.

The interface language is the only preference stored in the web layer, under a
single `localStorage` key, `filetopo.locale`. It holds `fr` or `en` and nothing
else.

## Your control

You choose the folders, you trigger indexing, you can cancel a scan, and you
decide whether to reveal an item in File Explorer. Cancelling never replaces a
valid index with a partial one. Erasing application data is currently done with
operating system tools; the MVP does not yet provide a built-in erase command.

## Limits

Names and relative paths can themselves carry sensitive information. Anyone
with access to the Windows account and to the application's local data can
potentially read them. FileTopo adds no application-level encryption and relies
on the protections of the account, the disk and the operating system.
