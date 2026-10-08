//! `TASK-0055` / `F-046` — one physical Windows object, several occurrences.
//!
//! `DEC-0052` splits two things the model used to confuse: a `nodes.id` is **one
//! entry of the tree**, while a `SYSTEM` stable key is **one physical object
//! Windows identifies**, which several hard links may legitimately share. These
//! tests exercise that on the real production pipeline — the real scanner, the
//! real Windows identity, `refresh_map`/`rebuild_map` and `W-B` exactly as the
//! product calls them — plus the real SHA-256 campaign, because the whole point
//! of `F-046` is that *same physical object* and *identical content* are
//! different facts that must never be read as one another.
//!
//! The fixture is the one `TASK-0055` §8 names, created by the harness **before**
//! any acceptance fingerprint is taken:
//!
//! * `a.bin` — an ordinary file;
//! * `b-hardlink.bin` — a **real hard link** to `a.bin`, through
//!   [`std::fs::hard_link`], so no dependency is added to create it;
//! * `c-copy.bin` — the same bytes, copied: identical content, different object;
//! * `vide-un.bin` and `vide-deux.bin` — two distinct empty files: identical
//!   content again, and no relation whatsoever.
//!
//! Every tree is built by the test that reads it, under a `tempfile` directory,
//! from synthetic names. **No personal folder, no real data.**

use super::watch_scope_tests::{Fx, diff, reference_rows};
use super::{open_store, refresh_map};
use crate::index::{PhysicalObjectIdentity, physical_object_fact};
use crate::map::brains::BrainRecord;
use crate::map::content_signals::{
    ExactDuplicateMember, exact_duplicate_groups, exact_duplicate_members, exact_duplicate_summary,
    observe_content,
};
use crate::map::sandbox::SandboxPaths;
use std::collections::BTreeSet;
use std::fs;
use std::path::Path;

const CONTENT: &[u8] = b"octets synthetiques de TASK-0055";

/// The `TASK-0055` §8 fixture. `hard_link` is the only new filesystem call, and
/// it is `std`: on a platform where it fails, the tests that need a real shared
/// object are `#[cfg(windows)]` and simply do not run.
fn fixture(root: &Path) {
    fs::write(root.join("a.bin"), CONTENT).unwrap();
    fs::hard_link(root.join("a.bin"), root.join("b-hardlink.bin"))
        .expect("a real hard link to a.bin");
    fs::write(root.join("c-copy.bin"), CONTENT).unwrap();
    fs::write(root.join("vide-un.bin"), b"").unwrap();
    fs::write(root.join("vide-deux.bin"), b"").unwrap();
}

/// A tree with no hard link at all, for the `UNKNOWN`/fallback side.
fn plain(root: &Path) {
    fs::write(root.join("seul.bin"), CONTENT).unwrap();
}

/// The stable key and provenance stored for a path — **test-only**, and the only
/// place in these tests where a raw key is ever looked at. No DTO, log or
/// artefact may carry it; `no_dto_or_artifact_can_carry_a_raw_identity` is what
/// proves that.
fn stored_identity(fx: &Fx, relative: &str) -> (Option<String>, Option<String>) {
    let store = open_store(&fx.paths, &fx.brain).expect("open");
    store
        .index
        .connection
        .query_row(
            "SELECT stable_key, identity_provenance FROM nodes WHERE relative_path = ?1",
            [relative],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or_else(|error| panic!("no row at {relative:?}: {error}"))
}

/// Writes straight into the Index — test-only, to put it in a state the product
/// cannot produce (`PATH_FALLBACK` on a Windows file, or no identity at all) and
/// check that the classification stays honest about it.
fn force(fx: &Fx, statement: &str) {
    let store = crate::map::brain_index::BrainIndex::open_existing(&fx.database(), true)
        .expect("writable store");
    store
        .index
        .connection
        .execute(statement, [])
        .expect("forced update");
}

/// The classification the product would publish for a path, read through the
/// very primitive the DTO uses.
fn classify(fx: &Fx, relative: &str) -> (PhysicalObjectIdentity, Option<usize>) {
    let store = open_store(&fx.paths, &fx.brain).expect("open");
    let fact = physical_object_fact(&store.index.connection, relative).expect("fact");
    (fact.identity, fact.occurrence_count)
}

/// The members of the one SHA-256 group these bytes form, by path, after a real
/// content campaign.
fn duplicate_members(paths: &SandboxPaths, brain: &BrainRecord) -> Vec<ExactDuplicateMember> {
    observe_content(paths, brain).expect("content campaign");
    served_members(paths, brain)
}

/// The same page, **read only** — what the explorer receives when it opens on an
/// Index whose content campaign already ran. No second campaign, so the
/// campaign's own `observedAtUnixMs` and `generationId` are the stored ones.
fn served_members(paths: &SandboxPaths, brain: &BrainRecord) -> Vec<ExactDuplicateMember> {
    let summary = exact_duplicate_summary(paths, brain).expect("summary");
    assert!(summary.exact_group_count >= 1, "{summary:?}");
    let groups = exact_duplicate_groups(paths, brain, 0, 100).expect("groups");
    let mut members = Vec::new();
    for group in &groups.groups {
        let page = exact_duplicate_members(paths, brain, &group.group_id, 0, 100).expect("members");
        members.extend(page.members);
    }
    members
}

fn member<'a>(members: &'a [ExactDuplicateMember], path: &str) -> &'a ExactDuplicateMember {
    members
        .iter()
        .find(|candidate| candidate.relative_path == path)
        .unwrap_or_else(|| panic!("no member at {path:?}"))
}

// ==========================================================================
// `DEC-0052` J — the six things `TASK-0055` may not close F-046 without
// ==========================================================================

/// **J1 and the heart of the slice.** Two hard links are two occurrences of one
/// physical object: indexing succeeds (it was refused as an `IdentityCollision`
/// before `TASK-0055`), the two entries get two distinct `nodes.id`, and they
/// carry the *same* `SYSTEM` identity.
#[test]
#[cfg(windows)]
fn two_hard_links_are_two_occurrences_of_one_physical_object() {
    let fx = Fx::with_tree("racine-liens", fixture);

    let a = fx.id("a.bin");
    let b = fx.id("b-hardlink.bin");
    assert_ne!(a, b, "two occurrences are two nodes");

    let (key_a, provenance_a) = stored_identity(&fx, "a.bin");
    let (key_b, provenance_b) = stored_identity(&fx, "b-hardlink.bin");
    assert_eq!(
        provenance_a.as_deref(),
        Some("SYSTEM"),
        "a plain local file reaches the Windows identity"
    );
    assert_eq!(provenance_b.as_deref(), Some("SYSTEM"));
    assert_eq!(
        key_a, key_b,
        "two hard links are the same VolumeSerialNumber + FileId"
    );

    assert_eq!(
        classify(&fx, "a.bin"),
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
    assert_eq!(
        classify(&fx, "b-hardlink.bin"),
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
    fx.assert_parity("a shared physical object");
}

/// **J2.** A byte-for-byte copy has the same digest and a **different** physical
/// object: the two facts are separate, and the copy is `PROVEN_SINGLE`.
#[test]
#[cfg(windows)]
fn a_byte_for_byte_copy_shares_the_digest_but_is_a_different_physical_object() {
    let fx = Fx::with_tree("racine-copie", fixture);
    let (key_a, _) = stored_identity(&fx, "a.bin");
    let (key_c, provenance_c) = stored_identity(&fx, "c-copy.bin");
    assert_eq!(provenance_c.as_deref(), Some("SYSTEM"));
    assert_ne!(key_a, key_c, "a copy is a different physical object");
    assert_eq!(
        classify(&fx, "c-copy.bin"),
        (PhysicalObjectIdentity::ProvenSingle, Some(1))
    );

    // …and the content campaign puts all three in **one** digest group.
    let members = duplicate_members(&fx.paths, &fx.brain);
    let group: BTreeSet<&str> = members
        .iter()
        .filter(|candidate| candidate.size_bytes as usize == CONTENT.len())
        .map(|candidate| candidate.relative_path.as_str())
        .collect();
    assert_eq!(
        group,
        BTreeSet::from(["a.bin", "b-hardlink.bin", "c-copy.bin"]),
        "identical content groups all three"
    );
    assert_eq!(
        member(&members, "a.bin").physical_object,
        PhysicalObjectIdentity::ProvenShared
    );
    assert_eq!(member(&members, "a.bin").physical_occurrence_count, Some(2));
    assert_eq!(
        member(&members, "c-copy.bin").physical_object,
        PhysicalObjectIdentity::ProvenSingle,
        "same bytes is not the same object"
    );
    assert_eq!(
        member(&members, "c-copy.bin").physical_occurrence_count,
        Some(1)
    );
}

/// **J3.** Two distinct empty files share a digest and produce **no** logical
/// relation — neither does the hard link, nor the copy. The relation stores are
/// byte-identical before and after the whole campaign.
#[test]
#[cfg(windows)]
fn identical_content_never_creates_a_logical_relation_by_itself() {
    let fx = Fx::with_tree("racine-vides", fixture);
    let relations_before = relation_digest(&fx);

    let members = duplicate_members(&fx.paths, &fx.brain);
    let empties: BTreeSet<&str> = members
        .iter()
        .filter(|candidate| candidate.size_bytes == 0)
        .map(|candidate| candidate.relative_path.as_str())
        .collect();
    assert_eq!(
        empties,
        BTreeSet::from(["vide-deux.bin", "vide-un.bin"]),
        "the two empty files form one digest group"
    );
    for path in ["vide-un.bin", "vide-deux.bin"] {
        assert_eq!(
            classify(&fx, path),
            (PhysicalObjectIdentity::ProvenSingle, Some(1)),
            "{path}: two empty files are two objects"
        );
    }
    assert_eq!(
        relation_digest(&fx),
        relations_before,
        "no relation, suggestion or edge is created by a shared digest"
    );
}

/// Every relation-bearing store of this brain, as bytes — the honest way to say
/// "nothing was created": compare the files themselves.
#[cfg(windows)]
fn relation_digest(fx: &Fx) -> Vec<(String, Option<Vec<u8>>)> {
    [
        fx.paths.brain_relations_database(&fx.brain.brain_id),
        fx.paths.catalog_database(),
    ]
    .into_iter()
    .map(|path| {
        (
            path.file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_default(),
            fs::read(&path).ok(),
        )
    })
    .collect()
}

/// **J4.** `F-004` is untouched for an unshared `SYSTEM` object: a rename keeps
/// its `nodes.id`. Replayed here on a tree that *also* contains a shared group,
/// so the group logic cannot have quietly broken the simple case.
#[test]
#[cfg(windows)]
fn an_unshared_system_file_still_keeps_its_node_id_across_a_rename() {
    let fx = Fx::with_tree("racine-f004", fixture);
    let before = fx.id("c-copy.bin");
    fs::rename(fx.path("c-copy.bin"), fx.path("c-renomme.bin")).unwrap();
    refresh_map(&fx.paths, &fx.brain).expect("refresh");
    assert_eq!(
        fx.id("c-renomme.bin"),
        before,
        "an unshared SYSTEM rename keeps its id"
    );
    assert!(!fx.has("c-copy.bin"));
    fx.assert_parity("after an unshared rename");
}

/// **`DEC-0052` §5, the four obligatory examples**, on the real pipeline.
///
/// Each assertion is the one the previous model could not even reach: the first
/// `refresh_map` of a tree holding two hard links was refused outright.
#[test]
#[cfg(windows)]
fn a_shared_group_pairs_by_exact_path_and_never_correlates_an_alias() {
    let fx = Fx::with_tree("racine-groupe", |root| {
        fs::write(root.join("a.bin"), CONTENT).unwrap();
    });
    let original = fx.id("a.bin");

    // 1 — a hard link appears: the original path keeps its id, the alias is new.
    fs::hard_link(fx.path("a.bin"), fx.path("b.bin")).unwrap();
    refresh_map(&fx.paths, &fx.brain).expect("a hard link appears");
    assert_eq!(fx.id("a.bin"), original);
    let alias = fx.id("b.bin");
    assert_ne!(alias, original);
    fx.assert_parity("a hard link appeared");

    // 2 — both unchanged: both ids survive.
    refresh_map(&fx.paths, &fx.brain).expect("unchanged");
    assert_eq!(fx.id("a.bin"), original);
    assert_eq!(fx.id("b.bin"), alias);

    // 3 — one alias renamed: the unchanged path keeps its id and the renamed
    //     alias is **not** correlated by supposition (`ACTION-0102` §5).
    fs::rename(fx.path("b.bin"), fx.path("c.bin")).unwrap();
    refresh_map(&fx.paths, &fx.brain).expect("an alias renamed");
    assert_eq!(fx.id("a.bin"), original, "the unchanged path keeps its id");
    let renamed = fx.id("c.bin");
    assert_ne!(
        renamed, alias,
        "no alias may be paired by order, name, date or proximity"
    );
    assert_ne!(renamed, original);
    fx.assert_parity("an alias renamed");

    // 4 — back to a single occurrence, at the unchanged path: it keeps its id.
    fs::remove_file(fx.path("c.bin")).unwrap();
    refresh_map(&fx.paths, &fx.brain).expect("back to one");
    assert_eq!(fx.id("a.bin"), original);
    assert!(!fx.has("c.bin"));
    assert_eq!(
        classify(&fx, "a.bin"),
        (PhysicalObjectIdentity::ProvenSingle, Some(1)),
        "one occurrence again"
    );
    fx.assert_parity("back to one occurrence");
}

/// **J5 — the incremental paths may not reintroduce the collision.** The watcher's
/// targeted reconciliation (`W-B`) sees a hard link appear, then disappear, and
/// each time lands on exactly what a full scan would have produced.
///
/// The hard link is created in a **subdirectory** while the original stays at the
/// root, which the scope does not re-list: that is precisely the reading where a
/// partial picture would make a new alias indistinguishable from a rename of the
/// object it points at.
#[test]
#[cfg(windows)]
fn the_watcher_path_never_moves_the_original_when_a_hard_link_appears() {
    let fx = Fx::with_tree("racine-watcher", |root| {
        fs::write(root.join("a.bin"), CONTENT).unwrap();
        fs::create_dir_all(root.join("ailleurs")).unwrap();
        fs::write(root.join("ailleurs/garde.txt"), b"garde").unwrap();
    });
    let original = fx.id("a.bin");
    let guard = fx.id("ailleurs/garde.txt");

    fs::hard_link(fx.path("a.bin"), fx.path("ailleurs/alias.bin")).unwrap();
    let applied = fx
        .scoped(&["ailleurs"])
        .expect("a targeted reconciliation of the subdirectory");
    assert!(applied.applied);
    assert_eq!(
        fx.id("a.bin"),
        original,
        "the original, outside the scope, must not be moved into the scope"
    );
    assert_eq!(fx.id("ailleurs/garde.txt"), guard);
    let alias = fx.id("ailleurs/alias.bin");
    assert_ne!(alias, original);
    fx.assert_parity("W-B: a hard link appeared outside the original's directory");

    // The alias goes away again: only the alias disappears.
    fs::remove_file(fx.path("ailleurs/alias.bin")).unwrap();
    fx.scoped(&["ailleurs"]).expect("the alias disappears");
    assert_eq!(fx.id("a.bin"), original);
    assert!(!fx.has("ailleurs/alias.bin"));
    fx.assert_parity("W-B: the alias disappeared");
}

/// `W-B` on the directory that holds **both** occurrences: the group is whole in
/// the scope's own reading, both ids survive a modification of one of them, and
/// the Index still equals a full scan.
#[test]
#[cfg(windows)]
fn the_watcher_path_keeps_both_occurrences_of_a_shared_group_in_one_scope() {
    let fx = Fx::with_tree("racine-watcher-meme-dossier", |root| {
        fs::create_dir_all(root.join("ensemble")).unwrap();
        fs::write(root.join("ensemble/a.bin"), CONTENT).unwrap();
        fs::hard_link(
            root.join("ensemble/a.bin"),
            root.join("ensemble/b-hardlink.bin"),
        )
        .unwrap();
    });
    let a = fx.id("ensemble/a.bin");
    let b = fx.id("ensemble/b-hardlink.bin");
    assert_ne!(a, b);

    // Writing through one link changes the single object behind both entries.
    fs::write(
        fx.path("ensemble/a.bin"),
        b"octets synthetiques, plus longs",
    )
    .unwrap();
    fx.scoped(&["ensemble"]).expect("a modification");
    assert_eq!(fx.id("ensemble/a.bin"), a, "neither id is reassigned");
    assert_eq!(fx.id("ensemble/b-hardlink.bin"), b);
    fx.assert_parity("W-B: both occurrences of one object in one scope");
}

/// A full **Reconstruire** and a cold reopening both land on the same facts: the
/// shared group is not a property of one publication.
#[test]
#[cfg(windows)]
fn a_rebuild_and_a_cold_reopen_preserve_the_shared_group() {
    let fx = Fx::with_tree("racine-rebuild", fixture);
    let shared_before = classify(&fx, "a.bin");
    assert_eq!(
        shared_before,
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
    let rows_before = fx.rows();

    super::rebuild_map(&fx.paths, &fx.brain).expect("rebuild");
    assert_eq!(
        classify(&fx, "a.bin"),
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
    assert_eq!(
        classify(&fx, "b-hardlink.bin"),
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
    assert_ne!(fx.id("a.bin"), fx.id("b-hardlink.bin"));

    // A cold reopening reads the same rows from the file, with no publication.
    assert!(
        diff(&rows_before, &fx.rows()).is_none(),
        "a rebuild of an unchanged tree changes no row"
    );
    assert!(
        diff(&fx.rows(), &reference_rows(&fx.root, true)).is_none(),
        "and a brand-new brain over the same tree agrees"
    );
}

// ==========================================================================
// `TASK-0055` §10 — when nothing is provable, the answer is `UNKNOWN`
// ==========================================================================

/// A `PATH_FALLBACK` occurrence is `UNKNOWN`, never `PROVEN_SINGLE`: that key is
/// an occurrence key and says nothing about a physical object. Falsification 5.
#[test]
fn a_path_fallback_occurrence_is_unknown_never_proven_single() {
    let fx = Fx::with_tree("racine-fallback", plain);
    force(
        &fx,
        "UPDATE nodes SET identity_provenance = 'PATH_FALLBACK' \
         WHERE relative_path = 'seul.bin'",
    );
    assert_eq!(
        classify(&fx, "seul.bin"),
        (PhysicalObjectIdentity::Unknown, None)
    );
}

/// No durable identity at all, and a path the Index does not hold: `UNKNOWN`
/// with no count, in both cases.
#[test]
fn an_unstamped_row_or_an_unknown_path_is_unknown_with_no_count() {
    let fx = Fx::with_tree("racine-inconnu", plain);
    assert_eq!(
        classify(&fx, "jamais-indexe.bin"),
        (PhysicalObjectIdentity::Unknown, None)
    );
    force(
        &fx,
        "UPDATE nodes SET stable_key = NULL, identity_provenance = NULL \
         WHERE relative_path = 'seul.bin'",
    );
    assert_eq!(
        classify(&fx, "seul.bin"),
        (PhysicalObjectIdentity::Unknown, None)
    );
}

/// The count is **brain-scoped**: a second brain over the same tree never adds to
/// the first brain's occurrence count, and vice versa.
#[test]
#[cfg(windows)]
fn the_occurrence_count_is_scoped_to_one_brain() {
    let fx = Fx::with_tree("racine-portee", fixture);
    let second = super::register_real_root(&fx.paths, &fx.root).expect("a second brain");
    refresh_map(&fx.paths, &second).expect("second baseline");
    assert_ne!(second.brain_id, fx.brain.brain_id);

    let store = open_store(&fx.paths, &second).expect("open the second brain");
    let fact = physical_object_fact(&store.index.connection, "a.bin").expect("fact");
    assert_eq!(fact.identity, PhysicalObjectIdentity::ProvenShared);
    assert_eq!(
        fact.occurrence_count,
        Some(2),
        "two occurrences in this brain, not four across two brains"
    );
    assert_eq!(
        classify(&fx, "a.bin"),
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
}

// ==========================================================================
// `TASK-0055` §11 — the falsifications, as tests that fail if a guard goes
// ==========================================================================

/// **Falsification 6 and 7.** No raw identity can reach a DTO, the DOM, a log or
/// an artefact — proven two ways: the serialised member DTO is scanned for every
/// forbidden spelling, and the production source of the module that builds it is
/// scanned for any attempt to put one there.
#[test]
#[cfg(windows)]
fn no_dto_or_artifact_can_carry_a_raw_identity() {
    let fx = Fx::with_tree("racine-fuite", fixture);
    let (key, _) = stored_identity(&fx, "a.bin");
    let key = key.expect("the fixture really has a SYSTEM key");
    let members = duplicate_members(&fx.paths, &fx.brain);
    let serialized = serde_json::to_string(&members).expect("serialize the page");

    assert!(
        !serialized.contains(&key),
        "the raw stable key must never be serialised"
    );
    // The volume serial and the file id are the two halves of that key; neither
    // may appear on its own either, nor any field named after them.
    for half in key.split(':').skip(1) {
        assert!(
            !serialized.contains(half),
            "a half of the identity leaked: {half}"
        );
    }
    for forbidden in [
        "stableKey",
        "stable_key",
        "SYS1",
        "PFv1",
        "volumeSerial",
        "VolumeSerialNumber",
        "fileId",
        "FileId",
        "identityProvenance",
    ] {
        assert!(
            !serialized.contains(forbidden),
            "{forbidden} must not appear in a member DTO: {serialized}"
        );
    }
    // And the classification itself is one of exactly three closed values.
    for member in &members {
        assert!(
            matches!(
                member.physical_object,
                PhysicalObjectIdentity::ProvenShared
                    | PhysicalObjectIdentity::ProvenSingle
                    | PhysicalObjectIdentity::Unknown
            ),
            "{member:?}"
        );
        assert_eq!(
            member.physical_occurrence_count.is_none(),
            member.physical_object == PhysicalObjectIdentity::Unknown,
            "UNKNOWN carries no count, and a proven fact always does: {member:?}"
        );
    }
}

/// The same, structurally, on the code: the module that builds the DTO never
/// selects `stable_key` into one, and the DTO type names no identity field. The
/// technique is the one `DEC-0033` I already uses in this codebase.
#[test]
fn the_duplicate_dto_names_no_identity_field_in_source() {
    let source = include_str!("content_signals.rs");
    let production = source
        .split_once("mod tests {")
        .map_or(source, |(before, _)| before);
    let body = production
        .split_once("pub struct ExactDuplicateMember {")
        .expect("the DTO")
        .1
        .split_once('}')
        .expect("its body")
        .0;
    // The **fields**, not the prose: a doc comment is allowed to name what the
    // DTO deliberately does not carry, and this test must read the declarations.
    let fields = body
        .lines()
        .map(str::trim)
        .filter(|line| line.starts_with("pub "))
        .collect::<Vec<_>>()
        .join("\n");
    for forbidden in ["stable_key", "volume", "file_id", "provenance"] {
        assert!(
            !fields.contains(forbidden),
            "ExactDuplicateMember must not carry {forbidden}: {fields}"
        );
    }
    assert!(
        fields.contains("physical_object: PhysicalObjectIdentity"),
        "it carries the closed classification instead: {fields}"
    );
}

// ==========================================================================
// `ACTION-0103` A — no **derivative** of the physical identity reaches the
// product either
// ==========================================================================
//
// The audits above search the serialised payload for the key and its halves.
// Independent control showed what that technique cannot see: a *digest* of the
// identity contains none of those strings. `BrainIndex::reconstructible_digest`
// fed `stable_key` and `identity_provenance` into its bytes and the result
// crossed IPC as `MapBuildReport.reconstructible_digest`, so a public value was
// influenced by the Windows physical identity of the analysed files. `DEC-0052`
// F forbids exactly that — the raw values *and* any hash or encoding of them.
//
// The three tests below are influence tests, not substring tests: they change
// the identity material and require the public value not to move.

/// The public digest of a path, as `MapBuildReport` publishes it.
fn public_digest(fx: &Fx) -> String {
    open_store(&fx.paths, &fx.brain)
        .expect("open")
        .reconstructible_digest()
        .expect("digest")
}

/// The required discriminating test, in its five steps: the public digest must
/// be **blind** to identity material and **sensitive** to the logical tree it
/// exists to prove (`H7`).
#[test]
#[cfg(windows)]
fn the_public_reconstructible_digest_ignores_identity_and_follows_the_logical_tree() {
    let fx = Fx::with_tree("racine-digest", fixture);
    let before = public_digest(&fx);

    // 2 and 3. Only the identity material changes — to the most extreme value a
    // test can write, one key for every row and a provenance the product would
    // never put on a Windows file. The digest may not move by one bit.
    force(&fx, "UPDATE nodes SET stable_key = 'SYS1:0:0'");
    assert_eq!(
        public_digest(&fx),
        before,
        "the public digest must not see a stable key"
    );
    force(
        &fx,
        "UPDATE nodes SET identity_provenance = 'PATH_FALLBACK'",
    );
    assert_eq!(public_digest(&fx), before, "nor a provenance");
    force(
        &fx,
        "UPDATE nodes SET stable_key = NULL, identity_provenance = NULL",
    );
    assert_eq!(public_digest(&fx), before, "nor the absence of both");

    // 4 and 5. A genuine reconstructible field moves it, otherwise the digest
    // would prove nothing at all.
    force(
        &fx,
        "UPDATE nodes SET size_bytes = size_bytes + 1 WHERE relative_path = 'a.bin'",
    );
    let after_size = public_digest(&fx);
    assert_ne!(after_size, before, "a size is reconstructible");
    force(
        &fx,
        "UPDATE nodes SET relative_path = 'a-renomme.bin', name = 'a-renomme.bin' \
         WHERE relative_path = 'a.bin'",
    );
    assert_ne!(public_digest(&fx), after_size, "so is a path");
}

/// The generalised leak audit: relabel every physical identity **injectively**.
/// The sharing structure is untouched — the two hard links still share one key,
/// the copy still has its own — so the closed classification `DEC-0052` G does
/// allow in the DTO is unchanged by construction, and *everything else the
/// product publishes must be byte-identical*. Any value derived from the
/// identity, by hash, encoding or ordering, moves here even though no forbidden
/// string ever appears.
#[test]
#[cfg(windows)]
fn an_injective_relabelling_of_the_physical_identities_changes_nothing_public() {
    let fx = Fx::with_tree("racine-relabel", fixture);
    let members_before = serde_json::to_string(&duplicate_members(&fx.paths, &fx.brain))
        .expect("serialize the page");
    let digest_before = public_digest(&fx);
    let (shared_before, _) = stored_identity(&fx, "a.bin");

    // `hex()` of the stored key: a different value for every different key, the
    // same value for equal keys. The relabelling is therefore injective and
    // preserves which occurrences share an object.
    force(
        &fx,
        "UPDATE nodes SET stable_key = 'SYS1:relabel:' || hex(stable_key)",
    );
    let (shared_after, _) = stored_identity(&fx, "a.bin");
    assert_ne!(shared_before, shared_after, "the identities really changed");
    assert_eq!(
        stored_identity(&fx, "b-hardlink.bin").0,
        shared_after,
        "and the two hard links still share one object"
    );

    assert_eq!(
        public_digest(&fx),
        digest_before,
        "the public digest is not a function of the identities"
    );
    assert_eq!(
        serde_json::to_string(&served_members(&fx.paths, &fx.brain)).expect("serialize the page"),
        members_before,
        "nor is any byte of the duplicate page"
    );
}

/// The structural half of the audit, repo-wide. A payload scan cannot see a
/// hash, so what is pinned here is **which production files may read identity
/// material at all**: the privileged core that computes, stores and correlates
/// it. A new reader anywhere else — including one that only hashes the value —
/// fails this test and has to be looked at.
#[test]
fn only_the_privileged_core_reads_identity_material_in_production() {
    /// Each file, and why it is allowed to see a stable key or a provenance.
    const PRIVILEGED: [(&str, &str); 8] = [
        (
            "identity.rs",
            "computes the identity and owns the pairing rule",
        ),
        ("index.rs", "stores it and classifies the physical object"),
        ("incremental.rs", "verifies the producer's pairing"),
        ("reconcile.rs", "producer: full-scan pairing"),
        ("scope.rs", "producer: W-B pairing"),
        ("scanner.rs", "carries it from the OS to the publication"),
        (
            "change_journal.rs",
            "tests `stable_key IS NULL`, never the value",
        ),
        (
            "watch_ops.rs",
            "compares the root's own key, returns a closed reason",
        ),
    ];
    // The benchmark is a `#[cfg(feature = "bench")]` harness, not a product path.
    const NOT_PRODUCT: [&str; 1] = ["incremental_bench.rs"];

    let mut offenders = Vec::new();
    let mut seen = BTreeSet::new();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut stack = vec![root.clone()];
    while let Some(directory) = stack.pop() {
        let mut entries = fs::read_dir(&directory)
            .expect("read the crate source")
            .map(|entry| entry.expect("source entry").path())
            .collect::<Vec<_>>();
        entries.sort();
        for path in entries {
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            let name = path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string();
            // Tests are not the product surface, and `#[cfg(test)]` code never
            // ships: this audit is about what a release binary can read.
            if !name.ends_with(".rs")
                || name.ends_with("_tests.rs")
                || NOT_PRODUCT.contains(&name.as_str())
            {
                continue;
            }
            let source = fs::read_to_string(&path).expect("read a source file");
            let production = source
                .split_once("mod tests {")
                .map_or(source.as_str(), |(before, _)| before)
                .lines()
                // A comment may name what a module deliberately does not read —
                // `brain_index.rs` documents this very corrective — so only code
                // counts.
                .filter(|line| {
                    let trimmed = line.trim_start();
                    !trimmed.starts_with("//") && !trimmed.starts_with("*")
                })
                .collect::<Vec<_>>()
                .join("\n");
            if production.contains("stable_key") || production.contains("identity_provenance") {
                seen.insert(name.clone());
                if !PRIVILEGED.iter().any(|(allowed, _)| *allowed == name) {
                    offenders.push(name);
                }
            }
        }
    }

    assert!(
        offenders.is_empty(),
        "these files read identity material and are not declared privileged: {offenders:?}"
    );
    // And the list does not rot: every declared file must still be a reader.
    for (allowed, why) in PRIVILEGED {
        assert!(
            seen.contains(allowed),
            "{allowed} no longer reads identity material ({why}); remove it from the list"
        );
    }
    // The one that must not come back.
    assert!(
        !seen.contains("brain_index.rs"),
        "`ACTION-0103` A: the public digest's module must not read identity material again"
    );
}

// ==========================================================================
// `TASK-0055` §3 — the schema `6 → 7` migration, under the `M-B` envelope
// ==========================================================================

/// A real, product-built index reduced to the exact v6 shape migrates to v7, and
/// the thing it could not do before — hold two occurrences of one `SYSTEM` key —
/// then works. Falsification 2 in reverse: a shared key is no longer a collision.
#[test]
#[cfg(windows)]
fn a_real_v6_index_migrates_to_v7_and_then_accepts_a_shared_system_key() {
    let fx = Fx::with_tree("racine-v6", |root| {
        fs::write(root.join("a.bin"), CONTENT).unwrap();
    });
    let database = fx.database();
    let identity_before = {
        let store = open_store(&fx.paths, &fx.brain).expect("open");
        store.index.identity().expect("identity")
    };
    let rows_before = fx.rows();

    super::seen_state_tests::downgrade_to_schema_v6(&database);
    assert_eq!(raw_schema_version(&database), 6, "the fixture is really v6");
    assert!(
        stable_key_index_is_unique(&database),
        "a v6 file carries the UNIQUE index"
    );

    // The product's own **Ouvrir** migrates it, inside the `M-B` envelope.
    let report = super::open_map(&fx.paths, &fx.brain).expect("map_open migrates a v6 index");
    assert!(!report.source_read, "migrating never reads the source");
    assert_eq!(report.index_id, identity_before.index_id);
    assert_eq!(
        report.revision, identity_before.revision,
        "a migration is not a rebuild"
    );
    assert_eq!(
        raw_schema_version(&database),
        crate::map::store::MAP_SCHEMA_VERSION
    );
    assert_eq!(raw_schema_version(&database), 7);
    assert!(
        !stable_key_index_is_unique(&database),
        "the index is back, non unique"
    );
    assert!(
        !super::stable_identity_tests::safety_copy_path(&database).exists(),
        "the safety copy is settled"
    );
    assert!(
        diff(&rows_before, &fx.rows()).is_none(),
        "no row is rewritten by this migration"
    );

    // And the case the v6 schema refused now publishes.
    fs::hard_link(fx.path("a.bin"), fx.path("b-hardlink.bin")).unwrap();
    refresh_map(&fx.paths, &fx.brain).expect("a hard link on a migrated index");
    assert_ne!(fx.id("a.bin"), fx.id("b-hardlink.bin"));
    assert_eq!(
        classify(&fx, "a.bin"),
        (PhysicalObjectIdentity::ProvenShared, Some(2))
    );
}

/// **Falsification 9.** A `6 → 7` migration that fails **after** the `DROP INDEX`
/// must not leave half a schema.
///
/// The failure is injected on the step's **last** statement — the version stamp —
/// so both the `DROP INDEX` and the `CREATE INDEX` have already run inside the
/// transaction when it fires. That is a genuine failure mid-mutation, not a
/// refusal before anything happened, and what it must produce is the whole v6
/// file back: `user_version` at 6 and the `UNIQUE` index restored.
#[test]
fn a_v6_to_v7_migration_that_fails_after_the_drop_restores_the_v6_file() {
    let fx = Fx::with_tree("racine-v6-echec", plain);
    let database = fx.database();
    let rows_before = fx.rows();
    let nodes_before = node_count(&database);

    super::seen_state_tests::downgrade_to_schema_v6(&database);
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch(
            "CREATE TRIGGER refuse_v7 BEFORE INSERT ON schema_meta
                 WHEN NEW.key = 'schema_version' AND NEW.value = '7'
             BEGIN SELECT RAISE(ABORT, 'injected-v7'); END;",
        )
        .unwrap();

    let error = super::open_map(&fx.paths, &fx.brain).expect_err("the obstructed step must fail");
    assert!(
        error.to_string().contains("injected-v7")
            || matches!(error, crate::map::MapError::Sqlite(_)),
        "{error:?}"
    );
    assert_eq!(
        raw_schema_version(&database),
        6,
        "user_version stays 6: no half-migrated file"
    );
    assert!(
        stable_key_index_is_unique(&database),
        "the v6 UNIQUE index is back — the DROP was rolled back with the rest"
    );
    assert!(
        !super::stable_identity_tests::safety_copy_path(&database).exists(),
        "the transient copy is settled"
    );
    assert_eq!(node_count(&database), nodes_before, "no node is lost");

    // Obstruction removed: the very same file migrates cleanly.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("DROP TRIGGER refuse_v7;")
        .unwrap();
    super::open_map(&fx.paths, &fx.brain).expect("a retry migrates");
    assert_eq!(raw_schema_version(&database), 7);
    assert!(!stable_key_index_is_unique(&database));
    assert!(
        diff(&rows_before, &fx.rows()).is_none(),
        "and the rows are the ones the v6 file held"
    );
}

/// The v7 canonical contract is part of `M-B` step 5: a file stamped 7 whose
/// `stable_key` index is still the v4 `UNIQUE` one — exactly what a half-applied
/// `6 → 7` would leave — is refused rather than served.
#[test]
fn a_file_stamped_v7_with_a_unique_stable_key_index_fails_the_canonical_validation() {
    let fx = Fx::with_tree("racine-v7-incoherent", plain);
    let database = fx.database();
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch(
            "DROP INDEX idx_nodes_stable_key;
             CREATE UNIQUE INDEX idx_nodes_stable_key
                 ON nodes(stable_key) WHERE stable_key IS NOT NULL;",
        )
        .unwrap();
    let error = super::open_map(&fx.paths, &fx.brain)
        .expect_err("a v7 stamp over a v6 shape is not canonical");
    assert!(
        error.to_string().starts_with("map_index_incompatible"),
        "{error}"
    );

    // Removing the index altogether — the other half-schema — is refused too.
    rusqlite::Connection::open(&database)
        .unwrap()
        .execute_batch("DROP INDEX idx_nodes_stable_key;")
        .unwrap();
    let error = super::open_map(&fx.paths, &fx.brain)
        .expect_err("a v7 file with no stable_key index is not canonical");
    assert!(
        error.to_string().starts_with("map_index_incompatible"),
        "{error}"
    );
}

fn raw_schema_version(database: &Path) -> i64 {
    rusqlite::Connection::open(database)
        .unwrap()
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .unwrap()
}

fn node_count(database: &Path) -> i64 {
    rusqlite::Connection::open(database)
        .unwrap()
        .query_row("SELECT COUNT(*) FROM nodes", [], |row| row.get(0))
        .unwrap()
}

fn stable_key_index_is_unique(database: &Path) -> bool {
    use rusqlite::OptionalExtension;
    rusqlite::Connection::open(database)
        .unwrap()
        .query_row(
            "SELECT \"unique\" FROM pragma_index_list('nodes') WHERE name = 'idx_nodes_stable_key'",
            [],
            |row| row.get::<_, bool>(0),
        )
        .optional()
        .unwrap()
        .unwrap_or(false)
}
