# Campus4Change build prompt and agent guide

This file covers building the Android app as a debug APK or a signed release APK. Use [docs/BUILDING.md](docs/BUILDING.md) for operating-system prerequisites and platform setup.

## Prompt for the user

Copy this prompt and fill in the bracketed choices:

```text
Build Campus4Change from this checkout.

Build type: [debug APK / signed release APK]
Environment: [Windows / macOS / Linux / Termux]

Read AGENTS-BUILDING-GUIDE.md and docs/BUILDING.md first. Preserve my existing files and changes. Build the selected APK, verify its package, version, signature as applicable, and SHA-256, then report the artifact path and results. Do not install, upload, publish, or push the artifact unless I ask. For a signed release, use the existing v4 signing key. Do not create or rotate a key. If the key is missing or cannot be unlocked, stop and tell me what is needed. Never ask me to send passwords in chat.
```

## Guide for the agent

### Keep the task to building

- Build only the requested Android variant. Do not change application code or version numbers to make a build pass.
- Do not discard local changes, reset the repository, clean unrelated directories, install the APK, or publish it unless the user asks.
- Run `npm ci` from the repository root, never from `android`.
- Do not add or run tests as part of this build-only task unless the user asks.
- Check the exact platform instructions in [docs/BUILDING.md](docs/BUILDING.md), including the Termux-specific NDK setup.

### Check the checkout and prerequisites

1. Inspect `git status --short --branch` and the repository root. Preserve any existing changes.
2. Confirm Node.js matches the `engines` entry in `package.json`, Java reports JDK 17, and the Android SDK is configured as described in `docs/BUILDING.md`.
3. Confirm `android/local.properties` points to this machine's SDK. On Termux, confirm its `ndk.dir` points to the compatible NDK and its `source.properties` reports `27.1.12297006`.
4. Install dependencies from the repository root:

```sh
npm ci
```

### Build a debug APK

On Windows PowerShell, run from the repository root:

```powershell
Push-Location .\android
.\gradlew.bat --no-daemon assembleDebug
Pop-Location
```

On macOS or Linux, run from the repository root:

```sh
cd android
./gradlew --no-daemon assembleDebug
cd ..
```

On Termux, run the Termux wrapper from the repository root:

```sh
./scripts/gradlew-termux.sh clean assembleDebug --no-daemon --max-workers=2 --console=plain
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Debug builds require Metro when launching the app. A physical-device install or launch is a separate step and requires the user's request.

### Build a signed release APK

Release builds require the existing private v4 keystore. Its default path is `~/.android/keystores/campus4change-release-v4.jks`, and its alias is `campus4change-v4`. The keystore and passwords are not in the repository.

On macOS or Linux, run the release helper interactively from the repository root:

```sh
./scripts/build-release.sh
```

The helper reads the password from GNOME Secret Service when available; otherwise it prompts without echoing the password. It builds the release APK and a local App Bundle. The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. This task does not upload or publish either artifact.

On Windows, follow the **Signed APK on Windows** section in [docs/BUILDING.md](docs/BUILDING.md). It uses process-scoped signing variables and hidden password prompts.

After setting the four `C4C_RELEASE_*` variables with that secure helper, build the APK from the repository root:

```powershell
Push-Location .\android
.\gradlew.bat --no-daemon assembleRelease
Pop-Location
```

The Termux guide documents a debug build. A signed release build in Termux has not been verified for this project; use the Windows, macOS, or Linux release steps instead.

If the v4 keystore is missing or inaccessible, stop and report the problem. Never set `C4C_CREATE_RELEASE_KEY=1` during a normal build; that option creates a new signing identity and requires explicit user authorization for key rotation.

### Verify and report the artifact

For the requested APK, verify that the file exists and is non-empty. Read its package name and version from the APK and compare them with `android/app/build.gradle`. For a release APK, run `apksigner verify --verbose` with the Android Build Tools version installed on the machine. Calculate the SHA-256 with `sha256sum` on Unix-like systems or `Get-FileHash -Algorithm SHA256` in PowerShell.

Report:

- Build variant and operating system.
- Whether Gradle succeeded and any relevant warnings.
- APK path, package name, version name, and version code.
- Release signature verification result, when building a release.
- APK SHA-256.
- Whether the APK was installed or launched. Do not claim device verification unless it was separately requested and performed.
