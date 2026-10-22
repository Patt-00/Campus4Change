# Firebase setup for Campus4Change

Campus4Change uses the Firebase JavaScript SDK. Firebase Authentication handles
email/password and Google accounts on Android. Firestore stores one private account-state document
per user, a shared study-group directory, public tutor listings, and
participant-only session requests. Authentication persists
across app restarts. The Firebase refresh token is stored through the Android
native module and encrypted with Android Keystore-backed AES-GCM. A second
encrypted copy of app state stays on the device for recovery when cloud sync
fails.

## Current project state

This checkout is configured for Firebase project `campus4change` on the Spark
plan. Its Web app is registered as **Campus4Change React Native**, Email/Password
and Google sign-in are enabled, and the Standard Firestore database is in
`asia-southeast1` (Singapore). Google consent uses the support email
`qpurbina@tip.edu.ph`. The `com.campus4change` APK can use a machine-local debug
keystore through the `C4C_DEBUG_STORE_FILE` Gradle environment override. This
workstation's local Android debug keystore has these fingerprints:

- SHA-1: `60:CD:C5:DF:6D:2D:2A:DF:48:DC:E2:4B:72:98:8B:9C:34:A9:CE:4A`
- SHA-256: `68:8F:33:2C:76:20:0B:C2:7D:09:7A:65:EF:4B:48:36:65:96:C7:90:E8:9E:08:A4:36:25:35:42:39:F3:70:82`

The Firebase Android app has this workstation's local SHA-1 registered for
Google sign-in; its local SHA-256 is not registered for Play Integrity. The
repository-tracked debug keystore is public and has different SHA-1/SHA-256
fingerprints (`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` /
`FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`). Do not register that public certificate with Firebase. Other developers need to use their own local debug key and add its SHA-1 to Firebase after authorization.

The v1.2.2 release certificate SHA-1 and SHA-256 are registered to the Firebase
Android app. The locally built v1.3.0 APK and AAB use a replacement signer with
these fingerprints:

- SHA-1: `21:24:1E:9A:18:AB:85:31:F5:B3:83:A5:5D:87:14:C9:80:C8:07:D5`
- SHA-256: `0C:65:24:06:CF:3B:60:51:A4:F9:65:70:80:7E:F7:38:D4:8A:48:80:2E:E1:0E:06:76:05:5D:61:FE:F5:9E:E7`

The read-only Firebase SHA list check on 2026-10-22 found this replacement
certificate unregistered. On 2026-10-22, the signed app cold-launched on POCO,
but its startup log showed App Check token failures. The exact server-side
cause is unconfirmed, and Google sign-in and Play Integrity/App Check for this
signer remain unverified. An authorized Firebase project owner must register
both fingerprints before testing those release-only flows. The install did
not change production configuration or Firebase Auth/Firestore data.

A read-only Firebase Console inspection on 2026-10-22 showed the Android app
`com.campus4change` as **Not registered** under App Check. In the App Check
APIs tab, both Authentication and Cloud Firestore were **Unenforced**. This
confirms an App Check registration gap that is consistent with the observed
token-request failures, but the current native bridge intentionally logs only
the Firebase exception class, so the specific Play Integrity error remains
unknown. No registration or enforcement setting was changed.

### Current production state

A read-only Rules API recheck on 2026-10-22 confirmed that the active default
Firestore release still points to ruleset
`projects/campus4change/rulesets/4f66efb8-d8d6-404c-83be-8a2b7b37588a`.
Its `firestore.rules` source hashes to
`867e1b314fb639608ef4fe6978892ee6d337536be27a65b01b76c066679ec0a8`.
The local source hashes to
`25f0ec68a34ce0eb1964164dfa7fb9139413d99fa0ca1a5f323236bf4e302323`, so the
live source still lacks the local `studentIdClaims` path. The local claim rules
pass emulator tests. This check used read-only GET requests; it did not deploy
rules or change production authorization.

A read-only Firestore index API recheck on 2026-10-22 returned six production
composite indexes, all in `READY` state and matching all six definitions in
`firestore.indexes.json`. No production index was modified.

The last recorded rules deployment was on 2026-10-17. It added the optional
allowlisted tutor avatar preset and did not change indexes. An earlier manual
test recorded a permission-denied group update on a signed-in POCO account.
This audit did not inspect, replay, or delete that pending device operation.
See [VERIFICATION.md](VERIFICATION.md) for the dated observation.
Firebase signup sends an email verification link. Verified email claims are
required for shared study groups, tutor listings, and session requests; each
user can still read and save only their own private account state before
verification. Product policy allows any email address after Firebase verifies
it. The app does not check for a school-domain suffix, and verified email does
not establish that a user attends TIP or another particular school.

Google sign-in is implemented with Android Credential Manager and Firebase
Authentication. The Android app uses the public Firebase Web client ID from
`firebaseConfig.js` to request a Google ID token, then exchanges that token with
Firebase. The ID is public client configuration; never put a Web client secret
in the app. A Google account supplies its name and email. The account holder
must complete TIP account setup with a course, year level, campus, and
digits-only Student ID before entering the app. Student IDs stay in private
account state and are reserved through owner-only Firestore claim documents so
two Firebase accounts cannot claim the same new or changed ID. Older installed
clients can keep syncing an unchanged ID until they are updated; a duplicate
legacy ID must be changed during setup before it can be claimed. Google-to-
Firebase sign-in has been completed on the POCO with a debug build.
The matching Firestore rules must be deployed before Firebase accounts can use
this uniqueness check. Device-only accounts are checked only against other
accounts on the same device.
See [Android's Credential Manager Google sign-in guide](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)
and [Firebase's Google sign-in guide for Android](https://firebase.google.com/docs/auth/android/google-signin)
for the platform flow and token exchange.

## Configure a Firebase project

1. Open the Firebase Console and create or select your course project.
2. In **Authentication > Sign-in method**, enable **Email/Password** and
   **Google**. Choose the support email shown to users on the Google consent
   screen.
3. In **Firestore Database**, create a database.
4. In **Project settings > Your apps**, register a Web app for the JavaScript
   SDK and copy its Firebase configuration into
   `src/shared/backend/firebaseConfig.js`. Copy the public Web client ID from
   the Google provider's Web SDK configuration into `googleWebClientId` in the
   same file.
5. Register the Android package `com.campus4change` in Project settings. For
   Google sign-in, build with a private per-machine debug key and register that
   APK's SHA-1. On this workstation, `~/.android/debug.keystore` is selected
   with `C4C_DEBUG_STORE_FILE` and its SHA-1 is registered. The v1.2.2 private release key SHA-1 and SHA-256 are registered. A future
release-key rotation requires registering its new SHA-1 for Google sign-in
and new SHA-256 for App Check before verifying that build. Do not add the
public
   repo-tracked debug key to Firebase. Each additional developer's private
   debug key needs its own authorized SHA-1 entry. App Check Play Integrity
   requires a valid release certificate and provider configuration; a
   registered release SHA-256 alone does not verify release attestation.
6. Sign in to the Firebase CLI, select the same project, and deploy the
   checked-in Firestore rules and indexes only after reviewing and authorizing
   that live change:

   ```sh
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore
   ```

   If asked, choose the Firebase project you configured above. Check the
   selected project before deploying. Index creation may take several minutes.
7. Build and run the Android app. Sign-up creates a Firebase account, and a
   successful sign-in restores the account's Firestore state. No account or
   sample listings are preloaded. Existing device-only accounts remain local.

Firebase `apiKey` and `androidApiKey` values are public client configuration:
they identify the Firebase project and do not authorize access. Keep
Firebase-provisioned keys restricted to Firebase APIs, and use separate,
restricted keys for any non-Firebase Google APIs. Firestore rules and App Check
enforce data access; never put service-account credentials or Admin SDK keys in
the mobile app. See [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys).

## Android App Check

Live Firebase builds initialize App Check before the Firebase JavaScript SDK
creates Auth or Firestore services. A custom JavaScript provider forwards token
requests to the Android native Firebase SDK. Debug builds use Firebase's debug
provider; release builds use Play Integrity. Debug builds configured for local
Auth and Firestore emulators skip App Check initialization so they do not
request a debug token for the demo project. The native app registration ID and
Android API key are stored in `firebaseConfig.js` separately from the Web app
ID and Web API key. The JavaScript Firebase app receives only the Web
configuration; the native App Check bridge receives only the Android app
configuration.

The Android Firebase app has the v1.2.2 release certificate SHA-1 and
SHA-256 registered, along with authorized workstation debug fingerprints.
A POCO X4 GT
debug token was allowlisted for final-sprint QA, used to verify private-state
sync, then revoked and removed from the local credential cache. Never commit
debug tokens or include them in screenshots, reports, or CI logs. Release
builds use Play Integrity and the v1.2.2 release SHA-256 is registered, but
release attestation, request metrics, and enforcement have not been verified.
Firestore Security Rules remain the primary authorization boundary. Accept the
Google APIs and Play Integrity terms in Firebase Console only when you are
ready to configure production App Check.

## Verify the Firestore rules locally

The rules test uses the Firebase Local Emulator Suite. In one terminal, start
Auth and Firestore emulators with the reserved demo project ID:

```sh
npx firebase-tools emulators:start --only auth,firestore --project demo-campus4change-rules
```

In another terminal, run:

```sh
C4C_ALLOW_FIRESTORE_EMULATOR_RESET=1 npm run test:firestore-rules
npm run test:firebase-auth
```

The Firestore rules test clears every document in the selected emulator
project's default database before running. It refuses to run without the
explicit reset flag above; do not enable it against an emulator database whose
data you need to keep. PowerShell equivalent:

```powershell
$env:C4C_ALLOW_FIRESTORE_EMULATOR_RESET = '1'
npm run test:firestore-rules
Remove-Item Env:C4C_ALLOW_FIRESTORE_EMULATOR_RESET
npm run test:firebase-auth
```

The test checks private account ownership, listed tutor profiles, participant-
only session requests, the five-second per-student request permit (including
concurrent submissions and forged cooldown resets), overlapping-session
reservation locks, authenticated
group discovery, private membership records, safe membership-count updates, and
member-only post and reply reads and writes. It also rejects unauthenticated
access, third-party booking reads, duplicate and overlapping slot acceptance,
forged bucket IDs and lock paths, membership spoofing, nonmember posting, and
unconfigured collections.
The Auth emulator test creates a disposable test account, sends and applies a
verification code locally, confirms the refreshed email claim, and checks that
shared-group access is denied before verification but allowed afterward.
The rules-test package requires Node.js 24.12 or newer. The React Native 0.87.1
app build requires the Node.js engine range declared in `package.json`:
`^22.13.0 || ^24.3.0 || >=26.0.0`.

For an Android debug build that tests Auth/Firestore from the app, set
`firebaseEmulatorHost` to `127.0.0.1` in the local Firebase config while the
emulators are running, then run `adb reverse tcp:9099 tcp:9099` and
`adb reverse tcp:8080 tcp:8080`. This mode skips App Check token requests. Keep
the value blank for every release build.

## Current data boundary

The `firestore.rules` file allows a signed-in user to read and update only their
own `users/{uid}/private/state` document, including before email verification.
Only users with a verified email claim can discover group metadata or access
group data; each membership record remains private to its owner. Only current
verified members can read or write posts and replies. Joining or leaving a
group updates the public member count in the same validated batch.
Each group member can add a post or reply once every five seconds; a private,
non-deletable rate-limit document is updated atomically with each contribution.
Members can report another member's visible post or reply for spam or abuse.
Reports use that same cooldown, do not store the reporter UID, and can be
reviewed only by the group owner. The owner can dismiss a report or reversibly
hide and restore the reported content. Hidden posts/replies are unavailable to
members. This is group-owner moderation; instructor-wide moderation is not
implemented. Unmatched documents are denied.

Before deploying these rules, check for existing shared posts or replies that
do not have `moderationStatus: "visible"` and backfill them. The member feed
queries and rules now require that field, so older records without it will not
appear to members. The checked-in `firestore.indexes.json` supplies the
composite indexes for those filtered feeds and filtered shared-group chat.

The app writes its account state into the private document. Firestore limits
documents to 1 MiB; the app uses a lower client-side size cap. Shared group
metadata, member counts, posts, and replies use the `studyGroups` collection.
Each member's private record lives at
`users/{uid}/studyGroupMemberships/{groupId}` and is written atomically with
the matching group-count change. The user's exact private path supplies the
live membership query and member authorization; no global `members`
collection-group rule is needed. Device-only groups remain local. Firebase
Authentication sends a verification email at signup, and Firestore rules
require the verified-email claim for shared study groups, tutor listings, and
session requests.

Tutor profiles are owner-editable documents at `tutorProfiles/{uid}` and expose
only the fields needed for a student listing, including an allowlisted built-in
avatar preset ID. Custom profile photos remain on the originating device and
are not uploaded to Firestore. Session requests live at
`tutorBookings/{bookingId}` and can be read only by the student and tutor.
Request status changes are limited to tutor acceptance/decline, participant
cancellation, or participant completion. Accepting a request creates two
`sessionSlots/{participantUid}/slots/{slotBucket}` reservations per participant,
four in total, in the same transaction. The shared namespace prevents student
conflicts across tutors and role changes; cancellation or completion removes all
four locks atomically. Pending requests remain cancellable without removing any
other booking's locks. The local rules source permits group chat for current
members and tutor-session chat for the two participants. These workflows are
covered by emulator tests and were exercised with two temporary verified
accounts on the POCO. An earlier manual test recorded a permission-denied
shared-group change on a signed-in POCO account. This audit did not inspect,
replay, or delete that pending device operation.
Creating a tutor-session request also updates the student's private,
non-deletable `tutorBookingLimits/{uid}` record in the same atomic batch. The
rules permit one request every five seconds and reject a limit record that is
not paired with its matching pending request.
Google
sign-in is configured as described above. Per the project owner's decision,
there is no school-domain allowlist; any Firebase-verified email may use shared
features.

When Firebase values are absent from `firebaseConfig.js`, users can create and
sign into device-only accounts. With the current project configuration, new
accounts use Firebase Authentication. Previously created on-device accounts
remain device-only; a data migration to Firebase is not implemented. Upgrading
from the old seeded build removes its exact bundled account and sample state,
while preserving other local accounts and state.
