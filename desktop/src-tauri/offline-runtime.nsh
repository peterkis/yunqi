; Tauri's offlineInstaller covers a missing runtime. Upgrade older installed
; runtimes from the same signed payload, without calling the online Edge updater.
!macro YunQiInstallWebView2 payload
  InitPluginsDir
  File "/oname=$PLUGINSDIR\YunQi-WebView2.exe" "${payload}"
  ExecWait '"$PLUGINSDIR\YunQi-WebView2.exe" /silent /install' $R1
  ${If} $R1 != 0
    SetErrorLevel 1
    MessageBox MB_ICONSTOP "WebView2 离线更新失败，请联系信息科。" /SD IDOK
    Abort
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $4 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${If} $4 == ""
    ReadRegStr $4 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}
  !ifdef YUNQI_VERIFIED_WEBVIEW2
    ${VersionCompare} "$4" "145.0.0.0" $R0
    ${If} $4 == ""
    ${OrIf} $R0 == 2
      !insertmacro YunQiInstallWebView2 "${YUNQI_VERIFIED_WEBVIEW2}"
    ${EndIf}
  !else
  !if "${INSTALLWEBVIEW2MODE}" == "offlineInstaller"
  ${If} $4 != ""
    ${VersionCompare} "$4" "145.0.0.0" $R0
    ${If} $R0 == 2
      !insertmacro YunQiInstallWebView2 "${WEBVIEW2INSTALLERPATH}"
    ${EndIf}
  ${EndIf}
  !else
    ${VersionCompare} "$4" "145.0.0.0" $R0
    ${If} $4 == ""
    ${OrIf} $R0 == 2
      SetErrorLevel 1
      MessageBox MB_ICONSTOP "请使用运气通完整离线包安装或修复 WebView2。" /SD IDOK
      Abort
    ${EndIf}
  !endif
  !endif
!macroend

; Use a content-specific icon location so Explorer won't reuse the old image
; for an executable upgraded in place. Load and save only links to this app,
; keeping the existing target, arguments, and AppUserModelID.
Var YunQiShortcutTarget
Var YunQiDesktopLink
!define YUNQI_SHORTCUT_ICON "icons\YunQi-Windows-2d8f8d2d.ico"
!macro YunQiSetLinkIcon link
  Push $0
  Push $1
  Push $2
  Push $3
  ${If} ${FileExists} "${link}"
    !insertmacro IsShortcutTarget "${link}" "$YunQiShortcutTarget"
    Pop $3
    ${If} $3 == 1
      !insertmacro ComHlpr_CreateInProcInstance ${CLSID_ShellLink} ${IID_IShellLink} r0 ""
      ${If} $0 P<> 0
        ${IUnknown::QueryInterface} $0 '("${IID_IPersistFile}",.r1)'
        ${If} $1 P<> 0
          ${IPersistFile::Load} $1 '("${link}", ${STGM_READWRITE}).r2'
          ${If} $2 == 0
            ${IShellLink::SetIconLocation} $0 '("$INSTDIR\${YUNQI_SHORTCUT_ICON}",0).r2'
            ${If} $2 == 0
              ${IPersistFile::Save} $1 '("${link}",1)'
            ${EndIf}
          ${EndIf}
          ${IUnknown::Release} $1 ""
        ${EndIf}
        ${IUnknown::Release} $0 ""
      ${EndIf}
      System::Call 'shell32::SHChangeNotify(i 0x2000, i 0x1005, w "${link}", p 0)'
    ${EndIf}
  ${EndIf}
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend

!macro NSIS_HOOK_POSTINSTALL
  StrCpy $YunQiShortcutTarget "$INSTDIR\${MAINBINARYNAME}.exe"
  StrCpy $YunQiDesktopLink "$DESKTOP\${PRODUCTNAME}.lnk"
  System::Call 'shell32::SHChangeNotify(i 0x2000, i 0x1005, w "$YunQiShortcutTarget", p 0)'
  !insertmacro YunQiSetLinkIcon "$YunQiDesktopLink"
  !if "${STARTMENUFOLDER}" != ""
    !insertmacro YunQiSetLinkIcon "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
  !else
    !insertmacro YunQiSetLinkIcon "$SMPROGRAMS\${PRODUCTNAME}.lnk"
  !endif
!macroend

; In the interactive installer the desktop shortcut checkbox runs on Finish,
; after the installation section. Honor the user's selection there as well.
Function .onGUIEnd
  ${If} $YunQiShortcutTarget != ""
    !insertmacro YunQiSetLinkIcon "$YunQiDesktopLink"
  ${EndIf}
FunctionEnd
