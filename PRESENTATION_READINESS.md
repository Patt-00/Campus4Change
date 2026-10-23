# Campus4Change presentation readiness

## Purpose and current status

Campus4Change connects TIP learners who need tutoring with peers who can
teach, and supports study groups and messaging. Payments, live voice/video
calls, operating-system push notifications, and iOS are outside this Android
version's scope.

The current candidate is Campus4Change 1.4.0, Android version code 7. The only
public installable asset is still the older signed APK in the
[v1.3.0-preview.2 pre-release](https://github.com/Patt-00/Campus4Change/releases/tag/v1.3.0-preview.2).
The signed 1.4.0 APK and AAB are built locally but have not been published.
The 1.4.0 APK is installed on the POCO X4 GT, and the pulled APK hash matches
the local artifact. Fresh launch, onboarding, signup navigation, empty-form
validation, Google account-picker cancellation, and the signed-out About page
have been checked without creating an account. The POCO is the only required
physical test device; Pad 7 is deferred.

The source branch has a draft PR to `main`. CI run `39964691039` passed both
checks on head `9bbdb82`; manual run `39966502505` also passed the clean
macOS build. Check PR #1 for passing checks on its current head before merge.
The last weighted completion estimate was 88.25% before the 1.4.0 release work
and is not a current score. See
[COMPLETION_AUDIT.md](COMPLETION_AUDIT.md) for the live gates.

Firebase Authentication and Cloud Firestore use project `campus4change`. The
v4 release SHA-1 and SHA-256 are registered to the Android app, and the
production Firestore rules and six composite indexes now match the checked-in
source. Play Integrity App Check remains unregistered because its provider
setup requires the project owner to accept the Google APIs and Play Integrity
terms. Release Google sign-in has not been completed with a selected account,
and Auth and Firestore App Check enforcement remain off. The POCO reached the
Google Play Integrity service, but Firebase's App Check token exchange failed
with a generic exception. The exact service response is unavailable. Do not
promise a live login or shared-data flow until the POCO tests pass. The
authorized production data reset remains pending after the encrypted backup
and live-flow checks.

Payments, live voice/video calls, operating-system push notifications, and iOS
are outside this Android version's scope. The Desktop presentation guide is
`~/Desktop/Campus4Change Presentation Guide.md`.


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
- **Cloud data:** Firestore stores owner-only private account state, tutor profiles, groups/posts/replies/reports, participant session requests, participant slot locks, and group/session chat. Firebase UID remains the owner key. `accountUuid` is a random account reference, not a TIP enrollment check. Firestore rules are an authorization boundary and currently match the deployed ruleset; see [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).
- **Important integrations:** Firebase Auth, Firestore, Android Credential Manager, Firebase email verification, and Android system photo picker.

## Demonstration sequence

Use two presenter-controlled, email-verified test accounts with inbox access.
Run the account steps sequentially on the POCO; only one physical device is in
the current acceptance scope. Do not add demo credentials to the application.

1. Launch on the POCO, sign in, and complete TIP setup with campus, course, and year. Show the generated Campus4Change UUID and explain that it does not verify TIP enrollment.
2. Sign out, sign in to the tutor account, and publish a tutor profile with a course and subjects.
3. Sign out and return to the learner account. Open Find People, search for the tutor, and request a future one-hour session in a listed subject.
4. Sign in to the tutor account and accept the request in Sessions. Return to the learner account and confirm the accepted booking and in-app notice.
5. Open the participant session chat from each account in turn and verify the sent message appears for both participants.
6. Create a study group from one account. Sign in to the other account, discover the group, and join it.
7. Open group chat from both accounts in turn and confirm a message or reply appears for each member.
8. Cancel the QA booking from a participant account and confirm the cancelled state and released time slot.
9. Show the floating notification opening its related Notifications detail, then review Settings and About.

Expected results are a tutor profile visible to the learner, an incoming request visible to the tutor, an accepted booking visible in Upcoming, participant-only messages delivered, the joined group's messages visible to both members, and a cancelled booking with released slot reservations.

## Demo setup and requirements

### Live Firebase presentation

- Use the signed release for live Firebase only after Google sign-in and App Check pass on the POCO. The production Firestore rules and indexes match the repository. Until live checks pass, use the local-emulator QA fallback below.
- Use verified email accounts with inbox access if demonstrating shared features. The app generates a UUID; it does not request or verify a Student ID.
- Production Firestore rules and all six composite indexes now match the repository. The v4 release SHA fingerprints are registered for Google sign-in. Play Integrity App Check still needs the project owner to accept its terms and complete provider registration.
- POCO X4 GT is the only device in the current-source acceptance check. Pad 7 testing is deferred. Do not describe the current candidate as passing a two-device live-Firebase rehearsal.
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
| Play Integrity App Check is not registered yet | The POCO token exchange failed, so release attestation and enforced requests remain unverified | The project owner must review and accept the Google APIs and Play Integrity terms. Then verify a valid POCO token and expected request metrics before enabling enforcement. |
| Live Google sign-in has not completed on the 1.4.0 candidate | Account setup and shared cloud flows are not yet verified with a real Google credential | The user selects a Google account on the POCO and completes any provider security prompts. Do not promise live sign-in until the signed candidate reaches the expected account route. |
| The public v1.3.0-preview.2 APK predates the 1.4.0 candidate | The current UUID setup is not available from the public release download | Use the 1.4.0 APK only after it is published to GitHub; do not treat the local candidate as a public download. |
| School network or Firebase service is unavailable | Shared live features cannot reach the backend | Use the local emulator setup above if the school laptop has the required SDK/JDK and the QA APK can be built. Rehearse it on the presentation machine before relying on it. |
| OS push or live calls | These functions are not implemented | Demonstrate the in-app notification and messaging flows; do not promise OS push, voice, or video. |

The public signed v1.3.0-preview.2 APK is available for download. The current signed 1.4.0 candidate is local and installed on the POCO, but is not published. A live multi-user rehearsal still needs Play Integrity terms acceptance, successful Google sign-in, data cleanup, and a final clean-start check.

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
downloadable GitHub pre-release remains v1.3.0/code 6; the local v1.4.0/code 7
candidate is unpublished. On 2026-10-23, Google sign-in and UUID profile setup
passed on the POCO using the user-selected tester account. App Check remains
unregistered, and release-token verification is open. The dated evidence is in
[verification history](docs/VERIFICATION.md).

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
