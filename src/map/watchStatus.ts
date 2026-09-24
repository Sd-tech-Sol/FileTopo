import type { WatchMode, WatchReason, WatchState, WatchStatus } from "./types";

/**
 * L'observateur automatique — `TASK-0043`, `DEC-0041`.
 *
 * Ce module ne fait **aucune lecture périodique** : il ne connaît qu'un événement
 * du cœur (`map-watch-status`) et une lecture unique, à l'affichage d'un cerveau
 * (`map_watch_status`). Rien ici ne démarre, n'arrête ni ne relance un observateur —
 * il appartient au cœur.
 *
 * Trois règles que le code applique plutôt que décrit :
 *
 * * **enveloppe fermée** : une charge utile qui porterait autre chose que les sept
 *   champs connus (un chemin, un nom, une clé, une identité, un message du système…)
 *   est **refusée en entier**, jamais nettoyée ni affichée ;
 * * **séquence** : pour un cerveau, un état de séquence inférieure ou égale à celle
 *   déjà vue est ignoré — un événement en retard (ancienne génération) n'écrase pas
 *   un état plus récent ;
 * * **un cerveau ne parle que pour lui-même**.
 */

/** Le nom de l'événement émis par le cœur. La charge utile est un {@link WatchStatus}. */
export const WATCH_STATUS_EVENT = "map-watch-status";

const STATES: readonly WatchState[] = [
  "STOPPED",
  "STARTING",
  "VERIFYING",
  "WATCHING",
  "PERIODIC",
  "DEGRADED",
];
const MODES: readonly WatchMode[] = ["NATIVE", "PERIODIC", "NONE"];
const REASONS: readonly WatchReason[] = [
  "INITIAL_CHECK",
  "SIGNALS_LOST",
  "QUEUE_SATURATED",
  "SCOPE_UNSAFE",
  "PERIODIC_CHECK",
  "SOURCE_RETURNED",
  "MORE_SIGNALS",
  "RETRY",
  "NATIVE_UNSUPPORTED",
  "SOURCE_UNAVAILABLE",
  "SOURCE_CHANGED",
  "SCAN_INCOMPLETE",
  "APPLY_FAILED",
  "NEEDS_MANUAL_REFRESH",
];

/** Exactement ces clés, et aucune autre. */
export const WATCH_STATUS_KEYS: readonly string[] = [
  "brainId",
  "indexRevision",
  "mode",
  "pending",
  "reason",
  "sequence",
  "state",
];

/**
 * Valide une charge utile inconnue. `null` si elle n'est pas **exactement** l'enveloppe
 * fermée : clé en trop ou manquante, mot hors du vocabulaire, nombre invalide.
 */
export function parseWatchStatus(payload: unknown): WatchStatus | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== WATCH_STATUS_KEYS.length) return null;
  if (!keys.every((key, index) => key === WATCH_STATUS_KEYS[index])) return null;

  const { brainId, state, mode, reason, indexRevision, pending, sequence } = record;
  if (typeof brainId !== "string" || brainId.length === 0) return null;
  if (!STATES.includes(state as WatchState)) return null;
  if (!MODES.includes(mode as WatchMode)) return null;
  if (reason !== null && !REASONS.includes(reason as WatchReason)) return null;
  if (indexRevision !== null && !isCount(indexRevision)) return null;
  if (typeof pending !== "boolean") return null;
  if (!isCount(sequence)) return null;
  return {
    brainId,
    state: state as WatchState,
    mode: mode as WatchMode,
    reason: reason as WatchReason | null,
    indexRevision: indexRevision as number | null,
    pending,
    sequence: sequence as number,
  };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Garde, **par cerveau**, la séquence la plus haute vue. Un état n'est accepté que s'il
 * est strictement plus récent — sauf le tout premier d'un cerveau, quel qu'il soit.
 */
export class WatchTracker {
  private readonly highest = new Map<string, number>();

  /** `true` si `status` est plus récent que tout ce qui a été vu pour ce cerveau. */
  accept(status: WatchStatus): boolean {
    const seen = this.highest.get(status.brainId);
    if (seen !== undefined && status.sequence <= seen) return false;
    this.highest.set(status.brainId, status.sequence);
    return true;
  }

  has(brainId: string): boolean {
    return this.highest.has(brainId);
  }
}

/**
 * Regroupe les rechargements demandés pour un cerveau : au plus **un** en vol, et une
 * demande arrivée pendant qu'il court en produit **un** de plus — jamais une pile.
 */
export class ReloadCoordinator {
  private readonly running = new Set<string>();
  private readonly again = new Set<string>();

  async request(brainId: string, reload: () => Promise<void>): Promise<void> {
    if (this.running.has(brainId)) {
      this.again.add(brainId);
      return;
    }
    this.running.add(brainId);
    try {
      do {
        this.again.delete(brainId);
        try {
          await reload();
        } catch {
          // Un échec de lecture ne bloque pas la file : la carte déjà chargée reste.
        }
      } while (this.again.has(brainId));
    } finally {
      this.running.delete(brainId);
    }
  }
}

/**
 * S'abonne à l'événement du cœur. Toujours résolu : si le canal d'événements n'existe
 * pas (un test, un hôte sans Tauri), l'abonnement est **vide**, jamais une erreur.
 * Retourne la fonction qui se désabonne.
 */
export async function subscribeToWatchStatus(
  onStatus: (status: WatchStatus) => void,
): Promise<() => void> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<unknown>(WATCH_STATUS_EVENT, (event) => {
      const status = parseWatchStatus(event.payload);
      if (status) onStatus(status);
    });
    return unlisten;
  } catch {
    return () => {};
  }
}

type Locale = "fr" | "en";

export interface WatchStrings {
  title: string;
  states: Record<WatchState, string>;
  /** Une seule phrase par mode, pour dire **comment** on surveille. */
  modes: Record<WatchMode, string>;
  reasons: Record<WatchReason, string>;
  pending: string;
}

export const WATCH_STRINGS: Record<Locale, WatchStrings> = {
  fr: {
    title: "Surveillance automatique",
    states: {
      STOPPED: "Surveillance arrêtée",
      STARTING: "Surveillance : démarrage",
      VERIFYING: "Vérification en cours",
      WATCHING: "Surveillance active",
      PERIODIC: "Vérification périodique",
      DEGRADED: "Surveillance dégradée",
    },
    modes: {
      NATIVE: "mécanisme du système",
      PERIODIC: "relecture complète à intervalle fixe",
      NONE: "aucun mécanisme actif",
    },
    reasons: {
      INITIAL_CHECK: "vérification complète au démarrage",
      SIGNALS_LOST: "des signaux ont été perdus",
      QUEUE_SATURATED: "trop de changements d'un coup",
      SCOPE_UNSAFE: "la zone modifiée n'a pas pu être délimitée",
      PERIODIC_CHECK: "relecture périodique",
      SOURCE_RETURNED: "la source est revenue",
      MORE_SIGNALS: "de nouveaux changements sont arrivés",
      RETRY: "nouvelle tentative",
      NATIVE_UNSUPPORTED: "la surveillance du système n'est pas disponible ici",
      SOURCE_UNAVAILABLE: "la source est indisponible — dernier index conservé",
      SOURCE_CHANGED: "la source a été remplacée — dernier index conservé",
      SCAN_INCOMPLETE: "certains éléments n'ont pas pu être lus",
      APPLY_FAILED: "la mise à jour n'a pas pu être appliquée",
      NEEDS_MANUAL_REFRESH: "« Actualiser » est nécessaire une fois",
    },
    pending: "des changements sont en attente",
  },
  en: {
    title: "Automatic watching",
    states: {
      STOPPED: "Watching stopped",
      STARTING: "Watching: starting",
      VERIFYING: "Verification in progress",
      WATCHING: "Watching active",
      PERIODIC: "Periodic verification",
      DEGRADED: "Watching degraded",
    },
    modes: {
      NATIVE: "system mechanism",
      PERIODIC: "full re-read at a fixed interval",
      NONE: "no active mechanism",
    },
    reasons: {
      INITIAL_CHECK: "full verification at startup",
      SIGNALS_LOST: "some signals were lost",
      QUEUE_SATURATED: "too many changes at once",
      SCOPE_UNSAFE: "the changed area could not be narrowed down",
      PERIODIC_CHECK: "periodic re-read",
      SOURCE_RETURNED: "the source is back",
      MORE_SIGNALS: "more changes arrived",
      RETRY: "trying again",
      NATIVE_UNSUPPORTED: "system watching is not available here",
      SOURCE_UNAVAILABLE: "the source is unavailable — last index kept",
      SOURCE_CHANGED: "the source was replaced — last index kept",
      SCAN_INCOMPLETE: "some items could not be read",
      APPLY_FAILED: "the update could not be applied",
      NEEDS_MANUAL_REFRESH: "“Refresh” is needed once",
    },
    pending: "changes are waiting",
  },
};

/** Le symbole qui accompagne les mots : aucun état n'est dit par la couleur seule. */
export function watchSymbol(state: WatchState): string {
  switch (state) {
    case "WATCHING":
      return "●";
    case "VERIFYING":
      return "↻";
    case "PERIODIC":
      return "⏱";
    case "STARTING":
      return "…";
    case "DEGRADED":
      return "⚠";
    default:
      return "○";
  }
}

/** La phrase unique d'un état, pour une preuve ou un lecteur d'écran. */
export function describeWatchStatus(status: WatchStatus, locale: Locale): string {
  const words = WATCH_STRINGS[locale];
  const reason = status.reason ? ` — ${words.reasons[status.reason]}` : "";
  return `${words.states[status.state]}${reason}`;
}

/** Un cerveau qui n'est pas surveillé (fixture, jamais indexé) ne montre rien. */
export function isWatchVisible(status: WatchStatus | null): status is WatchStatus {
  return status !== null && status.state !== "STOPPED";
}
