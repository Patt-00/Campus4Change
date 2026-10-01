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

Check `android/build.gradle`, the Gradle wrapper, and the npm lockfile for declarations. Hermes is enabled.

## PC

1. Install Node.js, JDK 17, and Android Studio.
2. Install SDK Platform 37, Build Tools 37.0.0, and NDK 27.1.12297006. The current CLI SDK platform package is `platforms;android-37.0`.
3. Run `npm ci` at the root.
4. Open `android/` in Android Studio and sync. Set this machine's SDK path in ignored `android/local.properties`.
5. Start Metro with `npm start`, then use `npm run android` or Android Studio.

From `android/`:

```sh
# Windows
gradlew.bat assembleDebug
gradlew.bat assembleRelease
# Linux/macOS
./gradlew assembleDebug
./gradlew assembleRelease
```

Outputs are `app-debug.apk` in `android/app/build/outputs/apk/debug/` and `app-release.apk` in the equivalent `release/` folder.

Release APKs bundle JavaScript, Hermes bytecode, fonts, and images and run without Metro. Normal PC builds include default ARM/x86 ABIs. A known ARM64 device can use `-PreactNativeArchitectures=arm64-v8a`.

The 1.1.0 Windows verification used local SDK/JDK tools in ignored `.tools/`. Other machines use their own tools and `local.properties`. An emulator also needs a working host virtualization setup; building an APK does not prove device behavior.

## Termux

Use the phone's own SDK/NDK paths in `android/local.properties`. Run from the root:

```sh
./scripts/gradlew-termux.sh assembleDebug
./scripts/gradlew-termux.sh assembleRelease
```

The wrapper supplies Termux aapt2, ARM64 ABI selection, and the QEMU-backed Hermes compiler flag. These paths stay out of normal PC configuration. Do not copy `local.properties` between phone and PC.

The wrapper and Hermes script were retained. Version 1.1.0 was not rebuilt in Termux during Windows verification.

## Signing and platform limits

The release variant uses the repository's debug signing key for school distribution. It is not production store signing. Version 1.1.0 has version code 2 and application ID `com.campus4change`.

An update requires a matching application ID and signing certificate. The old v1.0.0 GitHub APK and the 1.1.0 build have the same signing certificate. Installing an update over the old APK has not been tested. Uninstalling removes old local data.

Minimum Android is 7.0. Optional biometrics require Android 9 or newer. The iOS scaffold has no native implementation for these local accounts.

## Checks

```sh
npx tsc --noEmit
npm run lint
npm test -- --runInBand
git diff --check
```

Keep the demonstrated APK and source aligned. Record bundle generation, native build, installation, launch, and interactions separately in [VERIFICATION.md](VERIFICATION.md).
