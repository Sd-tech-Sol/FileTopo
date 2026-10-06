import { useEffect, useRef } from "react";
import type { Locale } from "../lib/locale";
import { canCollapse, canFocusBranch, collapsedCounts, type BranchFocusState } from "./branchFocus";
import type { MapNode } from "./types";

/**
 * `TASK-0052` / `DEC-0050` — the controls of branch focus and collapse.
 *
 * Native buttons only, so Enter and Space work and the focus order is the page's
 * own. **Words and glyphs, never colour alone:** a focused branch is announced
 * as « Branche focalisée » with its path, a collapsed folder as « replié » with
 * its exact hidden count.
 *
 * **Collapse is not « Voir la suite ».** The aggregates of the map say that more
 * *direct children* exist than the budget showed, and they page; a collapse is a
 * decision about one folder and carries an exact count of *every* descendant it
 * hides. Different words, different controls, different fields.
 *
 * **Focus never falls on `body`.** Entering moves it to « Quitter le focus »;
 * leaving puts it back on « Focaliser la branche »; collapsing and expanding
 * keep it on the same button, whose label changes. No control is `disabled`
 * while a branch loads — a disabled button drops the focus; a call that arrives
 * during a load is ignored by the owner instead.
 */
export interface BranchFocusStrings {
  title: string;
  focusBranch: string;
  focusNeedsFolder: string;
  focused: string;
  path: (path: string) => string;
  shown: (count: number) => string;
  exit: string;
  collapse: (name: string) => string;
  expand: (name: string, hidden: number) => string;
  collapseNeedsFolder: string;
  rootCannotCollapse: string;
  collapsedList: string;
  collapsedState: string;
  hidden: (count: number) => string;
  expandOne: (name: string) => string;
  otherBrains: string;
  sessionOnly: string;
  busy: string;
}

export const BRANCH_FOCUS_STRINGS: Record<Locale, BranchFocusStrings> = {
  fr: {
    title: "Focus de branche",
    focusBranch: "Focaliser la branche",
    focusNeedsFolder: "Sélectionnez un dossier pour focaliser sa branche.",
    focused: "Branche focalisée",
    path: (path) => `Chemin : ${path}`,
    shown: (count) => `${count} élément${count > 1 ? "s" : ""} affiché${count > 1 ? "s" : ""}`,
    exit: "Quitter le focus",
    collapse: (name) => `Replier ${name}`,
    expand: (name, hidden) =>
      `Déplier ${name} — ${hidden} descendant${hidden > 1 ? "s" : ""} masqué${hidden > 1 ? "s" : ""}`,
    collapseNeedsFolder: "Sélectionnez un dossier de la branche pour le replier ou le déplier.",
    rootCannotCollapse: "La racine de la branche focalisée ne se replie pas.",
    collapsedList: "Dossiers repliés",
    collapsedState: "replié",
    hidden: (count) => `${count} descendant${count > 1 ? "s" : ""} masqué${count > 1 ? "s" : ""}`,
    expandOne: (name) => `Déplier ${name}`,
    otherBrains: "Seule cette branche est affichée ; les autres territoires reviennent à la sortie.",
    sessionOnly: "Cet état n'est pas conservé après un redémarrage.",
    busy: "Chargement de la branche…",
  },
  en: {
    title: "Branch focus",
    focusBranch: "Focus branch",
    focusNeedsFolder: "Select a folder to focus its branch.",
    focused: "Focused branch",
    path: (path) => `Path: ${path}`,
    shown: (count) => `${count} item${count === 1 ? "" : "s"} shown`,
    exit: "Exit branch focus",
    collapse: (name) => `Collapse ${name}`,
    expand: (name, hidden) =>
      `Expand ${name} — ${hidden} hidden descendant${hidden === 1 ? "" : "s"}`,
    collapseNeedsFolder: "Select a folder of the branch to collapse or expand it.",
    rootCannotCollapse: "The root of the focused branch cannot be collapsed.",
    collapsedList: "Collapsed folders",
    collapsedState: "collapsed",
    hidden: (count) => `${count} hidden descendant${count === 1 ? "" : "s"}`,
    expandOne: (name) => `Expand ${name}`,
    otherBrains: "Only this branch is shown; the other territories come back on exit.",
    sessionOnly: "This state is not kept after a restart.",
    busy: "Loading the branch…",
  },
};

interface BranchFocusPanelProps {
  locale: Locale;
  active: BranchFocusState | null;
  /**
   * The selected node **of the focused brain**, read from the hierarchy being
   * drawn: the branch's own while focused, the ordinary one otherwise.
   */
  selectedNode: MapNode | null;
  busy: boolean;
  onFocus: (nodeId: number) => void;
  onExit: () => void;
  onToggle: (nodeId: number) => void;
}

export default function BranchFocusPanel({
  locale,
  active,
  selectedNode,
  busy,
  onFocus,
  onExit,
  onToggle,
}: BranchFocusPanelProps) {
  const words = BRANCH_FOCUS_STRINGS[locale];
  const exitButton = useRef<HTMLButtonElement | null>(null);
  const focusButton = useRef<HTMLButtonElement | null>(null);
  const toggleButton = useRef<HTMLButtonElement | null>(null);
  const wasActive = useRef(false);
  const isActive = active !== null;
  useEffect(() => {
    if (isActive && !wasActive.current) exitButton.current?.focus();
    if (!isActive && wasActive.current) focusButton.current?.focus();
    wasActive.current = isActive;
  }, [isActive]);
  // After an expansion from the list the entry is gone: focus goes to the toggle as soon as
  // the owner has selected the expanded folder and the toggle is usable again.
  const focusToggleNext = useRef(false);
  const selectedId = selectedNode?.id ?? null;
  useEffect(() => {
    if (!focusToggleNext.current) return;
    const toggle = toggleButton.current;
    if (toggle && !toggle.disabled) {
      toggle.focus();
      focusToggleNext.current = false;
    }
  }, [selectedId, active]);

  if (!active) {
    const possible = canFocusBranch(selectedNode);
    return (
      <section aria-label={words.title} data-testid="branch-focus-panel" data-branch-active="false">
        <button
          type="button"
          ref={focusButton}
          data-testid="branch-focus"
          disabled={!possible}
          aria-busy={busy}
          onClick={() => selectedNode && onFocus(selectedNode.id)}
        >
          {words.focusBranch}
        </button>
        {possible ? null : <p data-testid="branch-focus-hint">{words.focusNeedsFolder}</p>}
      </section>
    );
  }

  const counts = collapsedCounts(active.snapshot);
  const rootNode = active.hierarchy.byId.get(active.rootNodeId);
  const isCollapsed = selectedNode ? counts.has(selectedNode.id) : false;
  const toggleable = canCollapse(selectedNode, active.rootNodeId, isCollapsed);
  const toggleLabel =
    selectedNode && toggleable
      ? isCollapsed
        ? words.expand(selectedNode.name, counts.get(selectedNode.id) ?? 0)
        : words.collapse(selectedNode.name)
      : words.collapse(selectedNode?.name ?? "…");
  const collapsedNodes = [...counts.keys()]
    .map((id) => active.hierarchy.byId.get(id))
    .filter((node): node is MapNode => node !== undefined);

  return (
    <section
      aria-label={words.title}
      data-testid="branch-focus-panel"
      data-branch-active="true"
      data-branch-root-id={active.rootNodeId}
    >
      <p data-testid="branch-focus-banner" role="status">
        <strong>◆ {words.focused}</strong> — {words.shown(active.snapshot.materializedCount)}
      </p>
      <p data-testid="branch-focus-path">{words.path(rootNode?.relativePath || rootNode?.name || "/")}</p>
      <p>{words.otherBrains}</p>
      <p>{words.sessionOnly}</p>
      <button type="button" ref={exitButton} data-testid="branch-exit" aria-busy={busy} onClick={onExit}>
        {words.exit}
      </button>
      <button
        type="button"
        ref={toggleButton}
        data-testid="branch-toggle"
        data-collapsed={isCollapsed ? "true" : "false"}
        disabled={!toggleable}
        aria-busy={busy}
        onClick={() => selectedNode && onToggle(selectedNode.id)}
      >
        {toggleLabel}
      </button>
      {toggleable ? null : (
        <p data-testid="branch-toggle-hint">
          {selectedNode && selectedNode.id === active.rootNodeId
            ? words.rootCannotCollapse
            : words.collapseNeedsFolder}
        </p>
      )}
      {busy ? <p aria-live="polite">{words.busy}</p> : null}
      {collapsedNodes.length > 0 ? (
        <div>
          <h3>{words.collapsedList}</h3>
          <ul data-testid="branch-collapsed-list">
            {collapsedNodes.map((node) => (
              <li
                key={node.id}
                data-testid="branch-collapsed-item"
                data-node-id={node.id}
                data-hidden-descendant-count={counts.get(node.id)}
              >
                ▸ {node.name} — {words.collapsedState}, {words.hidden(counts.get(node.id) ?? 0)}{" "}
                <button
                  type="button"
                  data-testid="branch-expand-one"
                  data-node-id={node.id}
                  aria-busy={busy}
                  onClick={() => {
                    onToggle(node.id);
                    // The list item goes away with the expansion. Until the toggle can
                    // take the focus (the folder gets selected), the exit control holds
                    // it: the focus never falls to `body`.
                    focusToggleNext.current = true;
                    if (toggleButton.current && !toggleButton.current.disabled) {
                      toggleButton.current.focus();
                    } else {
                      exitButton.current?.focus();
                    }
                  }}
                >
                  {words.expandOne(node.name)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
