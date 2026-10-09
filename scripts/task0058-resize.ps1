# TASK-0058 — resize a real Windows window so its CLIENT area is exactly the asked
# physical size, and report what Windows actually granted.
#
#   powershell -File scripts/task0058-resize.ps1 -ProcessId <pid> -ClientWidth <px> -ClientHeight <px>
#
# This is the only honest way to measure a responsive chrome: the window the person
# would drag is really that size, the engine lays out at that size, and the window
# manager is free to refuse — which is itself the measurement (`minWidth` 960 /
# `minHeight` 640 of `src-tauri/tauri.conf.json` are a real floor, not a claim).
#
# No emulation, no device metrics override: `Emulation.setDeviceMetricsOverride` would
# lie about the host. Nothing here reads or writes a file; it moves one window of one
# process this run started.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [Parameter(Mandatory = $true)][int]$ClientWidth,
    [Parameter(Mandatory = $true)][int]$ClientHeight,
    [int]$Left = 0,
    [int]$Top = 0
)

$ErrorActionPreference = 'Stop'

if (-not ('Task0058Window' -as [type])) {
    Add-Type -Namespace '' -Name 'Task0058Window' -MemberDefinition @'
[StructLayout(LayoutKind.Sequential)]
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

[DllImport("user32.dll", SetLastError = true)]
public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

[DllImport("user32.dll", SetLastError = true)]
public static extern bool GetClientRect(IntPtr hWnd, out RECT rect);

[DllImport("user32.dll", SetLastError = true)]
public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);

[DllImport("user32.dll")]
public static extern bool IsZoomed(IntPtr hWnd);

[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int command);
'@ | Out-Null
}

$handle = [IntPtr]::Zero
for ($attempt = 0; $attempt -lt 100; $attempt += 1) {
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    $process.Refresh()
    if ($process.MainWindowHandle -ne [IntPtr]::Zero) { $handle = $process.MainWindowHandle; break }
    Start-Sleep -Milliseconds 150
}
if ($handle -eq [IntPtr]::Zero) { throw "process $ProcessId has no main window" }

# A maximised window ignores an explicit size, so restore it first. SW_RESTORE = 9.
if ([Task0058Window]::IsZoomed($handle)) { [void][Task0058Window]::ShowWindow($handle, 9); Start-Sleep -Milliseconds 200 }

$window = New-Object Task0058Window+RECT
$client = New-Object Task0058Window+RECT
[void][Task0058Window]::GetWindowRect($handle, [ref]$window)
[void][Task0058Window]::GetClientRect($handle, [ref]$client)
$frameWidth = ($window.Right - $window.Left) - ($client.Right - $client.Left)
$frameHeight = ($window.Bottom - $window.Top) - ($client.Bottom - $client.Top)

# SWP_NOZORDER | SWP_NOACTIVATE
$flags = 0x0004 -bor 0x0010
[void][Task0058Window]::SetWindowPos($handle, [IntPtr]::Zero, $Left, $Top,
    $ClientWidth + $frameWidth, $ClientHeight + $frameHeight, $flags)
Start-Sleep -Milliseconds 350

[void][Task0058Window]::GetWindowRect($handle, [ref]$window)
[void][Task0058Window]::GetClientRect($handle, [ref]$client)
[ordered]@{
    askedClient = @($ClientWidth, $ClientHeight)
    grantedClient = @(($client.Right - $client.Left), ($client.Bottom - $client.Top))
    grantedWindow = @(($window.Right - $window.Left), ($window.Bottom - $window.Top))
    frame = @($frameWidth, $frameHeight)
    maximized = [Task0058Window]::IsZoomed($handle)
} | ConvertTo-Json -Compress
