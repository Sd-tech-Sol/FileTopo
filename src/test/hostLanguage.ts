import { afterEach, beforeEach, vi, type MockInstance } from "vitest";

/**
 * `TASK-0046` — tests that render the real `MapApp` and assert its French wording say so
 * explicitly, the way a French system would: through the host's advertised languages.
 *
 * Deliberately **not** through `localStorage`: a stored `filetopo.locale` is an explicit
 * choice, and several suites also assert that nothing else ever touches the browser's
 * storage (`TASK-0044`). The host language leaves the storage empty.
 */
export function withHostLanguages(languages: readonly string[]): void {
  const spies: MockInstance[] = [];
  beforeEach(() => {
    spies.push(vi.spyOn(window.navigator, "languages", "get").mockReturnValue(languages));
    spies.push(
      vi.spyOn(window.navigator, "language", "get").mockReturnValue(languages[0] ?? ""),
    );
  });
  afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
  });
}
