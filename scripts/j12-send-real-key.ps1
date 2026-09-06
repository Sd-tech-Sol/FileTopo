<#
.SYNOPSIS
    Sends a REAL Windows keystroke to the FileTopo window when the running
    J12 scenario asks for one. Reserve X4 of the independent control.

.DESCRIPTION
    The J12 scenario cannot prove a genuine key activation from inside the
    page: a script can only dispatch a synthetic event, and a synthetic event
    carries `isTrusted === false`. So the page focuses the control, prints a
    marker on the host's standard output, and waits.

    This watcher reads that output, brings the FileTopo window to the
    foreground and sends the requested key through WScript.Shell, which goes
    through the ordinary Windows input path. The page then observes a click
    whose `isTrusted` is true, and records it.

    No new dependency: WScript.Shell ships with Windows.

    Nothing here touches the analysed tree, the repository, or any user data.
    It reads one log file and sends one keystroke per marker.

.PARAMETER LogPath
    File the application's standard output is redirected to.

.PARAMETER TimeoutSeconds
    How long to keep watching. The watcher exits on its own afterwards.

.PARAMETER Marker
    Substring the page prints when it wants a key. The default matches both
    `J12-KEY-READY` and `K12-KEY-READY`, so a scenario can name its own
    criterion without this watcher having to know it. TASK-0018 needs the same
    real keystroke for `K10`, and duplicating the watcher would have meant two
    versions of one guarantee.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$LogPath,
    [int]$TimeoutSeconds = 600,
    [string]$Marker = '-KEY-READY'
)

$ErrorActionPreference = 'Stop'
$marker = $Marker
$shell = New-Object -ComObject WScript.Shell
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FileTopoWindowActivation {
    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr window, bool altTab);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
'@
$handled = 0
$sent = 0
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

Write-Output "watcher: en attente de '$marker' dans $LogPath"

while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $LogPath) {
        $lines = @(Select-String -LiteralPath $LogPath -SimpleMatch $marker -ErrorAction SilentlyContinue)
        while ($handled -lt $lines.Count) {
            $line = $lines[$handled].Line
            # The marker names the key it wants, so the page decides and the
            # watcher never guesses.
            $key = if ($line -match 'key=(\S+)') { $Matches[1] } else { '{ENTER}' }
            $foregroundReady = $false

            # Let the page finish focusing before the window changes.
            Start-Sleep -Milliseconds 500
            $process = Get-Process -Name 'filetopo' -ErrorAction SilentlyContinue |
                Sort-Object -Property StartTime -Descending |
                Select-Object -First 1
            if ($null -ne $process) {
                $activated = $false
                for ($attempt = 1; $attempt -le 10 -and -not $foregroundReady; $attempt++) {
                    [FileTopoWindowActivation]::SwitchToThisWindow(
                        $process.MainWindowHandle,
                        $true
                    )
                    $activated = $shell.AppActivate($process.Id)
                    Start-Sleep -Milliseconds 250
                    $foregroundReady =
                        [FileTopoWindowActivation]::GetForegroundWindow() -eq
                        $process.MainWindowHandle
                }
                Write-Output (
                    "watcher: AppActivate=$activated foreground=$foregroundReady " +
                    "pid=$($process.Id) tentatives=$attempt"
                )
                # WebView2 can finish a React commit immediately after the
                # marker. Keep the window foregrounded long enough for focus
                # to settle on the replacement control before injecting input.
                Start-Sleep -Milliseconds 500
            }
            else {
                Write-Output 'watcher: aucun processus filetopo a activer'
            }
            if ($foregroundReady) {
                $shell.SendKeys($key)
                Write-Output "watcher: frappe reelle $key envoyee (marqueur $($handled + 1))"
                $sent++
                $handled++
            }
            else {
                Write-Output "watcher: frappe $key differee sans premier plan FileTopo"
                Start-Sleep -Seconds 1
                break
            }
        }
    }
    Start-Sleep -Milliseconds 200
}

Write-Output "watcher: termine, $sent frappe(s) envoyee(s), $handled marqueur(s) traite(s)"
