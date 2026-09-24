<#
.SYNOPSIS
    TASK-0040 — mesure canonique F-031 (protocole fige par ACTION-0066).

.DESCRIPTION
    Automatise le protocole, sans rien changer au noyau ni au harnais Rust :

    - profil unique : test avec opt-level=3, dossier de build `src-tauri/target/opt`;
    - SQLite du banc inchange : WAL, synchronous NORMAL, cache par defaut;
    - aucun checkpoint ni cache diagnostique (TASK0040_CHECKPOINT et
      TASK0040_CACHE_KIB sont retirees de l'environnement);
    - 5 campagnes independantes, chacune sur des index frais, 7 echantillons par
      cas, aucun rejete : TASK-0040-incremental-apply-canonical-01..05.json;
    - une synthese qui concatene les 35 echantillons bruts de chaque cas et
      calcule les medianes sur ces 35 executions (pas une mediane de medianes) :
      TASK-0040-incremental-apply-canonical-summary.json.

    Le seuil (mediane 100k / mediane 1k a 10 changements <= 2) est celui de
    BASELINE_TARGETS §3.3, inchange. Le script ne s'arrete jamais tot, que les
    premieres campagnes passent ou echouent.

.PARAMETER SummaryOnly
    Ne relance aucune campagne : recalcule la synthese depuis les cinq artefacts
    existants.
#>
[CmdletBinding()]
param([switch]$SummaryOnly)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
$crate = Join-Path $repository 'src-tauri'
$runs = Join-Path $repository 'docs/performance/runs'
$campaignCount = 5
$expectedRuns = 7
$ratioCeiling = 2.0
$targets = @{ '1000/10' = 200.0; '10000/10' = 250.0; '100000/10' = 400.0; '100000/1000' = 3000.0 }

function Get-CampaignName([int]$n) { 'TASK-0040-incremental-apply-canonical-{0:D2}.json' -f $n }

if (-not $SummaryOnly) {
    foreach ($n in 1..$campaignCount) {
        $tag = 'canonical-{0:D2}' -f $n
        $env:TASK0040_PROFILE_TAG = $tag
        $env:CARGO_PROFILE_DEV_OPT_LEVEL = '3'
        $env:CARGO_TARGET_DIR = Join-Path $crate 'target/opt'
        foreach ($name in 'TASK0040_CHECKPOINT', 'TASK0040_CACHE_KIB', 'TASK0040_KEEP_SANDBOX') {
            Remove-Item "Env:\$name" -ErrorAction SilentlyContinue
        }
        try {
            Push-Location $crate
            try {
                Write-Output "== campagne $n / $campaignCount ($tag)"
                & cargo test --offline --lib f031_incremental_apply_scaling -- --ignored --nocapture --test-threads=1
                if ($LASTEXITCODE -ne 0) { throw "campagne $n en echec d'execution" }
            }
            finally { Pop-Location }
        }
        finally {
            Remove-Item Env:\TASK0040_PROFILE_TAG -ErrorAction SilentlyContinue
            Remove-Item Env:\CARGO_PROFILE_DEV_OPT_LEVEL -ErrorAction SilentlyContinue
            Remove-Item Env:\CARGO_TARGET_DIR -ErrorAction SilentlyContinue
        }
    }
}

# ---- Synthese -------------------------------------------------------------

function Get-Median([double[]]$values) {
    $sorted = $values | Sort-Object
    $sorted[[int][math]::Floor($sorted.Count / 2)]
}

$sources = @()
$campaigns = @()
foreach ($n in 1..$campaignCount) {
    $name = Get-CampaignName $n
    $path = Join-Path $runs $name
    if (-not (Test-Path -LiteralPath $path)) { throw "artefact manquant : $name" }
    $sources += $name
    $campaigns += , (Get-Content -LiteralPath $path -Raw | ConvertFrom-Json)
}

# Configuration identique pour les 5 campagnes.
$envJson = $campaigns | ForEach-Object { $_.measurement.environment | ConvertTo-Json -Depth 10 -Compress }
$identical = ($envJson | Select-Object -Unique).Count -eq 1
$environment = $campaigns[0].measurement.environment
$diagnosticFree = -not $environment.conditions.checkpointAfterBuild -and
    ($environment.conditions.pageCacheKiB -like 'sqlite default*')
$noDiscard = ($campaigns | Where-Object { $_.measurement.environment.discardedRuns -ne 0 }).Count -eq 0

$caseKeys = @('1000/10', '10000/10', '100000/10', '100000/1000')
$cases = [ordered]@{}
$canonical = @{}
foreach ($key in $caseKeys) {
    $corpus, $changes = $key.Split('/') | ForEach-Object { [int]$_ }
    $samples = @()
    $perCampaign = @()
    foreach ($campaign in $campaigns) {
        $case = $campaign.measurement.cases | Where-Object { $_.corpusNodes -eq $corpus -and $_.changes -eq $changes }
        if ($case.runs -ne $expectedRuns -or $case.samplesUs.Count -ne $expectedRuns) {
            throw "cas $key : $($case.runs) echantillons au lieu de $expectedRuns"
        }
        $samples += [double[]]$case.samplesUs
        $perCampaign += , @([double[]]$case.samplesUs)
    }
    $medianUs = Get-Median $samples
    $canonical[$key] = $medianUs
    $target = $targets[$key]
    $medianMs = $medianUs / 1000.0
    $maxMs = ($samples | Measure-Object -Maximum).Maximum / 1000.0
    $cases[$key] = [ordered]@{
        corpusNodes                 = $corpus
        changes                     = $changes
        sampleCount                 = $samples.Count
        samplesUsRaw                = [double[]]$samples
        samplesUsRawByCampaign      = $perCampaign
        medianUs                    = $medianUs
        minUs                       = ($samples | Measure-Object -Minimum).Minimum
        maxUs                       = ($samples | Measure-Object -Maximum).Maximum
        medianMs                    = $medianMs
        targetMs                    = $target
        medianMeetsTarget           = $medianMs -le $target
        maxMeetsTarget              = $maxMs -le $target
        verdictAbsoluteTarget       = if ($medianMs -le $target) { 'PASS' } else { 'FAIL' }
    }
}

$campaignRatios = @()
foreach ($n in 1..$campaignCount) {
    $criterion = $campaigns[$n - 1].measurement.rejectionCriterion
    $campaignRatios += [ordered]@{
        campaign = $n
        artifact = $sources[$n - 1]
        median1kUs = $criterion.median1kUs
        median100kUs = $criterion.median100kUs
        ratio100kOver1k = $criterion.ratio100kOver1k
        verdictDiagnostic = $criterion.verdict
    }
}

$ratio = $canonical['100000/10'] / $canonical['1000/10']
$verdict = if ($ratio -le $ratioCeiling) { 'PASS' } else { 'FAIL' }
$absolute = @($cases.Values | ForEach-Object { $_.verdictAbsoluteTarget })
$allAbsolutePass = ($absolute | Where-Object { $_ -ne 'PASS' }).Count -eq 0

$summary = [ordered]@{
    task       = 'TASK-0040'
    title      = 'V1 Incremental Update Application Kernel — mesure canonique F-031'
    decision   = 'DEC-0038'
    criterion  = 'docs/performance/BASELINE_TARGETS.md §3.3'
    protocol   = 'ACTION-0066 : 5 campagnes independantes, 7 echantillons par cas, aucun rejete; mediane calculee sur les 35 executions brutes (pas une mediane de medianes); seuil inchange.'
    sourceArtifacts = $sources
    campaignCount = $campaignCount
    runsPerCasePerCampaign = $expectedRuns
    samplesPerCase = $campaignCount * $expectedRuns
    discardedSamples = 0
    everyCampaignReports = [ordered]@{
        discardedRunsZero = $noDiscard
        environmentIdenticalAcrossCampaigns = $identical
        noDiagnosticCheckpointNorCache = $diagnosticFree
    }
    environment = $environment
    cases = $cases
    campaignRatiosDiagnostic = $campaignRatios
    canonicalRejectionCriterion = [ordered]@{
        text = 'mediane(35 echantillons 100k / 10 changements) / mediane(35 echantillons 1k / 10 changements) <= 2'
        median1kUs = $canonical['1000/10']
        median100kUs = $canonical['100000/10']
        ratio100kOver1k = $ratio
        ceiling = $ratioCeiling
        verdict = $verdict
        f031Satisfied = ($ratio -le $ratioCeiling)
    }
    absoluteTargets33 = [ordered]@{
        basis = 'medianes canoniques des 35 executions'
        allPass = $allAbsolutePass
        perCase = [ordered]@{
            '1k/10'     = $cases['1000/10'].verdictAbsoluteTarget
            '10k/10'    = $cases['10000/10'].verdictAbsoluteTarget
            '100k/10'   = $cases['100000/10'].verdictAbsoluteTarget
            '100k/1000' = $cases['100000/1000'].verdictAbsoluteTarget
        }
    }
    note = 'Mesure d''ingenierie sur une machine, corpus synthetique. Aucun noyau, seuil ni reglage produit modifie.'
}

$outPath = Join-Path $runs 'TASK-0040-incremental-apply-canonical-summary.json'
$summary | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $outPath -Encoding utf8
Write-Output ("ratio canonique = {0:N4} (plafond {1}) -> {2}" -f $ratio, $ratioCeiling, $verdict)
Write-Output ("cibles absolues : {0}" -f ($absolute -join ', '))
Write-Output ("ecrit : {0}" -f (Split-Path -Leaf $outPath))
