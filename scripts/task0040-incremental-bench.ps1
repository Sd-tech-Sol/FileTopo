<#
.SYNOPSIS
    TASK-0040 — mesure F-031 du noyau d'application incrémentale.

.DESCRIPTION
    La campagne vit dans le harnais de test `src-tauri/src/incremental_bench.rs`,
    marquee `#[ignore]` : un `cargo test` ordinaire ne la lance jamais. Ce script
    la lance deliberement et laisse un artefact JSON dans docs/performance/runs.

    Ce qui est chronometre est `Index::apply_update_batch` — la fonction du
    produit — sur un index SQLite WAL sur disque, a 1 000 / 10 000 / 100 000
    noeuds (10 changements) et 100 000 noeuds (1 000 changements), sept
    executions par cas, aucune ecartee. Le critere de rejet de
    BASELINE_TARGETS §3.3 est le rapport mediane(100k, 10) / mediane(1k, 10) <= 2.

    Le harnais n'ecrit que dans le depot : les index de banc sont sous
    `.filetopo-sandbox/task0040` (ignore par Git) et supprimes ensuite. Aucune
    donnee reelle n'est lue.

.PARAMETER Profile
    dev  : profil de test par defaut (SQLite compile sans optimisation).
    opt3 : meme profil de test avec opt-level=3, dans `src-tauri/target/opt`
           (ignore par Git), pour separer le cout du code du cout du profil.
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'opt3')]
    [string]$Profile = 'dev',
    [switch]$KeepSandbox
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$crate = Join-Path $repository 'src-tauri'

$env:TASK0040_PROFILE_TAG = $Profile
if ($KeepSandbox) { $env:TASK0040_KEEP_SANDBOX = '1' }
if ($Profile -eq 'opt3') {
    # La suite de tests du crate exige `debug_assertions` : on optimise le
    # profil de developpement sans les retirer, dans un dossier de build separe.
    $env:CARGO_PROFILE_DEV_OPT_LEVEL = '3'
    $env:CARGO_TARGET_DIR = Join-Path $crate 'target/opt'
}

try {
    Push-Location $crate
    try {
        & cargo test --offline --lib f031_incremental_apply_scaling -- --ignored --nocapture --test-threads=1
        if ($LASTEXITCODE -ne 0) { throw 'campagne F-031 en echec' }
    }
    finally { Pop-Location }
}
finally {
    Remove-Item Env:\TASK0040_PROFILE_TAG -ErrorAction SilentlyContinue
    Remove-Item Env:\TASK0040_KEEP_SANDBOX -ErrorAction SilentlyContinue
    Remove-Item Env:\CARGO_PROFILE_DEV_OPT_LEVEL -ErrorAction SilentlyContinue
    Remove-Item Env:\CARGO_TARGET_DIR -ErrorAction SilentlyContinue
}

$path = Join-Path $repository "docs/performance/runs/TASK-0040-incremental-apply-$Profile.json"
if (Test-Path -LiteralPath $path) {
    Write-Output ("ecrit: {0} ({1} octets)" -f (Split-Path -Leaf $path), (Get-Item $path).Length)
}
