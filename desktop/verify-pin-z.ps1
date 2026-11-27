# Run only inside the interactive test desktop. The foreground fixture overlaps the sidebar.
param([Parameter(Mandatory)][ValidateSet('pinned','normal')] [string]$Mode)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class PinTestWindows {
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct Pt { public int X,Y; public Pt(int x,int y){X=x;Y=y;} }
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr w,out Rect r);
    [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr w,int index);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr w,uint flag);
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(Pt p);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr ctx);
}
'@
$null=[PinTestWindows]::SetThreadDpiAwarenessContext([IntPtr](-4))
$sidebar=Get-Process -Name yunqi-sidebar -ErrorAction Stop
if (@($sidebar).Count -ne 1) { throw 'Expected one sidebar in the isolated desktop' }
$window=$sidebar.MainWindowHandle
$r=New-Object PinTestWindows+Rect
if (![PinTestWindows]::GetWindowRect($window,[ref]$r)) { throw 'Cannot read sidebar bounds' }
$isTopmost=([PinTestWindows]::GetWindowLongPtr($window,-20).ToInt64() -band 8) -ne 0
if ($isTopmost -ne ($Mode -eq 'pinned')) { throw "Incorrect WS_EX_TOPMOST for $Mode" }
$rival=New-Object Windows.Forms.Form
try {
    $rival.Text='Foreground workstation fixture'
    $rival.FormBorderStyle='None'
    $rival.StartPosition='Manual'
    $rival.Bounds=New-Object Drawing.Rectangle ($r.Left-180),($r.Top+120),360,160
    $rival.Show()
    [Windows.Forms.Application]::DoEvents()
    $null=[PinTestWindows]::SetCursorPos($r.Left-80,$r.Top+180)
    [PinTestWindows]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
    [PinTestWindows]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
    for ($i=0; $i -lt 10; $i++) {
        [Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 50
    }
    if ([PinTestWindows]::GetForegroundWindow() -ne $rival.Handle) { throw 'Foreground fixture did not gain focus' }
    $overlap=[PinTestWindows+Pt]::new($r.Left+80,$r.Top+180)
    $front=[PinTestWindows]::GetAncestor([PinTestWindows]::WindowFromPoint($overlap),2)
    $expected=if($isTopmost){$window}else{$rival.Handle}
    if($front -ne $expected){throw "Unexpected window at overlap in $Mode mode: $front, expected $expected"}
    Write-Output "PASS $Mode (WS_EX_TOPMOST=$isTopmost, foreground=fixture, overlap verified)"
} finally { $rival.Close(); $rival.Dispose() }
