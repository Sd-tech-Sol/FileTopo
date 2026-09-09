//! Bounded hierarchy paging — the `TASK-0029` foundation of `DEC-0030`.
//!
//! `TASK-0028` measured the old child query at p95 ≈ 12,9 ms on 100 000 indexed
//! elements and p95 ≈ 110,4 ms on 1 000 000: a page of a hundred rows cost
//! roughly what the whole sibling set cost, because the display order was
//! served by no index and the position came from `OFFSET`. This module is what
//! replaces it.
//!
//! Four rules it enforces rather than describes:
//!
//! * **the order is total and index-driven** — `child_order_rank, name_fold,
//!   id`, entirely ascending, which is the same functional order as before and
//!   the only shape a row-value seek can follow;
//! * **continuation is keyset, never `OFFSET`** — the cursor resumes *strictly
//!   after* the last row already rendered, so identical names and names that
//!   differ only in case can neither be duplicated nor skipped;
//! * **a cursor belongs to one index and one revision of it** — a rebuild moves
//!   the revision, and an older cursor is refused as stale rather than
//!   continuing silently in different data;
//! * **no collection is unbounded** — every page is capped by
//!   [`MAX_CHILDREN_PAGE_SIZE`] and every ancestor chain by
//!   [`MAX_ANCESTOR_CHAIN`], and going past a ceiling is an error, never a
//!   silent truncation.
//!
//! **This is product-internal core only.** It exposes no Tauri command, no
//! route and no IPC contract: `DEC-0030` refuses a premature wire format, and
//! the progressive materializer that will consume these primitives belongs to
//! a later slice. Everything here is therefore unreachable from the current
//! runtime by design — hence the module-wide `dead_code` allowance below,
//! which states that reason rather than hiding it.
#![allow(dead_code)]

use crate::domain::NodeDto;
use crate::index::{NODE_COLUMNS, node_from_row};
use rusqlite::{Connection, OptionalExtension, params};
use thiserror::Error;

/// Largest page this layer will ever serve, whatever the caller asks for.
///
/// A finite documented ceiling is the point: a request above it is **capped**,
/// so no caller can turn the children primitive into "give me the collection".
pub const MAX_CHILDREN_PAGE_SIZE: usize = 500;

/// The page size the scale campaigns measure, and a sane default for a caller
/// that has no reason to choose. **Not** a product budget: `DEC-0029` leaves
/// the view budget to a later slice, and this number decides nothing about it.
pub const DEFAULT_CHILDREN_PAGE_SIZE: usize = 100;

/// Hard ceiling on an ancestor chain.
///
/// The scanner caps no depth of its own, so the ceiling cannot be inferred from
/// the corpus; it is declared here, generously above `MAX_FIXTURE_DEPTH = 40`,
/// and exceeding it fails loudly. A walker that could hang is not a bounded
/// primitive.
pub const MAX_ANCESTOR_CHAIN: usize = 512;

/// The canonical child order of `DEC-0030 §A`, in one place.
///
/// `child_order_rank` puts directories first, `name_fold` orders exactly as
/// `name COLLATE NOCASE` would, and `id` breaks every remaining tie. All three
/// ascend, which is what makes the order seekable by
/// `idx_nodes_child_order`.
pub const CHILD_ORDER: &str = "child_order_rank, name_fold, id";

/// Cursor token prefix. Versioned, so a future shape can be told apart from
/// this one instead of being misread as it.
const CURSOR_TAG: &str = "ftc1";

/// Which index, and which revision of it, answered.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IndexIdentity {
    /// Written once when the database is created, never rewritten. Two brains
    /// therefore never share an identity even when their revisions agree.
    pub index_id: String,
    /// Monotone, advanced inside the very transaction that replaces the rows.
    pub revision: u64,
}

/// Where a page of children resumes.
///
/// It carries **identifiers and a revision, nothing else**: no absolute path,
/// no relative path, no name, no personal data, and no `OFFSET` position. The
/// sort key of the resume row is read back from the index by primary key
/// instead of being transported.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChildCursor {
    pub index_id: String,
    pub revision: u64,
    pub parent_id: i64,
    /// The last row already rendered. Resumption is *strictly after* it.
    pub after_id: i64,
}

impl ChildCursor {
    /// An opaque token safe to hand to a caller that must not parse it.
    pub fn encode(&self) -> String {
        format!(
            "{CURSOR_TAG}.{}.{}.{}.{}",
            self.index_id, self.revision, self.parent_id, self.after_id
        )
    }

    pub fn decode(token: &str) -> Result<Self, HierarchyError> {
        let mut parts = token.split('.');
        let tag = parts.next().ok_or(HierarchyError::MalformedCursor)?;
        if tag != CURSOR_TAG {
            return Err(HierarchyError::MalformedCursor);
        }
        let mut field = || parts.next().ok_or(HierarchyError::MalformedCursor);
        let index_id = field()?.to_string();
        let revision = field()?
            .parse::<u64>()
            .map_err(|_| HierarchyError::MalformedCursor)?;
        let parent_id = field()?
            .parse::<i64>()
            .map_err(|_| HierarchyError::MalformedCursor)?;
        let after_id = field()?
            .parse::<i64>()
            .map_err(|_| HierarchyError::MalformedCursor)?;
        if index_id.is_empty() || parts.next().is_some() {
            return Err(HierarchyError::MalformedCursor);
        }
        Ok(Self {
            index_id,
            revision,
            parent_id,
            after_id,
        })
    }
}

/// One bounded page of direct children.
#[derive(Debug, Clone, PartialEq)]
pub struct ChildrenPage {
    pub parent_id: i64,
    /// At most `page_size` rows, in the canonical order.
    pub items: Vec<NodeDto>,
    /// `Some` **only** when rows remain. A page without a cursor states the end
    /// of the sibling set; it does not leave it to be guessed.
    pub next_cursor: Option<ChildCursor>,
    /// Exact direct children of the parent, from the durable `child_count`
    /// column — never a `COUNT(*)` over the sibling set, never an estimate.
    pub total_direct_children: u64,
    /// The index and revision this page was read from, and which its cursor
    /// belongs to.
    pub identity: IndexIdentity,
    /// The effective page size after capping.
    pub page_size: usize,
}

#[derive(Debug, Error)]
pub enum HierarchyError {
    #[error("hierarchy_sqlite_failed: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("hierarchy_cursor_malformed")]
    MalformedCursor,
    /// The index was rebuilt under the cursor. Refused, never continued.
    #[error("hierarchy_cursor_stale: cursor revision {cursor}, index revision {current}")]
    StaleCursor { cursor: u64, current: u64 },
    #[error("hierarchy_cursor_foreign: the cursor belongs to another index")]
    ForeignCursor,
    #[error("hierarchy_cursor_parent_mismatch: cursor under {cursor_parent}, asked under {requested_parent}")]
    ParentMismatch {
        cursor_parent: i64,
        requested_parent: i64,
    },
    #[error("hierarchy_cursor_row_missing: node {node_id} is no longer a child of {parent_id}")]
    CursorRowMissing { node_id: i64, parent_id: i64 },
    #[error("hierarchy_unknown_node: {node_id}")]
    UnknownNode { node_id: i64 },
    #[error("hierarchy_chain_too_deep: node {node_id} exceeds the {ceiling} ancestor ceiling")]
    ChainTooDeep { node_id: i64, ceiling: usize },
}

/// Reads the durable identity and revision of an index.
pub fn identity(connection: &Connection) -> Result<IndexIdentity, HierarchyError> {
    let index_id: String = connection.query_row(
        "SELECT value FROM schema_meta WHERE key = 'index_id'",
        [],
        |row| row.get(0),
    )?;
    let revision = read_revision(connection)?;
    Ok(IndexIdentity {
        index_id,
        revision,
    })
}

pub(crate) fn read_revision(connection: &Connection) -> rusqlite::Result<u64> {
    let raw: String = connection.query_row(
        "SELECT value FROM schema_meta WHERE key = 'index_revision'",
        [],
        |row| row.get(0),
    )?;
    Ok(raw.parse::<u64>().unwrap_or(0))
}

/// Advances the revision by exactly one.
///
/// Called **inside** the transaction that replaces the rows, so the revision
/// and the data a reader can see move together or not at all. A cursor issued
/// before the rebuild is stale the moment the rebuild becomes visible.
pub(crate) fn advance_revision(connection: &Connection) -> rusqlite::Result<u64> {
    let next = read_revision(connection)?.saturating_add(1);
    connection.execute(
        "INSERT OR REPLACE INTO schema_meta(key, value) VALUES ('index_revision', ?1)",
        [next.to_string()],
    )?;
    Ok(next)
}

/// One bounded page of direct children, in the canonical order.
///
/// `after` continues strictly past the row it names. It is validated against
/// the live index first: a cursor from another index, from another revision or
/// from another parent is **refused**, never quietly reinterpreted.
///
/// The query asks for one row more than the page holds. That extra row is the
/// whole answer to "is there a next page?", and it costs one index step rather
/// than a second query or a count.
pub fn children_page(
    connection: &Connection,
    parent_id: i64,
    page_size: usize,
    after: Option<&ChildCursor>,
) -> Result<ChildrenPage, HierarchyError> {
    let identity = identity(connection)?;
    let page_size = page_size.clamp(1, MAX_CHILDREN_PAGE_SIZE);
    let total_direct_children = direct_child_count(connection, parent_id)?;

    let resume = match after {
        None => None,
        Some(cursor) => {
            if cursor.index_id != identity.index_id {
                return Err(HierarchyError::ForeignCursor);
            }
            if cursor.revision != identity.revision {
                return Err(HierarchyError::StaleCursor {
                    cursor: cursor.revision,
                    current: identity.revision,
                });
            }
            if cursor.parent_id != parent_id {
                return Err(HierarchyError::ParentMismatch {
                    cursor_parent: cursor.parent_id,
                    requested_parent: parent_id,
                });
            }
            Some(sort_key(connection, cursor)?)
        }
    };

    // One more than the page, so a full page and a finished page are told
    // apart by an observation instead of a guess.
    let probe = page_size as i64 + 1;
    let mut items = match &resume {
        None => {
            let mut statement = connection.prepare(&first_page_sql())?;
            let rows = statement.query_map(params![parent_id, probe], node_from_row)?;
            rows.collect::<rusqlite::Result<Vec<_>>>()?
        }
        Some(key) => {
            let mut statement = connection.prepare(&continuation_sql())?;
            let rows = statement.query_map(
                params![parent_id, probe, key.rank, key.name_fold, key.id],
                node_from_row,
            )?;
            rows.collect::<rusqlite::Result<Vec<_>>>()?
        }
    };

    let has_more = items.len() > page_size;
    items.truncate(page_size);
    let next_cursor = has_more.then(|| ChildCursor {
        index_id: identity.index_id.clone(),
        revision: identity.revision,
        parent_id,
        after_id: items.last().expect("a full page has a last row").id,
    });

    Ok(ChildrenPage {
        parent_id,
        items,
        next_cursor,
        total_direct_children,
        identity,
        page_size,
    })
}

/// Exact direct children of a node, at the cost of one primary-key lookup.
///
/// Read from the durable `child_count` column, which every producer of the
/// corpus derives from the rows it actually emitted. `TASK-0029` proves that
/// exactness with [`child_count_mismatches`] rather than assuming it; nothing
/// here recounts 250 000 rows for a number the index already holds.
pub fn direct_child_count(
    connection: &Connection,
    parent_id: i64,
) -> Result<u64, HierarchyError> {
    connection
        .query_row(
            "SELECT child_count FROM nodes WHERE id = ?1",
            [parent_id],
            |row| row.get::<_, i64>(0).map(|count| count.max(0) as u64),
        )
        .optional()?
        .ok_or(HierarchyError::UnknownNode { node_id: parent_id })
}

/// The chain from a node up to its root, nearest ancestor first.
///
/// Bounded by depth: one primary-key lookup per level, capped by
/// [`MAX_ANCESTOR_CHAIN`]. Past the ceiling it fails rather than returning a
/// chain it cannot vouch for.
pub fn ancestor_chain(
    connection: &Connection,
    node_id: i64,
) -> Result<Vec<NodeDto>, HierarchyError> {
    let mut statement = connection.prepare(&format!(
        "SELECT {NODE_COLUMNS} FROM nodes WHERE id = ?1"
    ))?;
    let mut fetch = |id: i64| -> Result<NodeDto, HierarchyError> {
        statement
            .query_row([id], node_from_row)
            .optional()?
            .ok_or(HierarchyError::UnknownNode { node_id: id })
    };

    let mut chain = Vec::new();
    let mut cursor = fetch(node_id)?.parent_id;
    while let Some(id) = cursor {
        if chain.len() == MAX_ANCESTOR_CHAIN {
            return Err(HierarchyError::ChainTooDeep {
                node_id,
                ceiling: MAX_ANCESTOR_CHAIN,
            });
        }
        let node = fetch(id)?;
        cursor = node.parent_id;
        chain.push(node);
    }
    Ok(chain)
}

/// Every node whose durable `child_count` disagrees with the rows actually
/// present, as `(node_id, stored, actual)`.
///
/// The invariant behind [`direct_child_count`]. It is deliberately a *query*
/// and not an assertion: a caller decides what a disagreement means, and the
/// tests of `TASK-0029` require the list to be empty on the covered fixtures.
pub fn child_count_mismatches(
    connection: &Connection,
    limit: usize,
) -> rusqlite::Result<Vec<(i64, u64, u64)>> {
    let mut statement = connection.prepare(
        "SELECT parent.id, parent.child_count, COUNT(child.id)
         FROM nodes parent
         LEFT JOIN nodes child ON child.parent_id = parent.id
         GROUP BY parent.id
         HAVING parent.child_count != COUNT(child.id)
         LIMIT ?1",
    )?;
    let rows = statement.query_map([limit as i64], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, i64>(1)?.max(0) as u64,
            row.get::<_, i64>(2)?.max(0) as u64,
        ))
    })?;
    rows.collect()
}

/// The `EXPLAIN QUERY PLAN` of the page queries, verbatim.
///
/// Exposed because `DEC-0030 §E` makes the plan a **structural criterion**, not
/// a curiosity: the campaigns publish it and the tests assert on it, so the
/// claim "index-driven, no temporary sort" is checked against SQLite rather
/// than asserted in prose.
pub fn children_page_plan(
    connection: &Connection,
    continuation: bool,
) -> rusqlite::Result<Vec<String>> {
    // The very strings [`children_page`] executes, so a plan can never be
    // published for a query the product does not actually run.
    let sql = if continuation {
        continuation_sql()
    } else {
        first_page_sql()
    };
    let mut statement = connection.prepare(&format!("EXPLAIN QUERY PLAN {sql}"))?;
    // Representative bindings: SQLite needs every placeholder filled to plan,
    // and none of these values changes the plan it chooses.
    let bindings: Vec<Box<dyn rusqlite::ToSql>> = if continuation {
        vec![
            Box::new(1i64),
            Box::new(100i64),
            Box::new(1i64),
            Box::new("n"),
            Box::new(1i64),
        ]
    } else {
        vec![Box::new(1i64), Box::new(100i64)]
    };
    let rows = statement.query_map(rusqlite::params_from_iter(bindings.iter()), |row| {
        row.get::<_, String>(3)
    })?;
    rows.collect()
}

/// The first page: parent equality, canonical order, bounded limit.
fn first_page_sql() -> String {
    format!(
        "SELECT {NODE_COLUMNS} FROM nodes WHERE parent_id = ?1
         ORDER BY {CHILD_ORDER} LIMIT ?2"
    )
}

/// The continuation, as a **row-value comparison**.
///
/// This shape, and only this shape, lets SQLite seek straight to the resume
/// position instead of walking the siblings that precede it. Expanding it into
/// `rank > ? OR (rank = ? AND ...)` is logically identical and measured an
/// order of magnitude slower, because the planner then scans and filters.
/// There is deliberately **no `OFFSET`** here.
fn continuation_sql() -> String {
    format!(
        "SELECT {NODE_COLUMNS} FROM nodes
         WHERE parent_id = ?1 AND (child_order_rank, name_fold, id) > (?3, ?4, ?5)
         ORDER BY {CHILD_ORDER} LIMIT ?2"
    )
}

/// The sort key of the row a cursor resumes after.
struct SortKey {
    rank: i64,
    name_fold: String,
    id: i64,
}

fn sort_key(connection: &Connection, cursor: &ChildCursor) -> Result<SortKey, HierarchyError> {
    connection
        .query_row(
            "SELECT child_order_rank, name_fold FROM nodes WHERE id = ?1 AND parent_id = ?2",
            [cursor.after_id, cursor.parent_id],
            |row| {
                Ok(SortKey {
                    rank: row.get(0)?,
                    name_fold: row.get(1)?,
                    id: cursor.after_id,
                })
            },
        )
        .optional()?
        .ok_or(HierarchyError::CursorRowMissing {
            node_id: cursor.after_id,
            parent_id: cursor.parent_id,
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::NodeKind;
    use crate::index::Index;

    fn node(id: i64, parent: Option<i64>, name: &str, kind: NodeKind) -> NodeDto {
        NodeDto {
            id,
            parent_id: parent,
            name: name.to_string(),
            relative_path: format!("synthetic/{name}-{id}"),
            kind,
            depth: u32::from(parent.is_some()),
            size_bytes: 0,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: 0,
            seen: false,
        }
    }

    /// Builds a one-level corpus with exact child counts, from names alone.
    fn corpus(children: &[(&str, NodeKind)]) -> Vec<NodeDto> {
        let mut nodes = vec![node(1, None, "root", NodeKind::Root)];
        for (offset, (name, kind)) in children.iter().enumerate() {
            nodes.push(node(offset as i64 + 2, Some(1), name, *kind));
        }
        nodes[0].child_count = children.len() as u32;
        nodes
    }

    fn indexed(children: &[(&str, NodeKind)]) -> Index {
        let mut index = Index::in_memory().expect("index");
        index.replace_nodes(&corpus(children)).expect("replace");
        index
    }

    fn names(page: &ChildrenPage) -> Vec<String> {
        page.items.iter().map(|node| node.name.clone()).collect()
    }

    /// Walks every page and returns the ids in the order they were rendered.
    fn walk(index: &Index, parent: i64, page_size: usize) -> Vec<i64> {
        let mut ids = Vec::new();
        let mut cursor = None;
        loop {
            let page = index
                .children_page(parent, page_size, cursor.as_ref())
                .expect("page");
            ids.extend(page.items.iter().map(|node| node.id));
            match page.next_cursor {
                Some(next) => cursor = Some(next),
                None => break,
            }
        }
        ids
    }

    #[test]
    fn an_empty_folder_pages_to_nothing_and_offers_no_cursor() {
        let index = indexed(&[]);
        let page = index.children_page(1, 100, None).expect("page");
        assert!(page.items.is_empty());
        assert_eq!(page.next_cursor, None);
        assert_eq!(page.total_direct_children, 0);
    }

    #[test]
    fn a_single_child_fills_one_page_and_ends_it() {
        let index = indexed(&[("only.txt", NodeKind::File)]);
        let page = index.children_page(1, 100, None).expect("page");
        assert_eq!(names(&page), vec!["only.txt"]);
        assert_eq!(page.next_cursor, None, "one row is not a full page");
        assert_eq!(page.total_direct_children, 1);
    }

    #[test]
    fn directories_come_first_then_case_insensitive_name_then_id() {
        let index = indexed(&[
            ("zeta.txt", NodeKind::File),
            ("Beta", NodeKind::Directory),
            ("alpha.txt", NodeKind::File),
            ("Alpha", NodeKind::Directory),
            ("skipped-item", NodeKind::Skipped),
            ("Zebra.txt", NodeKind::File),
        ]);
        let page = index.children_page(1, 100, None).expect("page");
        assert_eq!(
            names(&page),
            vec![
                // Directories first, among themselves NOCASE by name.
                "Alpha",
                "Beta",
                // Then everything else, files and skipped entries together.
                "alpha.txt",
                "skipped-item",
                "Zebra.txt",
                "zeta.txt",
            ],
            "DEC-0030 §A order"
        );
    }

    #[test]
    fn the_fold_orders_exactly_as_collate_nocase_would() {
        // Mixed case, duplicates, punctuation and non-ASCII: NOCASE folds only
        // ASCII, and so does `lower()`. The two orders must coincide, or the
        // functional order changed silently.
        let children = [
            ("Zebra", NodeKind::File),
            ("apple", NodeKind::File),
            ("Apple", NodeKind::File),
            ("APPLE", NodeKind::File),
            ("_under", NodeKind::File),
            ("Éclair", NodeKind::File),
            ("éclair", NodeKind::File),
            ("banana", NodeKind::File),
            ("0-first", NodeKind::File),
            ("z", NodeKind::File),
        ];
        let index = indexed(&children);
        let by_page = walk(&index, 1, 3);
        let by_legacy_order: Vec<i64> = index
            .connection_for_bench()
            .prepare(
                "SELECT id FROM nodes WHERE parent_id = 1
                 ORDER BY kind = 'directory' DESC, name COLLATE NOCASE, id",
            )
            .expect("prepare")
            .query_map([], |row| row.get(0))
            .expect("query")
            .collect::<rusqlite::Result<Vec<_>>>()
            .expect("rows");
        assert_eq!(
            by_page, by_legacy_order,
            "the keyset order must be the pre-existing functional order"
        );
    }

    #[test]
    fn identical_names_stay_totally_ordered_by_id() {
        let index = indexed(&[
            ("same.txt", NodeKind::File),
            ("same.txt", NodeKind::File),
            ("SAME.TXT", NodeKind::File),
            ("Same.Txt", NodeKind::File),
        ]);
        // Ids 2..5 were inserted in that order and every name folds equal, so
        // the id tie-break is the only thing deciding, and it must decide.
        assert_eq!(walk(&index, 1, 1), vec![2, 3, 4, 5]);
        assert_eq!(walk(&index, 1, 2), vec![2, 3, 4, 5]);
        assert_eq!(walk(&index, 1, 100), vec![2, 3, 4, 5]);
    }

    #[test]
    fn successive_pages_never_duplicate_and_never_omit() {
        let children: Vec<(String, NodeKind)> = (0..97)
            .map(|index| {
                // Half the names collide on case, so paging cannot lean on
                // name uniqueness anywhere.
                let name = if index % 2 == 0 {
                    format!("Item-{:03}", index / 2)
                } else {
                    format!("item-{:03}", index / 2)
                };
                (
                    name,
                    if index % 7 == 0 {
                        NodeKind::Directory
                    } else {
                        NodeKind::File
                    },
                )
            })
            .collect();
        let borrowed: Vec<(&str, NodeKind)> = children
            .iter()
            .map(|(name, kind)| (name.as_str(), *kind))
            .collect();
        let index = indexed(&borrowed);

        let expected: Vec<i64> = (2..99).collect();
        for page_size in [1, 2, 5, 10, 96, 97, 98, 500] {
            let walked = walk(&index, 1, page_size);
            let mut sorted = walked.clone();
            sorted.sort_unstable();
            sorted.dedup();
            assert_eq!(sorted.len(), walked.len(), "page size {page_size} duplicated");
            assert_eq!(sorted, expected, "page size {page_size} omitted or invented");
            assert_eq!(
                walked,
                walk(&index, 1, 97),
                "page size {page_size} changed the order"
            );
        }
    }

    #[test]
    fn a_cursor_on_the_last_row_yields_an_honest_empty_page() {
        let index = indexed(&[
            ("a.txt", NodeKind::File),
            ("b.txt", NodeKind::File),
            ("c.txt", NodeKind::File),
        ]);
        // A page that exactly consumes the siblings still reports no cursor.
        let exact = index.children_page(1, 3, None).expect("exact page");
        assert_eq!(exact.items.len(), 3);
        assert_eq!(exact.next_cursor, None);

        // A smaller page hands back a cursor; consuming it empties the set.
        let first = index.children_page(1, 2, None).expect("first");
        let cursor = first.next_cursor.expect("more rows remain");
        let second = index.children_page(1, 2, Some(&cursor)).expect("second");
        assert_eq!(names(&second), vec!["c.txt"]);
        let last_row = ChildCursor {
            after_id: second.items[0].id,
            ..cursor
        };
        let past_the_end = index.children_page(1, 2, Some(&last_row)).expect("past end");
        assert!(past_the_end.items.is_empty());
        assert_eq!(past_the_end.next_cursor, None);
        assert_eq!(
            past_the_end.total_direct_children, 3,
            "an empty page still states the exact total"
        );
    }

    #[test]
    fn a_cursor_from_another_revision_is_refused_as_stale() {
        let mut index = Index::in_memory().expect("index");
        let corpus = corpus(&[
            ("a.txt", NodeKind::File),
            ("b.txt", NodeKind::File),
            ("c.txt", NodeKind::File),
        ]);
        index.replace_nodes(&corpus).expect("build");
        let before = index.identity().expect("identity").revision;
        let cursor = index
            .children_page(1, 1, None)
            .expect("page")
            .next_cursor
            .expect("cursor");

        index.replace_nodes(&corpus).expect("rebuild");
        let after = index.identity().expect("identity").revision;
        assert_eq!(after, before + 1, "a rebuild must advance the revision");

        match index.children_page(1, 1, Some(&cursor)) {
            Err(HierarchyError::StaleCursor { cursor, current }) => {
                assert_eq!((cursor, current), (before, after));
            }
            other => panic!("a stale cursor must be refused, got {other:?}"),
        }
    }

    #[test]
    fn two_independent_indexes_share_neither_identity_nor_cursor() {
        let left = indexed(&[("a.txt", NodeKind::File), ("b.txt", NodeKind::File)]);
        let right = indexed(&[("a.txt", NodeKind::File), ("b.txt", NodeKind::File)]);
        let left_id = left.identity().expect("left");
        let right_id = right.identity().expect("right");
        assert_ne!(left_id.index_id, right_id.index_id);
        assert_eq!(
            left_id.revision, right_id.revision,
            "the counters agree, which is exactly why the identity must not"
        );

        let cursor = left
            .children_page(1, 1, None)
            .expect("page")
            .next_cursor
            .expect("cursor");
        assert!(matches!(
            right.children_page(1, 1, Some(&cursor)),
            Err(HierarchyError::ForeignCursor)
        ));
    }

    #[test]
    fn a_cursor_is_refused_under_a_different_parent() {
        let mut nodes = corpus(&[("child.txt", NodeKind::File), ("other.txt", NodeKind::File)]);
        nodes.push(node(9, Some(1), "sibling-folder", NodeKind::Directory));
        nodes[0].child_count = 3;
        let mut index = Index::in_memory().expect("index");
        index.replace_nodes(&nodes).expect("replace");

        let cursor = index
            .children_page(1, 1, None)
            .expect("page")
            .next_cursor
            .expect("cursor");
        match index.children_page(9, 1, Some(&cursor)) {
            Err(HierarchyError::ParentMismatch {
                cursor_parent,
                requested_parent,
            }) => assert_eq!((cursor_parent, requested_parent), (1, 9)),
            other => panic!("a cursor must not travel between parents, got {other:?}"),
        }
    }

    #[test]
    fn a_cursor_token_carries_identifiers_and_nothing_else() {
        let cursor = ChildCursor {
            index_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7".to_string(),
            revision: 42,
            parent_id: 17,
            after_id: 8_123,
        };
        let token = cursor.encode();
        assert_eq!(ChildCursor::decode(&token).expect("round trip"), cursor);
        assert!(!token.contains('/') && !token.contains('\\') && !token.contains(':'));
        assert!(!token.to_ascii_lowercase().contains("offset"));
        for malformed in [
            "",
            "ftc2.7c9e6679.1.1.1",
            "ftc1.7c9e6679.1.1",
            "ftc1.7c9e6679.1.1.1.1",
            "ftc1..1.1.1",
            "ftc1.7c9e6679.x.1.1",
            "ftc1.7c9e6679.-1.1.1",
        ] {
            assert!(
                matches!(
                    ChildCursor::decode(malformed),
                    Err(HierarchyError::MalformedCursor)
                ),
                "{malformed:?} must not decode"
            );
        }
    }

    #[test]
    fn a_page_size_is_capped_and_never_unbounded() {
        let children: Vec<(String, NodeKind)> = (0..MAX_CHILDREN_PAGE_SIZE + 50)
            .map(|index| (format!("f-{index:04}.txt"), NodeKind::File))
            .collect();
        let borrowed: Vec<(&str, NodeKind)> = children
            .iter()
            .map(|(name, kind)| (name.as_str(), *kind))
            .collect();
        let index = indexed(&borrowed);

        let page = index
            .children_page(1, usize::MAX, None)
            .expect("capped page");
        assert_eq!(page.page_size, MAX_CHILDREN_PAGE_SIZE);
        assert_eq!(page.items.len(), MAX_CHILDREN_PAGE_SIZE);
        assert!(page.next_cursor.is_some(), "the rest stays reachable");
        assert_eq!(
            page.total_direct_children,
            MAX_CHILDREN_PAGE_SIZE as u64 + 50,
            "the exact total is stated even though the page is capped"
        );

        let zero = index.children_page(1, 0, None).expect("floor");
        assert_eq!(zero.page_size, 1, "a page of zero would render nothing");
    }

    #[test]
    fn the_durable_child_count_matches_the_rows_actually_present() {
        let index = indexed(&[
            ("a", NodeKind::Directory),
            ("b.txt", NodeKind::File),
            ("c.txt", NodeKind::File),
        ]);
        assert_eq!(
            child_count_mismatches(index.connection_for_bench(), 16).expect("audit"),
            Vec::new()
        );
        assert_eq!(index.direct_child_count(1).expect("count"), 3);
        assert_eq!(index.direct_child_count(2).expect("leaf"), 0);
        assert!(matches!(
            index.direct_child_count(9_999),
            Err(HierarchyError::UnknownNode { node_id: 9_999 })
        ));
    }

    #[test]
    fn the_audit_reports_a_count_that_lies() {
        // A corpus whose `child_count` was not derived from its own rows. The
        // audit exists precisely so this cannot pass unnoticed.
        let mut nodes = corpus(&[("a.txt", NodeKind::File)]);
        nodes[0].child_count = 7;
        let mut index = Index::in_memory().expect("index");
        index.replace_nodes(&nodes).expect("replace");
        assert_eq!(
            child_count_mismatches(index.connection_for_bench(), 16).expect("audit"),
            vec![(1, 7, 1)]
        );
    }

    #[test]
    fn the_ancestor_chain_is_bounded_and_reaches_the_root() {
        let mut nodes = vec![node(1, None, "root", NodeKind::Root)];
        for level in 1..=12i64 {
            let mut directory = node(
                level + 1,
                Some(level),
                &format!("level-{level:02}"),
                NodeKind::Directory,
            );
            directory.depth = level as u32;
            nodes.push(directory);
        }
        for parent in nodes.iter_mut() {
            parent.child_count = 1;
        }
        nodes.last_mut().expect("deepest").child_count = 0;
        let mut index = Index::in_memory().expect("index");
        index.replace_nodes(&nodes).expect("replace");

        let chain = index.ancestor_chain(13).expect("chain");
        assert_eq!(chain.len(), 12, "twelve levels above the deepest node");
        assert_eq!(chain.first().expect("nearest").id, 12);
        assert_eq!(chain.last().expect("root").kind, NodeKind::Root);
        assert!(chain.len() <= MAX_ANCESTOR_CHAIN);
        assert!(index.ancestor_chain(1).expect("root chain").is_empty());
        assert!(matches!(
            index.ancestor_chain(4_242),
            Err(HierarchyError::UnknownNode { node_id: 4_242 })
        ));
    }

    #[test]
    fn the_page_queries_are_index_driven_with_no_temporary_sort() {
        let index = indexed(&[("a.txt", NodeKind::File), ("b.txt", NodeKind::File)]);
        let connection = index.connection_for_bench();
        for continuation in [false, true] {
            let plan = children_page_plan(connection, continuation)
                .expect("plan")
                .join(" | ");
            assert!(
                plan.contains("idx_nodes_child_order"),
                "continuation={continuation}: the child-order index must be used, got {plan}"
            );
            assert!(
                !plan.to_ascii_uppercase().contains("TEMP B-TREE"),
                "continuation={continuation}: a temporary sort defeats the whole point, got {plan}"
            );
            assert!(
                !plan.contains("SCAN nodes"),
                "continuation={continuation}: the corpus must not be scanned, got {plan}"
            );
        }
    }
}
