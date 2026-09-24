//! From a burst of hints to one plan — `TASK-0043` D, `DEC-0041` §3 and §4.
//!
//! A burst becomes **either** a small set of scope requests for a targeted reconciliation
//! (`W-B`), **or** a full verification (`W-C`). It is never anything in between and never
//! "what happened": the operating system's action was dropped at the parser, so nothing
//! here can say `CREATED` or `MOVED` — those words belong to the journal, and the journal
//! is derived from a re-enumeration.
//!
//! A hint whose entry may have changed **membership** of its directory asks for that
//! directory to be re-listed; a hint that only says the entry itself moved asks for that
//! entry alone to be re-observed (see `crate::scope::ScopeRequest`).
//!
//! This step is **purely lexical**: it reads no disk and no Index. Resolving a request
//! to a *safe* scope (one that exists, is the same object, and is not the root) needs
//! both, and happens at apply time (`crate::scope::resolve_scopes`), where a request
//! that is not safe rises to its nearest safe ancestor — which is also how many hints
//! inside one new tree collapse to a single scope.

use super::parser::parent_of;
use super::queue::Drained;
use super::types::WatchReason;
use crate::scope::ScopeRequest;
use std::collections::BTreeSet;

/// What to do with a burst.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Plan {
    /// Look at these — directories to re-list, entries to observe alone — sorted and
    /// distinct.
    Scopes(Vec<ScopeRequest>),
    /// Verify in full, for this reason.
    Full(WatchReason),
}

/// Turns what the queue held into a plan, or `None` when it held nothing.
///
/// * a **loss** → full verification (its reason);
/// * a hint whose entry may have changed **membership** and is **top-level** → the directory
///   that lists it is the root, which has no smaller safe scope → full verification
///   (`DEC-0041` §3: "si le scope sûr devient la racine, traiter comme W-C");
/// * a hint that only says the entry itself moved → that entry alone, wherever it is (a
///   top-level entry included: the root's list of entries is not in doubt);
/// * more distinct requests than `max_scopes` → full verification, which is then cheaper
///   *and* safer than a wide patchwork;
/// * otherwise the distinct requests.
pub(crate) fn plan_burst(drained: &Drained, max_scopes: usize) -> Option<Plan> {
    if let Some(loss) = drained.lost {
        return Some(Plan::Full(loss.as_watch_reason()));
    }
    if drained.hints.is_empty() {
        return None;
    }
    let mut requests: BTreeSet<ScopeRequest> = BTreeSet::new();
    for hint in &drained.hints {
        if hint.membership {
            match parent_of(&hint.path) {
                Some(parent) => {
                    requests.insert(ScopeRequest::List(parent.to_string()));
                }
                None => return Some(Plan::Full(WatchReason::ScopeUnsafe)),
            }
        } else {
            requests.insert(ScopeRequest::Point(hint.path.clone()));
        }
        if requests.len() > max_scopes {
            return Some(Plan::Full(WatchReason::ScopeUnsafe));
        }
    }
    Some(Plan::Scopes(requests.into_iter().collect()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::watch::queue::Hint;
    use crate::watch::types::LossReason;

    fn burst(hints: &[Hint]) -> Drained {
        Drained {
            hints: hints.to_vec(),
            lost: None,
        }
    }

    fn list(path: &str) -> ScopeRequest {
        ScopeRequest::List(path.to_string())
    }

    #[test]
    fn hints_in_the_same_directory_collapse_to_one_request() {
        let plan = plan_burst(
            &burst(&[
                Hint::member("a/b/1.txt"),
                Hint::member("a/b/2.txt"),
                Hint::member("a/b/sub"),
                Hint::member("a/c/x"),
            ]),
            16,
        );
        assert_eq!(plan, Some(Plan::Scopes(vec![list("a/b"), list("a/c")])));
    }

    #[test]
    fn nothing_queued_is_no_plan() {
        assert_eq!(plan_burst(&Drained::default(), 16), None);
    }

    #[test]
    fn a_loss_is_a_full_verification_whatever_hints_came_with_it() {
        for (loss, reason) in [
            (LossReason::OsOverflow, WatchReason::SignalsLost),
            (LossReason::EnumDir, WatchReason::SignalsLost),
            (LossReason::ParserInvalid, WatchReason::SignalsLost),
            (LossReason::HintInvalid, WatchReason::SignalsLost),
            (LossReason::ReaderFailed, WatchReason::SignalsLost),
            (LossReason::Injected, WatchReason::SignalsLost),
            (LossReason::QueueFull, WatchReason::QueueSaturated),
        ] {
            let drained = Drained {
                hints: vec![Hint::member("a/b/c")],
                lost: Some(loss),
            };
            assert_eq!(plan_burst(&drained, 16), Some(Plan::Full(reason)));
        }
    }

    #[test]
    fn a_top_level_entry_that_may_have_changed_membership_has_the_root_as_its_scope() {
        assert_eq!(
            plan_burst(
                &burst(&[Hint::member("a/b/c"), Hint::member("seul.txt")]),
                16
            ),
            Some(Plan::Full(WatchReason::ScopeUnsafe))
        );
    }

    #[test]
    fn a_top_level_entry_that_only_moved_is_observed_alone_and_is_not_the_root_scope() {
        // The operating system reports a directory as modified whenever something inside
        // it changes: without this, every such change would be a full verification.
        assert_eq!(
            plan_burst(
                &burst(&[Hint::modified("dossier"), Hint::member("dossier/f.txt")]),
                16
            ),
            Some(Plan::Scopes(vec![
                list("dossier"),
                ScopeRequest::Point("dossier".to_string())
            ]))
        );
    }

    #[test]
    fn more_distinct_requests_than_the_bound_is_a_full_verification() {
        let hints: Vec<Hint> = (0..5)
            .map(|index| Hint::member(&format!("d{index}/f.txt")))
            .collect();
        let drained = burst(&hints);
        assert!(matches!(plan_burst(&drained, 5), Some(Plan::Scopes(_))));
        assert_eq!(
            plan_burst(&drained, 4),
            Some(Plan::Full(WatchReason::ScopeUnsafe))
        );
    }

    #[test]
    fn the_operating_system_action_cannot_appear_in_a_plan() {
        // The only inputs are relative names and one bit: a plan is where to look, or a
        // reason. `Hint` has no field a nature could travel in.
        let plan = plan_burst(&burst(&[Hint::member("x/y/z.txt")]), 16).expect("plan");
        match plan {
            Plan::Scopes(requests) => assert_eq!(requests, vec![list("x/y")]),
            Plan::Full(_) => panic!("a deep, single hint must stay targeted"),
        }
    }
}
