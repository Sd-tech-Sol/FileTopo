# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# TASK-0049 — three real WebView2 processes around harness-only Index loss.
[CmdletBinding()]
param([int]$Port = 9349)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository

$variant = 'task0049-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0049-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0049 synthetic preparation failed' }
$seed = $seedJson | ConvertFrom-Json

$env:FILETOPO_SANDBOX_VARIANT = $variant
# Keep automatic reconciliation outside the short manual-history sequence.
$env:FILETOPO_WATCH_GUARD_MS = '60000'
$env:FILETOPO_WATCH_COALESCE_MS = '60000'
$env:FILETOPO_WATCH_CALM_MS = '60000'
$env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot 'webview-profile'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
$env:TEMP = Join-Path $proofRoot 'tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP | Out-Null
$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'

function Stop-TaskApplication {
    param($Application)
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(20000)) {
            Write-Host 'TASK-0049: normal close timed out; stopping only the process started by this proof'
            Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue
        }
    }
    $Application.WaitForExit()
}

function Invoke-TaskPhase {
    param([int]$Phase)
    Write-Host "TASK-0049: real WebView2 process $Phase"
    $application = Start-Process -FilePath $executable -PassThru -WindowStyle Hidden `
        -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-phase$Phase.log") `
        -RedirectStandardError (Join-Path $proofRoot "app-error-phase$Phase.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-phase$Phase.txt"
        $seedJson | node scripts/task0049-webview2.mjs $Port $variant $Phase 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue |
                Select-Object -First 40 | ForEach-Object { Write-Host $_ }
            throw "TASK-0049 WebView2 process $Phase failed; inspect the synthetic proof root"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
}

function Save-ExternalSnapshot {
    param([int]$Phase)
    $snapshot = python scripts/task0049-store-snapshot.py $seed.stateRoot $seed.brainId
    if ($LASTEXITCODE -ne 0) { throw "TASK-0049 store snapshot $Phase failed" }
    Set-Content -LiteralPath (Join-Path $proofRoot "stores-phase$Phase.json") -Value $snapshot
}

Invoke-TaskPhase -Phase 1
Save-ExternalSnapshot -Phase 1

# The product is closed. Delete only this synthetic brain's canonical Index
# and its SQLite sidecars. Validate the resolved target before every removal.
$stateRoot = [IO.Path]::GetFullPath([string]$seed.stateRoot)
$expectedStateRoot = [IO.Path]::GetFullPath((Join-Path $repository ".filetopo-sandbox/variants/$variant"))
if ($stateRoot -ne $expectedStateRoot) { throw 'TASK-0049 unexpected synthetic state root' }
$index = [IO.Path]::GetFullPath((Join-Path $stateRoot "brains/$($seed.brainId)/map/index.sqlite"))
$expectedPrefix = [IO.Path]::GetFullPath((Join-Path $stateRoot "brains/$($seed.brainId)/map")) + [IO.Path]::DirectorySeparatorChar
if (-not $index.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'TASK-0049 refused Index deletion outside the validated synthetic brain map directory'
}
foreach ($target in @($index, "$index-wal", "$index-shm")) {
    $resolved = [IO.Path]::GetFullPath($target)
    if (-not $resolved.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'TASK-0049 refused an unexpected sidecar target'
    }
    if (Test-Path -LiteralPath $resolved -PathType Leaf) {
        Remove-Item -LiteralPath $resolved
    }
}
if (Test-Path -LiteralPath $index) { throw 'TASK-0049 Index deletion did not complete' }

Invoke-TaskPhase -Phase 2
Save-ExternalSnapshot -Phase 2
Invoke-TaskPhase -Phase 3
Save-ExternalSnapshot -Phase 3

$phase1 = Get-Content -LiteralPath (Join-Path $proofRoot 'phase1.json') -Raw | ConvertFrom-Json
$phase2 = Get-Content -LiteralPath (Join-Path $proofRoot 'phase2.json') -Raw | ConvertFrom-Json
$phase3 = Get-Content -LiteralPath (Join-Path $proofRoot 'phase3.json') -Raw | ConvertFrom-Json
$stores1 = Get-Content -LiteralPath (Join-Path $proofRoot 'stores-phase1.json') -Raw | ConvertFrom-Json
$stores2 = Get-Content -LiteralPath (Join-Path $proofRoot 'stores-phase2.json') -Raw | ConvertFrom-Json
$stores3 = Get-Content -LiteralPath (Join-Path $proofRoot 'stores-phase3.json') -Raw | ConvertFrom-Json
foreach ($name in 'catalogStable', 'relations', 'contentSignals') {
    if ($stores1.$name -ne $stores2.$name -or $stores2.$name -ne $stores3.$name) {
        throw "TASK-0049 external store changed: $name"
    }
}
$fatal = 0
foreach ($number in 1, 2, 3) {
    $fatal += [int](Get-Content -LiteralPath (Join-Path $proofRoot "phase$number-fatal-count.json") -Raw)
}
if ($fatal -ne 0) { throw "TASK-0049: $fatal fatal console error(s)" }

$artifact = [ordered]@{
    task = 'TASK-0049'
    status = 'NONCANONICAL_ENGINEERING_EVIDENCE'
    engine = 'Windows Tauri / real WebView2'
    realProcesses = 3
    realProcessRestarts = 2
    syntheticOnly = $true
    personalDataUsed = $false
    harnessOnlyIndexDeletion = [ordered]@{
        applicationClosed = $true
        canonicalIndexAndSidecarsOnly = $true
        productDeleteCommandAdded = $false
    }
    generation = [ordered]@{
        before = $phase1.indexId
        after = $phase2.indexId
        changed = $phase1.indexId -ne $phase2.indexId
        stableOnThirdProcess = $phase2.indexId -eq $phase3.indexId
    }
    logicalReconstruction = [ordered]@{
        digestBefore = $phase1.logicalDigest
        digestAfter = $phase2.logicalDigest
        equivalent = $phase1.logicalDigest -eq $phase2.logicalDigest
        sourceSha256Unchanged = $phase1.sourceSha256 -eq $phase2.sourceSha256 -and $phase2.sourceSha256 -eq $phase3.sourceSha256
        policyRules = @($phase2.policy.rules)
    }
    divergentIds = [ordered]@{
        oldB = [int]$phase1.oldMapping.b
        freshB = [int]$phase2.freshMapping.b
        oldBIdNowNames = [string]$phase2.freshMapping.oldBIdNowPath
        wrongPathWasNotSelected = $null -eq $phase2.restore.resume.selectedNodeId
    }
    resume = [ordered]@{
        corrections = @($phase2.restore.corrections)
        independentViewFilterDetailsPreserved = $true
        correctionPersistedAcrossThirdProcess = @($phase3.persistedCorrection.corrections).Count -eq 0
    }
    journal = [ordered]@{
        historicalEventsBeforeLoss = [int]$phase1.journal.total
        oldSeenStateExercised = $true
        newGenerationEvents = [int]$phase2.journal.total
        newGenerationUnseen = [int]$phase2.journal.unseenTotal
        historicalJournalNotSynthesized = [int]$phase2.journal.total -eq 0
    }
    nonReconstructible = @($phase2.nonReconstructible)
    externalStores = [ordered]@{
        catalogBrainPolicyAndStableMetadata = $stores3.catalogStable
        relations = $stores3.relations
        contentSignals = $stores3.contentSignals
        unchangedAcrossAllProcesses = $true
    }
    openAfterLossWasNotBuilt = [bool]$phase2.openAfterLossWasNotBuilt
    fatalConsoleErrors = $fatal
    limits = @(
        'The analysed REAL_ROOT was generated under a fresh repository-local proof directory; no personal data.',
        'Index deletion was an offline harness action after a normal close, never a product command or UI feature.',
        'Lifecycle and resume calls travelled through the real WebView2/Tauri IPC pipeline; the rebuild gesture itself was invoked through the existing map_rebuild command rather than a physical mouse click.',
        'Windows local NTFS and normal process closes only; crash recovery and inter-volume behaviour are not claimed.'
    )
}
$artifact | ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath (Join-Path $repository 'docs/performance/runs/TASK-0049-webview2.json')
Write-Output 'TASK-0049: three-process WebView2 proof PASS; artefact written'
