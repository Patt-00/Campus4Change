# Building Campus4Change

The source supports PC Android tooling and a separate Termux build path. This is React Native CLI.

## Versions

| Setting | Version |
| --- | --- |
| React Native / React | 0.87.1 / 19.2.3 |
| Node minimum / recommended JDK | 22.11.0 / 17 |
| Gradle wrapper / resolved Android Gradle Plugin | 9.4.1 / 9.2.1 |
| Kotlin | 2.2.0 |
| Compile / target / minimum SDK | 37 / 36 / 24 |
| Build Tools | 37.0.0 |
| NDK | 27.1.12297006 |
| App CMake | 3.22.1 |

Check `android/build.gradle`, the Gradle wrapper, and the npm lockfile for declarations. Hermes is enabled.

## PC setup

Install Node.js, JDK 17, and Android Studio. Installing Android Studio alone does not install every package this project needs or set the SDK path for a terminal build.

In Android Studio, open **SDK Manager** from **More Actions** on the welcome screen, or **Tools > SDK Manager** inside a project. Note the **Android SDK Location** shown there. Enable **Show Package Details** when selecting exact versions.

Install these packages and accept their licenses:

- **SDK Platforms:** Android API 37. The CLI package name is `platforms;android-37.0`.
- **SDK Tools:** Android SDK Build-Tools **37.0.0**.
- **SDK Tools:** NDK (Side by side) **27.1.12297006**.
- **SDK Tools:** CMake **3.22.1**.
- **SDK Tools:** Android SDK Platform-Tools, for running on a device.

Gradle can download missing NDK, CMake, and build packages when their licenses have already been accepted. The first build may take several minutes and use substantial disk space. See [Android SDK Manager](https://developer.android.com/studio/intro/update#sdk-manager) and [NDK/CMake setup](https://developer.android.com/studio/projects/install-ndk).

### SDK path for Windows PowerShell

Before running Gradle, create `android/local.properties`. If the file already exists, update its `sdk.dir` line and retain any other local settings. Run this initial setup from the repository root, not from `android/`:

```powershell
$campusSdkPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (!(Test-Path -LiteralPath $campusSdkPath)) {
    throw 'Use the Android SDK Location shown in Android Studio SDK Manager.'
}
'sdk.dir=' + $campusSdkPath.Replace('\', '/') |
    Set-Content -LiteralPath .\android\local.properties -Encoding ascii
```

If SDK Manager shows a different location, set `$campusSdkPath` to that location first. For this PC, the file contains:

```properties
sdk.dir=C:/Users/urbin/AppData/Local/Android/Sdk
```

Use forward slashes in the properties file. `sdk.dir` points to the SDK root, not its `platform-tools` or `platforms` folder. The file is ignored by Git because every machine has its own SDK path. It is normally created during Android Studio project sync, but a terminal build still needs a valid SDK location. See [Android local build properties](https://developer.android.com/build#local-properties).

### Install dependencies and build

From the repository root:

```powershell
npm ci
cd android
.\gradlew.bat assembleDebug
# For an APK that runs without Metro:
.\gradlew.bat assembleRelease
```

PowerShell requires the `.\` prefix for a program in the current folder. If already inside `android/`, run the Gradle command directly; do not enter another `android/` folder.

On Linux/macOS, set `sdk.dir` in `android/local.properties` to that machine's SDK location, install dependencies at the root, then run from `android/`:

```sh
./gradlew assembleDebug
./gradlew assembleRelease
```

For development, run `npm start` at the root in one terminal and `npm run android` at the root in another. A debug APK needs Metro for the JavaScript code; building it alone does not start Metro. Android Studio can also run the debug app after project sync.

Outputs are `app-debug.apk` in `android/app/build/outputs/apk/debug/` and `app-release.apk` in the equivalent `release/` folder.

Release APKs bundle JavaScript, Hermes bytecode, fonts, and images and run without Metro. Normal PC builds include default ARM/x86 ABIs. A known ARM64 device can use `-PreactNativeArchitectures=arm64-v8a`.

The original 1.2.0 Windows release verification used SDK/JDK tools in ignored `.tools/`. Those temporary tool copies are no longer present on this PC. Its Android Studio SDK is outside the repository, under `%LOCALAPPDATA%\Android\Sdk`. Use the location actually shown by SDK Manager. An emulator also needs a working host virtualization setup; building an APK does not prove device behavior.

### Common setup failures

- **SDK location not found:** create or correct `android/local.properties` as above, then rerun Gradle.
- **Missing SDK/NDK package or license:** install the exact version through SDK Manager and accept its license. Build Tools 36.0.0 does not satisfy this project's explicit 37.0.0 setting.
- **Java version error:** check `java -version` and `.\gradlew.bat --version` from `android/`. Set `JAVA_HOME` to a JDK 17 installation and reopen the terminal. Android Studio's Gradle JDK and the terminal's Java installation can differ.
- **Gradle deprecation warning or Problems report:** read the actual failure under **What went wrong**. These messages alone do not mean the build failed.

## Termux

Use the phone's own SDK/NDK paths in `android/local.properties`. Run from the root:

```sh
./scripts/gradlew-termux.sh assembleDebug
./scripts/gradlew-termux.sh assembleRelease
```

The wrapper supplies Termux aapt2, ARM64 ABI selection, and the QEMU-backed Hermes compiler flag. These paths stay out of normal PC configuration. Do not copy `local.properties` between phone and PC.

The wrapper and Hermes script were retained. Version 1.2.0 was not rebuilt in Termux during Windows verification.

## Signing and platform limits

The release variant uses the repository's debug signing key for school distribution. It is not production store signing. Version 1.2.0 has version code 3 and application ID `com.campus4change`.

An update requires a matching application ID and signing certificate. The v1.0.0, 1.1.0, and 1.2.0 APKs have the same signing certificate. The earlier 1.1.0 update over v1.0 succeeded on one Android 16 phone. Installation of 1.2.0 is left to the user and has not been verified. Updating is intended to retain app data; uninstalling removes it.

Minimum Android is 7.0. Optional biometrics require Android 9 or newer. The iOS scaffold has no native implementation for these local accounts.

## Checks

```sh
npx tsc --noEmit
npm run lint
npm test -- --runInBand
git diff --check
```

Keep the demonstrated APK and source aligned. Record bundle generation, native build, installation, launch, and interactions separately in [VERIFICATION.md](VERIFICATION.md).
