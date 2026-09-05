<#
.SYNOPSIS
    Runs the two passes of K12 against the real host, with a real close and a
    real restart between them.

    Since TASK-0019 this is a REGRESSION REPLAY: the criterion is TASK-0018's,
    the artefacts belong to TASK-0019, and TASK-0018's own four proofs are
    protected — the guard below refuses to touch them.

.DESCRIPTION
    K12 step 11 says « la redémarrer ». A restart cannot be faked from inside
    the page, so the criterion needs a driver outside it:

      pass 1  FILETOPO_AUTO_BRAINS=1  steps K12.1 to K12.9
      close   the window is really closed, and the process really exits
      pass 2  FILETOPO_AUTO_BRAINS=2  steps K12.10 to K12.12

    The scenario now drives the COMPOSITION BAR: TASK-0019 replaced the single
    brain selector, so a switch is « add the wanted brain, remove the one being
    left », both by real keystrokes. The end state of each switch is unchanged:
    exactly one brain displayed, focused and active.

    Each pass writes its own artefact under docs/performance/runs/, and the
    two stand on their own: the second one proves nothing about the first
    except that the catalogue survived it.

    K10 also needs a REAL Windows keystroke. This script therefore starts
    scripts/j12-send-real-key.ps1 alongside pass 1 — the same watcher, on the
    same marker convention, so there is one implementation of « a real key »
    and not two.

    Nothing here touches the analysed trees, the repository beyond the run
    artefacts the application itself writes, or any user data. The only
    process it stops is the one it started.

.PARAMETER Executable
    The FileTopo binary to run. Defaults to the DEBUG build in the checkout.

    Debug, deliberately. `map_write_run_artifact` exists only in a debug build
    — a release build answers `run_artifacts_unavailable_in_release` — so a
    release binary cannot write the evidence K12 is for. The first attempt at
    this run used one and published nothing at all. Build it with:

        pnpm tauri build --debug --no-bundle

    which produces the same bundled front end as a release build, running on a
    binary that can still write its own evidence.

.PARAMETER LogDirectory
    Where the two run logs go. Defaults to the system temporary directory, so
    no log lands in the repository.

.PARAMETER TimeoutSeconds
    How long each pass may take before this script gives up and says so.
#>
[CmdletBinding()]
param(
    [string]$Executable,
    [string]$LogDirectory = $env:TEMP,
    [int]$TimeoutSeconds = 900
)

$ErrorActionPreference = 'Stop'

$repository = Split-Path -Parent $PSScriptRoot
if (-not $Executable) {
    $Executable = Join-Path $repository 'src-tauri/target/debug/filetopo.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) {
    throw "binaire introuvable: $Executable — construire d'abord: pnpm tauri build --debug --no-bundle"
}

$runs = Join-Path $repository 'docs/performance/runs'
$watcher = Join-Path $PSScriptRoot 'j12-send-real-key.ps1'

# Reserve X5, held outside the application too.
#
# The application refuses to WRITE a verified task's evidence, at the gate in
# `write_run_artifact`. This script does not write artefacts — it DELETES stale
# ones before a pass, which is the same destruction by another route. Until
# TASK-0019 it deleted `TASK-0018-K12-webview2-pass$Pass.json`, which
# ACTION-0029 turned into canonical evidence of a VERIFIED task. The names below
# are the fresh regression ones; the guard is what makes a future edit that
# points them back at a protected name fail loudly instead of quietly.
# The list lives in ONE place — scripts/protected-run-artifacts.ps1 — because it
# was previously copied into every script, and two spellings of one list
# eventually disagree. ACTION-0031 made TASK-0019 VERIFIED, so its six proofs
# joined: fourteen names, and this script touches none of them.
. (Join-Path $PSScriptRoot 'protected-run-artifacts.ps1')

# Waits for the pass to finish, either way. A pass that abandons writes its own
# artefact and says why; waiting the full timeout for a file that will never
# appear would turn a clear failure into a silent one.
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

    $log = Join-Path $LogDirectory "filetopo-k12-pass$Pass.log"
    if (Test-Path -LiteralPath $log) { Remove-Item -LiteralPath $log -Force }

    $artifact = Join-Path $runs "TASK-0025-K12-foundation-regression-webview2-pass$Pass.json"
    $abandoned = Join-Path $runs "TASK-0025-K12-foundation-regression-webview2-pass$Pass-abandon.json"
    foreach ($stale in @($artifact, $abandoned)) {
        # Only this script's own previous output for THIS pass, and only so a
        # stale file cannot be mistaken for a fresh result.
        Assert-NotProtectedRunArtifact -Path $stale
        if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale -Force }
    }

    Write-Host "K12: passe $Pass — demarrage, journal $log"
    $env:FILETOPO_AUTO_BRAINS = "$Pass"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"

    $keys = $null
    if ($WithKeyWatcher) {
        # The page focuses a control and prints a marker; this sends the key
        # through the ordinary Windows input path. Without it, K10 fails —
        # and that is deliberate: it never falls back to a synthetic click.
        $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-File', $watcher,
                            '-LogPath', $log,
                            '-TimeoutSeconds', "$TimeoutSeconds")
    }

    $produced = Wait-ForArtifact -Path $artifact -AbandonPath $abandoned -Seconds $TimeoutSeconds
    if (-not $produced -and (Test-Path -LiteralPath $abandoned)) {
        Write-Host "K12: passe $Pass ABANDONNEE — voir $abandoned"
    }

    # Step 10 asks for the application to be really closed. The window is asked
    # to close first; the process is only stopped if it refuses, and it is the
    # process this script started.
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Write-Host "K12: la fenetre n'a pas repondu, arret du processus demarre ici"
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if ($null -ne $keys -and -not $keys.HasExited) {
        Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue
    }
    Remove-Item Env:\FILETOPO_AUTO_BRAINS -ErrorAction SilentlyContinue

    # Write-Host, not Write-Output: anything written to the output stream inside
    # a PowerShell function becomes part of its return value, and the first
    # version of this script reported success because the progress lines made
    # the returned $false look like a non-empty array.
    Write-Host "K12: passe $Pass terminee, sortie $($application.ExitCode), artefact=$produced"
    return $produced
}

$first = Invoke-Pass -Pass 1 -WithKeyWatcher
if (-not $first) {
    throw 'K12: la passe 1 n a pas produit son artefact — rien n est prouve, et cela se publie tel quel'
}

# The restart is real: the first process has exited before this line.
Start-Sleep -Seconds 2
$second = Invoke-Pass -Pass 2
if (-not $second) {
    throw 'K12: la passe 2 n a pas produit son artefact apres le redemarrage'
}

Write-Output 'K12: les deux passes ont ecrit leur artefact sous docs/performance/runs/'
