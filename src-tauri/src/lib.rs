mod domain;
mod hierarchy;
mod index;
mod map;
/// Storing a filesystem path exactly, shared by the catalogue and the 0.1
/// registry — `DEC-0033` C.
mod path_codec;
mod registry;
/// `TASK-0029` scale query bench. Compiled by `cargo test` only: it is absent
/// from every product binary and exposes no command.
#[cfg(test)]
mod scale_query;
/// `TASK-0028` synthetic scale bench. Compiled by `cargo test` only: it is
/// absent from every product binary and exposes no command.
#[cfg(test)]
mod scale_spike;
mod scanner;
mod synthetic;

use domain::{
    AppHealth, CollectionSnapshot, CollectionSummary, IndexProgress, NodePage, NodeQueryRequest,
};
use index::Index;
use registry::Registry;
// `scan_tree` only serves the development-only synthetic fixture and the tests.
#[cfg(debug_assertions)]
use scanner::scan_tree;
use scanner::scan_tree_controlled;
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[derive(Default)]
struct IndexJob {
    cancelled: AtomicBool,
    visited_nodes: AtomicUsize,
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[derive(Clone, Default)]
struct IndexJobs(Arc<Mutex<HashMap<String, Arc<IndexJob>>>>);

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
impl IndexJobs {
    fn start(&self, collection_id: &str) -> Result<Arc<IndexJob>, String> {
        let mut jobs = self
            .0
            .lock()
            .map_err(|_| "index_jobs_unavailable".to_string())?;
        if jobs.contains_key(collection_id) {
            return Err("index_already_running".to_string());
        }
        let job = Arc::new(IndexJob::default());
        jobs.insert(collection_id.to_string(), job.clone());
        Ok(job)
    }

    fn get(&self, collection_id: &str) -> Option<Arc<IndexJob>> {
        self.0.lock().ok()?.get(collection_id).cloned()
    }

    fn finish(&self, collection_id: &str) {
        if let Ok(mut jobs) = self.0.lock() {
            jobs.remove(collection_id);
        }
    }
}

/// Exercised by the tests, and no longer reachable from the running
/// product: the current runtime exposes only the slice's commands —
/// reserve `X2`. Kept because the 0.1 audit is worth preserving
/// (`DEC-0015` A), annotated because keeping it must stay a visible
/// choice rather than a silent warning.
#[allow(dead_code)]
#[tauri::command]
fn health() -> AppHealth {
    AppHealth {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        sqlite_version: rusqlite::version().to_string(),
        mode: "local_offline".to_string(),
        synthetic_fixture_available: cfg!(debug_assertions),
    }
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn demo_snapshot() -> CollectionSnapshot {
    synthetic::demo_snapshot(96)
}

/// Locates the synthetic fixture **at run time**, relative to the current
/// working directory.
///
/// Deliberately not `env!("CARGO_MANIFEST_DIR")`: that macro is expanded by the
/// compiler into a string literal, which would bake the absolute path of the
/// developer's checkout into every binary produced from this source.
/// Exercised by the tests, and no longer reachable from the running
/// product: the current runtime exposes only the slice's commands —
/// reserve `X2`. Kept because the 0.1 audit is worth preserving
/// (`DEC-0015` A), annotated because keeping it must stay a visible
/// choice rather than a silent warning.
#[allow(dead_code)]
#[cfg(debug_assertions)]
fn synthetic_fixture_root() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let relative = Path::new("tests").join("fixtures_synthetic").join("demo");
    // `cargo test` and `tauri dev` run from the crate directory; a plain
    // `cargo run` from the repository root is also accepted.
    let candidates = [cwd.join("..").join(&relative), cwd.join(&relative)];
    candidates.into_iter().find(|candidate| candidate.is_dir())
}

/// Development-only: runs the real scanner over the synthetic fixture.
/// Exercised by the tests, and no longer reachable from the running
/// product: the current runtime exposes only the slice's commands —
/// reserve `X2`. Kept because the 0.1 audit is worth preserving
/// (`DEC-0015` A), annotated because keeping it must stay a visible
/// choice rather than a silent warning.
#[allow(dead_code)]
#[cfg(debug_assertions)]
#[tauri::command]
fn scan_synthetic_fixture() -> Result<CollectionSnapshot, String> {
    let root = synthetic_fixture_root().ok_or_else(|| "synthetic_fixture_missing".to_string())?;

    let scan = scan_tree(&root).map_err(|error| error.to_string())?;
    let mut index = Index::in_memory().map_err(|error| error.to_string())?;
    index
        .replace_nodes(&scan.nodes)
        .map_err(|error| error.to_string())?;
    let nodes = index
        .list_nodes(5_000, 0)
        .map_err(|error| error.to_string())?;
    Ok(synthetic::snapshot_from_nodes(
        "fixture-demo",
        "Fixture synthétique",
        nodes,
        scan.diagnostics,
    ))
}

/// Release builds carry no fixture path at all, so nothing about the machine
/// that compiled them can leak through this command.
/// Exercised by the tests, and no longer reachable from the running
/// product: the current runtime exposes only the slice's commands —
/// reserve `X2`. Kept because the 0.1 audit is worth preserving
/// (`DEC-0015` A), annotated because keeping it must stay a visible
/// choice rather than a silent warning.
#[allow(dead_code)]
#[cfg(not(debug_assertions))]
#[tauri::command]
fn scan_synthetic_fixture() -> Result<CollectionSnapshot, String> {
    Err("synthetic_fixture_unavailable_in_release".to_string())
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
fn registry_for(app: &tauri::AppHandle) -> Result<Registry, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_unavailable".to_string())?;
    Registry::open(app_data.join("registry.sqlite")).map_err(|error| error.to_string())
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn list_collections(app: tauri::AppHandle) -> Result<Vec<CollectionSummary>, String> {
    registry_for(&app)?
        .list()
        .map_err(|error| error.to_string())
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
async fn choose_collection(app: tauri::AppHandle) -> Result<Option<CollectionSummary>, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Choisir une racine FileTopo")
        .blocking_pick_folder();
    let Some(picked) = picked else {
        return Ok(None);
    };
    let root = picked
        .into_path()
        .map_err(|_| "selected_path_invalid".to_string())?;
    let registry = registry_for(&app)?;
    registry
        .register(&root)
        .map(Some)
        .map_err(|error| error.to_string())
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
async fn index_collection(
    app: tauri::AppHandle,
    jobs: tauri::State<'_, IndexJobs>,
    collection_id: String,
) -> Result<CollectionSnapshot, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_unavailable".to_string())?;
    let registry_path = app_data.join("registry.sqlite");
    let job = jobs.start(&collection_id)?;
    let jobs = jobs.inner().clone();
    let worker_id = collection_id.clone();
    let cancel_job = job.clone();
    let progress_job = job.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        index_registered_collection_controlled(
            &app_data,
            &registry_path,
            &worker_id,
            || cancel_job.cancelled.load(Ordering::Relaxed),
            |visited| progress_job.visited_nodes.store(visited, Ordering::Relaxed),
        )
    })
    .await
    .map_err(|_| "index_worker_failed".to_string());
    jobs.finish(&collection_id);
    result?
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn cancel_indexing(jobs: tauri::State<'_, IndexJobs>, collection_id: String) -> bool {
    let Some(job) = jobs.get(&collection_id) else {
        return false;
    };
    job.cancelled.store(true, Ordering::Relaxed);
    true
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn index_progress(
    jobs: tauri::State<'_, IndexJobs>,
    collection_id: String,
) -> Option<IndexProgress> {
    let job = jobs.get(&collection_id)?;
    Some(IndexProgress {
        collection_id,
        visited_nodes: job.visited_nodes.load(Ordering::Relaxed),
        status: if job.cancelled.load(Ordering::Relaxed) {
            "cancelling"
        } else {
            "scanning"
        }
        .to_string(),
    })
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn query_collection_nodes(
    app: tauri::AppHandle,
    request: NodeQueryRequest,
) -> Result<NodePage, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_unavailable".to_string())?;
    let registry =
        Registry::open(app_data.join("registry.sqlite")).map_err(|error| error.to_string())?;
    let record = registry
        .resolve(&request.collection_id)
        .map_err(|error| error.to_string())?;
    let index_path = app_data
        .join("collections")
        .join(record.summary.id)
        .join("index.sqlite");
    if !index_path.is_file() {
        return Err("collection_not_indexed".to_string());
    }
    let index = Index::open(&index_path).map_err(|error| error.to_string())?;
    let (items, total) = index
        .query_nodes(
            &request.query,
            request.kind.as_deref(),
            request.online_only,
            request.unseen_only,
            request.limit,
            request.offset,
        )
        .map_err(|error| error.to_string())?;
    Ok(NodePage {
        items,
        total,
        limit: request.limit.clamp(1, 500),
        offset: request.offset,
    })
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn mark_node_seen(
    app: tauri::AppHandle,
    collection_id: String,
    node_id: i64,
) -> Result<bool, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_unavailable".to_string())?;
    let registry =
        Registry::open(app_data.join("registry.sqlite")).map_err(|error| error.to_string())?;
    let record = registry
        .resolve(&collection_id)
        .map_err(|error| error.to_string())?;
    let index_path = app_data
        .join("collections")
        .join(record.summary.id)
        .join("index.sqlite");
    if !index_path.is_file() {
        return Err("collection_not_indexed".to_string());
    }
    Index::open(&index_path)
        .and_then(|index| index.mark_seen(node_id))
        .map_err(|error| error.to_string())
}

fn resolve_indexed_target(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let mut target = root.to_path_buf();
    if !relative_path.is_empty() {
        for component in Path::new(relative_path).components() {
            let Component::Normal(name) = component else {
                return Err("indexed_path_invalid".to_string());
            };
            target.push(name);
            let metadata = fs::symlink_metadata(&target)
                .map_err(|_| "indexed_target_unavailable".to_string())?;
            if metadata.file_type().is_symlink() || metadata_is_reparse_point(&metadata) {
                return Err("indexed_target_reparse_point".to_string());
            }
        }
    }
    Ok(target)
}

#[cfg(windows)]
fn metadata_is_reparse_point(metadata: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    metadata.file_attributes() & 0x0000_0400 != 0
}

#[cfg(not(windows))]
fn metadata_is_reparse_point(_metadata: &fs::Metadata) -> bool {
    false
}

/// Retained from the 0.1 alpha prototype, and deliberately **not exposed**
/// by the current runtime — reserve `X2`. `DEC-0015` A keeps the prototype
/// as the technical audit it is; `TASK-0016` §12.4 keeps it out of reach.
#[allow(dead_code)]
#[tauri::command]
fn reveal_indexed_node(
    app: tauri::AppHandle,
    collection_id: String,
    node_id: i64,
) -> Result<bool, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_unavailable".to_string())?;
    let registry =
        Registry::open(app_data.join("registry.sqlite")).map_err(|error| error.to_string())?;
    let record = registry
        .resolve(&collection_id)
        .map_err(|error| error.to_string())?;
    let index_path = app_data
        .join("collections")
        .join(&record.summary.id)
        .join("index.sqlite");
    let index = Index::open(&index_path).map_err(|error| error.to_string())?;
    let node = index
        .node(node_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "indexed_node_missing".to_string())?;
    if node.reparse_point || node.kind == domain::NodeKind::Skipped {
        return Err("indexed_target_not_openable".to_string());
    }
    let target = resolve_indexed_target(&record.root, &node.relative_path)?;

    #[cfg(windows)]
    {
        let argument = if target.is_dir() {
            target.as_os_str().to_os_string()
        } else {
            format!("/select,{}", target.display()).into()
        };
        Command::new("explorer.exe")
            .arg(argument)
            .spawn()
            .map_err(|_| "explorer_launch_failed".to_string())?;
        Ok(true)
    }
    #[cfg(not(windows))]
    {
        let _ = target;
        Err("platform_not_supported".to_string())
    }
}

#[cfg(test)]
fn index_registered_collection(
    app_data: &std::path::Path,
    registry_path: &std::path::Path,
    collection_id: &str,
) -> Result<CollectionSnapshot, String> {
    index_registered_collection_controlled(app_data, registry_path, collection_id, || false, |_| {})
}

fn index_registered_collection_controlled(
    app_data: &std::path::Path,
    registry_path: &std::path::Path,
    collection_id: &str,
    is_cancelled: impl Fn() -> bool,
    report_progress: impl FnMut(usize),
) -> Result<CollectionSnapshot, String> {
    let registry =
        Registry::open(registry_path.to_path_buf()).map_err(|error| error.to_string())?;
    let record = registry
        .resolve(collection_id)
        .map_err(|error| error.to_string())?;
    let scan = scan_tree_controlled(&record.root, is_cancelled, report_progress)
        .map_err(|error| error.to_string())?;
    let node_count = scan.nodes.len();
    let total_size_bytes = scan.nodes.iter().map(|node| node.size_bytes).sum::<u64>();

    let collection_data = app_data.join("collections").join(&record.summary.id);
    fs::create_dir_all(&collection_data)
        .map_err(|_| "collection_data_create_failed".to_string())?;
    let mut index =
        Index::open(&collection_data.join("index.sqlite")).map_err(|error| error.to_string())?;
    index
        .replace_nodes(&scan.nodes)
        .map_err(|error| error.to_string())?;

    registry
        .update_statistics(&record.summary.id, node_count, total_size_bytes)
        .map_err(|error| error.to_string())?;

    let visible_nodes = scan.nodes.into_iter().take(5_000).collect::<Vec<_>>();
    let mut snapshot = synthetic::snapshot_from_nodes(
        &record.summary.id,
        &record.summary.name,
        visible_nodes,
        scan.diagnostics,
    );
    snapshot.node_count = node_count;
    snapshot.total_size_bytes = total_size_bytes;
    Ok(snapshot)
}

// ---------------------------------------------------------------------------
// TASK-0016 — the production vertical slice.
//
// These commands are the whole surface of the slice: four synthetic fixtures,
// one build pipeline, and read-only access to what it produced. No folder
// picker, no real data, no cross-cutting relations, no search, no watcher.
// ---------------------------------------------------------------------------

/// Where this slice is allowed to write: the development sandbox in the
/// repository, or the application data directory in a release build. Never a
/// user folder — the slice ships no picker at all.
fn map_sandbox(app: &tauri::AppHandle) -> Result<map::sandbox::SandboxPaths, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|_| "app_data_unavailable".to_string())?;
    map::sandbox::resolve(&app_data)
}

/// Opens the brain catalogue and seeds the frozen brains that are missing.
///
/// Every map and relation command goes through here first, so a `brain_id`
/// is resolved against the catalogue **before** anything touches a database.
/// The seed creates what is absent and never corrects what a person changed —
/// `K7`.
fn map_catalog(app: &tauri::AppHandle) -> Result<map::brains::BrainCatalog, String> {
    let paths = map_sandbox(app)?;
    let mut catalog =
        map::brains::BrainCatalog::open(&paths.catalog_database()).map_err(String::from)?;
    catalog.seed_frozen().map_err(String::from)?;
    Ok(catalog)
}

/// Resolves `brain_id` -> the record the catalogue holds.
///
/// **The single door.** An unknown brain is an error that names it — `K2` —
/// never an empty result and never a silent fall back to the active brain,
/// which would read another brain's data under the caller's nose.
fn map_brain(
    app: &tauri::AppHandle,
) -> Result<(map::sandbox::SandboxPaths, map::brains::BrainCatalog), String> {
    Ok((map_sandbox(app)?, map_catalog(app)?))
}

fn resolve_brain(
    app: &tauri::AppHandle,
    brain_id: &str,
) -> Result<(map::sandbox::SandboxPaths, map::brains::BrainRecord), String> {
    let (paths, catalog) = map_brain(app)?;
    let record = catalog.require(brain_id).map_err(String::from)?;
    Ok((paths, record))
}

/// Relays a line from the WebView to the host's standard output.
///
/// An unattended measurement runs behind a window nobody is watching. Without
/// this, a page that fails silently is indistinguishable from a page that is
/// merely slow — which is exactly the ambiguity that cost the first run.
#[tauri::command]
fn map_log(level: String, message: String) {
    use std::io::Write;
    // Flushed on every line: redirected stdout is block-buffered, and a log
    // that only appears once the process exits is useless for watching a run
    // that may never exit on its own.
    println!("[web/{level}] {message}");
    let _ = std::io::stdout().flush();
}

#[tauri::command]
fn map_fixtures() -> Vec<map::commands::FixtureSummary> {
    map::commands::fixture_summaries()
}

/// `K1` — the catalogue, and which brain is active.
///
/// The interface draws its selector from this and from nothing else: name,
/// colour and icon all come from the catalogue, so `K7` shows up on screen
/// rather than only in storage.
#[tauri::command]
fn map_brains(app: tauri::AppHandle) -> Result<map::brains::BrainCatalogView, String> {
    let paths = map_sandbox(&app)?;
    let database = paths.catalog_database();
    let mut catalog = map::brains::BrainCatalog::open(&database).map_err(String::from)?;
    let seeded = catalog.seed_frozen().map_err(String::from)?;
    let active = catalog.active().map_err(String::from)?;
    Ok(map::brains::BrainCatalogView {
        brains: catalog.list().map_err(String::from)?,
        active_brain_id: active.brain_id,
        schema_version: map::brains::CATALOG_SCHEMA_VERSION,
        catalog_path: paths.relative_name(&database),
        seeded,
    })
}

/// `K9` — makes a brain active, and **persists it**.
///
/// Written to the catalogue rather than held in the page, because the
/// criterion is that a real restart reopens the same brain.
#[tauri::command]
fn map_brain_activate(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::brains::BrainRecord, String> {
    let (_, mut catalog) = map_brain(&app)?;
    catalog.set_active(&brain_id).map_err(String::from)
}

/// `K7` — changes the identity metadata of **one** brain.
///
/// Name, colour and icon belong to the brain, not to its source. What a brain
/// reads is not editable here: changing a source is not a rename.
#[tauri::command]
fn map_brain_update(
    app: tauri::AppHandle,
    brain_id: String,
    display_name: String,
    color: String,
    icon: String,
) -> Result<map::brains::BrainRecord, String> {
    let (_, mut catalog) = map_brain(&app)?;
    catalog
        .update_metadata(&brain_id, &display_name, &color, &icon)
        .map_err(String::from)
}

/// **Ajouter un dossier** — the only way a real root enters FileTopo.
///
/// Takes **no argument**, deliberately. `DEC-0033` A forbids an exposed
/// command that accepts a path: a page that could name a folder could name any
/// folder, and the person's explicit gesture would stop being what decides.
/// The path is produced here, by the native picker, and never crosses the IPC
/// in the other direction.
///
/// Cancelling returns `Ok(None)` and leaves the catalogue untouched — no brain,
/// no index, no half-written row. Registering scans nothing: the new brain is
/// created unindexed, and `map_open` answers `map_not_built` until the person
/// presses **Indexer**.
///
/// The returned `BrainRecord` carries no path — see `map::brains::BrainRecord`.
#[tauri::command]
async fn map_brain_choose_real_root(
    app: tauri::AppHandle,
) -> Result<Option<map::brains::BrainRecord>, String> {
    let paths = map_sandbox(&app)?;
    let picked = app
        .dialog()
        .file()
        .set_title("Choisir un dossier à cartographier")
        .blocking_pick_folder();
    let Some(picked) = picked else {
        return Ok(None);
    };
    let candidate = picked
        .into_path()
        .map_err(|_| "map_root_rejected: chemin sélectionné invalide".to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        map::commands::register_real_root(&paths, &candidate)
            .map(Some)
            .map_err(String::from)
    })
    .await
    .map_err(|_| "map_worker_failed".to_string())?
}

#[tauri::command]
async fn map_open(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::commands::MapOpenReport, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        map::commands::open_map(&paths, &brain).map_err(String::from)
    })
    .await
    .map_err(|_| "map_worker_failed".to_string())?
}

#[tauri::command]
async fn map_refresh(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::commands::MapBuildReport, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        map::commands::refresh_map(&paths, &brain).map_err(String::from)
    })
    .await
    .map_err(|_| "map_worker_failed".to_string())?
}

#[tauri::command]
async fn map_rebuild(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::commands::MapBuildReport, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        map::commands::rebuild_map(&paths, &brain).map_err(String::from)
    })
    .await
    .map_err(|_| "map_worker_failed".to_string())?
}

#[tauri::command]
async fn map_prepare_synthetic_source(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<(), String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        map::commands::prepare_synthetic_source(&paths, &brain).map_err(String::from)
    })
    .await
    .map_err(|_| "map_worker_failed".to_string())?
}

#[tauri::command]
fn map_snapshot(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::store::MapSnapshot, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::commands::snapshot(&paths, &brain).map_err(String::from)
}

#[tauri::command]
fn map_resolve_node(
    app: tauri::AppHandle,
    brain_id: String,
    relative_path: String,
) -> Result<Option<map::brains::BrainNodeRef>, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    let store = map::commands::open_store(&paths, &brain).map_err(String::from)?;
    Ok(store
        .resolve_path(&relative_path)
        .map_err(String::from)?
        .map(|id| map::brains::BrainNodeRef::new(&brain_id, id)))
}

/// Explicit bounded projection boundary; legacy map_snapshot is a bounded alias.
#[tauri::command]
fn map_view(
    app: tauri::AppHandle,
    brain_id: String,
    focus_id: Option<i64>,
    after: Option<String>,
) -> Result<map::store::MapSnapshot, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::commands::view(&paths, &brain, focus_id, after.as_deref()).map_err(String::from)
}

#[tauri::command]
fn map_node_detail(
    app: tauri::AppHandle,
    reference: map::brains::BrainNodeRef,
) -> Result<map::store::NodeDetail, String> {
    let (paths, brain) = resolve_brain(&app, &reference.brain_id)?;
    map::commands::detail(&paths, &brain, &reference).map_err(String::from)
}

#[tauri::command]
fn map_integrity(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::commands::FixtureIntegrity, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::commands::integrity(&paths, &brain).map_err(String::from)
}

#[tauri::command]
fn map_self_check(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::commands::MapSelfCheck, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::commands::self_check(&paths, &brain).map_err(String::from)
}

/// Starts one explicit content-observation campaign for the indexed FILE
/// nodes of one brain. The worker reads bytes only; it never writes below the
/// analysed root and never opens a relation store.
#[tauri::command]
async fn map_content_observe(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::content_signals::ContentObservationReport, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        map::content_signals::observe_content(&paths, &brain).map_err(String::from)
    })
    .await
    .map_err(|_| "content_observation_worker_failed".to_string())?
}

#[tauri::command]
fn map_content_summary(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::content_signals::ContentObservationSummary, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::content_observation_summary(&paths, &brain).map_err(String::from)
}

#[tauri::command]
fn map_content_observation_for_path(
    app: tauri::AppHandle,
    brain_id: String,
    relative_path: String,
) -> Result<Option<map::content_signals::ContentObservation>, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::content_observation_for_path(&paths, &brain, &relative_path)
        .map_err(String::from)
}

#[tauri::command]
fn map_content_identical_members(
    app: tauri::AppHandle,
    brain_id: String,
    hash: String,
) -> Result<Vec<map::content_signals::ContentObservation>, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::identical_content_members(&paths, &brain, &hash).map_err(String::from)
}

#[tauri::command]
fn map_content_diagnostics(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<Vec<map::content_signals::ContentObservation>, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::content_observation_diagnostics(&paths, &brain).map_err(String::from)
}

#[tauri::command]
fn map_content_observations(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<Vec<map::content_signals::ContentObservation>, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::content_observations(&paths, &brain).map_err(String::from)
}

#[tauri::command]
fn map_exact_duplicate_summary(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::content_signals::ExactDuplicateSummary, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::exact_duplicate_summary(&paths, &brain).map_err(String::from)
}

#[tauri::command]
fn map_exact_duplicate_groups(
    app: tauri::AppHandle,
    brain_id: String,
    offset: usize,
    limit: usize,
) -> Result<map::content_signals::ExactDuplicateGroupPage, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::exact_duplicate_groups(&paths, &brain, offset, limit)
        .map_err(String::from)
}

#[tauri::command]
fn map_exact_duplicate_members(
    app: tauri::AppHandle,
    brain_id: String,
    group_id: String,
    offset: usize,
    limit: usize,
) -> Result<map::content_signals::ExactDuplicateMemberPage, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::content_signals::exact_duplicate_members(&paths, &brain, &group_id, offset, limit)
        .map_err(String::from)
}

#[tauri::command]
fn map_relation_engine_status(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::rule_engine::RelationEngineStatus, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::rule_engine::status(&paths, &brain).map_err(String::from)
}

#[tauri::command]
async fn map_relation_engine_run(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::rule_engine::RelationEngineReport, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    tauri::async_runtime::spawn_blocking(move || {
        map::rule_engine::run(&paths, &brain).map_err(String::from)
    })
    .await
    .map_err(|_| "relation_engine_worker_failed".to_string())?
}

/// Materializes and observes the repository-local synthetic source used only
/// by the real TASK-0024/DR15 development proof. Release builds expose no such
/// source and normal runs never call this command.
#[tauri::command]
async fn map_task0024_dr15_prepare(
    app: tauri::AppHandle,
) -> Result<map::content_signals::ContentObservationReport, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = app;
        return Err("TASK-0024 DR15 synthetic proof exists only in development builds".to_string());
    }
    #[cfg(debug_assertions)]
    {
        let (paths, brain) = resolve_brain(&app, map::rule_engine::TASK0024_DR15_BRAIN_ID)?;
        tauri::async_runtime::spawn_blocking(move || {
            map::rule_engine::prepare_task0024_dr15(&paths, &brain).map_err(String::from)
        })
        .await
        .map_err(|_| "task0024_dr15_worker_failed".to_string())?
    }
}

/// Materializes and observes the repository-local synthetic source used only
/// by the real TASK-0025/SR15 review-queue proof. Release builds expose no
/// such source and normal runs never call this command.
#[tauri::command]
async fn map_task0025_sr15_prepare(
    app: tauri::AppHandle,
) -> Result<map::content_signals::ContentObservationReport, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = app;
        return Err("TASK-0025 SR15 synthetic proof exists only in development builds".to_string());
    }
    #[cfg(debug_assertions)]
    {
        let (paths, brain) = resolve_brain(&app, map::rule_engine::TASK0025_SR15_BRAIN_ID)?;
        tauri::async_runtime::spawn_blocking(move || {
            map::rule_engine::prepare_task0025_sr15(&paths, &brain).map_err(String::from)
        })
        .await
        .map_err(|_| "task0025_sr15_worker_failed".to_string())?
    }
}

/// Generates the bounded-scale ED15 source inside the selected sandbox and
/// observes it with the production streaming SHA-256 path.
#[tauri::command]
async fn map_task0026_ed15_prepare(
    app: tauri::AppHandle,
) -> Result<map::content_signals::Task0026Ed15Preparation, String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = app;
        return Err("TASK-0026 ED15 synthetic proof exists only in development builds".to_string());
    }
    #[cfg(debug_assertions)]
    {
        let (paths, brain) = resolve_brain(&app, "brain-alpha")?;
        tauri::async_runtime::spawn_blocking(move || {
            map::content_signals::prepare_task0026_ed15(&paths, &brain).map_err(String::from)
        })
        .await
        .map_err(|_| "task0026_ed15_worker_failed".to_string())?
    }
}

/// Gives a debug proof process the native foreground focus immediately before
/// its external watcher injects a real Windows key. This is deliberately not a
/// JavaScript window capability and does not activate any page control.
#[tauri::command]
fn map_task0026_focus_proof_window(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(not(debug_assertions))]
    {
        let _ = app;
        return Err("TASK-0026 proof window focus exists only in development builds".to_string());
    }
    #[cfg(debug_assertions)]
    {
        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "task0026_proof_window_missing".to_string())?;
        window.set_focus().map_err(|error| error.to_string())
    }
}

/// `H8` — the engine actually rendering, read from the host.
///
/// `tauri::webview_version()` reports the WebView2 runtime on Windows. It is
/// asked of the system rather than parsed out of `navigator.userAgent`, which
/// a Chromium-based engine deliberately makes ambiguous.
#[tauri::command]
fn map_host_info(app: tauri::AppHandle) -> map::commands::HostInfo {
    map::commands::HostInfo {
        sandbox_root: map_sandbox(&app)
            .map(|paths| paths.display_root())
            .unwrap_or_else(|error| error),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        sqlite_version: rusqlite::version().to_string(),
        webview_version: tauri::webview_version()
            .unwrap_or_else(|error| format!("indisponible: {error}")),
        tauri_version: tauri::VERSION.to_string(),
        platform: std::env::consts::OS.to_string(),
        node_ceiling: 0, // DEC-0031: no corpus ceiling.
        depth_ceiling: map::MAX_FIXTURE_DEPTH,
        card_width: map::layout::CARD_WIDTH,
        card_height: map::layout::CARD_HEIGHT,
        layout_algorithm: map::layout::LAYOUT_ALGORITHM.to_string(),
        auto_measure: std::env::var("FILETOPO_AUTO_MEASURE").is_ok_and(|value| value == "1"),
        auto_verify: std::env::var("FILETOPO_AUTO_VERIFY").is_ok_and(|value| value == "1"),
        auto_relations: std::env::var("FILETOPO_AUTO_RELATIONS").is_ok_and(|value| value == "1"),
        auto_brains_pass: std::env::var("FILETOPO_AUTO_BRAINS")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        auto_composed_pass: std::env::var("FILETOPO_AUTO_COMPOSED")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        auto_cross_pass: std::env::var("FILETOPO_AUTO_CROSS")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        auto_topographic_pass: std::env::var("FILETOPO_AUTO_TOPOGRAPHIC")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        auto_content_pass: std::env::var("FILETOPO_AUTO_CONTENT")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        auto_dre_pass: std::env::var("FILETOPO_AUTO_DRE")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        // Reserve `X11`: the same engine, on a brain the legacy slice never
        // covered. One pass, because what it proves is genericity rather than
        // persistence across a restart.
        auto_generic_relations: std::env::var("FILETOPO_AUTO_X11").is_ok_and(|value| value == "1"),
        // `SR15`: the review queue and the memory of a decision, in two real
        // processes on one variant — pass 1 decides, pass 2 restarts.
        auto_sr15_pass: std::env::var("FILETOPO_AUTO_SR15")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
        auto_ed15_pass: std::env::var("FILETOPO_AUTO_ED15")
            .ok()
            .and_then(|value| value.parse::<u8>().ok())
            .filter(|pass| *pass == 1 || *pass == 2)
            .unwrap_or(0),
    }
}

/// `TASK-0017` — the relations of a brain, derivation replayed and frozen
/// synthetic suggestions seeded once.
#[tauri::command]
fn map_relations_open(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::relation_commands::RelationsOverview, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::relation_commands::open_relations(&paths, &brain).map_err(String::from)
}

/// Incoming and outgoing relations of one node, read with two separate
/// queries so neither direction is ever derived from the other.
#[tauri::command]
fn map_relations_for_node(
    app: tauri::AppHandle,
    reference: map::brains::BrainNodeRef,
) -> Result<map::relation_commands::NodeRelations, String> {
    let (paths, brain) = resolve_brain(&app, &reference.brain_id)?;
    map::relation_commands::node_relations(&paths, &brain, &reference).map_err(String::from)
}

/// The one explicit act that turns a suggestion into a relation.
///
/// Returns the whole overview, so the interface displays counts that came back
/// from the store rather than counts it incremented itself.
#[tauri::command]
fn map_relations_approve(
    app: tauri::AppHandle,
    brain_id: String,
    suggestion_key: String,
) -> Result<map::relation_commands::RelationsOverview, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::relation_commands::approve_suggestion(&paths, &brain, &suggestion_key)
        .map_err(String::from)
}

/// `F-045` — the one explicit act that records a refusal.
///
/// Returns the whole overview for the same reason approval does: the pending
/// count on screen must be the store's, never a decrement the interface made
/// up. It creates no relation of any provenance.
#[tauri::command]
fn map_relations_reject(
    app: tauri::AppHandle,
    brain_id: String,
    suggestion_key: String,
) -> Result<map::relation_commands::RelationsOverview, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::relation_commands::reject_suggestion(&paths, &brain, &suggestion_key).map_err(String::from)
}

/// `F-044` — one bounded page of the suggestions a brain is waiting on.
///
/// Generic over brains and paginated: `offset` and `limit` are clamped by the
/// command layer, and the response republishes what was applied together with
/// the ceiling, so the interface never has to guess either.
#[tauri::command]
fn map_relations_review_queue(
    app: tauri::AppHandle,
    brain_id: String,
    offset: Option<usize>,
    limit: Option<usize>,
) -> Result<map::relation_commands::SuggestionReviewQueue, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::relation_commands::review_queue(
        &paths,
        &brain,
        offset.unwrap_or(0),
        limit.unwrap_or(map::relations::MAX_REVIEW_QUEUE_LIMIT),
    )
    .map_err(String::from)
}

/// Replays `J1` to `J5` and `J10` against the live store and reports what it
/// found — reported, never asserted away.
#[tauri::command]
fn map_relations_self_check(
    app: tauri::AppHandle,
    brain_id: String,
) -> Result<map::relation_commands::RelationsSelfCheck, String> {
    let (paths, brain) = resolve_brain(&app, &brain_id)?;
    map::relation_commands::self_check(&paths, &brain).map_err(String::from)
}

/// The catalogue's brains, for a command that works across **all** of them.
///
/// Inter-brain relations join two brains, so no single `brain_id` argument
/// could name what they need. The catalogue is the source, and it is read here
/// rather than passed in from the page: what a relation joins is a property of
/// the store, never of what happens to be on screen.
fn map_all_brains(app: &tauri::AppHandle) -> Result<Vec<map::brains::BrainRecord>, String> {
    let paths = map_sandbox(app)?;
    let mut catalog =
        map::brains::BrainCatalog::open(&paths.catalog_database()).map_err(String::from)?;
    catalog.seed_frozen().map_err(String::from)?;
    let brains = catalog.list().map_err(String::from)?;
    Ok(brains)
}

/// `TASK-0020` — the inter-brain relations of the whole catalogue.
///
/// Replays the frozen `XBR-1` derivation and seeds its four suggestions once,
/// then reads everything back with **each end resolved in its own brain**.
///
/// **The composition is not an argument.** A relation towards a brain nobody is
/// looking at — or one whose index has never been built — comes back all the
/// same, with `brainIndexed: false` and no `nodeId`, so the interface can say
/// « hors de la vue » instead of hiding it.
#[tauri::command]
fn map_cross_relations_open(
    app: tauri::AppHandle,
) -> Result<map::cross_commands::CrossRelationsOverview, String> {
    let paths = map_sandbox(&app)?;
    let brains = map_all_brains(&app)?;
    map::cross_commands::open_cross_relations(&paths, &brains).map_err(String::from)
}

/// Incoming and outgoing **inter-brain** relations of one node, read with two
/// separate queries so neither direction is ever derived from the other.
#[tauri::command]
fn map_cross_relations_for_node(
    app: tauri::AppHandle,
    reference: map::brains::BrainNodeRef,
) -> Result<map::cross_commands::NodeCrossRelations, String> {
    let paths = map_sandbox(&app)?;
    let brains = map_all_brains(&app)?;
    map::cross_commands::node_cross_relations(&paths, &brains, &reference).map_err(String::from)
}

/// The one explicit act that turns an inter-brain suggestion into a relation.
///
/// Returns the whole overview, so the interface displays counts that came back
/// from the store rather than counts it incremented itself.
#[tauri::command]
fn map_cross_relations_approve(
    app: tauri::AppHandle,
    suggestion_key: String,
) -> Result<map::cross_commands::CrossRelationsOverview, String> {
    let paths = map_sandbox(&app)?;
    let brains = map_all_brains(&app)?;
    map::cross_commands::approve_cross_suggestion(&paths, &brains, &suggestion_key)
        .map_err(String::from)
}

/// Replays `M1` to `M5` against the live common store and reports what it
/// found — reported, never asserted away.
#[tauri::command]
fn map_cross_relations_self_check(
    app: tauri::AppHandle,
) -> Result<map::cross_commands::CrossRelationsSelfCheck, String> {
    let paths = map_sandbox(&app)?;
    let brains = map_all_brains(&app)?;
    map::cross_commands::cross_self_check(&paths, &brains).map_err(String::from)
}

/// The frozen `XBR-1` references, published so the scenario reads them from
/// the one place they are spelled rather than repeating them in TypeScript.
#[tauri::command]
fn map_cross_relations_frozen() -> Vec<map::cross_commands::FrozenCrossReference> {
    map::cross_commands::frozen_references()
}

/// Development-only: writes a measurement artefact into the repository.
///
/// Measurements taken inside WebView2 are evidence, and evidence belongs in the
/// repository rather than in an application directory nobody reviews. The
/// destination is resolved at run time and confined to `docs/performance/runs/`;
/// a release build has no such command at all.
#[cfg(debug_assertions)]
#[tauri::command]
fn map_write_run_artifact(name: String, contents: String) -> Result<String, String> {
    map::commands::write_run_artifact(&name, &contents).map_err(String::from)
}

#[cfg(not(debug_assertions))]
#[tauri::command]
fn map_write_run_artifact(_name: String, _contents: String) -> Result<String, String> {
    Err("run_artifacts_unavailable_in_release".to_string())
}

/// The commands the current product exposes to the WebView — and no others.
///
/// `TASK-0016` §12.4 makes the synthetic fixtures the **only** source of the
/// current slice. Registering a command is what makes it reachable, so the
/// prototype's commands — folder picker, real-root indexing, collection search,
/// seen/unseen, Explorer reveal — are **deliberately absent** from the handler
/// below. Their code is kept (`DEC-0015` A: the 0.1 alpha is a technical audit
/// worth preserving), but keeping code and exposing it are different acts.
///
/// The reserve `X2` of the independent control was raised precisely because
/// this handler had grown by addition: the slice's commands were added without
/// the prototype's being removed, leaving a real folder picker one `invoke`
/// away from a slice that must not have one. `exposed_commands_stay_within_the_slice`
/// now fails if that happens again.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // `DEC-0033` H and I — the native folder picker, and the only change of
        // stack in this slice. The plugin has been declared in `Cargo.toml`
        // since the 0.1 prototype and was deliberately left uninitialised while
        // reserve `X2` stood; `TASK-0032` is the task that lifts it. What
        // replaces `X2` is narrower and tested: no exposed command accepts a
        // path, and the capability grants `dialog:allow-open` and nothing else.
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // An unattended H9 run needs frames, and Chromium stops delivering
            // them to a window it treats as occluded. Keeping the window on top
            // and focused is what makes the measurement possible at all; it is
            // confined to measurement mode and never affects normal use.
            //
            // The J12 scenario of `TASK-0017` needs it for a different reason:
            // reserve `X4` requires a **real** Windows keystroke, and a
            // keystroke goes to the foreground window. A window nobody brought
            // forward would receive nothing, and the run would report a
            // failure that says more about the desktop than about the product.
            let unattended = ["FILETOPO_AUTO_MEASURE", "FILETOPO_AUTO_RELATIONS"]
                .iter()
                .any(|name| std::env::var(name).is_ok_and(|value| value == "1"))
                // `K12` needs the window forward for the same reason `J12`
                // does: a real keystroke goes to the foreground window.
                || [
                    "FILETOPO_AUTO_BRAINS",
                    "FILETOPO_AUTO_COMPOSED",
                    "FILETOPO_AUTO_CROSS",
                    "FILETOPO_AUTO_TOPOGRAPHIC",
                    "FILETOPO_AUTO_CONTENT",
                ]
                    .iter()
                    .any(|name| {
                        std::env::var(name).is_ok_and(|value| value == "1" || value == "2")
                    });
            if unattended {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_always_on_top(true);
                    let _ = window.set_focus();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            map_fixtures,
            map_brains,
            map_brain_activate,
            map_brain_update,
            map_brain_choose_real_root,
            map_open,
            map_refresh,
            map_rebuild,
            map_prepare_synthetic_source,
            map_snapshot,
            map_view,
            map_resolve_node,
            map_node_detail,
            map_integrity,
            map_self_check,
            map_content_observe,
            map_content_summary,
            map_content_observation_for_path,
            map_content_identical_members,
            map_content_diagnostics,
            map_content_observations,
            map_exact_duplicate_summary,
            map_exact_duplicate_groups,
            map_exact_duplicate_members,
            map_relation_engine_status,
            map_relation_engine_run,
            map_task0024_dr15_prepare,
            map_task0025_sr15_prepare,
            map_task0026_ed15_prepare,
            map_task0026_focus_proof_window,
            map_relations_open,
            map_relations_for_node,
            map_relations_approve,
            map_relations_reject,
            map_relations_review_queue,
            map_relations_self_check,
            map_cross_relations_open,
            map_cross_relations_for_node,
            map_cross_relations_approve,
            map_cross_relations_self_check,
            map_cross_relations_frozen,
            map_host_info,
            map_log,
            map_write_run_artifact
        ])
        .run(tauri::generate_context!())
        .expect("FileTopo could not start");
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::collections::hash_map::DefaultHasher;
    use std::fs;
    use std::hash::{Hash, Hasher};

    /// The source of this file, embedded at compile time.
    ///
    /// Reading the handler back is the only way to assert what the runtime
    /// actually exposes: `generate_handler!` expands to an opaque closure, so
    /// there is nothing to introspect at run time. `include_str!` embeds the
    /// **contents**, never the path, so no local path reaches the binary.
    const THIS_SOURCE: &str = include_str!("lib.rs");

    fn registered_commands() -> Vec<String> {
        let start = THIS_SOURCE
            .find(".invoke_handler(tauri::generate_handler![")
            .expect("the runtime must register a handler");
        let block = &THIS_SOURCE[start..];
        let end = block.find("])").expect("unterminated handler");
        block[..end]
            .lines()
            .skip(1)
            .map(|line| line.trim().trim_end_matches(',').to_string())
            .filter(|name| !name.is_empty())
            .collect()
    }

    /// Reserve `X2` of the independent control, locked down.
    ///
    /// The prototype's commands stay in this file as the 0.1 audit they are,
    /// but a command that is not registered cannot be invoked. This test fails
    /// the moment one of them is exposed again — which is exactly how the
    /// defect arose the first time: by addition, without anyone noticing that
    /// a real folder picker was still reachable.
    #[test]
    fn exposed_commands_stay_within_the_slice() {
        let exposed = registered_commands();

        // Every legacy command named by the independent control, plus the two
        // prototype commands that feed the 0.1 screen.
        for forbidden in [
            "list_collections",
            "choose_collection",
            "index_collection",
            "cancel_indexing",
            "index_progress",
            "query_collection_nodes",
            "mark_node_seen",
            "reveal_indexed_node",
            "health",
            "demo_snapshot",
            "scan_synthetic_fixture",
        ] {
            assert!(
                !exposed.iter().any(|name| name == forbidden),
                "X2: `{forbidden}` is out of the slice's scope and must not be \
                 registered; it is reachable from the WebView the moment it is"
            );
        }

        // Stated positively as well, so an unrelated command cannot slip in.
        for name in &exposed {
            assert!(
                name.starts_with("map_"),
                "the current runtime exposes `{name}`, which is not part of the \
                 TASK-0016 slice"
            );
        }
        assert!(!exposed.is_empty(), "the slice needs its own commands");
    }

    /// `K2` and `K11`, together: the brain surface exists, and it is `map_`.
    ///
    /// Stated positively because `K2` asks that the runtime take `brain_id` as
    /// its boundary. A command that is not registered cannot be invoked, so an
    /// unregistered catalogue would leave the interface unable to name a brain
    /// at all — and the test above would happily pass.
    #[test]
    fn the_brain_commands_are_exposed_and_stay_in_the_map_surface() {
        let exposed = registered_commands();
        for required in ["map_brains", "map_brain_activate", "map_brain_update"] {
            assert!(
                exposed.iter().any(|name| name == required),
                "TASK-0018 needs `{required}` reachable from the WebView"
            );
        }
        assert!(exposed.iter().all(|name| name.starts_with("map_")));
    }

    #[test]
    fn exact_content_commands_are_exposed_without_a_relation_command() {
        let exposed = registered_commands();
        for required in [
            "map_content_observe",
            "map_content_summary",
            "map_content_observation_for_path",
            "map_content_identical_members",
            "map_content_diagnostics",
            "map_content_observations",
            "map_exact_duplicate_summary",
            "map_exact_duplicate_groups",
            "map_exact_duplicate_members",
        ] {
            assert!(
                exposed.iter().any(|name| name == required),
                "TASK-0023 needs `{required}` reachable from the WebView"
            );
        }
        assert!(
            !exposed
                .iter()
                .any(|name| name.contains("same_hash_relation"))
        );
        assert!(
            !exposed
                .iter()
                .any(|name| name.contains("content_suggestion"))
        );
    }

    #[test]
    fn deterministic_relation_engine_commands_are_explicitly_exposed() {
        let exposed = registered_commands();
        for required in ["map_relation_engine_status", "map_relation_engine_run"] {
            assert!(
                exposed.iter().any(|name| name == required),
                "TASK-0024 needs `{required}` reachable from the WebView"
            );
        }
    }

    /// Reserve `X2`, **lifted and replaced** — `DEC-0033` I.
    ///
    /// `X2` forbade the runtime to initialise the dialogue plugin, because no
    /// task then had the right to open a real folder. `TASK-0032` is that task,
    /// so the plugin is now initialised on purpose. What replaces the old
    /// prohibition is narrower and, unlike it, still meaningful once a picker
    /// exists: **no exposed command accepts a path**, so the WebView cannot
    /// name a folder — only the person, through the native dialogue, can.
    #[test]
    fn the_picker_exists_and_no_exposed_command_accepts_a_path() {
        let start = THIS_SOURCE
            .find("pub fn run() {")
            .expect("runtime entry point");
        let length = THIS_SOURCE[start..]
            .find(".run(tauri::generate_context!())")
            .expect("runtime must end by running");
        let runtime = &THIS_SOURCE[start..start + length];
        assert!(
            runtime.contains("tauri_plugin_dialog::init()"),
            "TASK-0032 needs the dialogue plugin initialised"
        );

        let exposed = registered_commands();
        assert!(
            exposed
                .iter()
                .any(|name| name == "map_brain_choose_real_root"),
            "the picker command must be reachable from the WebView"
        );
        // The 0.1 prototype's picker wrote into the old `Registry`. It stays
        // unregistered: `DEC-0033` I keeps the historical audit as history and
        // does not resurrect it as product truth.
        assert!(!exposed.iter().any(|name| name == "choose_collection"));

        // The guarantee itself, read off the signatures the handler registers.
        //
        // What is forbidden is a parameter that could name a place **on the
        // disk**: a `Path`/`PathBuf` type, or a name denoting a root, a folder
        // or an absolute path. `map_resolve_node`'s `relative_path` is none of
        // those — it is a path **inside one brain's index**, scoped by the
        // `brain_id` beside it, resolved by an SQL lookup that never touches
        // the filesystem. Forbidding it would be forbidding the wrong thing;
        // what `DEC-0033` A rules out is the WebView choosing a **root**.
        for command in &exposed {
            let Some(at) = THIS_SOURCE.find(&format!("fn {command}(")) else {
                continue;
            };
            let signature = &THIS_SOURCE[at..at + THIS_SOURCE[at..].find(')').unwrap_or(0)];
            for parameter in signature.split(',').skip(1) {
                let (name, kind) = parameter.split_once(':').unwrap_or((parameter, ""));
                let name = name.trim();
                assert!(
                    !kind.contains("Path"),
                    "`{command}` takes a filesystem path type: {parameter}"
                );
                assert!(
                    !matches!(
                        name,
                        "path" | "root" | "folder" | "directory" | "absolute_path"
                    ),
                    "`{command}` would let the WebView name a place on disk: {parameter}"
                );
            }
        }
    }

    /// `DEC-0033` H — the WebView gets the picker and nothing else.
    #[test]
    fn the_capability_grants_the_dialogue_and_no_filesystem_access() {
        let capability = include_str!("../capabilities/default.json");
        assert!(capability.contains("\"dialog:allow-open\""));
        for forbidden in ["fs:", "dialog:allow-save", "dialog:default", "shell:"] {
            assert!(
                !capability.contains(forbidden),
                "the main window must not be granted `{forbidden}`"
            );
        }
    }

    use std::path::Path;

    fn fixture_fingerprint(root: &Path) -> u64 {
        fn visit(path: &Path, hasher: &mut DefaultHasher) {
            let mut entries = fs::read_dir(path)
                .expect("read fixture")
                .map(|entry| entry.expect("fixture entry"))
                .collect::<Vec<_>>();
            entries.sort_by_key(|entry| entry.file_name());
            for entry in entries {
                entry.file_name().hash(hasher);
                if entry.file_type().expect("file type").is_dir() {
                    visit(&entry.path(), hasher);
                } else {
                    fs::read(entry.path())
                        .expect("synthetic content")
                        .hash(hasher);
                }
            }
        }

        let mut hasher = DefaultHasher::new();
        visit(root, &mut hasher);
        hasher.finish()
    }

    #[test]
    fn fixture_root_is_resolved_at_runtime_without_a_compiled_in_path() {
        let resolved =
            synthetic_fixture_root().expect("fixture located from the working directory");
        let expected = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("tests")
            .join("fixtures_synthetic")
            .join("demo");

        // Same directory, reached without baking an absolute path into the code.
        assert!(resolved.is_dir());
        assert_eq!(
            resolved.canonicalize().expect("resolved fixture"),
            expected.canonicalize().expect("expected fixture")
        );
    }

    #[test]
    fn health_reports_the_synthetic_fixture_only_in_development() {
        let reported = health();
        // The test binary is always a debug build, so the flag must follow it.
        assert_eq!(reported.synthetic_fixture_available, cfg!(debug_assertions));
        assert!(reported.synthetic_fixture_available);
        assert_eq!(reported.mode, "local_offline");
    }

    #[test]
    fn fixture_to_index_to_render_dto_is_read_only() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("tests")
            .join("fixtures_synthetic")
            .join("demo");
        let before = fixture_fingerprint(&root);

        let snapshot = scan_synthetic_fixture().expect("fixture pipeline");

        assert_eq!(before, fixture_fingerprint(&root));
        assert_eq!(snapshot.collection_id, "fixture-demo");
        assert!(snapshot.node_count >= 8);
        assert_eq!(snapshot.node_count, snapshot.nodes.len());
        assert_eq!(snapshot.terrain.len(), snapshot.node_count - 1);
        assert!(
            snapshot
                .nodes
                .iter()
                .all(|node| !node.relative_path.contains(".."))
        );
    }

    #[test]
    fn registered_collection_is_indexed_outside_its_root() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("synthetic-root");
        let app_data = temp.path().join("app-data");
        fs::create_dir_all(root.join("notes")).expect("root");
        fs::write(root.join("notes/one.txt"), b"synthetic").expect("fixture");
        let registry_path = app_data.join("registry.sqlite");
        let registry = Registry::open(registry_path.clone()).expect("registry");
        let collection = registry.register(&root).expect("register");
        let before = fixture_fingerprint(&root);

        let snapshot =
            index_registered_collection(&app_data, &registry_path, &collection.id).expect("index");

        assert_eq!(snapshot.node_count, 3);
        assert_eq!(before, fixture_fingerprint(&root));
        assert!(
            app_data
                .join("collections")
                .join(&collection.id)
                .join("index.sqlite")
                .is_file()
        );
        assert!(!root.join("index.sqlite").exists());
        assert_eq!(registry.list().expect("list")[0].node_count, 3);
    }

    #[test]
    fn cancelled_collection_scan_never_writes_a_partial_index() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("synthetic-root");
        let app_data = temp.path().join("app-data");
        fs::create_dir_all(&root).expect("root");
        fs::write(root.join("one.txt"), b"synthetic").expect("fixture");
        let registry_path = app_data.join("registry.sqlite");
        let registry = Registry::open(registry_path.clone()).expect("registry");
        let collection = registry.register(&root).expect("register");

        let result = index_registered_collection_controlled(
            &app_data,
            &registry_path,
            &collection.id,
            || true,
            |_| {},
        );

        assert_eq!(result.expect_err("cancelled"), "scan_cancelled");
        assert!(
            !app_data
                .join("collections")
                .join(&collection.id)
                .join("index.sqlite")
                .exists()
        );
        assert_eq!(registry.list().expect("list")[0].node_count, 0);
    }

    #[test]
    fn indexed_target_resolution_rejects_escape_and_missing_entries() {
        let temp = tempfile::tempdir().expect("temp");
        let root = temp.path().join("synthetic-root");
        fs::create_dir_all(root.join("notes")).expect("root");
        fs::write(root.join("notes/one.txt"), b"synthetic").expect("fixture");

        assert_eq!(
            resolve_indexed_target(&root, "notes/one.txt").expect("safe"),
            root.join("notes/one.txt")
        );
        assert_eq!(
            resolve_indexed_target(&root, "../outside.txt").expect_err("escape"),
            "indexed_path_invalid"
        );
        assert_eq!(
            resolve_indexed_target(&root, "notes/missing.txt").expect_err("missing"),
            "indexed_target_unavailable"
        );
    }
}
