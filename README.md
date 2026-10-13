# Campus4Change

Campus4Change is a school Android app for tutoring, study groups, and campus learning. It uses React Native CLI, JavaScript/JSX, and Hermes.

Version 1.2.0 adds custom learning interests, personal school details, clear icons, readable controls, and accurate dashboard and group schedules. The app follows the 18 screens in the [Figma prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2), with some workflows extended beyond the prototype. Exact pixel matching has not been verified on a device.

## Features

- Splash screen, novice/intermediate/expert introduction, and login/signup screens.
- Firebase email/password and Google sign-in/sign-up on Android, plus the local demo and legacy device-account sign-in, profile editing, and sign-out. Google accounts provide a name and email; add a private Student ID later in Edit Profile.
- Optional Android biometric sign-in after password login and a successful biometric prompt.
- Tutor directory, filters, editable student listings, and selected tutor profiles.
- Verified Firebase students can request a one-hour session; the tutor can accept or decline, and participants can cancel or mark an accepted session complete. Demo/device-only bookings stay in a private schedule.
- Study-group discovery and collaboration: Firebase accounts share group details, membership counts, posts, and replies. Device-only accounts keep their groups locally.
- Members can report another member's shared post or reply; group owners can review reports and dismiss, hide, or restore content.
- Booked-session workspace with tutor/schedule context and private notes; group sessions use a scheduled-session layout with agenda notes. Expired bookings are labeled as past due rather than shown as future sessions.
- Conversation search, private message notes, in-app notifications, and learning preferences.
- Tutor profiles publish to verified Firebase students or stay in the local device directory for device-only accounts.
- Add and remove any learning topic; course, year level, and school are optional user-entered fields.
- Optional group meetup dates and times, with valid-date and future-time checks.
- About screen with device storage, demo data, and service limits.

When Firebase is configured and the reviewed Firestore rules are deployed, email/password and Google accounts use Firebase Authentication and private app state syncs to that user's Firestore record. Verified students can discover shared groups and tutor profiles, collaborate in groups, and exchange session requests with participant-only access. Tutor acceptance reserves both half-hour buckets of the one-hour session atomically, preventing overlapping starts. Members can report another member's content without including their UID in the report; only the group owner can review reports and reversibly hide or restore content. Pending group changes are saved locally and can be retried if the connection fails. Authentication is restored when the app reopens. An encrypted on-device copy remains available for recovery when cloud sync fails. The checked-in Firestore rules are still awaiting deployment to the real Firebase project, so shared data workflows have only been verified with the local emulator. See [Firebase setup](docs/FIREBASE_SETUP.md).

The account-state document stays private to its owner. Shared groups, tutor profiles, session requests, and slot locks use separate Firestore documents. Direct messages and group chat still save private notes and are not delivered to another student. Sample tutors do not receive remote bookings. Firebase signup sends an email-verification link, and shared access requires a verified email; automatic handling of the link inside the app and production email delivery have not been verified. Google sign-in is implemented and enabled in Firebase; the Login and Sign Up screens were verified on the POCO X4 GT, but the actual Google-account exchange still needs an end-to-end test. Live chat, calls, and push notifications are not implemented. Clearing app data removes the encrypted local copy; configured Firebase accounts and cloud state remain in Firebase.

## Demo account

Tap **GET STARTED**, finish or skip the three introduction slides, then tap **USE DEMO ACCOUNT**.

The public demo credentials are email `alex@campus.demo` or Student ID `DEMO`, password `Campus123!`. The demo includes sample tutors, groups, sessions, conversations, and memberships. New accounts start with empty interests, school fields, tutor directories, groups, bookings, and messages. A Firebase account can publish a tutor profile for verified students; device-only profiles remain local.

Updating preserves saved account data. Earlier bookings and conversations still open their saved sample tutors. Previously joined or edited sample groups stay visible; untouched sample groups are hidden from personal accounts. Existing interests are kept and can be edited.

## Run and build

Install a Node.js version supported by React Native 0.87.1 (`^22.13.0 || ^24.3.0 || >=26.0.0`), JDK 17, and the SDK versions in [BUILDING.md](docs/BUILDING.md).

```sh
npm ci
npm start
# In another terminal:
npm run android
```

First set your SDK location in ignored `android/local.properties`, following [BUILDING.md](docs/BUILDING.md#sdk-path-for-windows-powershell). From `android/`, run `.\gradlew.bat assembleRelease` in Windows PowerShell or `./gradlew assembleRelease` on Linux/macOS. Termux uses `./scripts/gradlew-termux.sh assembleRelease` from the root.

The existing v1.2.0 APK is signed with the repository's debug key. New release builds require a dedicated keystore and fail closed until it is configured; see [BUILDING.md](docs/BUILDING.md). Android is supported. The iOS scaffold has no implementation for the new local account storage.

## Guides and checks

- [Architecture and feature ownership](docs/ARCHITECTURE.md)
- [Firebase setup and data boundary](docs/FIREBASE_SETUP.md)
- [Ongoing quality audit and open issues](docs/QUALITY_AUDIT.md)
- [PC and Termux builds](docs/BUILDING.md)
- [Figma coverage and limits](docs/FIGMA_COVERAGE.md)
- [Verification and teacher walkthrough](docs/VERIFICATION.md)

```sh
npm run lint
npm test -- --runInBand --testTimeout=15000
git diff --check
```

Jest tests mock Android storage. They do not prove native encryption, biometrics, APK installation, or visible device behavior.
