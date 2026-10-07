import type { BrainNodeRef } from "./types";
import { isStorableView } from "./resumeState";
import type { View } from "./viewState";

/**
 * L'espace de travail **global** — `TASK-0053`, `DEC-0051`, `F-052`.
 *
 * Ce que le cœur garde dans le catalogue (`catalog_meta`, une seule clé) et que
 * rien d'autre ne possède : les cerveaux affichés et celui qui a le focus, la
 * caméra et la sélection de ce qui est à l'écran quand il y en a plusieurs, la
 * légende, la densité, la préférence de mouvement et — si l'on ferme pendant ce
 * mode — le focus de branche et ses dossiers repliés.
 *
 * **Une seule vérité par valeur.** La branche, la sélection, la caméra, le filtre
 * et le panneau d'**un** cerveau restent à l'état de reprise (`resumeState.ts`) ;
 * la langue reste à son mécanisme existant (`DEC-0044`) ; le vu/non-vu garde son magasin. Rien de cela
 * n'est recopié ici : pour un cerveau seul hors focus de branche, `view` et
 * `selected` valent `null` — c'est le cerveau qui les possède.
 *
 * Ce module est pur : il ne connaît ni React ni Tauri. Il porte les types, l'analyse
 * **défensive** de ce que le cœur renvoie et {@link WorkspaceWriter}, l'écrivain
 * **borné** (même contrat que `ResumeWriter`) : une écriture en vol au plus, la
 * dernière valeur gagne, et une caméra qui bouge à chaque image ne fait jamais une
 * écriture par image.
 */

export type Density = "comfortable" | "compact";
export type Motion = "system" | "reduce";

export interface BranchFocusRecord {
  brainId: string;
  rootNodeId: number;
  collapsedIds: number[];
  /** La caméra de la composition d'où le focus a été pris ; `null` = ouverture normale. */
  savedView: View | null;
  /** La sélection à remettre en quittant le focus. */
  savedSelected: BrainNodeRef | null;
}

export interface WorkspaceState {
  displayedBrainIds: string[];
  focusedBrainId: string;
  view: View | null;
  selected: BrainNodeRef | null;
  legendOpen: boolean;
  density: Density;
  motion: Motion;
  branchFocus: BranchFocusRecord | null;
}

/** Une correction nommée du cœur. Mots fermés, jamais un nom ni un chemin. */
export type WorkspaceCorrection =
  | "RECORD_UNREADABLE"
  | "BRAIN_MISSING"
  | "COMPOSITION_FALLBACK"
  | "FOCUSED_BRAIN_MISSING"
  | "VIEW_COMPOSITION_CHANGED"
  | "SELECTION_BRAIN_NOT_DISPLAYED"
  | "SELECTION_GENERATION_CHANGED"
  | "SELECTION_MISSING"
  | "BRANCH_BRAIN_NOT_DISPLAYED"
  | "BRANCH_GENERATION_CHANGED"
  | "BRANCH_ROOT_INVALID"
  | "BRANCH_COLLAPSED_INVALID"
  | "BRANCH_SELECTION_OUTSIDE"
  | "BRANCH_SAVED_SELECTION_INVALID"
  // Deux corrections que seule l'interface peut constater : elle seule lit la branche.
  | "BRANCH_UNAVAILABLE"
  | "BRANCH_SELECTION_NOT_IN_VIEW";

export const WORKSPACE_CORRECTIONS: readonly WorkspaceCorrection[] = [
  "RECORD_UNREADABLE",
  "BRAIN_MISSING",
  "COMPOSITION_FALLBACK",
  "FOCUSED_BRAIN_MISSING",
  "VIEW_COMPOSITION_CHANGED",
  "SELECTION_BRAIN_NOT_DISPLAYED",
  "SELECTION_GENERATION_CHANGED",
  "SELECTION_MISSING",
  "BRANCH_BRAIN_NOT_DISPLAYED",
  "BRANCH_GENERATION_CHANGED",
  "BRANCH_ROOT_INVALID",
  "BRANCH_COLLAPSED_INVALID",
  "BRANCH_SELECTION_OUTSIDE",
  "BRANCH_SAVED_SELECTION_INVALID",
  "BRANCH_UNAVAILABLE",
  "BRANCH_SELECTION_NOT_IN_VIEW",
];

export interface WorkspaceRestore {
  workspace: WorkspaceState;
  corrections: WorkspaceCorrection[];
}

const DENSITIES: readonly Density[] = ["comfortable", "compact"];
const MOTIONS: readonly Motion[] = ["system", "reduce"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(value);
  return own.length === keys.length && keys.every((key) => key in value);
}

function parseNodeId(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 ? value : undefined;
}

function parseView(value: unknown): View | null | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["scale", "tx", "ty"]) ||
    typeof value.scale !== "number" ||
    typeof value.tx !== "number" ||
    typeof value.ty !== "number"
  ) {
    return undefined;
  }
  const view = { scale: value.scale, tx: value.tx, ty: value.ty };
  return isStorableView(view) ? view : undefined;
}

function parseRef(value: unknown): BrainNodeRef | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !hasExactKeys(value, ["brainId", "nodeId"])) return undefined;
  const nodeId = parseNodeId(value.nodeId);
  if (typeof value.brainId !== "string" || value.brainId === "" || nodeId === undefined) return undefined;
  return { brainId: value.brainId, nodeId };
}

function parseBranch(value: unknown): BranchFocusRecord | null | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["brainId", "rootNodeId", "collapsedIds", "savedView", "savedSelected"])
  ) {
    return undefined;
  }
  const rootNodeId = parseNodeId(value.rootNodeId);
  const savedView = parseView(value.savedView);
  const savedSelected = parseRef(value.savedSelected);
  if (
    typeof value.brainId !== "string" ||
    value.brainId === "" ||
    rootNodeId === undefined ||
    savedView === undefined ||
    savedSelected === undefined ||
    !Array.isArray(value.collapsedIds)
  ) {
    return undefined;
  }
  const collapsedIds: number[] = [];
  for (const raw of value.collapsedIds) {
    const id = parseNodeId(raw);
    if (id === undefined) return undefined;
    collapsedIds.push(id);
  }
  return { brainId: value.brainId, rootNodeId, collapsedIds, savedView, savedSelected };
}

/**
 * L'espace de travail tel que le cœur le renvoie, ou `null` si la forme n'est pas
 * **exactement** la nôtre. L'interface ne devine pas : une réponse malformée est
 * refusée et l'appelant retombe sur l'ouverture historique.
 */
export function parseWorkspaceState(payload: unknown): WorkspaceState | null {
  if (
    !isRecord(payload) ||
    !hasExactKeys(payload, [
      "displayedBrainIds",
      "focusedBrainId",
      "view",
      "selected",
      "legendOpen",
      "density",
      "motion",
      "branchFocus",
    ])
  ) {
    return null;
  }
  const displayed = payload.displayedBrainIds;
  if (
    !Array.isArray(displayed) ||
    displayed.length === 0 ||
    !displayed.every((id) => typeof id === "string" && id !== "") ||
    typeof payload.focusedBrainId !== "string" ||
    !displayed.includes(payload.focusedBrainId)
  ) {
    return null;
  }
  const view = parseView(payload.view);
  const selected = parseRef(payload.selected);
  const branchFocus = parseBranch(payload.branchFocus);
  if (view === undefined || selected === undefined || branchFocus === undefined) return null;
  if (typeof payload.legendOpen !== "boolean") return null;
  if (!DENSITIES.includes(payload.density as Density)) return null;
  if (!MOTIONS.includes(payload.motion as Motion)) return null;
  return {
    displayedBrainIds: [...(displayed as string[])],
    focusedBrainId: payload.focusedBrainId,
    view,
    selected,
    legendOpen: payload.legendOpen,
    density: payload.density as Density,
    motion: payload.motion as Motion,
    branchFocus,
  };
}

/** La réponse de `map_workspace_restore`, ou `null` si elle n'a pas la forme attendue. */
export function parseWorkspaceRestore(payload: unknown): WorkspaceRestore | null {
  if (!isRecord(payload)) return null;
  const workspace = parseWorkspaceState(payload.workspace);
  const corrections = payload.corrections;
  if (
    !workspace ||
    !Array.isArray(corrections) ||
    !corrections.every((word) => (WORKSPACE_CORRECTIONS as readonly unknown[]).includes(word))
  ) {
    return null;
  }
  return { workspace, corrections: corrections as WorkspaceCorrection[] };
}

const sameView = (a: View | null, b: View | null): boolean =>
  a === null || b === null ? a === b : a.scale === b.scale && a.tx === b.tx && a.ty === b.ty;

const sameRef = (a: BrainNodeRef | null, b: BrainNodeRef | null): boolean =>
  a === null || b === null ? a === b : a.brainId === b.brainId && a.nodeId === b.nodeId;

const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

function sameBranch(a: BranchFocusRecord | null, b: BranchFocusRecord | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.brainId === b.brainId &&
    a.rootNodeId === b.rootNodeId &&
    sameList(a.collapsedIds, b.collapsedIds) &&
    sameView(a.savedView, b.savedView) &&
    sameRef(a.savedSelected, b.savedSelected)
  );
}

export function sameWorkspace(a: WorkspaceState, b: WorkspaceState): boolean {
  return (
    sameList(a.displayedBrainIds, b.displayedBrainIds) &&
    a.focusedBrainId === b.focusedBrainId &&
    sameView(a.view, b.view) &&
    sameRef(a.selected, b.selected) &&
    a.legendOpen === b.legendOpen &&
    a.density === b.density &&
    a.motion === b.motion &&
    sameBranch(a.branchFocus, b.branchFocus)
  );
}

function cloneWorkspace(state: WorkspaceState): WorkspaceState {
  return {
    ...state,
    displayedBrainIds: [...state.displayedBrainIds],
    view: state.view ? { ...state.view } : null,
    selected: state.selected ? { ...state.selected } : null,
    branchFocus: state.branchFocus
      ? {
          ...state.branchFocus,
          collapsedIds: [...state.branchFocus.collapsedIds],
          savedView: state.branchFocus.savedView ? { ...state.branchFocus.savedView } : null,
          savedSelected: state.branchFocus.savedSelected ? { ...state.branchFocus.savedSelected } : null,
        }
      : null,
  };
}

/** Ce que l'interface a à l'écran, avant que la règle de propriété ne s'applique. */
export interface LiveWorkspace {
  displayedBrainIds: readonly string[];
  focusedBrainId: string;
  view: View | null;
  selected: BrainNodeRef | null;
  legendOpen: boolean;
  density: Density;
  motion: Motion;
  branch: {
    brainId: string;
    rootNodeId: number;
    collapsed: readonly number[];
    savedView: View | null;
    savedSelected: BrainNodeRef | null;
  } | null;
}

/**
 * L'état à écrire. **La règle de propriété** : pour un cerveau seul et sans focus de
 * branche, la caméra et la sélection sont celles du cerveau (état de reprise) et ne
 * sont pas recopiées ici. Une caméra non stockable est écrite `null`, jamais devinée.
 */
export function buildWorkspaceState(live: LiveWorkspace): WorkspaceState {
  const owned = live.displayedBrainIds.length > 1 || live.branch !== null;
  return {
    displayedBrainIds: [...live.displayedBrainIds],
    focusedBrainId: live.focusedBrainId,
    view: owned && live.view && isStorableView(live.view) ? { ...live.view } : null,
    selected: owned && live.selected ? { ...live.selected } : null,
    legendOpen: live.legendOpen,
    density: live.density,
    motion: live.motion,
    branchFocus: live.branch
      ? {
          brainId: live.branch.brainId,
          rootNodeId: live.branch.rootNodeId,
          collapsedIds: [...live.branch.collapsed],
          savedView: live.branch.savedView && isStorableView(live.branch.savedView) ? { ...live.branch.savedView } : null,
          savedSelected: live.branch.savedSelected ? { ...live.branch.savedSelected } : null,
        }
      : null,
  };
}

export interface WorkspaceWriterOptions {
  /** Écrit un état complet ; le cœur le valide, lie les références à l'Index et le stocke. */
  write: (state: WorkspaceState) => Promise<unknown>;
  /** Silence requis avant d'écrire un changement de caméra ou de sélection. */
  debounceMs?: number;
  /** Plafond : même un geste continu écrit au plus une fois par ce délai. */
  maxWaitMs?: number;
  onError?: (error: unknown) => void;
}

/**
 * L'écrivain de l'espace de travail — le contrat de `ResumeWriter`, pour **un**
 * enregistrement global.
 *
 * * un changement **explicite** (composition, focus, légende, densité, mouvement,
 *   branche, repli) part tout de suite (au tour suivant, pour fusionner ceux d'un
 *   même geste) : il atteint le magasin bien avant une fermeture normale ;
 * * un changement de **caméra ou de sélection** seul part après `debounceMs` de
 *   silence, ou au plus tard `maxWaitMs` après le premier changement non écrit —
 *   jamais une écriture par événement de pointeur ;
 * * une écriture en vol n'en déclenche pas une seconde en parallèle : la valeur la
 *   plus récente part quand la première a fini ;
 * * un échec est signalé et l'état reste sale : il repartira plus tard.
 *
 * Rien n'est écrit tant que l'état restauré n'a pas été posé par {@link seed} : une
 * valeur devinée ne remplace jamais ce que le cœur garde.
 */
export class WorkspaceWriter {
  private state: WorkspaceState | null = null;
  private dirty = false;
  private inflight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirtySince: number | null = null;
  private failed = false;
  /** Un changement explicite attend : un geste de caméra ne le repousse pas. */
  private urgent = false;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  /** Nombre d'écritures réellement envoyées (diagnostic et tests de budget). */
  writes = 0;

  constructor(private readonly options: WorkspaceWriterOptions) {
    this.debounceMs = options.debounceMs ?? 250;
    this.maxWaitMs = options.maxWaitMs ?? 1500;
  }

  isSeeded(): boolean {
    return this.state !== null;
  }

  current(): WorkspaceState | null {
    return this.state ? cloneWorkspace(this.state) : null;
  }

  /** Pose l'état que **le cœur vient de renvoyer** : il fait autorité, rien n'est sale. */
  seed(state: WorkspaceState): void {
    this.state = cloneWorkspace(state);
    this.dirty = false;
    this.dirtySince = null;
    this.urgent = false;
  }

  /** Enregistre l'état à l'écran ; ne fait rien s'il n'a pas changé ou s'il n'y a pas d'état restauré. */
  set(next: WorkspaceState): void {
    const known = this.state;
    if (!known || sameWorkspace(known, next)) return;
    const onlyCamera = sameWorkspace(known, { ...next, view: known.view, selected: known.selected });
    this.state = cloneWorkspace(next);
    if (!this.dirty) this.dirtySince = Date.now();
    this.dirty = true;
    if (!onlyCamera) this.urgent = true;
    this.schedule(this.urgent);
  }

  private schedule(immediate: boolean): void {
    const waited = this.dirtySince === null ? 0 : Date.now() - this.dirtySince;
    const delay = immediate ? 0 : Math.max(0, Math.min(this.debounceMs, this.maxWaitMs - waited));
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
  }

  /** Écrit maintenant la dernière valeur et attend que ce soit fait. */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.dirty || this.inflight) {
      if (this.inflight) {
        await this.inflight;
        if (this.failed) return;
        continue;
      }
      if (!this.state) return;
      this.dirty = false;
      this.dirtySince = null;
      this.urgent = false;
      const snapshot = cloneWorkspace(this.state);
      this.writes += 1;
      this.inflight = this.options
        .write(snapshot)
        .then(() => {
          this.failed = false;
        })
        .catch((error) => {
          this.dirty = true;
          this.dirtySince ??= Date.now();
          this.failed = true;
          this.options.onError?.(error);
        })
        .finally(() => {
          this.inflight = null;
        });
      await this.inflight;
      if (this.failed) {
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.flush();
        }, this.maxWaitMs);
        return;
      }
    }
  }

  hasPending(): boolean {
    return this.dirty || this.inflight !== null;
  }
}
