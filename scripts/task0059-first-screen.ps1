# TASK-0059 — Stage B / B02: the real WebView2 campaign of the first screen.
#
# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`, twice:
#
#   pwsh -File scripts/task0059-first-screen.ps1 -Phase before -WorkDirectory <OUTSIDE the repository>
#   ... apply the fix, rebuild ...
#   pwsh -File scripts/task0059-first-screen.ps1 -Phase after  -WorkDirectory <OUTSIDE the repository>
#
# PowerShell 7 is required, for the same reason as `TASK-0058`: 5.1 decodes the harness's
# UTF-8 report as ANSI and writes a byte-order mark, so the published artifact would carry
# mangled text.
#
# The order, and why it is the order — identical to `scripts/task0058-visual.ps1`, because
# a before and an after measured by two different procedures would compare nothing:
#
#   1  seed        one disposable synthetic REAL_ROOT tree, the same shape B01 measured;
#   2  fingerprint BEFORE, by `scripts/task0056-fingerprint.py`, outside the product —
#                  reused unchanged, because `P-22` already has a witness;
#   3  process 1   the matrix: three real window sizes x six states, resized NATIVELY
#                  (`scripts/task0058-resize.ps1`, reused unchanged), the first-screen
#                  reading at `scrollY=0`, the targeted `P-02/P-05/P-07/P-11/P-19/P-21`
#                  controls and the camera invariants of criterion 3. It leaves the
#                  workspace deliberately non-default;
#   4  process 2   a NEW process over the SAME sandbox and the SAME WebView2 profile:
#                  what it finds restored is the `P-19` half a single process cannot show;
#   5  fingerprint AFTER — the strict digest must be byte-identical to step 2.
#
# This harness measures. It changes nothing in the product, and it publishes the verdict it
# measured — including `before`, where the verdict is expected to FAIL criterion 1. A
# failing criterion is therefore NOT a script error: the script fails only when the
# measurement itself could not be taken, or when `P-22` was broken.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][ValidateSet('before', 'after')][string]$Phase,
    [int]$Port = 9359,
    [string]$HostLanguage = 'fr-CA',
    [Parameter(Mandatory = $true)][string]$WorkDirectory,
    [string]$Out
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw 'run this with pwsh 7: Windows PowerShell 5.1 reads the harness report as ANSI and writes a BOM, which would corrupt the published artifact'
}
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
if (-not $Out) { $Out = "docs/performance/runs/TASK-0059-first-screen-$Phase.json" }

$work = (New-Item -ItemType Directory -Force -Path $WorkDirectory).FullName
if ($work.StartsWith($repository, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'the working fingerprints must live outside the repository: they carry absolute paths'
}

$head = (git rev-parse HEAD).Trim()
$dirty = (git status --porcelain --untracked-files=no) -join ''
if ($dirty) { throw 'tracked files are modified: the artifact would not describe the tested HEAD' }
$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'build the debug binary first: pnpm build; pnpm tauri build --debug --no-bundle' }

function Stop-TaskApplication {
    param($Application)
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(20000)) { Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue }
    }
    $Application.WaitForExit()
}

# NTFS updates a directory's last-write time lazily, so a baseline is read until two
# consecutive readings agree: the number of readings it took is published.
function Get-SettledFingerprint {
    param([string]$Path, [string[]]$Roots, [int]$MaxReadings = 12, [int]$GapMilliseconds = 1500)
    $previous = $null
    for ($reading = 1; $reading -le $MaxReadings; $reading += 1) {
        $json = python scripts/task0056-fingerprint.py $Path @Roots
        if ($LASTEXITCODE -ne 0) { throw 'TASK-0059 fingerprint failed' }
        $current = $json | ConvertFrom-Json
        if ($previous -and $previous.strictDigest -eq $current.strictDigest) {
            return [pscustomobject]@{ fingerprint = $current; readings = $reading }
        }
        $previous = $current
        Start-Sleep -Milliseconds $GapMilliseconds
    }
    throw 'the fingerprint never settled: two consecutive readings never agreed'
}

$variant = 'task0059-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0059-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0059 synthetic proof preparation failed' }
$seed = $seedJson | ConvertFrom-Json

Write-Host "TASK-0059 [$Phase]: fingerprint BEFORE (outside the product)"
$before = Get-SettledFingerprint -Path (Join-Path $work "task0059-$Phase-before.json") -Roots @("ATELIER=$($seed.root)")

# One WebView2 profile for both processes: `localStorage` is where the chosen language
# lives, so a second profile would make the restart prove nothing.
$profile = Join-Path $proofRoot 'webview-profile'
$results = @{}
foreach ($pass in @(1, 2)) {
    $env:FILETOPO_SANDBOX_VARIANT = $variant
    $env:FILETOPO_WATCH_GUARD_MS = '60000'
    $env:FILETOPO_WATCH_COALESCE_MS = '60000'
    $env:FILETOPO_WATCH_CALM_MS = '60000'
    $env:WEBVIEW2_USER_DATA_FOLDER = $profile
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
    $env:TEMP = Join-Path $proofRoot "tmp-$pass"
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Path $env:TEMP | Out-Null

    Write-Host "TASK-0059 [$Phase]: real WebView2 process, pass $pass"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-$pass.log") -RedirectStandardError (Join-Path $proofRoot "app-error-$pass.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-$pass.txt"
        # The harness reports a failure on stderr, and that report is the whole value of a
        # failed run: `Stop` would turn its first line into a terminating error and throw
        # the rest away.
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $seedJson | node scripts/task0059-first-screen.mjs $Port $variant $pass $proofRoot $head $application.Id $Phase 2> $harnessError
        } finally {
            $ErrorActionPreference = $previousPreference
        }
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0059 WebView2 pass $pass failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
    $results[$pass] = Get-Content -LiteralPath (Join-Path $proofRoot "run-$Phase-pass$pass.json") -Raw | ConvertFrom-Json
}

Write-Host "TASK-0059 [$Phase]: fingerprint AFTER"
$after = Get-SettledFingerprint -Path (Join-Path $work "task0059-$Phase-after.json") -Roots @("ATELIER=$($seed.root)")
$strictIdentical = $before.fingerprint.strictDigest -eq $after.fingerprint.strictDigest

# The published captures: the states named by the harness, copied next to the numbers.
$captureDirectory = Join-Path $repository 'docs/performance/runs'
$publishedCaptures = @()
foreach ($capture in $results[1].captures) {
    $source = Join-Path $proofRoot $capture.file
    if (-not (Test-Path -LiteralPath $source)) { throw "a declared capture is missing: $($capture.file)" }
    Copy-Item -LiteralPath $source -Destination (Join-Path $captureDirectory $capture.file) -Force
    $publishedCaptures += [ordered]@{
        file = "docs/performance/runs/$($capture.file)"
        state = $capture.key
        bytes = $capture.bytes
        sha256 = $capture.sha256
        scrollYAtCapture = $capture.scrollYAtCapture
        note = 'The window at the top of the document — scrollY=0 — in the state the matrix row of the same name measured. This is the first screen, not a scrolled page.'
    }
}

$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)
$memoryGiB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)

$artifact = [ordered]@{
    task = 'TASK-0059'
    stage = 'B / B02'
    phase = $Phase
    headTested = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    question = 'At scrollY=0, on a real Tauri/WebView2 host, is at least 200 CSS px of a usable MapView surface and one identifiable root or context node already on screen, without scrolling the document, at 960x640 / 1280x800 / 1366x768, in FR and EN, light and dark, compact and reduced motion?'
    strategy = 'Two real Tauri/WebView2 processes over one disposable synthetic REAL_ROOT. The window is resized NATIVELY through Win32 SetWindowPos (scripts/task0058-resize.ps1, reused unchanged) to 960x640, 1280x800 and 1366x768 client pixels; prefers-color-scheme and prefers-reduced-motion are set explicitly with Emulation.setEmulatedMedia so no state inherits the workstation theme. Six states are measured at every size. The second process proves what a restart restored. No emulated device metrics, no third-party service, no telemetry.'
    machine = [ordered]@{
        cpu = $cpu.Name.Trim()
        logicalProcessors = $cpu.NumberOfLogicalProcessors
        memoryGiB = $memoryGiB
        note = 'Development workstation. This slice measures layout, not performance; no SLA is claimed.'
    }
    windowContract = [ordered]@{
        source = 'src-tauri/tauri.conf.json'
        width = 1280
        height = 800
        minWidth = 960
        minHeight = 640
        note = 'The host floor was not modified. 960x640 is the smallest declared window, and the resize helper publishes what Windows actually granted.'
    }
    pass1 = $results[1]
    pass2 = $results[2]
    captures = $publishedCaptures
    p22 = [ordered]@{
        tool = 'scripts/task0056-fingerprint.py (reused unchanged)'
        readingsBefore = $before.readings
        readingsAfter = $after.readings
        strictDigestBefore = $before.fingerprint.strictDigest
        strictDigestAfter = $after.fingerprint.strictDigest
        strictDigestIdentical = $strictIdentical
        accessDigestBefore = $before.fingerprint.accessDigest
        accessDigestAfter = $after.fingerprint.accessDigest
        accessDigestIdentical = ($before.fingerprint.accessDigest -eq $after.fingerprint.accessDigest)
        artefactsFoundUnderRoot = @($before.fingerprint.artefactsFound) + @($after.fingerprint.artefactsFound)
        entryCountBefore = $before.fingerprint.roots.ATELIER.entryCount
        entryCountAfter = $after.fingerprint.roots.ATELIER.entryCount
        note = 'The access digest is published separately on purpose: reading a file is what a read-only analyser does, and on a volume with last-access updates enabled that is a legitimate consequence of reading, never a change of content, name, structure or contractual timestamp.'
    }
    notTested = @(
        'No screen reader was driven: the keyboard reach of the right panel and the axe-core run are what this slice measured, and no WCAG certification is claimed.',
        'No OS theme switch: prefers-color-scheme and prefers-reduced-motion were set as media-feature overrides in the real engine, not by changing Windows settings, which would be an operation outside the repository.',
        'No window narrower than 960 or shorter than 640 was measured: the host floor of src-tauri/tauri.conf.json was deliberately left untouched, and Windows refuses smaller.',
        'No performance claim: the waits in this harness include deliberate settling.',
        'P-14 clipboard and the P-11 touchpad device keep the exceptions ACTION-0107 published; neither was re-exercised here.',
        'The relations, review-queue and cross-brain panels of the right column were not populated by this fixture, so their own narrow-width behaviour is UNMEASURED.',
        'The 22 P requirements are NOT replayed by this slice; ACTION-0108 reserves that for the Stage B closure.',
        'The colour-contrast rows axe-core reports as INCOMPLETE are published state by state and are NOT turned into a contrast claim either way.'
    )
}
if (-not $strictIdentical) { $artifact.strategy = "FAILED P-22: " + $artifact.strategy }

$text = $artifact | ConvertTo-Json -Depth 60
if ($text.Contains($seed.root)) { throw 'absolute proof path leaked into the artifact' }
if ($text.Contains($env:USERNAME)) { throw 'user name leaked into the artifact' }
if ($text.Contains($repository)) { throw 'repository path leaked into the artifact' }
$finalArtifact = Join-Path $repository $Out
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8

if (-not $strictIdentical) { throw 'P-22 FAILED: the analysed tree is not byte-identical; artifact written for the record' }
$satisfied = $results[1].verdict.firstScreenSatisfied
$worst = $results[1].verdict.worstVisibleMapHeightPx
Write-Output "TASK-0059 [$Phase]: firstScreenSatisfied=$satisfied; worstVisibleMapHeightPx=$worst; chromeDefectProven=$($results[1].chromeDefectProven); artifact $Out"
