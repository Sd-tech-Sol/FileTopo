# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# Opens the real visible WebView2 host against disposable synthetic roots only.
#
# TASK-0053 (DEC-0051 / F-052 / P-19): the global workspace and its preferences. FOUR real
# processes of the same executable around THREE real closes, on one sandbox variant:
#
#   phase 1  configure everything through real gestures; normal close
#   phase 2  restart, compare every value, exit the branch focus, change values; normal close
#   phase 3  restart, confirm, rebuild the brain that carries the persisted node references; normal close
#   phase 4  restart: the corrections are explicit and no stale node id aims at a new object
#
# The artifact is published only when the four phases pass.
[CmdletBinding()]
param([int]$Port = 9353, [string]$HostLanguage = 'fr-CA')

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
$head = (git rev-parse HEAD).Trim()
$variant = 'task0053-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0053-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0053 synthetic proof preparation failed' }
$seed = $seedJson | ConvertFrom-Json

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
    # A REAL close: the window is asked first; the process is only stopped if it refuses, and it is
    # the process this script just started.
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(20000)) {
            Write-Host 'TASK-0053: normal close timed out; stopping only the process started by this proof'
            Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue
        }
    }
    $Application.WaitForExit()
}

function Invoke-TaskPhase {
    param([int]$Phase)
    Write-Host "TASK-0053: real WebView2 process $Phase"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-phase$Phase.log") `
        -RedirectStandardError (Join-Path $proofRoot "app-error-phase$Phase.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-phase$Phase.txt"
        $seedJson | node scripts/task0053-webview2.mjs $Port $variant $Phase $proofRoot $head 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue |
                Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0053 WebView2 process $Phase failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
}

Invoke-TaskPhase -Phase 1
Start-Sleep -Seconds 2
Invoke-TaskPhase -Phase 2
Start-Sleep -Seconds 2
Invoke-TaskPhase -Phase 3
Start-Sleep -Seconds 2
Invoke-TaskPhase -Phase 4

$phases = 1..4 | ForEach-Object { Get-Content -LiteralPath (Join-Path $proofRoot "phase$_.json") -Raw | ConvertFrom-Json }
$artifact = [ordered]@{
    task = 'TASK-0053'
    headTested = $head
    strategy = 'DEC-0051: four real WebView2 processes around three real closes; real mouse and key events; the workspace and every per-brain value read back from the catalogue; every disk reference recomputed from the synthetic directories on disk'
    realProcessRestarts = 3
    brains = 3
    phase1 = $phases[0]
    phase2 = $phases[1]
    phase3 = $phases[2]
    phase4 = $phases[3]
    notTested = @(
        'A crash (power loss, kill) between a debounced camera/selection change and its write: the proof covers a normal close; explicit changes (composition, focus, legend, density, motion, branch) reach the store at once.',
        'A real OS-level reduced-motion setting: the proof emulates the media feature through the browser (CDP Emulation.setEmulatedMedia).',
        'The rebuild of phase 3 is executed with the page''s own workspace writes held back, to model a rebuild between a closing and a reopening; the application has no other way to rebuild while it is closed.',
        'The language choice is replayed (it persists, and it is not in the workspace); it is not migrated.'
    )
}
$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0053-webview2.json'
$text = $artifact | ConvertTo-Json -Depth 40
foreach ($root in @($seed.rootAlix, $seed.rootBea, $seed.rootChloe)) {
    if ($text.Contains($root) -or $text.Contains($root.Replace('\', '\\'))) { throw 'absolute proof path leaked into the artifact' }
}
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8
Write-Output "TASK-0053: real WebView2 proof PASS; artifact $finalArtifact"
