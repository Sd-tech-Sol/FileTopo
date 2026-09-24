import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SourceObservationBadge, {
  describeSourceObservation,
  SOURCE_OBSERVATION_STRINGS,
  sourceStateSymbol,
} from "./SourceObservationBadge";
import type { SourceObservation, SourceReason, SourceState } from "./types";

afterEach(cleanup);

const STATES: SourceState[] = [
  "UNKNOWN",
  "SYNCED",
  "UNAVAILABLE",
  "SOURCE_CHANGED",
  "SCAN_INCOMPLETE",
  "APPLY_FAILED",
];

const REASONS: SourceReason[] = [
  "ROOT_NOT_FOUND",
  "ROOT_ACCESS_DENIED",
  "ROOT_METADATA_UNAVAILABLE",
  "ROOT_NOT_DIRECTORY",
  "ROOT_REPARSE_POINT",
  "ROOT_IDENTITY_CHANGED",
  "SCAN_DIAGNOSTICS",
  "FINGERPRINT_DRIFT",
  "FINGERPRINT_FAILED",
  "RECONCILE_REFUSED",
  "APPLY_REFUSED",
  "IDENTITY_REFUSED",
  "STORE_WRITE_FAILED",
];

function observation(overrides: Partial<SourceObservation> = {}): SourceObservation {
  return {
    state: "UNAVAILABLE",
    reason: "ROOT_NOT_FOUND",
    observedUnixMs: 1_790_000_000_000,
    lastSuccessfulRevision: 4,
    lastSuccessfulUnixMs: 1_789_000_000_000,
    persisted: true,
    ...overrides,
  };
}

describe("TASK-0042 — the source observation badge", () => {
  it("says exactly the six sentences the task names, in French", () => {
    const fr = SOURCE_OBSERVATION_STRINGS.fr.states;
    expect(fr).toEqual({
      SYNCED: "À jour à la dernière vérification",
      UNAVAILABLE: "Source indisponible — dernier index conservé",
      SOURCE_CHANGED: "Source remplacée ou différente — dernier index conservé",
      SCAN_INCOMPLETE: "Vérification incomplète — dernier index conservé",
      APPLY_FAILED: "Mise à jour non appliquée — dernier index conservé",
      UNKNOWN: "Source non vérifiée",
    });
  });

  it("has an English sentence and a reason for every closed value — nothing is French-only", () => {
    for (const locale of ["fr", "en"] as const) {
      const words = SOURCE_OBSERVATION_STRINGS[locale];
      for (const state of STATES) expect(words.states[state].length).toBeGreaterThan(3);
      for (const reason of REASONS) expect(words.reasons[reason].length).toBeGreaterThan(3);
    }
    expect(SOURCE_OBSERVATION_STRINGS.en.states.UNAVAILABLE).toBe(
      "Source unavailable — last index kept",
    );
    // No English string is a copy of the French one.
    for (const state of STATES) {
      expect(SOURCE_OBSERVATION_STRINGS.en.states[state]).not.toBe(
        SOURCE_OBSERVATION_STRINGS.fr.states[state],
      );
    }
  });

  it.each(STATES)("%s carries a word AND a symbol, never a colour alone", (state) => {
    const failure = state !== "SYNCED" && state !== "UNKNOWN";
    render(
      <SourceObservationBadge
        observation={observation({ state, reason: failure ? "ROOT_NOT_FOUND" : null })}
        locale="fr"
      />,
    );
    const badge = screen.getByTestId("source-observation");
    expect(badge.getAttribute("data-state")).toBe(state);
    expect(badge.textContent).toContain(SOURCE_OBSERVATION_STRINGS.fr.states[state]);
    expect(sourceStateSymbol(state)).toMatch(/^[✓?⚠]$/);
    expect(badge.textContent).toContain(sourceStateSymbol(state));
    // Only a failure is announced as an alert.
    expect(badge.getAttribute("role")).toBe(failure ? "alert" : "status");
  });

  it("names the failure's reason from the closed list, and the last synchronised revision", () => {
    render(<SourceObservationBadge observation={observation()} locale="fr" />);
    expect(screen.getByTestId("source-observation-reason").textContent).toBe(
      SOURCE_OBSERVATION_STRINGS.fr.reasons.ROOT_NOT_FOUND,
    );
    expect(screen.getByTestId("source-observation-when").textContent).toContain("révision 4");
    expect(screen.getByTestId("source-observation-when").textContent).toContain(
      "Dernière observation",
    );
  });

  it("speaks of the LAST observation, never of the present", () => {
    for (const locale of ["fr", "en"] as const) {
      const text =
        JSON.stringify(SOURCE_OBSERVATION_STRINGS[locale].states) +
        SOURCE_OBSERVATION_STRINGS[locale].lastObserved("x");
      expect(text).not.toMatch(/maintenant|actuellement|en direct|\bnow\b|\bcurrently\b|\blive\b/i);
    }
    render(
      <SourceObservationBadge
        observation={observation({ state: "SYNCED", reason: null })}
        locale="fr"
      />,
    );
    expect(screen.getByTestId("source-observation").textContent).toContain(
      "à la dernière vérification",
    );
  });

  it("renders in English when asked, and says so with lang", () => {
    render(<SourceObservationBadge observation={observation()} locale="en" />);
    const badge = screen.getByTestId("source-observation");
    expect(badge.getAttribute("lang")).toBe("en");
    expect(badge.textContent).toContain("Source unavailable — last index kept");
    expect(badge.textContent).toContain("Last observation");
    expect(badge.textContent).not.toContain("Source indisponible");
  });

  it("shows « Source non vérifiée » before anything is loaded, without inventing an instant", () => {
    render(<SourceObservationBadge observation={null} locale="fr" />);
    expect(screen.getByTestId("source-observation").getAttribute("data-state")).toBe("UNKNOWN");
    expect(screen.getByTestId("source-observation").textContent).toContain("Source non vérifiée");
    expect(screen.getByTestId("source-observation-when").textContent).toBe(
      "Aucune observation enregistrée",
    );
  });

  it("is honest about a record that did not stick", () => {
    render(
      <SourceObservationBadge
        observation={observation({ state: "SYNCED", reason: null, persisted: false })}
        locale="fr"
      />,
    );
    expect(screen.getByTestId("source-observation").getAttribute("data-persisted")).toBe("false");
    expect(screen.getByTestId("source-observation-when").textContent).toContain("non enregistrée");
  });

  it("describes an observation in one sentence, reason included", () => {
    expect(describeSourceObservation(observation(), "fr")).toBe(
      "Source indisponible — dernier index conservé — le dossier est introuvable",
    );
    expect(describeSourceObservation(observation({ state: "UNKNOWN", reason: null }), "en")).toBe(
      "Source not checked",
    );
  });

  it("has no way to show a path: the type holds none, and the rendering holds only closed words", () => {
    const rendered = observation({ reason: "ROOT_IDENTITY_CHANGED", state: "SOURCE_CHANGED" });
    expect(Object.keys(rendered).sort()).toEqual(
      [
        "lastSuccessfulRevision",
        "lastSuccessfulUnixMs",
        "observedUnixMs",
        "persisted",
        "reason",
        "state",
      ].sort(),
    );
    render(<SourceObservationBadge observation={rendered} locale="fr" />);
    const text = screen.getByTestId("source-observation").textContent ?? "";
    expect(text).not.toMatch(/[A-Za-z]:\\|\\\\|\/Users\/|os error/);
  });
});
