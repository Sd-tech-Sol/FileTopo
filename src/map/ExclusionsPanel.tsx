/**
 * `TASK-0048` — the focused brain's exact-subtree exclusions.
 *
 * The backend owns canonicalisation and persistence. This component publishes
 * only the record returned by `map_brain_exclusions_replace`; a refused rule
 * never appears optimistically in the list.
 */
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../lib/locale";
import type { ExclusionPolicyState } from "./types";

interface Props {
  brainId: string;
  locale: Locale;
  disabled: boolean;
  onApplied: (brainId: string) => Promise<void> | void;
}

const WORDS = {
  fr: {
    title: "Exclusions",
    explanation: "Chaque règle couvre ce sous-arbre relatif et tous ses descendants.",
    safety: "Les liens symboliques et points d’analyse ne sont jamais suivis.",
    label: "Chemin relatif du sous-arbre",
    placeholder: "ex. cache/temporaire",
    add: "Ajouter",
    adding: "Application…",
    remove: (rule: string) => `Retirer ${rule}`,
    empty: "Aucune exclusion configurée.",
    pending: "Politique enregistrée — application requise; le dernier index fiable reste ouvert.",
    unavailable: "Politique indisponible :",
  },
  en: {
    title: "Exclusions",
    explanation: "Each rule covers this relative subtree and all its descendants.",
    safety: "Symbolic links and reparse points are never followed.",
    label: "Relative subtree path",
    placeholder: "e.g. cache/temporary",
    add: "Add",
    adding: "Applying…",
    remove: (rule: string) => `Remove ${rule}`,
    empty: "No exclusion configured.",
    pending: "Policy saved — application required; the last reliable index remains open.",
    unavailable: "Policy unavailable:",
  },
} as const;

export default function ExclusionsPanel({ brainId, locale, disabled, onApplied }: Props) {
  const words = WORDS[locale];
  const [policy, setPolicy] = useState<ExclusionPolicyState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const ticket = ++request.current;
    setPolicy(null);
    setDraft("");
    setError(null);
    void invoke<ExclusionPolicyState>("map_brain_exclusions", { brainId })
      .then((record) => {
        if (ticket === request.current && record.brainId === brainId) setPolicy(record);
      })
      .catch((reason) => {
        if (ticket === request.current) setError(String(reason));
      });
  }, [brainId]);

  const replace = async (rules: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const record = await invoke<ExclusionPolicyState>("map_brain_exclusions_replace", {
        brainId,
        rules,
      });
      if (record.brainId !== brainId) throw new Error("map_exclusion_policy_brain_mismatch");
      setPolicy(record);
      if (!record.applicationRequired) await onApplied(brainId);
      return true;
    } catch (reason) {
      setError(String(reason));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!policy) return;
    if (await replace([...policy.rules, draft])) setDraft("");
  };

  const remove = async (rule: string) => {
    if (!policy) return;
    if (await replace(policy.rules.filter((candidate) => candidate !== rule))) {
      requestAnimationFrame(() => input.current?.focus());
    }
  };

  return (
    <section className="exclusions" aria-labelledby="exclusions-title" data-testid="exclusions">
      <h2 id="exclusions-title">{words.title}</h2>
      <p>{words.explanation}</p>
      <p className="exclusions__safety">{words.safety}</p>
      {policy?.applicationRequired ? (
        <p className="exclusions__pending" role="status" data-testid="exclusions-pending">
          {words.pending}
        </p>
      ) : null}
      {policy && policy.rules.length > 0 ? (
        <ul className="exclusions__list" data-testid="exclusions-list">
          {policy.rules.map((rule) => (
            <li key={rule}>
              <code>{rule}</code>
              <button
                type="button"
                data-testid={`exclusions-remove-${rule}`}
                aria-label={words.remove(rule)}
                disabled={disabled || busy}
                onClick={() => void remove(rule)}
              >
                {locale === "fr" ? "Retirer" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : policy ? (
        <p className="exclusions__empty">{words.empty}</p>
      ) : null}
      <form className="exclusions__form" onSubmit={(event) => void add(event)}>
        <label htmlFor="exclusion-rule">{words.label}</label>
        <div>
          <input
            ref={input}
            type="text"
            id="exclusion-rule"
            data-testid="exclusions-input"
            value={draft}
            placeholder={words.placeholder}
            disabled={disabled || busy || !policy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "exclusions-error" : undefined}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <button
            type="submit"
            data-testid="exclusions-add"
            disabled={disabled || busy || !policy}
          >
            {busy ? words.adding : words.add}
          </button>
        </div>
      </form>
      {error ? (
        <p id="exclusions-error" className="exclusions__error" role="alert" data-testid="exclusions-error">
          {words.unavailable} {error}
        </p>
      ) : null}
    </section>
  );
}
