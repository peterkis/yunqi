# Private input preparation for Tauri's NSIS bundler. Run from PowerShell 7 on Windows.
function New-VerifiedWebView2Config {
    param(
        [Parameter(Mandatory)][string]$Installer,
        [Parameter(Mandatory)][ValidatePattern('^[A-Fa-f0-9]{64}$')][string]$ExpectedSha256,
        [Parameter(Mandatory)][string]$Stage,
        [Parameter(Mandatory)][string]$BuildVersion
    )
    $source = Get-Item -LiteralPath $Installer -ErrorAction Stop
    if ((Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash -ne $ExpectedSha256) {
        throw 'WebView2 payload SHA-256 differs from the expected x64 offline installer.'
    }
    $signature = Get-AuthenticodeSignature -LiteralPath $source.FullName
    if ($signature.Status -ne 'Valid' -or
        $signature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) -cne 'Microsoft Corporation' -or
        $source.VersionInfo.OriginalFilename -ine 'MicrosoftEdgeUpdateSetup.exe') {
        throw 'Expected a valid Microsoft-signed Edge Update installer.'
    }
    $copy = Join-Path $Stage 'MicrosoftEdgeWebView2RuntimeInstallerX64.exe'
    Copy-Item -LiteralPath $source.FullName -Destination $copy -ErrorAction Stop
    if ((Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash -ne $ExpectedSha256) {
        throw 'The staged WebView2 payload differs from the verified input.'
    }
    $hook = Join-Path $Stage 'verified-offline-runtime.nsh'
    $define = '!define YUNQI_VERIFIED_WEBVIEW2 "${__FILEDIR__}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"'
    $base = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'src-tauri/offline-runtime.nsh') -Encoding utf8 -Raw
    [IO.File]::WriteAllText($hook, "$define`r`n$base")
    $config = Join-Path $Stage 'verified-bundle.json'
    # The preinstall hook provisions both missing and older runtimes with the same signed file.
    @{version=$BuildVersion; bundle=@{windows=@{webviewInstallMode=@{type='skip'}; nsis=@{installerHooks=$hook}}}} |
        ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $config -Encoding utf8NoBOM
    return $config
}
