# Build scripts for Campus4Change

This guide covers the setup and APK build scripts in this folder. The setup scripts check and prepare a computer for Campus4Change 1.4.4. The build scripts assemble and verify debug or signed release APKs.

For platform installation steps and build prerequisites, see [docs/BUILDING.md](../docs/BUILDING.md).

## Script files

- **setup-build.sh** supports macOS, Linux, and Termux.
- **setup-build.ps1** supports Windows PowerShell.
- **build-apk.sh** builds APKs on macOS, Linux, and Termux.
- **build-apk.ps1** builds APKs on Windows PowerShell.

Each script discovers the repository root from its own location. Run scripts from the repository root so their output and follow-up commands are easy to find.

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

### APK build modes

The build scripts run the setup script's check mode before Gradle. Resolve missing prerequisites and accept any pending SDK licenses before building.

On macOS, Linux, or Termux, choose one mode:

```sh
./scripts/build-apk.sh --debug
./scripts/build-apk.sh --release
./scripts/build-apk.sh --both
```

On Windows PowerShell, choose one mode:

```powershell
.\scripts\build-apk.ps1 -Mode Debug
.\scripts\build-apk.ps1 -Mode Release
.\scripts\build-apk.ps1 -Mode Both
```

Both wrappers default to debug mode when no mode is specified.

Debug mode builds `android/app/build/outputs/apk/debug/app-debug.apk`. Release mode builds `android/app/build/outputs/apk/release/app-release.apk`. Both mode builds each APK in order. The scripts verify the APK signature and print its SHA-256 hash.

Release mode uses the existing v4 keystore and refuses to create a replacement key. Bash reads signing passwords from GNOME Secret Service when available, then prompts without echoing them if needed. PowerShell prompts for those passwords as secure input and refuses to prompt over SSH. Both scripts keep the passwords out of source files. Release mode stops if the keystore or signing credentials are missing.

On Termux, `build-apk.sh` selects `scripts/gradlew-termux.sh` for debug and release builds. On desktop systems, it invokes the Android Gradle wrapper. A debug APK needs Metro when launched. A release APK includes the JavaScript bundle and can start without Metro.

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

The setup scripts never accept SDK licenses. They check license status with input closed. Setup installs missing npm dependencies and writes local SDK configuration before checking licenses. If a license is missing, setup stops before installing SDK packages and tells the user to accept it manually in an interactive terminal. Load the generated environment file first so the commands below use the SDK and JDK selected by setup. If your command-line tools are in a versioned directory instead of `latest`, use the `sdkmanager` path selected by setup.

On Bash, the interactive command is:

```sh
source ./.c4c-build-env.sh
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses
```

On Windows PowerShell, run:

```powershell
. .\.c4c-build-env.ps1
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" "--sdk_root=$env:ANDROID_HOME" --licenses
```

Review the terms and answer the SDK Manager prompt yourself. Then rerun setup.

## Files setup writes

The scripts write android/local.properties with the SDK root. They preserve existing local NDK and CMake entries on desktop operating systems. On Termux, they update sdk.dir, cmake.dir, and ndk.dir to the Termux paths.

Bash setup writes .c4c-build-env.sh. PowerShell setup writes .c4c-build-env.ps1. These files contain local paths and are ignored by Git. Termux's Bash file also includes its private TMPDIR and libtermux-exec settings. The environment files do not contain signing credentials.

Setup does not change source files, Firebase data, Firestore rules, or release signing configuration. It does not install the app, build an APK, create a release key, or change production settings.

## Build outputs

The build scripts write APKs to these paths:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Signed release APK: `android/app/build/outputs/apk/release/app-release.apk`

For a release APK and App Bundle, run `scripts/build-release.sh` directly on macOS, Linux, or Termux. The helper supports `--apk-only` and `--apk-and-bundle`; its default builds both artifacts. The PowerShell wrapper builds an APK only.

## Troubleshooting

### The check reports JDK 17 missing

Install or repair JDK 17, then rerun setup. On Fedora, setup uses the Adoptium archive fallback and verifies its checksum. On Windows, it uses WinGet only from an interactive session.

### The check reports unsupported Node.js

Install Node.js within the package.json engines range. Linux setup uses a checksum-verified Node.js 24 release when the distribution package is too old. Termux uses its pkg-provided Node.js version. The check stops if that version is outside the project range.

### The check reports sdkmanager missing

Setup downloads Google's command-line tools package for the current platform. It requires network access and enough free disk space for the compressed archive and extracted tools.

### Setup reports an unaccepted SDK license

The setup script leaves license decisions to you. Open an interactive terminal, run the `sdkmanager --licenses` command for your platform, review and accept the terms, then rerun setup. On Windows, `setup-build.ps1 -Setup` prints a PowerShell command with the selected SDK path. Setup installs missing npm dependencies and writes `android/local.properties` before reaching this license gate.

The initial `[missing]` lines in `-Setup` output describe the environment before setup starts. If setup stops before installing npm dependencies or writing `android/local.properties`, update the checkout from `main` and rerun `setup-build.ps1 -Setup`.

### Setup reports an existing incomplete tool directory

The scripts do not overwrite an existing local Temurin JDK, Node.js toolchain, Android command-line-tools folder, or Termux-compatible NDK folder. Inspect the named path and move or repair it yourself, then rerun setup.

### Termux reports a CXX1102 NDK error

Confirm android/local.properties points ndk.dir to $HOME/termux-ndk-27.1.12297006. That directory must contain source.properties with revision 27.1.12297006 and package.xml. Rerun scripts/setup-build.sh --setup to retry the compatible NDK preparation.
