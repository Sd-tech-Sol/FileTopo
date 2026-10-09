//! `TASK-0057` / `DEC-0053`: the core relation surface on a `REAL_ROOT`.
//!
//! `TASK-0056` found that `map_relations_open`, `map_relations_for_node` and
//! `map_relations_review_queue` all refused a folder the person chose, because
//! each one resolved its source through `BrainRecord::source_fixture()`. Since
//! `DEC-0033` A a real root is the **only** way a person's own tree enters
//! FileTopo, so `P-04`, `P-05` and `P-07` were unreachable for their own data.
//!
//! Every tree in this file is created by the test that reads it, in a
//! `tempfile` directory, and destroyed with it. **No personal folder, no real
//! data** — `AGENTS.md`. The scanner, the hasher, the engine and SQLite are the
//! real ones; nothing here is a stub.
//!
//! The six same-brain actions are proved **in one campaign**, in the order a
//! person would meet them, because what `DEC-0053` F asks is that a decision on
//! a real root behave exactly like the same decision on a synthetic one — and
//! that is a sequence, not six independent facts.

use super::*;
// This module is compiled inside `commands`, so `super` *is* the command
// surface, named here for what it is: the product's own doors.
use super as commands;
use crate::map::relations::{RelationStore, SEEDED_SUGGESTIONS, endpoint_key};
use crate::map::{content_signals, relation_commands, rule_engine};
use std::collections::BTreeMap;
use std::fs;

/// A sandbox and a catalogue, laid out as production lays them out.
///
/// The state root is a *sibling* of the registered tree, never its ancestor:
/// `DEC-0033` G refuses those, and `RR8` already proves it.
fn sandbox() -> (tempfile::TempDir, SandboxPaths) {
    let temp = tempfile::tempdir().unwrap();
    let paths = SandboxPaths::under(temp.path().join("filetopo-state"));
    (temp, paths)
}

/// A real tree carrying exactly the inputs the **existing** core rules read.
///
/// Nothing here is a proof-only rule and nothing is seeded into the store:
/// the relations this test reads are produced by `dre-v1` from the bytes and
/// the names below, which is what `TASK-0057` §6 asks for.
///
/// * `rapports/original.txt` and `rapports/copie.txt` hold the **same
///   non-empty bytes** → one deterministic `content-identical` relation,
///   `n - 1` edges for a group of two.
/// * `versions/note-1.txt`, `-2`, `-3` are consecutive numbered siblings with
///   **different** bytes → two `revision` suggestions, so one can be approved
///   and another rejected independently.
/// * `lisez-moi.md` is a lone file: it belongs to no group and must appear in
///   no relation.
fn make_relation_tree(root: &Path) {
    fs::create_dir_all(root.join("rapports")).unwrap();
    fs::create_dir_all(root.join("versions")).unwrap();
    let shared = b"rapport synthetique: le meme contenu dans deux fichiers\n";
    fs::write(root.join("rapports/original.txt"), shared).unwrap();
    fs::write(root.join("rapports/copie.txt"), shared).unwrap();
    fs::write(root.join("versions/note-1.txt"), b"premiere version\n").unwrap();
    fs::write(root.join("versions/note-2.txt"), b"deuxieme version\n").unwrap();
    fs::write(root.join("versions/note-3.txt"), b"troisieme version\n").unwrap();
    fs::write(root.join("lisez-moi.md"), b"# dossier synthetique\n").unwrap();
}

/// Registers a tree the way the product does, minus the native dialogue.
fn register(paths: &SandboxPaths, root: &Path) -> BrainRecord {
    commands::register_real_root(paths, root).expect("registered")
}

/// Everything under `root`, with what a read-only pipeline must not change.
///
/// `atime` is deliberately absent: reading a file is allowed to move it, and
/// `TASK-0032` §6 rules it out as normative. The campaign-level immutability
/// proof is the external fingerprint of `P-22`; this is its unit-level echo.
fn inventory(root: &Path) -> BTreeMap<String, (u64, Vec<u8>)> {
    fn walk(base: &Path, at: &Path, into: &mut BTreeMap<String, (u64, Vec<u8>)>) {
        let mut entries = fs::read_dir(at)
            .unwrap()
            .map(|entry| entry.unwrap())
            .collect::<Vec<_>>();
        entries.sort_by_key(std::fs::DirEntry::file_name);
        for entry in entries {
            let path = entry.path();
            let relative = path
                .strip_prefix(base)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/");
            let metadata = fs::symlink_metadata(&path).unwrap();
            if metadata.is_dir() {
                into.insert(relative, (0, Vec::new()));
                walk(base, &path, into);
            } else {
                into.insert(relative, (metadata.len(), fs::read(&path).unwrap()));
            }
        }
    }
    let mut all = BTreeMap::new();
    walk(root, root, &mut all);
    all
}

/// A brain on a real folder, indexed, observed and evaluated — through the
/// product's own commands, in the order the interface calls them.
struct Prepared {
    /// Held, never read: dropping it deletes the sandbox and the tree. Naming
    /// it `_temp` is what says the value is a guard rather than data.
    _temp: tempfile::TempDir,
    paths: SandboxPaths,
    root: PathBuf,
    brain: BrainRecord,
}

fn prepare(name: &str) -> Prepared {
    let (temp, paths) = sandbox();
    let root = temp.path().join(name);
    fs::create_dir(&root).unwrap();
    make_relation_tree(&root);
    let brain = register(&paths, &root);
    commands::refresh_map(&paths, &brain).expect("indexed");

    // The deterministic rule needs a content observation campaign; the product
    // command is the one used, and it resolves the root through `BrainSource`.
    let observation = content_signals::observe_content(&paths, &brain).expect("observed");
    assert!(
        observation.hashed_count >= 6,
        "the campaign must have hashed the whole tree: {observation:?}"
    );

    let report = rule_engine::run(&paths, &brain).expect("engine ran on a real root");
    assert_eq!(
        report.deterministic_relations_produced, 1,
        "one `n - 1` edge for the identical pair: {report:?}"
    );
    assert_eq!(
        report.suggestions_produced, 2,
        "two consecutive numbered siblings: {report:?}"
    );
    assert!(
        report.rules_skipped.is_empty(),
        "both core rules had their signals: {:?}",
        report.rules_skipped
    );
    assert!(report.source_read_only_confirmed);

    Prepared {
        _temp: temp,
        paths,
        root,
        brain,
    }
}

/// An oracle that does not go through the command under test.
///
/// `P-05` asks for exact counts, and a count is only a measurement if it is
/// compared with something read another way. This opens the brain's store
/// directly and counts rows, so a bug in `node_relations`' two queries cannot
/// hide behind the number `node_relations` itself returns.
fn store_counts(paths: &SandboxPaths, brain: &BrainRecord, key: &str) -> (usize, usize) {
    let store = RelationStore::open(&paths.brain_relations_database(&brain.brain_id)).unwrap();
    (
        store.outgoing(key).unwrap().len(),
        store.incoming(key).unwrap().len(),
    )
}

// ---------------------------------------------------------------------------
// The six same-brain actions, in one campaign — `TASK-0057` §4
// ---------------------------------------------------------------------------

#[test]
fn the_six_same_brain_relation_actions_answer_on_a_real_root() {
    let fixture = prepare("racine-six-actions");
    let Prepared {
        ref paths,
        ref brain,
        ref root,
        ..
    } = fixture;
    let before = inventory(root);
    assert!(!before.is_empty());

    // 1. open ---------------------------------------------------------------
    let opened = relation_commands::open_relations(paths, brain).expect("open on a real root");
    assert_eq!(opened.brain_id, brain.brain_id);
    assert_eq!(
        opened.fixture_id, None,
        "`DEC-0053` D: a real root carries no fixture id, and no surrogate of its path"
    );
    assert!(
        !opened.legacy_in_scope,
        "`DEC-0053` B: the legacy TASK-0017 perimeter never covers a real root"
    );
    assert_eq!(opened.seeded, 0, "no legacy seed on a real root");
    assert!(opened.engine_current);
    assert_eq!(opened.deterministic_count, 1);
    assert_eq!(opened.approved_count, 0);
    assert_eq!(opened.pending_suggestion_count, 2);
    assert!(
        opened.unresolved_endpoints.is_empty(),
        "every endpoint resolves against the real index: {:?}",
        opened.unresolved_endpoints
    );
    assert!(
        !opened
            .pending_suggestions
            .iter()
            .any(|suggestion| SEEDED_SUGGESTIONS
                .iter()
                .any(|seeded| seeded.key == suggestion.suggestion_key)),
        "a frozen TASK-0017 suggestion appeared on a real root"
    );

    // `P-04`: an established relation exposes its type and its provenance, and
    // the provenance is one of exactly two values.
    let deterministic = opened
        .established
        .iter()
        .find(|edge| edge.provenance == "DETERMINISTIC")
        .expect("the deterministic relation is established");
    assert_eq!(deterministic.relation_type, "content-identical");
    assert_eq!(
        deterministic.rule_name.as_deref(),
        Some(rule_engine::IDENTICAL_CONTENT_RULE_ID),
        "`P-04`: the rule that produced it is consultable"
    );
    assert!(deterministic.rule_version.as_deref().is_some_and(|version| !version.is_empty()));
    assert!(
        deterministic.observed_hash.is_some() && deterministic.content_generation_id.is_some(),
        "the deterministic relation names the campaign it was read from"
    );
    for edge in &opened.established {
        assert!(
            matches!(edge.provenance.as_str(), "DETERMINISTIC" | "APPROVED"),
            "`P-04`: `{}` is not a provenance",
            edge.provenance
        );
        assert!(edge.source.node_id.is_some() && edge.target.node_id.is_some());
    }

    // `overview.rules` is the **legacy** `TASK-0017` rule list, not the core
    // engine's catalogue — unchanged by `TASK-0057`, which adds no rule and
    // redesigns no DTO. What it must say on a real root is that neither legacy
    // producer produced anything; `P-04`'s rule and version travel on the edge
    // itself, asserted above.
    let produced = opened
        .rules
        .iter()
        .map(|rule| (rule.name.clone(), rule.produced))
        .collect::<BTreeMap<_, _>>();
    assert_eq!(
        produced,
        BTreeMap::from([
            ("homonymes".to_string(), 0),
            ("suites-numerotees".to_string(), 0)
        ]),
        "a legacy producer reported output on a real root"
    );

    // 2. node relations ----------------------------------------------------
    let anchor_key = endpoint_key(&brain.brain_id, "rapports/copie.txt");
    let member_key = endpoint_key(&brain.brain_id, "rapports/original.txt");
    // The anchor of an identical-content group is its first path in order, so
    // the edge runs `copie.txt` → `original.txt`.
    assert_eq!(deterministic.source.key, anchor_key);
    assert_eq!(deterministic.target.key, member_key);

    let anchor_id = deterministic.source.node_id.expect("resolved");
    let member_id = deterministic.target.node_id.expect("resolved");

    let anchor_view = relation_commands::node_relations(
        paths,
        brain,
        &BrainNodeRef::new(&brain.brain_id, anchor_id),
    )
    .expect("node relations on a real root");
    assert_eq!(anchor_view.fixture_id, None);
    assert_eq!(anchor_view.relative_path, "rapports/copie.txt");
    assert_eq!(anchor_view.outgoing_count, 1);
    assert_eq!(anchor_view.incoming_count, 0);
    assert_eq!(
        (anchor_view.outgoing_count, anchor_view.incoming_count),
        store_counts(paths, brain, &anchor_key),
        "`P-05`: the counts agree with an independent read of the store"
    );
    assert_eq!(anchor_view.outgoing[0].direction, "outgoing");
    assert_eq!(anchor_view.outgoing[0].provenance, "DETERMINISTIC");
    assert_eq!(anchor_view.outgoing[0].other.key, member_key);

    let member_view = relation_commands::node_relations(
        paths,
        brain,
        &BrainNodeRef::new(&brain.brain_id, member_id),
    )
    .expect("node relations on a real root");
    assert_eq!(member_view.outgoing_count, 0);
    assert_eq!(member_view.incoming_count, 1);
    assert_eq!(
        (member_view.outgoing_count, member_view.incoming_count),
        store_counts(paths, brain, &member_key),
        "`P-05`: incoming and outgoing are two separate queries, not one derived from the other"
    );
    assert_eq!(member_view.incoming[0].direction, "incoming");

    // `P-04` and `P-07`: a pending suggestion is visible, distinct, and counted
    // in neither direction.
    let numbered = endpoint_key(&brain.brain_id, "versions/note-2.txt");
    let numbered_id = opened
        .pending_suggestions
        .iter()
        .find_map(|suggestion| {
            (suggestion.source.key == numbered)
                .then_some(suggestion.source.node_id)
                .flatten()
        })
        .expect("note-2 is an endpoint of a suggestion");
    let numbered_view = relation_commands::node_relations(
        paths,
        brain,
        &BrainNodeRef::new(&brain.brain_id, numbered_id),
    )
    .expect("node relations");
    assert_eq!(
        (numbered_view.outgoing_count, numbered_view.incoming_count),
        (0, 0),
        "a pending suggestion is not a relation and must not be counted"
    );
    assert_eq!(
        numbered_view.suggestions.len(),
        2,
        "note-2 is the target of 1→2 and the source of 2→3"
    );
    for suggestion in &numbered_view.suggestions {
        assert_eq!(suggestion.state, "pending");
        assert_eq!(
            suggestion.rule_name.as_deref(),
            Some(rule_engine::NUMBERED_SIBLING_RULE_ID)
        );
    }

    // A file in no group appears in no relation.
    let lone_key = endpoint_key(&brain.brain_id, "lisez-moi.md");
    assert_eq!(store_counts(paths, brain, &lone_key), (0, 0));

    // 3. review queue ------------------------------------------------------
    let queue = relation_commands::review_queue(paths, brain, 0, 50)
        .expect("review queue on a real root");
    assert_eq!(queue.fixture_id, None);
    assert_eq!(queue.total_pending, 2);
    assert_eq!(queue.returned, 2);
    assert!(!queue.has_more);
    assert!(queue.engine_current);
    assert_eq!(queue.order, "suggestion_key ascending");
    let mut keys = queue
        .items
        .iter()
        .map(|item| item.suggestion_key.clone())
        .collect::<Vec<_>>();
    assert_eq!(
        {
            let mut sorted = keys.clone();
            sorted.sort();
            sorted
        },
        keys,
        "the queue's order is the one it publishes"
    );
    keys.sort();
    let (first, second) = (keys[0].clone(), keys[1].clone());

    // 4. approve -----------------------------------------------------------
    let approved = relation_commands::approve_suggestion(paths, brain, &first)
        .expect("approve on a real root");
    assert_eq!(approved.fixture_id, None);
    assert_eq!(approved.approved_count, 1, "exactly one APPROVED relation");
    assert_eq!(approved.deterministic_count, 1, "the deterministic one is untouched");
    assert_eq!(approved.pending_suggestion_count, 1);
    let approved_edge = approved
        .established
        .iter()
        .find(|edge| edge.provenance == "APPROVED")
        .expect("the approval became a relation");
    assert_eq!(approved_edge.suggestion_key.as_deref(), Some(first.as_str()));
    assert!(
        approved_edge.rule_name.is_none(),
        "`P-04`: an approved relation is not a rule's output"
    );
    assert_eq!(
        relation_commands::review_queue(paths, brain, 0, 50).unwrap().total_pending,
        1,
        "an approved suggestion leaves the queue"
    );
    // `P-07`: the approved relation is readable from its own endpoint, with its
    // direction and its provenance.
    let approved_source_id = approved_edge.source.node_id.expect("resolved");
    let after_approval = relation_commands::node_relations(
        paths,
        brain,
        &BrainNodeRef::new(&brain.brain_id, approved_source_id),
    )
    .unwrap();
    assert!(
        after_approval
            .outgoing
            .iter()
            .any(|entry| entry.provenance == "APPROVED"
                && entry.suggestion_key.as_deref() == Some(first.as_str())),
        "the approved relation is on its source node, outgoing"
    );
    assert_eq!(
        (after_approval.outgoing_count, after_approval.incoming_count),
        store_counts(paths, brain, &approved_edge.source.key),
    );

    // 5. revoke ------------------------------------------------------------
    let revoked = relation_commands::revoke_relation(paths, brain, "APPROVED", &first)
        .expect("revoke on a real root");
    assert_eq!(revoked.approved_count, 0, "the approval is taken back");
    assert_eq!(revoked.deterministic_count, 1);
    assert_eq!(
        revoked.pending_suggestion_count, 2,
        "`DEC-0053` F: a revoked suggestion returns pending"
    );
    assert!(
        revoked
            .pending_suggestions
            .iter()
            .any(|suggestion| suggestion.suggestion_key == first),
        "and it is the one that was revoked"
    );

    // A deterministic relation is refused by name, on a real root as anywhere.
    let refused = relation_commands::revoke_relation(paths, brain, "DETERMINISTIC", &first)
        .expect_err("a deterministic relation is not revocable");
    assert!(
        !refused.to_string().contains("map_source_not_synthetic"),
        "the refusal must be about the provenance, not the source kind: {refused}"
    );

    // 6. reject ------------------------------------------------------------
    let rejected = relation_commands::reject_suggestion(paths, brain, &second)
        .expect("reject on a real root");
    assert_eq!(rejected.fixture_id, None);
    assert_eq!(
        rejected.approved_count, 0,
        "a rejection creates no relation"
    );
    assert_eq!(rejected.deterministic_count, 1);
    assert_eq!(rejected.pending_suggestion_count, 1);
    assert!(
        !rejected
            .pending_suggestions
            .iter()
            .any(|suggestion| suggestion.suggestion_key == second),
        "the rejected suggestion left the pending set"
    );
    let queue_after = relation_commands::review_queue(paths, brain, 0, 50).unwrap();
    assert_eq!(queue_after.total_pending, 1);
    assert!(
        !queue_after
            .items
            .iter()
            .any(|item| item.suggestion_key == second),
        "the rejected suggestion left the queue"
    );

    // The decision is recorded, which is what stops the engine re-proposing it.
    let store = RelationStore::open(&paths.brain_relations_database(&brain.brain_id)).unwrap();
    assert_eq!(
        store.suggestion(&second).unwrap().expect("row").state,
        "rejected"
    );
    drop(store);

    // Persistence: a second engine run reconciles without losing the decision,
    // and a freshly opened overview reads the same thing.
    rule_engine::run(paths, brain).expect("second run");
    let reopened = relation_commands::open_relations(paths, brain).expect("reopened");
    assert_eq!(reopened.approved_count, 0);
    assert_eq!(reopened.deterministic_count, 1);
    assert_eq!(
        reopened.pending_suggestion_count, 1,
        "the rejection survives a new engine run"
    );

    // And none of it touched the folder.
    let after = inventory(root);
    assert_eq!(after, before, "the relation surface wrote under the source");
    assert!(
        !after.keys().any(|name| {
            let lowered = name.to_lowercase();
            lowered.contains("filetopo") || lowered.ends_with(".sqlite")
        }),
        "`I-2`: FileTopo left an artefact under the analysed root"
    );
    drop(fixture);
}

// ---------------------------------------------------------------------------
// Falsifications 1 to 6 — `TASK-0057` §12
// ---------------------------------------------------------------------------

/// The exact regression `TASK-0056` found: six refusals that must not return.
///
/// Written against the **motif** rather than against success alone, because
/// that is what failed before: each command answered
/// `map_source_not_synthetic` on a real folder. A future change that routes any
/// of the six back through a fixture-requiring helper fails here by name.
#[test]
fn no_generic_relation_action_refuses_a_real_root_for_its_source_kind() {
    let fixture = prepare("racine-falsification");
    let Prepared {
        ref paths,
        ref brain,
        ..
    } = fixture;

    let overview = relation_commands::open_relations(paths, brain).expect("open");
    let node_id = overview.established[0].source.node_id.expect("resolved");
    let suggestion = overview.pending_suggestions[0].suggestion_key.clone();

    let outcomes: Vec<(&str, Option<String>)> = vec![
        (
            "map_relations_open",
            relation_commands::open_relations(paths, brain)
                .err()
                .map(|error| error.to_string()),
        ),
        (
            "map_relations_for_node",
            relation_commands::node_relations(
                paths,
                brain,
                &BrainNodeRef::new(&brain.brain_id, node_id),
            )
            .err()
            .map(|error| error.to_string()),
        ),
        (
            "map_relations_review_queue",
            relation_commands::review_queue(paths, brain, 0, 50)
                .err()
                .map(|error| error.to_string()),
        ),
        (
            "map_relations_approve",
            relation_commands::approve_suggestion(paths, brain, &suggestion)
                .err()
                .map(|error| error.to_string()),
        ),
        (
            "map_relations_revoke",
            relation_commands::revoke_relation(paths, brain, "APPROVED", &suggestion)
                .err()
                .map(|error| error.to_string()),
        ),
        (
            "map_relations_reject",
            relation_commands::reject_suggestion(paths, brain, &suggestion)
                .err()
                .map(|error| error.to_string()),
        ),
    ];

    for (command, outcome) in &outcomes {
        assert!(
            outcome.is_none(),
            "`{command}` refused a real root: {}",
            outcome.as_deref().unwrap_or_default()
        );
    }
    drop(fixture);
}

/// Falsification 8: `fixtureId` must be `null`, not a surrogate of the path.
///
/// The field is a developer diagnostic (`DEC-0053` D). The failure this guards
/// against is the tempting one: filling it with the brain's `source_ref`, its
/// root, or a hash of either — each of which would put a path-derived value on
/// the IPC wire for every relation read.
#[test]
fn the_fixture_diagnostic_is_null_on_a_real_root_and_leaks_no_path() {
    let fixture = prepare("racine-diagnostic");
    let Prepared {
        ref paths,
        ref brain,
        ref root,
        ..
    } = fixture;

    let overview = relation_commands::open_relations(paths, brain).unwrap();
    let node_id = overview.established[0].source.node_id.unwrap();
    let node = relation_commands::node_relations(
        paths,
        brain,
        &BrainNodeRef::new(&brain.brain_id, node_id),
    )
    .unwrap();
    let queue = relation_commands::review_queue(paths, brain, 0, 50).unwrap();

    assert_eq!(overview.fixture_id, None);
    assert_eq!(node.fixture_id, None);
    assert_eq!(queue.fixture_id, None);

    // Nothing else in the serialised payloads carries the root either. The
    // three DTOs are the whole relation surface a page receives.
    let root_text = root.to_string_lossy().replace('\\', "/");
    let last = root
        .file_name()
        .expect("named")
        .to_string_lossy()
        .to_string();
    for (name, payload) in [
        ("overview", serde_json::to_string(&overview).unwrap()),
        ("node", serde_json::to_string(&node).unwrap()),
        ("queue", serde_json::to_string(&queue).unwrap()),
    ] {
        let normalised = payload.replace("\\\\", "/");
        assert!(
            !normalised.contains(&root_text),
            "`{name}` carries the absolute source path"
        );
        assert!(
            !normalised.contains(&last),
            "`{name}` carries the root's own name"
        );
        assert!(
            !normalised.contains(&brain.source_ref),
            "`{name}` carries the opaque REAL_ROOT source ref"
        );
    }
    drop(fixture);
}

/// Falsification 7, and `DEC-0053` B: the legacy demonstration stays synthetic.
///
/// Two halves, because the one that matters is easy to lose: a real root must
/// get **no** frozen `TASK-0017` seed, and the explicitly synthetic self-check
/// must still refuse it rather than be made generic by accident.
#[test]
fn the_legacy_perimeter_never_reaches_a_real_root() {
    let fixture = prepare("racine-legacy");
    let Prepared {
        ref paths,
        ref brain,
        ..
    } = fixture;

    let overview = relation_commands::open_relations(paths, brain).unwrap();
    assert!(!overview.legacy_in_scope);
    assert_eq!(overview.seeded, 0);
    let store = RelationStore::open(&paths.brain_relations_database(&brain.brain_id)).unwrap();
    for seeded in SEEDED_SUGGESTIONS {
        assert!(
            store.suggestion(seeded.key).unwrap().is_none(),
            "the frozen suggestion `{}` was seeded on a real root",
            seeded.key
        );
    }
    drop(store);

    // `map_relations_self_check` replays a frozen expectation that only
    // `quasi-empty` can satisfy. On a real root it is refused **by name**.
    let refused = relation_commands::self_check(paths, brain)
        .expect_err("the frozen self-check has no meaning on a real folder");
    assert!(
        refused.to_string().starts_with("map_source_not_synthetic"),
        "unexpected motif: {refused}"
    );
    drop(fixture);
}

// ---------------------------------------------------------------------------
// Structural regression — `TASK-0057` §9
// ---------------------------------------------------------------------------

/// The source of the relation commands, read at compile time.
const RELATION_COMMANDS_SOURCE: &str = include_str!("relation_commands.rs");

/// Returns the body of a top-level function, from its signature to the `}` in
/// the first column that closes it.
fn function_body(source: &str, signature: &str) -> String {
    let start = source
        .find(signature)
        .unwrap_or_else(|| panic!("`{signature}` is no longer in relation_commands.rs"));
    let rest = &source[start..];
    let end = rest
        .find("\n}\n")
        .unwrap_or_else(|| panic!("`{signature}` has no closing brace in the first column"));
    rest[..end].to_string()
}

/// A future generic relation action must not re-acquire a fixture requirement.
///
/// The behavioural tests above would catch it, but only while they exist and
/// only for these six names. This one states the **rule** `DEC-0053` C writes:
/// the generic paths resolve their source through `generic_source_spec`, which
/// answers `None` for a real root, and never through `source_fixture()` or
/// `ensure_in_scope()`, which refuse one. It fails at the moment the call is
/// written, with the name of the command that wrote it.
#[test]
fn no_generic_relation_action_requires_a_fixture() {
    const GENERIC: [&str; 6] = [
        "pub fn open_relations(",
        "pub fn node_relations(",
        "pub fn review_queue(",
        "pub fn approve_suggestion(",
        "pub fn revoke_relation(",
        "pub fn reject_suggestion(",
    ];

    for signature in GENERIC {
        let body = function_body(RELATION_COMMANDS_SOURCE, signature);
        for forbidden in ["source_fixture(", "ensure_in_scope("] {
            assert!(
                !body.contains(forbidden),
                "`{signature}` calls `{forbidden}`: `DEC-0053` C forbids a generic relation \
                 action from requiring a fixture, and a real root would be refused again"
            );
        }
        assert!(
            body.contains("generic_source_spec(brain)?"),
            "`{signature}` no longer resolves its source through `generic_source_spec`"
        );
    }

    // And the one command that *is* fixture-only still says so, so this test
    // cannot be satisfied by making everything generic.
    let self_check = function_body(RELATION_COMMANDS_SOURCE, "pub fn self_check(");
    assert!(
        self_check.contains("ensure_in_scope(brain)?"),
        "`self_check` must stay inside the frozen legacy perimeter — `DEC-0053` B"
    );
}
