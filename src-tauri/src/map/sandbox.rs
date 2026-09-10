//! Where the slice is allowed to write.
//!
//! Three destinations, and nothing else:
//!
//! * `fixtures/` — the synthetic trees the slice analyses. **Never a user
//!   folder**: the slice ships no folder picker, and `TASK-0016` §12.4 keeps
//!   real data as a stop point reserved to Sébastien. A fixture root is
//!   **shared** by every brain that reads it, and read **only**.
//! * `brains/` — everything FileTopo knows about a brain, **namespaced by
//!   `brain_id`** (`TASK-0018` §4.4): the common catalogue, then one index and
//!   one relations store **per brain**.
//! * `runs/` — measurement artefacts, development builds only.
//!
//! **The namespace is the `brain_id`, never the source.** `brain-alpha` and
//! `brain-gamma` read the same fixture and must not share a byte of FileTopo
//! state, so their storage is separated by a **directory**, not by a column
//! somebody could forget in a `WHERE` clause. `K3` compares the two paths and
//! fails if they ever meet.
//!
//! The `TASK-0016`/`TASK-0017` layout — `maps/<fixture>/` and
//! `relations/<fixture>/` — keyed FileTopo state by the **source**, which is
//! exactly the confusion `DEC-0017` removes. Those directories may still exist
//! in a developer's sandbox; **nothing here reads or deletes them**, and no
//! accessor leads to them any more.
//!
//! In a development build the sandbox sits in the repository, under the
//! git-ignored `.filetopo-sandbox/`, so every piece of evidence stays
//! inspectable without leaving the repository. A release build has no
//! repository to find and falls back to the application's own data directory.
//!
//! ## Variants — a FRESH namespace for a proof run
//!
//! The development sandbox is **persistent**, which is what makes it
//! inspectable, and also what made `L12` step 7 of `TASK-0019` impossible to
//! replay: an earlier run had already approved `S-005`, so the **act** the
//! criterion asks for could not happen again. Reserve `X6`.
//!
//! Deleting the sandbox would be a destruction, and a stop point reserved to
//! Sébastien. So nothing is deleted: a proof run asks for a **new namespace**
//! instead, through `FILETOPO_SANDBOX_VARIANT`, and gets
//! `<dépôt>/.filetopo-sandbox/variants/<variant>` — still **inside** the same
//! directory, never anywhere else. The existing sandbox stays exactly where it
//! is, untouched.
//!
//! Two properties hold the mechanism in place:
//!
//! * **Absent variable, byte-identical behaviour.** No variant means
//!   `<dépôt>/.filetopo-sandbox`, exactly as before.
//! * **Confinement, not a destination.** The variable carries a **name**, never
//!   a path: one ASCII basename, `[A-Za-z0-9_-]`, 1 to 64 characters. A
//!   separator, a `..`, an absolute path or an empty string is an **explicit
//!   error** — never a silent fall back to something a caller supplied. The
//!   slice still ships no folder picker and no user-chosen root.

use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct SandboxPaths {
    /// Kept so a path can be *named* relative to it. Never published as is.
    root: PathBuf,
    pub fixtures: PathBuf,
    /// Everything FileTopo knows about brains — `TASK-0018` §4.4.
    pub brains: PathBuf,
    /// How the sandbox is *named* on screen and in artefacts.
    ///
    /// Never the absolute path. `AGENTS.md` forbids a personal local path from
    /// reaching the repository, and a measurement artefact committed as
    /// evidence is exactly the place one would slip through unnoticed.
    pub label: String,
}

impl SandboxPaths {
    /// Test-only shorthand: production always names its sandbox through
    /// [`resolve`], which is what keeps the published label free of an absolute
    /// path.
    #[cfg(test)]
    pub fn under(root: PathBuf) -> Self {
        Self::labelled(root, "<bac à sable>")
    }

    pub fn labelled(root: PathBuf, label: &str) -> Self {
        Self {
            fixtures: root.join("fixtures"),
            brains: root.join("brains"),
            root,
            label: label.to_string(),
        }
    }

    /// The common catalogue — `DEC-0011` `S-C`: the small shared store holding
    /// the **non-reconstructible** state of every brain, and nothing derived.
    pub fn catalog_database(&self) -> PathBuf {
        self.brains.join("catalog.sqlite")
    }

    /// A brain's own space. Everything below it belongs to that brain alone.
    pub fn brain_root(&self, brain_id: &str) -> PathBuf {
        self.brains.join(brain_id)
    }

    /// A brain's index — **derived**, rebuildable, and its own.
    pub fn brain_map_database(&self, brain_id: &str) -> PathBuf {
        self.brain_root(brain_id).join("map").join("index.sqlite")
    }

    /// A brain's relations. **Never** under its `map/`, which a rebuild wipes,
    /// and never inside the analysed tree.
    pub fn brain_relations_database(&self, brain_id: &str) -> PathBuf {
        self.brain_root(brain_id)
            .join("relations")
            .join("relations.sqlite")
    }

    /// Reconstructible, dated facts observed from one brain's source.
    ///
    /// Kept outside `map/` so rebuilding the index cannot erase the last
    /// observation, and outside `relations/` because a digest is a fact rather
    /// than a relationship. The path is namespaced by `brain_id`, never by the
    /// shared fixture.
    pub fn brain_content_signals_database(&self, brain_id: &str) -> PathBuf {
        self.brain_root(brain_id)
            .join("signals")
            .join("content.sqlite")
    }

    /// The **common** store of inter-brain relations — `TASK-0020` §4.1.
    ///
    /// A relation `A → B` belongs to the **link**, not to either end. Putting
    /// it in Alpha's private store would make a rebuild of Alpha a destruction
    /// of a link Gamma is half of, and would give Alpha authority over data it
    /// does not own alone. So it lives beside the brains rather than inside
    /// one of them — still under `brains/`, still in the FileTopo space, never
    /// inside an analysed tree, and **never** under a `map/` that a rebuild
    /// replaces.
    ///
    /// [`INTERBRAIN_NAMESPACE`] is not a `brain_id`, and a test holds that.
    pub fn interbrain_root(&self) -> PathBuf {
        self.brains.join(INTERBRAIN_NAMESPACE)
    }

    pub fn interbrain_relations_database(&self) -> PathBuf {
        self.interbrain_root().join("relations.sqlite")
    }

    /// Where the sandbox lives, named rather than spelled out, so a reader can
    /// see that nothing is written to a user folder without the absolute path
    /// being published along with it.
    pub fn display_root(&self) -> String {
        self.label.clone()
    }

    /// The root of everything FileTopo writes.
    ///
    /// Exposed for **one** purpose — `DEC-0033` G, the containment rule that
    /// refuses a real root which would swallow the index, or sit inside it. It
    /// is a `&Path` rather than a `String` because it is compared, never
    /// published: [`display_root`](Self::display_root) is what a reader sees.
    pub fn state_root(&self) -> &Path {
        &self.root
    }

    /// A path as it may be **published**: relative to the sandbox root, with
    /// forward slashes.
    ///
    /// `K3` has to compare real storage paths and show they differ. Publishing
    /// the absolute ones would put a personal local path in the repository, so
    /// what is published is the part that carries the meaning — the part below
    /// the sandbox — and the sandbox itself stays named.
    pub fn relative_name(&self, path: &Path) -> String {
        path.strip_prefix(&self.root)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/")
    }
}

/// Resolves the sandbox for the running application, preferring the repository
/// checkout in development.
///
/// Callers that must control the destination — every test — build a
/// [`SandboxPaths`] directly instead, so a test never writes into the shared
/// development sandbox and two tests never collide over the same fixture.
///
/// The repository is located **at run time** by walking up from the working
/// directory, never through `env!("CARGO_MANIFEST_DIR")`: that macro expands
/// to a string literal and would bake the developer's absolute path into every
/// binary built from this source. The existing `scan_synthetic_fixture` avoids
/// it for the same reason.
pub fn resolve(app_data: &Path) -> Result<SandboxPaths, String> {
    if cfg!(debug_assertions) {
        let asked = match std::env::var(VARIANT_ENV) {
            Ok(value) => Some(value),
            Err(std::env::VarError::NotPresent) => None,
            // Refused rather than dropped: a value that cannot be read is not
            // the same thing as no value, and treating it as absent would be a
            // silent fall back to the shared sandbox.
            Err(std::env::VarError::NotUnicode(_)) => {
                return Err(format!("{VARIANT_ENV}: valeur non-Unicode refusée"));
            }
        };
        if let Some(repository) = repository_root() {
            return development_sandbox(&repository, asked.as_deref());
        }
        if let Some(raw) = asked {
            return Err(format!(
                "{VARIANT_ENV} demandé (« {raw} »), mais le dépôt est introuvable — aucun repli"
            ));
        }
    }
    Ok(SandboxPaths::labelled(
        app_data.join("sandbox"),
        "<données d'application>/sandbox",
    ))
}

/// The directory under `brains/` that holds what belongs to **no single
/// brain** — `TASK-0020` §4.1.
///
/// It sits in the same directory as the per-brain namespaces, so a reader sees
/// at a glance that it is neither the catalogue nor anybody's private store. It
/// is deliberately **not** a valid `brain_id`: every frozen brain is
/// `brain-<name>`, and `interbrain_namespace_can_never_collide_with_a_brain`
/// fails the moment that stops being true.
pub const INTERBRAIN_NAMESPACE: &str = "interbrain";

/// The environment variable a **development** proof run uses to ask for a fresh
/// sandbox namespace. It never exists in a release build's resolution path.
pub const VARIANT_ENV: &str = "FILETOPO_SANDBOX_VARIANT";

/// Long enough to carry `task0019-l12-<timestamp>-<suffix>`, short enough that
/// no path built from it can be surprising.
pub const MAX_VARIANT_LENGTH: usize = 64;

/// Accepts a variant **name**, or says exactly why it is refused.
///
/// The charset is the guard: `[A-Za-z0-9_-]` admits no `/`, no `\`, no `.`,
/// no `:`, so `..`, `a/b`, `a\b`, `/abs` and `C:\abs` are all rejected by
/// the same rule rather than by a list of special cases somebody could leave
/// incomplete. There is no normalisation step and no repair: a refused value is
/// an error, never a value quietly turned into an acceptable one.
pub fn validate_variant(raw: &str) -> Result<&str, String> {
    if raw.is_empty() {
        return Err(format!("{VARIANT_ENV}: valeur vide refusée"));
    }
    if !raw
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err(format!(
            "{VARIANT_ENV}: « {raw} » refusé — un seul basename ASCII [A-Za-z0-9_-],              ni séparateur, ni « .. », ni chemin absolu"
        ));
    }
    if raw.len() > MAX_VARIANT_LENGTH {
        return Err(format!(
            "{VARIANT_ENV}: « {raw} » refusé — {} caractères, maximum {MAX_VARIANT_LENGTH}",
            raw.len()
        ));
    }
    Ok(raw)
}

/// The development sandbox, with or without a variant.
///
/// Split out of [`resolve`] so the confinement can be tested **without** the
/// process environment: `std::env` is global and shared by every test thread,
/// and a test that sets a variable to prove a path would be proving it about
/// whichever test happened to run beside it.
pub fn development_sandbox(
    repository: &Path,
    variant: Option<&str>,
) -> Result<SandboxPaths, String> {
    let base = repository.join(".filetopo-sandbox");
    match variant {
        None => Ok(SandboxPaths::labelled(base, "<dépôt>/.filetopo-sandbox")),
        Some(raw) => {
            let name = validate_variant(raw)?;
            Ok(SandboxPaths::labelled(
                base.join("variants").join(name),
                &format!("<dépôt>/.filetopo-sandbox/variants/{name}"),
            ))
        }
    }
}

/// Walks up from the working directory looking for this repository's markers.
///
/// Both markers are required: a lone `AGENTS.md` somewhere up the tree is not
/// proof that we are in the FileTopo checkout, and guessing wrong would mean
/// writing outside the repository.
pub fn repository_root() -> Option<PathBuf> {
    let mut current = std::env::current_dir().ok()?;
    loop {
        if current.join("AGENTS.md").is_file() && current.join("src-tauri").is_dir() {
            return Some(current);
        }
        if !current.pop() {
            return None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn index_never_lands_inside_the_analysed_tree() {
        let paths = SandboxPaths::under(PathBuf::from("/sandbox"));
        let fixture_root = paths.fixtures.join("wide");
        let database = paths.brain_map_database("brain-beta");

        assert!(
            !database.starts_with(&fixture_root),
            "I-2: {database:?} must not live inside {fixture_root:?}"
        );
        assert!(database.starts_with(&paths.brains));
    }

    /// `J10`, structurally: the rebuild deletes the brain's `map/`, so
    /// relations must not live there.
    #[test]
    fn relations_live_outside_the_rebuildable_index() {
        let paths = SandboxPaths::under(PathBuf::from("/sandbox"));
        let relations = paths.brain_relations_database("brain-alpha");
        let index = paths.brain_map_database("brain-alpha");
        let fixture_root = paths.fixtures.join("quasi-empty");

        assert!(!relations.starts_with(index.parent().expect("map dir")));
        assert!(!relations.starts_with(&fixture_root));
        assert!(relations.starts_with(paths.brain_root("brain-alpha")));
    }

    /// `K3`, at the layout level: two brains reading the **same** fixture get
    /// two **different** storage spaces.
    ///
    /// This is the assertion the whole slice turns on. If it ever holds only
    /// because the two brains happen to have different sources, it proves
    /// nothing — so the sources here are deliberately identical.
    #[test]
    fn two_brains_on_the_same_source_never_share_a_file() {
        let paths = SandboxPaths::under(PathBuf::from("/sandbox"));

        // Both read `quasi-empty`; the path never mentions it.
        let alpha_index = paths.brain_map_database("brain-alpha");
        let gamma_index = paths.brain_map_database("brain-gamma");
        let alpha_relations = paths.brain_relations_database("brain-alpha");
        let gamma_relations = paths.brain_relations_database("brain-gamma");
        let alpha_content = paths.brain_content_signals_database("brain-alpha");
        let gamma_content = paths.brain_content_signals_database("brain-gamma");

        assert_ne!(alpha_index, gamma_index);
        assert_ne!(alpha_relations, gamma_relations);
        assert_ne!(alpha_content, gamma_content);
        assert_eq!(
            paths.relative_name(&alpha_content),
            "brains/brain-alpha/signals/content.sqlite"
        );
        assert_eq!(
            paths.relative_name(&gamma_content),
            "brains/brain-gamma/signals/content.sqlite"
        );
        assert!(!alpha_index.starts_with(paths.brain_root("brain-gamma")));
        assert!(!gamma_index.starts_with(paths.brain_root("brain-alpha")));
        assert!(!alpha_relations.starts_with(paths.brain_root("brain-gamma")));
        assert!(!gamma_relations.starts_with(paths.brain_root("brain-alpha")));

        // The catalogue is shared, and it is the **only** thing that is.
        let catalog = paths.catalog_database();
        assert!(!catalog.starts_with(paths.brain_root("brain-alpha")));
        assert!(!catalog.starts_with(paths.brain_root("brain-gamma")));
    }

    #[test]
    fn a_published_storage_path_is_relative_to_the_sandbox_and_never_absolute() {
        let paths = SandboxPaths::labelled(
            PathBuf::from(r"C:\Users\quelquun\Documents\depot\.filetopo-sandbox"),
            "<dépôt>/.filetopo-sandbox",
        );
        let published = paths.relative_name(&paths.brain_map_database("brain-alpha"));

        assert_eq!(published, "brains/brain-alpha/map/index.sqlite");
        assert!(!published.contains("Users"));
        assert!(!published.contains(':'));
        assert!(!published.contains('\\'));
    }

    #[test]
    fn the_published_label_never_carries_an_absolute_path() {
        let paths = SandboxPaths::labelled(
            PathBuf::from(r"C:\Users\quelquun\Documents\depot\.filetopo-sandbox"),
            "<dépôt>/.filetopo-sandbox",
        );
        let shown = paths.display_root();
        assert_eq!(shown, "<dépôt>/.filetopo-sandbox");
        assert!(!shown.contains("Users"));
        assert!(!shown.contains(':'));
    }

    // -----------------------------------------------------------------------
    // Sandbox variants — reserve `X6`.
    //
    // `development_sandbox` is called directly rather than through `resolve`:
    // the variable lives in the process environment, which every test thread
    // shares, so a test that set it would be asserting about whichever test ran
    // beside it. What has to be proved is the mapping and the confinement, and
    // both are in this function.
    // -----------------------------------------------------------------------

    /// The repository root used by the variant tests. Never touched on disk —
    /// these assertions are about paths, and no file is created.
    fn checkout() -> PathBuf {
        PathBuf::from(r"C:\Users\quelquun\Documents\depot")
    }

    /// **The property the whole mechanism rests on.** No variable, nothing
    /// changes: the historical path, and the historical label.
    #[test]
    fn without_a_variant_the_development_path_is_exactly_the_historical_one() {
        let paths = development_sandbox(&checkout(), None).expect("no variant is always valid");

        assert_eq!(paths.root, checkout().join(".filetopo-sandbox"));
        assert_eq!(paths.display_root(), "<dépôt>/.filetopo-sandbox");
        assert_eq!(
            paths.brain_map_database("brain-alpha"),
            checkout()
                .join(".filetopo-sandbox")
                .join("brains")
                .join("brain-alpha")
                .join("map")
                .join("index.sqlite")
        );
    }

    #[test]
    fn a_valid_variant_lands_under_the_sandbox_and_nowhere_else() {
        let paths = development_sandbox(&checkout(), Some("task0019-l12-abc123"))
            .expect("a plain basename is valid");
        let sandbox = checkout().join(".filetopo-sandbox");

        assert_eq!(
            paths.root,
            sandbox.join("variants").join("task0019-l12-abc123")
        );
        assert!(paths.root.starts_with(&sandbox));
        // Everything derived from it is inside too — the catalogue included, so
        // a variant run cannot reach the shared catalogue by accident.
        assert!(paths.fixtures.starts_with(&sandbox));
        assert!(paths.brains.starts_with(&sandbox));
        assert!(paths.catalog_database().starts_with(&sandbox));
        assert!(
            paths
                .brain_relations_database("brain-alpha")
                .starts_with(&sandbox)
        );
    }

    /// A variant is a **name**, and every shape of « this is really a path » is
    /// refused. Not one case each: the whole list, so a future relaxation of the
    /// charset cannot quietly re-open one of them.
    #[test]
    fn every_shape_of_a_path_is_refused() {
        for refused in [
            "",          // empty
            "..",        // the parent itself
            "../x",      // escape by relative path
            r"..\x",     // the same, Windows separator
            "a/b",       // slash
            r"a\b",      // backslash
            "/abs",      // absolute, POSIX
            r"\\share",  // UNC
            r"C:\abs",   // absolute, Windows
            "C:",        // a drive letter is not a name
            "a.b",       // a dot is a path character; the charset excludes it
            "x/../../y", // traversal in the middle
            "a b",       // space
            "é",         // non-ASCII
            "%TEMP%",    // an expansion is not a name either
        ] {
            let error = match development_sandbox(&checkout(), Some(refused)) {
                Ok(paths) => panic!(
                    "« {refused} » must be refused, not repaired — it produced {:?}",
                    paths.root
                ),
                Err(error) => error,
            };
            // The error NAMES the variable, so a run that stops says why.
            assert!(
                error.contains("FILETOPO_SANDBOX_VARIANT"),
                "the refusal of « {refused} » must name the variable: {error}"
            );
        }
    }

    #[test]
    fn the_length_bound_is_enforced_at_exactly_sixty_four() {
        let longest = "a".repeat(MAX_VARIANT_LENGTH);
        let too_long = "a".repeat(MAX_VARIANT_LENGTH + 1);

        assert!(development_sandbox(&checkout(), Some(&longest)).is_ok());
        let error = development_sandbox(&checkout(), Some(&too_long))
            .expect_err("65 characters is refused");
        assert!(error.contains("maximum 64"), "{error}");
    }

    /// The one that matters if the charset ever changes: **no accepted variant
    /// can leave the sandbox**, whatever it says.
    #[test]
    fn no_accepted_variant_ever_escapes_the_sandbox() {
        let sandbox = checkout().join(".filetopo-sandbox");
        let candidates = [
            "",
            "..",
            "../x",
            r"..\x",
            "a/b",
            r"a\b",
            "/abs",
            r"C:\abs",
            "a.b",
            "%TEMP%",
            "ok",
            "task0019-l12-1757000000-9f3a",
            "_",
            "-",
            "A0",
        ];
        let mut accepted = 0;
        for candidate in candidates {
            if let Ok(paths) = development_sandbox(&checkout(), Some(candidate)) {
                accepted += 1;
                assert!(
                    paths.root.starts_with(&sandbox),
                    "« {candidate} » was accepted and escaped to {:?}",
                    paths.root
                );
                // `starts_with` compares components, so this also rules out a
                // sibling directory such as `.filetopo-sandbox-elsewhere`.
                assert!(paths.root.starts_with(sandbox.join("variants")));
            }
        }
        assert!(
            accepted >= 5,
            "the test proves nothing if nothing is accepted"
        );
    }

    /// `AGENTS.md`: no personal absolute path reaches the repository, and an
    /// artefact is exactly where one would slip through. A variant is part of
    /// the published label now, so it is checked here too.
    #[test]
    fn a_variant_label_stays_free_of_any_absolute_path() {
        let paths = development_sandbox(&checkout(), Some("task0019-l12-abc123"))
            .expect("a plain basename is valid");
        let shown = paths.display_root();

        assert_eq!(
            shown,
            "<dépôt>/.filetopo-sandbox/variants/task0019-l12-abc123"
        );
        assert!(!shown.contains("Users"));
        assert!(!shown.contains("quelquun"));
        assert!(!shown.contains(':'));
        assert!(!shown.contains('\\'));

        // And a published storage path is still relative to the variant root.
        let published = paths.relative_name(&paths.brain_relations_database("brain-alpha"));
        assert_eq!(published, "brains/brain-alpha/relations/relations.sqlite");
        assert!(!published.contains("Users"));
        assert!(!published.contains(':'));
    }

    /// `TASK-0020` §4.1 — the common store is beside the brains, never inside
    /// one, never under a rebuildable `map/`, and never the catalogue.
    #[test]
    fn the_interbrain_store_belongs_to_no_single_brain() {
        let paths = SandboxPaths::under(PathBuf::from("/sandbox"));
        let common = paths.interbrain_relations_database();

        assert_eq!(
            paths.relative_name(&common),
            "brains/interbrain/relations.sqlite"
        );
        // Not inside any brain's own space, and not the catalogue.
        for brain_id in ["brain-alpha", "brain-beta", "brain-gamma"] {
            assert!(
                !common.starts_with(paths.brain_root(brain_id)),
                "the common store must not live inside {brain_id}"
            );
            assert_ne!(common, paths.brain_relations_database(brain_id));
            assert_ne!(common, paths.brain_map_database(brain_id));
        }
        assert_ne!(common, paths.catalog_database());
        // A rebuild replaces `map/`; the common store must not be under one.
        assert!(!common.components().any(|part| part.as_os_str() == "map"));
        // And never inside an analysed tree — `I-2`.
        assert!(!common.starts_with(&paths.fixtures));
    }

    /// The namespace is not a `brain_id`, and cannot become one by accident.
    ///
    /// `brain_root("interbrain")` and `interbrain_root()` would be the same
    /// directory, so a brain by that name would read the common store as its
    /// own. The catalogue holds three frozen brains and none of them is called
    /// that; this fails the day one is.
    #[test]
    fn interbrain_namespace_can_never_collide_with_a_brain() {
        for frozen in crate::map::brains::FROZEN_BRAINS {
            assert_ne!(
                frozen.brain_id, INTERBRAIN_NAMESPACE,
                "`{}` would read the common inter-brain store as its own",
                frozen.brain_id
            );
            assert!(frozen.brain_id.starts_with("brain-"));
        }
    }

    #[test]
    fn a_release_style_resolution_stays_under_the_application_directory() {
        let app_data = PathBuf::from("/app-data");
        let paths = SandboxPaths::under(app_data.join("sandbox"));
        assert!(paths.fixtures.starts_with(&app_data));
        assert!(paths.brains.starts_with(&app_data));
        assert!(paths.catalog_database().starts_with(&app_data));
        assert!(
            paths
                .brain_map_database("brain-alpha")
                .starts_with(&app_data)
        );
    }
}
