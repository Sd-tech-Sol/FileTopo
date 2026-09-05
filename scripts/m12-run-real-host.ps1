<#
.SYNOPSIS
    Runs the two passes of M12 (TASK-0024 regression — inter-brain relations) against the
    real host, with a real close and a real restart between them.

.DESCRIPTION
    M12 has twenty-eight steps, and step 23 says « fermer réellement ». A
    restart cannot be faked from inside the page, so the criterion needs a
    driver outside it:

      pass 1  FILETOPO_AUTO_CROSS=1   steps M12.1 to M12.22
      close   the window is really closed, and the process really exits
      pass 2  FILETOPO_AUTO_CROSS=2   steps M12.24 to M12.28

    Each pass writes its own artefact under docs/performance/runs/, and the two
    stand on their own: the second proves that the COMMON inter-brain store
    survived a real restart, that XB-S01 is still APPROVED, and that the six
    deterministic relations came back identical — and that NO multi-brain
    composition persisted, which is the declared limit of this slice (P-19)
    rather than a defect of it.

    Steps 3, 7, 11, 16 and 18 need REAL Windows keystrokes: adding a brain,
    following a relation, approving a suggestion and bringing an absent brain
    into the view are all performed by keys the operating system delivers. This
    script therefore starts scripts/j12-send-real-key.ps1 alongside pass 1 —
    the same watcher, on the same marker convention, so there is one
    implementation of « a real key » and not four. The page prints
    `M12-KEY-READY`, which the watcher's default `-KEY-READY` already matches.

    Each invocation asks the application for a FRESH sandbox namespace —
    FILETOPO_SANDBOX_VARIANT, confined to <depot>/.filetopo-sandbox/variants/ —
    so step 11 can really approve XB-S01 instead of finding it already
    approved. The existing sandbox is NOT touched and the variant is NOT
    removed: nothing is deleted anywhere.

    Nothing here touches the analysed trees, the repository beyond the run
    artefacts the application itself writes, or any user data. The only process
    it stops is the one it started.

.PARAMETER Executable
    The FileTopo binary to run. Defaults to the DEBUG build in the checkout.

    Debug, deliberately. `map_write_run_artifact` exists only in a debug build
    — a release build answers `run_artifacts_unavailable_in_release` — so a
    release binary cannot write the evidence M12 is for. Build it with:

        pnpm tauri build --debug --no-bundle

.PARAMETER LogDirectory
    Where the two run logs go. Defaults to the system temporary directory, so
    no log lands in the repository.

.PARAMETER TimeoutSeconds
    How long each pass may take before this script gives up and says so.
#>
[CmdletBinding()]
param(
    [string]$Executable,
    [string]$LogDirectory,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'

$repository = Split-Path -Parent $PSScriptRoot
if (-not $LogDirectory) {
    $LogDirectory = Join-Path $repository '.filetopo-sandbox/task0022-logs'
}
$null = New-Item -ItemType Directory -Path $LogDirectory -Force
if (-not $Executable) {
    $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) {
    throw "binaire introuvable: $Executable — construire d'abord: pnpm tauri build --debug --no-bundle"
}

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'

# A FRESH sandbox namespace, and NOTHING deleted.
#
# M12 step 11 asks for an ACT: approve XB-S01, and observe the counts move by
# exactly one. The development sandbox is persistent, so a previous run would
# already have approved it and the act could not happen again — the store
# refuses a second approval, which is the model working, not a defect.
#
# Erasing the sandbox to get back to a pending XB-S01 would be a DESTRUCTION,
# and a stop point reserved to Sébastien. So nothing is erased: this run asks
# the application for a NEW namespace under the same directory.
#
#   <depot>/.filetopo-sandbox/variants/<variant>
#
# Both passes share the SAME variant, which is what lets pass 2 find the common
# store pass 1 wrote. The directory is deliberately NOT removed afterwards.
$variant = 'task0022-m12-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                     ([guid]::NewGuid().ToString('N').Substring(0, 6))

# Reserve X5, held outside the application too. The list lives in ONE place —
# scripts/protected-run-artifacts.ps1 — and this script deletes only its own
# previous output for the pass it is about to run.
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

function Invoke-Pass {
    param([int]$Pass, [switch]$WithKeyWatcher)

    $log = Join-Path $LogDirectory "filetopo-task0022-m12-$variant-pass$Pass.log"

    $artifact = Join-Path $runs "TASK-0025-M12-interbrain-relations-regression-webview2-pass$Pass.json"
    $abandoned = Join-Path $runs "TASK-0025-M12-interbrain-relations-regression-webview2-pass$Pass-abandon.json"
    foreach ($stale in @($artifact, $abandoned)) {
        Assert-NotProtectedRunArtifact -Path $stale
        if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale -Force }
    }

    Write-Host "M12: passe $Pass — demarrage, journal $log"
    $env:FILETOPO_AUTO_CROSS = "$Pass"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"

    $keys = $null
    if ($WithKeyWatcher) {
        # The page focuses a control and prints a marker; this sends the key
        # through the ordinary Windows input path. Without it the pass fails —
        # and that is deliberate: it never falls back to a synthetic click.
        $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-File', $watcher,
                            '-LogPath', $log,
                            '-TimeoutSeconds', "$TimeoutSeconds")
    }

    $produced = Wait-ForArtifact -Path $artifact -AbandonPath $abandoned -Seconds $TimeoutSeconds
    if (-not $produced -and (Test-Path -LiteralPath $abandoned)) {
        Write-Host "M12: passe $Pass ABANDONNEE — voir $abandoned"
    }

    # Step 23 asks for the application to be really closed. The window is asked
    # to close first; the process is only stopped if it refuses, and it is the
    # process this script started.
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Write-Host "M12: la fenetre n'a pas repondu, arret du processus demarre ici"
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if ($null -ne $keys -and -not $keys.HasExited) {
        Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue
    }
    Remove-Item Env:\FILETOPO_AUTO_CROSS -ErrorAction SilentlyContinue

    Write-Host "M12: passe $Pass terminee, sortie $($application.ExitCode), artefact=$produced"
    return $produced
}

Write-Host "M12: bac a sable neuf, <depot>/.filetopo-sandbox/variants/$variant"
$env:FILETOPO_SANDBOX_VARIANT = $variant
try {
    $first = Invoke-Pass -Pass 1 -WithKeyWatcher
    if (-not $first) {
        throw 'M12: la passe 1 n a pas produit son artefact — rien n est prouve, et cela se publie tel quel'
    }

    # The restart is real: the first process has exited before this line. The
    # variant does NOT change across it — same sandbox, new process.
    Start-Sleep -Seconds 2
    $second = Invoke-Pass -Pass 2
    if (-not $second) {
        throw 'M12: la passe 2 n a pas produit son artefact apres le redemarrage'
    }
}
finally {
    # The variable leaves with the script, whatever happened. A later FileTopo
    # started by hand must find the ordinary sandbox, not this run's namespace.
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

Write-Output 'M12: les deux passes ont ecrit leur artefact sous docs/performance/runs/'
