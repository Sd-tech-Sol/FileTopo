<# Runs the TASK-0022 read-only/isolation regression in one real host. #>
[CmdletBinding()]
param(
    [string]$Executable,
    [string]$LogDirectory,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
if (-not $Executable) {
    $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) { throw "binaire introuvable: $Executable" }
if (-not $LogDirectory) {
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0022-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force

$runs = Join-Path $repository 'docs/performance/runs'
$artifact = Join-Path $runs 'TASK-0026-K11-readonly-isolation-regression-webview2.json'
$variant = 'task0022-k11-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                      ([guid]::NewGuid().ToString('N').Substring(0, 6))
$log = Join-Path $LogDirectory "filetopo-$variant-k11.log"
. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')
Assert-NotProtectedRunArtifact -Path $artifact
if (Test-Path -LiteralPath $artifact) { Remove-Item -LiteralPath $artifact -Force }

$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:FILETOPO_AUTO_VERIFY = '1'
try {
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline -and -not (Test-Path -LiteralPath $artifact)) {
        Start-Sleep -Milliseconds 500
    }
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if (-not (Test-Path -LiteralPath $artifact)) {
        throw "K11 sans artefact; journal: $log"
    }
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_VERIFY -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

Write-Output 'K11: artefact read-only/isolation ecrit.'
