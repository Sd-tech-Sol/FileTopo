# TASK-0062 — Stage B / B05: the real WebView2 campaign of the POPULATED right-hand panels.
#
# A versioned extension of `scripts/task0061-multibrain-shell.ps1`, not an edit of it: the B04
# witness stays where it is. The procedure is deliberately the same — one disposable synthetic
# sandbox, the same native resize helper (`scripts/task0058-resize.ps1`), the same external
# fingerprint tool (`scripts/task0056-fingerprint.py`) — because a measurement taken by a
# different procedure compares nothing. What differs is the question, which lives in the `.mjs`:
#
#   When `RelationsPanel`, `ReviewQueuePanel` and `CrossRelationsPanel` hold REAL content
#   (relations of both provenances, a review queue of several suggestions, inter-brain relations
#   in both directions, long names), are they readable, reachable by mouse and keyboard, and
#   do they leave the map at least 240 CSS px at 960x640, 1280x800 and 1366x768?
#
# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`:
#
#   pwsh -File scripts/task0062-populated-panels.ps1 -WorkDirectory <OUTSIDE the repository> -Label before
#
# PowerShell 7 is required, as for `TASK-0058`.
#
# The order:
#
#   1  seed        one disposable synthetic REAL_ROOT tree and a catalogue holding it next to the
#                  three FROZEN synthetic brains (`scripts/task0062-seed-proof.py`);
#   2  fingerprint BEFORE, outside the product, over the REAL_ROOT tree;
#   3  process 1   the product indexes the four brains and populates its own panels (content
#                  observation, relation engine, the frozen inter-brain set), then the matrix
#                  (3 native window sizes x curated presentations x populated sub-states), the
#                  interactions by mouse and by keyboard, the targeted P-controls;
#   4  process 2   a NEW process over the SAME sandbox and WebView2 profile: P-19, the half a
#                  single process cannot show;
#   5  fingerprint AFTER — the strict digest must be byte-identical to step 2.
#
# This harness measures. It changes nothing in the product and publishes the verdict it
# measured, including a failing one. A failing criterion is NOT a script error: the script
# fails only when the measurement could not be taken, or when `P-22` was broken.
[CmdletBinding()]
param(
    [int]$Port = 9362,
    [string]$HostLanguage = 'fr-CA',
    [Parameter(Mandatory = $true)][string]$WorkDirectory,
    [string]$Label = 'before',
    [string]$Out
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw 'run this with pwsh 7: Windows PowerShell 5.1 reads the harness report as ANSI and writes a BOM, which would corrupt the published artifact'
}
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
if (-not $Out) { $Out = "docs/performance/runs/TASK-0062-populated-panels-$Label.json" }

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
        if ($LASTEXITCODE -ne 0) { throw 'TASK-0062 fingerprint failed' }
        $current = $json | ConvertFrom-Json
        if ($previous -and $previous.strictDigest -eq $current.strictDigest) {
            return [pscustomobject]@{ fingerprint = $current; readings = $reading }
        }
        $previous = $current
        Start-Sleep -Milliseconds $GapMilliseconds
    }
    throw 'the fingerprint never settled: two consecutive readings never agreed'
}

$variant = 'task0062-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0062-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0062 synthetic proof preparation failed' }
$seed = $seedJson | ConvertFrom-Json
$rootArguments = @("ATELIER=$($seed.atelierRoot)")

Write-Host "TASK-0062: fingerprint BEFORE (outside the product), 1 REAL_ROOT tree"
$before = Get-SettledFingerprint -Path (Join-Path $work "task0062-$Label-before.json") -Roots $rootArguments

# One WebView2 profile for both processes: `localStorage` is where the chosen language lives,
# so a second profile would make the restart prove nothing.
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

    Write-Host "TASK-0062: real WebView2 process, pass $pass"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-$pass.log") -RedirectStandardError (Join-Path $proofRoot "app-error-$pass.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-$pass.txt"
        # The harness reports a failure on stderr, and that report is the whole value of a
        # failed run: `Stop` would turn its first line into a terminating error.
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $seedJson | node scripts/task0062-populated-panels.mjs $Port $variant $pass $proofRoot $head $application.Id measure 2> $harnessError
        } finally {
            $ErrorActionPreference = $previousPreference
        }
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0062 WebView2 pass $pass failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
    $results[$pass] = Get-Content -LiteralPath (Join-Path $proofRoot "run-measure-pass$pass.json") -Raw | ConvertFrom-Json
}

Write-Host "TASK-0062: fingerprint AFTER"
$after = Get-SettledFingerprint -Path (Join-Path $work "task0062-$Label-after.json") -Roots $rootArguments
$strictIdentical = $before.fingerprint.strictDigest -eq $after.fingerprint.strictDigest

# The published captures: the states the harness flagged, copied next to the numbers.
$captureDirectory = Join-Path $repository 'docs/performance/runs'
$publishedCaptures = @()
foreach ($pass in @(1, 2)) {
    foreach ($capture in $results[$pass].captures) {
        if (-not $capture.published) { continue }
        $source = Join-Path $proofRoot $capture.file
        if (-not (Test-Path -LiteralPath $source)) { throw "a declared capture is missing: $($capture.file)" }
        # The label of the run is part of the published name, so two campaigns never overwrite
        # each other's captures.
        $publishedName = $capture.file -replace '^TASK-0062-', "TASK-0062-$Label-"
        Copy-Item -LiteralPath $source -Destination (Join-Path $captureDirectory $publishedName) -Force
        $publishedCaptures += [ordered]@{
            file = "docs/performance/runs/$publishedName"
            pass = $pass
            state = $capture.key
            bytes = $capture.bytes
            sha256 = $capture.sha256
            scrollYAtCapture = $capture.scrollYAtCapture
            asideScrollTopAtCapture = $capture.asideScrollTopAtCapture
            note = $capture.note
        }
    }
}

$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)
$memoryGiB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)

$artifact = [ordered]@{
    task = 'TASK-0062'
    stage = 'B / B05'
    label = $Label
    headTested = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    question = 'On a real Tauri/WebView2 host, with the relations panel, the review queue and the inter-brain panel actually POPULATED by the product (legacy and engine relations of both provenances, several pending suggestions, inter-brain relations in both directions, a 60-character French and a 75-character English brain name, very long file names), are the three panels readable and reachable by mouse and by keyboard at 960x640, 1280x800 and 1366x768, FR/EN, light/dark, comfortable/compact, with the map at least 240 CSS px, no horizontal overflow and no control lost or clipped?'
    strategy = 'Two real Tauri/WebView2 processes over one disposable synthetic sandbox: the three FROZEN synthetic brains plus one synthetic REAL_ROOT tree. The product itself indexes them, observes the contents of the REAL_ROOT tree and runs its deterministic relation engine from the interface; the inter-brain relations are the frozen XBR-1 set. The window is resized NATIVELY through Win32 SetWindowPos (scripts/task0058-resize.ps1, reused unchanged); prefers-color-scheme and prefers-reduced-motion are set with Emulation.setEmulatedMedia; clicks and keys are real Input.dispatch* events. Process 2 restarts over the same sandbox. No emulated device metrics, no third-party service, no telemetry.'
    machine = [ordered]@{
        cpu = $cpu.Name.Trim()
        logicalProcessors = $cpu.NumberOfLogicalProcessors
        memoryGiB = $memoryGiB
        note = 'Development workstation. This slice measures layout and interaction, not performance; no SLA is claimed.'
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
        rootsFingerprinted = 1
        readingsBefore = $before.readings
        readingsAfter = $after.readings
        strictDigestBefore = $before.fingerprint.strictDigest
        strictDigestAfter = $after.fingerprint.strictDigest
        strictDigestIdentical = $strictIdentical
        accessDigestBefore = $before.fingerprint.accessDigest
        accessDigestAfter = $after.fingerprint.accessDigest
        accessDigestIdentical = ($before.fingerprint.accessDigest -eq $after.fingerprint.accessDigest)
        artefactsFoundUnderRoot = @($before.fingerprint.artefactsFound) + @($after.fingerprint.artefactsFound)
        entryCount = [ordered]@{ before = $before.fingerprint.roots.ATELIER.entryCount; after = $after.fingerprint.roots.ATELIER.entryCount }
        note = 'The access digest is published separately on purpose: reading a file is what a read-only analyser does, and on a volume with last-access updates enabled that is a legitimate consequence of reading, never a change of content, name, structure or contractual timestamp. The three frozen brains read product-generated synthetic fixtures inside the disposable sandbox, which is not an analysed tree.'
    }
}
if (-not $strictIdentical) { $artifact.strategy = "FAILED P-22: " + $artifact.strategy }

$text = $artifact | ConvertTo-Json -Depth 80
if ($text.Contains($seed.atelierRoot)) { throw 'absolute proof path leaked into the artifact' }
if ($text.Contains($env:USERNAME)) { throw 'user name leaked into the artifact' }
if ($text.Contains($repository)) { throw 'repository path leaked into the artifact' }
$finalArtifact = Join-Path $repository $Out
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8

if (-not $strictIdentical) { throw 'P-22 FAILED: the analysed tree is not byte-identical; artifact written for the record' }
foreach ($pass in @(1, 2)) {
    $v = $results[$pass].verdict
    Write-Output ("TASK-0062 pass {0}: {1}" -f $pass, ($v | ConvertTo-Json -Depth 6 -Compress))
}
Write-Output "TASK-0062: P-22 strictDigestIdentical=$strictIdentical; artifact $Out"
