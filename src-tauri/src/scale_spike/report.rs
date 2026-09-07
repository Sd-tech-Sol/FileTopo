//! `§7` — writing the four `TASK-0028` artifacts. **Test-only.**
//!
//! Three rules the writer enforces rather than assumes:
//!
//! 1. it **refuses** to touch any of the 36 sealed names of
//!    [`crate::map::commands::PROTECTED_RUN_ARTIFACTS`] — `X5` stays at 36 and
//!    this spike seals nothing;
//! 2. every artifact carries the `ENGINEERING_MEASUREMENT / NOT A PRODUCT
//!    CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL` banner;
//! 3. no artifact may contain the user name, the host name or a `Users` path —
//!    checked on the serialised bytes, immediately before the write.

use std::fs;
use std::io;
use std::path::PathBuf;

/// Refuses to write anything that would leak an identifier or overwrite a seal.
pub fn write_artifact(name: &str, body: serde_json::Value) -> io::Result<PathBuf> {
    assert!(
        !crate::map::commands::PROTECTED_RUN_ARTIFACTS.contains(&name),
        "TASK-0028 never writes a sealed artifact: {name}"
    );
    assert!(
        name.starts_with("TASK-0028-") && name.ends_with(".json"),
        "this spike only writes its own artifacts: {name}"
    );

    let document = serde_json::json!({
        "task": "TASK-0028",
        "title": "Synthetic Scale Feasibility Spike",
        "status": super::MEASUREMENT_BANNER,
        "protocol": "docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md",
        "decision": "DEC-0029",
        "reserve": "R8 entière — ces chiffres ne sont publiés nulle part ailleurs.",
        "notAProductClaim":
            "Mesures d'ingénierie sur corpus synthétique. Aucune promesse de performance, \
             aucune cible validée, aucun état produit changé.",
        "measurement": body,
    });

    let serialised = serde_json::to_string_pretty(&document)
        .map_err(|error| io::Error::other(error.to_string()))?;
    assert_clean(&serialised);

    let directory = super::runs_directory();
    fs::create_dir_all(&directory)?;
    let path = directory.join(name);
    fs::write(&path, serialised.as_bytes())?;
    Ok(path)
}

/// Panics if the serialised artifact carries anything personal.
///
/// Deliberately a hard failure: a leaked identifier must stop the run, not
/// produce a file someone has to notice later.
pub fn assert_clean(serialised: &str) {
    let lowered = serialised.to_ascii_lowercase();
    assert!(
        !lowered.contains("\\users\\") && !lowered.contains("/users/"),
        "an artifact tried to carry a personal path"
    );
    for key in ["USERNAME", "COMPUTERNAME", "USERDOMAIN"] {
        if let Ok(secret) = std::env::var(key) {
            if secret.len() >= 3 {
                assert!(
                    !serialised.contains(&secret),
                    "an artifact tried to carry {key}"
                );
            }
        }
    }
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
    fn writing_outside_the_task_namespace_is_impossible() {
        let _ = write_artifact("TASK-0027-something.json", serde_json::json!({}));
    }

    #[test]
    #[should_panic(expected = "personal path")]
    fn a_personal_path_stops_the_run() {
        assert_clean("{\"root\":\"C:\\\\Users\\\\someone\\\\dev\"}");
    }

    #[test]
    fn a_clean_body_passes_and_the_seal_count_is_still_thirty_six() {
        assert_clean("{\"root\":\"<repo>/.filetopo-sandbox/task0028\"}");
        assert_eq!(
            crate::map::commands::PROTECTED_RUN_ARTIFACTS.len(),
            36,
            "X5 must stay at 36 for the whole of TASK-0028"
        );
    }
}
