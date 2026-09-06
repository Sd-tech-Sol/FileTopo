<# Runs ED15 in two real Tauri/WebView2 processes on one fresh synthetic variant. #>
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
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0026-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'
$variant = 'task0026-ed15-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                     ([guid]::NewGuid().ToString('N').Substring(0, 6))
. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')

$protectedHashes = @{}
foreach ($name in $script:ProtectedRunArtifacts) {
    $path = Join-Path $runs $name
    if (-not (Test-Path -LiteralPath $path)) { throw "preuve protegee absente: $name" }
    $protectedHashes[$name] = (git -C $repository hash-object -- $path).Trim()
}

function Wait-ForArtifact {
    param([string]$Path, [int]$Seconds)
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $Path) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Invoke-ED15Pass {
    param([int]$Pass)
    $artifact = Join-Path $runs "TASK-0026-ED15-exact-duplicate-explorer-webview2-pass$Pass.json"
    Assert-NotProtectedRunArtifact -Path $artifact
    if (Test-Path -LiteralPath $artifact) {
        throw "preuve ED15 deja presente; aucune suppression automatique: $artifact"
    }
    $log = Join-Path $LogDirectory "filetopo-$variant-ed15-pass$Pass.log"
    $env:FILETOPO_AUTO_ED15 = "$Pass"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
        -ArgumentList @('-NoProfile', '-File', $watcher,
                        '-LogPath', $log,
                        '-TimeoutSeconds', "$TimeoutSeconds")
    $produced = Wait-ForArtifact -Path $artifact -Seconds $TimeoutSeconds
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if (-not $keys.HasExited) { Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue }
    Remove-Item Env:\FILETOPO_AUTO_ED15 -ErrorAction SilentlyContinue
    if (-not $produced) { throw "ED15 passe $Pass sans artefact; journal: $log" }
    Write-Host "ED15 passe $Pass terminee; journal: $log"
}

$env:FILETOPO_SANDBOX_VARIANT = $variant
try {
    Write-Host "ED15 variante fraiche: <depot>/.filetopo-sandbox/variants/$variant"
    Invoke-ED15Pass -Pass 1
    Start-Sleep -Seconds 2
    Invoke-ED15Pass -Pass 2
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_ED15 -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

foreach ($name in $script:ProtectedRunArtifacts) {
    $path = Join-Path $runs $name
    $after = (git -C $repository hash-object -- $path).Trim()
    if ($after -ne $protectedHashes[$name]) { throw "preuve protegee modifiee: $name" }
}

Write-Output "ED15: deux processus reels fermes, meme variante $variant, X5 intact."
