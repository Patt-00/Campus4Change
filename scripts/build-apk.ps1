[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release', 'Both')]
    [string]$Mode = 'Debug'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $repoRoot 'android'
$envFile = Join-Path $repoRoot '.c4c-build-env.ps1'
if (Test-Path -LiteralPath $envFile) { . $envFile }
$sdkRoot = if ($env:ANDROID_HOME) {
    $env:ANDROID_HOME
} elseif ($env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT
} else {
    Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

function Find-Java17 {
    $roots = [System.Collections.Generic.List[string]]::new()
    if ($env:JAVA_HOME) { $roots.Add($env:JAVA_HOME) }
    $roots.Add([Environment]::GetEnvironmentVariable('JAVA_HOME', 'User'))
    $roots.Add([Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine'))
    $uninstallRoots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($root in $uninstallRoots) {
        $installs = Get-ItemProperty -Path $root -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -match '(?i)(Temurin|OpenJDK|JDK).*17' -and $_.InstallLocation } |
            Select-Object -ExpandProperty InstallLocation
        foreach ($install in $installs) { $roots.Add($install) }
    }
    foreach ($searchRoot in @('C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Java')) {
        $folders = Get-ChildItem $searchRoot -Directory -Filter '*17*' -ErrorAction SilentlyContinue
        foreach ($folder in $folders) { $roots.Add($folder.FullName) }
    }
    foreach ($candidate in ($roots | Select-Object -Unique)) {
        $javac = Join-Path $candidate 'bin\javac.exe'
        if (-not (Test-Path -LiteralPath $javac)) { continue }
        $version = (& $javac -version 2>&1 | Out-String)
        if ($version -match 'javac 17\.') { return $candidate }
    }
    return $null
}

function Verify-Apk([string]$ApkPath) {
    if (-not (Test-Path -LiteralPath $ApkPath)) { throw "APK was not created: $ApkPath" }
    $signer = Join-Path $sdkRoot 'build-tools\37.0.0\apksigner.bat'
    if (-not (Test-Path -LiteralPath $signer)) { throw "apksigner was not found: $signer" }
    & $signer verify --verbose $ApkPath
    if ($LASTEXITCODE -ne 0) { throw "APK signature verification failed: $ApkPath" }
    $hash = (Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Host ''
    Write-Host "APK: $ApkPath"
    Write-Host "SHA-256: $hash"
}

function Build-DebugApk {
    Push-Location $androidRoot
    try {
        & .\gradlew.bat --no-daemon assembleDebug
        if ($LASTEXITCODE -ne 0) { throw 'Gradle debug build failed.' }
    } finally {
        Pop-Location
    }
    Verify-Apk (Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk')
}

function Set-ProcessSecret([string]$Name, [string]$Prompt) {
    $secret = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    try {
        $plainText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
        [Environment]::SetEnvironmentVariable($Name, $plainText, 'Process')
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        $secret.Dispose()
    }
}

function Build-ReleaseApk {
    $keystoreFile = if ($env:C4C_RELEASE_STORE_FILE) {
        $env:C4C_RELEASE_STORE_FILE
    } else {
        Join-Path $HOME '.android\keystores\campus4change-release-v4.jks'
    }
    $keyAlias = if ($env:C4C_RELEASE_KEY_ALIAS) { $env:C4C_RELEASE_KEY_ALIAS } else { 'campus4change-v4' }
    if (-not (Test-Path -LiteralPath $keystoreFile)) {
        throw "The existing v4 release keystore was not found: $keystoreFile"
    }

    $names = @(
        'C4C_RELEASE_STORE_FILE',
        'C4C_RELEASE_STORE_PASSWORD',
        'C4C_RELEASE_KEY_ALIAS',
        'C4C_RELEASE_KEY_PASSWORD'
    )
    $original = @{}
    foreach ($name in $names) { $original[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
    try {
        $env:C4C_RELEASE_STORE_FILE = (Resolve-Path -LiteralPath $keystoreFile).Path
        $env:C4C_RELEASE_KEY_ALIAS = $keyAlias
        if (-not $env:C4C_RELEASE_STORE_PASSWORD) {
            if ($env:SSH_CONNECTION -or $env:SSH_CLIENT) {
                throw 'Release signing passwords must be entered in an interactive PowerShell session, not supplied through an SSH command.'
            }
            Set-ProcessSecret -Name 'C4C_RELEASE_STORE_PASSWORD' -Prompt 'Release keystore password'
        }
        if (-not $env:C4C_RELEASE_KEY_PASSWORD) {
            if ($env:SSH_CONNECTION -or $env:SSH_CLIENT) {
                throw 'Release key password must be entered in an interactive PowerShell session.'
            }
            Set-ProcessSecret -Name 'C4C_RELEASE_KEY_PASSWORD' -Prompt 'Release key password'
        }

        Push-Location $androidRoot
        try {
            & .\gradlew.bat --no-daemon assembleRelease
            if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed.' }
        } finally {
            Pop-Location
        }
        Verify-Apk (Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk')
    } finally {
        foreach ($name in $names) {
            [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process')
        }
    }
}

$setupScript = Join-Path $PSScriptRoot 'setup-build.ps1'
& $setupScript -Check
if (Test-Path -LiteralPath $envFile) {
    . $envFile
}
$resolvedJdk = Find-Java17
if (-not $resolvedJdk) { throw 'JDK 17 was not found. Run setup-build.ps1 -Setup and dot-source its environment file.' }
$env:JAVA_HOME = $resolvedJdk
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

switch ($Mode) {
    'Debug' { Build-DebugApk }
    'Release' { Build-ReleaseApk }
    'Both' {
        Build-DebugApk
        Build-ReleaseApk
    }
}
