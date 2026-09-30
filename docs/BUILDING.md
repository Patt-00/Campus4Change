# Building Campus4Change

The same source tree can be built on a PC with Android Studio or directly in Android Termux. This is a React Native CLI project; Expo is not used.

## PC with Android Studio

1. Install Node.js 22.11 or newer, a JDK supported by the installed Gradle/Android Studio version (React Native recommends JDK 17), and Android Studio.
2. Install Android SDK Platform 37, Build Tools 37.0.0, and NDK 27.1.12297006 when Android Studio prompts for them. The project declares these versions in `android/build.gradle`.
3. From the repository root, run `npm ci`.
4. In Android Studio, open the `android/` directory and let Gradle sync. Android Studio creates its own ignored `android/local.properties` containing the PC's SDK path.
5. Start Metro from the repository root with `npm start`, then run the `app` debug configuration on an emulator or connected device. Alternatively, run `npm run android` from the repository root.

For a command-line debug APK, run `./gradlew assembleDebug` from `android/` on macOS/Linux, or `gradlew.bat assembleDebug` on Windows. The debug APK is written under `android/app/build/outputs/apk/debug/`.

The normal PC build uses the React Native Gradle plugin's platform-specific Hermes compiler and does not force an ARM64-only APK.

## Android Termux

Install the existing Termux Android build requirements and set up the local `android/local.properties` with the device's SDK/NDK paths. Then run from the repository root:

```sh
./scripts/gradlew-termux.sh assembleDebug
```

The Termux wrapper passes three build-only settings: native Termux `aapt2`, `arm64-v8a`, and a flag that enables the QEMU-backed Hermes compiler for release bundling. For another Gradle task, replace `assembleDebug` (for example, `assembleRelease`). Do not copy the Termux-specific `local.properties` to a PC.

The repository's release variant currently uses the default debug signing key. It is suitable for prototype distribution, not a production store release.
