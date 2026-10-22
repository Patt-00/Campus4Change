# Campus4Change

Campus4Change is an Android peer-learning app for the TIP student community. It uses React Native CLI, JavaScript/JSX, and Hermes.

The current source is version 1.3.0. It keeps the branded Android launcher and adds required TIP account setup, private Student ID claims, searchable tutor recommendations, animated in-app notices, and separate Settings. The design follows the [Campus4Change prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2); exact pixel matching is not claimed.

## Features

- Splash screen, novice/intermediate/expert introduction, and login/signup screens.
- Firebase email/password and Google sign-in/sign-up on Android, plus sign-in for existing device-only accounts, profile editing, and sign-out. New accounts continue to required TIP account setup after signup, where they enter their course, year, campus, and digits-only Student ID. Student IDs stay private; Firebase uniqueness requires the matching Firestore rules to be deployed, while device-only accounts check for duplicates on the same device.
- Tutor directory, filters, editable student listings, and selected tutor profiles.
- Bounded tutor and session history pages with load-more and latest-refresh controls.
- Firebase users with verified email addresses can request a one-hour session; the tutor can accept or decline, and participants can cancel or mark an accepted session complete. Device-only bookings stay in a private schedule.
- Study-group discovery and collaboration: Firebase accounts share group details, membership counts, posts, and replies. Device-only accounts keep their groups locally.
- Members can report another member's shared post or reply; group owners can review reports and dismiss, hide, or restore content.
- Booked-session workspace with tutor/schedule context and private notes; group sessions use a scheduled-session layout with agenda notes. Expired bookings are labeled as past due rather than shown as future sessions.
- Conversation search, member-only Firebase group chats, tutor-session participant chats, private device notes, in-app notifications, and learning preferences.
- Tutor profiles use course-grouped subject tags from the TIP catalog and publish to email-verified Firebase users or stay in the local device directory for device-only accounts.
- Choose a profile photo from Android's system photo picker or select one of eight built-in color avatars. Custom photos stay in app-private storage on this device; the selected avatar preset can appear in a published tutor listing.
- Browse 49 campus-specific TIP program listings grouped by campus and college. Each program has a searchable set of core-subject and specialization-area prompts; learning topics can be grouped under multiple programs, and custom courses and topics remain available. The prompts are suggestions based on TIP's published program materials, not a complete curriculum.
- Add and remove any learning topic; course, year level, and TIP campus are optional. The campus selector is limited to Quezon City and Manila.
- Optional group meetup dates and times, with valid-date and future-time checks.
- A separate Settings destination in the Home menu for learning preferences
  and About/service details. Profile stays
  focused on identity, tutor profile, and sign-out.

Email/password and Google accounts use Firebase Authentication, and private app state syncs to that user's Firestore record. The six production composite indexes matched the local definitions and were ready in the 2026-10-22 read-only check. That Rules API recheck confirmed that production still uses an older Firestore ruleset than this 1.3.0 source; the new Student ID claim flow is emulator-tested and needs an authorized deployment before live account setup. Any Firebase account with a verified email can discover shared groups and tutor profiles, collaborate in groups, and exchange participant-only session requests; the app does not verify school affiliation. Tutor acceptance reserves two half-hour buckets for each participant atomically, preventing conflicts across tutors and student/tutor roles. Members can report another member's content without storing reporter identity; the group owner can review and reversibly hide or restore content. Pending group changes are saved locally and can be retried if the connection fails. Authentication is restored when the app reopens, and an encrypted device copy supports recovery after a cloud-sync failure. See [Firebase setup](docs/FIREBASE_SETUP.md).

The account-state document stays private to its owner. Shared groups, tutor profiles, session requests, and slot locks use separate Firestore documents. Group chat is readable by current members; tutor-session chat is readable by its two participants. Device-only conversations remain private notes. Two verified temporary accounts completed tutor discovery, session request/accept/cancel, participant chat, group post/reply/chat, and notification-link checks on the POCO X4 GT; those QA accounts and their data were removed.

The current source snapshot and signed installable APK are published as the [v1.3.0-preview.2 pre-release](https://github.com/Patt-00/Campus4Change/releases/tag/v1.3.0-preview.2). Download Campus4Change-v1.3.0-preview.2.apk from its release page. It installs package com.campus4change, version 1.3.0/code 6; SHA-256: c2191dc45f42d5d9e2a4bbc63d515d1e045a3cbdd72af872b365c5d173fcc210. This is a pre-release snapshot, not the final main-branch release. Firebase is integrated, but live production use is not fully verified: production Firestore rules do not include the current Student ID claim flow, and the replacement release signer is unregistered for Firebase Google sign-in/App Check. See [Firebase setup](docs/FIREBASE_SETUP.md). OS push notifications and live calls are not implemented. Clearing app data removes encrypted local state and app-private profile photos; Firebase account and cloud data remain in Firebase.
## Run and build

Install a Node.js version supported by React Native 0.87.1 (`^22.13.0 || ^24.3.0 || >=26.0.0`), JDK 17, and the SDK versions in [BUILDING.md](docs/BUILDING.md).

```sh
npm ci
npm start
# In another terminal:
npm run android
```

Set `sdk.dir` in the ignored `android/local.properties` file using the platform-specific steps in [BUILDING.md](docs/BUILDING.md). Use `assembleDebug` for a local Android build. The `assembleRelease` task requires the dedicated release keystore and all four `C4C_RELEASE_*` variables. The [Termux section](docs/BUILDING.md#termux) covers the additional setup for building on an ARM64 Android device.

Debug builds use a machine-local debug key. Release builds require the protected dedicated keystore and fail closed without it; see [BUILDING.md](docs/BUILDING.md). Android is the supported target. The iOS scaffold has no implementation for the native storage module.

## Guides and checks

- [Architecture and feature ownership](docs/ARCHITECTURE.md)
- [Reproducible local emulator QA APK](docs/BUILDING.md#local-firebase-emulator-qa-build)
- [Autonomous improvement progress](AUTONOMOUS_PROGRESS.md)
- [Completion audit and weighted readiness estimate](COMPLETION_AUDIT.md)
- [Presentation readiness walkthrough](PRESENTATION_READINESS.md)
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

Jest tests mock Android storage. They do not prove native encryption, APK installation, or visible device behavior.
