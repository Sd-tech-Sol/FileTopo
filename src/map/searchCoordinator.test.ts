import { describe, expect, it } from "vitest";
import app from "./MapApp.tsx?raw";
import { runCoordinatedSearch, SearchCoordinator } from "./searchCoordinator";

interface FakePage {
  brainId: string;
  query: string;
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
    second.resolve({ brainId: "brain-a", query: "AB", indexRevision: 1, marker: "AB" });
    await runAB;
    first.resolve({ brainId: "brain-a", query: "A", indexRevision: 1, marker: "A" });
    await runA;

    expect(pages).toEqual([{ brainId: "brain-a", query: "AB", indexRevision: 1, marker: "AB" }]);
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
      fetch: async () => ({ brainId: "brain-b", query: "x", indexRevision: 1, marker: "B" }),
      onLoadingChange: () => {},
      onPage: (page) => pages.push(page),
      onError: () => {},
      currentRevision: () => undefined,
    });
    await runOnB;

    brainAResponse.resolve({ brainId: "brain-a", query: "x", indexRevision: 1, marker: "A" });
    await runOnA;

    expect(pages).toEqual([{ brainId: "brain-b", query: "x", indexRevision: 1, marker: "B" }]);
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
    response.resolve({ brainId: "brain-a", query: "x", indexRevision: 1, marker: "late" });
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

    first.resolve({ brainId: "brain-a", query: "A", indexRevision: 1, marker: "A" });
    await runFirst;
    expect(loadingStates).toEqual([true, true]); // the stale request never publishes `false`

    second.resolve({ brainId: "brain-a", query: "AB", indexRevision: 1, marker: "AB" });
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
        return { brainId: "brain-a", query: "x", indexRevision: 1, marker: "stale-revision" };
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
      fetch: async () => ({ brainId: "brain-b", query: "x", indexRevision: 1, marker: "wrong-brain" }),
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

  it("wires MapApp's search cycle through the coordinator instead of applying responses directly", () => {
    const block = app.slice(app.indexOf("// `TASK-0034` A — bounded local search"), app.indexOf("const goToSearchPage ="));
    expect(block).toContain("runCoordinatedSearch<SearchPage>(searchCoordinator");
    expect(block).toContain("searchCoordinator.invalidate()");
    expect(block).not.toMatch(/setSearchPage\(page\)/);

    const clearBlock = app.slice(app.indexOf("const clearSearch ="), app.indexOf("const activateSearchHit ="));
    expect(clearBlock).toContain("searchCoordinator.invalidate()");

    // The activation-time revision guard stays as a defensive backstop.
    expect(app).toContain("currentRevision !== searchPage.indexRevision");
  });
});
