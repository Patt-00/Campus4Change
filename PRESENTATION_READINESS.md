# Campus4Change presentation readiness

## Purpose and current status

Campus4Change connects learners with peer tutors and gives TIP students shared study groups and in-app messaging. The POCO X4 GT and Xiaomi Pad 7 have rehearsed shared group discovery, membership, and chat. The Pad has also exercised tutor search, a session request, acceptance, cancellation, and lock release.

The current 1.3.0 source has been installed and cold-launched on the POCO X4 GT and Pad 7. Both devices opened Settings, About, Notifications, the same shared group, and exchanged a group message using local Firebase emulators. A signed build of current source is not available, and production Firestore still uses an older ruleset than this source. Use the emulator build for the current demonstration; do not describe its data as production data.

Payments and voice/video calls are outside scope. The app does not provide OS push notifications or iOS support.

## Application overview

- **Name:** Campus4Change
- **Purpose:** connect students who want tutoring with peer tutors, and help students form study groups and message group/session participants.
- **Users:** learners, peer tutors, and study-group members. Shared Firebase features require a verified email; the app does not confirm school affiliation.
- **Main flows:** account signup and TIP setup, tutor publishing/discovery, one-hour session request/response, study-group discovery/membership, group and participant messaging, notifications, preferences, and profile editing.

## Technical architecture

- **Mobile app:** React Native CLI 0.87.1, JavaScript/JSX, React 19, and Hermes. Android is supported; the iOS scaffold lacks the native storage implementation.
- **Navigation:** `src/navigation/AppNavigator.jsx` routes Home, tutor search/details, Sessions, groups, Messages/Chat, Notifications, Profile, Preferences, Settings, and About.
- **Authentication:** Firebase email/password and Android Credential Manager Google sign-in. Device-only accounts remain local to their device.
- **Local storage:** Android native code encrypts the Firebase refresh token and device account data using Android Keystore-backed AES-GCM. Profile photo files remain app-private on the device.
- **Cloud data:** Firestore stores owner-only private account state, separate Student ID claims, tutor profiles, groups/posts/replies/reports, participant session requests, participant slot locks, and group/session chat. Firestore rules are an authorization boundary. The current local Student ID claim rules are emulator-tested but absent from the active production ruleset; see [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).
- **Important integrations:** Firebase Auth, Firestore, Android Credential Manager, Firebase email verification, and Android system photo picker.

## Demonstration sequence

Use two presenter-controlled student email accounts with inbox access. Do not add embedded demo credentials to the application.

1. Launch on the learner device and sign in. Show required TIP profile fields: campus, course, year, and unique digits-only Student ID.
2. On the tutor device, sign in and publish a tutor profile with a course and subjects.
3. On the learner device, open Find People, search a tutor, inspect the subjects/profile, and request a future one-hour session in a listed subject.
4. On the tutor device, open Sessions and accept the incoming request. Return to the learner device and show the accepted booking and in-app notice.
5. Open the participant session chat from each device and exchange one message in both directions.
6. On one device, create a study group. On the other, discover and join it.
7. Open group chat and send a short message from each device. Optionally add a study note or reply.
8. Cancel the QA booking from the appropriate participant, verify the cancelled state on both accounts, and confirm its reserved time is available again.
9. Show the floating notification opening its related Notifications detail, then review Settings and About.

Expected results are a tutor profile visible to the learner, an incoming request visible to the tutor, an accepted booking visible in Upcoming, participant-only messages delivered, the joined group's messages visible to both members, and a cancelled booking with released slot reservations.

## Demo setup and requirements

### Live Firebase presentation

- Use the intended current signed release, not the emulator-configured QA APK.
- Provide two verified email accounts with inbox access and distinct Student IDs. Use a third account only if demonstrating outsider denial.
- The active production ruleset differs from the local source. Live account setup requires an owner-authorized rules deployment; this task does not perform one. The six production composite indexes match the local definitions and are ready.
- Both Android devices need working Wi-Fi or mobile data. POCO X4 GT and Pad 7 were used in the recent physical rehearsal.
- Use the standard Android install/launch instructions in [BUILDING.md](docs/BUILDING.md). A release update requires its dedicated signing identity.

### Local emulator fallback

This fallback uses a demo project and local-only data. It does not touch the production Firebase project.

1. Install the documented Node, JDK, and Android SDK prerequisites from [BUILDING.md](docs/BUILDING.md).
2. Run `npm ci` at the repository root.
3. In a terminal at the root, run `npx --yes firebase-tools@15.33.0 emulators:start --only auth,firestore --project demo-campus4change-rules`.
4. In another terminal, run `npm run android:qa-emulators`. This creates the QA debug APK with the demo Firebase project and loopback emulator host, then restores the source config byte-for-byte.
5. Connect only the intended QA devices. After `android-wireless-connect`, inspect `adb devices -l` and identify each serial. Run `adb -s SERIAL reverse tcp:9099 tcp:9099` and `adb -s SERIAL reverse tcp:8080 tcp:8080` for each physical test device.
6. Install `android/app/build/outputs/apk/debug/app-debug.apk` with `adb -s SERIAL install -r ...`, then sign in or create two local Auth emulator accounts and complete their verification through the Auth Emulator UI.
7. Follow the demo sequence above. Never use this APK as a production release.

No password, verification code, production API secret, or private signing credential belongs in this document. The two demo accounts used for QA were emulator fixtures, not accounts embedded in the app.

## Risks and fallback plan

| Risk | Effect | Response |
| --- | --- | --- |
| Live Firebase lacks the local Student ID claim rules | New account setup can fail when it tries to reserve an ID | Use local emulators for the demonstration. The active ruleset must be updated by an authorized project owner before live signup can pass. |
| Release signing credentials are unavailable in the current shell | A fresh signed APK/AAB for the latest source cannot be produced here | Use the already-published v1.2.2 only for its verified scope; it does not contain current local changes. Do not distribute the debug QA APK as a release. |
| School network or Firebase service is unavailable | Shared live features cannot reach the backend | Use the local emulator setup above if the school laptop has the required SDK/JDK and the QA APK can be built. Rehearse it on the presentation machine before relying on it. |
| Google sign-in with release signer and Play Integrity | Release-only authentication/attestation behavior is unknown | For a scoped walkthrough, use verified email/password accounts and report the release-only gates accurately. |
| OS push or live calls | These functions are not implemented | Demonstrate the in-app notification and messaging flows; do not promise OS push, voice, or video. |

The final demo is presentation-ready only after the chosen live or emulator setup has been rehearsed from the exact school-laptop checkout and the relevant network/signing gates are verified.
