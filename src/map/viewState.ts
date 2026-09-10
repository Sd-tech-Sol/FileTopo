/**
 * Pan, zoom, fit and reset — the whole of `P-11`, as pure functions.
 *
 * Kept away from React and from the DOM on purpose. `H4` demands that *no
 * reachable state falls outside the declared bounds*, and the only honest way
 * to check a claim like that is to throw ten thousand operations at the
 * arithmetic itself rather than at a component and hope the assertions fire.
 *
 * The mapping is `screen = world * scale + translation`, uniform on both axes.
 */

import type { Rect } from "./types";

/** Frozen bound `B-4` of `TASK-0016` §12.2, as factors of the fit scale. */
export const ZOOM_MIN_FACTOR = 0.25;
export const ZOOM_MAX_FACTOR = 4096;

/** Fraction of the viewport the fitted map occupies, leaving a visible margin. */
const FIT_MARGIN = 0.94;

export interface Viewport {
  width: number;
  height: number;
}

export interface View {
  scale: number;
  tx: number;
  ty: number;
}

export interface ScaleBounds {
  min: number;
  max: number;
}

const EPSILON = 1e-9;

function usable(viewport: Viewport): Viewport {
  // A zero-sized viewport happens for one frame on mount, and dividing by it
  // would poison every later view with NaN.
  return {
    width: Math.max(viewport.width, 1),
    height: Math.max(viewport.height, 1),
  };
}

function usableWorld(world: Rect): Rect {
  return { ...world, w: Math.max(world.w, EPSILON), h: Math.max(world.h, EPSILON) };
}

/** Scale at which the whole map is visible with its margin. */
export function fitScale(world: Rect, viewport: Viewport): number {
  const view = usable(viewport);
  const box = usableWorld(world);
  return Math.min((view.width * FIT_MARGIN) / box.w, (view.height * FIT_MARGIN) / box.h);
}

export function scaleBounds(world: Rect, viewport: Viewport): ScaleBounds {
  const base = fitScale(world, viewport);
  return { min: base * ZOOM_MIN_FACTOR, max: base * ZOOM_MAX_FACTOR };
}

export function clampScale(scale: number, world: Rect, viewport: Viewport): number {
  const bounds = scaleBounds(world, viewport);
  if (!Number.isFinite(scale)) return bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, scale));
}

/**
 * Clamps the translation so the map can never be pushed off the screen.
 *
 * One rule covers both cases. When the map is smaller than the viewport it may
 * roam but must stay wholly inside; when it is larger it may roam but must keep
 * covering the viewport. Both are "the two edges bracket the interval", so the
 * same `min`/`max` pair expresses them.
 */
export function clampView(view: View, world: Rect, viewport: Viewport): View {
  const port = usable(viewport);
  const box = usableWorld(world);
  const scale = clampScale(view.scale, world, viewport);

  const axis = (translation: number, worldStart: number, worldSize: number, portSize: number) => {
    const edgeA = -worldStart * scale;
    const edgeB = portSize - (worldStart + worldSize) * scale;
    const low = Math.min(edgeA, edgeB);
    const high = Math.max(edgeA, edgeB);
    if (!Number.isFinite(translation)) return low;
    return Math.min(high, Math.max(low, translation));
  };

  return {
    scale,
    tx: axis(view.tx, box.x, box.w, port.width),
    ty: axis(view.ty, box.y, box.h, port.height),
  };
}

/**
 * Frames the whole composition. `DEC-0034` E reserves this for **Ajuster à
 * l'écran**, the one explicit action allowed to force a global fit — never an
 * automatic reaction to a projection change, and never what `reset`
 * reproduces any more.
 */
export function fitView(world: Rect, viewport: Viewport): View {
  const port = usable(viewport);
  const box = usableWorld(world);
  const scale = fitScale(world, viewport);
  return clampView(
    {
      scale,
      tx: (port.width - box.w * scale) / 2 - box.x * scale,
      ty: (port.height - box.h * scale) / 2 - box.y * scale,
    },
    world,
    viewport,
  );
}

/**
 * A card at its own authored size counts as "readable" — `DEC-0034` E and the
 * historical reference both describe a map that overflows the viewport and is
 * panned, never one shrunk to make everything fit at once.
 */
export const READABLE_SCALE = 1;

/**
 * The view a first opening and **Réinitialiser** land on: `focusRect`
 * centred, at a readable scale — never an exhaustive fit of the whole world.
 *
 * A world much smaller than the viewport is still scaled up to
 * {@link scaleBounds}'s floor rather than left floating at 1:1 in a mostly
 * empty canvas; a world much larger than the viewport keeps the readable
 * scale and simply overflows, which is the point.
 */
export function readableView(focusRect: Rect, world: Rect, viewport: Viewport): View {
  const port = usable(viewport);
  const scale = clampScale(READABLE_SCALE, world, viewport);
  return clampView(
    {
      scale,
      tx: port.width / 2 - (focusRect.x + focusRect.w / 2) * scale,
      ty: port.height / 2 - (focusRect.y + focusRect.h / 2) * scale,
    },
    world,
    viewport,
  );
}

/** Frames one rectangle — the selection, typically — inside the viewport. */
export function fitToBox(box: Rect, world: Rect, viewport: Viewport): View {
  const port = usable(viewport);
  const target = usableWorld(box);
  const scale = clampScale(
    Math.min((port.width * FIT_MARGIN) / target.w, (port.height * FIT_MARGIN) / target.h),
    world,
    viewport,
  );
  return clampView(
    {
      scale,
      tx: port.width / 2 - (target.x + target.w / 2) * scale,
      ty: port.height / 2 - (target.y + target.h / 2) * scale,
    },
    world,
    viewport,
  );
}

/**
 * Zooms by `factor` while keeping the world point under `anchor` where it is.
 *
 * Predictable centring is part of `P-11`: the wheel zooms under the pointer,
 * the keyboard zooms about the middle of the viewport.
 */
export function zoomAbout(
  view: View,
  factor: number,
  anchor: { x: number; y: number },
  world: Rect,
  viewport: Viewport,
): View {
  const scale = clampScale(view.scale * factor, world, viewport);
  // The anchor's world coordinate must land back on the same screen point.
  const worldX = (anchor.x - view.tx) / view.scale;
  const worldY = (anchor.y - view.ty) / view.scale;
  return clampView(
    { scale, tx: anchor.x - worldX * scale, ty: anchor.y - worldY * scale },
    world,
    viewport,
  );
}

export function panBy(
  view: View,
  dx: number,
  dy: number,
  world: Rect,
  viewport: Viewport,
): View {
  return clampView({ scale: view.scale, tx: view.tx + dx, ty: view.ty + dy }, world, viewport);
}

/** Pans only as far as needed to reveal a newly selected rectangle. */
export function ensureRectVisible(
  rect: Rect,
  view: View,
  world: Rect,
  viewport: Viewport,
  margin = 18,
): View {
  const port = usable(viewport);
  const projected = worldToScreen(rect, view);
  const safeMargin = Math.max(0, Math.min(margin, port.width / 2, port.height / 2));
  const availableWidth = port.width - safeMargin * 2;
  const availableHeight = port.height - safeMargin * 2;

  const dx =
    projected.w > availableWidth
      ? port.width / 2 - (projected.x + projected.w / 2)
      : projected.x < safeMargin
        ? safeMargin - projected.x
        : projected.x + projected.w > port.width - safeMargin
          ? port.width - safeMargin - (projected.x + projected.w)
          : 0;
  const dy =
    projected.h > availableHeight
      ? port.height / 2 - (projected.y + projected.h / 2)
      : projected.y < safeMargin
        ? safeMargin - projected.y
        : projected.y + projected.h > port.height - safeMargin
          ? port.height - safeMargin - (projected.y + projected.h)
          : 0;

  if (dx === 0 && dy === 0) return view;
  return clampView({ ...view, tx: view.tx + dx, ty: view.ty + dy }, world, viewport);
}

/**
 * Recentres on a new focus after a projection change — branch navigation, an
 * expanded indicator, a refresh — without shrinking the map to fit it.
 *
 * `DEC-0034` E: the scale a person chose survives when it still makes the new
 * focus reachable, so this is exactly {@link ensureRectVisible} under its own
 * name at this call site, kept separate so a reader does not have to infer
 * from a selection-visibility helper that it is also the answer to "no
 * automatic global fit on every projection".
 */
export function recenterOnFocus(
  focusRect: Rect,
  view: View,
  world: Rect,
  viewport: Viewport,
): View {
  return ensureRectVisible(focusRect, view, world, viewport);
}

/** Parameter-by-parameter comparison, as `H4` words it. */
export function sameView(left: View, right: View, tolerance = 1e-9): boolean {
  return (
    Math.abs(left.scale - right.scale) <= tolerance &&
    Math.abs(left.tx - right.tx) <= tolerance &&
    Math.abs(left.ty - right.ty) <= tolerance
  );
}

export function worldToScreen(rect: Rect, view: View): Rect {
  return {
    x: rect.x * view.scale + view.tx,
    y: rect.y * view.scale + view.ty,
    w: rect.w * view.scale,
    h: rect.h * view.scale,
  };
}

/** True when the view respects every declared bound. */
export function isWithinBounds(view: View, world: Rect, viewport: Viewport): boolean {
  const clamped = clampView(view, world, viewport);
  const scaleSpan = Math.max(1, Math.abs(clamped.scale));
  const translationSpan = Math.max(1, Math.abs(clamped.tx), Math.abs(clamped.ty));
  return (
    Math.abs(view.scale - clamped.scale) <= 1e-9 * scaleSpan &&
    Math.abs(view.tx - clamped.tx) <= 1e-6 * translationSpan &&
    Math.abs(view.ty - clamped.ty) <= 1e-6 * translationSpan
  );
}
