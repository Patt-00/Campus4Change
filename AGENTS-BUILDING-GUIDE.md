# Campus4Change build prompt and agent guide

Use this guide with [docs/BUILDING.md](docs/BUILDING.md) to build a debug or signed release APK with the repository scripts.

## Prompt for the user

Copy this prompt and fill in the bracketed choices:

```text
Build Campus4Change from this checkout.

APK type: [debug / signed release]
Environment: [Windows / macOS / Linux / Termux]

Read AGENTS-BUILDING-GUIDE.md, docs/BUILDING.md, and scripts/SCRIPT.md first. Preserve my existing files and changes. Use the checked-in APK build script for the selected type. Verify the APK signature and SHA-256, then report the artifact path and build result. Do not install, upload, publish, or push the APK unless I ask. For a release APK, use the existing v4 signing key. Do not create or rotate a key. If the key is missing or cannot be unlocked, stop and report what is needed. Never ask me to send passwords in chat.
```

## Guide for the agent

### Check the checkout and prerequisites

1. Inspect `git status --short --branch` and the repository root. Preserve all existing changes.
2. Run the setup script's check mode for the current shell:

   ```sh
   ./scripts/setup-build.sh --check
   ```

   ```powershell
   .\scripts\setup-build.ps1 -Check
   ```

3. If a prerequisite is missing, run the matching setup mode. Setup installs supported tools, installs `npm` dependencies when React Native is absent from `node_modules`, and writes local SDK configuration.
4. If Android SDK licenses remain unaccepted, give the user the `sdkmanager --licenses` command for an interactive terminal. The user can review and accept the terms. Setup scripts never accept licenses automatically.
5. Load the generated environment file in the build terminal when needed:

   ```sh
   source ./.c4c-build-env.sh
   ```

   ```powershell
   . .\.c4c-build-env.ps1
   ```

See [scripts/SCRIPT.md](scripts/SCRIPT.md) for setup behavior and platform-specific details.

### Build a debug APK

From the repository root, run the command for the current shell:

```sh
./scripts/build-apk.sh --debug
```

```powershell
.\scripts\build-apk.ps1 -Mode Debug
```

The Bash script selects the Termux Gradle wrapper on Termux. The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. A debug build requires Metro when launched. Installing or launching the APK is a separate action and needs the user's request.

### Build a signed release APK

From the repository root, run the command for the current shell:

```sh
./scripts/build-apk.sh --release
```

```powershell
.\scripts\build-apk.ps1 -Mode Release
```

The release APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Release builds require the existing v4 keystore, normally `~/.android/keystores/campus4change-release-v4.jks`, with alias `campus4change-v4`. Set `C4C_RELEASE_STORE_FILE` and `C4C_RELEASE_KEY_ALIAS` in the current process only when the key uses a different path or alias.

Bash reads the store password from GNOME Secret Service when available, then prompts without echoing it if needed. PowerShell uses secure password prompts and will not prompt over SSH. Keep the keystore and passwords out of the repository and chat.

The APK build wrappers refuse to create or rotate a keystore. Do not set `C4C_CREATE_RELEASE_KEY=1` or use a key-rotation path unless the user explicitly authorizes that change.

### Verify and report the APK

Both APK build scripts verify the APK signature and print the artifact path and SHA-256 hash. Read the package name and version from the APK, then compare them with `android/app/build.gradle`.

Report the build variant, operating system, Gradle result, APK path, package name, version name, version code, signature verification result, and SHA-256. Mention relevant warnings. State whether the APK was installed or launched only when you performed that separate action.
