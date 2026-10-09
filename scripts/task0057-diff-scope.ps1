# TASK-0057 §13 — diff scope.
#
# TASK-0056 was an acceptance, so `task0056-diff-purity.ps1` proved that NO production
# file changed. TASK-0057 is a correction, so the question is different and narrower:
# which production files changed, and are they only the ones §13 allows?
#
#   - the relation source-boundary and its DTOs, in the backend;
#   - the matching TypeScript DTO;
#   - tests.
#
# Anything else in production — a renderer, a rule, a schema, a store, a dependency —
# fails this script. The declaration of a `#[cfg(test)]` module lives inside a production
# file, so that one file is allowed only if every line it gained is such a declaration:
# the script reads the added lines rather than trusting the path.
#
#   scripts/task0057-diff-scope.ps1 [-Base <sha>]
[CmdletBinding()]
param(
    [string]$Base = 'ca17df50d1fa904e8387628347bbf2f9792b9ae8',
    [string]$Out = 'docs/performance/runs/TASK-0057-diff-scope.json'
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repository

$head = (git rev-parse HEAD).Trim()
$baseSha = (git rev-parse $Base).Trim()

# What ships, or decides what ships.
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

# The production files TASK-0057 §13 allows, each with why it is allowed.
$allowedProduction = [ordered]@{
    'src-tauri/src/map/relation_commands.rs'       = 'the relation source boundary and the three generic DTOs — DEC-0053 C and D'
    'src/map/types.ts'                             = 'the matching TypeScript DTO: fixtureId becomes string | null on the three generic reads'
    'src-tauri/src/map/relation_real_root_tests.rs' = 'tests only — the REAL_ROOT relation proof and the structural guard'
    'src-tauri/src/map/commands.rs'                = 'the #[cfg(test)] declaration of that test module, and nothing else'
}
# A production file allowed ONLY for a test-module declaration: every added line must be
# one. Checked line by line, so a real change smuggled into the same commit is caught.
$declarationOnly = @{
    'src-tauri/src/map/commands.rs' = '^(///.*|#\[cfg\(test\)\]|#\[path = ".*"\]|mod [a-z0-9_]+;|)$'
}

$changed = @(git diff --name-only "$baseSha..$head" | Where-Object { $_ })
$production = @($changed | Where-Object { $path = $_; $productionPatterns | Where-Object { $path -match $_ } })
$other = @($changed | Where-Object { $production -notcontains $_ })

$findings = @()
$productionDetail = [ordered]@{}
foreach ($path in $production) {
    $numstat = (git diff --numstat "$baseSha..$head" -- $path) -split "\s+"
    $added = [int]$numstat[0]
    $removed = [int]$numstat[1]
    $why = $allowedProduction[$path]
    if (-not $why) {
        $findings += "production file outside the TASK-0057 §13 scope: $path"
        $why = 'NOT ALLOWED'
    }
    $declarationCheck = $null
    if ($declarationOnly.ContainsKey($path)) {
        $pattern = $declarationOnly[$path]
        $addedLines = @(git diff -U0 "$baseSha..$head" -- $path |
            Where-Object { $_ -match '^\+' -and $_ -notmatch '^\+\+\+' } |
            ForEach-Object { $_.Substring(1).Trim() })
        $offending = @($addedLines | Where-Object { $_ -notmatch $pattern })
        if ($removed -ne 0) { $findings += "$path removed $removed line(s); only a test-module declaration is allowed there" }
        if ($offending.Count -ne 0) { $findings += "$path gained a line that is not a test-module declaration: $($offending -join ' | ')" }
        $declarationCheck = [ordered]@{
            addedLines            = $addedLines.Count
            removedLines          = $removed
            everyAddedLineIsADeclaration = ($offending.Count -eq 0)
        }
    }
    $productionDetail[$path] = [ordered]@{
        added = $added; removed = $removed; allowedBecause = $why
        testModuleDeclarationOnly = $declarationCheck
    }
}

$verdict = if ($findings.Count -eq 0) { 'IN SCOPE' } else { 'OUT OF SCOPE' }
$artifact = [ordered]@{
    task           = 'TASK-0057'
    section        = 'Diff scope (TASK-0057 §13)'
    classification = 'DEVELOPMENT_BENCH_ENGINEERING_EVIDENCE'
    base           = $baseSha
    head           = $head
    verdict        = $verdict
    rule           = 'A correction may change the relation source boundary and its DTOs, the matching TypeScript DTO, and tests. No renderer redesign, no rule change, no relation schema migration, no new store, no new dependency. A production file allowed only for a #[cfg(test)] module declaration is checked line by line.'
    changedFiles   = $changed.Count
    production     = $productionDetail
    nonProduction  = @($other)
    findings       = @($findings)
}
$text = $artifact | ConvertTo-Json -Depth 20
Set-Content -LiteralPath (Join-Path $repository $Out) -Value $text -Encoding utf8
Write-Output "TASK-0057 diff scope: $verdict ($($production.Count) production file(s) of $($changed.Count) changed); artifact $Out"
if ($findings.Count -ne 0) {
    $findings | ForEach-Object { Write-Output "  - $_" }
    exit 1
}
