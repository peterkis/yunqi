# Run on the interactive, isolated test desktop. All drags go through the real title bar.
param([Parameter(Mandatory)][ValidateSet('Dock','Undock','Restored','Disabled','Hover','WaitHidden','WaitVisible','MovePinned','MovedVisible')] [string]$Phase)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class FloatCheck {
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int L,T,R,B;}
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint action,uint n,out Rect r,uint flags);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
}
'@
$null=[FloatCheck]::SetThreadDpiAwarenessContext([IntPtr](-4))
$work=New-Object FloatCheck+Rect
if(![FloatCheck]::SystemParametersInfo(48,0,[ref]$work,0)){throw 'No work area'}
$exe = if ($env:YUNQI_TEST_EXE) { (Resolve-Path $env:YUNQI_TEST_EXE).Path } else { (Resolve-Path (Join-Path $PSScriptRoot 'src-tauri/target/release/yunqi-sidebar.exe')).Path }
$end=(Get-Date).AddSeconds(25)
do {
    $p=Get-Process -Name yunqi-sidebar -ErrorAction SilentlyContinue | Where-Object Path -eq $exe
    if($p){$window=$p.MainWindowHandle}
    if(!$window -or $window -eq [IntPtr]::Zero){Start-Sleep -Milliseconds 150}
} while((!$window -or $window -eq [IntPtr]::Zero) -and (Get-Date) -lt $end)
if(!$window -or $window -eq [IntPtr]::Zero){throw 'Missing test window'}
$dpi=[FloatCheck]::GetDpiForWindow($window)
function Px([int]$dip){[int][Math]::Round($dip*$dpi/96)}
function Rect {
    $r=New-Object FloatCheck+Rect
    if(![FloatCheck]::GetWindowRect($window,[ref]$r)){throw 'Cannot read window'}
    return $r
}
function Wait-Geometry([string]$name,[scriptblock]$condition) {
    $end=(Get-Date).AddSeconds(5)
    do {$r=Rect; if (& $condition $r){Write-Output ("PASS {0} @ {1},{2} {3}x{4}" -f $name,$r.L,$r.T,($r.R-$r.L),($r.B-$r.T));return};Start-Sleep -Milliseconds 80}while((Get-Date) -lt $end)
    throw ("Unexpected {0}: {1},{2},{3},{4}" -f $name,$r.L,$r.T,$r.R,$r.B)
}
function Pointer([int]$x,[int]$y){if(![FloatCheck]::SetCursorPos($x,$y)){throw 'Cannot move test pointer'}}
function Drag-Title([int]$x,[int]$y) {
    $r=Rect
    $dx=Px 88; $dy=Px 20
    Pointer ($r.L+$dx) ($r.T+$dy)
    Start-Sleep -Milliseconds 180
    [FloatCheck]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
    try {
        Start-Sleep -Milliseconds 250
        for($i=1;$i -le 20;$i++){
            Pointer ([int]($r.L+$dx+($x-$r.L)*$i/20)) ([int]($r.T+$dy+($y-$r.T)*$i/20))
            Start-Sleep -Milliseconds 20
        }
    } finally {[FloatCheck]::mouse_event(4,0,0,0,[UIntPtr]::Zero)}
    Start-Sleep -Milliseconds 200
}
function Away { Pointer ($work.L+18) ($work.B-40) }
$freeX=$work.L+(Px 115)
$freeY=$work.T+(Px 62)
$dockX=$work.L+(Px 310)
$droppedX=$work.L+(Px 195)
$droppedY=$work.T+(Px 94)
if($Phase -eq 'Hover'){
    $r=Rect;Pointer ($r.L+(Px 60)) ($work.T+2)
    Wait-Geometry 'hover expanded' {param($r) ($r.B-$r.T) -gt (Px 350)}
    Pointer ($r.L+(Px 60)) ($work.T+(Px 32));exit
}
if($Phase -eq 'WaitHidden'){
    Away
    Wait-Geometry 'outside folded to strip' {param($r) ($r.B-$r.T) -eq (Px 6)};exit
}
if($Phase -eq 'MovePinned'){Drag-Title $droppedX $droppedY}
if($Phase -in @('WaitVisible','MovePinned','MovedVisible')){
    Away;Start-Sleep -Milliseconds 1000
    $r=Rect
    if(($r.B-$r.T) -lt (Px 350)){throw 'Panel folded after mouse exit'}
    if($Phase -ne 'WaitVisible' -and ([Math]::Abs($r.L-$droppedX) -gt 3 -or [Math]::Abs($r.T-$droppedY) -gt 3)){throw 'Panel did not retain its dragged position'}
    Write-Output "PASS visible at $($r.L),$($r.T) after 1000ms outside";exit
}
if($Phase -eq 'Disabled') {
    Drag-Title $dockX ($work.T+2)
    Away
    Start-Sleep -Milliseconds 1100
    Wait-Geometry 'automatic hiding disabled at top edge' {param($r) [Math]::Abs($r.L-$dockX) -le 3 -and $r.T -le $work.T+5 -and ($r.B-$r.T) -gt (Px 350)}
    Drag-Title $droppedX $droppedY
    exit
}
if($Phase -eq 'Dock') {
    Drag-Title $freeX $freeY
    Away
    Start-Sleep -Milliseconds 900
    Wait-Geometry 'free placement' {param($r) [Math]::Abs($r.L-$freeX) -le 3 -and [Math]::Abs($r.T-$freeY) -le 3 -and ($r.B-$r.T) -gt (Px 350)}
    Drag-Title $dockX ($work.T+2)
}
if($Phase -ne 'Restored') {
    Away
    Wait-Geometry 'top-edge strip' {param($r) [Math]::Abs($r.L-$dockX) -le 3 -and $r.T -eq $work.T -and ($r.B-$r.T) -eq (Px 6)}
    if($Phase -eq 'Dock' -and $env:YUNQI_TEST_EVIDENCE) {
        Add-Type -AssemblyName System.Drawing
        $r=Rect
        $shot=New-Object Drawing.Bitmap (($r.R-$r.L)+32),50
        $g=[Drawing.Graphics]::FromImage($shot)
        try {
            Start-Sleep -Milliseconds 250
            $g.CopyFromScreen($r.L-16,$r.T,0,0,$shot.Size)
            $shot.Save((Join-Path $env:YUNQI_TEST_EVIDENCE 'top-edge.png'))
        } finally { $g.Dispose(); $shot.Dispose() }
    }
    # Focus the bare desktop outside the app before hovering the strip.
    [FloatCheck]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
    [FloatCheck]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
    Start-Sleep -Milliseconds 150
    $prior=[FloatCheck]::GetForegroundWindow()
    Pointer ($dockX+(Px 70)) ($work.T+2)
    Wait-Geometry 'hover revealed' {param($r) $r.T -eq $work.T -and ($r.B-$r.T) -gt (Px 350)}
    Pointer ($dockX+(Px 100)) ($work.T+(Px 200))
    Start-Sleep -Milliseconds 800
    if([FloatCheck]::GetForegroundWindow() -ne $prior){throw 'Hover changed keyboard focus'}
    if(((Rect).B-(Rect).T) -le (Px 350)){throw 'Window folded while hovered'}
    if($Phase -eq 'Dock'){
        Away
        Wait-Geometry 'left and folded again' {param($r) ($r.B-$r.T) -eq (Px 6)}
    }else{
        Drag-Title $droppedX $droppedY
    }
}
if($Phase -ne 'Dock') {
    Away
    Start-Sleep -Milliseconds 1000
    Wait-Geometry 'detached position' {param($r) [Math]::Abs($r.L-$droppedX) -le 3 -and [Math]::Abs($r.T-$droppedY) -le 3 -and ($r.B-$r.T) -gt (Px 350)}
}
