//! Deterministic synthetic corpus for `TASK-0028`. **Test-only.**
//!
//! One plan, two consumers:
//!
//! * `SCAN-SCALE` materialises the plan **on disk** and lets the real scanner
//!   discover it, so the measured pipeline is the production one.
//! * `INDEX-SCALE` turns the same plan straight into [`NodeDto`] rows, because
//!   creating a million physical files would mostly measure NTFS.
//!
//! The shape is chosen so the bounded materializer meets both cases it has to
//! survive: a **very wide** fan-out (one directory holding roughly a quarter of
//! the corpus as direct children) and a **deep** chain. Names, sizes and
//! ordering are synthetic and derived from the index alone — no clock, no
//! unseeded randomness, nothing observed from a real tree.

use crate::domain::{NodeDto, NodeKind};
use std::fs;
use std::io;
use std::path::Path;

/// Depth of the deep spine, well under `MAX_FIXTURE_DEPTH = 40`.
const SPINE_DEPTH: usize = 24;

/// Files hung on each spine directory, so the deep branch is not a bare chain.
const SPINE_FILES: usize = 2;

/// Direct-children counts cycled through the wide groups. Varied on purpose:
/// a materializer that only ever meets uniform fan-out is not being tested.
const GROUP_PATTERN: [usize; 7] = [1, 2, 5, 13, 34, 89, 233];

/// One planned entry, in parent-before-child order.
#[derive(Debug, Clone, PartialEq)]
pub struct Planned {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
    /// Slash-separated, relative to the synthetic root. Never absolute.
    pub relative_path: String,
    pub is_directory: bool,
    pub depth: u32,
    pub size_bytes: u64,
}

/// Builds the plan for exactly `total` entries, root included.
///
/// Parents always precede their children, which is what both the scanner order
/// and `layered-tree-cards-v1` assume.
pub fn plan(total: usize) -> Vec<Planned> {
    assert!(
        total >= 256,
        "the spike's shapes need room; smaller counts belong to unit tests"
    );
    let mut nodes = Vec::with_capacity(total);
    // Ids are the position in the plan, one-based. Nothing else needs to know
    // the counter, and a plan that is re-read never renumbers.
    let root_id = 1_i64;
    nodes.push(Planned {
        id: root_id,
        parent_id: None,
        name: "task0028-source".to_string(),
        relative_path: String::new(),
        is_directory: true,
        depth: 0,
        size_bytes: 0,
    });

    // ---- deep branch -------------------------------------------------------
    let deep_id = nodes.len() as i64 + 1;
    nodes.push(directory(deep_id, root_id, "deep", "deep", 1));
    let mut spine_parent = deep_id;
    let mut spine_path = "deep".to_string();
    for level in 0..SPINE_DEPTH {
        let name = format!("s-{level:02}");
        let path = format!("{spine_path}/{name}");
        let id = nodes.len() as i64 + 1;
        nodes.push(directory(id, spine_parent, &name, &path, level as u32 + 2));
        for slot in 0..SPINE_FILES {
            let file_name = format!("leaf-{level:02}-{slot}.txt");
            let file_path = format!("{path}/{file_name}");
            let file_id = nodes.len() as i64 + 1;
            nodes.push(file(
                file_id,
                id,
                &file_name,
                &file_path,
                level as u32 + 3,
                file_id,
            ));
        }
        spine_parent = id;
        spine_path = path;
    }

    // ---- wide branch -------------------------------------------------------
    let wide_id = nodes.len() as i64 + 1;
    nodes.push(directory(wide_id, root_id, "wide", "wide", 1));

    let mut remaining = total.saturating_sub(nodes.len());
    assert!(
        remaining > 2,
        "total must leave room for the wide branch; raise the count"
    );

    // The hub: one directory holding about a quarter of everything as direct
    // children. At a million entries that is a folder with roughly 250 000
    // direct children — the case a progressive materializer must not choke on.
    let hub_id = nodes.len() as i64 + 1;
    nodes.push(directory(hub_id, wide_id, "hub", "wide/hub", 2));
    remaining -= 1;
    let hub_files = remaining / 4;
    for index in 0..hub_files {
        let name = format!("h-{index:07}.txt");
        let path = format!("wide/hub/{name}");
        let id = nodes.len() as i64 + 1;
        nodes.push(file(id, hub_id, &name, &path, 3, id));
    }
    remaining -= hub_files;

    // The groups: many directories with varied fan-out, so "wide" itself also
    // ends up with a large direct-child count.
    let mut group = 0usize;
    while remaining > 0 {
        let group_name = format!("g-{group:06}");
        let group_path = format!("wide/{group_name}");
        let group_id = nodes.len() as i64 + 1;
        nodes.push(directory(group_id, wide_id, &group_name, &group_path, 2));
        remaining -= 1;
        let wanted = GROUP_PATTERN[group % GROUP_PATTERN.len()].min(remaining);
        for index in 0..wanted {
            let name = format!("f-{index:04}.txt");
            let path = format!("{group_path}/{name}");
            let id = nodes.len() as i64 + 1;
            nodes.push(file(id, group_id, &name, &path, 3, id));
        }
        remaining -= wanted;
        group += 1;
    }

    assert_eq!(nodes.len(), total, "the plan must hit the requested count");
    nodes
}

fn directory(id: i64, parent_id: i64, name: &str, path: &str, depth: u32) -> Planned {
    Planned {
        id,
        parent_id: Some(parent_id),
        name: name.to_string(),
        relative_path: path.to_string(),
        is_directory: true,
        depth,
        size_bytes: 0,
    }
}

/// Sizes vary deterministically with the id, and every seventh file is empty:
/// the spike must meet zero-byte entries without special-casing them.
fn file(id: i64, parent_id: i64, name: &str, path: &str, depth: u32, seed: i64) -> Planned {
    Planned {
        id,
        parent_id: Some(parent_id),
        name: name.to_string(),
        relative_path: path.to_string(),
        is_directory: false,
        depth,
        size_bytes: if seed % 7 == 0 {
            0
        } else {
            ((seed as u64 * 37) % 61) + 1
        },
    }
}

/// The plan as index rows, for `INDEX-SCALE`.
///
/// Uses the production [`NodeDto`] and the production [`NodeKind`]: the bench
/// database is the FileTopo schema, not a parallel model.
pub fn as_nodes(plan: &[Planned]) -> Vec<NodeDto> {
    let mut children = std::collections::HashMap::<i64, u32>::new();
    for node in plan {
        if let Some(parent_id) = node.parent_id {
            *children.entry(parent_id).or_default() += 1;
        }
    }
    plan.iter()
        .map(|node| NodeDto {
            id: node.id,
            parent_id: node.parent_id,
            name: node.name.clone(),
            relative_path: node.relative_path.clone(),
            kind: match (node.parent_id, node.is_directory) {
                (None, _) => NodeKind::Root,
                (Some(_), true) => NodeKind::Directory,
                (Some(_), false) => NodeKind::File,
            },
            depth: node.depth,
            size_bytes: node.size_bytes,
            modified_unix_ms: None,
            online_only: false,
            reparse_point: false,
            child_count: children.get(&node.id).copied().unwrap_or_default(),
            seen: false,
        })
        .collect()
}

/// Writes the plan under `root`, which must not exist yet.
///
/// Returns the number of directories and files actually created. Content is a
/// short synthetic filler, never anything observed.
pub fn materialize(root: &Path, plan: &[Planned]) -> io::Result<(usize, usize)> {
    fs::create_dir_all(root)?;
    let mut directories = 0usize;
    let mut files = 0usize;
    for node in plan {
        if node.relative_path.is_empty() {
            continue;
        }
        let target = root.join(node.relative_path.replace('/', std::path::MAIN_SEPARATOR_STR));
        if node.is_directory {
            fs::create_dir_all(&target)?;
            directories += 1;
        } else {
            let filler = vec![b'.'; node.size_bytes as usize];
            fs::write(&target, &filler)?;
            files += 1;
        }
    }
    Ok((directories, files))
}

/// Structural fingerprint of a materialised source — `I-1`.
///
/// Walks the tree in a deterministic order and folds `path|kind|size` into an
/// FNV-1a 64 digest. It proves the measurement changed nothing.
///
/// It is **not** a content hash: no byte of any file is read, so no `DEC-0025`
/// content observation is produced and no SHA-256 campaign is started.
pub fn fingerprint(root: &Path) -> io::Result<(u64, usize)> {
    let mut digest = crate::map::fnv1a64(b"TASK-0028/structural-fingerprint/v1");
    let mut counted = 0usize;
    let mut stack = vec![root.to_path_buf()];
    let mut relative = Vec::new();
    while let Some(directory) = stack.pop() {
        let mut entries = fs::read_dir(&directory)?
            .filter_map(Result::ok)
            .collect::<Vec<_>>();
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let metadata = fs::symlink_metadata(entry.path())?;
            let path = entry
                .path()
                .strip_prefix(root)
                .unwrap_or(&entry.path())
                .to_string_lossy()
                .replace('\\', "/");
            let kind = if metadata.is_dir() { 'd' } else { 'f' };
            let size = if metadata.is_file() { metadata.len() } else { 0 };
            relative.push(format!("{path}|{kind}|{size}"));
            counted += 1;
            if metadata.is_dir() {
                stack.push(entry.path());
            }
        }
    }
    relative.sort_unstable();
    for line in &relative {
        digest ^= crate::map::fnv1a64(line.as_bytes());
        digest = digest.wrapping_mul(0x0000_0100_0000_01b3);
    }
    Ok((digest, counted))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_plan_hits_the_exact_count_and_is_bit_deterministic() {
        for total in [256usize, 1_000, 4_321, 10_000] {
            let first = plan(total);
            let second = plan(total);
            assert_eq!(first.len(), total);
            assert_eq!(first, second, "the generator must never drift");
        }
    }

    #[test]
    fn parents_always_precede_their_children() {
        let plan = plan(3_000);
        let mut seen = std::collections::HashSet::new();
        for node in &plan {
            if let Some(parent) = node.parent_id {
                assert!(
                    seen.contains(&parent),
                    "child {} precedes its parent {parent}",
                    node.id
                );
            }
            seen.insert(node.id);
        }
    }

    #[test]
    fn the_shape_offers_both_a_deep_spine_and_a_very_wide_hub() {
        let plan = plan(10_000);
        let deepest = plan.iter().map(|node| node.depth).max().expect("depth");
        assert!(
            deepest >= SPINE_DEPTH as u32,
            "the deep branch must reach the spine depth, got {deepest}"
        );
        assert!(
            deepest < crate::map::MAX_FIXTURE_DEPTH,
            "the spike must stay under the frozen depth ceiling"
        );

        let hub = plan
            .iter()
            .find(|node| node.relative_path == "wide/hub")
            .expect("hub");
        let hub_children = plan
            .iter()
            .filter(|node| node.parent_id == Some(hub.id))
            .count();
        assert!(
            hub_children > plan.len() / 5,
            "the hub must hold a large share of the corpus, got {hub_children}"
        );
    }

    #[test]
    fn every_relative_path_is_synthetic_and_relative() {
        for node in plan(2_000) {
            assert!(!node.relative_path.starts_with('/'));
            assert!(!node.relative_path.contains(".."));
            assert!(!node.relative_path.contains(':'));
        }
    }

    #[test]
    fn nodes_carry_exact_child_counts_and_one_root() {
        let nodes = as_nodes(&plan(1_500));
        assert_eq!(
            nodes
                .iter()
                .filter(|node| node.kind == NodeKind::Root)
                .count(),
            1
        );
        let hub = nodes
            .iter()
            .find(|node| node.relative_path == "wide/hub")
            .expect("hub");
        let actual = nodes
            .iter()
            .filter(|node| node.parent_id == Some(hub.id))
            .count();
        assert_eq!(hub.child_count as usize, actual);
    }

    #[test]
    fn materialising_then_fingerprinting_is_stable_and_read_only() {
        let temp = tempfile::tempdir().expect("tempdir");
        let root = temp.path().join("source");
        let plan = plan(512);
        let (directories, files) = materialize(&root, &plan).expect("materialize");
        assert_eq!(directories + files, plan.len() - 1, "root is not re-created");

        let (before, counted) = fingerprint(&root).expect("fingerprint");
        assert_eq!(counted, plan.len() - 1);
        let (after, _) = fingerprint(&root).expect("fingerprint again");
        assert_eq!(before, after, "reading the tree must not change it");
    }
}
