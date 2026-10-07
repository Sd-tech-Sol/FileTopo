/**
 * `TASK-0052` / `DEC-0050` — the session-only state of branch focus and collapse.
 *
 * **Persistence belongs to the global workspace (`TASK-0053`, `F-052`).** This module
 * holds the live state; `MapApp` writes the arguments of the branch (brain, root,
 * collapsed ids) and what leaving it puts back to the workspace record, never to the
 * per-brain resume state, never to a browser store. The backend binds them to the
 * Index generation they were read from, so a rebuild abandons the focus.
 *
 * **The backend materialises the branch.** `map_branch_view` returns a real
 * bounded projection that holds the focused folder and its descendants only.
 * This module never hides anything: it holds the arguments of that command
 * (which folder, which folders are collapsed) and what to put back on exit.
 *
 * **Nothing here touches `loaded`, `composed` or the catalogue.** Entering the
 * focus shows one brain by *deriving* what is drawn; leaving drops that
 * derivation. That is why the previous composition, camera and selection come
 * back exactly: they were never replaced.
 */

import type { Hierarchy } from "./hierarchy";
import type { BrainNodeRef, MapNode, MapProjection } from "./types";
import type { View } from "./viewState";

export interface BranchFocusState {
  brainId: string;
  /** The focused folder. */
  rootNodeId: number;
  /** Collapsed folder ids, in the order they were collapsed. */
  collapsed: readonly number[];
  /** The page of the focused folder's children the view is on (`null` = the first). */
  after: string | null;
  /** The composition this focus was entered from; any other composition leaves it. */
  composedKey: string;
  /** The projection the backend materialised for exactly these arguments. */
  snapshot: MapProjection;
  hierarchy: Hierarchy;
  /** What leaving the focus puts back. */
  saved: {
    /** `null` when a restart could not vouch for it: the composition is then fitted. */
    view: View | null;
    selected: BrainNodeRef | null;
    /** The Index revision the focus was entered on. */
    indexRevision: number;
  };
}

/** A folder can be focused; a file or a skipped entry cannot. */
export function canFocusBranch(node: MapNode | undefined | null): boolean {
  return node !== undefined && node !== null && (node.kind === "directory" || node.kind === "root");
}

/**
 * Whether a node may be collapsed: a visible folder with something to hide. The
 * focused root is a visible folder like any other (`DEC-0050` §L). An already
 * collapsed folder can always be expanded.
 */
export function canCollapse(node: MapNode | undefined | null, alreadyCollapsed: boolean): boolean {
  if (!node) return false;
  if (alreadyCollapsed) return true;
  return (node.kind === "directory" || node.kind === "root") && node.childCount > 0;
}

/** The new collapsed list after toggling one folder. Other folders are untouched. */
export function toggledCollapsed(collapsed: readonly number[], nodeId: number): number[] {
  return collapsed.includes(nodeId)
    ? collapsed.filter((id) => id !== nodeId)
    : [...collapsed, nodeId];
}

/** The collapsed folders **of the current view**, with their exact hidden counts. */
export function collapsedCounts(snapshot: MapProjection): ReadonlyMap<number, number> {
  return new Map(
    (snapshot.branch?.collapsed ?? []).map((entry) => [entry.nodeId, entry.hiddenDescendantCount]),
  );
}
