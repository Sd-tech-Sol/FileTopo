import productProjection from "../../docs/performance/runs/TASK-0030-materialized-view-100k.json";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MapView from "./MapView";
import { buildHierarchy } from "./hierarchy";
import { composeTerritories } from "./territories";
import { fitView } from "./viewState";
import type { BrainRecord, MapProjection } from "./types";

// Produced by the Rust 100k test through the actual product boundary, not a TS harness.
const projection = productProjection as MapProjection;
const brainId = projection.brainId;
const record: BrainRecord = {brainId,displayName:"Synthetic",color:"#1F6F5C",icon:"▲",sourceKind:"SYNTHETIC_FIXTURE",sourceRef:"scale-runtime",sourceLabel:"scale-runtime",position:1};
const hierarchy = buildHierarchy(projection.nodes,projection.rootId);
const composition = composeTerritories([{brainId,layoutWidth:projection.layoutWidth,layoutHeight:projection.layoutHeight}]);
const viewport={width:1200,height:800};
afterEach(cleanup);
function mount() {
  const select=vi.fn(); const expand=vi.fn(); const change=vi.fn();
  render(<MapView brains={[{brainId,record,hierarchy,segments:[],relationNeighbours:new Set(),crossNeighbours:new Set(),nodeCount:projection.materializedCount,aggregates:projection.aggregates}]}
    crossSegments={[]} composition={composition} view={fitView(composition.world,viewport)} viewport={viewport}
    selected={{brainId,nodeId:projection.rootId}} focusedBrainId={brainId}
    onSelect={select} onExpand={expand} onViewChange={change} onViewportChange={() => {}}
    labelFor={n => n.name} territoryLabelFor={() => "Synthetic"} ariaLabel="Projection" />);
  return {select,expand,change};
}
it("renders the product 100k projection within its total entity budget, including aggregates", () => {
  mount();
  expect(projection.nodeCount).toBe(100000);
  expect(screen.getAllByRole("treeitem")).toHaveLength(projection.materializedCount);
  expect(document.querySelectorAll("[data-aggregate]")).toHaveLength(projection.aggregates.length);
  expect(projection.materializedCount+projection.aggregates.length).toBeLessThanOrEqual(projection.viewBudget);
  expect(document.body.textContent).not.toContain("synthetic-099999");
  expect(document.querySelectorAll(".map-hierarchy-edge")).toHaveLength(projection.hierarchyEdges.length);
});
it("expands an exact aggregate with Enter and Space without inventing a node selection", () => {
  const {expand,select}=mount();
  const button=screen.getByRole("button",{name:/enfants directs hors vue/});
  button.focus();
  fireEvent.keyDown(button,{key:"Enter"});
  fireEvent.keyDown(button,{key:" "});
  expect(expand).toHaveBeenCalledTimes(2);
  expect(expand).toHaveBeenCalledWith(brainId,projection.aggregates[0]);
  expect(select).not.toHaveBeenCalled();
});
it("keeps keyboard selection and pan/zoom available on the real bounded DTO", () => {
  const {select,change}=mount();
  const tree=screen.getByRole("tree"); tree.focus();
  fireEvent.keyDown(tree,{key:"ArrowRight"});
  expect(select).toHaveBeenCalledWith({brainId,nodeId:projection.nodes[1].id});
  fireEvent.keyDown(tree,{key:"+"});
  expect(change).toHaveBeenCalled();
});
