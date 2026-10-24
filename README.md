# Campus4Change

Campus4Change is an Android peer-learning app for students at the Technological Institute of the Philippines. Students can find peer tutors, request scheduled sessions, join study groups, and continue discussions through in-app messaging.

## Download

Download the signed Android APK from the [Campus4Change v1.4.1 GitHub release](https://github.com/Patt-00/Campus4Change/releases/tag/v1.4.1).

- Direct APK: [Campus4Change 1.4.1](https://github.com/Patt-00/Campus4Change/releases/download/v1.4.1/app-release.apk)
- Package: `com.campus4change`
- Version: 1.4.1, Android version code 8
- Minimum Android version: Android 7.0 (API 24)
- APK SHA-256: `6382073539e8c2bff06d2d190751632356ea615c1e2e9bf04b23ea20598f6c9d`

The release is a signed APK. It includes the JavaScript bundle and does not need Metro. The app does not include demo accounts or seeded demo content.

## Install the APK

Download the APK from the release link and open it on an Android 7.0 or newer device. If Android asks, allow the browser or file manager to install apps from that source, then confirm installation. Open Campus4Change and sign up with Google or email and password. Complete the TIP profile setup. Email verification is required for shared tutor, session, and group features.

For an update, Android requires the same application ID and signing certificate as the installed copy. Uninstalling a differently signed copy removes local account data and local photos.

## Features

- Firebase email/password and Google sign-in.
- Required profile setup with TIP course, year level, and Quezon City or Manila campus choices.
- A generated Campus4Change UUID for account reference. The UUID does not verify TIP enrollment.
- Course-grouped learning interests, tutor search, recommendations, and tutor profiles.
- Session requests, tutor acceptance or decline, cancellation, and participant messaging.
- Study-group discovery, shared details, posts, replies, and group chat.
- Animated in-app notifications, separate Settings, and About information.
- A short animated splash introduction that honors the device's reduced-motion setting.
- Built-in avatars and optional profile photos from the system photo picker or camera. Profile photos stay on the device.

## Accounts and data

Firebase Authentication handles online accounts. Cloud Firestore stores private account state and shared tutor, session, and group data. Email-verified accounts can use shared features. The app does not verify school enrollment. The Android release uses Firebase project `campus4change`.

Firebase App Check is not registered or enforced for this Android release. Do not describe the app as App Check-attested. Clearing app data removes local account state and local photos, but it does not delete Firebase accounts or cloud records. A fork must configure its own Firebase project and review `firestore.rules` and `firestore.indexes.json` before deployment.

Tutoring payments, live voice or video calls, operating-system push notifications, and iOS are outside this release's scope.

## Technology

Campus4Change uses React Native CLI 0.87.1, React 19.2.3, JavaScript/JSX, and Hermes. Kotlin Android modules provide encrypted local storage and profile photo capture. Firebase Authentication and Cloud Firestore provide online sign-in and shared data.

## Build from source

Install Node.js 22.13.0 or later within the supported range in `package.json`, JDK 17, Git, and Android Studio with the SDK packages listed in the [cross-platform build guide](docs/BUILDING.md).

From the repository root:

```sh
npm ci
```

Create `android/local.properties` with the Android SDK path for your computer. To assemble a debug APK, run the Gradle wrapper from the `android` directory:

```sh
./gradlew assembleDebug
```

On Windows PowerShell, run `.\gradlew.bat assembleDebug` from `android`. The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. To launch the debug app, start Metro with `npm start`, then run `npm run android` in another terminal.

The [build guide](docs/BUILDING.md) covers Windows, macOS, Linux, and Termux, including Android SDK setup and signed APK builds.

## Repository layout

- `src/features/` contains the account, profile, tutor, group, session, message, and Settings features.
- `src/shared/` contains shared state, Firebase configuration, theme values, and data helpers.
- `android/` contains the Android project and native Kotlin modules.
- `firestore.rules` and `firestore.indexes.json` define Firestore access and query indexes.
- `docs/BUILDING.md` is the platform build guide.
