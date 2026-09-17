# Changelog

All notable public changes to FileTopo are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/).

This file is for people who use or read the project. The far more detailed
internal log of agent work lives in `docs/ai/CHANGELOG_AI.md`, in French.

> **No version has been released yet.** There is no release, no distributed
> binary and no signed installer. The entries below describe the state of the
> source code.

## Unreleased

### Added

- `AI_ASSISTANCE.md`, a bilingual disclosure of how the project was built:
  Sébastien Dubé owns the idea, the product vision, the requirements, the
  priorities, and every approval and final decision; OpenAI Codex was used to
  orchestrate the project, and OpenAI Codex and Anthropic Claude Code were
  used for implementation, tests, audits, documentation and reviews. No AI
  tool is an author, owner or maintainer, and their use implies no
  affiliation with, or endorsement by, OpenAI or Anthropic. It links to the
  project's versioned decisions, tasks, tests and reviews rather than to any
  private working notes.
- Interface language now follows the system or browser language: any `fr`
  locale gets French, every other locale gets English, with English as the
  fallback. The FR/EN button still overrides it, and an explicit choice is
  remembered across restarts.
- `scripts/build-release-clean.ps1` builds a release with build-machine paths
  remapped out of the binary, then scans the artifact.
- `scripts/scan-binary-for-personal-paths.ps1` searches a built artifact for
  the account name, user profile, repository path and Cargo home, in ASCII and
  UTF-16LE.
- Public documentation in English, with a full French README at
  [README.fr.md](README.fr.md).

### Changed

- The synthetic fixture is a development-only feature. Its location is resolved
  at run time instead of being compiled in, and the button is hidden when the
  build does not provide it.
- The Tauri application identifier now matches the current GitHub account.
  Tauri derives its WebView and application-data directories from this
  identifier, so development indexes created under the previous identifier are
  not discovered automatically. FileTopo starts with a new registry and can
  rebuild its indexes; it never changes the analysed folders.

### Fixed

- Release binaries no longer embed the absolute path of the developer's
  checkout, which `env!("CARGO_MANIFEST_DIR")` previously baked into a string
  literal.

### Security

- Documented and tooled the removal of build-machine paths from distributable
  artifacts. See [SECURITY.md](SECURITY.md).

## 0.1.0-alpha.1 — prepared 2026-08-26, not released

First complete iteration of the local product, at **alpha** status. Prepared
and verified locally on Windows; never published or distributed.

### Added

- Independent local collections, each with a name, colour and icon, and a
  persistent registry.
- Native folder selection by the user, then explicitly triggered indexing, with
  progress and cancellation.
- An iterative Rust scanner reading **metadata only**: names, relative paths,
  kind, size, dates and useful attributes. Document contents are not read.
- Refusal to follow symbolic links, junctions and reparse points.
- Detection of "online-only" files by their attributes, without triggering a
  download.
- An embedded SQLite index (SQLite 3.53.2), one per collection, stored in the
  application's local data and **outside** the analysed folder.
- A PixiJS/WebGL topographic map with an SVG relief fallback and progressive
  level of detail.
- An accessible DOM list, kept in sync with the map selection.
- Text search, filters by kind, seen/unseen state and pagination.
- Explicit, confined reveal of an item in Windows File Explorer.
- A bilingual French/English interface and user guides in
  [English](docs/user-guide-en.md) and [French](docs/user-guide-fr.md).
- A physical synthetic fixture and a deterministic volume generator.
- Public documentation: MIT licence, third-party notices, security policy,
  privacy policy, threat model, contribution guide and release checklist.

### Security

- No Tauri filesystem, shell, SQL or network permission is exposed to the web
  layer; the default capability is limited to `core:default`.
- A restrictive Content Security Policy, with no remote source.
- The interface never receives the absolute path of an analysed root; commands
  use collection and node identifiers.
- No write, rename, move or deletion in an analysed folder.
- No network, no telemetry, no AI, no automatic updates.
- `pnpm audit --prod` reports no known vulnerability as of 2026-08-26.

### Known limits of 0.1.0-alpha.1

- Windows 10 and 11 only. macOS and Linux are neither built nor tested.
- Full index rebuilds; there is no incremental watching of changes.
- The index is not encrypted by the application, and no built-in command erases
  application data.
- Published measurements go up to 100 000 items; one million items remains an
  architectural goal that is **not measured**.
- The local installer is unsigned; Windows shows a warning.
- **FileTopo** remains a reversible working name, with no exhaustive trademark
  search.
