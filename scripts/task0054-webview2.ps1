# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# TASK-0054 (F-050 / F-051): two real WebView2 processes running the SAME scenario on a
# disposable synthetic REAL_ROOT — normal, then with --disable-gpu. The second run only
# counts if the browser itself reports the flag as applied (checked over CDP by the harness).
[CmdletBinding()]
param([int]$Port = 9354, [string]$HostLanguage = 'fr-CA')

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
$head = (git rev-parse HEAD).Trim()
$dirty = (git status --porcelain --untracked-files=no) -join ''
if ($dirty) { throw 'tracked files are modified: the artifact would not describe the tested HEAD' }
$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'

function Stop-TaskApplication {
    param($Application)
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(20000)) { Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue }
    }
    $Application.WaitForExit()
}

$results = @{}
foreach ($mode in @('normal', 'gpuoff')) {
    $variant = 'task0054-' + [guid]::NewGuid().ToString('N')
    $proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
    New-Item -ItemType Directory -Path $proofRoot | Out-Null
    $seedJson = python scripts/task0054-seed-proof.py $variant
    if ($LASTEXITCODE -ne 0) { throw 'TASK-0054 synthetic proof preparation failed' }
    $seed = $seedJson | ConvertFrom-Json

    $env:FILETOPO_SANDBOX_VARIANT = $variant
    $env:FILETOPO_WATCH_GUARD_MS = '60000'
    $env:FILETOPO_WATCH_COALESCE_MS = '60000'
    $env:FILETOPO_WATCH_CALM_MS = '60000'
    $env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot 'webview-profile'
    $arguments = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
    if ($mode -eq 'gpuoff') { $arguments += ' --disable-gpu' }
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = $arguments
    $env:TEMP = Join-Path $proofRoot 'tmp'
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Path $env:TEMP | Out-Null

    Write-Host "TASK-0054: real WebView2 process, mode $mode"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot 'app.log') -RedirectStandardError (Join-Path $proofRoot 'app-error.log')
    try {
        $harnessError = Join-Path $proofRoot 'harness-error.txt'
        $seedJson | node scripts/task0054-webview2.mjs $Port $variant $mode $proofRoot $head 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue | Select-Object -First 60 | ForEach-Object { Write-Host $_ }
            throw "TASK-0054 WebView2 mode $mode failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
    $results[$mode] = Get-Content -LiteralPath (Join-Path $proofRoot "run-$mode.json") -Raw | ConvertFrom-Json
    $results["root-$mode"] = $seed.root
}
if ($results['normal'].semanticsDigest -ne $results['gpuoff'].semanticsDigest) { throw 'the two runs do not have the same data semantics' }

$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)
$memoryGiB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$artifact = [ordered]@{
    task = 'TASK-0054'
    headTested = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    strategy = 'Same scenario twice in the real Tauri/WebView2 app on a disposable synthetic REAL_ROOT; the GPU-disabled run is only valid because the browser reports --disable-gpu as applied (SystemInfo.getInfo) and the same verdict is FALSE on the normal run'
    machine = [ordered]@{
        cpu = $cpu.Name.Trim()
        logicalProcessors = $cpu.NumberOfLogicalProcessors
        memoryGiB = $memoryGiB
        note = 'Development workstation, more powerful than the modest-laptop target. No SLA is claimed.'
    }
    normal = $results['normal']
    gpuDisabled = $results['gpuoff']
    sameSemantics = $true
    notTested = @(
        'No frame-rate or latency claim: gesture waits include deliberate CDP settling.',
        'Modest-laptop hardware was not available; the GPU-disabled run proves absence of functional dependence on hardware acceleration, not performance.',
        'The WebView2 pass uses a 700-row folder physically on disk; 10k/100k/1M rows are proven structurally in Rust.'
    )
}
$text = $artifact | ConvertTo-Json -Depth 40
foreach ($root in @($results['root-normal'], $results['root-gpuoff'])) { if ($text.Contains($root)) { throw 'absolute proof path leaked into the artifact' } }
if ($text.Contains($env:USERNAME)) { throw 'user name leaked into the artifact' }
$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0054-webview2.json'
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8
Write-Output "TASK-0054: real WebView2 proof PASS (normal + GPU-disabled); artifact $finalArtifact"
