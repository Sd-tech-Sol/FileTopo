import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExactDuplicateExplorer from "./ExactDuplicateExplorer";
import type {
  ExactDuplicateGroup,
  ExactDuplicateGroupPage,
  ExactDuplicateMemberPage,
  ExactDuplicateSummary,
} from "./types";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const hash = "a".repeat(64);
const group: ExactDuplicateGroup = {
  groupId: `sha256-v1:${hash}`,
  hashAlgorithm: "sha256-v1",
  hashHex: hash,
  sizeBytes: 0,
  memberCount: 101,
  emptyContent: true,
  generationId: "generation-1",
  observedAtUnixMs: 1_700_000_000_000,
};

const summary: ExactDuplicateSummary = {
  brainId: "brain-alpha",
  availability: "AVAILABLE",
  generationId: "generation-1",
  observedAtUnixMs: 1_700_000_000_000,
  hashAlgorithm: "sha256-v1",
  exactGroupCount: 51,
  groupedOccurrenceCount: 201,
  emptyGroupCount: 1,
  queryDurationMs: 1,
};

function groupPage(offset: number): ExactDuplicateGroupPage {
  return {
    brainId: "brain-alpha",
    availability: "AVAILABLE",
    generationId: "generation-1",
    observedAtUnixMs: 1_700_000_000_000,
    hashAlgorithm: "sha256-v1",
    totalGroups: 51,
    offset,
    limit: 50,
    maxLimit: 100,
    returned: offset === 0 ? 50 : 1,
    hasMore: offset === 0,
    order: "size_bytes descending, hash_hex ascending",
    queryDurationMs: 1,
    groups: offset === 0 ? [group] : [{ ...group, groupId: `sha256-v1:${"b".repeat(64)}` }],
  };
}

function memberPage(offset: number): ExactDuplicateMemberPage {
  return {
    brainId: "brain-alpha",
    groupId: group.groupId,
    generationId: "generation-1",
    observedAtUnixMs: 1_700_000_000_000,
    hashAlgorithm: "sha256-v1",
    hashHex: hash,
    totalMembers: 101,
    unresolvedReturned: offset === 0 ? 0 : 1,
    offset,
    limit: 50,
    maxLimit: 100,
    returned: offset === 0 ? 50 : 50,
    hasMore: offset < 100,
    order: "relative_path ascending",
    queryDurationMs: 1,
    members: [
      {
        relativePath: offset === 0 ? "empty/a.bin" : "empty/z.bin",
        name: offset === 0 ? "a.bin" : "z.bin",
        sizeBytes: 0,
        observationStatus: "HASHED",
        hashAlgorithm: "sha256-v1",
        hashHex: hash,
        observedAtUnixMs: 1_700_000_000_000,
        generationId: "generation-1",
        nodeRef: offset === 0 ? { brainId: "brain-alpha", nodeId: 7 } : null,
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  invokeMock.mockReset();
});

describe("TASK-0026 exact duplicate explorer", () => {
  it("distinguishes no campaign from zero groups and states the semantic boundary", async () => {
    invokeMock.mockResolvedValue({
      ...summary,
      availability: "NOT_OBSERVED",
      generationId: null,
      observedAtUnixMs: null,
      exactGroupCount: 0,
      groupedOccurrenceCount: 0,
      emptyGroupCount: 0,
    });
    render(<ExactDuplicateExplorer brainId="brain-alpha" revision={0} onSelect={vi.fn()} />);
    expect(await screen.findByText("Observer le contenu d’abord")).toBeVisible();
    expect(screen.queryByText(/0 doublon/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("duplicate-boundary")).toHaveTextContent(
      "Cela ne prouve pas qu’il s’agit du même fichier physique ni d’une copie",
    );
  });

  it("pages groups and members, exposes the full digest, and navigates without mutation", async () => {
    const selected = vi.fn();
    invokeMock.mockImplementation((command: string, args?: { offset?: number }) => {
      if (command === "map_exact_duplicate_summary") return Promise.resolve(summary);
      if (command === "map_exact_duplicate_groups") return Promise.resolve(groupPage(args?.offset ?? 0));
      if (command === "map_exact_duplicate_members") return Promise.resolve(memberPage(args?.offset ?? 0));
      return Promise.reject(new Error(`unexpected command ${command}`));
    });
    render(<ExactDuplicateExplorer brainId="brain-alpha" revision={0} onSelect={selected} />);
    fireEvent.click(await screen.findByTestId("open-duplicate-explorer"));
    expect(await screen.findByTestId("duplicate-group-page")).toHaveTextContent("1–50 sur 51");
    fireEvent.click(screen.getByTestId("duplicate-group"));
    expect(await screen.findByText("Groupe de contenus vides")).toBeVisible();
    expect(screen.getByTestId("duplicate-digest")).toHaveTextContent(hash);
    expect(screen.getByTestId("duplicate-digest").textContent).toHaveLength(64);
    fireEvent.click(screen.getByTestId("duplicate-member"));
    expect(selected).toHaveBeenCalledWith({ brainId: "brain-alpha", nodeId: 7 });
    expect(invokeMock.mock.calls.map(([command]) => command)).not.toContain(
      "map_relations_approve",
    );

    fireEvent.click(screen.getByTestId("duplicate-members-next"));
    expect(await screen.findByTestId("duplicate-member-unresolved")).toHaveTextContent(
      "observation persistée, non résolue",
    );

    fireEvent.click(screen.getByTestId("duplicate-groups-next"));
    await waitFor(() => expect(screen.getByTestId("duplicate-group-page")).toHaveTextContent("51–51"));
  });

  it("reloads the focused brain summary when a content campaign changes revision", async () => {
    invokeMock.mockResolvedValue(summary);
    const rendered = render(
      <ExactDuplicateExplorer brainId="brain-alpha" revision={0} onSelect={vi.fn()} />,
    );
    await screen.findByTestId("open-duplicate-explorer");
    rendered.rerender(
      <ExactDuplicateExplorer brainId="brain-alpha" revision={1} onSelect={vi.fn()} />,
    );
    await waitFor(() => {
      expect(
        invokeMock.mock.calls.filter(([command]) => command === "map_exact_duplicate_summary"),
      ).toHaveLength(2);
    });
  });
});
