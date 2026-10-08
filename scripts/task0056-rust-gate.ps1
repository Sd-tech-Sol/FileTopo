# TASK-0056 §6 — the unexplained TASK-0055 full-suite failure becomes a hard gate.
#
# Runs `cargo test --lib --offline` N times CONSECUTIVELY at one HEAD, captures stdout+stderr
# of every run to a working file OUTSIDE the repository, and publishes a deterministic summary:
# exit code, passed/failed/ignored counts, the exact names of the failing tests (empty on PASS),
# the SHA-256 of the captured log, and the wall-clock duration.
#
# The logs themselves are NOT committed: only the summary, their hashes, and — if a run fails —
# the failure excerpt. `-LogDirectory` must be outside the repository.
[CmdletBinding()]
param(
    [int]$Runs = 3,
    [Parameter(Mandatory = $true)][string]$LogDirectory,
    [string]$Out = 'docs/performance/runs/TASK-0056-rust-gate.json'
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository

$resolvedLogs = (New-Item -ItemType Directory -Force -Path $LogDirectory).FullName
if ($resolvedLogs.StartsWith($repository, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'the captured logs must live outside the repository'
}

$head = (git rev-parse HEAD).Trim()
$dirty = (git status --porcelain --untracked-files=no) -join ''
if ($dirty) { throw 'tracked files are modified: the gate would not describe the tested HEAD' }

# `cargo test` prints one `test result:` line per test binary; --lib gives exactly one.
function Read-RunSummary {
    param([string]$Path, [int]$ExitCode, [double]$Seconds)

    $lines = Get-Content -LiteralPath $Path
    $resultLines = @($lines | Where-Object { $_ -match '^test result:' })
    $passed = 0; $failed = 0; $ignored = 0; $measured = 0; $filtered = 0
    foreach ($line in $resultLines) {
        if ($line -match '(\d+) passed') { $passed += [int]$Matches[1] }
        if ($line -match '(\d+) failed') { $failed += [int]$Matches[1] }
        if ($line -match '(\d+) ignored') { $ignored += [int]$Matches[1] }
        if ($line -match '(\d+) measured') { $measured += [int]$Matches[1] }
        if ($line -match '(\d+) filtered out') { $filtered += [int]$Matches[1] }
    }

    # The `failures:` block cargo prints last is a bare list of test paths.
    $failedNames = New-Object System.Collections.Generic.List[string]
    $inList = $false
    foreach ($line in $lines) {
        if ($line -match '^failures:\s*$') { $inList = $true; continue }
        if ($inList) {
            if ($line -match '^\s{4}([A-Za-z0-9_:]+)\s*$') { $failedNames.Add($Matches[1].Trim()) }
            elseif ($line.Trim() -eq '') { continue }
            else { $inList = $false }
        }
    }
    $uniqueFailed = @($failedNames | Sort-Object -Unique)

    # On failure, keep a bounded excerpt so the artifact carries the evidence without the log.
    $excerpt = @()
    if ($ExitCode -ne 0 -or $failed -gt 0) {
        $firstFailure = ($lines | Select-String -Pattern '^(failures:|---- .* stdout ----|error\[|error:)' | Select-Object -First 1)
        $start = if ($firstFailure) { [math]::Max(0, $firstFailure.LineNumber - 6) } else { [math]::Max(0, $lines.Count - 80) }
        $excerpt = @($lines[$start..([math]::Min($lines.Count - 1, $start + 79))])
    }

    [ordered]@{
        exitCode      = $ExitCode
        passed        = $passed
        failed        = $failed
        ignored       = $ignored
        measured      = $measured
        filteredOut   = $filtered
        failedTests   = $uniqueFailed
        resultLines   = $resultLines
        logSha256     = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
        logBytes      = (Get-Item -LiteralPath $Path).Length
        logLines      = $lines.Count
        durationSeconds = [math]::Round($Seconds, 1)
        failureExcerpt = $excerpt
    }
}

$runSummaries = @()
for ($index = 1; $index -le $Runs; $index += 1) {
    $log = Join-Path $resolvedLogs ("task0056-cargo-test-run$index.log")
    $startedAt = (Get-Date).ToUniversalTime()
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Host "TASK-0056 Rust gate: run $index/$Runs"
    # One stream: cargo writes the progress on stdout and the warnings on stderr.
    cargo test --manifest-path src-tauri/Cargo.toml --lib --offline *>&1 | Out-File -LiteralPath $log -Encoding utf8
    $exit = $LASTEXITCODE
    $watch.Stop()
    $summary = Read-RunSummary -Path $log -ExitCode $exit -Seconds $watch.Elapsed.TotalSeconds
    $summary.Insert(0, 'run', $index)
    $summary.Insert(1, 'startedAtUtc', $startedAt.ToString('o'))
    $summary.Insert(2, 'command', 'cargo test --manifest-path src-tauri/Cargo.toml --lib --offline')
    $runSummaries += $summary
    Write-Host ("  exit $exit | $($summary.passed) passed / $($summary.failed) failed / $($summary.ignored) ignored | $($summary.durationSeconds)s")
}

$green = @($runSummaries | Where-Object { $_.exitCode -eq 0 -and $_.failed -eq 0 })
$gate = if ($green.Count -eq $Runs) { 'PASS' } else { 'BLOCKED' }

$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$artifact = [ordered]@{
    task           = 'TASK-0056'
    section        = 'Rust regression gate (TASK-0056 §6)'
    headTested     = $head
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    gate           = $gate
    runsRequested  = $Runs
    runsGreen      = $green.Count
    toolchain      = [ordered]@{
        cargo = (cargo --version).Trim()
        rustc = (rustc --version).Trim()
    }
    machine        = [ordered]@{
        cpu               = $cpu.Name.Trim()
        logicalProcessors = $cpu.NumberOfLogicalProcessors
        note              = 'Development workstation. No performance claim: the durations are wall clock, for comparison between the runs of this gate only.'
    }
    logsKeptOutsideRepository = $true
    runs           = $runSummaries
    notTested      = @(
        'No remote GitHub Actions CI is attached to this repository: these are local runs, read back from their captured logs.',
        'The suite is the library suite only (`--lib`), which is what TASK-0056 and ACTION-0105 name.'
    )
}
$text = $artifact | ConvertTo-Json -Depth 40
if ($text.Contains($env:USERNAME)) { throw 'user name leaked into the artifact' }
if ($text -match '[A-Za-z]:\\\\Users') { throw 'a local user path leaked into the artifact' }
Set-Content -LiteralPath (Join-Path $repository $Out) -Value $text -Encoding utf8
Write-Output "TASK-0056 Rust gate: $gate ($($green.Count)/$Runs green); artifact $Out"
if ($gate -ne 'PASS') { exit 1 }
