# Security policy

## Supported versions

The source-only `v0.1.0-alpha.1` prerelease is supported. Security fixes are
also applied to the current `main` branch.

## Reporting a vulnerability

**Never publish vulnerability details in a public issue.**

Use [GitHub private vulnerability reporting](https://github.com/Sd-tech-Sol/FileTopo/security/advisories/new).
Do not attach exploitable details to a public issue or discussion. The
maintainer aims to acknowledge a private report within 14 days, but this is a
best-effort target, not a service-level guarantee.

The project is maintained by one person, with no service commitment: no fix
deadline is guaranteed.

If a published source prerelease must be corrected or withdrawn, the
maintainer will mark the affected GitHub release accordingly, publish the fix
on `main`, and create a replacement prerelease when appropriate. Security
details remain private until disclosure is safe.

A useful report states the version, the impact, the minimal reproduction steps
**on synthetic data**, and any known mitigation. Never include a personal
document, a secret, or a real user path.

## Current guarantees and limits

- The scanner reads names, relative paths and the metadata it needs; it does
  not open document contents.
- It refuses to follow symbolic links, junctions and reparse points.
- Indexes are placed in the application's local data directory, outside the
  indexed roots.
- The interface never receives the absolute path of a root. Native operations
  use collection and node identifiers.
- No network, no telemetry, no AI and no automatic updates are part of the MVP.
- Revealing an item in File Explorer is always an explicit user action.

These controls reduce risk without being an absolute guarantee. The detailed
threat model is in `docs/security/threat-model.md`.

## Build-machine paths in binaries

A source repository can be clean while a binary compiled from it still embeds
the account name and directory layout of the machine that built it. Rust does
this by default, through panic metadata and dependency source paths.

FileTopo addresses this in two ways, and both matter:

1. **No compile-time path in shipped code.** `env!("CARGO_MANIFEST_DIR")` is
   expanded by the compiler into a string literal, so it is kept out of any
   code that reaches a release build. The synthetic fixture is resolved at run
   time and exists in development builds only.
2. **Path remapping at build time.** Cargo's `trim-paths` profile option is not
   stabilised in Cargo 1.98, so `scripts/build-release-clean.ps1` uses rustc's
   stable `--remap-path-prefix` instead, with prefixes computed locally and
   never committed.

Any artifact intended for distribution must be scanned before it leaves the
machine:

```powershell
pwsh -File scripts/scan-binary-for-personal-paths.ps1
```

The scan looks for the account name, the user profile, the repository path and
the Cargo home, in ASCII and UTF-16LE, and fails if it finds any of them.

One caveat that tooling cannot fix: on Windows the MSVC linker prints its own
progress message, which contains the build directory, and rustc surfaces it as
a `linker_messages` warning. That path is in the **build log**, not in the
artifact. Do not paste raw build logs into public issues.
