# Build Campus4Change

This guide builds the Android app from a clean clone on Windows, macOS, Linux, or Termux. Campus4Change uses React Native CLI, JavaScript/JSX, Kotlin Android modules, and Firebase.

## Current release and required tools

The signed Campus4Change 1.4.4 APK is available from the [GitHub release page](https://github.com/Patt-00/Campus4Change/releases/tag/v1.4.4).

- Package: `com.campus4change`
- Version: 1.4.4, Android version code 12
- Minimum Android version: API 24
- APK SHA-256: `bb18ef8071c3d8932973ff0bb1bd2f950f1aa7b00b352c9882f1936b8c684f92`
- Release APK path after a local build: `android/app/build/outputs/apk/release/app-release.apk`

Use the tool versions declared in the project:

| Tool | Version |
| --- | --- |
| React Native / React | 0.87.1 / 19.2.3 |
| Node.js | `^22.13.0 || ^24.3.0 || >=26.0.0` |
| JDK | 17 |
| Gradle wrapper / Android Gradle Plugin | 9.4.1 / 9.2.1 |
| Kotlin | 2.2.0 |
| Compile SDK / target SDK / minimum SDK | 37 / 36 / 24 |
| Android Build Tools | 37.0.0 |
| Android NDK | 27.1.12297006 |

React Native 0.87 requires Node.js 22.13.0 or later and Android API 37 build tools. See the [React Native 0.87 release notes](https://reactnative.dev/blog/2026/08/11/react-native-0.87). Android SDK packages are managed in [Android Studio SDK Manager](https://developer.android.com/studio/intro/update).

## Clone the repository

Install Git and a supported Node.js version, then clone the public repository. Run npm from the repository root, where `package.json` and `package-lock.json` are located.

```sh
git clone https://github.com/Patt-00/Campus4Change.git
cd Campus4Change
npm ci
```

Do not run `npm ci` from the `android` directory. Gradle loads the React Native plugin from the root `node_modules` directory.

## Android SDK setup

Install Android Studio, open **Tools > SDK Manager**, and install these packages:

- Android SDK Platform 37.0
- Android SDK Build Tools 37.0.0
- Android NDK (Side by side) 27.1.12297006
- Android SDK Platform-Tools
- CMake

Accept the licenses for each package. The Android SDK command-line tool is documented in the [SDK Manager guide](https://developer.android.com/tools/sdkmanager).

Create `android/local.properties` with the SDK root on your computer. The file is local and ignored by Git. Keep any existing NDK and CMake entries.

```properties
sdk.dir=/absolute/path/to/Android/Sdk
```

The Android Gradle Plugin reads the SDK path from `local.properties`. See [Android local build properties](https://developer.android.com/build#local-properties).

## Automated prerequisite setup

The repository includes setup scripts for Bash platforms and Windows PowerShell. Run them from the repository root. The check mode reports missing tools without installing packages or writing project configuration. It may query the Android SDK repository to inspect license status. See [scripts/SCRIPT.md](../scripts/SCRIPT.md) for script behavior, generated files, package details, and troubleshooting.

On macOS, Linux, or Termux, check the current environment with:

~~~sh
./scripts/setup-build.sh --check
~~~

Install supported missing prerequisites and configure the Android SDK with:

~~~sh
./scripts/setup-build.sh --setup
source ./.c4c-build-env.sh
~~~

On Windows PowerShell, use:

~~~powershell
.\scripts\setup-build.ps1 -Check
.\scripts\setup-build.ps1 -Setup
. .\.c4c-build-env.ps1
~~~

Setup installs host packages through apt, dnf, Homebrew, Termux pkg, or WinGet when that package manager is available. Linux setup uses checksum-verified Node.js 24 and Temurin 17 downloads when the distribution does not provide compatible packages. Windows setup uses WinGet for Git, Node.js LTS, and Temurin 17 when those tools are missing. Termux setup installs the ARM64 build packages and prepares the compatible NDK directory.

When the Windows script runs through SSH, it refuses to launch WinGet installers if Git, Node.js, or JDK 17 are missing, since package installers may open Windows UI. Install missing host tools from an interactive PowerShell session, then rerun the script over SSH. SDK command-line tools download and license-status checks use the command line.

If Android SDK Command-line Tools are missing, setup downloads the platform-specific Google package and verifies its SHA-256 checksum before unpacking it. The pinned package build is 15859902; update the version and checksum together when Google publishes a newer package. See the [Android Studio downloads page](https://developer.android.com/studio/) for current command-line tools.

Both scripts use Android SDK Manager to install Platform 37.0, Build Tools 37.0.0, NDK 27.1.12297006, and CMake 3.22.1. Check mode tests license status with input closed and reports any license that remains unaccepted. Setup installs npm dependencies and writes local SDK configuration before checking licenses. It stops before SDK package installation if a license remains unaccepted, then prints the interactive command for you to review and accept it. The scripts never auto-accept licenses. Setup runs **npm ci** only when the React Native package is missing from **node_modules**.

Setup writes **android/local.properties** and an ignored environment file for the current repository. It preserves existing local NDK and CMake settings except on Termux, where it sets the documented compatibility paths. The scripts do not build an APK or use release-signing credentials.

The setup scripts do not open Android Studio. On Termux, setup installs the command-line tools package, then prepares the compatible NDK directory. SDK license acceptance still requires your input in the terminal.

## Build debug and release APKs

Run the setup script for your platform first. If it stops because an Android SDK license is pending, review and accept the license in an interactive terminal, then rerun setup. The APK build scripts check prerequisites, build the selected variant, verify its signature, and print the APK's SHA-256 hash.

On macOS, Linux, or Termux, run one of these commands from the repository root:

```sh
./scripts/build-apk.sh --debug
./scripts/build-apk.sh --release
./scripts/build-apk.sh --both
```

On Windows PowerShell, run one of these commands from the repository root:

```powershell
.\scripts\build-apk.ps1 -Mode Debug
.\scripts\build-apk.ps1 -Mode Release
.\scripts\build-apk.ps1 -Mode Both
```

Debug mode creates `android/app/build/outputs/apk/debug/app-debug.apk`. Release mode creates `android/app/build/outputs/apk/release/app-release.apk`. Both mode builds the debug APK first, then the signed release APK. A debug APK requires Metro when launched. A release APK includes the JavaScript bundle.

Release builds require the existing v4 keystore. The Bash script prompts for passwords without echoing them, or reads the store password from GNOME Secret Service when available. The PowerShell script uses secure password prompts. These APK scripts refuse to create a replacement keystore. Keep the keystore and passwords out of the repository.

Termux uses the Bash script and its Termux Gradle wrapper. The Termux release build also requires the existing v4 keystore to be available to Termux.

## Windows

Use PowerShell on a Windows x64 computer. Install these tools before building:

- [Git for Windows](https://git-scm.com/download/win) to clone the repository.
- [Node.js 24 LTS](https://nodejs.org/en/download), version 24.3.0 or newer. The project also accepts Node.js 22.13.0 or newer in the 22.x line, or Node.js 26 or newer.
- [Eclipse Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17&os=windows&arch=x64&package=jdk). Download the Windows x64 MSI. In the installer, enable the options to set `JAVA_HOME` and add Java to `PATH`.
- [Android Studio](https://developer.android.com/studio) for the Android SDK and SDK Manager.

You can install Temurin JDK 17 from PowerShell with WinGet:

```powershell
winget install --id EclipseAdoptium.Temurin.17.JDK --exact
```

If WinGet says the package is already installed but the prerequisite check cannot find a JDK 17, rerun the installer with `--force --interactive`. If Windows Installer offers maintenance options, choose Repair:

```powershell
winget install --id EclipseAdoptium.Temurin.17.JDK --exact --force --interactive
```

When installation finishes, close and reopen PowerShell before setting up the build environment.

In Android Studio, complete the setup wizard and open **Tools > SDK Manager**. Install these packages:

- Android SDK Platform 37.0
- Android SDK Build Tools 37.0.0
- Android NDK (Side by side) 27.1.12297006
- Android SDK Platform-Tools
- CMake

An Android Virtual Device is optional for building. You can use a physical Android device for app testing. Keep an internet connection during the first build so npm and Gradle can download project dependencies. Reopen PowerShell after installing Node.js and JDK 17 so the updated `PATH` and `JAVA_HOME` values load.

### Set up the Windows build environment

Open PowerShell in the repository root. Check the installed tools and Android SDK packages:

```powershell
.\scripts\setup-build.ps1 -Check
```

Install supported prerequisites and write local SDK configuration:

```powershell
.\scripts\setup-build.ps1 -Setup
```

The `[missing]` lines printed at the start of `-Setup` describe the pre-setup scan. Setup installs missing npm dependencies and writes `android/local.properties` before checking SDK licenses. If it stops because a license remains unaccepted, run the PowerShell command printed by the script, review and accept the terms, then run `-Setup` again.

Load the generated paths in the current PowerShell session:

```powershell
. .\.c4c-build-env.ps1
```
Build a debug APK from the repository root:

```powershell
.\scripts\build-apk.ps1 -Mode Debug
```

To start the app on a connected Android device, start Metro in one PowerShell window:

```powershell
npm start
```

In another PowerShell window at the repository root, run:

```powershell
npm run android
```

The debug APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`.

Build a signed release APK from the repository root:

```powershell
.\scripts\build-apk.ps1 -Mode Release
```

The wrapper asks for the existing v4 keystore passwords securely. Set `C4C_RELEASE_STORE_FILE` and `C4C_RELEASE_KEY_ALIAS` in the current PowerShell process only when the keystore is stored somewhere else. Keep the keystore and passwords out of the repository and terminal history. The release APK is written to `android\app\build\outputs\apk\release\app-release.apk`.

## macOS

Install Git, Node.js 24 LTS, JDK 17, and Android Studio. In Android Studio SDK Manager, install the required SDK, Build Tools, and NDK packages. Set the SDK and JDK paths in Terminal:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
java -version
```

Run the setup script from the repository root to install missing JavaScript dependencies and save the build environment:

```sh
./scripts/setup-build.sh --setup
source ./.c4c-build-env.sh
```

Build a debug APK from the repository root:

```sh
./scripts/build-apk.sh --debug
```

Run `cd ..` to return to the repository root. Start Metro with `npm start` in one terminal. In another terminal, run `npm run android` to install and launch the debug app.

Build a signed release APK from an interactive terminal at the repository root:

```sh
./scripts/build-apk.sh --release
```

The wrapper reads the release password from GNOME Secret Service when available. Otherwise, it prompts without echoing the password. It builds the APK only and requires the existing v4 keystore at `~/.android/keystores/campus4change-release-v4.jks` or an absolute path in `C4C_RELEASE_STORE_FILE`.

## Linux

Install Git, Node.js 24 LTS, JDK 17, Android Studio, and the Android SDK packages listed above. Debian or Ubuntu users can install common build tools with:

```sh
sudo apt update
sudo apt install git curl unzip zip build-essential openjdk-17-jdk
```

Fedora users can install the system build tools with:

```sh
sudo dnf install git curl unzip zip tar gcc gcc-c++ make
```

### Fedora 44 and JDK 17

If DNF reports `No match for argument: java-17-openjdk-devel`, install Temurin JDK 17 under your home directory. The steps use Adoptium's [download API and checksum verification](https://adoptium.net/installation/ci-scripts). Run the block from an open Terminal prompt. It keeps the fail-fast commands in a child Bash and writes output to `$HOME/temurin17-install.log`.

```sh
(
  set +e
  bash <<'INSTALL' 2>&1 | tee "$HOME/temurin17-install.log"
set -euo pipefail
jdk_api='https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse'
jdk_url="$(curl -fsS -o /dev/null -w '%{redirect_url}' "$jdk_api")"
jdk_tmp="$(mktemp -d)"
trap 'rm -rf "$jdk_tmp"' EXIT
jdk_archive="$(basename "$jdk_url")"
curl -fL "$jdk_url" -o "$jdk_tmp/$jdk_archive"
curl -fsSL "${jdk_url}.sha256.txt" -o "$jdk_tmp/$jdk_archive.sha256.txt"
(cd "$jdk_tmp" && sha256sum -c "$jdk_archive.sha256.txt")
jdk_install_dir="$HOME/.local/jdks/temurin-17"
mkdir -p "$jdk_install_dir"
tar -xzf "$jdk_tmp/$jdk_archive" --strip-components=1 -C "$jdk_install_dir"
export JAVA_HOME="$jdk_install_dir"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
javac -version
INSTALL
  install_status=${PIPESTATUS[0]}
  if [ "$install_status" -eq 0 ]; then
    printf 'Temurin JDK 17 installed. Log: %s\n' "$HOME/temurin17-install.log"
  else
    printf 'Temurin JDK setup failed with status %s. Log: %s\n' "$install_status" "$HOME/temurin17-install.log"
  fi
)
```

The installer runs in a child Bash so a failure leaves your Terminal prompt open. The Linux environment block below sets `JAVA_HOME` for the build. The version commands must report Java 17.

Install Node.js from the [official download page](https://nodejs.org/en/download). Use the SDK location shown by Android Studio. A common Linux SDK location is `$HOME/Android/Sdk`.

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [ -x "$HOME/.local/jdks/temurin-17/bin/javac" ]; then
  export JAVA_HOME="$HOME/.local/jdks/temurin-17"
else
  export JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")"
fi
export PATH="$JAVA_HOME/bin:$PATH"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
java -version
javac -version
```

Run the setup script from the repository root to install missing JavaScript dependencies and save the build environment:

```sh
./scripts/setup-build.sh --setup
source ./.c4c-build-env.sh
```

Confirm that `java -version` reports JDK 17. Build a debug APK from the repository root:

```sh
./scripts/build-apk.sh --debug
```

Build a signed release APK from the repository root:

```sh
./scripts/build-apk.sh --release
```

The wrapper reads the store password from GNOME Secret Service when available. Other Linux desktops use hidden password prompts. The existing v4 keystore must be available at `~/.android/keystores/campus4change-release-v4.jks` or through `C4C_RELEASE_STORE_FILE`.

## Termux

Termux builds run on ARM64 Android devices. Install Termux from a supported [F-Droid or GitHub release](https://github.com/termux/termux-app#installation). Update packages before installing the build tools:

```sh
pkg update
pkg upgrade
pkg install git nodejs openjdk-17 curl unzip zip cmake ninja make clang aapt2 d8 apksigner ndk-sysroot ndk-multilib qemu-user-x86-64
```

If `pkg update` reports mirror errors, run `termux-change-repo`, select a working main mirror, and retry. See the official [Termux package management guide](https://github.com/termux/termux-packages/wiki/Package-Management).

Download the Android command-line tools from the [Android SDK tools page](https://developer.android.com/tools/sdkmanager). Arrange the extracted files so `sdkmanager` is at `$HOME/android-sdk/cmdline-tools/latest/bin/sdkmanager`. Install the required SDK packages and accept their licenses:

```sh
mkdir -p "$HOME/android-sdk/cmdline-tools/latest"
unzip -q commandlinetools-linux-*_latest.zip -d "$HOME/android-sdk/cmdline-tools"
mv "$HOME/android-sdk/cmdline-tools/cmdline-tools/"* "$HOME/android-sdk/cmdline-tools/latest/"
"$HOME/android-sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/android-sdk" \
  "platforms;android-37.0" "build-tools;37.0.0" "ndk;27.1.12297006"
"$HOME/android-sdk/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$HOME/android-sdk" --licenses
```

The stock NDK contains Linux x86_64 host tools that cannot run directly on an ARM64 phone. Create the Termux-compatible NDK directory from the repository root:

```sh
sh scripts/setup-termux-ndk.sh \
  "$HOME/android-sdk/ndk/27.1.12297006" \
  "$HOME/termux-ndk-27.1.12297006"
```

Generate `android/local.properties` from the Termux paths. This checks the copied NDK revision before writing the file:

```sh
termux_sdk="$HOME/android-sdk"
termux_ndk="$HOME/termux-ndk-27.1.12297006"
test -f "$termux_ndk/package.xml"
grep -Fx 'Pkg.Revision = 27.1.12297006' "$termux_ndk/source.properties"
printf 'sdk.dir=%s\ncmake.dir=%s\nndk.dir=%s\n' \
  "$termux_sdk" "$PREFIX" "$termux_ndk" > android/local.properties
cat android/local.properties
```

Termux may select JDK 21 by default. This Gradle build uses JDK 17, so set it explicitly. Termux's `libtermux-exec.so` also resolves Node command shims:

```sh
export JAVA_HOME="$PREFIX/lib/jvm/java-17-openjdk"
export PATH="$JAVA_HOME/bin:$PREFIX/bin:$PATH"
export LD_PRELOAD="${LD_PRELOAD:-$PREFIX/lib/libtermux-exec.so}"
java -version
node --version
```

From the repository root, build a debug APK:

```sh
./scripts/build-apk.sh --debug
```

The Termux wrapper selects the ARM64 ABI, Termux `aapt2`, the compatible NDK directory, and Hermes through QEMU. The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. A debug APK needs Metro. A signed release APK includes its JavaScript bundle and starts without Metro.

Gradle may print `CXX5106` because Android documents `ndk.dir` as deprecated for standard NDK setup. This Termux configuration uses it to select the compatibility NDK. The warning is nonfatal when Gradle continues with build tasks. See Android's [NDK setup guidance](https://developer.android.com/studio/projects/install-ndk).

### Fix a CXX1102 NDK path error

If Gradle says the NDK path does not contain a valid NDK, compare the reported path with `ndk.dir` in `android/local.properties`. It must end exactly with `termux-ndk-27.1.12297006`, with no extra characters. The directory must contain `source.properties` with revision `27.1.12297006` and a `package.xml` file. Re-run the `printf` block above to regenerate the local properties file.

The documented Termux build reused an existing SDK and compatible NDK. First-time SDK and NDK setup can require extra storage and package downloads. Release signing in Termux also requires the private v4 keystore and signing passwords.

## Build outputs and installation

| Build | Output path | Metro needed |
| --- | --- | --- |
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` | Yes |
| Signed release APK | `android/app/build/outputs/apk/release/app-release.apk` | No |

To install an APK with Android Debug Bridge, connect the device and run `adb devices -l`. Then run:

```sh
adb install -r /path/to/app.apk
```

An APK update must use the same application ID and signing certificate as the installed app. If the certificate differs, Android requires uninstalling the old package. Uninstalling removes local account state and local photos. Firebase cloud data remains in Firebase.

The debug build uses the repository debug keystore. Do not register that public key with Firebase for Google sign-in. A developer can set `C4C_DEBUG_STORE_FILE` to a private local debug key. The release build requires the private v4 keystore. The keystore and passwords are not in GitHub.

## Common build errors

- **`Included build .../node_modules/@react-native/gradle-plugin does not exist`:** run `npm ci` from the repository root, then rerun Gradle.
- **`SDK location not found`:** create or correct `android/local.properties` with the SDK root path for this computer.
- **No Java installation matches language version 17:** install JDK 17 and set `JAVA_HOME` to that installation in the same build terminal.
- **`CANNOT LINK EXECUTABLE` in Termux:** run `pkg update` and `pkg upgrade`, then reinstall the named package if needed.
- **`[CXX1102]` or `ndk.dir ... did not contain a valid NDK` in Termux:** check that `ndk.dir` has no characters after `27.1.12297006`, and confirm the compatible NDK folder contains `source.properties` and `package.xml`. Regenerate `android/local.properties` with the Termux `printf` block above.
- **React Native cannot start from an ADB `run-as` shell in Termux:** set `LD_PRELOAD="$PREFIX/lib/libtermux-exec.so"` and add `$PREFIX/bin` to `PATH` before running Gradle.
- **`INSTALL_FAILED_UPDATE_INCOMPATIBLE`:** the installed APK uses a different signing certificate. Back up local-only data before uninstalling it.
- **`Unable to load script` on a debug build:** start Metro with `npm start` and relaunch. Use the signed release APK for a standalone installation.

The release signing guard refuses `assembleRelease` when the dedicated keystore or any `C4C_RELEASE_*` variable is missing. Use the existing release key for updates to this package.
