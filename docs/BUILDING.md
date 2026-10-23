# Building Campus4Change

The source supports PC Android tooling and a separate Termux build path. This is React Native CLI.

## Versions

| Setting | Version |
| --- | --- |
| React Native / React | 0.87.1 / 19.2.3 |
| Node.js engine range / recommended JDK | `^22.13.0 || ^24.3.0 || >=26.0.0` ([React Native 0.87 requirements](https://reactnative.dev/blog/2026/08/11/react-native-0.87)) / 17 (CI also validates 25) |
| Gradle wrapper / resolved Android Gradle Plugin | 9.4.1 / 9.2.1 |
| Kotlin | 2.2.0 |
| Compile / target / minimum SDK | 37 / 36 / 24 |
| Build Tools | 37.0.0 |
| NDK | 27.1.12297006 |
| CMake version | Not pinned by the Android project |
| Current app version / Android version code | 1.3.0 / 6 |

Check `android/build.gradle`, the Gradle wrapper, and the npm lockfile for declarations. Hermes is enabled.

## Desktop setup

Install Node.js, JDK 17, and Android Studio. Installing Android Studio alone does not install every package this project needs or set the SDK path for a terminal build.

In Android Studio, open **SDK Manager** from **More Actions** on the welcome screen, or **Tools > SDK Manager** inside a project. Note the **Android SDK Location** shown there. Enable **Show Package Details** when selecting exact versions.

Install these packages and accept their licenses:

- **SDK Platforms:** Android API 37. The CLI package name is `platforms;android-37.0`.
- **SDK Tools:** Android SDK Build-Tools **37.0.0**.
- **SDK Tools:** NDK (Side by side) **27.1.12297006**.
- **SDK Tools:** CMake. The Android project does not pin a CMake version.
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

### SDK path for macOS and Linux

In Android Studio, read the Android SDK Location from **Tools > SDK Manager**. The common macOS path is `$HOME/Library/Android/sdk`; the common Linux path is `$HOME/Android/Sdk`. Use the location shown by SDK Manager if it differs.

Set the absolute SDK root in `android/local.properties`:

```properties
sdk.dir=/Users/your-name/Library/Android/sdk
```

Use forward slashes. If `android/local.properties` already exists, change only its `sdk.dir` line and keep any existing NDK or CMake settings. The file is ignored by Git.

For a macOS terminal build, point `JAVA_HOME` at JDK 17:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
java -version
```

Android Studio's Gradle JDK setting does not set `JAVA_HOME` in a terminal.

### Install dependencies and build

From the repository root:

```powershell
npm ci
cd android
.\gradlew.bat assembleDebug
```

PowerShell requires the `.\` prefix for a program in the current folder. If already inside `android/`, run the Gradle command directly; do not enter another `android/` folder.

On Linux/macOS, set `sdk.dir` in `android/local.properties` to that machine's SDK location. From the **repository root**, install the JavaScript dependencies before running Gradle; `android/settings.gradle` loads the React Native Gradle plugin from `node_modules`:

```sh
node --version # must satisfy package.json: ^22.13.0 || ^24.3.0 || >=26.0.0
npm ci
test -d node_modules/@react-native/gradle-plugin
cd android
./gradlew assembleDebug
```

These commands build the local debug APK and need no release secrets. Release artifact tasks such as `assembleRelease`, `bundleRelease`, and `installRelease` fail early unless a dedicated keystore and all four `C4C_RELEASE_*` variables are configured. Use a release task only after setting up that signer. If your prompt already ends in `android`, run `cd ..` before `npm ci`, then return to `android`. The Gradle wrapper downloads Gradle itself, but it does **not** install npm packages.

The repository tracks `android/app/debug.keystore` for cross-clone debug APK
compatibility. The repository is public, so do not register that shared
certificate with Firebase Google sign-in. For Google sign-in testing, opt into
your machine's private Android debug keystore with `C4C_DEBUG_STORE_FILE`:

```sh
C4C_DEBUG_STORE_FILE="$HOME/.android/debug.keystore" ./gradlew assembleDebug
```

On Windows PowerShell:

```powershell
$env:C4C_DEBUG_STORE_FILE = Join-Path $HOME '.android\debug.keystore'
.\gradlew.bat assembleDebug
```

This setting applies only to that build; it is not stored in Git. Firebase has
the current workstation's per-user debug SHA-1 and the previous v1.2.2 release
SHA-1/SHA-256 registered. The replacement signer used by the current v1.3.0
release is not registered yet, so release Google sign-in remains unverified;
see [Firebase setup](FIREBASE_SETUP.md) for its fingerprints and current status.
Other developers must use their own local key and authorize its SHA-1
separately before testing Google sign-in. Switching between different debug
keys prevents an in-place APK update; uninstalling the old APK removes
device-only app data.
Back up or migrate local-only data before changing the signing key on a device
that already has the app installed. Keep App Check registration and its
SHA-256 fingerprints separate from this Google sign-in setup. If your local key
uses nonstandard credentials, set `C4C_DEBUG_STORE_PASSWORD`,
`C4C_DEBUG_KEY_ALIAS`, and `C4C_DEBUG_KEY_PASSWORD` in the build terminal; do
not store those values in the repository.

For development, run `npm start` at the root in one terminal and `npm run android` at the root in another. The npm script binds Metro to `127.0.0.1` so the development server is not exposed to the LAN; React Native CLI forwards port 8081 to a connected Android device. For a manually installed debug APK, run `adb reverse tcp:8081 tcp:8081` before launch. A debug APK needs Metro for the JavaScript code; building it alone does not start Metro. Android Studio can also run the debug app after project sync.

### Local Firebase emulator QA build

Use this debug APK only with the local Auth and Firestore emulators. The helper
temporarily selects the demo project `demo-campus4change-rules`, bundles the
loopback emulator host, and restores `firebaseConfig.js` byte-for-byte after
Gradle exits:

```sh
npx --yes firebase-tools@15.33.0 emulators:start --only auth,firestore --project demo-campus4change-rules
# In another terminal at the repository root:
npm run android:qa-emulators
```

The output is `android/app/build/outputs/apk/debug/app-debug.apk`. For a
physical device, identify its model and serial with `adb devices -l`, then
forward both emulator ports:

```sh
adb -s SERIAL reverse tcp:9099 tcp:9099
adb -s SERIAL reverse tcp:8080 tcp:8080
adb -s SERIAL install -r android/app/build/outputs/apk/debug/app-debug.apk
```

To test a disposable QA copy beside an existing installation without replacing
its package or data, use an application ID suffix:

```sh
C4C_QA_APPLICATION_ID_SUFFIX=.qa npm run android:qa-emulators
adb -s SERIAL install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The QA package ID becomes `com.campus4change.qa`. After testing, remove only
that copy with `adb -s SERIAL uninstall com.campus4change.qa`. Leave the suffix
unset for the standard `com.campus4change` package.

The app and emulators must run on the same workstation. Use disposable local
emulator accounts and data. This APK is not a release build. `C4C_DEBUG_STORE_FILE`
may select the signing key needed to update an existing local installation.
For a physical device, the QA builder defaults to host `127.0.0.1` and requires
the reverse mappings above. For an Android Virtual Device, use
`C4C_FIREBASE_EMULATOR_HOST=10.0.2.2 npm run android:qa-emulators`; this is the
emulator's host-machine alias. The helper rejects other emulator hosts so the
QA build cannot silently target an arbitrary remote service.

Outputs are `app-debug.apk` in `android/app/build/outputs/apk/debug/` and `app-release.apk` in the equivalent `release/` folder.

Release APKs bundle JavaScript, Hermes bytecode, fonts, and images and run without Metro. Normal PC builds include default ARM/x86 ABIs. A known ARM64 device can use `-PreactNativeArchitectures=arm64-v8a`.

The original 1.2.0 Windows release verification used SDK/JDK tools in ignored `.tools/`. Those temporary tool copies are no longer present on this PC. Its Android Studio SDK is outside the repository, under `%LOCALAPPDATA%\Android\Sdk`. Use the location actually shown by SDK Manager. An emulator also needs a working host virtualization setup; building an APK does not prove device behavior.

### Common setup failures

- **`Included build .../node_modules/@react-native/gradle-plugin does not exist`:** run `npm ci` from the repository root (the directory with `package.json` and `package-lock.json`), wait for it to finish successfully, then rerun Gradle. If `npm ci` fails, fix that npm error first; do not edit `android/settings.gradle` or install the plugin separately. Check with `test -d node_modules/@react-native/gradle-plugin`.
- **SDK location not found:** create or correct `android/local.properties` as above, then rerun Gradle.
- **Missing SDK/NDK package or license:** install the exact version through SDK Manager and accept its license. Build Tools 36.0.0 does not satisfy this project's explicit 37.0.0 setting.
- **Java version error:** check Java and Gradle versions from the same terminal. Set `JAVA_HOME` to a supported JDK 17 installation. CI also verifies JDK 25. On the current Fedora workstation, the default OpenJDK 27 fails while compiling the Gradle script with `Unsupported class file major version 71`; using the installed JDK 25 succeeds. Android Studio's Gradle JDK and the terminal's Java installation can differ.
- **macOS debug build fails without a clear cause:** verify `JAVA_HOME` and `sdk.dir`, then capture the Gradle failure from the repository root. `pipefail` preserves Gradle's nonzero exit status when `tee` writes the log:

  ```sh
  set -o pipefail
  cd android
  ./gradlew :app:assembleDebug --no-daemon --stacktrace --console=plain 2>&1 | tee /tmp/campus4change-macos-build.log
  ```

  The same Gradle task passed on Fedora with JDK 25 on 2026-10-21. That Linux result does not verify macOS toolchain or SDK configuration.

  Read the first `* What went wrong:` block and its earliest `Caused by:` entry. The log may contain local file paths; review it before sharing. Do not include signing passwords or tokens.
- **A local `assembleRelease` fails for missing release signing values:** use `assembleDebug` for a local test APK. Release tasks require a dedicated keystore and all four `C4C_RELEASE_*` variables.
- **Termux reports `CANNOT LINK EXECUTABLE "node"` or `CANNOT LINK EXECUTABLE "curl"`:** run `pkg update` and `pkg upgrade` before installing Node.js and the remaining build tools. Refreshing package indexes alone does not update the Termux base libraries.
- **Termux reports no Java installation matching language version 17:** install `openjdk-17`, set `JAVA_HOME="$PREFIX/lib/jvm/java-17-openjdk"`, and run the Termux Gradle wrapper from the project root.
- **Termux autolinking exits 126 with `react-native: Permission denied` from an ADB `run-as` shell:** run Gradle from the Termux app terminal. This check found `LD_PRELOAD` in the Termux environment but not in `run-as`; the `npx @react-native-community/cli config` command failed only in `run-as` and passed from Termux.
- **Termux reports `SDK location not found`:** set `sdk.dir` in `android/local.properties` to the SDK root on the phone. Install the required platform and Build Tools packages, prepare the separate Termux NDK path with `scripts/setup-termux-ndk.sh`, and point `ndk.dir` to that path.
- **Gradle deprecation warning or Problems report:** read the actual failure under **What went wrong**. These messages alone do not mean the build failed.

## Termux

Run these commands from the Termux app terminal on an ARM64 Android device. An ADB `run-as` shell does not inherit Termux's environment or network context, so it is not a faithful way to test this build path.

Update Termux's base packages before installing the build tools. This keeps packages such as Node.js, OpenSSL, and curl on compatible versions:

```sh
pkg update
pkg upgrade
pkg install nodejs openjdk-17 git curl unzip zip cmake ninja make clang \
  aapt2 d8 apksigner ndk-sysroot ndk-multilib qemu-user-x86-64
```

React Native 0.87.1 accepts Node.js `^22.13.0 || ^24.3.0 || >=26.0.0`. Check the installed version with `node --version`. Gradle's included Kotlin build requests a JDK 17 toolchain. Set `JAVA_HOME` to Termux's JDK 17 before building:

```sh
export JAVA_HOME="$PREFIX/lib/jvm/java-17-openjdk"
java -version
```

If Termux cannot resolve its package mirror, run `termux-change-repo`, choose a working main mirror, and retry `pkg update`.

### Install Android SDK packages

Termux packages do not include the Android SDK platform. Download the Linux Android Command-Line Tools archive from the [official Android SDK tools page](https://developer.android.com/tools/sdkmanager) and place it in the Termux home directory. Arrange the extracted files so `sdkmanager` is at `$HOME/android-sdk/cmdline-tools/latest/bin/sdkmanager`:

```sh
mkdir -p "$HOME/android-sdk/cmdline-tools/latest"
unzip -q commandlinetools-linux-*_latest.zip -d "$HOME/android-sdk/cmdline-tools"
mv "$HOME/android-sdk/cmdline-tools/cmdline-tools/"* "$HOME/android-sdk/cmdline-tools/latest/"
"$HOME/android-sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/android-sdk" \
  "platforms;android-37.0" "build-tools;37.0.0" "ndk;27.1.12297006"
"$HOME/android-sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/android-sdk" --licenses
```

Accept the Android SDK license prompts in Termux. The stock NDK contains Linux x86_64 host tools, which cannot run directly on an ARM64 phone. Do not point `ndk.dir` at the stock package. The project helper below copies its Android CMake metadata into a separate directory and maps it to Termux-native LLVM and sysroot files. Installing `ndk-multilib` alone does not create that compatibility layout. The separate [Termux React Native APK guide](https://github.com/Patt-00/Termux-React-Native-APK-Guide) gives more background on the same approach.

Google now marks `sdkmanager` as deprecated and recommends the [Android CLI](https://developer.android.com/tools/agents/android-cli). The command above is retained for the Command-Line Tools package, which still provides `sdkmanager`; this package-install step was not part of the on-device build verification below.

After installing the NDK package, create a separate Termux-compatible NDK directory. This copies only the Android NDK CMake metadata and points the compiler, headers, ARM64 system libraries, Clang runtime, and Gradle's strip-tool lookup at Termux's native tools:

```sh
sh scripts/setup-termux-ndk.sh \
  "$HOME/android-sdk/ndk/27.1.12297006" \
  "$HOME/termux-ndk-27.1.12297006"
```

The helper defaults to those two paths and targets API 24, matching this app's current `minSdk`. Revisit the helper if the app's minimum SDK changes. Do not set `ndk.dir` to the stock Google NDK folder on the phone; the helper prepares an isolated ARM64-compatible directory for this project.

Set the SDK, CMake, and compatible NDK paths in the ignored `android/local.properties`. Keep existing entries when editing this file:

```properties
sdk.dir=/data/data/com.termux/files/home/android-sdk
cmake.dir=/data/data/com.termux/files/usr
ndk.dir=/data/data/com.termux/files/home/termux-ndk-27.1.12297006
```

Use paths that exist on the phone. Do not copy `local.properties` between a phone and a computer. From the repository root, install JavaScript dependencies and build a debug APK:

```sh
npm ci
export JAVA_HOME="$PREFIX/lib/jvm/java-17-openjdk"
./scripts/gradlew-termux.sh assembleDebug --no-daemon --max-workers=2 --console=plain
```

The wrapper passes `-PtermuxBuild=true`, selects Termux's `aapt2` and the `arm64-v8a` ABI, and runs Hermes through QEMU. Do not use `--offline` on the first Gradle build. A debug APK normally needs Metro. A standalone release APK needs the dedicated release keystore and all four `C4C_RELEASE_*` variables. Do not use `assembleRelease` until those variables point to the intended signer.

A clean Termux debug build of the source at the 1.3.0/code 6 checkpoint passed on the POCO X4 GT on 2026-10-21. It ran from the Termux app terminal in an isolated worktree and reused the configured `node_modules`, Android SDK, Gradle cache, and Termux-compatible NDK in `android/local.properties`. Node.js was 26.4.0 and JDK 17.0.20. The 1.3.0 `./scripts/gradlew-termux.sh clean assembleDebug --no-daemon --max-workers=2 --console=plain` build completed 92 actionable tasks in 1 minute 59 seconds: 81 executed and 11 up-to-date.

A fresh GitHub clone of commit `6101ee252c60a18337f73470247ae8f256202121` was then built in Termux on 2026-10-23. The clone used Node.js 26.4.0, Git 2.56.0, JDK 17.0.21, and the existing SDK/Termux NDK paths copied through the ignored `android/local.properties`. `npm ci` added 1,148 packages. `./scripts/gradlew-termux.sh clean assembleDebug --no-daemon --max-workers=2 --console=plain` passed 92 actionable tasks (90 executed, 2 up-to-date) in 2 minutes 51 seconds. APK metadata reports `com.campus4change`, version 1.4.0/code 7; Termux `apksigner verify` passed. The debug APK was not installed. The fresh clone reused existing SDK/NDK packages, so this does not verify first-time SDK/NDK setup.

The APK is 41,322,431 bytes with SHA-256 `8f2e129f54ea80ca8c48d80fc9ef8cbdd0738ce62cebfd3f52dc2461d5d78ddf`. Package metadata reports `com.campus4change`, version 1.3.0, version code 6, minimum API 24, target API 36, and ABI `arm64-v8a`. `apksigner verify --verbose --print-certs` passed with the Termux debug certificate, SHA-1 `5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25` and SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Gradle, CMake, and NDK emitted deprecation and copy-fallback warnings, but the build completed. This verifies debug APK assembly and signing only; no Termux release build or on-device install/launch was performed. The debug APK normally requires Metro for its JavaScript bundle.

The Termux build also uses a Termux-only CMake adjustment in `scripts/termux-prefab.cmake`. Termux Clang reports `aarch64-none-linux-android24`, while Gradle extracts React Native's Prefab package configs under `lib/aarch64-linux-android/cmake`. Without the adjustment, CMake can fail to find `ReactAndroidConfig.cmake` even though the file is present. The adjustment is enabled only by the Termux build flag; PC builds keep their normal configuration.

Check an APK before distributing it:

```sh
apksigner verify --verbose android/app/build/outputs/apk/debug/app-debug.apk
```

## Release signing and platform limits

The debug variant uses the tracked `android/app/debug.keystore` for development
only. This key is present in the public repository, so treat its signing identity
as public; never use it for release builds or as a production trust anchor.
Rotating it will prevent in-place updates to APKs signed with the current debug
key unless a signing-key migration is planned. The release variant never falls
back to that key: release artifact tasks fail before execution unless a
dedicated keystore file and all four environment variables are supplied:

- `C4C_RELEASE_STORE_FILE`: absolute path to the private keystore file.
- `C4C_RELEASE_STORE_PASSWORD`: keystore password.
- `C4C_RELEASE_KEY_ALIAS`: alias of the release key.
- `C4C_RELEASE_KEY_PASSWORD`: release-key password.

The published v1.0.0–v1.2.0 APKs were signed with the repository debug key.
Their release certificate is public and must not be used for future releases.
The v1.2.2 release uses a dedicated private signer. The v1.0.0, v1.1.0, and
v1.2.0 GitHub release entries were removed after v1.2.2 was published. Their
verified files remain in the local archive at
/home/patt/Documents/Codex/Campus4Change-release-archive-2026-10-17. The current
release is https://github.com/Patt-00/Campus4Change/releases/tag/v1.2.2.
The v1.3.0-preview.2 APK and local AAB used the previous v3 signer. The 1.4.0
release candidate (version code 7) was built on 2026-10-23 with the new v4
signer. The local signed APK SHA-256 is
`e1c13ca9af40494302fcee8b717503d2e1f3f8a5b19d580368a27f859cd94b8a`; the AAB
SHA-256 is `4f4339999355e4e5975d118d7317b38e530e461a7bb06cba437f94db5511d5bb`.
The APK passed `apksigner verify`; the AAB passed `jarsigner -verify` and ZIP
integrity checks. The APK is installed on the POCO X4 GT and the pulled package
hash matches the local artifact. These candidate artifacts are not published.

To build both release artifacts with the dedicated signer, run this helper
from an interactive terminal at the repository root:

```sh
./scripts/build-release.sh
```

The helper defaults to `~/.android/keystores/campus4change-release-v4.jks`,
alias `campus4change-v4`, and GNOME Secret Service account
`campus4change-release-v4`. It creates the key if needed, builds the APK and
AAB, and prints their SHA-256 hashes. The signing password is loaded from
GNOME Keyring on this workstation. The signing credentials are never printed,
committed, or written to Gradle properties.

On the Fedora workstation, rebuild using:

```sh
DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/bus" \
./scripts/build-release.sh
```

The helper uses the `campus4change-release-signing` service and the
`campus4change-release-v4` account. On macOS or Termux, where GNOME Secret
Service is unavailable, enter the passwords at the hidden prompts or provide
the four `C4C_RELEASE_*` variables through the system password manager. Never
store signing passwords in the repository or shell history. Keep the JKS file
and its password-manager entry in separate secure recovery locations; losing
either prevents future updates signed with this certificate. The helper does
not publish artifacts or alter GitHub releases. The v4 SHA-1 is registered for
Google sign-in and its SHA-256 is registered with the Firebase Android app;
Play Integrity App Check registration is pending the required terms acceptance
in Firebase Console. Existing installs signed with a different key must be
uninstalled before this release can be installed, which clears device-only
state and app-private photos. Firebase-backed accounts and Firestore data
remain in the cloud unless explicitly deleted. See
[Android app signing](https://developer.android.com/studio/publish/app-signing)
and [Gradle release signing](https://developer.android.com/build/building-cmdline#sign_your_app).

PowerShell and CI should provide the same four variables through a secure
secret store. Do not save passwords in `gradle.properties`, shell history, or
the repository.

The published v1.2.2 release has version code 5, and the v1.3.0 preview uses
version code 6. The current candidate is version 1.4.0/code 7 with application
ID `com.campus4change`.

An update requires a matching application ID and signing certificate. Use your machine's private debug key with `C4C_DEBUG_STORE_FILE` when updating an installation made with that key. The 1.3.0 emulator QA build was updated in place on the POCO X4 GT and Pad 7 with local app data preserved. It targets local Firebase emulators and is not a release. The publicly released v1.2.0 APK used the repository debug signing identity; the published v1.2.2 release uses the separate private signer created by `scripts/build-release.sh`. Moving an old installation to the release signer requires uninstalling it, which removes device-local state. Firebase-backed account state can be restored after signing in again, but local-only state and device-only profile photos cannot. Back up or migrate local-only state before reinstalling.

Minimum Android is 7.0. The iOS scaffold has no native implementation for local accounts.

## Checks

```sh
npm run lint
npm test -- --runInBand --testTimeout=15000
git diff --check
```

Keep the demonstrated APK and source aligned. Record bundle generation, native build, installation, launch, and interactions separately in [VERIFICATION.md](VERIFICATION.md).
