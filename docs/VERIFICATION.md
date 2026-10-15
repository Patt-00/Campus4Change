# Verification for 1.2.0

## Follow-up verification — 2026-10-15

- GitHub Actions run [38700041674](https://github.com/Patt-00/Campus4Change/actions/runs/38700041674) passed every configured check for commit `dd06532`: lint, public Drive-link scan, 250 Jest tests, Android local unit tests, instrumentation-test compilation, Auth/Firestore emulator tests, production JS bundling, release Kotlin compilation, debug APK assembly, and the release-signing guard.
- A read-only Firebase Console recheck on 2026-10-15 confirmed project `campus4change`, Firestore at `asia-southeast1`, an empty database, deny-all rules, 0 Manual composite indexes, one Google-provider Auth user from the approved POCO sign-in, and App Check still at **Get started**. No Firestore rules, indexes, Auth settings, or App Check settings were changed during this review.
- The React Native Jest preset's `babel-jest` and `jest-environment-node` dependencies are overridden to Jest `30.5.2`, matching the project's direct runner. A clean `npm ci`, all 250 Jest tests in 33 suites, lint, and the public Drive-link check passed locally. The full npm audit decreased from 28 high/17 moderate to 20 high/20 moderate; `npm audit --omit=dev` remains at 20 high.
- The ARM64-only debug APK, built with the private per-user debug keystore, is 41,304,554 bytes. `apksigner` verified its SHA-1 matches the fingerprint registered for Firebase Google sign-in. Its SHA-256 is `6b74de52c20ec7933e86bf98df670422bda089b92b830b4bbb7a753922b848bd`.
- The APK was installed on the POCO X4 GT (`Z9GMOVDMHQV8X84D`) after confirming Xiaomi's on-device **Install this app via USB?** prompt. Its first cold launch showed the normal debug-build Metro screen; after `adb reverse tcp:8081 tcp:8081` and starting Metro, the app reached the branded start screen, completed all three introduction slides, and displayed Login. The app entered Home after the approved Google sign-in flow and displayed the signed-in profile. No release APK was tested; the debug APK requires Metro for its JavaScript bundle.
- On-device shared-feature requests then displayed **Missing or insufficient permissions** for study groups and **Firebase denied this change** for tutor/session data and sync. These are consistent with the live Firestore database still using deny-all rules. The local rules and four-index manifest pass CI emulator tests, but the Firebase CLI is unauthenticated and the current ruleset still needs approval for the owner-only private-message rules and fourth chat index before production deployment. No live Firestore rules, indexes, Auth settings, or data were changed.
- On the POCO X4 GT (model `22041216G`, Android 14/API 34), both `CampusPasswordHashDeviceTest` instrumentation cases passed via `adb -s Z9GMOVDMHQV8X84D shell am instrument -w -r com.campus4change.test/androidx.test.runner.AndroidJUnitRunner`. The current PBKDF2-HMAC-SHA256/600,000 vector and legacy HMAC-SHA1 migration check passed; one current-hash sample took 2,572 ms. The password operation uses the native storage worker. The temporary test APK was removed, the main app remained installed, and a cold launch restored the signed-in Home screen without clearing app data. This does not verify the minimum API 24 provider on a real API 24 device.
- The Android debug App Check provider could not exchange its debug token because it has not been allowlisted. Firebase Auth completed the approved Google sign-in flow, but shared Firestore access remains blocked by the live rules. App Check registration, token exchange, and enforcement remain unverified; no App Check terms or production settings were accepted.
- The approved Lab 4.1 Drive permission change is complete. The document's public link role changed from `writer` to `reader`; Google Docs displayed **Access updated**, and Drive metadata readback on 2026-10-15 confirms `anyone:reader` while the named owner remains unchanged. The historical link remains in public Git history; rewriting it is a separate action that still needs approval and collaborator resynchronization.
- The newly accessible **Assignment 6.1 — Final Project Requirements (Part 3)** document is for CS 200, Principles of Programming Languages. It specifies a lexer/parser/semantic-analysis/interpreter project and its written report format; it does not define Campus4Change mobile-app behavior. It therefore does not resolve the missing app-specific acceptance checklist recorded as C4C-03.
- Emulator fallback remains unavailable: the API 36 AVD exited with code 139 before boot, and the Pixel 8a AVD references a missing Android 37.1 system image. CI compiled Android instrumentation tests but could not execute them on a device. Current npm registry metadata shows React Native `0.87.1`, CLI `20.2.0`, and Jest `30.5.2` are latest; the published `braces`, `micromatch`, and `fast-glob` versions have no newer release that resolves their current findings, and npm's React Native downgrade suggestion is incompatible with the app's toolchain.

## Current source update — 2026-10-14

- A fresh read-only Firebase Console pass confirmed project `campus4change`,
  the `asia-southeast1` Firestore database, no Firestore documents, deny-all
  live rules, no Manual composite indexes, and App Check still at **Get started**.
  Email/Password and Google providers are enabled and the Auth user list is
  empty. Android app `com.campus4change` has one registered SHA-1 matching this
  workstation's private `~/.android/debug.keystore`; no SHA-256 row is present.
  The repository's public `android/app/debug.keystore` is not registered. No
  live Firebase setting was changed.
- The latest per-device QA artifact is the ARM64-only debug build at
  `android/app/build/outputs/apk/debug/app-debug.apk` (41,304,558 bytes;
  SHA-256 `582efe9ff0c2a17b97932d2c6c51da8d6dd121edff90d47d09b3397c98858f36`).
  It was built with `-PreactNativeArchitectures=arm64-v8a` and
  `C4C_DEBUG_STORE_FILE` set to the per-user Android debug keystore;
  `apksigner` confirmed its SHA-1 matches Firebase's registered row. The
  repository default remains signed by the repo-tracked key. The connected
  POCO currently has no installed `com.campus4change` package; the earlier
  universal private-key APK attempt returned `INSTALL_FAILED_USER_RESTRICTED`.
  The ARM64 artifact has not been installed or visually tested yet, and no app
  data was cleared. Xiaomi's USB-install prompt must be approved before retrying.
- Commit `9a5fbc0` records introduction completion in device preferences. Jest
  covers first-run, returning-install, and unavailable-preference behavior; the
  updated APK cold-launched on the POCO X4 GT directly to Login after the
  introduction had been completed. The screen design did not change.
- Local device-only account password hashes now carry an explicit PBKDF2
  algorithm and iteration count. New hashes use HMAC-SHA256/600,000 iterations
  on Android 8+ and the HMAC-SHA1/1,400,000 fallback on Android 7; old
  unversioned HMAC-SHA1/210,000 hashes are verified then upgraded after login.
  `CampusPasswordHashTest` covers reference vectors and accepted metadata;
  after the Firebase restore-race tests were added,
  `npm test -- --coverage --runInBand` passed 218 tests in 32 suites with
  82.78% statement and 73.37% branch coverage. Lint passed, and Gradle passed
  `:app:testDebugUnitTest`, `:app:assembleDebug`,
  `:app:assembleDebugAndroidTest`, `:app:createBundleReleaseJsAndAssets`, and
  `:app:compileReleaseKotlin` under JDK 25.
- New Firebase-session hook tests reproduce an old account's delayed native
  restore completing after a different Firebase UID becomes active. The new
  generation guard keeps the previous account out of the visible state, saves
  its latest local snapshot before switching the native storage owner, and
  prevents stale cloud callbacks from changing the newer session. Additional
  checks cover the cloud-save failure/sign-out path and retention of the active
  Firebase session when remote sign-out fails.
- Login-screen regressions also verify existing device-only account sign-in and
  biometrics remain available after Firebase configuration, while local account
  password recovery explains that the original password is required.
- Firebase tutor-booking requests now write a private per-student cooldown permit
  in the same atomic batch as the booking. Rules emulator tests pass for valid
  first requests, missing permits, immediate retries, forged resets, private
  limiter reads, denied deletion, and competing simultaneous batches. The
  focused tutor UI/data tests, full 211-test Jest suite, and lint pass.
- `connectedDebugAndroidTest` compiled but did not run: Xiaomi rejected the
  instrumentation APK installation with `INSTALL_FAILED_USER_RESTRICTED` after
  the “Install this app via USB?” prompt expired. A later check found the
  Campus4Change package absent from the POCO; Android uninstall removes its
  app-private local data. No `pm clear` was issued. The current debug APK could
  not be restored automatically because the same confirmation was rejected;
  the POCO needs an on-screen Install tap before another ADB install. No Firebase
  project setting, Firestore data, or live account was changed in this step. A
  headless API 36 emulator attempt also exited with code 139 before completing
  boot, so it did not run the instrumentation tests either.
- The AndroidX instrumentation source is compiled by a new CI build step, but
  the Android provider and timing checks remain pending until a device accepts
  the test APK.
- Login and Sign Up now label the address field **Email** and use the neutral
  `name@example.com` example, matching the accepted any-verified-email policy.
  Figma nodes `1:21`, `1:25`, `1:50`, and `1:54` were updated in frames 02 Login
  and 03 Sign Up and read back from the design file. On the POCO, the Metro-served
  app showed the updated labels and examples on both screens; no account was
  created or signed in.
- The latest App Check configuration fix was pushed as `760678f`. The JavaScript
  Firebase app receives the Web API key only; the native App Check bridge uses
  the Android API key from the project config, and tests validate the project
  identity before requesting a token. The Android App Check key was verified
  against the local Firebase Android config without printing it.
- On the POCO X4 GT, the current build showed the branded start screen, onboarding,
  Login, and Sign Up. Empty login and signup submissions showed validation
  messages. No credentials were entered and no account was created.
- Firebase Console read-only checks confirmed Email/Password and Google providers
  are enabled. The current private per-user debug key's SHA-1 is registered for
  Google sign-in; its SHA-256 is not registered for Play Integrity. The public
  repo-tracked debug key remains unregistered. Live Firestore rules remain
  deny-all and indexes are undeployed per the last database check. App Check
  registration and terms remain unaccepted, so valid token exchange and
  enforcement are unverified.
- Product policy clarified on 2026-10-14: any Firebase-verified email may use
  shared features; no `@tip.edu.ph` or `.edu` restriction is intended. The
  client and rules implement this policy, and the sign-up guidance now says so
  directly. A `gmail.com` regression account is accepted by the client and
  Firestore emulator rules; an unverified account remains denied.
- About, group creation, tutor search, and tutor profiles now describe access
  by verified email and avoid implying that the app verifies school or student
  identity. Existing Figma Tutor Search and Tutor Profile frames already use
  generic tutor labels; the coverage map records the email-verification rule.
- Figma Sign-up guidance node `1:67` now uses the same any-verified-email
  policy; the 390-by-844 frame was rendered and visually checked with the
  longer copy fully visible.
- Signup now keeps a newly created Firebase account if the optional sign-in
  display-name update fails. The submitted name and Student ID remain available
  to the app session, and the signup notice explains that the Firebase
  sign-in name was not saved. Two regression tests cover the recovered account
  and user-facing message.
- Concurrent Firebase sign-up attempts for one normalized email no longer
  overwrite the pending profile used by an early auth-state callback. A
  regression test delays account creation, submits a conflicting second
  attempt, and verifies that only the first profile reaches Firebase.
- Direct Sign Up screen tests cover invalid email and short-password rejection,
  submission of a valid `gmail.com` address, Firebase error recovery, and
  duplicate-tap suppression while account creation is pending. `SignUpScreen`
  now has 84.61% statement and 85.18% branch coverage; verification of the email
  remains a Firebase Auth step before shared features are available.
- Firebase auth-observer failure coverage verifies startup recovery with no
  reported user, preserves a pending native account setup, and completes the
  current account's pending cloud restore. The cloud-restore test caught a bug
  where an observer error invalidated the restore generation and permanently
  skipped later local autosaves. The fix keeps the last reported user's
  hydration active; `useCampusSession` now has 81.02% statement, 67.50% branch,
  and 75.40% function coverage.
- Private note messages now sync to separate owner-only documents under
  `users/{uid}/privateMessages`; the private account-state document keeps only
  conversation metadata. Existing messages embedded in a version-one state are
  merged and migrated on the next save. Idempotent per-message writes preserve
  concurrent additions from another device, while content updates and deletes
  are denied by the rules. Tests cover 401 maximum-length messages in two
  batches, legacy migration, duplicate IDs, unsafe conversation IDs,
  byte-accurate state-size rejection, cross-account and anonymous denial, and
  owner access before email verification.
- Focused Tutor Details and Booking Confirmed tests cover shared-request and
  device-only paths, owner self-booking affordances, private notes, request
  navigation, and invalid saved-date fallbacks. Both screens now reach 100%
  statement/function coverage; `TutorDetailsScreen` branch coverage is 93.75%.
- Session Details and Workspace tests also cover decline and cancellation
  confirmation, returned and thrown request failures, note saves, and overdue
  session completion behavior, including duplicate action suppression while a
  network operation is pending. Both screens now reach 100% statement/function
  coverage; branch coverage is 98.46% for Session Details and 95.12% for the
  Workspace.
- Jest is now `30.5.2`. The config excludes `scripts/`, whose standalone ESM
  emulator runners are invoked separately, and gives the cold first-run App
  test a 15-second timeout; the other tests retain Jest's default timeout.
  `npm test -- --coverage --runInBand` passes all 250 tests in 33 suites with
  84.45% statement and 75.17% branch coverage, and lint passes.
- With Firebase CLI `15.33.0`, both Firestore rules and Auth verification
  emulator suites passed against the updated lockfile. The latest release JS
  bundle and ARM64-only debug APK build also passed locally.
- The full dependency audit now reports 28 high and 17 moderate findings,
  down from 47 high and 5 moderate before Jest 30; `npm audit --omit=dev` still
  reports 20 high paths. The production bundle remains free of `braces`,
  `micromatch`, and `fast-glob`; the CLI/Metro dependency paths still need an
  upstream fix or a separately tested toolchain migration.
- `npm test -- --runInBand`: 207 tests passed in 31 suites; `npm run lint` and
  `git diff --check` passed. Gradle `:app:testDebugUnitTest`, `:app:assembleDebug`,
  and `:app:compileReleaseKotlin` passed using JDK 25. Release Kotlin compilation
  and production JS bundling do not create a signed release APK.
- Android biometric preflight now explicitly requests the same weak-biometric
  policy previously implied by the deprecated API on Android 11+, and uses the
  legacy equivalent on Android 10. `MainActivity` now uses the current React
  Native delegate constructor; debug and release Kotlin compilation passed.
- GitHub Actions run
  [38499652101](https://github.com/Patt-00/Campus4Change/actions/runs/38499652101)
  passed on `c74890d`. CI now builds the production Android bundle, compiles
  release Kotlin sources, builds the debug APK, and verifies that release
  packaging still fails closed without a dedicated keystore.
- A fresh full `npm audit` reports 47 high, 5 moderate, and 0 critical findings;
  `npm audit --omit=dev` reports 20 high dependency paths through the React
  Native toolchain. The only production-only advisory is `braces@3.0.3`, for
  which npm offers no compatible patch; its suggested fix downgrades React
  Native. No dependency override was applied.
- Legacy-account migration now checks the saved `state_demo` profile separately
  from the account row and removes the state only on the exact legacy profile
  ID/email. This prevents removing a different user's cached Firebase state if
  its UID happens to be `demo`. It also removes the exact orphaned legacy
  biometric pointer if a prior partial migration left it behind. Seven tests
  cover the account, state, and pointer cleanup decisions. `:app:testDebugUnitTest` and
  `:app:assembleDebug` passed; the updated APK installed over the POCO app
  without clearing its data, cold-launched, and showed the login screen without
  a demo account or startup errors. The cache-collision case was not seeded on-device.
  GitHub Actions run
  [38480817534](https://github.com/Patt-00/Campus4Change/actions/runs/38480817534)
  passed the full configured workflow, including the migration tests and debug build.
- On the POCO X4 GT, Sign Up showed Google and email/password options. Submitting
  the empty form showed the expected validation message, and returning to Login
  left the app signed out; no account was created during this check.
- On the App Check-enabled build, selecting the previously approved Google
  account again returned `GetCredentialCancellationException` before Firebase
  received an ID token. The app returned to Login. No password, verification
  code, or biometric was entered, and no account was created. The next retry
  needs the account holder present if Google requests additional authorization.
- At the time of that earlier Google sign-in check, comparing the installed
  repo-key debug APK with Firebase Project settings found that the APK SHA-1
  did not match the registered SHA-1, and its SHA-256 was not registered. The
  current private-key build is documented in [FIREBASE_SETUP.md](FIREBASE_SETUP.md).
  No Firebase setting was saved during that earlier
  check; the then-current debug signer fingerprints remained unregistered.
- An earlier debug APK was installed over the existing POCO
  installation without clearing its data and cold-launched. The branded start
  screen showed the logo, onboarding advanced to Login, and an empty sign-in
  showed the expected validation message. The live screen had no demo account
  or prefilled credentials; no account was created or signed into.
- Firebase tutor-session chat is now available from the Booked Session Workspace
  for both participants. The screen copy distinguishes private notes from chat,
  and the Figma file has an editable workspace frame linked from Session Details
  with the existing 220 ms directional transition.
- Device-only session contact actions now say **Open private notes** and explain
  that those messages remain on the device instead of reaching the tutor. Focused
  Session Details and Workspace tests cover local and shared labels.
- A future session no longer exposes Mark Session Complete. Completion is allowed
  only at or after the scheduled start in the UI and client data path, and
  Firestore rules independently enforce `request.time >= startsAt`. Tests cover
  before/after boundary behavior, and the rules emulator denies early completion
  while allowing a started-session completion. A shared clock hook refreshes
  Home, Sessions, Session Details, and Session Workspace at scheduled start/end
  boundaries, so these states update even when the screens remain open.
- `npm test -- --runInBand`: 203 tests passed in 30 suites. `npm run lint`, the
  isolated Firestore rules emulator suite, `:app:createBundleReleaseJsAndAssets`,
  `:app:testDebugUnitTest`, and `:app:assembleDebug` passed. The updated source was
  not exercised in the session workspace on the POCO because no user account was
  signed in; shared-account behavior is verified by the UI, unit, and emulator tests.
- A fresh `npm audit --omit=dev` still reports 20 high dependency paths rooted
  in `braces@3.0.3`; the upstream depth-guard PR is closed without merging and
  changes existing output behavior. No dependency override was applied.
- The campus identity policy, which was unresolved during an earlier audit, was
  clarified on 2026-10-14: any email-verified account may use shared Firebase
  features. No `@tip.edu.ph` or `.edu` domain allowlist is intended; the client
  and Firestore rules already enforce the chosen verified-email policy.
- On 2026-10-14, the authenticated Firebase Console session verified project
  `campus4change` and its default `asia-southeast1` database. The Data tab is
  empty, live rules are deny-all, and Manual indexes are empty. The current
  checked-in index manifest has four composite indexes, one more than the prior
  deployment prompt described; no live rules/indexes were changed.
- `npm run check:public-drive-links` passes on the current tracked tree. CI now
  rejects Google Drive document links before they can be added again. The old
  URLs remain in historical public commit `51f0100`; history was not rewritten.
- The same live Console session showed App Check at **Get started**. The Android
  client now initializes a native-backed Firebase App Check `CustomProvider`
  before Firebase Auth and Firestore. It uses a separate Android API key and
  checks the app ID's project number against `messagingSenderId`; Web Firebase
  services receive only the Web configuration. Debug builds use Firebase's
  debug provider; release builds use Play Integrity. The live Android app still
  needs App Check registration, a SHA-256 fingerprint, and a registered debug
  token; no enforcement was enabled.
- `npm test -- --runInBand`: 207 tests passed in 31 suites, and `npm run lint`
  passed. Gradle compiled debug and release Kotlin sources, passed
  `:app:testDebugUnitTest`, and assembled the debug APK using JDK 25. The APK
  installed over the POCO X4 GT app without clearing data. Cold launch reached
  Login; empty sign-in showed validation, with no demo credentials or account
  creation. A redacted App Check log scan found no warning/error-tagged lines;
  it did not verify valid token exchange.
- `.firebaserc` now sets `campus4change` as the default Firebase CLI target, and
  its JSON parses correctly. `firebase use` still cannot run because the CLI is
  unauthenticated; the Console session is available for the later approved
  deployment. No live Firebase configuration was changed in this step.
- Tutor-hook action errors are tied to the active Firebase UID and are cleared
  when the signed-in account changes. Five new hook tests cover subscriptions,
  loading, retry, stale callbacks, account switching, signed-out behavior, and
  tutor action routing.
- Route changes use a 220 ms ease-out opacity and horizontal transition driven
  by React Native's native animation driver. Forward navigation enters from the
  right, Back enters from the left, and tab navigation uses a smaller dissolve.
- The Figma prototype now has 69 navigation action nodes with 220 ms ease-out
  transitions: 42 directional move-ins and 27 tab dissolves. The 63 original
  actions were preserved, and the Booked Session Workspace flow adds six actions
  across four visible links/buttons. Plugin API readback verified destinations
  from Session Details to the workspace, back to Session Details, and participant
  links to the shared Chat frame.
- The Home quick actions, Study Groups cards, Profile actions, and Sessions row
  affordance were simplified in code and in Figma while retaining the current
  dark palette, rounded cards, and cyan accents. The login has no demo sign-in,
  and new account state has no seeded tutors, groups, sessions, conversations,
  or notices. Android startup removes only the exact old bundled account and
  commits its state and biometric-pointer cleanup atomically. It also recognizes
  the exact legacy profile state if an older partial migration removed the
  account record but left its state behind.
- Android screens now use the safe-area provider's top inset without adding
  `StatusBar.currentHeight` again. The POCO content root already begins below the
  status bar; removing the duplicate inset moved Login content upward by 100
  native pixels and closer to the Figma spacing. A regression test verifies
  the wrapper uses the provider inset.
- Android Google ID-token parsing catches the parser exception that the Kotlin
  Credential Manager library can throw through its Java API. The debug build
  logs only exception classes and Firebase error codes; `auth/invalid-credential`
  now returns a specific, safe message.
- Device-state saves now continue independently of Firestore server
  acknowledgements. Pending cloud snapshots are coalesced per Firebase UID, and
  sign-out reports a local-only save after a bounded 1.2-second cloud wait.
  Regression coverage simulates a never-resolving cloud write during account
  hydration, later local edits, sign-out, and a subsequent account switch. The
  app displays a pending-sync status while the server acknowledgement is open,
  and an older cloud acknowledgement cannot clear a newer local-save error.
  Figma now has a token-bound pending-sync component and a Home instance of the
  same state; its editable text, Inter font, color bindings, and spacing binding
  were read back and visually checked.
- Email-verified Firebase accounts now share live group chat with current group
  members and tutor-session chat with the booking's two participants. The
  active chat reads a bounded latest-50 window and loads older pages on demand;
  group messages can be reported to the owner and hidden or restored. Device-only
  conversations stay private notes. The Figma Messages, Chat, Group Details, and
  Session Details screens were updated to reflect those delivery boundaries.
  Chat state is keyed to the active user and conversation so switching threads
  cannot flash the previous thread under the new title.
- `npm test -- --runInBand --coverage --testTimeout=15000`: 192 tests passed
  in 29 suites; statement coverage 82.11% and branch coverage 72.50%.
  `npm run lint` passed without warnings. `:app:createBundleReleaseJsAndAssets`,
  `:app:testDebugUnitTest`, and `:app:assembleDebug` passed under JDK 25.
  The production JavaScript bundle is 2,652,536 bytes with SHA-256
  `2637da87931149987eaccb477f3b2475bd4e3c2bd8bd25c35bf3961ce1822f06`.
- Local Auth and Firestore emulator tests passed. The rules suite covers current
  group-member chat access, owner hide/restore, participant-only tutor-session
  chat, message-size and page limits, and send cooldowns. The Auth emulator
  confirmed private state remains owner-only until the verified-email claim is
  refreshed. The Firestore emulator also confirmed a queued offline write is
  visible locally before acknowledgement and resolves when network access is
  restored. These emulator checks do not verify the live Firebase project.
- GitHub Actions run
  [38466492974](https://github.com/Patt-00/Campus4Change/actions/runs/38466492974)
  passed on `0894e6c`, including the configured lint, Jest, Auth/Firestore
  emulator, production bundling, Android unit-test, debug-build, and
  release-signing checks.
- GitHub Actions run
  [38469591778](https://github.com/Patt-00/Campus4Change/actions/runs/38469591778)
  passed on `4669150` after the Google credential error-handling changes.
- GitHub Actions run
  [38475024257](https://github.com/Patt-00/Campus4Change/actions/runs/38475024257)
  passed on `9229f55` after the offline-safe local/cloud persistence refactor.
- GitHub Actions run
  [38475765952](https://github.com/Patt-00/Campus4Change/actions/runs/38475765952)
  passed on `c3dcdb6`, including the offline Firestore local-visibility and
  reconnect-acknowledgement regression.
- `:app:testDebugUnitTest` passed 2 native tests. They verify the account
  migration requires the exact legacy account identity and that fallback
  cleanup only recognizes its matching profile ID/email. Gradle tests and the
  debug build passed under JDK 25, matching CI. The workstation's default JDK 27
  failed while parsing the Gradle build script (`Unsupported class file major
  version 71`); no repository-wide Java setting was changed. The JDK 25 build
  was then installed over the existing POCO app data and cold-launched to the
  logo without React Native or Android error logs.
- On the POCO X4 GT (model `22041216G`, Android 14), the debug APK installed
  over the existing app without clearing app data. The current APK was
  reinstalled and launched; the logo appeared, and after skipping the
  introduction the Login screen exposed school-email/password and Google sign-in
  with no demo button or prefilled demo credentials. The existing device history
  also showed the former seeded device-account sign-in returning the normal
  invalid-credentials error. This verifies removal of that seeded account on
  the test device. The device had no other known local account, so preservation
  of a separate local account is verified by the exact-identity migration
  logic, not a second device account.
  Filtered launch logs showed the React Native app starting without a fatal
  Android exception or JavaScript error.
  One later Google sign-in attempt selected the previously approved test
  account and returned to the auth screen before producing an ID token. The
  new safe diagnostic recorded `GetCredentialCancellationException`; Firebase
  token exchange did not run. No password, verification code, or biometric was
  entered, so successful Google-to-Firebase sign-in remains unverified.
  This seed-removal check preceded the atomic-write hardening. The current
  atomic migration was cold-launched after the old state had already been
  removed; its two JVM tests cover identity matching but not SharedPreferences
  transaction behavior with seeded data on a device.
  The stale Metro cache was restarted from this checkout; the current bundle
  loaded and filtered Android/React Native error logs were empty.
- GitHub Actions run
  [38454306951](https://github.com/Patt-00/Campus4Change/actions/runs/38454306951)
  passed on `674b22e`, including lint, unit tests, Auth/Firestore emulators,
  production bundling, debug build, and the release-signing guard. The checked-in
  Firebase rules and indexes remain undeployed.
- Follow-up commit `af7ea01` made legacy account cleanup atomic and added two
  native migration identity tests. GitHub Actions run
  [38456821435](https://github.com/Patt-00/Campus4Change/actions/runs/38456821435)
  passed, including the new `:app:testDebugUnitTest` step.

## Earlier source work — 2026-10-13

This local checkpoint is on branch `codex/firebase-auth-firestore`. It includes
the Novice, Intermediate, and Expert introduction, Firebase email/password and
Android Google sign-in, encrypted Android Auth persistence and account cache,
private per-user state sync, shared study groups, public opt-in tutor profiles,
and participant-only tutor session requests with atomic slot reservations.
The Firebase Google provider is enabled for project `campus4change`; the debug
signing SHA-1 and support email are configured. The Standard Firestore database
is in `asia-southeast1`, but its production rules have not been deployed.
Application and test source contains no TypeScript files.

Verified for this checkpoint:

- `npm run lint`: passed without warnings with coverage output already present;
  `.eslintignore` excludes generated coverage assets from source linting.
- `npm ci --dry-run --ignore-scripts --no-audit --no-fund` passed under Node
  24.18.0. The root engine range now matches React Native 0.87.1's package
  metadata, and the lockfile records the same range.
- `npm test -- --runInBand`: 160 tests passed in 25 suites. Coverage includes
  Google auth screens, cancellation feedback, and token exchange, tutor profile
  publishing and removal, request status transitions, and slot locks, as well as
  stale group callbacks and pending
  shared writes across account changes, queued state persistence after a switch
  even when both accounts share the same `updatedAt`, unknown and past-due
  session statuses, malformed or missing session start times across Home,
  Sessions, and Session Details, partial-profile recovery, contextual
  accessibility labels for booking dates, sessions, groups, tutors, messages,
  notifications, and group posts, the Home overdue warning, theme color
  contrast, owner-only report review, report queue paging/cleanup, and
  hide/restore controls. Profile fallback is exercised for local and mocked
  Firebase cloud restore; saved null/primitive collection entries are also
  checked.
- The groups screen uses a virtualized `SectionList`; its regression test feeds
  80 loaded groups and confirms that the initial render mounts no more than 10
  group cards. Search tests cover case-insensitive subject filtering, joined
  group empty copy, and the prompt to search older pages. Other focused tests
  exercise home routes, tutor listing and search, booking validation, session
  reschedule gating, group-session date states and location fallbacks, private
  draft handling versus explicit note sharing, and shared-group retry paths.
- On the POCO X4 GT (model `22041216G`, Android 14), the current debug APK was
  installed and opened through Metro over USB. Login visibly includes
  **Continue with Google**; Sign Up visibly includes **Sign up with Google**,
  the private Student ID guidance, and verification requirements. Google
  Credential Manager displayed the approved test account, which was selected;
  Google then requested a fresh “Verify it’s you” step before returning the ID
  token. After the owner reported completing the prompt, the app returned to
  Sign Up and Firebase Authentication still showed no user, so the token
  exchange remains unverified. Cancelling the account chooser now shows a
  clear retry message instead of silently returning to the form. An earlier POCO check verified
  the scheduled Group Session screen without a focus timer.
- The Figma Login and Sign-up frames now include editable Google auth button
  instances, matching guidance, and a reusable color-token-bound component on
  the Campus4Change Components page. Updated screen and component screenshots
  were visually reviewed.
- The Firebase Auth and Firestore rules tests passed together against the local
  Firebase Emulator Suite.
  It checks private account state, authenticated group discovery, member-only
  posts/replies, bounded cursor queries, per-member contribution cooldowns,
  owner-only membership records, safe member counts, and verified-email
  requirements. It also verifies that members cannot report their own content,
  reports omit reporter UIDs, only the group owner can read/resolve reports,
  hidden posts/replies cannot be read by members, and owner hide/restore actions
  update content and report state together. Group directory queries are limited
  to 20 documents; unbounded
  and over-limit queries fail. Unverified accounts can still access only their
  own private state; shared group discovery and writes are denied. Tutor listing
  privacy, participant-only requests, forged-bucket/path and misaligned-time
  rejection, overlapping-slot rejection, and atomic release of both
  reservations also pass. The real
  last live Console check found initial production-mode rules that deny all
  client access. Firebase CLI is unauthenticated in this session, so that live
  state was not rechecked; the checked-in rules have not been deployed.
- On 2026-10-13, the rules test refused to start without
  `C4C_ALLOW_FIRESTORE_EMULATOR_RESET=1`. With the explicit opt-in, it passed
  against an isolated emulator on port 8181; the app's existing emulator on
  port 8080 was left untouched.
- A deterministic directory test used two group documents and one membership.
  The directory subscribes to the signed-in user's exact
  `studyGroupMemberships` subcollection and updates join state without
  per-group `getDoc` calls. Emulator checks allow this owner-scoped query,
  reject another user's path, reject collection-group membership reads, and
  confirm a private `members` document at an unrelated path cannot be read.
  A pre-fix emulator probe showed that the old recursive `members` rule
  returned that unrelated document in the group-membership query.
- Group directory pages return at most 20 documents and keep all groups
  discoverable through a load-older action. The test pages through 42 groups,
  checks both cursor positions, verifies membership remains live, and confirms
  the metadata snapshot pauses with a refresh action after paging.
- `npm run test:firebase-auth` passed against the Auth and Firestore emulators.
  It creates a disposable `example.test` user, obtains and applies the local
  verification code, refreshes the ID token, verifies the `email_verified`
  claim, and checks Firestore access before and after verification.
- `./gradlew :app:createBundleReleaseJsAndAssets --max-workers=4 --console=plain`
  passed for the current source. The bundle is 2,598,496 bytes with SHA-256
  `e2efdf4f3cf59986945228a319975960b823248eb4400266468e8de7151f3359`; it
  contains no `BEGIN PRIVATE KEY`, `braces`, or `micromatch` markers.
- `./gradlew assembleDebug` passed for the current source. No physical ADB
  device was active. I attempted the `Codex_API_36` emulator with software
  rendering, including under Xvfb; its QEMU process exited with code 139 before
  `sys.boot_completed`, so this moderation UI has no current device screenshot
  or runtime verification.
- Before the latest membership-path change, the Redmi Turbo 4
  (`24129RT7CC`, product `rodin`, Android 16) loaded the Firebase-emulator-backed
  group directory and an existing QA group's details. No group or post was
  created. The QA account was signed out; app config was restored to project
  `campus4change` with emulator routing disabled. A subsequent cold launch
  rendered the splash screen through loopback Metro and ADB reverse. These
  earlier checks do not verify the new membership path or production Firebase.
- `npm test -- --runInBand --coverage` on 2026-10-13 passed all 141 tests in 23 suites.
- A partial version-one profile missing its name, interests, tutor subjects,
  and school fields restored from the account defaults, opened Home, and
  persisted the restored values without losing session/group data.
- A partial personal account restored blank personal defaults; it received no
  demo interests, groups, or conversations.
- Saved sessions, groups, conversations, and notifications with null entries
  restore without a crash; valid rows remain intact.
- A Firebase session loaded partial cloud state through the mocked cloud
  adapter, applied profile defaults, and wrote the normalized profile to the
  encrypted local cache. Production Firestore was not used for this test.
- An app-level regression removed a saved conversation's message array, opened
  it through Messages and Chat, then sent a new message. The thread rendered,
  recovered the array, and persisted the new message.
- After the saved-profile, conversation-recovery, and malformed-session
  changes, that checkpoint's bundle was cold-launched on the Redmi Turbo 4
  through loopback Metro and ADB reverse. The splash rendered and filtered logs
  contained no React Native JS errors. This confirms startup for that
  checkpoint; malformed data behavior is covered by the focused tests.
- The Android accessibility tree announced full booking dates and included
  session, group, tutor, message, notification, and group-post context in the
  list controls. This was checked while signed into the legacy seeded local
  account; no booking was submitted, and the app was signed out afterward.
- The updated Sessions screen was served through loopback Metro to the Redmi
  Turbo 4 and showed an explicit "No upcoming sessions" message above its
  past-due and completed sections. The app was signed out afterward; the
  existing seeded state was preserved. Filtered logs showed no fatal Android or
  React Native JavaScript error during this run.
- A large-list component test measured the Chat and Messages render window.
  With 1,200 synthetic messages and 120 conversations, the prior scroll views
  mounted every item; the virtualized screens mounted 18 messages and 12 cards.
  The same tests confirm the newest message is at the bottom, full-message
  search still finds older text, and keyboard send still trims the draft. This
  is a component-render count, not a device latency benchmark; no screen-level
  check was possible in this turn because the Redmi was locked and the AVDs
  could not start in the headless environment.
- Chat copy tests verify that device-only conversations are described as
  device-saved and Firebase conversations as syncing to the user's private
  account, while both clearly state that messages are not delivered. The empty
  inbox no longer implies all conversations stay only on-device.
- The current membership-path and Firestore-rule change was tested against an
  isolated Firestore Emulator, not on the phone. The Redmi was connected but at
  its lock screen during this check; no unlock or bypass was attempted.
- A fresh disposable Auth-emulator probe remained unverified after signup and
  after requesting verification, became verified only after applying its
  generated code, and was then deleted. The earlier QA account's verified
  state was pre-existing emulator state, not an automatic effect of signup.
- Session tests confirm verification controls update group access and a failed
  Firebase cloud save no longer blocks sign-out after the encrypted local copy
  succeeds. If the local save itself fails, the account remains open.
- Password reset returns the same neutral confirmation for unknown, disabled,
  or invalid-credential account states; network errors remain actionable.
  Firebase service and LoginScreen tests cover the success and failure paths.
- A production-mode Android JavaScript bundle passed for commit `13c99f4`.
  SHA-256: `710f02c7852fc662a0e62137fe67c8f2e656de7ca4f63fe26f2a51a70b4a3266`;
  size: 2,099,258 bytes. The bundle contains no service-account private-key
  marker or `braces`/`micromatch` strings.
- `./gradlew :app:createBundleReleaseJsAndAssets --max-workers=4 --console=plain`
  passed locally for the current source. The latest [GitHub Actions run
  38341603367](https://github.com/Patt-00/Campus4Change/actions/runs/38341603367)
  passed on commit `5497371`: lint, all 131 unit tests, Auth/Firestore emulator
  tests, production bundling, Android debug build, and release-signing guard.
  The Redmi Turbo 4 reported model `24129RT7CC`, product `rodin`, and Android 16.
  `adb install -r` updated the existing debug app without clearing its data.
  With Metro port 8081 reversed to the device, I checked startup, the Expert
  introduction slide, local demo sign-in, Profile, sign-out, and sign-in again;
  Home returned with the saved demo state. The Sessions tab and Session Details
  had no focus timer; the group study room showed its separate 25-minute timer,
  counted down to 24:57, and reset to 25:00. Profile showed three demo sessions;
  all three now appear in Sessions, including two past-due bookings. Home shows
  a visible overdue warning with a direct review action. The captured
  app-process log had no fatal exception or React Native JS error; it did show
  a nonfatal `ReactHostImpl.onWindowFocusChange` soft exception before the
  React context was ready. The app continued normally. No personal account or
  production Firebase workflow was used.
- After release-signing hardening, `assembleDebug` still passes and
  `./gradlew --no-daemon --dry-run assembleRelease` fails early without the
  dedicated signing variables. The existing historical release APK hash
  remained `d28127da1e1d843be3835e776b756c857b6145d292130739ef4cad2e452367de`;
  no release key was created or used.
- Removed unused `@react-native/new-app-screen` from the application
  dependencies after confirming it is not imported; lint, all 65 unit tests,
  and Firestore rules tests still pass. `npm audit` now reports 47 high and
  5 moderate findings (0 critical); `npm audit --omit=dev` reports 20 high
  paths, all through the unpatched `braces` advisory in Metro/React Native
  tooling. The five moderate paths are test tooling through `sprintf-js`.
- In a prior local Auth/Firestore emulator check on the Xiaomi Pad 7,
  email/password sign-up succeeded, the per-user state document
  was written under the authenticated UID, and a Firestore-side profile change
  appeared after a cold restart. Android Keystore-backed auth persistence was
  present after restart and removed after sign-out. Test data used
  `campus4change.qa@example.com` in the emulator only; the password manager
  prompt was dismissed without saving that test password.
- A native release build passed on 2026-10-11, before the current 2026-10-12
  JavaScript changes. It used JDK 25, package `com.campus4change`, version code
  3/version 1.2.0, and the existing debug certificate. Its 54 MB APK SHA-256
  was `d28127da1e1d843be3835e776b756c857b6145d292130739ef4cad2e452367de`.
- The Xiaomi Pad 7 (`273b5a4a`, model `2410CRP4CG`) verified the booked-session
  workspace without a focus timer and the separate group room with its 25-minute
  timer using a Metro-loaded debug app. The later shared-feed pagination and
  persistence changes have automated and bundle checks, but have not been
  reloaded on the tablet. Paging pauses the live window until a refresh. No live
  Firebase two-account test was run.
- A prior production-mode Android JavaScript bundle passed with blank Firebase
  project settings. Its SHA-256 was
  `ba9c6b9bf695ec7499a08dcb9599732b1ea2017acb63e087c169637814348a9d`.
- GitHub Actions cache timing sample: uncached run 38303817719 took 6m03s total,
  with `assembleDebug` taking 3m53s. The first cache-enabled run, 38304580091,
  took 5m32s while populating Gradle caches. Warm run 38305216881 restored the
  wrapper and 1.25 GB Gradle dependency cache and took 4m20s. The next warm run,
  38306080539, took 3m06s total, with `assembleDebug` taking 1m11s. Another warm
  run, 38306902190, completed in 3m38s; its `assembleDebug` step took 1m31s.
  Run 38309287744 completed in 3m20s, run 38313170989 in 3m54s, run
  38319205350 in 4m18s, and run 38319799312 in 4m05s. These are observed runs
  rather than a controlled benchmark; hosted-runner variation may affect the
  reduction.

Firebase values are populated in `src/shared/backend/firebaseConfig.js`. At the
last live Console check, production Firestore rules denied all client access;
the current session has no authenticated Firebase CLI or gcloud credentials,
so live rules were not rechecked. The checked-in rules have not been deployed.
No production-project Firebase signup, password reset, cross-device sync, or
shared student workflow has been tested. This APK was not uploaded as a GitHub
release. It remains debug-signed and labeled 1.2.0.

Shared group metadata, membership, posts, replies, and member chat use the
`studyGroups` Firestore collection for verified Firebase users. Each member's
private `users/{uid}/studyGroupMemberships/{groupId}` record drives join state
and member authorization. Verified Firebase accounts can publish tutor
profiles and exchange participant-only session requests. Tutor acceptance
reserves two half-hour buckets in one transaction; participant
cancellation/completion releases both locks atomically. Tutor-session chat is
limited to each booking's two participants, and shared workspace notes stay
private to each account. Device-only groups, tutor listings, schedules, and
conversations remain local. At the earlier 2026-10-13 checkpoint, direct
messages and group chats saved only private notes; shared Firebase chat was
added in the current source update above. The current
dependency audit reports 47 high and 5 moderate findings (0 critical);
`npm audit --omit=dev` reports 20 high paths rooted in the `braces@3.0.3`
advisory. The production-mode JavaScript bundle
contains no `braces` or `micromatch` strings; `npm ls` places the affected
package in the React Native/Metro/CLI/Jest toolchain. GitHub lists no patched
release, while the package maintainer has disputed that the package needs a
fix. Do not force a React Native downgrade or apply an unofficial override to
silence the audit.

The published v1.2.0 APK was verified on Windows on 2026-10-01. The current source was converted to JavaScript/JSX and rebuilt in Termux on 2026-10-02. Neither result establishes phone installation or screen behavior.

## JavaScript source conversion and Termux build

On 2026-10-02, app and test source was converted from TypeScript/TSX to JavaScript/JSX. The TypeScript-only files, config, and direct development dependencies were removed. The Android Kotlin storage and biometric module remains unchanged. The saved JSON version and app package/version remain unchanged.

- `npm run lint`: passed.
- `npm test -- --runInBand --testTimeout=15000`: 25 tests passed in 2 suites. The longer timeout accommodates a slow first render on this Termux device; a baseline run before conversion hit the default 5-second timeout once.
- `./scripts/gradlew-termux.sh assembleRelease --offline --console=plain --quiet`: passed; Metro bundled the JavaScript and Hermes bytecode.
- The local ARM64 APK contains `assets/index.android.bundle`, and `apksigner verify` passed.
- Local APK: `android/app/build/outputs/apk/release/app-release.apk`, SHA-256 `de35e1b3f1527be1e4617f8bf7b65b7de8806c51d0cc79c2b6dab09d51b123a1`.

This local APK has not replaced the published release and was not installed or launched as part of this conversion. The historical checks and artifact identity below describe the older published TypeScript-source build.

## Source refactor after the release

The later source cleanup was checked on 2026-10-01. Each screen now has its own file, account loading and saving live in `useCampusSession`, and tutor filtering lives with tutor data. Screen behavior, saved JSON version 1, dependencies, and PC/Termux build configuration are unchanged.

TypeScript, ESLint, all 25 Jest tests, production Android JavaScript bundling with Metro, and `git diff --check` passed. The three added tests passed before and after the refactor and cover account-data mismatch, saving before sign-out, and keeping the account open when its final save fails. The moved screen functions and their style values were compared with the original source. Feature dependency boundaries were also checked.

No native APK was rebuilt or installed for this structural refactor. The published v1.2.0 APK remains the build from commit `61b3ac547e26dc0ceb91e78a56d57f53400cbb54`; the release checks and artifact identity below apply to that APK.

## Debug build after correcting Windows SDK setup

On 2026-10-01, a terminal build failed because neither `android/local.properties` nor `ANDROID_HOME` provided an SDK location. The installed Android Studio SDK was at `C:/Users/urbin/AppData/Local/Android/Sdk`. Creating the ignored local properties file with that `sdk.dir` resolved the error. The setup command now shown in [BUILDING.md](BUILDING.md#sdk-path-for-windows-powershell) was executed and checked on this PC.

Gradle installed the missing NDK 27.1.12297006, Build Tools 37.0.0, and CMake 3.22.1 using the SDK's previously accepted licenses. SDK Platform `android-37.0` was already installed. The terminal used Oracle JDK 26 and Gradle 9.4.1; the guide still recommends JDK 17 for setup.

`gradlew.bat -p android assembleDebug --max-workers=4` passed in 3 minutes 35 seconds for app source commit `1a11d64353f9c262a0f9bc24efa061051738ce53`. No application code or tracked native build configuration changed during this setup fix.

- Output: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Package/version: `com.campus4change`, 1.2.0, version code 3.
- ABIs: ARM64, ARMv7, x86, and x86_64.
- Signature verification passed and the certificate matched the existing releases.
- Size: 123,409,920 bytes.
- SHA-256: `9041a1504d064c49208f28d9efda14e873f805d19944d91e6c7b12711510f258`.

This is a debug APK and requires Metro for JavaScript. It was not installed, launched, or tested on a phone. The published v1.2.0 release APK was not replaced.

## Release build results

| Check | Result |
| --- | --- |
| TypeScript: `npx tsc --noEmit` | Passed |
| ESLint: `npm run lint` | Passed without warnings |
| Jest: `npm test -- --runInBand` | 22 tests passed in 2 suites |
| Native release: `gradlew.bat -p android assembleRelease --max-workers=4` | Passed |
| Release Metro/Hermes bundling | Passed as part of the native build |
| APK signature | Verified, APK Signature Scheme v2 |
| APK package/version | `com.campus4change`, 1.2.0, version code 3 |
| Minimum/target Android SDK | 24 / 36 |
| APK ABIs | ARM64, ARMv7, x86, x86_64 |
| Local icons, fonts, and Hermes libraries | Present |
| Previous signing certificate | Matches the 1.1.0 and v1.0.0 certificate |
| Browser layout preview | Home, custom interests, tutor cards, and profile inspected at widths 320, 390, and 520 |
| Termux rebuild | Not performed; scripts retained |
| APK installation, cold launch, and phone interactions | Not performed for 1.2.0 |
| Native encryption, biometrics, and persistence after restart | Not tested for 1.2.0 |
| Pixel comparison with Figma | Not verified on a device |

The temporary browser preview rendered the actual screen components with React Native Web and sample state. It checked icons, spacing, blank profile fields, and long custom-interest wrapping. It used neither Android storage nor a phone keyboard. It is not proof of Android runtime behavior. The temporary preview tools and outputs were removed during local directory cleanup; app dependencies are unchanged.

The APK contains Hermes bytecode, bundled Inter fonts, and `libhermestooling.so` and `libhermesvm.so` for each ABI. Jest mocks the native storage interface; its results cover the tested React flows and state rules.

## Artifact identity

Release filename: `Campus4Change-v1.2.0.apk`

Size: 54,766,016 bytes.

SHA-256:

```text
2ec980ac1bb31a1b5b269721e62f631c23d11336574aeefd16be4cfa72a755ba
```

Signing certificate SHA-256:

```text
fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c
```

The release attaches `SHA256SUMS` and `SOURCE-BUILD.json` with its exact source commit, version, artifact hash, toolchain, and checks. Machine-specific tools and build outputs remain ignored.

## Update compatibility

Saved state remains version 1. The Android update was installed over the older seeded build on the POCO without clearing data; the former seeded local sign-in was rejected after launch. The migration removes only the exact bundled account record, its `state_demo` data, and its biometric pointer. Other local accounts and their saved state are retained by the identity check, though a separate user-created local account was not available for an on-device preservation test. Old groups without a meetup date display **No meetup scheduled**.

New accounts have blank interests and school details and no bundled groups, tutors, bookings, or conversations. A personal tutor listing has no fabricated rating or response rate and offers editing instead of self-booking.

The package ID and certificate match older releases, and the version code increases to 3. Installation as an update retained app data on the test device.

## Teacher walkthrough

Complete these manual checks on the exact release APK before demonstrating it.

1. Install as an update and open the app. Check existing saved work after signing in.
2. Open the splash screen and step through the Novice, Intermediate, and Expert introductions. Check Back, Skip, page dots, and Get Started.
3. Demonstrate invalid login input, then create or sign in to a real test account. Confirm there is no preloaded account or sample listing.
4. Publish a tutor profile or use a second verified Firebase account's profile, choose a time, and book a future session. Verify the selected tutor, time, note, and overlap rejection.
5. Open a booked session workspace, confirm the tutor, schedule, and notes, and mark it complete. Reschedule, cancel, complete, and rate sessions; check upcoming, in-progress, and past-due labels.
6. Create a group without a date and confirm no schedule is invented. Create another with a valid future date and time; reject a nonexistent date.
7. Join/leave groups, review meetup dates and locations, and use a group session workspace. Write notes and replies, check that Back preserves a private draft, and post notes to a shared group only from the explicit action. Firebase accounts share group posts/replies when project settings and Firestore rules are configured; device-only accounts keep local groups.
8. Open a shared group's chat and exchange messages with another current member. Open a tutor-session chat and exchange messages with the other booking participant. Confirm a nonmember and a third student cannot read or send in either chat. Verify group owners can review a chat-message report and hide/restore its message. Device-only conversations remain private notes.
9. Open notifications and check their read state.
10. Add a custom interest, reject a duplicate with different letter case, remove an interest, and save. Check the home interest and tutor count.
11. Create a separate account and confirm that interests and school fields start blank, with an empty tutor directory and groups. Save preferences without entering school details.
12. Enter your course, year, and school. Create and edit a tutor listing. With two email-verified Firebase accounts, confirm the listing appears to the other account and can be removed by its owner.
13. Use a dedicated test Google account on the Android debug build. Verify Firebase creates or restores the account, keeps the supplied name/email, and allows the Student ID to be added privately in Edit Profile. Cancel the Google sheet once and confirm the auth screen stays usable. Repeat with the exact release signing certificate before distribution. This account-level flow has not yet been completed.
14. Sign out and sign in again to check saved data. Check biometrics on a personal account if enrolled on the phone.

Email-verified Firebase accounts share tutor profiles, session requests, current-member group chats, and tutor-session chats limited to their two participants. Device-only conversations remain private notes. Signed-in Firebase users share group details, memberships, posts, replies, and chat. About explains that email verification does not establish school affiliation.

## Historical 1.1.0 device checks

The previous APK was tested on one Android 16 phone: update over v1.0.0, cold launch, empty-login validation, the then-present seeded sign-in, tutor search/profile selection, past-time rejection, and future Physics booking with confirmation/details. That seeded account and its sample flows have since been removed; these are historical checks only. No crash was observed in those checks. Testing then stopped at the user's request.

Those checks apply to 1.1.0, not this APK. The prior release retains its [device verification record](https://github.com/Patt-00/Campus4Change/releases/tag/v1.1.0).

## Android network security spot-check — 2026-10-15

The locally merged debug manifest sets `android:usesCleartextTraffic` to
`true`, as configured by the React Native Gradle plugin for Metro development.
The merged release manifest sets it to `false`. The checked-in
`firebaseEmulatorHost` is empty, and `src/shared/backend/firebase.js` rejects
emulator configuration when `__DEV__` is false. A source search found no other
application `http://` endpoints. No network-security configuration change was
needed.

## Contextual cloud-status UI — 2026-10-15

The `emailVerificationBanner` route test supplies simultaneous group and tutor
permission errors and confirms they appear only on the relevant screens. The
full Jest suite passes 251 tests in 33 suites, and `npm run lint` passes. On the
POCO X4 GT, the live Metro app showed the tutor error with its retry action on
Home, then showed only the pending state-sync error on Profile. The live
Firestore denial remains visible; the UI no longer places unrelated group and
tutor warnings above Profile. The tutor-hook tests also confirm that a denied
read does not recommend waiting after a session request, while a denied write
retains the request-limit guidance. The revised listener wording has automated
coverage; it has not been visually rechecked on device.

## Final sprint: real in-app notifications — 2026-10-15

The POCO's Home screen visibly showed the revised tutor read-denial wording at
the start of this sprint, completing the earlier wording spot-check. The live
backend still denied shared data and state sync.

Added in-app notices for participant booking requests/status changes and joined
shared-group activity. One current notice per item persists in private account
state. Repeated or restored snapshots preserve read state, a newer event marks
the notice unread, and an older event cannot replace a newer one. Notices retain
the session/group destination and the newest 200 are kept. Pending timestamps
do not generate notices before server acknowledgement.

The full Jest suite passes 258 tests across 34 suites; lint and the public-link
check pass. With JDK 25, `:app:createBundleReleaseJsAndAssets` and
`:app:compileReleaseKotlin` pass on this implementation. This is source/build
evidence; two-account live event delivery and the final signed artifact still
need verification. The sprint completion gates are tracked in
[FINAL_SPRINT.md](FINAL_SPRINT.md).

## Final sprint: both-participant booking conflicts — 2026-10-16

A direct emulator probe against the earlier tutor-only locks accepted two
overlapping sessions for one student with different tutors; the regression's
expected denial failed because the second acceptance succeeded. The adapter and
rules now reserve two half-hour buckets for each participant in the common
`sessionSlots` namespace. All four locks must match the accepted booking.
Student slots are written without reading another student's private schedule;
rules reject overwrites. Accepted cancellation/completion removes all four
locks atomically. A pending cancellation does not remove or depend on locks
belonging to another booking.

The new emulator regression verifies exact and half-hour overlaps across tutors,
student/tutor role conflicts, concurrent acceptance with one winner, adjacent
sessions, outsider read denial, missing-lock rejection, pending cancellation,
and rejection of partial release. The complete Firestore rules, this regression,
and Firebase Auth verification tests pass together. The 259 Jest tests in 34
suites, lint, and whitespace checks also pass. CI now runs the new regression.
Real-project deployment and POCO workflow verification remain separate gates.

## Live Firebase deployment and native sync fix — 2026-10-16

Deployed the rules and four indexes from `009a62a` to `campus4change`. An
authenticated API readback matched the local rules byte for byte, SHA-256
`8989c8d6924fffbcbbeba43677997ccc92657c8a34ef571902fcbb3cea5e018e`;
all four composite indexes reached `READY`.

The POCO then exposed a native crash: `accessibilityRole="status"` is rejected
by Android's `RCTText` accessibility delegate. The cloud-sync and two report
status notices now use `accessibilityLiveRegion="polite"`. Their component
tests check the native-safe properties. After a cold launch the POCO showed
Home with no sync or query errors and no fatal Android/JS error in the filtered
log. Index-preparation errors now use a readable retry message rather than
displaying a Firebase Console URL. All 260 Jest tests in 34 suites, lint,
public-link checks, and whitespace checks pass.

Two temporary mailbox-alias accounts received real Firebase verification emails
and completed their verification links in the browser. Before verification,
both accounts could write/read their own private state; shared reads and
cross-account private reads were denied. A fresh sign-in confirms both verified
claims. Actual client adapters publish the tutor listing and create a shared
group. Posting currently fails at the adapter's missing-document preflight
read; the final sprint is correcting that retry path without opening report
contents to members. The temporary accounts are test fixtures and are not
bundled into the app.
