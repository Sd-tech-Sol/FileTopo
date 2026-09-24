import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { BrainNodeRef, MarkNodeSeenResult, NodeChangeState as NodeChangeStateDto } from "./types";

/**
 * « Nouveau » / « Non vu » / « Vu » of the selected element — `TASK-0038` E,
 * `DEC-0036`, `P-17`.
 *
 * The state is **read**, never computed here: it comes from the brain's own
 * journal through `map_node_change_state`, and the panel names the element by a
 * {@link BrainNodeRef} — no path, no key. Three rules the code keeps rather
 * than describes:
 *
 * * **Displaying or selecting an element never marks it seen.** The only
 *   mutation is the explicit button, and it exists only for an unseen element;
 * * **The state is never carried across brains or elements.** A response that
 *   names another brain or another node is refused, and a stale one (the
 *   selection moved on while it was in flight) is dropped;
 * * **The state is never conveyed by colour alone.** Each one has a word and a
 *   symbol.
 */

interface Props {
  /** The current selection; `null` renders nothing. */
  reference: BrainNodeRef | null;
  /** The brain's current Index revision: a change of it re-reads the state. */
  revision: number | null;
  /**
   * Bumped by whoever else marked something seen (the journal panel): the
   * state is then re-read from the backend rather than guessed.
   */
  seenRevision?: number;
  /** Called after this panel marked the element seen, so siblings re-read. */
  onSeenChange?: () => void;
}

const STATE_LABELS = {
  new: "Nouveau",
  unseen: "Non vu",
  seen: "Vu",
} as const;

const STATE_SYMBOLS = { new: "★", unseen: "●", seen: "✓" } as const;

/** `new` wins over `unseen`: a new element is, by definition, also unseen. */
export function nodeStateKind(state: Pick<NodeChangeStateDto, "isNew" | "isUnseen">) {
  return state.isNew ? "new" : state.isUnseen ? "unseen" : "seen";
}

export default function NodeChangeState({
  reference,
  revision,
  seenRevision = 0,
  onSeenChange,
}: Props) {
  const [state, setState] = useState<NodeChangeStateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const ticket = useRef(0);

  const brainId = reference?.brainId ?? null;
  const nodeId = reference?.nodeId ?? null;

  // Another brain or another element: nothing of the previous one is kept.
  useEffect(() => {
    ticket.current += 1;
    setState(null);
    setError(null);
    setBusy(false);
  }, [brainId, nodeId]);

  useEffect(() => {
    if (brainId === null || nodeId === null) return;
    const mine = ++ticket.current;
    invoke<NodeChangeStateDto>("map_node_change_state", { reference: { brainId, nodeId } })
      .then((next) => {
        if (mine !== ticket.current) return;
        if (next.brainId !== brainId || next.nodeId !== nodeId) {
          setState(null);
          setError("état d'un autre élément refusé");
          return;
        }
        setError(null);
        setState(next);
      })
      .catch((reason) => {
        if (mine !== ticket.current) return;
        setState(null);
        setError(String(reason));
      });
  }, [brainId, nodeId, revision, seenRevision, reload]);

  if (reference === null) return null;

  async function markSeen() {
    if (brainId === null || nodeId === null || busy) return;
    const mine = ticket.current;
    setBusy(true);
    setError(null);
    try {
      const result = await invoke<MarkNodeSeenResult>("map_node_mark_seen", {
        reference: { brainId, nodeId },
      });
      if (result.brainId !== brainId || result.nodeId !== nodeId) {
        if (mine === ticket.current) setError("réponse d'un autre élément refusée");
        return;
      }
      // The backend did acknowledge *this* element, even if the selection has
      // moved on since: siblings must re-read. This panel re-reads from the
      // backend too — it never assumes the new state.
      setReload((current) => current + 1);
      onSeenChange?.();
    } catch (reason) {
      if (mine === ticket.current) setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  const kind = state ? nodeStateKind(state) : null;

  return (
    <div className="node-state" data-testid="node-change-state">
      {state && kind ? (
        <p
          className={`node-state__badge node-state__badge--${kind}`}
          data-testid="node-state-badge"
          data-state={kind}
          data-unseen-count={state.unseenChangeCount}
        >
          <span aria-hidden="true">{STATE_SYMBOLS[kind]}</span> {STATE_LABELS[kind]}
          {state.isUnseen
            ? ` · ${state.unseenChangeCount} changement(s) non vu(s)`
            : ""}
        </p>
      ) : null}
      {state?.isUnseen ? (
        <button
          type="button"
          data-testid="node-mark-seen"
          disabled={busy}
          onClick={() => void markSeen()}
        >
          {busy ? "Marquage…" : "Marquer cet élément vu"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" data-testid="node-state-error">
          État de changement indisponible : {error}
        </p>
      ) : null}
    </div>
  );
}
