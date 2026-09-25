import { withHostLanguages } from "../test/hostLanguage";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MapApp from "./MapApp";
import { validateIdentity } from "./BrainIdentityEditor";
import type { BrainRecord, MapProjection } from "./types";

/**
 * `TASK-0045` / `DEC-0043` — the identity editor, through the real `MapApp`, against a
 * scripted backend that behaves like `map_brain_update` (`validate_metadata` included) and
 * that **records every command**, so the tests can say what was NOT called as well as what was.
 */
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));

const A = "brain-alpha";
const B = "brain-beta";
const C = "brain-gamma";
/** Alpha and Gamma read the same source and differ in identity — the frozen shape of `TASK-0018`. */
const SHARED = "quasi-empty";

const seed = (): BrainRecord[] => [
  { brainId: A, displayName: "Alpha", color: "#1F6F5C", icon: "▲", sourceKind: "SYNTHETIC_FIXTURE", sourceRef: SHARED, sourceLabel: SHARED, position: 1 },
  { brainId: B, displayName: "Beta", color: "#4A4FA8", icon: "■", sourceKind: "SYNTHETIC_FIXTURE", sourceRef: "deep", sourceLabel: "deep", position: 2 },
  { brainId: C, displayName: "Gamma", color: "#9A5A18", icon: "◆", sourceKind: "SYNTHETIC_FIXTURE", sourceRef: SHARED, sourceLabel: SHARED, position: 3 },
] as BrainRecord[];

const backend = {
  brains: seed(),
  active: A,
  /** `"answer-differently"` makes the backend return a record unlike what was asked. */
  updateMode: "ok" as "ok" | "reject" | "answer-differently",
};

/** The same bounds as `validate_metadata`, in the same words. */
function validateLikeRust(name: string, color: string, icon: string) {
  const trimmed = name.trim();
  if (trimmed.length === 0 || Array.from(trimmed).length > 80) throw "nom refusé: 1 à 80 caractères attendus";
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw `couleur refusée: \`${color}\`, format \`#RRGGBB\` attendu`;
  const length = Array.from(icon).length;
  if (length === 0 || length > 2) throw `icône refusée: 1 ou 2 caractères attendus, ${length} reçus`;
}

const node = (id: number) => ({
  id,
  parentId: id === 1 ? null : 1,
  name: id === 1 ? "racine" : `n${id}`,
  relativePath: id === 1 ? "" : `n${id}`,
  kind: id === 1 ? "root" : "file",
  depth: id === 1 ? 0 : 1,
  sizeBytes: id,
  modifiedUnixMs: 1,
  childCount: id === 1 ? 2 : 0,
  accessDiagnostic: null,
  rect: { x: id === 1 ? 0 : 300, y: id === 1 ? 0 : (id - 2) * 80, w: 240, h: 64 },
});
const projectionOf = (brainId: string): MapProjection =>
  ({
    brainId, fixtureId: "synthetique", label: "synthetique", rootId: 1, nodeCount: 3, layoutWidth: 600,
    layoutHeight: 300, schemaVersion: 6, layoutAlgorithm: "layered-tree-cards-v1",
    nodes: [1, 2, 3].map(node), diagnostics: [], indexRevision: 3, focusId: 1, viewBudget: 512,
    materializedCount: 3, nonMaterializedCount: 0, hiddenReason: null, aggregates: [],
    hierarchyEdges: [{ parentId: 1, childId: 2 }, { parentId: 1, childId: 3 }], filtered: null,
  }) as unknown as MapProjection;

const calls = () =>
  invokeMock.mock.calls.map(([command, args]) => ({ command: String(command), args: (args ?? {}) as Record<string, unknown> }));
const called = (command: string) => calls().filter((call) => call.command === command);

// `TASK-0046` — these suites assert the French wording: they run on a French host.
withHostLanguages(["fr-CA"]);

beforeEach(() => {
  backend.brains = seed();
  backend.active = A;
  backend.updateMode = "ok";
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}) }) as DOMRect,
  );
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
    const brainId = (args?.brainId as string | undefined) ?? backend.active;
    switch (command) {
      case "map_fixtures":
        return [];
      case "map_host_info":
        return {
          sandboxRoot: "sandbox", appVersion: "0.0.0", sqliteVersion: "0", webviewVersion: "0", tauriVersion: "0",
          platform: "test", nodeCeiling: 5000, depthCeiling: 12, cardWidth: 240, cardHeight: 64,
          layoutAlgorithm: "layered-tree-cards-v1", autoMeasure: false, autoVerify: false, autoRelations: false,
          autoBrainsPass: 0, autoComposedPass: 0, autoCrossPass: 0, autoTopographicPass: 0,
        };
      case "map_brains":
        return { brains: backend.brains, activeBrainId: backend.active, schemaVersion: 2, catalogPath: "catalog.sqlite", seeded: 0 };
      case "map_ui_preferences":
        return { detailsPanelVisible: true };
      case "map_brain_activate":
        backend.active = brainId;
        return backend.brains.find((brain) => brain.brainId === brainId);
      case "map_brain_update": {
        if (backend.updateMode === "reject") throw "nom refusé: le catalogue est verrouillé";
        const existing = backend.brains.find((brain) => brain.brainId === brainId);
        if (!existing) throw `cerveau inconnu: ${brainId}`;
        validateLikeRust(String(args?.displayName), String(args?.color), String(args?.icon));
        const suffix = backend.updateMode === "answer-differently" ? " (catalogue)" : "";
        const updated = {
          ...existing,
          displayName: String(args?.displayName).trim() + suffix,
          color: String(args?.color),
          icon: String(args?.icon),
        };
        backend.brains = backend.brains.map((brain) => (brain.brainId === brainId ? updated : brain));
        return updated;
      }
      case "map_open":
        return {
          brainId, state: "OPENED_EXISTING", indexId: "index-1", revision: 3, nodeCount: 3, schemaVersion: 6,
          sourceRead: false, indexReused: true, freshness: "UNKNOWN",
          sourceObservation: { state: "SYNCED", reason: null, observedUnixMs: 1, lastSuccessfulRevision: 3, lastSuccessfulUnixMs: 1, persisted: true },
        };
      case "map_view":
        return projectionOf(brainId);
      case "map_brain_resume_restore":
        return null;
      case "map_brain_resume_state":
        return null;
      case "map_watch_status":
        return { brainId, state: "WATCHING", mode: "NATIVE", reason: null, indexRevision: 3, pending: false, sequence: 1 };
      case "map_change_journal":
        return { brainId, indexId: "index-1", indexRevision: 3, natures: [], total: 0, unseenTotal: 0, items: [], nextCursor: null, limit: 25 };
      default:
        return null;
    }
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const settle = (ms = 60) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

async function boot() {
  render(<MapApp />);
  await waitFor(() => expect(screen.getByTestId("composed-canvas")).toBeTruthy());
  await waitFor(() => expect(called("map_view").length).toBeGreaterThan(0));
  // Booting measures the viewport and the resume writer stores the first camera after its own
  // debounce (250 ms, cap 1.5 s). Wait for it: what happens after this point is what the test
  // is about, and it must not be blamed on a save that came later.
  await waitFor(() => expect(called("map_brain_resume_update").length).toBeGreaterThan(0), { timeout: 4000 });
  await settle(300);
}

/** Brings Gamma in beside Alpha, the way a person does. */
async function addGamma() {
  fireEvent.click(screen.getByTestId("composition-add-trigger"));
  fireEvent.click(await screen.findByTestId(`composition-add-item-${C}`));
  await waitFor(() => expect(screen.getByTestId(`composition-chip-${C}`)).toBeTruthy());
  await settle();
}

const openEditor = async () => {
  fireEvent.click(screen.getByTestId("brain-identity-open"));
  return (await screen.findByTestId("brain-identity-form")) as HTMLFormElement;
};
const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const chip = (brainId: string) => screen.getByTestId(`composition-chip-${brainId}`);
const swatchOf = (brainId: string) =>
  (chip(brainId).querySelector(".composition__swatch") as HTMLElement).style.backgroundColor;
const iconOf = (brainId: string) => chip(brainId).querySelector(".composition__icon")!.textContent;
const nameOf = (brainId: string) => chip(brainId).querySelector(".composition__name")!.textContent;
const identityOf = (brainId: string) => ({
  name: nameOf(brainId),
  icon: iconOf(brainId),
  swatch: swatchOf(brainId),
});
const territoryText = () => screen.getByTestId("composed-canvas").textContent ?? "";
/**
 * What a saved identity may cause besides the one write: a re-read of the inter-brain store,
 * because that store's answers carry each brain's name and icon and must not go stale
 * (`map_cross_relations_open` re-reads whenever a loaded brain is replaced, and the selected
 * element's neighbours re-read after it). Both are reads; neither touches a source or a journal.
 */
const IDENTITY_PROPAGATION_READS = ["map_cross_relations_open", "map_cross_relations_for_node"];
/** Every command a metadata change must NOT cause. */
const NOT_FOR_A_METADATA_CHANGE = [
  "map_open",
  "map_view",
  "map_relations_open",
  "map_brain_resume_update",
  "map_brain_resume_restore",
  "map_brain_activate",
  "map_source_observation",
  "map_change_journal",
  "map_change_journal_mark_seen",
  "map_prepare_synthetic_source",
];

describe("validateIdentity mirrors validate_metadata", () => {
  const ok = { displayName: "Nom", color: "#a1b2c3", icon: "★" };
  it("accepts the bounds", () => {
    expect(validateIdentity(ok)).toEqual({});
    expect(validateIdentity({ ...ok, displayName: "x".repeat(80) })).toEqual({});
    expect(validateIdentity({ ...ok, displayName: `  ${"x".repeat(80)}  ` })).toEqual({});
    expect(validateIdentity({ ...ok, icon: "ab" })).toEqual({});
    // Two Unicode scalar values (four UTF-16 units): Rust counts `chars()`, so does the form.
    expect(validateIdentity({ ...ok, icon: "😀😀" })).toEqual({});
    expect(validateIdentity({ ...ok, color: "#ABCDEF" })).toEqual({});
  });
  it("refuses exactly what the backend refuses", () => {
    expect(validateIdentity({ ...ok, displayName: "" })).toEqual({ displayName: true });
    expect(validateIdentity({ ...ok, displayName: "   " })).toEqual({ displayName: true });
    expect(validateIdentity({ ...ok, displayName: "x".repeat(81) })).toEqual({ displayName: true });
    expect(validateIdentity({ ...ok, icon: "" })).toEqual({ icon: true });
    expect(validateIdentity({ ...ok, icon: "abc" })).toEqual({ icon: true });
    expect(validateIdentity({ ...ok, icon: "😀😀😀" })).toEqual({ icon: true });
    for (const color of ["", "red", "#12345", "#1234567", "123456", "#12345g", "#ffffffff"]) {
      expect(validateIdentity({ ...ok, color })).toEqual({ color: true });
    }
  });
});

describe("the form", () => {
  it("opens on the focused brain, filled from the catalogue, with exactly three fields and two buttons", async () => {
    await boot();
    const form = await openEditor();

    expect(form.getAttribute("data-brain-id")).toBe(A);
    expect(within(form).getByTestId("brain-identity-title").textContent).toContain("Alpha");
    expect((screen.getByTestId("brain-identity-name") as HTMLInputElement).value).toBe("Alpha");
    // `<input type="color">` only speaks lower case; the catalogue's value is `#1F6F5C`.
    expect((screen.getByTestId("brain-identity-color") as HTMLInputElement).value).toBe("#1f6f5c");
    expect((screen.getByTestId("brain-identity-icon") as HTMLInputElement).value).toBe("▲");

    // Labelled controls, and nothing else: no id, no source, no path.
    expect(within(form).getByLabelText("Nom")).toBeTruthy();
    expect(within(form).getByLabelText("Couleur")).toBeTruthy();
    expect(within(form).getByLabelText("Icône")).toBeTruthy();
    expect(form.querySelectorAll("input")).toHaveLength(3);
    expect(form.querySelectorAll("select, textarea")).toHaveLength(0);
    expect(within(form).getAllByRole("button").map((button) => button.textContent)).toEqual(["Enregistrer", "Annuler"]);
    expect(form.innerHTML).not.toMatch(/quasi-empty|sourceRef|sourceLabel|brain-alpha"?\s*value/i);
    // The form itself is the semantic container the keyboard walks: Enter in a field submits it.
    expect(form.tagName).toBe("FORM");
    expect(within(form).getByTestId("brain-identity-save").getAttribute("type")).toBe("submit");
    // Opening reads nothing more from the backend.
    expect(calls().filter((call) => call.command === "map_brain_update")).toHaveLength(0);
  });

  it("moves the focus into the form, and gives it back to the gesture that opened it", async () => {
    await boot();
    const opener = screen.getByTestId("brain-identity-open");
    await openEditor();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("brain-identity-name")));
    fireEvent.click(screen.getByTestId("brain-identity-cancel"));
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("Annuler changes nothing, and Échap cancels too; reopening shows the catalogue, not the draft", async () => {
    await boot();
    const before = identityOf(A);
    await openEditor();
    type("brain-identity-name", "Brouillon");
    type("brain-identity-icon", "X");
    fireEvent.click(screen.getByTestId("brain-identity-cancel"));
    expect(screen.queryByTestId("brain-identity-form")).toBeNull();
    expect(identityOf(A)).toEqual(before);

    const form = await openEditor();
    expect((screen.getByTestId("brain-identity-name") as HTMLInputElement).value).toBe("Alpha");
    type("brain-identity-name", "Autre brouillon");
    fireEvent.keyDown(form, { key: "Escape" });
    expect(screen.queryByTestId("brain-identity-form")).toBeNull();

    expect(called("map_brain_update")).toHaveLength(0);
    expect(backend.brains).toEqual(seed());
    expect(identityOf(A)).toEqual(before);
  });

  it("saving with nothing changed calls nothing", async () => {
    await boot();
    await openEditor();
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await settle();
    expect(screen.queryByTestId("brain-identity-form")).toBeNull();
    expect(called("map_brain_update")).toHaveLength(0);
  });
});

describe("saving", () => {
  it("sends exactly the command that already exists, waits, then publishes name, icon and colour everywhere", async () => {
    await boot();
    expect(territoryText()).toContain("▲ Alpha");
    const before = calls().length;

    await openEditor();
    type("brain-identity-name", "  Alpha renommé  ");
    type("brain-identity-color", "#a1b2c3");
    type("brain-identity-icon", "★");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());

    // One write, the exact shape of the existing command; nothing else was written.
    expect(called("map_brain_update")).toEqual([
      { command: "map_brain_update", args: { brainId: A, displayName: "  Alpha renommé  ", color: "#a1b2c3", icon: "★" } },
    ]);
    expect(
      calls().slice(before).filter((call) => !IDENTITY_PROPAGATION_READS.includes(call.command)).map((call) => call.command),
    ).toEqual(["map_brain_update"]);
    // The chip and the map's territory label carry the new identity; the swatch its colour.
    expect(identityOf(A)).toEqual({ name: "Alpha renommé", icon: "★", swatch: "rgb(161, 178, 195)" });
    expect(territoryText()).toContain("★ Alpha renommé");
    expect(territoryText()).not.toContain("▲ Alpha");
    // The name and the icon are text, present without the colour.
    expect(chip(A).textContent).toContain("★");
    expect(chip(A).textContent).toContain("Alpha renommé");
    expect(chip(A).textContent).toContain("actif");
    // The focus is back on the gesture that opened the form.
    expect(document.activeElement).toBe(screen.getByTestId("brain-identity-open"));
  });

  it("publishes the record the backend RETURNED, never the form's values", async () => {
    backend.updateMode = "answer-differently";
    await boot();
    await openEditor();
    type("brain-identity-name", "Nouveau");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());
    expect(nameOf(A)).toBe("Nouveau (catalogue)");
    expect(territoryText()).toContain("Nouveau (catalogue)");
  });

  it("does not open, read, refresh, rebuild, activate, journal or write any resume state", async () => {
    await boot();
    const before = calls().length;
    await openEditor();
    type("brain-identity-name", "Sans effet de bord");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());
    await settle(400);

    const after = calls().slice(before).map((call) => call.command);
    expect(after.filter((command) => !IDENTITY_PROPAGATION_READS.includes(command))).toEqual(["map_brain_update"]);
    for (const forbidden of NOT_FOR_A_METADATA_CHANGE) expect(after).not.toContain(forbidden);
    // The inter-brain store is read again, so its own copy of the name and icon is not stale.
    expect(after).toContain("map_cross_relations_open");
  });

  it("keeps the renamed identity when the brain leaves the view and comes back", async () => {
    await boot();
    await addGamma();
    await openEditor();
    type("brain-identity-name", "Alpha durable");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());

    fireEvent.click(screen.getByTestId(`composition-remove-${A}`));
    await waitFor(() => expect(screen.queryByTestId(`composition-chip-${A}`)).toBeNull());
    await settle();
    fireEvent.click(screen.getByTestId("composition-add-trigger"));
    fireEvent.click(await screen.findByTestId(`composition-add-item-${A}`));
    await waitFor(() => expect(screen.getByTestId(`composition-chip-${A}`)).toBeTruthy());
    await settle();
    expect(nameOf(A)).toBe("Alpha durable");
    expect(territoryText()).toContain("Alpha durable");
  });
});

describe("a refusal", () => {
  it("is shown, keeps the form open, and changes neither the catalogue nor any surface", async () => {
    backend.updateMode = "reject";
    await boot();
    const before = identityOf(A);
    const territory = territoryText();
    await openEditor();
    type("brain-identity-name", "Refusé");
    type("brain-identity-icon", "Z");
    fireEvent.click(screen.getByTestId("brain-identity-save"));

    const refusal = await screen.findByTestId("brain-identity-refusal");
    expect(refusal.textContent).toContain("le catalogue est verrouillé");
    // The form is still open, with what the person typed; nothing was published.
    expect(screen.getByTestId("brain-identity-form")).toBeTruthy();
    expect((screen.getByTestId("brain-identity-name") as HTMLInputElement).value).toBe("Refusé");
    expect(identityOf(A)).toEqual(before);
    expect(territoryText()).toBe(territory);
    expect((screen.getByTestId("brain-identity-save") as HTMLButtonElement).disabled).toBe(false);

    // The person can fix it and save.
    backend.updateMode = "ok";
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());
    expect(identityOf(A).name).toBe("Refusé");
    expect(identityOf(A).icon).toBe("Z");
  });

  it("an entry the form can see is invalid is explained without a round trip", async () => {
    await boot();
    await openEditor();
    type("brain-identity-name", "   ");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    expect((await screen.findByTestId("brain-identity-problem")).textContent).toContain("1 à 80");
    expect(screen.getByTestId("brain-identity-name").getAttribute("aria-invalid")).toBe("true");

    type("brain-identity-name", "x".repeat(81));
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    type("brain-identity-name", "Alpha");
    type("brain-identity-icon", "abc");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    expect(screen.getByTestId("brain-identity-problem").textContent).toContain("1 ou 2");
    expect(screen.getByTestId("brain-identity-icon").getAttribute("aria-invalid")).toBe("true");
    expect(called("map_brain_update")).toHaveLength(0);
    expect(identityOf(A).name).toBe("Alpha");
  });

  it("the edges the backend accepts are accepted: 80 characters, two-scalar icon", async () => {
    await boot();
    await openEditor();
    type("brain-identity-name", "n".repeat(80));
    type("brain-identity-icon", "😀😀");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());
    expect(called("map_brain_update")).toHaveLength(1);
    expect(identityOf(A).name).toBe("n".repeat(80));
    expect(identityOf(A).icon).toBe("😀😀");
  });
});

describe("isolation between brains that read the same source", () => {
  it("editing Alpha leaves Gamma — same source — bit for bit as it was", async () => {
    await boot();
    await addGamma();
    const gammaBefore = identityOf(C);
    const gammaRecord = JSON.stringify(backend.brains.find((brain) => brain.brainId === C));
    const alphaSource = backend.brains.find((brain) => brain.brainId === A)!.sourceRef;
    const before = calls().length;

    await openEditor();
    expect(screen.getByTestId("brain-identity-form").getAttribute("data-brain-id")).toBe(A);
    type("brain-identity-name", "Alpha seul");
    type("brain-identity-color", "#010203");
    type("brain-identity-icon", "#");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());
    await settle(400);

    expect(identityOf(C)).toEqual(gammaBefore);
    expect(JSON.stringify(backend.brains.find((brain) => brain.brainId === C))).toBe(gammaRecord);
    expect(identityOf(A).name).toBe("Alpha seul");
    // The source and the identity of Alpha are untouched; only three fields moved.
    const alpha = backend.brains.find((brain) => brain.brainId === A)!;
    expect(alpha.sourceRef).toBe(alphaSource);
    expect(alpha.brainId).toBe(A);
    expect(alpha.sourceKind).toBe("SYNTHETIC_FIXTURE");
    // Only Alpha's id was ever named, in the one call, and no other command ran.
    const emitted = calls().slice(before);
    const writes = emitted.filter((call) => !IDENTITY_PROPAGATION_READS.includes(call.command));
    expect(writes.map((call) => call.command)).toEqual(["map_brain_update"]);
    expect(writes.every((call) => call.args.brainId === A)).toBe(true);
    // Beta, which is not even displayed, is exactly its seed.
    expect(backend.brains.find((brain) => brain.brainId === B)).toEqual(seed()[1]);
  });

  it("the form stays bound to the brain it was opened on, even when another one takes the focus", async () => {
    await boot();
    await addGamma();
    await openEditor();
    fireEvent.click(chip(C));
    await settle();
    const form = screen.getByTestId("brain-identity-form");
    expect(form.getAttribute("data-brain-id")).toBe(A);
    expect(within(form).getByTestId("brain-identity-title").textContent).toContain("Alpha");

    type("brain-identity-name", "Toujours Alpha");
    fireEvent.click(screen.getByTestId("brain-identity-save"));
    await waitFor(() => expect(screen.queryByTestId("brain-identity-form")).toBeNull());
    const update = called("map_brain_update");
    expect(update.map((call) => call.args.brainId)).toEqual([A]);
    expect(nameOf(A)).toBe("Toujours Alpha");
    expect(nameOf(C)).toBe("Gamma");
    // The gesture now applies to the focused brain — Gamma — and says so.
    expect(screen.getByTestId("brain-identity-open").getAttribute("data-brain-id")).toBe(C);
  });

  it("the gesture is unavailable while a form is open or the interface is busy", async () => {
    await boot();
    await openEditor();
    expect((screen.getByTestId("brain-identity-open") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("brain-identity-open").getAttribute("aria-expanded")).toBe("true");
  });
});
