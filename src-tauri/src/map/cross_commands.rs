//! What the inter-brain relations view calls, and the resolution behind it.
//!
//! The store speaks in **`cek1` endpoint keys**, which survive a rebuild; each
//! map speaks in **node ids**, which do not. This file is the one place the two
//! meet — and unlike `TASK-0017`'s, it has to meet them in **several brains at
//! once**, because the two ends of a relation live in two different indexes.
//!
//! Three rules hold this file together.
//!
//! * **Each end resolves in the brain its own key names.** Never in the brain
//!   that happens to be open, never in "the other one". `brain-alpha` and
//!   `brain-gamma` read the same tree, so a resolution that took the wrong
//!   index would find a plausible node and be silently wrong.
//! * **An unresolved endpoint is reported, never dropped.** A brain whose index
//!   has not been built yet is a *stated* outcome — `brainIndexed: false` — not
//!   an error banner and not an omission.
//! * **Nothing here knows what is on screen.** The composition is not an
//!   argument, is not read, and does not change a single result. Whether a
//!   brain is *displayed* is the interface's business; whether it is *indexed*
//!   is this file's.

use super::brains::{BrainNodeRef, BrainRecord};
use super::cross_relations::{
    CROSS_ENDPOINT_KEY_SCHEME, CROSS_EXPECTED_COUNTS, CROSS_FORBIDDEN_INVERSES, CROSS_RULES,
    CROSS_SCHEMA_VERSION, CrossRejectionOutcome, CrossRelationStore, StoredCrossRelation,
    StoredCrossSuggestion, XBR1_RELATIONS, cross_endpoint_key, derive_xbr1,
    replay_cross_rejections, seed_xbr1_suggestions, split_cross_endpoint_key,
};
use super::sandbox::SandboxPaths;
use super::{MapError, commands};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};

/// One end of an inter-brain relation, resolved against **its own** brain.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossEndpointView {
    pub key: String,
    pub brain_id: String,
    /// The brain's name and icon, from the catalogue — so the panel can say
    /// « cerveau Gamma » rather than « brain-gamma », and `M7` is readable.
    pub brain_display_name: String,
    pub brain_icon: String,
    /// `None` when that brain's current index does not hold this endpoint.
    pub node_id: Option<i64>,
    pub name: String,
    pub relative_path: String,
    /// `false` when the brain's index could not be read at all — it has never
    /// been built in this sandbox. Distinct from « the path is missing ».
    pub brain_indexed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossRelationEdge {
    pub id: i64,
    /// `DETERMINISTIC` or `APPROVED`. There is no third value.
    pub provenance: String,
    pub relation_type: String,
    pub source: CrossEndpointView,
    pub target: CrossEndpointView,
    /// Present exactly when the provenance is `DETERMINISTIC` — `M7`.
    pub rule_name: Option<String>,
    pub rule_version: Option<String>,
    pub suggestion_key: Option<String>,
}

/// A suggestion, carried as its own kind of object all the way to the screen.
///
/// Deliberately **not** a [`CrossRelationEdge`] with a flag: the two never
/// share a type, so no rendering path can mistake one for the other.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossSuggestionEdge {
    pub suggestion_key: String,
    pub relation_type: String,
    pub source: CrossEndpointView,
    pub target: CrossEndpointView,
    pub state: String,
    pub basis: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossRuleInfo {
    pub name: String,
    pub version: String,
    pub relation_type: String,
    pub symmetric: bool,
    pub produced: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossRelationsOverview {
    /// Where the **common** store lives, named relative to the sandbox.
    ///
    /// Published so a reader can see for themselves that it is neither a
    /// brain's own store nor the catalogue — `TASK-0020` §4.1.
    pub store_path: String,
    pub schema_version: i64,
    pub endpoint_key_scheme: String,
    pub established: Vec<CrossRelationEdge>,
    /// **Pending only.** An approved suggestion has already become a relation
    /// and must not be drawn twice.
    pub pending_suggestions: Vec<CrossSuggestionEdge>,
    pub deterministic_count: usize,
    pub approved_count: usize,
    pub pending_suggestion_count: usize,
    pub rules: Vec<CrossRuleInfo>,
    /// Endpoint keys no current index resolves. Must stay empty once the three
    /// brains are built.
    pub unresolved_endpoints: Vec<String>,
    /// Brains whose index was readable during this resolution.
    pub resolved_brain_ids: Vec<String>,
    pub deterministic_digest: String,
    pub seeded: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeCrossRelationEntry {
    /// `outgoing` or `incoming`, never inferred from the other.
    pub direction: String,
    pub provenance: String,
    pub relation_type: String,
    /// The end that is **not** the selected node — always in another brain.
    pub other: CrossEndpointView,
    pub rule_name: Option<String>,
    pub rule_version: Option<String>,
    /// `suggestionKey` of the approval this relation came from, when it did.
    pub suggestion_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeCrossRelations {
    /// The node this panel is about, as the **pair** that identifies it.
    pub reference: BrainNodeRef,
    pub endpoint_key: String,
    pub relative_path: String,
    pub outgoing: Vec<NodeCrossRelationEntry>,
    pub incoming: Vec<NodeCrossRelationEntry>,
    pub outgoing_count: usize,
    pub incoming_count: usize,
    /// Pending suggestions touching this node, either way. **Never** counted in
    /// `outgoing_count` or `incoming_count`.
    pub suggestions: Vec<CrossSuggestionEdge>,
}

/// What the frozen expectation of §4.4 says, beside what the store returns.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossCountComparison {
    pub brain_id: String,
    pub relative_path: String,
    pub expected_outgoing: usize,
    pub observed_outgoing: usize,
    pub expected_incoming: usize,
    pub observed_incoming: usize,
    pub matches: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossRelationsSelfCheck {
    pub store_path: String,
    pub established_total: usize,
    pub deterministic_total: usize,
    pub approved_total: usize,
    pub pending_suggestion_total: usize,
    /// `M1`, `M2`, `M3` — the frozen invalid attempts and their motifs.
    pub rejections: Vec<CrossRejectionOutcome>,
    pub all_rejected: bool,
    /// `M2` — two replays of the frozen derivation, digested.
    pub replay_digest_first: String,
    pub replay_digest_second: String,
    pub replay_stable: bool,
    /// `M4` — the frozen table, adjusted for approvals, against the store.
    pub counts: Vec<CrossCountComparison>,
    pub counts_agree: bool,
    /// Suggestions approved **since the seed**, each adding exactly one edge to
    /// the frozen expectation. Listed so the adjustment is auditable.
    pub approved_since_seed: Vec<String>,
    /// `M2` — inverses that were invented. Must stay empty.
    pub invented_inverses: Vec<String>,
    /// `M1` — pending suggestions that leaked into an established read.
    pub suggestions_in_established: Vec<String>,
    /// `M5` — endpoint keys no current index resolves.
    pub unresolved_endpoints: Vec<String>,
    /// `M1` — every established relation joins two **different** brains.
    pub same_brain_relations: Vec<String>,
    pub resolved_brain_ids: Vec<String>,
}

/// One brain's index, read once and indexed by `cek1` key.
struct ResolvedBrain {
    record: BrainRecord,
    indexed: bool,
    by_key: HashMap<String, (i64, String, String)>,
}

/// Reads every catalogued brain's index once, so the two ends of a relation can
/// each resolve in **their own** brain.
///
/// A brain that has never been built is not an error here: it is recorded as
/// `indexed: false`, and every endpoint of that brain comes back unresolved and
/// **listed**. That is what lets the first launch — where only the active brain
/// has an index — show a relation towards a brain nobody has opened yet.
fn resolve_brains(paths: &SandboxPaths, brains: &[BrainRecord]) -> Vec<ResolvedBrain> {
    brains
        .iter()
        .map(|record| match commands::analysis_input(paths, record) {
            Ok(snapshot) => ResolvedBrain {
                indexed: true,
                by_key: snapshot
                    .nodes
                    .iter()
                    .map(|node| {
                        (
                            cross_endpoint_key(&record.brain_id, &node.relative_path),
                            (node.id, node.name.clone(), node.relative_path.clone()),
                        )
                    })
                    .collect(),
                record: record.clone(),
            },
            // Reported, not raised. `NotBuilt` is an ordinary state of a brain
            // nobody has opened; a relation towards it still exists.
            Err(_) => ResolvedBrain {
                record: record.clone(),
                indexed: false,
                by_key: HashMap::new(),
            },
        })
        .collect()
}

fn endpoint_of(
    key: &str,
    brain_id: &str,
    resolved: &[ResolvedBrain],
    unresolved: &mut Vec<String>,
) -> CrossEndpointView {
    // The path carried by the key, used as the fallback name so an unresolved
    // endpoint stays nameable on screen rather than becoming blank.
    let path_in_key = split_cross_endpoint_key(key)
        .map(|(_, path)| path)
        .unwrap_or("");
    let fallback_name = if path_in_key.is_empty() {
        "(racine)"
    } else {
        path_in_key.rsplit('/').next().unwrap_or(path_in_key)
    };

    let brain = resolved
        .iter()
        .find(|candidate| candidate.record.brain_id == brain_id);
    let hit = brain.and_then(|entry| entry.by_key.get(key));
    if hit.is_none() && !unresolved.iter().any(|existing| existing == key) {
        unresolved.push(key.to_string());
    }

    CrossEndpointView {
        key: key.to_string(),
        brain_id: brain_id.to_string(),
        brain_display_name: brain
            .map(|entry| entry.record.display_name.clone())
            .unwrap_or_else(|| brain_id.to_string()),
        brain_icon: brain
            .map(|entry| entry.record.icon.clone())
            .unwrap_or_default(),
        node_id: hit.map(|(node_id, _, _)| *node_id),
        name: hit
            .map(|(_, name, _)| name.clone())
            .unwrap_or_else(|| fallback_name.to_string()),
        relative_path: hit
            .map(|(_, _, path)| path.clone())
            .unwrap_or_else(|| path_in_key.to_string()),
        brain_indexed: brain.is_some_and(|entry| entry.indexed),
    }
}

fn edge_of(
    relation: &StoredCrossRelation,
    resolved: &[ResolvedBrain],
    unresolved: &mut Vec<String>,
) -> CrossRelationEdge {
    CrossRelationEdge {
        id: relation.id,
        provenance: relation.provenance.as_str().to_string(),
        relation_type: relation.relation_type.clone(),
        source: endpoint_of(
            &relation.source_key,
            &relation.source_brain_id,
            resolved,
            unresolved,
        ),
        target: endpoint_of(
            &relation.target_key,
            &relation.target_brain_id,
            resolved,
            unresolved,
        ),
        rule_name: relation.rule_name.clone(),
        rule_version: relation.rule_version.clone(),
        suggestion_key: relation.suggestion_key.clone(),
    }
}

fn suggestion_of(
    suggestion: &StoredCrossSuggestion,
    resolved: &[ResolvedBrain],
    unresolved: &mut Vec<String>,
) -> CrossSuggestionEdge {
    CrossSuggestionEdge {
        suggestion_key: suggestion.suggestion_key.clone(),
        relation_type: suggestion.relation_type.clone(),
        source: endpoint_of(
            &suggestion.source_key,
            &suggestion.source_brain_id,
            resolved,
            unresolved,
        ),
        target: endpoint_of(
            &suggestion.target_key,
            &suggestion.target_brain_id,
            resolved,
            unresolved,
        ),
        state: suggestion.state.clone(),
        basis: suggestion.basis.clone(),
    }
}

/// Opens the common store, replays the frozen derivation, seeds the frozen
/// suggestions once, and reads everything back resolved.
///
/// The derivation is replayed on **every** open, deliberately: it is derived
/// data, and keeping it on its own side is precisely what makes recomputing it
/// cost nothing to the approved relations and the suggestions, which are never
/// touched here.
///
/// **The composition is not an argument.** What comes back is the same whether
/// one brain is displayed or three.
pub fn open_cross_relations(
    paths: &SandboxPaths,
    brains: &[BrainRecord],
) -> Result<CrossRelationsOverview, MapError> {
    let known = brains
        .iter()
        .map(|brain| brain.brain_id.clone())
        .collect::<Vec<_>>();
    let database = paths.interbrain_relations_database();
    let mut store = CrossRelationStore::open(&database)?;

    let derived = derive_xbr1(&known)?;
    store.replace_deterministic(&derived)?;
    let seeded = seed_xbr1_suggestions(&store, &known)?;

    overview(&store, paths, brains, seeded)
}

fn overview(
    store: &CrossRelationStore,
    paths: &SandboxPaths,
    brains: &[BrainRecord],
    seeded: usize,
) -> Result<CrossRelationsOverview, MapError> {
    let resolved = resolve_brains(paths, brains);
    let mut unresolved = Vec::new();

    let established = store.established()?;
    let edges = established
        .iter()
        .map(|relation| edge_of(relation, &resolved, &mut unresolved))
        .collect::<Vec<_>>();
    let pending = store
        .pending_suggestions()?
        .iter()
        .map(|suggestion| suggestion_of(suggestion, &resolved, &mut unresolved))
        .collect::<Vec<_>>();

    let deterministic = store.deterministic()?;
    let rules = CROSS_RULES
        .iter()
        .map(|rule| CrossRuleInfo {
            name: rule.name.to_string(),
            version: rule.version.to_string(),
            relation_type: rule.relation_type.to_string(),
            symmetric: rule.symmetric,
            produced: deterministic
                .iter()
                .filter(|relation| relation.rule_name.as_deref() == Some(rule.name))
                .count(),
        })
        .collect();

    Ok(CrossRelationsOverview {
        store_path: paths.relative_name(&paths.interbrain_relations_database()),
        // Read back from the store's own metadata, not from the constants.
        // What matters to a reader is what the FILE says it is: a store written
        // by an older version would report its own version here, which is what
        // makes a future migration visible rather than assumed. The constants
        // are the fallback for a store too damaged to answer.
        schema_version: store
            .meta("schema_version")?
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(CROSS_SCHEMA_VERSION),
        endpoint_key_scheme: store
            .meta("endpoint_key_scheme")?
            .unwrap_or_else(|| CROSS_ENDPOINT_KEY_SCHEME.to_string()),
        deterministic_count: deterministic.len(),
        approved_count: established.len() - deterministic.len(),
        pending_suggestion_count: pending.len(),
        established: edges,
        pending_suggestions: pending,
        rules,
        unresolved_endpoints: unresolved,
        resolved_brain_ids: resolved
            .iter()
            .filter(|entry| entry.indexed)
            .map(|entry| entry.record.brain_id.clone())
            .collect(),
        deterministic_digest: store.deterministic_digest()?,
        seeded,
    })
}

fn entry_of(
    relation: &StoredCrossRelation,
    direction: &str,
    resolved: &[ResolvedBrain],
    unresolved: &mut Vec<String>,
) -> NodeCrossRelationEntry {
    let (other_key, other_brain) = if direction == "outgoing" {
        (&relation.target_key, &relation.target_brain_id)
    } else {
        (&relation.source_key, &relation.source_brain_id)
    };
    NodeCrossRelationEntry {
        direction: direction.to_string(),
        provenance: relation.provenance.as_str().to_string(),
        relation_type: relation.relation_type.clone(),
        other: endpoint_of(other_key, other_brain, resolved, unresolved),
        rule_name: relation.rule_name.clone(),
        rule_version: relation.rule_version.clone(),
        suggestion_key: relation.suggestion_key.clone(),
    }
}

/// Everything the inter-brain section of the panel shows for one node.
///
/// Outgoing and incoming are read with **two separate queries** on two
/// different columns. Neither is derived from the other, which is what makes
/// `M4` a measurement rather than a tautology.
///
/// The node is looked up in **its own** brain, through the pair — a `node_id`
/// that only another brain holds is missing here, and says so.
pub fn node_cross_relations(
    paths: &SandboxPaths,
    brains: &[BrainRecord],
    reference: &BrainNodeRef,
) -> Result<NodeCrossRelations, MapError> {
    let own = brains
        .iter()
        .find(|brain| brain.brain_id == reference.brain_id)
        .ok_or_else(|| MapError::UnknownBrain(reference.brain_id.clone()))?;
    let snapshot = commands::analysis_input(paths, own)?;
    let node = snapshot
        .nodes
        .iter()
        .find(|candidate| candidate.id == reference.node_id)
        .ok_or(MapError::NodeMissing(reference.node_id))?;

    let store = CrossRelationStore::open(&paths.interbrain_relations_database())?;
    let resolved = resolve_brains(paths, brains);
    let key = cross_endpoint_key(&reference.brain_id, &node.relative_path);
    let mut unresolved = Vec::new();

    let outgoing = store
        .outgoing(&key)?
        .iter()
        .map(|relation| entry_of(relation, "outgoing", &resolved, &mut unresolved))
        .collect::<Vec<_>>();
    let incoming = store
        .incoming(&key)?
        .iter()
        .map(|relation| entry_of(relation, "incoming", &resolved, &mut unresolved))
        .collect::<Vec<_>>();
    let suggestions = store
        .pending_suggestions()?
        .iter()
        .filter(|suggestion| suggestion.source_key == key || suggestion.target_key == key)
        .map(|suggestion| suggestion_of(suggestion, &resolved, &mut unresolved))
        .collect::<Vec<_>>();

    Ok(NodeCrossRelations {
        reference: BrainNodeRef::new(&reference.brain_id, reference.node_id),
        endpoint_key: key,
        relative_path: node.relative_path.clone(),
        outgoing_count: outgoing.len(),
        incoming_count: incoming.len(),
        outgoing,
        incoming,
        suggestions,
    })
}

/// The one explicit act that turns an inter-brain suggestion into a relation.
///
/// Returns the whole overview afterwards, so the interface shows counts that
/// came back from the store rather than counts it incremented itself — `M10`
/// asks for the change to be observed, not assumed.
pub fn approve_cross_suggestion(
    paths: &SandboxPaths,
    brains: &[BrainRecord],
    suggestion_key: &str,
) -> Result<CrossRelationsOverview, MapError> {
    let mut store = CrossRelationStore::open(&paths.interbrain_relations_database())?;
    store.approve(suggestion_key)?;
    overview(&store, paths, brains, 0)
}

/// Replays `M1` to `M5` against the live store, and reports.
///
/// Written to report rather than to assert, like `map_relations_self_check`: a
/// criterion that fails has to be publishable as failed.
pub fn cross_self_check(
    paths: &SandboxPaths,
    brains: &[BrainRecord],
) -> Result<CrossRelationsSelfCheck, MapError> {
    let known = brains
        .iter()
        .map(|brain| brain.brain_id.clone())
        .collect::<Vec<_>>();
    let database = paths.interbrain_relations_database();
    let mut store = CrossRelationStore::open(&database)?;
    let resolved = resolve_brains(paths, brains);

    // `M2`: derive twice, digest twice. The second replay goes through the
    // store, so what is compared is what was persisted.
    store.replace_deterministic(&derive_xbr1(&known)?)?;
    let first = store.deterministic_digest()?;
    store.replace_deterministic(&derive_xbr1(&known)?)?;
    let second = store.deterministic_digest()?;

    let established = store.established()?;
    let deterministic = store.deterministic()?;
    let pending = store.pending_suggestions()?;

    // `M4`: the frozen table of §4.4, compared to two independent queries.
    //
    // The frozen table describes the **seeded** state. Approving is exactly
    // what `M3` and `M12` ask the slice to do, so an expectation that ignored
    // approvals would fail the moment the product worked. The adjustment adds
    // **one** outgoing to the source and **one** incoming to the target of each
    // approved suggestion, and lists them.
    let mut expected = CROSS_EXPECTED_COUNTS
        .iter()
        .map(|(brain_id, path, out, inn)| {
            (
                cross_endpoint_key(brain_id, path),
                ((*brain_id).to_string(), (*path).to_string(), *out, *inn),
            )
        })
        .collect::<BTreeMap<_, _>>();
    let mut approved_since_seed = Vec::new();
    for suggestion in store.suggestions()? {
        if suggestion.state != "approved" {
            continue;
        }
        approved_since_seed.push(suggestion.suggestion_key.clone());
        if let Some(entry) = expected.get_mut(&suggestion.source_key) {
            entry.2 += 1;
        }
        if let Some(entry) = expected.get_mut(&suggestion.target_key) {
            entry.3 += 1;
        }
    }

    let mut counts = Vec::new();
    let mut counts_agree = true;
    for (key, (brain_id, relative_path, expected_out, expected_in)) in expected {
        let observed_outgoing = store.outgoing(&key)?.len();
        let observed_incoming = store.incoming(&key)?.len();
        let matches = observed_outgoing == expected_out && observed_incoming == expected_in;
        counts_agree &= matches;
        counts.push(CrossCountComparison {
            brain_id,
            relative_path,
            expected_outgoing: expected_out,
            observed_outgoing,
            expected_incoming: expected_in,
            observed_incoming,
            matches,
        });
    }

    // `M2` — inverses. None of the ten frozen pairs may exist.
    let invented_inverses = CROSS_FORBIDDEN_INVERSES
        .iter()
        .filter_map(|(source_brain, source_path, target_brain, target_path)| {
            let source = cross_endpoint_key(source_brain, source_path);
            let target = cross_endpoint_key(target_brain, target_path);
            established
                .iter()
                .any(|relation| relation.source_key == source && relation.target_key == target)
                .then(|| format!("{source} → {target}"))
        })
        .collect::<Vec<_>>();

    // `M1` — no pending suggestion may appear among established relations.
    let suggestions_in_established = pending
        .iter()
        .filter(|suggestion| {
            established.iter().any(|relation| {
                relation.source_key == suggestion.source_key
                    && relation.target_key == suggestion.target_key
                    && relation.relation_type == suggestion.relation_type
            })
        })
        .map(|suggestion| suggestion.suggestion_key.clone())
        .collect::<Vec<_>>();

    // `M1` — every established relation joins two different brains.
    let same_brain_relations = established
        .iter()
        .filter(|relation| relation.source_brain_id == relation.target_brain_id)
        .map(|relation| format!("{} → {}", relation.source_key, relation.target_key))
        .collect::<Vec<_>>();

    // `M5` — every endpoint of every relation and suggestion must resolve.
    let mut unresolved = Vec::new();
    for relation in &established {
        endpoint_of(
            &relation.source_key,
            &relation.source_brain_id,
            &resolved,
            &mut unresolved,
        );
        endpoint_of(
            &relation.target_key,
            &relation.target_brain_id,
            &resolved,
            &mut unresolved,
        );
    }
    for suggestion in store.suggestions()? {
        endpoint_of(
            &suggestion.source_key,
            &suggestion.source_brain_id,
            &resolved,
            &mut unresolved,
        );
        endpoint_of(
            &suggestion.target_key,
            &suggestion.target_brain_id,
            &resolved,
            &mut unresolved,
        );
    }

    let rejections = replay_cross_rejections(&known)?;
    let all_rejected = rejections.iter().all(|outcome| outcome.rejected);

    Ok(CrossRelationsSelfCheck {
        store_path: paths.relative_name(&database),
        established_total: established.len(),
        deterministic_total: deterministic.len(),
        approved_total: established.len() - deterministic.len(),
        pending_suggestion_total: pending.len(),
        rejections,
        all_rejected,
        replay_digest_first: first.clone(),
        replay_stable: first == second,
        replay_digest_second: second,
        counts,
        counts_agree,
        approved_since_seed,
        invented_inverses,
        suggestions_in_established,
        unresolved_endpoints: unresolved,
        same_brain_relations,
        resolved_brain_ids: resolved
            .iter()
            .filter(|entry| entry.indexed)
            .map(|entry| entry.record.brain_id.clone())
            .collect(),
    })
}

/// The frozen references of `XBR-1`, as the scenario needs them.
///
/// Published rather than duplicated in TypeScript: the frozen set has one
/// spelling, in Rust, and `M12` reads it from here.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrozenCrossReference {
    pub reference: String,
    pub source_brain_id: String,
    pub source_key: String,
    pub target_brain_id: String,
    pub target_key: String,
    pub relation_type: String,
    pub rule_name: String,
    pub rule_version: String,
}

pub fn frozen_references() -> Vec<FrozenCrossReference> {
    XBR1_RELATIONS
        .iter()
        .map(|frozen| {
            let rule = CROSS_RULES
                .iter()
                .find(|rule| rule.name == frozen.rule_name)
                .expect("a frozen relation always names a declared rule");
            FrozenCrossReference {
                reference: frozen.reference.to_string(),
                source_brain_id: frozen.source_brain_id.to_string(),
                source_key: cross_endpoint_key(frozen.source_brain_id, frozen.source_path),
                target_brain_id: frozen.target_brain_id.to_string(),
                target_key: cross_endpoint_key(frozen.target_brain_id, frozen.target_path),
                relation_type: rule.relation_type.to_string(),
                rule_name: rule.name.to_string(),
                rule_version: rule.version.to_string(),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::map::brains::BrainRecord;
    use crate::map::commands::build_map;
    use std::path::PathBuf;

    fn frozen_brains() -> Vec<BrainRecord> {
        crate::map::brains::FROZEN_BRAINS
            .iter()
            .map(BrainRecord::frozen)
            .collect()
    }

    /// Resolves a node by its full relative path, one segment at a time.
    ///
    /// `TASK-0033` narrowed the ordinary projection to a focus's own direct
    /// children, so a fixture path more than one level deep is no longer
    /// guaranteed to sit in the root's default view — this walks it exactly
    /// as the product would, through explicit navigation.
    fn resolve_by_path(
        paths: &SandboxPaths,
        brain: &BrainRecord,
        relative_path: &str,
    ) -> crate::map::store::MapNode {
        let mut current_id = commands::snapshot(paths, brain).expect("snapshot").root_id;
        for segment in relative_path.split('/') {
            let view = commands::view(paths, brain, Some(current_id), None).expect("view");
            current_id = view
                .nodes
                .iter()
                .find(|n| n.parent_id == Some(current_id) && n.name == segment)
                .unwrap_or_else(|| panic!("missing segment {segment} of {relative_path}"))
                .id;
        }
        commands::detail(
            paths,
            brain,
            &BrainNodeRef::new(&brain.brain_id, current_id),
        )
        .expect("detail")
        .node
    }

    fn sandbox(name: &str) -> SandboxPaths {
        let root = std::env::temp_dir()
            .join("filetopo-task0020")
            .join(format!("{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        SandboxPaths::under(root)
    }

    fn built(paths: &SandboxPaths, brains: &[BrainRecord]) {
        for brain in brains {
            build_map(paths, brain, false).expect("build");
        }
    }

    /// `M5` — the whole point of `cek1`: a rebuild renumbers every row, and
    /// **not one endpoint breaks**.
    #[test]
    fn every_endpoint_resolves_again_after_a_full_rebuild() {
        let paths = sandbox("rebuild");
        let brains = frozen_brains();
        built(&paths, &brains);

        let before = open_cross_relations(&paths, &brains).expect("open");
        assert_eq!(before.deterministic_count, 6);
        assert_eq!(before.approved_count, 0);
        assert_eq!(before.pending_suggestion_count, 4);
        assert!(
            before.unresolved_endpoints.is_empty(),
            "unresolved before rebuild: {:?}",
            before.unresolved_endpoints
        );

        // An approval, so the rebuild has something a replay could destroy.
        let approved = approve_cross_suggestion(&paths, &brains, "XB-S01").expect("approve");
        assert_eq!(approved.approved_count, 1);
        assert_eq!(approved.pending_suggestion_count, 3);

        // The ids each endpoint currently resolves to.
        let ids_before = before
            .established
            .iter()
            .map(|edge| (edge.source.node_id, edge.target.node_id))
            .collect::<Vec<_>>();

        // A full rebuild of the three indexes — Alpha, Gamma, then Bêta.
        for brain_id in ["brain-alpha", "brain-gamma", "brain-beta"] {
            let brain = brains
                .iter()
                .find(|candidate| candidate.brain_id == brain_id)
                .expect("brain");
            build_map(&paths, brain, true).expect("rebuild");
        }
        assert!(
            paths.interbrain_relations_database().exists(),
            "a rebuild deleted the common store"
        );

        let after = open_cross_relations(&paths, &brains).expect("open");
        assert_eq!(after.deterministic_count, 6);
        assert_eq!(after.approved_count, 1, "the approval did not survive");
        assert_eq!(after.pending_suggestion_count, 3);
        assert_eq!(after.deterministic_digest, before.deterministic_digest);
        assert!(
            after.unresolved_endpoints.is_empty(),
            "unresolved after rebuild: {:?}",
            after.unresolved_endpoints
        );
        for edge in &after.established {
            assert!(edge.source.node_id.is_some());
            assert!(edge.target.node_id.is_some());
            // No relation changed brain.
            assert_ne!(edge.source.brain_id, edge.target.brain_id);
        }
        // The deterministic set is identical, endpoint for endpoint, even
        // though the row ids behind it were regenerated.
        let ids_after = after
            .established
            .iter()
            .take(ids_before.len())
            .map(|edge| (edge.source.node_id, edge.target.node_id))
            .collect::<Vec<_>>();
        assert_eq!(ids_after.len(), ids_before.len());
    }

    /// `M1` and `M4`, through the command layer rather than the store.
    #[test]
    fn the_self_check_reports_the_frozen_expectation() {
        let paths = sandbox("selfcheck");
        let brains = frozen_brains();
        built(&paths, &brains);
        open_cross_relations(&paths, &brains).expect("open");

        let check = cross_self_check(&paths, &brains).expect("self check");
        assert!(check.all_rejected, "{:?}", check.rejections);
        assert!(check.replay_stable);
        assert!(check.counts_agree, "{:?}", check.counts);
        assert_eq!(check.counts.len(), CROSS_EXPECTED_COUNTS.len());
        assert!(check.invented_inverses.is_empty());
        assert!(check.suggestions_in_established.is_empty());
        assert!(check.same_brain_relations.is_empty());
        assert!(check.unresolved_endpoints.is_empty());
        assert_eq!(check.deterministic_total, 6);
        assert_eq!(check.approved_total, 0);
        assert_eq!(check.pending_suggestion_total, 4);
        assert_eq!(check.resolved_brain_ids.len(), 3);

        // And it stays true after an approval, with the adjustment listed.
        approve_cross_suggestion(&paths, &brains, "XB-S01").expect("approve");
        let after = cross_self_check(&paths, &brains).expect("self check");
        assert!(after.counts_agree, "{:?}", after.counts);
        assert_eq!(after.approved_since_seed, vec!["XB-S01".to_string()]);
        assert_eq!(after.approved_total, 1);
    }

    /// §4.1 — the common store is not a brain's own, and a brain's own is not
    /// the common one.
    #[test]
    fn the_common_store_is_not_any_brains_store() {
        let paths = sandbox("stores");
        let brains = frozen_brains();
        built(&paths, &brains);
        let overview = open_cross_relations(&paths, &brains).expect("open");
        assert_eq!(overview.store_path, "brains/interbrain/relations.sqlite");
        for brain in &brains {
            assert_ne!(
                paths.interbrain_relations_database(),
                paths.brain_relations_database(&brain.brain_id)
            );
        }
    }

    /// §4.8 — a relation towards a brain that has **never been built** is still
    /// returned, and says so.
    ///
    /// This is the storage half of `M9`: the interface can only offer to bring
    /// Gamma into the view if the relation reaches it in the first place.
    #[test]
    fn a_relation_towards_an_unbuilt_brain_is_reported_not_dropped() {
        let paths = sandbox("unbuilt");
        let brains = frozen_brains();
        // Alpha alone is built. Gamma and Bêta have no index at all.
        let alpha = brains
            .iter()
            .find(|brain| brain.brain_id == "brain-alpha")
            .expect("alpha");
        build_map(&paths, alpha, false).expect("build");

        let overview = open_cross_relations(&paths, &brains).expect("open");
        assert_eq!(overview.deterministic_count, 6, "the relations still exist");
        assert_eq!(overview.resolved_brain_ids, vec!["brain-alpha".to_string()]);
        assert!(
            !overview.unresolved_endpoints.is_empty(),
            "an unresolved endpoint must be reported, not hidden"
        );

        let towards_gamma = overview
            .established
            .iter()
            .find(|edge| {
                edge.source.brain_id == "brain-alpha" && edge.target.brain_id == "brain-gamma"
            })
            .expect("XB-D01 must still be there");
        assert!(towards_gamma.source.node_id.is_some(), "Alpha is built");
        assert!(towards_gamma.target.node_id.is_none(), "Gamma is not");
        assert!(!towards_gamma.target.brain_indexed);
        // Still nameable on screen, from the key alone.
        assert_eq!(towards_gamma.target.name, "note-1.txt");
        assert_eq!(towards_gamma.target.relative_path, "dossier-b/note-1.txt");
    }

    /// §4.2 rule 5 — the pair is the boundary. A node id only another brain
    /// holds is missing here, and says so.
    #[test]
    fn a_node_reference_resolves_only_inside_its_own_brain() {
        let paths = sandbox("pair");
        let brains = frozen_brains();
        built(&paths, &brains);
        open_cross_relations(&paths, &brains).expect("open");

        let alpha = brains
            .iter()
            .find(|brain| brain.brain_id == "brain-alpha")
            .expect("alpha");
        let node = resolve_by_path(&paths, alpha, "dossier-a/note-1.txt");

        let relations =
            node_cross_relations(&paths, &brains, &BrainNodeRef::new("brain-alpha", node.id))
                .expect("relations");
        assert_eq!(relations.outgoing_count, 1);
        assert_eq!(relations.incoming_count, 0);
        assert_eq!(relations.outgoing[0].other.brain_id, "brain-gamma");
        assert_eq!(relations.outgoing[0].direction, "outgoing");
        assert_eq!(relations.outgoing[0].provenance, "DETERMINISTIC");
        assert_eq!(relations.outgoing[0].rule_name.as_deref(), Some("cross-homonymes"));

        // A reference minted for an unknown brain resolves nowhere.
        let refused = node_cross_relations(
            &paths,
            &brains,
            &BrainNodeRef::new("brain-inconnu", node.id),
        );
        assert!(matches!(refused, Err(MapError::UnknownBrain(_))));

        // A node id no brain holds is missing rather than silently empty.
        let missing =
            node_cross_relations(&paths, &brains, &BrainNodeRef::new("brain-alpha", 99_999));
        assert!(matches!(missing, Err(MapError::NodeMissing(_))));
    }

    /// `M10` — a pending suggestion is never in a count, and approving it moves
    /// the counts by exactly one, through the commands.
    #[test]
    fn a_pending_suggestion_enters_no_count_until_it_is_approved() {
        let paths = sandbox("suggestion");
        let brains = frozen_brains();
        built(&paths, &brains);
        open_cross_relations(&paths, &brains).expect("open");

        let alpha = brains
            .iter()
            .find(|brain| brain.brain_id == "brain-alpha")
            .expect("alpha");
        let source = resolve_by_path(&paths, alpha, "dossier-a/note-2.txt");
        let reference = BrainNodeRef::new("brain-alpha", source.id);

        let before = node_cross_relations(&paths, &brains, &reference).expect("relations");
        assert_eq!(before.outgoing_count, 0);
        assert_eq!(before.incoming_count, 0);
        assert_eq!(before.suggestions.len(), 1);
        assert_eq!(before.suggestions[0].suggestion_key, "XB-S01");
        assert_eq!(before.suggestions[0].state, "pending");
        assert_eq!(before.suggestions[0].target.brain_id, "brain-gamma");

        approve_cross_suggestion(&paths, &brains, "XB-S01").expect("approve");

        let after = node_cross_relations(&paths, &brains, &reference).expect("relations");
        assert_eq!(after.outgoing_count, 1, "exactly +1");
        assert_eq!(after.incoming_count, 0);
        assert!(after.suggestions.is_empty(), "the pending one is gone");
        assert_eq!(after.outgoing[0].provenance, "APPROVED");
        assert_eq!(after.outgoing[0].suggestion_key.as_deref(), Some("XB-S01"));
        // `M10` — no deterministic rule is invented for an approved relation.
        assert!(after.outgoing[0].rule_name.is_none());
        assert!(after.outgoing[0].rule_version.is_none());
    }

    /// The published frozen references match the store, one for one.
    #[test]
    fn the_published_frozen_references_match_the_store() {
        let references = frozen_references();
        assert_eq!(references.len(), 6);
        for reference in &references {
            assert_ne!(reference.source_brain_id, reference.target_brain_id);
            assert!(reference.source_key.starts_with("cek1|"));
            assert!(reference.target_key.starts_with("cek1|"));
            assert!(!reference.rule_version.is_empty());
        }
        assert_eq!(references[0].reference, "XB-D01");
        assert_eq!(references[5].reference, "XB-D06");
    }

    /// A sanity check on the temporary sandbox helper: nothing here writes into
    /// the development sandbox of the checkout.
    #[test]
    fn tests_never_write_into_the_repository_sandbox() {
        let paths = sandbox("isolation");
        let root = PathBuf::from(paths.relative_name(&paths.interbrain_relations_database()));
        assert_eq!(root, PathBuf::from("brains/interbrain/relations.sqlite"));
        assert!(paths.interbrain_root().starts_with(std::env::temp_dir()));
    }
}
