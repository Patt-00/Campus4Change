# Campus4Change

Campus4Change is a school Android app for tutoring, study groups, and campus learning. It uses React Native CLI, TypeScript, and Hermes.

Version 1.2.0 adds custom learning interests, personal school details, clear icons, readable controls, and accurate dashboard and group schedules. The local flows cover all 17 screens in the [Figma prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2). Exact pixel matching has not been verified on a device.

## Features

- Local account creation, password sign-in, profile editing, and sign-out.
- Optional Android biometric sign-in after password login and a successful biometric prompt.
- Tutor search, filters, and the correct selected tutor profile.
- Future one-hour bookings, overlap checks, rescheduling, cancellation, completion, and ratings.
- Study-group search, creation, membership, posts, replies, and local conversations.
- A local study room with a focus timer and saved notes.
- Conversation search, saved messages, in-app notifications, and learning preferences.
- A tutor profile that is listed in this account's local directory.
- Add and remove any learning topic; course, year level, and school are optional user-entered fields.
- Optional group meetup dates and times, with valid-date and future-time checks.
- About screen with device storage, demo data, and service limits.

Accounts and app data stay on this Android device and remain after closing the app. Each account has separate personal data. Reopening the app requires sign-in.

There is no server or sharing between devices. Sample tutors do not receive bookings or messages. Live chat, calls, push notifications, email verification, and password recovery are not implemented. Uninstalling or clearing app data removes local accounts and saved work.

## Demo account

Tap **GET STARTED**, then **USE DEMO ACCOUNT**.

The public demo credentials are email `alex@campus.demo` or Student ID `DEMO`, password `Campus123!`. The demo includes sample tutors, groups, sessions, conversations, and memberships. New accounts start with empty interests, school fields, tutor directories, groups, bookings, and messages. Your own tutor listing appears when you create it.

Updating preserves saved account data. Earlier bookings and conversations still open their saved sample tutors. Previously joined or edited sample groups stay visible; untouched sample groups are hidden from personal accounts. Existing interests are kept and can be edited.

## Run and build

Install Node.js 22.11 or newer, JDK 17, and the SDK versions in [BUILDING.md](docs/BUILDING.md).

```sh
npm ci
npm start
# In another terminal:
npm run android
```

From `android/`, run `gradlew.bat assembleRelease` on Windows or `./gradlew assembleRelease` on Linux/macOS. Termux uses `./scripts/gradlew-termux.sh assembleRelease` from the root.

The release APK uses the repository's debug signing key for school prototype distribution. Android is supported. The iOS scaffold has no implementation for the new local account storage.

## Guides and checks

- [Architecture and feature ownership](docs/ARCHITECTURE.md)
- [PC and Termux builds](docs/BUILDING.md)
- [Figma coverage and limits](docs/FIGMA_COVERAGE.md)
- [Verification and teacher walkthrough](docs/VERIFICATION.md)

```sh
npx tsc --noEmit
npm run lint
npm test -- --runInBand
git diff --check
```

Jest tests mock Android storage. They do not prove native encryption, biometrics, APK installation, or visible device behavior.
