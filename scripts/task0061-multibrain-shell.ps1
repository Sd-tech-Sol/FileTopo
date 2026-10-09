# TASK-0061 — Stage B / B04: the real WebView2 campaign of the multi-brain composition.
#
# A versioned extension of `scripts/task0060-primary-chrome.ps1`, not an edit of it: the B03
# witness stays where it is, so the two campaigns remain comparable artifact by artifact.
# The procedure is deliberately the same — one disposable synthetic REAL_ROOT sandbox, the
# same native resize helper (`scripts/task0058-resize.ps1`), the same external fingerprint
# tool (`scripts/task0056-fingerprint.py`) — because a measurement taken by a different
# procedure compares nothing. What differs is the question, which lives in the `.mjs`:
#
#   Do the thirteen usual commands, the composition controls and the three group entry
#   points stay whole on the opening screen when TWO and THREE brains are displayed, with
#   names that wrap, the composition menu open, a notice on screen, a vanished brain?
#
# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`:
#
#   pwsh -File scripts/task0061-multibrain-shell.ps1 -WorkDirectory <OUTSIDE the repository>
#
# PowerShell 7 is required, as for `TASK-0058`: 5.1 decodes the harness's UTF-8 report as ANSI
# and writes a byte-order mark, so the published artifact would carry mangled text.
#
# The order:
#
#   1  seed        four disposable synthetic REAL_ROOT trees and a catalogue naming them
#                  (a 60-character French Unicode name, a 75-character English name, a short
#                  one, and a brain nobody indexes);
#   2  fingerprint BEFORE, outside the product, over all four roots;
#   3  process 1   the stress matrix (3 native window sizes x 10 composition states), the
#                  keyboard walk of the composition, the targeted P-controls, the camera
#                  across focus changes and window sizes; it leaves a three-brain workspace;
#   4  process 2   a NEW process over the SAME sandbox and WebView2 profile: the P-19 half a
#                  single process cannot show, measured at 960x640 and 1280x800;
#   5  catalogue   one brain is removed from the DISPOSABLE catalogue between two processes
#                  (`scripts/task0061-catalog-drop.py`) — the safe way to raise the product's
#                  own workspace corrections;
#   6  process 3   a NEW process: the corrections notice on screen, at 3 sizes x 2 states;
#   7  fingerprint AFTER — the strict digest must be byte-identical to step 2.
#
# This harness measures. It changes nothing in the product and publishes the verdict it
# measured, including a failing one. A failing criterion is NOT a script error: the script
# fails only when the measurement could not be taken, or when `P-22` was broken.
[CmdletBinding()]
param(
    [int]$Port = 9361,
    [string]$HostLanguage = 'fr-CA',
    [Parameter(Mandatory = $true)][string]$WorkDirectory,
    [string]$Label = 'measure',
    [string]$Out
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw 'run this with pwsh 7: Windows PowerShell 5.1 reads the harness report as ANSI and writes a BOM, which would corrupt the published artifact'
}
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository
if (-not $Out) { $Out = "docs/performance/runs/TASK-0061-multibrain-shell-$Label.json" }

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
        if ($LASTEXITCODE -ne 0) { throw 'TASK-0061 fingerprint failed' }
        $current = $json | ConvertFrom-Json
        if ($previous -and $previous.strictDigest -eq $current.strictDigest) {
            return [pscustomobject]@{ fingerprint = $current; readings = $reading }
        }
        $previous = $current
        Start-Sleep -Milliseconds $GapMilliseconds
    }
    throw 'the fingerprint never settled: two consecutive readings never agreed'
}

$variant = 'task0061-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null
$seedJson = python scripts/task0061-seed-proof.py $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0061 synthetic proof preparation failed' }
$seed = $seedJson | ConvertFrom-Json
$labels = @('ATELIER', 'ETUDES', 'QUARTERLY', 'ZETA')
$rootArguments = @()
for ($index = 0; $index -lt $seed.brains.Count; $index += 1) {
    $rootArguments += "$($labels[$index])=$($seed.brains[$index].root)"
}
$droppedBrainId = $seed.brains[2].brain

Write-Host "TASK-0061: fingerprint BEFORE (outside the product), $($seed.brains.Count) roots"
$before = Get-SettledFingerprint -Path (Join-Path $work "task0061-$Label-before.json") -Roots $rootArguments

# One WebView2 profile for all processes: `localStorage` is where the chosen language lives,
# so a second profile would make the restart prove nothing.
$profile = Join-Path $proofRoot 'webview-profile'
$results = @{}
$catalogDrop = $null
foreach ($pass in @(1, 2, 3)) {
    if ($pass -eq 3) {
        $dropJson = python scripts/task0061-catalog-drop.py $variant $droppedBrainId
        if ($LASTEXITCODE -ne 0) { throw 'TASK-0061 could not remove the brain from the disposable catalogue' }
        $catalogDrop = $dropJson | ConvertFrom-Json
    }
    $env:FILETOPO_SANDBOX_VARIANT = $variant
    $env:FILETOPO_WATCH_GUARD_MS = '60000'
    $env:FILETOPO_WATCH_COALESCE_MS = '60000'
    $env:FILETOPO_WATCH_CALM_MS = '60000'
    $env:WEBVIEW2_USER_DATA_FOLDER = $profile
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
    $env:TEMP = Join-Path $proofRoot "tmp-$pass"
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Path $env:TEMP | Out-Null

    Write-Host "TASK-0061: real WebView2 process, pass $pass"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-$pass.log") -RedirectStandardError (Join-Path $proofRoot "app-error-$pass.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-$pass.txt"
        # The harness reports a failure on stderr, and that report is the whole value of a
        # failed run: `Stop` would turn its first line into a terminating error.
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $seedJson | node scripts/task0061-multibrain-shell.mjs $Port $variant $pass $proofRoot $head $application.Id measure $droppedBrainId 2> $harnessError
        } finally {
            $ErrorActionPreference = $previousPreference
        }
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0061 WebView2 pass $pass failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
    $results[$pass] = Get-Content -LiteralPath (Join-Path $proofRoot "run-measure-pass$pass.json") -Raw | ConvertFrom-Json
}

Write-Host "TASK-0061: fingerprint AFTER"
$after = Get-SettledFingerprint -Path (Join-Path $work "task0061-$Label-after.json") -Roots $rootArguments
$strictIdentical = $before.fingerprint.strictDigest -eq $after.fingerprint.strictDigest

# The published captures: the states the harness flagged, copied next to the numbers.
$captureDirectory = Join-Path $repository 'docs/performance/runs'
$publishedCaptures = @()
foreach ($pass in @(1, 2, 3)) {
    foreach ($capture in $results[$pass].captures) {
        if (-not $capture.published) { continue }
        $source = Join-Path $proofRoot $capture.file
        if (-not (Test-Path -LiteralPath $source)) { throw "a declared capture is missing: $($capture.file)" }
        # The label of the run is part of the published name, so two campaigns (the product under
        # test and the previous product) never overwrite each other's captures.
        $publishedName = $capture.file -replace '^TASK-0061-', "TASK-0061-$Label-"
        Copy-Item -LiteralPath $source -Destination (Join-Path $captureDirectory $publishedName) -Force
        $publishedCaptures += [ordered]@{
            file = "docs/performance/runs/$publishedName"
            pass = $pass
            state = $capture.key
            bytes = $capture.bytes
            sha256 = $capture.sha256
            scrollYAtCapture = $capture.scrollYAtCapture
            note = 'The window at the top of the document — scrollY=0, every scrolling band at its origin — in the state the matrix row of the same name measured. This is the first screen, not a scrolled page.'
        }
    }
}

$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)
$memoryGiB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$entryCounts = [ordered]@{}
foreach ($name in $labels) { $entryCounts[$name] = [ordered]@{ before = $before.fingerprint.roots.$name.entryCount; after = $after.fingerprint.roots.$name.entryCount } }

$artifact = [ordered]@{
    task = 'TASK-0061'
    stage = 'B / B04'
    label = $Label
    headTested = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    question = 'On a real Tauri/WebView2 host, with two then three synthetic REAL_ROOT brains displayed (a 60-character French Unicode name, a 75-character English name), the focus on a brain other than the first, the composition menu open, a representative notice on screen and a brain that vanished from the catalogue: are the thirteen usual commands, every chip and its remove button, every menu item and the three group entry points ENTIRELY visible and reachable at scrollY=0, with the map at least 240 CSS px, no horizontal overflow, and the source references of every displayed brain reachable in Diagnostics?'
    strategy = 'Three real Tauri/WebView2 processes over one disposable synthetic sandbox of four REAL_ROOT brains. The window is resized NATIVELY through Win32 SetWindowPos (scripts/task0058-resize.ps1, reused unchanged) to 960x640, 1280x800 and 1366x768 client pixels; prefers-color-scheme and prefers-reduced-motion are set explicitly with Emulation.setEmulatedMedia. The composition is built with real clicks on the real controls. Process 2 restarts over the same sandbox; between processes 2 and 3 one brain is removed from the DISPOSABLE catalogue so the product raises its own workspace corrections. No emulated device metrics, no third-party service, no telemetry.'
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
    catalogueChangeBetweenProcesses2And3 = $catalogDrop
    pass1 = $results[1]
    pass2 = $results[2]
    pass3 = $results[3]
    captures = $publishedCaptures
    p22 = [ordered]@{
        tool = 'scripts/task0056-fingerprint.py (reused unchanged)'
        rootsFingerprinted = $seed.brains.Count
        readingsBefore = $before.readings
        readingsAfter = $after.readings
        strictDigestBefore = $before.fingerprint.strictDigest
        strictDigestAfter = $after.fingerprint.strictDigest
        strictDigestIdentical = $strictIdentical
        accessDigestBefore = $before.fingerprint.accessDigest
        accessDigestAfter = $after.fingerprint.accessDigest
        accessDigestIdentical = ($before.fingerprint.accessDigest -eq $after.fingerprint.accessDigest)
        artefactsFoundUnderRoot = @($before.fingerprint.artefactsFound) + @($after.fingerprint.artefactsFound)
        entryCountPerRoot = $entryCounts
        note = 'The access digest is published separately on purpose: reading a file is what a read-only analyser does, and on a volume with last-access updates enabled that is a legitimate consequence of reading, never a change of content, name, structure or contractual timestamp.'
    }
    notTested = @(
        'No screen reader was driven: the keyboard reach, the accessible names read from the engine accessibility tree and the axe-core run are what this slice measured, and no WCAG certification is claimed.',
        'No OS theme switch: prefers-color-scheme and prefers-reduced-motion were set as media-feature overrides in the real engine, not by changing Windows settings, which would be an operation outside the repository.',
        'No window narrower than 960 or shorter than 640 was measured: the host floor of src-tauri/tauri.conf.json was left untouched and Windows refuses smaller.',
        'No performance claim: the waits in this harness include deliberate settling.',
        'P-14 clipboard and the P-11 touchpad device keep the exceptions ACTION-0107 published; the wheel is the same WheelEvent primitive, not a touchpad.',
        'The relations, review-queue and cross-brain panels of the right column were not populated by this fixture, so their own narrow-width behaviour is UNMEASURED (Stage B closure).',
        'The 22 P requirements are NOT replayed by this slice; only P-01, P-02, P-05, P-07, P-11, P-19, P-21 and P-22 were exercised, in the scopes named in the checks. The full replay stays reserved for the Stage B closure.',
        'Colour-contrast rows axe-core reports as INCOMPLETE are published state by state and are NOT turned into a contrast claim either way.',
        'Only four registered brains, at most four displayed, with one 60-character and one 75-character name, were measured; a composition of more brains, or a name at the 80-character ceiling, is UNMEASURED.',
        'The notices measured are the three the product raises by itself and safely: "not indexed yet", the refusal of removing the last brain, and the workspace corrections BRAIN_MISSING / FOCUSED_BRAIN_MISSING. Failure notices that need a broken source or a failing disk were not provoked.',
        'A group activation (mouse and keyboard) is not measured while the composition menu is open, because the first click outside closes the menu; it is measured in the same composition with the menu closed.',
        'A group''s open state is the engine state of a native <details>; nothing writes it, so a restart finds every group closed by design.'
    )
}
if (-not $strictIdentical) { $artifact.strategy = "FAILED P-22: " + $artifact.strategy }

$text = $artifact | ConvertTo-Json -Depth 80
foreach ($entry in $seed.brains) {
    if ($text.Contains($entry.root)) { throw 'absolute proof path leaked into the artifact' }
}
if ($text.Contains($env:USERNAME)) { throw 'user name leaked into the artifact' }
if ($text.Contains($repository)) { throw 'repository path leaked into the artifact' }
$finalArtifact = Join-Path $repository $Out
Set-Content -LiteralPath $finalArtifact -Value $text -Encoding utf8

if (-not $strictIdentical) { throw 'P-22 FAILED: the analysed trees are not byte-identical; artifact written for the record' }
foreach ($pass in @(1, 2, 3)) {
    $v = $results[$pass].verdict
    Write-Output ("TASK-0061 pass {0}: states={1} essentialWholeEveryState={2} primaryThirteenWhole={3} (worst {4}/13) chipsWhole={5} menuItemsWhole={6} groupEntryPointsWhole={7} mapAtLeastFloor={8} (worst {9}px) noOverflow={10}" -f `
        $pass, $v.statesJudged, $v.essentialWholeEveryState, $v.primaryThirteenWholeEveryState, $v.worstPrimaryWhole, $v.chipsAndRemovesWholeEveryState, $v.menuItemsWholeEveryOpenMenuState, $v.groupEntryPointsWholeEveryState, $v.mapAtLeastFloorEveryState, $v.worstMapVisibleHeightPx, $v.noHorizontalOverflowNoEscapeNoClippedControlEveryState)
}
Write-Output "TASK-0061: P-22 strictDigestIdentical=$strictIdentical; artifact $Out"
