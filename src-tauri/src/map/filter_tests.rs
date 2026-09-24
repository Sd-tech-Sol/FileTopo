//! `TASK-0039` — dynamic filters (`DEC-0037`).
//!
//! Every corpus is synthetic and built by the test that reads it. The oracles
//! are **independent** of the SQL under test: plain Rust over the nodes and the
//! journal pages the product already exposes, so a wrong predicate cannot
//! confirm itself.

use super::change_journal_tests::all_events;
use crate::change_journal::ChangeNature;
use crate::domain::{NodeDto, NodeKind};
use crate::identity::{IdentityProvenance, NodeIdentity};
use crate::map::brain_index::{BrainIndex, SourceStamp};
use crate::map::brains::SourceKind;
use crate::map::filtered_projection::{materialize, materialize_filtered_view};
use crate::map::projection::{MATERIAL_BUDGET, ORDINARY_MATERIAL_TARGET, materialize_view};
use crate::map::store::MapSnapshot;
use crate::node_filter::{
    AvailabilityFilter, FilterCursor, KindFilter, NodeFilter, StateFilter, page_plan,
    page_sql_for_test, total_sql_for_test,
};
use std::collections::{BTreeSet, HashSet};

// -- Synthetic corpus ----------------------------------------------------------

#[derive(Clone)]
struct Item {
    id: i64,
    parent: Option<i64>,
    path: String,
    kind: NodeKind,
    online: bool,
    size: u64,
}

fn item(id: i64, parent: Option<i64>, path: &str, kind: NodeKind) -> Item {
    Item {
        id,
        parent,
        path: path.to_string(),
        kind,
        online: false,
        size: 0,
    }
}

impl Item {
    fn online(mut self) -> Self {
        self.online = true;
        self
    }
    fn size(mut self, size: u64) -> Self {
        self.size = size;
        self
    }
}

fn nodes(items: &[Item]) -> Vec<NodeDto> {
    items
        .iter()
        .map(|i| NodeDto {
            id: i.id,
            parent_id: i.parent,
            name: if i.path.is_empty() {
                "root".into()
            } else {
                i.path.rsplit('/').next().unwrap().to_string()
            },
            relative_path: i.path.clone(),
            kind: i.kind,
            depth: if i.path.is_empty() {
                0
            } else {
                i.path.split('/').count() as u32
            },
            size_bytes: i.size,
            modified_unix_ms: None,
            online_only: i.online,
            reparse_point: false,
            child_count: items.iter().filter(|c| c.parent == Some(i.id)).count() as u32,
            seen: false,
        })
        .collect()
}

fn identities(items: &[Item]) -> Vec<NodeIdentity> {
    items
        .iter()
        .map(|i| NodeIdentity {
            node_id: i.id,
            stable_key: format!("K-{}", i.id),
            provenance: IdentityProvenance::System,
        })
        .collect()
}

fn store() -> (tempfile::TempDir, BrainIndex) {
    let temp = tempfile::tempdir().unwrap();
    let store = BrainIndex::open(&temp.path().join("index.sqlite")).unwrap();
    (temp, store)
}

fn publish_as(store: &mut BrainIndex, brain: &str, items: &[Item]) {
    store
        .replace_with_identity(
            brain,
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "filters",
                label: "Synthetic",
            },
            &nodes(items),
            &identities(items),
            &[],
            0,
        )
        .unwrap();
}

fn publish(store: &mut BrainIndex, items: &[Item]) {
    publish_as(store, "brain-a", items);
}

/// `racine` ▸ `docs/` (`a.txt`, `b.txt` online), `media/` (`c.bin` online,
/// `locked` skipped), `r.txt`. Present at the baseline: **no event**.
fn base() -> Vec<Item> {
    vec![
        item(1, None, "", NodeKind::Root),
        item(2, Some(1), "docs", NodeKind::Directory),
        item(3, Some(1), "media", NodeKind::Directory),
        item(4, Some(2), "docs/a.txt", NodeKind::File).size(10),
        item(5, Some(2), "docs/b.txt", NodeKind::File).online(),
        item(6, Some(3), "media/c.bin", NodeKind::File).online(),
        item(7, Some(1), "r.txt", NodeKind::File),
        item(8, Some(3), "media/locked", NodeKind::Skipped),
    ]
}

/// `base()` after a refresh: `a.txt` grew (MODIFIED), a new folder with a new
/// file inside, and a new online-only file at the root (three CREATED).
fn grown() -> Vec<Item> {
    let mut items = base();
    items[3] = item(4, Some(2), "docs/a.txt", NodeKind::File).size(99);
    items.push(item(9, Some(2), "docs/new-dir", NodeKind::Directory));
    items.push(item(10, Some(9), "docs/new-dir/n.txt", NodeKind::File));
    items.push(item(11, Some(1), "x.txt", NodeKind::File).online());
    items
}

fn seeded() -> (tempfile::TempDir, BrainIndex) {
    let (temp, mut store) = store();
    publish(&mut store, &base());
    publish(&mut store, &grown());
    (temp, store)
}

fn id(store: &BrainIndex, path: &str) -> i64 {
    store
        .resolve_path(path)
        .unwrap()
        .unwrap_or_else(|| panic!("no node at {path:?}"))
}

fn filter(
    state: StateFilter,
    kinds: &[KindFilter],
    availability: AvailabilityFilter,
) -> NodeFilter {
    NodeFilter {
        state,
        kinds: kinds.to_vec(),
        availability,
    }
}

fn state_only(state: StateFilter) -> NodeFilter {
    filter(state, &[], AvailabilityFilter::All)
}

// -- Independent oracle --------------------------------------------------------

fn present(store: &BrainIndex) -> Vec<NodeDto> {
    store.index.list_nodes(50_000, 0).unwrap()
}

/// `(unseen CREATED, any unseen)` node ids among **present** nodes, from the
/// journal pages the product exposes — never from SQL of this task.
fn unseen_sets(store: &BrainIndex) -> (HashSet<i64>, HashSet<i64>) {
    let present_ids = present(store).iter().map(|n| n.id).collect::<HashSet<_>>();
    let (mut created, mut any) = (HashSet::new(), HashSet::new());
    for event in all_events(&store.index, &[]) {
        if event.seen || !present_ids.contains(&event.node_id) {
            continue;
        }
        any.insert(event.node_id);
        if event.nature == ChangeNature::Created {
            created.insert(event.node_id);
        }
    }
    (created, any)
}

fn oracle(store: &BrainIndex, f: &NodeFilter) -> BTreeSet<i64> {
    let (created, any) = unseen_sets(store);
    present(store)
        .into_iter()
        .filter(|n| n.kind != NodeKind::Root)
        .filter(|n| {
            f.kinds.is_empty()
                || f.kinds.iter().any(|k| {
                    matches!(
                        (k, n.kind),
                        (KindFilter::Directory, NodeKind::Directory)
                            | (KindFilter::File, NodeKind::File)
                            | (KindFilter::Skipped, NodeKind::Skipped)
                    )
                })
        })
        .filter(|n| match f.availability {
            AvailabilityFilter::All => true,
            AvailabilityFilter::Local => !n.online_only,
            AvailabilityFilter::OnlineOnly => n.online_only,
        })
        .filter(|n| match f.state {
            StateFilter::All => true,
            StateFilter::New => created.contains(&n.id),
            StateFilter::Unseen => any.contains(&n.id),
        })
        .map(|n| n.id)
        .collect()
}

fn walk(store: &BrainIndex, f: &NodeFilter) -> Vec<MapSnapshot> {
    let mut pages = Vec::new();
    let mut cursor: Option<String> = None;
    loop {
        let view = materialize_filtered_view(store, f, cursor.as_deref()).unwrap();
        check_page(store, &view);
        let next = view.filtered.as_ref().unwrap().filter_next_cursor.clone();
        pages.push(view);
        match next {
            Some(next) => cursor = Some(next),
            None => return pages,
        }
        assert!(pages.len() < 2_000, "a runaway cursor chain");
    }
}

fn matched(pages: &[MapSnapshot]) -> Vec<i64> {
    pages
        .iter()
        .flat_map(|p| p.filtered.as_ref().unwrap().filter_match_ids.clone())
        .collect()
}

/// Structural truth of one filtered page, whatever the filter.
fn check_page(store: &BrainIndex, view: &MapSnapshot) {
    let filtered = view.filtered.as_ref().expect("a filtered page");
    let ids = view.nodes.iter().map(|n| n.id).collect::<HashSet<_>>();
    assert_eq!(ids.len(), view.nodes.len(), "no node twice");
    assert!(view.nodes.len() < MATERIAL_BUDGET, "hard ceiling");
    assert!(
        view.aggregates.is_empty(),
        "no aggregate posing as a result"
    );
    assert_eq!(
        view.materialized_count + view.non_materialized_count,
        view.node_count
    );
    // Matches and context partition the materialised nodes.
    let matches = filtered
        .filter_match_ids
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let context = filtered
        .filter_context_ids
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    assert!(matches.is_disjoint(&context));
    assert_eq!(
        matches.union(&context).copied().collect::<HashSet<_>>(),
        ids
    );
    assert_eq!(filtered.materialized_match_count, matches.len());
    assert!(
        !matches.contains(&view.root_id),
        "the root is never a match"
    );
    assert!(context.contains(&view.root_id), "the root is context");
    // Only real parent/child edges, and ancestry is closed under "parent".
    for edge in &view.hierarchy_edges {
        assert!(ids.contains(&edge.parent_id) && ids.contains(&edge.child_id));
        assert_eq!(
            store.index.node(edge.child_id).unwrap().unwrap().parent_id,
            Some(edge.parent_id),
            "an edge is a real parent/child relation"
        );
    }
    let with_edge = view
        .hierarchy_edges
        .iter()
        .map(|e| e.child_id)
        .collect::<HashSet<_>>();
    for node in &view.nodes {
        assert!(node.rect.x.is_finite() && node.rect.y.is_finite());
        if node.id != view.root_id {
            assert!(with_edge.contains(&node.id), "no orphan in a filtered view");
        }
    }
}

fn walked(store: &BrainIndex, f: &NodeFilter) -> BTreeSet<i64> {
    let pages = walk(store, f);
    let all = matched(&pages);
    let set = all.iter().copied().collect::<BTreeSet<_>>();
    assert_eq!(all.len(), set.len(), "no match served twice");
    for page in &pages {
        assert_eq!(
            page.filtered.as_ref().unwrap().filtered_total,
            set.len() as u64,
            "the total is the exact number of matches, on every page"
        );
    }
    set
}

fn ids(store: &BrainIndex, paths: &[&str]) -> BTreeSet<i64> {
    paths.iter().map(|p| id(store, p)).collect()
}

// -- 1. The inactive filter is the normal projection ---------------------------

#[test]
fn an_inactive_filter_reproduces_the_normal_projection_byte_for_byte() {
    let (_temp, store) = seeded();
    let normal = materialize_view(&store, None, None).unwrap();
    for inactive in [
        None,
        Some(NodeFilter::default()),
        Some(filter(StateFilter::All, &[], AvailabilityFilter::All)),
    ] {
        let view = materialize(&store, None, None, inactive.as_ref()).unwrap();
        assert_eq!(view, normal);
        assert!(view.filtered.is_none());
        assert_eq!(
            serde_json::to_string(&view).unwrap(),
            serde_json::to_string(&normal).unwrap()
        );
    }
    assert!(
        !serde_json::to_string(&normal)
            .unwrap()
            .contains("\"filtered\""),
        "the unfiltered DTO gains no key"
    );
    // A focus and a child cursor keep working exactly as before.
    let focused = materialize(&store, Some(id(&store, "docs")), None, None).unwrap();
    assert_eq!(
        focused,
        materialize_view(&store, Some(id(&store, "docs")), None).unwrap()
    );
}

// -- 2–6. New / unseen come from the journal -----------------------------------

#[test]
fn new_and_unseen_are_the_journal_truth() {
    let (_temp, store) = seeded();
    let new = ids(&store, &["docs/new-dir", "docs/new-dir/n.txt", "x.txt"]);
    let unseen = ids(
        &store,
        &["docs/new-dir", "docs/new-dir/n.txt", "x.txt", "docs/a.txt"],
    );
    assert_eq!(walked(&store, &state_only(StateFilter::New)), new);
    assert_eq!(walked(&store, &state_only(StateFilter::Unseen)), unseen);
    // …and the oracle, computed apart from the SQL, says the same.
    assert_eq!(oracle(&store, &state_only(StateFilter::New)), new);
    assert_eq!(oracle(&store, &state_only(StateFilter::Unseen)), unseen);
}

#[test]
fn nodes_seen_neither_creates_nor_removes_a_match() {
    let (_temp, store) = seeded();
    let new = walked(&store, &state_only(StateFilter::New));
    let unseen = walked(&store, &state_only(StateFilter::Unseen));
    // The prototype column says "seen" for everything: the journal still wins.
    store
        .index
        .connection
        .execute("UPDATE nodes SET seen = 1", [])
        .unwrap();
    assert_eq!(walked(&store, &state_only(StateFilter::New)), new);
    assert_eq!(walked(&store, &state_only(StateFilter::Unseen)), unseen);
    // Everything acknowledged in the journal, the prototype column says
    // "unseen" for everything: still nothing is new.
    store.mark_all_changes_seen().unwrap();
    store
        .index
        .connection
        .execute("UPDATE nodes SET seen = 0", [])
        .unwrap();
    assert!(walked(&store, &state_only(StateFilter::New)).is_empty());
    assert!(walked(&store, &state_only(StateFilter::Unseen)).is_empty());
}

#[test]
fn an_acknowledged_creation_leaves_new_and_a_modification_is_unseen_but_not_new() {
    let (_temp, store) = seeded();
    let n = id(&store, "docs/new-dir/n.txt");
    let a = id(&store, "docs/a.txt");
    let creation = all_events(&store.index, &[ChangeNature::Created])
        .into_iter()
        .find(|e| e.node_id == n)
        .unwrap();
    store.mark_change_seen(creation.event_id).unwrap();
    let new = walked(&store, &state_only(StateFilter::New));
    assert!(!new.contains(&n), "CREATED acknowledged: no longer new");
    // The modified file: unseen, never new.
    assert!(!new.contains(&a));
    assert!(walked(&store, &state_only(StateFilter::Unseen)).contains(&a));
    assert!(!walked(&store, &state_only(StateFilter::Unseen)).contains(&n));
}

#[test]
fn marking_an_element_or_everything_removes_its_matches_on_the_next_read() {
    let (_temp, store) = seeded();
    let n = id(&store, "docs/new-dir/n.txt");
    let x = id(&store, "x.txt");
    store.mark_node_changes_seen(n).unwrap();
    let new = walked(&store, &state_only(StateFilter::New));
    assert!(!new.contains(&n) && new.contains(&x));
    assert_eq!(new, oracle(&store, &state_only(StateFilter::New)));
    store.mark_all_changes_seen().unwrap();
    assert!(walked(&store, &state_only(StateFilter::New)).is_empty());
    assert!(walked(&store, &state_only(StateFilter::Unseen)).is_empty());
    // A change detected *after* "mark all" is unseen again, and only it.
    let mut again = grown();
    again[6] = item(7, Some(1), "r.txt", NodeKind::File).size(7);
    let mut store = store;
    publish(&mut store, &again);
    assert_eq!(
        walked(&store, &state_only(StateFilter::Unseen)),
        ids(&store, &["r.txt"])
    );
}

// -- 7–12. Kinds, availability and their combinations, exact -------------------

#[test]
fn every_group_and_every_combination_matches_the_independent_oracle() {
    let (_temp, store) = seeded();
    let states = [StateFilter::All, StateFilter::New, StateFilter::Unseen];
    let kinds: [&[KindFilter]; 7] = [
        &[],
        &[KindFilter::Directory],
        &[KindFilter::File],
        &[KindFilter::Skipped],
        &[KindFilter::Directory, KindFilter::File],
        &[KindFilter::File, KindFilter::Skipped],
        &[KindFilter::Directory, KindFilter::File, KindFilter::Skipped],
    ];
    let availabilities = [
        AvailabilityFilter::All,
        AvailabilityFilter::Local,
        AvailabilityFilter::OnlineOnly,
    ];
    let mut checked = 0;
    for state in states {
        for kind in kinds {
            for availability in availabilities {
                let f = filter(state, kind, availability);
                if f.is_inactive() {
                    continue;
                }
                let expected = oracle(&store, &f);
                assert_eq!(walked(&store, &f), expected, "{}", f.canonical());
                checked += 1;
            }
        }
    }
    assert_eq!(checked, 62, "every non-inactive combination was compared");
}

#[test]
fn named_combinations_have_the_expected_exact_members() {
    let (_temp, store) = seeded();
    let of = |s, k: &[KindFilter], a| walked(&store, &filter(s, k, a));
    // type alone
    assert_eq!(
        of(
            StateFilter::All,
            &[KindFilter::Skipped],
            AvailabilityFilter::All
        ),
        ids(&store, &["media/locked"])
    );
    assert_eq!(
        of(
            StateFilter::All,
            &[KindFilter::Directory],
            AvailabilityFilter::All
        ),
        ids(&store, &["docs", "media", "docs/new-dir"])
    );
    // availability alone
    assert_eq!(
        of(StateFilter::All, &[], AvailabilityFilter::OnlineOnly),
        ids(&store, &["docs/b.txt", "media/c.bin", "x.txt"])
    );
    // type + availability
    assert_eq!(
        of(
            StateFilter::All,
            &[KindFilter::File],
            AvailabilityFilter::OnlineOnly
        ),
        ids(&store, &["docs/b.txt", "media/c.bin", "x.txt"])
    );
    assert!(
        of(
            StateFilter::All,
            &[KindFilter::Directory],
            AvailabilityFilter::OnlineOnly
        )
        .is_empty()
    );
    // state + type + availability
    assert_eq!(
        of(
            StateFilter::Unseen,
            &[KindFilter::File],
            AvailabilityFilter::Local
        ),
        ids(&store, &["docs/a.txt", "docs/new-dir/n.txt"])
    );
    assert_eq!(
        of(
            StateFilter::New,
            &[KindFilter::File],
            AvailabilityFilter::OnlineOnly
        ),
        ids(&store, &["x.txt"])
    );
    assert_eq!(
        of(
            StateFilter::New,
            &[KindFilter::Directory],
            AvailabilityFilter::All
        ),
        ids(&store, &["docs/new-dir"])
    );
}

#[test]
fn the_root_is_never_a_match_and_only_ever_context() {
    let (_temp, store) = seeded();
    let root = id(&store, "");
    // `LOCAL` is the one group the root itself satisfies.
    let f = filter(StateFilter::All, &[], AvailabilityFilter::Local);
    let set = walked(&store, &f);
    assert!(!set.contains(&root));
    let pages = walk(&store, &f);
    assert_eq!(
        pages[0].filtered.as_ref().unwrap().filtered_total,
        oracle(&store, &f).len() as u64
    );
    // No match at all: the page is the root alone, as context.
    let none = state_only(StateFilter::New);
    store.mark_all_changes_seen().unwrap();
    let view = materialize_filtered_view(&store, &none, None).unwrap();
    let filtered = view.filtered.unwrap();
    assert_eq!(filtered.filtered_total, 0);
    assert!(filtered.filter_match_ids.is_empty() && filtered.filter_next_cursor.is_none());
    assert_eq!(view.nodes.len(), 1);
    assert_eq!(view.nodes[0].id, root);
    assert_eq!(filtered.filter_context_ids, vec![root]);
}

// -- 13. More than a hundred matches, no gap, no duplicate ---------------------

/// `base()` plus a folder `bulk/` holding `count` files, all created by the
/// refresh under test.
fn with_bulk(count: i64) -> Vec<Item> {
    let mut items = base();
    items.push(item(100, Some(1), "bulk", NodeKind::Directory));
    for i in 0..count {
        items.push(item(
            101 + i,
            Some(100),
            &format!("bulk/f-{i:04}.txt"),
            NodeKind::File,
        ));
    }
    items
}

fn bulk_store(count: i64) -> (tempfile::TempDir, BrainIndex) {
    let (temp, mut store) = store();
    publish(&mut store, &base());
    publish(&mut store, &with_bulk(count));
    (temp, store)
}

#[test]
fn more_than_a_hundred_matches_page_without_a_gap_or_a_duplicate() {
    let (_temp, store) = bulk_store(300);
    let f = state_only(StateFilter::New);
    let pages = walk(&store, &f);
    assert!(pages.len() >= 5, "301 matches cannot fit in fewer pages");
    let served = matched(&pages);
    assert_eq!(served.len(), 301);
    assert_eq!(
        served.iter().copied().collect::<BTreeSet<_>>(),
        oracle(&store, &f)
    );
    // Deterministic keyset order: strictly ascending across the whole walk.
    assert!(served.windows(2).all(|w| w[0] < w[1]));
    for page in &pages {
        assert!(page.nodes.len() <= ORDINARY_MATERIAL_TARGET);
        assert_eq!(page.filtered.as_ref().unwrap().filtered_total, 301);
    }
    // Pagination replaces the page: the next page never repeats a match.
    let first = pages[0].filtered.as_ref().unwrap();
    let second = pages[1].filtered.as_ref().unwrap();
    assert!(
        first
            .filter_match_ids
            .iter()
            .all(|m| !second.filter_match_ids.contains(m))
    );
}

// -- 14–16. Cursors ------------------------------------------------------------

fn first_cursor(store: &BrainIndex, f: &NodeFilter) -> String {
    materialize_filtered_view(store, f, None)
        .unwrap()
        .filtered
        .unwrap()
        .filter_next_cursor
        .expect("a second page exists")
}

fn refused(result: Result<MapSnapshot, crate::map::MapError>, needle: &str) {
    let message = String::from(result.expect_err("the cursor must be refused"));
    assert!(message.contains(needle), "{message:?} lacks {needle:?}");
}

#[test]
fn a_cursor_of_another_index_is_refused() {
    let (_ta, a) = bulk_store(200);
    let (_tb, mut b) = store();
    publish(&mut b, &base());
    publish(&mut b, &with_bulk(200));
    let f = state_only(StateFilter::New);
    let cursor = first_cursor(&a, &f);
    // Same content, same revision number, another index: refused as foreign.
    refused(
        materialize_filtered_view(&b, &f, Some(&cursor)),
        "filter_cursor_foreign",
    );
}

#[test]
fn a_cursor_of_another_revision_is_refused() {
    let (_temp, mut store) = bulk_store(200);
    let f = state_only(StateFilter::New);
    let cursor = first_cursor(&store, &f);
    publish(&mut store, &with_bulk(200));
    refused(
        materialize_filtered_view(&store, &f, Some(&cursor)),
        "filter_cursor_stale",
    );
}

#[test]
fn a_cursor_of_another_filter_is_refused_but_an_equivalent_spelling_is_accepted() {
    let (_temp, store) = bulk_store(200);
    let files = filter(
        StateFilter::New,
        &[KindFilter::File],
        AvailabilityFilter::All,
    );
    let cursor = first_cursor(&store, &files);
    refused(
        materialize_filtered_view(&store, &state_only(StateFilter::New), Some(&cursor)),
        "filter_cursor_filter_mismatch",
    );
    refused(
        materialize_filtered_view(&store, &state_only(StateFilter::Unseen), Some(&cursor)),
        "filter_cursor_filter_mismatch",
    );
    // Duplicated / reordered kinds are the same canonical filter.
    let respelled = filter(
        StateFilter::New,
        &[KindFilter::File, KindFilter::File],
        AvailabilityFilter::All,
    );
    assert!(materialize_filtered_view(&store, &respelled, Some(&cursor)).is_ok());
}

#[test]
fn malformed_and_foreign_kind_tokens_are_refused() {
    let (_temp, store) = bulk_store(200);
    let f = state_only(StateFilter::New);
    for token in [
        "",
        "ftf1",
        "ftf1.a.b.c.d",
        "ftf1.x.1.NEW::ALL",
        "nope.1.2.3.4",
        "ftf1.x.1.NEW::ALL.9.9",
    ] {
        assert!(
            materialize_filtered_view(&store, &f, Some(token)).is_err(),
            "{token:?}"
        );
    }
    // A child-page cursor (`ftc1`) is never a filter cursor, and the reverse.
    let child = materialize_view(&store, None, None)
        .unwrap()
        .aggregates
        .iter()
        .find_map(|a| a.next_cursor.clone());
    if let Some(child) = child {
        assert!(materialize_filtered_view(&store, &f, Some(&child)).is_err());
    }
    let cursor = first_cursor(&store, &f);
    assert!(materialize_view(&store, None, Some(&cursor)).is_err());
}

// -- 17–19. Budget, context, edges ---------------------------------------------

/// `base()` plus `branches` chains of `depth` new folders, each ending in one
/// new file.
fn branchy(branches: i64, depth: i64) -> Vec<Item> {
    let mut items = base();
    let mut next = 100;
    for b in 0..branches {
        let mut parent = 1;
        let mut path = String::new();
        for d in 0..depth {
            path = if path.is_empty() {
                format!("b{b}")
            } else {
                format!("{path}/d{d}")
            };
            items.push(item(next, Some(parent), &path, NodeKind::Directory));
            parent = next;
            next += 1;
        }
        items.push(item(
            next,
            Some(parent),
            &format!("{path}/leaf.txt"),
            NodeKind::File,
        ));
        next += 1;
    }
    items
}

#[test]
fn matches_and_their_ancestors_stay_under_the_budget_and_a_deferred_match_is_never_lost() {
    let (_temp, mut store) = store();
    publish(&mut store, &base());
    // 20 branches of 5 folders + 1 file: 6 nodes each, far past one page.
    publish(&mut store, &branchy(20, 5));
    let f = filter(
        StateFilter::New,
        &[KindFilter::File],
        AvailabilityFilter::All,
    );
    let pages = walk(&store, &f);
    assert!(pages.len() >= 2);
    for page in &pages {
        assert!(
            page.nodes.len() <= ORDINARY_MATERIAL_TARGET,
            "{}",
            page.nodes.len()
        );
    }
    let served = matched(&pages);
    assert_eq!(served.len(), 20, "every leaf exactly once");
    assert_eq!(
        served.iter().copied().collect::<BTreeSet<_>>(),
        oracle(&store, &f)
    );
}

#[test]
fn ancestors_that_do_not_satisfy_the_filter_are_context_and_never_matches() {
    let (_temp, store) = seeded();
    let f = filter(
        StateFilter::New,
        &[KindFilter::File],
        AvailabilityFilter::All,
    );
    let view = materialize_filtered_view(&store, &f, None).unwrap();
    check_page(&store, &view);
    let filtered = view.filtered.unwrap();
    let n = id(&store, "docs/new-dir/n.txt");
    let (docs, new_dir, root) = (
        id(&store, "docs"),
        id(&store, "docs/new-dir"),
        id(&store, ""),
    );
    assert!(filtered.filter_match_ids.contains(&n));
    // `docs/new-dir` is a new folder but the filter asks for files: context.
    for ancestor in [docs, new_dir, root] {
        assert!(filtered.filter_context_ids.contains(&ancestor));
        assert!(!filtered.filter_match_ids.contains(&ancestor));
    }
    assert_eq!(filtered.filtered_total, 2, "the total counts files only");
}

#[test]
fn a_single_match_with_a_deep_ancestry_is_served_up_to_the_hard_ceiling_only() {
    let (_temp, mut shallow) = store();
    publish(&mut shallow, &base());
    // One match under 70 nested folders: past the ordinary target, still legal.
    publish(&mut shallow, &branchy(1, 70));
    let f = filter(
        StateFilter::New,
        &[KindFilter::File],
        AvailabilityFilter::All,
    );
    let view = materialize_filtered_view(&shallow, &f, None).unwrap();
    check_page(&shallow, &view);
    assert!(view.nodes.len() > ORDINARY_MATERIAL_TARGET && view.nodes.len() < MATERIAL_BUDGET);
    assert_eq!(view.filtered.unwrap().materialized_match_count, 1);

    // Past the technical ceiling the projection refuses, loudly.
    let (_temp2, mut deep) = store();
    publish(&mut deep, &base());
    publish(&mut deep, &branchy(1, MATERIAL_BUDGET as i64 + 10));
    let error = materialize_filtered_view(&deep, &f, None).expect_err("over the ceiling");
    assert!(String::from(error).contains("exceeds view budget"));
}

// -- 20. Bounded by construction -----------------------------------------------

#[test]
fn the_filter_query_is_a_bounded_keyset_read_with_no_offset_and_no_prototype_column() {
    let f = filter(
        StateFilter::Unseen,
        &[KindFilter::File],
        AvailabilityFilter::Local,
    );
    let page = page_sql_for_test(&f);
    let total = total_sql_for_test(&f);
    for sql in [&page, &total] {
        let upper = sql.to_uppercase();
        assert!(
            !upper.contains("OFFSET"),
            "no OFFSET on the hot path: {sql}"
        );
        // `nodes.seen` is the historical column: its bare identifier must not
        // appear (`seen_change_events` is a different, journal-derived word).
        assert!(
            !sql.split(|c: char| !(c.is_alphanumeric() || c == '_'))
                .any(|word| word == "seen"),
            "nodes.seen must not be read: {sql}"
        );
        assert!(sql.contains("change_events"), "the journal is the truth");
    }
    assert!(page.contains("LIMIT :limit") && page.contains("n.id > :after"));
    assert!(page.contains("ORDER BY n.id"));
    assert!(page.contains("n.kind != 'root'") && total.contains("n.kind != 'root'"));

    let (_temp, store) = seeded();
    let plan = page_plan(&store.index.connection, &f).unwrap().join(" | ");
    assert!(
        plan.contains("SEARCH n USING INTEGER PRIMARY KEY"),
        "{plan}"
    );
    assert!(!plan.contains("TEMP B-TREE"), "no temporary sort: {plan}");
    // The plan of a state-free filter is the same primary-key range.
    let plain = page_plan(
        &store.index.connection,
        &filter(
            StateFilter::All,
            &[KindFilter::File],
            AvailabilityFilter::All,
        ),
    )
    .unwrap()
    .join(" | ");
    assert!(
        plain.contains("SEARCH n USING INTEGER PRIMARY KEY"),
        "{plain}"
    );
}

#[test]
fn the_primitive_returns_at_most_a_page_and_a_probe_whatever_the_total() {
    let (_temp, store) = bulk_store(300);
    let f = state_only(StateFilter::New);
    let read = store.index.filtered_matches(&f, 5, None).unwrap();
    assert_eq!(read.total, 301);
    assert_eq!(read.rows.len(), 6, "limit + the one-row probe");
    // A caller cannot ask for the collection: the page is clamped.
    let huge = store.index.filtered_matches(&f, usize::MAX, None).unwrap();
    assert!(huge.rows.len() <= crate::node_filter::MAX_FILTER_PAGE + 1);
    assert_eq!(huge.total, 301);
    // Resuming after the last served match starts strictly after it.
    let cursor = FilterCursor {
        index_id: read.identity.index_id.clone(),
        revision: read.identity.revision,
        canonical: f.canonical(),
        after_id: read.rows[4].id,
    };
    let next = store.index.filtered_matches(&f, 5, Some(&cursor)).unwrap();
    assert_eq!(next.rows[0].id, read.rows[5].id);
}

// -- 21. Two brains, two truths ------------------------------------------------

#[test]
fn two_brains_keep_independent_filters_totals_and_cursors() {
    let (_ta, a) = seeded();
    let (_tb, mut b) = store();
    publish_as(&mut b, "brain-b", &base());
    // Brain B: one modification and nothing new.
    let mut changed = base();
    changed[3] = item(4, Some(2), "docs/a.txt", NodeKind::File).size(1);
    publish_as(&mut b, "brain-b", &changed);
    let new = state_only(StateFilter::New);
    let unseen = state_only(StateFilter::Unseen);
    assert_eq!(walked(&a, &new).len(), 3);
    assert!(walked(&b, &new).is_empty());
    assert_eq!(walked(&b, &unseen), ids(&b, &["docs/a.txt"]));
    // Acknowledging in B never touches A.
    b.mark_all_changes_seen().unwrap();
    assert!(walked(&b, &unseen).is_empty());
    assert_eq!(walked(&a, &unseen).len(), 4);
    let view = materialize_filtered_view(&a, &new, None).unwrap();
    assert_eq!(view.brain_id, "brain-a");
}

// -- 22. The DTO carries no machine identity -----------------------------------

fn collect_keys(value: &serde_json::Value, keys: &mut Vec<String>, strings: &mut Vec<String>) {
    match value {
        serde_json::Value::Object(map) => {
            for (key, inner) in map {
                keys.push(key.clone());
                collect_keys(inner, keys, strings);
            }
        }
        serde_json::Value::Array(items) => {
            items
                .iter()
                .for_each(|inner| collect_keys(inner, keys, strings));
        }
        serde_json::Value::String(text) => strings.push(text.clone()),
        _ => {}
    }
}

#[test]
fn the_filtered_dto_exposes_no_absolute_path_no_stable_key_and_no_system_identity() {
    let (_temp, store) = seeded();
    let f = filter(StateFilter::Unseen, &[], AvailabilityFilter::All);
    let view = materialize_filtered_view(&store, &f, None).unwrap();
    let json = serde_json::to_value(&view).unwrap();
    let (mut keys, mut strings) = (Vec::new(), Vec::new());
    collect_keys(&json, &mut keys, &mut strings);
    for forbidden in [
        "stableKey",
        "stable_key",
        "fileId",
        "file_id",
        "volume",
        "volumeSerial",
        "identity",
        "identityProvenance",
        "provenance",
        "absolutePath",
        "path",
        "sourceRef",
        "eventId",
    ] {
        assert!(
            !keys.iter().any(|k| k == forbidden),
            "key {forbidden:?} leaked"
        );
    }
    for text in &strings {
        assert!(!text.starts_with("K-"), "a stable key leaked: {text}");
        assert!(
            !text.starts_with('/') && !text.contains(":\\"),
            "absolute path: {text}"
        );
    }
    let filtered = json.get("filtered").unwrap();
    let mut names = filtered
        .as_object()
        .unwrap()
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    names.sort();
    assert_eq!(
        names,
        [
            "filter",
            "filterContextIds",
            "filterMatchIds",
            "filterNextCursor",
            "filteredTotal",
            "materializedMatchCount"
        ]
    );
    // The cursor is opaque: identifiers, a revision and the canonical filter.
    let cursor = first_cursor(&bulk_store(200).1, &state_only(StateFilter::New));
    assert!(cursor.starts_with("ftf1.") && !cursor.contains('/') && !cursor.contains('\\'));
}

// -- 100 000 nodes: exact and bounded ------------------------------------------

fn flat_corpus(files: i64) -> Vec<NodeDto> {
    let mut all = vec![NodeDto {
        id: 1,
        parent_id: None,
        name: "root".into(),
        relative_path: String::new(),
        kind: NodeKind::Root,
        depth: 0,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: files as u32,
        seen: false,
    }];
    all.extend((0..files).map(|i| NodeDto {
        id: i + 2,
        parent_id: Some(1),
        name: format!("synthetic-{i:06}"),
        relative_path: format!("synthetic-{i:06}"),
        kind: NodeKind::File,
        depth: 1,
        size_bytes: 0,
        modified_unix_ms: None,
        online_only: false,
        reparse_point: false,
        child_count: 0,
        seen: false,
    }));
    all
}

/// A synthetic corpus of `files` files with a synthetic journal: ids divisible
/// by 3 carry one `CREATED`, ids ≡ 2 (mod 3) one `MODIFIED`, ids ≡ 1 none; ids
/// divisible by 5 are online-only.
fn scaled(files: i64) -> (tempfile::TempDir, BrainIndex) {
    let (temp, mut store) = store();
    store
        .replace(
            "brain-scale",
            SourceStamp {
                kind: SourceKind::SyntheticFixture,
                source_ref: "filters",
                label: "Synthetic",
            },
            &flat_corpus(files),
            &[],
            0,
        )
        .unwrap();
    store
        .index
        .connection
        .execute_batch(
            "UPDATE nodes SET online_only = 1 WHERE id % 5 = 0;
             INSERT INTO change_events(
                 detected_revision, ordinal, nature, node_id, node_kind, detected_unix_ms)
             SELECT 1, id, CASE WHEN id % 3 = 0 THEN 'CREATED' ELSE 'MODIFIED' END,
                    id, kind, 0
             FROM nodes WHERE id > 1 AND id % 3 != 1;",
        )
        .unwrap();
    (temp, store)
}

fn expected(files: i64, keep: impl Fn(i64) -> bool) -> u64 {
    (2..=files + 1).filter(|id| keep(*id)).count() as u64
}

#[test]
fn a_hundred_thousand_nodes_give_an_exact_total_and_a_bounded_page() {
    const FILES: i64 = 99_999; // + the root = 100 000 nodes
    let (_temp, store) = scaled(FILES);
    assert_eq!(store.count().unwrap(), 100_000);

    let cases: Vec<(NodeFilter, u64)> = vec![
        (
            state_only(StateFilter::New),
            expected(FILES, |id| id % 3 == 0),
        ),
        (
            state_only(StateFilter::Unseen),
            expected(FILES, |id| id % 3 != 1),
        ),
        (
            filter(
                StateFilter::New,
                &[KindFilter::File],
                AvailabilityFilter::OnlineOnly,
            ),
            expected(FILES, |id| id % 3 == 0 && id % 5 == 0),
        ),
        (
            filter(
                StateFilter::Unseen,
                &[KindFilter::File],
                AvailabilityFilter::Local,
            ),
            expected(FILES, |id| id % 3 != 1 && id % 5 != 0),
        ),
        (
            filter(
                StateFilter::All,
                &[KindFilter::Directory],
                AvailabilityFilter::All,
            ),
            0,
        ),
        (
            filter(StateFilter::All, &[], AvailabilityFilter::Local),
            expected(FILES, |id| id % 5 != 0),
        ),
    ];
    let small = scaled(6_000);
    let mut sizes = Vec::new();
    for (f, total) in &cases {
        let view = materialize_filtered_view(&store, f, None).unwrap();
        check_page(&store, &view);
        let filtered = view.filtered.as_ref().unwrap();
        assert_eq!(filtered.filtered_total, *total, "{}", f.canonical());
        assert!(view.nodes.len() <= ORDINARY_MATERIAL_TARGET);
        assert_eq!(view.node_count, 100_000);
        assert_eq!(
            filtered.filter_next_cursor.is_some(),
            *total > filtered.materialized_match_count as u64
        );
        sizes.push((
            serde_json::to_string(&view).unwrap().len(),
            serde_json::to_string(&materialize_filtered_view(&small.1, f, None).unwrap())
                .unwrap()
                .len(),
        ));
    }
    // What is serialised does not grow with the corpus: a 100 000-node brain's
    // page is the size of a 6 000-node brain's page for the same filter.
    for (large, little) in sizes {
        assert!(
            large <= little + little / 5 + 64,
            "serialised page grew with the corpus: {large} vs {little}"
        );
    }

    // The keyset chain is strictly increasing and resumes exactly.
    let f = state_only(StateFilter::New);
    let mut cursor = None;
    let mut last = 0;
    for _ in 0..4 {
        let view = materialize_filtered_view(&store, &f, cursor.as_deref()).unwrap();
        let filtered = view.filtered.unwrap();
        for m in &filtered.filter_match_ids {
            assert!(*m > last && m % 3 == 0);
            last = *m;
        }
        cursor = filtered.filter_next_cursor;
        assert!(cursor.is_some());
    }
}

// -- Product level: real root, real scanner, the command the UI calls ----------

#[test]
fn the_real_pipeline_filters_created_and_modified_and_follows_the_seen_gestures() {
    use super::change_journal_tests::{register, sandbox};
    use super::{mark_all_changes_seen, mark_node_seen, refresh_map, view_with_filter};
    use crate::map::brains::BrainNodeRef;
    use std::fs;

    let (temp, paths) = sandbox();
    let root = temp.path().join("racine");
    fs::create_dir_all(root.join("ancien")).unwrap();
    fs::write(root.join("ancien").join("stable.txt"), b"synthetique").unwrap();
    fs::write(root.join("a-modifier.txt"), b"avant").unwrap();
    let brain = register(&paths, &root);
    refresh_map(&paths, &brain).expect("baseline");

    fs::create_dir_all(root.join("nouveau-dossier")).unwrap();
    fs::write(root.join("nouveau-dossier").join("neuf.txt"), b"neuf").unwrap();
    fs::write(root.join("a-modifier.txt"), b"apres-plus-long").unwrap();
    refresh_map(&paths, &brain).expect("refresh after changes");

    let view = |f: &NodeFilter, after: Option<&str>| {
        view_with_filter(&paths, &brain, None, after, Some(f)).expect("filtered view")
    };
    let path_of = |view: &MapSnapshot, node_id: i64| {
        view.nodes
            .iter()
            .find(|n| n.id == node_id)
            .unwrap()
            .relative_path
            .clone()
    };
    let match_paths = |view: &MapSnapshot| {
        let mut paths = view
            .filtered
            .as_ref()
            .unwrap()
            .filter_match_ids
            .iter()
            .map(|id| path_of(view, *id))
            .collect::<Vec<_>>();
        paths.sort();
        paths
    };

    let new = view(&state_only(StateFilter::New), None);
    assert_eq!(
        match_paths(&new),
        ["nouveau-dossier", "nouveau-dossier/neuf.txt"]
    );
    assert_eq!(new.filtered.as_ref().unwrap().filtered_total, 2);
    let unseen = view(&state_only(StateFilter::Unseen), None);
    assert_eq!(
        match_paths(&unseen),
        [
            "a-modifier.txt",
            "nouveau-dossier",
            "nouveau-dossier/neuf.txt"
        ]
    );
    let files = view(
        &filter(
            StateFilter::Unseen,
            &[KindFilter::File],
            AvailabilityFilter::Local,
        ),
        None,
    );
    assert_eq!(
        match_paths(&files),
        ["a-modifier.txt", "nouveau-dossier/neuf.txt"]
    );
    // A real local file is never online-only on this fixture.
    assert!(
        view(
            &filter(StateFilter::All, &[], AvailabilityFilter::OnlineOnly),
            None
        )
        .filtered
        .unwrap()
        .filter_match_ids
        .is_empty()
    );

    // Acknowledge the new file through the real gesture: it leaves the filter.
    let neuf = new
        .nodes
        .iter()
        .find(|n| n.relative_path == "nouveau-dossier/neuf.txt")
        .unwrap()
        .id;
    mark_node_seen(&paths, &brain, &BrainNodeRef::new(&brain.brain_id, neuf)).unwrap();
    assert_eq!(
        match_paths(&view(&state_only(StateFilter::New), None)),
        ["nouveau-dossier"]
    );
    mark_all_changes_seen(&paths, &brain).unwrap();
    let empty = view(&state_only(StateFilter::Unseen), None);
    assert!(match_paths(&empty).is_empty());
    assert_eq!(empty.filtered.unwrap().filtered_total, 0);
    // Removing the filter is the normal projection again.
    let normal = view_with_filter(&paths, &brain, None, None, None).unwrap();
    assert!(normal.filtered.is_none());
    assert_eq!(normal, super::view(&paths, &brain, None, None).unwrap());
}
