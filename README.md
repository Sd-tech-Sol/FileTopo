# FileTopo

*Read this in [French / en français](README.fr.md).*

**FileTopo turns a folder tree into a local topographic map.** It targets
Windows, runs fully offline, and reads only the metadata it needs: the scanner
never opens document contents, and it never modifies the folders it analyses.

> ## Status: alpha — never released
>
> FileTopo is at version **0.1.0-alpha.1**. There is no release, no distributed
> binary and no signed installer.
>
> The code works and is verified locally on Windows, but it has been used by
> **nobody except its author**, on **synthetic data only**. Expect defects,
> breaking changes and missing features. Do not make important work depend
> on it.

## Author

FileTopo is an **original creation by Sébastien Dubé**, conceived and directed
from scratch. It is not derived from any other software: its only borrowings
are the open source components listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- Author and maintainer: **Sébastien Dubé** — <https://github.com/Sd-tech-Sol>
- Licence: [MIT](LICENSE) — © 2026 Sébastien Dubé
- Design, architecture and decisions: see [`docs/decisions/`](docs/decisions/)
  and [`PROJECT_VISION.md`](PROJECT_VISION.md)

## What FileTopo does

- Several independent local **collections**, each with a name, colour and icon.
- You pick a folder through the native dialog, then indexing starts only on an
  **explicit** action, with progress and cancellation.
- **Metadata-only** scanning: names, relative paths, kind, size, dates and the
  attributes that matter.
- A PixiJS/WebGL topographic map with an SVG relief fallback and progressive
  level of detail.
- An accessible DOM list, kept in sync with the map selection.
- Text search, filters by kind, seen/unseen state and pagination.
- Explicit, confined reveal of an item in Windows File Explorer.
- A bilingual interface, French and English.

## What FileTopo does not do

These absences are **design choices**, not upcoming features:

- it **writes nothing** into an analysed folder — no creation, no rename, no
  move, no deletion;
- it **does not read** the contents of your documents;
- it **does not follow** symbolic links, junctions or reparse points;
- it **does not download** cloud "online-only" files: it detects them by their
  attributes and leaves them in the cloud;
- it has **no network, no telemetry, no AI, no account and no automatic
  updates**.

## Language

The interface follows your system or browser language: any `fr` locale gets
French, every other locale gets English, and English is the fallback when the
language cannot be determined. The FR/EN button overrides that at any time, and
your explicit choice is remembered across restarts.

## Exact limits of version 0.1.0-alpha.1

| Limit | Detail |
|---|---|
| Platform | Windows 10 and 11 only. macOS and Linux are neither built nor tested. |
| Indexing | Full rebuilds. No incremental watching of changes. |
| Measured volume | Reproducible measurements up to **100 000 items**. One million items is an architectural goal that is **not measured**. |
| Encryption | The index is not encrypted by the application. It relies on your Windows account and disk protections. |
| Erasure | No built-in command erases application data; that is done with operating system tools. |
| Distribution | The local installer is **unsigned**. Windows will show a SmartScreen warning. |
| Real-world use | Exercised only on synthetic fixtures and temporary directories, by one person. |
| Name | **FileTopo** is a reversible working name. No exhaustive trademark search was carried out; no domain or account has been reserved. |
| Accessibility | An accessible DOM list is provided and was inspected visually, but it has **not been audited** by a tool or a specialist. |

Limits are kept current in [CHANGELOG.md](CHANGELOG.md).

## Security and privacy

- No Tauri filesystem, shell, SQL or network permission is exposed to the web
  layer: the default capability is limited to `core:default`.
- A restrictive Content Security Policy, with no remote source.
- The interface **never** receives the absolute path of an analysed root;
  commands use collection and node identifiers.
- SQLite indexes are written to the application's local data directory,
  **outside** the analysed folders, and can be rebuilt.
- All data in this repository is strictly synthetic.

Details: [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md) and the
[threat model](docs/security/threat-model.md).

## Development prerequisites

- Windows 10 or 11 with WebView2;
- Node.js 24 and pnpm 10;
- Rust stable with the MSVC target (verified with Rust 1.98.0);
- Visual Studio Build Tools 2022, C++ tools and the Windows SDK.

## Install and verify

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

In a Visual Studio developer console where Rust is on `PATH`:

```powershell
$env:CARGO_INCREMENTAL = "0"
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Disabling the incremental cache works around a cache defect observed with
Rust 1.98 on the development machine; it does not change the produced code.
The same chain runs in continuous integration on Windows — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Building a release

Use the dedicated script rather than `pnpm tauri build` directly:

```powershell
pwsh -File scripts/build-release-clean.ps1
```

It remaps build-machine paths out of the binary and then scans the artifact for
personal paths. See [SECURITY.md](SECURITY.md) for why this matters.

## Local development

```powershell
pnpm tauri dev
```

The **Demo** button uses a deterministic generator. The **Synthetic fixture**
button runs the real scanner → SQLite → DTO pipeline over
`tests/fixtures_synthetic/demo`; it appears in development builds only. No test
may ever point at a user folder.

User guides: [English](docs/user-guide-en.md) · [French](docs/user-guide-fr.md).

## Measurements

Reproducible MVP measurements at 10 000 and 100 000 items are recorded in
[`docs/performance/phase-4-mvp-measurements.md`](docs/performance/phase-4-mvp-measurements.md).
Budgets and the strategy towards one million items — **not reached to date** —
are in
[`docs/performance/phase-2-budgets.md`](docs/performance/phase-2-budgets.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[code of conduct](CODE_OF_CONDUCT.md). One rule outranks all the others:
**no contribution may contain real personal data**, neither yours nor anyone
else's.

Issues and pull requests may be written in English or French.

## AI-assisted development

FileTopo is an original project by Sébastien Dubé — idea, product vision,
requirements, priorities, and every approval and final decision are his.
Development was AI-assisted: the project was orchestrated with the OpenAI
Codex desktop application, and OpenAI Codex and Anthropic Claude Code were
used for implementation, tests, audits, documentation and reviews, under his
direction and review. No AI tool is an author, owner or maintainer of this
project, and using them implies no affiliation with, or endorsement by, OpenAI
or Anthropic. Final responsibility and maintenance rest with Sébastien Dubé.
See [AI_ASSISTANCE.md](AI_ASSISTANCE.md) for the full disclosure, which links
to the versioned decisions, tasks, tests and reviews rather than to any
private working notes.

## Repository layout

Public documentation is in English. The project's internal working notes under
[`docs/ai/`](docs/ai/) are kept in French, as is the working memory in
[`graph/`](graph/); they record how the project was built and are not required
reading to use or contribute to FileTopo.
