# Campus4Change architecture

The app uses React Native CLI 0.87.1, React 19.2.3, TypeScript, and Hermes. It has no navigation library, external state framework, or backend.

## Entry and ownership

`index.js` registers `App.tsx`. The root mounts a safe-area provider and `AppNavigator`.

`src/navigation/AppNavigator.tsx` owns the current route, back history, and signed-in account state. `types.ts` defines routes and optional item IDs. Android Back uses the same history as screen Back. Main tabs reset the history.

Feature screens receive data and callbacks. They request navigation or submit changes through those callbacks. Features do not import other features' screens; the navigator connects them.

```text
src/
  navigation/       route types and integration
  features/
    onboarding/
    auth/
    home/
    tutors/
    groups/
    sessions/
    messages/
    notifications/
    profile/
  shared/
    assets/        local images and font license
    components/    common controls and screen layout
    data/          shared types and sample data
    state/         reducer and Android storage interface
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

## State and data flow

`shared/data/types.ts` defines profiles, tutors, sessions, groups, conversations, and notices. A session has an ID, tutor ID, subject, ISO start time, note, status, and optional rating. Sessions last one hour. Booking and session history use this same record.

`demo.ts` supplies sample tutors and initial state. Only the public demo account receives sample personal bookings and messages. Other accounts have separate state with unjoined sample groups.

`shared/state/reducer.ts` applies profile edits, bookings, session changes, memberships, posts, replies, messages, read notices, and study-note drafts. It rejects overlapping bookings, invalid ratings, and group posts/messages from non-members.

The navigator saves changed state through `storage.ts`. Save failures appear in the app with a retry action. Sign-out saves the latest state before clearing the active account. Reopening requires sign-in.

## Android local accounts

`CampusStorageModule.kt` implements the Android-only `CampusStorage` native module registered by `MainApplication.kt`.

- Private SharedPreferences hold encrypted account and per-account JSON records.
- AES-GCM uses an Android Keystore key and a new IV per write.
- Salted PBKDF2 hashes verify passwords. Real passwords are not saved as plain text.
- A single background executor orders account and storage operations.
- Loading and saving requires an active account.
- Biometric setup requires a signed-in non-demo account and a successful Android biometric prompt. Sign-in uses the enrolled device biometrics. Android 9 or newer is required.
- Android backup is disabled. Clearing app data or uninstalling removes local accounts and data.

This is local prototype authentication, not school identity verification. There is no shared campus database, online account recovery, or device sync. The iOS scaffold cannot use this Android module.

## UI and builds

Shared controls provide the screen wrapper, header, tabs, buttons, inputs, chips, and avatars. Inter fonts are bundled under Android assets. Figma circle images are bundled as PNGs, with source SVGs retained. The Inter license is in `shared/assets/Inter-OFL.txt`.

A normal full-screen View is retained. Safe-area insets pad status and navigation bar edges. Forms scroll, Android resizes for the keyboard, tablet content width is limited, and portrait orientation is retained.

Release builds bundle JavaScript, fonts, and images and run without Metro. Hermes is enabled. PC builds use the default ABI list. The separate Termux wrapper selects ARM64 and its existing aapt2/Hermes tooling.

## Tests

`App.test.tsx` verifies login validation/failure, selected-tutor booking, persisted messages, groups/posts/replies, profile edits, new-account separation, Android Back handling for study drafts, session completion, save retries, and linked notifications.

`state.test.ts` checks overlap and adjacency, rescheduling, ratings, membership restrictions, fresh account state, combined search filters, and saved-state compatibility.

Jest mocks Android storage. Native encryption, biometric prompts, installation, cold launch, and Android layout require device checks. See [VERIFICATION.md](VERIFICATION.md).
