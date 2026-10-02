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

On Linux/macOS, set `sdk.dir` in `android/local.properties` to that machine's SDK location. From the **repository root**, install the JavaScript dependencies before running Gradle; `android/settings.gradle` loads the React Native Gradle plugin from `node_modules`:

```sh
node --version # must satisfy package.json: >= 22.11.0
npm ci
test -d node_modules/@react-native/gradle-plugin
cd android
./gradlew assembleDebug
# Or, for an APK that runs without Metro:
./gradlew assembleRelease
```

Run either Gradle build as needed; both commands are shown as options. If your prompt already ends in `android`, run `cd ..` before `npm ci`, then return to `android`. The Gradle wrapper downloads Gradle itself, but it does **not** install npm packages.

For development, run `npm start` at the root in one terminal and `npm run android` at the root in another. A debug APK needs Metro for the JavaScript code; building it alone does not start Metro. Android Studio can also run the debug app after project sync.

Outputs are `app-debug.apk` in `android/app/build/outputs/apk/debug/` and `app-release.apk` in the equivalent `release/` folder.

Release APKs bundle JavaScript, Hermes bytecode, fonts, and images and run without Metro. Normal PC builds include default ARM/x86 ABIs. A known ARM64 device can use `-PreactNativeArchitectures=arm64-v8a`.

The original 1.2.0 Windows release verification used SDK/JDK tools in ignored `.tools/`. Those temporary tool copies are no longer present on this PC. Its Android Studio SDK is outside the repository, under `%LOCALAPPDATA%\Android\Sdk`. Use the location actually shown by SDK Manager. An emulator also needs a working host virtualization setup; building an APK does not prove device behavior.

### Common setup failures

- **`Included build .../node_modules/@react-native/gradle-plugin does not exist`:** run `npm ci` from the repository root (the directory with `package.json` and `package-lock.json`), wait for it to finish successfully, then rerun Gradle. If `npm ci` fails, fix that npm error first; do not edit `android/settings.gradle` or install the plugin separately. Check with `test -d node_modules/@react-native/gradle-plugin`.
- **SDK location not found:** create or correct `android/local.properties` as above, then rerun Gradle.
- **Missing SDK/NDK package or license:** install the exact version through SDK Manager and accept its license. Build Tools 36.0.0 does not satisfy this project's explicit 37.0.0 setting.
- **Java version error:** check `java -version` and `.\gradlew.bat --version` from `android/`. Set `JAVA_HOME` to a JDK 17 installation and reopen the terminal. Android Studio's Gradle JDK and the terminal's Java installation can differ.
- **Gradle deprecation warning or Problems report:** read the actual failure under **What went wrong**. These messages alone do not mean the build failed.

## Termux

This is a native React Native CLI build on an ARM64 phone, without Expo or a PC. It was verified on 2026-10-02 with Termux Node 26.4.0, OpenJDK 21, React Native 0.87.1, Android Gradle Plugin 9.2.1, and the project versions listed above. The Android SDK needs platform `android-37.0` and Build Tools `37.0.0`. Termux also needs native `aapt2`, CMake, Ninja, and `qemu-x86_64`. Install dependencies from the repository root with `npm ci`.

The stock Google NDK contains x86_64 host tools and cannot run directly on an ARM64 phone. Use a Termux-compatible NDK layout with the project's NDK version and native LLVM tools. The separate [Termux React Native APK guide](https://github.com/Patt-00/Termux-React-Native-APK-Guide) explains that prerequisite. The SDK, native CMake, and compatible NDK paths used for this verified build were placed in the ignored `android/local.properties`:

```properties
sdk.dir=/data/data/com.termux/files/home/android-sdk
cmake.dir=/data/data/com.termux/files/usr
ndk.dir=/data/data/com.termux/files/home/termux-ndk
```

Use paths that actually exist on your phone; do not copy `local.properties` between phone and PC. From the repository root, build the standalone ARM64 release APK:

```sh
npm ci
./scripts/gradlew-termux.sh assembleRelease --offline --console=plain
```

Omit `--offline` on the first build or whenever Gradle must download dependencies. The wrapper passes `-PtermuxBuild=true`, selects Termux's `aapt2` and `arm64-v8a`, and uses the QEMU-backed Hermes compiler. For a development build, replace `assembleRelease` with `assembleDebug`; that APK normally needs Metro running.

The release build also uses a Termux-only CMake adjustment in `scripts/termux-prefab.cmake`. Termux Clang reports `aarch64-none-linux-android24`, while Gradle extracts React Native's Prefab package configs under `lib/aarch64-linux-android/cmake`. Without the adjustment, CMake can fail to find `ReactAndroidConfig.cmake` even though the file is present. The adjustment is enabled only by the Termux build flag; PC builds keep their normal configuration.

The successful build produced `android/app/build/outputs/apk/release/app-release.apk`, version 1.2.0, for `arm64-v8a`. Check an APK before distributing it:

```sh
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
unzip -l android/app/build/outputs/apk/release/app-release.apk | grep index.android.bundle
```

The 2026-10-02 APK's signature verified. This build result does not establish that the APK was installed or that every screen was tested on a device. The release variant still uses the project's debug signing key, not production store signing.

## Signing and platform limits

The release variant uses the repository's debug signing key for school distribution. It is not production store signing. Version 1.2.0 has version code 3 and application ID `com.campus4change`.

An update requires a matching application ID and signing certificate. The v1.0.0, 1.1.0, and 1.2.0 APKs have the same signing certificate. The earlier 1.1.0 update over v1.0 succeeded on one Android 16 phone. Installation of 1.2.0 is left to the user and has not been verified. Updating is intended to retain app data; uninstalling removes it.

Minimum Android is 7.0. Optional biometrics require Android 9 or newer. The iOS scaffold has no native implementation for these local accounts.

## Checks

```sh
npm run lint
npm test -- --runInBand --testTimeout=15000
git diff --check
```

Keep the demonstrated APK and source aligned. Record bundle generation, native build, installation, launch, and interactions separately in [VERIFICATION.md](VERIFICATION.md).
