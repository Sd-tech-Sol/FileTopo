<#
.SYNOPSIS
    Runs the two passes of the L12 COMPOSED-VIEW REGRESSION (TASK-0024) against
    the real host, with a real
    close and a real restart between them.

.DESCRIPTION
    L12 has seventeen steps, and steps 15 and 16 say « fermer réellement » and
    « redémarrer réellement ». A restart cannot be faked from inside the page,
    so the criterion needs a driver outside it:

      pass 1  FILETOPO_AUTO_COMPOSED=1  steps L12.1 to L12.14
      close   the window is really closed, and the process really exits
      pass 2  FILETOPO_AUTO_COMPOSED=2  step  L12.17

    Each pass writes its own artefact under docs/performance/runs/, and the two
    stand on their own: the second proves nothing about the first except that
    the ACTIVE BRAIN survived it — and that the composition did NOT, which is
    the declared limit of this slice rather than a defect of it.

    L10 needs REAL Windows keystrokes: steps 3, 8, 13 and 14 are performed by
    keys the operating system delivers. This script therefore starts
    scripts/j12-send-real-key.ps1 alongside pass 1 — the same watcher, on the
    same marker convention, so there is one implementation of « a real key »
    and not three. The page prints `L12-KEY-READY`, which the watcher's default
    `-KEY-READY` already matches.

    Each invocation asks the application for a FRESH sandbox namespace —
    FILETOPO_SANDBOX_VARIANT, confined to <depot>/.filetopo-sandbox/variants/ —
    so step 7 can really approve S-005 instead of finding it already approved.
    The existing sandbox is NOT touched and the variant is NOT removed: nothing
    is deleted anywhere, which is what reserve X6 asks for.

    Nothing here touches the analysed trees, the repository beyond the run
    artefacts the application itself writes, or any user data. The only process
    it stops is the one it started.

.PARAMETER Executable
    The FileTopo binary to run. Defaults to the DEBUG build in the checkout.

    Debug, deliberately. `map_write_run_artifact` exists only in a debug build
    — a release build answers `run_artifacts_unavailable_in_release` — so a
    release binary cannot write the evidence L12 is for. Build it with:

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

# Reserve X6 — a FRESH sandbox namespace, and NOTHING deleted.
#
# L12 step 7 asks for an ACT: approve S-005 in Alpha, and confirm Gamma did not
# move. The development sandbox is persistent, so an earlier run had already
# approved it and the act could not happen again — the relations store refuses a
# second approval, which is X3 working, not a defect.
#
# Erasing the sandbox to get back to a pending S-005 would be a DESTRUCTION, and
# a stop point reserved to Sébastien. So nothing is erased: this run asks the
# application for a NEW namespace under the same directory, and the existing
# sandbox stays exactly as it is.
#
#   <depot>/.filetopo-sandbox/variants/<variant>
#
# A fresh namespace means a fresh catalogue, a fresh Alpha index and a fresh
# Alpha relations store — so S-005 is pending, and the approval is a real act.
# The variant is a NAME, never a path: the application validates it and refuses
# anything else. Both passes share the SAME variant, which is what lets pass 2
# find the brain pass 1 left active.
#
# The directory is deliberately NOT removed afterwards: the evidence needs no
# deletion, and a later invocation simply creates another variant.
$variant = 'task0022-l12-{0}-{1}' -f (Get-Date -Format 'yyyyMMddHHmmss'),
                                     ([guid]::NewGuid().ToString('N').Substring(0, 6))

# Reserve X5, held outside the application too.
#
# The application refuses to WRITE a verified task's evidence, at the gate in
# `write_run_artifact`. This script does not write artefacts — it DELETES stale
# ones before a pass, which is the same destruction by another route, and a
# gate the application holds says nothing about a script that reaches around it.
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

    $log = Join-Path $LogDirectory "filetopo-task0022-l12-$variant-pass$Pass.log"

    $artifact = Join-Path $runs "TASK-0025-L12-composed-view-regression-webview2-pass$Pass.json"
    $abandoned = Join-Path $runs "TASK-0025-L12-composed-view-regression-webview2-pass$Pass-abandon.json"
    foreach ($stale in @($artifact, $abandoned)) {
        # Only this script's own previous output for THIS pass, and only so a
        # stale file cannot be mistaken for a fresh result.
        Assert-NotProtectedRunArtifact -Path $stale
        if (Test-Path -LiteralPath $stale) { Remove-Item -LiteralPath $stale -Force }
    }

    Write-Host "L12: passe $Pass — demarrage, journal $log"
    $env:FILETOPO_AUTO_COMPOSED = "$Pass"
    $application = Start-Process -FilePath $Executable -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError "$log.err"

    $keys = $null
    if ($WithKeyWatcher) {
        # The page focuses a control and prints a marker; this sends the key
        # through the ordinary Windows input path. Without it, L10 fails —
        # and that is deliberate: it never falls back to a synthetic click.
        $keys = Start-Process -FilePath 'pwsh' -PassThru -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-File', $watcher,
                            '-LogPath', $log,
                            '-TimeoutSeconds', "$TimeoutSeconds")
    }

    $produced = Wait-ForArtifact -Path $artifact -AbandonPath $abandoned -Seconds $TimeoutSeconds
    if (-not $produced -and (Test-Path -LiteralPath $abandoned)) {
        Write-Host "L12: passe $Pass ABANDONNEE — voir $abandoned"
    }

    # Step 15 asks for the application to be really closed. The window is asked
    # to close first; the process is only stopped if it refuses, and it is the
    # process this script started.
    if (-not $application.HasExited) {
        $null = $application.CloseMainWindow()
        if (-not $application.WaitForExit(15000)) {
            Write-Host "L12: la fenetre n'a pas repondu, arret du processus demarre ici"
            Stop-Process -Id $application.Id -ErrorAction SilentlyContinue
        }
    }
    $application.WaitForExit()
    if ($null -ne $keys -and -not $keys.HasExited) {
        Stop-Process -Id $keys.Id -ErrorAction SilentlyContinue
    }
    Remove-Item Env:\FILETOPO_AUTO_COMPOSED -ErrorAction SilentlyContinue

    # Write-Host, not Write-Output: anything written to the output stream inside
    # a PowerShell function becomes part of its return value.
    Write-Host "L12: passe $Pass terminee, sortie $($application.ExitCode), artefact=$produced"
    return $produced
}

Write-Host "L12: bac a sable neuf, <depot>/.filetopo-sandbox/variants/$variant"
$env:FILETOPO_SANDBOX_VARIANT = $variant
try {
    $first = Invoke-Pass -Pass 1 -WithKeyWatcher
    if (-not $first) {
        throw 'L12: la passe 1 n a pas produit son artefact — rien n est prouve, et cela se publie tel quel'
    }

    # The restart is real: the first process has exited before this line. The
    # variant does NOT change across it — same sandbox, new process.
    Start-Sleep -Seconds 2
    $second = Invoke-Pass -Pass 2
    if (-not $second) {
        throw 'L12: la passe 2 n a pas produit son artefact apres le redemarrage'
    }
}
finally {
    # The variable leaves with the script, whatever happened. A later FileTopo
    # started by hand must find the ordinary sandbox, not this run's namespace.
    Remove-Item Env:\FILETOPO_SANDBOX_VARIANT -ErrorAction SilentlyContinue
}

Write-Output 'L12: les deux passes ont ecrit leur artefact sous docs/performance/runs/'
