import type { SourceObservation, SourceReason, SourceState } from "./types";

/**
 * « État de la source » — `TASK-0042`, `DEC-0040` §6 and §7.
 *
 * It shows the **last observation** of a brain's source, never a real-time
 * availability: the wording says « à la dernière vérification » / "at last check",
 * and no sentence here claims that a drive is available *now*. Opening a map
 * never touches the source, so this can only repeat what the last explicit
 * **Actualiser** saw.
 *
 * Every state carries a **word and a symbol**, never a colour alone. The reason is
 * one of a closed list of phrases; there is no place in this component where a
 * path, a key or an operating-system message could be shown, because none of them
 * exists in {@link SourceObservation}.
 *
 * FR and EN, like the other panels: the caller passes the locale, and both
 * dictionaries are exhaustive over the closed sets (a missing word is a compile
 * error, not a blank).
 */

type Locale = "fr" | "en";

export interface SourceObservationStrings {
  title: string;
  states: Record<SourceState, string>;
  reasons: Record<SourceReason, string>;
  lastObserved: (instant: string) => string;
  neverObserved: string;
  lastIndexRevision: (revision: number) => string;
  notPersisted: string;
}

export const SOURCE_OBSERVATION_STRINGS: Record<Locale, SourceObservationStrings> = {
  fr: {
    title: "État de la source",
    states: {
      SYNCED: "À jour à la dernière vérification",
      UNAVAILABLE: "Source indisponible — dernier index conservé",
      SOURCE_CHANGED: "Source remplacée ou différente — dernier index conservé",
      SCAN_INCOMPLETE: "Vérification incomplète — dernier index conservé",
      APPLY_FAILED: "Mise à jour non appliquée — dernier index conservé",
      UNKNOWN: "Source non vérifiée",
    },
    reasons: {
      ROOT_NOT_FOUND: "le dossier est introuvable",
      ROOT_ACCESS_DENIED: "l'accès au dossier est refusé",
      ROOT_METADATA_UNAVAILABLE: "le dossier n'a pas pu être lu (lecteur ou réseau indisponible)",
      ROOT_NOT_DIRECTORY: "la racine n'est plus un dossier",
      ROOT_REPARSE_POINT: "la racine est devenue un lien",
      ROOT_IDENTITY_CHANGED:
        "ce n'est plus le même dossier — « Reconstruire l'index » permet de l'accepter",
      SCAN_DIAGNOSTICS: "certains éléments n'ont pas pu être lus",
      FINGERPRINT_DRIFT: "la source a changé pendant la lecture",
      FINGERPRINT_FAILED: "la source n'a pas pu être relue de façon fiable",
      RECONCILE_REFUSED: "la comparaison avec l'index a été refusée",
      APPLY_REFUSED: "l'application des changements a été refusée",
      IDENTITY_REFUSED: "les identités relevées sont incohérentes",
      STORE_WRITE_FAILED: "l'écriture dans l'index a échoué",
    },
    lastObserved: (instant) => `Dernière observation : ${instant}`,
    neverObserved: "Aucune observation enregistrée",
    lastIndexRevision: (revision) => `dernier index synchronisé : révision ${revision}`,
    notPersisted: "non enregistrée sur ce poste",
  },
  en: {
    title: "Source state",
    states: {
      SYNCED: "Up to date at last check",
      UNAVAILABLE: "Source unavailable — last index kept",
      SOURCE_CHANGED: "Source replaced or different — last index kept",
      SCAN_INCOMPLETE: "Check incomplete — last index kept",
      APPLY_FAILED: "Update not applied — last index kept",
      UNKNOWN: "Source not checked",
    },
    reasons: {
      ROOT_NOT_FOUND: "the folder cannot be found",
      ROOT_ACCESS_DENIED: "access to the folder is denied",
      ROOT_METADATA_UNAVAILABLE: "the folder could not be read (drive or network unavailable)",
      ROOT_NOT_DIRECTORY: "the root is no longer a folder",
      ROOT_REPARSE_POINT: "the root has become a link",
      ROOT_IDENTITY_CHANGED:
        "it is no longer the same folder — “Rebuild index” can accept it",
      SCAN_DIAGNOSTICS: "some items could not be read",
      FINGERPRINT_DRIFT: "the source changed while it was being read",
      FINGERPRINT_FAILED: "the source could not be re-read reliably",
      RECONCILE_REFUSED: "the comparison with the index was refused",
      APPLY_REFUSED: "applying the changes was refused",
      IDENTITY_REFUSED: "the observed identities are inconsistent",
      STORE_WRITE_FAILED: "writing to the index failed",
    },
    lastObserved: (instant) => `Last observation: ${instant}`,
    neverObserved: "No observation recorded",
    lastIndexRevision: (revision) => `last synchronised index: revision ${revision}`,
    notPersisted: "not saved on this computer",
  },
};

/** The symbol that accompanies the words, so no state is conveyed by colour alone. */
export function sourceStateSymbol(state: SourceState): string {
  switch (state) {
    case "SYNCED":
      return "✓";
    case "UNKNOWN":
      return "?";
    default:
      return "⚠";
  }
}

function formatInstant(unixMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs));
}

/** The one-sentence description of an observation, for a proof or a screen reader. */
export function describeSourceObservation(
  observation: SourceObservation,
  locale: Locale,
): string {
  const words = SOURCE_OBSERVATION_STRINGS[locale];
  const reason = observation.reason ? ` — ${words.reasons[observation.reason]}` : "";
  return `${words.states[observation.state]}${reason}`;
}

export default function SourceObservationBadge({
  observation,
  locale,
}: {
  /** `null` while nothing is loaded yet: rendered as « Source non vérifiée ». */
  observation: SourceObservation | null;
  locale: Locale;
}) {
  const words = SOURCE_OBSERVATION_STRINGS[locale];
  const shown: SourceObservation = observation ?? {
    state: "UNKNOWN",
    reason: null,
    observedUnixMs: null,
    lastSuccessfulRevision: null,
    lastSuccessfulUnixMs: null,
    persisted: true,
  };
  const failure = shown.state !== "SYNCED" && shown.state !== "UNKNOWN";
  return (
    <span
      className="source-observation"
      data-testid="source-observation"
      data-state={shown.state}
      data-reason={shown.reason ?? ""}
      data-persisted={String(shown.persisted)}
      role={failure ? "alert" : "status"}
      lang={locale}
      aria-label={words.title}
    >
      <span aria-hidden="true" className="source-observation__symbol">
        {sourceStateSymbol(shown.state)}
      </span>
      <strong className="source-observation__state">{words.states[shown.state]}</strong>
      {shown.reason ? (
        <span className="source-observation__reason" data-testid="source-observation-reason">
          {words.reasons[shown.reason]}
        </span>
      ) : null}
      <span className="source-observation__when" data-testid="source-observation-when">
        {shown.observedUnixMs === null
          ? words.neverObserved
          : words.lastObserved(formatInstant(shown.observedUnixMs, locale))}
        {failure && shown.lastSuccessfulRevision !== null
          ? ` · ${words.lastIndexRevision(shown.lastSuccessfulRevision)}`
          : ""}
        {shown.persisted ? "" : ` · ${words.notPersisted}`}
      </span>
    </span>
  );
}
