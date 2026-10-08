# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
# TASK-0055 (F-046 / DEC-0052): two real WebView2 processes over the SAME disposable synthetic
# REAL_ROOT. Pass 1 indexes the fixture, runs one real content campaign, reads the explorer and
# exercises the group rule through Actualiser. Pass 2 is a NEW process over the same sandbox and
# must read back the same facts — that is what persistence across a restart means here.
#
# The fixture — a.bin, a real hard link to it, a byte-for-byte copy and two distinct empty files —
# is created by the seed script BEFORE the first process starts, so the content campaign's own
# source fingerprint baseline is the one of the finished tree (TASK-0055 §12).
[CmdletBinding()]
param([int]$Port = 9355, [string]$HostLanguage = 'fr-CA')

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

# One variant, one sandbox, two processes: the second pass must find what the first left.
$variant = 'task0055-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0055-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0055 synthetic proof preparation failed' }
$seed = $seedJson | ConvertFrom-Json

$results = @{}
foreach ($pass in @(1, 2)) {
    $env:FILETOPO_SANDBOX_VARIANT = $variant
    $env:FILETOPO_WATCH_GUARD_MS = '60000'
    $env:FILETOPO_WATCH_COALESCE_MS = '60000'
    $env:FILETOPO_WATCH_CALM_MS = '60000'
    $env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot "webview-profile-$pass"
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
    $env:TEMP = Join-Path $proofRoot "tmp-$pass"
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Path $env:TEMP | Out-Null

    Write-Host "TASK-0055: real WebView2 process, pass $pass"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot 'app.log') -RedirectStandardError (Join-Path $proofRoot 'app-error.log')
    try {
        $harnessError = Join-Path $proofRoot "harness-error-$pass.txt"
        $seedJson | node scripts/task0055-webview2.mjs $Port $variant $pass $proofRoot $head 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue | Select-Object -First 60 | ForEach-Object { Write-Host $_ }
            throw "TASK-0055 WebView2 pass $pass failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
    $results[$pass] = Get-Content -LiteralPath (Join-Path $proofRoot "run-pass$pass.json") -Raw | ConvertFrom-Json
}
if ($results[1].semanticsDigest -ne $results[2].semanticsDigest) {
    throw 'the two passes do not agree: a restart changed the physical-identity facts'
}

$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)
$memoryGiB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$artifact = [ordered]@{
    task = 'TASK-0055'
    headTested = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    strategy = 'Two real Tauri/WebView2 processes over one disposable synthetic REAL_ROOT holding a real hard link, a byte-for-byte copy and two distinct empty files; the second process proves the facts persist across a restart, and the two passes must agree on the same semantics digest'
    machine = [ordered]@{
        cpu = $cpu.Name.Trim()
        logicalProcessors = $cpu.NumberOfLogicalProcessors
        memoryGiB = $memoryGiB
        note = 'Development workstation. No SLA is claimed; this slice measures no performance.'
    }
    pass1 = $results[1]
    pass2 = $results[2]
    sameSemantics = $true
    notTested = @(
        'No Cloud Files provider, account or placeholder is used: DEC-0035 stays covered by its own decision-table tests and the Win32 call on an ordinary file.',
        'No inter-volume hard link: NTFS does not allow one, and writing outside the repository is a stop condition.',
        'No performance claim: this slice adds no measurement.',
        'The non-Windows fallback is UNKNOWN by construction and is not exercised on this host.'
    )
}
$text = $artifact | ConvertTo-Json -Depth 40
if ($text.Contains($seed.root)) { throw 'absolute proof path leaked into the artifact' }
if ($text.Contains($env:USERNAME)) { throw 'user name leaked into the artifact' }
foreach ($spelling in @('stableKey', 'stable_key', 'SYS1:', 'PFv1:', 'VolumeSerialNumber', 'volumeSerial', 'FileId', 'fileId', 'identityProvenance')) {
    if ($text.Contains($spelling)) { throw "identity spelling leaked into the artifact: $spelling" }
}
$finalArtifact = Join-Path $repository 'docs/performance/runs/TASK-0055-webview2.json'
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8
Write-Output "TASK-0055: real WebView2 proof PASS (two processes, same semantics); artifact $finalArtifact"
