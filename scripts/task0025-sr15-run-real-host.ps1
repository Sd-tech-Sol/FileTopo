<# Runs SR15 in two real Tauri/WebView2 processes on one fresh synthetic variant.

   Pass 1 decides — confirm, reject and postpone by real keystroke. Pass 2 is a
   genuinely new process on the same variant, so what it reads is what survived
   a restart rather than what is still in memory. #>
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
if (-not (Test-Path -LiteralPath $Executable)) { throw "binaire introuvable: $Executable" }
if (-not $LogDirectory) {
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0025-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'
$variant = 'task0025-sr15-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                      ([guid]::NewGuid().ToString('N').Substring(0, 6))
. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')

# Every protected proof, hashed before and after. The seal is not something the
# run is trusted to respect: it is measured on both sides of it.
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

function Invoke-SR15Pass {
    param([int]$Pass)
    $artifact = Join-Path $runs "TASK-0025-SR15-suggestion-review-memory-webview2-pass$Pass.json"
    Assert-NotProtectedRunArtifact -Path $artifact
    if (Test-Path -LiteralPath $artifact) {
        throw "preuve SR15 deja presente; aucune suppression automatique: $artifact"
    }
    $log = Join-Path $LogDirectory "filetopo-$variant-sr15-pass$Pass.log"
    $env:FILETOPO_AUTO_SR15 = "$Pass"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
        -ArgumentList @('-NoProfile', '-File', $watcher, '-LogPath', $log,
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
    Remove-Item Env:\FILETOPO_AUTO_SR15 -ErrorAction SilentlyContinue
    if (-not $produced) { throw "SR15 passe $Pass sans artefact; journal: $log" }
    Write-Host "SR15 passe $Pass terminee; journal: $log"
}

$env:FILETOPO_SANDBOX_VARIANT = $variant
try {
    Write-Host "SR15 variante fraiche: <depot>/.filetopo-sandbox/variants/$variant"
    Invoke-SR15Pass -Pass 1
    Start-Sleep -Seconds 2
    Invoke-SR15Pass -Pass 2
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_SR15 -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

foreach ($name in $script:ProtectedRunArtifacts) {
    $path = Join-Path $runs $name
    $after = (git -C $repository hash-object -- $path).Trim()
    if ($after -ne $protectedHashes[$name]) { throw "preuve protegee modifiee: $name" }
}

Write-Output "SR15: deux processus reels fermes, meme variante $variant, X5 intact."
