<#
.SYNOPSIS
    Replays the J12 INTRA-BRAIN relations scenario against the real host, once,
    with a real keystroke — the current TASK-0024 regression destination.

.DESCRIPTION
    J12 is a criterion of TASK-0017: the relations panel of ONE brain, its
    counts, its provenance, and a real Windows keystroke activating an entry.
    TASK-0020 touches that panel — a second one now sits beside it — so J12 is
    replayed to show the first was not disturbed.

    The criterion is TASK-0017's; the artefact belongs to TASK-0024, and its
    name says so:

        TASK-0026-J12-intrabrain-relations-regression-webview2.json

    TASK-0017's own J12 evidence, and TASK-0019's replay of it, are BOTH
    protected: this script deletes only its own previous output, and the guard
    in scripts/protected-run-artifacts.ps1 refuses anything else.

    One pass, no restart: J12 proves nothing about persistence across a
    relaunch, and pretending otherwise would be inventing a claim.

    A FRESH sandbox namespace per invocation, so the scenario's approval is a
    real act rather than a state a previous run already reached. Nothing is
    deleted, here or anywhere.

.PARAMETER Executable
    The FileTopo binary. Defaults to the DEBUG build in the checkout — only a
    debug build can write a run artefact.

.PARAMETER LogDirectory
    Where the run log goes. Defaults to the system temporary directory.

.PARAMETER TimeoutSeconds
    How long the pass may take before this script gives up and says so.
#>
[CmdletBinding()]
param(
    [string]$Executable,
    [string]$LogDirectory,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'

$repository = Split-Path -Parent $PSScriptRoot
if (-not $LogDirectory) {
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0022-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force
if (-not $Executable) {
    $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) {
    throw "binaire introuvable: $Executable — construire d'abord: pnpm tauri build --debug --no-bundle"
}

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'

. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')

$variant = 'task0022-j12-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                     ([guid]::NewGuid().ToString('N').Substring(0, 6))

$log = Join-Path $LogDirectory "filetopo-task0022-j12-$variant.log"

$artifact = Join-Path $runs 'TASK-0026-J12-intrabrain-relations-regression-webview2.json'
$abandoned = Join-Path $runs 'TASK-0026-J12-intrabrain-relations-regression-webview2-abandon.json'
foreach ($stale in @($artifact, $abandoned)) {
    Assert-NotProtectedRunArtifact -Path $stale
    if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale -Force }
}

Write-Host "J12: bac a sable neuf, <depot>/.filetopo-sandbox/variants/$variant"
$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:FILETOPO_AUTO_RELATIONS = '1'
try {
    Write-Host "J12: demarrage, journal $log"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"

    $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
        -ArgumentList @('-NoProfile', '-File', $watcher,
                        '-LogPath', $log,
                        '-TimeoutSeconds', "$TimeoutSeconds")

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $produced = $false
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $artifact) { $produced = $true; break }
        if (Test-Path -LiteralPath $abandoned) { break }
        Start-Sleep -Milliseconds 500
    }

    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if (-not $keys.HasExited) { Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue }

    if (-not $produced) {
        throw 'J12: aucun artefact produit — rien n est prouve, et cela se publie tel quel'
    }
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_RELATIONS -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

Write-Output 'J12: artefact de regression ecrit sous docs/performance/runs/'
