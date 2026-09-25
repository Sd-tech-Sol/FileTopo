import type { Locale } from "../lib/locale";
import { plural } from "./localeText";
import type { FilterAvailability, FilterKind, FilterState, NodeFilter } from "./types";

/**
 * Le modèle des filtres dynamiques — `TASK-0039`, `DEC-0037`, `F-022 / P-09`.
 *
 * Ce module ne calcule **aucune correspondance** : il n'y a ni corpus ni
 * prédicat ici. Le cœur lit l'Index canonique et renvoie un total exact et une
 * page bornée ; l'interface ne fait que décrire le filtre, le normaliser comme
 * le cœur le fait, et nommer ce qu'elle reçoit.
 *
 * `TASK-0046` — chaque mot affiché existe en français et en anglais. Les valeurs
 * envoyées au cœur (`FilterState`, `FilterKind`, `FilterAvailability`) ne sont
 * jamais ces mots : seule l'étiquette change avec la langue.
 */

export const DEFAULT_FILTER: NodeFilter = { state: "ALL", kinds: [], availability: "ALL" };

/** Ordre canonique des types — celui de l'enum du cœur. */
export const KIND_ORDER: readonly FilterKind[] = ["DIRECTORY", "FILE", "SKIPPED"];

export const STATE_LABELS: Record<Locale, Record<FilterState, string>> = {
  fr: { ALL: "Tout", NEW: "Nouveaux", UNSEEN: "Non vus" },
  en: { ALL: "All", NEW: "New", UNSEEN: "Unseen" },
};

export const KIND_LABELS: Record<Locale, Record<FilterKind, string>> = {
  fr: { DIRECTORY: "dossiers", FILE: "fichiers", SKIPPED: "ignorés" },
  en: { DIRECTORY: "folders", FILE: "files", SKIPPED: "skipped" },
};

export const AVAILABILITY_LABELS: Record<Locale, Record<FilterAvailability, string>> = {
  fr: { ALL: "Tout", LOCAL: "local", ONLINE_ONLY: "en ligne seulement" },
  en: { ALL: "All", LOCAL: "local", ONLINE_ONLY: "online only" },
};

/** Les noms des trois groupes, en légende et dans la phrase qui décrit le filtre. */
export const FILTER_GROUP_LABELS: Record<
  Locale,
  { state: string; kind: string; availability: string }
> = {
  fr: { state: "État", kind: "Type", availability: "Disponibilité" },
  en: { state: "State", kind: "Type", availability: "Availability" },
};

/** Tout ce que dit le panneau en dehors des étiquettes ci-dessus. */
export interface FilterPanelStrings {
  panelLabel: string;
  title: string;
  reset: string;
  none: string;
  active: (description: string) => string;
  pageResumed: string;
  page: (pageNumber: number) => string;
  onThisPage: string;
  previous: string;
  next: string;
  loading: string;
}

export const FILTER_PANEL_STRINGS: Record<Locale, FilterPanelStrings> = {
  fr: {
    panelLabel: "Filtres de la carte",
    title: "Filtres",
    reset: "Réinitialiser les filtres",
    none: "Aucun filtre actif.",
    active: (description) => `Filtre actif — ${description}`,
    pageResumed: "Page reprise",
    page: (pageNumber) => `Page ${pageNumber}`,
    onThisPage: "sur cette page",
    previous: "Page précédente",
    next: "Page suivante",
    loading: "Lecture du filtre…",
  },
  en: {
    panelLabel: "Map filters",
    title: "Filters",
    reset: "Reset filters",
    none: "No active filter.",
    active: (description) => `Active filter — ${description}`,
    pageResumed: "Resumed page",
    page: (pageNumber) => `Page ${pageNumber}`,
    onThisPage: "on this page",
    previous: "Previous page",
    next: "Next page",
    loading: "Reading the filter…",
  },
};

/** Doublons retirés, types dans l'ordre canonique — comme `NodeFilter::normalized`. */
export function normalizeFilter(filter: NodeFilter): NodeFilter {
  const kinds = KIND_ORDER.filter((kind) => filter.kinds.includes(kind));
  return { state: filter.state, kinds, availability: filter.availability };
}

/** `Tout` + aucun type + `Tout` : la projection topographique normale. */
export function isFilterActive(filter: NodeFilter): boolean {
  return filter.state !== "ALL" || filter.kinds.length > 0 || filter.availability !== "ALL";
}

/** Forme canonique stable : deux filtres qui sélectionnent pareil ont la même. */
export function canonicalFilter(filter: NodeFilter): string {
  const normalized = normalizeFilter(filter);
  return `${normalized.state}:${normalized.kinds.join("+")}:${normalized.availability}`;
}

export function sameFilter(a: NodeFilter, b: NodeFilter): boolean {
  return canonicalFilter(a) === canonicalFilter(b);
}

/** Bascule un type dans l'ensemble, et renvoie un nouveau filtre normalisé. */
export function toggleKind(filter: NodeFilter, kind: FilterKind): NodeFilter {
  const kinds = filter.kinds.includes(kind)
    ? filter.kinds.filter((existing) => existing !== kind)
    : [...filter.kinds, kind];
  return normalizeFilter({ ...filter, kinds });
}

/**
 * Le filtre actif, **en mots** — jamais par la couleur seule. Seuls les
 * groupes qui contraignent quelque chose sont nommés.
 */
export function describeFilter(filter: NodeFilter, locale: Locale): string {
  const normalized = normalizeFilter(filter);
  const groups = FILTER_GROUP_LABELS[locale];
  // Le deux-points prend une espace en français et pas en anglais : typographie.
  const colon = locale === "fr" ? " : " : ": ";
  const parts: string[] = [];
  if (normalized.state !== "ALL") {
    parts.push(`${groups.state}${colon}${STATE_LABELS[locale][normalized.state]}`);
  }
  if (normalized.kinds.length > 0) {
    parts.push(
      `${groups.kind}${colon}${normalized.kinds.map((kind) => KIND_LABELS[locale][kind]).join(", ")}`,
    );
  }
  if (normalized.availability !== "ALL") {
    parts.push(
      `${groups.availability}${colon}${AVAILABILITY_LABELS[locale][normalized.availability]}`,
    );
  }
  return parts.join(" · ");
}

export function matchCountLabel(total: number, locale: Locale): string {
  return locale === "fr"
    ? `${total} ${plural(locale, total, "correspondance", "correspondances")}`
    : `${total} ${plural(locale, total, "match", "matches")}`;
}

export type FilterRole = "match" | "context";

export const ROLE_LABELS: Record<Locale, Record<FilterRole, string>> = {
  fr: { match: "Correspondance", context: "Contexte" },
  en: { match: "Match", context: "Context" },
};

/** Un mot **et** un symbole : le rôle d'un nœud n'est jamais une couleur seule. */
export const ROLE_SYMBOLS: Record<FilterRole, string> = { match: "◆", context: "◇" };

/** Le rôle de chaque nœud matérialisé d'une page filtrée. */
export function filterRoles(
  filtered: { filterMatchIds: number[]; filterContextIds: number[] } | null | undefined,
): ReadonlyMap<number, FilterRole> {
  const roles = new Map<number, FilterRole>();
  if (!filtered) return roles;
  for (const id of filtered.filterContextIds) roles.set(id, "context");
  for (const id of filtered.filterMatchIds) roles.set(id, "match");
  return roles;
}
