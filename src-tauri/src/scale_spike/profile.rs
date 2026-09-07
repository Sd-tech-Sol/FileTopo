//! `§3` / `§4` — the frozen bench profile. **Test-only, sanitised.**
//!
//! What is read is exactly what `AGENTS.md`, section *Lecture minimale de
//! l'environnement technique*, allows an `APPROVED` task to read: compiler and
//! runtime versions, CPU model and core counts, installed RAM, GPU model, disk
//! media type. **Targeted, non-recursive, strictly technical.**
//!
//! What is never read and never written: host name, user name, any
//! `C:\Users\…` path, serial numbers, machine identifiers, network addresses.
//! [`sanitise`] is applied to every string before it reaches an artifact, and a
//! test proves an artifact carrying the user name would be caught.

use std::process::Command;

/// Classification frozen **before** the machine was read, per protocol `§4.1`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BenchClass {
    /// Ordinary laptop/desktop, modest RAM, integrated or entry-level GPU.
    TargetClass,
    /// Anything more powerful. Engineering data only — **never** an acceptance
    /// claim for the "modest machine" target.
    DevelopmentBenchNotAcceptance,
}

impl BenchClass {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::TargetClass => "TARGET_CLASS",
            Self::DevelopmentBenchNotAcceptance => "DEVELOPMENT_BENCH_NOT_ACCEPTANCE",
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct BenchProfile {
    pub os: String,
    pub os_version: String,
    pub cpu: String,
    pub physical_cores: u32,
    pub logical_cores: u32,
    pub ram_bytes: u64,
    pub gpus: Vec<String>,
    pub disk_media: String,
    pub rustc: String,
    pub cargo: String,
    pub node: String,
    pub sqlite: String,
    /// Anything the harness tried to read and could not, recorded rather than
    /// hidden.
    pub unavailable: Vec<String>,
}

impl BenchProfile {
    /// `TARGET_CLASS` requires **all three**: modest RAM, an integrated or
    /// entry-level GPU, and a mobile/desktop-class CPU rather than a
    /// workstation part. Anything else is a development bench.
    ///
    /// The rule is written here, ahead of any measurement, so a powerful
    /// machine cannot be talked into the acceptance class after the fact.
    pub fn classify(&self) -> BenchClass {
        const MODEST_RAM_LIMIT: u64 = 16 * 1024 * 1024 * 1024;
        let modest_ram = self.ram_bytes > 0 && self.ram_bytes <= MODEST_RAM_LIMIT;
        let modest_gpu = !self.gpus.is_empty()
            && self.gpus.iter().all(|gpu| {
                let gpu = gpu.to_ascii_lowercase();
                let discrete = ["geforce", "radeon rx", "quadro", "rtx", "gtx", "arc a"]
                    .iter()
                    .any(|marker| gpu.contains(marker));
                !discrete
            });
        let modest_cpu = self.logical_cores > 0 && self.logical_cores <= 16;
        if modest_ram && modest_gpu && modest_cpu {
            BenchClass::TargetClass
        } else {
            BenchClass::DevelopmentBenchNotAcceptance
        }
    }

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "class": self.classify().as_str(),
            "classNote": match self.classify() {
                BenchClass::TargetClass =>
                    "Banc de la classe visée. Les mesures restent des données d'ingénierie.",
                BenchClass::DevelopmentBenchNotAcceptance =>
                    "Banc plus puissant que la classe visée : AUCUNE cible « machine modeste » n'est validée par ces mesures.",
            },
            "os": self.os,
            "osVersion": self.os_version,
            "cpu": self.cpu,
            "physicalCores": self.physical_cores,
            "logicalCores": self.logical_cores,
            "ramBytes": self.ram_bytes,
            "ramGib": (self.ram_bytes as f64 / (1024.0 * 1024.0 * 1024.0) * 100.0).round() / 100.0,
            "gpus": self.gpus,
            "diskMedia": self.disk_media,
            "toolchain": {
                "rustc": self.rustc,
                "cargo": self.cargo,
                "node": self.node,
                "sqlite": self.sqlite,
            },
            "unavailable": self.unavailable,
            "privacy": "Aucun nom d'hôte, nom d'utilisateur, chemin personnel ou identifiant machine n'est lu ni écrit.",
        })
    }
}

/// Strips anything that could identify the machine or its owner.
///
/// Applied to **every** string that reaches an artifact. The user name is read
/// from the environment purely so it can be removed — never so it can be
/// stored.
pub fn sanitise(value: &str) -> String {
    let mut cleaned = value.trim().to_string();
    for key in ["USERNAME", "USERDOMAIN", "COMPUTERNAME", "USERPROFILE"] {
        if let Ok(secret) = std::env::var(key) {
            if secret.len() >= 3 {
                cleaned = cleaned.replace(&secret, "<redacted>");
                // Path fragments carry the same value with separators flipped.
                cleaned = cleaned.replace(&secret.replace('\\', "/"), "<redacted>");
            }
        }
    }
    // Any surviving user path is removed wholesale rather than trusted.
    let lowered = cleaned.to_ascii_lowercase();
    if lowered.contains("\\users\\") || lowered.contains("/users/") {
        cleaned = "<path redacted>".to_string();
    }
    cleaned
}

/// Reads the bench profile. Never fails: what cannot be read is listed in
/// [`BenchProfile::unavailable`], never guessed.
pub fn capture() -> BenchProfile {
    let mut profile = BenchProfile {
        sqlite: rusqlite::version().to_string(),
        ..Default::default()
    };

    profile.rustc = tool_version("rustc", &["--version"], &mut profile.unavailable);
    profile.cargo = tool_version("cargo", &["--version"], &mut profile.unavailable);
    profile.node = tool_version("node", &["--version"], &mut profile.unavailable);

    // One PowerShell call, naming every field explicitly. `Win32_ComputerSystem`
    // also carries `Name` and `UserName`; neither is selected, so neither is
    // ever read into this process.
    let script = "\
$ErrorActionPreference='SilentlyContinue';\
$os=Get-CimInstance Win32_OperatingSystem;\
Write-Output ('os=' + $os.Caption);\
Write-Output ('osVersion=' + $os.Version);\
Write-Output ('ram=' + (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory);\
$cpu=@(Get-CimInstance Win32_Processor)[0];\
Write-Output ('cpu=' + $cpu.Name);\
Write-Output ('cores=' + $cpu.NumberOfCores);\
Write-Output ('logical=' + $cpu.NumberOfLogicalProcessors);\
foreach($g in Get-CimInstance Win32_VideoController){Write-Output ('gpu=' + $g.Name)};\
foreach($d in Get-PhysicalDisk){Write-Output ('media=' + $d.MediaType)}";

    match Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
    {
        Ok(output) if output.status.success() => {
            let text = String::from_utf8_lossy(&output.stdout).into_owned();
            let mut media = Vec::new();
            for line in text.lines() {
                let Some((key, value)) = line.split_once('=') else {
                    continue;
                };
                let value = sanitise(value);
                match key.trim() {
                    "os" => profile.os = value,
                    "osVersion" => profile.os_version = value,
                    "ram" => profile.ram_bytes = value.parse().unwrap_or_default(),
                    "cpu" => profile.cpu = value,
                    "cores" => profile.physical_cores = value.parse().unwrap_or_default(),
                    "logical" => profile.logical_cores = value.parse().unwrap_or_default(),
                    "gpu" if !value.is_empty() => profile.gpus.push(value),
                    "media" if !value.is_empty() => media.push(value),
                    _ => {}
                }
            }
            media.sort();
            media.dedup();
            profile.disk_media = media.join(", ");
            if profile.disk_media.is_empty() {
                profile
                    .unavailable
                    .push("disk media type not reported by Get-PhysicalDisk".to_string());
            }
        }
        Ok(output) => profile.unavailable.push(format!(
            "powershell profile query exited with {:?}",
            output.status.code()
        )),
        Err(error) => profile
            .unavailable
            .push(format!("powershell unavailable: {error}")),
    }

    profile
}

fn tool_version(program: &str, args: &[&str], unavailable: &mut Vec<String>) -> String {
    match Command::new(program).args(args).output() {
        Ok(output) if output.status.success() => {
            sanitise(&String::from_utf8_lossy(&output.stdout))
        }
        _ => {
            unavailable.push(format!("{program} version not readable"));
            String::new()
        }
    }
}

/// Working set of **this** process, in bytes — the memory method `SS2`
/// declares. Uses `Get-Process` on the current pid; no new dependency, and no
/// value read for any other process.
pub fn working_set_bytes() -> Option<u64> {
    let pid = std::process::id();
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            &format!("(Get-Process -Id {pid}).WorkingSet64"),
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout).trim().parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_user_name_never_survives_sanitising() {
        let Ok(user) = std::env::var("USERNAME") else {
            return; // Nothing to redact on a host without the variable.
        };
        if user.len() < 3 {
            return;
        }
        let dirty = format!("Disque de {user} sur la machine");
        let clean = sanitise(&dirty);
        assert!(!clean.contains(&user), "sanitise left the user name in place");
        assert!(clean.contains("<redacted>"));
    }

    #[test]
    fn any_user_path_is_dropped_wholesale() {
        assert_eq!(sanitise("C:\\Users\\someone\\Documents"), "<path redacted>");
        assert_eq!(sanitise("D:/Users/other/dev"), "<path redacted>");
        assert_eq!(sanitise("  NVMe SSD  "), "NVMe SSD");
    }

    #[test]
    fn a_powerful_bench_can_never_classify_as_the_acceptance_target() {
        let workstation = BenchProfile {
            ram_bytes: 64 * 1024 * 1024 * 1024,
            logical_cores: 32,
            gpus: vec!["NVIDIA GeForce RTX 4090".to_string()],
            ..Default::default()
        };
        assert_eq!(
            workstation.classify(),
            BenchClass::DevelopmentBenchNotAcceptance
        );

        let modest = BenchProfile {
            ram_bytes: 8 * 1024 * 1024 * 1024,
            logical_cores: 8,
            gpus: vec!["Intel(R) UHD Graphics".to_string()],
            ..Default::default()
        };
        assert_eq!(modest.classify(), BenchClass::TargetClass);

        // One powerful axis is enough to disqualify the acceptance class.
        let mixed = BenchProfile {
            ram_bytes: 8 * 1024 * 1024 * 1024,
            logical_cores: 8,
            gpus: vec!["Intel(R) UHD Graphics".to_string(), "NVIDIA RTX A2000".to_string()],
            ..Default::default()
        };
        assert_eq!(mixed.classify(), BenchClass::DevelopmentBenchNotAcceptance);
    }

    #[test]
    fn an_unreadable_field_is_declared_not_invented() {
        let profile = BenchProfile {
            unavailable: vec!["node version not readable".to_string()],
            ..Default::default()
        };
        assert_eq!(profile.node, "");
        assert_eq!(profile.to_json()["unavailable"][0], "node version not readable");
    }

    #[test]
    fn the_captured_profile_carries_no_identifier() {
        let profile = capture();
        let text = serde_json::to_string(&profile.to_json()).expect("json");
        let lowered = text.to_ascii_lowercase();
        assert!(!lowered.contains("\\users\\") && !lowered.contains("/users/"));
        if let Ok(user) = std::env::var("USERNAME") {
            if user.len() >= 3 {
                assert!(!text.contains(&user), "the profile leaked the user name");
            }
        }
        if let Ok(host) = std::env::var("COMPUTERNAME") {
            if host.len() >= 3 {
                assert!(!text.contains(&host), "the profile leaked the host name");
            }
        }
    }
}
