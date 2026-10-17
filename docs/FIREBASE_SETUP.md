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

The current v1.2.2 release certificate SHA-1 and SHA-256 are registered to
the Firebase Android app. Google sign-in with that release key and Play Integrity
attestation have not yet been verified. A future signing-key rotation requires
registering the new certificate fingerprints before testing that build. The
reviewed Firestore rules were deployed to this project, including a rules-only
update on 2026-10-17 for the
optional allowlisted tutor avatar preset. That update did not change indexes;
the six existing composite indexes were previously read back as `READY`. The
emulator suite passes for the current rules. One POCO group change still shows
a permission error; see [VERIFICATION.md](VERIFICATION.md).
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
can add a Student ID later in Edit Profile, where it stays in private account
state. Google-to-Firebase sign-in has been completed on the POCO with a debug
build.
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

Firebase client settings identify the project; the API key is not an access
control mechanism. Keep Firestore rules restrictive and never put service
account credentials or Admin SDK keys in the mobile app.

## Android App Check

The app initializes Firebase App Check before the Firebase JavaScript SDK
creates Auth or Firestore services. A custom JavaScript provider forwards token
requests to the Android native Firebase SDK. Debug builds use Firebase's debug
provider; release builds use Play Integrity. The native app registration ID and
Android API key are stored in `firebaseConfig.js` separately from the Web app ID
and Web API key. The JavaScript Firebase app receives only the Web configuration;
the native App Check bridge receives only the Android app configuration.

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
`adb reverse tcp:8080 tcp:8080`. Keep this value blank for every release build.

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
other booking's locks. Current
group chat is available to current members, and tutor-session chat is limited
to its two participants. These chat workflows are covered by emulator tests and
were exercised with two temporary verified accounts on the POCO. A rules-only
deployment was completed on 2026-10-17; a pending shared-group change on the
signed-in POCO account still reports a permission error and has not been
replayed or deleted.
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
