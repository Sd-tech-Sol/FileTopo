# Run after pnpm build and cargo build; Vite must serve this checkout on port 1420.
[CmdletBinding()]
param([int]$Port = 9330)
$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
$variant = 'task0030-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
python scripts/task0030-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'synthetic catalogue preparation failed' }
$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot 'webview-profile'
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
$env:TEMP = Join-Path $proofRoot 'tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP | Out-Null
$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
$application = Start-Process -FilePath $executable -PassThru -WindowStyle Hidden -WorkingDirectory $repository -RedirectStandardOutput (Join-Path $proofRoot 'app.log') -RedirectStandardError (Join-Path $proofRoot 'app-error.log')
try {
    node scripts/task0030-webview2.mjs $Port $variant
    if ($LASTEXITCODE -ne 0) { throw "WebView2 proof failed; inspect .filetopo-sandbox/$variant" }
} finally {
    # Close only the process this script launched. No filesystem deletion.
    if (-not $application.HasExited) { $null = $application.CloseMainWindow() }
}
