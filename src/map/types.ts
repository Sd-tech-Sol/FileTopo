/** DTOs of the map slice, mirroring `src-tauri/src/map`. */

/* --- TASK-0018 — cerveaux ------------------------------------------------- */

/** The only source kind this slice resolves. */
export type SourceKind = "SYNTHETIC_FIXTURE";

/**
 * A brain, as the catalogue holds it.
 *
 * `brainId` is a **FileTopo identity**, not a source: two brains may carry the
 * same `sourceRef` and must stay completely independent — `DEC-0017`.
 */
export interface BrainRecord {
  brainId: string;
  displayName: string;
  color: string;
  icon: string;
  sourceKind: SourceKind;
  /** What the brain reads. A developer diagnostic, never its identity. */
  sourceRef: string;
  position: number;
}

export interface BrainCatalogView {
  brains: BrainRecord[];
  activeBrainId: string;
  schemaVersion: number;
  /** Named relative to the sandbox; never an absolute path. */
  catalogPath: string;
  seeded: number;
}

/**
 * The logical boundary of every node operation — `TASK-0018` §4.1 rule 4.
 *
 * A `nodeId` alone is a row number, valid in one brain's index and meaningless
 * in another's. The pair travels together so a selection left over from the
 * previous brain cannot resolve in the current one.
 */
export interface BrainNodeRef {
  brainId: string;
  nodeId: number;
}

export type MapNodeKind = "root" | "directory" | "file" | "skipped";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapNode {
  id: number;
  parentId: number | null;
  name: string;
  relativePath: string;
  kind: MapNodeKind;
  depth: number;
  sizeBytes: number;
  modifiedUnixMs: number | null;
  childCount: number;
  /** Access diagnostic raised by the scanner. Displayed, never hidden — P-12. */
  accessDiagnostic: string | null;
  rect: Rect;
}

export interface ScanDiagnostic {
  code: string;
  relativePath: string;
}

export interface MapSnapshot {
  brainId: string;
  fixtureId: string;
  label: string;
  rootId: number;
  nodeCount: number;
  layoutWidth: number;
  layoutHeight: number;
  schemaVersion: number;
  /** Persisted by and read from the backend map index. */
  layoutAlgorithm: string;
  nodes: MapNode[];
  diagnostics: ScanDiagnostic[];
}

export interface NodeDetail {
  node: MapNode;
  parent: MapNode | null;
  children: MapNode[];
}

export interface FixtureSummary {
  id: string;
  labelFr: string;
  labelEn: string;
  seed: string;
  maxNodes: number;
  plannedNodes: number;
  plannedMaxDepth: number;
}

export interface MapBuildReport {
  brainId: string;
  fixtureId: string;
  /** Where the index landed, relative to the sandbox — `K3`. */
  indexPath: string;
  nodeCount: number;
  plannedNodes: number;
  maxDepth: number;
  nodeCeiling: number;
  depthCeiling: number;
  rebuilt: boolean;
  scanMs: number;
  layoutMs: number;
  indexMs: number;
  totalMs: number;
  layoutInvocations: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
  readOnlyConfirmed: boolean;
  reconstructibleDigest: string;
  nonReconstructible: string[];
  schemaVersion: number;
  layoutAlgorithm: string;
  diagnostics: ScanDiagnostic[];
}

export interface HostInfo {
  sandboxRoot: string;
  appVersion: string;
  sqliteVersion: string;
  webviewVersion: string;
  tauriVersion: string;
  platform: string;
  nodeCeiling: number;
  depthCeiling: number;
  cardWidth: number;
  cardHeight: number;
  layoutAlgorithm: string;
  autoMeasure: boolean;
  autoVerify: boolean;
  autoRelations: boolean;
  /** `0` none, `1` steps K12.1–K12.9, `2` steps K12.10–K12.12. */
  autoBrainsPass: number;
  /**
   * `L12` — `0` none, `1` the sixteen steps before the real restart, `2` the
   * seventeenth, which only a relaunched process can observe.
   *
   * Kept apart from {@link autoBrainsPass} because `K12` and `L12` prove
   * different things and must remain replayable one without the other.
   */
  autoComposedPass: number;
  /**
   * `M12` — `0` none, `1` the twenty-three steps before the real restart, `2`
   * the five only a relaunched process can observe.
   */
  autoCrossPass: number;
  /** `N15` — `0` none, `1` interaction pass, `2` post-restart pass. */
  autoTopographicPass: number;
  /** `EC15` — `0` none, `1` observation pass, `2` persisted restart pass. */
  autoContentPass: number;
  /** `DR15` — `0` none, `1` interaction pass, `2` persistence pass. */
  autoDrePass: number;
  /**
   * Reserve `X11` — the generic-brain proof, on `brain-beta`.
   *
   * A flag rather than a pass count: one process is enough to show that the
   * engine and the panel work outside the frozen legacy fixture.
   */
  autoGenericRelations: boolean;
}

/* --- TASK-0023 — observations cryptographiques exactes ------------------ */

export type ContentObservationStatus =
  | "HASHED"
  | "UNREADABLE"
  | "UNSTABLE_DURING_READ"
  | "UNSUPPORTED";

export interface ContentObservation {
  relativePath: string;
  sizeBytes: number;
  modifiedUnixMs: number | null;
  observationStatus: ContentObservationStatus;
  hashAlgorithm: "sha256-v1" | null;
  hashHex: string | null;
  observedAtUnixMs: number;
  generationId: string;
  diagnostic: string | null;
}

export interface ContentObservationSummary {
  brainId: string;
  /** Relative to the sandbox, never a personal absolute path. */
  storePath: string;
  schemaVersion: number;
  signalEngineVersion: "sha256-v1";
  currentGenerationId: string | null;
  currentGenerationObservedAt: number | null;
  sourceFingerprint: string | null;
  observationCount: number;
  hashedCount: number;
  unreadableCount: number;
  unstableCount: number;
  unsupportedCount: number;
}

export interface ContentObservationReport {
  brainId: string;
  storePath: string;
  schemaVersion: number;
  signalEngineVersion: "sha256-v1";
  generationId: string;
  observedAt: number;
  sourceFingerprintBefore: string;
  sourceFingerprintAfter: string;
  sourceStable: boolean;
  indexedFileCount: number;
  hashedCount: number;
  unreadableCount: number;
  unstableCount: number;
  unsupportedCount: number;
  bytesRead: number;
  hashAlgorithm: "sha256-v1";
  readOnlyConfirmed: boolean;
  filesOpenedForHash: number;
  digestsComputed: number;
  durationMs: number;
}

export interface FixtureIntegrity {
  brainId: string;
  fixtureId: string;
  fingerprint: string;
  filetopoArtifacts: string[];
  observedEntries: number;
}

export interface MapSelfCheck {
  brainId: string;
  fixtureId: string;
  plannedPaths: number;
  observedPaths: number;
  indexedPaths: number;
  pathsAgree: boolean;
  missingFromIndex: string[];
  unexpectedInIndex: string[];
  layoutViolations: string[];
  hierarchyMismatches: string[];
  detailMismatches: string[];
}

/* --- TASK-0017 — relations transversales avec provenance ------------------ */

/**
 * The only two provenances an established relation can have.
 *
 * There is no third value, and a suggestion is not one of them: it is a
 * separate object with its own state — correction `X1`.
 */
export type RelationProvenance = "DETERMINISTIC" | "APPROVED";

export type RelationDirection = "outgoing" | "incoming";

export interface RelationEndpoint {
  key: string;
  /** `null` when the current index does not hold this endpoint. */
  nodeId: number | null;
  name: string;
  relativePath: string;
}

export interface RelationEdge {
  id: number;
  provenance: RelationProvenance;
  relationType: string;
  source: RelationEndpoint;
  target: RelationEndpoint;
  /** Present exactly when the provenance is `DETERMINISTIC` — J6. */
  ruleName: string | null;
  ruleVersion: string | null;
  suggestionKey: string | null;
  producer?: string;
  explanationFr?: string | null;
  explanationEn?: string | null;
  contentGenerationId?: string | null;
  observedHash?: string | null;
}

/**
 * A suggestion, as its own type all the way to the screen.
 *
 * Deliberately not a `RelationEdge` with a flag: no rendering path can mistake
 * one for the other if they never share a type.
 */
export interface SuggestionEdge {
  suggestionKey: string;
  relationType: string;
  source: RelationEndpoint;
  target: RelationEndpoint;
  state: "pending" | "approved";
  basis: string;
  producer?: string;
  ruleName?: string | null;
  ruleVersion?: string | null;
  explanationFr?: string | null;
  explanationEn?: string | null;
  signals?: Record<string, unknown> | null;
}

export interface RelationRuleInfo {
  name: string;
  version: string;
  relationType: string;
  symmetric: boolean;
  produced: number;
}

export interface RelationsOverview {
  brainId: string;
  fixtureId: string;
  /** Where this brain's relations live, relative to the sandbox — `K3`. */
  relationsPath: string;
  schemaVersion: number;
  endpointKeyScheme: string;
  /**
   * `false` when the source is outside the frozen **legacy** scope of
   * `TASK-0017`. It says the historical demonstration relations do not
   * apply to this brain, and nothing more: the panel, the `dre-v1`
   * engine, the core relations and their approval stay available.
   */
  legacyInScope: boolean;
  established: RelationEdge[];
  /** Pending only — an approved suggestion is already a relation. */
  pendingSuggestions: SuggestionEdge[];
  deterministicCount: number;
  approvedCount: number;
  pendingSuggestionCount: number;
  rules: RelationRuleInfo[];
  unresolvedEndpoints: string[];
  deterministicDigest: string;
  seeded: number;
  engineCurrent?: boolean;
}

export interface NodeRelationEntry {
  direction: RelationDirection;
  provenance: RelationProvenance;
  relationType: string;
  other: RelationEndpoint;
  ruleName: string | null;
  ruleVersion: string | null;
  producer?: string;
  explanationFr?: string | null;
  explanationEn?: string | null;
  contentGenerationId?: string | null;
  observedHash?: string | null;
}

export interface SkippedRule {
  ruleId: string;
  version: string;
  reason: string;
}

export interface RelationEngineReport {
  brainId: string;
  engineVersion: "dre-v1";
  runId: string;
  mapDigest: string;
  contentGenerationId: string | null;
  rulesEvaluated: string[];
  rulesSkipped: SkippedRule[];
  deterministicRelationsProduced: number;
  suggestionsProduced: number;
  emptyContentGroupsSkipped: number;
  establishedCollisionSuppressions: number;
  approvedSuggestionPreservations: number;
  sourceReadOnlyConfirmed: boolean;
  inputState: "CURRENT";
}

export interface RelationEngineStatus {
  brainId: string;
  engineVersion: "dre-v1";
  inputState: "NOT_RUN" | "CURRENT" | "STALE";
  mapDigest: string;
  currentContentGenerationId: string | null;
  lastRunId: string | null;
  lastRunUnixMs: number | null;
  lastMapDigest: string | null;
  lastContentGenerationId: string | null;
}

export interface NodeRelations {
  brainId: string;
  fixtureId: string;
  /** The node this panel is about, as the pair that identifies it. */
  reference: BrainNodeRef;
  endpointKey: string;
  relativePath: string;
  outgoing: NodeRelationEntry[];
  incoming: NodeRelationEntry[];
  outgoingCount: number;
  incomingCount: number;
  /** Never counted in `outgoingCount` or `incomingCount`. */
  suggestions: SuggestionEdge[];
}

export interface CountComparison {
  relativePath: string;
  expectedOutgoing: number;
  observedOutgoing: number;
  expectedIncoming: number;
  observedIncoming: number;
  matches: boolean;
}

export interface RejectionOutcome {
  case: string;
  attempt: string;
  expectedMotif: string;
  observedMotif: string;
  rejected: boolean;
}

export interface RelationsSelfCheck {
  brainId: string;
  fixtureId: string;
  establishedTotal: number;
  deterministicTotal: number;
  approvedTotal: number;
  pendingSuggestionTotal: number;
  rejections: RejectionOutcome[];
  allRejected: boolean;
  replayDigestFirst: string;
  replayDigestSecond: string;
  replayStable: boolean;
  counts: CountComparison[];
  countsAgree: boolean;
  approvedSinceSeed: string[];
  inventedInverses: string[];
  suggestionsInEstablished: string[];
  unresolvedEndpoints: string[];
}

/* --- TASK-0020 — relations inter-cerveaux explicites ---------------------- */

/**
 * One end of an inter-brain relation, resolved in **its own** brain.
 *
 * `brainId` is not decoration: `brain-alpha` and `brain-gamma` read the same
 * tree, so `dossier-a/note-1.txt` exists in both and an endpoint that did not
 * name its brain would resolve in whichever index was asked first.
 */
export interface CrossEndpoint {
  key: string;
  brainId: string;
  /** From the catalogue, so the panel says « Cerveau Gamma », not an id. */
  brainDisplayName: string;
  brainIcon: string;
  /** `null` when that brain's current index does not hold this endpoint. */
  nodeId: number | null;
  name: string;
  relativePath: string;
  /**
   * `false` when the brain's index has never been built in this sandbox.
   *
   * Deliberately **not** the same question as « is this brain displayed ».
   * The store knows nothing about the composition; whether an endpoint is on
   * screen is decided in the interface, from the composed view.
   */
  brainIndexed: boolean;
}

export interface CrossRelationEdge {
  id: number;
  provenance: RelationProvenance;
  relationType: string;
  source: CrossEndpoint;
  target: CrossEndpoint;
  /** Present exactly when the provenance is `DETERMINISTIC` — `M7`. */
  ruleName: string | null;
  ruleVersion: string | null;
  suggestionKey: string | null;
}

/**
 * An inter-brain suggestion, as its own type all the way to the screen.
 *
 * Deliberately not a {@link CrossRelationEdge} with a flag: no rendering path
 * can mistake one for the other if they never share a type — `M10`.
 */
export interface CrossSuggestionEdge {
  suggestionKey: string;
  relationType: string;
  source: CrossEndpoint;
  target: CrossEndpoint;
  state: "pending" | "approved";
  basis: string;
}

export interface CrossRuleInfo {
  name: string;
  version: string;
  relationType: string;
  symmetric: boolean;
  produced: number;
}

export interface CrossRelationsOverview {
  /** The COMMON store, named relative to the sandbox — `M1`, §4.1. */
  storePath: string;
  schemaVersion: number;
  endpointKeyScheme: string;
  established: CrossRelationEdge[];
  /** Pending only — an approved suggestion is already a relation. */
  pendingSuggestions: CrossSuggestionEdge[];
  deterministicCount: number;
  approvedCount: number;
  pendingSuggestionCount: number;
  rules: CrossRuleInfo[];
  unresolvedEndpoints: string[];
  resolvedBrainIds: string[];
  deterministicDigest: string;
  seeded: number;
}

export interface NodeCrossRelationEntry {
  direction: RelationDirection;
  provenance: RelationProvenance;
  relationType: string;
  /** The end that is not the selected node — always in another brain. */
  other: CrossEndpoint;
  ruleName: string | null;
  ruleVersion: string | null;
  suggestionKey: string | null;
}

export interface NodeCrossRelations {
  reference: BrainNodeRef;
  endpointKey: string;
  relativePath: string;
  outgoing: NodeCrossRelationEntry[];
  incoming: NodeCrossRelationEntry[];
  outgoingCount: number;
  incomingCount: number;
  /** Never counted in `outgoingCount` or `incomingCount` — `M10`. */
  suggestions: CrossSuggestionEdge[];
}

export interface CrossCountComparison {
  brainId: string;
  relativePath: string;
  expectedOutgoing: number;
  observedOutgoing: number;
  expectedIncoming: number;
  observedIncoming: number;
  matches: boolean;
}

export interface CrossRejectionOutcome {
  case: string;
  attempt: string;
  expectedMotif: string;
  observedMotif: string;
  rejected: boolean;
}

export interface CrossRelationsSelfCheck {
  storePath: string;
  establishedTotal: number;
  deterministicTotal: number;
  approvedTotal: number;
  pendingSuggestionTotal: number;
  rejections: CrossRejectionOutcome[];
  allRejected: boolean;
  replayDigestFirst: string;
  replayDigestSecond: string;
  replayStable: boolean;
  counts: CrossCountComparison[];
  countsAgree: boolean;
  approvedSinceSeed: string[];
  inventedInverses: string[];
  suggestionsInEstablished: string[];
  unresolvedEndpoints: string[];
  /** `M1` — established relations whose two ends are in one brain. Empty. */
  sameBrainRelations: string[];
  resolvedBrainIds: string[];
}

/** One frozen `XBR-1` reference, published by the backend — §4.4. */
export interface FrozenCrossReference {
  reference: string;
  sourceBrainId: string;
  sourceKey: string;
  targetBrainId: string;
  targetKey: string;
  relationType: string;
  ruleName: string;
  ruleVersion: string;
}
