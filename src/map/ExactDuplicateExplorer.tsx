import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "../lib/locale";
import { formatDateTime, formatInteger } from "./localeText";
import type {
  BrainNodeRef,
  ExactDuplicateGroup,
  ExactDuplicateGroupPage,
  ExactDuplicateMemberPage,
  ExactDuplicateSummary,
} from "./types";

const GROUP_PAGE_LIMIT = 50;
const MEMBER_PAGE_LIMIT = 50;

/** `TASK-0046` — everything this explorer says, in one language. */
interface DuplicateStrings {
  dateUnavailable: string;
  zeroBytes: string;
  bytes: (formatted: string) => string;
  title: string;
  reading: string;
  observeFirst: string;
  groupsToggle: (total: number) => string;
  boundary: ReactNode;
  unavailable: string;
  notObserved: string;
  summary: (groups: number, occurrences: number, empty: number, date: string) => string;
  groupPage: (from: number, to: number, total: number, limit: number, max: number) => string;
  occurrences: (count: number, size: string) => string;
  emptyContent: string;
  previousGroups: string;
  nextGroups: string;
  membersLabel: string;
  emptyGroupTitle: string;
  membersTitle: string;
  size: string;
  occurrencesFact: string;
  algorithm: string;
  digest: string;
  observedOn: string;
  memberPage: (from: number, to: number, total: number, unresolved: number) => string;
  unresolvedMember: string;
  previousMembers: string;
  nextMembers: string;
}

export const DUPLICATE_STRINGS: Record<Locale, DuplicateStrings> = {
  fr: {
    dateUnavailable: "date indisponible",
    zeroBytes: "0 octet",
    bytes: (formatted) => `${formatted} octets`,
    title: "Contenus identiques",
    reading: "Lecture des observations…",
    observeFirst: "Observer le contenu d’abord",
    groupsToggle: (total) => `${total} groupe(s) de contenu identique`,
    boundary: (
      <>
        <strong>Contenu binaire identique observé.</strong> Cela ne prouve pas qu’il s’agit du
        même fichier physique ni d’une copie.
      </>
    ),
    unavailable: "Explorateur indisponible :",
    notObserved: "Lancez d’abord « Observer le contenu » pour créer une observation datée.",
    summary: (groups, occurrences, empty, date) =>
      `${groups} groupe(s), ${occurrences} occurrence(s), ${empty} groupe(s) vide(s). Observation du ${date}.`,
    groupPage: (from, to, total, limit, max) =>
      `Groupes ${from}–${to} sur ${total}; limite ${limit}/${max}.`,
    occurrences: (count, size) => `${count} occurrence(s) · ${size}`,
    emptyContent: " · contenu vide",
    previousGroups: "Groupes précédents",
    nextGroups: "Groupes suivants",
    membersLabel: "Membres du groupe",
    emptyGroupTitle: "Groupe de contenus vides",
    membersTitle: "Membres du groupe",
    size: "Taille",
    occurrencesFact: "Occurrences",
    algorithm: "Algorithme",
    digest: "Digest complet",
    observedOn: "Observé le",
    memberPage: (from, to, total, unresolved) =>
      `Membres ${from}–${to} sur ${total};` +
      (unresolved > 0
        ? ` ${unresolved} non résolu(s) sur cette page.`
        : " tous résolus sur cette page."),
    unresolvedMember: "— observation persistée, non résolue dans la carte courante",
    previousMembers: "Membres précédents",
    nextMembers: "Membres suivants",
  },
  en: {
    dateUnavailable: "date unavailable",
    zeroBytes: "0 bytes",
    bytes: (formatted) => `${formatted} bytes`,
    title: "Identical contents",
    reading: "Reading observations…",
    observeFirst: "Observe the content first",
    groupsToggle: (total) => `${total} group(s) of identical content`,
    boundary: (
      <>
        <strong>Identical binary content observed.</strong> This does not prove that it is the
        same physical file or a copy.
      </>
    ),
    unavailable: "Explorer unavailable:",
    notObserved: "First run “Observe content” to create a dated observation.",
    summary: (groups, occurrences, empty, date) =>
      `${groups} group(s), ${occurrences} occurrence(s), ${empty} empty group(s). Observed on ${date}.`,
    groupPage: (from, to, total, limit, max) =>
      `Groups ${from}–${to} of ${total}; limit ${limit}/${max}.`,
    occurrences: (count, size) => `${count} occurrence(s) · ${size}`,
    emptyContent: " · empty content",
    previousGroups: "Previous groups",
    nextGroups: "Next groups",
    membersLabel: "Group members",
    emptyGroupTitle: "Group of empty contents",
    membersTitle: "Group members",
    size: "Size",
    occurrencesFact: "Occurrences",
    algorithm: "Algorithm",
    digest: "Full digest",
    observedOn: "Observed on",
    memberPage: (from, to, total, unresolved) =>
      `Members ${from}–${to} of ${total};` +
      (unresolved > 0
        ? ` ${unresolved} unresolved on this page.`
        : " all resolved on this page."),
    unresolvedMember: "— persisted observation, not resolved in the current map",
    previousMembers: "Previous members",
    nextMembers: "Next members",
  },
};

function observedAt(unixMs: number | null, locale: Locale): string {
  return unixMs === null
    ? DUPLICATE_STRINGS[locale].dateUnavailable
    : formatDateTime(unixMs, locale);
}

function sizeLabel(bytes: number, locale: Locale): string {
  const words = DUPLICATE_STRINGS[locale];
  return bytes === 0 ? words.zeroBytes : words.bytes(formatInteger(bytes, locale));
}

interface Props {
  /** The interface language (`TASK-0046`). Not a dependency of any read. */
  locale: Locale;
  brainId: string | null;
  revision: number;
  onSelect: (reference: BrainNodeRef) => void;
}

export default function ExactDuplicateExplorer({ locale, brainId, revision, onSelect }: Props) {
  const words = DUPLICATE_STRINGS[locale];
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
    <section className="duplicates" aria-label={words.title} data-testid="duplicates">
      <h2 className="duplicates__title">{words.title}</h2>
      {loading && summary === null ? <p>{words.reading}</p> : null}
      {summary ? (
        <button
          type="button"
          className="duplicates__toggle"
          data-testid="open-duplicate-explorer"
          data-total-groups={total}
          aria-expanded={open}
          onClick={() => void toggle()}
        >
          {notObserved ? words.observeFirst : words.groupsToggle(total)}
        </button>
      ) : null}
      <p className="duplicates__boundary" data-testid="duplicate-boundary">
        {words.boundary}
      </p>
      {error ? (
        <p role="alert">
          {words.unavailable} {error}
        </p>
      ) : null}
      {open && notObserved ? (
        <p data-testid="duplicates-not-observed">
          {words.notObserved}
        </p>
      ) : null}
      {open && summary?.availability === "AVAILABLE" ? (
        <div className="duplicates__body">
          <p data-testid="duplicate-summary">
            {words.summary(
              summary.exactGroupCount,
              summary.groupedOccurrenceCount,
              summary.emptyGroupCount,
              observedAt(summary.observedAtUnixMs, locale),
            )}
          </p>
          {groups ? (
            <>
              <p data-testid="duplicate-group-page">
                {words.groupPage(
                  groups.returned === 0 ? 0 : groups.offset + 1,
                  groups.offset + groups.returned,
                  groups.totalGroups,
                  groups.limit,
                  groups.maxLimit,
                )}
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
                      {words.occurrences(group.memberCount, sizeLabel(group.sizeBytes, locale))}
                      {group.emptyContent ? words.emptyContent : ""}
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
                  {words.previousGroups}
                </button>
                <button
                  type="button"
                  data-testid="duplicate-groups-next"
                  disabled={!groups.hasMore || loading}
                  onClick={() => void loadGroups(groups.offset + groups.returned)}
                >
                  {words.nextGroups}
                </button>
              </div>
            </>
          ) : null}
          {active && members ? (
            <section className="duplicates__members" aria-label={words.membersLabel}>
              <h3>{active.emptyContent ? words.emptyGroupTitle : words.membersTitle}</h3>
              <dl className="duplicates__facts">
                <div><dt>{words.size}</dt><dd>{sizeLabel(active.sizeBytes, locale)}</dd></div>
                <div><dt>{words.occurrencesFact}</dt><dd>{active.memberCount}</dd></div>
                <div><dt>{words.algorithm}</dt><dd>{active.hashAlgorithm}</dd></div>
                <div><dt>{words.digest}</dt><dd><code data-testid="duplicate-digest">{active.hashHex}</code></dd></div>
                <div><dt>{words.observedOn}</dt><dd>{observedAt(active.observedAtUnixMs, locale)}</dd></div>
              </dl>
              <p data-testid="duplicate-member-page">
                {words.memberPage(
                  members.offset + 1,
                  members.offset + members.returned,
                  members.totalMembers,
                  members.unresolvedReturned,
                )}
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
                        {member.relativePath} {words.unresolvedMember}
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
                  {words.previousMembers}
                </button>
                <button
                  type="button"
                  data-testid="duplicate-members-next"
                  disabled={!members.hasMore || loading}
                  onClick={() => void loadMembers(active, members.offset + members.returned)}
                >
                  {words.nextMembers}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
