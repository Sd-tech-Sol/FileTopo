import { describe, expect, it } from "vitest";
import type { Rect } from "./types";
import {
  READABLE_SCALE,
  ZOOM_MAX_FACTOR,
  ZOOM_MIN_FACTOR,
  clampView,
  ensureRectVisible,
  fitScale,
  fitToBox,
  fitView,
  isWithinBounds,
  panBy,
  readableView,
  recenterOnFocus,
  sameView,
  scaleBounds,
  worldToScreen,
  zoomAbout,
} from "./viewState";

const world: Rect = { x: 0, y: 0, w: 14_000, h: 14_000 };
const viewport = { width: 1280, height: 800 };

/** Same generator as the Rust side, so a failure replays exactly. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

describe("view bounds — H4", () => {
  it("no reachable state falls outside the declared bounds, over 10 000 operations", () => {
    const random = makeRng(20260831);
    const bounds = scaleBounds(world, viewport);
    let view = fitView(world, viewport);
    let outOfBounds = 0;

    for (let step = 0; step < 10_000; step += 1) {
      const choice = Math.floor(random() * 5);
      if (choice === 0) {
        // Deliberately absurd zoom factors, in both directions.
        const factor = random() < 0.5 ? 0.01 : 100;
        view = zoomAbout(
          view,
          factor,
          { x: random() * viewport.width, y: random() * viewport.height },
          world,
          viewport,
        );
      } else if (choice === 1) {
        view = panBy(view, (random() - 0.5) * 1e7, (random() - 0.5) * 1e7, world, viewport);
      } else if (choice === 2) {
        view = fitView(world, viewport);
      } else if (choice === 3) {
        const size = 40 + random() * 4_000;
        view = fitToBox(
          { x: random() * (world.w - size), y: random() * (world.h - size), w: size, h: size },
          world,
          viewport,
        );
      } else {
        // A hostile caller handing over a state that was never clamped.
        view = clampView(
          { scale: random() * 1e6, tx: (random() - 0.5) * 1e9, ty: (random() - 0.5) * 1e9 },
          world,
          viewport,
        );
      }

      if (!isWithinBounds(view, world, viewport)) outOfBounds += 1;
      if (view.scale < bounds.min - 1e-9 || view.scale > bounds.max + 1e-9) outOfBounds += 1;
      if (!Number.isFinite(view.scale + view.tx + view.ty)) outOfBounds += 1;
    }

    expect(outOfBounds).toBe(0);
  });

  it("declares its zoom bounds as factors of the fit scale", () => {
    const bounds = scaleBounds(world, viewport);
    const base = fitScale(world, viewport);
    expect(bounds.min).toBeCloseTo(base * ZOOM_MIN_FACTOR, 12);
    expect(bounds.max).toBeCloseTo(base * ZOOM_MAX_FACTOR, 12);
  });

  it("refuses a non-finite view rather than propagating it", () => {
    const clamped = clampView({ scale: Number.NaN, tx: Number.NaN, ty: Number.NaN }, world, viewport);
    expect(Number.isFinite(clamped.scale)).toBe(true);
    expect(Number.isFinite(clamped.tx)).toBe(true);
    expect(Number.isFinite(clamped.ty)).toBe(true);
  });
});

describe("selection visibility — N15", () => {
  it("pans minimally to reveal an off-screen target without changing scale", () => {
    const view = { scale: 1, tx: 0, ty: 0 };
    const target = { x: 2_000, y: 300, w: 240, h: 64 };
    const next = ensureRectVisible(target, view, world, viewport);
    const projected = worldToScreen(target, next);
    expect(next.scale).toBe(view.scale);
    expect(projected.x + projected.w).toBeLessThanOrEqual(viewport.width - 18);
    expect(projected.y).toBeGreaterThanOrEqual(18);
  });

  it("returns the same view when the target is already visible", () => {
    const view = { scale: 1, tx: 20, ty: 20 };
    expect(
      ensureRectVisible({ x: 100, y: 100, w: 240, h: 64 }, view, world, viewport),
    ).toBe(view);
  });
});

describe("reset — H4", () => {
  it("reproduces the opening view parameter by parameter", () => {
    const opening = fitView(world, viewport);
    const wandered = panBy(
      zoomAbout(opening, 37, { x: 10, y: 700 }, world, viewport),
      -900,
      450,
      world,
      viewport,
    );
    expect(sameView(wandered, opening)).toBe(false);
    expect(sameView(fitView(world, viewport), opening)).toBe(true);
  });
});

describe("readable camera — DEC-0034 E", () => {
  it("centres the focus at the readable scale on a world that overflows the viewport", () => {
    const focus: Rect = { x: 6_000, y: 6_500, w: 240, h: 64 };
    const view = readableView(focus, world, viewport);
    expect(view.scale).toBeCloseTo(READABLE_SCALE, 9);
    const projected = worldToScreen(focus, view);
    expect(projected.x + projected.w / 2).toBeCloseTo(viewport.width / 2, 6);
    expect(projected.y + projected.h / 2).toBeCloseTo(viewport.height / 2, 6);
  });

  it("never shrinks below the readable scale just because the map is large", () => {
    // A world dozens of times the viewport — the point of the ordinary
    // 64-block target is that this stays rare, but the camera must not react
    // to it by miniaturising the map the way the old automatic fit did.
    const bigWorld: Rect = { x: 0, y: 0, w: 200_000, h: 200_000 };
    const view = readableView({ x: 0, y: 0, w: 240, h: 64 }, bigWorld, viewport);
    expect(view.scale).toBeGreaterThanOrEqual(READABLE_SCALE - 1e-9);
  });

  it("scales a tiny world up rather than leaving it floating at 1:1", () => {
    const tinyWorld: Rect = { x: 0, y: 0, w: 240, h: 64 };
    const view = readableView(tinyWorld, tinyWorld, viewport);
    const bounds = scaleBounds(tinyWorld, viewport);
    expect(view.scale).toBeCloseTo(bounds.min, 9);
    expect(view.scale).toBeGreaterThan(READABLE_SCALE);
  });

  it("stays within the declared bounds", () => {
    const focus: Rect = { x: 13_800, y: 60, w: 240, h: 64 };
    const view = readableView(focus, world, viewport);
    expect(isWithinBounds(view, world, viewport)).toBe(true);
  });
});

describe("recentring on a new focus — DEC-0034 E", () => {
  it("keeps the current scale rather than fitting the whole world", () => {
    const view = { scale: 3, tx: -500, ty: -200 };
    const focus: Rect = { x: 9_000, y: 9_000, w: 240, h: 64 };
    const next = recenterOnFocus(focus, view, world, viewport);
    expect(next.scale).toBe(view.scale);
  });

  it("leaves the view untouched when the new focus is already visible", () => {
    const view = { scale: 1, tx: 20, ty: 20 };
    const focus: Rect = { x: 100, y: 100, w: 240, h: 64 };
    expect(recenterOnFocus(focus, view, world, viewport)).toBe(view);
  });

  it("pans just enough to reveal a focus a branch navigation moved off screen", () => {
    const view = { scale: 1, tx: 0, ty: 0 };
    const focus: Rect = { x: 5_000, y: 5_000, w: 240, h: 64 };
    const next = recenterOnFocus(focus, view, world, viewport);
    expect(next.scale).toBe(view.scale);
    const projected = worldToScreen(focus, next);
    expect(projected.x).toBeGreaterThanOrEqual(0);
    expect(projected.y).toBeGreaterThanOrEqual(0);
    expect(projected.x + projected.w).toBeLessThanOrEqual(viewport.width);
    expect(projected.y + projected.h).toBeLessThanOrEqual(viewport.height);
  });
});

describe("fit and zoom", () => {
  it("fits the whole map inside the viewport", () => {
    const view = fitView(world, viewport);
    const screen = worldToScreen(world, view);
    expect(screen.x).toBeGreaterThanOrEqual(-1e-6);
    expect(screen.y).toBeGreaterThanOrEqual(-1e-6);
    expect(screen.x + screen.w).toBeLessThanOrEqual(viewport.width + 1e-6);
    expect(screen.y + screen.h).toBeLessThanOrEqual(viewport.height + 1e-6);
  });

  it("keeps the anchored point under the pointer while zooming", () => {
    const before = fitView(world, viewport);
    const anchor = { x: viewport.width / 2, y: viewport.height / 2 };
    const view = zoomAbout(before, 4, anchor, world, viewport);
    const worldX = (anchor.x - before.tx) / before.scale;
    const worldY = (anchor.y - before.ty) / before.scale;
    expect(worldX * view.scale + view.tx).toBeCloseTo(anchor.x, 6);
    expect(worldY * view.scale + view.ty).toBeCloseTo(anchor.y, 6);
  });

  it("lets the bounds win when anchoring would push the map off screen", () => {
    // Zooming hard against the left edge cannot keep the anchor *and* keep the
    // map covering the viewport. The bounds are the frozen requirement, so the
    // anchor is what gives way — and the result is still inside them.
    const view = zoomAbout(fitView(world, viewport), 4, { x: 4, y: 4 }, world, viewport);
    expect(isWithinBounds(view, world, viewport)).toBe(true);
    const screen = worldToScreen(world, view);
    expect(screen.x).toBeLessThanOrEqual(1e-6);
    expect(screen.x + screen.w).toBeGreaterThanOrEqual(viewport.width - 1e-6);
  });

  it("brings a small selection into view without leaving the bounds", () => {
    const target: Rect = { x: 13_800, y: 60, w: 49, h: 49 };
    const view = fitToBox(target, world, viewport);
    const screen = worldToScreen(target, view);
    expect(screen.x + screen.w).toBeGreaterThan(0);
    expect(screen.x).toBeLessThan(viewport.width);
    expect(isWithinBounds(view, world, viewport)).toBe(true);
  });

  it("survives a viewport that has not been measured yet", () => {
    const view = fitView(world, { width: 0, height: 0 });
    expect(Number.isFinite(view.scale)).toBe(true);
    expect(view.scale).toBeGreaterThan(0);
  });
});
