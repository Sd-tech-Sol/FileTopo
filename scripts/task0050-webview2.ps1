# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# Opens the real visible WebView2 host against disposable synthetic roots only.
#
# TASK-0050 §Q/ACTION-0088: the proof is TWO cells run as two separate,
# disposable real hosts.
#   Cell A — this task's own harness (scripts/task0050-webview2.mjs), 21 of
#            the 23 reachable keys, reproducibly.
#   Cell B — the existing `J12` scenario (src/map/relationScenario.ts),
#            replayed unmodified via scripts/j12-run-real-host.ps1 on the
#            current HEAD, for the two remaining keys: `intra-suggestion`,
#            `intra-approved`.
# scripts/task0050-combine-webview2.mjs unions both and is the ONLY step that
# writes docs/performance/runs/TASK-0050-webview2.json.
[CmdletBinding()]
param([int]$Port = 9350, [string]$HostLanguage = 'fr-CA', [int]$CellBTimeoutSeconds = 900)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
$head = (git rev-parse HEAD).Trim()
$variant = 'task0050-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0050-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0050 synthetic proof preparation failed' }

$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:FILETOPO_WATCH_GUARD_MS = '500'
$env:FILETOPO_WATCH_COALESCE_MS = '150'
$env:FILETOPO_WATCH_CALM_MS = '150'
$env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot 'webview-profile'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
$env:TEMP = Join-Path $proofRoot 'tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP | Out-Null

$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
$cellAArtifact = Join-Path $proofRoot 'cellA.json'
$application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
    -RedirectStandardOutput (Join-Path $proofRoot 'app.log') `
    -RedirectStandardError (Join-Path $proofRoot 'app-error.log')
try {
    $errorFile = Join-Path $proofRoot 'harness-error.txt'
    $seedJson | node scripts/task0050-webview2.mjs $Port $variant $cellAArtifact 2> $errorFile
    if ($LASTEXITCODE -ne 0) {
        Get-Content -LiteralPath $errorFile -ErrorAction SilentlyContinue | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
        throw "TASK-0050 cellA WebView2 proof failed; inspect $proofRoot"
    }
} finally {
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(20000)) {
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
}
Write-Output "TASK-0050: cellA real WebView2 proof PASS; $cellAArtifact"

# Cell B — reuse `J12` exactly as published, unattended, in its OWN fresh
# sandbox/process. Its own env vars (FILETOPO_AUTO_RELATIONS,
# FILETOPO_SANDBOX_VARIANT) are scoped and cleaned by that script itself.
$cellBArtifact = Join-Path $repository 'docs/performance/runs/TASK-0026-J12-intrabrain-relations-regression-webview2.json'
& (Join-Path $PSScriptRoot 'j12-run-real-host.ps1') -Executable $executable -TimeoutSeconds $CellBTimeoutSeconds
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'TASK-0050: cellB (J12 replay) failed' }
if (-not (Test-Path -LiteralPath $cellBArtifact)) { throw "TASK-0050: cellB artifact not found at $cellBArtifact" }
Write-Output "TASK-0050: cellB J12 replay PASS; $cellBArtifact"

$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0050-webview2.json'
node scripts/task0050-combine-webview2.mjs $cellAArtifact $cellBArtifact $finalArtifact $head
if ($LASTEXITCODE -ne 0) { throw 'TASK-0050: combiner (union assertions) failed' }
Write-Output "TASK-0050: combined real WebView2 proof PASS; artifact $finalArtifact"
