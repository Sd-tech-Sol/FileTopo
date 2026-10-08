# TASK-0056 — the final P-22 campaign, end to end.
#
# Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`.
#
#   scripts/task0056-webview2.ps1 -WorkDirectory <a directory OUTSIDE the repository>
#
# The order is the whole point (TASK-0056 §4, ACTION-0105 §6):
#
#   1  seed        three disposable synthetic REAL_ROOT trees;
#   2  process 0   PRE-BASELINE: the three brains are indexed (scaffolding, declared);
#   3  mutate      the real source changes the window will read in the journal — applied
#                  BEFORE the baseline, so no change of the analysed tree ever happens
#                  inside the judged window;
#   4  fingerprint BEFORE, by `task0056-fingerprint.py`, outside the product;
#   5  process 1   the window, part one;
#   6  clipboard   read here, outside the WebView, and compared to the real path;
#   7  process 2   the window, part two, after a real close: persistence, the second and
#                  third brains, the temporary unavailability and its restoration, English;
#   8  fingerprint AFTER — it must be byte-identical to the one of step 4.
#
# A real `explorer.exe` window may remain open after this run: TASK-0034/0035 forbid
# killing it globally, so it is left for Windows to manage.
[CmdletBinding()]
param(
    [int]$Port = 9356,
    [string]$HostLanguage = 'fr-CA',
    [Parameter(Mandatory = $true)][string]$WorkDirectory,
    [string]$Out = 'docs/performance/runs/TASK-0056-p22-webview2.json'
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository

$work = (New-Item -ItemType Directory -Force -Path $WorkDirectory).FullName
if ($work.StartsWith($repository, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'the working fingerprints must live outside the repository'
}

$head = (git rev-parse HEAD).Trim()
$dirty = (git status --porcelain --untracked-files=no) -join ''
if ($dirty) { throw 'tracked files are modified: the artifact would not describe the tested HEAD' }
$executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'build the debug host first: pnpm tauri build --debug --no-bundle' }

function Stop-TaskApplication {
    param($Application)
    if (-not $Application.HasExited) {
        $null = $Application.CloseMainWindow()
        if (-not $Application.WaitForExit(25000)) { Stop-Process -Id $Application.Id -ErrorAction SilentlyContinue }
    }
    $Application.WaitForExit()
}

$variant = 'task0056-' + [guid]::NewGuid().ToString('N')
$proofRoot = Join-Path $repository ".filetopo-sandbox/$variant"
New-Item -ItemType Directory -Path $proofRoot | Out-Null

Write-Host 'TASK-0056: seeding three disposable synthetic roots'
$seedJson = python scripts/task0056-seed-proof.py seed $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0056 seeding failed' }
$seed = $seedJson | ConvertFrom-Json
$roots = @(
    "atelier=$($seed.rootAtelier)",
    "carnets=$($seed.rootCarnets)",
    "archives=$($seed.rootArchives)"
)

function Invoke-ProofPhase {
    param([int]$Phase, [hashtable]$Watch, [string]$Payload)

    $env:FILETOPO_SANDBOX_VARIANT = $variant
    foreach ($key in $Watch.Keys) { Set-Item -Path "env:$key" -Value $Watch[$key] }
    $env:WEBVIEW2_USER_DATA_FOLDER = Join-Path $proofRoot "webview-profile-$Phase"
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=$Port --lang=$HostLanguage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows"
    $env:TEMP = Join-Path $proofRoot "tmp-$Phase"
    $env:TMP = $env:TEMP
    New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

    Write-Host "TASK-0056: real WebView2 process, phase $Phase"
    $application = Start-Process -FilePath $executable -PassThru -WorkingDirectory $repository `
        -RedirectStandardOutput (Join-Path $proofRoot "app-$Phase.log") -RedirectStandardError (Join-Path $proofRoot "app-error-$Phase.log")
    try {
        $harnessError = Join-Path $proofRoot "harness-error-$Phase.txt"
        $Payload | node scripts/task0056-webview2.mjs $Port $variant $Phase $proofRoot $head 2> $harnessError
        if ($LASTEXITCODE -ne 0) {
            Get-Content -LiteralPath $harnessError -ErrorAction SilentlyContinue | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
            throw "TASK-0056 phase $Phase failed; inspect $proofRoot"
        }
    } finally {
        Stop-TaskApplication -Application $application
    }
}

# A watcher that must not act: the manual Actualiser of phase 1 is the gesture under test.
$watchAsleep = @{ FILETOPO_WATCH_GUARD_MS = '600000'; FILETOPO_WATCH_COALESCE_MS = '600000'; FILETOPO_WATCH_CALM_MS = '600000'; FILETOPO_WATCH_PERIODIC_MS = '600000' }
# A watcher that must really act: phase 2 reads the root leaving and coming back.
$watchAwake = @{ FILETOPO_WATCH_GUARD_MS = '900'; FILETOPO_WATCH_COALESCE_MS = '400'; FILETOPO_WATCH_CALM_MS = '600'; FILETOPO_WATCH_PERIODIC_MS = '3000' }

# -- 2. pre-baseline: the brains are indexed before anything is judged -----------------
Invoke-ProofPhase -Phase 0 -Watch $watchAsleep -Payload $seedJson

# -- 3. the real source changes, BEFORE the baseline -----------------------------------
Write-Host 'TASK-0056: applying the pre-baseline source changes'
$mutationJson = python scripts/task0056-seed-proof.py mutate $variant
if ($LASTEXITCODE -ne 0) { throw 'TASK-0056 pre-baseline mutation failed' }
$mutations = ($mutationJson | ConvertFrom-Json).changes
$campaignSeed = ($seed | ConvertTo-Json -Depth 10 | ConvertFrom-Json)
$campaignSeed | Add-Member -NotePropertyName mutations -NotePropertyValue $mutations
$campaignPayload = $campaignSeed | ConvertTo-Json -Depth 10 -Compress

# -- 4. the baseline fingerprint, taken outside the product ----------------------------
Write-Host 'TASK-0056: external fingerprint BEFORE the P-22 window'
$beforePath = Join-Path $work 'task0056-fingerprint-before.json'
$beforeJson = python scripts/task0056-fingerprint.py $beforePath @roots
if ($LASTEXITCODE -ne 0) { throw 'TASK-0056 baseline fingerprint failed' }
$before = $beforeJson | ConvertFrom-Json
if ($before.artefactsFound.Count -ne 0) { throw 'a FileTopo artefact was already under a source before the window' }

# -- 5. the window, part one ------------------------------------------------------------
Invoke-ProofPhase -Phase 1 -Watch $watchAsleep -Payload $campaignPayload

# -- 6. the clipboard, read outside the WebView ----------------------------------------
$expectedCopied = Join-Path $seed.rootAtelier 'rapports\rapport-original.txt'
$clipboard = try { Get-Clipboard -Raw } catch { $null }
$copyMatchedTheRealPath = ($null -ne $clipboard) -and ($clipboard.Trim() -eq $expectedCopied)
if (-not $copyMatchedTheRealPath) {
    throw "the copied path is not the real path of the selected element (clipboard length $($clipboard.Length))"
}

# -- 7. the window, part two ------------------------------------------------------------
Invoke-ProofPhase -Phase 2 -Watch $watchAwake -Payload $campaignPayload

# -- 8. the fingerprint after the window ------------------------------------------------
Write-Host 'TASK-0056: external fingerprint AFTER the P-22 window'
$afterPath = Join-Path $work 'task0056-fingerprint-after.json'
$afterJson = python scripts/task0056-fingerprint.py $afterPath @roots
if ($LASTEXITCODE -ne 0) { throw 'TASK-0056 closing fingerprint failed' }
$after = $afterJson | ConvertFrom-Json

$identical = $before.strictDigest -eq $after.strictDigest
$accessIdentical = $before.accessDigest -eq $after.accessDigest
$perRoot = [ordered]@{}
foreach ($label in @('atelier', 'carnets', 'archives')) {
    $perRoot[$label] = [ordered]@{
        entryCountBefore   = $before.roots.$label.entryCount
        entryCountAfter    = $after.roots.$label.entryCount
        fileCountAfter     = $after.roots.$label.fileCount
        totalBytesAfter    = $after.roots.$label.totalBytes
        strictDigestBefore = $before.roots.$label.strictDigest
        strictDigestAfter  = $after.roots.$label.strictDigest
        strictIdentical    = $before.roots.$label.strictDigest -eq $after.roots.$label.strictDigest
        accessIdentical    = $before.roots.$label.accessDigest -eq $after.roots.$label.accessDigest
    }
}

$phase1 = Get-Content -LiteralPath (Join-Path $proofRoot 'run-phase1.json') -Raw | ConvertFrom-Json
$phase2 = Get-Content -LiteralPath (Join-Path $proofRoot 'run-phase2.json') -Raw | ConvertFrom-Json
$coverage = @($phase1.coverage) + @($phase2.coverage)
$requirements = 1..21 | ForEach-Object { 'P-{0:00}' -f $_ }
$missing = @($requirements | Where-Object { $name = $_; -not ($coverage | Where-Object { $_.requirement -eq $name }) })
if ($missing.Count -ne 0) { throw "the campaign has no runtime observation for: $($missing -join ', ')" }

$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$memoryGiB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$artifact = [ordered]@{
    task           = 'TASK-0056'
    section        = 'Final P-22 campaign (TASK-0056 §4 and §5)'
    headTested     = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    verdict        = if ($identical -and $after.artefactsFound.Count -eq 0 -and $copyMatchedTheRealPath) { 'PASS' } else { 'FAIL' }
    strategy       = 'Three disposable synthetic REAL_ROOT trees; the brains are indexed and the source is changed BEFORE the baseline; three real Tauri/WebView2 processes then exercise P-01..P-21 inside the window, including one root made temporarily unavailable and restored; an external fingerprint taken by a separate tool before and after the window must be identical.'
    machine        = [ordered]@{
        cpu               = $cpu.Name.Trim()
        logicalProcessors = $cpu.NumberOfLogicalProcessors
        memoryGiB         = $memoryGiB
        note              = 'Development workstation. No SLA and no performance figure is claimed: this campaign measures immutability and behaviour, never speed.'
    }
    fingerprint    = [ordered]@{
        tool                   = 'scripts/task0056-fingerprint.py'
        outsideTheProduct      = $true
        covers                 = @('relative path', 'kind', 'size', 'sha256 of the content', 'hard-link count', 'modification time (ns)', 'creation time (ns)', 'the root directory metadata itself')
        strictDigestBefore     = $before.strictDigest
        strictDigestAfter      = $after.strictDigest
        strictIdentical        = $identical
        accessDigestBefore     = $before.accessDigest
        accessDigestAfter      = $after.accessDigest
        accessTimesIdentical   = $accessIdentical
        accessTimeNote         = 'The last-access time is digested separately and reported on its own line. Reading a file is what a read-only analyser does; where the volume records last access, a changed access time is a consequence of reading, never a change of content, name, structure or contractual timestamp.'
        filetopoArtefactsUnderTheSources = @($after.artefactsFound)
        perRoot                = $perRoot
        detailKeptOutsideRepository = $true
    }
    preBaseline    = [ordered]@{
        note    = 'Applied BEFORE the fingerprint, so no change of an analysed tree ever happens inside the judged window.'
        changes = @($mutations)
    }
    copyPath       = [ordered]@{
        node                   = 'rapports/rapport-original.txt'
        comparedOutsideTheWebView = $true
        matchedTheRealPath     = $copyMatchedTheRealPath
        note                   = 'The clipboard was read by this script and compared to the real path; neither the path nor the clipboard content is published.'
    }
    coverage       = @($coverage)
    phase1         = [ordered]@{ checks = @($phase1.checks); axe = $phase1.axe; wire = $phase1.wire; fatalConsoleErrors = $phase1.fatalConsoleErrors; semanticsDigest = $phase1.semanticsDigest }
    phase2         = [ordered]@{ checks = @($phase2.checks); axe = $phase2.axe; wire = $phase2.wire; fatalConsoleErrors = $phase2.fatalConsoleErrors; integrity = $phase2.integrity }
    notTested      = @(
        'No heavy threshold is re-measured here: 100 000 and 1 000 000 indexed rows, the 10 000-event burst, the incremental cost curve and the complete contrast matrix stay composed from their own VERIFIED campaigns, named in the coverage rows.',
        'No performance figure, no FPS and no memory figure is produced; reserve R8 is untouched.',
        'No remote GitHub Actions CI is attached: every result here is a local run with its output captured.',
        'The Explorer windows a real reveal opens are left for Windows to manage, as TASK-0034/0035 require.',
        'A real screen reader is not exercised; the accessibility evidence is axe-core plus a real keyboard walk, as in TASK-0047.'
    )
}
$text = $artifact | ConvertTo-Json -Depth 60
foreach ($secret in @($seed.rootAtelier, $seed.rootCarnets, $seed.rootArchives, $env:USERNAME, $repository)) {
    if ($secret -and $text.Contains($secret)) { throw "a local path or user name leaked into the artifact" }
}
foreach ($spelling in @('stableKey', 'stable_key', 'SYS1:', 'PFv1:', 'VolumeSerialNumber', 'volumeSerial', 'FileId', 'fileId', 'identityProvenance', 'st_ino')) {
    if ($text.Contains($spelling)) { throw "an identity spelling leaked into the artifact: $spelling" }
}
Set-Content -LiteralPath (Join-Path $repository $Out) -Value $text -Encoding utf8
Write-Output "TASK-0056 P-22 campaign: $($artifact.verdict) (source fingerprint identical: $identical); artifact $Out"
if ($artifact.verdict -ne 'PASS') { exit 1 }
