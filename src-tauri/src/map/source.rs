//! What a brain actually reads — `DEC-0033` D and G.
//!
//! Before `TASK-0032` the pipeline could assume "a source is a fixture", and
//! `BrainRecord::source_fixture()` was the whole resolution. A `REAL_ROOT`
//! breaks that assumption, so the assumption is replaced here by a small,
//! explicit type rather than left to be re-derived at each call site.
//!
//! Two things live in this file, and they are deliberately separate:
//!
//! * **[`validate_real_root`]** — the single door a candidate folder passes
//!   through before it can become a brain. It is a free function taking the
//!   FileTopo state root, because validation needs to know where FileTopo
//!   keeps its own state and the catalogue does not.
//! * **[`BrainSource`]** — the resolved answer to "which tree do I scan for
//!   this brain", read from the catalogue for a `REAL_ROOT` and from the frozen
//!   fixture table for a synthetic one.
//!
//! **`map_open` never calls either of these.** Opening reuses a persisted
//! index and does not resolve, touch or even look for the source — `DEC-0032`
//! A, unchanged by this slice. Only `map_refresh` and `map_rebuild` resolve.

use super::brains::{BrainCatalog, BrainRecord, SourceKind};
use super::sandbox::SandboxPaths;
use super::{MapError, fixtures};
use crate::path_codec::{contains_or_equals, is_reparse_point};
use std::fs;
use std::path::{Path, PathBuf};

/// The tree a brain reads, once resolved.
#[derive(Debug, Clone)]
pub enum BrainSource {
    /// A frozen synthetic fixture, materialised under the sandbox.
    SyntheticFixture(&'static fixtures::FixtureSpec),
    /// A folder the person chose through the native picker.
    RealRoot(PathBuf),
}

impl BrainSource {
    /// Resolves a brain to its tree.
    ///
    /// A synthetic brain resolves without opening anything: its fixture is a
    /// frozen constant of this repository. A `REAL_ROOT` opens the catalogue,
    /// because the catalogue is the only place its path exists.
    pub fn resolve(paths: &SandboxPaths, brain: &BrainRecord) -> Result<Self, MapError> {
        match brain.source_kind {
            SourceKind::SyntheticFixture => Ok(Self::SyntheticFixture(brain.source_fixture()?)),
            SourceKind::RealRoot => {
                let catalog = BrainCatalog::open(&paths.catalog_database())?;
                let root = catalog.real_root_path(&brain.brain_id)?.ok_or_else(|| {
                    MapError::SourceUnresolved(format!(
                        "{}: le catalogue ne rend aucune racine",
                        brain.brain_id
                    ))
                })?;
                Ok(Self::RealRoot(root))
            }
        }
    }

    /// The directory to hand to the scanner.
    pub fn root(&self, paths: &SandboxPaths) -> PathBuf {
        match self {
            Self::SyntheticFixture(spec) => fixtures::fixture_root(&paths.fixtures, spec.id),
            Self::RealRoot(root) => root.clone(),
        }
    }

    /// Whether the double-traversal fingerprint of `TASK-0016` applies.
    ///
    /// Synthetic only, and `DEC-0033` F says why: on a real tree the second
    /// traversal doubles the cost of every indexing for a check the scanner's
    /// design and the `RR6` tests already establish. A report on a real root
    /// therefore carries **no** fingerprint rather than an invented one.
    pub fn is_fingerprintable(&self) -> bool {
        matches!(self, Self::SyntheticFixture(_))
    }
}

/// Accepts a folder as a `REAL_ROOT`, or says exactly why it is refused.
///
/// The candidate arrives from the native picker and leaves canonicalised, ready
/// to be stored. Four refusals, in the order that makes each one meaningful:
///
/// 1. **Not a directory.** A file is not a root.
/// 2. **A symlink or reparse point as the root.** Read from
///    [`fs::symlink_metadata`], before canonicalisation, because canonicalising
///    resolves the link and would hide exactly what is being refused. Reparse
///    points *inside* the tree stay the scanner's business and are unaffected.
/// 3. **Containment with the FileTopo state space** — `DEC-0033` G, all three
///    cases, compared component by component.
///
/// **No refusal names the path.** A message that reaches a log or the interface
/// carries the reason and nothing else — `DEC-0033` B.
pub fn validate_real_root(candidate: &Path, state_root: &Path) -> Result<PathBuf, MapError> {
    let metadata = fs::symlink_metadata(candidate)
        .map_err(|error| MapError::RootRejected(format!("racine illisible ({})", error.kind())))?;
    if metadata.file_type().is_symlink() || is_reparse_point(&metadata) {
        return Err(MapError::RootRejected(
            "un lien ou un point d'analyse ne peut pas être une racine".into(),
        ));
    }
    if !metadata.is_dir() {
        return Err(MapError::RootRejected(
            "la racine doit être un dossier".into(),
        ));
    }
    let root = fs::canonicalize(candidate)
        .map_err(|error| MapError::RootRejected(format!("racine illisible ({})", error.kind())))?;

    // The state root may not exist yet on a first run — a sandbox is created
    // lazily. Canonicalising what is there is what makes the comparison sound
    // on Windows, where the same directory is reachable as `C:\…` and
    // `\\?\C:\…`; when it does not exist there is nothing to be contained by,
    // and the raw path is compared instead.
    let state = fs::canonicalize(state_root).unwrap_or_else(|_| state_root.to_path_buf());

    if contains_or_equals(&root, &state) {
        return Err(MapError::RootRejected(
            "cette racine contient l'espace d'état FileTopo; l'index se scannerait lui-même".into(),
        ));
    }
    if contains_or_equals(&state, &root) {
        return Err(MapError::RootRejected(
            "cette racine est à l'intérieur de l'espace d'état FileTopo".into(),
        ));
    }
    Ok(root)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_root(temp: &Path) -> PathBuf {
        let root = temp.join("filetopo-state");
        fs::create_dir_all(root.join("brains")).expect("state");
        root
    }

    #[test]
    fn a_plain_folder_is_accepted_and_comes_back_canonical() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());
        let candidate = temp.path().join("racine");
        fs::create_dir(&candidate).expect("candidate");

        let accepted = validate_real_root(&candidate, &state).expect("accepted");
        assert_eq!(accepted, fs::canonicalize(&candidate).expect("canonical"));
    }

    #[test]
    fn a_file_is_refused_without_naming_it() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());
        let file = temp.path().join("document.txt");
        fs::write(&file, b"synthetique").expect("file");

        let error = validate_real_root(&file, &state).expect_err("refused");
        assert!(error.to_string().starts_with("map_root_rejected"));
        assert!(
            !error.to_string().contains("document.txt"),
            "a refusal must not name the path: {error}"
        );
    }

    /// `DEC-0033` G, case 2: the root that would make the index scan itself.
    #[test]
    fn a_root_that_contains_the_filetopo_state_space_is_refused() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());

        let error = validate_real_root(temp.path(), &state).expect_err("refused");
        assert!(error.to_string().contains("scannerait"));
    }

    /// `DEC-0033` G, case 3.
    #[test]
    fn a_root_inside_the_filetopo_state_space_is_refused() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());

        let error = validate_real_root(&state.join("brains"), &state).expect_err("refused");
        assert!(error.to_string().contains("espace d'état"));
    }

    /// `DEC-0033` G, case 1.
    #[test]
    fn the_state_root_itself_is_refused() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());

        assert!(validate_real_root(&state, &state).is_err());
    }

    /// A sibling whose name merely *starts with* the state root's name is a
    /// perfectly good root. This is the case a string prefix would break.
    #[test]
    fn a_sibling_with_a_longer_name_is_not_contained() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());
        let sibling = temp.path().join("filetopo-state-archive");
        fs::create_dir(&sibling).expect("sibling");

        assert!(validate_real_root(&sibling, &state).is_ok());
    }

    #[test]
    fn a_missing_folder_is_refused_rather_than_created() {
        let temp = tempfile::tempdir().expect("temp");
        let state = state_root(temp.path());
        let absent = temp.path().join("jamais-créé");

        assert!(validate_real_root(&absent, &state).is_err());
        assert!(!absent.exists(), "validation must never create anything");
    }
}
