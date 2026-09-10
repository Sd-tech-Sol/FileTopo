//! The four synthetic fixtures frozen by `TASK-0016` §12.1.
//!
//! Every fixture is *generated*, never committed as thousands of files, and
//! every generator is deterministic: same seed, same tree, on any machine. The
//! seed and the structural rule are frozen in the task sheet **before** any
//! measurement; the exact node count they produce is a *result*, published
//! afterwards.
//!
//! Nothing here reads, lists or writes a user folder. The trees are invented
//! from the seed and written into the sandbox.

#[cfg(test)]
use super::MAX_NODES_PER_MAP;
use super::{MAX_FIXTURE_DEPTH, MapError, Rng, fnv1a64};

use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Shape {
    QuasiEmpty,
    Deep,
    Wide,
    Mixed,
    ScaleRuntime,
}

#[derive(Debug, Clone, Copy)]
pub struct FixtureSpec {
    pub id: &'static str,
    pub label_fr: &'static str,
    pub label_en: &'static str,
    pub seed: u64,
    /// Frozen node ceiling for this fixture, root included.
    pub max_nodes: usize,
    pub shape: Shape,
}

/// The four fixtures, exactly as frozen. Order is the display order.
pub const FIXTURES: [FixtureSpec; 4] = [
    FixtureSpec {
        id: "quasi-empty",
        label_fr: "Quasi vide",
        label_en: "Nearly empty",
        seed: 20_260_831_001,
        max_nodes: 25,
        shape: Shape::QuasiEmpty,
    },
    FixtureSpec {
        id: "deep",
        label_fr: "Profonde",
        label_en: "Deep",
        seed: 20_260_831_002,
        max_nodes: 500,
        shape: Shape::Deep,
    },
    FixtureSpec {
        id: "wide",
        label_fr: "Large",
        label_en: "Wide",
        seed: 20_260_831_003,
        max_nodes: 3_000,
        shape: Shape::Wide,
    },
    FixtureSpec {
        id: "mixed",
        label_fr: "Mixte",
        label_en: "Mixed",
        seed: 20_260_831_004,
        max_nodes: 5_000,
        shape: Shape::Mixed,
    },
];

/// Additional synthetic fixture for DEC-0031; does not change the four frozen plans.
pub static SCALE_RUNTIME: FixtureSpec = FixtureSpec {
    id: "scale-runtime",
    label_fr: "Échelle synthétique",
    label_en: "Synthetic scale",
    seed: 20_260_909_030,
    max_nodes: 6_001,
    shape: Shape::ScaleRuntime,
};

pub fn spec(fixture_id: &str) -> Result<&'static FixtureSpec, MapError> {
    if fixture_id == SCALE_RUNTIME.id {
        return Ok(&SCALE_RUNTIME);
    }
    FIXTURES
        .iter()
        .find(|candidate| candidate.id == fixture_id)
        .ok_or_else(|| MapError::UnknownFixture(fixture_id.to_string()))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlannedEntry {
    /// Slash-separated, relative to the fixture root. Never absolute, never
    /// containing `..`.
    pub relative_path: String,
    pub is_directory: bool,
    /// Byte length of the synthetic content. Zero for directories.
    pub content_len: usize,
}

/// What the generator says the tree *should* contain, computed without ever
/// looking at the disk.
///
/// `H1` compares three sets: this plan, the index, and an independent walk of
/// the real directory. The plan is the only one of the three that owes nothing
/// to the scanner, which is what makes the comparison worth running.
#[derive(Debug, Clone)]
pub struct FixturePlan {
    pub entries: Vec<PlannedEntry>,
}

impl FixturePlan {
    /// Root included, matching how the index counts.
    pub fn node_count(&self) -> usize {
        self.entries.len() + 1
    }

    pub fn max_depth(&self) -> u32 {
        self.entries
            .iter()
            .map(|entry| entry.relative_path.matches('/').count() as u32 + 1)
            .max()
            .unwrap_or(0)
    }

    /// Sorted set of relative paths, root excluded — the shape `H1` compares.
    pub fn expected_paths(&self) -> Vec<String> {
        let mut paths = self
            .entries
            .iter()
            .map(|entry| entry.relative_path.clone())
            .collect::<Vec<_>>();
        paths.sort();
        paths
    }
}

/// Synthetic file content, derived only from the fixture id and the path.
///
/// Deliberately readable: anyone opening one of these files must be able to
/// tell at a glance that it is invented, not borrowed from anywhere.
fn synthetic_content(fixture_id: &str, relative_path: &str, filler: u32) -> String {
    let mut content = format!(
        "FileTopo — contenu synthetique\nfixture: {fixture_id}\nchemin: {relative_path}\n"
    );
    for line in 0..filler {
        content.push_str(&format!("ligne-{line:04} donnee-synthetique\n"));
    }
    content
}

fn push_dir(entries: &mut Vec<PlannedEntry>, path: String) {
    entries.push(PlannedEntry {
        relative_path: path,
        is_directory: true,
        content_len: 0,
    });
}

fn push_file(
    entries: &mut Vec<PlannedEntry>,
    fixture_id: &str,
    path: String,
    rng: &mut Rng,
) {
    let filler = rng.range(0, 6);
    let content_len = synthetic_content(fixture_id, &path, filler).len();
    entries.push(PlannedEntry {
        relative_path: path,
        is_directory: false,
        content_len,
    });
}

pub fn plan(spec: &'static FixtureSpec) -> FixturePlan {
    let mut rng = Rng::new(spec.seed);
    let mut entries = Vec::new();
    match spec.shape {
        Shape::QuasiEmpty => plan_quasi_empty(spec, &mut entries, &mut rng),
        Shape::Deep => plan_deep(spec, &mut entries, &mut rng),
        Shape::Wide => plan_wide(spec, &mut entries, &mut rng),
        Shape::Mixed => plan_mixed(spec, &mut entries, &mut rng),
        Shape::ScaleRuntime => {
            for i in 0..6_000 {
                push_file(
                    &mut entries,
                    spec.id,
                    format!("synthetic-{i:05}.txt"),
                    &mut rng,
                );
            }
        }
    }
    FixturePlan { entries }
}

fn plan_quasi_empty(spec: &FixtureSpec, entries: &mut Vec<PlannedEntry>, rng: &mut Rng) {
    push_dir(entries, "dossier-a".into());
    for index in 1..=3 {
        push_file(entries, spec.id, format!("dossier-a/note-{index}.txt"), rng);
    }
    push_dir(entries, "dossier-b".into());
    push_dir(entries, "dossier-b/sous-dossier".into());
    for index in 1..=2 {
        push_file(
            entries,
            spec.id,
            format!("dossier-b/sous-dossier/note-{index}.txt"),
            rng,
        );
    }
    push_file(entries, spec.id, "dossier-b/note-1.txt".into(), rng);
    for index in 1..=2 {
        push_file(entries, spec.id, format!("racine-{index}.txt"), rng);
    }
}

fn plan_deep(spec: &FixtureSpec, entries: &mut Vec<PlannedEntry>, rng: &mut Rng) {
    // 39 nested directories, so the deepest entries — the files and the empty
    // `annexe` of level 39 — sit at depth 40 exactly, the frozen `B-2` bound.
    let mut prefix = String::new();
    for level in 1..=39 {
        prefix = if prefix.is_empty() {
            format!("niveau-{level:02}")
        } else {
            format!("{prefix}/niveau-{level:02}")
        };
        push_dir(entries, prefix.clone());
        for index in 1..=2 {
            push_file(entries, spec.id, format!("{prefix}/note-{index}.txt"), rng);
        }
        push_dir(entries, format!("{prefix}/annexe"));
    }
}

fn plan_wide(spec: &FixtureSpec, entries: &mut Vec<PlannedEntry>, rng: &mut Rng) {
    for group in 0..12 {
        let group_path = format!("groupe-{group:02}");
        push_dir(entries, group_path.clone());
        for sub in 0..20 {
            let sub_path = format!("{group_path}/sous-{sub:02}");
            push_dir(entries, sub_path.clone());
            let files = rng.range(5, 11);
            for index in 0..files {
                push_file(entries, spec.id, format!("{sub_path}/piece-{index:02}.txt"), rng);
            }
        }
    }
}

fn plan_mixed(spec: &FixtureSpec, entries: &mut Vec<PlannedEntry>, rng: &mut Rng) {
    // Six branches of deliberately different shapes, so a single fixture
    // exercises wide, deep, flat, balanced, empty and awkward-name cases.
    push_dir(entries, "large".into());
    for sub in 0..20 {
        let sub_path = format!("large/bloc-{sub:02}");
        push_dir(entries, sub_path.clone());
        let files = rng.range(10, 20);
        for index in 0..files {
            push_file(entries, spec.id, format!("{sub_path}/piece-{index:02}.txt"), rng);
        }
    }

    push_dir(entries, "profond".into());
    let mut prefix = "profond".to_string();
    for level in 1..=30 {
        prefix = format!("{prefix}/etage-{level:02}");
        push_dir(entries, prefix.clone());
        let files = rng.range(2, 4);
        for index in 0..files {
            push_file(entries, spec.id, format!("{prefix}/note-{index:02}.txt"), rng);
        }
    }

    push_dir(entries, "plat".into());
    let flat_files = rng.range(1_200, 1_800);
    for index in 0..flat_files {
        push_file(entries, spec.id, format!("plat/element-{index:04}.txt"), rng);
    }

    push_dir(entries, "equilibre".into());
    for first in 0..8 {
        let first_path = format!("equilibre/axe-{first:02}");
        push_dir(entries, first_path.clone());
        for second in 0..8 {
            let second_path = format!("{first_path}/branche-{second:02}");
            push_dir(entries, second_path.clone());
            let files = rng.range(5, 12);
            for index in 0..files {
                push_file(
                    entries,
                    spec.id,
                    format!("{second_path}/feuille-{index:02}.txt"),
                    rng,
                );
            }
        }
    }

    push_dir(entries, "vide".into());
    for index in 0..4 {
        push_dir(entries, format!("vide/reserve-{index:02}"));
    }

    // Long and non-ASCII names, invented on the spot: the map must survive
    // them, and `P-14` will later need them for path copying.
    push_dir(entries, "noms".into());
    for index in 0..60 {
        push_file(
            entries,
            spec.id,
            format!("noms/dossier-accentue-etendu-numero-{index:02}-ete-hiver-noel.txt"),
            rng,
        );
    }
}

/// Where a fixture root lives inside the sandbox.
pub fn fixture_root(fixtures_root: &Path, fixture_id: &str) -> PathBuf {
    fixtures_root.join(fixture_id)
}

/// Creates the fixture if it is absent, verifies it if it is present.
///
/// **Never deletes anything.** A sandbox holding a root that does not match the
/// frozen plan stops the run with `FixtureMismatch` and asks, rather than
/// quietly rebuilding over whatever is there — the slice owns no destructive
/// operation at all.
pub fn materialize(fixtures_root: &Path, spec: &'static FixtureSpec) -> Result<FixturePlan, MapError> {
    let plan = plan(spec);

    if plan.node_count() > spec.max_nodes {
        return Err(MapError::FixtureMismatch(format!(
            "{} produces {} nodes, over its frozen ceiling of {}",
            spec.id,
            plan.node_count(),
            spec.max_nodes
        )));
    }
    if plan.max_depth() > MAX_FIXTURE_DEPTH {
        return Err(MapError::FixtureMismatch(format!(
            "{} reaches depth {}, over the frozen ceiling of {}",
            spec.id,
            plan.max_depth(),
            MAX_FIXTURE_DEPTH
        )));
    }

    let root = fixture_root(fixtures_root, spec.id);
    if root.exists() {
        let observed = observed_paths(&root)?;
        if observed != plan.expected_paths() {
            return Err(MapError::FixtureMismatch(format!(
                "{} already exists in the sandbox and does not match the frozen plan \
                 ({} entries on disk, {} planned); nothing was deleted",
                spec.id,
                observed.len(),
                plan.entries.len()
            )));
        }
        return Ok(plan);
    }

    fs::create_dir_all(&root)?;
    for entry in &plan.entries {
        let target = root.join(entry.relative_path.replace('/', std::path::MAIN_SEPARATOR_STR));
        if entry.is_directory {
            fs::create_dir_all(&target)?;
        } else {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)?;
            }
            let filler = filler_for(entry, spec.id);
            fs::write(&target, synthetic_content(spec.id, &entry.relative_path, filler))?;
        }
    }
    Ok(plan)
}

/// Recovers the filler count the planner used, from the length it recorded.
///
/// The planner and the writer must agree byte for byte, or `content_len` would
/// be a lie; deriving one from the other keeps them from drifting apart.
fn filler_for(entry: &PlannedEntry, fixture_id: &str) -> u32 {
    for filler in 0..=6 {
        if synthetic_content(fixture_id, &entry.relative_path, filler).len() == entry.content_len {
            return filler;
        }
    }
    0
}

/// Independent walk of the real directory, used by `H1` and by the mismatch
/// check. Deliberately *not* the production scanner: comparing the scanner to
/// itself would prove nothing.
pub fn observed_paths(root: &Path) -> Result<Vec<String>, MapError> {
    fn visit(base: &Path, current: &Path, out: &mut Vec<String>) -> Result<(), MapError> {
        let mut entries = fs::read_dir(current)?
            .collect::<Result<Vec<_>, _>>()?
            .into_iter()
            .collect::<Vec<_>>();
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            let relative = path
                .strip_prefix(base)
                .map_err(|_| MapError::FixtureMismatch("path escaped the fixture root".into()))?
                .to_string_lossy()
                .replace('\\', "/");
            out.push(relative);
            if entry.file_type()?.is_dir() {
                visit(base, &path, out)?;
            }
        }
        Ok(())
    }

    let mut paths = Vec::new();
    visit(root, root, &mut paths)?;
    paths.sort();
    Ok(paths)
}

/// Historical fixture fingerprint: names, structure, sizes, contents and
/// modification timestamps of a synthetic fixture tree, as `fnv1a64:<hex>`.
///
/// `H6` compares this value before and after a full session. Content is
/// included because "read only" has to mean the bytes too, not just the shape.
///
/// Scope, frozen by `TASK-0023` / `X9`: this helper belongs to the frozen
/// fixtures and to the proofs of `TASK-0016`..`TASK-0022`, whose recorded
/// values it must keep reproducing. It is *not* a general purpose fingerprint:
/// it reads whole files with `fs::read` and follows a file symlink, so it is
/// neither memory bounded nor confined to the root. Content observation
/// campaigns use `content_signals::content_source_fingerprint`
/// (`sha256-tree-v1`) instead, which streams and never follows a link.
pub fn fingerprint(root: &Path) -> Result<String, MapError> {
    fn visit(base: &Path, current: &Path, acc: &mut Vec<u8>) -> Result<(), MapError> {
        let mut entries = fs::read_dir(current)?.collect::<Result<Vec<_>, _>>()?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            let relative = path
                .strip_prefix(base)
                .map_err(|_| MapError::FixtureMismatch("path escaped the fixture root".into()))?
                .to_string_lossy()
                .replace('\\', "/");
            let metadata = fs::symlink_metadata(&path)?;
            acc.extend_from_slice(relative.as_bytes());
            acc.push(0);
            acc.push(u8::from(metadata.is_dir()));
            acc.extend_from_slice(&metadata.len().to_le_bytes());
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
                .unwrap_or_default();
            acc.extend_from_slice(&modified.to_le_bytes());
            if metadata.is_dir() {
                visit(base, &path, acc)?;
            } else {
                acc.extend_from_slice(&fs::read(&path)?);
            }
            acc.push(0xff);
        }
        Ok(())
    }

    let mut accumulator = Vec::new();
    visit(root, root, &mut accumulator)?;
    Ok(format!("fnv1a64:{:016x}", fnv1a64(&accumulator)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_frozen_fixture_respects_its_own_declared_bounds() {
        for spec in &FIXTURES {
            let plan = plan(spec);
            assert!(
                plan.node_count() <= spec.max_nodes,
                "{} produced {} nodes, over its frozen ceiling of {}",
                spec.id,
                plan.node_count(),
                spec.max_nodes
            );
            assert!(
                plan.node_count() <= MAX_NODES_PER_MAP,
                "{} exceeds the B-1 ceiling",
                spec.id
            );
            assert!(
                plan.max_depth() <= MAX_FIXTURE_DEPTH,
                "{} reaches depth {}",
                spec.id,
                plan.max_depth()
            );
            let paths = plan.expected_paths();
            let unique = paths.iter().collect::<std::collections::BTreeSet<_>>();
            assert_eq!(unique.len(), paths.len(), "{} has duplicate paths", spec.id);
            assert!(
                paths.iter().all(|path| !path.contains("..")),
                "{} plans a path escaping the root",
                spec.id
            );
        }
    }

    #[test]
    fn deep_fixture_reaches_exactly_the_frozen_depth() {
        let plan = plan(spec("deep").expect("deep"));
        assert_eq!(plan.max_depth(), MAX_FIXTURE_DEPTH);
    }

    #[test]
    fn quasi_empty_fixture_matches_its_written_rule() {
        let plan = plan(spec("quasi-empty").expect("quasi-empty"));
        // Rule: 2 top folders, 3 files in the first, 1 subfolder of 2 files
        // plus 1 file in the second, 2 files at the root.
        assert_eq!(plan.node_count(), 12);
        assert_eq!(plan.entries.iter().filter(|e| e.is_directory).count(), 3);
    }

    #[test]
    fn plans_replay_identically_from_the_frozen_seed() {
        for spec in &FIXTURES {
            assert_eq!(plan(spec).entries, plan(spec).entries, "{}", spec.id);
        }
    }

    #[test]
    fn materialisation_matches_the_plan_and_is_idempotent() {
        let temp = tempfile::tempdir().expect("temp");
        let fixtures_root = temp.path().join("fixtures");
        let spec = spec("quasi-empty").expect("spec");

        let plan = materialize(&fixtures_root, spec).expect("materialize");
        let root = fixture_root(&fixtures_root, spec.id);
        assert_eq!(observed_paths(&root).expect("walk"), plan.expected_paths());

        let before = fingerprint(&root).expect("before");
        materialize(&fixtures_root, spec).expect("second call is a no-op");
        assert_eq!(before, fingerprint(&root).expect("after"));
    }

    #[test]
    fn a_tampered_sandbox_stops_the_run_instead_of_being_rebuilt_over() {
        let temp = tempfile::tempdir().expect("temp");
        let fixtures_root = temp.path().join("fixtures");
        let spec = spec("quasi-empty").expect("spec");
        materialize(&fixtures_root, spec).expect("materialize");
        let root = fixture_root(&fixtures_root, spec.id);
        fs::write(root.join("intrus.txt"), b"synthetique").expect("extra entry");

        let error = materialize(&fixtures_root, spec).expect_err("mismatch");

        assert!(matches!(error, MapError::FixtureMismatch(_)));
        // Nothing was deleted: the intruder is still there for a human to see.
        assert!(root.join("intrus.txt").is_file());
    }

    #[test]
    fn fingerprint_notices_content_names_and_structure() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("root");
        fs::create_dir_all(root.join("a")).expect("dir");
        fs::write(root.join("a/one.txt"), b"synthetique").expect("file");
        let before = fingerprint(&root).expect("before");

        fs::write(root.join("a/one.txt"), b"synthetiquX").expect("rewrite");
        assert_ne!(before, fingerprint(&root).expect("content changed"));

        fs::write(root.join("a/one.txt"), b"synthetique").expect("restore");
        fs::write(root.join("a/two.txt"), b"synthetique").expect("new file");
        assert_ne!(before, fingerprint(&root).expect("structure changed"));
    }
}
