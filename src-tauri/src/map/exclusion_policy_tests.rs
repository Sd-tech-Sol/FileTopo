//! `TASK-0048` integration proofs: catalogue isolation, journal-silent policy
//! rebases, absent source, and W-B filtering.

use super::watch_scope_tests::{Fx, dump_rows, journal_of};
use super::{
    exclusion_policy_state, open_store, refresh_map, register_real_root, replace_exclusion_policy,
};
use crate::map::brains::BrainCatalog;
use crate::map::watch_ops;
use crate::scope::ScopeRequest;
use std::fs;

fn rules(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_string()).collect()
}

#[test]
fn unknown_brain_is_refused_and_a_registered_brain_defaults_to_empty() {
    let fx = Fx::new("unknown-brain");
    let catalog = BrainCatalog::open(&fx.paths.catalog_database()).expect("catalogue");
    assert!(catalog.exclusion_policy("brain-missing").is_err());
    assert!(
        catalog
            .replace_exclusion_policy("brain-missing", &rules(&["cache"]))
            .is_err()
    );
    assert!(
        catalog
            .exclusion_policy(&fx.brain.brain_id)
            .expect("registered brain")
            .rules()
            .is_empty()
    );
}

#[test]
fn two_brains_on_the_same_source_keep_independent_policies() {
    let fx = Fx::new("shared-source");
    let other = register_real_root(&fx.paths, &fx.root).expect("second brain");
    refresh_map(&fx.paths, &other).expect("second baseline");

    let alpha =
        replace_exclusion_policy(&fx.paths, &fx.brain, &rules(&["small"])).expect("alpha policy");
    let gamma =
        replace_exclusion_policy(&fx.paths, &other, &rules(&["alpha"])).expect("gamma policy");

    assert!(!alpha.application_required);
    assert!(!gamma.application_required);
    assert_eq!(alpha.rules, rules(&["small"]));
    assert_eq!(gamma.rules, rules(&["alpha"]));
    assert_eq!(
        exclusion_policy_state(&fx.paths, &fx.brain)
            .expect("alpha persisted policy")
            .rules,
        rules(&["small"])
    );
    assert_eq!(
        exclusion_policy_state(&fx.paths, &other)
            .expect("gamma persisted policy")
            .rules,
        rules(&["alpha"])
    );
    let alpha_rows = dump_rows(&fx.paths, &fx.brain, false);
    let gamma_rows = dump_rows(&fx.paths, &other, false);
    assert!(
        !alpha_rows
            .keys()
            .any(|path| path == "small" || path.starts_with("small/"))
    );
    assert!(alpha_rows.contains_key("alpha/a1.txt"));
    assert!(
        !gamma_rows
            .keys()
            .any(|path| path == "alpha" || path.starts_with("alpha/"))
    );
    assert!(gamma_rows.contains_key("small/deep/leaf.txt"));
}

#[test]
fn adding_and_removing_policy_rebases_without_source_events() {
    let fx = Fx::new("journal-silent");
    let before = journal_of(&fx.paths, &fx.brain);
    let catalog = BrainCatalog::open(&fx.paths.catalog_database()).expect("catalogue");
    let resume_before = catalog
        .resume_state(&fx.brain.brain_id)
        .expect("resume state");
    let unrelated_id_before: i64 = open_store(&fx.paths, &fx.brain)
        .expect("open before policy")
        .index
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = 'alpha/a1.txt'",
            [],
            |row| row.get(0),
        )
        .expect("unrelated id");

    let added =
        replace_exclusion_policy(&fx.paths, &fx.brain, &rules(&["small"])).expect("add exclusion");
    assert!(!added.application_required);
    assert_eq!(journal_of(&fx.paths, &fx.brain), before);
    assert!(!dump_rows(&fx.paths, &fx.brain, false).contains_key("small/deep/leaf.txt"));

    let removed = replace_exclusion_policy(&fx.paths, &fx.brain, &[]).expect("remove exclusion");
    assert!(!removed.application_required);
    assert_eq!(journal_of(&fx.paths, &fx.brain), before);
    assert!(dump_rows(&fx.paths, &fx.brain, false).contains_key("small/deep/leaf.txt"));
    let unrelated_id_after: i64 = open_store(&fx.paths, &fx.brain)
        .expect("open after policy")
        .index
        .connection
        .query_row(
            "SELECT id FROM nodes WHERE relative_path = 'alpha/a1.txt'",
            [],
            |row| row.get(0),
        )
        .expect("unrelated id after policy");
    assert_eq!(unrelated_id_after, unrelated_id_before);
    assert_eq!(
        catalog
            .resume_state(&fx.brain.brain_id)
            .expect("resume state after policy"),
        resume_before
    );
}

#[test]
fn absent_source_keeps_policy_editable_and_last_index_reliable() {
    let fx = Fx::new("absent-source");
    let rows_before = dump_rows(&fx.paths, &fx.brain, true);
    let journal_before = journal_of(&fx.paths, &fx.brain);
    let moved = fx.root.with_extension("offline");
    fs::rename(&fx.root, &moved).expect("make source absent");

    let pending = replace_exclusion_policy(&fx.paths, &fx.brain, &rules(&["small"]))
        .expect("policy remains writable");
    assert!(pending.application_required);
    assert_eq!(pending.rules, rules(&["small"]));
    assert_eq!(dump_rows(&fx.paths, &fx.brain, true), rows_before);
    assert_eq!(journal_of(&fx.paths, &fx.brain), journal_before);
    assert_eq!(
        exclusion_policy_state(&fx.paths, &fx.brain)
            .expect("read pending")
            .rules,
        rules(&["small"])
    );
}

#[test]
fn w_b_ignores_excluded_requests_and_applies_included_ones_in_a_mixed_burst() {
    let fx = Fx::new("watch-policy");
    replace_exclusion_policy(&fx.paths, &fx.brain, &rules(&["small"])).expect("apply policy");
    fs::write(fx.root.join("small/deep/leaf.txt"), b"excluded changed").expect("excluded mutation");
    fs::write(fx.root.join("alpha/a1.txt"), b"included changed and longer")
        .expect("included mutation");

    let outcome = watch_ops::apply_scopes(
        &fx.paths,
        &fx.brain,
        &[
            ScopeRequest::Point("small/deep/leaf.txt".into()),
            ScopeRequest::Point("alpha/a1.txt".into()),
        ],
        512,
        &|| false,
    )
    .expect("mixed W-B");

    assert!(outcome.applied);
    assert_eq!(outcome.counts.observed, 1, "excluded hint was not observed");
    let journal = journal_of(&fx.paths, &fx.brain);
    assert!(journal.iter().any(|event| event.contains("alpha/a1.txt")));
    assert!(
        !journal
            .iter()
            .any(|event| event.contains("small/deep/leaf.txt"))
    );
}

#[test]
fn corrupt_or_unknown_policy_envelope_is_refused_whole() {
    let fx = Fx::new("corrupt-policy");
    let catalog = BrainCatalog::open(&fx.paths.catalog_database()).expect("catalog");
    catalog
        .put_meta(
            &format!("exclusion_policy.v1.{}", fx.brain.brain_id),
            r#"{"version":99,"rules":["small"]}"#,
        )
        .expect("inject corrupt version");

    let error = exclusion_policy_state(&fx.paths, &fx.brain).expect_err("closed refusal");
    assert!(error.to_string().contains("stored_policy_version_unknown"));
    assert!(
        open_store(&fx.paths, &fx.brain).is_ok(),
        "served Index stays readable"
    );
}
