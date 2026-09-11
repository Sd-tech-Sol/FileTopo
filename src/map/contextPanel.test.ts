/**
 * `TASK-0035` — wiring proofs for the parts of the context-panel slice that
 * live in `MapApp.tsx` itself, where they can't be exercised through
 * `DetailsPanel` alone: the details-panel preference toggle, the bootstrap
 * load of it, the children-pagination effect's identity, and the exact
 * shape of the `map_copy_node_path`/`map_node_children` invokes.
 *
 * Same convention as `lifecycle.test.ts` and `searchCoordinator.test.ts`'s
 * wiring test: `MapApp.tsx`'s source, read via `?raw`, since no test in
 * this repository mounts `MapApp` itself with a mocked `invoke` (it is
 * only ever imported by `src/main.tsx`).
 */
import { describe, expect, it } from "vitest";
import app from "./MapApp.tsx?raw";

describe("TASK-0035 A — details-panel preference", () => {
  it("loads the preference once at boot, alongside fixtures/host/catalog", () => {
    const bootstrapBlock = app.slice(
      app.indexOf('document.documentElement.lang = "fr";'),
      app.indexOf("// Unattended runs:"),
    );
    expect(bootstrapBlock).toContain('invoke<UiPreferences>("map_ui_preferences")');
    expect(bootstrapBlock).toContain("setDetailsPanelVisible(nextPreferences.detailsPanelVisible)");
  });

  it("toggling the panel touches nothing but the one preference — no selection, search, projection, relations or composition", () => {
    const toggleBlock = app.slice(
      app.indexOf("const toggleDetailsPanel = useCallback("),
      app.indexOf("const toggleDetailsPanel = useCallback(") +
        app.slice(app.indexOf("const toggleDetailsPanel = useCallback(")).indexOf("}, []);"),
    );
    expect(toggleBlock).toContain("setDetailsPanelVisible(");
    expect(toggleBlock).toContain('invoke("map_ui_preferences_update", { detailsPanelVisible: next })');
    for (const forbidden of [
      "setSelected(",
      "setSearchQuery(",
      "setSearchPage(",
      "setComposed(",
      "setDetail(",
      "setChildrenPage(",
      "setLoaded(",
    ]) {
      expect(toggleBlock).not.toContain(forbidden);
    }
  });

  it("the toolbar toggle and the conditional panel are wired to the same preference", () => {
    expect(app).toContain('data-testid="details-panel-toggle"');
    expect(app).toContain("onClick={toggleDetailsPanel}");
    expect(app).toContain("{detailsPanelVisible ? (\n            <DetailsPanel");
  });
});

describe("TASK-0035 B — dedicated children page", () => {
  it("fetches a page via map_node_children, never assembling a path", () => {
    const fetchBlock = app.slice(
      app.indexOf("const fetchChildrenPage = useCallback("),
      app.indexOf("const goToChildrenPage = useCallback("),
    );
    expect(fetchBlock).toContain(
      'invoke<NodeChildrenPage>("map_node_children", { reference, after, limit: 50 })',
    );
  });

  it("re-fetches page one whenever the selection changes — mirrors the sibling `detail` effect's own dependency, nothing broader", () => {
    // The children effect immediately follows `fetchChildrenPage`'s
    // definition; its dependency array is the give-away that it reacts to
    // exactly one thing, the same principle `detail`'s own effect uses
    // just above it in the file.
    const afterFetch = app.slice(app.indexOf("const fetchChildrenPage = useCallback("));
    const effectStart = afterFetch.indexOf("useEffect(() => {");
    const effectBlock = afterFetch.slice(effectStart, afterFetch.indexOf("const goToChildrenPage ="));
    expect(effectBlock).toContain("fetchChildrenPage(selected, null)");
    expect(effectBlock).toContain("}, [selected, fetchChildrenPage]);");
  });

  it("selecting a child calls the existing onSelect(nodeId) navigation, never a bespoke one", () => {
    expect(app).toContain("onNextChildrenPage={() => goToChildrenPage(\"next\")}");
    expect(app).toContain("onPreviousChildrenPage={() => goToChildrenPage(\"previous\")}");
    expect(app).toContain("onSelect={selectInSelectedBrain}");
  });
});

describe("TASK-0035 C — Copier le chemin", () => {
  it("invokes map_copy_node_path with exactly { reference } — no extra field", () => {
    const copyBlock = app.slice(
      app.indexOf("const copyNodePath = useCallback("),
      app.indexOf("const copyNodePath = useCallback(") +
        app.slice(app.indexOf("const copyNodePath = useCallback(")).indexOf("}, []);"),
    );
    expect(copyBlock).toContain('await invoke("map_copy_node_path", { reference });');
    // Same error-code stripping convention as reveal — proven once here so
    // a future edit can't quietly diverge the two wire formats.
    expect(copyBlock).toContain("map_reveal_refused:");
  });

  it("clears a stale copy error the instant the selection changes, same as reveal's own guard", () => {
    const afterCopy = app.slice(app.indexOf("const copyNodePath = useCallback("));
    const clearBlock = afterCopy.slice(0, afterCopy.indexOf("const fetchChildrenPage ="));
    expect(clearBlock).toContain("setCopyError(null);\n  }, [selected]);");
  });
});
