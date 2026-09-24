import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  canonicalFilter,
  DEFAULT_FILTER,
  isFilterActive,
  normalizeFilter,
  sameFilter,
} from "./filters";
import type { MapProjection, NodeFilter } from "./types";

/**
 * L'état des filtres de la carte — `TASK-0039`, `DEC-0037`.
 *
 * Ce que ce hook **garde** : le filtre, le cerveau auquel il appartient et une
 * pile de curseurs (un par page déjà visitée, pour « Précédente »). Rien
 * d'autre : aucun nœud, aucune correspondance, aucun corpus. La page filtrée,
 * bornée par le cœur, est remise à l'appelant qui la range où il range déjà la
 * projection du cerveau.
 *
 * Règles que le code applique plutôt que décrit :
 *
 * * un filtre **appartient à un cerveau** : quand le cerveau au premier plan
 *   change, le filtre est abandonné et la projection normale de l'autre
 *   cerveau est relue — rien n'est transporté ;
 * * tout changement de filtre repart de la **première page** ;
 * * une réponse **périmée** (filtre changé, cerveau changé, appel annulé) ou qui
 *   n'est pas celle qui a été demandée est refusée ;
 * * après un geste « vu » (`seenRevision`), un filtre Nouveaux / Non vus est
 *   **relu depuis le cœur** et repart de la première page : un marquage ne peut
 *   que retirer des correspondances, jamais en inventer ;
 * * une nouvelle révision de l'Index relit aussi la page, depuis la première.
 */

export interface FilterSession {
  brainId: string;
  filter: NodeFilter;
  /** `cursors[i]` est le curseur de la page `i` ; la première est `null`. */
  cursors: (string | null)[];
}

interface Options {
  /** Le cerveau au premier plan, ou `null`. */
  brainId: string | null;
  /** Révision de l'Index de ce cerveau, telle que la projection courante la porte. */
  revision: number | null;
  /** Incrémenté par quiconque a marqué quelque chose vu. */
  seenRevision: number;
  /** Reçoit la page filtrée acceptée ; l'appelant la range. */
  onProjection: (brainId: string, projection: MapProjection) => void;
  /** Relit la projection **normale** d'un cerveau (filtre abandonné). */
  onRestore: (brainId: string) => void;
  onError: (message: string) => void;
}

export function useProjectionFilter({
  brainId,
  revision,
  seenRevision,
  onProjection,
  onRestore,
  onError,
}: Options) {
  const [session, setSession] = useState<FilterSession | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // Les rappels changent à chaque rendu ; l'effet de lecture ne doit pas.
  const callbacks = useRef({ onProjection, onRestore, onError });
  callbacks.current = { onProjection, onRestore, onError };

  const change = useCallback(
    (next: NodeFilter) => {
      if (!brainId) return;
      const filter = normalizeFilter(next);
      if (!isFilterActive(filter)) {
        const previous = sessionRef.current;
        setSession(null);
        if (previous) callbacks.current.onRestore(previous.brainId);
        return;
      }
      setSession({ brainId, filter, cursors: [null] });
    },
    [brainId],
  );

  const reset = useCallback(() => change(DEFAULT_FILTER), [change]);

  const next = useCallback((cursor: string | null) => {
    if (!cursor) return;
    setSession((current) =>
      current ? { ...current, cursors: [...current.cursors, cursor] } : current,
    );
  }, []);

  const previous = useCallback(() => {
    setSession((current) =>
      current && current.cursors.length > 1
        ? { ...current, cursors: current.cursors.slice(0, -1) }
        : current,
    );
  }, []);

  /**
   * L'appelant navigue (il va charger sa propre projection) : le filtre de ce
   * cerveau est abandonné **sans** relecture de la projection normale.
   */
  const dropForNavigation = useCallback((target: string) => {
    setSession((current) => (current && current.brainId === target ? null : current));
  }, []);

  // Le cerveau au premier plan a changé : le filtre de l'ancien ne suit pas.
  useEffect(() => {
    const current = sessionRef.current;
    if (current && current.brainId !== brainId) {
      setSession(null);
      callbacks.current.onRestore(current.brainId);
    }
  }, [brainId]);

  // Un geste « vu » retire des correspondances de Nouveaux / Non vus : la page
  // repart du début, relue depuis le cœur (voir l'effet de lecture ci-dessous).
  useEffect(() => {
    setSession((current) =>
      current && current.filter.state !== "ALL" && current.cursors.length > 1
        ? { ...current, cursors: [null] }
        : current,
    );
  }, [seenRevision]);

  // Une nouvelle révision de l'Index invalide tout curseur : retour page 1.
  useEffect(() => {
    setSession((current) =>
      current && current.cursors.length > 1 ? { ...current, cursors: [null] } : current,
    );
  }, [revision]);

  const key = session
    ? `${session.brainId}|${canonicalFilter(session.filter)}|${session.cursors.join(",")}`
    : null;
  const seenKey = session && session.filter.state !== "ALL" ? seenRevision : 0;

  useEffect(() => {
    const current = sessionRef.current;
    // A filter that no longer belongs to the foreground brain is about to be
    // dropped (effect above): it must not trigger one last read.
    if (!current || current.brainId !== brainId) return;
    let cancelled = false;
    const target = current.brainId;
    const filter = current.filter;
    const after = current.cursors[current.cursors.length - 1] ?? null;
    invoke<MapProjection>("map_view", { brainId: target, after, filter })
      .then((projection) => {
        if (cancelled) return;
        if (
          projection.brainId !== target ||
          !projection.filtered ||
          !sameFilter(projection.filtered.filter, filter)
        ) {
          callbacks.current.onError(
            "Projection filtrée refusée : la réponse n'est pas celle du filtre demandé.",
          );
          return;
        }
        callbacks.current.onProjection(target, projection);
      })
      .catch((error) => {
        if (!cancelled) callbacks.current.onError(`Filtre refusé : ${String(error)}`);
      });
    return () => {
      cancelled = true;
    };
    // `key` résume le filtre, le cerveau et la page ; les deux autres relancent
    // la lecture sans changer de page.
  }, [key, revision, seenKey]);

  return {
    /** Le filtre à afficher : celui de la session, sinon le défaut. */
    filter: session?.filter ?? DEFAULT_FILTER,
    active: session !== null,
    session,
    /** Page courante, à partir de 1. */
    pageNumber: session ? session.cursors.length : 1,
    canPrevious: (session?.cursors.length ?? 1) > 1,
    change,
    reset,
    next,
    previous,
    dropForNavigation,
  };
}
