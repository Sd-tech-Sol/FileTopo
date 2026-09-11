import { describe, expect, it } from "vitest";
import app from "./MapApp.tsx?raw";
import {
  canonicalizeSearchQuery,
  runCoordinatedSearch,
  SearchCoordinator,
} from "./searchCoordinator";

interface FakePage {
  brainId: string;
  query: string;
  offset: number;
  indexRevision: number;
  marker: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("TASK-0034 corrective pass (ACTION-0052) — SearchCoordinator", () => {
  it("publishes only the most recent request when two responses settle in reverse order", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    const first = deferred<FakePage>();
    const second = deferred<FakePage>();

    const callbacks = (promise: Promise<FakePage>) => ({
      fetch: () => promise,
      onLoadingChange: () => {},
      onPage: (page: FakePage) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    const runA = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "A", offset: 0 }, callbacks(first.promise));
    const runAB = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "AB", offset: 0 }, callbacks(second.promise));

    // Settle out of order: request 2 (AB) lands before the stale request 1 (A).
    second.resolve({ brainId: "brain-a", query: "AB", offset: 0, indexRevision: 1, marker: "AB" });
    await runAB;
    first.resolve({ brainId: "brain-a", query: "A", offset: 0, indexRevision: 1, marker: "A" });
    await runA;

    expect(pages).toEqual([{ brainId: "brain-a", query: "AB", offset: 0, indexRevision: 1, marker: "AB" }]);
  });

  it("drops a late response from the previous brain after switching brains mid-search", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    const brainAResponse = deferred<FakePage>();

    const runOnA = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: () => brainAResponse.promise,
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    // Brain B becomes focused while brain A's search is still in flight.
    const runOnB = runCoordinatedSearch(coordinator, { brainId: "brain-b", query: "x", offset: 0 }, {
      fetch: async () => ({ brainId: "brain-b", query: "x", offset: 0, indexRevision: 1, marker: "B" }),
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });
    await runOnB;

    brainAResponse.resolve({ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "A" });
    await runOnA;

    expect(pages).toEqual([{ brainId: "brain-b", query: "x", offset: 0, indexRevision: 1, marker: "B" }]);
  });

  it("ignores a response that arrives after Clear invalidated its request", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    const loadingStates: boolean[] = [];
    const response = deferred<FakePage>();

    const run = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: () => response.promise,
      onLoadingChange: (loading) => loadingStates.push(loading),
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    coordinator.invalidate(); // Clear, fired while the request is still outstanding.
    response.resolve({ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "late" });
    await run;

    expect(pages).toEqual([]);
    expect(loadingStates).toEqual([true]);
  });

  it("lets only the latest request's settlement clear the loading flag", async () => {
    const coordinator = new SearchCoordinator();
    const loadingStates: boolean[] = [];
    const first = deferred<FakePage>();
    const second = deferred<FakePage>();

    const callbacks = (promise: Promise<FakePage>) => ({
      fetch: () => promise,
      onLoadingChange: (loading: boolean) => loadingStates.push(loading),
      onPage: () => {},
      onError: () => {},
      currentRevision: () => undefined,
    });

    const runFirst = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "A", offset: 0 }, callbacks(first.promise));
    const runSecond = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "AB", offset: 0 }, callbacks(second.promise));

    first.resolve({ brainId: "brain-a", query: "A", offset: 0, indexRevision: 1, marker: "A" });
    await runFirst;
    expect(loadingStates).toEqual([true, true]); // the stale request never publishes `false`

    second.resolve({ brainId: "brain-a", query: "AB", offset: 0, indexRevision: 1, marker: "AB" });
    await runSecond;
    expect(loadingStates).toEqual([true, true, false]);
  });

  it("drops a response whose revision no longer matches the caller's live revision", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    let liveRevision = 1;

    await runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: async () => {
        liveRevision = 2; // a refresh/rebuild advances the revision while the request is in flight
        return { brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "stale-revision" };
      },
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => liveRevision,
    });

    expect(pages).toEqual([]);
  });

  it("drops a response naming a different brain or query than the one it was asked for", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];

    await runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: async () => ({ brainId: "brain-b", query: "x", offset: 0, indexRevision: 1, marker: "wrong-brain" }),
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    expect(pages).toEqual([]);
  });

  it("drops a response whose offset doesn't match the request it was asked for", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];

    await runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 50 }, {
      fetch: async () => ({ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "wrong-offset" }),
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    expect(pages).toEqual([]);
  });

  it("does not surface an error from a request already superseded by Clear", async () => {
    const coordinator = new SearchCoordinator();
    const errors: unknown[] = [];
    const failing = deferred<FakePage>();

    const run = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "A", offset: 0 }, {
      fetch: () => failing.promise,
      onLoadingChange: () => {},
      onPage: () => {},
      onError: (error) => errors.push(error),
      currentRevision: () => undefined,
    });

    coordinator.invalidate();
    failing.reject(new Error("late failure"));
    await run;

    expect(errors).toEqual([]);
  });

  it("invalidates the in-flight request the instant intent changes to a new query, before that query's own search begins", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    const responseA = deferred<FakePage>();

    const runA = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "A", offset: 0 }, {
      fetch: () => responseA.promise,
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    // The user's keystroke changes intent to "AB" — invalidated right here,
    // exactly as `MapApp.tsx`'s `updateSearchQuery` does synchronously inside
    // the `onChange` handler. "AB"'s own search has not been launched yet:
    // that only happens once the resulting `useEffect` runs, on a later
    // render.
    coordinator.invalidate();

    // A's stale response arrives inside that window, before "AB" launches.
    responseA.resolve({ brainId: "brain-a", query: "A", offset: 0, indexRevision: 1, marker: "A" });
    await runA;
    expect(pages).toEqual([]);

    // "AB" now launches, as the effect would, and settles normally.
    await runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "AB", offset: 0 }, {
      fetch: async () => ({ brainId: "brain-a", query: "AB", offset: 0, indexRevision: 1, marker: "AB" }),
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });
    expect(pages).toEqual([{ brainId: "brain-a", query: "AB", offset: 0, indexRevision: 1, marker: "AB" }]);
  });

  it("invalidates the in-flight request the instant focus moves to another brain, before that brain's own search begins", async () => {
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    const responseA = deferred<FakePage>();

    const runOnA = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: () => responseA.promise,
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    // Focus moves to brain B — invalidated synchronously in `onFocusBrain`
    // (or `selectNode`/`changeProjection`), before brain B's own search is
    // launched by the effect reacting to the resulting state change.
    coordinator.invalidate();

    responseA.resolve({ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "A" });
    await runOnA;
    expect(pages).toEqual([]);
  });

  it("wires MapApp's search cycle through the coordinator instead of applying responses directly", () => {
    const block = app.slice(app.indexOf("// `TASK-0034` A — bounded local search"), app.indexOf("const goToSearchPage ="));
    expect(block).toContain("runCoordinatedSearch<SearchPage>(searchCoordinator");
    expect(block).toContain("canonicalizeSearchQuery(query)");
    expect(block).toContain("searchCoordinator.invalidate()");
    expect(block).not.toMatch(/setSearchPage\(page\)/);

    const clearBlock = app.slice(app.indexOf("const clearSearch ="), app.indexOf("const activateSearchHit ="));
    expect(clearBlock).toContain("searchCoordinator.invalidate()");

    // The activation-time revision guard stays as a defensive backstop.
    expect(app).toContain("currentRevision !== searchPage.indexRevision");
  });

  it("invalidates synchronously in the onChange handler, before the query state changes — not only in the effect that reacts to it", () => {
    const updateSearchQueryBlock = app.slice(
      app.indexOf("const updateSearchQuery = useCallback("),
      app.indexOf("// The query text is scoped to whichever brain is focused"),
    );
    const invalidateIdx = updateSearchQueryBlock.indexOf("searchCoordinator.invalidate()");
    const setIdx = updateSearchQueryBlock.indexOf("setSearchQuery(value)");
    expect(invalidateIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(invalidateIdx);

    expect(app).toContain("onChange={(event) => updateSearchQuery(event.target.value)}");
    expect(app).not.toMatch(/onChange=\{\(event\) => setSearchQuery\(event\.target\.value\)\}/);
  });

  it("invalidates synchronously wherever focus moves to another brain — onFocusBrain, selectNode, and changeProjection", () => {
    const onFocusBrainBlock = app.slice(
      app.indexOf("const onFocusBrain = useCallback("),
      app.indexOf("const changeProjection = useCallback("),
    );
    expect(onFocusBrainBlock).toContain("searchCoordinator.invalidate()");

    const changeProjectionBlock = app.slice(
      app.indexOf("const changeProjection = useCallback("),
      app.indexOf("const selectNode = useCallback("),
    );
    expect(changeProjectionBlock).toContain("searchCoordinator.invalidate()");

    const selectNodeBlock = app.slice(
      app.indexOf("const selectNode = useCallback("),
      app.indexOf("const selectInSelectedBrain = useCallback("),
    );
    expect(selectNodeBlock).toContain("searchCoordinator.invalidate()");
  });
});

describe("TASK-0034 corrective pass 3 (ACTION-0054) — central applyComposition focus-change gate", () => {
  it("invalidates the in-flight request the instant a composition transition moves focus off it — before that transition's own follow-up search begins", async () => {
    // Mirrors what MapApp.tsx's applyComposition gate does the moment
    // `removeBrain()` transfers focus off the brain being removed (or any
    // other composition transition that lands on a different focused
    // brain): invalidate the coordinator synchronously, before the
    // transition's own async work (loading the new brain, activating it)
    // and long before the `useEffect` that would otherwise clear the empty
    // search field for the newly focused brain.
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];
    const responseA = deferred<FakePage>();

    const runOnA = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: () => responseA.promise,
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });

    // Brain A (focused, searched) is removed; removeBrain() transfers focus
    // to brain B. applyComposition's central gate invalidates right here,
    // before it awaits loading brain B or activating it.
    coordinator.invalidate();

    responseA.resolve({ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "A" });
    await runOnA;
    expect(pages).toEqual([]);
  });

  it("does not invalidate a composition transition that keeps the same focused brain", async () => {
    // The gate's other half: refresh/rebuild/open on the same composition,
    // or adding a brain without moving focus, must not cancel a search that
    // has nothing to do with the transition.
    const coordinator = new SearchCoordinator();
    const pages: FakePage[] = [];

    const run = runCoordinatedSearch(coordinator, { brainId: "brain-a", query: "x", offset: 0 }, {
      fetch: async () => ({ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "unrelated-refresh" }),
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });
    // No `coordinator.invalidate()` here — a same-focus transition (e.g. a
    // toolbar "Actualiser" on the composition already displayed) must let
    // this search resolve normally.
    await run;

    expect(pages).toEqual([{ brainId: "brain-a", query: "x", offset: 0, indexRevision: 1, marker: "unrelated-refresh" }]);
  });

  it("guards applyComposition centrally, before its first `await`, rather than duplicating the check per caller", () => {
    const applyCompositionBlock = app.slice(
      app.indexOf("const applyComposition = useCallback("),
      app.indexOf("const refuse = useCallback("),
    );
    const guardIdx = applyCompositionBlock.indexOf("current.focusedBrainId !== next.focusedBrainId");
    const invalidateIdx = applyCompositionBlock.indexOf("searchCoordinator.invalidate()");
    const firstAwaitIdx = applyCompositionBlock.indexOf("await ");

    expect(guardIdx).toBeGreaterThan(-1);
    expect(invalidateIdx).toBeGreaterThan(guardIdx);
    expect(firstAwaitIdx).toBeGreaterThan(-1);
    expect(invalidateIdx).toBeLessThan(firstAwaitIdx);
  });

  it("routes removeBrain's focus-transferring transition through the central gate", () => {
    const onRemoveBrainBlock = app.slice(
      app.indexOf("const onRemoveBrain = useCallback("),
      app.indexOf("const onFocusBrain = useCallback("),
    );
    expect(onRemoveBrainBlock).toContain("applyComposition(removeBrain(current, order, brainId))");
  });

  it("routes navigateCross's not-yet-displayed-brain transition through the central gate", () => {
    const navigateCrossBlock = app.slice(
      app.indexOf("const navigateCross = useCallback("),
      app.indexOf("const runCrossCheck = useCallback("),
    );
    // `focusBrain(addBrain(current, order, brainId), order, brainId)` only
    // runs once `brainId` has just been established as NOT in
    // `current.displayedBrainIds` (see the early return above it in the
    // same callback) — so this composition's focus always differs from the
    // one applyComposition's gate reads as `current`.
    expect(navigateCrossBlock).toContain("focusBrain(addBrain(current, order, brainId), order, brainId)");
    expect(navigateCrossBlock).toContain("applyComposition(next,");
  });
});

describe("TASK-0034 corrective pass (ACTION-0053) — canonicalizeSearchQuery", () => {
  it("trims leading and trailing whitespace, matching the backend's trim()", () => {
    expect(canonicalizeSearchQuery(" rapport ")).toBe("rapport");
  });

  it("leaves an already-canonical query untouched", () => {
    expect(canonicalizeSearchQuery("rapport")).toBe("rapport");
  });

  it("truncates to 200 Unicode codepoints, matching the backend's SEARCH_QUERY_MAX_CHARS bound", () => {
    const long = "a".repeat(250);
    const canonical = canonicalizeSearchQuery(long);
    expect(canonical).toHaveLength(200);
    expect(canonical).toBe("a".repeat(200));
  });

  it("counts codepoints, not UTF-16 code units, so an astral character is never split in half", () => {
    const query = "\u{1F9ED}".repeat(201); // each is a surrogate pair — 402 UTF-16 units
    const canonical = canonicalizeSearchQuery(query);
    expect(Array.from(canonical)).toHaveLength(200);
    expect(canonical).toBe("\u{1F9ED}".repeat(200));
  });

  it("trims before bounding, same order as the backend", () => {
    const padded = ` ${"b".repeat(205)} `;
    expect(canonicalizeSearchQuery(padded)).toBe("b".repeat(200));
  });
});
