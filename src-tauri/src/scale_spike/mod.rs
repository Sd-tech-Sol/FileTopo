//! `TASK-0028` — synthetic scale feasibility spike. **Test-only harness.**
//!
//! This module is declared `#[cfg(test)]` in `src-tauri/src/lib.rs`. It is
//! compiled by `cargo test` and by nothing else: no debug binary, no release
//! binary, no Tauri command, no route, no interface element. It adds **zero**
//! product surface.
//!
//! It lives inside the crate rather than in `tools/` or `src-tauri/tests/`
//! because the protocol forbids duplicating the data model: `domain`, `index`,
//! `scanner` and `map` are private modules of this crate, so a separate crate
//! or an integration test could only reach them by copying the schema — the one
//! thing [`TASK-0028`] explicitly refuses.
//!
//! What it measures, and the line it never crosses, are frozen in
//! `docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md`, committed **before**
//! this file existed.
//!
//! Two layers, never conflated:
//!
//! * **SCAN-SCALE** — 10 000 and 100 000 **physical** entries, walked by the
//!   real [`crate::scanner`] and indexed by the real [`crate::index::Index`].
//! * **INDEX-SCALE** — 1 000 000 **indexed** entries in a bench database built
//!   on the current FileTopo schema. It says nothing about a scanner walking a
//!   million physical files, and is never called "scan 1M".
//!
//! Nothing here is a product claim. Every number it writes carries
//! `ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL
//! INDEPENDENT CONTROL`.

pub mod bounded;
pub mod campaigns;
pub mod census;
pub mod generator;
pub mod profile;
pub mod report;

use std::path::PathBuf;

/// Root of the bench sandbox: `<repo>/.filetopo-sandbox/task0028`.
///
/// Inside the repository and ignored by Git since `TASK-0016`, so the spike
/// never writes outside the public repository, and never commits a fixture.
///
/// `CARGO_MANIFEST_DIR` is read at **run time** through [`std::env::var`], not
/// through the `env!` macro: `src-tauri/Cargo.toml` documents that the macro
/// bakes a build-machine path into the binary, and even in test-only code the
/// habit is not worth keeping.
pub fn sandbox_root() -> PathBuf {
    let manifest =
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set by cargo test");
    PathBuf::from(manifest)
        .parent()
        .expect("repository root is the parent of src-tauri")
        .join(".filetopo-sandbox")
        .join("task0028")
}

/// `<repo>/docs/performance/runs` — where the four `TASK-0028` artifacts land.
pub fn runs_directory() -> PathBuf {
    let manifest =
        std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR is set by cargo test");
    PathBuf::from(manifest)
        .parent()
        .expect("repository root is the parent of src-tauri")
        .join("docs")
        .join("performance")
        .join("runs")
}

/// The banner every artifact of this spike carries, verbatim.
pub const MEASUREMENT_BANNER: &str =
    "ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL";

/// View budgets exercised by `SS5`. **None of them is decided final** —
/// `DEC-0029` leaves the number to a later slice, and this spike only measures.
pub const VIEW_BUDGETS: [usize; 4] = [128, 256, 512, 1024];

/// Repetitions for the short queries of `SS3`, after a separate warm-up.
pub const QUERY_REPETITIONS: usize = 21;

/// Warm-up executions thrown away before the measured ones.
pub const QUERY_WARMUPS: usize = 3;

/// p50 / p95 / max over a sample, plus the exact number of executions.
///
/// No run is discarded, no curve is smoothed: `R8` forbids favourable
/// selection, and the worst value is published beside the median.
#[derive(Debug, Clone, PartialEq)]
pub struct Distribution {
    pub runs: usize,
    pub p50_us: u128,
    pub p95_us: u128,
    pub max_us: u128,
    pub min_us: u128,
}

impl Distribution {
    pub fn of(samples: &[u128]) -> Self {
        assert!(!samples.is_empty(), "a distribution needs at least one run");
        let mut sorted = samples.to_vec();
        sorted.sort_unstable();
        // Nearest-rank percentiles: no interpolation, so every reported value
        // is a value that was actually observed.
        let rank = |p: f64| {
            let index = ((p * sorted.len() as f64).ceil() as usize).saturating_sub(1);
            sorted[index.min(sorted.len() - 1)]
        };
        Self {
            runs: sorted.len(),
            p50_us: rank(0.50),
            p95_us: rank(0.95),
            max_us: sorted[sorted.len() - 1],
            min_us: sorted[0],
        }
    }

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "runs": self.runs,
            "p50Us": self.p50_us,
            "p95Us": self.p95_us,
            "maxUs": self.max_us,
            "minUs": self.min_us,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percentiles_are_observed_values_and_never_interpolated() {
        let samples = [10_u128, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        let distribution = Distribution::of(&samples);
        assert_eq!(distribution.runs, 10);
        assert_eq!(distribution.p50_us, 50);
        assert_eq!(distribution.p95_us, 100);
        assert_eq!(distribution.max_us, 100);
        assert_eq!(distribution.min_us, 10);
        assert!(samples.contains(&distribution.p50_us));
        assert!(samples.contains(&distribution.p95_us));
    }

    #[test]
    fn a_single_run_reports_itself_without_pretending_to_a_distribution() {
        let distribution = Distribution::of(&[7]);
        assert_eq!(
            (
                distribution.runs,
                distribution.p50_us,
                distribution.p95_us,
                distribution.max_us
            ),
            (1, 7, 7, 7)
        );
    }

    #[test]
    fn the_sandbox_stays_inside_the_repository_and_outside_the_analysed_root() {
        let sandbox = sandbox_root();
        assert!(sandbox.ends_with("task0028"));
        assert!(
            sandbox
                .to_string_lossy()
                .contains(".filetopo-sandbox"),
            "I-2: the bench index lives beside the source, never inside it"
        );
        assert!(runs_directory().ends_with("runs"));
    }

    #[test]
    fn the_budgets_are_the_four_frozen_by_the_protocol() {
        assert_eq!(VIEW_BUDGETS, [128, 256, 512, 1024]);
    }
}
