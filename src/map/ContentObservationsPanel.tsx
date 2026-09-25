import type { Locale } from "../lib/locale";
import type { ContentObservation, ContentObservationSummary } from "./types";

function formatObservedInstant(unixMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixMs));
}

export interface ContentObservationStrings {
  title: string;
  none: string;
  last: string;
  digest: string;
  observedAt: string;
  generation: string;
  otherOccurrence: string;
  otherOccurrences: string;
  noRelation: string;
  unreadable: string;
  unstable: string;
  unsupported: string;
  loading: string;
}

export const CONTENT_OBSERVATION_STRINGS: Record<Locale, ContentObservationStrings> = {
  fr: {
    title: "Observations de contenu",
    none: "Contenu non observé",
    last: "Dernière observation enregistrée",
    digest: "SHA-256 observé",
    observedAt: "Observé le",
    generation: "Génération",
    otherOccurrence: "autre occurrence du même contenu dans ce cerveau",
    otherOccurrences: "autres occurrences du même contenu dans ce cerveau",
    noRelation: "Cette observation ne crée aucune relation.",
    unreadable: "Le fichier était illisible pendant l’observation. Aucun hash valide n’est publié.",
    unstable:
      "Le fichier a changé pendant la lecture. Aucun hash valide n’est publié.",
    unsupported: "Ce fichier n’est pas pris en charge. Aucun hash valide n’est publié.",
    loading: "Lecture de la dernière observation…",
  },
  en: {
    title: "Content observations",
    none: "Content not observed",
    last: "Last recorded observation",
    digest: "Observed SHA-256",
    observedAt: "Observed on",
    generation: "Generation",
    otherOccurrence: "other occurrence of the same content in this brain",
    otherOccurrences: "other occurrences of the same content in this brain",
    noRelation: "This observation creates no relation.",
    unreadable: "The file was unreadable during observation. No valid hash is published.",
    unstable: "The file changed during reading. No valid hash is published.",
    unsupported: "This file is unsupported. No valid hash is published.",
    loading: "Reading the last observation…",
  },
};

interface Props {
  observation: ContentObservation | null;
  summary: ContentObservationSummary | null;
  identicalMemberCount: number;
  loading: boolean;
  observedThisSession: boolean;
  locale: Locale;
}

export default function ContentObservationsPanel({
  observation,
  summary,
  identicalMemberCount,
  loading,
  observedThisSession,
  locale,
}: Props) {
  const strings = CONTENT_OBSERVATION_STRINGS[locale];
  const otherCount = Math.max(0, identicalMemberCount - 1);

  return (
    <section className="content-observations" aria-label={strings.title} data-testid="content-observations">
      <h3 className="details__subtitle">{strings.title}</h3>
      {loading ? <p className="details__empty">{strings.loading}</p> : null}
      {!loading && !observation ? <p className="details__empty">{strings.none}</p> : null}
      {!loading && observation ? (
        <>
          {!observedThisSession && summary?.currentGenerationId ? (
            <p className="content-observations__last">{strings.last}</p>
          ) : null}
          {observation.observationStatus === "HASHED" && observation.hashHex ? (
            <dl className="details__list">
              <div className="details__row">
                <dt>{strings.digest}</dt>
                <dd>
                  <code className="content-observations__digest" data-testid="content-digest">
                    {observation.hashHex}
                  </code>
                </dd>
              </div>
              <div className="details__row">
                <dt>{strings.observedAt}</dt>
                <dd>{formatObservedInstant(observation.observedAtUnixMs, locale)}</dd>
              </div>
              <div className="details__row">
                <dt>{strings.generation}</dt>
                <dd className="details__path">{observation.generationId}</dd>
              </div>
            </dl>
          ) : null}
          {observation.observationStatus === "UNREADABLE" ? <p>{strings.unreadable}</p> : null}
          {observation.observationStatus === "UNSTABLE_DURING_READ" ? (
            <p>{strings.unstable}</p>
          ) : null}
          {observation.observationStatus === "UNSUPPORTED" ? <p>{strings.unsupported}</p> : null}
          {otherCount > 0 ? (
            <p data-testid="content-other-count">
              {otherCount} {otherCount === 1 ? strings.otherOccurrence : strings.otherOccurrences}
            </p>
          ) : null}
          <p className="content-observations__boundary">{strings.noRelation}</p>
        </>
      ) : null}
    </section>
  );
}
