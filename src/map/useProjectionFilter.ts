import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  canonicalFilter,
  DEFAULT_FILTER,
  isFilterActive,
  normalizeFilter,
  sameFilter,
} from "./filters";
import { bilingual, describeError, type StatusMessage } from "./localeText";
import type { MapProjection, NodeFilter } from "./types";

/**
 * L'état des filtres de la carte — `TASK-0039`, `DEC-0037`, puis `TASK-0044`.
 *
 * Ce que ce hook **garde** : **un filtre par cerveau** et, pour chacun, une pile
 * de curseurs (un par page déjà visitée, pour « Précédente »). Rien d'autre :
 * aucun nœud, aucune correspondance, aucun corpus. La page filtrée, bornée par
 * le cœur, est remise à l'appelant qui la range où il range déjà la projection
 * du cerveau.
 *
 * Règles que le code applique plutôt que décrit :
 *
 * * un filtre **appartient à un cerveau et lui reste attaché** (`TASK-0044`) :
 *   quand le cerveau au premier plan change, le filtre de l'ancien est **gardé**
 *   pour son retour — il n'est plus abandonné — et seul celui du nouveau est
 *   lu. Le filtre **logique** est aussi ce que l'état de reprise persiste
 *   (`onFilterChanged`) ; un curseur, lui, n'est jamais gardé au-delà de sa
 *   révision ;
 * * tout changement de filtre repart de la **première page** ;
 * * une réponse **périmée** (filtre changé, cerveau changé, appel annulé) ou qui
 *   n'est pas celle qui a été demandée est refusée ;
 * * après un geste « vu » (`seenRevision`), un filtre Nouveaux / Non vus est
 *   **relu depuis le cœur** et repart de la première page : un marquage ne peut
 *   que retirer des correspondances, jamais en inventer ;
 * * une nouvelle révision de l'Index relit aussi la page, depuis la première —
 *   sauf pour une page **reprise** (`adopt`) dont le curseur vient d'être
 *   reconstruit par le cœur **pour cette révision** ;
 * * une page reprise commence à la sélection retenue : son rang réel n'est pas
 *   connu, et l'interface le dit (`resumed`) au lieu d'inventer un numéro.
 */

export interface FilterSession {
  brainId: string;
  filter: NodeFilter;
  /** `cursors[i]` est le curseur de la page `i` ; la première est `null`. */
  cursors: (string | null)[];
  /**
   * La révision pour laquelle le cœur a reconstruit le curseur d'une page reprise
   * (`adopt`), sinon `null`. Un curseur d'une autre révision est toujours refusé.
   */
  cursorRevision: number | null;
  /** La page courante a été reprise à la sélection : son numéro réel est inconnu. */
  resumed: boolean;
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
  /** Relit la projection **normale** d'un cerveau (filtre retiré par un geste). */
  onRestore: (brainId: string) => void;
  /** `TASK-0046` — a line that says itself in whichever language is current when shown. */
  onError: (message: StatusMessage) => void;
  /**
   * Le filtre **logique** d'un cerveau a changé par un geste (jamais par `adopt`) :
   * l'état de reprise le retient. Un filtre inactif arrive comme le filtre par défaut.
   */
  onFilterChanged?: (brainId: string, filter: NodeFilter) => void;
}

const inactive = (): NodeFilter => ({ ...DEFAULT_FILTER, kinds: [] });

export function useProjectionFilter({
  brainId,
  revision,
  seenRevision,
  onProjection,
  onRestore,
  onError,
  onFilterChanged,
}: Options) {
  const [sessions, setSessions] = useState<ReadonlyMap<string, FilterSession>>(new Map());
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const session = brainId ? (sessions.get(brainId) ?? null) : null;
  // Les rappels changent à chaque rendu ; l'effet de lecture ne doit pas.
  const callbacks = useRef({ onProjection, onRestore, onError, onFilterChanged });
  callbacks.current = { onProjection, onRestore, onError, onFilterChanged };

  /** Remplace (ou retire) la session d'un cerveau, dans la référence **et** dans l'état. */
  const store = useCallback((target: string, next: FilterSession | null) => {
    const map = new Map(sessionsRef.current);
    if (next) map.set(target, next);
    else map.delete(target);
    sessionsRef.current = map;
    setSessions(map);
  }, []);

  const change = useCallback(
    (next: NodeFilter) => {
      if (!brainId) return;
      const filter = normalizeFilter(next);
      if (!isFilterActive(filter)) {
        const previous = sessionsRef.current.get(brainId);
        if (!previous) return;
        store(brainId, null);
        callbacks.current.onFilterChanged?.(brainId, inactive());
        callbacks.current.onRestore(previous.brainId);
        return;
      }
      store(brainId, { brainId, filter, cursors: [null], cursorRevision: null, resumed: false });
      callbacks.current.onFilterChanged?.(brainId, filter);
    },
    [brainId, store],
  );

  const reset = useCallback(() => change(DEFAULT_FILTER), [change]);

  const next = useCallback(
    (cursor: string | null) => {
      if (!cursor || !brainId) return;
      const current = sessionsRef.current.get(brainId);
      if (current) store(brainId, { ...current, cursors: [...current.cursors, cursor] });
    },
    [brainId, store],
  );

  const previous = useCallback(() => {
    if (!brainId) return;
    const current = sessionsRef.current.get(brainId);
    if (!current || current.cursors.length <= 1) return;
    const cursors = current.cursors.slice(0, -1);
    store(brainId, { ...current, cursors, resumed: current.resumed && cursors.length > 1 });
  }, [brainId, store]);

  /**
   * L'appelant navigue (il va charger sa propre projection) : le filtre de ce
   * cerveau est abandonné **sans** relecture de la projection normale, et
   * l'état de reprise l'apprend.
   */
  const dropForNavigation = useCallback(
    (target: string) => {
      if (!sessionsRef.current.has(target)) return;
      store(target, null);
      callbacks.current.onFilterChanged?.(target, inactive());
    },
    [store],
  );

  /**
   * Le cœur vient de **restaurer** ce cerveau : son filtre, et le curseur frais de la
   * page où la sélection retenue se trouve, deviennent la session — sans être
   * persistés une seconde fois. Un filtre `null` ou inactif = pas de session.
   */
  const adopt = useCallback(
    (
      target: string,
      filter: NodeFilter | null,
      cursor: string | null,
      cursorRevision: number | null,
    ) => {
      if (!filter || !isFilterActive(filter)) {
        if (sessionsRef.current.has(target)) store(target, null);
        return;
      }
      store(target, {
        brainId: target,
        filter: normalizeFilter(filter),
        cursors: cursor ? [null, cursor] : [null],
        cursorRevision: cursor ? cursorRevision : null,
        resumed: cursor !== null,
      });
    },
    [store],
  );

  // Un geste « vu » retire des correspondances de Nouveaux / Non vus : la page
  // repart du début, relue depuis le cœur (voir l'effet de lecture ci-dessous).
  useEffect(() => {
    const map = new Map(sessionsRef.current);
    let changed = false;
    for (const [id, current] of map) {
      if (current.filter.state !== "ALL" && current.cursors.length > 1) {
        map.set(id, { ...current, cursors: [null], cursorRevision: null, resumed: false });
        changed = true;
      }
    }
    if (changed) {
      sessionsRef.current = map;
      setSessions(map);
    }
  }, [seenRevision]);

  // Une nouvelle révision de l'Index **de ce cerveau** invalide tout curseur : retour
  // page 1 — sauf pour un curseur que le cœur vient de reconstruire pour cette révision.
  const lastRevision = useRef(new Map<string, number | null>());
  useEffect(() => {
    if (!brainId) return;
    const before = lastRevision.current.get(brainId);
    lastRevision.current.set(brainId, revision);
    if (before === undefined || before === revision) return;
    const current = sessionsRef.current.get(brainId);
    if (current && current.cursors.length > 1 && current.cursorRevision !== revision) {
      store(brainId, { ...current, cursors: [null], cursorRevision: null, resumed: false });
    }
  }, [brainId, revision, store]);

  const key = session
    ? `${session.brainId}|${canonicalFilter(session.filter)}|${session.cursors.join(",")}`
    : null;
  const seenKey = session && session.filter.state !== "ALL" ? seenRevision : 0;

  useEffect(() => {
    const current = brainId ? sessionsRef.current.get(brainId) : undefined;
    // Seul le filtre du cerveau au premier plan est lu : celui d'un autre cerveau
    // attend, gardé, que ce cerveau revienne au premier plan.
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
            bilingual(
              "Projection filtrée refusée : la réponse n'est pas celle du filtre demandé.",
              "Filtered projection refused: the answer is not the one for the requested filter.",
            ),
          );
          return;
        }
        callbacks.current.onProjection(target, projection);
      })
      .catch((error) => {
        if (!cancelled) {
          callbacks.current.onError((locale) =>
            locale === "fr"
              ? `Filtre refusé : ${describeError(error, locale)}`
              : `Filter refused: ${describeError(error, locale)}`,
          );
        }
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
    /** Page courante, à partir de 1 — sans valeur réelle quand {@link resumed}. */
    pageNumber: session ? session.cursors.length : 1,
    /** La page courante a été reprise à la sélection : son numéro n'est pas connu. */
    resumed: session?.resumed ?? false,
    canPrevious: (session?.cursors.length ?? 1) > 1,
    change,
    reset,
    next,
    previous,
    dropForNavigation,
    adopt,
  };
}
