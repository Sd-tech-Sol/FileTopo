import { fireEvent, screen } from "@testing-library/react";

/**
 * `TASK-0060` / `ACTION-0111` — open one of the shell's named `<details>` groups the way a
 * person does: a click on its `summary`.
 *
 * jsdom does not implement a closed `<details>`. It gives the children of a closed group a
 * place in the tree and a click target exactly like an open group's, so a test that clicks
 * a command inside one passes with the group closed and says nothing about the disclosure.
 * Every jsdom test that drives a command living in a group opens that group first through
 * this helper, and the helper refuses to go on if the click did not open it. What a closed
 * group does on screen is measured in WebView2, in `scripts/task0060-primary-chrome.mjs`,
 * and only there.
 */
export type ShellGroup = "chrome-advanced-tools" | "chrome-diagnostics" | "map-advanced-tools";

export function openGroup(testid: ShellGroup): HTMLDetailsElement {
  const group = screen.getByTestId(testid) as HTMLDetailsElement;
  if (!group.open) {
    const summary = group.querySelector(":scope > summary");
    if (!summary) throw new Error(`the group ${testid} has no summary`);
    fireEvent.click(summary);
  }
  if (!group.open) throw new Error(`the group ${testid} did not open when its summary was clicked`);
  return group;
}
