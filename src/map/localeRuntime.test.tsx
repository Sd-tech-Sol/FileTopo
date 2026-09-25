import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_STORAGE_KEY } from "../lib/locale";
import { withHostLanguages } from "../test/hostLanguage";
import MapApp from "./MapApp";
import type { BrainRecord, MapProjection } from "./types";

/**
 * `TASK-0046` / `DEC-0044` — the real `MapApp`, in French and in English, against a scripted
 * backend rich enough to show **every large surface** the audit `ACTION-0076` listed.
 *
 * What is proved, and how:
 *
 * * the interface language is resolved once at start — explicit choice, then host, then
 *   English — and **nothing is written** unless the person chooses;
 * * each large surface says one label that is **unique to its language** (a French label
 *   in the English view, or the reverse, fails the assertion);
 * * in English, a scan of the text **and** of every accessible name finds no French left
 *   (user data — brain and node names — is neutral on purpose, and checked unchanged);
 * * switching language sends **no command at all**, changes no selection, brain, count or
 *   record, writes exactly the one existing key `filetopo.locale`, and follows on `<html lang>`;
 * * a refused write does not break the session; a corrupted value falls back to the host.
 */
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));

const A = "brain-alpha";
const B = "brain-beta";

const records = (): BrainRecord[] =>
  [
    { brainId: A, displayName: "Alpha", color: "#1F6F5C", icon: "A", sourceKind: "REAL_ROOT", sourceRef: "00000000-0000-4000-8000-000000000001", sourceLabel: "synthetic-root", position: 1 },
    { brainId: B, displayName: "Beta", color: "#4A4FA8", icon: "B", sourceKind: "REAL_ROOT", sourceRef: "00000000-0000-4000-8000-000000000002", sourceLabel: "synthetic-root", position: 2 },
  ] as BrainRecord[];

const node = (id: number) => ({
  id,
  parentId: id === 1 ? null : 1,
  name: id === 1 ? "root-node" : `file-${id}.txt`,
  relativePath: id === 1 ? "" : `file-${id}.txt`,
  kind: id === 1 ? "root" : "file",
  depth: id === 1 ? 0 : 1,
  sizeBytes: id * 1000,
  modifiedUnixMs: 1_790_000_000_000,
  childCount: id === 1 ? 2 : 0,
  accessDiagnostic: null,
  rect: { x: id === 1 ? 0 : 300, y: id === 1 ? 0 : (id - 2) * 80, w: 240, h: 64 },
});

const projectionOf = (brainId: string, filter?: unknown): MapProjection =>
  ({
    brainId, fixtureId: "synthetic", label: "synthetic", rootId: 1, nodeCount: 3, layoutWidth: 600,
    layoutHeight: 300, schemaVersion: 6, layoutAlgorithm: "layered-tree-cards-v1",
    nodes: [1, 2, 3].map(node), diagnostics: [], indexRevision: 3, focusId: 1, viewBudget: 512,
    materializedCount: 3, nonMaterializedCount: 0, hiddenReason: null,
    aggregates: [{ parentId: 1, omittedDirectChildren: 4, nextCursor: "c1", rect: { x: 300, y: 200, w: 240, h: 64 } }],
    hierarchyEdges: [{ parentId: 1, childId: 2 }, { parentId: 1, childId: 3 }],
    filtered: filter
      ? { filter, filteredTotal: 2, materializedMatchCount: 2, filterMatchIds: [2], filterContextIds: [1], filterNextCursor: null }
      : null,
  }) as unknown as MapProjection;

const OTHER_NODE = { key: "cek1|brain-beta|far.txt", brainId: B, brainDisplayName: "Beta", brainIcon: "B", nodeId: 9, name: "far.txt", relativePath: "far.txt", brainIndexed: true };
const SELF_END = (name: string, id: number) => ({ key: `ek1|${name}`, nodeId: id, name, relativePath: name });

const suggestion = {
  suggestionKey: "dre1:aaa", relationType: "revision", source: SELF_END("file-2.txt", 2), target: SELF_END("file-3.txt", 3),
  state: "pending", basis: "synthetic-basis", producer: "core-rule-engine", ruleName: "core.numbered-sibling-revision-candidate",
  ruleVersion: "v1", explanationFr: "Suggestion créée à partir du numéro final consécutif.",
  explanationEn: "Suggestion created from the consecutive trailing number.", signals: { "same-parent": true },
};
const crossSuggestion = {
  suggestionKey: "cross:1", relationType: "reference", source: { ...OTHER_NODE, brainId: A, brainDisplayName: "Alpha", brainIcon: "A", nodeId: 2, name: "file-2.txt" },
  target: OTHER_NODE, state: "pending", basis: "synthetic-basis",
};

const calls = () =>
  invokeMock.mock.calls.map(([command, args]) => ({ command: String(command), args: (args ?? {}) as Record<string, unknown> }));

function installBackend() {
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
    const brainId = (args?.brainId as string | undefined) ?? A;
    switch (command) {
      case "map_fixtures":
        return [{ id: "quasi-empty", labelFr: "Quasi vide", labelEn: "Nearly empty", seed: "s", maxNodes: 10, plannedNodes: 3, plannedMaxDepth: 1 }];
      case "map_host_info":
        return {
          sandboxRoot: "sandbox", appVersion: "0.0.0", sqliteVersion: "0", webviewVersion: "0", tauriVersion: "0",
          platform: "test", nodeCeiling: 5000, depthCeiling: 12, cardWidth: 240, cardHeight: 64,
          layoutAlgorithm: "layered-tree-cards-v1", autoMeasure: false, autoVerify: false, autoRelations: false,
          autoBrainsPass: 0, autoComposedPass: 0, autoCrossPass: 0, autoTopographicPass: 0,
        };
      case "map_brains":
        return { brains: records(), activeBrainId: A, schemaVersion: 2, catalogPath: "catalog.sqlite", seeded: 0 };
      case "map_ui_preferences":
        return { detailsPanelVisible: true };
      case "map_brain_activate":
        return records().find((brain) => brain.brainId === brainId);
      case "map_open":
        return {
          brainId, state: "OPENED_EXISTING", indexId: "index-1", revision: 3, nodeCount: 3, schemaVersion: 6,
          sourceRead: false, indexReused: true, freshness: "UNKNOWN",
          sourceObservation: { state: "SYNCED", reason: null, observedUnixMs: 1_790_000_000_000, lastSuccessfulRevision: 3, lastSuccessfulUnixMs: 1_790_000_000_000, persisted: true },
          changeSummary: { baselineEstablished: false, total: 1, created: 1, modified: 0, renamed: 0, moved: 0, deleted: 0 },
          applicationMode: "INCREMENTAL",
        };
      case "map_view":
        return projectionOf(brainId, args?.filter);
      case "map_brain_resume_restore":
      case "map_brain_resume_state":
        return null;
      case "map_watch_status":
        return { brainId, state: "VERIFYING", mode: "NATIVE", reason: "INITIAL_CHECK", indexRevision: 3, pending: false, sequence: 1 };
      case "map_search_nodes":
        return { brainId, query: String(args?.query), total: 1, offset: 0, limit: 50, indexRevision: 3, items: [{ brainId, nodeId: 2, name: "file-2.txt", relativePath: "file-2.txt", kind: "file" }] };
      case "map_node_detail": {
        const id = (args?.reference as { nodeId: number }).nodeId;
        return { node: node(id), parent: id === 1 ? null : node(1), children: [], omittedChildren: 0, nextCursor: null };
      }
      case "map_node_children":
        return { brainId, parentNodeId: 1, items: [], total: 0, nextCursor: null, indexRevision: 3, limit: 50 };
      case "map_node_change_state":
        return { brainId, nodeId: (args?.reference as { nodeId: number }).nodeId, isNew: false, isUnseen: true, unseenChangeCount: 2 };
      case "map_change_journal":
        return {
          brainId, indexId: "index-1", indexRevision: 3, natures: [], total: 1, unseenTotal: 1, nextCursor: null, limit: 50,
          items: [{ brainId, eventId: 1, detectedRevision: 3, ordinal: 0, nature: "CREATED", nodeId: 2, nodeKind: "file", oldName: null, newName: "file-2.txt", oldRelativePath: null, newRelativePath: "file-2.txt", oldParentId: null, newParentId: 1, detectedUnixMs: 1_790_000_000_000, nodePresent: true, seen: false }],
        };
      case "map_content_summary":
        return { brainId, storePath: "signals.sqlite", schemaVersion: 1, signalEngineVersion: "sha256-v1", currentGenerationId: "gen-1", currentGenerationObservedAt: 1_790_000_000_000, sourceFingerprint: "f", observationCount: 1, hashedCount: 1, unreadableCount: 0, unstableCount: 0, unsupportedCount: 0 };
      case "map_content_observation_for_path":
        return { relativePath: "file-2.txt", sizeBytes: 2000, modifiedUnixMs: 1, observationStatus: "HASHED", hashAlgorithm: "sha256-v1", hashHex: "ab".repeat(32), observedAtUnixMs: 1_790_000_000_000, generationId: "gen-1", diagnostic: null };
      case "map_content_identical_members":
        return [];
      case "map_exact_duplicate_summary":
        return { brainId, availability: "AVAILABLE", generationId: "gen-1", observedAtUnixMs: 1_790_000_000_000, hashAlgorithm: "sha256-v1", exactGroupCount: 1, groupedOccurrenceCount: 2, emptyGroupCount: 0, queryDurationMs: 1 };
      case "map_exact_duplicate_groups":
        return { brainId, availability: "AVAILABLE", generationId: "gen-1", observedAtUnixMs: 1_790_000_000_000, hashAlgorithm: "sha256-v1", totalGroups: 1, offset: 0, limit: 50, maxLimit: 100, returned: 1, hasMore: false, groups: [{ groupId: "g1", hashAlgorithm: "sha256-v1", hashHex: "cd".repeat(32), sizeBytes: 2048, memberCount: 2, emptyContent: false, generationId: "gen-1", observedAtUnixMs: 1_790_000_000_000 }] };
      case "map_exact_duplicate_members":
        return {
          brainId, groupId: "g1", generationId: "gen-1", observedAtUnixMs: 1_790_000_000_000, hashAlgorithm: "sha256-v1",
          hashHex: "cd".repeat(32), totalMembers: 2, unresolvedReturned: 1, offset: 0, limit: 50, maxLimit: 100, returned: 2,
          hasMore: false, order: "relative_path", queryDurationMs: 1,
          members: [
            { relativePath: "file-2.txt", name: "file-2.txt", sizeBytes: 2048, observationStatus: "HASHED", hashAlgorithm: "sha256-v1", hashHex: "cd".repeat(32), observedAtUnixMs: 1, generationId: "gen-1", nodeRef: { brainId, nodeId: 2 } },
            { relativePath: "copy.txt", name: "copy.txt", sizeBytes: 2048, observationStatus: "HASHED", hashAlgorithm: "sha256-v1", hashHex: "cd".repeat(32), observedAtUnixMs: 1, generationId: "gen-1", nodeRef: null },
          ],
        };
      case "map_relations_open":
        return {
          brainId, fixtureId: "synthetic", relationsPath: "r.sqlite", schemaVersion: 1, endpointKeyScheme: "ek1", legacyInScope: false,
          // one established relation whose target the bounded view does not hold (node 99)
          // Two established relations that both say `id: 1` (each table numbers its own rows), each
          // with one end the bounded view does not hold: two lines, with two different keys.
          established: [
            { id: 1, provenance: "DETERMINISTIC", relationType: "reference", source: SELF_END("file-2.txt", 2), target: SELF_END("far-away.txt", 99), ruleName: "core.exact-content-identical", ruleVersion: "v1", suggestionKey: null },
            { id: 1, provenance: "APPROVED", relationType: "revision", source: SELF_END("file-3.txt", 3), target: SELF_END("far-away.txt", 99), ruleName: null, ruleVersion: null, suggestionKey: "s1" },
          ],
          pendingSuggestions: [suggestion], deterministicCount: 1, approvedCount: 0, pendingSuggestionCount: 1,
          rules: [], unresolvedEndpoints: [], deterministicDigest: "d", seeded: 0, engineCurrent: true,
        };
      case "map_relation_engine_status":
        return { brainId, engineVersion: "dre-v1", inputState: "CURRENT", mapDigest: "m", currentContentGenerationId: null, lastRunId: null, lastRunUnixMs: null, lastMapDigest: null, lastContentGenerationId: null };
      case "map_relations_for_node":
        return {
          brainId, fixtureId: "synthetic", reference: args?.reference, endpointKey: "ek1|file-2.txt", relativePath: "file-2.txt",
          outgoing: [{ direction: "outgoing", provenance: "DETERMINISTIC", relationType: "content-identical", other: SELF_END("file-3.txt", 3), ruleName: "core.exact-content-identical", ruleVersion: "v1", explanationFr: "Contenu binaire identique.", explanationEn: "Identical binary content." }],
          incoming: [], outgoingCount: 1, incomingCount: 0, suggestions: [suggestion],
        };
      case "map_relations_review_queue":
        return { brainId, fixtureId: "synthetic", totalPending: 1, offset: 0, limit: 50, maxLimit: 100, returned: 1, hasMore: false, order: "suggestion_key ascending", items: [suggestion], unresolvedEndpoints: [], engineCurrent: true };
      case "map_cross_relations_open":
        return { storePath: "cross.sqlite", schemaVersion: 1, endpointKeyScheme: "cek1", established: [], pendingSuggestions: [], deterministicCount: 0, approvedCount: 0, pendingSuggestionCount: 1, rules: [], unresolvedEndpoints: [], resolvedBrainIds: [A, B], deterministicDigest: "d", seeded: 0 };
      case "map_cross_relations_for_node":
        return {
          reference: args?.reference, endpointKey: "cek1|brain-alpha|file-2.txt", relativePath: "file-2.txt",
          outgoing: [{ direction: "outgoing", provenance: "DETERMINISTIC", relationType: "reference", other: OTHER_NODE, ruleName: "cross-homonyms", ruleVersion: "v1", suggestionKey: null }],
          incoming: [], outgoingCount: 1, incomingCount: 0, suggestions: [crossSuggestion],
        };
      default:
        return null;
    }
  });
}

/** Brain and node names are user data: neutral on purpose, and never translated. */
const USER_DATA = ["Alpha", "file-2.txt", "root-node", "far-away.txt"];
/** The two language names are written in their own language, in both views. */
const ENDONYMS = ["Français", "English"];

const visibleTextAndNames = () => {
  // One chunk per text node, so two neighbouring elements never run into one word — and
  // one chunk of the whole text, so a label that spans nodes is still found whole.
  const chunks: string[] = [document.body.textContent ?? ""];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text.textContent?.trim()) chunks.push(text.textContent);
  }
  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
      const value = element.getAttribute(attribute);
      if (value) chunks.push(value);
    }
  }
  return chunks.join("\n");
};

/** Accents, or a clearly French word, in a view that must be English. */
const FRENCH_RESIDUE =
  /[àâäçéèêëîïôöùûüœ]|\b(Aucun|Aucune|Lecture|Afficher|Masquer|Chargement|Ajouter|Retirer|Ouvrir|Actualiser|Reconstruire|cerveau|cerveaux|dossier|dossiers|fichier|fichiers|Enfants|Changements?|Rechercher|Effacer|Annuler|Confirmer|Rejeter|Approuver|Marquer|sortantes?|entrantes?|hors de|Sélection|Détails|contenu|Contenus|identiques?|Filtres|Règle|Pourquoi|Vu|Non vu|Nouveaux?|Racine|racine)\b/i;

function frenchResidueIn(text: string): string[] {
  let scrubbed = text;
  for (const datum of [...USER_DATA, ...ENDONYMS]) scrubbed = scrubbed.split(datum).join("");
  return scrubbed
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.:;·—])\s+/))
    .filter((piece) => FRENCH_RESIDUE.test(piece))
    .map((piece) => piece.trim().slice(0, 120));
}

async function boot() {
  render(<MapApp />);
  await waitFor(() => expect(screen.getByTestId("composed-total").textContent).toMatch(/1/));
  await waitFor(() => expect(screen.getByTestId("watch-status")).toBeTruthy());
}

/** Brings every large surface on screen, the way a person would. */
async function openEverySurface() {
  // Search, then activate the hit: this selects `file-2.txt` (a file) and loads its panels.
  fireEvent.change(screen.getByTestId("search-input"), { target: { value: "file" } });
  await waitFor(() => expect(screen.getByTestId("search-total")).toBeTruthy());
  fireEvent.click(screen.getByTestId("search-hit"));
  await waitFor(() => expect(screen.getByTestId("node-change-state")).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId("node-state-badge")).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId("content-observations")).toBeTruthy());
  // A filter, the journal, the duplicates explorer and the review queue, all opened.
  fireEvent.click(screen.getByTestId("filter-state-NEW"));
  await waitFor(() => expect(screen.getByTestId("filter-count")).toBeTruthy());
  fireEvent.click(screen.getByTestId("journal-toggle"));
  await waitFor(() => expect(screen.getByTestId("journal-total")).toBeTruthy());
  fireEvent.click(await screen.findByTestId("open-duplicate-explorer"));
  await waitFor(() => expect(screen.getByTestId("duplicate-summary")).toBeTruthy());
  fireEvent.click(screen.getByTestId("duplicate-group"));
  await waitFor(() => expect(screen.getByTestId("duplicate-digest")).toBeTruthy());
  fireEvent.click(screen.getByTestId("open-review-queue"));
  await waitFor(() => expect(screen.getByTestId("review-position")).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId("core-suggestion-explanation")).toBeTruthy());
  await waitFor(() => expect(screen.getByTestId("cross-relation-totals")).toBeTruthy());
  fireEvent.click(screen.getByTestId("cross-check"));
  await act(async () => {});
}

/** One label per large surface, **unique to its language** — an oracle written by hand. */
const SURFACES: { surface: string; fr: string; en: string }[] = [
  { surface: "header", fr: "FileTopo — carte de blocs", en: "FileTopo — block map" },
  { surface: "language control", fr: "Langue de l'interface", en: "Interface language" },
  { surface: "composition bar", fr: "Cerveaux affichés", en: "Displayed brains" },
  { surface: "identity editor", fr: "Personnaliser le cerveau", en: "Customize brain" },
  { surface: "lifecycle", fr: "Actualiser", en: "Refresh" },
  { surface: "report", fr: "Dernier index enregistré", en: "Last recorded index" },
  { surface: "change summary", fr: "1 changement(s) détecté(s)", en: "1 change(s) detected" },
  { surface: "application mode", fr: "Mise à jour incrémentale", en: "Incremental update" },
  { surface: "source observation", fr: "À jour à la dernière vérification", en: "Up to date at last check" },
  { surface: "watcher", fr: "Vérification en cours", en: "Verification in progress" },
  { surface: "toolbar", fr: "Zoom avant", en: "Zoom in" },
  { surface: "search", fr: "1 résultat", en: "1 result" },
  { surface: "filters", fr: "Filtre actif — État : Nouveaux", en: "Active filter — State: New" },
  { surface: "filter roles", fr: "Correspondance", en: "Match" },
  { surface: "progressive navigation", fr: "Navigation progressive", en: "Progressive navigation" },
  { surface: "map aggregate", fr: "+4 éléments — Voir la suite", en: "+4 items — See more" },
  { surface: "map", fr: "Graphique composé — Alpha", en: "Composed graph — Alpha" },
  { surface: "map node name", fr: "profondeur 1", en: "depth 1" },
  { surface: "map territory", fr: "territoire Alpha, icône A", en: "territory Alpha, icon A" },
  { surface: "duplicates", fr: "1 groupe(s) de contenu identique", en: "1 group(s) of identical content" },
  { surface: "duplicate members", fr: "Digest complet", en: "Full digest" },
  { surface: "journal", fr: "Masquer les changements", en: "Hide changes" },
  { surface: "journal event", fr: "Marquer vu", en: "Mark as seen" },
  { surface: "details", fr: "Détails de la sélection", en: "Selection details" },
  { surface: "details toggle", fr: "Masquer les détails", en: "Hide details" },
  { surface: "content observation", fr: "SHA-256 observé", en: "Observed SHA-256" },
  { surface: "element state", fr: "Marquer cet élément vu", en: "Mark this item as seen" },
  { surface: "relations", fr: "Relations internes au cerveau", en: "Relations inside the brain" },
  { surface: "relations rule", fr: "Contenu binaire identique.", en: "Identical binary content." },
  { surface: "review queue", fr: "1 relation(s) à confirmer", en: "1 relation(s) to confirm" },
  { surface: "review why", fr: "Suggestion créée à partir du numéro final consécutif.", en: "Suggestion created from the consecutive trailing number." },
  { surface: "cross relations", fr: "Relations inter-cerveaux", en: "Inter-brain relations" },
  { surface: "cross off-screen", fr: "hors de la vue", en: "not in view" },
  { surface: "endpoint outside the view", fr: "far-away.txt — relation hors de la vue courante.", en: "far-away.txt — relation outside the current view." },
  { surface: "endpoint outside the view, action", fr: "Afficher far-away.txt", en: "Show far-away.txt" },
  { surface: "developer diagnostic", fr: "Diagnostic développeur · sources synthétiques", en: "Developer diagnostic · synthetic sources" },
  { surface: "developer fixture label", fr: "Quasi vide", en: "Nearly empty" },
  { surface: "developer check", fr: "Contrôler M1–M5", en: "Check M1–M5" },
];

/** React's own complaints: two children with one key are updated as one, and a stale line survives a switch. */
const reactComplaints: string[] = [];

beforeEach(() => {
  reactComplaints.length = 0;
  const original = console.error;
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    reactComplaints.push(args.map(String).join(" "));
    void original;
  });
  installBackend();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}) }) as DOMRect,
  );
});

afterEach(() => {
  expect(reactComplaints.filter((line) => /same key|unique "key"|Keys should be unique/i.test(line))).toEqual([]);
  cleanup();
  localStorage.clear();
  document.documentElement.lang = "";
  vi.restoreAllMocks();
});

describe("a French host, no stored choice", () => {
  withHostLanguages(["fr-CA", "en-CA"]);

  it("starts in French, writes nothing at start, and says every large surface in French", async () => {
    await boot();
    await openEverySurface();
    expect(document.documentElement.lang).toBe("fr");
    expect(localStorage.length).toBe(0);
    const everything = visibleTextAndNames();
    for (const { surface, fr, en } of SURFACES) {
      expect(everything, `FR: ${surface}`).toContain(fr);
      expect(everything, `FR view must not carry the English label of ${surface}`).not.toContain(en);
    }
  });
});

describe("a non-French host, no stored choice", () => {
  withHostLanguages(["en-US"]);

  it("starts in English, writes nothing at start, and says every large surface in English", async () => {
    await boot();
    await openEverySurface();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.length).toBe(0);
    const everything = visibleTextAndNames();
    for (const { surface, fr, en } of SURFACES) {
      expect(everything, `EN: ${surface}`).toContain(en);
      expect(everything, `EN view must not carry the French label of ${surface}`).not.toContain(fr);
    }
    // User data is shown as it is, in both languages.
    for (const datum of USER_DATA) expect(everything).toContain(datum);
  });

  it("leaves no French sentence, accent or word in the English view — text and accessible names", async () => {
    await boot();
    await openEverySurface();
    expect(frenchResidueIn(visibleTextAndNames())).toEqual([]);
  });
});

describe("an explicit choice beats the host", () => {
  it("English chosen on a French system stays English", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    const restore = vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["fr-CA"]);
    await boot();
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("group", { name: "Interface language" })).toBeTruthy();
    expect(screen.getByTestId("language-en").getAttribute("aria-pressed")).toBe("true");
    restore.mockRestore();
  });

  it("French chosen on an English system stays French", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
    const restore = vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-US"]);
    await boot();
    expect(document.documentElement.lang).toBe("fr");
    expect(screen.getByRole("group", { name: "Langue de l'interface" })).toBeTruthy();
    restore.mockRestore();
  });

  it("a corrupted stored value is ignored: the host language decides, then English", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "klingon");
    const french = vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["fr-FR"]);
    await boot();
    expect(document.documentElement.lang).toBe("fr");
    french.mockRestore();
    cleanup();
    installBackend();
    const other = vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["de-DE"]);
    await boot();
    expect(document.documentElement.lang).toBe("en");
    other.mockRestore();
    // Reading a corrupted value never rewrites it.
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("klingon");
  });
});

describe("switching the language", () => {
  withHostLanguages(["fr-CA"]);

  it("is immediate, sends no backend command, moves nothing, and writes only filetopo.locale", async () => {
    await boot();
    await openEverySurface();
    // Let the debounced writers of the page settle, so the count below is the page at rest.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    const commandsBefore = calls().length;
    const before = {
      selected: screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent).filter((text) => USER_DATA.includes(text ?? "")),
      composedNumbers: (screen.getByTestId("composed-total").textContent ?? "").match(/\d+/g),
      reportBrain: (screen.getByTestId("report-brain").textContent ?? "").split(" ")[0],
      userDataCounts: USER_DATA.map((datum) => (document.body.textContent ?? "").split(datum).length - 1),
    };

    fireEvent.click(screen.getByTestId("language-en"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });

    // Immediate, no reload: the document follows, and so does every surface.
    expect(document.documentElement.lang).toBe("en");
    const everything = visibleTextAndNames();
    for (const { surface, en } of SURFACES) expect(everything, `after the switch: ${surface}`).toContain(en);
    expect(frenchResidueIn(everything)).toEqual([]);
    // Every off-screen line follows the switch (there are two, whose relations share an id).
    const offscreen = [...document.querySelectorAll("aside > section:not([class]) p")].map((line) => line.textContent);
    expect(offscreen.filter((line) => line?.includes("far-away.txt"))).toHaveLength(2);
    for (const line of offscreen) expect(line).toContain("relation outside the current view.");

    // Not one command was caused by the switch.
    expect(calls().slice(commandsBefore)).toEqual([]);
    // The one key, and nothing else, in the browser's storage.
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    // Nothing else moved: same numbers, same brain, same selection, same names.
    expect((screen.getByTestId("composed-total").textContent ?? "").match(/\d+/g)).toEqual(before.composedNumbers);
    expect((screen.getByTestId("report-brain").textContent ?? "").split(" ")[0]).toBe(before.reportBrain);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent).filter((text) => USER_DATA.includes(text ?? ""))).toEqual(before.selected);
    // The names of the brains and of the nodes are shown exactly as often as before.
    expect(USER_DATA.map((datum) => (document.body.textContent ?? "").split(datum).length - 1)).toEqual(
      before.userDataCounts,
    );

    // And back: still no command, and the key holds the new choice.
    fireEvent.click(screen.getByTestId("language-fr"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(document.documentElement.lang).toBe("fr");
    expect(calls().slice(commandsBefore)).toEqual([]);
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("fr");
    expect(localStorage.length).toBe(1);
  });

  it("re-says a status line already on screen, without saying it again", async () => {
    await boot();
    fireEvent.click(screen.getByTestId("brain-add-real-root"));
    const statusLine = () => document.querySelector(".app__status")?.textContent;
    await waitFor(() => expect(statusLine()).toContain("Aucun dossier choisi"));
    fireEvent.click(screen.getByTestId("language-en"));
    expect(statusLine()).toBe("No folder chosen. Nothing was created.");
  });

  it("uses the language control with the keyboard: two native buttons, one pressed", async () => {
    await boot();
    const group = screen.getByRole("group", { name: "Langue de l'interface" });
    const [fr, en] = within(group).getAllByRole("button");
    expect(fr.tagName).toBe("BUTTON");
    expect(fr.getAttribute("aria-pressed")).toBe("true");
    expect(en.getAttribute("aria-pressed")).toBe("false");
    expect(fr.textContent).toBe("Français");
    expect(en.textContent).toBe("English");
    expect(fr.getAttribute("lang")).toBe("fr");
    expect(en.getAttribute("lang")).toBe("en");
    en.focus();
    expect(document.activeElement).toBe(en);
    fireEvent.click(en);
    expect(screen.getByRole("group", { name: "Interface language" })).toBeTruthy();
  });

  it("a refused write (blocked storage) does not break the session: the choice holds until it closes", async () => {
    const refuse = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    await boot();
    fireEvent.click(screen.getByTestId("language-en"));
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("group", { name: "Interface language" })).toBeTruthy();
    expect(refuse).toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    // The page still works: a selection is still possible.
    fireEvent.click(screen.getByTestId("language-fr"));
    expect(document.documentElement.lang).toBe("fr");
  });
});

describe("a real restart of the page", () => {
  withHostLanguages(["fr-CA"]);

  it("brings the explicit choice back before any interaction, and a switch back is remembered", async () => {
    await boot();
    fireEvent.click(screen.getByTestId("language-en"));
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");

    // The page goes away, and a new one opens on the same profile (same storage).
    cleanup();
    document.documentElement.lang = "";
    installBackend();
    await boot();
    // English before a single click, although the host is French.
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("group", { name: "Interface language" })).toBeTruthy();
    expect(screen.getByTestId("language-en").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("language-fr"));
    expect(document.documentElement.lang).toBe("fr");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("fr");
    cleanup();
    installBackend();
    await boot();
    expect(document.documentElement.lang).toBe("fr");
  });
});
