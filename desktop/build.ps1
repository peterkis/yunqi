# Run with PowerShell 7 on an x64 Windows build machine.
[CmdletBinding(DefaultParameterSetName='Default')]
param(
    [Parameter(ParameterSetName='Upgrade')][switch]$UpgradeOnly,
    [Parameter(ParameterSetName='Pinned')][string]$OfflineWebView2Installer,
    [Parameter(ParameterSetName='Pinned')][ValidatePattern('^[A-Fa-f0-9]{64}$')][string]$OfflineWebView2Sha256,
    [ValidatePattern('^\d{1,9}\.\d{1,9}\.\d{1,9}$')][string]$BuildVersion
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($PSCmdlet.ParameterSetName -eq 'Pinned' -and (!$OfflineWebView2Installer -or !$OfflineWebView2Sha256)) {
    throw 'Supply both -OfflineWebView2Installer and the trusted -OfflineWebView2Sha256.'
}
if ($OfflineWebView2Installer) {
    $OfflineWebView2Installer = (Resolve-Path -LiteralPath $OfflineWebView2Installer -ErrorAction Stop).Path
}
$localPayload = $null
$previousBuildVersion = $env:YUNQI_UPDATE_BUILD_VERSION
Push-Location $root
try {
    function Invoke-Checked([scriptblock]$Command) {
        & $Command
        if ($LASTEXITCODE -ne 0) { throw "Build step failed ($LASTEXITCODE): $Command" }
    }
    Invoke-Checked { pnpm install --frozen-lockfile }
    foreach ($pkg in @('@yunqi/contracts','@yunqi/client','@yunqi/workbench')) {
        Invoke-Checked { pnpm --filter $pkg build }
    }
    $stage = New-Item -ItemType Directory -Force (Join-Path $root ('.artifacts/desktop-build/' + [guid]::NewGuid().ToString('N')))
    $config = Join-Path $stage 'bundle.json'
    $overlay = @{bundle=@{}}
    if ($UpgradeOnly) {
        $overlay.bundle.windows = @{webviewInstallMode=@{type='skip'}}
    }
    if (!$BuildVersion) {
        $BuildVersion = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'src-tauri/tauri.conf.json') -Raw | ConvertFrom-Json).version
    }
    if ($OfflineWebView2Installer) {
        . (Join-Path $PSScriptRoot 'verified-webview2.ps1')
        $localPayload = Join-Path $stage 'MicrosoftEdgeWebView2RuntimeInstallerX64.exe'
        $localConfig = New-VerifiedWebView2Config -Installer $OfflineWebView2Installer -ExpectedSha256 $OfflineWebView2Sha256 -Stage $stage.FullName -BuildVersion $BuildVersion
    }
    $overlay.version = $BuildVersion
    $env:YUNQI_UPDATE_BUILD_VERSION = $BuildVersion
    $overlay | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $config -Encoding utf8NoBOM
    $tools = Join-Path $root '.artifacts/tools'
    $cli = Join-Path $tools 'node_modules/.bin/tauri.cmd'
    $cliVersion = '2.12.6'
    $cliManifest = Join-Path $tools 'node_modules/@tauri-apps/cli/package.json'
    if (!(Test-Path $cli) -or !(Test-Path $cliManifest) -or
        (Get-Content -LiteralPath $cliManifest -Raw | ConvertFrom-Json).version -ne $cliVersion) {
        Invoke-Checked { npm install --prefix $tools --no-audit --no-fund "@tauri-apps/cli@$cliVersion" }
    }
    Push-Location $PSScriptRoot
    try {
        if ($OfflineWebView2Installer) {
            Invoke-Checked { & $cli build --config $config --no-bundle -- --locked -j 4 }
            Invoke-Checked { & $cli bundle --config $localConfig --bundles nsis }
        } else {
            Invoke-Checked { & $cli build --config $config --bundles nsis -- --locked -j 4 }
        }
    } finally { Pop-Location }
} finally {
    if ($localPayload -and (Test-Path -LiteralPath $localPayload)) { Remove-Item -LiteralPath $localPayload }
    $env:YUNQI_UPDATE_BUILD_VERSION = $previousBuildVersion
    Pop-Location
}
