import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import source from "./resumeState.ts?raw";
import {
  ResumeWriter,
  defaultResumeState,
  isStorableView,
  parseResumeRestore,
  parseResumeState,
  sameResumeState,
  type ResumeState,
} from "./resumeState";

const lastOf = <T,>(items: readonly T[]): T | undefined => items[items.length - 1];

/**
 * `TASK-0044` — the resume state, on the interface's side: what is accepted from the
 * backend, and the bounded, latest-wins writer that talks to the catalogue.
 */

const good = (over: Partial<ResumeState> = {}): ResumeState => ({
  ...defaultResumeState(),
  focusNodeId: 4,
  selectedNodeId: 9,
  view: { scale: 1.25, tx: -30, ty: 12 },
  filter: { state: "NEW", kinds: ["FILE"], availability: "ALL" },
  detailsPanelVisible: false,
  ...over,
});

describe("TASK-0044 — l'analyse défensive de l'état de reprise", () => {
  it("accepte exactement la forme du cœur, et la rend telle quelle", () => {
    expect(parseResumeState(good())).toEqual(good());
    expect(parseResumeState(defaultResumeState())).toEqual(defaultResumeState());
    expect(parseResumeState(defaultResumeState(false))?.detailsPanelVisible).toBe(false);
  });

  it("normalise le filtre comme le cœur : doublons retirés, ordre canonique", () => {
    const parsed = parseResumeState({
      ...good(),
      filter: { state: "ALL", kinds: ["SKIPPED", "FILE", "FILE", "DIRECTORY"], availability: "LOCAL" },
    });
    expect(parsed?.filter.kinds).toEqual(["DIRECTORY", "FILE", "SKIPPED"]);
  });

  it("refuse tout ce qui n'est pas exactement fermé : clé en plus, en moins, ou valeur hors vocabulaire", () => {
    const base = good();
    const cases: [string, unknown][] = [
      ["null", null],
      ["un tableau", []],
      ["une chaîne", "x"],
      ["clé en plus (un chemin)", { ...base, path: "docs/a.txt" }],
      ["clé manquante", { ...base, view: undefined }],
      ["état de filtre inconnu", { ...base, filter: { state: "RECENT", kinds: [], availability: "ALL" } }],
      ["type inconnu", { ...base, filter: { state: "ALL", kinds: ["ROOT"], availability: "ALL" } }],
      ["disponibilité inconnue", { ...base, filter: { state: "ALL", kinds: [], availability: "CLOUD" } }],
      ["filtre avec une clé en plus", { ...base, filter: { ...base.filter, query: "x" } }],
      ["panneau non booléen", { ...base, detailsPanelVisible: "true" }],
      ["identifiant nul", { ...base, focusNodeId: 0 }],
      ["identifiant négatif", { ...base, selectedNodeId: -2 }],
      ["identifiant fractionnaire", { ...base, selectedNodeId: 1.5 }],
      ["identifiant hors plage sûre", { ...base, focusNodeId: Number.MAX_SAFE_INTEGER + 2 }],
      ["identifiant en chaîne", { ...base, focusNodeId: "12" }],
      ["caméra NaN", { ...base, view: { scale: NaN, tx: 0, ty: 0 } }],
      ["caméra infinie", { ...base, view: { scale: 1, tx: Infinity, ty: 0 } }],
      ["échelle nulle", { ...base, view: { scale: 0, tx: 0, ty: 0 } }],
      ["échelle négative", { ...base, view: { scale: -1, tx: 0, ty: 0 } }],
      ["échelle énorme", { ...base, view: { scale: 1e30, tx: 0, ty: 0 } }],
      ["translation énorme", { ...base, view: { scale: 1, tx: 0, ty: -1e30 } }],
      ["caméra en chaîne", { ...base, view: "fit" }],
      ["caméra avec une clé en plus", { ...base, view: { scale: 1, tx: 0, ty: 0, z: 1 } }],
    ];
    for (const [label, payload] of cases) {
      expect(parseResumeState(payload), label).toBeNull();
    }
  });

  it("isStorableView applique les bornes du cœur", () => {
    expect(isStorableView({ scale: 1, tx: 0, ty: 0 })).toBe(true);
    expect(isStorableView({ scale: 1e6, tx: 1e9, ty: -1e9 })).toBe(true);
    for (const view of [
      { scale: NaN, tx: 0, ty: 0 },
      { scale: Infinity, tx: 0, ty: 0 },
      { scale: 0, tx: 0, ty: 0 },
      { scale: -1, tx: 0, ty: 0 },
      { scale: 1e6 + 1, tx: 0, ty: 0 },
      { scale: 1, tx: 1e9 + 1, ty: 0 },
      { scale: 1, tx: 0, ty: NaN },
    ]) {
      expect(isStorableView(view)).toBe(false);
    }
  });

  it("la restauration n'est acceptée que pour le cerveau demandé et avec des corrections fermées", () => {
    const projection = { brainId: "a", rootId: 1, nodes: [] };
    const ok = { resume: good(), projection, filterCursor: null, corrections: [] };
    expect(parseResumeRestore(ok, "a")?.resume).toEqual(good());
    // Un autre cerveau, jamais servi sous le nom de celui-ci.
    expect(parseResumeRestore(ok, "b")).toBeNull();
    expect(parseResumeRestore({ ...ok, filterCursor: "ftf1.i.3.NEW::ALL.4" }, "a")?.filterCursor).toBe(
      "ftf1.i.3.NEW::ALL.4",
    );
    expect(parseResumeRestore({ ...ok, filterCursor: 7 }, "a")).toBeNull();
    expect(parseResumeRestore({ ...ok, corrections: ["SELECTION_MISSING", "FOCUS_MISSING"] }, "a")).not.toBeNull();
    expect(parseResumeRestore({ ...ok, corrections: ["ANYTHING"] }, "a")).toBeNull();
    expect(parseResumeRestore({ ...ok, resume: { ...good(), path: "x" } }, "a")).toBeNull();
    expect(parseResumeRestore({ ...ok, projection: { brainId: "a", nodes: [] } }, "a")).toBeNull();
    expect(parseResumeRestore({ ...ok, projection: null }, "a")).toBeNull();
    expect(parseResumeRestore(null, "a")).toBeNull();
  });

  it("sameResumeState compare toutes les valeurs, la caméra comprise", () => {
    expect(sameResumeState(good(), good())).toBe(true);
    expect(sameResumeState(good(), good({ selectedNodeId: 10 }))).toBe(false);
    expect(sameResumeState(good(), good({ focusNodeId: null }))).toBe(false);
    expect(sameResumeState(good(), good({ detailsPanelVisible: true }))).toBe(false);
    expect(sameResumeState(good(), good({ view: null }))).toBe(false);
    expect(sameResumeState(good({ view: null }), good({ view: null }))).toBe(true);
    expect(sameResumeState(good(), good({ view: { scale: 1.25, tx: -30, ty: 13 } }))).toBe(false);
    expect(
      sameResumeState(good(), good({ filter: { state: "NEW", kinds: ["FILE", "SKIPPED"], availability: "ALL" } })),
    ).toBe(false);
  });

  it("le module ne connaît ni stockage du navigateur, ni chemin, ni curseur gardé", () => {
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(source).not.toMatch(/absolutePath|relativePath|stableKey|fileId|volumeSerial/i);
    expect(Object.keys(defaultResumeState()).sort()).toEqual([
      "detailsPanelVisible",
      "filter",
      "focusNodeId",
      "selectedNodeId",
      "view",
    ]);
  });
});

describe("TASK-0044 — l'écrivain borné, dernier-gagne", () => {
  let written: { brainId: string; state: ResumeState }[];
  let release: (() => void) | null;
  let gate: boolean;
  let failing: boolean;

  const writer = (over: { debounceMs?: number; maxWaitMs?: number } = {}) =>
    new ResumeWriter({
      debounceMs: 250,
      maxWaitMs: 1500,
      ...over,
      write: (brainId, state) => {
        if (failing) return Promise.reject(new Error("catalogue indisponible"));
        written.push({ brainId, state: JSON.parse(JSON.stringify(state)) });
        if (!gate) return Promise.resolve();
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
      read: async () => good(),
      onError: () => {},
    });

  beforeEach(() => {
    vi.useFakeTimers();
    written = [];
    release = null;
    gate = false;
    failing = false;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("un glissement de 300 images n'écrit pas 300 fois : une écriture, la dernière valeur", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    for (let frame = 0; frame < 300; frame += 1) {
      w.patch("a", { view: { scale: 1, tx: -frame, ty: frame } });
      await vi.advanceTimersByTimeAsync(16);
    }
    // Pendant un geste continu, au plus une écriture par `maxWaitMs`.
    const during = written.length;
    expect(during).toBeLessThanOrEqual(Math.ceil((300 * 16) / 1500) + 1);
    expect(during).toBeLessThan(10);
    // Le geste est fini : le silence suffit pour que la dernière valeur parte.
    await vi.advanceTimersByTimeAsync(300);
    expect(lastOf(written)?.state.view).toEqual({ scale: 1, tx: -299, ty: 299 });
    expect(written.length).toBeLessThan(10);
    expect(w.hasPending("a")).toBe(false);
  });

  it("une interaction terminée finit persistée après le seul silence, sans flush", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    w.patch("a", { selectedNodeId: 7 });
    expect(written).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(249);
    expect(written).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2);
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({ brainId: "a", state: { selectedNodeId: 7 } });
  });

  it("un patch qui ne change rien n'écrit rien", async () => {
    const w = writer();
    w.seed("a", good());
    w.patch("a", { selectedNodeId: 9 });
    w.patch("a", { view: { scale: 1.25, tx: -30, ty: 12 } });
    w.patch("a", { filter: { state: "NEW", kinds: ["FILE"], availability: "ALL" } });
    await vi.advanceTimersByTimeAsync(5000);
    expect(written).toHaveLength(0);
    expect(w.hasPending()).toBe(false);
  });

  it("flush écrit tout de suite la dernière valeur et attend : c'est ce qui précède une bascule de cerveau", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    w.patch("a", { selectedNodeId: 3 });
    w.patch("a", { selectedNodeId: 4, detailsPanelVisible: false });
    await w.flush("a");
    expect(written).toHaveLength(1);
    expect(written[0].state).toMatchObject({ selectedNodeId: 4, detailsPanelVisible: false });
    // Plus rien n'est en attente : le minuteur de coalescence est annulé.
    await vi.advanceTimersByTimeAsync(5000);
    expect(written).toHaveLength(1);
  });

  it("un geste immédiat (panneau, filtre) part sans attendre le silence", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    w.patch("a", { detailsPanelVisible: false }, { immediate: true });
    await vi.advanceTimersByTimeAsync(1);
    expect(written).toHaveLength(1);
    expect(written[0].state.detailsPanelVisible).toBe(false);
  });

  it("jamais deux écritures en vol pour un cerveau : la plus récente part quand la première a fini", async () => {
    gate = true;
    const w = writer();
    w.seed("a", defaultResumeState());
    w.patch("a", { selectedNodeId: 1 }, { immediate: true });
    await vi.advanceTimersByTimeAsync(1);
    expect(written).toHaveLength(1);
    // Deux changements pendant l'écriture : aucune écriture parallèle.
    w.patch("a", { selectedNodeId: 2 }, { immediate: true });
    w.patch("a", { selectedNodeId: 3 }, { immediate: true });
    await vi.advanceTimersByTimeAsync(50);
    expect(written).toHaveLength(1);
    const flushing = w.flush("a");
    release?.();
    await vi.advanceTimersByTimeAsync(1);
    release?.();
    await flushing;
    // La valeur intermédiaire (2) n'a jamais été écrite : dernier-gagne.
    expect(written.map((entry) => entry.state.selectedNodeId)).toEqual([1, 3]);
  });

  it("chaque cerveau a sa propre mémoire : un patch de a n'écrit rien pour b", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    w.seed("b", good());
    w.patch("a", { selectedNodeId: 5 });
    await w.flushAll();
    expect(written.map((entry) => entry.brainId)).toEqual(["a"]);
    expect(w.current("b")).toEqual(good());
    expect(w.current("a")?.selectedNodeId).toBe(5);
    // La copie rendue ne permet pas de modifier la mémoire.
    const copy = w.current("b")!;
    copy.selectedNodeId = 999;
    copy.view!.scale = 999;
    expect(w.current("b")).toEqual(good());
  });

  it("un patch pour un cerveau inconnu lit d'abord, puis s'applique : jamais écrit sur des valeurs devinées", async () => {
    const reads: string[] = [];
    const w = new ResumeWriter({
      write: async (brainId, state) => {
        written.push({ brainId, state: JSON.parse(JSON.stringify(state)) });
      },
      read: async (brainId) => {
        reads.push(brainId);
        return good({ selectedNodeId: 77 });
      },
    });
    expect(w.isKnown("c")).toBe(false);
    w.patch("c", { detailsPanelVisible: true }, { immediate: true });
    w.patch("c", { focusNodeId: 6 }, { immediate: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(reads).toEqual(["c"]); // une seule lecture
    await w.flushAll();
    // Écrit sur ce que le cœur avait (sélection 77), plus les deux patchs.
    expect(lastOf(written)?.state).toMatchObject({
      selectedNodeId: 77,
      focusNodeId: 6,
      detailsPanelVisible: true,
    });
  });

  it("une lecture qui échoue retombe sur les valeurs par défaut sans faire échouer personne", async () => {
    const w = new ResumeWriter({
      write: async () => {},
      read: async () => {
        throw new Error("illisible");
      },
    });
    await expect(w.load("z")).resolves.toEqual(defaultResumeState());
    expect(w.isKnown("z")).toBe(true);
  });

  it("seed ne remplace jamais un changement local non écrit", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    w.patch("a", { selectedNodeId: 8 });
    w.seed("a", good({ selectedNodeId: 1 }));
    expect(w.current("a")?.selectedNodeId).toBe(8);
    await w.flush("a");
    w.seed("a", good({ selectedNodeId: 1 }));
    expect(w.current("a")?.selectedNodeId).toBe(1);
  });

  it("un échec est signalé, l'état reste sale et repart plus tard — sans boucle serrée", async () => {
    const errors: string[] = [];
    failing = true;
    const w = new ResumeWriter({
      debounceMs: 250,
      maxWaitMs: 1500,
      write: () => Promise.reject(new Error("catalogue verrouillé")),
      read: async () => good(),
      onError: (brainId) => errors.push(brainId),
    });
    w.seed("a", defaultResumeState());
    w.patch("a", { selectedNodeId: 2 });
    await vi.advanceTimersByTimeAsync(300);
    expect(errors).toEqual(["a"]);
    expect(w.hasPending("a")).toBe(true);
    // Pas de nouvelle tentative dans la seconde : la reprise est lente.
    await vi.advanceTimersByTimeAsync(1000);
    expect(errors).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(600);
    expect(errors).toHaveLength(2);
  });

  it("l'état écrit est exactement l'état complet : cinq clés, aucune donnée de source", async () => {
    const w = writer();
    w.seed("a", defaultResumeState());
    w.patch("a", { selectedNodeId: 2, view: { scale: 2, tx: 1, ty: 1 } });
    await w.flush("a");
    expect(Object.keys(written[0].state).sort()).toEqual([
      "detailsPanelVisible",
      "filter",
      "focusNodeId",
      "selectedNodeId",
      "view",
    ]);
    expect(JSON.stringify(written[0].state)).not.toMatch(/path|name|stable|cursor|ftf1/i);
  });
});
