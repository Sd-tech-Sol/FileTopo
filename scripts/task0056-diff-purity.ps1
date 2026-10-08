# TASK-0056 §6 / §9 — diff purity.
#
# An acceptance may touch harness, scripts, proof artifacts and documents. It may not
# touch a single production file. This script proves it against the task's base rather
# than asserting it: it lists every path that differs between the base and `HEAD`, sorts
# them into production and non-production, and fails if the production list is not empty.
#
#   scripts/task0056-diff-purity.ps1 [-Base <sha>]
[CmdletBinding()]
param(
    [string]$Base = '446a4e4922f46bf4cdd71dd1aff65f08b5318b9d',
    [string]$Out = 'docs/performance/runs/TASK-0056-diff-purity.json'
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository

$head = (git rev-parse HEAD).Trim()
$baseSha = (git rev-parse $Base).Trim()

# What ships, or decides what ships. Anything here is production.
$productionPatterns = @(
    '^src/',
    '^src-tauri/(?!target/)',
    '^public/',
    '^index\.html$',
    '^package\.json$',
    '^pnpm-lock\.yaml$',
    '^tsconfig(\.node)?\.json$',
    '^vite\.config\.ts$',
    '^vitest\.config\.ts$',
    '^graph/'
)
# Explicitly allowed by TASK-0056 §9.
$allowedPatterns = @(
    '^scripts/',
    '^docs/',
    '^\.orchestrator/',
    '^tests/',
    '^AGENTS\.md$',
    '^CLAUDE\.md$',
    '^ROADMAP\.md$',
    '^CHANGELOG\.md$',
    '^\.claude/',
    '^\.agents/'
)

$changed = @(git diff --name-only "$baseSha..$head" | Where-Object { $_ })
$production = @($changed | Where-Object { $path = $_; $productionPatterns | Where-Object { $path -match $_ } })
$allowed = @($changed | Where-Object { $path = $_; $allowedPatterns | Where-Object { $path -match $_ } })
$unclassified = @($changed | Where-Object { $production -notcontains $_ -and $allowed -notcontains $_ })

$verdict = if ($production.Count -eq 0 -and $unclassified.Count -eq 0) { 'PURE' } else { 'IMPURE' }

$artifact = [ordered]@{
    task                 = 'TASK-0056'
    section              = 'Diff purity (TASK-0056 §9)'
    base                 = $baseSha
    head                 = $head
    verdict              = $verdict
    changedFileCount     = $changed.Count
    productionFilesTouched = @($production)
    unclassifiedFiles    = @($unclassified)
    allowedFilesTouched  = @($allowed)
    productionDefinition = @($productionPatterns)
    allowedDefinition    = @($allowedPatterns)
    note                 = 'A production file is anything that ships or decides what ships. An acceptance may touch harness, scripts, proof artifacts, tests and documents, and nothing else.'
}
$text = $artifact | ConvertTo-Json -Depth 20
Set-Content -LiteralPath (Join-Path $repository $Out) -Value $text -Encoding utf8
Write-Output "TASK-0056 diff purity: $verdict ($($changed.Count) files changed since the base, $($production.Count) of them production); artifact $Out"
if ($verdict -ne 'PURE') {
    $production + $unclassified | ForEach-Object { Write-Host "  touched: $_" }
    exit 1
}
