import { describe, expect, it } from "vitest";
import {
  canonicalFilter,
  DEFAULT_FILTER,
  describeFilter,
  filterRoles,
  isFilterActive,
  matchCountLabel,
  normalizeFilter,
  sameFilter,
  toggleKind,
} from "./filters";
import type { NodeFilter } from "./types";

describe("TASK-0039 — le modèle de filtre (aucun calcul de correspondance)", () => {
  it("Tout + aucun type + Tout est inactif ; n'importe quel groupe le rend actif", () => {
    expect(isFilterActive(DEFAULT_FILTER)).toBe(false);
    expect(isFilterActive({ state: "NEW", kinds: [], availability: "ALL" })).toBe(true);
    expect(isFilterActive({ state: "ALL", kinds: ["FILE"], availability: "ALL" })).toBe(true);
    expect(isFilterActive({ state: "ALL", kinds: [], availability: "LOCAL" })).toBe(true);
    expect(isFilterActive({ state: "ALL", kinds: [], availability: "ONLINE_ONLY" })).toBe(true);
  });

  it("normalise comme le cœur : doublons retirés, ordre canonique des types", () => {
    const normalized = normalizeFilter({
      state: "UNSEEN",
      kinds: ["SKIPPED", "FILE", "DIRECTORY", "FILE"],
      availability: "ALL",
    });
    expect(normalized.kinds).toEqual(["DIRECTORY", "FILE", "SKIPPED"]);
    expect(canonicalFilter(normalized)).toBe("UNSEEN:DIRECTORY+FILE+SKIPPED:ALL");
    // Même sélection, autre écriture : même forme canonique.
    expect(
      sameFilter(
        { state: "NEW", kinds: ["FILE", "DIRECTORY"], availability: "LOCAL" },
        { state: "NEW", kinds: ["DIRECTORY", "FILE", "FILE"], availability: "LOCAL" },
      ),
    ).toBe(true);
    expect(sameFilter(DEFAULT_FILTER, { ...DEFAULT_FILTER, state: "NEW" })).toBe(false);
    // Exactement la forme du cœur (`NodeFilter::canonical`).
    expect(canonicalFilter(DEFAULT_FILTER)).toBe("ALL::ALL");
    expect(canonicalFilter({ state: "NEW", kinds: ["FILE"], availability: "ONLINE_ONLY" })).toBe(
      "NEW:FILE:ONLINE_ONLY",
    );
  });

  it("bascule un type sans jamais muter le filtre reçu", () => {
    const start: NodeFilter = { state: "ALL", kinds: ["FILE"], availability: "ALL" };
    const withDirectory = toggleKind(start, "DIRECTORY");
    expect(withDirectory.kinds).toEqual(["DIRECTORY", "FILE"]);
    expect(start.kinds).toEqual(["FILE"]);
    expect(toggleKind(withDirectory, "FILE").kinds).toEqual(["DIRECTORY"]);
    expect(toggleKind({ ...start, kinds: ["FILE"] }, "FILE").kinds).toEqual([]);
  });

  it("décrit le filtre actif en mots, groupe par groupe, sans nommer les groupes libres", () => {
    expect(describeFilter(DEFAULT_FILTER, "fr")).toBe("");
    expect(describeFilter({ state: "NEW", kinds: [], availability: "ALL" }, "fr")).toBe("État : Nouveaux");
    expect(
      describeFilter({ state: "UNSEEN", kinds: ["FILE", "DIRECTORY"], availability: "LOCAL" }, "fr"),
    ).toBe("État : Non vus · Type : dossiers, fichiers · Disponibilité : local");
    expect(describeFilter({ state: "ALL", kinds: ["SKIPPED"], availability: "ONLINE_ONLY" }, "fr")).toBe(
      "Type : ignorés · Disponibilité : en ligne seulement",
    );
  });

  it("écrit le compte exact en toutes lettres", () => {
    expect(matchCountLabel(0, "fr")).toBe("0 correspondance");
    expect(matchCountLabel(1, "fr")).toBe("1 correspondance");
    expect(matchCountLabel(12345, "fr")).toBe("12345 correspondances");
  });

  it("le rôle d'un nœud vient de la page du cœur : correspondance, sinon contexte", () => {
    const roles = filterRoles({ filterMatchIds: [4, 9], filterContextIds: [1, 2] });
    expect(roles.get(4)).toBe("match");
    expect(roles.get(9)).toBe("match");
    expect(roles.get(1)).toBe("context");
    expect(roles.get(2)).toBe("context");
    expect(roles.has(77)).toBe(false);
    expect(filterRoles(null).size).toBe(0);
    expect(filterRoles(undefined).size).toBe(0);
  });
});
