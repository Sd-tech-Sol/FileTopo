<#
.SYNOPSIS
    TASK-0028 — runs the synthetic scale campaigns, SS1 to SS6 and SS9.

.DESCRIPTION
    The campaigns live in the test-only harness `src-tauri/src/scale_spike`,
    marked `#[ignore]` so an ordinary `cargo test` never starts them. This
    script starts them deliberately, one at a time, and leaves the four
    artifacts in docs/performance/runs.

    It builds nothing the product ships: the harness is compiled by
    `cargo test` only, exposes no command, and adds no route.

    The bench source and its SQLite index live side by side under
    `.filetopo-sandbox/task0028`, inside the repository and ignored by Git
    since TASK-0016. Nothing is written outside the repository, no real data is
    read, and no content hash is computed.

    SS7 and SS8 need a real WebView2 process and are run separately, by
    `task0028-ss7-bounded-view-webview2.ps1`.

.PARAMETER Only
    Run a single campaign: 10k, 100k or 1m. Default runs all three.

.PARAMETER KeepSandbox
    Leave the generated bench directories in place for inspection. They are
    removed by default, because 100 000 physical files are not worth keeping.
#>
[CmdletBinding()]
param(
    [ValidateSet('all', '10k', '100k', '1m')]
    [string]$Only = 'all',
    [switch]$KeepSandbox
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$crate = Join-Path $repository 'src-tauri'

# The build profile is part of the measurement, so it is stated rather than
# assumed. The crate's test suite only compiles under `debug_assertions`
# (several test helpers are gated on it), so these are debug-profile numbers
# and the artifacts say so in `buildProfile`.
Write-Host 'TASK-0028: campagnes en profil debug (la suite de tests du crate ne compile pas en release).'

$campaigns = switch ($Only) {
    '10k'  { @('scale_spike::campaigns::ss_scan_scale_10k') }
    '100k' { @('scale_spike::campaigns::ss_scan_scale_100k') }
    '1m'   { @('scale_spike::campaigns::ss_index_scale_1m') }
    default {
        @(
            'scale_spike::campaigns::ss_scan_scale_10k',
            'scale_spike::campaigns::ss_scan_scale_100k',
            'scale_spike::campaigns::ss_index_scale_1m'
        )
    }
}

if ($KeepSandbox) { $env:TASK0028_KEEP_SANDBOX = '1' }
try {
    foreach ($campaign in $campaigns) {
        Write-Host "--- $campaign ---"
        Push-Location $crate
        try {
            & cargo test --lib $campaign -- --ignored --nocapture --test-threads=1
            if ($LASTEXITCODE -ne 0) { throw "campagne en echec: $campaign" }
        }
        finally { Pop-Location }
    }
}
finally {
    Remove-Item Env:\TASK0028_KEEP_SANDBOX -ErrorAction SilentlyContinue
}

$runs = Join-Path $repository 'docs/performance/runs'
foreach ($name in @('TASK-0028-SS-10k.json', 'TASK-0028-SS-100k.json', 'TASK-0028-SS-1m-index.json')) {
    $path = Join-Path $runs $name
    if (Test-Path -LiteralPath $path) {
        Write-Output ("ecrit: {0} ({1} octets)" -f $name, (Get-Item $path).Length)
    }
}
