//! `TASK-0029` — scale query foundation bench. **Test-only harness.**
//!
//! Declared `#[cfg(test)]` in `src-tauri/src/lib.rs`, like the `TASK-0028`
//! harness it borrows its corpus from: compiled by `cargo test` and by nothing
//! else — no debug binary, no release binary, no Tauri command, no route, no
//! interface element. It adds **zero** product surface.
//!
//! What it measures is narrow on purpose. `TASK-0028` asked whether "index
//! large, materialise small" could hold at all. `TASK-0029` asks the question
//! `ACTION-0045` left open: **does one page of a hundred children cost the same
//! whether the sibling set holds twenty-five thousand rows or a quarter of a
//! million?** Everything here exists to answer that, and the answer is a
//! measurement, never a promise.
//!
//! Both campaigns are **INDEX-SCALE**: 100 000 and 1 000 000 rows built on the
//! current FileTopo schema from the deterministic `TASK-0028` plan. Neither
//! creates physical files, and neither says anything about a scanner at those
//! sizes — the cost under test is a **query** cost, which depends on what the
//! index holds and not on how it came to hold it.
//!
//! Each run publishes the **old** prototype query beside the new one, against
//! the same database in the same process. A before/after read across two tasks
//! and two machines would prove much less.

pub mod campaigns;

use std::path::PathBuf;

/// Root of the bench sandbox: `<repo>/.filetopo-sandbox/task0029`.
///
/// Inside the repository and ignored by Git since `TASK-0016`, so the bench
/// never writes outside the public repository and never commits a fixture.
/// `CARGO_MANIFEST_DIR` is read at run time rather than through `env!`, which
/// would bake a build-machine path into the binary.
pub fn sandbox_root() -> PathBuf {
    let manifest =
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set by cargo test");
    PathBuf::from(manifest)
        .parent()
        .expect("repository root is the parent of src-tauri")
        .join(".filetopo-sandbox")
        .join("task0029")
}

/// The measured page size, frozen by the `TASK-0029` protocol.
///
/// **Not a product budget.** `DEC-0029` leaves the view budget to a later
/// slice; this is the size at which the scaling question is asked.
pub const MEASURED_PAGE_SIZE: usize = 100;

/// Engineering criterion: at a comparable position, the p95 of a page of
/// [`MEASURED_PAGE_SIZE`] at one million indexed elements must not exceed this
/// multiple of the p95 at one hundred thousand.
///
/// A **criterion of `TASK-0029`**, not a product promise. If it fails, the
/// failure is published; the ceiling does not move.
pub const SCALE_RATIO_CEILING: f64 = 5.0;

/// Refuses to write anything that would leak an identifier or overwrite a seal.
///
/// Three rules, enforced rather than assumed, exactly as `TASK-0028` enforced
/// them: no sealed `X5` name is ever touched, every artifact carries the
/// measurement banner, and no artifact may contain a user name, a host name or
/// a `Users` path — checked on the serialised bytes just before the write.
pub fn write_artifact(name: &str, body: serde_json::Value) -> std::io::Result<PathBuf> {
    assert!(
        !crate::map::commands::PROTECTED_RUN_ARTIFACTS.contains(&name),
        "TASK-0029 never writes a sealed artifact: {name}"
    );
    assert!(
        name.starts_with("TASK-0029-") && name.ends_with(".json"),
        "this bench only writes its own artifacts: {name}"
    );

    let document = serde_json::json!({
        "task": "TASK-0029",
        "title": "Scale Query Foundation — Bounded Hierarchy Paging",
        "status": crate::scale_spike::MEASUREMENT_BANNER,
        "report": "docs/performance/TASK-0029-SCALE-QUERY-REPORT.md",
        "decision": "DEC-0030",
        "reserve": "R8 entière — ces chiffres ne sont publiés nulle part ailleurs.",
        "notAProductClaim":
            "Mesures d'ingénierie sur corpus synthétique. Aucune promesse de performance, \
             aucune cible validée, aucun état produit changé. Les quatre artefacts TASK-0028 \
             ne sont ni relus ni réécrits par cette campagne.",
        "measurement": body,
    });

    let serialised = serde_json::to_string_pretty(&document)
        .map_err(|error| std::io::Error::other(error.to_string()))?;
    crate::scale_spike::report::assert_clean(&serialised);

    let directory = crate::scale_spike::runs_directory();
    std::fs::create_dir_all(&directory)?;
    let path = directory.join(name);
    std::fs::write(&path, serialised.as_bytes())?;
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic(expected = "never writes a sealed artifact")]
    fn writing_over_a_sealed_proof_is_impossible() {
        let _ = write_artifact(
            "TASK-0026-ED15-exact-duplicate-explorer-webview2-pass1.json",
            serde_json::json!({}),
        );
    }

    #[test]
    #[should_panic(expected = "only writes its own artifacts")]
    fn writing_a_task_0028_artifact_is_impossible() {
        let _ = write_artifact("TASK-0028-SS-100k.json", serde_json::json!({}));
    }

    #[test]
    fn the_bench_stays_inside_the_repository_and_x5_is_still_thirty_six() {
        let sandbox = sandbox_root();
        assert!(sandbox.ends_with("task0029"));
        assert!(
            sandbox.to_string_lossy().contains(".filetopo-sandbox"),
            "I-2: the bench index lives beside the source, never inside it"
        );
        assert_eq!(
            crate::map::commands::PROTECTED_RUN_ARTIFACTS.len(),
            36,
            "X5 must stay at 36 for the whole of TASK-0029"
        );
    }

    #[test]
    fn the_measured_page_and_the_criterion_are_the_frozen_ones() {
        assert_eq!(MEASURED_PAGE_SIZE, 100);
        assert_eq!(SCALE_RATIO_CEILING, 5.0);
        assert!(
            MEASURED_PAGE_SIZE <= crate::hierarchy::MAX_CHILDREN_PAGE_SIZE,
            "the measured page must be one the product path would actually serve"
        );
    }
}
