# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# Opens the real visible WebView2 host against disposable synthetic roots only.
#
# TASK-0050 (ACTION-0090): ONE real WebView2 cell. FILE-only filtered
# projection materialises every reachable legend key (23 of 24; node-diagnostic
# is the documented exception). The artifact is published only on success.
[CmdletBinding()]
param([int]$Port = 9350, [string]$HostLanguage = 'fr-CA')

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
$stagedArtifact = Join-Path $proofRoot 'TASK-0050-webview2.json'
$application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
    -RedirectStandardOutput (Join-Path $proofRoot 'app.log') `
    -RedirectStandardError (Join-Path $proofRoot 'app-error.log')
try {
    $errorFile = Join-Path $proofRoot 'harness-error.txt'
    $seedJson | node scripts/task0050-webview2.mjs $Port $variant $stagedArtifact $head 2> $errorFile
    if ($LASTEXITCODE -ne 0) {
        Get-Content -LiteralPath $errorFile -ErrorAction SilentlyContinue | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
        throw "TASK-0050 WebView2 proof failed; inspect $proofRoot"
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
$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0050-webview2.json'
Copy-Item -LiteralPath $stagedArtifact -Destination $finalArtifact -Force
Write-Output "TASK-0050: real WebView2 proof PASS; artifact $finalArtifact"
