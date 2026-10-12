# Firebase setup for Campus4Change

Campus4Change uses the Firebase JavaScript SDK. Firebase Authentication handles
email/password accounts. Firestore stores one private account-state document
per user and a separate shared study-group directory. Authentication persists
across app restarts. The Firebase refresh token is stored through the Android
native module and encrypted with Android Keystore-backed AES-GCM. A second
encrypted copy of app state stays on the device for recovery when cloud sync
fails.

## Current project state

This checkout is configured for Firebase project `campus4change` on the Spark
plan. Its Web app is registered as **Campus4Change React Native**, Email/Password
sign-in is enabled, and the Standard Firestore database is in
`asia-southeast1` (Singapore). The database was initialized in production mode,
so its current rules deny all client reads and writes. The checked-in
`firestore.rules` file has passed the emulator suite but has not been deployed
to this project; live app data access stays unavailable until that deployment.

## Configure a Firebase project

1. Open the Firebase Console and create or select your course project.
2. In **Authentication > Sign-in method**, enable **Email/Password**.
3. In **Firestore Database**, create a database.
4. In **Project settings > Your apps**, register a Web app for the JavaScript
   SDK and copy its Firebase configuration into
   `src/shared/backend/firebaseConfig.js`.
5. Sign in to the Firebase CLI, select the same project, and deploy the
   checked-in rules only after reviewing and authorizing that live change:

   ```sh
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore:rules
   ```

   If asked, choose the Firebase project you configured above. Check the
   selected project before deploying.
6. Build and run the Android app. Sign-up creates a Firebase account, and a
   successful sign-in restores the account's Firestore state. The demo account
   remains local sample data.

Firebase client settings identify the project; the API key is not an access
control mechanism. Keep Firestore rules restrictive and never put service
account credentials or Admin SDK keys in the mobile app.

## Verify the Firestore rules locally

The rules test uses the Firebase Local Emulator Suite. In one terminal, start
Auth and Firestore emulators with the reserved demo project ID:

```sh
npx firebase-tools emulators:start --only auth,firestore --project demo-campus4change-rules
```

In another terminal, run:

```sh
npm run test:firestore-rules
```

The test checks private account ownership, authenticated group discovery,
private membership records, safe membership-count updates, and member-only post
and reply reads and writes. It also rejects unauthenticated access, membership
spoofing, nonmember posting, and unconfigured collections.
The rules-test package requires Node.js 24.12 or newer; the React Native app
build itself retains the repository's Node.js 22.11 minimum.

For an Android debug build that tests Auth/Firestore from the app, set
`firebaseEmulatorHost` to `127.0.0.1` in the local Firebase config while the
emulators are running, then run `adb reverse tcp:9099 tcp:9099` and
`adb reverse tcp:8080 tcp:8080`. Keep this value blank for every release build.

## Current data boundary

The `firestore.rules` file allows a signed-in user to read and update only their
own `users/{uid}/private/state` document. It also allows signed-in students to
discover group metadata, while keeping each membership record private to its
owner. Only current group members can read or write posts and replies. Joining
or leaving a group updates the public member count in the same validated batch.
Each group member can add a post or reply once every five seconds; a private,
non-deletable rate-limit document is updated atomically with each contribution.
Unmatched documents are denied.

The app writes its account state into the private document. Firestore limits
documents to 1 MiB; the app uses a lower client-side size cap. Shared groups,
memberships, posts, and replies use the separate `studyGroups` collection.
Device-only/demo groups remain local. Tutor listings, bookings, group chat, and
direct messages are not shared with other students yet. Google sign-in, email
verification, and wider social data sharing still need their own design and
Firebase configuration.

When Firebase values are absent from `firebaseConfig.js`, local demo/prototype
accounts continue to work. With the current project configuration, new
accounts use Firebase Authentication. Previously created on-device accounts
remain device-only; a data migration to Firebase is not implemented.
