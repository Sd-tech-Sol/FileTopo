# ROADMAP.md — Roadmap

> **Status.** Phases 0 to 6 are complete and verified. FileTopo has a Windows
> MVP that is built, tested and visually inspected on synthetic data. The
> **special human go-ahead for phase 6 was granted on 2026-08-26** by the
> project owner. The source is published at
> `https://github.com/Sd-tech-Sol/FileTopo`, with the source-only prerelease
> `v0.1.0-alpha.1`. No binary is distributed. Phase 7 remains deferred.

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Isolation and bootstrap | VERIFIED (TASK-0001) |
| 1 | Research and positioning | VERIFIED (TASK-0002 and TASK-0003) |
| 2 | Architecture | VERIFIED (TASK-0004) |
| 3 | Verifiable skeleton | VERIFIED (TASK-0005) |
| 4 | Local MVP without AI | VERIFIED (TASK-0006) |
| 5 | Public preparation | VERIFIED (TASK-0007) |
| 6 | Publication | VERIFIED (TASK-0008 and TASK-0009) |
| 7 | Optional advanced features | DEFERRED |

Since the standing authorisation of 2026-08-25, moving from one phase to the
next happens **autonomously** once the previous phase's acceptance criteria and
evidence are satisfied, without a repeated go-ahead. An agent stops and asks
for a human decision only on significant ambiguity, a missing secret or
credential, any spending, a destructive action on user documents, or an
external action outside the project's goal. Phase 6 — publication — remains the
exception: on top of the general regime it requires a **separate, special human
go-ahead**, after audits, and can only be approached once the preceding phases
are verified.

---

## Phase 0 — Isolation and bootstrap

**Goal.** Create an isolated local repository with a written, stable and
verifiable memory, and confirm the absence of any private data before any
research or code.

**Content.** A new local repository, the project memory (agent rules, vision,
roadmap, `docs/` directory, minimal state graph, synthetic fixtures directory),
and a check for the absence of private data.

**Output.** A documented local repository, with no code, no dependency and no
commit.

**Status.** `VERIFIED` on 2026-08-25, verified on evidence (see
`docs/ai/VALIDATION.md`).

---

## Phase 1 — Research and positioning

**Goal.** Know what already exists, what this project would add, and settle the
questions of public name and licence.

**Planned content.**
- A comparison of existing folder and document visualisation tools: strengths,
  limits, licences, platforms.
- A study of *GraphRAG Workbench* and of document-graph approaches: what
  transfers, and what does not, to an MVP without AI.
- A search for candidate public names and a check of their availability.
- An analysis of licences, MIT included, and their implications.

**Expected output.** A dated research report, with sources, and a list of
decidable options including the **public name** and the **licence**.

**Status.** `VERIFIED` on 2026-08-25, on independent evidence — see
`docs/ai/VALIDATION.md`, section A.7. Deliverable:
`docs/research/phase-1-research-and-positioning.md`. The report recommended a
name and a licence. `TASK-0003` then settled on **FileTopo** as a reversible
public working name in `docs/decisions/DEC-0001-public-name.md`; that decision
was verified before phase 2 opened. No name is reserved.

---

## Phase 2 — Architecture

**Goal.** Describe the system before writing it, and settle the technology
stack and the rendering method.

**Status.** `VERIFIED` through `TASK-0004` on 2026-08-25.

**Planned content.** Data model (brain, root, item, relation, relief),
technology stack, a comparison of rendering methods (SVG, Canvas, WebGL) before
deciding, a rebuildable and versioned index format, read-only guarantees, and a
performance budget. Each decision is recorded in `docs/decisions/` as a dated
note listing the alternatives that were rejected.

---

## Phase 3 — Verifiable skeleton

**Goal.** Lay down a minimal skeleton demonstrating technical feasibility,
without complete functionality.

**Planned content.** Project structure, a minimal build chain, and end-to-end
proof (read-only → index → minimal rendering) on synthetic fixtures.

**Status.** `VERIFIED` through `TASK-0005` on 2026-08-26. TypeScript, Vitest,
Vite, five Rust tests, the Tauri executable and the NSIS installer all
succeeded. The 10 k/100 k measurements and the visual inspection are recorded in
`docs/performance/phase-3-measurements.md` and `docs/ai/VALIDATION.md`.

---

## Phase 4 — Local MVP without AI

**Goal.** A usable product: local, offline, without artificial intelligence.

**Status.** `VERIFIED` through `TASK-0006` on 2026-08-26.

**Planned content.** Several independent brains (name, colour, icon), a chosen
root, a rebuildable and versioned incremental index, safe exclusions, a
progressive map that can be navigated, searched and filtered, opening files and
folders through Windows, a seen/unseen distinction, handling of online-only
files without automatic download, Windows robustness, accessibility and FR/EN
bilingualism.

---

## Phase 5 — Public preparation

**Goal.** Make the project publishable without risk.

**Status.** `VERIFIED` through `TASK-0007` on 2026-08-26.

**Planned content.** Licence applied, third-party notices, a security and
privacy review, absence of real data, a contribution guide, release notes.

---

## Phase 6 — Publication

**Goal.** Publish the project.

**Status.** `VERIFIED` through `TASK-0008` and `TASK-0009` on **2026-08-26**.

The separate special human go-ahead required by section 5 of `AGENTS.md` was
granted by the project owner before any remote action.

**Done.** `TASK-0008` — independent pre-publication review, filling the public
gaps, English-first documentation, system language detection, and removal of
build-machine paths from release binaries. See
`docs/reviews/TASK-0008-independent-review.md`.

**Published.** Public MIT repository, Windows CI, private vulnerability
reporting and source-only prerelease `v0.1.0-alpha.1`, with no attached asset.
Binary signing and distribution remain deliberately outside this release.

---

## Phase 7 — Optional advanced features

**Goal.** Consider future features that are optional and explicit, beyond the
MVP.

**Planned content.** AI, OCR, remote connectors — always optional, disabled by
default, and explicitly triggered by the user. Possibly a virtual arrangement
of the corpus, subject to preview, simulation, confirmation, logging and
restoration; never an automatic physical reorganisation of the user's
documents.
