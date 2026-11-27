# Exercise the actual notification-area menu in the Windows Sandbox user session.
param([ValidateSet('Roundtrip','AssertOn','AssertOff','Enable','Disable')][string]$Action='Roundtrip')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class MenuMouse {
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c,string n);
 [DllImport("user32.dll", EntryPoint="SendMessageW")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern uint GetMenuState(IntPtr menu,uint index,uint flags);
}
'@
function Click-Element($el,[bool]$right) {
    $rect=$el.Current.BoundingRectangle
    if($rect.Width -lt 1 -or $rect.Height -lt 1){throw 'Tray element is off screen'}
    $null=[MenuMouse]::SetCursorPos([int]($rect.X+$rect.Width/2),[int]($rect.Y+$rect.Height/2))
    Start-Sleep -Milliseconds 150
    $down=if($right){8}else{2}; $up=if($right){16}else{4}
    [MenuMouse]::mouse_event($down,0,0,0,[UIntPtr]::Zero)
    [MenuMouse]::mouse_event($up,0,0,0,[UIntPtr]::Zero)
}
function Tray-Elements {
    $root=[Windows.Automation.AutomationElement]::RootElement
    $windows=$root.FindAll([Windows.Automation.TreeScope]::Children,[Windows.Automation.Condition]::TrueCondition)
    foreach($item in $windows){
        if ($item.Current.ClassName -in @('Shell_TrayWnd','TopLevelWindowForOverflowXamlIsland','NotifyIconOverflowWindow')){
            foreach($child in $item.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)){
                if(!$child.Current.IsOffscreen -and $child.Current.BoundingRectangle.Width -gt 0){$child}
            }
        }
    }
}
function Use-Menu([bool]$expectChecked,[bool]$toggle) {
    $items=@(Tray-Elements)
    $icon=$items | Where-Object {$_.Current.Name -like '*运气通*' -and $_.Current.ClassName -notlike 'Taskbar.TaskList*'} | Select-Object -Last 1
    if(!$icon){
        $overflow=$items | Where-Object {$_.Current.Name -match 'hidden icons|隐藏的图标|隐藏图标|溢出'} | Select-Object -Last 1
        if(!$overflow){throw ('No overflow button: '+(($items | ForEach-Object {$_.Current.Name}) -join ' / '))}
        Click-Element $overflow $false
        Start-Sleep -Milliseconds 350
        $icon=Tray-Elements | Where-Object {$_.Current.Name -like '*运气通*' -and $_.Current.ClassName -notlike 'Taskbar.TaskList*'} | Select-Object -Last 1
    }
    if(!$icon){throw 'Missing YunQi notification-area icon'}
    Click-Element $icon $true
    Start-Sleep -Milliseconds 250
    $menu=[MenuMouse]::FindWindow('#32768',$null)
    if($menu -eq [IntPtr]::Zero){throw 'Tray popup did not open'}
    $root=[Windows.Automation.AutomationElement]::FromHandle($menu)
    $item=$root.FindFirst([Windows.Automation.TreeScope]::Descendants,(New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty,'允许贴顶自动隐藏')))
    if(!$item){throw ('Missing edge toggle: '+$root.Current.Name)}
    $handle=[MenuMouse]::SendMessage($menu,0x1e1,[IntPtr]::Zero,[IntPtr]::Zero)
    $state=[MenuMouse]::GetMenuState($handle,0,0x400)
    if($state -eq [uint32]::MaxValue -or (($state -band 8) -ne 0) -ne $expectChecked){throw "Unexpected real tray check state: $state"}
    if($toggle){Click-Element $item $false}else{[Windows.Forms.SendKeys]::SendWait('{ESC}')}
    Start-Sleep -Milliseconds 300
    [Windows.Forms.SendKeys]::SendWait('{ESC}')
}
# The previous test left the panel floating. Disable, try a top-edge drag, then enable.
if($Action -ne 'Roundtrip') {
    Use-Menu ($Action -in @('AssertOn','Disable')) ($Action -in @('Enable','Disable'))
    Write-Output "PASS tray $Action";exit
}
Use-Menu $true $true
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\verify-floating.ps1" -Phase Disabled
if($LASTEXITCODE -ne 0){throw 'Disabled setting did not keep the panel visible'}
Use-Menu $false $true
'PASS notification-area setting changed in both directions'
