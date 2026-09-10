/**
 * `TASK-0032` `RR9` and the interface half of `RR2`/`RR3` — structural guards.
 *
 * `MapApp` is never mounted in jsdom in this repository: its behaviour is
 * proved in the real WebView2 host, where a real keystroke reaches a real
 * window. What jsdom **can** establish, and what a host run cannot establish
 * cheaply, is what the sources *do not contain* — that no path crosses the IPC,
 * that no network appeared, that no stack was added. Those are the claims here.
 *
 * Read through `?raw` rather than `node:fs`, following `runArtifacts.test.ts`:
 * no new dependency, and the assertion runs on the same bytes Vite bundles.
 */

import { describe, expect, it } from "vitest";
import mapAppSource from "./MapApp.tsx?raw";
import lifecycleSource from "./lifecycle.ts?raw";
import typesSource from "./types.ts?raw";
import tauriConfigSource from "../../src-tauri/tauri.conf.json?raw";
import capabilitySource from "../../src-tauri/capabilities/default.json?raw";
import cargoManifestSource from "../../src-tauri/Cargo.toml?raw";
import packageManifestSource from "../../package.json?raw";
import { runLifecycle } from "./lifecycle";
import type { MapBuildReport, MapOpenReport } from "./types";

/** Every TypeScript source of the map interface, as text. */
const INTERFACE_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ["src/map/MapApp.tsx", mapAppSource],
  ["src/map/lifecycle.ts", lifecycleSource],
  ["src/map/types.ts", typesSource],
];

describe("TASK-0032 RR2 — the interface asks for a folder, it never names one", () => {
  it("invokes the picker command with no argument at all", () => {
    expect(mapAppSource).toContain('invoke<BrainRecord | null>("map_brain_choose_real_root")');
    // The command taking an argument object would be the whole failure mode:
    // a page that can pass a path can pass any path — `DEC-0033` A.
    expect(mapAppSource).not.toMatch(/map_brain_choose_real_root",\s*\{/);
  });

  it("never sends a filesystem path to any command", () => {
    // Read off the **argument objects of `invoke` calls**, not off the file at
    // large: `strings.fr.root = "racine"` is a label on a button, and a guard
    // that tripped on it would be guarding the wrong thing. What must not
    // exist is an argument naming a place on disk — `DEC-0033` A.
    //
    // `relativePath` is allowed and is not one: it is a path **inside one
    // brain's index**, resolved by an SQL lookup that never touches the disk.
    const invocations = [...mapAppSource.matchAll(/invoke[^(]*\(\s*"([a-z_0-9]+)"\s*,\s*\{([^}]*)\}/g)];
    expect(invocations.length).toBeGreaterThan(10);
    for (const [, command, argumentBody] of invocations) {
      const keys = [...argumentBody.matchAll(/([A-Za-z_][A-Za-z_0-9]*)\s*[:,}]/g)].map(
        (match) => match[1],
      );
      for (const key of keys) {
        expect(
          ["path", "root", "folder", "directory", "absolutePath", "rootPath"].includes(key),
          `\`${command}\` must not be given \`${key}\``,
        ).toBe(false);
      }
    }
  });

  it("states the unindexed brain rather than scanning to find out", () => {
    // The fact comes from what the composition failed to load, never from a
    // probe of the source — `DEC-0033` E.
    expect(mapAppSource).toContain("const focusedNeedsIndex =");
    expect(mapAppSource).toContain("!loaded.has(composed.focusedBrainId)");
  });
});

describe("TASK-0032 RR3 — no absolute path has anywhere to go", () => {
  it("declares no path-bearing field on any brain DTO", () => {
    // The type is the guarantee's first line of defence: a field that does not
    // exist cannot be populated by a later change nobody looked at.
    for (const forbidden of ["rootPath", "absolutePath", "sourcePath", "folderPath"]) {
      expect(typesSource, `types.ts must not declare \`${forbidden}\``).not.toContain(forbidden);
    }
  });

  it("keeps the fingerprint nullable so an unmeasured root cannot read as clean", () => {
    expect(typesSource).toContain("fingerprintBefore: string | null;");
    expect(typesSource).toContain("fingerprintAfter: string | null;");
  });
});

describe("TASK-0032 RR9 — no network, no new stack", () => {
  it("leaves the Content-Security-Policy exactly as TASK-0031 left it", () => {
    const config = JSON.parse(tauriConfigSource) as {
      app: { security: { csp: string } };
    };
    expect(config.app.security.csp).toBe(
      "default-src 'self'; img-src 'self' asset: data:; style-src 'self' 'unsafe-inline'; " +
        "font-src 'self'; connect-src ipc: http://ipc.localhost; script-src 'self'; " +
        "object-src 'none'; frame-src 'none'",
    );
  });

  it("grants the WebView the dialogue and no filesystem access", () => {
    const capability = JSON.parse(capabilitySource) as { permissions: string[] };
    expect(capability.permissions).toEqual(["core:default", "dialog:allow-open"]);
    for (const permission of capability.permissions) {
      expect(permission.startsWith("fs:")).toBe(false);
      expect(permission.startsWith("shell:")).toBe(false);
    }
  });

  it("adds no network call anywhere in the interface", () => {
    for (const [name, source] of INTERFACE_SOURCES) {
      for (const forbidden of ["fetch(", "XMLHttpRequest", "WebSocket", "EventSource", "http://", "https://"]) {
        expect(source, `${name} must stay offline`).not.toContain(forbidden);
      }
    }
  });

  it("adds no dependency on either side", () => {
    // `tauri-plugin-dialog` was already declared, since the 0.1 prototype; this
    // slice initialises it, which is not the same thing as adding it.
    expect(cargoManifestSource).toContain('tauri-plugin-dialog = "2"');
    const manifest = JSON.parse(packageManifestSource) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      "@tauri-apps/api",
      "pixi.js",
      "react",
      "react-dom",
    ]);
  });
});

describe("TASK-0032 RR10 — the DEC-0032 lifecycle is untouched", () => {
  it("still opens without refreshing, and refreshes before opening", async () => {
    const calls: string[] = [];
    const invoke = (async (command: string) => {
      calls.push(command);
      return {} as MapOpenReport & MapBuildReport;
    }) as <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

    await runLifecycle(invoke, "real-x", "open");
    expect(calls).toEqual(["map_open"]);

    calls.length = 0;
    await runLifecycle(invoke, "real-x", "refresh");
    expect(calls).toEqual(["map_refresh", "map_open"]);

    calls.length = 0;
    await runLifecycle(invoke, "real-x", "rebuild");
    expect(calls).toEqual(["map_rebuild", "map_open"]);
  });
});
