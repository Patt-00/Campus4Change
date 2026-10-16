# Campus4Change

Campus4Change is a school Android app for tutoring, study groups, and campus learning. It uses React Native CLI, JavaScript/JSX, and Hermes.

Version 1.2.0 includes custom learning interests, private school details, readable controls, tutor/session pagination, and updated Figma screens for pagination and the empty chat state. The design follows the [Campus4Change prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2); exact pixel matching is not claimed.

## Features

- Splash screen, novice/intermediate/expert introduction, and login/signup screens.
- Firebase email/password and Google sign-in/sign-up on Android, plus sign-in for existing device-only accounts, profile editing, and sign-out. Google accounts provide a name and email; add a private Student ID later in Edit Profile.
- Optional Android biometric sign-in after password login and a successful biometric prompt.
- Tutor directory, filters, editable student listings, and selected tutor profiles.
- Bounded tutor and session history pages with load-more and latest-refresh controls.
- Firebase users with verified email addresses can request a one-hour session; the tutor can accept or decline, and participants can cancel or mark an accepted session complete. Device-only bookings stay in a private schedule.
- Study-group discovery and collaboration: Firebase accounts share group details, membership counts, posts, and replies. Device-only accounts keep their groups locally.
- Members can report another member's shared post or reply; group owners can review reports and dismiss, hide, or restore content.
- Booked-session workspace with tutor/schedule context and private notes; group sessions use a scheduled-session layout with agenda notes. Expired bookings are labeled as past due rather than shown as future sessions.
- Conversation search, member-only Firebase group chats, tutor-session participant chats, private device notes, in-app notifications, and learning preferences.
- Tutor profiles publish to email-verified Firebase users or stay in the local device directory for device-only accounts.
- Add and remove any learning topic; course, year level, and school are optional user-entered fields.
- Optional group meetup dates and times, with valid-date and future-time checks.
- About screen with device storage and service limits.

Email/password and Google accounts use Firebase Authentication, and private app state syncs to that user's Firestore record. The reviewed Firestore rules are deployed to the `campus4change` project with six composite indexes in `READY` state. Any Firebase account with a verified email can discover shared groups and tutor profiles, collaborate in groups, and exchange participant-only session requests; the app does not verify school affiliation. Tutor acceptance reserves two half-hour buckets for each participant atomically, preventing conflicts across tutors and student/tutor roles. Members can report another member's content without storing reporter identity; the group owner can review and reversibly hide or restore content. Pending group changes are saved locally and can be retried if the connection fails. Authentication is restored when the app reopens, and an encrypted device copy supports recovery after a cloud-sync failure. See [Firebase setup](docs/FIREBASE_SETUP.md).

The account-state document stays private to its owner. Shared groups, tutor profiles, session requests, and slot locks use separate Firestore documents. Group chat is readable by current members; tutor-session chat is readable by its two participants. Device-only conversations remain private notes. Two verified temporary accounts completed tutor discovery, session request/accept/cancel, participant chat, group post/reply/chat, and notification-link checks on the POCO X4 GT; temporary accounts and their QA records were removed afterward. Google-to-Firebase sign-in was previously verified on the POCO with a debug build. A signed release APK and AAB now build with the registered release certificate, but the release-signed APK was not installed over the existing debug install to preserve device data. App Check used a temporary debug provider for QA; release Play Integrity enforcement and request metrics are not claimed. OS push notifications and live calls are not implemented. Clearing app data removes the encrypted local copy; configured Firebase accounts and cloud state remain in Firebase.

## Run and build

Install a Node.js version supported by React Native 0.87.1 (`^22.13.0 || ^24.3.0 || >=26.0.0`), JDK 17, and the SDK versions in [BUILDING.md](docs/BUILDING.md).

```sh
npm ci
npm start
# In another terminal:
npm run android
```

First set your SDK location in ignored `android/local.properties`, following [BUILDING.md](docs/BUILDING.md#sdk-path-for-windows-powershell). From `android/`, run `.\gradlew.bat assembleRelease` in Windows PowerShell or `./gradlew assembleRelease` on Linux/macOS. Termux uses `./scripts/gradlew-termux.sh assembleRelease` from the root.

Debug builds use a machine-local debug key. Release builds require the protected dedicated keystore and fail closed without it; see [BUILDING.md](docs/BUILDING.md). Android is the supported target. The iOS scaffold has no implementation for the native storage module.

## Guides and checks

- [Architecture and feature ownership](docs/ARCHITECTURE.md)
- [Firebase setup and data boundary](docs/FIREBASE_SETUP.md)
- [Ongoing quality audit and open issues](docs/QUALITY_AUDIT.md)
- [Final sprint completion gates](docs/FINAL_SPRINT.md)
- [PC and Termux builds](docs/BUILDING.md)
- [Figma coverage and limits](docs/FIGMA_COVERAGE.md)
- [Verification and teacher walkthrough](docs/VERIFICATION.md)

```sh
npm run lint
npm test -- --runInBand --testTimeout=15000
git diff --check
```

Jest tests mock Android storage. They do not prove native encryption, biometrics, APK installation, or visible device behavior.
