//! `TASK-0024` — the first real deterministic rule runtime.
//!
//! Observed facts stay facts. Only a rule with a defined proposition may write
//! a deterministic relation, while weaker signals remain suggestions.

use super::brains::BrainRecord;
use super::content_signals::{self, ContentObservation, ObservationStatus};
use super::relations::{
    EngineRelationWrite, EngineSnapshot, EngineSuggestionWrite, RelationStore,
    endpoint_key, engine_snapshot_if_present,
};
use super::sandbox::SandboxPaths;
use super::store::MapNode;
use super::{MapError, commands, fnv1a64};
use crate::domain::NodeKind;
use crate::map::layout::Rect;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
#[cfg(debug_assertions)]
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

pub const ENGINE_VERSION: &str = "dre-v1";
pub const IDENTICAL_CONTENT_RULE_ID: &str = "core.identical-content";
pub const NUMBERED_SIBLING_RULE_ID: &str = "core.numbered-sibling-revision-candidate";
pub const RULE_VERSION: &str = "v1";
pub const TASK0024_DR15_BRAIN_ID: &str = "brain-alpha";
pub const TASK0024_DR15_SOURCE_ID: &str = "task0024-dr15";

#[cfg(debug_assertions)]
const TASK0024_DR15_FILES: [(&str, &[u8]); 9] = [
    ("identiques/a.bin", b"preuve-synthetique-identique\n"),
    ("identiques/b.bin", b"preuve-synthetique-identique\n"),
    ("identiques/c.bin", b"preuve-synthetique-identique\n"),
    ("vides/a.bin", b""),
    ("vides/b.bin", b""),
    ("revisions/rapport-4.pdf", b"revision-quatre-synthetique\n"),
    ("revisions/rapport-5.pdf", b"revision-cinq--synthetique\n"),
    ("different/taille-a.bin", b"AAAA"),
    ("different/taille-b.bin", b"BBBB"),
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RuleOutputKind {
    DeterministicRelation,
    Suggestion,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleDefinition {
    pub rule_id: &'static str,
    pub version: &'static str,
    pub output_kind: RuleOutputKind,
    pub relation_type: &'static str,
    pub symmetric: bool,
    pub assertion: &'static str,
    pub required_signals: &'static [&'static str],
    pub explanation_fr: &'static str,
    pub explanation_en: &'static str,
}

pub const RULE_CATALOG: [RuleDefinition; 2] = [
    RuleDefinition {
        rule_id: IDENTICAL_CONTENT_RULE_ID,
        version: RULE_VERSION,
        output_kind: RuleOutputKind::DeterministicRelation,
        relation_type: "content-identical",
        symmetric: true,
        assertion: "Two non-empty occurrences had the same sha256-v1 digest in the content generation used by this run.",
        required_signals: &["sha256-v1", "size-bytes", "content-generation-id"],
        explanation_fr: "Contenu binaire identique observé : les deux occurrences non vides ont le même SHA-256 dans la génération utilisée.",
        explanation_en: "Identical binary content observed: both non-empty occurrences have the same SHA-256 in the generation used.",
    },
    RuleDefinition {
        rule_id: NUMBERED_SIBLING_RULE_ID,
        version: RULE_VERSION,
        output_kind: RuleOutputKind::Suggestion,
        relation_type: "revision",
        symmetric: false,
        assertion: "The observed filename pattern is a revision candidate, not proof of a revision.",
        required_signals: &["same-parent", "same-extension", "trailing-consecutive-number"],
        explanation_fr: "Suggestion créée parce que les deux fichiers sont dans le même dossier, ont la même extension et des noms identiques sauf un numéro final consécutif.",
        explanation_en: "Suggestion created because both files are in the same folder, have the same extension, and have identical names except for a consecutive trailing number.",
    },
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedRule {
    pub rule_id: String,
    pub version: String,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationEngineReport {
    pub brain_id: String,
    pub engine_version: String,
    pub run_id: String,
    pub map_digest: String,
    pub content_generation_id: Option<String>,
    pub rules_evaluated: Vec<String>,
    pub rules_skipped: Vec<SkippedRule>,
    pub deterministic_relations_produced: usize,
    pub suggestions_produced: usize,
    pub empty_content_groups_skipped: usize,
    pub established_collision_suppressions: usize,
    pub approved_suggestion_preservations: usize,
    /// `TASK-0025` — identities this run reproposed and the store kept
    /// `rejected`. Appended beside the counters `TASK-0024` was verified on;
    /// none of those is renamed or removed.
    pub rejected_suggestion_preservations: usize,
    pub source_read_only_confirmed: bool,
    pub input_state: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationEngineStatus {
    pub brain_id: String,
    pub engine_version: String,
    pub input_state: String,
    pub map_digest: String,
    pub current_content_generation_id: Option<String>,
    pub last_run_id: Option<String>,
    pub last_run_unix_ms: Option<i64>,
    pub last_map_digest: Option<String>,
    pub last_content_generation_id: Option<String>,
}

#[derive(Debug, Default)]
struct Evaluation {
    relations: Vec<EngineRelationWrite>,
    suggestions: Vec<EngineSuggestionWrite>,
    empty_content_groups_skipped: usize,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(i64::MAX as u128) as i64
}

fn new_run_id(brain_id: &str, map_digest: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let material = format!("{brain_id}|{map_digest}|{nanos}");
    format!("dre1-{:016x}", fnv1a64(material.as_bytes()))
}

fn parent_path(path: &str) -> &str {
    path.rsplit_once('/').map(|(parent, _)| parent).unwrap_or("")
}

fn numbered_name(name: &str) -> Option<(&str, u64, &str)> {
    let (stem, extension) = name.rsplit_once('.')?;
    if extension.is_empty() {
        return None;
    }
    let digit_start = stem
        .char_indices()
        .rev()
        .find(|(_, character)| !character.is_ascii_digit())
        .map(|(index, character)| index + character.len_utf8())
        .unwrap_or(0);
    if digit_start == stem.len() {
        return None;
    }
    let prefix = &stem[..digit_start];
    let number = stem[digit_start..].parse().ok()?;
    Some((prefix, number, extension))
}

fn suggestion_key(
    brain_id: &str,
    source_key: &str,
    target_key: &str,
    relation_type: &str,
) -> String {
    let material = format!(
        "{NUMBERED_SIBLING_RULE_ID}|{RULE_VERSION}|{brain_id}|{source_key}|{target_key}|{relation_type}"
    );
    format!("dre1:{:016x}", fnv1a64(material.as_bytes()))
}

fn evaluate(
    brain_id: &str,
    nodes: &[MapNode],
    observations: Option<&[ContentObservation]>,
    content_generation_id: Option<&str>,
) -> Result<Evaluation, MapError> {
    let files = nodes
        .iter()
        .filter(|node| node.kind == NodeKind::File)
        .collect::<Vec<_>>();
    let paths = files
        .iter()
        .map(|node| node.relative_path.as_str())
        .collect::<BTreeSet<_>>();
    let mut evaluation = Evaluation::default();

    if let (Some(observations), Some(generation)) = (observations, content_generation_id) {
        let mut non_empty: BTreeMap<&str, Vec<&str>> = BTreeMap::new();
        let mut empty: BTreeMap<&str, usize> = BTreeMap::new();
        for observation in observations {
            if observation.observation_status != ObservationStatus::Hashed
                || observation.hash_algorithm.as_deref() != Some("sha256-v1")
                || observation.generation_id != generation
                || !paths.contains(observation.relative_path.as_str())
            {
                continue;
            }
            let Some(hash) = observation.hash_hex.as_deref() else {
                continue;
            };
            if observation.size_bytes == 0 {
                *empty.entry(hash).or_default() += 1;
            } else {
                non_empty
                    .entry(hash)
                    .or_default()
                    .push(observation.relative_path.as_str());
            }
        }
        evaluation.empty_content_groups_skipped =
            empty.values().filter(|count| **count >= 2).count();
        for (hash, members) in &mut non_empty {
            members.sort_unstable();
            members.dedup();
            let Some(anchor) = members.first().copied() else {
                continue;
            };
            for member in members.iter().skip(1) {
                evaluation.relations.push(EngineRelationWrite {
                    source_key: endpoint_key(brain_id, anchor),
                    target_key: endpoint_key(brain_id, member),
                    relation_type: "content-identical".to_string(),
                    rule_name: IDENTICAL_CONTENT_RULE_ID.to_string(),
                    rule_version: RULE_VERSION.to_string(),
                    symmetric: true,
                    explanation_fr: RULE_CATALOG[0].explanation_fr.to_string(),
                    explanation_en: RULE_CATALOG[0].explanation_en.to_string(),
                    content_generation_id: Some(generation.to_string()),
                    observed_hash: Some((*hash).to_string()),
                });
            }
        }
    }

    let mut series: BTreeMap<(&str, &str, &str), BTreeMap<u64, Vec<&str>>> = BTreeMap::new();
    for file in files {
        let Some((prefix, number, extension)) = numbered_name(&file.name) else {
            continue;
        };
        series
            .entry((parent_path(&file.relative_path), prefix, extension))
            .or_default()
            .entry(number)
            .or_default()
            .push(file.relative_path.as_str());
    }
    for ((parent, prefix, extension), members) in &mut series {
        for paths in members.values_mut() {
            paths.sort_unstable();
        }
        for (number, sources) in members.iter() {
            let Some(next_number) = number.checked_add(1) else {
                continue;
            };
            let Some(targets) = members.get(&next_number) else {
                continue;
            };
            for source in sources {
                for target in targets {
                    if source == target {
                        continue;
                    }
                    let source_key = endpoint_key(brain_id, source);
                    let target_key = endpoint_key(brain_id, target);
                    let signals = serde_json::json!({
                        "sameParent": true,
                        "sameExtension": true,
                        "normalizedPrefix": prefix,
                        "sourceNumber": number,
                        "targetNumber": next_number,
                        "parent": parent,
                        "extension": extension,
                    });
                    evaluation.suggestions.push(EngineSuggestionWrite {
                        suggestion_key: suggestion_key(
                            brain_id,
                            &source_key,
                            &target_key,
                            "revision",
                        ),
                        source_key,
                        target_key,
                        relation_type: "revision".to_string(),
                        rule_name: NUMBERED_SIBLING_RULE_ID.to_string(),
                        rule_version: RULE_VERSION.to_string(),
                        explanation_fr: RULE_CATALOG[1].explanation_fr.to_string(),
                        explanation_en: RULE_CATALOG[1].explanation_en.to_string(),
                        signals_json: serde_json::to_string(&signals)
                            .map_err(|error| MapError::RuleEngine(error.to_string()))?,
                    });
                }
            }
        }
    }
    evaluation.suggestions.sort_by(|left, right| {
        left.suggestion_key.cmp(&right.suggestion_key)
    });
    Ok(evaluation)
}

fn current_inputs(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<(String, Option<String>), MapError> {
    let map_digest = commands::open_store(paths, brain)?.reconstructible_digest()?;
    let generation = content_signals::current_generation_id_if_present(paths, brain)?;
    Ok((map_digest, generation))
}

fn input_state(
    snapshot: Option<&EngineSnapshot>,
    map_digest: &str,
    content_generation_id: Option<&str>,
) -> &'static str {
    match snapshot {
        None => "NOT_RUN",
        Some(last)
            if last.engine_version == ENGINE_VERSION
                && last.map_digest == map_digest
                && last.content_generation_id.as_deref() == content_generation_id =>
        {
            "CURRENT"
        }
        Some(_) => "STALE",
    }
}

pub fn task0024_dr15_enabled() -> bool {
    cfg!(debug_assertions)
        && std::env::var("FILETOPO_AUTO_DRE").is_ok_and(|value| value == "1" || value == "2")
}

/// Extra nodes exist only for the explicitly TASK-0024 DR15 development
/// scenario. They are never added to the frozen four fixture plans or to the
/// brain map store; they merely give the real rule runtime a synthetic proof
/// input whose source is materialized separately and then treated read-only.
pub fn task0024_dr15_nodes() -> Vec<MapNode> {
    #[cfg(debug_assertions)]
    {
        return TASK0024_DR15_FILES
            .iter()
            .enumerate()
            .map(|(index, (path, bytes))| MapNode {
                id: 90_000 + index as i64,
                parent_id: None,
                name: path.rsplit('/').next().unwrap_or(path).to_string(),
                relative_path: (*path).to_string(),
                kind: NodeKind::File,
                depth: 2,
                size_bytes: bytes.len() as u64,
                modified_unix_ms: None,
                child_count: 0,
                access_diagnostic: None,
                rect: Rect {
                    x: 0.0,
                    y: index as f64 * 80.0,
                    w: 240.0,
                    h: 64.0,
                },
            })
            .collect();
    }
    #[cfg(not(debug_assertions))]
    Vec::new()
}

pub fn effective_nodes(nodes: &[MapNode]) -> Vec<MapNode> {
    let mut effective = nodes.to_vec();
    if task0024_dr15_enabled() {
        effective.extend(task0024_dr15_nodes());
    }
    effective
}

#[cfg(debug_assertions)]
pub fn prepare_task0024_dr15(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<content_signals::ContentObservationReport, MapError> {
    if brain.brain_id != TASK0024_DR15_BRAIN_ID {
        return Err(MapError::RuleEngine(
            "TASK-0024 DR15 proof input is scoped to brain-alpha".to_string(),
        ));
    }
    let root = paths.fixtures.join(TASK0024_DR15_SOURCE_ID);
    let expected_paths = TASK0024_DR15_FILES
        .iter()
        .map(|(path, _)| (*path).to_string())
        .collect::<BTreeSet<_>>();
    if root.exists() {
        let observed = super::fixtures::observed_paths(&root)?
            .into_iter()
            .filter(|path| {
                root.join(path.replace('/', std::path::MAIN_SEPARATOR_STR))
                    .is_file()
            })
            .collect::<BTreeSet<_>>();
        if observed != expected_paths {
            return Err(MapError::FixtureMismatch(
                "TASK-0024 DR15 synthetic source differs from its frozen proof plan; nothing was deleted"
                    .to_string(),
            ));
        }
        for (path, bytes) in TASK0024_DR15_FILES {
            if fs::read(root.join(path.replace('/', std::path::MAIN_SEPARATOR_STR)))? != bytes {
                return Err(MapError::FixtureMismatch(format!(
                    "TASK-0024 DR15 synthetic file `{path}` differs; nothing was overwritten"
                )));
            }
        }
    } else {
        for (path, bytes) in TASK0024_DR15_FILES {
            let target = root.join(path.replace('/', std::path::MAIN_SEPARATOR_STR));
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(target, bytes)?;
        }
    }
    content_signals::observe_task0024_fixture(
        paths,
        &brain.brain_id,
        &root,
        &task0024_dr15_nodes(),
    )
}

pub fn status(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<RelationEngineStatus, MapError> {
    let (map_digest, content_generation_id) = current_inputs(paths, brain)?;
    let snapshot = engine_snapshot_if_present(
        &paths.brain_relations_database(&brain.brain_id),
    )?;
    let input_state = input_state(
        snapshot.as_ref(),
        &map_digest,
        content_generation_id.as_deref(),
    );
    Ok(RelationEngineStatus {
        brain_id: brain.brain_id.clone(),
        engine_version: ENGINE_VERSION.to_string(),
        input_state: input_state.to_string(),
        map_digest,
        current_content_generation_id: content_generation_id,
        last_run_id: snapshot.as_ref().map(|last| last.run_id.clone()),
        last_run_unix_ms: snapshot.as_ref().map(|last| last.run_unix_ms),
        last_map_digest: snapshot.as_ref().map(|last| last.map_digest.clone()),
        last_content_generation_id: snapshot
            .as_ref()
            .and_then(|last| last.content_generation_id.clone()),
    })
}

pub fn is_current(paths: &SandboxPaths, brain: &BrainRecord) -> Result<bool, MapError> {
    Ok(status(paths, brain)?.input_state == "CURRENT")
}

pub fn run(
    paths: &SandboxPaths,
    brain: &BrainRecord,
) -> Result<RelationEngineReport, MapError> {
    let map_store = commands::open_store(paths, brain)?;
    let snapshot = map_store.snapshot()?;
    let map_digest = map_store.reconstructible_digest()?;
    let content_summary = content_signals::content_observation_summary(paths, brain)?;
    let generation = content_summary.current_generation_id.clone();
    let observations = if generation.is_some() {
        Some(content_signals::content_observations(paths, brain)?)
    } else {
        None
    };
    let effective = effective_nodes(&snapshot.nodes);
    let evaluation = evaluate(
        &brain.brain_id,
        &effective,
        observations.as_deref(),
        generation.as_deref(),
    )?;
    let run_id = new_run_id(&brain.brain_id, &map_digest);
    let engine_snapshot = EngineSnapshot {
        run_id: run_id.clone(),
        map_digest: map_digest.clone(),
        content_generation_id: generation.clone(),
        engine_version: ENGINE_VERSION.to_string(),
        run_unix_ms: now_ms(),
    };
    let mut store = RelationStore::open(&paths.brain_relations_database(&brain.brain_id))?;
    let reconciliation = store.reconcile_engine_outputs(
        &evaluation.relations,
        &evaluation.suggestions,
        &engine_snapshot,
    )?;
    let (rules_evaluated, rules_skipped) = if generation.is_some() {
        (
            RULE_CATALOG
                .iter()
                .map(|rule| format!("{}/{}", rule.rule_id, rule.version))
                .collect(),
            Vec::new(),
        )
    } else {
        (
            vec![format!("{NUMBERED_SIBLING_RULE_ID}/{RULE_VERSION}")],
            vec![SkippedRule {
                rule_id: IDENTICAL_CONTENT_RULE_ID.to_string(),
                version: RULE_VERSION.to_string(),
                reason: "SKIPPED_MISSING_SIGNAL".to_string(),
            }],
        )
    };
    Ok(RelationEngineReport {
        brain_id: brain.brain_id.clone(),
        engine_version: ENGINE_VERSION.to_string(),
        run_id,
        map_digest,
        content_generation_id: generation,
        rules_evaluated,
        rules_skipped,
        deterministic_relations_produced: reconciliation.deterministic_relations_produced,
        suggestions_produced: reconciliation.suggestions_produced,
        empty_content_groups_skipped: evaluation.empty_content_groups_skipped,
        established_collision_suppressions: reconciliation.established_collision_suppressions,
        approved_suggestion_preservations: reconciliation.approved_suggestion_preservations,
        rejected_suggestion_preservations: reconciliation.rejected_suggestion_preservations,
        source_read_only_confirmed: true,
        input_state: "CURRENT".to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::map::layout::Rect;

    fn file(id: i64, path: &str, size: u64) -> MapNode {
        MapNode {
            id,
            parent_id: Some(1),
            name: path.rsplit('/').next().unwrap_or(path).to_string(),
            relative_path: path.to_string(),
            kind: NodeKind::File,
            depth: 1,
            size_bytes: size,
            modified_unix_ms: None,
            child_count: 0,
            access_diagnostic: None,
            rect: Rect { x: 0.0, y: 0.0, w: 240.0, h: 64.0 },
        }
    }

    fn observation(path: &str, size: u64, hash: &str) -> ContentObservation {
        ContentObservation {
            relative_path: path.to_string(),
            size_bytes: size,
            modified_unix_ms: None,
            observation_status: ObservationStatus::Hashed,
            hash_algorithm: Some("sha256-v1".to_string()),
            hash_hex: Some(hash.to_string()),
            observed_at_unix_ms: 1,
            generation_id: "generation-1".to_string(),
            diagnostic: None,
        }
    }

    #[test]
    fn catalog_is_complete_unique_and_has_no_score() {
        assert_eq!(RULE_CATALOG.len(), 2);
        let ids = RULE_CATALOG.iter().map(|rule| (rule.rule_id, rule.version)).collect::<BTreeSet<_>>();
        assert_eq!(ids.len(), 2);
        for rule in RULE_CATALOG {
            assert!(!rule.assertion.is_empty());
            assert!(!rule.explanation_fr.is_empty());
            assert!(!rule.explanation_en.is_empty());
            assert!(!rule.required_signals.is_empty());
        }
        let serialized = serde_json::to_string(&RULE_CATALOG).unwrap();
        assert!(!serialized.contains("score"));
        assert!(!serialized.contains("confidence"));
    }

    #[test]
    fn identical_content_uses_n_minus_one_edges_and_skips_empty_groups() {
        let hash = "a".repeat(64);
        let empty = "e".repeat(64);
        let nodes = vec![file(2, "z.txt", 4), file(3, "a.txt", 4), file(4, "m.txt", 4), file(5, "e1", 0), file(6, "e2", 0)];
        let observations = vec![observation("z.txt", 4, &hash), observation("a.txt", 4, &hash), observation("m.txt", 4, &hash), observation("e1", 0, &empty), observation("e2", 0, &empty)];
        let result = evaluate("brain-alpha", &nodes, Some(&observations), Some("generation-1")).unwrap();
        assert_eq!(result.relations.len(), 2);
        assert!(result.relations.iter().all(|relation| relation.source_key.ends_with("|a.txt")));
        assert_eq!(result.empty_content_groups_skipped, 1);
        assert!(result.relations.iter().all(|relation| relation.relation_type == "content-identical"));
    }

    #[test]
    fn same_size_different_content_produces_no_relation() {
        let nodes = vec![file(2, "a.bin", 4), file(3, "b.bin", 4)];
        let observations = vec![observation("a.bin", 4, &"a".repeat(64)), observation("b.bin", 4, &"b".repeat(64))];
        assert!(evaluate("brain-alpha", &nodes, Some(&observations), Some("generation-1")).unwrap().relations.is_empty());
    }

    #[test]
    fn numbered_siblings_are_stable_explainable_suggestions_only() {
        let nodes = vec![file(2, "d/rapport-4.pdf", 1), file(3, "d/rapport-5.pdf", 1)];
        let first = evaluate("brain-alpha", &nodes, None, None).unwrap();
        let second = evaluate("brain-alpha", &nodes, None, None).unwrap();
        assert!(first.relations.is_empty());
        assert_eq!(first.suggestions, second.suggestions);
        assert_eq!(first.suggestions.len(), 1);
        let suggestion = &first.suggestions[0];
        assert!(suggestion.explanation_fr.contains("numéro final consécutif"));
        assert!(suggestion.explanation_en.contains("consecutive trailing number"));
        assert!(!suggestion.signals_json.contains("score"));
    }

    #[test]
    fn numbered_counterexamples_are_refused() {
        for nodes in [
            vec![file(2, "a/rapport-4.pdf", 1), file(3, "b/rapport-5.pdf", 1)],
            vec![file(2, "d/rapport-4.pdf", 1), file(3, "d/rapport-5.txt", 1)],
            vec![file(2, "d/rapport-4.pdf", 1), file(3, "d/rapport-6.pdf", 1)],
            vec![file(2, "d/rapport-4.pdf", 1), file(3, "d/annexe-5.pdf", 1)],
        ] {
            assert!(evaluate("brain-alpha", &nodes, None, None).unwrap().suggestions.is_empty());
        }
    }

    #[test]
    fn brain_namespace_changes_keys() {
        let nodes = vec![file(2, "d/x-1.txt", 1), file(3, "d/x-2.txt", 1)];
        let alpha = evaluate("brain-alpha", &nodes, None, None).unwrap();
        let gamma = evaluate("brain-gamma", &nodes, None, None).unwrap();
        assert_ne!(alpha.suggestions[0].suggestion_key, gamma.suggestions[0].suggestion_key);
        assert!(alpha.suggestions[0].source_key.contains("brain-alpha"));
        assert!(gamma.suggestions[0].source_key.contains("brain-gamma"));
    }

    #[test]
    fn snapshot_freshness_tracks_map_and_content_generation() {
        let snapshot = EngineSnapshot {
            run_id: "run".to_string(),
            map_digest: "map-a".to_string(),
            content_generation_id: Some("generation-a".to_string()),
            engine_version: ENGINE_VERSION.to_string(),
            run_unix_ms: 1,
        };
        assert_eq!(input_state(None, "map-a", Some("generation-a")), "NOT_RUN");
        assert_eq!(input_state(Some(&snapshot), "map-a", Some("generation-a")), "CURRENT");
        assert_eq!(input_state(Some(&snapshot), "map-b", Some("generation-a")), "STALE");
        assert_eq!(input_state(Some(&snapshot), "map-a", Some("generation-b")), "STALE");
    }

    fn relation_write() -> EngineRelationWrite {
        EngineRelationWrite {
            source_key: endpoint_key("brain-alpha", "a.bin"),
            target_key: endpoint_key("brain-alpha", "b.bin"),
            relation_type: "content-identical".to_string(),
            rule_name: IDENTICAL_CONTENT_RULE_ID.to_string(),
            rule_version: RULE_VERSION.to_string(),
            symmetric: true,
            explanation_fr: RULE_CATALOG[0].explanation_fr.to_string(),
            explanation_en: RULE_CATALOG[0].explanation_en.to_string(),
            content_generation_id: Some("generation-1".to_string()),
            observed_hash: Some("a".repeat(64)),
        }
    }

    fn suggestion_write() -> EngineSuggestionWrite {
        let source_key = endpoint_key("brain-alpha", "d/r-1.txt");
        let target_key = endpoint_key("brain-alpha", "d/r-2.txt");
        EngineSuggestionWrite {
            suggestion_key: suggestion_key("brain-alpha", &source_key, &target_key, "revision"),
            source_key,
            target_key,
            relation_type: "revision".to_string(),
            rule_name: NUMBERED_SIBLING_RULE_ID.to_string(),
            rule_version: RULE_VERSION.to_string(),
            explanation_fr: RULE_CATALOG[1].explanation_fr.to_string(),
            explanation_en: RULE_CATALOG[1].explanation_en.to_string(),
            signals_json: "{\"sameParent\":true}".to_string(),
        }
    }

    fn engine_snapshot() -> EngineSnapshot {
        EngineSnapshot {
            run_id: "run-1".to_string(),
            map_digest: "map-1".to_string(),
            content_generation_id: Some("generation-1".to_string()),
            engine_version: ENGINE_VERSION.to_string(),
            run_unix_ms: 1,
        }
    }

    #[test]
    fn reconciliation_is_idempotent_and_owned_by_the_engine() {
        let mut store = RelationStore::in_memory().unwrap();
        let first = store
            .reconcile_engine_outputs(&[relation_write()], &[suggestion_write()], &engine_snapshot())
            .unwrap();
        let second = store
            .reconcile_engine_outputs(&[relation_write()], &[suggestion_write()], &engine_snapshot())
            .unwrap();
        assert_eq!(first.deterministic_relations_produced, 1);
        assert_eq!(second.suggestions_produced, 1);
        assert_eq!(
            store
                .deterministic()
                .unwrap()
                .iter()
                .filter(|relation| relation.producer == super::super::relations::CORE_RULE_ENGINE_PRODUCER)
                .count(),
            1
        );
        assert_eq!(store.pending_suggestions().unwrap().len(), 1);
        assert_eq!(store.engine_snapshot().unwrap(), Some(engine_snapshot()));
    }

    #[test]
    fn approved_core_suggestion_is_preserved_and_never_recreated_pending() {
        let mut store = RelationStore::in_memory().unwrap();
        let suggestion = suggestion_write();
        store
            .reconcile_engine_outputs(&[], std::slice::from_ref(&suggestion), &engine_snapshot())
            .unwrap();
        store.approve(&suggestion.suggestion_key).unwrap();
        let result = store
            .reconcile_engine_outputs(&[], &[suggestion], &engine_snapshot())
            .unwrap();
        assert_eq!(result.approved_suggestion_preservations, 1);
        assert!(store.pending_suggestions().unwrap().is_empty());
        assert_eq!(store.approved().unwrap().len(), 1);
        assert_eq!(store.approved().unwrap()[0].provenance.as_str(), "APPROVED");
    }

    #[test]
    fn established_collision_suppresses_a_core_suggestion_without_touching_legacy() {
        let mut store = RelationStore::in_memory().unwrap();
        let suggestion = suggestion_write();
        store
            .insert_established(
                "DETERMINISTIC",
                &suggestion.source_key,
                &suggestion.target_key,
                "revision",
                Some("legacy"),
                Some("v1"),
                None,
            )
            .unwrap();
        let result = store
            .reconcile_engine_outputs(&[], &[suggestion], &engine_snapshot())
            .unwrap();
        assert_eq!(result.established_collision_suppressions, 1);
        assert!(store.pending_suggestions().unwrap().is_empty());
        assert_eq!(store.deterministic().unwrap().len(), 1);
        assert_eq!(store.deterministic().unwrap()[0].producer, super::super::relations::LEGACY_PRODUCER);
    }

    // -----------------------------------------------------------------------
    // `TASK-0025` / `F-045` — the memory of a refusal, in the reconciliation
    // -----------------------------------------------------------------------

    /// `SR9` — an unchanged rerun does not repropose what a human refused.
    ///
    /// The whole point of the slice, stated as one property: same engine, same
    /// inputs, same identity, and the suggestion stays `rejected` rather than
    /// coming back `pending` for the user to refuse again.
    #[test]
    fn a_rejected_core_suggestion_is_never_recreated_pending_by_a_rerun() {
        let mut store = RelationStore::in_memory().unwrap();
        let suggestion = suggestion_write();
        store
            .reconcile_engine_outputs(&[], std::slice::from_ref(&suggestion), &engine_snapshot())
            .unwrap();
        store.reject(&suggestion.suggestion_key).unwrap();

        let result = store
            .reconcile_engine_outputs(&[], std::slice::from_ref(&suggestion), &engine_snapshot())
            .unwrap();

        assert_eq!(result.rejected_suggestion_preservations, 1);
        assert_eq!(result.suggestions_produced, 0);
        assert_eq!(result.approved_suggestion_preservations, 0);
        assert!(store.pending_suggestions().unwrap().is_empty());
        assert_eq!(
            store
                .suggestion(&suggestion.suggestion_key)
                .unwrap()
                .unwrap()
                .state,
            "rejected"
        );
        // A refusal is not a relation, in either table, however often the
        // engine reproposes the identity.
        assert!(store.established().unwrap().is_empty());

        // And it holds for every further rerun, not only the first.
        let again = store
            .reconcile_engine_outputs(&[], &[suggestion], &engine_snapshot())
            .unwrap();
        assert_eq!(again.rejected_suggestion_preservations, 1);
        assert!(store.established().unwrap().is_empty());
    }

    /// The memory survives a run that stops proposing the identity.
    ///
    /// Without this the refusal would be swept away as soon as the signal went
    /// quiet, and would come back looking brand new the next time it returned —
    /// which is precisely the loop `F-045` exists to break.
    #[test]
    fn a_refusal_outlives_a_run_that_does_not_repropose_it() {
        let mut store = RelationStore::in_memory().unwrap();
        let suggestion = suggestion_write();
        store
            .reconcile_engine_outputs(&[], std::slice::from_ref(&suggestion), &engine_snapshot())
            .unwrap();
        store.reject(&suggestion.suggestion_key).unwrap();

        // A run that proposes nothing at all: the pending sweep must not take
        // the rejected row with it.
        let silent = store.reconcile_engine_outputs(&[], &[], &engine_snapshot()).unwrap();
        assert_eq!(silent.rejected_suggestion_preservations, 0);
        assert_eq!(
            store
                .suggestion(&suggestion.suggestion_key)
                .unwrap()
                .unwrap()
                .state,
            "rejected",
            "the memory was swept away with the pending rows"
        );

        // When the identity comes back, the memory is still there to refuse it.
        let returned = store
            .reconcile_engine_outputs(&[], &[suggestion], &engine_snapshot())
            .unwrap();
        assert_eq!(returned.rejected_suggestion_preservations, 1);
        assert_eq!(returned.suggestions_produced, 0);
        assert!(store.pending_suggestions().unwrap().is_empty());
    }

    /// `SR10` — the counters of `TASK-0024` keep their meaning beside the new
    /// one, and the three outcomes are told apart rather than pooled.
    #[test]
    fn approved_rejected_and_pending_identities_are_counted_separately() {
        let mut store = RelationStore::in_memory().unwrap();
        let approved = suggestion_write();
        let mut rejected = suggestion_write();
        let source_key = endpoint_key("brain-alpha", "d/s-1.txt");
        let target_key = endpoint_key("brain-alpha", "d/s-2.txt");
        rejected.suggestion_key =
            suggestion_key("brain-alpha", &source_key, &target_key, "revision");
        rejected.source_key = source_key;
        rejected.target_key = target_key;
        let mut pending = suggestion_write();
        let source_key = endpoint_key("brain-alpha", "d/t-1.txt");
        let target_key = endpoint_key("brain-alpha", "d/t-2.txt");
        pending.suggestion_key =
            suggestion_key("brain-alpha", &source_key, &target_key, "revision");
        pending.source_key = source_key;
        pending.target_key = target_key;

        let all = [approved.clone(), rejected.clone(), pending.clone()];
        store
            .reconcile_engine_outputs(&[], &all, &engine_snapshot())
            .unwrap();
        store.approve(&approved.suggestion_key).unwrap();
        store.reject(&rejected.suggestion_key).unwrap();

        let result = store
            .reconcile_engine_outputs(&[], &all, &engine_snapshot())
            .unwrap();
        assert_eq!(result.approved_suggestion_preservations, 1);
        assert_eq!(result.rejected_suggestion_preservations, 1);
        assert_eq!(result.suggestions_produced, 1);

        let still_pending = store.pending_suggestions().unwrap();
        assert_eq!(still_pending.len(), 1);
        assert_eq!(still_pending[0].suggestion_key, pending.suggestion_key);
        // Exactly one relation, and it belongs to the approval alone.
        let established = store.established().unwrap();
        assert_eq!(established.len(), 1);
        assert_eq!(
            established[0].suggestion_key.as_deref(),
            Some(approved.suggestion_key.as_str())
        );
    }

    /// `SR12` — a refusal in one brain says nothing about another.
    ///
    /// Two brains, two stores, and the same rule on the same relative paths:
    /// the keys differ because the brain is inside them, so neither store can
    /// even name the other's decision.
    #[test]
    fn a_refusal_in_one_brain_leaves_another_brains_identical_suggestion_pending() {
        let for_brain = |brain_id: &str| {
            let source_key = endpoint_key(brain_id, "d/r-1.txt");
            let target_key = endpoint_key(brain_id, "d/r-2.txt");
            EngineSuggestionWrite {
                suggestion_key: suggestion_key(brain_id, &source_key, &target_key, "revision"),
                source_key,
                target_key,
                relation_type: "revision".to_string(),
                rule_name: NUMBERED_SIBLING_RULE_ID.to_string(),
                rule_version: RULE_VERSION.to_string(),
                explanation_fr: RULE_CATALOG[1].explanation_fr.to_string(),
                explanation_en: RULE_CATALOG[1].explanation_en.to_string(),
                signals_json: "{\"sameParent\":true}".to_string(),
            }
        };
        let alpha_suggestion = for_brain("brain-alpha");
        let gamma_suggestion = for_brain("brain-gamma");
        assert_ne!(
            alpha_suggestion.suggestion_key, gamma_suggestion.suggestion_key,
            "the key space must be the brain"
        );

        let mut alpha = RelationStore::in_memory().unwrap();
        let mut gamma = RelationStore::in_memory().unwrap();
        alpha
            .reconcile_engine_outputs(
                &[],
                std::slice::from_ref(&alpha_suggestion),
                &engine_snapshot(),
            )
            .unwrap();
        gamma
            .reconcile_engine_outputs(
                &[],
                std::slice::from_ref(&gamma_suggestion),
                &engine_snapshot(),
            )
            .unwrap();

        alpha.reject(&alpha_suggestion.suggestion_key).unwrap();

        assert!(alpha.pending_suggestions().unwrap().is_empty());
        assert_eq!(gamma.pending_suggestions().unwrap().len(), 1);
        assert_eq!(
            gamma
                .suggestion(&gamma_suggestion.suggestion_key)
                .unwrap()
                .unwrap()
                .state,
            "pending"
        );
        // Gamma cannot even see the decision Alpha recorded.
        assert!(
            gamma
                .suggestion(&alpha_suggestion.suggestion_key)
                .unwrap()
                .is_none()
        );

        // And Gamma's own rerun still offers it, because nobody refused it here.
        let rerun = gamma
            .reconcile_engine_outputs(&[], &[gamma_suggestion], &engine_snapshot())
            .unwrap();
        assert_eq!(rerun.rejected_suggestion_preservations, 0);
        assert_eq!(gamma.pending_suggestions().unwrap().len(), 1);
    }
}
