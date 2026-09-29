// TASK-0050 — combines cellule A (this task's own WebView2 harness, 21/23
// reachable keys) and cellule B (the existing `J12` scenario of
// `src/map/relationScenario.ts`, replayed on the current HEAD, which
// materialises the two remaining keys: `intra-suggestion`, `intra-approved`)
// into the single published proof, per ACTION-0088 and TASK-0050 §Q/§R.
//
// Reads two already-produced JSON files; writes exactly one:
// `docs/performance/runs/TASK-0050-webview2.json`. Touches nothing else.
// Never replaces `docs/performance/runs/TASK-0024-J12-intrabrain-relations-regression-webview2.json`
// (TASK-0024's own canonical, protected evidence) nor any other historical
// artefact: cellule B's own replay writes under its own existing name
// (`TASK-0026-J12-intrabrain-relations-regression-webview2.json`, not
// protected — see scripts/protected-run-artifacts.ps1), which this script
// only ever READS.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const [, , cellAPath, cellBPath, outputPath, head] = process.argv;
assert(cellAPath && cellBPath && outputPath && head, "usage: task0050-combine-webview2.mjs <cellA.json> <cellB J12 artifact.json> <output.json> <headSha>");

const cellA = JSON.parse(await readFile(cellAPath, "utf8"));
const cellB = JSON.parse(await readFile(cellBPath, "utf8"));

assert.equal(cellA.task, "TASK-0050-cellA", `unexpected cellA payload task: ${cellA.task}`);
assert.equal(cellB.sourceCriterion, "TASK-0017/J12", `cellB is not a J12 replay: ${cellB.sourceCriterion}`);
assert.equal(cellB.replacesCanonicalEvidence, false, "cellB must not claim to replace canonical evidence");

const DIAGNOSTIC_EXCEPTION = "node-diagnostic";
const CELL_B_REQUIRED_KEYS = ["intra-approved", "intra-suggestion"];

// §3 — union strict, derived from the real legend cellA read off the live DOM.
const legendKeys = [...cellA.scenario.legendSemanticKeys].sort();
assert.equal(legendKeys.length, 24, `expected legend = 24, got ${legendKeys.length}`);
assert.equal(new Set(legendKeys).size, legendKeys.length, "duplicate legend key");
assert(legendKeys.includes(DIAGNOSTIC_EXCEPTION), "node-diagnostic missing from the legend contract");
const expectedReachable = legendKeys.filter((key) => key !== DIAGNOSTIC_EXCEPTION).sort();
assert.equal(expectedReachable.length, 23, `expected reachable = 23, got ${expectedReachable.length}`);

const cellAObservedKeys = [...cellA.scenario.mapSemanticKeys].sort();

const intraSuggestionProof = cellB.evidence?.intraSuggestionProof;
const intraApprovedProof = cellB.evidence?.intraApprovedProof;
assert(intraSuggestionProof, "cellB artefact carries no intraSuggestionProof — relationScenario.ts evidence collection did not run");
assert(intraApprovedProof, "cellB artefact carries no intraApprovedProof — relationScenario.ts evidence collection did not run");
assert.equal(intraSuggestionProof.hasIntraSuggestion, true, "cellB: intra-suggestion not observed on the live map during J12's replay");
assert.equal(intraApprovedProof.hasIntraApproved, true, "cellB: intra-approved not observed on the live map during J12's replay");

const cellBObservedKeys = [
  ...new Set([...(intraSuggestionProof.legendKeysOnScreen ?? []), ...(intraApprovedProof.legendKeysOnScreen ?? [])]),
].sort();
for (const required of CELL_B_REQUIRED_KEYS) {
  assert(cellBObservedKeys.includes(required), `cellB.observedKeys is missing required key ${required}`);
}

const observedUnion = [...new Set([...cellAObservedKeys, ...cellBObservedKeys])].sort();
assert.deepEqual(
  observedUnion,
  expectedReachable,
  `observedUnion (cellA ∪ cellB) != expectedReachable.\nunion: ${JSON.stringify(observedUnion)}\nexpected: ${JSON.stringify(expectedReachable)}`,
);
// No second exception: the only legend key outside observedUnion is node-diagnostic.
const missingFromUnion = legendKeys.filter((key) => !observedUnion.includes(key));
assert.deepEqual(missingFromUnion, [DIAGNOSTIC_EXCEPTION], `expected the sole exception to be node-diagnostic, got ${JSON.stringify(missingFromUnion)}`);

// §4 — signatures for the two cellB-provided keys: cellA's unconditional
// legend-side sample (captured even when cellA cannot exercise the key live)
// compared against cellB's live-side capture from the real J12 replay.
const SIGNATURE_PROPERTIES = ["strokeWidth", "strokeDasharray", "fillOpacity", "fontWeight", "opacity"];
const cellBSignatureSource = { "intra-suggestion": intraSuggestionProof, "intra-approved": intraApprovedProof };
const cellBSignatures = {};
for (const key of CELL_B_REQUIRED_KEYS) {
  const legendRow = cellA.sharedVisualLanguage?.[key];
  assert(legendRow, `cellA carries no shared-visual-language row for ${key}`);
  assert.equal(legendRow.legendSampleFound, true, `${key}: cellA found no legend sample to compare cellB's live capture against`);
  const live = cellBSignatureSource[key].signature;
  assert.equal(live?.exercisedOnMap, true, `${key}: cellB's own live signature capture is empty`);
  const liveClassKeys = Object.keys(live.byClass ?? {});
  const legendClassKeys = Object.keys(legendRow.legendByClass ?? {});
  const common = liveClassKeys.filter((name) => legendClassKeys.includes(name));
  assert(common.length > 0, `${key}: no shared-class element present on both cellB's live map and cellA's legend sample`);
  const compared = {};
  for (const classKey of common) {
    const liveSignature = live.byClass[classKey];
    const legendSignature = legendRow.legendByClass[classKey];
    for (const property of SIGNATURE_PROPERTIES) {
      assert.equal(
        liveSignature[property],
        legendSignature[property],
        `${key} (.${classKey}): computed ${property} diverges between cellB's live map (${liveSignature[property]}) and cellA's legend sample (${legendSignature[property]})`,
      );
    }
    compared[classKey] = { live: liveSignature, legend: legendSignature };
  }
  cellBSignatures[key] = { sharedClasses: live.sharedClasses, comparedClasses: compared };
}

// §5 — node-diagnostic: unchanged, passed through from cellA verbatim.
assert(cellA.nodeDiagnosticProof, "cellA carries no nodeDiagnosticProof");
assert.equal(
  cellA.nodeDiagnosticProof.realWebViewStatus,
  "NOT_APPLICABLE_WHILE_SCAN_DIAGNOSTICS_ARE_REJECTED",
  "node-diagnostic exception label changed unexpectedly",
);
assert.equal(cellA.nodeDiagnosticProof.deterministicCoverage, "PASS", "node-diagnostic deterministic coverage did not PASS");

const result = {
  task: "TASK-0050",
  headTested: head,
  strategy: "ACTION-0088: cellA (this task's own harness) union cellB (J12 replay of src/map/relationScenario.ts)",
  engine: cellA.engine,
  cells: {
    cellA: {
      source: "scripts/task0050-webview2.mjs",
      observedKeys: cellAObservedKeys,
      richMapSemanticKeys: cellA.scenario.richMapSemanticKeys,
      filteredMapSemanticKeys: cellA.scenario.filteredMapSemanticKeys,
      establishedIntra: cellA.scenario.establishedIntra,
      pendingIntra: cellA.scenario.pendingIntra,
      establishedInter: cellA.scenario.establishedInter,
      pendingInter: cellA.scenario.pendingInter,
      aggregateCount: cellA.scenario.aggregateCount,
    },
    cellB: {
      source: "src/map/relationScenario.ts (J12), replayed via scripts/j12-run-real-host.ps1 on HEAD",
      artifact: "docs/performance/runs/TASK-0026-J12-intrabrain-relations-regression-webview2.json",
      doesNotReplaceCanonicalEvidence: true,
      canonicalHistoricalReference: "docs/performance/runs/TASK-0024-J12-intrabrain-relations-regression-webview2.json (untouched)",
      observedKeys: cellBObservedKeys,
      brainId: cellB.evidence?.brainId,
      overview: cellB.evidence?.overview,
      suggestionRendering: cellB.evidence?.suggestionRendering,
      approval: cellB.evidence?.approval,
      intraSuggestionProof,
      intraApprovedProof,
      selfCheck: cellB.evidence?.selfCheck,
      capturedAtIso: cellB.capturedAtIso,
      host: cellB.host,
    },
  },
  coverage: {
    legendKeys,
    legendKeyCount: legendKeys.length,
    expectedReachable,
    expectedReachableCount: expectedReachable.length,
    observedUnion,
    observedUnionCount: observedUnion.length,
    exemptKeys: [DIAGNOSTIC_EXCEPTION],
    reachableKeysExactMatch: true,
    cellBRequiredKeysPresent: CELL_B_REQUIRED_KEYS.every((key) => cellBObservedKeys.includes(key)),
  },
  sharedVisualLanguage: {
    cellA: cellA.sharedVisualLanguage,
    cellBAgainstCellALegendSample: cellBSignatures,
  },
  nodeDiagnosticProof: cellA.nodeDiagnosticProof,
  locale: cellA.locale,
  axe: cellA.axe,
  keyboard: cellA.keyboard,
  passiveWindow: cellA.passiveWindow,
  sessionOnly: cellA.sessionOnly,
  fatalConsoleErrors: cellA.fatalConsoleErrors,
};

assert.equal(result.fatalConsoleErrors, 0, "cellA recorded fatal console errors");

const text = JSON.stringify(result, null, 1);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, text);
console.log(
  `TASK-0050 combined PASS: union ${observedUnion.length}/${expectedReachable.length} reachable keys, legend ${legendKeys.length}/24, exception=[${missingFromUnion.join(", ")}]`,
);
