<#
.SYNOPSIS
    Runs both N15 passes in real Tauri/WebView2 processes.

.DESCRIPTION
    Pass 1 performs the ordered node-graph interactions with real Windows
    keystrokes. The process is then closed before pass 2 starts with the same
    fresh sandbox variant. No variant or historical artefact is removed.
#>
[CmdletBinding()]
param(
    [string]$Executable,
    [string]$LogDirectory,
    [int]$TimeoutSeconds = 1800
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
if (-not $Executable) {
    $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) {
    throw "binaire introuvable: $Executable"
}
if (-not $LogDirectory) {
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0022-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'
$variant = 'task0022-n15-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                      ([guid]::NewGuid().ToString('N').Substring(0, 6))
. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')

function Wait-ForArtifact {
    param([string]$Path, [string]$AbandonPath, [int]$Seconds)
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $Path) { return $true }
        if (Test-Path -LiteralPath $AbandonPath) { return $false }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Invoke-N15Pass {
    param([int]$Pass, [switch]$WithKeyWatcher)

    $artifact = Join-Path $runs "TASK-0026-N15-topographic-node-graph-webview2-pass$Pass.json"
    $abandoned = Join-Path $runs "TASK-0026-N15-topographic-node-graph-webview2-pass$Pass-abandon.json"
    foreach ($stale in @($artifact, $abandoned)) {
        Assert-NotProtectedRunArtifact -Path $stale
        if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale -Force }
    }

    $log = Join-Path $LogDirectory "filetopo-$variant-n15-pass$Pass.log"
    $env:FILETOPO_AUTO_TOPOGRAPHIC = "$Pass"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    $keys = $null
    if ($WithKeyWatcher) {
        $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-File', $watcher,
                            '-LogPath', $log,
                            '-TimeoutSeconds', "$TimeoutSeconds")
    }

    $produced = Wait-ForArtifact -Path $artifact -AbandonPath $abandoned -Seconds $TimeoutSeconds
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if ($null -ne $keys -and -not $keys.HasExited) {
        Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue
    }
    Remove-Item Env:\FILETOPO_AUTO_TOPOGRAPHIC -ErrorAction SilentlyContinue

    if (-not $produced) {
        if (Test-Path -LiteralPath $abandoned) {
            throw "N15 passe $Pass abandonnee: $abandoned"
        }
        throw "N15 passe $Pass sans artefact; journal: $log"
    }
    Write-Host "N15 passe $Pass terminee; journal: $log"
}

$env:FILETOPO_SANDBOX_VARIANT = $variant
try {
    Write-Host "N15 variante fraiche: <depot>/.filetopo-sandbox/variants/$variant"
    Invoke-N15Pass -Pass 1 -WithKeyWatcher
    Start-Sleep -Seconds 2
    Invoke-N15Pass -Pass 2
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_TOPOGRAPHIC -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

Write-Output 'N15: deux processus reels, deux artefacts ecrits.'
