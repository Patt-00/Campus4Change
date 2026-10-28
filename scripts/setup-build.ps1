[CmdletBinding()]
param(
    [switch]$Setup,
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
if ($Setup -and $Check) { throw 'Choose either -Setup or -Check.' }
$repoRoot = Split-Path -Parent $PSScriptRoot
$sdkRoot = if ($env:ANDROID_HOME) {
    $env:ANDROID_HOME
} elseif ($env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT
} else {
    Join-Path $env:LOCALAPPDATA 'Android\Sdk'
}

function Write-Status([string]$Message) { Write-Host "[setup] $Message" }
function Write-Pass([string]$Message) { Write-Host "[ok] $Message" }
function Write-Missing([string]$Message) { $script:Missing.Add($Message) | Out-Null; Write-Host "[missing] $Message" }

function Test-SupportedNode {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
    $version = (& node -p 'process.versions.node' 2>$null).Trim()
    if ($version -notmatch '^(\d+)\.(\d+)\.') { return $false }
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    return (($major -eq 22 -and $minor -ge 13) -or ($major -eq 24 -and $minor -ge 3) -or $major -ge 26)
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
    $registeredJdkRoots = foreach ($root in $uninstallRoots) {
        Get-ItemProperty -Path $root -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -match '(?i)(Temurin|OpenJDK|JDK).*17' -and $_.InstallLocation } |
            Select-Object -ExpandProperty InstallLocation
    }
    foreach ($root in $registeredJdkRoots) { $roots.Add($root) }
    foreach ($searchRoot in @('C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Java')) {
        $jdkFolders = Get-ChildItem $searchRoot -Directory -Filter '*17*' -ErrorAction SilentlyContinue
        foreach ($item in $jdkFolders) { $roots.Add($item.FullName) }
    }
    $javacCommand = Get-Command javac -ErrorAction SilentlyContinue
    if ($javacCommand) { $roots.Add((Split-Path -Parent (Split-Path -Parent $javacCommand.Source))) }
    foreach ($candidate in ($roots | Select-Object -Unique)) {
        $javac = Join-Path $candidate 'bin\javac.exe'
        if (-not (Test-Path -LiteralPath $javac)) { continue }
        $version = (& $javac -version 2>&1 | Out-String)
        if ($version -match 'javac 17\.') { return $candidate }
    }
    return $null
}

function Find-SdkManager {
    $manager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
    if (Test-Path -LiteralPath $manager) { return $manager }
    $roots = Join-Path $sdkRoot 'cmdline-tools'
    if (Test-Path -LiteralPath $roots) {
        foreach ($folder in (Get-ChildItem $roots -Directory | Sort-Object Name -Descending)) {
            $candidate = Join-Path $folder.FullName 'bin\sdkmanager.bat'
            if (Test-Path -LiteralPath $candidate) { return $candidate }
        }
    }
    $command = Get-Command sdkmanager.bat -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}

function Install-SdkCommandLineTools {
    $version = '15859902'
    $archiveName = "commandlinetools-win-$version" + '_latest.zip'
    $expectedHash = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
    $downloadUrl = "https://dl.google.com/android/repository/$archiveName"
    $tempRoot = Join-Path $env:TEMP ('campus4change-sdktools-' + [guid]::NewGuid().ToString('N'))
    $archivePath = Join-Path $tempRoot $archiveName
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    try {
        Write-Status 'Downloading Android SDK Command-line Tools from Google.'
        $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curl) {
            & $curl.Source --fail --location --silent --show-error --output $archivePath $downloadUrl
            if ($LASTEXITCODE -ne 0) { throw 'curl.exe could not download Android SDK Command-line Tools.' }
        } else {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath -UseBasicParsing -TimeoutSec 600
        }
        $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $expectedHash) { throw 'Android command-line tools SHA-256 verification failed.' }
        $extractionRoot = Join-Path $tempRoot 'extracted'
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractionRoot
        $source = Join-Path $extractionRoot 'cmdline-tools'
        if (-not (Test-Path (Join-Path $source 'bin\sdkmanager.bat'))) {
            throw 'The downloaded command-line tools archive did not contain sdkmanager.bat.'
        }
        $toolsRoot = Join-Path $sdkRoot 'cmdline-tools'
        $destination = Join-Path $toolsRoot 'latest'
        if (Test-Path -LiteralPath $destination) { $destination = Join-Path $toolsRoot $version }
        if (Test-Path -LiteralPath $destination) { throw "Refusing to replace existing SDK tools directory $destination." }
        New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
        Move-Item -LiteralPath $source -Destination $destination
        Write-Pass "Installed and checksum-verified Android SDK Command-line Tools $version."
    } finally {
        if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
    }
}

function Test-SdkLicensesAccepted {
    $script:SdkLicenseOutput = ''
    if (-not $script:JdkHome) { return $null }
    $hadJavaHome = Test-Path Env:JAVA_HOME
    $previousJavaHome = $env:JAVA_HOME
    $env:JAVA_HOME = $script:JdkHome
    $licenseCommand = '"{0}" --sdk_root="{1}" --licenses < NUL 2>&1' -f $script:SdkManager, $sdkRoot
    try {
        $script:SdkLicenseOutput = & $env:ComSpec /d /c $licenseCommand | Out-String
        $licenseExitCode = $LASTEXITCODE
    } finally {
        if ($hadJavaHome) { $env:JAVA_HOME = $previousJavaHome } else { Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue }
    }
    return ($licenseExitCode -eq 0 -and $script:SdkLicenseOutput -notmatch '(?i)not accepted|review licenses that have not been accepted|accept the license agreements')
}

function Confirm-SdkLicensesAlreadyAccepted {
    if (Test-SdkLicensesAccepted) {
        Write-Pass 'Android SDK licenses are already accepted.'
        return
    }
    if ($script:SdkLicenseOutput -match '(?i)not accepted|review licenses that have not been accepted|accept the license agreements') {
        throw 'Some Android SDK licenses remain unaccepted. Run sdkmanager --licenses in an interactive terminal, review and accept them, then rerun setup. This script did not accept them.'
    }
    throw 'Android SDK license status could not be checked.'
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Install-WingetPackage([string]$Id) {
    if ($env:SSH_CONNECTION -or $env:SSH_CLIENT) {
        throw "WinGet installation of $Id is disabled in SSH sessions because package installers may open Windows UI. Run setup locally in PowerShell, then rerun this script."
    }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw 'WinGet is not available. Install the Windows App Installer, then rerun setup.'
    }
    Write-Status "Installing $Id with WinGet. Review any package prompts."
    & winget install --id $Id --exact
    if ($LASTEXITCODE -ne 0) { throw "WinGet could not install $Id." }
    Refresh-ProcessPath
}

function Check-Prerequisites {
    $script:Missing = [System.Collections.Generic.List[string]]::new()
    if (Get-Command git -ErrorAction SilentlyContinue) { Write-Pass 'Git' } else { Write-Missing 'Git' }
    if (Test-SupportedNode) { Write-Pass "Supported Node.js $(& node --version)" } else { Write-Missing 'Supported Node.js and npm' }
    if (Get-Command npm -ErrorAction SilentlyContinue) { Write-Pass 'npm' } else { Write-Missing 'npm' }
    $script:JdkHome = Find-Java17
    if ($script:JdkHome) { Write-Pass "JDK 17 at $script:JdkHome" } else { Write-Missing 'JDK 17' }
    if (Test-Path (Join-Path $repoRoot 'node_modules\react-native\package.json')) { Write-Pass 'JavaScript dependencies' } else { Write-Missing 'npm dependencies' }
    $script:SdkManager = Find-SdkManager
    if ($script:SdkManager) { Write-Pass 'Android SDK Manager' } else { Write-Missing 'Android SDK Command-line Tools (sdkmanager)' }
    if ($script:SdkManager -and $script:JdkHome) {
        if (Test-SdkLicensesAccepted) {
            Write-Pass 'Android SDK licenses'
        } else {
            Write-Missing 'Android SDK licenses (review and accept interactively)'
        }
    }
    if (Test-Path (Join-Path $sdkRoot 'platforms\android-37.0\android.jar')) { Write-Pass 'Android SDK Platform 37.0' } else { Write-Missing 'Android SDK Platform 37.0' }
    if (Test-Path (Join-Path $sdkRoot 'build-tools\37.0.0\aapt2.exe')) { Write-Pass 'Android Build Tools 37.0.0' } else { Write-Missing 'Android Build Tools 37.0.0' }
    if (Test-Path (Join-Path $sdkRoot 'ndk\27.1.12297006\source.properties')) { Write-Pass 'Android NDK 27.1.12297006' } else { Write-Missing 'Android NDK 27.1.12297006' }
    if (Test-Path (Join-Path $sdkRoot 'cmake\3.22.1\bin\cmake.exe')) { Write-Pass 'CMake 3.22.1' } else { Write-Missing 'CMake 3.22.1' }
    if (Test-Path (Join-Path $sdkRoot 'platform-tools\adb.exe')) { Write-Pass 'Android Platform-Tools' } else { Write-Missing 'Android Platform-Tools' }
    $localProperties = Join-Path $repoRoot 'android\local.properties'
    if ((Test-Path $localProperties) -and (Select-String -Path $localProperties -Pattern '^sdk\.dir=' -Quiet)) {
        Write-Pass 'android/local.properties'
    } else {
        Write-Missing 'android/local.properties'
    }
}

if ($Setup) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Install-WingetPackage 'Git.Git' }
    if (-not (Test-SupportedNode)) { Install-WingetPackage 'OpenJS.NodeJS.LTS' }
    if (-not (Find-Java17)) { Install-WingetPackage 'EclipseAdoptium.Temurin.17.JDK' }
    $script:SdkManager = Find-SdkManager
    if (-not $script:SdkManager) {
        Install-SdkCommandLineTools
        $script:SdkManager = Find-SdkManager
        if (-not $script:SdkManager) { throw 'Android SDK Command-line Tools are still unavailable after setup.' }
    }
}

Check-Prerequisites
if (-not $Setup) {
    if ($Missing.Count -gt 0) {
        Write-Host ''
        Write-Host 'Run .\scripts\setup-build.ps1 -Setup to install supported packages and configure the SDK.'
        throw "$($Missing.Count) prerequisite(s) are missing."
    }
    Write-Host ''
    if (Test-Path (Join-Path $repoRoot '.c4c-build-env.ps1')) {
        Write-Host 'Checks passed. Dot-source .\.c4c-build-env.ps1 before running Gradle.'
    } else {
        Write-Host 'Checks passed. Run .\scripts\setup-build.ps1 -Setup once to create the environment file.'
    }
    return
}

if (-not $SdkManager) {
    throw 'Install Android SDK Command-line Tools (latest) in Android Studio, then rerun setup.'
}
Write-Status 'Checking SDK license status without accepting any license terms.'
Confirm-SdkLicensesAlreadyAccepted
& $SdkManager "--sdk_root=$sdkRoot" --install 'platform-tools' 'platforms;android-37.0' 'build-tools;37.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK packages did not finish installing.' }
if (-not (Test-Path (Join-Path $repoRoot 'node_modules\react-native\package.json'))) {
    Push-Location $repoRoot
    try { & npm ci; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' } } finally { Pop-Location }
}
$script:JdkHome = Find-Java17
if (-not $script:JdkHome) { throw 'JDK 17 was not found after installation. Close and reopen PowerShell, then rerun setup.' }
$sdkEscaped = $sdkRoot.Replace('\', '/').Replace(' ', '\ ')
$localProperties = Join-Path $repoRoot 'android\local.properties'
$keptLines = @()
if (Test-Path -LiteralPath $localProperties) {
    $keptLines = @(Get-Content -LiteralPath $localProperties | Where-Object { $_ -notmatch '^sdk\.dir=' })
}
@($keptLines + "sdk.dir=$sdkEscaped") | Set-Content -LiteralPath $localProperties -Encoding ascii
$env:JAVA_HOME = $script:JdkHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
$envLines = @(
    ('$env:JAVA_HOME = ''{0}''' -f $script:JdkHome.Replace("'", "''")),
    ('$env:ANDROID_HOME = ''{0}''' -f $sdkRoot.Replace("'", "''")),
    ('$env:ANDROID_SDK_ROOT = ''{0}''' -f $sdkRoot.Replace("'", "''")),
    '$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"'
)
$envLines | Set-Content -LiteralPath (Join-Path $repoRoot '.c4c-build-env.ps1') -Encoding ascii
Check-Prerequisites
if ($Missing.Count -gt 0) { throw "Setup finished with $($Missing.Count) missing prerequisite(s)." }
Write-Host ''
Write-Host 'Setup is complete. Dot-source .\.c4c-build-env.ps1 in this PowerShell session.'
Write-Host 'Then build from android with: .\gradlew.bat --no-daemon assembleDebug'

