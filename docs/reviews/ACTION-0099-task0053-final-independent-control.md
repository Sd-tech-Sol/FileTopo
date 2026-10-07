# ACTION-0099 — Final independent control of TASK-0053 / F-052 / P-19

- **Date:** 2026-10-07
- **Role:** independent orchestrator control
- **Branch:** `build/v0.2-a37-v1-workspace-persistence`
- **Product commit tested:** `804e1daa29b30e60b098ff677d06b452f02ecad6`
- **Branch HEAD inspected:** `a28f354ff9625287c41284f058e132628a3dd32d`
- **Verdict:** **PASS / VERIFIED**

## 1. Scope and provenance

The executor reported TASK-0053 as IMPLEMENTED only. This control did not accept that claim by itself.

The compare `804e1daa29b30e60b098ff677d06b452f02ecad6..a28f354ff9625287c41284f058e132628a3dd32d` contains one commit and only documentation/proof files. No product file changed after the tested product commit.

## 2. Backend store

Reviewed `workspace_state.rs`, Tauri commands and catalogue metadata writes.

PASS:
- global key `workspace.v1`;
- versioned envelope;
- `deny_unknown_fields` on envelope/state/branch;
- 16 KiB record cap and bounded ids/lists/views;
- malformed/unknown/future/oversized record => safe defaults + named `RECORD_UNREADABLE`;
- one SQLite upsert row; rejected state does not replace the prior valid record;
- no source path, document name, cursor or content stored.

## 3. Ownership / no duplicate truth

PASS:
- per-brain resume remains owner of mono-brain view/selection/filter/panel;
- `filetopo.locale` remains owner of language;
- seen/unseen remains in the existing journal/store;
- F-052 owns only the global workspace/preferences missing from those stores.

## 4. Node-reference generation safety

PASS.

The backend computes bindings from the current Index and restores a reference only when its stored generation equals the current `index_id@revision`, then checks the node itself.

The Rust test `a_number_reused_by_a_new_index_never_selects_the_new_object` creates the exact numeric-id trap: the same number points to another path in a recreated Index; restore drops it with `SELECTION_GENERATION_CHANGED`.

The in-place rebuild test keeps `index_id`, increments revision and abandons the branch with `BRANCH_GENERATION_CHANGED`.

## 5. F-042 branch state

PASS:
- valid branch restored whole;
- root must be folder/root and generation-valid;
- invalid/out-of-subtree collapsed ids are removed and named;
- selection outside branch falls back to root;
- saved selection is independently generation-checked;
- if branch cannot be restored, saved composition view/selection are used instead of partial branch state.

## 6. Frontend persistence / write budget

PASS.

`WorkspaceWriter`:
- is inert before restore seed;
- does not rewrite an equal restored value;
- sends explicit changes urgently;
- debounces camera/selection-only changes with max-wait;
- serializes writes and keeps latest value;
- retries after failure;
- exposes `flush()`.

`MapApp` performs best-effort flush on `pagehide`, `beforeunload`, visibility hidden and unmount. Crash/power loss during the debounce window is explicitly not claimed.

## 7. Density and motion

PASS:
- `comfortable|compact` only;
- compact selectors target application chrome and do not target map/world geometry;
- real proof records identical map rectangles/projections;
- `system|reduce` only;
- `system` leaves OS `prefers-reduced-motion` authoritative;
- `reduce` disables motion;
- no force-motion mode exists.

## 8. Corrections / FR-EN / accessibility

PASS:
- closed correction codes;
- visible non-blocking summary;
- FR and EN strings present;
- dismissal does not steal focus;
- WebView2 proof records zero axe violations at each measured state;
- branch collapse/exit uses real keyboard events in the harness.

## 9. WebView2 evidence

Artifact: `docs/performance/runs/TASK-0053-webview2.json`.

PASS:
- `headTested = 804e1daa29b30e60b098ff677d06b452f02ecad6`;
- 4 real application processes / 3 real closes;
- 3 brains;
- phase 2 restores the phase-1 composition/focus/camera/selection/legend/compact/reduce/FR/branch/collapsed state;
- leaving branch focus restores its saved composition camera/selection;
- later state changes to 2 brains, EN, comfortable, system and another branch;
- rebuild advances revision 2 -> 3;
- phase 4 shows `BRANCH_GENERATION_CHANGED` + `SELECTION_GENERATION_CHANGED`, abandons stale branch state and stores the correction once;
- source/Index/journal/relations/exclusions/seen fingerprints stay unchanged around preference gestures;
- compact keeps world rectangles and projections identical;
- 60 wheel notches + one drag produced 2 workspace writes.

The WebView2 rebuild does not manufacture numeric-id reuse. That stronger trap is covered directly by the Rust test above; the WebView2 layer independently proves real generation change and rejection of persisted stale references. This is sufficient without lowering the contract.

## 10. Public readiness

PASS for the TASK-0053 delta/proof reviewed:
- synthetic roots/brains only;
- no personal source path or real user data in the persisted workspace;
- no private-key/password/token/secret pattern found in the product diff examined.

## 11. CI distinction

**No GitHub Actions workflow run and no commit status are attached to `804e1daa29b30e60b098ff677d06b452f02ecad6`.**

Therefore:
- executor evidence says Rust 839 PASS, frontend 708 PASS, `tsc` OK, `pnpm build` PASS and Tauri debug PASS;
- ACTION-0099 treats those as local executor evidence that was inspected, not as independently rerun remote CI.

## 12. Final verdict

**PASS / VERIFIED.**

- `TASK-0053 = VERIFIED`
- `F-052 = VERIFIED`
- `M-1 = CLOSED`
- `P-19 = CLOSED / VERIFIED`
- `F-046` unchanged
- no `TASK-0054` created by this action

Next action: perform a fresh V1 audit before selecting any new implementation tranche.
