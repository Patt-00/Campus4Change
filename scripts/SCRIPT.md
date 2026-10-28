# Setup scripts for Campus4Change

This guide documents the prerequisite setup scripts in this folder. Use them to check a computer before building Campus4Change 1.4.4, install supported tools, and write local Android SDK configuration.

The scripts do not build an APK. Use the platform build commands in [docs/BUILDING.md](../docs/BUILDING.md) after setup.

## Script files

- **setup-build.sh** supports macOS, Linux, and Termux.
- **setup-build.ps1** supports Windows PowerShell.

Both scripts discover the repository root from their own location. Run them from the repository root for predictable output and follow-up build commands.

## Modes

### Check mode

Check mode inspects the available tool versions, Android SDK packages, project dependencies, local.properties, and SDK license status. It does not install packages or write project configuration. The SDK Manager may contact Google's repository to report license status.

Run the Bash check from macOS, Linux, or Termux:

```sh
./scripts/setup-build.sh --check
```

Run the PowerShell check on Windows:

```powershell
.\scripts\setup-build.ps1 -Check
```

The scripts return a nonzero exit code when a required item is missing. The output names each missing item.

### Setup mode

Setup mode installs supported prerequisites, prepares the Android SDK, runs npm ci when the React Native dependency is absent, and writes local configuration.

On macOS, Linux, or Termux:

```sh
./scripts/setup-build.sh --setup
source ./.c4c-build-env.sh
```

On Windows PowerShell:

```powershell
.\scripts\setup-build.ps1 -Setup
. .\.c4c-build-env.ps1
```

The generated environment files are ignored by Git. Source the correct file in each new terminal before running Gradle if Java or Android SDK paths are not set globally.

## Requirements the scripts check

The scripts check the version ranges from package.json and the Android package versions from the Gradle configuration and build guide.

| Requirement             | Version                                                       |
| ----------------------- | ------------------------------------------------------------- |
| Node.js                 | 22.13 or newer in 22.x, 24.3 or newer in 24.x, or 26 or newer |
| JDK                     | 17                                                            |
| Android SDK Platform    | 37.0                                                          |
| Android Build Tools     | 37.0.0                                                        |
| Android NDK             | 27.1.12297006                                                 |
| Android CMake           | 3.22.1                                                        |
| JavaScript dependencies | React Native package present in node_modules                  |

Check mode also verifies Android Platform-Tools and android/local.properties. Termux checks its clang, aapt2, and Termux-compatible NDK directory.

## What setup installs

### macOS

The Bash script uses Homebrew to install Git, Node.js 24, and Temurin JDK 17 when needed. It downloads Google's Android SDK Command-line Tools directly when sdkmanager is missing.

### Linux

The Bash script uses apt or dnf for missing host build tools. It installs JDK 17 from the distribution when available. When JDK 17 is unavailable, it downloads Temurin 17 from Adoptium and verifies the archive checksum.

If the distribution Node.js package is outside the supported range, the script installs Node.js 24 from nodejs.org and verifies its published checksum.

### Termux

The Bash script uses pkg to install Node.js, JDK 17, Clang, CMake, aapt2, QEMU, and related Android build tools. It downloads Android SDK Command-line Tools if sdkmanager is missing. After the stock Android NDK is installed, the script calls setup-termux-ndk.sh to prepare the ARM64-compatible NDK directory.

Termux uses pkg install -y for the listed packages, so setup can run through the SSH shell without a package confirmation prompt. If TMPDIR is missing in an SSH environment, the Bash script uses $PREFIX/tmp for temporary downloads and license checks. Its generated environment file keeps that path for later shell sessions.

Termux uses the dedicated Gradle wrapper, scripts/gradlew-termux.sh. It sets the ARM64 React Native architecture and Termux aapt2 path. See the Termux section in docs/BUILDING.md for storage, Node, and QEMU details.

### Windows

The PowerShell script uses WinGet to install Git, Node.js LTS, and Temurin JDK 17 when needed. It checks for JDK 17 in JAVA_HOME, registered JDK install locations, and common Adoptium folders.

When sdkmanager is missing, the script downloads the Windows command-line tools package from Google, verifies its SHA-256 checksum, and installs it under the configured Android SDK directory. It does not launch Android Studio.

In an SSH session, the PowerShell script refuses to invoke WinGet if Git, Node.js, or JDK 17 is missing. Package installers can open Windows UI or require elevation. Install missing host tools from an interactive PowerShell session, then rerun setup over SSH. When those host tools are present, setup downloads command-line tools directly and runs SDK Manager without opening Android Studio.

## Android SDK packages and licenses

The scripts install these packages through sdkmanager:

- platform-tools
- platforms;android-37.0
- build-tools;37.0.0
- ndk;27.1.12297006
- cmake;3.22.1

The scripts currently pin Google Command-line Tools build 15859902 and verify its platform archive checksum before extraction:

| Platform         | Archive                                         | SHA-256                                                          |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Windows          | commandlinetools-win-15859902_latest.zip        | 90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a |
| Linux and Termux | commandlinetools-linux-15859902_latest.zip      | 4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583 |
| macOS Intel      | commandlinetools-mac_x86_64-15859902_latest.zip | c5a6378ab5cf7e0d5701921405115befff13e9ff7417fb588389338f8bd050f3 |
| macOS ARM        | commandlinetools-mac_arm64-15859902_latest.zip  | 835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e |

Google publishes current command-line tools versions and checksums on the [Android Studio downloads page](https://developer.android.com/studio/). Update the pinned archive names and hashes together when that page publishes a newer package.

The setup scripts never accept SDK licenses. They check license status with input closed. If a license is missing, setup stops before installing SDK packages and tells the user to accept it manually in an interactive terminal.

On Bash, the interactive command is:

```sh
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses
```

On Windows PowerShell, run:

```powershell
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" "--sdk_root=$env:ANDROID_HOME" --licenses
```

Review the terms and answer the SDK Manager prompt yourself. Then rerun setup.

## Files setup writes

The scripts write android/local.properties with the SDK root. They preserve existing local NDK and CMake entries on desktop operating systems. On Termux, they update sdk.dir, cmake.dir, and ndk.dir to the Termux paths.

Bash setup writes .c4c-build-env.sh. PowerShell setup writes .c4c-build-env.ps1. These files contain local paths and are ignored by Git. Termux's Bash file also includes its private TMPDIR and libtermux-exec settings. The environment files do not contain signing credentials.

Setup does not change source files, Firebase data, Firestore rules, or release signing configuration. It does not install the app, build an APK, create a release key, or change production settings.

## Build after setup

For a debug APK on macOS, Linux, or Windows, install JavaScript dependencies if needed, then run Gradle from android:

```sh
npm ci
cd android
./gradlew --no-daemon assembleDebug
```

On Windows PowerShell, use:

```powershell
npm ci
Push-Location .\android
.\gradlew.bat --no-daemon assembleDebug
Pop-Location
```

For Termux, build from the repository root:

```sh
npm ci
./scripts/gradlew-termux.sh clean assembleDebug --no-daemon --max-workers=2 --console=plain
```

The debug APK is written to android/app/build/outputs/apk/debug/app-debug.apk. Debug builds need Metro when launched. A signed release APK requires the existing v4 release keystore and signing passwords. Setup scripts do not build or sign release APKs.

## Troubleshooting

### The check reports JDK 17 missing

Install or repair JDK 17, then rerun setup. On Fedora, setup uses the Adoptium archive fallback and verifies its checksum. On Windows, it uses WinGet only from an interactive session.

### The check reports unsupported Node.js

Install Node.js within the package.json engines range. Linux setup uses a checksum-verified Node.js 24 release when the distribution package is too old. Termux uses its pkg-provided Node.js version. The check stops if that version is outside the project range.

### The check reports sdkmanager missing

Setup downloads Google's command-line tools package for the current platform. It requires network access and enough free disk space for the compressed archive and extracted tools.

### Setup reports an unaccepted SDK license

The script did not accept the license. Open an interactive terminal, run the sdkmanager --licenses command for your platform, review and accept the terms, then rerun setup.

### Setup reports an existing incomplete tool directory

The scripts do not overwrite an existing local Temurin JDK, Node.js toolchain, Android command-line-tools folder, or Termux-compatible NDK folder. Inspect the named path and move or repair it yourself, then rerun setup.

### Termux reports a CXX1102 NDK error

Confirm android/local.properties points ndk.dir to $HOME/termux-ndk-27.1.12297006. That directory must contain source.properties with revision 27.1.12297006 and package.xml. Rerun scripts/setup-build.sh --setup to retry the compatible NDK preparation.
