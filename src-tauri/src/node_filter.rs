//! Dynamic filters over the canonical Index — `TASK-0039`, `DEC-0037`.
//!
//! A filter is a **read-only projection parameter** applied by SQLite to the
//! one canonical `nodes` table. It never becomes a second index and never
//! reaches the frontend as a corpus: the caller gets one exact total and one
//! bounded, keyset-ordered page of matches.
//!
//! Three closed groups, combined by AND (kinds combine by OR inside their own
//! group):
//!
//! * **state** — `ALL | NEW | UNSEEN`, derived from the change journal by the
//!   very predicate `DEC-0036` defines ([`crate::change_journal::unseen_predicate`]).
//!   `nodes.seen`, inherited from the 0.1 prototype, is **never** read here;
//! * **kinds** — a set of `DIRECTORY | FILE | SKIPPED` (empty = every kind);
//! * **availability** — `ALL | LOCAL | ONLINE_ONLY`, from the canonical
//!   `nodes.online_only` column. Nothing is hydrated, no content is read.
//!
//! The root is never a match. Every SQL fragment below is built from closed
//! enums and constants; no caller-supplied string is ever concatenated.

use crate::change_journal::{seen_watermark, unseen_predicate};
use crate::domain::NodeDto;
use crate::hierarchy::{HierarchyError, IndexIdentity};
use crate::index::{Index, NODE_COLUMNS, node_from_row};
use rusqlite::{Connection, ToSql};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Cursor token prefix — versioned, distinct from the child cursor (`ftc1`) and
/// the journal cursor (`fjc1`), so one kind of token can never be mistaken for
/// another.
const CURSOR_TAG: &str = "ftf1";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StateFilter {
    /// No new/unseen constraint. Does not cancel the other groups.
    #[default]
    All,
    /// A present node with at least one unseen `CREATED` event.
    New,
    /// A present node with at least one unseen event of any nature.
    Unseen,
}

/// Declaration order **is** the canonical order of a kind set.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KindFilter {
    Directory,
    File,
    Skipped,
}

impl KindFilter {
    fn column_value(self) -> &'static str {
        match self {
            Self::Directory => "directory",
            Self::File => "file",
            Self::Skipped => "skipped",
        }
    }
    fn token(self) -> &'static str {
        match self {
            Self::Directory => "DIRECTORY",
            Self::File => "FILE",
            Self::Skipped => "SKIPPED",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AvailabilityFilter {
    #[default]
    All,
    Local,
    OnlineOnly,
}

/// The closed, serialisable filter. Unknown fields and unknown values are
/// refused at deserialisation, never guessed at.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields, default)]
pub struct NodeFilter {
    pub state: StateFilter,
    pub kinds: Vec<KindFilter>,
    pub availability: AvailabilityFilter,
}

impl NodeFilter {
    /// The canonical form: duplicated kinds removed, kinds in canonical order.
    pub fn normalized(&self) -> Self {
        let mut kinds = self.kinds.clone();
        kinds.sort();
        kinds.dedup();
        Self {
            state: self.state,
            kinds,
            availability: self.availability,
        }
    }

    /// `ALL` state, no kind, `ALL` availability — the normal projection.
    pub fn is_inactive(&self) -> bool {
        self.state == StateFilter::All
            && self.kinds.is_empty()
            && self.availability == AvailabilityFilter::All
    }

    /// A stable, dot-free string of the **normalised** filter: what a cursor is
    /// bound to. Two filters have the same canonical form exactly when they
    /// select the same nodes.
    pub fn canonical(&self) -> String {
        let n = self.normalized();
        let state = match n.state {
            StateFilter::All => "ALL",
            StateFilter::New => "NEW",
            StateFilter::Unseen => "UNSEEN",
        };
        let availability = match n.availability {
            AvailabilityFilter::All => "ALL",
            AvailabilityFilter::Local => "LOCAL",
            AvailabilityFilter::OnlineOnly => "ONLINE_ONLY",
        };
        let kinds = n
            .kinds
            .iter()
            .map(|kind| kind.token())
            .collect::<Vec<_>>()
            .join("+");
        format!("{state}:{kinds}:{availability}")
    }

    /// The `WHERE` conjunction, over the alias `n`, and whether it needs the
    /// `:wm` (seen watermark) parameter. Only constants and closed-enum values.
    fn predicate(&self) -> (String, bool) {
        let n = self.normalized();
        let mut clauses = vec!["n.kind != 'root'".to_string()];
        if !n.kinds.is_empty() {
            let list = n
                .kinds
                .iter()
                .map(|kind| format!("'{}'", kind.column_value()))
                .collect::<Vec<_>>()
                .join(", ");
            clauses.push(format!("n.kind IN ({list})"));
        }
        match n.availability {
            AvailabilityFilter::All => {}
            AvailabilityFilter::Local => clauses.push("n.online_only = 0".into()),
            AvailabilityFilter::OnlineOnly => clauses.push("n.online_only = 1".into()),
        }
        let needs_watermark = n.state != StateFilter::All;
        let unseen = unseen_predicate(":wm");
        match n.state {
            StateFilter::All => {}
            StateFilter::New => clauses.push(format!(
                "EXISTS (SELECT 1 FROM change_events e \
                 WHERE e.node_id = n.id AND e.nature = 'CREATED' AND {unseen})"
            )),
            StateFilter::Unseen => clauses.push(format!(
                "EXISTS (SELECT 1 FROM change_events e WHERE e.node_id = n.id AND {unseen})"
            )),
        }
        (clauses.join(" AND "), needs_watermark)
    }

    fn total_sql(&self) -> (String, bool) {
        let (predicate, needs_watermark) = self.predicate();
        (
            format!("SELECT COUNT(*) FROM nodes n WHERE {predicate}"),
            needs_watermark,
        )
    }

    /// The page query: keyset on the primary key, **no `OFFSET`**, one bound
    /// `LIMIT`. `id` ascends in scan order, so siblings stay together and the
    /// order is a total, deterministic one.
    fn page_sql(&self) -> (String, bool) {
        let (predicate, needs_watermark) = self.predicate();
        let columns = page_columns();
        (
            format!(
                "SELECT {columns} FROM nodes n WHERE n.id > :after AND {predicate} \
                 ORDER BY n.id LIMIT :limit"
            ),
            needs_watermark,
        )
    }
}

/// [`NODE_COLUMNS`] with the historical `seen` column replaced by a constant:
/// the row shape [`node_from_row`] expects, without the query ever naming
/// `nodes.seen` (`DEC-0037` §1). The DTO built from it says nothing about
/// seen-ness — the journal does.
fn page_columns() -> String {
    NODE_COLUMNS
        .strip_suffix("seen")
        .map_or_else(|| NODE_COLUMNS.to_string(), |head| format!("{head}0"))
}

/// Where a filtered page resumes. Identifiers, a revision and the canonical
/// filter — no path, no name, no `OFFSET` position.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FilterCursor {
    pub index_id: String,
    pub revision: u64,
    pub canonical: String,
    /// The last match already served. Resumption is *strictly after* it.
    pub after_id: i64,
}

impl FilterCursor {
    pub fn encode(&self) -> String {
        format!(
            "{CURSOR_TAG}.{}.{}.{}.{}",
            self.index_id, self.revision, self.canonical, self.after_id
        )
    }

    pub fn decode(token: &str) -> Result<Self, FilterError> {
        let mut parts = token.split('.');
        if parts.next() != Some(CURSOR_TAG) {
            return Err(FilterError::MalformedCursor);
        }
        let mut field = || parts.next().ok_or(FilterError::MalformedCursor);
        let index_id = field()?.to_string();
        let revision = field()?
            .parse::<u64>()
            .map_err(|_| FilterError::MalformedCursor)?;
        let canonical = field()?.to_string();
        let after_id = field()?
            .parse::<i64>()
            .map_err(|_| FilterError::MalformedCursor)?;
        if index_id.is_empty() || canonical.is_empty() || parts.next().is_some() {
            return Err(FilterError::MalformedCursor);
        }
        Ok(Self {
            index_id,
            revision,
            canonical,
            after_id,
        })
    }
}

#[derive(Debug, Error)]
pub enum FilterError {
    #[error("filter_sqlite_failed: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("{0}")]
    Hierarchy(#[from] HierarchyError),
    #[error("filter_cursor_malformed")]
    MalformedCursor,
    #[error("filter_cursor_foreign: the cursor belongs to another index")]
    ForeignCursor,
    /// The index was rebuilt under the cursor. Refused, never continued.
    #[error("filter_cursor_stale: cursor revision {cursor}, index revision {current}")]
    StaleCursor { cursor: u64, current: u64 },
    #[error("filter_cursor_filter_mismatch: the cursor was issued for another filter")]
    FilterMismatch,
}

/// One bounded read of the matches, with the exact total.
#[derive(Debug, Clone, PartialEq)]
pub struct FilteredMatches {
    pub identity: IndexIdentity,
    /// Exact number of matching nodes in the whole brain, computed by SQLite.
    pub total: u64,
    /// At most `limit + 1` matches after the cursor, in id order. The extra row
    /// is only the answer to "is there more?"; the caller decides how many of
    /// the rows it consumes.
    pub rows: Vec<NodeDto>,
    pub limit: usize,
}

/// The largest page any caller can ask a filter for.
pub const MAX_FILTER_PAGE: usize = 256;

impl Index {
    /// The exact total and one keyset page of matches, from **one** read
    /// snapshot — `DEC-0037` §3. Inside a caller's transaction it joins it;
    /// alone, it opens its own.
    pub fn filtered_matches(
        &self,
        filter: &NodeFilter,
        limit: usize,
        after: Option<&FilterCursor>,
    ) -> Result<FilteredMatches, FilterError> {
        filtered_matches(&self.connection, filter, limit, after)
    }
}

pub(crate) fn filtered_matches(
    connection: &Connection,
    filter: &NodeFilter,
    limit: usize,
    after: Option<&FilterCursor>,
) -> Result<FilteredMatches, FilterError> {
    let snapshot = connection
        .is_autocommit()
        .then(|| connection.unchecked_transaction())
        .transpose()?;
    let identity = crate::hierarchy::identity(connection)?;
    if let Some(cursor) = after {
        if cursor.index_id != identity.index_id {
            return Err(FilterError::ForeignCursor);
        }
        if cursor.revision != identity.revision {
            return Err(FilterError::StaleCursor {
                cursor: cursor.revision,
                current: identity.revision,
            });
        }
        if cursor.canonical != filter.canonical() {
            return Err(FilterError::FilterMismatch);
        }
    }
    let limit = limit.clamp(1, MAX_FILTER_PAGE);
    let after_id = after.map_or(0, |cursor| cursor.after_id);
    let probe = limit as i64 + 1;

    let (total_sql, needs_watermark) = filter.total_sql();
    let watermark = if needs_watermark {
        Some(seen_watermark(connection)?)
    } else {
        None
    };
    let mut total_params: Vec<(&str, &dyn ToSql)> = Vec::new();
    if let Some(watermark) = watermark.as_ref() {
        total_params.push((":wm", watermark));
    }
    let total: i64 = connection.query_row(&total_sql, total_params.as_slice(), |row| row.get(0))?;

    let (page_sql, _) = filter.page_sql();
    let mut page_params: Vec<(&str, &dyn ToSql)> = vec![(":after", &after_id), (":limit", &probe)];
    if let Some(watermark) = watermark.as_ref() {
        page_params.push((":wm", watermark));
    }
    let mut statement = connection.prepare(&page_sql)?;
    let rows = statement
        .query_map(page_params.as_slice(), node_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(statement);
    if let Some(snapshot) = snapshot {
        snapshot.commit()?;
    }
    Ok(FilteredMatches {
        identity,
        total: total.max(0) as u64,
        rows,
        limit,
    })
}

/// `EXPLAIN QUERY PLAN` of the page query, verbatim — the plan is a structural
/// claim (`SEARCH nodes` by primary key, no temporary sort), so it is checked
/// against SQLite rather than asserted in prose.
#[cfg(test)]
pub(crate) fn page_plan(
    connection: &Connection,
    filter: &NodeFilter,
) -> rusqlite::Result<Vec<String>> {
    let (sql, needs_watermark) = filter.page_sql();
    let mut statement = connection.prepare(&format!("EXPLAIN QUERY PLAN {sql}"))?;
    let (after, limit, watermark) = (0i64, 10i64, 0i64);
    let mut params: Vec<(&str, &dyn ToSql)> = vec![(":after", &after), (":limit", &limit)];
    if needs_watermark {
        params.push((":wm", &watermark));
    }
    let rows = statement.query_map(params.as_slice(), |row| row.get::<_, String>(3))?;
    rows.collect()
}

#[cfg(test)]
pub(crate) fn page_sql_for_test(filter: &NodeFilter) -> String {
    filter.page_sql().0
}

#[cfg(test)]
pub(crate) fn total_sql_for_test(filter: &NodeFilter) -> String {
    filter.total_sql().0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(json: &str) -> Result<NodeFilter, serde_json::Error> {
        serde_json::from_str(json)
    }

    #[test]
    fn the_default_filter_is_inactive_and_every_group_at_its_default() {
        let filter = NodeFilter::default();
        assert!(filter.is_inactive());
        assert_eq!(filter.canonical(), "ALL::ALL");
        assert!(parse("{}").unwrap().is_inactive());
        assert!(
            parse(r#"{"state":"ALL","kinds":[],"availability":"ALL"}"#)
                .unwrap()
                .is_inactive()
        );
    }

    #[test]
    fn normalisation_removes_duplicates_and_orders_kinds_canonically() {
        let filter = parse(r#"{"kinds":["SKIPPED","FILE","DIRECTORY","FILE"],"state":"NEW"}"#)
            .unwrap()
            .normalized();
        assert_eq!(
            filter.kinds,
            [KindFilter::Directory, KindFilter::File, KindFilter::Skipped]
        );
        assert_eq!(filter.canonical(), "NEW:DIRECTORY+FILE+SKIPPED:ALL");
        // Same selection, different spelling, same canonical form.
        let other = parse(r#"{"state":"NEW","kinds":["DIRECTORY","SKIPPED","FILE"]}"#).unwrap();
        assert_eq!(filter.canonical(), other.canonical());
        assert!(!filter.is_inactive());
        // Any single group makes it active.
        assert!(
            !parse(r#"{"availability":"ONLINE_ONLY"}"#)
                .unwrap()
                .is_inactive()
        );
        assert!(!parse(r#"{"kinds":["FILE"]}"#).unwrap().is_inactive());
        assert!(!parse(r#"{"state":"UNSEEN"}"#).unwrap().is_inactive());
    }

    #[test]
    fn unknown_values_and_unknown_fields_are_refused_never_guessed() {
        for bad in [
            r#"{"state":"RECENT"}"#,
            r#"{"state":"new"}"#,
            r#"{"kinds":["ROOT"]}"#,
            r#"{"kinds":["file"]}"#,
            r#"{"kinds":"FILE"}"#,
            r#"{"availability":"CLOUD"}"#,
            r#"{"query":"x"}"#,
            r#"{"unseenOnly":true}"#,
        ] {
            assert!(parse(bad).is_err(), "{bad} must be refused");
        }
    }

    #[test]
    fn a_cursor_round_trips_and_carries_no_path_or_name() {
        let cursor = FilterCursor {
            index_id: "0123-abcd".into(),
            revision: 7,
            canonical: "NEW:FILE:ONLINE_ONLY".into(),
            after_id: 42,
        };
        let token = cursor.encode();
        assert_eq!(FilterCursor::decode(&token).unwrap(), cursor);
        assert!(token.starts_with("ftf1."));
        assert!(!token.contains('/') && !token.contains('\\') && !token.contains(' '));
        for bad in [
            "",
            "ftf1",
            "ftf1.a.1.NEW::ALL",
            "ftf1.a.x.NEW::ALL.1",
            "ftf1..1.NEW::ALL.1",
        ] {
            assert!(FilterCursor::decode(bad).is_err(), "{bad:?}");
        }
    }
}
