<#
.SYNOPSIS
    TASK-0029 — runs the bounded hierarchy paging campaigns, SQF1 to SQF5.

.DESCRIPTION
    The campaigns live in the test-only harness `src-tauri/src/scale_query`,
    marked `#[ignore]` so an ordinary `cargo test` never starts them. This
    script starts them deliberately, in order, and leaves the two artifacts in
    docs/performance/runs.

    It builds nothing the product ships: the harness is compiled by
    `cargo test` only, exposes no command, and adds no route.

    Order matters. The 100k campaign is the reference; the 1M campaign reads
    its artifact to compute the scaling criterion — p95 at 1M no greater than
    five times p95 at 100k, at a comparable position. Running 1M alone records
    `comparisonAvailable: false` rather than inventing a baseline.

    Both campaigns are INDEX-SCALE: rows are built on the current FileTopo
    schema from the deterministic TASK-0028 plan, and no physical file is
    created. The bench index lives under `.filetopo-sandbox/task0029`, inside
    the repository and ignored by Git since TASK-0016. Nothing is written
    outside the repository, no real data is read, and no content hash is
    computed.

    The four TASK-0028 artifacts are never read for their numbers and never
    rewritten: the harness refuses to write any name that is not its own.

.PARAMETER Only
    Run a single campaign: 100k or 1m. Default runs both, in order.

.PARAMETER KeepSandbox
    Leave the generated bench databases in place for inspection. They are
    removed by default.
#>
[CmdletBinding()]
param(
    [ValidateSet('all', '100k', '1m')]
    [string]$Only = 'all',
    [switch]$KeepSandbox
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$crate = Join-Path $repository 'src-tauri'

# The build profile is part of the measurement, so it is stated rather than
# assumed. The crate's test suite only compiles under `debug_assertions`, so
# these are debug-profile numbers and the artifacts say so in `buildProfile`.
Write-Host 'TASK-0029: campagnes en profil debug (la suite de tests du crate ne compile pas en release).'

$campaigns = switch ($Only) {
    '100k' { @('scale_query::campaigns::sqf_index_scale_100k') }
    '1m'   { @('scale_query::campaigns::sqf_index_scale_1m') }
    default {
        @(
            'scale_query::campaigns::sqf_index_scale_100k',
            'scale_query::campaigns::sqf_index_scale_1m'
        )
    }
}

if ($KeepSandbox) { $env:TASK0029_KEEP_SANDBOX = '1' }
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
    Remove-Item Env:\TASK0029_KEEP_SANDBOX -ErrorAction SilentlyContinue
}

$runs = Join-Path $repository 'docs/performance/runs'
foreach ($name in @('TASK-0029-SQF-100k.json', 'TASK-0029-SQF-1m-index.json')) {
    $path = Join-Path $runs $name
    if (Test-Path -LiteralPath $path) {
        Write-Output ("ecrit: {0} ({1} octets)" -f $name, (Get-Item $path).Length)
    }
}
