# Only for the interactive, isolated Windows test desktop.
param([Parameter(Mandatory)][ValidateSet('Legacy','Upgrade','Default','Restore','RestoreEdge','Colors')][string]$Phase)
$ErrorActionPreference='Stop'
$out=$env:YUNQI_TEST_EVIDENCE
$exe = if ($env:YUNQI_TEST_EXE) { (Resolve-Path $env:YUNQI_TEST_EXE).Path } else { (Resolve-Path (Join-Path $PSScriptRoot 'src-tauri/target/release/yunqi-sidebar.exe')).Path }
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;
public static class Probe {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int L,T,R,B; public int W{get{return R-L;}}public int H{get{return B-T;}} }
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint a,uint n,out Rect r,uint f);
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint dx,uint dy,uint data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 public static Rect Bounds(IntPtr h){Rect r;if(!GetWindowRect(h,out r))throw new Exception("No window");return r;}
 public static Rect Work(){Rect r;if(!SystemParametersInfo(48,0,out r,0))throw new Exception("No work area");return r;}
 public static void Drag(int x,int y,int endX,int endY){
   SetCursorPos(x,y);Thread.Sleep(120);mouse_event(2,0,0,0,UIntPtr.Zero);
   try{Thread.Sleep(250);for(int i=1;i<=18;i++){SetCursorPos(x+(endX-x)*i/18,y+(endY-y)*i/18);Thread.Sleep(16);}}finally{mouse_event(4,0,0,0,UIntPtr.Zero);}
   Thread.Sleep(220);
 }
 public static double Sample(IntPtr hwnd,int outsideX,int outsideY,int strip,bool click){
   var sw=Stopwatch.StartNew();
   SetCursorPos(outsideX,outsideY);
   if(click)mouse_event(2,0,0,0,UIntPtr.Zero);
   try {
     while(sw.ElapsedMilliseconds<1600){if(Bounds(hwnd).H==strip)return sw.Elapsed.TotalMilliseconds;Application.DoEvents();Thread.Sleep(1);}
     throw new Exception("Fold deadline missed");
   }finally{if(click)mouse_event(4,0,0,0,UIntPtr.Zero);}
 }
}
'@
$null=[Probe]::SetThreadDpiAwarenessContext([IntPtr](-4))
function Ui($op,$argPath){ & (Get-Command node.exe -ErrorAction Stop).Source "$PSScriptRoot\verify-window-geometry.cjs" $op $argPath; if($LASTEXITCODE){throw "WebView check failed: $op"} }
if($Phase -ne 'RestoreEdge'){Ui ready}
$end=(Get-Date).AddSeconds(20)
do {
 $proc=Get-Process -Name yunqi-sidebar -ErrorAction SilentlyContinue | Where-Object Path -eq $exe
 if(!$proc -or !$proc.MainWindowHandle.ToInt64()){ Start-Sleep -Milliseconds 100 }
}while((!$proc -or !$proc.MainWindowHandle.ToInt64()) -and (Get-Date) -lt $end)
$hwnd=$proc.MainWindowHandle
$work=[Probe]::Work()
$dpi=[Probe]::GetDpiForWindow($hwnd)
function Px([int]$dip){[int][Math]::Round($dip*$dpi/96)}
function Bounds { [Probe]::Bounds($hwnd) }
function Require([bool]$ok,[string]$message){if(!$ok){throw $message};Write-Output "PASS $message"}
function MovePointer([int]$x,[int]$y){$null=[Probe]::SetCursorPos($x,$y)}
function DragTitle([int]$x,[int]$y){$r=Bounds;$dx=Px 80;$dy=Px 20;[Probe]::Drag($r.L+$dx,$r.T+$dy,$x+$dx,$y+$dy)}
function DragPill([int]$x,[int]$y){$r=Bounds;$dx=Px 5;$dy=Px 28;[Probe]::Drag($r.L+$dx,$r.T+$dy,$x+$dx,$y+$dy)}
function Resize([int]$height){$r=Bounds;$x=$r.L+[int]($r.W/2);$y=$r.B-(Px 3);[Probe]::Drag($x,$y,$x,$y+$height-$r.H)}
function WaitState([bool]$hidden){
 $until=(Get-Date).AddSeconds(4)
 do{if(((Bounds).H -eq (Px 6)) -eq $hidden){return};[Windows.Forms.Application]::DoEvents();Start-Sleep -Milliseconds 8}while((Get-Date) -lt $until)
 throw "Window did not reach hidden=$hidden"
}
function Enter { $r=Bounds;MovePointer ($r.L+(Px 30)) ($work.T+2);WaitState $false; MovePointer ($r.L+(Px 40)) ($work.T+(Px 45));Start-Sleep -Milliseconds 90 }
function Leave { MovePointer ($work.L+(Px 20)) ($work.T+(Px 55));WaitState $true }
function Picture($tag,$theme,$bg,$requireClean){
 Enter; Ui $theme
 $r=Bounds;$fixture=New-Object Windows.Forms.Form
 try{
   $fixture.FormBorderStyle='None';$fixture.StartPosition='Manual';$fixture.BackColor=$bg;$fixture.ShowInTaskbar=$false
   $fixture.Bounds=[Drawing.Rectangle]::new($work.L,$work.T,($r.R-$work.L+20),(Px 100))
   $fixture.Show();[Windows.Forms.Application]::DoEvents()
   Leave
   $r=Bounds;Start-Sleep -Milliseconds 200
   $bmp=[Drawing.Bitmap]::new($r.W+20,$r.H+8)
   $g=[Drawing.Graphics]::FromImage($bmp)
   try {
      $g.CopyFromScreen($r.L-10,$r.T,0,0,$bmp.Size)
      $bmp.Save("$out\$tag-$theme.png")
      $accent=$bmp.GetPixel(10+[int]($r.W/2),1)
      $outside=$bmp.GetPixel(3,$r.H-1)
      $left=$bmp.GetPixel(10,$r.H-1);$right=$bmp.GetPixel(9+$r.W,$r.H-1)
      Write-Output "$tag $theme desktop=$($outside.Name) left=$($left.Name) right=$($right.Name) center=$($accent.Name)"
      if($requireClean){
        Require ($bg.ToArgb() -eq $outside.ToArgb()) 'reference backdrop present'
        $wanted=if($theme -eq 'light'){[Drawing.ColorTranslator]::FromHtml('#2e5b4f')}else{[Drawing.ColorTranslator]::FromHtml('#7fb3a2')}
        Require ($wanted.ToArgb() -eq $accent.ToArgb()) 'solid native strip matches theme'
        foreach($corner in @($left,$right)){
           foreach($ch in @('R','G','B')){if([Math]::Abs($corner.$ch-$outside.$ch) -gt 4){throw "Opaque corner [$theme]: $($corner.Name)"}}
        }
        for($y=0;$y -lt $r.H;$y++){for($x=10;$x -lt 10+$r.W;$x++){
           $p=$bmp.GetPixel($x,$y)
           foreach($ch in @('R','G','B')){
             if($p.$ch -lt [Math]::Min($outside.$ch,$accent.$ch)-4 -or $p.$ch -gt [Math]::Max($outside.$ch,$accent.$ch)+4){throw "Foreign pixel ($x,$y): $($p.Name)"}
           }
        }}
        Write-Output "PASS all $($r.W*$r.H) native strip pixels on $theme backdrop"
      }
   }finally{$g.Dispose();$bmp.Dispose()}
 }finally{$fixture.Close();$fixture.Dispose()}
}
$darkBg=[Drawing.Color]::FromArgb(42,30,78)
$brightBg=[Drawing.Color]::FromArgb(215,188,228)
if($Phase -eq 'Colors'){
 DragTitle ($work.L+(Px 345)) ($work.T+2)
 Picture 'after-alternate' light $brightBg $true
 Picture 'after-alternate' dark $darkBg $true
 Enter;Ui light
 DragTitle ($work.L+(Px 110)) ($work.T+(Px 45))
 exit
}
if($Phase -eq 'Legacy') {
 Ui collapse
 DragPill ($work.L+(Px 150)) ($work.T+(Px 80))
 $pill=Bounds
 $visual=[pscustomobject]@{Left=$pill.L+(Px 12);Top=$pill.T+(Px 10)}
 $visual | ConvertTo-Json | Set-Content "$out\old-pill.json"
 Ui expand; DragTitle ($work.L+(Px 320)) ($work.T+2)
 Picture 'before' light $darkBg $false; Picture 'before' dark $brightBg $false
 Enter; Ui light; DragTitle ($work.L+(Px 100)) ($work.T+(Px 45))
 exit
}
if($Phase -eq 'Upgrade'){
 Ui collapse
 $path="$out\pill-upgraded.json";Ui pill $path
 $box=Get-Content $path -Raw | ConvertFrom-Json
 $old=Get-Content "$out\old-pill.json" -Raw|ConvertFrom-Json; $r=Bounds
 Require (([Math]::Abs($r.L+(Px $box.x)-$old.Left) -le 1) -and ([Math]::Abs($r.T+(Px $box.y)-$old.Top) -le 1)) 'old manual visible pill anchor preserved'
 Ui expand;exit
}
if($Phase -eq 'Default'){
 $r=Bounds;$max=[Math]::Min((Px 1020),$work.H)
 Require ($r.W -eq (Px 400) -and $r.H -eq $max) "fresh default height $max width $($r.W)"
 if($work.H -le (Px 1020)){Require ($r.T -eq $work.T) 'default fills available work area from top'}
 Ui collapse;$r=Bounds;$path="$out\pill-default.json";Ui pill $path;$box=Get-Content $path -Raw|ConvertFrom-Json
 $screen=[Windows.Forms.Screen]::FromHandle($hwnd).Bounds
 Require ([Math]::Abs($r.L+(Px $box.x)+(Px 200)-($screen.Left+$screen.Width/2)) -le 1) 'visible pill centered on display'
 Require ($r.T+(Px $box.y) -eq $work.T -and $box.height -eq 64 -and $box.width -eq 400) 'visible pill flush with work area'
 DragPill ($work.L+(Px 165)) ($work.T+(Px 70));$r=Bounds
 Require ([Math]::Abs($r.T-($work.T+(Px 70))) -le 2) 'first default-to-manual drag without jump'
 Ui expand
 $r=Bounds; $min=[Math]::Min((Px 680),$work.H)
 Resize ($min-(Px 80));$r=Bounds
 Require ($r.H -eq $min -and $r.W -eq (Px 400)) "manual minimum $min"
 $preferred=[Math]::Min((Px 720),$work.B-$r.T)
 Resize $preferred;$r=Bounds
 Require ([Math]::Abs($r.H-$preferred) -le 2) "bottom-edge resized to $preferred"
 exit
}
if($Phase -eq 'Restore'){
 $r=Bounds; Require ([Math]::Abs($r.H-(Px 720)) -le 2) 'manual height restored'
 Ui collapse;$r=Bounds
 Require ([Math]::Abs($r.L-($work.L+(Px 165))) -le 2 -and [Math]::Abs($r.T-($work.T+(Px 70))) -le 2) 'new manual pill restored'
 Ui expand;DragTitle ($work.L+(Px 310)) ($work.T+2)
 Resize (Px 700);Require ([Math]::Abs((Bounds).H-(Px 700)) -le 2) 'can resize while docked'
 Picture 'after' light $darkBg $true; Picture 'after' dark $brightBg $true
 Picture 'after-alternate' light $brightBg $true; Picture 'after-alternate' dark $darkBg $true
 Enter;Ui light
 $samples=@()
 for($i=0;$i -lt 30;$i++){
   Enter
   $samples+=[Probe]::Sample($hwnd,$work.L+20,$work.T+55,(Px 6),($i -eq 4))
   Start-Sleep -Milliseconds 35
 }
 $sorted=@($samples|Sort-Object);$p95=$sorted[[Math]::Ceiling(.95*$sorted.Count)-1]
 [pscustomobject]@{milliseconds=$samples;min=$sorted[0];p95=$p95;max=$sorted[-1]} | ConvertTo-Json -Depth 3 | Set-Content "$out\hide-times.json"
 Require ($sorted[0] -ge 400 -and $p95 -le 450) "30 real exits min=$($sorted[0]) P95=$p95 max=$($sorted[-1])"
 Enter; MovePointer ($work.L+20) ($work.T+55);Start-Sleep -Milliseconds 350
 $r=Bounds; Require ($r.H -gt (Px 6)) 'still open during the 350 ms excursion'
 MovePointer ($r.L+45) ($work.T+25);Start-Sleep -Milliseconds 550
 Require ((Bounds).H -gt (Px 6)) 're-entry cancelled hide'
 for($i=0;$i -lt 5;$i++){
    MovePointer ($work.L+20) ($work.T+55);Start-Sleep -Milliseconds 80
    MovePointer ($r.L+45) ($work.T+25);Start-Sleep -Milliseconds 75
    if((Bounds).H -le (Px 6)){throw 'False fold while repeatedly crossing the boundary'}
 }
 Leave;exit
}
Leave;Enter
Require ([Math]::Abs((Bounds).H-(Px 700)) -le 2) 'fold and restart preserve chosen height'
DragTitle ($work.L+(Px 100)) ($work.T+(Px 50));exit
