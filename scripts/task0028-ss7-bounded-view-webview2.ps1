<#
.SYNOPSIS
    TASK-0028 / SS7 + SS8 — measures bounded views in a REAL Tauri/WebView2
    process, twice: once normally, once with GPU acceleration switched off.

.DESCRIPTION
    Runs the application's existing H9 measurement loop, which opens a bounded
    view, drives a scripted pan-and-zoom, and times selection — all inside the
    real WebView2 engine. **No product behaviour is added**: the loop, the
    fixtures and the brains are the ones the runtime already ships, started
    through the environment flag it already reads.

    Two limits this script records rather than papers over.

    * The bench index of TASK-0028 (100 000 / 1 000 000) CANNOT reach this
      runtime without a new product command, which the task forbids. The views
      measured here are therefore the runtime's own bounded views, whose
      cardinalities sit at the LOW end of the candidate budget range.
    * Switching GPU acceleration off is requested through the documented
      WebView2 variable WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS. Whether the
      runtime honoured it cannot be confirmed from outside the page, so SS8 is
      recorded as NOT PROVEN, with the measurement kept as indicative.

    The 36 sealed proofs of X5 are hashed before and after. Any change aborts.

.PARAMETER Executable
    The Tauri debug binary. Defaults to src-tauri/target/debug/filetopo.exe.

.PARAMETER TimeoutSeconds
    How long to wait for each pass to write its artifact.
#>
[CmdletBinding()]
param(
    [string]$Executable,
    [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
if (-not $Executable) {
    $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) { throw "binaire introuvable: $Executable" }

$runs = Join-Path $repository 'docs/performance/runs'
$logDirectory = Join-Path $repository '.filetopo-sandbox/task0028-logs'
$null = New-Item -ItemType Directory -Path $logDirectory -Force

. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')
$protectedHashes = @{}
foreach ($name in $script:ProtectedRunArtifacts) {
    $path = Join-Path $runs $name
    if (-not (Test-Path -LiteralPath $path)) { throw "preuve protegee absente: $name" }
    $protectedHashes[$name] = (git -C $repository hash-object -- $path).Trim()
}
Write-Host ("X5 : {0} preuves scellees, empreintes relevees." -f $script:ProtectedRunArtifacts.Count)

# The H9 loop writes under TASK-0026's name. TASK-0028 reads it, transcribes the
# numbers into its own artifact, and removes the by-product: this task owns no
# file in another task's namespace.
$h9 = Join-Path $runs 'TASK-0026-H9-composed-runtime-regression-webview2.json'

function Invoke-BoundedViewPass {
    param(
        [string]$Label,
        [AllowNull()][string]$BrowserArguments
    )
    if (Test-Path -LiteralPath $h9) { Remove-Item -LiteralPath $h9 -Force }
    $log = Join-Path $logDirectory "task0028-ss7-$Label.log"
    $env:FILETOPO_AUTO_MEASURE = '1'
    $env:FILETOPO_SANDBOX_VARIANT = "task0028-ss7-$Label"
    if ($BrowserArguments) {
        $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = $BrowserArguments
    }
    try {
        $application = Start-Process -FilePath $Executable -PassThru `
            -RedirectStandardOutput $log -RedirectStandardError "$log.err"
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while ((Get-Date) -lt $deadline -and -not (Test-Path -LiteralPath $h9)) {
            Start-Sleep -Milliseconds 500
        }
        $produced = Test-Path -LiteralPath $h9
        if (-not $application.HasExited) {
            $null = $application.CloseMainWindow()
            if (-not $application.WaitForExit(15000)) {
                Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
            }
        }
        $application.WaitForExit()
    }
    finally {
        Remove-Item Env:\FILETOPO_AUTO_MEASURE -ErrorAction SilentlyContinue
        Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
        Remove-Item Env:\WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS -ErrorAction SilentlyContinue
    }
    if (-not $produced) { throw "passe $Label sans artefact; journal: $log" }

    $captured = Get-Content -LiteralPath $h9 -Raw | ConvertFrom-Json
    Remove-Item -LiteralPath $h9 -Force
    Write-Host "passe $Label terminee."
    return [ordered]@{
        pass                 = $Label
        browserArguments     = if ($BrowserArguments) { $BrowserArguments } else { '(aucun)' }
        webviewVersion       = $captured.host.webviewVersion
        tauriVersion         = $captured.host.tauriVersion
        nodeCeiling          = $captured.host.nodeCeiling
        layoutAlgorithm      = $captured.host.layoutAlgorithm
        framesPerRun         = $captured.framesPerRun
        runsPerFixture       = $captured.runsPerFixture
        selectionsPerRun     = $captured.selectionsPerRun
        warmupFrames         = $captured.warmupFrames
        views                = @($captured.measurements | ForEach-Object {
            [ordered]@{
                viewId              = $_.fixtureId
                renderedEntities    = $_.nodeCount
                viewport            = [ordered]@{ width = $_.viewport.width; height = $_.viewport.height }
                framesMeasured      = $_.frameTime.count
                frameTimeMedianMs   = $_.frameTime.median
                frameTimeMaxMs      = $_.frameTime.max
                worstFrameMs        = $_.worstFrameMs
                selectionMedianMs   = $_.selectionLatency.median
                selectionMaxMs      = $_.selectionLatency.max
                worstSelectionMs    = $_.worstSelectionMs
            }
        })
    }
}

$gpuPass = Invoke-BoundedViewPass -Label 'gpu-default' -BrowserArguments $null
Start-Sleep -Seconds 2
$softwarePass = Invoke-BoundedViewPass -Label 'gpu-disabled' `
    -BrowserArguments '--disable-gpu --disable-gpu-compositing'

$domPath = Join-Path $repository '.filetopo-sandbox/task0028/dom-cardinality.json'
if (-not (Test-Path -LiteralPath $domPath)) {
    throw 'cardinalite DOM absente: lancer d''abord pnpm vitest run src/map/boundedViewCardinality.test.tsx'
}
$dom = Get-Content -LiteralPath $domPath -Raw | ConvertFrom-Json

$measured = @($gpuPass.views | ForEach-Object { $_.renderedEntities })
$document = [ordered]@{
    task              = 'TASK-0028'
    title             = 'Synthetic Scale Feasibility Spike'
    status            = 'ENGINEERING_MEASUREMENT / NOT A PRODUCT CLAIM / NONCANONICAL UNTIL INDEPENDENT CONTROL'
    protocol          = 'docs/performance/TASK-0028-SCALE-SPIKE-PROTOCOL.md'
    decision          = 'DEC-0029'
    reserve           = 'R8 entiere - ces chiffres ne sont publies nulle part ailleurs.'
    notAProductClaim  = "Mesures d'ingenierie sur vues bornees synthetiques. Aucune promesse de performance, aucune cible validee, aucun etat produit change."
    measurement       = [ordered]@{
        criterion = 'SS7 + SS8'
        ss7 = [ordered]@{
            engine   = 'Tauri / WebView2 reel sous Windows'
            loop     = "Boucle de mesure H9 deja presente dans le runtime, demarree par FILETOPO_AUTO_MEASURE=1. Aucun comportement produit nouveau."
            measured = [ordered]@{
                viewOpening      = 'oui - chaque vue bornee est composee puis peinte avant mesure'
                panZoom          = 'oui - pan et zoom scriptes, reellement offerts par ce build'
                selection        = 'oui - latence de selection, souris et clavier disponibles dans ce build'
                domCardinality   = 'mesuree hors WebView2 (jsdom), voir domSvgCardinality'
            }
            passes = @($gpuPass, $softwarePass)
            renderedEntityCounts = $measured
            limits = @(
                "L'index de banc TASK-0028 (100 000 / 1 000 000) NE PEUT PAS atteindre ce runtime sans une nouvelle commande produit, que le perimetre interdit. La composition bout-en-bout index-a-vue N'A PAS ete testee.",
                "Les vues mesurees ici comptent $($measured -join ', ') entites : elles couvrent le BAS de la plage de budgets candidats 128-1024. Les budgets 256, 512 et 1024 NE SONT PAS mesures dans WebView2.",
                "MAX_NODES_PER_MAP = 5000 borne ce que le runtime charge : aucun corpus 100k/1M n'a jamais ete presente au frontend, ce qui est aussi la raison pour laquelle l'absence de whole-graph payload n'est PAS prouvee bout-en-bout ici."
            )
        }
        ss8 = [ordered]@{
            mechanism   = 'WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu --disable-gpu-compositing'
            verdict     = 'NOT PROVEN'
            why         = "Le mecanisme est documente par Microsoft, mais rien, depuis l'exterieur de la page, ne confirme que le runtime l'a honore. Aucune preuve n'est fabriquee : la passe est enregistree comme indicative, pas comme une demonstration d'absence de GPU."
            equivalence = "Une passe logicielle n'equivaut pas a un test sur iGPU modeste. Elle ne verifierait, si elle etait confirmee, que l'absence d'une dependance dure evidente au GPU."
            indicativeComparison = [ordered]@{
                gpuDefaultMedianMs  = @($gpuPass.views | ForEach-Object { $_.frameTimeMedianMs })
                gpuDisabledMedianMs = @($softwarePass.views | ForEach-Object { $_.frameTimeMedianMs })
            }
        }
        domSvgCardinality = [ordered]@{
            engine = 'jsdom (vitest) - PAS un moteur de rendu, PAS WebView2'
            proves = "Le nombre exact d'elements DOM/SVG d'une vue bornee, et son independance vis-a-vis du corpus."
            doesNotProve = "Ni un temps de rendu, ni un comportement graphique."
            source = 'src/map/boundedViewCardinality.test.tsx'
            observations = $dom.observations
        }
    }
}

$target = Join-Path $runs 'TASK-0028-SS-bounded-view-webview2.json'
if ($script:ProtectedRunArtifacts -contains (Split-Path -Leaf $target)) {
    throw 'refus: cible protegee'
}
$json = $document | ConvertTo-Json -Depth 12
if ($json -match [regex]::Escape($env:USERNAME) -or $json -match '(?i)[\\/]users[\\/]') {
    throw "refus: l'artefact porterait un identifiant personnel"
}
Set-Content -LiteralPath $target -Value $json -Encoding utf8

foreach ($name in $script:ProtectedRunArtifacts) {
    $path = Join-Path $runs $name
    $after = (git -C $repository hash-object -- $path).Trim()
    if ($after -ne $protectedHashes[$name]) { throw "preuve protegee modifiee: $name" }
}

Write-Output "SS7/SS8: deux processus WebView2 reels fermes, X5 intact, artefact: $target"
