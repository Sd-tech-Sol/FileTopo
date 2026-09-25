import type { Locale } from "../lib/locale";
import type { WatchStatus } from "./types";
import { WATCH_STRINGS, isWatchVisible, watchSymbol } from "./watchStatus";

/**
 * « Surveillance automatique » — `TASK-0043`, `DEC-0041` §7 et §8.
 *
 * Dit **comment** la carte est tenue à jour, jamais qu'elle l'est : « Surveillance
 * active » veut dire que le mécanisme du système est ouvert et que la dernière
 * vérification a convergé, pas que rien n'a changé depuis. Les quatre états que la
 * personne doit pouvoir distinguer ont chacun leur mot **et** leur symbole — jamais la
 * couleur seule :
 *
 * * Surveillance active (`WATCHING`, mécanisme du système) ;
 * * Vérification en cours (`VERIFYING`) ;
 * * Vérification périodique (`PERIODIC`) — jamais présentée comme « active » ;
 * * Surveillance dégradée (`DEGRADED`), avec sa raison fermée.
 *
 * Le badge « État de la source » (`SourceObservationBadge`) reste **séparé** : il dit ce
 * que la dernière observation de la source a vu, pas comment on la suit.
 *
 * Aucun chemin, aucun nom : il n'y en a nulle part dans {@link WatchStatus}.
 */
export default function WatchStatusBadge({
  status,
  locale,
}: {
  /** `null` tant que rien n'est connu ; un cerveau non surveillé ne montre rien. */
  status: WatchStatus | null;
  locale: Locale;
}) {
  if (!isWatchVisible(status)) return null;
  const words = WATCH_STRINGS[locale];
  const degraded = status.state === "DEGRADED";
  return (
    <span
      className="watch-status"
      data-testid="watch-status"
      data-state={status.state}
      data-mode={status.mode}
      data-reason={status.reason ?? ""}
      data-revision={status.indexRevision ?? ""}
      data-pending={String(status.pending)}
      role={degraded ? "alert" : "status"}
      aria-live={degraded ? "assertive" : "polite"}
      lang={locale}
      aria-label={words.title}
    >
      <span aria-hidden="true" className="watch-status__symbol">
        {watchSymbol(status.state)}
      </span>
      <strong className="watch-status__state">{words.states[status.state]}</strong>
      <span className="watch-status__mode" data-testid="watch-status-mode">
        {words.modes[status.mode]}
      </span>
      {status.reason ? (
        <span className="watch-status__reason" data-testid="watch-status-reason">
          {words.reasons[status.reason]}
        </span>
      ) : null}
      {status.pending ? (
        <span className="watch-status__pending">{words.pending}</span>
      ) : null}
    </span>
  );
}
