//! `TASK-0053` — the global workspace (`DEC-0051`, `F-052`).
//!
//! Every corpus is synthetic and built by the test that reads it. The oracles
//! are independent of the code under test: the stored JSON is read back as plain
//! `serde_json::Value`, and a "stale id" is a real second Index file in which
//! the same number names another path.

use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::map::brain_index::SourceStamp;
use crate::map::brains::SourceKind;
use std::path::PathBuf;

const ALPHA: &str = "brain-alpha";
const BETA: &str = "brain-beta";
const GAMMA: &str = "brain-gamma";
const DOCS: i64 = 2;
const SUB: i64 = 3;
const FIRST_FILE: i64 = 4;

fn dto(id: i64, parent: Option<i64>, path: &str, kind: NodeKind, children: u32) -> NodeDto {
    NodeDto {
        id,
        parent_id: parent,
        name: if path.is_empty() {
            "root".into()
        } else {
            path.rsplit('/').next().unwrap().to_string()
        },
        relative_path: path.to_string(),
        kind,
        depth: if path.is_empty() {
            0
        } else {
            path.split('/').count() as u32
        },
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: children,
        seen: false,
    }
}

/// `racine` ▸ `docs/` ▸ { `sub/` ▸ 2 files, `files` files }. Same ids in every
/// brain built from it — the numeric-id trap.
fn corpus(files: usize, tag: &str) -> Vec<NodeDto> {
    let mut nodes = vec![
        dto(1, None, "", NodeKind::Root, 1),
        dto(DOCS, Some(1), "docs", NodeKind::Directory, files as u32 + 1),
        dto(SUB, Some(DOCS), "docs/sub", NodeKind::Directory, 2),
    ];
    for i in 0..files {
        nodes.push(dto(
            FIRST_FILE + i as i64,
            Some(DOCS),
            &format!("docs/{tag}-{i:03}.txt"),
            NodeKind::File,
            0,
        ));
    }
    let after = FIRST_FILE + files as i64;
    nodes.push(dto(
        after,
        Some(SUB),
        &format!("docs/sub/{tag}-x.txt"),
        NodeKind::File,
        0,
    ));
    nodes.push(dto(
        after + 1,
        Some(SUB),
        &format!("docs/sub/{tag}-y.txt"),
        NodeKind::File,
        0,
    ));
    nodes
}

fn publish(store: &mut BrainIndex, brain: &str, nodes: &[NodeDto]) {
    let identities: Vec<NodeIdentity> = nodes
        .iter()
        .map(|n| NodeIdentity {
            node_id: n.id,
            stable_key: format!("K-{}-{}", n.id, n.relative_path),
            provenance: IdentityProvenance::System,
        })
        .collect();
    store
        .replace_with_identity(
            brain,
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "workspace",
                label: "Synthetic",
            },
            nodes,
            &identities,
            &[],
            0,
        )
        .unwrap();
}

struct Fixture {
    _temp: tempfile::TempDir,
    catalog: BrainCatalog,
    dir: PathBuf,
}

impl Fixture {
    fn new() -> Self {
        let temp = tempfile::tempdir().unwrap();
        let mut catalog = BrainCatalog::open(&temp.path().join("catalog.sqlite")).unwrap();
        catalog.seed_frozen().unwrap();
        let dir = temp.path().to_path_buf();
        Self {
            _temp: temp,
            catalog,
            dir,
        }
    }

    fn index_path(&self, brain: &str) -> PathBuf {
        self.dir.join(format!("{brain}.index.sqlite"))
    }

    /// Builds (or rebuilds in place: same `index_id`, next revision) one brain's Index.
    fn build(&self, brain: &str, nodes: &[NodeDto]) -> BrainIndex {
        let mut store = BrainIndex::open(&self.index_path(brain)).unwrap();
        publish(&mut store, brain, nodes);
        store
    }

    /// Deletes the file and builds it again: a different `index_id`.
    fn recreate(&self, brain: &str, nodes: &[NodeDto]) -> BrainIndex {
        let path = self.index_path(brain);
        std::fs::remove_file(&path).unwrap();
        for suffix in ["-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{suffix}", path.display()));
        }
        self.build(brain, nodes)
    }

    fn generation(&self, brain: &str) -> Option<String> {
        BrainIndex::open_existing(&self.index_path(brain), false)
            .ok()
            .and_then(|store| generation_of(&store).ok())
    }

    fn bind(&self, state: &WorkspaceState) -> WorkspaceState {
        let generations = state
            .referenced_brains()
            .into_iter()
            .map(|brain| {
                let generation = self.generation(&brain);
                (brain, generation)
            })
            .collect();
        self.catalog
            .set_workspace_state(state, &generations)
            .unwrap()
    }

    fn restore(&self) -> WorkspaceRestore {
        restore(&self.catalog, |brain| {
            BrainIndex::open_existing(&self.index_path(&brain.brain_id), false).ok()
        })
        .unwrap()
    }

    fn raw(&self) -> Option<String> {
        self.catalog.meta(WORKSPACE_KEY).unwrap()
    }
}

fn view(scale: f64) -> ResumeView {
    ResumeView {
        scale,
        tx: -30.0,
        ty: 12.5,
    }
}

fn node(brain: &str, id: i64) -> BrainNodeRef {
    BrainNodeRef::new(brain, id)
}

fn composed(ids: &[&str], focused: &str) -> WorkspaceState {
    WorkspaceState {
        displayed_brain_ids: ids.iter().map(|id| id.to_string()).collect(),
        focused_brain_id: focused.to_string(),
        view: Some(view(1.75)),
        selected: Some(node(ids[0], 5)),
        legend_open: true,
        density: Density::Compact,
        motion: Motion::Reduce,
        branch_focus: None,
    }
}

fn branched() -> WorkspaceState {
    WorkspaceState {
        view: Some(view(2.5)),
        selected: Some(node(ALPHA, SUB)),
        branch_focus: Some(BranchFocusRecord {
            brain_id: ALPHA.into(),
            root_node_id: DOCS,
            collapsed_ids: vec![SUB],
            saved_view: Some(view(0.8)),
            saved_selected: Some(node(BETA, 6)),
        }),
        ..composed(&[ALPHA, BETA, GAMMA], BETA)
    }
}

fn three_brains(fixture: &Fixture) {
    for brain in [ALPHA, BETA, GAMMA] {
        fixture.build(brain, &corpus(6, brain));
    }
}

// -- P19-1: the store ----------------------------------------------------------

fn keys(value: &serde_json::Value) -> Vec<String> {
    let mut keys: Vec<String> = value.as_object().unwrap().keys().cloned().collect();
    keys.sort();
    keys
}

#[test]
fn the_dto_and_the_stored_json_carry_exactly_the_closed_keys() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let chosen = branched();
    fixture.bind(&chosen);

    let dto = serde_json::to_value(&chosen).unwrap();
    assert_eq!(
        keys(&dto),
        [
            "branchFocus",
            "density",
            "displayedBrainIds",
            "focusedBrainId",
            "legendOpen",
            "motion",
            "selected",
            "view"
        ]
    );
    assert_eq!(
        keys(&dto["branchFocus"]),
        [
            "brainId",
            "collapsedIds",
            "rootNodeId",
            "savedSelected",
            "savedView"
        ]
    );
    assert_eq!(dto["density"], "compact");
    assert_eq!(dto["motion"], "reduce");

    let text = fixture.raw().unwrap();
    let stored: serde_json::Value = serde_json::from_str(&text).unwrap();
    assert_eq!(keys(&stored), ["bindings", "state", "version"]);
    assert_eq!(stored["version"], 1);
    assert_eq!(keys(&stored["state"]), keys(&dto));
    // The generation is backend-owned: it is in the envelope, never in the DTO.
    assert!(!dto.to_string().contains("generation"));
    let bound: Vec<&str> = stored["bindings"]
        .as_array()
        .unwrap()
        .iter()
        .map(|binding| binding["brainId"].as_str().unwrap())
        .collect();
    assert_eq!(
        bound,
        [ALPHA, BETA],
        "selected + branch brain + saved selection brain, once each"
    );
    // Nothing that names, locates or identifies a document: ids and closed words.
    for forbidden in [
        "path", "Path", "name", "stable", "cursor", "ftf1", ".txt", "docs", "\\", "/",
    ] {
        assert!(!text.contains(forbidden), "`{forbidden}` in {text}");
    }
    assert!(
        text.len() < 1024,
        "the record stays small: {} bytes",
        text.len()
    );

    let extra = r#"{"displayedBrainIds":["a"],"focusedBrainId":"a","view":null,"selected":null,
        "legendOpen":false,"density":"comfortable","motion":"system","branchFocus":null,"path":"x"}"#;
    assert!(serde_json::from_str::<WorkspaceState>(extra).is_err());
    for bad in [r#""dense""#, r#""COMPACT""#, r#""force""#] {
        assert!(serde_json::from_str::<Density>(bad).is_err());
        assert!(serde_json::from_str::<Motion>(bad).is_err());
    }
}

#[test]
fn an_installation_without_a_record_opens_on_the_active_brain_and_writes_nothing() {
    let mut fixture = Fixture::new();
    three_brains(&fixture);
    let restored = fixture.restore();
    assert_eq!(restored.workspace, WorkspaceState::defaults(ALPHA));
    assert!(restored.corrections.is_empty());
    assert!(fixture.raw().is_none(), "restoring defaults is not a write");

    fixture.catalog.set_active(GAMMA).unwrap();
    let restored = fixture.restore();
    assert_eq!(restored.workspace.displayed_brain_ids, [GAMMA]);
    assert_eq!(restored.workspace.focused_brain_id, GAMMA);
    assert!(!restored.workspace.legend_open);
    assert_eq!(restored.workspace.density, Density::Comfortable);
    assert_eq!(restored.workspace.motion, Motion::System);
}

#[test]
fn a_complete_workspace_round_trips_exactly_with_no_correction() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    for chosen in [composed(&[ALPHA, BETA, GAMMA], GAMMA), branched()] {
        fixture.bind(&chosen);
        let restored = fixture.restore();
        assert_eq!(restored.workspace, chosen);
        assert!(
            restored.corrections.is_empty(),
            "{:?}",
            restored.corrections
        );
        // Reading it again changes nothing, byte for byte.
        let before = fixture.raw();
        assert_eq!(fixture.restore().workspace, chosen);
        assert_eq!(fixture.raw(), before);
    }
}

#[test]
fn a_damaged_record_opens_on_safe_defaults_with_a_named_correction_stored_once() {
    let long = format!(
        r#"{{"version":1,"bindings":[],"state":{{"displayedBrainIds":["{}"]}}}}"#,
        "x".repeat(MAX_RECORD_BYTES)
    );
    let unknown_field = r#"{"version":1,"bindings":[],"extra":1,"state":{"displayedBrainIds":["brain-alpha"],"focusedBrainId":"brain-alpha","view":null,"selected":null,"legendOpen":true,"density":"compact","motion":"reduce","branchFocus":null}}"#.to_string();
    let future = r#"{"version":2,"bindings":[],"state":{"displayedBrainIds":["brain-alpha"],"focusedBrainId":"brain-alpha","view":null,"selected":null,"legendOpen":true,"density":"compact","motion":"reduce","branchFocus":null}}"#.to_string();
    let out_of_bounds = r#"{"version":1,"bindings":[],"state":{"displayedBrainIds":["brain-alpha"],"focusedBrainId":"brain-alpha","view":{"scale":0,"tx":0,"ty":0},"selected":null,"legendOpen":true,"density":"compact","motion":"reduce","branchFocus":null}}"#.to_string();
    for damaged in [
        "not json at all".to_string(),
        "{".to_string(),
        "null".to_string(),
        long,
        unknown_field,
        future,
        out_of_bounds,
    ] {
        let fixture = Fixture::new();
        three_brains(&fixture);
        fixture.catalog.put_meta(WORKSPACE_KEY, &damaged).unwrap();
        let restored = fixture.restore();
        assert_eq!(
            restored.corrections,
            [WorkspaceCorrection::RecordUnreadable],
            "{damaged:.60}"
        );
        assert_eq!(restored.workspace, WorkspaceState::defaults(ALPHA));
        // The correction is stored: the next start is quiet.
        let again = fixture.restore();
        assert!(again.corrections.is_empty());
        assert_eq!(again.workspace, WorkspaceState::defaults(ALPHA));
    }
}

#[test]
fn the_catalogue_refuses_to_store_what_is_not_a_workspace_and_keeps_the_previous_record() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let good = fixture.bind(&composed(&[ALPHA, BETA], ALPHA));
    let before = fixture.raw();
    let expect_refused = |mutate: &dyn Fn(&mut WorkspaceState)| {
        let mut bad = good.clone();
        mutate(&mut bad);
        let outcome = fixture.catalog.set_workspace_state(&bad, &BTreeMap::new());
        assert!(
            matches!(outcome, Err(MapError::WorkspaceRejected(_))),
            "{bad:?}"
        );
    };
    expect_refused(&|s| s.displayed_brain_ids.clear());
    expect_refused(&|s| s.displayed_brain_ids = vec![ALPHA.into(), ALPHA.into()]);
    expect_refused(&|s| s.focused_brain_id = GAMMA.into());
    expect_refused(&|s| {
        s.displayed_brain_ids = (0..=MAX_DISPLAYED_BRAINS)
            .map(|i| format!("b{i}"))
            .collect()
    });
    expect_refused(&|s| s.displayed_brain_ids = vec![String::new()]);
    expect_refused(&|s| s.view = Some(view(0.0)));
    expect_refused(&|s| s.view = Some(view(f64::NAN)));
    expect_refused(&|s| {
        s.view = Some(ResumeView {
            scale: 1.0,
            tx: 2.0e9,
            ty: 0.0,
        })
    });
    expect_refused(&|s| s.selected = Some(node(ALPHA, 0)));
    expect_refused(&|s| s.selected = Some(node(ALPHA, MAX_NODE_ID + 1)));
    expect_refused(&|s| s.selected = Some(node("", 3)));
    let branch = |mutate: &dyn Fn(&mut BranchFocusRecord)| {
        let mut b = branched().branch_focus.unwrap();
        mutate(&mut b);
        b
    };
    for b in [
        branch(&|b| b.root_node_id = 0),
        branch(&|b| b.brain_id = String::new()),
        branch(&|b| b.collapsed_ids = vec![SUB, SUB]),
        branch(&|b| b.collapsed_ids = (1..=(VIEW_BUDGET as i64 + 1)).collect()),
        branch(&|b| b.collapsed_ids = vec![-4]),
        branch(&|b| b.saved_view = Some(view(-1.0))),
        branch(&|b| b.saved_selected = Some(node(ALPHA, 0))),
    ] {
        let mut bad = branched();
        bad.branch_focus = Some(b);
        assert!(matches!(
            fixture.catalog.set_workspace_state(&bad, &BTreeMap::new()),
            Err(MapError::WorkspaceRejected(_))
        ));
    }
    assert_eq!(
        fixture.raw(),
        before,
        "a refusal leaves the previous record as it was"
    );
}

#[test]
fn a_large_but_legal_branch_fits_the_record_bound() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = branched();
    state.branch_focus.as_mut().unwrap().collapsed_ids = (1..=VIEW_BUDGET as i64)
        .map(|id| MAX_NODE_ID - id)
        .collect();
    fixture
        .catalog
        .set_workspace_state(&state, &BTreeMap::new())
        .unwrap();
    assert!(fixture.raw().unwrap().len() <= MAX_RECORD_BYTES);
}

// -- P19-2: the composition ----------------------------------------------------

#[test]
fn one_two_and_three_brains_come_back_in_catalogue_order_with_their_focus() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    for (ids, focus) in [
        (vec![BETA], BETA),
        (vec![ALPHA, GAMMA], GAMMA),
        (vec![ALPHA, BETA, GAMMA], BETA),
    ] {
        let mut state = composed(&ids, focus);
        state.selected = Some(node(focus, 4));
        fixture.bind(&state);
        let restored = fixture.restore();
        assert_eq!(restored.workspace, state);
        assert!(restored.corrections.is_empty());
    }
    // Stored out of order (a hand-edited or old record): the catalogue's order wins,
    // and re-ordering is not a loss, so it is not a correction.
    let mut shuffled = composed(&[GAMMA, ALPHA, BETA], GAMMA);
    shuffled.selected = None;
    fixture.bind(&shuffled);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.displayed_brain_ids, [ALPHA, BETA, GAMMA]);
    assert_eq!(restored.workspace.focused_brain_id, GAMMA);
    assert!(restored.corrections.is_empty());
}

#[test]
fn a_brain_that_left_the_catalogue_is_named_and_the_others_stay() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = composed(&[ALPHA, BETA, GAMMA], BETA);
    state.displayed_brain_ids = vec![
        ALPHA.into(),
        "brain-ghost".into(),
        GAMMA.into(),
        BETA.into(),
    ];
    state.selected = Some(node(GAMMA, 5));
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.displayed_brain_ids, [ALPHA, BETA, GAMMA]);
    assert_eq!(restored.workspace.focused_brain_id, BETA);
    assert_eq!(restored.workspace.selected, Some(node(GAMMA, 5)));
    // The camera belonged to the 4-brain composition that no longer exists.
    assert_eq!(restored.workspace.view, None);
    assert_eq!(
        restored.corrections,
        [
            WorkspaceCorrection::BrainMissing,
            WorkspaceCorrection::ViewCompositionChanged
        ]
    );
    assert!(fixture.restore().corrections.is_empty(), "stored once");
}

#[test]
fn a_missing_focused_brain_falls_back_with_a_declared_correction() {
    let mut fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = composed(&[ALPHA, BETA, GAMMA], GAMMA);
    state.displayed_brain_ids = vec![BETA.into(), "brain-ghost".into()];
    state.focused_brain_id = "brain-ghost".into();
    state.selected = None;
    fixture
        .catalog
        .set_workspace_state(&state, &BTreeMap::new())
        .unwrap();
    let restored = fixture.restore();
    assert_eq!(restored.workspace.displayed_brain_ids, [BETA]);
    assert_eq!(restored.workspace.focused_brain_id, BETA);
    assert_eq!(
        restored.corrections,
        [
            WorkspaceCorrection::BrainMissing,
            WorkspaceCorrection::FocusedBrainMissing,
            WorkspaceCorrection::ViewCompositionChanged
        ]
    );

    // No remembered brain is left: the active brain, alone, declared.
    let mut gone = composed(&[ALPHA], ALPHA);
    gone.displayed_brain_ids = vec!["brain-ghost".into()];
    gone.focused_brain_id = "brain-ghost".into();
    gone.selected = None;
    fixture.catalog.set_active(GAMMA).unwrap();
    fixture
        .catalog
        .set_workspace_state(&gone, &BTreeMap::new())
        .unwrap();
    let restored = fixture.restore();
    assert_eq!(restored.workspace.displayed_brain_ids, [GAMMA]);
    assert_eq!(restored.workspace.focused_brain_id, GAMMA);
    assert!(
        restored
            .corrections
            .contains(&WorkspaceCorrection::CompositionFallback)
    );
    // The preferences are not part of a correction: they survive it.
    assert!(restored.workspace.legend_open);
    assert_eq!(restored.workspace.density, Density::Compact);
    assert_eq!(restored.workspace.motion, Motion::Reduce);
}

#[test]
fn a_selection_outside_the_composition_or_gone_from_the_index_is_dropped_and_named() {
    let fixture = Fixture::new();
    three_brains(&fixture);

    let mut state = composed(&[ALPHA, BETA], ALPHA);
    state.selected = Some(node(GAMMA, 5));
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.selected, None);
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::SelectionBrainNotDisplayed]
    );
    assert_eq!(
        restored.workspace.view, state.view,
        "the camera is still the composition's"
    );

    let mut state = composed(&[ALPHA, BETA], ALPHA);
    state.selected = Some(node(BETA, 9_999));
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.selected, None);
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::SelectionMissing]
    );
    assert!(fixture.restore().corrections.is_empty());
}

// -- P19-3: a node id never outlives its Index generation ------------------------

#[test]
fn a_number_reused_by_a_new_index_never_selects_the_new_object() {
    let fixture = Fixture::new();
    fixture.build(ALPHA, &corpus(6, "old"));
    let old_store = BrainIndex::open_existing(&fixture.index_path(ALPHA), false).unwrap();
    let old_path = old_store.index.node(5).unwrap().unwrap().relative_path;
    drop(old_store);

    let mut state = composed(&[ALPHA, BETA], ALPHA);
    state.selected = Some(node(ALPHA, 5));
    fixture.build(BETA, &corpus(6, "beta"));
    fixture.bind(&state);

    // A different file, a different `index_id`, the SAME number 5 for another path.
    let new_store = fixture.recreate(ALPHA, &corpus(6, "new"));
    let new_path = new_store.index.node(5).unwrap().unwrap().relative_path;
    assert_ne!(old_path, new_path, "the numeric-id trap must be real");
    assert!(
        new_store.index.node(5).unwrap().is_some(),
        "and the number must exist"
    );
    drop(new_store);

    let restored = fixture.restore();
    assert_eq!(
        restored.workspace.selected, None,
        "the old 5 must not become the new 5"
    );
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::SelectionGenerationChanged]
    );
    // Everything that is not a node reference is kept.
    assert_eq!(restored.workspace.displayed_brain_ids, [ALPHA, BETA]);
    assert_eq!(restored.workspace.view, state.view);
    assert!(restored.workspace.legend_open);
    assert!(fixture.restore().corrections.is_empty());
}

#[test]
fn a_rebuild_in_place_advances_the_generation_and_drops_every_reference() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let chosen = branched();
    fixture.bind(&chosen);
    let before = fixture.generation(ALPHA).unwrap();
    // Same file, same `index_id`, next revision: what Reconstruire does.
    fixture.build(ALPHA, &corpus(6, "rebuilt"));
    let after = fixture.generation(ALPHA).unwrap();
    assert_ne!(before, after);
    assert_eq!(
        before.split('@').next(),
        after.split('@').next(),
        "same index_id"
    );

    let restored = fixture.restore();
    assert_eq!(restored.workspace.branch_focus, None);
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::BranchGenerationChanged]
    );
    // What the branch hid is gone; what leaving it would have put back is on screen.
    assert_eq!(
        restored.workspace.view,
        chosen.branch_focus.as_ref().unwrap().saved_view
    );
    assert_eq!(restored.workspace.selected, Some(node(BETA, 6)));
    assert!(restored.workspace.legend_open);
}

#[test]
fn a_reference_written_without_a_binding_is_never_trusted() {
    // Falsification: persist a node reference without an Index binding.
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = composed(&[ALPHA, BETA], ALPHA);
    state.selected = Some(node(ALPHA, 5));
    fixture
        .catalog
        .set_workspace_state(&state, &BTreeMap::new())
        .unwrap();
    let restored = fixture.restore();
    assert_eq!(restored.workspace.selected, None);
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::SelectionGenerationChanged]
    );

    let mut branch = branched();
    branch.selected = None;
    fixture
        .catalog
        .set_workspace_state(&branch, &BTreeMap::new())
        .unwrap();
    let restored = fixture.restore();
    assert_eq!(restored.workspace.branch_focus, None);
    assert!(
        restored
            .corrections
            .contains(&WorkspaceCorrection::BranchGenerationChanged)
    );
}

#[test]
fn a_brain_without_an_index_has_no_trusted_reference() {
    let fixture = Fixture::new();
    fixture.build(ALPHA, &corpus(6, "alpha"));
    let mut state = composed(&[ALPHA, BETA], ALPHA);
    state.selected = Some(node(BETA, 5));
    fixture.bind(&state);
    assert!(fixture.generation(BETA).is_none());
    let restored = fixture.restore();
    assert_eq!(restored.workspace.selected, None);
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::SelectionGenerationChanged]
    );
    assert_eq!(
        restored.workspace.displayed_brain_ids,
        [ALPHA, BETA],
        "a brain not indexed yet stays displayed"
    );
}

// -- P19-4: branch focus ---------------------------------------------------------

#[test]
fn a_branch_focus_comes_back_whole_and_leaving_it_has_what_it_needs() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let chosen = branched();
    fixture.bind(&chosen);
    let restored = fixture.restore();
    assert!(restored.corrections.is_empty());
    let branch = restored.workspace.branch_focus.unwrap();
    assert_eq!(branch.brain_id, ALPHA);
    assert_eq!(branch.root_node_id, DOCS);
    assert_eq!(branch.collapsed_ids, [SUB]);
    assert_eq!(branch.saved_view, Some(view(0.8)));
    assert_eq!(branch.saved_selected, Some(node(BETA, 6)));
    assert_eq!(restored.workspace.view, Some(view(2.5)));
    assert_eq!(restored.workspace.selected, Some(node(ALPHA, SUB)));
    assert_eq!(restored.workspace.displayed_brain_ids, [ALPHA, BETA, GAMMA]);
    assert_eq!(restored.workspace.focused_brain_id, BETA);
}

#[test]
fn a_branch_that_cannot_come_back_is_dropped_whole_with_a_named_reason() {
    // Root gone from the Index (same generation is impossible, so the root is a file).
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = branched();
    state.branch_focus.as_mut().unwrap().root_node_id = FIRST_FILE;
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.branch_focus, None);
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::BranchRootInvalid]
    );

    let mut state = branched();
    state.branch_focus.as_mut().unwrap().root_node_id = 9_999;
    fixture.bind(&state);
    assert_eq!(
        fixture.restore().corrections,
        [WorkspaceCorrection::BranchRootInvalid]
    );

    // The branch's brain is not on screen any more.
    let mut state = branched();
    state.displayed_brain_ids = vec![BETA.into(), GAMMA.into()];
    state.view = None;
    state.selected = None;
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.branch_focus, None);
    assert!(
        restored
            .corrections
            .contains(&WorkspaceCorrection::BranchBrainNotDisplayed)
    );
}

#[test]
fn collapsed_ids_outside_the_branch_or_not_folders_are_dropped_and_named() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = branched();
    {
        let branch = state.branch_focus.as_mut().unwrap();
        branch.root_node_id = SUB;
        // DOCS is the root's ancestor (outside the subtree); a file; a missing id; the root itself.
        branch.collapsed_ids = vec![DOCS, FIRST_FILE, 9_999, SUB];
    }
    state.selected = Some(node(ALPHA, SUB));
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(
        restored.workspace.branch_focus.unwrap().collapsed_ids,
        [SUB]
    );
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::BranchCollapsedInvalid]
    );
}

#[test]
fn a_selection_outside_the_focused_branch_becomes_its_root() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = branched();
    state.selected = Some(node(ALPHA, 1)); // the brain root, above the branch
    fixture.bind(&state);
    let restored = fixture.restore();
    assert_eq!(restored.workspace.selected, Some(node(ALPHA, DOCS)));
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::BranchSelectionOutside]
    );

    let mut state = branched();
    state.selected = Some(node(BETA, 5)); // another brain
    fixture.bind(&state);
    assert_eq!(
        fixture.restore().workspace.selected,
        Some(node(ALPHA, DOCS))
    );
}

#[test]
fn a_stale_selection_to_leave_the_focus_to_is_dropped_and_named() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = branched();
    state.branch_focus.as_mut().unwrap().saved_selected = Some(node(BETA, 9_999));
    fixture.bind(&state);
    let restored = fixture.restore();
    let branch = restored.workspace.branch_focus.unwrap();
    assert_eq!(branch.saved_selected, None);
    assert_eq!(branch.saved_view, Some(view(0.8)));
    assert_eq!(
        restored.corrections,
        [WorkspaceCorrection::BranchSavedSelectionInvalid]
    );
}

#[test]
fn a_composition_that_changed_keeps_the_branch_camera_and_drops_the_composition_camera() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let mut state = branched();
    state.displayed_brain_ids = vec![
        ALPHA.into(),
        "brain-ghost".into(),
        BETA.into(),
        GAMMA.into(),
    ];
    fixture.bind(&state);
    let restored = fixture.restore();
    let branch = restored.workspace.branch_focus.unwrap();
    assert_eq!(
        restored.workspace.view,
        Some(view(2.5)),
        "the branch's own camera"
    );
    assert_eq!(
        branch.saved_view, None,
        "the old composition's camera means nothing now"
    );
    assert!(
        restored
            .corrections
            .contains(&WorkspaceCorrection::BrainMissing)
    );
    assert!(
        restored
            .corrections
            .contains(&WorkspaceCorrection::ViewCompositionChanged)
    );
}

// -- P19-12 / P19-13: isolation --------------------------------------------------

#[test]
fn the_workspace_never_touches_what_other_owners_keep() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    for brain in [ALPHA, BETA, GAMMA] {
        fixture
            .catalog
            .put_meta(
                &format!("brain_resume.v1.{brain}"),
                &format!("{{\"synthetic\":\"{brain}\"}}"),
            )
            .unwrap();
    }
    fixture
        .catalog
        .put_meta("details_panel_visible", "false")
        .unwrap();
    let snapshot = |fixture: &Fixture| -> Vec<(String, String)> {
        let connection =
            rusqlite::Connection::open(fixture._temp.path().join("catalog.sqlite")).unwrap();
        let mut statement = connection
            .prepare("SELECT key, value FROM catalog_meta WHERE key <> 'workspace.v1' ORDER BY key")
            .unwrap();
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .map(Result::unwrap)
            .collect()
    };
    let brains_before = fixture.catalog.list().unwrap();
    let meta_before = snapshot(&fixture);
    let indexes_before: Vec<_> = [ALPHA, BETA, GAMMA]
        .iter()
        .map(|brain| std::fs::read(fixture.index_path(brain)).unwrap())
        .collect();

    fixture.bind(&branched());
    fixture.build(ALPHA, &corpus(6, "rebuilt")); // forces corrections and a stored correction
    let _ = fixture.restore();
    let _ = fixture.restore();
    let mut bad = branched();
    bad.focused_brain_id = "elsewhere".into();
    assert!(
        fixture
            .catalog
            .set_workspace_state(&bad, &BTreeMap::new())
            .is_err()
    );

    assert_eq!(
        snapshot(&fixture),
        meta_before,
        "resume, panel, active brain: untouched"
    );
    assert_eq!(
        fixture.catalog.list().unwrap(),
        brains_before,
        "identities untouched"
    );
    // The two brains the workspace only *read* are byte-identical; the third was rebuilt by this test.
    for (brain, before) in [(BETA, &indexes_before[1]), (GAMMA, &indexes_before[2])] {
        assert_eq!(
            &std::fs::read(fixture.index_path(brain)).unwrap(),
            before,
            "{brain}"
        );
    }
}

#[test]
fn a_write_is_one_atomic_replacement_of_one_row() {
    let fixture = Fixture::new();
    three_brains(&fixture);
    let first = fixture.bind(&composed(&[ALPHA], ALPHA));
    let second = fixture.bind(&composed(&[ALPHA, BETA], BETA));
    assert_ne!(first, second);
    let connection =
        rusqlite::Connection::open(fixture._temp.path().join("catalog.sqlite")).unwrap();
    let rows: i64 = connection
        .query_row(
            "SELECT count(*) FROM catalog_meta WHERE key = 'workspace.v1'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(rows, 1, "one row, replaced — never a second record");
    assert_eq!(fixture.restore().workspace, second);
}
