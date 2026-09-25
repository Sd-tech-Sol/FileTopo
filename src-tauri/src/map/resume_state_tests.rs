//! `TASK-0044` — per-brain resume state (`DEC-0042`).
//!
//! Every corpus is synthetic and built by the test that reads it. The oracles
//! are independent of the code under test: the stored JSON is read back as
//! plain `serde_json::Value`, and the projection is inspected through the ids
//! it carries, not through the function that built it.

use super::*;
use crate::domain::{NodeDto, NodeKind};
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::map::brain_index::{BrainIndex, SourceStamp};
use crate::map::brains::SourceKind;
use crate::node_filter::{AvailabilityFilter, KindFilter, StateFilter};

// -- Synthetic corpus ----------------------------------------------------------

const DOCS: i64 = 2;
/// First file id; files are `3..3 + files`.
const FIRST_FILE: i64 = 3;

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

/// `racine` ▸ `docs/` ▸ `files` files. Ids are contiguous: the same shape in two
/// brains gives the **same numeric ids** in both, which is the trap to test.
fn corpus(files: usize, tag: &str) -> Vec<NodeDto> {
    let mut nodes = vec![
        dto(1, None, "", NodeKind::Root, 1),
        dto(DOCS, Some(1), "docs", NodeKind::Directory, files as u32),
    ];
    for i in 0..files {
        let id = FIRST_FILE + i as i64;
        nodes.push(dto(
            id,
            Some(DOCS),
            &format!("docs/{tag}-{i:04}.txt"),
            NodeKind::File,
            0,
        ));
    }
    nodes
}

fn identities(nodes: &[NodeDto]) -> Vec<NodeIdentity> {
    nodes
        .iter()
        .map(|n| NodeIdentity {
            node_id: n.id,
            stable_key: format!("K-{}", n.id),
            provenance: IdentityProvenance::System,
        })
        .collect()
}

fn publish(store: &mut BrainIndex, brain: &str, nodes: &[NodeDto]) {
    store
        .replace_with_identity(
            brain,
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "resume",
                label: "Synthetic",
            },
            nodes,
            &identities(nodes),
            &[],
            0,
        )
        .unwrap();
}

struct Fixture {
    _temp: tempfile::TempDir,
    catalog: BrainCatalog,
}

fn fixture() -> Fixture {
    let temp = tempfile::tempdir().unwrap();
    let mut catalog = BrainCatalog::open(&temp.path().join("catalog.sqlite")).unwrap();
    catalog.seed_frozen().unwrap();
    Fixture {
        _temp: temp,
        catalog,
    }
}

fn store_for(brain: &str, nodes: &[NodeDto]) -> (tempfile::TempDir, BrainIndex) {
    let temp = tempfile::tempdir().unwrap();
    let mut store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    publish(&mut store, brain, nodes);
    (temp, store)
}

fn files_only() -> NodeFilter {
    NodeFilter {
        state: StateFilter::All,
        kinds: vec![KindFilter::File],
        availability: AvailabilityFilter::All,
    }
}

fn state(focus: Option<i64>, selected: Option<i64>) -> ResumeState {
    ResumeState {
        focus_node_id: focus,
        selected_node_id: selected,
        view: Some(ResumeView {
            scale: 1.5,
            tx: -40.0,
            ty: 12.25,
        }),
        filter: NodeFilter::default(),
        details_panel_visible: true,
    }
}

fn record(catalog: &BrainCatalog, brain: &str) -> BrainRecord {
    catalog.require(brain).unwrap()
}

fn raw(catalog: &BrainCatalog, brain: &str) -> Option<String> {
    catalog.meta(&key_for(brain)).unwrap()
}

fn shown_ids(snapshot: &MapSnapshot) -> Vec<i64> {
    snapshot.nodes.iter().map(|node| node.id).collect()
}

// -- Shape ---------------------------------------------------------------------

#[test]
fn the_dto_and_the_stored_json_carry_exactly_the_closed_keys() {
    let fixture = fixture();
    let mut chosen = state(Some(DOCS), Some(7));
    chosen.filter = files_only();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();

    let dto = serde_json::to_value(&chosen).unwrap();
    let keys = |value: &serde_json::Value| {
        let mut keys: Vec<String> = value.as_object().unwrap().keys().cloned().collect();
        keys.sort();
        keys
    };
    assert_eq!(
        keys(&dto),
        [
            "detailsPanelVisible",
            "filter",
            "focusNodeId",
            "selectedNodeId",
            "view"
        ]
    );
    assert_eq!(keys(&dto["view"]), ["scale", "tx", "ty"]);
    assert_eq!(keys(&dto["filter"]), ["availability", "kinds", "state"]);

    let stored: serde_json::Value =
        serde_json::from_str(&raw(&fixture.catalog, "brain-alpha").unwrap()).unwrap();
    assert_eq!(keys(&stored), ["state", "version"]);
    assert_eq!(stored["version"], 1);
    assert_eq!(keys(&stored["state"]), keys(&dto));

    // Nothing that names, locates or identifies: no path, no name, no key, no
    // cursor, no page. Ids and closed words only.
    let text = raw(&fixture.catalog, "brain-alpha").unwrap();
    for forbidden in [
        "path", "Path", "name", "stable", "identity", "cursor", "ftf1", "nodes", "seen", "docs",
        "\\", "/",
    ] {
        assert!(!text.contains(forbidden), "`{forbidden}` in {text}");
    }
    assert!(
        text.len() < 400,
        "the record stays trivial: {} bytes",
        text.len()
    );

    // Unknown fields are refused by the closed types, never ignored.
    let extra = r#"{"focusNodeId":null,"selectedNodeId":null,"view":null,
        "filter":{"state":"ALL","kinds":[],"availability":"ALL"},
        "detailsPanelVisible":true,"path":"x"}"#;
    assert!(serde_json::from_str::<ResumeState>(extra).is_err());
}

// -- Storage -------------------------------------------------------------------

#[test]
fn an_absent_record_reads_as_defaults_and_writes_nothing() {
    let fixture = fixture();
    let before = raw(&fixture.catalog, "brain-alpha");
    let state = fixture.catalog.resume_state("brain-alpha").unwrap();
    assert_eq!(state, ResumeState::defaults(true));
    assert!(state.filter.is_inactive());
    assert_eq!(before, None);
    assert_eq!(
        raw(&fixture.catalog, "brain-alpha"),
        None,
        "reading stores nothing"
    );
}

#[test]
fn the_legacy_global_panel_preference_is_only_the_fallback_of_a_brain_without_a_record() {
    let fixture = fixture();
    fixture.catalog.set_details_panel_visible(false).unwrap();

    // No record yet: every brain inherits the legacy value.
    for brain in ["brain-alpha", "brain-beta", "brain-gamma"] {
        assert!(
            !fixture
                .catalog
                .resume_state(brain)
                .unwrap()
                .details_panel_visible
        );
    }

    // Beta gets its own record: from now on it is authoritative for Beta alone.
    let mut own = ResumeState::defaults(true);
    own.details_panel_visible = true;
    fixture
        .catalog
        .set_resume_state("brain-beta", &own)
        .unwrap();
    assert!(
        fixture
            .catalog
            .resume_state("brain-beta")
            .unwrap()
            .details_panel_visible
    );
    assert!(
        !fixture
            .catalog
            .resume_state("brain-alpha")
            .unwrap()
            .details_panel_visible
    );

    // The legacy key is neither deleted nor rewritten, and a later change of it
    // cannot move a brain that has a record.
    assert_eq!(
        fixture
            .catalog
            .meta("details_panel_visible")
            .unwrap()
            .as_deref(),
        Some("false")
    );
    fixture.catalog.set_details_panel_visible(true).unwrap();
    let mut hidden = own.clone();
    hidden.details_panel_visible = false;
    fixture
        .catalog
        .set_resume_state("brain-gamma", &hidden)
        .unwrap();
    fixture.catalog.set_details_panel_visible(true).unwrap();
    assert!(
        !fixture
            .catalog
            .resume_state("brain-gamma")
            .unwrap()
            .details_panel_visible
    );
    assert!(
        fixture
            .catalog
            .resume_state("brain-alpha")
            .unwrap()
            .details_panel_visible
    );
}

#[test]
fn three_brains_keep_three_independent_states_and_none_reads_another() {
    let fixture = fixture();
    let mut a = state(Some(2), Some(30));
    a.filter = files_only();
    a.details_panel_visible = false;
    let mut b = state(None, Some(12));
    b.view = Some(ResumeView {
        scale: 0.5,
        tx: 5.0,
        ty: 6.0,
    });
    let mut c = ResumeState::defaults(true);
    c.selected_node_id = Some(12); // the same numeric id as Beta's, on purpose
    for (brain, chosen) in [("brain-alpha", &a), ("brain-beta", &b), ("brain-gamma", &c)] {
        fixture.catalog.set_resume_state(brain, chosen).unwrap();
    }

    assert_eq!(fixture.catalog.resume_state("brain-alpha").unwrap(), a);
    assert_eq!(fixture.catalog.resume_state("brain-beta").unwrap(), b);
    assert_eq!(fixture.catalog.resume_state("brain-gamma").unwrap(), c);

    // Three rows, three keys; rewriting one leaves the other two byte-identical.
    let (rb, rc) = (
        raw(&fixture.catalog, "brain-beta"),
        raw(&fixture.catalog, "brain-gamma"),
    );
    a.selected_node_id = Some(31);
    fixture.catalog.set_resume_state("brain-alpha", &a).unwrap();
    assert_eq!(raw(&fixture.catalog, "brain-beta"), rb);
    assert_eq!(raw(&fixture.catalog, "brain-gamma"), rc);
}

#[test]
fn an_unknown_brain_is_an_error_for_reading_and_for_writing() {
    let fixture = fixture();
    for outcome in [
        fixture.catalog.resume_state("brain-ghost").map(|_| ()),
        fixture
            .catalog
            .set_resume_state("brain-ghost", &ResumeState::defaults(true))
            .map(|_| ()),
        fixture
            .catalog
            .stored_resume_state("brain-ghost")
            .map(|_| ()),
    ] {
        assert!(matches!(outcome, Err(MapError::UnknownBrain(name)) if name == "brain-ghost"));
    }
    assert_eq!(raw(&fixture.catalog, "brain-ghost"), None);
}

#[test]
fn every_kind_of_damaged_record_reads_as_nothing_stored() {
    let fixture = fixture();
    let legacy_hidden = |c: &BrainCatalog| c.set_details_panel_visible(false).unwrap();
    legacy_hidden(&fixture.catalog);
    let good_filter = r#"{"state":"ALL","kinds":[],"availability":"ALL"}"#;
    let good = |view: &str, filter: &str, focus: &str| {
        format!(
            r#"{{"version":1,"state":{{"focusNodeId":{focus},"selectedNodeId":null,"view":{view},"filter":{filter},"detailsPanelVisible":true}}}}"#
        )
    };
    let cases: Vec<(&str, String)> = vec![
        ("invalid json", "{not json".into()),
        ("empty", String::new()),
        ("a bare number", "42".into()),
        (
            "future version",
            good("null", good_filter, "null").replace("\"version\":1", "\"version\":2"),
        ),
        (
            "version zero",
            good("null", good_filter, "null").replace("\"version\":1", "\"version\":0"),
        ),
        (
            "unknown filter state",
            good(
                "null",
                r#"{"state":"RECENT","kinds":[],"availability":"ALL"}"#,
                "null",
            ),
        ),
        (
            "unknown kind",
            good(
                "null",
                r#"{"state":"ALL","kinds":["ROOT"],"availability":"ALL"}"#,
                "null",
            ),
        ),
        (
            "unknown availability",
            good(
                "null",
                r#"{"state":"ALL","kinds":[],"availability":"CLOUD"}"#,
                "null",
            ),
        ),
        (
            "scale out of bounds",
            good(r#"{"scale":1e30,"tx":0,"ty":0}"#, good_filter, "null"),
        ),
        (
            "scale zero",
            good(r#"{"scale":0,"tx":0,"ty":0}"#, good_filter, "null"),
        ),
        (
            "scale negative",
            good(r#"{"scale":-2,"tx":0,"ty":0}"#, good_filter, "null"),
        ),
        (
            "translation out of bounds",
            good(r#"{"scale":1,"tx":1e15,"ty":0}"#, good_filter, "null"),
        ),
        (
            "number too large to parse",
            good(r#"{"scale":1e999,"tx":0,"ty":0}"#, good_filter, "null"),
        ),
        ("view is a string", good(r#""fit""#, good_filter, "null")),
        ("negative node id", good("null", good_filter, "-4")),
        ("zero node id", good("null", good_filter, "0")),
        (
            "node id beyond the safe range",
            good("null", good_filter, "9007199254740993"),
        ),
        ("node id as a string", good("null", good_filter, r#""12""#)),
        (
            "extra key",
            good("null", good_filter, "null")
                .replace("\"version\":1", "\"version\":1,\"path\":\"x\""),
        ),
        (
            "oversized",
            format!("{}{}", good("null", good_filter, "null"), " ".repeat(4096)),
        ),
    ];
    for (label, text) in cases {
        fixture
            .catalog
            .put_meta(&key_for("brain-alpha"), &text)
            .unwrap();
        assert_eq!(
            fixture.catalog.stored_resume_state("brain-alpha").unwrap(),
            None,
            "{label}: must read as nothing stored"
        );
        // Defaults, with the legacy panel (hidden above) as the fallback.
        assert_eq!(
            fixture.catalog.resume_state("brain-alpha").unwrap(),
            ResumeState::defaults(false),
            "{label}"
        );
    }
    // And the same record, well formed, is accepted: the cases above fail for
    // their stated reason, not because the template is wrong.
    fixture
        .catalog
        .put_meta(
            &key_for("brain-alpha"),
            &good(r#"{"scale":1,"tx":2,"ty":3}"#, good_filter, "5"),
        )
        .unwrap();
    assert_eq!(
        fixture
            .catalog
            .stored_resume_state("brain-alpha")
            .unwrap()
            .unwrap()
            .focus_node_id,
        Some(5)
    );
}

#[test]
fn an_invalid_state_is_refused_on_write_and_the_previous_record_is_untouched() {
    let fixture = fixture();
    let good = state(Some(2), Some(3));
    fixture
        .catalog
        .set_resume_state("brain-alpha", &good)
        .unwrap();
    let before = raw(&fixture.catalog, "brain-alpha");

    let view = |scale: f64, tx: f64, ty: f64| Some(ResumeView { scale, tx, ty });
    let mut bad: Vec<(&str, ResumeState)> = Vec::new();
    for (label, view) in [
        ("NaN scale", view(f64::NAN, 0.0, 0.0)),
        ("infinite scale", view(f64::INFINITY, 0.0, 0.0)),
        ("NaN tx", view(1.0, f64::NAN, 0.0)),
        ("-infinity ty", view(1.0, 0.0, f64::NEG_INFINITY)),
        ("zero scale", view(0.0, 0.0, 0.0)),
        ("negative scale", view(-1.0, 0.0, 0.0)),
        ("huge scale", view(MAX_VIEW_SCALE * 2.0, 0.0, 0.0)),
        (
            "huge translation",
            view(1.0, MAX_VIEW_TRANSLATION * 2.0, 0.0),
        ),
    ] {
        let mut candidate = good.clone();
        candidate.view = view;
        bad.push((label, candidate));
    }
    for (label, id) in [
        ("zero id", 0),
        ("negative id", -3),
        ("id beyond safe range", MAX_NODE_ID + 1),
    ] {
        let mut candidate = good.clone();
        candidate.selected_node_id = Some(id);
        bad.push((label, candidate.clone()));
        candidate.selected_node_id = None;
        candidate.focus_node_id = Some(id);
        bad.push((label, candidate));
    }
    for (label, candidate) in bad {
        let outcome = fixture.catalog.set_resume_state("brain-alpha", &candidate);
        assert!(
            matches!(outcome, Err(MapError::ResumeRejected(_))),
            "{label}: {outcome:?}"
        );
        assert_eq!(
            raw(&fixture.catalog, "brain-alpha"),
            before,
            "{label}: nothing stored"
        );
    }
}

#[test]
fn a_filter_is_stored_in_its_canonical_form() {
    let fixture = fixture();
    let mut chosen = state(None, None);
    chosen.filter = NodeFilter {
        state: StateFilter::New,
        kinds: vec![
            KindFilter::Skipped,
            KindFilter::File,
            KindFilter::File,
            KindFilter::Directory,
        ],
        availability: AvailabilityFilter::OnlineOnly,
    };
    let stored = fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();
    assert_eq!(
        stored.filter.kinds,
        [KindFilter::Directory, KindFilter::File, KindFilter::Skipped]
    );
    assert_eq!(fixture.catalog.resume_state("brain-alpha").unwrap(), stored);
}

// -- The anchor primitive --------------------------------------------------------

#[test]
fn the_anchor_is_the_previous_match_in_canonical_order_and_only_for_a_match() {
    let (_temp, store) = store_for("brain-alpha", &corpus(10, "a"));
    let filter = files_only();

    // Files are 3..=12. The first has no previous match: the first page starts with it.
    let first = store
        .index
        .filter_anchor(&filter, FIRST_FILE)
        .unwrap()
        .unwrap();
    assert_eq!(first.previous_match, None);
    assert!(first.cursor(&filter).is_none());

    let sixth = store.index.filter_anchor(&filter, 8).unwrap().unwrap();
    assert_eq!(sixth.previous_match, Some(7));
    let cursor = sixth.cursor(&filter).unwrap();
    assert_eq!(cursor.after_id, 7);
    assert_eq!(cursor.revision, store.index.identity().unwrap().revision);
    assert_eq!(cursor.canonical, filter.canonical());

    // Not a match: the root, a directory when only files are wanted, an absent id.
    for id in [1, DOCS, 9999, -1, 0] {
        assert_eq!(
            store.index.filter_anchor(&filter, id).unwrap(),
            None,
            "id {id}"
        );
    }
    // The state predicate (which needs the seen watermark) runs too: a fresh
    // index has no unseen event, so nothing matches.
    let unseen = NodeFilter {
        state: StateFilter::Unseen,
        ..NodeFilter::default()
    };
    assert_eq!(store.index.filter_anchor(&unseen, 8).unwrap(), None);
}

// -- Restore: the normal view ------------------------------------------------------

#[test]
fn a_brain_with_nothing_stored_restores_the_plain_root_projection_and_stores_nothing() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(10, "a"));
    let restored = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-alpha"),
        &store,
    )
    .unwrap();
    assert_eq!(restored.resume, ResumeState::defaults(true));
    assert!(restored.corrections.is_empty());
    assert_eq!(restored.filter_cursor, None);
    assert!(restored.projection.filtered.is_none());
    assert_eq!(restored.projection.focus_id, 1);
    assert_eq!(raw(&fixture.catalog, "brain-alpha"), None);
}

#[test]
fn a_remembered_branch_and_selection_are_restored_when_the_index_still_has_them() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(10, "a"));
    fixture
        .catalog
        .set_resume_state("brain-alpha", &state(Some(DOCS), Some(7)))
        .unwrap();
    let before = raw(&fixture.catalog, "brain-alpha");
    let restored = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-alpha"),
        &store,
    )
    .unwrap();
    assert_eq!(restored.projection.focus_id, DOCS);
    assert!(shown_ids(&restored.projection).contains(&7));
    assert_eq!(restored.resume.selected_node_id, Some(7));
    assert_eq!(restored.resume.focus_node_id, Some(DOCS));
    assert_eq!(
        restored.resume.view,
        state(None, None).view,
        "the camera is passed through untouched"
    );
    assert!(restored.corrections.is_empty());
    assert_eq!(
        raw(&fixture.catalog, "brain-alpha"),
        before,
        "nothing to correct, nothing written"
    );
}

#[test]
fn a_vanished_branch_or_selection_falls_back_and_the_correction_is_stored() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(10, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");

    fixture
        .catalog
        .set_resume_state("brain-alpha", &state(Some(500), Some(600)))
        .unwrap();
    let restored = restore(&fixture.catalog, &brain, &store).unwrap();
    assert_eq!(
        restored.corrections,
        [
            ResumeCorrection::FocusMissing,
            ResumeCorrection::SelectionMissing
        ]
    );
    assert_eq!(restored.projection.focus_id, 1, "falls back to the root");
    assert_eq!(
        (
            restored.resume.focus_node_id,
            restored.resume.selected_node_id
        ),
        (None, None)
    );
    // The record itself was corrected: a second restore has nothing to say.
    let stored = fixture
        .catalog
        .stored_resume_state("brain-alpha")
        .unwrap()
        .unwrap();
    assert_eq!(
        (stored.focus_node_id, stored.selected_node_id),
        (None, None)
    );
    assert!(
        restore(&fixture.catalog, &brain, &store)
            .unwrap()
            .corrections
            .is_empty()
    );
    // The rest of the state is exactly what was stored.
    assert_eq!(stored.view, state(None, None).view);
}

#[test]
fn a_selection_that_the_remembered_branch_does_not_show_becomes_the_branch() {
    // 200 files under `docs`: the first page of `docs` shows about sixty of them.
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(200, "a"));
    let far = FIRST_FILE + 150;
    fixture
        .catalog
        .set_resume_state("brain-alpha", &state(Some(DOCS), Some(far)))
        .unwrap();
    let restored = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-alpha"),
        &store,
    )
    .unwrap();
    assert!(
        shown_ids(&restored.projection).contains(&far),
        "the selection is reachable"
    );
    assert_eq!(restored.projection.focus_id, far);
    assert_eq!(restored.resume.selected_node_id, Some(far));
    assert_eq!(restored.resume.focus_node_id, Some(far));
    assert!(
        restored.projection.materialized_count <= 64 + 2,
        "still one bounded page"
    );
}

#[test]
fn ids_that_are_numerically_equal_in_two_brains_never_cross() {
    // Alpha and Gamma share a fixture in the catalogue and have the same numeric ids.
    let fixture = fixture();
    let (_ta, store_a) = store_for("brain-alpha", &corpus(30, "alpha"));
    let (_tg, store_g) = store_for("brain-gamma", &corpus(30, "gamma"));

    fixture
        .catalog
        .set_resume_state("brain-alpha", &state(Some(DOCS), Some(12)))
        .unwrap();
    let alpha = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-alpha"),
        &store_a,
    )
    .unwrap();
    assert_eq!(alpha.resume.selected_node_id, Some(12));
    let selected_a = alpha.projection.nodes.iter().find(|n| n.id == 12).unwrap();
    assert!(selected_a.name.starts_with("alpha-"));

    // Gamma never stored anything: Alpha's `12` is not its selection.
    let gamma = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-gamma"),
        &store_g,
    )
    .unwrap();
    assert_eq!(gamma.resume.selected_node_id, None);
    assert_eq!(gamma.resume.focus_node_id, None);
    assert_eq!(raw(&fixture.catalog, "brain-gamma"), None);

    // Each brain's own `12` is validated against its own Index only.
    fixture
        .catalog
        .set_resume_state("brain-gamma", &state(None, Some(12)))
        .unwrap();
    let gamma = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-gamma"),
        &store_g,
    )
    .unwrap();
    let selected_g = gamma.projection.nodes.iter().find(|n| n.id == 12).unwrap();
    assert!(selected_g.name.starts_with("gamma-"));
    assert_eq!(gamma.projection.brain_id, "brain-gamma");
    assert_eq!(alpha.projection.brain_id, "brain-alpha");

    // A state stored for Alpha whose id only Gamma's larger Index has is refused
    // on Alpha's own Index.
    let (_ts, small) = store_for("brain-alpha", &corpus(5, "alpha"));
    fixture
        .catalog
        .set_resume_state("brain-alpha", &state(None, Some(25)))
        .unwrap();
    let alpha = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-alpha"),
        &small,
    )
    .unwrap();
    assert_eq!(alpha.corrections, [ResumeCorrection::SelectionMissing]);
    assert_eq!(alpha.resume.selected_node_id, None);
}

// -- Restore: the filter -------------------------------------------------------------

#[test]
fn a_selected_match_beyond_the_first_page_is_restored_from_the_current_index() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(200, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");
    let target = FIRST_FILE + 100;
    let mut chosen = state(None, Some(target));
    chosen.filter = files_only();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();

    let first_page = materialize_filtered_view(&store, &files_only(), None).unwrap();
    let first_matches = &first_page.filtered.as_ref().unwrap().filter_match_ids;
    assert!(
        !first_matches.contains(&target),
        "the target really is beyond page 1"
    );

    let restored = restore(&fixture.catalog, &brain, &store).unwrap();
    let page = restored
        .projection
        .filtered
        .as_ref()
        .expect("a filtered page");
    assert!(
        page.filter_match_ids.contains(&target),
        "the same node is restored"
    );
    assert_eq!(
        page.filter_match_ids.first(),
        Some(&target),
        "the page starts with it"
    );
    assert_eq!(page.filtered_total, 200);
    assert!(
        restored.projection.materialized_count <= 64 + 2,
        "one bounded page"
    );
    assert_eq!(restored.resume.selected_node_id, Some(target));
    assert!(restored.corrections.is_empty());

    // The cursor is fresh — current index and revision — and is NOT what is stored.
    let cursor = FilterCursor::decode(restored.filter_cursor.as_deref().unwrap()).unwrap();
    let identity = store.index.identity().unwrap();
    assert_eq!(
        (cursor.index_id.as_str(), cursor.revision),
        (identity.index_id.as_str(), identity.revision)
    );
    let text = raw(&fixture.catalog, "brain-alpha").unwrap();
    assert!(
        !text.contains("ftf1") && !text.contains(&identity.index_id),
        "{text}"
    );

    // The next page continues the canonical order right after this one.
    let next = FilterCursor::decode(page.filter_next_cursor.as_deref().unwrap()).unwrap();
    assert_eq!(next.after_id, *page.filter_match_ids.last().unwrap());
    assert!(next.after_id > target);
}

#[test]
fn a_first_page_match_and_the_root_need_no_cursor_and_no_correction() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(200, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");
    for selected in [Some(FIRST_FILE + 3), Some(1), None] {
        let mut chosen = state(None, selected);
        chosen.filter = files_only();
        fixture
            .catalog
            .set_resume_state("brain-alpha", &chosen)
            .unwrap();
        let restored = restore(&fixture.catalog, &brain, &store).unwrap();
        assert_eq!(restored.filter_cursor, None, "{selected:?}");
        assert!(restored.corrections.is_empty(), "{selected:?}");
        assert_eq!(restored.resume.selected_node_id, selected);
        // The page is the canonical first one, not one that starts at the selection.
        let canonical = materialize_filtered_view(&store, &files_only(), None).unwrap();
        assert_eq!(
            shown_ids(&restored.projection),
            shown_ids(&canonical),
            "{selected:?}"
        );
        if let Some(id) = selected.filter(|id| *id != 1) {
            let page = restored.projection.filtered.as_ref().unwrap();
            assert!(page.filter_match_ids.contains(&id));
            assert!(
                page.filter_match_ids.first() != Some(&id),
                "it is not moved to the top"
            );
        }
    }
}

#[test]
fn a_selection_that_no_longer_matches_falls_back_and_the_filter_stays_authoritative() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(20, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");

    // `docs` exists but is a directory: a files-only filter no longer matches it.
    let mut chosen = state(None, Some(DOCS));
    chosen.filter = files_only();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();
    let restored = restore(&fixture.catalog, &brain, &store).unwrap();
    assert_eq!(restored.corrections, [ResumeCorrection::SelectionNotAMatch]);
    assert_eq!(restored.resume.selected_node_id, None);
    assert_eq!(restored.resume.filter, files_only(), "the filter is kept");
    assert_eq!(
        restored.projection.filtered.as_ref().unwrap().filter,
        files_only()
    );
    let stored = fixture
        .catalog
        .stored_resume_state("brain-alpha")
        .unwrap()
        .unwrap();
    assert_eq!(
        (stored.selected_node_id, stored.filter),
        (None, files_only())
    );

    // An absent selection is a different word.
    chosen.selected_node_id = Some(9999);
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();
    let restored = restore(&fixture.catalog, &brain, &store).unwrap();
    assert_eq!(restored.corrections, [ResumeCorrection::SelectionMissing]);

    // A state filter (which reads the change journal) is applied to a fresh
    // index with no event: nothing is new, so the selection cannot be a match.
    let mut news = state(None, Some(FIRST_FILE));
    news.filter = NodeFilter {
        state: StateFilter::New,
        ..NodeFilter::default()
    };
    fixture
        .catalog
        .set_resume_state("brain-alpha", &news)
        .unwrap();
    let restored = restore(&fixture.catalog, &brain, &store).unwrap();
    assert_eq!(restored.corrections, [ResumeCorrection::SelectionNotAMatch]);
    assert_eq!(
        restored
            .projection
            .filtered
            .as_ref()
            .unwrap()
            .filtered_total,
        0
    );
}

#[test]
fn an_advanced_revision_restores_the_same_match_when_it_still_matches() {
    let fixture = fixture();
    let (_temp, mut store) = store_for("brain-alpha", &corpus(200, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");
    let target = FIRST_FILE + 150;
    let mut chosen = state(None, Some(target));
    chosen.filter = files_only();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();
    let before = restore(&fixture.catalog, &brain, &store).unwrap();
    let old_cursor = before.filter_cursor.clone().unwrap();
    let old_revision = store.index.identity().unwrap().revision;

    // The watcher (here: a republication) moves the revision; ids are unchanged.
    publish(&mut store, "brain-alpha", &corpus(200, "a"));
    let revision = store.index.identity().unwrap().revision;
    assert!(revision > old_revision, "the revision really advanced");

    let after = restore(&fixture.catalog, &brain, &store).unwrap();
    let page = after.projection.filtered.as_ref().unwrap();
    assert_eq!(page.filter_match_ids.first(), Some(&target));
    assert_eq!(after.projection.index_revision, revision);
    let fresh = FilterCursor::decode(after.filter_cursor.as_deref().unwrap()).unwrap();
    assert_eq!(fresh.revision, revision);
    assert_ne!(
        after.filter_cursor.as_deref(),
        Some(old_cursor.as_str()),
        "the old cursor is never reused"
    );

    // And the old cursor really would have been refused: that is why it is not stored.
    let stale = materialize_filtered_view(&store, &files_only(), Some(&old_cursor));
    assert!(matches!(
        stale,
        Err(MapError::Filter(FilterError::StaleCursor { .. }))
    ));
}

#[test]
fn a_match_removed_by_the_watcher_falls_back_without_a_stale_reference() {
    let fixture = fixture();
    let (_temp, mut store) = store_for("brain-alpha", &corpus(200, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");
    let target = FIRST_FILE + 150;
    let mut chosen = state(None, Some(target));
    chosen.filter = files_only();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();

    // The file is gone from the next revision.
    let mut trimmed = corpus(200, "a");
    trimmed.retain(|n| n.id != target);
    trimmed[1].child_count -= 1;
    publish(&mut store, "brain-alpha", &trimmed);

    let restored = restore(&fixture.catalog, &brain, &store).unwrap();
    assert_eq!(restored.corrections, [ResumeCorrection::SelectionMissing]);
    assert_eq!(restored.resume.selected_node_id, None);
    assert_eq!(restored.filter_cursor, None);
    assert_eq!(
        restored
            .projection
            .filtered
            .as_ref()
            .unwrap()
            .filtered_total,
        199
    );
    assert_eq!(
        fixture
            .catalog
            .stored_resume_state("brain-alpha")
            .unwrap()
            .unwrap()
            .selected_node_id,
        None,
        "the corrected state is what is stored"
    );
}

// -- Restore: what it never does ----------------------------------------------------

#[test]
fn restoring_an_unbuilt_index_is_the_usual_error_and_stores_nothing() {
    let fixture = fixture();
    let temp = tempfile::tempdir().unwrap();
    let store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &state(Some(2), Some(3)))
        .unwrap();
    let before = raw(&fixture.catalog, "brain-alpha");
    let outcome = restore(
        &fixture.catalog,
        &record(&fixture.catalog, "brain-alpha"),
        &store,
    );
    assert!(matches!(outcome, Err(MapError::NotBuilt(_))));
    assert_eq!(
        raw(&fixture.catalog, "brain-alpha"),
        before,
        "no correction is invented"
    );
}

#[test]
fn restoring_and_updating_never_touch_the_index_or_its_journal() {
    let fixture = fixture();
    let (_temp, store) = store_for("brain-alpha", &corpus(200, "a"));
    let brain = record(&fixture.catalog, "brain-alpha");
    let snapshot = |store: &BrainIndex| -> (u64, i64, i64) {
        let identity = store.index.identity().unwrap();
        let count = |sql: &str| -> i64 {
            store
                .index
                .connection
                .query_row(sql, [], |row| row.get(0))
                .unwrap()
        };
        (
            identity.revision,
            count("SELECT COUNT(*) FROM nodes"),
            count("SELECT COUNT(*) FROM change_events"),
        )
    };
    let before = snapshot(&store);
    let mut chosen = state(Some(DOCS), Some(FIRST_FILE + 100));
    chosen.filter = files_only();
    fixture
        .catalog
        .set_resume_state("brain-alpha", &chosen)
        .unwrap();
    for _ in 0..3 {
        restore(&fixture.catalog, &brain, &store).unwrap();
        fixture
            .catalog
            .set_resume_state("brain-alpha", &chosen)
            .unwrap();
    }
    assert_eq!(
        snapshot(&store),
        before,
        "revision, nodes and journal are exactly as they were"
    );
}

#[test]
fn the_module_reaches_neither_the_source_nor_the_publication_lock() {
    // Structural guard, like the ones the other slices keep: the production half
    // of this file (everything before its own test module) names no filesystem
    // access, no path resolution, no lock and no journal.
    let source = include_str!("resume_state.rs");
    let production = source.split("#[cfg(test)]").next().unwrap();
    for forbidden in [
        "std::fs",
        "read_dir",
        "File::open",
        "real_root_path",
        "SandboxPaths",
        "PUBLICATION_LOCK",
        "lock_publication",
        "change_events",
        "watch::",
        "publish_map",
        "encode_path",
        "decode_path",
        "PathBuf",
        "localStorage",
    ] {
        assert!(
            !production.contains(forbidden),
            "`{forbidden}` in resume_state.rs"
        );
    }
}

#[test]
fn the_three_brains_restore_their_own_state_in_any_order() {
    // The in-process half of the central proof (the real-process half is the
    // WebView2 restart): three brains, three deliberately different states.
    let fixture = fixture();
    let (_ta, store_a) = store_for("brain-alpha", &corpus(200, "alpha"));
    let (_tb, store_b) = store_for("brain-beta", &corpus(40, "beta"));
    let (_tg, store_g) = store_for("brain-gamma", &corpus(200, "gamma"));
    let mut a = state(None, Some(FIRST_FILE + 120));
    a.filter = files_only();
    a.details_panel_visible = false;
    a.view = Some(ResumeView {
        scale: 2.0,
        tx: -10.0,
        ty: -20.0,
    });
    let mut b = state(Some(DOCS), Some(FIRST_FILE + 9));
    b.details_panel_visible = true;
    b.view = Some(ResumeView {
        scale: 0.75,
        tx: 3.0,
        ty: 4.0,
    });
    let mut g = state(None, Some(1));
    g.details_panel_visible = false;
    g.view = None;
    for (id, chosen) in [("brain-alpha", &a), ("brain-beta", &b), ("brain-gamma", &g)] {
        fixture.catalog.set_resume_state(id, chosen).unwrap();
    }
    let stores = [
        ("brain-alpha", &store_a, &a),
        ("brain-beta", &store_b, &b),
        ("brain-gamma", &store_g, &g),
    ];
    for order in [[0, 1, 2], [2, 0, 1], [1, 2, 0], [0, 2, 1]] {
        for index in order {
            let (id, store, expected) = stores[index];
            let restored = restore(&fixture.catalog, &record(&fixture.catalog, id), store).unwrap();
            assert_eq!(restored.resume, *expected, "{id}");
            assert!(restored.corrections.is_empty(), "{id}");
            assert_eq!(restored.projection.brain_id, id);
        }
    }
    assert_eq!(fixture.catalog.resume_state("brain-alpha").unwrap(), a);
}
