# Campus4Change presentation readiness

## Purpose and current status

Campus4Change connects TIP learners who need tutoring with peers who can
teach, and supports study groups and messaging. Payments, live voice/video
calls, operating-system push notifications, and iOS are outside this Android
version's scope.

The current app version is 1.3.0, Android version code 6. GitHub hosts the
current source snapshot and signed, installable APK in the
[v1.3.0-preview.2 pre-release](https://github.com/Patt-00/Campus4Change/releases/tag/v1.3.0-preview.2).
Download Campus4Change-v1.3.0-preview.2.apk from that page. Its SHA-256 is
c2191dc45f42d5d9e2a4bbc63d515d1e045a3cbdd72af872b365c5d173fcc210. It is a
release-signed APK, not a debug APK, and it bundles the application so it does
not need Metro. The AAB was validated and remains local. The source and APK
are on the preview branch/tag; main remains at its earlier baseline and has
not been updated for this pre-release.

The POCO X4 GT is the only device used in the latest release check. The
installed APK hash matches the release asset exactly; package metadata reports
version 1.3.0/code 6, and a fresh launch reached MainActivity without a fatal
or React Native startup error in the captured log. The device reported no
network connection, so this launch did not verify live Firebase access.
Pad 7 was unavailable and no emulator was started in this release pass.

The codebase uses Firebase Authentication and Firestore and is configured for
project campus4change. The live backend is not fully ready for a verified
presentation flow: production Firestore rules are older than the current
source and do not include Student ID claims; the replacement release signer
is not registered for Firebase Google sign-in or Play Integrity; the App
Check Console lists the Android app as Not registered, while Auth and
Firestore App Check enforcement are currently Unenforced. Do not promise that
all live sign-in and shared-data flows have passed on this APK. The current
local source tests passed; live release authentication was not tested.

The evidence-weighted completion estimate is 87.5%, not a teacher's grade.
The pre-release contains the current snapshot, but the main branch, exact-source
CI, production Firebase checks, current-source two-device verification, and
school-laptop rehearsal remain open. See COMPLETION_AUDIT.md for the evidence
and remaining gates. The Desktop presentation guide is
~/Desktop/Campus4Change Presentation Guide.md.


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

1. Launch on the learner device and sign in. Show required TIP profile fields: campus, course, year, and private digits-only Student ID.
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

- Use the signed release only after its Firebase certificate registration, release sign-in/App Check, and production-rule checks pass. Until those gates are verified, use the local-emulator QA fallback below.
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
| The v1.3.0 preview APK is now published, but the replacement release certificate remains unregistered in the 2026-10-22 read-only check | Google sign-in/App Check and release-signer behavior are unverified; production rules lack the current Student ID claim flow, and the POCO was offline during the latest launch | Use the preview APK to show the Android app. Do not promise live sign-in or shared cloud flows until the Firebase release checks pass. |
| School network or Firebase service is unavailable | Shared live features cannot reach the backend | Use the local emulator setup above if the school laptop has the required SDK/JDK and the QA APK can be built. Rehearse it on the presentation machine before relying on it. |
| Google sign-in with release signer and Play Integrity | Release-only authentication/attestation behavior is unknown | For a scoped walkthrough, use verified email/password accounts and report the release-only gates accurately. |
| OS push or live calls | These functions are not implemented | Demonstrate the in-app notification and messaging flows; do not promise OS push, voice, or video. |

The signed APK is available for the presentation. A full live multi-user demo still needs a networked rehearsal with the release certificate and current production Firestore rules.

On 2026-10-22, the latest signed release APK (version 1.3.0/code 6) was
rebuilt, verified, installed in place on POCO X4 GT, and cold-launched. The
signed-out Login → About route now shows accurate Firebase sign-in guidance
instead of implying that an active account is device-only. Its regression
suite passed 3 tests; the full Jest suite passed 333 tests across 40 suites,
ESLint passed, and the installed APK hash matches the local artifact. The AAB
passed signature and ZIP-integrity checks but remains local. No credentials or
production Firebase data were used. At that checkpoint Pad 7 verification,
release Auth/App Check, school-laptop rehearsal, and publication remained open.
The signed APK was later published in the v1.3.0-preview.2 pre-release.

A current-source local-emulator QA build also verified Settings → Learning
Preferences on POCO X4 GT. For the TIP Manila Computer Science profile, topic
search returned Natural language processing; selecting it and adding Graph
theory produced two grouped interests. Saving, returning to Settings, and
reopening Preferences preserved both. The owner-readable Firestore Emulator
state contained the same two values. A second local-emulator profile switched
to Information Technology and added Cloud computing and deployment while
keeping Computer Science and Computer programming in a separate course group;
saving and reopening preserved both groups. Both temporary Auth Emulator
accounts, private-state documents, Student ID claims, and pending verification
codes were removed afterward; the QA app returned to GET STARTED. A separate current-source QA check resent email verification on POCO. It
showed the animated floating **Verification email sent** card with **VIEW
NOTIFICATION**; tapping it from Home opened Notifications. Home had no separate
persistent verification banner. The focused toast/banner suites passed 8
tests. The temporary Auth account and queued local verification codes were
removed. This is single-device local-emulator evidence, not a school-laptop or
two-device rehearsal.


A further current-source local-emulator check exercised interest-based tutor
discovery on POCO X4 GT. One verified TIP Manila Computer Science account
published a tutor listing for Natural language processing. A second verified
student account saved that interest, opened Find People, and saw the tutor at
the top under **Recommended for your interests**, with the exact match shown;
opening the card displayed the tutor profile and subject. Both accounts,
private records, Student ID claims, tutor listing, and verification codes were
removed. This is single-device local-emulator proof, not a live-Firebase or
two-device demonstration.


A current-source Edit Profile check on the POCO confirmed that injected letters
do not remain in Year level or Student ID. Back with the form dirty displayed
the discard confirmation; discarding restored the saved profile values. The
private emulator state still held the original digits-only Student ID before
cleanup.


The latest signed 1.3.0/code 6 release build includes all 49 catalog entries.
The POCO-installed APK hash matches the local artifact and cold-launches to
Login. The AAB passes signature, ZIP integrity, and bundletool validation.
That build checkpoint preceded the v1.3.0-preview.2 publication. The current
pre-release APK is downloadable from GitHub; release Firebase sign-in and Play
Integrity/App Check remain unverified.

The latest camera recovery-route fix was verified on the POCO X4 GT with a
local Auth/Firestore emulator account. After a one-time camera grant and a
controlled process kill while the external camera was open, the updated app
automatically resumed Edit Profile, restored the pending photo, saved it, and
retained it after a later cold launch. The screen reuses Figma Edit Profile
frame `1:495`; no new visual state was required. The temporary account and
Firestore data were removed, the emulator was stopped, QA app data was cleared,
and camera permission was revoked. The full Jest suite now passes 334 tests
across 40 suites, full-project ESLint passes, and a forced Android unit-test
rerun passed all 21 tests. This adds current-source POCO evidence; Pad 7 and the
school-laptop rehearsal remain open.

A fresh isolated snapshot of that route-fix source also passed `npm ci`, all
334 Jest tests, and ESLint. Its clean Android debug build compiled the bundle,
Kotlin/Java, and CMake targets, then failed at APK packaging with `Disk quota
exceeded`; the temporary snapshot required 2.7 GB. The in-place QA APK build
did pass and was installed on POCO. Repeat a clean packaging run on the
school-laptop or another host with sufficient free disk before relying on it
for presentation.
