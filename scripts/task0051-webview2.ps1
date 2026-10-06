# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# Opens the real visible WebView2 host against disposable synthetic roots only.
#
# TASK-0051 (DEC-0049 / P-04): revocation of APPROVED relations, intra and
# inter-brain. TWO real processes around a real restart: phase 1 performs the
# gestures with real key events, phase 2 reads the stores after the restart,
# rebuilds both Indexes and reruns the relations engine. The artifact is
# published only when both phases pass.
[CmdletBinding()]
param([int]$Port = 9351, [string]$HostLanguage = 'fr-CA')

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
$head = (git rev-parse HEAD).Trim()
$variant = 'task0051-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0051-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0051 synthetic proof preparation failed' }
$seed = $seedJson | ConvertFrom-Json
$stateRoot = Join-Path $repository ".filetopo-sandbox/variants/$variant"

$env:FILETOPO_SANDBOX_VARIANT = $variant
# Automatic reconciliation stays out of the way of the gestures under proof.
$env:FILETOPO_WATCH_GUARD_MS = '60000'
$env:FILETOPO_WATCH_COALESCE_MS = '60000'
$env:FILETOPO_WATCH_CALM_MS = '60000'
$env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot 'webview-profile'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
$env:TEMP = Join-Path $proofRoot 'tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP | Out-Null
$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'

function Stop-TaskApplication {
    param($Application)
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(20000)) {
            Write-Host 'TASK-0051: normal close timed out; stopping only the process started by this proof'
            Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue
        }
    }
    $Application.WaitForExit()
}

function Invoke-TaskPhase {
    param([int]$Phase)
    Write-Host "TASK-0051: real WebView2 process $Phase"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-phase$Phase.log") `
        -RedirectStandardError (Join-Path $proofRoot "app-error-phase$Phase.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-phase$Phase.txt"
        $seedJson | node scripts/task0051-webview2.mjs $Port $variant $Phase $proofRoot $head 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue |
                Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0051 WebView2 process $Phase failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
}

function Save-ExternalSnapshot {
    param([int]$Phase)
    # Read with the product closed, by a process that shares nothing with it.
    $snapshot = python scripts/task0051-store-snapshot.py $stateRoot $seed.rootAlix
    if ($LASTEXITCODE -ne 0) { throw "TASK-0051 external store snapshot $Phase failed" }
    Set-Content -LiteralPath (Join-Path $proofRoot "stores-phase$Phase.json") -Value $snapshot
}

Invoke-TaskPhase -Phase 1
Save-ExternalSnapshot -Phase 1
Invoke-TaskPhase -Phase 2
Save-ExternalSnapshot -Phase 2

$phase2 = Get-Content -LiteralPath (Join-Path $proofRoot 'phase2.json') -Raw | ConvertFrom-Json
$stores1 = Get-Content -LiteralPath (Join-Path $proofRoot 'stores-phase1.json') -Raw | ConvertFrom-Json
$stores2 = Get-Content -LiteralPath (Join-Path $proofRoot 'stores-phase2.json') -Raw | ConvertFrom-Json

# The external reader agrees with what the product reported after phase 1.
if ($stores1.alphaRelations.suggestionStates.'S-005' -ne 'pending') { throw 'external reader: Alpha S-005 is not pending after phase 1' }
if ($stores1.commonRelations.suggestionStates.'XB-S02' -ne 'pending') { throw 'external reader: XB-S02 is not pending after phase 1' }
if ($stores1.gammaRelations.suggestionStates.'S-005' -ne 'approved') { throw 'external reader: Gamma S-005 lost its own approval' }
if ($stores1.alphaRelations.approvedKeys -contains 'S-005') { throw 'external reader: an approved S-005 row exists in Alpha after phase 1' }
if ($stores1.commonRelations.approvedKeys -contains 'XB-S02') { throw 'external reader: an approved XB-S02 row exists after phase 1' }
# Phase 2 only re-approved explicitly, at its very end; Gamma never moved.
if ($stores1.gammaRelations.digest -ne $stores2.gammaRelations.digest) { throw 'external reader: Gamma store changed across the restart phase' }
if ($stores1.syntheticFixtures -ne $stores2.syntheticFixtures) { throw 'external reader: synthetic source changed' }
if (($stores1.realRoots -join ',') -ne ($stores2.realRoots -join ',')) { throw 'external reader: real-root source changed' }

$artifact = [ordered]@{
    task = 'TASK-0051'
    headTested = $head
    strategy = 'DEC-0049: two real WebView2 processes around a real restart; real key events (Tab, Enter, Space)'
    phase1 = (Get-Content -LiteralPath (Join-Path $proofRoot 'phase1.json') -Raw | ConvertFrom-Json)
    phase2 = $phase2
    externalStoresAfterPhase1 = $stores1
    externalStoresAfterPhase2 = $stores2
    notTested = @(
        'Beta (deep) was not built: no relation of this proof touches it.',
        'A restart while a revocation is in flight (kill -9) is not tested; atomicity is proved by the store-level rollback test.',
        'P-19 as a whole stays PARTIELLE: only the persistence of a revocation is claimed here.'
    )
}
$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0051-webview2.json'
$text = $artifact | ConvertTo-Json -Depth 40
if ($text.Contains($seed.rootAlix)) { throw 'absolute proof path leaked into the artifact' }
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8
Write-Output "TASK-0051: real WebView2 proof PASS; artifact $finalArtifact"
