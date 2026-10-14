# Campus4Change architecture

The app uses React Native CLI 0.87.1, React 19.2.3, JavaScript/JSX, and Hermes. It has no navigation library or external state framework. When Firebase is configured, Firebase Authentication handles cloud accounts, Firestore syncs each user's private state, and the groups feature shares its directory, membership, posts, and replies. Firebase sign-up verifies email ownership before allowing shared group access; unverified users can access only their own private state. Device-only accounts remain available for local use when Firebase is not configured; no preloaded account or sample data is shipped.

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
    data/          date helpers and catalog selectors
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

Google authentication uses Android Credential Manager in
`CampusGoogleSignInModule.java`. `MainApplication.kt` registers the module;
`firebase.js` exchanges the returned Google ID token with Firebase
Authentication. The public Web client ID is configured in
`shared/backend/firebaseConfig.js`. Google supplies a Firebase account name and
email, while Student ID remains in the user's private profile state. Sign-out
clears both Firebase's auth session and Credential Manager state. The native
flow builds and opens the approved Google account chooser; the final Firebase
account exchange still needs a completed re-authentication check.

## State and data flow

State records are plain JavaScript objects for profiles, tutors, sessions, groups, conversations, and notices. A session has an ID, tutor ID, subject, ISO start time, note, status, and optional rating. Sessions last one hour. Booking and session history use this same record.

`data/utils.js` contains shared ID, date, and time helpers and creates blank account state. New accounts begin without tutors, groups, bookings, conversations, or notices. `catalog.js` exposes only the current device account's own tutor listing; verified Firebase tutor listings come from the shared directory subscription. Device groups come only from that account's saved state.

The profile feature owns the custom-interest editor. The tutor feature owns booking slot definitions shared by its details and booking forms, and pure search/filter rules in `data/search.js`. The group feature owns meetup date validation. A group's optional `meetupAt` ISO timestamp is compatible with version-1 saved state; old groups without it show no scheduled meetup.

`shared/state/reducer.js` applies profile edits, bookings, session changes, memberships, posts, replies, messages, read notices, and study-note drafts. It rejects overlapping bookings, invalid ratings, and group posts/messages from non-members. A version-1 `pendingSharedActions` queue preserves shared group writes in the encrypted device state so the navigator can retry them after network failures.

`features/messages/data/firestore.js` stores live group chat under each shared
group and tutor-session chat under its booking. `useSharedMessages` watches only
the active chat, loads a bounded latest-message window, and keeps chat snapshots
out of private account state. Firestore rules require current group membership
or booking participation; group owners can report-hide and restore reported
chat messages. Device-only conversations and older saved conversations remain
private notes in the account-state record.

The account hook saves changed state to encrypted Android storage. With Firebase configured, it also saves the complete state under `users/{uid}/private/state` and restores the user's Firebase session at app launch. If a newer encrypted local copy exists than the cloud copy, it is synced up. Save failures appear in the navigator's banner with a retry action. Sign-out first requires the encrypted local save; if only the cloud write fails, the user can still sign out and receives a warning so the next sign-in can retry the local copy. A failed local save keeps the account open. Loaded state must belong to the account that signed in. Saved JSON remains version 1.

`features/groups/data/firestore.js` maps the group feature model to
`studyGroups/{groupId}`, the owner's private
`users/{uid}/studyGroupMemberships/{groupId}` record, posts, and replies. The
user-scoped membership record is the source of truth for join state and group
authorization; it avoids a database-wide collection-group read. Directory
updates read changed group metadata and the current user's membership set; post
and reply listeners run only while a member has that group open. `useSharedGroups`
merges the active member feed into the directory record before screens consume it.
Live listeners cap each window at 20 posts and 20 replies per post; screens can
load older pages by document cursor. Paging pauses the live window and shows a
refresh action so history browsing does not accumulate an unbounded stream of
new snapshots. Feed snapshots stay in memory and are excluded from the saved
private account-state record.
`features/groups/hooks/useSharedGroups.js` owns the live directory, merges it
with device-only groups, and retries the account's pending group changes. The
navigator only connects those group callbacks to screens. `firestore.rules`
lets authenticated users discover group metadata, restricts each membership
record to its owner, and permits post/reply reads and writes only for members.
Each post/reply must update a private per-member write-limit record in the same
batch; rules enforce a five-second cooldown that leaving and rejoining cannot
reset.
`useSharedGroupReports` and `GroupReportsScreen` provide a paged, owner-only
review queue for shared groups. Members can report another member's visible
post or reply; report records omit reporter UID, and the same write cooldown
applies. Owners can dismiss a report or reversibly hide and restore its
content. Post/reply feeds filter to visible content, with their compound
queries defined in `firestore.indexes.json`. Instructor-wide moderation is
not part of this group-owner workflow.

The tutor feature publishes only opted-in profiles under `tutorProfiles/{uid}`.
Each listing contains a name, optional course/year, subjects, and a bio; it does
not contain email or Student ID. Only Firebase accounts with verified email
addresses can discover these listings, and the owner can update or remove their
profile. Email verification does not confirm school affiliation.
`features/tutors/data/firestore.js` writes `tutorBookings/{bookingId}` requests
with a student, tutor, subject, requested time, note, and participant IDs.
Firestore rules limit reads to the two participants and allow only the tutor
to accept or decline. Student and tutor inboxes use separate UID-constrained
queries so the rules can prove every returned record belongs to that user.
The navigator merges those live requests into the existing Sessions menu;
pending requests remain pending until accepted. Accepting a request uses a
transaction to reserve two adjacent UTC half-hour documents under
`tutorSlots/{tutorUid}/slots`; numeric bucket IDs are derived from the request
timestamp and validated by the rules. This covers the one-hour duration, so
requests starting 30 minutes apart cannot both be accepted. Booking status and
both locks are created atomically, and cancellation or completion releases both
locks in the same transaction. Rules reject forged bucket IDs and status
changes that omit the matching locks. Creating a request also atomically writes
the student's private, non-deletable `tutorBookingLimits/{uid}` permit; rules
allow one request every five seconds and reject a booking without its matching
permit. Shared session workspace notes remain in each participant's private
account state.

Device-only tutor profiles and bookings remain local. Private notes are not
delivered to another student. Push notifications, calls, and instructor-wide
moderation are not implemented.

## Android local accounts

`CampusStorageModule.kt` implements the Android-only `CampusStorage` native module registered by `MainApplication.kt`. It protects local account records, cached state, and Firebase Auth persistence values.

- Private SharedPreferences hold encrypted account, per-account JSON, and Firebase Auth persistence records.
- AES-GCM uses an Android Keystore key and a new IV per write.
- Local passwords use salted PBKDF2-HMAC-SHA256 with 600,000 iterations on
  Android 8 and newer. Android 7 uses PBKDF2-HMAC-SHA1 with 1,400,000
  iterations because SHA-256 PBKDF2 is unavailable on API 24-25. Existing
  unversioned SHA-1/210,000 hashes stay valid until a successful password login
  upgrades them. The stored algorithm and work factor are allowlisted, password
  comparisons use `MessageDigest.isEqual`, and passwords are capped at 1,024
  characters. Real passwords are not saved as plain text.
- A single background executor orders account and storage operations.
- Loading and saving requires an active account.
- Biometric setup requires a signed-in local account and a successful Android biometric prompt. Sign-in uses the enrolled device biometrics. Android 9 or newer is required.
- Android backup is disabled. Clearing app data or uninstalling removes local accounts and data.

An update from the older seeded build removes only the exact bundled account and its sample state; other device-only accounts and their saved state are preserved. The migration uses one SharedPreferences commit for the account list, state, and biometric pointer, and can recognize the legacy state left by a partially completed earlier migration. An earlier update over existing POCO data verified that the old account could no longer sign in. That check preceded the atomic-write hardening; the current transaction and identity guard have JVM tests, but have not been run on-device against seeded or partially migrated preferences. A separate user-created account was unavailable to test the preservation path. Device-only accounts are not school identity verification. Configured Firebase accounts provide email/password authentication, account recovery, private state sync, and shared study groups, but the app has no institutional sign-in or complete campus data service. The iOS scaffold cannot use this Android module.

## UI and builds

Shared controls provide the screen wrapper, header, tabs, buttons, inputs, chips, avatars, and icons. Inter fonts are bundled under Android assets. Figma circle images are bundled as PNGs, with source SVGs retained. The app's outline icons also have local SVG sources and PNG assets, without an icon-library dependency. The Inter license is in `shared/assets/Inter-OFL.txt`.

A normal full-screen View is retained. Safe-area insets pad status and navigation bar edges. Forms scroll, Android resizes for the keyboard, tablet content width is limited, and portrait orientation is retained.

Release builds bundle JavaScript, fonts, and images and run without Metro. Hermes is enabled. PC builds use the default ABI list. The separate Termux wrapper selects ARM64 and its existing aapt2/Hermes tooling.

## Tests

`App.test.jsx` verifies login validation/failure, selected-tutor booking, persisted messages, groups/posts/replies, profile edits, new-account separation, Android Back handling for study drafts, booked-session and group-session notes workspaces, session completion, save retries, and linked notifications.

Account lifecycle tests also verify rejection of another account's saved state, saving before sign-out, clearing route history on sign-out, and retaining the active account when its final save fails.

`state.test.js` checks overlap and adjacency, rescheduling, ratings, membership restrictions, fresh account state, combined search filters, saved-state compatibility, and derived session timing states.

`groupFirestore.test.js` checks changed-metadata reads, lazy post loading,
live reply updates, and listener cleanup for groups that are closed or no
longer joined.

`firebaseSignUp.test.js` exercises an auth-state callback that arrives before
Firebase's account-creation promise resolves and verifies that the new profile
still receives its submitted name and Student ID.

Version 1.2.0 tests also cover custom-interest addition/removal/deduplication and reopening, optional school fields, empty directories, legacy saved-state compatibility, selected booking slots, group schedule validation, and About navigation before sign-in.

Jest mocks Android storage. Native encryption, biometric prompts, installation, cold launch, and Android layout require device checks. See [VERIFICATION.md](VERIFICATION.md).
