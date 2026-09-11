use crate::domain::{NodeDto, NodeKind, ScanDiagnostic};
use crate::identity::{self, NodeIdentity};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use thiserror::Error;

const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0000_0400;
const FILE_ATTRIBUTE_RECALL_ON_OPEN: u32 = 0x0004_0000;
const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: u32 = 0x0040_0000;

#[derive(Debug, Error)]
pub enum ScanError {
    #[error("root_not_directory")]
    RootNotDirectory,
    #[error("root_metadata_failed: {0}")]
    RootMetadata(#[from] io::Error),
    #[error("root_reparse_point_not_allowed")]
    RootReparsePoint,
    #[error("scan_cancelled")]
    Cancelled,
}

#[derive(Debug)]
pub struct ScanResult {
    pub nodes: Vec<NodeDto>,
    pub diagnostics: Vec<ScanDiagnostic>,
    /// One entry per node in [`ScanResult::nodes`], same temporary `id`,
    /// computed by the same traversal that read its metadata — `TASK-0036`.
    /// Never serialized: publication consumes this and remaps to canonical
    /// ids before anything reaches an Index row a DTO could be built from.
    pub identities: Vec<NodeIdentity>,
}

#[derive(Debug)]
struct PendingDirectory {
    absolute: PathBuf,
    relative: PathBuf,
    node_id: i64,
    depth: u32,
}

/// Used by the tests and the retired development fixture only. The current
/// runtime always scans through `scan_tree_controlled` — reserve `X2`.
#[allow(dead_code)]
pub fn scan_tree(root: &Path) -> Result<ScanResult, ScanError> {
    scan_tree_controlled(root, || false, |_| {})
}

pub fn scan_tree_controlled(
    root: &Path,
    is_cancelled: impl Fn() -> bool,
    mut report_progress: impl FnMut(usize),
) -> Result<ScanResult, ScanError> {
    let root_meta = fs::symlink_metadata(root)?;
    if !root_meta.is_dir() {
        return Err(ScanError::RootNotDirectory);
    }
    if is_reparse_point(&root_meta) || root_meta.file_type().is_symlink() {
        return Err(ScanError::RootReparsePoint);
    }

    let root_name = root
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "root".to_string());
    let root_reparse_point = is_reparse_point(&root_meta);
    let root_online_only = is_online_only(&root_meta);
    let mut nodes = vec![NodeDto {
        id: 1,
        parent_id: None,
        name: root_name,
        relative_path: String::new(),
        kind: NodeKind::Root,
        depth: 0,
        size_bytes: 0,
        modified_unix_ms: modified_ms(&root_meta),
        online_only: root_online_only,
        reparse_point: root_reparse_point,
        child_count: 0,
        seen: false,
    }];
    let (root_stable_key, root_provenance) = identity::compute_identity(
        root,
        "",
        NodeKind::Root,
        root_reparse_point,
        root_online_only,
    );
    let mut identities = vec![NodeIdentity {
        node_id: 1,
        stable_key: root_stable_key,
        provenance: root_provenance,
    }];
    let mut diagnostics = Vec::new();
    let mut queue = VecDeque::from([PendingDirectory {
        absolute: root.to_path_buf(),
        relative: PathBuf::new(),
        node_id: 1,
        depth: 0,
    }]);
    let mut next_id = 2_i64;

    while let Some(directory) = queue.pop_front() {
        if is_cancelled() {
            return Err(ScanError::Cancelled);
        }
        let read_dir = match fs::read_dir(&directory.absolute) {
            Ok(entries) => entries,
            Err(_) => {
                diagnostics.push(ScanDiagnostic {
                    code: "directory_unreadable".to_string(),
                    relative_path: display_relative(&directory.relative),
                });
                continue;
            }
        };

        let mut entries = read_dir.filter_map(Result::ok).collect::<Vec<_>>();
        entries.sort_by_key(|entry| entry.file_name());

        for entry in entries {
            if is_cancelled() {
                return Err(ScanError::Cancelled);
            }
            let relative = directory.relative.join(entry.file_name());
            let metadata = match fs::symlink_metadata(entry.path()) {
                Ok(metadata) => metadata,
                Err(_) => {
                    diagnostics.push(ScanDiagnostic {
                        code: "metadata_unreadable".to_string(),
                        relative_path: display_relative(&relative),
                    });
                    continue;
                }
            };
            let reparse = is_reparse_point(&metadata) || metadata.file_type().is_symlink();
            let kind = if reparse {
                NodeKind::Skipped
            } else if metadata.is_dir() {
                NodeKind::Directory
            } else if metadata.is_file() {
                NodeKind::File
            } else {
                NodeKind::Skipped
            };
            let id = next_id;
            next_id += 1;
            let relative_display = display_relative(&relative);
            let online_only = is_online_only(&metadata);
            let (stable_key, provenance) = identity::compute_identity(
                &entry.path(),
                &relative_display,
                kind,
                reparse,
                online_only,
            );
            identities.push(NodeIdentity {
                node_id: id,
                stable_key,
                provenance,
            });
            nodes.push(NodeDto {
                id,
                parent_id: Some(directory.node_id),
                name: entry.file_name().to_string_lossy().into_owned(),
                relative_path: relative_display,
                kind,
                depth: directory.depth + 1,
                size_bytes: if metadata.is_file() {
                    metadata.len()
                } else {
                    0
                },
                modified_unix_ms: modified_ms(&metadata),
                online_only,
                reparse_point: reparse,
                child_count: 0,
                seen: false,
            });
            if nodes.len() % 250 == 0 {
                report_progress(nodes.len());
            }

            if kind == NodeKind::Directory {
                queue.push_back(PendingDirectory {
                    absolute: entry.path(),
                    relative,
                    node_id: id,
                    depth: directory.depth + 1,
                });
            }
        }
    }

    let mut children = HashMap::<i64, u32>::new();
    for node in &nodes {
        if let Some(parent_id) = node.parent_id {
            *children.entry(parent_id).or_default() += 1;
        }
    }
    for node in &mut nodes {
        node.child_count = children.get(&node.id).copied().unwrap_or_default();
    }

    report_progress(nodes.len());

    Ok(ScanResult {
        nodes,
        diagnostics,
        identities,
    })
}

fn display_relative(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn modified_ms(metadata: &fs::Metadata) -> Option<i64> {
    metadata
        .modified()
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_millis().min(i64::MAX as u128) as i64)
}

#[cfg(windows)]
fn file_attributes(metadata: &fs::Metadata) -> u32 {
    use std::os::windows::fs::MetadataExt;
    metadata.file_attributes()
}

#[cfg(not(windows))]
fn file_attributes(_metadata: &fs::Metadata) -> u32 {
    0
}

fn is_reparse_point(metadata: &fs::Metadata) -> bool {
    file_attributes(metadata) & FILE_ATTRIBUTE_REPARSE_POINT != 0
}

fn is_online_only(metadata: &fs::Metadata) -> bool {
    file_attributes(metadata)
        & (FILE_ATTRIBUTE_RECALL_ON_OPEN | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS)
        != 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn scans_metadata_without_changing_fixture() {
        let temp = tempfile::tempdir().expect("tempdir");
        let nested = temp.path().join("notes");
        fs::create_dir(&nested).expect("create nested");
        let document = nested.join("hello.txt");
        fs::write(&document, b"synthetic-only").expect("write fixture");
        let before = fs::read(&document).expect("before");
        let before_modified = fs::metadata(&document).and_then(|m| m.modified()).ok();

        let result = scan_tree(temp.path()).expect("scan");

        assert_eq!(result.nodes.len(), 3);
        assert_eq!(before, fs::read(&document).expect("after"));
        assert_eq!(
            before_modified,
            fs::metadata(&document).and_then(|m| m.modified()).ok()
        );
        assert!(result.diagnostics.is_empty());
    }

    #[test]
    fn cancellation_stops_before_indexing() {
        let temp = tempfile::tempdir().expect("tempdir");
        fs::write(temp.path().join("synthetic.txt"), b"synthetic-only").expect("fixture");

        let result = scan_tree_controlled(temp.path(), || true, |_| {});

        assert!(matches!(result, Err(ScanError::Cancelled)));
        assert_eq!(
            fs::read(temp.path().join("synthetic.txt")).expect("unchanged"),
            b"synthetic-only"
        );
    }
}
