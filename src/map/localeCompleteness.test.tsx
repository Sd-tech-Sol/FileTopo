import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import localeSource from "../lib/locale.ts?raw";
import { CONTENT_OBSERVATION_STRINGS } from "./ContentObservationsPanel";
import { CROSS_RELATIONS_PANEL_STRINGS } from "./CrossRelationsPanel";
import { DUPLICATE_STRINGS } from "./ExactDuplicateExplorer";
import { NATURE_LABELS, describeApplicationMode, describeChangeSummary } from "./ChangeJournalPanel";
import { RELATIONS_PANEL_STRINGS } from "./RelationsPanel";
import { REVIEW_QUEUE_STRINGS } from "./ReviewQueuePanel";
import { SOURCE_OBSERVATION_STRINGS } from "./SourceObservationBadge";
import { aggregateLabel } from "./MapView";
import {
  AVAILABILITY_LABELS,
  FILTER_GROUP_LABELS,
  FILTER_PANEL_STRINGS,
  KIND_LABELS,
  ROLE_LABELS,
  STATE_LABELS,
  describeFilter,
  matchCountLabel,
} from "./filters";
import {
  LocalizedError,
  bilingual,
  describeError,
  formatDateTime,
  formatInteger,
  plural,
  resolveStatus,
} from "./localeText";
import { strings } from "./mapStrings";
import {
  PROVENANCE_LABELS,
  RELATION_TYPE_LABELS,
  explanationFor,
  relationSegments,
  relationTypeLabel,
  suggestionSummary,
} from "./relations";
import { crossRelationSummary, crossSuggestionSummary } from "./crossRelations";
import { WATCH_STRINGS } from "./watchStatus";
import type { CrossRelationEdge, CrossSuggestionEdge, RelationsOverview, SuggestionEdge } from "./types";

import appSource from "./MapApp.tsx?raw";
import mapViewSource from "./MapView.tsx?raw";
import mainSource from "../main.tsx?raw";

/**
 * `TASK-0046` F — the completeness of the two languages is **enforced**, not hoped for.
 *
 * Three layers, each of which fails when a language is missing:
 *
 * 1. the types: every dictionary is `Record<Locale, …>`, so a key present in one language
 *    and absent in the other does not compile;
 * 2. this file: the same keys at run time, and a leaf that reads **the same in both
 *    languages** is a leaf nobody translated — unless it is on the short, reviewed list of
 *    words that really are identical;
 * 3. `localeRuntime.test.tsx`: the real `MapApp` in each language, with a scan for
 *    French left in the English view.
 */

type Dictionary = Record<string, unknown>;
const LEAF_ARGS: unknown[][] = [
  [3, 2, 1, true],
  ["k1", "brain-x", "v1"],
  [3, "k1", "brain-x", 2, true, "d"],
  [{ total: 3, created: 1, modified: 1, renamed: 1, moved: 0, deleted: 0, baselineEstablished: false }],
  [{ engineVersion: "dre-v1", deterministicRelationsProduced: 2, suggestionsProduced: 1, rulesEvaluated: ["r1"] }],
  [{ outgoing: true, sourceName: "S", targetName: "T", type: "t", provenance: "p", nodeName: "n", otherBrain: "b", displayed: false }],
];

/** Flattens a dictionary into `path → readable text`, calling every function it finds. */
function flatten(value: unknown, path: string, out: Map<string, string>, unresolved: string[]): void {
  if (typeof value === "string") {
    out.set(path, value);
  } else if (typeof value === "function") {
    for (const args of LEAF_ARGS) {
      try {
        const produced = (value as (...a: unknown[]) => unknown)(...args);
        flatten(produced, path + "()", out, unresolved);
        return;
      } catch {
        // try the next shape of arguments
      }
    }
    unresolved.push(path);
  } else if (isValidElement(value)) {
    out.set(path, renderToStaticMarkup(value as ReactNode as never).replace(/<[^>]+>/g, "").trim());
  } else if (value !== null && typeof value === "object") {
    for (const [key, inner] of Object.entries(value as Dictionary)) flatten(inner, `${path}.${key}`, out, unresolved);
  }
}

function keysOf(value: unknown, path = ""): string[] {
  if (value !== null && typeof value === "object" && !isValidElement(value)) {
    return Object.entries(value as Dictionary).flatMap(([key, inner]) => keysOf(inner, `${path}.${key}`));
  }
  return [path];
}

/**
 * Leaves that read the same in French and in English, reviewed one by one — by dictionary
 * and path, not by text, so a new untranslated string cannot hide behind a word that
 * happens to be on the list. Anything else that reads identically is untranslated.
 */
const IDENTICAL_ON_PURPOSE: Record<string, string> = {
  "MapApp strings:.language.fr": "the language names are written in their own language",
  "MapApp strings:.language.en": "the language names are written in their own language",
  "MapApp strings:.checks.h.violations()": "'N3 · n violation(s)' — the same code and the same word",
  "MapApp strings:.compositionSource": "'source' is the same word",
  "MapApp strings:.panel.kind": "'Type' is the same word",
  "MapApp strings:.panel.parent": "'Parent' is the same word",
  "filter availabilities:.LOCAL": "'local' is the same word",
  "filter groups:.kind": "'Type' is the same word",
  "relations panel:.suggestionTag": "'suggestion' is the same word",
  "inter-brain relations panel:.suggestionTag": "'suggestion' is the same word",
  "exact duplicates explorer:.occurrencesFact": "'Occurrences' is the same word",
  "filter panel:.page()": "'Page n' is the same word",
  "review queue:.ruleValue()": "'<rule> version <n>' — a code and the same word",
  "exact duplicates explorer:.occurrences()": "'n occurrence(s) · size' — the same word",
};

const DICTIONARIES: [string, Record<"fr" | "en", unknown>][] = [
  ["MapApp strings", strings],
  ["filter states", STATE_LABELS],
  ["filter kinds", KIND_LABELS],
  ["filter availabilities", AVAILABILITY_LABELS],
  ["filter groups", FILTER_GROUP_LABELS],
  ["filter roles", ROLE_LABELS],
  ["filter panel", FILTER_PANEL_STRINGS],
  ["provenance", PROVENANCE_LABELS],
  ["relation types", RELATION_TYPE_LABELS],
  ["change natures", NATURE_LABELS],
  ["relations panel", RELATIONS_PANEL_STRINGS],
  ["inter-brain relations panel", CROSS_RELATIONS_PANEL_STRINGS],
  ["review queue", REVIEW_QUEUE_STRINGS],
  ["exact duplicates explorer", DUPLICATE_STRINGS],
  ["content observations (already bilingual)", CONTENT_OBSERVATION_STRINGS],
  ["source observation (already bilingual)", SOURCE_OBSERVATION_STRINGS],
  ["watcher (already bilingual)", WATCH_STRINGS],
];

describe("each dictionary has exactly two complete languages", () => {
  for (const [name, dictionary] of DICTIONARIES) {
    it(`${name}: same keys in French and in English, and no leaf left untranslated`, () => {
      expect(Object.keys(dictionary).sort()).toEqual(["en", "fr"]);
      expect(keysOf(dictionary.fr).sort()).toEqual(keysOf(dictionary.en).sort());

      const fr = new Map<string, string>();
      const en = new Map<string, string>();
      const unresolvedFr: string[] = [];
      const unresolvedEn: string[] = [];
      flatten(dictionary.fr, "", fr, unresolvedFr);
      flatten(dictionary.en, "", en, unresolvedEn);
      expect(unresolvedEn).toEqual(unresolvedFr);

      const untranslated = [...fr.entries()]
        .filter(([path, text]) => en.get(path) === text && text.trim().length > 0)
        .filter(([path]) => !(`${name}:${path}` in IDENTICAL_ON_PURPOSE))
        .map(([path, text]) => `${path} = ${JSON.stringify(text)}`);
      expect(untranslated).toEqual([]);
    });
  }

  it("covers, by name, the surfaces the audit ACTION-0076 listed", () => {
    const covered = DICTIONARIES.map(([name]) => name).join(" | ");
    for (const surface of [
      "MapApp strings",
      "filter panel",
      "relations panel",
      "inter-brain relations panel",
      "review queue",
      "exact duplicates explorer",
      "change natures",
      "content observations",
      "source observation",
      "watcher",
    ]) {
      expect(covered).toContain(surface);
    }
    // The map and the element state have no dictionary of their own: their words are the
    // ones above (`ROLE_LABELS`, `aggregateLabel`) and the two tables below, both tested.
  });

  it("the composition refusals name every closed code, in both languages", () => {
    const codes = [
      "composed_view_empty",
      "composed_view_duplicate_brain",
      "composed_view_unknown_brain",
      "composed_view_focus_not_displayed",
      "composed_view_cannot_remove_last_brain",
    ];
    expect(Object.keys(strings.fr.compositionRefusals).sort()).toEqual(codes.sort());
    expect(Object.keys(strings.en.compositionRefusals).sort()).toEqual(codes.sort());
  });

  it("every wire code the reveal and copy actions can refuse has a sentence in both languages", () => {
    for (const language of ["fr", "en"] as const) {
      for (const code of [
        "indexed_target_unavailable",
        "indexed_target_reparse_point",
        "indexed_target_not_openable",
        "explorer_launch_failed",
        "platform_not_supported",
      ]) {
        expect(strings[language].revealError[code], `${language} reveal ${code}`).toBeTruthy();
      }
      for (const code of [
        "indexed_target_unavailable",
        "indexed_target_reparse_point",
        "indexed_target_not_openable",
        "indexed_target_not_representable",
        "clipboard_write_failed",
        "platform_not_supported",
      ]) {
        expect(strings[language].copyError[code], `${language} copy ${code}`).toBeTruthy();
      }
    }
  });
});

describe("the helpers that produce visible text say it in both languages", () => {
  const nothing = { filterMatchIds: [], filterContextIds: [] };
  void nothing;

  it("describeFilter and matchCountLabel", () => {
    const filter = { state: "UNSEEN", kinds: ["FILE", "DIRECTORY"], availability: "ONLINE_ONLY" } as const;
    expect(describeFilter({ ...filter, kinds: [...filter.kinds] }, "fr")).toBe(
      "État : Non vus · Type : dossiers, fichiers · Disponibilité : en ligne seulement",
    );
    expect(describeFilter({ ...filter, kinds: [...filter.kinds] }, "en")).toBe(
      "State: Unseen · Type: folders, files · Availability: online only",
    );
    expect(matchCountLabel(0, "en")).toBe("0 matches");
    expect(matchCountLabel(0, "fr")).toBe("0 correspondance");
    expect(matchCountLabel(1, "en")).toBe("1 match");
    expect(matchCountLabel(2, "en")).toBe("2 matches");
    expect(matchCountLabel(2, "fr")).toBe("2 correspondances");
  });

  it("aggregateLabel", () => {
    expect(aggregateLabel(1, "fr")).toBe("+1 élément — Voir la suite");
    expect(aggregateLabel(5, "fr")).toBe("+5 éléments — Voir la suite");
    expect(aggregateLabel(1, "en")).toBe("+1 item — See more");
    expect(aggregateLabel(5, "en")).toBe("+5 items — See more");
  });

  it("the change counters and the application mode", () => {
    const base = { created: 0, modified: 0, renamed: 0, moved: 0, deleted: 0, total: 0 };
    expect(describeChangeSummary({ ...base, baselineEstablished: true }, "en")).toMatch(/^Baseline established/);
    expect(describeChangeSummary({ ...base, baselineEstablished: false }, "en")).toBe("No change detected.");
    expect(
      describeChangeSummary({ ...base, baselineEstablished: false, created: 1, deleted: 1, total: 2 }, "en"),
    ).toBe("2 change(s) detected: 1 created · 0 modified · 0 renamed · 0 moved · 1 deleted");
    expect(describeApplicationMode("EXPLICIT_REBUILD_FULL", "fr")).toBe("Reconstruction complète");
    expect(describeApplicationMode("EXPLICIT_REBUILD_FULL", "en")).toBe("Full rebuild");
  });

  it("relation words: a wire value is never translated, an unknown one is shown as it is", () => {
    expect(relationTypeLabel("content-identical", "fr")).toBe("contenu identique");
    expect(relationTypeLabel("content-identical", "en")).toBe("identical content");
    expect(relationTypeLabel("mystery-type", "fr")).toBe("mystery-type");
    expect(relationTypeLabel("mystery-type", "en")).toBe("mystery-type");
    expect(PROVENANCE_LABELS.en.DETERMINISTIC).toBe("deterministic");
    expect(PROVENANCE_LABELS.fr.APPROVED).toBe("approuvée");
  });

  const end = (name: string, id: number) => ({ key: `ek1|${name}`, nodeId: id, name, relativePath: name });
  const suggestion = {
    suggestionKey: "s1", relationType: "reference", source: end("a.txt", 1), target: end("b.txt", 2),
    state: "pending", basis: "b", explanationFr: "Pourquoi FR", explanationEn: "Why EN",
  } as SuggestionEdge;

  it("the relation and suggestion summaries used as accessible names", () => {
    const overview = {
      established: [
        { id: 1, provenance: "APPROVED", relationType: "reference", source: end("a.txt", 1), target: end("b.txt", 2), ruleName: null, ruleVersion: null, suggestionKey: "s1" },
      ],
      pendingSuggestions: [suggestion],
    } as unknown as RelationsOverview;
    const byId = new Map([
      [1, { id: 1, rect: { x: 0, y: 0, w: 10, h: 10 } }],
      [2, { id: 2, rect: { x: 20, y: 0, w: 10, h: 10 } }],
    ]) as never;
    const fr = relationSegments(overview, byId, null, "fr").map((segment) => segment.label);
    const en = relationSegments(overview, byId, null, "en").map((segment) => segment.label);
    expect(fr[0]).toBe("relation établie, référence, provenance approuvée, de a.txt vers b.txt");
    expect(en[0]).toBe("established relation, reference, provenance approved, from a.txt to b.txt");
    expect(fr[1]).toBe("SUGGESTION non établie, référence, de a.txt vers b.txt");
    expect(en[1]).toBe("SUGGESTION not established, reference, from a.txt to b.txt");
    expect(suggestionSummary(suggestion, "fr")).toBe("Suggestion non établie — a.txt → b.txt, référence");
    expect(suggestionSummary(suggestion, "en")).toBe("Suggestion not established — a.txt → b.txt, reference");
  });

  it("the inter-brain summaries", () => {
    const cross = (name: string, id: number, brain: string) => ({ ...end(name, id), brainId: brain, brainDisplayName: brain, brainIcon: "x", brainIndexed: true });
    const edge = {
      id: 1, provenance: "DETERMINISTIC", relationType: "reference", source: cross("a", 1, "Alpha"), target: cross("b", 2, "Beta"),
      ruleName: "cross-homonyms", ruleVersion: "v1", suggestionKey: null,
    } as unknown as CrossRelationEdge;
    expect(crossRelationSummary(edge, "fr")).toBe(
      "relation INTER-CERVEAUX établie, référence, de Alpha · a vers Beta · b, provenance déterministe, règle cross-homonyms version v1",
    );
    expect(crossRelationSummary(edge, "en")).toBe(
      "INTER-BRAIN relation established, reference, from Alpha · a to Beta · b, provenance deterministic, rule cross-homonyms version v1",
    );
    const pending = { suggestionKey: "c1", relationType: "reference", source: cross("a", 1, "Alpha"), target: cross("b", 2, "Beta"), state: "pending", basis: "b" } as CrossSuggestionEdge;
    expect(crossSuggestionSummary(pending, "en")).toBe(
      "SUGGESTION inter-brain not established, reference, from Alpha · a to Beta · b",
    );
    expect(crossSuggestionSummary(pending, "fr")).toContain("non établie");
  });

  it("the backend's own explanation is picked by language, and a missing one says which it is", () => {
    expect(explanationFor(suggestion, "fr")).toEqual({ text: "Pourquoi FR", lang: "fr" });
    expect(explanationFor(suggestion, "en")).toEqual({ text: "Why EN", lang: "en" });
    expect(explanationFor({ explanationFr: "seul FR", explanationEn: null }, "en")).toEqual({ text: "seul FR", lang: "fr" });
    expect(explanationFor({}, "fr")).toBeNull();
  });

  it("dates, numbers, plurals and status lines follow the locale", () => {
    const at = Date.UTC(2026, 8, 25, 15, 30);
    expect(formatDateTime(at, "fr")).not.toBe(formatDateTime(at, "en"));
    expect(formatInteger(1234567, "fr")).not.toBe(formatInteger(1234567, "en"));
    expect(plural("fr", 0, "un", "plusieurs")).toBe("un");
    expect(plural("fr", 2, "un", "plusieurs")).toBe("plusieurs");
    expect(plural("en", 0, "one", "many")).toBe("many");
    expect(resolveStatus(bilingual("bonjour", "hello"), "fr")).toBe("bonjour");
    expect(resolveStatus(bilingual("bonjour", "hello"), "en")).toBe("hello");
    expect(resolveStatus("as is", "en")).toBe("as is");
    const invariant = new LocalizedError((locale) => (locale === "fr" ? "incohérence" : "mismatch"));
    expect(describeError(invariant, "fr")).toBe("incohérence");
    expect(describeError(invariant, "en")).toBe("mismatch");
    expect(invariant.message).toBe("mismatch");
    // A backend diagnostic is shown exactly as it came, in either language.
    expect(describeError("map_not_built", "fr")).toBe("map_not_built");
    expect(describeError(new Error("boom"), "en")).toBe("Error: boom");
  });
});

describe("the forced-French runtime cannot come back (DEC-0044 §6)", () => {
  const runtimeSources: [string, string][] = Object.entries(
    import.meta.glob(["./*.ts", "./*.tsx", "../main.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>,
  ).filter(([file]) => !/\.test\.tsx?$/.test(file));

  it("has found the runtime sources it is meant to guard", () => {
    const names = runtimeSources.map(([file]) => file);
    expect(names).toContain("./MapApp.tsx");
    expect(names).toContain("./ChangeJournalPanel.tsx");
    expect(names).toContain("./MapView.tsx");
    expect(names).toContain("../main.tsx");
    expect(appSource.length).toBeGreaterThan(1000);
    expect(mapViewSource.length).toBeGreaterThan(1000);
    expect(mainSource).toContain("<MapApp />");
  });

  it("no runtime source forces a language", () => {
    for (const [file, source] of runtimeSources) {
      expect(source, `${file}: const t = strings.fr`).not.toMatch(/const\s+t\s*=\s*strings\.fr\b/);
      expect(source, `${file}: strings.fr used directly`).not.toMatch(/\bstrings\.fr\b/);
      expect(source, `${file}: locale="fr"`).not.toMatch(/locale\s*=\s*["']fr["']/);
      expect(source, `${file}: locale={"fr"}`).not.toMatch(/locale\s*=\s*\{\s*["']fr["']\s*\}/);
      expect(source, `${file}: lang forced to fr`).not.toMatch(/documentElement\.lang\s*=\s*["']fr["']/);
      expect(source, `${file}: lang forced to en`).not.toMatch(/documentElement\.lang\s*=\s*["']en["']/);
    }
  });

  it("MapApp resolves the locale once, follows it on <html lang>, and writes it only on a choice", () => {
    expect(appSource).toContain("useState<Locale>(() => resolveInitialLocale())");
    expect(appSource).toContain("const t = strings[locale];");
    expect(appSource).toContain("document.documentElement.lang = locale;");
    // `storeLocale` is called in exactly one place: the handler of the explicit choice.
    expect(appSource.match(/storeLocale\(/g)).toHaveLength(1);
    const chooser = appSource.slice(appSource.indexOf("const chooseLocale"), appSource.indexOf("useEffect(() => {\n    document.documentElement.lang"));
    expect(chooser).toContain("storeLocale(next)");
    // MapApp never touches the browser's storage itself.
    expect(appSource).not.toMatch(/localStorage|sessionStorage/);
    // The language is not a dependency of anything that reads: no `locale` in an effect that invokes.
    for (const match of appSource.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[([^\]]*)\]\);/g)) {
      if (match[0].includes("invoke")) expect(match[1], match[0].slice(0, 80)).not.toMatch(/\blocale\b/);
    }
  });

  it("the one persisted key is the existing one, and no second mechanism exists", () => {
    expect(localeSource).toContain('export const LOCALE_STORAGE_KEY = "filetopo.locale";');
    for (const [file, source] of runtimeSources) {
      if (file === "../main.tsx") continue;
      expect(source, `${file}: browser storage`).not.toMatch(/\b(localStorage|sessionStorage|indexedDB)\b/);
      expect(source, `${file}: a second locale key`).not.toMatch(/filetopo\.locale/);
    }
    // No i18n package, no preference backend.
    const dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
    expect(dependencies.filter((name) => /i18n|intl|lingui|formatjs|polyglot|gettext/i.test(name))).toEqual([]);
    expect(appSource).not.toMatch(/invoke[^;]*"(map_locale|map_language|map_ui_locale|map_set_locale)/);
  });

  it("every panel MapApp hosts receives the locale, and none hides a French default", () => {
    for (const component of [
      "FilterPanel",
      "MapView",
      "ExactDuplicateExplorer",
      "ChangeJournalPanel",
      "NodeChangeState",
      "RelationsPanel",
      "ReviewQueuePanel",
      "CrossRelationsPanel",
      "DetailsPanel",
    ]) {
      const start = appSource.indexOf(`<${component}\n`) >= 0 ? appSource.indexOf(`<${component}\n`) : appSource.indexOf(`<${component} `);
      expect(start, `<${component} is rendered`).toBeGreaterThan(-1);
      expect(appSource.slice(start, start + 220), `<${component} gets locale`).toContain("locale={locale}");
    }
    expect(appSource).toMatch(/<SourceObservationBadge[\s\S]{0,400}locale=\{locale\}/);
    expect(appSource).toMatch(/<WatchStatusBadge[\s\S]{0,300}locale=\{locale\}/);
  });
});

describe("a stored value, a system language, and English as the last word (locale.ts, unchanged)", () => {
  it("keeps its contract: two locales, English by default, one key", () => {
    expect(localeSource).toContain('export type Locale = "fr" | "en";');
    expect(localeSource).toContain('export const DEFAULT_LOCALE: Locale = "en";');
  });
});
