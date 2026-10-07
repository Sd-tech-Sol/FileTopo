import type { MapStrings } from "./mapStrings";
import type { Density, Motion, WorkspaceCorrection } from "./workspaceState";

/**
 * `TASK-0053` / `DEC-0051` — the two global preferences that only `F-052` owns, and the
 * non-blocking summary of what a restart had to correct.
 *
 * Native buttons with `aria-pressed`, like the language switch next to them: in the
 * keyboard order because of what they are, and the pressed one says which holds. The
 * summary is a plain `role="status"` region with a native button; it never takes focus.
 */

const DENSITIES: readonly Density[] = ["comfortable", "compact"];
const MOTIONS: readonly Motion[] = ["system", "reduce"];

interface WorkspacePreferencesProps {
  strings: MapStrings["workspace"];
  density: Density;
  motion: Motion;
  onDensity: (next: Density) => void;
  onMotion: (next: Motion) => void;
}

export function WorkspacePreferences({
  strings,
  density,
  motion,
  onDensity,
  onMotion,
}: WorkspacePreferencesProps) {
  return (
    <div className="app__preferences" role="group" aria-label={strings.preferences} data-testid="workspace-preferences">
      <div className="app__preference" role="group" aria-label={strings.density} data-testid="density-switch">
        <span className="app__preference-label" aria-hidden="true">
          {strings.density}
        </span>
        {DENSITIES.map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`density-${option}`}
            aria-pressed={density === option}
            onClick={() => onDensity(option)}
          >
            {strings.densityOptions[option]}
          </button>
        ))}
      </div>
      <div className="app__preference" role="group" aria-label={strings.motion} data-testid="motion-switch">
        <span className="app__preference-label" aria-hidden="true">
          {strings.motion}
        </span>
        {MOTIONS.map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`motion-${option}`}
            aria-pressed={motion === option}
            title={strings.motionHint}
            onClick={() => onMotion(option)}
          >
            {strings.motionOptions[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

interface WorkspaceCorrectionsProps {
  strings: MapStrings["workspace"];
  corrections: readonly WorkspaceCorrection[];
  onDismiss: () => void;
}

/** The corrections a restart made, each once, in the order the backend named them. */
export function WorkspaceCorrections({ strings, corrections, onDismiss }: WorkspaceCorrectionsProps) {
  if (corrections.length === 0) return null;
  return (
    <section
      className="app__corrections"
      role="status"
      aria-label={strings.correctionsTitle}
      data-testid="workspace-corrections"
      data-corrections={corrections.join(",")}
    >
      <strong>{strings.correctionsTitle}</strong>
      <ul>
        {corrections.map((word) => (
          <li key={word} data-correction={word}>
            {strings.corrections[word]}
          </li>
        ))}
      </ul>
      <button type="button" data-testid="workspace-corrections-dismiss" onClick={onDismiss}>
        {strings.correctionsDismiss}
      </button>
    </section>
  );
}
