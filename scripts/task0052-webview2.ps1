# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# Opens the real visible WebView2 host against disposable synthetic roots only.
#
# TASK-0052 (DEC-0050 / F-042): branch focus and collapse. TWO real processes
# around a real restart: phase 1 performs the gestures with real key events,
# phase 2 states that none of the F-042 state was kept (session-only). The
# artifact is published only when both phases pass.
[CmdletBinding()]
param([int]$Port = 9352, [string]$HostLanguage = 'fr-CA')

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
$head = (git rev-parse HEAD).Trim()
$variant = 'task0052-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0052-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0052 synthetic proof preparation failed' }
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
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(20000)) {
            Write-Host 'TASK-0052: normal close timed out; stopping only the process started by this proof'
            Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue
        }
    }
    $Application.WaitForExit()
}

function Invoke-TaskPhase {
    param([int]$Phase)
    Write-Host "TASK-0052: real WebView2 process $Phase"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-phase$Phase.log") `
        -RedirectStandardError (Join-Path $proofRoot "app-error-phase$Phase.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-phase$Phase.txt"
        $seedJson | node scripts/task0052-webview2.mjs $Port $variant $Phase $proofRoot $head 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue |
                Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0052 WebView2 process $Phase failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
}

Invoke-TaskPhase -Phase 1
Invoke-TaskPhase -Phase 2

$artifact = [ordered]@{
    task = 'TASK-0052'
    headTested = $head
    strategy = 'DEC-0050: two real WebView2 processes around a real restart; real key events (Tab, Enter, Space); every reference count recomputed from the synthetic directories on disk'
    phase1 = (Get-Content -LiteralPath (Join-Path $proofRoot 'phase1.json') -Raw | ConvertFrom-Json)
    phase2 = (Get-Content -LiteralPath (Join-Path $proofRoot 'phase2.json') -Raw | ConvertFrom-Json)
    notTested = @(
        'Branch focus and collapse are available in the focused-branch view only; the ordinary one-level projection has no descendants to collapse.',
        'A watcher-driven reload (new Index revision) while a branch is focused leaves the focus by design; covered by the frontend guard, not replayed in WebView2.',
        'P-19 as a whole stays PARTIELLE: F-042 state is session-only here; persistence belongs to the next slice.'
    )
}
$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0052-webview2.json'
$text = $artifact | ConvertTo-Json -Depth 40
if ($text.Contains($seed.rootAlix) -or $text.Contains($seed.rootBea)) { throw 'absolute proof path leaked into the artifact' }
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8
Write-Output "TASK-0052: real WebView2 proof PASS; artifact $finalArtifact"
