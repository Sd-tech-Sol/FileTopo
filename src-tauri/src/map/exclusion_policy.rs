//! Brain-scoped V1 exclusion policy — `TASK-0048`, `DEC-0046`.
//!
//! A rule is one canonical relative subtree. There is no glob, negation or
//! implicit ignore file. The catalogue stores the desired policy; the Index
//! stores the policy that produced the corpus it currently serves.

use super::MapError;
use super::brains::BrainCatalog;
use serde::{Deserialize, Serialize};
use std::path::{Component, Path};

pub const EXCLUSION_POLICY_VERSION: u32 = 1;
pub const INDEX_POLICY_META_KEY: &str = "exclusion_policy.v1";
const CATALOG_KEY_PREFIX: &str = "exclusion_policy.v1.";

/// 128 rules × 512 Unicode scalar values keeps the persisted/IPC record below
/// roughly 256 KiB even in the worst UTF-8 case. That is ample for a manual V1
/// list and bounded enough to validate and compare synchronously.
pub const MAX_EXCLUSION_RULES: usize = 128;
pub const MAX_EXCLUSION_RULE_CHARS: usize = 512;
const MAX_POLICY_BYTES: usize = 262_144;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExclusionPolicy {
    rules: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Envelope {
    version: u32,
    rules: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExclusionPolicyState {
    pub brain_id: String,
    pub version: u32,
    pub rules: Vec<String>,
    /// Desired catalogue policy and applied Index stamp differ, or no Index
    /// exists yet. The last reliable Index remains readable in either case.
    pub application_required: bool,
}

fn rejected(reason: &str) -> MapError {
    MapError::ExclusionPolicyRejected(reason.to_string())
}

fn canonical_rule(raw: &str) -> Result<String, MapError> {
    if raw.chars().count() > MAX_EXCLUSION_RULE_CHARS {
        return Err(rejected("rule_too_long"));
    }
    if raw.contains('\0') {
        return Err(rejected("rule_invalid_character"));
    }

    // The UI may use either separator. Converting first gives one portable
    // persisted spelling and makes UNC/root checks independent of the host.
    let separated = raw.replace('\\', "/");
    if separated.starts_with('/')
        || separated
            .as_bytes()
            .get(1)
            .is_some_and(|byte| *byte == b':')
    {
        return Err(rejected("rule_must_be_relative"));
    }

    let mut parts = Vec::new();
    for component in Path::new(&separated).components() {
        match component {
            Component::Prefix(_) | Component::RootDir => {
                return Err(rejected("rule_must_be_relative"));
            }
            Component::ParentDir => return Err(rejected("rule_parent_forbidden")),
            Component::CurDir => {}
            Component::Normal(part) => parts.push(part.to_string_lossy().into_owned()),
        }
    }
    if parts.is_empty() {
        return Err(rejected("rule_root_forbidden"));
    }
    let canonical = parts.join("/");
    if canonical.chars().count() > MAX_EXCLUSION_RULE_CHARS {
        return Err(rejected("rule_too_long"));
    }
    Ok(canonical)
}

#[cfg(windows)]
fn component_eq(left: &str, right: &str) -> bool {
    use windows_sys::Win32::Globalization::CompareStringOrdinal;
    let left = left.encode_utf16().collect::<Vec<_>>();
    let right = right.encode_utf16().collect::<Vec<_>>();
    // Windows ordinal ignore-case is the platform comparison intended for
    // file names; it also handles non-ASCII without applying a portable,
    // locale-sensitive lowercase transformation.
    unsafe {
        CompareStringOrdinal(
            left.as_ptr(),
            left.len() as i32,
            right.as_ptr(),
            right.len() as i32,
            1,
        ) == 2
    }
}

#[cfg(not(windows))]
fn component_eq(left: &str, right: &str) -> bool {
    left == right
}

fn same_or_descendant(candidate: &str, ancestor: &str) -> bool {
    let candidate = candidate.split('/').collect::<Vec<_>>();
    let ancestor = ancestor.split('/').collect::<Vec<_>>();
    ancestor.len() <= candidate.len()
        && ancestor
            .iter()
            .zip(candidate.iter())
            .all(|(left, right)| component_eq(left, right))
}

impl ExclusionPolicy {
    pub fn canonical(rules: &[String]) -> Result<Self, MapError> {
        if rules.len() > MAX_EXCLUSION_RULES {
            return Err(rejected("too_many_rules"));
        }
        let mut canonical = rules
            .iter()
            .map(|rule| canonical_rule(rule))
            .collect::<Result<Vec<_>, _>>()?;
        canonical.sort();
        canonical.dedup();

        // Once an ancestor is present, a descendant cannot change the result.
        // Component boundaries matter: `foo` is not an ancestor of `foobar`.
        let mut minimal: Vec<String> = Vec::with_capacity(canonical.len());
        for rule in canonical {
            if minimal
                .iter()
                .any(|ancestor| same_or_descendant(&rule, ancestor))
            {
                continue;
            }
            minimal.push(rule);
        }
        Ok(Self { rules: minimal })
    }

    pub fn rules(&self) -> &[String] {
        &self.rules
    }

    pub fn excludes(&self, relative: &Path) -> bool {
        let relative = relative.to_string_lossy().replace('\\', "/");
        self.excludes_text(&relative)
    }

    pub fn excludes_text(&self, relative: &str) -> bool {
        !relative.is_empty()
            && self
                .rules
                .iter()
                .any(|rule| same_or_descendant(relative, rule))
    }

    pub fn encode(&self) -> Result<String, MapError> {
        serde_json::to_string(&Envelope {
            version: EXCLUSION_POLICY_VERSION,
            rules: self.rules.clone(),
        })
        .map_err(|_| rejected("policy_not_serializable"))
    }

    pub fn decode(raw: &str) -> Result<Self, MapError> {
        if raw.len() > MAX_POLICY_BYTES {
            return Err(rejected("stored_policy_invalid"));
        }
        let envelope: Envelope =
            serde_json::from_str(raw).map_err(|_| rejected("stored_policy_invalid"))?;
        if envelope.version != EXCLUSION_POLICY_VERSION {
            return Err(rejected("stored_policy_version_unknown"));
        }
        let canonical =
            Self::canonical(&envelope.rules).map_err(|_| rejected("stored_policy_invalid"))?;
        if canonical.rules != envelope.rules {
            return Err(rejected("stored_policy_not_canonical"));
        }
        Ok(canonical)
    }

    pub fn state(&self, brain_id: &str, application_required: bool) -> ExclusionPolicyState {
        ExclusionPolicyState {
            brain_id: brain_id.to_string(),
            version: EXCLUSION_POLICY_VERSION,
            rules: self.rules.clone(),
            application_required,
        }
    }
}

fn key_for(brain_id: &str) -> String {
    format!("{CATALOG_KEY_PREFIX}{brain_id}")
}

impl BrainCatalog {
    pub fn exclusion_policy(&self, brain_id: &str) -> Result<ExclusionPolicy, MapError> {
        self.require(brain_id)?;
        match self.meta(&key_for(brain_id))? {
            Some(raw) => ExclusionPolicy::decode(&raw),
            None => Ok(ExclusionPolicy::default()),
        }
    }

    pub fn replace_exclusion_policy(
        &self,
        brain_id: &str,
        rules: &[String],
    ) -> Result<ExclusionPolicy, MapError> {
        self.require(brain_id)?;
        let policy = ExclusionPolicy::canonical(rules)?;
        self.put_meta(&key_for(brain_id), &policy.encode()?)?;
        Ok(policy)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_string()).collect()
    }

    #[test]
    fn canonicalizes_separators_deduplicates_and_removes_redundant_descendants() {
        let policy = ExclusionPolicy::canonical(&rules(&[
            "cache\\tmp",
            "cache/tmp",
            "cache",
            "données/été",
            "données/été/mini",
        ]))
        .expect("policy");
        assert_eq!(policy.rules(), &rules(&["cache", "données/été"]));
    }

    #[test]
    fn matches_components_not_text_prefixes() {
        let policy = ExclusionPolicy::canonical(&rules(&["foo"])).expect("policy");
        assert!(policy.excludes_text("foo"));
        assert!(policy.excludes_text("foo/bar"));
        assert!(!policy.excludes_text("foobar"));
        if cfg!(windows) {
            assert!(policy.excludes_text("Foo"));
        } else {
            assert!(!policy.excludes_text("Foo"));
        }
    }

    #[test]
    fn rejects_root_parent_absolute_unc_and_drive_prefixes() {
        for raw in [
            "",
            ".",
            "..",
            "a/../b",
            "/root",
            "\\\\server\\share",
            "C:\\root",
        ] {
            assert!(
                ExclusionPolicy::canonical(&rules(&[raw])).is_err(),
                "{raw:?} must be refused"
            );
        }
    }

    #[test]
    fn accepts_spaces_and_non_ascii_components() {
        let policy =
            ExclusionPolicy::canonical(&rules(&["Mes caches/été 2026"])).expect("valid path");
        assert!(policy.excludes_text("Mes caches/été 2026/fichier.txt"));
    }

    #[test]
    fn stored_policy_is_versioned_and_must_already_be_canonical() {
        let policy = ExclusionPolicy::canonical(&rules(&["cache/tmp"])).expect("policy");
        assert_eq!(
            ExclusionPolicy::decode(&policy.encode().expect("json")).unwrap(),
            policy
        );
        assert!(ExclusionPolicy::decode(r#"{"version":2,"rules":[]}"#).is_err());
        assert!(ExclusionPolicy::decode(r#"{"version":1,"rules":["cache/tmp","cache"]}"#).is_err());
    }

    #[test]
    fn declared_bounds_are_enforced() {
        assert!(
            ExclusionPolicy::canonical(&vec!["x".to_string(); MAX_EXCLUSION_RULES + 1]).is_err()
        );
        assert!(ExclusionPolicy::canonical(&["x".repeat(MAX_EXCLUSION_RULE_CHARS + 1)]).is_err());
    }
}
