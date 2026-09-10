/**
 * `TASK-0018` — brain identity and per-brain session memory, on the control
 * that replaced the selector.
 *
 * What is checked here is what `K7`, `K8` and `K10` say in words: the identity
 * on screen comes from the catalogue, colour is never the only signal, the
 * keyboard alone can change which brains are shown, and two brains never share
 * a session state.
 *
 * **The claims are `TASK-0018`'s; the control is `TASK-0019`'s.** §4.4 of
 * `TASK-0019` replaces the single brain selector with the composition bar, so
 * `BrainSelector` and the per-brain `brainSession` module no longer exist.
 * Deleting their tests along with them would have quietly dropped `K7`, `K8`
 * and `K10` from the suite, so each claim is restated here against the control
 * that now carries it. `L9`'s last sentence is what makes the session half of
 * this legitimate: a composition of one brain has that brain's own key, so the
 * memory `K8` froze **is** the memory being exercised.
 *
 * `K10` also demands a **real** keystroke in the real WebView2. That belongs to
 * the host scenario, not to jsdom: what these tests establish is that the
 * control is reachable and operable **by key events at all** — a necessary
 * condition the host run then exercises for real.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompositionBar from "./CompositionBar";
import {
  addBrain,
  catalogueOrder,
  removeBrain,
  singleBrainView,
  type ComposedView,
} from "./composedView";
import {
  compositionKey,
  emptyCompositionMemory,
  recallComposition,
  rememberComposition,
  sameCompositionSession,
  shouldFitComposition,
} from "./compositionSession";
import type { BrainRecord } from "./types";
import type { View } from "./viewState";

afterEach(cleanup);

/** The three brains `TASK-0018` §4.2 freezes, as the catalogue returns them. */
const brains: BrainRecord[] = [
  {
    brainId: "brain-alpha",
    displayName: "Cerveau Alpha",
    color: "#1F6F5C",
    icon: "▲",
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "quasi-empty",
    sourceLabel: "quasi-empty",
    position: 1,
  },
  {
    brainId: "brain-beta",
    displayName: "Cerveau Bêta",
    color: "#4A4FA8",
    icon: "■",
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "deep",
    sourceLabel: "deep",
    position: 2,
  },
  {
    brainId: "brain-gamma",
    displayName: "Cerveau Gamma",
    color: "#9A5A18",
    icon: "◆",
    sourceKind: "SYNTHETIC_FIXTURE",
    sourceRef: "quasi-empty",
    sourceLabel: "quasi-empty",
    position: 3,
  },
];

const order = catalogueOrder(brains);

const barStrings = {
  label: "Cerveaux affichés",
  focused: "actif",
  add: "Ajouter",
  addEmpty: "Tous les cerveaux du catalogue sont déjà affichés",
  remove: "Retirer de la vue",
  removeRefused: "Impossible de retirer le dernier cerveau affiché",
  focus: "rendre actif",
  source: "source",
  busy: "Chargement…",
};

function renderBar(
  view: ComposedView = singleBrainView(order, "brain-alpha"),
  handlers: {
    onFocus?: (brainId: string) => void;
    onAdd?: (brainId: string) => void;
    onRemove?: (brainId: string) => void;
  } = {},
  options: { catalogue?: BrainRecord[]; showSource?: boolean } = {},
) {
  return render(
    <CompositionBar
      brains={options.catalogue ?? brains}
      view={view}
      onFocus={handlers.onFocus ?? (() => {})}
      onAdd={handlers.onAdd ?? (() => {})}
      onRemove={handlers.onRemove ?? (() => {})}
      strings={barStrings}
      showSource={options.showSource ?? false}
    />,
  );
}

describe("identité du cerveau à l'écran — K7", () => {
  it("affiche le cerveau focused avec son nom et son icône, venus du catalogue", () => {
    renderBar();
    const chip = screen.getByTestId("composition-chip-brain-alpha");
    expect(chip.textContent).toContain("Cerveau Alpha");
    expect(chip.textContent).toContain("▲");
    // `aria-current`, and the word — never the colour alone.
    expect(chip.getAttribute("aria-current")).toBe("true");
    expect(chip.textContent).toContain("actif");
  });

  it("montre les métadonnées modifiées plutôt que les valeurs gelées", () => {
    // `K7`: the interface must use the catalogue, so a renamed brain shows its
    // new name. Rendering the frozen table instead would pass every other test
    // and fail this one.
    const renamed = brains.map((brain) =>
      brain.brainId === "brain-alpha"
        ? { ...brain, displayName: "Cerveau renommé", icon: "◉", color: "#123456" }
        : brain,
    );
    renderBar(singleBrainView(order, "brain-alpha"), {}, { catalogue: renamed });
    const chip = screen.getByTestId("composition-chip-brain-alpha");
    expect(chip.textContent).toContain("Cerveau renommé");
    expect(chip.textContent).toContain("◉");
    expect(chip.textContent).not.toContain("Cerveau Alpha");
  });

  it("identifie chaque cerveau autrement que par la seule couleur", () => {
    const all = { displayedBrainIds: order, focusedBrainId: "brain-alpha" } as ComposedView;
    renderBar(all);

    const icons = new Set<string>();
    for (const brain of brains) {
      const chip = screen.getByTestId(`composition-chip-${brain.brainId}`);
      // A name in words, and a shape — both readable with no colour at all.
      expect(chip.textContent).toContain(brain.displayName);
      const icon = chip.querySelector(".composition__icon")?.textContent ?? "";
      expect(icon).not.toBe("");
      icons.add(icon);
      // The colour exists, but only on a decorative swatch.
      expect(chip.querySelector(".composition__swatch")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    }
    expect(icons.size).toBe(brains.length);

    // Exactly one brain says « actif », in words and to assistive technology.
    expect(screen.getByTestId("composition-chip-brain-alpha").getAttribute("aria-current")).toBe(
      "true",
    );
    expect(screen.getByTestId("composition-chip-brain-beta").getAttribute("aria-current")).toBe(
      null,
    );
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it("montre la source synthétique en diagnostic, jamais comme identité", () => {
    const twin = addBrain(singleBrainView(order, "brain-alpha"), order, "brain-gamma");
    renderBar(twin, {}, { showSource: true });

    // Alpha and Gamma read the same source, and the bar still tells them
    // apart: the source is a note, the identity is the name and the icon.
    const alpha = screen.getByTestId("composition-chip-brain-alpha");
    const gamma = screen.getByTestId("composition-chip-brain-gamma");
    expect(alpha.textContent).toContain("quasi-empty");
    expect(gamma.textContent).toContain("quasi-empty");
    expect(alpha.textContent).toContain("Cerveau Alpha");
    expect(gamma.textContent).toContain("Cerveau Gamma");
    expect(alpha.querySelector(".composition__source")).not.toBeNull();
  });
});

describe("clavier seul — K10, L10", () => {
  it("ouvre le menu, le parcourt et choisit au clavier seul", () => {
    const onAdd = vi.fn();
    renderBar(singleBrainView(order, "brain-alpha"), { onAdd });
    const trigger = screen.getByTestId("composition-add-trigger");

    // Reachable by focus, opened by a key, never by a pointer here.
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    // Only the brains not already displayed are offered, in catalogue order.
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.queryByTestId("composition-add-item-brain-alpha")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("composition-add-item-brain-beta"));

    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("composition-add-item-brain-gamma"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByTestId("composition-add-item-brain-beta"));

    // Enter on a menu item is what a browser turns into an activation.
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(screen.getByTestId("composition-add-item-brain-gamma"));
    fireEvent.click(document.activeElement!);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith("brain-gamma");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("referme le menu sur Échap sans rien ajouter", () => {
    const onAdd = vi.fn();
    renderBar(singleBrainView(order, "brain-alpha"), { onAdd });
    const trigger = screen.getByTestId("composition-add-trigger");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it("reste ouvert quand le focus quitte la fenêtre, pas la page — K10", () => {
    // A window deactivation raises `blur` with a null `relatedTarget`, exactly
    // like focus going nowhere. Closing on both is what made the real
    // keystroke of `K10` land on a button that had just been unmounted: the
    // host brings the window forward, the menu vanishes, the key hits nothing.
    renderBar();
    fireEvent.keyDown(screen.getByTestId("composition-add-trigger"), { key: "ArrowDown" });
    const item = screen.getByTestId("composition-add-item-brain-beta");
    expect(document.activeElement).toBe(item);

    fireEvent.blur(item, { relatedTarget: null });

    expect(screen.queryByRole("menu")).toBeTruthy();
    expect(screen.getByTestId("composition-add-item-brain-beta")).toBeTruthy();
  });

  it("se referme quand le focus part vers un autre élément de la page", () => {
    const onAdd = vi.fn();
    const { container } = renderBar(singleBrainView(order, "brain-alpha"), { onAdd });
    const outside = document.createElement("button");
    container.appendChild(outside);
    fireEvent.keyDown(screen.getByTestId("composition-add-trigger"), { key: "ArrowDown" });

    fireEvent.blur(screen.getByTestId("composition-add-item-brain-beta"), {
      relatedTarget: outside,
    });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("la barre suit le cerveau focused quand il change", () => {
    function Harness() {
      const [view, setView] = useState<ComposedView>(() =>
        addBrain(singleBrainView(order, "brain-alpha"), order, "brain-beta"),
      );
      return (
        <CompositionBar
          brains={brains}
          view={view}
          onFocus={(brainId) => setView({ ...view, focusedBrainId: brainId })}
          onAdd={() => {}}
          onRemove={(brainId) => setView(removeBrain(view, order, brainId))}
          strings={barStrings}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByTestId("composition-chip-brain-beta"));

    expect(screen.getByTestId("composition-chip-brain-beta").getAttribute("aria-current")).toBe(
      "true",
    );
    expect(screen.getByTestId("composition-chip-brain-alpha").getAttribute("aria-current")).toBe(
      null,
    );
  });

  it("garde le × du dernier cerveau atteignable, et refuse — L6, L12.14", () => {
    // `disabled` would take the button out of the focus order, so a keyboard
    // user could neither reach it nor learn why. `aria-disabled` keeps it
    // reachable and the model does the refusing.
    const onRemove = vi.fn();
    renderBar(singleBrainView(order, "brain-alpha"), { onRemove });
    const button = screen.getByTestId("composition-remove-brain-alpha");

    expect(button).not.toBeDisabled();
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-label")).toContain(barStrings.removeRefused);

    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);

    // The bar asks; refusing is the model's job, and it does — see
    // `composedView.test.ts`. What the bar must not do is hide the control.
    expect(onRemove).toHaveBeenCalledWith("brain-alpha");
    expect(() => removeBrain(singleBrainView(order, "brain-alpha"), order, "brain-alpha")).toThrow(
      /dernier/,
    );
  });
});

describe("mémoire de session par cerveau — K8, sous la clé de composition L9", () => {
  const alphaView: View = { scale: 2.5, tx: -120, ty: 40 };
  const betaView: View = { scale: 0.75, tx: 18, ty: -6 };

  /** A composition of one brain has that brain's own key — `L9`, last line. */
  const keyOf = (brainId: string) => compositionKey([brainId]);

  it("rend à chaque cerveau ce qu'il a laissé, et rien d'un autre", () => {
    expect(keyOf("brain-alpha")).toBe("brain-alpha");

    let memory = emptyCompositionMemory();
    memory = rememberComposition(memory, keyOf("brain-alpha"), {
      selected: { brainId: "brain-alpha", nodeId: 7 },
      view: alphaView,
    });
    memory = rememberComposition(memory, keyOf("brain-beta"), {
      selected: { brainId: "brain-beta", nodeId: 140 },
      view: betaView,
    });

    expect(recallComposition(memory, keyOf("brain-alpha"))).toEqual({
      selected: { brainId: "brain-alpha", nodeId: 7 },
      view: alphaView,
    });
    expect(recallComposition(memory, keyOf("brain-beta"))).toEqual({
      selected: { brainId: "brain-beta", nodeId: 140 },
      view: betaView,
    });
    // A brain never visited has nothing to restore — and no default borrowed
    // from a neighbour.
    expect(recallComposition(memory, keyOf("brain-gamma"))).toBeNull();
  });

  it("n'écrase jamais un cerveau en enregistrant un autre", () => {
    let memory = emptyCompositionMemory();
    memory = rememberComposition(memory, keyOf("brain-alpha"), {
      selected: { brainId: "brain-alpha", nodeId: 7 },
      view: alphaView,
    });
    const alphaBefore = recallComposition(memory, keyOf("brain-alpha"));

    memory = rememberComposition(memory, keyOf("brain-beta"), {
      selected: { brainId: "brain-beta", nodeId: 1 },
      view: betaView,
    });
    memory = rememberComposition(memory, keyOf("brain-beta"), {
      selected: { brainId: "brain-beta", nodeId: 2 },
      view: alphaView,
    });

    expect(
      sameCompositionSession(recallComposition(memory, keyOf("brain-alpha")), alphaBefore),
    ).toBe(true);
    expect(recallComposition(memory, keyOf("brain-beta"))?.selected?.nodeId).toBe(2);
  });

  it("rend une copie, pour qu'un appelant ne puisse pas modifier la mémoire", () => {
    let memory = emptyCompositionMemory();
    memory = rememberComposition(memory, keyOf("brain-alpha"), {
      selected: { brainId: "brain-alpha", nodeId: 7 },
      view: alphaView,
    });

    const recalled = recallComposition(memory, keyOf("brain-alpha"))!;
    recalled.view.scale = 999;
    recalled.selected = { brainId: "brain-beta", nodeId: -1 };

    expect(recallComposition(memory, keyOf("brain-alpha"))).toEqual({
      selected: { brainId: "brain-alpha", nodeId: 7 },
      view: alphaView,
    });
  });

  it("ne partage rien entre deux cerveaux qui lisent la même source", () => {
    // `brain-alpha` and `brain-gamma` read `quasi-empty`, so the *same* node id
    // is valid in both. The memory must still keep them apart.
    let memory = emptyCompositionMemory();
    memory = rememberComposition(memory, keyOf("brain-alpha"), {
      selected: { brainId: "brain-alpha", nodeId: 6 },
      view: alphaView,
    });
    memory = rememberComposition(memory, keyOf("brain-gamma"), {
      selected: { brainId: "brain-gamma", nodeId: 6 },
      view: betaView,
    });

    const alpha = recallComposition(memory, keyOf("brain-alpha"))!;
    const gamma = recallComposition(memory, keyOf("brain-gamma"))!;
    expect(alpha.selected?.nodeId).toBe(gamma.selected?.nodeId);
    expect(sameCompositionSession(alpha, gamma)).toBe(false);
    expect(alpha.view).toEqual(alphaView);
    expect(gamma.view).toEqual(betaView);
  });

  it("n'ajuste la vue qu'une fois par composition — la régression que K12 a trouvée", () => {
    // The viewport is measured after the first render, so the placeholder 1×1
    // fit has to be redone. Redoing it a second time is what erased a restored
    // view in the real host, with `K12` publishing `alphaRestored=false`.
    const measured = { key: keyOf("brain-alpha"), width: 1200, height: 800 };
    const placeholder = { key: keyOf("brain-alpha"), width: 1, height: 1 };

    // Never positioned, or positioned for another composition: fit.
    expect(shouldFitComposition(null, keyOf("brain-alpha"))).toBe(true);
    expect(shouldFitComposition(measured, keyOf("brain-gamma"))).toBe(true);
    // Fitted against the placeholder viewport: that fit meant nothing, redo it.
    expect(shouldFitComposition(placeholder, keyOf("brain-alpha"))).toBe(true);
    // Already positioned against a real viewport: leave it alone.
    expect(shouldFitComposition(measured, keyOf("brain-alpha"))).toBe(false);
  });

  it("compare deux états de session sur leurs valeurs, pas sur leur identité", () => {
    const state = { selected: { brainId: "brain-alpha", nodeId: 3 }, view: alphaView };
    expect(
      sameCompositionSession(state, {
        selected: { brainId: "brain-alpha", nodeId: 3 },
        view: { ...alphaView },
      }),
    ).toBe(true);
    expect(
      sameCompositionSession(state, {
        selected: { brainId: "brain-alpha", nodeId: 3 },
        view: betaView,
      }),
    ).toBe(false);
    // Same node id, other brain: not the same selection — `K5`, `L3`.
    expect(
      sameCompositionSession(state, {
        selected: { brainId: "brain-gamma", nodeId: 3 },
        view: alphaView,
      }),
    ).toBe(false);
    expect(sameCompositionSession(state, null)).toBe(false);
    expect(sameCompositionSession(null, null)).toBe(true);
  });
});
