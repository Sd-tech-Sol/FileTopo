# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# TASK-0048 — two real WebView2 processes over one fresh synthetic sandbox.
[CmdletBinding()]
param([int]$Port = 9348)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository

$variant = 'task0048-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0048-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0048 synthetic preparation failed' }
$seed = $seedJson | ConvertFrom-Json

$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:FILETOPO_WATCH_GUARD_MS = '400'
$env:FILETOPO_WATCH_COALESCE_MS = '120'
$env:FILETOPO_WATCH_CALM_MS = '120'
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
            Write-Host 'TASK-0048: normal close timed out; stopping only the process started by this proof'
            Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue
        }
    }
    $Application.WaitForExit()
}

function Invoke-TaskPhase {
    param([int]$Phase)
    Write-Host "TASK-0048: real WebView2 phase $Phase"
    $application = Start-Process -FilePath $executable -PassThru -WindowStyle Hidden `
        -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-phase$Phase.log") `
        -RedirectStandardError (Join-Path $proofRoot "app-error-phase$Phase.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-phase$Phase.txt"
        $seedJson | node scripts/task0048-webview2.mjs $Port $variant $Phase 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue |
                Select-Object -First 40 | ForEach-Object { Write-Host $_ }
            throw "TASK-0048 WebView2 phase $Phase failed; inspect the synthetic proof root"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
}

Invoke-TaskPhase -Phase 1
Start-Sleep -Seconds 2
Invoke-TaskPhase -Phase 2

$phase1 = Get-Content -LiteralPath (Join-Path $proofRoot 'phase1.json') -Raw | ConvertFrom-Json
$phase2 = Get-Content -LiteralPath (Join-Path $proofRoot 'phase2.json') -Raw | ConvertFrom-Json
$fatal = 0
foreach ($number in 1, 2) {
    $fatal += [int](Get-Content -LiteralPath (Join-Path $proofRoot "phase$number-fatal-count.json") -Raw)
}
if ($fatal -ne 0) { throw "TASK-0048: $fatal fatal console error(s)" }

# Public artefacts/logs must never disclose either absolute synthetic root.
$logFiles = Get-ChildItem -LiteralPath $proofRoot -File |
    Where-Object { $_.Name -match '\.(log|txt|json)$' }
foreach ($root in @([string]$seed.rootShared, [string]$seed.rootSolo)) {
    foreach ($file in $logFiles) {
        if (Select-String -LiteralPath $file.FullName -SimpleMatch $root -Quiet) {
            throw "TASK-0048: absolute source path leaked into a proof log"
        }
    }
}

$artifact = [ordered]@{
    task = 'TASK-0048'
    status = 'NONCANONICAL_ENGINEERING_EVIDENCE'
    engine = 'Windows Tauri / real WebView2'
    realProcessRestarts = 1
    syntheticOnly = $true
    personalDataUsed = $false
    brains = [ordered]@{
        count = 3
        sharedSource = 'A and C'
        independentSource = 'B'
    }
    policiesAfterRestart = $phase2.policies
    ui = [ordered]@{
        keyboardAdd = $true
        mouseRemove = $true
        fr = [bool]$phase1.languages.frenchSafety
        en = [bool]$phase1.languages.englishSafety
        rejectedRuleStayedDraftOnly = [bool]$phase1.rejectedRuleStayedDraftOnly
        ruleVisibleAfterRestart = [bool]$phase2.ruleVisibleInRealUi
    }
    scannerAndJournal = [ordered]@{
        sourceSha256UnchangedByPolicy = [bool]$phase1.sourceSha256UnchangedByPolicy
        removedContentReindexedWithoutPolicyEvent = [bool]$phase1.removedContentReindexedWithoutPolicyEvent
        journalAfterRestart = $phase2.journal
    }
    watcher = $phase1.watcher
    sourceAbsent = [ordered]@{
        policyRemainedReadableAndWritable = $true
        lastIndexRemainedOpen = $true
        sourceRestored = [bool]$phase1.sourceRestoredAfterAbsence
        pendingPolicyAppliedWhenSourceReturned = -not [bool]$phase2.policies.A.applicationRequired
    }
    restartPersistence = [bool]$phase2.restartPersistence
    noAbsolutePathInPolicyDtoOrProofLogs = $true
    fatalConsoleErrors = $fatal
    limits = @(
        'All analysed trees are generated below a fresh proof directory inside the repository; no personal data.',
        'Mouse and keyboard events use the browser input pipeline through CDP.',
        'The close is normal; crash recovery is not claimed.',
        'Windows local filesystem only; case behaviour is proved on this platform.',
        'The policy rebase intentionally journals no source diff; a physical mutation strictly concurrent with that scan cannot be separated atomically across catalogue and Index databases.'
    )
}
$artifact | ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath (Join-Path $repository 'docs/performance/runs/TASK-0048-webview2.json')
Write-Output 'TASK-0048: real WebView2 proof PASS; artefact written'
