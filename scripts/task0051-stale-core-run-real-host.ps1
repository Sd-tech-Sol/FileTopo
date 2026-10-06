<# TASK-0051 corrective (ACTION-0093): revocation of a core APPROVED relation
   while the engine is STALE, in one real Tauri/WebView2 process.

   Replays the DR15 scenario up to the keyboard approval (FILETOPO_AUTO_DRE=3),
   then makes the engine STALE without a rerun, revokes with a real Enter, and
   reruns explicitly. The intermediate artifact is merged into
   docs/performance/runs/TASK-0051-webview2.json under `staleCoreRevocation`
   and removed. Run after `pnpm build` and `pnpm tauri build --debug --no-bundle`. #>
[CmdletBinding()]
param(
    [string]$Executable,
    [string]$LogDirectory,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'
$repository = Split-Path -Parent $PSScriptRoot
if (-not $Executable) { $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe' }
if (-not (Test-Path -LiteralPath $Executable)) { throw "binaire introuvable: $Executable" }
if (-not $LogDirectory) { $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0051-stale-logs' }
$null = New-Item -ItemType Directory -Path $LogDirectory -Force

$head = (git -C $repository rev-parse HEAD).Trim()
$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'
$variant = 'task0051-stale-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                       ([guid]::NewGuid().ToString('N').Substring(0, 6))
$intermediate = Join-Path $runs 'TASK-0026-DR15-deterministic-relation-engine-webview2-pass3.json'
if (Test-Path -LiteralPath $intermediate) { throw "artefact intermediaire deja present: $intermediate" }
$final = Join-Path $runs 'TASK-0051-webview2.json'
if (-not (Test-Path -LiteralPath $final)) { throw 'TASK-0051-webview2.json absent' }

$log = Join-Path $LogDirectory "filetopo-$variant.log"
$env:FILETOPO_SANDBOX_VARIANT = $variant
$env:FILETOPO_AUTO_DRE = '3'
try {
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
        -ArgumentList @('-NoProfile', '-File', $watcher, '-LogPath', $log,
                        '-TimeoutSeconds', "$TimeoutSeconds")
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while (-not (Test-Path -LiteralPath $intermediate) -and (Get-Date) -lt $deadline) {
        if ((Test-Path -LiteralPath $log) -and
            (Select-String -LiteralPath $log -Pattern 'DR15 passe 3 interrompue' -Quiet)) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) { Stop-Process -Id $application.Id -ErrorAction SilentlyContinue }
    }
    $application.WaitForExit()
    if (-not $keys.HasExited) { Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue }
}
finally {
    Remove-Item Env:\FILETOPO_AUTO_DRE -ErrorAction SilentlyContinue
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}
if (-not (Test-Path -LiteralPath $intermediate)) { throw "scenario sans artefact; journal: $log" }

$evidence = (Get-Content -LiteralPath $intermediate -Raw | ConvertFrom-Json).evidence.staleCoreRevocation
if (-not $evidence) { throw 'staleCoreRevocation absent de l artefact' }
$proof = Get-Content -LiteralPath $final -Raw | ConvertFrom-Json
$proof | Add-Member -NotePropertyName staleCoreRevocationHeadTested -NotePropertyValue $head -Force
$proof | Add-Member -NotePropertyName staleCoreRevocation -NotePropertyValue $evidence -Force
Set-Content -LiteralPath $final -Value ($proof | ConvertTo-Json -Depth 40) -Encoding utf8
Remove-Item -LiteralPath $intermediate
Write-Output "TASK-0051 stale-core revocation: real WebView2 proof PASS; merged into $final (variant $variant)"
