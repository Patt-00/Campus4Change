# Campus4Change architecture

The app uses React Native CLI 0.87.1, React 19.2.3, JavaScript/JSX, and Hermes. It has no navigation library or external state framework. When Firebase is configured, Firebase Authentication handles cloud accounts, Firestore syncs each user's private state, and the groups feature shares its directory, membership, posts, and replies. The local demo remains available without Firebase configuration.

## Entry and ownership

`index.js` registers `App.jsx`. The root mounts a safe-area provider and `AppNavigator`.

`src/navigation/AppNavigator.jsx` owns the current route, back history, and connections between features. Routes are plain JavaScript objects with a page name and optional item IDs. Android Back uses the same history as screen Back. Main tabs reset the history.

`src/shared/state/useCampusSession.js` owns the signed-in account state, authentication flow, state updates, local/cloud saves, save errors, retries, account restoration, and sign-out. It tells the navigator when sign-in or sign-out succeeds so the navigator can reset the route and history. Firebase SDK calls are isolated in `src/shared/backend/firebase.js`; the hook does not import feature screens or navigation code.

Feature screens receive data and callbacks. They request navigation or submit changes through those callbacks. Features do not import other features' screens; the navigator connects them.

```text
src/
  navigation/       route types and integration
  features/
    onboarding/    splash, audience introductions, and first-run navigation
    auth/
    home/
    create/
    tutors/
    groups/
    sessions/
    messages/
    notifications/
    profile/
    about/
  shared/
    assets/        local images and font license
    components/    common controls and screen layout
    data/          sample data and catalog selectors
    state/         account hook, reducer, and Android storage interface
    backend/       Firebase initialization and project configuration
    theme/         colors and styles
android/
  app/src/main/java/com/campus4change/
    MainApplication.kt
    CampusStorageModule.kt
  app/src/main/assets/fonts/
docs/
scripts/
__tests__/
```

Put feature-only UI or data inside that feature. Keep common controls, types, state rules, theme, and assets in shared. Shared components import navigation types only. The former placeholder feature has been removed.

Each screen has its own named JSX file under its feature's `screens/` folder, with only the styles and imports that screen uses. Related screens use common controls or feature-owned components instead of importing each other. Authentication callbacks are passed into the login and sign-up screens. The Create tab has its own screen and requests the tutor, group, and profile flows through navigation callbacks.

The onboarding feature keeps the splash screen and its logo, then shows the
Novice, Intermediate, and Expert introduction slides before login/signup. The
slide artwork and copy belong to onboarding; the shared logo and theme remain
under `shared/`.

## State and data flow

State records are plain JavaScript objects for profiles, tutors, sessions, groups, conversations, and notices. A session has an ID, tutor ID, subject, ISO start time, note, status, and optional rating. Sessions last one hour. Booking and session history use this same record.

`demo.js` supplies sample tutors and initial state. Only the public demo account receives sample school details, interests, groups, bookings, and messages. Other accounts start empty. `catalog.js` selects directory tutors and visible groups while retaining historical tutor IDs for older bookings. Used sample groups remain visible after an update; saved records are not deleted.

The profile feature owns the custom-interest editor. The tutor feature owns booking slot definitions shared by its details and booking forms, and pure search/filter rules in `data/search.js`. The group feature owns meetup date validation. A group's optional `meetupAt` ISO timestamp is compatible with version-1 saved state; old groups without it show no scheduled meetup.

`shared/state/reducer.js` applies profile edits, bookings, session changes, memberships, posts, replies, messages, read notices, and study-note drafts. It rejects overlapping bookings, invalid ratings, and group posts/messages from non-members. A version-1 `pendingSharedActions` queue preserves shared group writes in the encrypted device state so the navigator can retry them after network failures.

The account hook saves changed state to encrypted Android storage. With Firebase configured, it also saves the complete state under `users/{uid}/private/state` and restores the user's Firebase session at app launch. If a newer encrypted local copy exists than the cloud copy, it is synced up. Save failures appear in the navigator's banner with a retry action. Sign-out saves the latest state before clearing the active account; a failed save keeps the account open. Loaded state must belong to the account that signed in. Saved JSON remains version 1.

`features/groups/data/firestore.js` maps the group feature model to
`studyGroups/{groupId}`, private member records, posts, and replies. Directory
updates read only changed group metadata and membership; post and reply
listeners run only while a member has that group open. `useSharedGroups` merges
the active member feed into the directory record before screens consume it.
`features/groups/hooks/useSharedGroups.js` owns the live directory, merges it
with device-only groups, and retries the account's pending group changes. The
navigator only connects those group callbacks to screens. `firestore.rules`
lets authenticated users discover group metadata, restricts each membership
record to its owner, and permits post/reply reads and writes only for members.
The private account document remains scoped to its owner. Tutor listings,
bookings, group chats, and direct messages are still local to one account.

## Android local accounts

`CampusStorageModule.kt` implements the Android-only `CampusStorage` native module registered by `MainApplication.kt`. It protects local account records, cached state, and Firebase Auth persistence values.

- Private SharedPreferences hold encrypted account, per-account JSON, and Firebase Auth persistence records.
- AES-GCM uses an Android Keystore key and a new IV per write.
- Salted PBKDF2 hashes verify passwords. Real passwords are not saved as plain text.
- A single background executor orders account and storage operations.
- Loading and saving requires an active account.
- Biometric setup requires a signed-in non-demo account and a successful Android biometric prompt. Sign-in uses the enrolled device biometrics. Android 9 or newer is required.
- Android backup is disabled. Clearing app data or uninstalling removes local accounts and data.

These device-only accounts are not school identity verification. Configured Firebase accounts provide email/password authentication, account recovery, private state sync, and shared study groups, but the app has no institutional sign-in or complete campus data service. The iOS scaffold cannot use this Android module.

## UI and builds

Shared controls provide the screen wrapper, header, tabs, buttons, inputs, chips, avatars, and icons. Inter fonts are bundled under Android assets. Figma circle images are bundled as PNGs, with source SVGs retained. The app's outline icons also have local SVG sources and PNG assets, without an icon-library dependency. The Inter license is in `shared/assets/Inter-OFL.txt`.

A normal full-screen View is retained. Safe-area insets pad status and navigation bar edges. Forms scroll, Android resizes for the keyboard, tablet content width is limited, and portrait orientation is retained.

Release builds bundle JavaScript, fonts, and images and run without Metro. Hermes is enabled. PC builds use the default ABI list. The separate Termux wrapper selects ARM64 and its existing aapt2/Hermes tooling.

## Tests

`App.test.jsx` verifies login validation/failure, selected-tutor booking, persisted messages, groups/posts/replies, profile edits, new-account separation, Android Back handling for study drafts, a booked-session notes workspace without a focus timer, the separate group focus room, session completion, save retries, and linked notifications.

Account lifecycle tests also verify rejection of another account's saved state, saving before sign-out, clearing route history on sign-out, and retaining the active account when its final save fails.

`state.test.js` checks overlap and adjacency, rescheduling, ratings, membership restrictions, fresh account state, combined search filters, saved-state compatibility, and derived session timing states.

`groupFirestore.test.js` checks changed-metadata reads, lazy post loading,
live reply updates, and listener cleanup for groups that are closed or no
longer joined.

`firebaseSignUp.test.js` exercises an auth-state callback that arrives before
Firebase's account-creation promise resolves and verifies that the new profile
still receives its submitted name and Student ID.

Version 1.2.0 tests also cover custom-interest addition/removal/deduplication and reopening, optional school fields, empty personal directories, historical sample data, selected booking slots, group schedule validation, and About navigation before sign-in.

Jest mocks Android storage. Native encryption, biometric prompts, installation, cold launch, and Android layout require device checks. See [VERIFICATION.md](VERIFICATION.md).
