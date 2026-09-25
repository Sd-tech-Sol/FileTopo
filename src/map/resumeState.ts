import { DEFAULT_FILTER, normalizeFilter } from "./filters";
import type { FilterAvailability, FilterKind, FilterState, MapProjection, NodeFilter } from "./types";
import type { View } from "./viewState";

/**
 * L'état de reprise **d'un cerveau** — `TASK-0044`, `DEC-0042`.
 *
 * Ce que le cœur garde dans le catalogue (`catalog_meta`, une clé par cerveau) :
 * la branche, la sélection, la caméra, le filtre **logique** et le panneau
 * Détails. Aucun chemin, aucun nom, aucune clé stable, aucun curseur, aucune
 * page : des identifiants, trois nombres et des mots fermés.
 *
 * Ce module est pur : il ne connaît ni React ni Tauri. Il porte
 *
 * * les types et l'analyse **défensive** de ce que le cœur renvoie ;
 * * {@link ResumeWriter}, l'écrivain **borné** : au plus une écriture en vol
 *   par cerveau, la dernière valeur l'emporte, et une caméra qui bouge à chaque
 *   image ne fait jamais une écriture par image.
 */

/** Bornes que le cœur applique aussi : un nombre hors bornes n'est pas le nôtre. */
export const MAX_NODE_ID = Number.MAX_SAFE_INTEGER;
export const MAX_VIEW_SCALE = 1.0e6;
export const MAX_VIEW_TRANSLATION = 1.0e9;

export interface ResumeState {
  /** La branche affichée ; `null` = la racine. */
  focusNodeId: number | null;
  /** L'élément sélectionné ; `null` = rien de retenu. */
  selectedNodeId: number | null;
  /** La caméra ; `null` = ouverture normale. */
  view: View | null;
  /** Le filtre **logique**. Jamais son curseur. */
  filter: NodeFilter;
  detailsPanelVisible: boolean;
}

/** Une correction que le cœur a dû faire en rouvrant ce cerveau. Mots fermés. */
export type ResumeCorrection = "FOCUS_MISSING" | "SELECTION_MISSING" | "SELECTION_NOT_A_MATCH";

/** Ce que renvoie `map_brain_resume_restore`. */
export interface ResumeRestore {
  resume: ResumeState;
  projection: MapProjection;
  /** Curseur **frais** de la révision courante, seulement pour un match hors page 1. */
  filterCursor: string | null;
  corrections: ResumeCorrection[];
}

export function defaultResumeState(detailsPanelVisible = true): ResumeState {
  return {
    focusNodeId: null,
    selectedNodeId: null,
    view: null,
    filter: { ...DEFAULT_FILTER, kinds: [] },
    detailsPanelVisible,
  };
}

const STATES: readonly FilterState[] = ["ALL", "NEW", "UNSEEN"];
const KINDS: readonly FilterKind[] = ["DIRECTORY", "FILE", "SKIPPED"];
const AVAILABILITIES: readonly FilterAvailability[] = ["ALL", "LOCAL", "ONLINE_ONLY"];
const CORRECTIONS: readonly string[] = ["FOCUS_MISSING", "SELECTION_MISSING", "SELECTION_NOT_A_MATCH"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => key in value);
}

function parseNodeId(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= MAX_NODE_ID) {
    return value;
  }
  return undefined;
}

/** `true` pour une caméra que le cœur accepterait : finie et dans les bornes. */
export function isStorableView(view: View): boolean {
  const shift = (value: number) => Number.isFinite(value) && Math.abs(value) <= MAX_VIEW_TRANSLATION;
  return (
    Number.isFinite(view.scale) &&
    view.scale > 0 &&
    view.scale <= MAX_VIEW_SCALE &&
    shift(view.tx) &&
    shift(view.ty)
  );
}

function parseFilter(value: unknown): NodeFilter | null {
  if (!isRecord(value) || !hasExactKeys(value, ["state", "kinds", "availability"])) return null;
  const { state, kinds, availability } = value;
  if (!STATES.includes(state as FilterState)) return null;
  if (!AVAILABILITIES.includes(availability as FilterAvailability)) return null;
  if (!Array.isArray(kinds) || !kinds.every((kind) => KINDS.includes(kind as FilterKind))) return null;
  return normalizeFilter({
    state: state as FilterState,
    kinds: kinds as FilterKind[],
    availability: availability as FilterAvailability,
  });
}

/**
 * L'état tel que le cœur le renvoie, ou `null` si la forme n'est pas **exactement**
 * la nôtre. L'interface ne devine pas : une réponse malformée est refusée, et
 * l'appelant retombe sur les valeurs par défaut.
 */
export function parseResumeState(payload: unknown): ResumeState | null {
  if (
    !isRecord(payload) ||
    !hasExactKeys(payload, ["focusNodeId", "selectedNodeId", "view", "filter", "detailsPanelVisible"])
  ) {
    return null;
  }
  const focusNodeId = parseNodeId(payload.focusNodeId);
  const selectedNodeId = parseNodeId(payload.selectedNodeId);
  const filter = parseFilter(payload.filter);
  if (focusNodeId === undefined || selectedNodeId === undefined || filter === null) return null;
  if (typeof payload.detailsPanelVisible !== "boolean") return null;
  let view: View | null = null;
  if (payload.view !== null) {
    const raw = payload.view;
    if (
      !isRecord(raw) ||
      !hasExactKeys(raw, ["scale", "tx", "ty"]) ||
      typeof raw.scale !== "number" ||
      typeof raw.tx !== "number" ||
      typeof raw.ty !== "number"
    ) {
      return null;
    }
    view = { scale: raw.scale, tx: raw.tx, ty: raw.ty };
    if (!isStorableView(view)) return null;
  }
  return { focusNodeId, selectedNodeId, view, filter, detailsPanelVisible: payload.detailsPanelVisible };
}

/** La réponse de `map_brain_resume_restore`, ou `null` si elle n'a pas la forme attendue. */
export function parseResumeRestore(payload: unknown, brainId: string): ResumeRestore | null {
  if (!isRecord(payload)) return null;
  const resume = parseResumeState(payload.resume);
  if (!resume) return null;
  const projection = payload.projection;
  if (
    !isRecord(projection) ||
    projection.brainId !== brainId ||
    !Array.isArray(projection.nodes) ||
    typeof projection.rootId !== "number"
  ) {
    return null;
  }
  const cursor = payload.filterCursor;
  if (cursor !== null && typeof cursor !== "string") return null;
  const corrections = payload.corrections;
  if (!Array.isArray(corrections) || !corrections.every((word) => CORRECTIONS.includes(word as string))) {
    return null;
  }
  return {
    resume,
    projection: projection as unknown as MapProjection,
    filterCursor: cursor,
    corrections: corrections as ResumeCorrection[],
  };
}

export function sameResumeState(a: ResumeState, b: ResumeState): boolean {
  return (
    a.focusNodeId === b.focusNodeId &&
    a.selectedNodeId === b.selectedNodeId &&
    a.detailsPanelVisible === b.detailsPanelVisible &&
    a.filter.state === b.filter.state &&
    a.filter.availability === b.filter.availability &&
    a.filter.kinds.length === b.filter.kinds.length &&
    a.filter.kinds.every((kind, index) => kind === b.filter.kinds[index]) &&
    (a.view === null || b.view === null
      ? a.view === b.view
      : a.view.scale === b.view.scale && a.view.tx === b.view.tx && a.view.ty === b.view.ty)
  );
}

function cloneState(state: ResumeState): ResumeState {
  return {
    ...state,
    view: state.view ? { ...state.view } : null,
    filter: { ...state.filter, kinds: [...state.filter.kinds] },
  };
}

/** Ce qu'un appelant change : les autres champs restent ceux de l'état connu. */
export type ResumePatch = Partial<ResumeState>;

export interface ResumeWriterOptions {
  /** Écrit un état complet ; le cœur le valide et le stocke. */
  write: (brainId: string, state: ResumeState) => Promise<unknown>;
  /** Lit l'état d'un cerveau, ou `null` s'il ne peut pas l'être. */
  read: (brainId: string) => Promise<ResumeState | null>;
  /** Silence requis avant d'écrire (une interaction terminée finit persistée). */
  debounceMs?: number;
  /** Plafond : même un geste continu écrit au plus une fois par ce délai. */
  maxWaitMs?: number;
  onError?: (brainId: string, error: unknown) => void;
}

interface Entry {
  state: ResumeState;
  dirty: boolean;
  inflight: Promise<void> | null;
  timer: ReturnType<typeof setTimeout> | null;
  /** Depuis quand l'état est sale sans avoir été écrit. */
  dirtySince: number | null;
  failed: boolean;
}

/**
 * L'écrivain de l'état de reprise : **une** mémoire par cerveau, **une** écriture
 * en vol par cerveau, la **dernière** valeur gagne.
 *
 * * `patch` fusionne dans l'état connu et ne fait rien si rien ne change ;
 * * une écriture part après `debounceMs` de silence, ou au plus tard
 *   `maxWaitMs` après le premier changement non écrit — jamais une par image ;
 * * `flush` écrit tout de suite la dernière valeur et attend l'écriture en vol :
 *   c'est ce qu'appelle une bascule de cerveau **avant** de changer de focus ;
 * * un patch reçu pendant une écriture n'en déclenche pas une seconde en
 *   parallèle : la valeur la plus récente part quand la première a fini ;
 * * un échec est signalé et l'état reste sale : il repartira au prochain tour.
 *
 * Ce n'est **pas** une promesse de cohérence sur crash : la preuve porte sur
 * une fermeture normale.
 */
export class ResumeWriter {
  private readonly entries = new Map<string, Entry>();
  private readonly loading = new Map<string, Promise<ResumeState>>();
  private readonly early = new Map<string, ResumePatch>();
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  /** Nombre d'écritures réellement envoyées, par cerveau (diagnostic et tests). */
  readonly writes = new Map<string, number>();

  constructor(private readonly options: ResumeWriterOptions) {
    this.debounceMs = options.debounceMs ?? 250;
    this.maxWaitMs = options.maxWaitMs ?? 1500;
  }

  /** Le cerveau a-t-il un état connu (lu ou restauré) ? Sinon un patch attendrait la lecture. */
  isKnown(brainId: string): boolean {
    return this.entries.has(brainId);
  }

  /** L'état connu, copié, ou `null`. */
  current(brainId: string): ResumeState | null {
    const entry = this.entries.get(brainId);
    return entry ? cloneState(entry.state) : null;
  }

  /**
   * Pose l'état que **le cœur vient de renvoyer** (restauration, lecture). Il fait
   * autorité, sauf s'il existe des changements locaux non écrits : ceux-là gagnent.
   */
  seed(brainId: string, state: ResumeState): void {
    const existing = this.entries.get(brainId);
    if (existing && (existing.dirty || existing.inflight)) return;
    this.entries.set(brainId, {
      state: cloneState(state),
      dirty: false,
      inflight: null,
      timer: existing?.timer ?? null,
      dirtySince: null,
      failed: false,
    });
    const early = this.early.get(brainId);
    if (early) {
      this.early.delete(brainId);
      this.patch(brainId, early);
    }
  }

  /** L'état d'un cerveau : celui qu'on connaît déjà, sinon une lecture (une seule à la fois). */
  load(brainId: string): Promise<ResumeState> {
    const entry = this.entries.get(brainId);
    if (entry) return Promise.resolve(cloneState(entry.state));
    const pending = this.loading.get(brainId);
    if (pending) return pending;
    const read = this.options
      .read(brainId)
      .catch(() => null)
      .then((state) => {
        this.loading.delete(brainId);
        this.seed(brainId, state ?? defaultResumeState());
        return this.current(brainId) ?? defaultResumeState();
      });
    this.loading.set(brainId, read);
    return read;
  }

  /**
   * Fusionne un changement. Un cerveau dont l'état n'est pas encore connu le
   * lit d'abord : le changement est gardé et appliqué à l'arrivée, jamais perdu
   * et jamais écrit sur des valeurs par défaut devinées.
   */
  patch(brainId: string, patch: ResumePatch, options: { immediate?: boolean } = {}): void {
    const entry = this.entries.get(brainId);
    if (!entry) {
      this.early.set(brainId, { ...this.early.get(brainId), ...patch });
      void this.load(brainId);
      return;
    }
    const next: ResumeState = cloneState({ ...entry.state, ...patch });
    if (patch.filter) next.filter = normalizeFilter(patch.filter);
    if (sameResumeState(entry.state, next)) return;
    entry.state = next;
    if (!entry.dirty) entry.dirtySince = Date.now();
    entry.dirty = true;
    this.schedule(brainId, entry, options.immediate === true);
  }

  private schedule(brainId: string, entry: Entry, immediate: boolean): void {
    if (entry.timer !== null) clearTimeout(entry.timer);
    const waited = entry.dirtySince === null ? 0 : Date.now() - entry.dirtySince;
    const delay = immediate ? 0 : Math.max(0, Math.min(this.debounceMs, this.maxWaitMs - waited));
    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this.flush(brainId);
    }, delay);
  }

  /** Écrit maintenant la dernière valeur d'un cerveau et attend que ce soit fait. */
  async flush(brainId: string): Promise<void> {
    const entry = this.entries.get(brainId);
    if (!entry) return;
    if (entry.timer !== null) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    // Une écriture en vol finit d'abord : jamais deux en parallèle pour un cerveau.
    while (entry.dirty || entry.inflight) {
      if (entry.inflight) {
        await entry.inflight;
        if (entry.failed) return;
        continue;
      }
      entry.dirty = false;
      entry.dirtySince = null;
      const snapshot = cloneState(entry.state);
      this.writes.set(brainId, (this.writes.get(brainId) ?? 0) + 1);
      entry.inflight = this.options
        .write(brainId, snapshot)
        .then(() => {
          entry.failed = false;
        })
        .catch((error) => {
          // Rien n'est perdu : l'état reste sale et repartira au prochain tour.
          entry.dirty = true;
          entry.dirtySince ??= Date.now();
          entry.failed = true;
          this.options.onError?.(brainId, error);
        })
        .finally(() => {
          entry.inflight = null;
        });
      await entry.inflight;
      if (entry.failed) {
        // Une nouvelle tentative, mais lente : un échec durable ne fait pas de boucle serrée.
        entry.timer = setTimeout(() => {
          entry.timer = null;
          void this.flush(brainId);
        }, this.maxWaitMs);
        return;
      }
    }
  }

  /** Écrit tous les cerveaux qui ont quelque chose en attente. */
  async flushAll(): Promise<void> {
    await Promise.all([...this.entries.keys()].map((brainId) => this.flush(brainId)));
  }

  /** Vrai si une valeur attend d'être écrite ou est en cours d'écriture. */
  hasPending(brainId?: string): boolean {
    const test = (entry: Entry) => entry.dirty || entry.inflight !== null;
    if (brainId !== undefined) {
      const entry = this.entries.get(brainId);
      return entry ? test(entry) : false;
    }
    return [...this.entries.values()].some(test);
  }
}
