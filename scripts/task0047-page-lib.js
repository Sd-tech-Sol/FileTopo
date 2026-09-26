// TASK-0047 — measurement library evaluated INSIDE the real page by `task0047-webview2.mjs`.
// Dev-only proof tooling: never imported by the product bundle. It reads computed styles of the
// real elements in the real engine; it changes nothing (scroll positions it moves are restored).
(() => {
  if (window.__t47) return;

  // ---- colour -------------------------------------------------------------------------
  const canvasContext = document.createElement("canvas").getContext("2d");
  function parseColor(text) {
    if (!text || text === "transparent") return [0, 0, 0, 0];
    let m = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), a];
    }
    m = text.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [parseFloat(m[1]) * 255, parseFloat(m[2]) * 255, parseFloat(m[3]) * 255, a];
    }
    canvasContext.fillStyle = "#000000";
    canvasContext.fillStyle = text;
    const back = canvasContext.fillStyle;
    if (back.startsWith("#")) {
      return [parseInt(back.slice(1, 3), 16), parseInt(back.slice(3, 5), 16), parseInt(back.slice(5, 7), 16), 1];
    }
    return parseColor(back === text ? "rgb(0 0 0)" : back);
  }
  const over = (fg, bg) => {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  };
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = (c) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
  const ratio = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const hex = (c) => "#" + [c[0], c[1], c[2]].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const round2 = (x) => Math.round(x * 100) / 100;

  // ---- what an element looks like -------------------------------------------------------
  const isSvgPart = (e) => e instanceof SVGElement && e.tagName.toLowerCase() !== "svg";
  function opacityChain(e) {
    let o = 1;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  }
  const canvasBase = () => (matchMedia("(prefers-color-scheme: dark)").matches ? [18, 18, 18, 1] : [255, 255, 255, 1]);
  /** The colours a `fill: url(#pattern)` can put behind text: the pattern's own cell and its lines. */
  function patternColours(reference) {
    const id = /url\(["']?#([^"')]+)["']?\)/.exec(reference)?.[1];
    const pattern = id ? document.getElementById(id) : null;
    if (!pattern) return null;
    const out = [];
    for (const child of pattern.querySelectorAll("*")) {
      const cs = getComputedStyle(child);
      if (cs.fill && cs.fill !== "none") {
        const c = parseColor(cs.fill);
        c[3] *= parseFloat(cs.fillOpacity);
        if (c[3] > 0) out.push(c);
      }
      if (cs.stroke && cs.stroke !== "none") {
        const c = parseColor(cs.stroke);
        c[3] *= parseFloat(cs.strokeOpacity);
        if (c[3] > 0) out.push(c);
      }
    }
    return out;
  }
  /** What one layer paints: a list of alternatives (one, unless it is a pattern), each with its alpha. */
  function paint(e) {
    const cs = getComputedStyle(e);
    const op = opacityChain(e);
    if (isSvgPart(e)) {
      if (cs.fill === "none") return null;
      if (cs.fill.startsWith("url(")) {
        const colours = patternColours(cs.fill);
        return colours && colours.length > 0 ? { alternatives: colours.map((c) => [c[0], c[1], c[2], c[3] * op * parseFloat(cs.fillOpacity)]), pattern: true } : { unknown: true };
      }
      const c = parseColor(cs.fill);
      c[3] *= parseFloat(cs.fillOpacity) * op;
      return c[3] > 0 ? { alternatives: [c] } : null;
    }
    if (cs.backgroundImage && cs.backgroundImage !== "none") return { unknown: true };
    const c = parseColor(cs.backgroundColor);
    c[3] *= op;
    return c[3] > 0 ? { alternatives: [c] } : null;
  }
  /** The possible backdrops behind `target` at a point: composited from the bottom of the stack up. */
  function backdrops(target, x, y) {
    const stack = document.elementsFromPoint(x, y);
    let index = -1;
    stack.forEach((e, i) => {
      if (e === target || target.contains(e)) index = i;
    });
    // The target's own box paints under its own text (an HTML button's fill), but an SVG text's fill IS the text.
    const own = stack.indexOf(target);
    const from = own >= 0 ? (isSvgPart(target) ? own + 1 : own) : index >= 0 ? index + 1 : 0;
    const below = stack.slice(from).reverse();
    let variants = [canvasBase()];
    const notes = [];
    for (const layer of below) {
      const p = paint(layer);
      if (!p) continue;
      if (p.unknown) {
        notes.push("image-or-unresolved-paint:" + (layer.getAttribute?.("class") ?? layer.tagName));
        continue;
      }
      variants = p.alternatives.flatMap((c) => variants.map((v) => over(c, v)));
    }
    return { variants, notes };
  }
  /** A point an ancestor with `overflow` other than visible clips away is not on screen: it shows nothing of the target. */
  function clippedAway(target, x, y) {
    for (let n = target.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const r = n.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return true;
    }
    return false;
  }
  function sample(target) {
    const range = document.createRange();
    range.selectNodeContents(target);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    const rect = rects.length > 0 ? rects : [target.getBoundingClientRect()];
    const points = [];
    for (const r of [rect[0], rect[rect.length - 1]]) {
      for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5]]) points.push([r.left + r.width * fx, r.top + r.height * fy]);
    }
    return points;
  }

  // ---- naming ---------------------------------------------------------------------------
  function describe(e) {
    if (!e || e.nodeType !== 1) return null;
    const bits = [e.tagName.toLowerCase()];
    const id = e.getAttribute("data-testid");
    if (id) bits.push(`[data-testid="${id.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, "<id>")}"]`);
    const cls = typeof e.className === "string" ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
    if (cls) bits.push("." + cls);
    return bits.join("");
  }
  function accessibleName(e) {
    const labelled = e.getAttribute("aria-labelledby");
    if (labelled) {
      const text = labelled.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
      if (text) return text;
    }
    return (e.getAttribute("aria-label") || (e.labels && e.labels[0]?.textContent) || e.textContent || e.getAttribute("title") || e.getAttribute("placeholder") || e.value || "").replace(/\s+/g, " ").trim();
  }
  const clip = (text, n = 60) => (text.length > n ? text.slice(0, n) + "…" : text);

  // ---- visibility -------------------------------------------------------------------------
  function isRendered(e) {
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return false;
      if (n.hasAttribute("hidden") || n.hasAttribute("inert")) return false;
    }
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }
  const scrolled = new Map();
  function remember(e) {
    for (let n = e.parentElement; n; n = n.parentElement) {
      if (!scrolled.has(n)) scrolled.set(n, [n.scrollLeft, n.scrollTop]);
    }
    if (!scrolled.has(window)) scrolled.set(window, [window.scrollX, window.scrollY]);
  }
  function restoreScroll() {
    for (const [n, [x, y]] of scrolled) {
      if (n === window) window.scrollTo(x, y);
      else {
        n.scrollLeft = x;
        n.scrollTop = y;
      }
    }
    scrolled.clear();
  }
  function bringIntoView(e) {
    const r = e.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth) return;
    remember(e);
    e.scrollIntoView({ block: "center", inline: "nearest" });
  }

  // ---- text contrast (WCAG 1.4.3 / non-text 1.4.11 for glyphs) --------------------------------
  const GLYPH_ONLY = /^[^\p{L}\p{N}]+$/u;
  function textThreshold(e, glyph) {
    if (glyph) return 3;
    const cs = getComputedStyle(e);
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    return px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
  }
  /** How many sample points of an element are actually on screen (inside the window and not clipped away). */
  function visibleSamples(e) {
    if (!isRendered(e)) return 0;
    bringIntoView(e);
    return sample(e).filter(([x, y]) => x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight && !clippedAway(e, x, y)).length;
  }
  /** Contrast of one text-bearing element; `null` when nothing of it is rendered. */
  function contrastOf(e) {
    if (!isRendered(e)) return null;
    const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
    if (!own) return null;
    const cs = getComputedStyle(e);
    const svg = isSvgPart(e);
    bringIntoView(e);
    const fgRaw = parseColor(svg ? cs.fill : cs.color);
    fgRaw[3] *= (svg ? parseFloat(cs.fillOpacity) : 1) * opacityChain(e);
    const glyph = GLYPH_ONLY.test(own);
    const threshold = textThreshold(e, glyph);
    let worst = Infinity;
    let worstFg = null;
    let worstBg = null;
    const notes = new Set();
    for (const [x, y] of sample(e)) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || clippedAway(e, x, y)) continue;
      const { variants, notes: n } = backdrops(e, x, y);
      n.forEach((note) => notes.add(note));
      for (const bg of variants) {
        const fg = over(fgRaw, bg);
        const r = ratio(fg, bg);
        if (r < worst) {
          worst = r;
          worstFg = fg;
          worstBg = bg;
        }
      }
    }
    if (!Number.isFinite(worst)) return null;
    // A halo (`paint-order: stroke` + a stroke colour) is measured as well: the text against its own outline.
    let halo = null;
    if (svg && cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0 && cs.paintOrder.startsWith("stroke")) {
      const haloColour = parseColor(cs.stroke);
      haloColour[3] *= parseFloat(cs.strokeOpacity);
      halo = { colour: hex(over(haloColour, canvasBase())), width: parseFloat(cs.strokeWidth), ratio: round2(ratio(over(fgRaw, over(haloColour, canvasBase())), over(haloColour, canvasBase()))) };
    }
    return {
      element: describe(e),
      text: clip(own, 40),
      kind: glyph ? "glyph" : svg ? "svg-text" : "text",
      ratio: round2(worst),
      threshold,
      pass: worst >= threshold,
      foreground: worstFg ? hex(worstFg) : null,
      background: worstBg ? hex(worstBg) : null,
      fontPx: parseFloat(cs.fontSize),
      fontWeight: cs.fontWeight,
      halo,
      notes: [...notes].slice(0, 3),
    };
  }
  /** Every rendered text-bearing element. Disabled controls are recorded, never silently skipped. */
  function sweepText() {
    const seen = new Set();
    const rows = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const e = n.parentElement;
      if (!e || seen.has(e) || !n.textContent.trim()) continue;
      if (e.closest("title, script, style, defs, noscript, template")) continue;
      seen.add(e);
      const row = contrastOf(e);
      if (!row) continue;
      const inactive = e.closest("[disabled], [aria-disabled='true']");
      if (inactive) row.exempt = "inactive user interface component (WCAG 1.4.3): " + describe(inactive);
      rows.push(row);
    }
    restoreScroll();
    return rows;
  }

  // ---- non-text contrast (WCAG 1.4.11) ----------------------------------------------------------
  /** Text fields: the boundary (or the fill) that identifies the component against what is around it. */
  function sweepControls() {
    const rows = [];
    for (const e of document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea")) {
      if (!isRendered(e)) continue;
      bringIntoView(e);
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const around = backdrops(e.parentElement ?? document.body, r.left + 2, r.top - 3 > 0 ? r.top - 3 : r.bottom + 3);
      const borderW = parseFloat(cs.borderTopWidth);
      const border = borderW > 0 && cs.borderTopStyle !== "none" ? parseColor(cs.borderTopColor) : null;
      const fill = parseColor(cs.backgroundColor);
      const candidates = [];
      const bg = around.variants[0];
      if (border && border[3] > 0) candidates.push({ of: "border", ratio: ratio(over(border, bg), bg) });
      if (fill[3] > 0) candidates.push({ of: "fill", ratio: ratio(over(fill, bg), bg) });
      const best = candidates.sort((a, b) => b.ratio - a.ratio)[0] ?? { of: "none", ratio: 1 };
      rows.push({ element: describe(e), type: e.getAttribute("type") ?? e.tagName.toLowerCase(), identifiedBy: best.of, ratio: round2(best.ratio), threshold: 3, pass: best.ratio >= 3, borderColour: border ? hex(over(border, bg)) : null, surround: hex(bg) });
    }
    restoreScroll();
    return rows;
  }

  // ---- focus ---------------------------------------------------------------------------------
  const TABBABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]';
  /** What the browser's sequential focus navigation can reach, in DOM order. */
  function tabbables() {
    const candidates = [...document.querySelectorAll(TABBABLE)].filter((e) => {
      if (e.matches(":disabled") || !isRendered(e)) return false;
      const t = e.getAttribute("tabindex");
      if (t !== null && parseInt(t, 10) < 0) return false;
      return true;
    });
    // The browser's own rule for radio buttons: a group is ONE tab stop — the checked radio, else the first;
    // the arrow keys move inside the group.
    const groups = new Map();
    for (const e of candidates) if (e.tagName === "INPUT" && e.type === "radio" && e.name) (groups.get(e.form?.id + "|" + e.name) ?? groups.set(e.form?.id + "|" + e.name, []).get(e.form?.id + "|" + e.name)).push(e);
    return candidates.filter((e) => {
      if (!(e.tagName === "INPUT" && e.type === "radio" && e.name)) return true;
      const group = groups.get(e.form?.id + "|" + e.name);
      const checked = group.find((r) => r.checked);
      return checked ? e === checked : e === group[0];
    });
  }
  function focusInfo() {
    const e = document.activeElement;
    if (!e || e === document.body || e === document.documentElement) return { body: true, element: "body" };
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const vx0 = Math.max(0, r.left);
    const vy0 = Math.max(0, r.top);
    const vx1 = Math.min(innerWidth, r.right);
    const vy1 = Math.min(innerHeight, r.bottom);
    const top = vx1 > vx0 && vy1 > vy0 ? document.elementFromPoint((vx0 + vx1) / 2, (vy0 + vy1) / 2) : null;
    const outline = parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== "none" ? { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), colour: cs.outlineColor, offset: cs.outlineOffset } : null;
    return {
      body: false,
      element: describe(e),
      role: e.getAttribute("role"),
      name: clip(accessibleName(e), 70),
      focusVisible: e.matches(":focus-visible"),
      outline,
      boxShadow: cs.boxShadow === "none" ? null : cs.boxShadow,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      inViewport: vx1 > vx0 && vy1 > vy0,
      obscured: !top || !(top === e || e.contains(top) || top.contains(e)),
      topmostAtCentre: top ? describe(top) : null,
      expanded: e.getAttribute("aria-expanded"),
      pressed: e.getAttribute("aria-pressed"),
      current: e.getAttribute("aria-current"),
      activedescendant: e.getAttribute("aria-activedescendant"),
    };
  }
  const clipOf = (e, pad = 6) => {
    const r = e.getBoundingClientRect();
    const x0 = Math.max(0, r.left - pad);
    const y0 = Math.max(0, r.top - pad);
    const x1 = Math.min(innerWidth, r.right + pad);
    const y1 = Math.min(innerHeight, r.bottom + pad);
    // Page.captureScreenshot's clip is in document coordinates: the scroll offset is added.
    return { x: x0 + window.scrollX, y: y0 + window.scrollY, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0), scale: 1 };
  };


  // ---- text that is not a text node: pseudo-element content and placeholders ------------------------
  function measureColour(e, colour, fontPx, weight, label, kind) {
    if (!isRendered(e)) return null;
    bringIntoView(e);
    const fg = parseColor(colour);
    fg[3] *= opacityChain(e);
    const glyph = false;
    const large = fontPx >= 24 || (fontPx >= 18.66 && parseInt(weight, 10) >= 700);
    const threshold = large ? 3 : 4.5;
    let worst = Infinity;
    for (const [x, y] of sample(e)) {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || clippedAway(e, x, y)) continue;
      for (const bg of backdrops(e, x, y).variants) {
        const r = ratio(over(fg, bg), bg);
        if (r < worst) worst = r;
      }
    }
    if (!Number.isFinite(worst)) return null;
    void glyph;
    return { element: describe(e), text: label, kind, ratio: round2(worst), threshold, pass: worst >= threshold, fontPx };
  }
  function sweepPseudo() {
    const rows = [];
    for (const e of document.body.querySelectorAll("*")) {
      if (e instanceof SVGElement) continue;
      for (const pseudo of ["::before", "::after"]) {
        const cs = getComputedStyle(e, pseudo);
        const content = cs.content;
        if (!content || content === "none" || content === "normal" || content === '""' || content === "''") continue;
        const text = content.replace(/^["']|["']$/g, "").trim();
        if (!text) continue;
        const row = measureColour(e, cs.color, parseFloat(cs.fontSize), cs.fontWeight, text, "pseudo-element " + pseudo);
        if (row) {
          if (e.closest("[disabled], [aria-disabled='true']")) row.exempt = "inactive user interface component";
          rows.push(row);
        }
      }
    }
    for (const e of document.querySelectorAll("input[placeholder], textarea[placeholder]")) {
      if (e.value !== "") continue;
      const cs = getComputedStyle(e, "::placeholder");
      const row = measureColour(e, cs.color, parseFloat(cs.fontSize), cs.fontWeight, e.getAttribute("placeholder"), "placeholder");
      if (row) rows.push(row);
    }
    restoreScroll();
    return rows;
  }

  // ---- graphical objects (WCAG 1.4.11): what identifies a block, an edge, an aggregate --------------------
  function strokeAgainstGround(e) {
    const cs = getComputedStyle(e);
    if (cs.stroke === "none") return null;
    const c = parseColor(cs.stroke);
    c[3] *= parseFloat(cs.strokeOpacity) * opacityChain(e);
    if (c[3] <= 0) return null;
    const r = e.getBoundingClientRect();
    if (!(r.width > 0 || r.height > 0)) return null;
    bringIntoView(e);
    const box = e.getBoundingClientRect();
    let worst = Infinity;
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5]]) {
      const x = box.left + box.width * fx;
      const y = box.top + box.height * fy;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      for (const bg of backdrops(e, x, y).variants) worst = Math.min(worst, ratio(over(c, bg), bg));
    }
    return Number.isFinite(worst) ? { ratio: round2(worst), width: parseFloat(cs.strokeWidth), dash: cs.strokeDasharray } : null;
  }
  function sweepGraphics() {
    const groups = new Map();
    const note = (kind, key, e) => {
      const row = strokeAgainstGround(e);
      if (!row) return;
      const id = `${kind} ${key}`;
      const old = groups.get(id);
      if (!old || row.ratio < old.ratio) groups.set(id, { kind, key, ...row, count: (old?.count ?? 0) + 1, example: describe(e) });
      else old.count += 1;
    };
    for (const g of document.querySelectorAll('[role="treeitem"]')) {
      const rect = g.querySelector(":scope > rect");
      if (!rect) continue;
      const state = ((g.getAttribute("class") ?? "").match(/map-node--(selected|related|cross-linked|linked|plain|skipped|root|file|directory)\b/g) ?? []).sort().join(" ");
      note("card outline", state, rect);
    }
    for (const p of document.querySelectorAll(".map-hierarchy-edge path")) note("hierarchy edge", p.closest("g").getAttribute("class").replace(/map-hierarchy-edge\s*/, ""), p);
    for (const p of document.querySelectorAll('[data-edge-kind]:not(.map-hierarchy-edge) path, .map-view__edges path, .map-view__cross-edges path')) note("relation edge", (p.closest("[data-edge-kind]")?.getAttribute("data-edge-kind") ?? "") + " " + (p.closest("[class]")?.getAttribute("class") ?? ""), p);
    for (const p of document.querySelectorAll(".map-aggregate__pill")) note("aggregate pill", "outline", p);
    restoreScroll();
    return [...groups.values()].map((g) => ({ ...g, threshold: 3, pass: g.ratio >= 3 }));
  }

  // ---- codings and their non-colour alternative ----------------------------------------------------
  const visibleWords = (e) => {
    let text = "";
    const walk = (n) => {
      if (n.nodeType === 3) text += n.textContent;
      else if (n.nodeType === 1 && n.getAttribute("aria-hidden") !== "true" && n.tagName.toLowerCase() !== "title") n.childNodes.forEach(walk);
    };
    walk(e);
    return text.replace(/\s+/g, " ").trim();
  };
  const hiddenGlyph = (e) => [...e.querySelectorAll('[aria-hidden="true"]')].map((n) => n.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ");
  const CODINGS = [
    { coding: "the focused (active) brain", selector: '.composition__chip', state: (e) => (e.querySelector('[aria-current]') ? "focused" : "other"), also: (e) => ({ ariaCurrent: e.querySelector(".composition__focus")?.getAttribute("aria-current") ?? null, icon: e.querySelector(".composition__icon")?.textContent ?? null, marker: e.querySelector(".composition__state, .composition__hint")?.textContent ?? null }) },
    { coding: "the state of an element (new / changed / seen …)", selector: '[data-testid="node-state-badge"]', state: (e) => e.getAttribute("data-state"), also: () => ({}) },
    { coding: "a journal event: seen / unseen", selector: '[data-testid="journal-seen-badge"]', state: (e) => (e.className.includes("--unseen") ? "unseen" : "seen"), also: () => ({}) },
    { coding: "the availability of the source", selector: '[data-testid="source-observation"]', state: (e) => e.getAttribute("data-state") ?? e.className, also: () => ({}) },
    { coding: "the state of the watcher", selector: '[data-testid="watch-status"]', state: (e) => e.getAttribute("data-state") ?? e.className, also: () => ({}) },
    { coding: "filter role on a card: match / context", selector: ".map-node__filter-tag", state: (e) => (e.getAttribute("class") ?? "").split("--")[1] ?? "", also: (e) => ({ text: e.textContent.trim() }), textAlways: true },
    { coding: "filter role in the result list", selector: '[data-testid="filter-role"]', state: (e) => (e.getAttribute("class") ?? "").split("--")[1] ?? "", also: () => ({}) },
    { coding: "direction of a relation (inside a brain)", selector: ".relation__direction", wordsFrom: (e) => e.parentElement, state: (e) => e.textContent.trim(), also: (e) => ({ glyphAndWords: e.parentElement?.textContent.replace(/\s+/g, " ").trim().slice(0, 60) }) },
    { coding: "direction / provenance of an inter-brain relation", selector: ".cross-relation__link", wordsAttr: "aria-label", state: (e) => e.getAttribute("data-direction") + "|" + e.getAttribute("data-provenance"), also: (e) => ({ glyph: e.querySelector(".cross-relation__glyph")?.textContent ?? null, arrow: e.querySelector(".cross-relation__arrow")?.textContent ?? null, provenanceWords: e.querySelector(".provenance, [class*=provenance]")?.textContent?.trim() ?? null }) },
    { coding: "review state of a suggestion", selector: '[data-testid="review-state"]', state: (e) => e.textContent.trim(), also: () => ({}) },
    { coding: "provenance of a relation", selector: '[data-testid="review-producer"], [data-testid="core-deterministic-relation"], .relation__provenance', state: (e) => e.textContent.trim().slice(0, 40), also: () => ({}) },
    { coding: "the report line: ok / failed", selector: ".app__report .ok, .app__report .ko", state: (e) => (e.classList.contains("ko") ? "ko" : "ok"), also: (e) => ({ marker: getComputedStyle(e, "::before").content }), noWords: true },
    { coding: "an aggregate of omitted children", selector: '[data-testid="map-aggregate-indicator"]', state: () => "aggregate", also: (e) => ({ label: e.getAttribute("aria-label"), dash: getComputedStyle(e.querySelector("rect")).strokeDasharray }) },
  ];
  function nonColourInventory() {
    return CODINGS.map((c) => {
      const els = [...document.querySelectorAll(c.selector)].filter(isRendered);
      const samples = els.slice(0, 40).map((e) => ({ state: c.state(e), words: c.wordsAttr ? (e.getAttribute(c.wordsAttr) ?? "").slice(0, 110) : c.textAlways ? e.textContent.trim() : visibleWords(c.wordsFrom ? c.wordsFrom(e) : e).slice(0, 70), glyph: (e.getAttribute("aria-hidden") === "true" ? e.textContent.trim() : hiddenGlyph(e)).slice(0, 20), ...c.also(e) }));
      const distinct = new Set(samples.map((s) => s.state));
      const wordsByState = {};
      for (const s of samples) (wordsByState[s.state] ??= new Set()).add(s.words);
      return {
        coding: c.coding,
        selector: c.selector,
        applicable: els.length > 0,
        count: els.length,
        states: [...distinct],
        everyOneSaysItInWords: c.noWords ? true : samples.every((s) => /\p{L}/u.test(s.words)),
        stateWordsDistinct: [...distinct].length < 2 ? null : new Set(Object.values(wordsByState).map((w) => [...w].sort().join("|"))).size === distinct.size,
        samples: samples.slice(0, 4),
      };
    });
  }
  /** Geometry (not colour) that differs between the states of the map's cards: stroke width / dash / opacity. */
  function cardStateGeometry() {
    const out = {};
    for (const e of document.querySelectorAll('[role="treeitem"] > rect')) {
      const g = e.parentElement;
      const state = ((g.getAttribute("class") ?? "").match(/map-node--(selected|related|cross-linked|linked|plain|skipped|root)\b/g) ?? []).join(" ");
      const kind = g.getAttribute("data-node-kind");
      const filter = g.getAttribute("data-filter-role") ?? "";
      const key = `${kind}|${state}|${filter}`;
      if (out[key]) continue;
      const cs = getComputedStyle(e);
      out[key] = { strokeWidth: parseFloat(cs.strokeWidth), dash: cs.strokeDasharray, fillOpacity: parseFloat(cs.fillOpacity), strokeOpacity: parseFloat(cs.strokeOpacity), ariaSelected: g.getAttribute("aria-selected"), label: clip(g.getAttribute("aria-label") ?? "", 50) };
    }
    return out;
  }
  /** Edges: a suggestion and an established relation differ by dash + marker, not by hue. */
  function edgeGeometry() {
    const out = {};
    for (const e of document.querySelectorAll(".map-view__edges path, .map-view__cross-edges path, [data-edge-kind] path")) {
      const g = e.closest("[data-edge-kind]") ?? e.parentElement;
      const key = `${g.getAttribute("data-edge-kind") ?? g.getAttribute("class")}|${g.getAttribute("data-provenance") ?? ""}|${g.getAttribute("data-relation-state") ?? ""}`;
      if (out[key]) continue;
      const cs = getComputedStyle(e);
      out[key] = { dash: cs.strokeDasharray, strokeWidth: parseFloat(cs.strokeWidth), markerEnd: cs.markerEnd, class: g.getAttribute("class") };
    }
    return out;
  }

  const nameOf = (e) => clip(accessibleName(e), 70);
  window.__t47 = { nameOf, visibleSamples, sweepPseudo, sweepGraphics, nonColourInventory, cardStateGeometry, edgeGeometry, visibleWords, parseColor, over, ratio, luminance, hex, backdrops, contrastOf, sweepText, sweepControls, tabbables, focusInfo, clipOf, describe, accessibleName, isRendered, restoreScroll, opacityChain, canvasBase };
})();
