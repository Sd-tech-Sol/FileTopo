import type { FilterAvailability, FilterKind, FilterState, NodeFilter } from "./types";

/**
 * Le modèle des filtres dynamiques — `TASK-0039`, `DEC-0037`, `F-022 / P-09`.
 *
 * Ce module ne calcule **aucune correspondance** : il n'y a ni corpus ni
 * prédicat ici. Le cœur lit l'Index canonique et renvoie un total exact et une
 * page bornée ; l'interface ne fait que décrire le filtre, le normaliser comme
 * le cœur le fait, et nommer ce qu'elle reçoit.
 */

export const DEFAULT_FILTER: NodeFilter = { state: "ALL", kinds: [], availability: "ALL" };

/** Ordre canonique des types — celui de l'enum du cœur. */
export const KIND_ORDER: readonly FilterKind[] = ["DIRECTORY", "FILE", "SKIPPED"];

export const STATE_LABELS: Record<FilterState, string> = {
  ALL: "Tout",
  NEW: "Nouveaux",
  UNSEEN: "Non vus",
};

export const KIND_LABELS: Record<FilterKind, string> = {
  DIRECTORY: "dossiers",
  FILE: "fichiers",
  SKIPPED: "ignorés",
};

export const AVAILABILITY_LABELS: Record<FilterAvailability, string> = {
  ALL: "Tout",
  LOCAL: "local",
  ONLINE_ONLY: "en ligne seulement",
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
export function describeFilter(filter: NodeFilter): string {
  const normalized = normalizeFilter(filter);
  const parts: string[] = [];
  if (normalized.state !== "ALL") parts.push(`État : ${STATE_LABELS[normalized.state]}`);
  if (normalized.kinds.length > 0) {
    parts.push(`Type : ${normalized.kinds.map((kind) => KIND_LABELS[kind]).join(", ")}`);
  }
  if (normalized.availability !== "ALL") {
    parts.push(`Disponibilité : ${AVAILABILITY_LABELS[normalized.availability]}`);
  }
  return parts.join(" · ");
}

export function matchCountLabel(total: number): string {
  return `${total} correspondance${total > 1 ? "s" : ""}`;
}

export type FilterRole = "match" | "context";

export const ROLE_LABELS: Record<FilterRole, string> = {
  match: "Correspondance",
  context: "Contexte",
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
