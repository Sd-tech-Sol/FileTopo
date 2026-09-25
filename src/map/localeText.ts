import type { Locale } from "../lib/locale";

/**
 * Small shared helpers for the surfaces that show text in the current locale —
 * `TASK-0046`, `DEC-0044`.
 *
 * This is **not** a second i18n system. The locale itself, its resolution and its
 * single persisted key all stay in `src/lib/locale.ts`; every surface keeps its own
 * typed `Record<Locale, …>` dictionary. What lives here is only what several of
 * them would otherwise each rewrite: the `Intl` tag of a locale, and the shape of a
 * status line that has to be able to change language after it was said.
 */

export type { Locale } from "../lib/locale";

/** The `Intl` tag used for dates and numbers. Region `CA`, as everywhere before. */
export function intlTag(locale: Locale): string {
  return locale === "fr" ? "fr-CA" : "en-CA";
}

export function formatDateTime(unixMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(unixMs),
  );
}

export function formatInteger(value: number, locale: Locale): string {
  return value.toLocaleString(intlTag(locale));
}

/**
 * A line the interface said in some language — resolved against the locale **at
 * render time**, so a status set in French reads in English the moment the person
 * switches, without the page having to say it again.
 *
 * A bare `string` is text that has no translation to make: a backend diagnostic, a
 * message an automated run wrote for its own log.
 */
export type StatusMessage = string | ((locale: Locale) => string);

export function resolveStatus(message: StatusMessage, locale: Locale): string {
  return typeof message === "function" ? message(locale) : message;
}

/** A two-language line, for the few places that say one sentence once. */
export function bilingual(fr: string, en: string): (locale: Locale) => string {
  return (locale) => (locale === "fr" ? fr : en);
}

/** English plural of a regular noun, French plural of a regular noun. */
export function plural(locale: Locale, count: number, one: string, many: string): string {
  // French counts 0 and 1 as singular; English only 1.
  const singular = locale === "fr" ? count === 0 || count === 1 : count === 1;
  return singular ? one : many;
}

/**
 * An internal invariant that can reach the status line as a detail, and that knows how
 * to say itself in either language. Its `message` is English: it is what a log shows.
 */
export class LocalizedError extends Error {
  readonly say: (locale: Locale) => string;
  constructor(say: (locale: Locale) => string) {
    super(say("en"));
    this.name = "LocalizedError";
    this.say = say;
  }
}

/**
 * The detail of a failure as a person reads it: a {@link LocalizedError} in the current
 * language, anything else — a backend diagnostic — exactly as it came (`DEC-0044` §7).
 */
export function describeError(error: unknown, locale: Locale): string {
  return error instanceof LocalizedError ? error.say(locale) : String(error);
}
