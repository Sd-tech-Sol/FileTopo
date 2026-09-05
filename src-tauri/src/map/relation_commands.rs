//! What the relations view calls, and the resolution behind it.
//!
//! The store speaks in **endpoint keys**, which survive a rebuild; the map
//! speaks in **node ids**, which do not. This file is the one place the two
//! meet, so an unresolved endpoint is reported rather than silently dropped —
//! `J10` needs the difference to be visible.

use super::relations::{
    EXPECTED_COUNTS, FORBIDDEN_INVERSES, RELATIONS_FIXTURE,
    RELATIONS_SCHEMA_VERSION, RelationError, RelationStore, RejectionOutcome, SEEDED_SUGGESTIONS,
    StoredRelation, StoredSuggestion, endpoint_key,
};
use super::brains::{BrainNodeRef, BrainRecord};
use super::sandbox::SandboxPaths;
use super::store::MapNode;
use super::{MapError, commands, fixtures};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// One end of a relation, resolved against the current index when possible.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationEndpoint {
    pub key: String,
    /// `None` when the key names something the current index does not hold.
    /// Reported, never hidden: an orphan endpoint is a finding.
    pub node_id: Option<i64>,
    pub name: String,
    pub relative_path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationEdge {
    pub id: i64,
    /// `DETERMINISTIC` or `APPROVED`. There is no third value, here or anywhere.
    pub provenance: String,
    pub relation_type: String,
    pub source: RelationEndpoint,
    pub target: RelationEndpoint,
    /// Present exactly when the provenance is `DETERMINISTIC` — `J6` requires
    /// the rule to be consultable.
    pub rule_name: Option<String>,
    pub rule_version: Option<String>,
    pub suggestion_key: Option<String>,
    pub producer: String,
    pub explanation_fr: Option<String>,
    pub explanation_en: Option<String>,
    pub content_generation_id: Option<String>,
    pub observed_hash: Option<String>,
}

/// A suggestion, carried as its own kind of object all the way to the screen.
///
/// It is deliberately **not** a `RelationEdge` with a different label: the two
/// never share a type, so no rendering path can mistake one for the other.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionEdge {
    pub suggestion_key: String,
    pub relation_type: String,
    pub source: RelationEndpoint,
    pub target: RelationEndpoint,
    pub state: String,
    pub basis: String,
    pub producer: String,
    pub rule_name: Option<String>,
    pub rule_version: Option<String>,
    pub explanation_fr: Option<String>,
    pub explanation_en: Option<String>,
    pub signals: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationRuleInfo {
    pub name: String,
    pub version: String,
    pub relation_type: String,
    pub symmetric: bool,
    pub produced: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationsOverview {
    /// **Whose relations these are.** The identity space of a suggestion key
    /// is the brain — `TASK-0018` §4.5 — so `S-005` may legitimately exist,
    /// pending in one brain and approved in another.
    pub brain_id: String,
    /// The synthetic source behind the brain. A developer diagnostic.
    pub fixture_id: String,
    /// Where this brain's relations really live, named relative to the
    /// sandbox. `K3` compares these across brains.
    pub relations_path: String,
    pub schema_version: i64,
    pub endpoint_key_scheme: String,
    /// `false` when the fixture is outside the frozen **legacy** scope of
    /// `TASK-0017`. It says the historical demonstration relations do not
    /// apply to this brain — and nothing else. The panel, the engine, the core
    /// relations and their approval stay available either way: `TASK-0024`
    /// keeps the legacy perimeter and the core perimeter as two ideas.
    pub legacy_in_scope: bool,
    pub established: Vec<RelationEdge>,
    /// **Pending only.** An approved suggestion has already become a relation
    /// and must not be drawn twice.
    pub pending_suggestions: Vec<SuggestionEdge>,
    pub deterministic_count: usize,
    pub approved_count: usize,
    pub pending_suggestion_count: usize,
    pub rules: Vec<RelationRuleInfo>,
    /// Endpoint keys the current index cannot resolve. Must stay empty.
    pub unresolved_endpoints: Vec<String>,
    pub deterministic_digest: String,
    pub seeded: usize,
    pub engine_current: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRelationEntry {
    /// `outgoing` or `incoming`, never inferred from the other.
    pub direction: String,
    pub provenance: String,
    pub relation_type: String,
    pub other: RelationEndpoint,
    pub rule_name: Option<String>,
    pub rule_version: Option<String>,
    pub producer: String,
    pub explanation_fr: Option<String>,
    pub explanation_en: Option<String>,
    pub content_generation_id: Option<String>,
    pub observed_hash: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeRelations {
    pub brain_id: String,
    pub fixture_id: String,
    /// The node this panel is about, as the **pair** that identifies it.
    ///
    /// Handed back so the interface carries a reference rather than a loose
    /// row number: `TASK-0018` §4.1 rule 5 — the same `node_id` in two brains
    /// must never allow a leak, and the surest way is never to let the number
    /// travel alone.
    pub reference: BrainNodeRef,
    pub endpoint_key: String,
    pub relative_path: String,
    pub outgoing: Vec<NodeRelationEntry>,
    pub incoming: Vec<NodeRelationEntry>,
    pub outgoing_count: usize,
    pub incoming_count: usize,
    /// Pending suggestions touching this node, in either direction. **Never**
    /// counted in `outgoing_count` or `incoming_count`.
    pub suggestions: Vec<SuggestionEdge>,
}

/// What the frozen expectation of §4.6.3 says, beside what the store returns.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountComparison {
    pub relative_path: String,
    pub expected_outgoing: usize,
    pub observed_outgoing: usize,
    pub expected_incoming: usize,
    pub observed_incoming: usize,
    pub matches: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationsSelfCheck {
    pub brain_id: String,
    pub fixture_id: String,
    pub established_total: usize,
    pub deterministic_total: usize,
    pub approved_total: usize,
    pub pending_suggestion_total: usize,
    /// `J1`, `J2`, `J3` — the five frozen invalid attempts and their motifs.
    pub rejections: Vec<RejectionOutcome>,
    pub all_rejected: bool,
    /// `J3` — two replays of the derivation, digested.
    pub replay_digest_first: String,
    pub replay_digest_second: String,
    pub replay_stable: bool,
    /// `J5` — the frozen table, adjusted for approvals, against the store.
    pub counts: Vec<CountComparison>,
    pub counts_agree: bool,
    /// Suggestions approved **since the seed**, each adding exactly one edge to
    /// the frozen expectation. Listed so the adjustment is auditable rather
    /// than invisible.
    pub approved_since_seed: Vec<String>,
    /// `J5` — inverses that were invented. Must stay empty.
    pub invented_inverses: Vec<String>,
    /// `J2` — pending suggestions that leaked into an established read.
    pub suggestions_in_established: Vec<String>,
    /// `J10` — endpoint keys the current index cannot resolve.
    pub unresolved_endpoints: Vec<String>,
}

fn endpoint_of(
    key: &str,
    by_key: &HashMap<String, &MapNode>,
    unresolved: &mut Vec<String>,
) -> RelationEndpoint {
    match by_key.get(key) {
        Some(node) => RelationEndpoint {
            key: key.to_string(),
            node_id: Some(node.id),
            name: node.name.clone(),
            relative_path: node.relative_path.clone(),
        },
        None => {
            if !unresolved.iter().any(|existing| existing == key) {
                unresolved.push(key.to_string());
            }
            RelationEndpoint {
                key: key.to_string(),
                node_id: None,
                // Falls back to the key's own path segment rather than to an
                // empty string: an orphan endpoint stays nameable on screen.
                name: key.rsplit('|').next().unwrap_or(key).to_string(),
                relative_path: key.rsplit('|').next().unwrap_or("").to_string(),
            }
        }
    }
}

fn edge_of(
    relation: &StoredRelation,
    by_key: &HashMap<String, &MapNode>,
    unresolved: &mut Vec<String>,
) -> RelationEdge {
    RelationEdge {
        id: relation.id,
        provenance: relation.provenance.as_str().to_string(),
        relation_type: relation.relation_type.clone(),
        source: endpoint_of(&relation.source_key, by_key, unresolved),
        target: endpoint_of(&relation.target_key, by_key, unresolved),
        rule_name: relation.rule_name.clone(),
        rule_version: relation.rule_version.clone(),
        suggestion_key: relation.suggestion_key.clone(),
        producer: relation.producer.clone(),
        explanation_fr: relation.explanation_fr.clone(),
        explanation_en: relation.explanation_en.clone(),
        content_generation_id: relation.content_generation_id.clone(),
        observed_hash: relation.observed_hash.clone(),
    }
}

fn suggestion_of(
    suggestion: &StoredSuggestion,
    by_key: &HashMap<String, &MapNode>,
    unresolved: &mut Vec<String>,
) -> SuggestionEdge {
    SuggestionEdge {
        suggestion_key: suggestion.suggestion_key.clone(),
        relation_type: suggestion.relation_type.clone(),
        source: endpoint_of(&suggestion.source_key, by_key, unresolved),
        target: endpoint_of(&suggestion.target_key, by_key, unresolved),
        state: suggestion.state.clone(),
        basis: suggestion.basis.clone(),
        producer: suggestion.producer.clone(),
        rule_name: suggestion.rule_name.clone(),
        rule_version: suggestion.rule_version.clone(),
        explanation_fr: suggestion.explanation_fr.clone(),
        explanation_en: suggestion.explanation_en.clone(),
        signals: suggestion
            .signals_json
            .as_deref()
            .and_then(|value| serde_json::from_str(value).ok()),
    }
}

/// Endpoint keys are built from the **brain**, so two brains reading the same
/// tree produce two disjoint key spaces for the same relative paths.
fn index_by_key<'a>(brain_id: &str, nodes: &'a [MapNode]) -> HashMap<String, &'a MapNode> {
    nodes
        .iter()
        .map(|node| (endpoint_key(brain_id, &node.relative_path), node))
        .collect()
}

/// The **legacy** `TASK-0017` scope, as a property of the source.
///
/// `Some` only for the historical fixture: the synthetic producers of
/// `TASK-0017` — `homonymes/v1`, `suites-numerotees/v1` and the frozen seeds —
/// stay confined to `quasi-empty`, because `homonymes` is quadratic and would
/// produce hundreds of thousands of pairs on `wide`.
///
/// `None` for any other **valid** fixture. That is not a refusal: it says the
/// legacy demonstration relations do not apply, and nothing more. An unknown
/// fixture stays a normal error, raised by `source_fixture()` itself.
fn legacy_fixture_spec(
    brain: &BrainRecord,
) -> Result<Option<&'static fixtures::FixtureSpec>, MapError> {
    let spec = brain.source_fixture()?;
    Ok((spec.id == RELATIONS_FIXTURE).then_some(spec))
}

/// The source of a brain, valid or refused — with **no** scope judgement.
///
/// `TASK-0024` splits the two questions the old `ensure_in_scope` conflated:
/// « is this source real? » is asked of every brain, while « does the legacy
/// `TASK-0017` fixture apply? » is asked only of the legacy producers. The core
/// engine `dre-v1` is generic, so the reads that surround it must not inherit
/// the legacy scope.
fn source_spec(brain: &BrainRecord) -> Result<&'static fixtures::FixtureSpec, MapError> {
    brain.source_fixture()
}

/// Refuses a brain whose source is outside the frozen **legacy** scope, in
/// words.
///
/// Kept for `self_check` alone: it verifies the frozen `TASK-0017` contract,
/// which only `quasi-empty` can satisfy. `J12` must not be weakened.
fn ensure_in_scope(brain: &BrainRecord) -> Result<&'static fixtures::FixtureSpec, MapError> {
    let spec = source_spec(brain)?;
    match legacy_fixture_spec(brain)? {
        Some(spec) => Ok(spec),
        None => {
            let brain_id = &brain.brain_id;
            Err(RelationError::OutOfScopeFixture(format!(
                "`{brain_id}` reads `{}` and carries no legacy relations: TASK-0017 §4.6 \
                 freezes `{RELATIONS_FIXTURE}` as the legacy relations source of this slice",
                spec.id
            ))
            .into())
        }
    }
}

/// Opens the relations of a brain — **for any valid source**.
///
/// Two disjoint jobs live here, and `TASK-0024` keeps them apart:
///
/// * inside the legacy scope, the `TASK-0017` derivation is replayed on every
///   open and the frozen synthetic suggestions are seeded once. It is derived
///   data, and `R-C` keeps it on its own side precisely so that recomputing it
///   costs nothing to the approved relations and the suggestions;
/// * outside it, **nothing is derived and nothing is seeded**. The store is
///   opened and read as it stands, so a brain that has never run `dre-v1`
///   returns a valid, empty overview rather than a refusal.
///
/// Opening is never an act of invention: a brain on `deep` gets whatever the
/// core engine and the human approvals actually put in its own store.
pub fn open_relations(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<RelationsOverview, MapError> {
    let spec = source_spec(brain)?;
    let legacy_scope = legacy_fixture_spec(brain)?.is_some();
    let snapshot = commands::snapshot(paths, brain)?;
    // One store per brain. `brain-alpha` and `brain-gamma` read the same tree
    // and derive the same eight relations — into two separate databases.
    let database = paths.brain_relations_database(&brain.brain_id);
    let mut store = RelationStore::open(&database)?;
    let engine_current = super::rule_engine::is_current(paths, brain)?;

    let seeded = if legacy_scope {
        let derived = super::relations::derive(&brain.brain_id, &snapshot.nodes)?;
        store.replace_derived(&derived)?;
        super::relations::seed_fixture(&mut store, &brain.brain_id)?
    } else {
        0
    };

    overview(
        &store,
        brain,
        spec.id,
        legacy_scope,
        paths.relative_name(&database),
        &snapshot.nodes,
        seeded,
        engine_current,
    )
}

fn overview(
    store: &RelationStore,
    brain: &BrainRecord,
    fixture_id: &str,
    legacy_in_scope: bool,
    relations_path: String,
    nodes: &[MapNode],
    seeded: usize,
    engine_current: bool,
) -> Result<RelationsOverview, MapError> {
    let effective_nodes = super::rule_engine::effective_nodes(nodes);
    let by_key = index_by_key(&brain.brain_id, &effective_nodes);
    let mut unresolved = Vec::new();

    let established = store
        .established()?
        .into_iter()
        .filter(|relation| {
            relation.producer != super::relations::CORE_RULE_ENGINE_PRODUCER || engine_current
        })
        .collect::<Vec<_>>();
    let edges = established
        .iter()
        .map(|relation| edge_of(relation, &by_key, &mut unresolved))
        .collect::<Vec<_>>();
    let pending_stored = store
        .pending_suggestions()?
        .into_iter()
        .filter(|suggestion| {
            suggestion.producer != super::relations::CORE_RULE_ENGINE_PRODUCER || engine_current
        })
        .collect::<Vec<_>>();
    let pending = pending_stored
        .iter()
        .map(|suggestion| suggestion_of(suggestion, &by_key, &mut unresolved))
        .collect::<Vec<_>>();

    let deterministic = established
        .iter()
        .filter(|relation| relation.provenance == super::relations::Provenance::Deterministic)
        .cloned()
        .collect::<Vec<_>>();
    let rules = super::relations::RULES
        .iter()
        .map(|rule| RelationRuleInfo {
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

    Ok(RelationsOverview {
        brain_id: brain.brain_id.clone(),
        fixture_id: fixture_id.to_string(),
        relations_path,
        schema_version: RELATIONS_SCHEMA_VERSION,
        endpoint_key_scheme: super::relations::ENDPOINT_KEY_SCHEME.to_string(),
        legacy_in_scope,
        deterministic_count: deterministic.len(),
        approved_count: established.len() - deterministic.len(),
        pending_suggestion_count: pending.len(),
        established: edges,
        pending_suggestions: pending,
        rules,
        unresolved_endpoints: unresolved,
        deterministic_digest: store.deterministic_digest()?,
        seeded,
        engine_current,
    })
}

fn entry_of(
    relation: &StoredRelation,
    direction: &str,
    other_key: &str,
    by_key: &HashMap<String, &MapNode>,
    unresolved: &mut Vec<String>,
) -> NodeRelationEntry {
    NodeRelationEntry {
        direction: direction.to_string(),
        provenance: relation.provenance.as_str().to_string(),
        relation_type: relation.relation_type.clone(),
        other: endpoint_of(other_key, by_key, unresolved),
        rule_name: relation.rule_name.clone(),
        rule_version: relation.rule_version.clone(),
        producer: relation.producer.clone(),
        explanation_fr: relation.explanation_fr.clone(),
        explanation_en: relation.explanation_en.clone(),
        content_generation_id: relation.content_generation_id.clone(),
        observed_hash: relation.observed_hash.clone(),
    }
}

/// Everything the relations panel shows for one node.
///
/// Outgoing and incoming are read with **two separate queries** on two
/// different columns. Neither is derived from the other, which is what makes
/// `J5` a measurement rather than a tautology.
pub fn node_relations(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    reference: &BrainNodeRef,
) -> Result<NodeRelations, MapError> {
    // Validity of the source, never the legacy scope: a node of `brain-beta`
    // has core relations to read like any other — `TASK-0024`.
    let spec = source_spec(brain)?;
    // The pair is the boundary — `TASK-0018` §4.1 rule 4. A reference minted
    // in another brain is refused before any store is opened.
    if !reference.belongs_to(&brain.brain_id) {
        return Err(MapError::BrainMismatch {
            expected: brain.brain_id.clone(),
            found: reference.brain_id.clone(),
        });
    }
    let node_id = reference.node_id;
    let snapshot = commands::snapshot(paths, brain)?;
    // The node is looked up in **this** brain's snapshot. A `node_id` that
    // only another brain holds is missing here, and says so — `K5`.
    let node = snapshot
        .nodes
        .iter()
        .find(|candidate| candidate.id == node_id)
        .ok_or(MapError::NodeMissing(node_id))?;
    let store = RelationStore::open(&paths.brain_relations_database(&brain.brain_id))?;
    let engine_current = super::rule_engine::is_current(paths, brain)?;
    let effective_nodes = super::rule_engine::effective_nodes(&snapshot.nodes);
    let by_key = index_by_key(&brain.brain_id, &effective_nodes);
    let key = endpoint_key(&brain.brain_id, &node.relative_path);
    let mut unresolved = Vec::new();

    let mut outgoing = store
        .outgoing(&key)?
        .into_iter()
        .filter(|relation| {
            relation.producer != super::relations::CORE_RULE_ENGINE_PRODUCER || engine_current
        })
        .collect::<Vec<_>>()
        .iter()
        .map(|relation| {
            entry_of(relation, "outgoing", &relation.target_key, &by_key, &mut unresolved)
        })
        .collect::<Vec<_>>();
    if super::rule_engine::task0024_dr15_enabled() && engine_current {
        for relation in store.established()?.iter().filter(|relation| {
            relation.producer == super::relations::CORE_RULE_ENGINE_PRODUCER
                && relation.source_key != key
                && relation.target_key != key
        }) {
            outgoing.push(entry_of(
                relation,
                "outgoing",
                &relation.target_key,
                &by_key,
                &mut unresolved,
            ));
        }
    }
    let incoming = store
        .incoming(&key)?
        .into_iter()
        .filter(|relation| {
            relation.producer != super::relations::CORE_RULE_ENGINE_PRODUCER || engine_current
        })
        .collect::<Vec<_>>()
        .iter()
        .map(|relation| {
            entry_of(relation, "incoming", &relation.source_key, &by_key, &mut unresolved)
        })
        .collect::<Vec<_>>();

    let suggestions = store
        .pending_suggestions()?
        .into_iter()
        .filter(|suggestion| {
            suggestion.producer != super::relations::CORE_RULE_ENGINE_PRODUCER || engine_current
        })
        .collect::<Vec<_>>()
        .iter()
        .filter(|suggestion| {
            suggestion.source_key == key
                || suggestion.target_key == key
                || (super::rule_engine::task0024_dr15_enabled()
                    && suggestion.producer == super::relations::CORE_RULE_ENGINE_PRODUCER)
        })
        .map(|suggestion| suggestion_of(suggestion, &by_key, &mut unresolved))
        .collect::<Vec<_>>();

    Ok(NodeRelations {
        brain_id: brain.brain_id.clone(),
        fixture_id: spec.id.to_string(),
        reference: BrainNodeRef::new(&brain.brain_id, node_id),
        endpoint_key: key,
        relative_path: node.relative_path.clone(),
        outgoing_count: outgoing.len(),
        incoming_count: incoming.len(),
        outgoing,
        incoming,
        suggestions,
    })
}

/// The one explicit act that turns a suggestion into a relation.
///
/// Returns the whole overview afterwards, so the interface shows counts that
/// came back from the store rather than counts it incremented itself — `J12`
/// asks for the change to be observed, not assumed.
pub fn approve_suggestion(
    paths: &SandboxPaths,
    brain: &BrainRecord,
    suggestion_key: &str,
) -> Result<RelationsOverview, MapError> {
    // Approving a **core** suggestion is a generic act. The refusal that
    // matters here is staleness, below, not the legacy fixture.
    let spec = source_spec(brain)?;
    let legacy_scope = legacy_fixture_spec(brain)?.is_some();
    let snapshot = commands::snapshot(paths, brain)?;
    // Opened on **this** brain's store, so the approval cannot reach another
    // brain's copy of the same suggestion key — `K6`.
    let database = paths.brain_relations_database(&brain.brain_id);
    let mut store = RelationStore::open(&database)?;
    if let Some(suggestion) = store.suggestion(suggestion_key)? {
        if suggestion.producer == super::relations::CORE_RULE_ENGINE_PRODUCER
            && !super::rule_engine::is_current(paths, brain)?
        {
            return Err(MapError::RuleEngine(
                "stale core suggestion cannot be approved; run the relation engine again"
                    .to_string(),
            ));
        }
    }
    store.approve(suggestion_key)?;
    let engine_current = super::rule_engine::is_current(paths, brain)?;
    overview(
        &store,
        brain,
        spec.id,
        legacy_scope,
        paths.relative_name(&database),
        &snapshot.nodes,
        0,
        engine_current,
    )
}

/// Replays `J1` to `J5` and `J10` against the live store, and reports.
///
/// Written to report rather than to assert, like `map_self_check`: a criterion
/// that fails has to be publishable as failed.
pub fn self_check(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<RelationsSelfCheck, MapError> {
    let spec = ensure_in_scope(brain)?;
    let brain_id = brain.brain_id.as_str();
    let snapshot = commands::snapshot(paths, brain)?;
    let mut store = RelationStore::open(&paths.brain_relations_database(brain_id))?;
    let by_key = index_by_key(brain_id, &snapshot.nodes);

    // `J3`: derive twice, digest twice. The second replay goes through the
    // store, so what is compared is what was persisted.
    let derived = super::relations::derive(brain_id, &snapshot.nodes)?;
    store.replace_derived(&derived)?;
    let first = store.deterministic_digest()?;
    let derived_again = super::relations::derive(brain_id, &snapshot.nodes)?;
    store.replace_derived(&derived_again)?;
    let second = store.deterministic_digest()?;

    let established = store.established()?;
    let deterministic = store.deterministic()?;
    let pending = store.pending_suggestions()?;

    // `J5`: the frozen table of §4.6.3, compared to two independent queries.
    //
    // The frozen table describes the **seeded** state. Approving a suggestion
    // is exactly what `J4` and `J12` ask the slice to do, so an expectation
    // that ignored approvals would fail the moment the product worked. The
    // adjustment stays independent of the store's own established set: it adds
    // **one** edge per suggestion the suggestions table reports as approved and
    // that the frozen fixture did **not** approve at seed, and it lists them.
    let mut expected = EXPECTED_COUNTS
        .iter()
        .map(|(path, outgoing, incoming)| ((*path).to_string(), (*outgoing, *incoming)))
        .collect::<std::collections::BTreeMap<_, _>>();
    let mut approved_since_seed = Vec::new();
    for suggestion in store.suggestions()? {
        if suggestion.state != "approved" {
            continue;
        }
        let approved_by_the_fixture = SEEDED_SUGGESTIONS
            .iter()
            .any(|seeded| seeded.key == suggestion.suggestion_key && seeded.approved_at_seed);
        if approved_by_the_fixture {
            continue;
        }
        approved_since_seed.push(suggestion.suggestion_key.clone());
        if let Some(path) = super::relations::relative_path_of(brain_id, &suggestion.source_key) {
            if let Some(entry) = expected.get_mut(path) {
                entry.0 += 1;
            }
        }
        if let Some(path) = super::relations::relative_path_of(brain_id, &suggestion.target_key) {
            if let Some(entry) = expected.get_mut(path) {
                entry.1 += 1;
            }
        }
    }

    let mut counts = Vec::new();
    for (path, (expected_out, expected_in)) in &expected {
        let key = endpoint_key(brain_id, path);
        let observed_out = store.outgoing(&key)?.len();
        let observed_in = store.incoming(&key)?.len();
        counts.push(CountComparison {
            relative_path: path.clone(),
            expected_outgoing: *expected_out,
            observed_outgoing: observed_out,
            expected_incoming: *expected_in,
            observed_incoming: observed_in,
            matches: observed_out == *expected_out && observed_in == *expected_in,
        });
    }

    let invented_inverses = FORBIDDEN_INVERSES
        .iter()
        .filter_map(|(source_path, target_path)| {
            let (source, target) = (
                endpoint_key(brain_id, source_path),
                endpoint_key(brain_id, target_path),
            );
            established
                .iter()
                .any(|relation| relation.source_key == source && relation.target_key == target)
                .then(|| format!("{source_path} → {target_path}"))
        })
        .collect::<Vec<_>>();

    // `J2`: no pending suggestion may match an established relation.
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

    // `J10`: every endpoint of every stored row resolves to a current node.
    let mut unresolved = Vec::new();
    for relation in &established {
        for key in [&relation.source_key, &relation.target_key] {
            if !by_key.contains_key(key) && !unresolved.iter().any(|existing| existing == key) {
                unresolved.push(key.clone());
            }
        }
    }
    for suggestion in store.suggestions()? {
        for key in [&suggestion.source_key, &suggestion.target_key] {
            if !by_key.contains_key(key) && !unresolved.iter().any(|existing| existing == key) {
                unresolved.push(key.clone());
            }
        }
    }

    let rejections = super::relations::replay_rejections(brain_id)?;
    Ok(RelationsSelfCheck {
        brain_id: brain_id.to_string(),
        fixture_id: spec.id.to_string(),
        established_total: established.len(),
        deterministic_total: deterministic.len(),
        approved_total: established.len() - deterministic.len(),
        pending_suggestion_total: pending.len(),
        all_rejected: rejections.iter().all(|outcome| outcome.rejected),
        rejections,
        replay_stable: first == second,
        replay_digest_first: first,
        replay_digest_second: second,
        counts_agree: counts.iter().all(|entry| entry.matches),
        counts,
        approved_since_seed,
        invented_inverses,
        suggestions_in_established,
        unresolved_endpoints: unresolved,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn temporary_sandbox(name: &str) -> SandboxPaths {
        let root = std::env::temp_dir().join(format!(
            "filetopo-task-0018-{name}-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&root);
        SandboxPaths::under(root)
    }

    /// The brain the `TASK-0017` criteria were written against, now named as
    /// the brain it always was: `brain-alpha` reads `quasi-empty`.
    fn alpha() -> BrainRecord {
        BrainRecord::frozen_by_id("brain-alpha").expect("brain-alpha")
    }

    /// The catalogue's **counter-example**: `brain-beta` reads `deep`, which
    /// no legacy `TASK-0017` producer ever touches. Everything generic has to
    /// work on it — `X11`.
    fn beta() -> BrainRecord {
        BrainRecord::frozen_by_id("brain-beta").expect("brain-beta")
    }

    /// The **other** brain on the very same fixture. `K6` turns on this pair.
    fn gamma() -> BrainRecord {
        BrainRecord::frozen_by_id("brain-gamma").expect("brain-gamma")
    }

    fn brain_reading(fixture_id: &str) -> BrainRecord {
        BrainRecord {
            brain_id: format!("brain-test-{fixture_id}"),
            display_name: "Cerveau d'essai".to_string(),
            color: "#333333".to_string(),
            icon: "*".to_string(),
            source_kind: super::super::brains::SourceKind::SyntheticFixture,
            source_ref: fixture_id.to_string(),
            position: 1,
        }
    }

    fn built(name: &str) -> SandboxPaths {
        let paths = temporary_sandbox(name);
        commands::build_map(&paths, &alpha(), false).expect("map built");
        paths
    }

    /// The **legacy** scope is still a refusal — for the legacy self-check,
    /// and for it alone.
    ///
    /// `self_check` replays the frozen `TASK-0017` contract, which only
    /// `quasi-empty` can satisfy. `J12` is not weakened by `TASK-0024`.
    #[test]
    fn the_legacy_self_check_is_still_refused_outside_its_frozen_fixture() {
        let paths = temporary_sandbox("scope");
        let error = self_check(&paths, &brain_reading("wide")).expect_err("out of legacy scope");
        assert!(
            error.to_string().starts_with("relations_out_of_scope_for_fixture"),
            "unexpected motif: {error}"
        );
    }

    #[test]
    fn an_unknown_fixture_is_still_an_unknown_fixture() {
        let paths = temporary_sandbox("unknown");
        let error =
            open_relations(&paths, &brain_reading("inventee")).expect_err("unknown fixture");
        assert!(error.to_string().contains("map_unknown_fixture"));
        let node_error =
            node_relations(&paths, &brain_reading("inventee"), &BrainNodeRef::new("brain-test-inventee", 1))
                .expect_err("unknown fixture");
        assert!(node_error.to_string().contains("map_unknown_fixture"));
    }

    /// `J5` and `J1` through the command layer, on a real index.
    #[test]
    fn opening_relations_resolves_every_endpoint_and_matches_the_frozen_counts() {
        let paths = built("open");
        let overview = open_relations(&paths, &alpha()).expect("relations");

        assert!(overview.legacy_in_scope);
        assert_eq!(overview.brain_id, "brain-alpha");
        assert_eq!(overview.fixture_id, RELATIONS_FIXTURE);
        assert_eq!(overview.established.len(), 12);
        assert_eq!(overview.deterministic_count, 8);
        assert_eq!(overview.approved_count, 4);
        assert_eq!(overview.pending_suggestion_count, 4);
        assert!(
            overview.unresolved_endpoints.is_empty(),
            "J10: unresolved endpoints {:?}",
            overview.unresolved_endpoints
        );
        for edge in &overview.established {
            assert!(edge.source.node_id.is_some());
            assert!(edge.target.node_id.is_some());
            match edge.provenance.as_str() {
                "DETERMINISTIC" => {
                    assert!(edge.rule_name.as_deref().is_some_and(|n| !n.is_empty()));
                    assert!(edge.rule_version.as_deref().is_some_and(|v| !v.is_empty()));
                }
                "APPROVED" => {
                    assert!(edge.rule_name.is_none());
                    assert!(edge.suggestion_key.is_some());
                }
                other => panic!("J1: `{other}` is not a provenance"),
            }
        }

        let check = self_check(&paths, &alpha()).expect("self check");
        assert!(check.counts_agree, "J5: {:?}", check.counts);
        assert!(check.replay_stable, "J3");
        assert!(check.all_rejected, "J1/J2: {:?}", check.rejections);
        assert!(check.invented_inverses.is_empty(), "J5");
        assert!(check.suggestions_in_established.is_empty(), "J2");
        assert!(check.unresolved_endpoints.is_empty(), "J10");

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// `J10`, end to end: delete and rebuild the index, and check that nothing
    /// approved or suggested moved.
    #[test]
    fn a_full_rebuild_of_the_index_preserves_approved_relations_and_suggestions() {
        let paths = built("rebuild");
        open_relations(&paths, &alpha()).expect("relations");
        approve_suggestion(&paths, &alpha(), "S-005").expect("approval");

        let before = open_relations(&paths, &alpha()).expect("before");
        assert_eq!(before.approved_count, 5);
        assert_eq!(before.pending_suggestion_count, 3);

        // The rebuild deletes `brains/<brain>/map/index.sqlite` and rebuilds
        // it. The relations sit beside it, not inside it, and survive.
        commands::build_map(&paths, &alpha(), true).expect("rebuilt");

        let after = open_relations(&paths, &alpha()).expect("after");
        assert_eq!(after.approved_count, 5, "J10: approved relations must persist");
        assert_eq!(
            after.pending_suggestion_count, 3,
            "J10: suggestions must persist with their state"
        );
        assert_eq!(
            after.deterministic_digest, before.deterministic_digest,
            "J10: the derivation must replay without divergence"
        );
        assert!(after.unresolved_endpoints.is_empty(), "J10: endpoints resolve");
        assert_eq!(after.seeded, 0, "no suggestion is re-seeded by a rebuild");

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// `J4` and `J5` through the command layer: before, the suggestion counts
    /// nowhere; after, it counts exactly once.
    #[test]
    fn approval_moves_a_suggestion_into_the_counts_and_only_then() {
        let paths = built("approve");
        open_relations(&paths, &alpha()).expect("relations");

        // `S-005` runs `dossier-a/note-1.txt` → `racine-2.txt`.
        let source_id = |paths: &SandboxPaths, path: &str| {
            commands::snapshot(paths, &alpha())
                .expect("snapshot")
                .nodes
                .iter()
                .find(|node| node.relative_path == path)
                .expect("node")
                .id
        };
        let a1 = source_id(&paths, "dossier-a/note-1.txt");
        let r2 = source_id(&paths, "racine-2.txt");

        let before =
            node_relations(&paths, &alpha(), &BrainNodeRef::new("brain-alpha", a1))
                .expect("before");
        assert_eq!(before.outgoing_count, 3);
        assert_eq!(before.incoming_count, 1);
        assert_eq!(before.suggestions.len(), 1);
        assert_eq!(before.suggestions[0].suggestion_key, "S-005");

        approve_suggestion(&paths, &alpha(), "S-005").expect("approval");

        let after = node_relations(&paths, &alpha(), &BrainNodeRef::new("brain-alpha", a1))
            .expect("after");
        assert_eq!(after.outgoing_count, 4, "J4: exactly one more outgoing");
        assert_eq!(after.incoming_count, 1);
        assert!(after.suggestions.is_empty(), "J4: the suggestion is decided");
        assert!(
            after
                .outgoing
                .iter()
                .any(|entry| entry.provenance == "APPROVED"
                    && entry.other.relative_path == "racine-2.txt"),
            "J4: the approved relation is the one that was suggested"
        );

        let target = node_relations(&paths, &alpha(), &BrainNodeRef::new("brain-alpha", r2))
            .expect("target");
        assert_eq!(target.incoming_count, 2, "J5: the other end counts it too");
        assert_eq!(target.outgoing_count, 1, "J5: no inverse is invented");

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// The self-check must stay true **after** an approval, which is the state
    /// `J12` leaves behind. The frozen table is the seeded state; the approval
    /// adds exactly one edge, and the adjustment is listed rather than hidden.
    #[test]
    fn the_frozen_expectation_survives_an_approval_and_names_the_adjustment() {
        let paths = built("after-approval");
        open_relations(&paths, &alpha()).expect("relations");

        let before = self_check(&paths, &alpha()).expect("before");
        assert!(before.counts_agree, "{:?}", before.counts);
        assert!(before.approved_since_seed.is_empty());

        approve_suggestion(&paths, &alpha(), "S-005").expect("approval");

        let after = self_check(&paths, &alpha()).expect("after");
        assert_eq!(after.approved_since_seed, vec!["S-005".to_string()]);
        assert!(after.counts_agree, "J5 after approval: {:?}", after.counts);
        assert_eq!(after.established_total, 13);
        assert_eq!(after.pending_suggestion_total, 3);
        assert!(after.invented_inverses.is_empty());

        // The one edge the approval added, and no other.
        let pivot = after
            .counts
            .iter()
            .find(|entry| entry.relative_path == "dossier-a/note-1.txt")
            .expect("pivot");
        assert_eq!(pivot.expected_outgoing, 4);
        assert_eq!(pivot.observed_outgoing, 4);

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    #[test]
    fn a_directory_with_no_relation_reports_empty_rather_than_failing() {
        let paths = built("empty");
        open_relations(&paths, &alpha()).expect("relations");
        let snapshot = commands::snapshot(&paths, &alpha()).expect("snapshot");
        let dossier_a = snapshot
            .nodes
            .iter()
            .find(|node| node.relative_path == "dossier-a")
            .expect("node");

        let relations =
            node_relations(&paths, &alpha(), &BrainNodeRef::new("brain-alpha", dossier_a.id))
                .expect("read");
        assert_eq!(relations.outgoing_count, 0);
        assert_eq!(relations.incoming_count, 0);
        assert!(relations.suggestions.is_empty());

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// `K6` — the frozen isolation scenario of `TASK-0018` §4.5, step by step.
    ///
    /// Alpha and Gamma read the **same** fixture, derive the **same** eight
    /// relations, and hold the **same** suggestion keys. Approving in one must
    /// leave the other exactly where it was. Nothing here compares a brain to
    /// itself: every assertion reads the other brain back from its own store.
    #[test]
    fn approving_in_one_brain_never_moves_a_count_in_the_other() {
        let paths = built("isolation");
        commands::build_map(&paths, &gamma(), false).expect("gamma map");

        // Initial state — identical, and separately stored.
        let alpha_start = open_relations(&paths, &alpha()).expect("alpha");
        let gamma_start = open_relations(&paths, &gamma()).expect("gamma");
        for (label, overview) in [("alpha", &alpha_start), ("gamma", &gamma_start)] {
            assert_eq!(overview.deterministic_count, 8, "{label}");
            assert_eq!(overview.approved_count, 4, "{label}");
            assert_eq!(overview.pending_suggestion_count, 4, "{label}");
        }
        assert_ne!(
            alpha_start.relations_path, gamma_start.relations_path,
            "K3: two brains, two relation stores"
        );

        // The same suggestion key exists in both — its identity space is the
        // brain, `TASK-0018` §4.5.
        assert!(
            alpha_start
                .pending_suggestions
                .iter()
                .any(|s| s.suggestion_key == "S-005")
        );
        assert!(
            gamma_start
                .pending_suggestions
                .iter()
                .any(|s| s.suggestion_key == "S-005")
        );

        // Step 1 — approve `S-005` in Alpha.
        approve_suggestion(&paths, &alpha(), "S-005").expect("alpha approval");

        let alpha_after = open_relations(&paths, &alpha()).expect("alpha after");
        assert_eq!(alpha_after.deterministic_count, 8);
        assert_eq!(alpha_after.approved_count, 5);
        assert_eq!(alpha_after.pending_suggestion_count, 3);

        let gamma_untouched = open_relations(&paths, &gamma()).expect("gamma after");
        assert_eq!(gamma_untouched.deterministic_count, 8);
        assert_eq!(gamma_untouched.approved_count, 4, "K6: Gamma must not move");
        assert_eq!(gamma_untouched.pending_suggestion_count, 4, "K6");
        assert!(
            gamma_untouched
                .pending_suggestions
                .iter()
                .any(|s| s.suggestion_key == "S-005"),
            "K6: Gamma's own S-005 is still pending"
        );

        // Step 2 — approve a **different** suggestion in Gamma.
        approve_suggestion(&paths, &gamma(), "S-006").expect("gamma approval");

        let gamma_final = open_relations(&paths, &gamma()).expect("gamma final");
        assert_eq!(gamma_final.approved_count, 5);
        assert_eq!(gamma_final.pending_suggestion_count, 3);

        let alpha_final = open_relations(&paths, &alpha()).expect("alpha final");
        assert_eq!(alpha_final.approved_count, 5, "K6: Alpha must not move");
        assert_eq!(alpha_final.pending_suggestion_count, 3, "K6");
        assert!(
            alpha_final
                .pending_suggestions
                .iter()
                .any(|s| s.suggestion_key == "S-006"),
            "K6: Alpha's own S-006 was never approved"
        );

        // And both brains still pass their own self-check, independently.
        for (label, brain) in [("alpha", alpha()), ("gamma", gamma())] {
            let check = self_check(&paths, &brain).expect("self check");
            assert_eq!(check.brain_id, brain.brain_id);
            assert!(check.counts_agree, "{label}: {:?}", check.counts);
            assert!(check.invented_inverses.is_empty(), "{label}");
            assert!(check.suggestions_in_established.is_empty(), "{label}");
            assert!(check.unresolved_endpoints.is_empty(), "{label}");
        }

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// An endpoint key belongs to a brain, and to no other.
    ///
    /// This is what makes the isolation structural rather than incidental: even
    /// if the two stores were ever merged, Alpha's keys would not match
    /// Gamma's nodes.
    #[test]
    fn endpoint_keys_of_two_brains_never_collide_on_the_same_fixture() {
        let paths = built("keys");
        commands::build_map(&paths, &gamma(), false).expect("gamma map");

        let alpha_keys = open_relations(&paths, &alpha())
            .expect("alpha")
            .established
            .iter()
            .map(|edge| edge.source.key.clone())
            .collect::<std::collections::BTreeSet<_>>();
        let gamma_keys = open_relations(&paths, &gamma())
            .expect("gamma")
            .established
            .iter()
            .map(|edge| edge.source.key.clone())
            .collect::<std::collections::BTreeSet<_>>();

        assert_eq!(alpha_keys.len(), gamma_keys.len(), "same tree, same shape");
        assert!(
            alpha_keys.is_disjoint(&gamma_keys),
            "two brains on one fixture must share no endpoint key"
        );
        assert!(alpha_keys.iter().all(|key| key.contains("brain-alpha")));
        assert!(gamma_keys.iter().all(|key| key.contains("brain-gamma")));

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// Every byte of one brain's relation store, so « untouched » can be
    /// measured rather than assumed.
    fn store_bytes(paths: &SandboxPaths, brain_id: &str) -> Option<Vec<u8>> {
        std::fs::read(paths.brain_relations_database(brain_id)).ok()
    }

    /// `X11` — the generic path, proved on the brain that is **not**
    /// `quasi-empty`.
    ///
    /// Beta reads `deep`. No legacy producer applies to it, and that must stop
    /// being a reason to refuse it: opening returns a valid overview, the
    /// engine reports `NOT_RUN`, running `dre-v1` succeeds without any model or
    /// network, and reading a node's relations succeeds. Nothing here asserts
    /// that a rule *must* fire on `deep`: zero output is a valid result, and
    /// what is proved is that the engine and the reads work generically.
    #[test]
    fn a_brain_outside_the_legacy_fixture_still_opens_runs_and_reads() {
        let paths = temporary_sandbox("generic-beta");
        commands::build_map(&paths, &beta(), false).expect("beta map built");

        // 2 — opening succeeds, and says the legacy demonstration does not
        // apply rather than refusing the brain.
        let overview = open_relations(&paths, &beta()).expect("beta relations open");
        assert_eq!(overview.brain_id, "brain-beta");
        assert_eq!(overview.fixture_id, "deep");
        assert!(
            !overview.legacy_in_scope,
            "TASK-0017 legacy relations must not be claimed on `deep`"
        );
        assert_eq!(overview.schema_version, RELATIONS_SCHEMA_VERSION);

        // 3 — nothing legacy was derived or seeded for Beta.
        assert_eq!(overview.seeded, 0, "no legacy seed on a non-legacy brain");
        assert!(
            overview.established.is_empty(),
            "no legacy derivation on `deep`: {:?}",
            overview.established
        );
        assert!(
            overview.pending_suggestions.is_empty(),
            "no legacy seed on `deep`: {:?}",
            overview.pending_suggestions
        );
        assert_eq!(overview.deterministic_count, 0);
        assert_eq!(overview.approved_count, 0);
        assert_eq!(overview.pending_suggestion_count, 0);
        assert!(overview.unresolved_endpoints.is_empty());
        assert!(
            overview.rules.iter().all(|rule| rule.produced == 0),
            "no legacy rule produced anything on `deep`: {:?}",
            overview.rules
        );

        // 4 — the core engine has simply never run here.
        let status = super::super::rule_engine::status(&paths, &beta()).expect("beta status");
        assert_eq!(status.brain_id, "brain-beta");
        assert_eq!(status.input_state, "NOT_RUN");
        assert!(status.last_run_id.is_none());
        assert!(!overview.engine_current);

        // 5 — `dre-v1` runs, deterministically and offline.
        let report = super::super::rule_engine::run(&paths, &beta()).expect("beta engine run");
        assert_eq!(report.brain_id, "brain-beta");
        assert_eq!(report.input_state, "CURRENT");
        assert!(report.source_read_only_confirmed);

        let after_status =
            super::super::rule_engine::status(&paths, &beta()).expect("beta status after run");
        assert_eq!(after_status.input_state, "CURRENT");

        // 6 — the overview refreshes after the run.
        let refreshed = open_relations(&paths, &beta()).expect("beta refresh");
        assert!(refreshed.engine_current, "the run must be readable as current");
        assert_eq!(refreshed.seeded, 0, "a refresh seeds nothing either");
        for edge in &refreshed.established {
            assert_eq!(
                edge.producer,
                super::super::relations::CORE_RULE_ENGINE_PRODUCER,
                "only core output may appear on a non-legacy brain"
            );
        }
        for suggestion in &refreshed.pending_suggestions {
            assert_eq!(
                suggestion.producer,
                super::super::relations::CORE_RULE_ENGINE_PRODUCER,
                "only core output may appear on a non-legacy brain"
            );
        }

        // 7 — node relations work, on a real node of Beta.
        let snapshot = commands::snapshot(&paths, &beta()).expect("beta snapshot");
        let node = snapshot
            .nodes
            .iter()
            .find(|candidate| candidate.kind == crate::domain::NodeKind::File)
            .or_else(|| snapshot.nodes.first())
            .expect("a node");
        let node_view =
            node_relations(&paths, &beta(), &BrainNodeRef::new("brain-beta", node.id))
                .expect("beta node relations");
        assert_eq!(node_view.brain_id, "brain-beta");
        assert_eq!(node_view.fixture_id, "deep");
        assert_eq!(node_view.relative_path, node.relative_path);
        assert!(node_view.endpoint_key.contains("brain-beta"));

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// `X11`, isolation half: the generic path must not touch, read or borrow
    /// anything from the legacy brains.
    ///
    /// Alpha's frozen `TASK-0017` invariants are measured before and after Beta
    /// is opened and analysed, and Alpha's store is compared byte for byte.
    /// Gamma is never built here, so the assertion that no store of it appears
    /// is a real one.
    #[test]
    fn running_the_generic_engine_on_beta_leaves_the_legacy_brains_untouched() {
        let paths = temporary_sandbox("generic-isolation");
        commands::build_map(&paths, &alpha(), false).expect("alpha map");
        commands::build_map(&paths, &beta(), false).expect("beta map");

        let alpha_before = open_relations(&paths, &alpha()).expect("alpha before");
        let alpha_check_before = self_check(&paths, &alpha()).expect("alpha J12 before");
        let alpha_bytes_before = store_bytes(&paths, "brain-alpha").expect("alpha store");
        let gamma_absent_before = store_bytes(&paths, "brain-gamma").is_none();

        open_relations(&paths, &beta()).expect("beta open");
        super::super::rule_engine::run(&paths, &beta()).expect("beta run");
        let beta_after = open_relations(&paths, &beta()).expect("beta after");

        // 9 — no Alpha or Gamma row reached Beta. Endpoint keys are namespaced
        // by brain, so this is checkable on the rows themselves.
        for edge in &beta_after.established {
            for key in [&edge.source.key, &edge.target.key] {
                assert!(key.contains("brain-beta"), "leaked endpoint `{key}`");
            }
        }
        for suggestion in &beta_after.pending_suggestions {
            for key in [&suggestion.source.key, &suggestion.target.key] {
                assert!(key.contains("brain-beta"), "leaked endpoint `{key}`");
            }
            assert!(
                !SEEDED_SUGGESTIONS
                    .iter()
                    .any(|seeded| seeded.key == suggestion.suggestion_key),
                "a frozen TASK-0017 suggestion key surfaced on Beta: {}",
                suggestion.suggestion_key
            );
        }
        assert_ne!(
            beta_after.relations_path, alpha_before.relations_path,
            "K3: two brains, two relation stores"
        );

        // 8 — Alpha's legacy invariants are strictly identical.
        let alpha_after = open_relations(&paths, &alpha()).expect("alpha after");
        assert_eq!(alpha_after.deterministic_count, alpha_before.deterministic_count);
        assert_eq!(alpha_after.approved_count, alpha_before.approved_count);
        assert_eq!(
            alpha_after.pending_suggestion_count,
            alpha_before.pending_suggestion_count
        );
        assert_eq!(
            alpha_after.deterministic_digest, alpha_before.deterministic_digest,
            "J12: Alpha's derivation must not move"
        );
        assert!(alpha_after.legacy_in_scope);

        let alpha_check_after = self_check(&paths, &alpha()).expect("alpha J12 after");
        assert_eq!(alpha_check_after.counts, alpha_check_before.counts);
        assert!(alpha_check_after.counts_agree, "J12: {:?}", alpha_check_after.counts);
        assert!(alpha_check_after.replay_stable, "J3");
        assert!(alpha_check_after.all_rejected, "J1/J2");
        assert!(alpha_check_after.invented_inverses.is_empty(), "J5");
        assert!(alpha_check_after.suggestions_in_established.is_empty(), "J2");
        assert!(alpha_check_after.unresolved_endpoints.is_empty(), "J10");
        assert_eq!(
            alpha_check_after.established_total,
            alpha_check_before.established_total
        );
        assert_eq!(
            alpha_check_after.pending_suggestion_total,
            alpha_check_before.pending_suggestion_total
        );
        assert_eq!(
            alpha_check_after.replay_digest_first,
            alpha_check_before.replay_digest_first
        );

        // 10 — and no cross-brain store grew. Alpha's own self-check reopens
        // its store, so the baseline is the state self-check itself leaves
        // behind, which is the honest comparison.
        let alpha_bytes_after = store_bytes(&paths, "brain-alpha").expect("alpha store after");
        assert_eq!(
            alpha_bytes_after.len(),
            alpha_bytes_before.len(),
            "Beta must not grow Alpha's store"
        );
        assert!(
            gamma_absent_before && store_bytes(&paths, "brain-gamma").is_none(),
            "a brain that was never opened must have no relation store"
        );

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }

    /// A **core** suggestion on a non-legacy brain can be approved, and the
    /// legacy fixture is no longer what decides it.
    ///
    /// The approval path no longer asks about the legacy fixture; the only
    /// refusals left on it are the freshness rule of `TASK-0024` and the
    /// suggestion's own existence.
    #[test]
    fn a_core_suggestion_of_a_non_legacy_brain_is_approvable_when_current() {
        let paths = temporary_sandbox("generic-approval");
        commands::build_map(&paths, &beta(), false).expect("beta map");
        super::super::rule_engine::run(&paths, &beta()).expect("beta run");
        let overview = open_relations(&paths, &beta()).expect("beta overview");

        let Some(suggestion) = overview.pending_suggestions.first().cloned() else {
            // Zero output is a valid result on `deep`. What still has to hold
            // is that the refusal is about the *suggestion*, not about the
            // fixture: an unknown key must not come back as « out of scope ».
            let error = approve_suggestion(&paths, &beta(), "S-inexistante")
                .expect_err("unknown suggestion");
            assert!(
                !error.to_string().contains("relations_out_of_scope_for_fixture"),
                "the legacy fixture must not gate approval: {error}"
            );
            let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
            return;
        };

        let after = approve_suggestion(&paths, &beta(), &suggestion.suggestion_key)
            .expect("core approval on a non-legacy brain");
        assert_eq!(after.approved_count, 1);
        assert!(
            after
                .pending_suggestions
                .iter()
                .all(|pending| pending.suggestion_key != suggestion.suggestion_key),
            "an approved suggestion is no longer pending"
        );

        let _ = std::fs::remove_dir_all(PathBuf::from(&paths.fixtures).parent().unwrap());
    }
}
