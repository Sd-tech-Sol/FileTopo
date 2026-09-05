<#
.SYNOPSIS
    Reserve X11 — the deterministic relation engine, proved generic on
    brain-beta in one real Tauri/WebView2 process.

.DESCRIPTION
    DR15 proved dre-v1 on brain-alpha, which reads the frozen `quasi-empty`
    fixture. X11 asks the other question: does the engine work on a brain the
    legacy TASK-0017 slice never covered? brain-beta reads `deep`, so it is the
    catalogue's own counter-example.

    One process, one fresh variant. The keystroke is a REAL Windows keystroke,
    sent by the same watcher DR15 and J12 use; the scenario never falls back to
    a programmatic click.

    The artefact this writes is a CORRECTIVE proof. It joins neither X5 nor the
    three frozen TASK-0024 proofs, and replaces none of them. The 29 protected
    artefacts are hashed before and after, and any change is fatal.
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
if (-not (Test-Path -LiteralPath $Executable)) { throw "binaire introuvable: $Executable" }
if (-not $LogDirectory) {
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0024-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'
$variant = 'task0024-x11-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
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

$artifact = Join-Path $runs 'TASK-0024-X11-generic-brain-webview2.json'
Assert-NotProtectedRunArtifact -Path $artifact
# The corrective proof is a single scenario in a single process, so a replay
# rewrites it. It is removed here rather than by the application, which never
# deletes an artefact.
if (Test-Path -LiteralPath $artifact) { Remove-Item -LiteralPath $artifact -Force }

$log = Join-Path $LogDirectory "filetopo-$variant-x11.log"
$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:FILETOPO_AUTO_X11 = '1'
try {
    Write-Host "X11 variante fraiche: <depot>/.filetopo-sandbox/variants/$variant"
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
    if (-not $produced) { throw "X11 sans artefact; journal: $log" }
    Write-Host "X11 terminee; journal: $log"
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_X11 -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

foreach ($name in $script:ProtectedRunArtifacts) {
    $path = Join-Path $runs $name
    $after = (git -C $repository hash-object -- $path).Trim()
    if ($after -ne $protectedHashes[$name]) { throw "preuve protegee modifiee: $name" }
}

Write-Output "X11: un processus reel ferme, variante $variant, X5 intact."
