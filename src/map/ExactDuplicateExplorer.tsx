import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type {
  BrainNodeRef,
  ExactDuplicateGroup,
  ExactDuplicateGroupPage,
  ExactDuplicateMemberPage,
  ExactDuplicateSummary,
} from "./types";

const GROUP_PAGE_LIMIT = 50;
const MEMBER_PAGE_LIMIT = 50;

function observedAt(unixMs: number | null): string {
  return unixMs === null
    ? "date indisponible"
    : new Intl.DateTimeFormat("fr-CA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(unixMs));
}

function sizeLabel(bytes: number): string {
  if (bytes === 0) return "0 octet";
  return `${bytes.toLocaleString("fr-CA")} octets`;
}

interface Props {
  brainId: string | null;
  revision: number;
  onSelect: (reference: BrainNodeRef) => void;
}

export default function ExactDuplicateExplorer({ brainId, revision, onSelect }: Props) {
  const [summary, setSummary] = useState<ExactDuplicateSummary | null>(null);
  const [groups, setGroups] = useState<ExactDuplicateGroupPage | null>(null);
  const [members, setMembers] = useState<ExactDuplicateMemberPage | null>(null);
  const [active, setActive] = useState<ExactDuplicateGroup | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setGroups(null);
    setMembers(null);
    setActive(null);
    setOpen(false);
    setError(null);
    if (!brainId) {
      setSummary(null);
      return () => {
        live = false;
      };
    }
    setLoading(true);
    invoke<ExactDuplicateSummary>("map_exact_duplicate_summary", { brainId })
      .then((next) => live && setSummary(next))
      .catch((reason) => live && setError(String(reason)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [brainId, revision]);

  async function loadGroups(offset: number) {
    if (!brainId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await invoke<ExactDuplicateGroupPage>("map_exact_duplicate_groups", {
        brainId,
        offset,
        limit: GROUP_PAGE_LIMIT,
      });
      setGroups(page);
      setMembers(null);
      setActive(null);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && summary?.availability === "AVAILABLE" && groups === null) {
      await loadGroups(0);
    }
  }

  async function loadMembers(group: ExactDuplicateGroup, offset: number) {
    if (!brainId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await invoke<ExactDuplicateMemberPage>("map_exact_duplicate_members", {
        brainId,
        groupId: group.groupId,
        offset,
        limit: MEMBER_PAGE_LIMIT,
      });
      setActive(group);
      setMembers(page);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }

  const total = summary?.exactGroupCount ?? 0;
  const notObserved = summary?.availability === "NOT_OBSERVED";

  return (
    <section className="duplicates" aria-label="Contenus identiques" data-testid="duplicates">
      <h2 className="duplicates__title">Contenus identiques</h2>
      {loading && summary === null ? <p>Lecture des observations…</p> : null}
      {summary ? (
        <button
          type="button"
          className="duplicates__toggle"
          data-testid="open-duplicate-explorer"
          data-total-groups={total}
          aria-expanded={open}
          onClick={() => void toggle()}
        >
          {notObserved
            ? "Observer le contenu d’abord"
            : `${total} groupe(s) de contenu identique`}
        </button>
      ) : null}
      <p className="duplicates__boundary" data-testid="duplicate-boundary">
        <strong>Contenu binaire identique observé.</strong> Cela ne prouve pas qu’il s’agit du
        même fichier physique ni d’une copie.
      </p>
      {error ? <p role="alert">Explorateur indisponible : {error}</p> : null}
      {open && notObserved ? (
        <p data-testid="duplicates-not-observed">
          Lancez d’abord « Observer le contenu » pour créer une observation datée.
        </p>
      ) : null}
      {open && summary?.availability === "AVAILABLE" ? (
        <div className="duplicates__body">
          <p data-testid="duplicate-summary">
            {summary.exactGroupCount} groupe(s), {summary.groupedOccurrenceCount} occurrence(s),{" "}
            {summary.emptyGroupCount} groupe(s) vide(s). Observation du {observedAt(summary.observedAtUnixMs)}.
          </p>
          {groups ? (
            <>
              <p data-testid="duplicate-group-page">
                Groupes {groups.returned === 0 ? 0 : groups.offset + 1}–
                {groups.offset + groups.returned} sur {groups.totalGroups}; limite {groups.limit}/{groups.maxLimit}.
              </p>
              <ul className="duplicates__groups">
                {groups.groups.map((group) => (
                  <li key={group.groupId}>
                    <button
                      type="button"
                      className="duplicates__group"
                      data-testid="duplicate-group"
                      data-group-id={group.groupId}
                      aria-pressed={active?.groupId === group.groupId}
                      onClick={() => void loadMembers(group, 0)}
                    >
                      {group.memberCount} occurrence(s) · {sizeLabel(group.sizeBytes)}
                      {group.emptyContent ? " · contenu vide" : ""}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="duplicates__paging">
                <button
                  type="button"
                  disabled={groups.offset === 0 || loading}
                  onClick={() => void loadGroups(Math.max(0, groups.offset - groups.limit))}
                >
                  Groupes précédents
                </button>
                <button
                  type="button"
                  data-testid="duplicate-groups-next"
                  disabled={!groups.hasMore || loading}
                  onClick={() => void loadGroups(groups.offset + groups.returned)}
                >
                  Groupes suivants
                </button>
              </div>
            </>
          ) : null}
          {active && members ? (
            <section className="duplicates__members" aria-label="Membres du groupe">
              <h3>{active.emptyContent ? "Groupe de contenus vides" : "Membres du groupe"}</h3>
              <dl className="duplicates__facts">
                <div><dt>Taille</dt><dd>{sizeLabel(active.sizeBytes)}</dd></div>
                <div><dt>Occurrences</dt><dd>{active.memberCount}</dd></div>
                <div><dt>Algorithme</dt><dd>{active.hashAlgorithm}</dd></div>
                <div><dt>Digest complet</dt><dd><code data-testid="duplicate-digest">{active.hashHex}</code></dd></div>
                <div><dt>Observé le</dt><dd>{observedAt(active.observedAtUnixMs)}</dd></div>
              </dl>
              <p data-testid="duplicate-member-page">
                Membres {members.offset + 1}–{members.offset + members.returned} sur {members.totalMembers};
                {members.unresolvedReturned > 0
                  ? ` ${members.unresolvedReturned} non résolu(s) sur cette page.`
                  : " tous résolus sur cette page."}
              </p>
              <ul className="duplicates__member-list">
                {members.members.map((member) => (
                  <li key={member.relativePath}>
                    {member.nodeRef ? (
                      <button
                        type="button"
                        data-testid="duplicate-member"
                        onClick={() => onSelect(member.nodeRef!)}
                      >
                        {member.relativePath}
                      </button>
                    ) : (
                      <span data-testid="duplicate-member-unresolved">
                        {member.relativePath} — observation persistée, non résolue dans la carte courante
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="duplicates__paging">
                <button
                  type="button"
                  disabled={members.offset === 0 || loading}
                  onClick={() => void loadMembers(active, Math.max(0, members.offset - members.limit))}
                >
                  Membres précédents
                </button>
                <button
                  type="button"
                  data-testid="duplicate-members-next"
                  disabled={!members.hasMore || loading}
                  onClick={() => void loadMembers(active, members.offset + members.returned)}
                >
                  Membres suivants
                </button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
