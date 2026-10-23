# Autonomous improvement progress

This log separates source changes, emulator checks, physical-device checks,
GitHub state, and production Firebase state. A build or install is not a release
or a production deployment.

## Current workspace

Updated 2026-10-23 after rechecking GitHub, Firebase Console, the POCO, and the
current worktree.

- Branch `release/v1.3.0-preview.2` has draft PR
  [#1](https://github.com/Patt-00/Campus4Change/pull/1) targeting `main`. The
  latest verified PR CI run
  [39968688244](https://github.com/Patt-00/Campus4Change/actions/runs/39968688244)
  passed both checks on commit `07b558b`. Manual workflow run
  [39966502505](https://github.com/Patt-00/Campus4Change/actions/runs/39966502505)
  passed, including a clean macOS build on earlier source. Verify CI on the
  current PR head before merge. The preview
  tag remains at `55dcc571436d705827b7b069d6bb077350a7e6f5`; `main` remains at
  `46fe89a534d98866dc981ef11fe64f24151e8bf4`.
- The signed 1.4.0/code 7 candidate APK SHA-256 is
  `e1c13ca9af40494302fcee8b717503d2e1f3f8a5b19d580368a27f859cd94b8a`; the
  AAB SHA-256 is `4f4339999355e4e5975d118d7317b38e530e461a7bb06cba437f94db5511d5bb`.
  The candidate was built with a new local v4 signer; APK signature, AAB
  signature, ZIP integrity, and bundletool validation passed. It remains
  unpublished. The
  older v1.3.0-preview.2 APK remains the only public installable asset.
- The USB-connected POCO X4 GT (`Z9GMOVDMHQV8X84D`, model `22041216G`) has the
  signed candidate `com.campus4change`, version 1.4.0/code 7. Reinstalling the
  local release APK returned `Success`; a second pull confirmed the installed
  base APK SHA-256 matches the local artifact exactly. The earlier fresh launch
  showed the branded Get Started screen. Intro-to-login and signup navigation,
  empty-form validation, and neutral cancellation after dismissing the Google
  account picker were checked first. In the later live test, the user-selected
  tester account signed in through Firebase, reached TIP Account Setup, saved a
  synthetic Computer Science profile for year 1 at T.I.P. Quezon City, and
  reached Home with its generated UUID. The existing Auth account was reused.
  After saving Computer programming and Object-oriented programming as interests,
  Home showed one tutor match and Find People listed the public profile under
  **Recommended for your interests** with both topics matched.
  Opening the existing unread notification navigated to its related group
  details; the Home badge changed from 1 unread to 0 after returning. No group
  post, chat message, or session request was created.
  My Sessions showed empty Upcoming, Requests, and Cancelled states. The only
  available directory tutor belongs to another account, so no live request was
  sent to avoid notifying a non-test user.
  Profile → Tutor profile opened the Be a Tutor form with TIP topic suggestions.
  I backed out without creating a public listing.
  Camera permission, camera return, local photo save, and cold-start retention
  also passed. The user confirmed the phone's flat position caused a black test
  capture; the test photo was replaced with the cyan avatar preset. See
  [verification evidence](docs/VERIFICATION.md). Login → About displayed the
  current objective and data boundaries during the earlier signed-out check.
  Only this POCO is in test scope; the other ADB device is excluded and Pad 7
  is deferred.
- The 1.4.0 versioned source passes 337 Jest tests across 41 suites, ESLint,
  `git diff --check`, Firestore test-script syntax validation, and
  `:app:testDebugUnitTest` when Gradle is run with JDK 25. A first unit-test
  attempt under the workstation's default JDK 27 failed with unsupported class
  file major version 71; rerunning with the documented JDK 25 passed. The
  Fedora debug APK has not yet been rebuilt after the version bump. No local
  Android emulator is being used; CI provides the emulator suites.
- A fresh Termux clone at commit `6101ee252c60a18337f73470247ae8f256202121`
  passed `npm ci` and `scripts/gradlew-termux.sh clean assembleDebug` on the
  POCO. It completed 92 Gradle tasks in 2m51s using Node 26.4.0 and JDK 17.0.21;
  package metadata is 1.4.0/code 7 and `apksigner verify` passed. The debug APK
  was not installed. Later changes through `7fc0d00` affect documentation and
  the release helper, not app source or Android Gradle configuration. A clean
  macOS 15 ARM64 hosted build passed in workflow run `39966502505` on commit
  `9bbdb82`. This verifies the clean macOS build procedure on a GitHub-hosted
  runner; the user's personal Mac environment has not been tested.
- Firebase CLI is authorized for the selected owner account, and the project
  listing confirms `campus4change` / Campus4Change. The v4 SHA-1 and SHA-256
  are registered on the Android app. Firestore rules were deployed after the
  current rules/Auth emulator CI passed; the active ruleset is
  `projects/campus4change/rulesets/7194f765-35ec-4ecd-b266-cca407e2a07c` and
  its SHA-256 exactly matches local `firestore.rules` at
  `31f4827c128dcc063a21f7de1dc0542db720dd45efce13b8d0ac3a63630f4cfa`. All
  six live indexes are READY and match local definitions.
- The App Check page still lists the Android app as Not registered. The Play
  Integrity form contains the v4 SHA-256 and is open at the Google APIs and
  Play Integrity terms checkbox, which remains unchecked with Save disabled.
  Project-owner acceptance is required before saving registration.
  Authentication and Firestore enforcement remain Unenforced. On a POCO cold
  launch, the named native App Check app initialized and Google Play Integrity
  returned a token callback, but Firebase App Check token exchange failed with
  a generic `FirebaseException`. The bridge omits the underlying response, so
  the exact cause is unknown. Device connectivity currently reports validated
  Wi-Fi. This is not evidence of a valid Firebase App Check token.
- A local encrypted backup has been created and integrity-verified outside
  Git. It contains metadata for 9 Auth accounts and 13 Firestore documents
  across 8 collection paths, without password hashes or tokens. Plaintext
  export files were removed from temporary storage. The approved full data
  reset has not started; those live records still exist.
- The last weighted estimate was 88.25% before the current source commit. It is
  a historical checkpoint and will be recalculated after the final acceptance
  gates are verified; it is not a current completion claim.

## Improvement cycles

### Clean macOS hosted build, 2026-10-23

- Manual workflow run [39966502505](https://github.com/Patt-00/Campus4Change/actions/runs/39966502505)
  passed on current PR head `9bbdb82`. It used GitHub-hosted macOS 15.7.9 ARM64,
  Node.js 24.20.0, npm 11.19.0, Temurin JDK 17.0.21+9, and Gradle 9.4.1.
- The job installed Android Platform 37.0, Build Tools 37.0.0, and NDK
  27.1.12297006. `npm ci` and `./gradlew assembleDebug` passed; Gradle completed
  in 2 minutes. `aapt` reported `com.campus4change` version 1.4.0/code 7, and
  `apksigner verify` passed. The debug APK SHA-256 was
  `ea5c3799d9370134218eeedd290a43c0229fb93df172e1ef752ad87a5d2b42e2`.
- The first hosted attempt failed because the workflow requested the invalid
  SDK package `platforms;android-37`. The package list uses `platforms;android-37.0`;
  the corrected workflow passed on the next run. The debug APK was not
  installed, and the user's personal Mac remains untested.

### Current candidate install and Firebase Console recheck, 2026-10-23

- Rechecked PR #1 at head `7fc0d00`; GitHub reports CI run `39948381988` with
  both `checks` and `api24-instrumentation` jobs successful.
- Reinstalled the signed release APK on POCO X4 GT with
  `adb -s Z9GMOVDMHQV8X84D install --no-streaming -r`. ADB returned `Success`.
  The package reports `com.campus4change`, version 1.4.0/code 7. The APK pulled
  from the installed package has SHA-256
  `e1c13ca9af40494302fcee8b717503d2e1f3f8a5b19d580368a27f859cd94b8a`, matching
  the signed local artifact. No app data was cleared.
- The current App Check Console page still lists the Android app as Not
  registered. The Play Integrity form has the candidate SHA-256, but the terms
  checkbox remains unchecked and Save remains disabled. No Console setting was
  changed.
- A cold launch on the POCO reached `MainActivity` and displayed the signed-out
  Login screen without a React Native fatal exception. The default native
  Firebase initializer logged that default options were absent; the app's
  explicitly configured named App Check instance initialized afterward. Google
  Play Integrity returned its callback, then the Firebase App Check exchange
  failed with a generic exception. The exact service response is intentionally
  not exposed by the native bridge.
- Live Google sign-in and test-data deletion remain pending. The currently
  authorized data reset has not started; the encrypted backup remains available
  outside Git.

### Dependency advisory refresh, 2026-10-23

- `npm audit --json` and `npm audit --omit=dev --json` each report 20 high,
  zero moderate, and zero critical paths. All 20 high paths resolve through
  React Native CLI and Metro tooling to `braces@3.0.3`.
- The npm registry still lists `braces@3.0.3` as latest. GitHub advisory
  [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  affects versions through 3.0.3 and lists no patched release. npm's forced
  fixes downgrade React Native to 0.72.17 or CLI to 13.5.1, incompatible with
  the current 0.87.1 and 20.2.0 toolchain. No downgrade or override was applied.
- The Jest preset path also contains `sprintf-js@1.0.3`. GitHub advisory
  [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
  affects versions through 1.1.3 and lists no patched release. The current
  npm report no longer includes this moderate advisory. Its proposed Jest
  25.0.0 downgrade conflicts with the project's Jest 30 line, so no change was
  made.
- The 1.4.0 candidate source map contains 654 sources and no paths for
  `braces`, `micromatch`, `fast-glob`, `launch-editor`, or `sprintf-js`.
- No `package.json` or lockfile changes were required. The findings and source
  bundle boundary are recorded in [QUALITY_AUDIT.md](docs/QUALITY_AUDIT.md).

### 1.4.0 finalization started, 2026-10-23

- Re-read the user-provided completion requirements and rechecked the active
  branch, tag, main, GitHub Actions, Firebase CLI access, installed POCO
  package, and signing inventory before making changes.
- Bumped source metadata to version 1.4.0/code 7. The previous preview asset is
  explicitly identified as stale; no release artifact is being represented as
  the 1.4.0 build.
- Re-ran the full Jest suite (337 tests/41 suites), ESLint, static checks, and
  Android unit tests with JDK 25; all passed. The default JDK 27 attempt failed
  for the already documented unsupported class-file version and was not used
  as the final verification result.
- Reauthorized Firebase CLI for the project owner and confirmed the
  `campus4change` project is available. Registered the v4 SHA fingerprints and
  deployed the reviewed Firestore rules after emulator CI passed. No production
  Auth accounts or Firestore documents were changed.
- Created the v4 release key outside Git with mode 600; its password is stored
  in GNOME Keyring under its dedicated account. The helper now defaults to v4
  and exports the loaded password to `keytool` before key generation. Signed
  APK/AAB builds pass; both Firebase SHA fingerprints were registered.
- Created and verified the temporary encrypted local export before any live
  deletion. The POCO first-run UI smoke passed with no Firebase account created.
- A clean Termux clone of the 1.4.0 source passed dependency installation and
  debug assembly on POCO in 2m51s. The resulting debug APK was verified but not
  installed; a Mac clean-clone build remains pending.
- CI run 39942899889 passed on `6101ee2`; the latest head's status is tracked
  in PR #1 and must be green before merge. Play Integrity terms/registration
  and token verification, live Google sign-in, production cleanup, broader
  POCO feature checks, the Mac build, main merge, final tag/assets, and final
  email remain open. The clean Termux 1.4.0 build has passed.

### UUID account migration and Google sign-in navigation, 2026-10-23

- Replaced the user-entered Student ID flow with a random v4 UUID generated by
  `CampusStorageModule`. Local accounts keep their native UUID, while Firebase
  profiles store `accountUuid` separately from the Firebase UID used for
  Firestore ownership. Account Setup and Profile show the UUID as selectable
  text; the UI explains that it does not verify TIP enrollment.
- Removed Student ID sign-in, setup, and edit controls; removed client claim
  reads/writes and local `studentIdClaims` rules. Local and cloud-state
  migrations drop legacy Student ID fields. No production rule or Firebase
  setting changed.
- `AppNavigator` now routes complete profiles to Home and incomplete TIP
  profiles to Account Setup. A successful mocked Google session exercises the
  same sign-in callback. Login and Sign Up show a neutral cancellation notice
  when a user dismisses Google's account picker.
- Updated the Figma Account Setup, Profile, Edit Profile, Sign-up, and About
  designs. Removed the unused Student ID verification frame. Screenshots and a
  structural readback confirmed the UUID card, removed edit field, and absence
  of remaining Student ID text in the prototype.
- Local verification passed 337 Jest tests across 41 suites, ESLint,
  `:app:testDebugUnitTest`, `assembleDebug`, `node --check` for the rules test
  script, and `git diff --check`. The rules emulator suite was not run because
  no local emulator was started. The generated debug APK is local and was not
  installed over the release app.
- ADB listed only the POCO X4 GT. Its installed 1.3.0/code 6 release predates
  these uncommitted changes, so physical verification of UUID setup and live
  Google navigation remains open. The replacement release signer is still
  absent from Firebase's Android app registration. No push or deployment was
  performed.

### Dependency advisory refresh, 2026-10-23

- `npm audit --omit=dev` reports 20 high vulnerabilities and zero critical.
  The full `npm audit` reports 20 high and 20 moderate vulnerabilities, with
  zero critical. `npm view braces version` still returns 3.0.3.
- The reviewed GitHub advisories list no patched releases for `braces` or
  `sprintf-js`. npm's forced fixes propose React Native CLI 13.5.1 and Jest
  25.0.0, which are incompatible downgrades from this project's current lines.
- No dependency files changed. The advisory risk remains recorded in
  [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md).

### Google sign-in session handoff verification, 2026-10-23

- Before editing the test, `campusEmailVerification.test.jsx` passed 8 tests.
  I added an assertion that a successful mocked Google account restores the
  Firebase session and calls `onSignedIn` with the first-time user's profile
  and unclaimed Student ID status.
- The focused suite passed 8 tests after the assertion. The full Jest suite
  passed 334 tests across 40 suites, `npm run lint` passed, and
  `git diff --check` passed. No application source or release artifact changed.
- This verifies the JavaScript account-to-navigation callback only. The POCO
  work-account attempt still stops at Google's device-lock policy prompt, and
  release Firebase sign-in remains unverified.

### Preview-branch CI and Google sign-in configuration check, 2026-10-23

- GitHub Actions run [39829733295](https://github.com/Patt-00/Campus4Change/actions/runs/39829733295)
  passed on preview commit `55dcc571436d705827b7b069d6bb077350a7e6f5`.
  The 334-test JavaScript suite, lint, Android unit tests, Auth and Firestore
  emulator checks, release compile, debug build, and release signing guard
  passed. Hosted API 24 instrumentation passed. No emulator ran on the user's
  PC.
- A read-only Firebase CLI check confirmed the current release APK's signing SHA-1 and SHA-256 are absent from the registered Android app fingerprints. Firebase's [Android Google sign-in guide](https://firebase.google.com/docs/auth/android/google-signin?authuser=002) requires the app SHA-1 to be registered. No Firebase setting or data changed.
- The POCO remains on the Google sign-in flow. The authorized work account previously reached an organization prompt requiring a device lock. No lock setting was changed, and no Firebase sign-in completed. The user asked to use another account; its exact identity is still pending.
- The preview branch and release tag remain at `55dcc571436d705827b7b069d6bb077350a7e6f5`; `main` remains unchanged.

### Google account-picker cancellation and work-account lock prompt, 2026-10-22

- Reproduced the POCO Login screen's red Google sign-in error after the user
  dismissed Credential Manager. App logs showed
  GetCredentialCancellationException; the flow had returned a normal
  cancellation, not a Firebase token-exchange error.
- Updated Login and Sign Up to leave the form unchanged when the chooser is
  dismissed. Added screen tests for both cancellation paths. The focused suite
  passed all 10 tests, the complete suite passed 334 tests across 40 suites,
  and ESLint passed.
- Built and signature-verified the release APK and AAB. The release signer
  remains the same. APK SHA-256 is e83a7feeaf307d526b6bb34334badbc193f1e218259bfd2aeb8c55f1c1cfa330; AAB SHA-256 is 3ae00c1033f7f82c1aed81353b70656b690542e872ebc78e4ab91060ef09ddb4.
  The APK was installed over the existing release app on POCO; its pulled
  base.apk hash matched the new artifact.
- On POCO, dismissing the Google chooser now returns to Login with no red
  error. Selecting the previously authorized work account displayed Google's
  organization requirement to set a device screen lock. The lock screen was
  not changed and sign-in did not complete. The user requested a different
  account; selecting one awaits their choice because several alternatives are
  present.
- Firebase's replacement release SHA-1 remains unregistered. The signed
  Google-to-Firebase path is still unverified; no production Firebase setting
  or data changed. The updated APK replaces the previous asset on the existing
  v1.3.0-preview.2 pre-release after the source and release notes are updated.


### Initial inspection, 2026-10-18

- Confirmed the checkout, branch, remote, HEAD, dirty worktree, app scripts,
  source layout, tests, and active quality-audit documents.
- No `AUTONOMOUS_PROGRESS.md` existed before this inspection.
- Earlier task output for this same worktree reports 291 passing Jest tests,
  passing lint and Firestore emulator checks, and a successful debug Android
  build. The Pad 7 rejected that debug APK because its installed app uses a
  different signing key. The app was not uninstalled and no data was cleared.
- Next: rerun repository checks against the current files, inspect the auth,
  persistence, subscription, and navigation failure paths, then fix the
  highest-confidence defect found.

### Current baseline validation, 2026-10-18

- Re-ran all 291 Jest tests, ESLint, and the tracked-file public Drive-link
  scan. All passed.
- Auth emulator verification passed: private state remained owner-only before
  verification, then a refreshed verified token unlocked shared group reads.
- Firestore rules and offline-persistence tests passed, including private
  Student ID claims, duplicate rejection, legacy-ID migration, and profile
  ownership checks.
- Booking-overlap and group-client adapter emulator tests passed.
- `./gradlew --no-daemon testDebugUnitTest assembleDebug` completed
  successfully. Gradle reported deprecated features that will require review
  before a future Gradle 10 upgrade.
- No runtime defect has been confirmed by these checks. Next: recheck current
  dependency audit findings and inspect subscription cleanup and startup
  failure paths for a testable issue.

### Tutor recommendation pagination, 2026-10-18

- Found that an empty interest-recommendation state said no public profiles
  matched even when additional tutor pages were still available.
- Updated the message to say that only loaded listings have been checked and
  direct the user to load more. When all pages are loaded, the screen now gives
  a complete-directory message.
- The focused regression test failed against the previous behavior, then
  passed after the fix. The focused tutor suite passed 11 tests, lint passed,
  and the full Jest suite passed 292 tests. `git diff --check` passed.
- Rechecked `npm audit --omit=dev`: 20 high, 0 critical. The proposed automatic
  fixes downgrade React Native or the community CLI to incompatible major
  versions. No dependency override or downgrade was applied. Next: verify
  current compatible package releases and inspect async subscription and
  account-restore error paths for another concrete issue.

### Legacy local Student ID migration, 2026-10-18

- Native restore now checks whether the active account owns a unique,
  digits-only Student ID. Duplicate, missing, or legacy-formatted IDs route to
  required account setup. Setup compares new IDs with normalized legacy values
  before atomically updating the encrypted account and profile.
- Native sign-in no longer chooses an arbitrary account when multiple accounts
  match an ID. It tells the user to sign in by email; email matching takes
  priority, so the account can enter setup and resolve the conflict.
- Added JVM tests for unique IDs, duplicate and legacy-formatted IDs, email
  priority, and ambiguous ID sign-in. The app suite verifies that a duplicate
  local account opens setup. Full Jest passed 293 tests, ESLint passed, and
  Gradle unit tests plus debug APK assembly passed.
- Device installation remains unverified. Campus4Change is not installed on
  the POCO, and Xiaomi canceled its debug APK install with
  `INSTALL_FAILED_USER_RESTRICTED`. The Pad has version 1.2.2 installed, but its
  signature does not match the debug key. No app was uninstalled.

### Dependency audit review, 2026-10-18

- `npm audit --omit=dev` reports 20 high and zero critical findings. The
  [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) covers
  versions through 3.0.3 and currently lists no patched version.
- A live registry check still lists React Native 0.87.1, CLI 20.2.0, and
  `braces` 3.0.3 as the latest versions in the app's compatible lines. No
  compatible patched dependency is available in this check.
- The [React Native Community CLI compatibility table](https://github.com/react-native-community/cli#compatibility)
  advises against updating the CLI independently and currently lists supported
  React Native versions through 0.85 for CLI 20.x. The audit's automatic fixes
  downgrade the app's React Native or CLI major versions. No incompatible
  downgrade or unverified package override was applied.
- Next: continue reviewing the remaining account-restore and subscription
  cleanup paths. Revisit these dependency findings when compatible upstream
  fixes are available.

### Production bundle and device verification, 2026-10-18

- Metro created the production Android JavaScript bundle and copied 28 asset
  files to `/tmp`. It warned that an internal React Native feature-flag path
  was not listed in package exports, then resolved that path from the package
  files and completed the bundle.
- The API 36 emulator boot attempt ended with exit code 139, so it did not
  provide a runtime check.
- The POCO X4 GT had no Campus4Change package installed. Xiaomi rejected the
  new debug APK with `INSTALL_FAILED_USER_RESTRICTED`. The Pad 7 has version
  1.2.2 signed with another certificate; Android rejected the debug update
  with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Neither device was wiped or
  uninstalled.
- Physical launch of the new build remains unverified. The POCO requires its
  on-device installer approval or USB install permission before retrying.
  Updating the Pad requires the existing release signing identity.

### Private-message restore volume

- `loadCloudState` calls `getDocs` on the full owner-only `privateMessages`
  collection and merges every message into account state. The query has no
  page limit, so restore reads and retains more data as users save more private
  notes.
- `MessagesScreen` searches the bodies of all loaded private notes. A restore
  cap would silently remove older notes from search, so any bounded loader must
  preserve search across full history as well as conversation previews.
- No note-history cap was added. A validated local-cache optimization is
  recorded below; cold, stale, changed, or offline restores keep the full-read
  path so search continues to include all saved notes.

### Subscription and authentication lifecycle review

- Inspected the group, tutor, and shared-message hooks. Each active listener
  guards callbacks after cleanup and unsubscribes when its account or route
  changes. Their focused tests pass in the full Jest run; no lifecycle defect
  was confirmed.
- Inspected the native Google sign-in callback. It validates the credential
  type and ID token, settles cancellation and failure paths, and does not log
  tokens. A release-device Google sign-in check remains open.

### Private-message restore cache and two-device QA, 2026-10-18

- Repeat Firebase restores can now reuse the full private-message history saved
  in encrypted local account storage. A small encrypted per-UID marker records
  the document count and message fingerprints; the app checks Firestore's
  owner-authorized aggregate count and the embedded legacy-message fingerprint
  before skipping the collection download. Missing markers, changed or
  unsynced local messages, changed legacy cloud messages, offline count checks,
  and invalid document data all use the existing full `getDocs` path. Search and
  older note history remain intact.
- Added tests covering 300-note warm restores, unsynced local notes, changed
  legacy cloud notes, and fallback when the count check is unavailable. The
  Firebase/restore focused tests passed. The full Jest suite passed 296 tests;
  ESLint and `git diff --check` passed.
- Firestore emulator rules tests verified that the owner can run the aggregate
  count and another account cannot. The rest of the existing Firestore rules
  suite passed.
- The first self-contained QA APK accidentally bundled `__DEV__` as false while
  targeting the emulator. The app's release guard correctly stopped startup and
  the Pad showed the red error screen. I stopped that app and replaced the APK
  in place with a debug bundle that explicitly keeps Metro's development flag
  enabled. No app data was cleared. The Pad now visually shows the Login screen
  with no prefilled credentials or red error screen; its only overlay is the
  standard React Native debug prompt because no Metro debugger is attached.
- The corrected APK targets the local Auth and Firestore emulators, uses the
  matching local Android debug key, and contains an embedded JS bundle. The
  source Firebase config and Gradle build file were restored after building.
  The POCO install was canceled with `INSTALL_FAILED_USER_RESTRICTED`; it
  remains unmodified pending the device's Install via USB prompt. No production
  Firebase data or configuration was changed.
- A fresh production-mode React Native bundle also completed from the restored
  source config and copied 28 asset files to `/tmp`.
- This physical smoke test proves only installation and a visible Login screen.
  The authenticated two-device messaging flow and the signed release build
  remain unverified. The emulator-targeted debug build requires the local
  emulators and ADB reverse ports 8080/9099 to remain available while it is
  used.

### Mixed-history conversation ordering, 2026-10-18

- A regression test reproduced a chat-order defect: embedded legacy notes kept
  their original array order while missing Firestore documents were appended,
  so a conversation could show an older note as its latest message. The merge
  now orders all notes by timestamp and keeps the existing order for ties or
  missing timestamps.
- The focused Firebase suite passed 38 tests; the full Jest suite passed 297
  tests, ESLint passed, `git diff --check` passed, and a production-mode bundle
  completed with 28 assets.
- Rebuilt the emulator-targeted debug APK with the updated source, updated it on
  the Pad 7 without clearing data, and cold-launched it. The visible Login
  screen showed no prefilled credentials. Empty sign-in validation displayed
  the expected inline message and stopped before submitting. The POCO remains
  pending its Install via USB confirmation.

### Booking and group-room audit, 2026-10-18

- Rechecked date selection and validation, booking slot allocation and
  transaction-based overlap locks, session timing boundaries, and the Group
  Session workspace. Existing bookings are displayed as scheduled meetings
  with agenda and notes; no focus timer remains. The code and existing emulator
  tests showed no new booking or timer defect, so no source change was made.
- The project icon resources and manifest still point to the adaptive
  Campus4Change launcher artwork. The Pad's current Login view visually shows
  the correct app screen with no demo credentials. The POCO install gate is
  still the remaining physical-device blocker.

### Home tutor recommendation completeness and Redmi test attempt, 2026-10-18

- Fixed the Home recommendation summary so it no longer presents the current
  paginated tutor results as a complete directory. It now distinguishes an
  unavailable shared directory, loading, partial matches, complete results,
  and a completed search with no matches. Navigation passes the directory's
  verification and pagination state to Home.
- Added regression coverage for partial and complete counts, no-match states,
  loading, and unverified accounts. Focused tests passed; the full Jest suite
  passed 300 tests across 39 suites, ESLint passed, and `git diff --check`
  passed. The production Android JS bundle completed with 28 assets.
- Built a 127 MB emulator-targeted debug APK with the local Auth and Firestore
  emulator settings. The temporary Firebase and Gradle build edits were
  restored; production `campus4change` config remains unchanged.
- ADB listed only the POCO X4 GT (model `22041216G`, codename `xaga`); neither
  the Redmi nor Pad 7 was connected. The app was absent from the POCO. Android
  rejected fresh installation with
  `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`, so launch and
  on-device UI behavior remain unverified. No app data was cleared and no
  production Firebase service was accessed by the QA APK.

### Verified-email notification destination, 2026-10-18

- Traced the email-verification success toast through navigation. After a user
  tapped “Email verified,” it opened Notifications, but the pending-verification
  card disappeared and no success detail replaced it. The screen now retains a
  short verified state for that session and renders a green confirmation card
  without resend or recheck actions.
- Updated the Campus4Change Figma file with an editable verified Notifications
  frame (`216:39`) and a Home success-toast frame (`218:39`) whose view action
  navigates to it. The pending email notice no longer overlaps its actions, and
  the static session and group examples now match notification types emitted
  by the app. Screenshots of both notification states and the success toast
  were visually checked. `docs/FIGMA_COVERAGE.md` records the states and current
  prototype reaction count.
- Final screenshot review caught a solid-green badge caused by Figma resetting
  paint opacity when the color variable was bound. The badge now retains 9.4%
  opacity and the checkmark is visible against the card.
- Added an integration regression test for tapping the success toast and a hook
  assertion for the retained verification status. The focused verification
  suites passed 14 tests after the final copy change. The full Jest suite
  passed 301 tests across 39 suites, full ESLint passed, and `git diff --check`
  passed after the final copy change.
- Rebuilt the emulator-targeted debug APK successfully (about 133 MB). Its
  embedded bundle contains the demo project ID, loopback host, and verified
  notice copy; the local debug signing certificate verified. The production
  Firebase config and Gradle file were restored.
- Recounted the Figma prototype at 110 navigation reactions: 66 move-ins, 43
  dissolves, and 1 smart-animate transition. The email-verified toast's reaction
  targets its verified Notifications frame.
- The Android JVM unit-test task also passed after the UI fix.
- Physical install remains blocked: ADB still sees only the POCO X4 GT, Android
  canceled its APK install, and no Redmi or Pad 7 is connected. The available
  API 36 emulator also exited with code 139 during headless startup, so this
  build has not been launched on a device or emulator.

### Offline profile edits and Student ID claim checks, 2026-10-18

- A controlled regression test showed `saveProfileUpdate` waited on a prior
  Firestore write before saving an ordinary profile edit to encrypted local
  storage. The save now persists ordinary edits locally first; the session
  write queue coalesces the newest cloud state after the local update.
- Student ID changes and accounts without a confirmed claim remain remote-first.
  A failed ownership check for the previous Student ID now stops the edit
  instead of treating a network error as an unclaimed ID. This preserves the
  existing atomic profile-and-claim write.
- Tests cover saving an ordinary edit while an earlier cloud write is pending,
  syncing the newest state after acknowledgement, and rejecting an ID change
  when the old claim cannot be checked. All 303 Jest tests across 39 suites,
  full ESLint, and `git diff --check` passed.
- Rebuilt the emulator-targeted debug APK successfully. Its bundle uses
  `demo-campus4change-rules` at the local emulator host, its debug signature
  verified, and the temporary Firebase and Gradle edits were restored.
- ADB still lists only the POCO X4 GT; the Redmi and Pad 7 are absent. The
  refreshed APK has not been installed or launched on a device.

### Student ID status isolation during account changes, 2026-10-18

- Reproduced four stale asynchronous callbacks that could change the current
  account's Student ID status after switching away from another account:
  successful and rejected queued writes, a restore failure, and a rejected
  direct Student ID edit. These callbacks could incorrectly route the new
  account back to required setup.
- Claim-status updates now use the active Firebase account or restore-generation
  guard already protecting the associated sync errors and restored data.
  The old operation still completes for its own account without changing the
  next account's status.
- Each regression failed before its guard was added. All 307 Jest tests across
  39 suites, full ESLint, and `git diff --check` pass. Metro also produced a
  production Android JavaScript bundle with 28 assets in
  `/tmp/c4c-account-switch-20261018`.
- The existing emulator-targeted QA APK predates this source fix and must be
  rebuilt before the next install. ADB still exposes only the POCO X4 GT;
  physical Redmi and Pad 7 checks remain pending.

### Refreshed Android QA artifact and device scope, 2026-10-18

- The combined `:app:testDebugUnitTest :app:assembleDebug` run completed
  successfully after the account-switch fix. The build wrapper confirmed that
  Firebase configuration and Gradle were restored byte-for-byte. Android
  `apksigner verify` also passed for the refreshed debug APK.
- This APK targets the local Firebase emulators; it is not a production release.
  It has not been installed or launched on a physical device.
- The user corrected the device instruction: exclude Redmi, use POCO X4 GT and
  Pad 7. The latest ADB inventory contains no connected devices.
- Reviewed the unguarded local retry-save error callback as a possible account
  switch race. Firebase account restoration waits for the same local save queue
  before activating the next account, so the inspected sequence does not prove
  a stale-account error. No speculative change was made.

### Floating notification repeated-tap navigation, 2026-10-18

- Reproduced duplicate navigation by tapping the floating notification twice
  before its 180 ms closing animation completed. The dismiss handler already
  ignored repeated closes, but the open handler navigated on every tap.
- The open handler now checks the dismissal lock and starts dismissal before
  navigating, allowing one navigation per visible toast.
- The regression test holds the closing animation open and failed with two
  navigation calls before the fix. The new test and notification integration
  suite pass (7 tests); all 308 Jest tests across 40 suites pass. Focused ESLint
  and `git diff --check` pass.
- The previously built QA APK predates this latest JavaScript fix. No device
  install or runtime claim is made; ADB currently lists no devices. Redmi stays
  excluded, with POCO X4 GT and Pad 7 as the authorized test devices.

### Local validation scope and current bundle, 2026-10-18

- Reviewed the session timing status and boundary scheduling implementation.
  This inspection did not establish a new defect, so no timing change was made.
- Corrected the quality audit scope to the actual `main` checkout and linked
  this progress log. Historical pinned release evidence remains intact and is
  explicitly separated from uncommitted local changes.
- Full-project ESLint and `git diff --check` pass. Metro successfully generated
  the production Android JavaScript bundle and 28 assets in
  `/tmp/c4c-toast-20261018`, including the repeated-tap notification fix.
- The bundle build emitted the existing React Native private feature-flag
  export fallback warning. It completed successfully; no dependency change was
  justified by that warning alone.
- This is bundle verification only. The QA APK still predates the latest toast
  fix, and physical runtime validation remains pending with no ADB devices.

### QA APK includes repeated-tap fix, 2026-10-18

- `:app:assembleDebug` completed successfully with the latest notification
  interaction fix. `apksigner verify` passed for the resulting debug APK.
- Verified the embedded bundle contains `demo-campus4change-rules` and
  `127.0.0.1`. The build wrapper restored the original Firebase and Gradle
  files byte-for-byte, and the normal Firebase source configuration was checked.
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
  SHA-256: `8f609753fe946997ab9f868754670d98e9f73f6688f9d428d09997805d4c102b`.
- `git diff --check` passed. ADB still detects no devices, so installation,
  cold launch, and physical interaction checks remain unverified. Testing is
  limited to POCO X4 GT and Pad 7; Redmi is excluded.

### People-search whitespace matching, 2026-10-18

- Reproduced a false empty search result for `computer   science` against a
  Computer Science profile. The filter normalized case and outer whitespace
  but retained repeated spaces, unlike learning-interest recommendations.
- Query text, joined searchable profile text, and selected subjects now use
  the existing whitespace normalization helper. Stored display text is unchanged.
- The regression covers repeated query spaces, repeated saved-name spaces,
  pasted tabs, and a selected subject with extra spaces. It failed before the
  fix. Focused state and tutor-flow suites pass 35 tests; all 309 tests across
  40 suites pass. Focused ESLint and `git diff --check` pass.
- This source-only search fix is newer than the QA APK. On-device search
  interaction remains unverified, and no deployment or remote push occurred.

### Backend emulator regression verification, 2026-10-18

- Ran the CI emulator command with Firebase CLI 15.33.0, JDK 25, and the
  reserved `demo-campus4change-rules` project. Auth and Firestore started on
  local ports and shut down cleanly after exit code 0.
- All four scripts passed: Firestore rules/offline persistence, participant
  booking overlap, actual group-client adapter against rules, and Firebase
  Auth email-verification claim refresh. The chained command only reached
  each later script after the preceding script succeeded.
- This covers local private-state isolation, shared access restrictions,
  concurrent booking locks and release, group content and moderation receipts,
  and verification-dependent reads. Expected denied-operation checks produced
  permission-denied logs without failing their assertions.
- No production rules, indexes, accounts, data, or authentication policies were
  changed. These emulator results do not establish production or physical-device
  behavior. Existing source/build and device limitations remain as recorded.

### Chat pagination error isolation, 2026-10-18

- Two controlled tests reproduced an old older-message request setting the
  error in a different active conversation or a newly signed-in account.
  Listener callbacks already checked subscription lifetime, but the pagination
  promise rejection did not.
- Pagination failures now update the error only while their original
  subscription is current, matching the existing loading-state guard.
- Both stale-operation regressions failed before the fix and now pass. A third
  test confirms failures still appear in the active chat. All 312 tests across
  40 suites, focused ESLint, and `git diff --check` pass.
- This is a source-only fix newer than the QA APK; no physical chat interaction
  or production behavior is claimed. No authentication policy was changed.

### Group report pagination subscription lifetime, 2026-10-18

- Reproduced a delayed report-page rejection reintroducing an error after the
  owner's report queue was disabled, and after that queue was reopened for the
  same UID/group. Matching UID and group alone did not distinguish the old
  request from a new subscription.
- Report pagination errors now require the originating subscription to remain
  current, matching the existing completion-state guard.
- Both disabled and renewed-queue regression tests failed before the fix and
  pass afterward. All 314 Jest tests across 40 suites, focused ESLint, and
  `git diff --check` pass.
- Related group directory/post/reply pagination catches use identity checks
  rather than subscription lifetime checks and remain the next targeted review.
  This does not establish a defect without controlled reproduction.
- The QA APK predates this source fix. No production operation, remote push,
  or device testing was performed in this cycle.

### Group directory and content retry isolation, 2026-10-18

- Controlled tests confirmed stale pagination failures overwrote the cleared
  error after Retry replaced the directory, post, or reply subscription.
  UID/group matching still succeeded because Retry retained the same identity.
- All three catch handlers now require their original subscription to remain
  current, matching their existing loading-state cleanup guards.
- Three regression cases failed before the fix and pass afterward. Existing
  active post/reply failure tests continue to pass. All 317 Jest tests across
  40 suites, focused ESLint, and `git diff --check` pass.
- These source fixes are newer than the QA APK and remain unverified on a
  physical device. No production or repository publication occurred.

### Consolidated QA build and instrumentation compilation, 2026-10-18

- Built the latest source, including whitespace search and subscription-lifetime
  fixes, with `:app:testDebugUnitTest :app:assembleDebug
  :app:assembleDebugAndroidTest`. Gradle completed successfully; the native
  unit-test task was up-to-date. Instrumentation sources compiled and packaged,
  but their device tests were not executed.
- Full-project ESLint and `git diff --check` pass. APK signatures passed for
  both the application and instrumentation packages. The application bundle
  contains the local demo project and loopback emulator host.
- Temporary Firebase and Gradle source edits were restored byte-for-byte.
- App APK SHA-256:
  `b0c8e1ddd6ee128533491ce4d63a0595e427139b85d85d8f3508d196c4f6997b`.
  Instrumentation APK SHA-256:
  `9deaf8c72f214dd5d83753cde39b68c01ab89757a4faa1d7935a655e0a7ae129`.
- ADB still has no devices. Physical installation, cold launch, authenticated
  two-device flows, and instrumentation execution remain pending. POCO X4 GT
  and Pad 7 remain authorized; Redmi is excluded. No push or deployment occurred.

### Runtime verification gate, 2026-10-18

- Reviewed route transitions, conversation keys, profile form keys, and the
  create-group flow. The inspected routes already remount chat/profile state
  for their destination; no additional defect was established or changed.
- Rechecked source configuration and whitespace: normal Firebase source values
  are restored and `git diff --check` passes. Android unit-test XML reports
  contain passing native tests with zero failures/errors.
- ADB still lists no connected devices. The next useful validation is installing
  and cold-launching the current QA APK on POCO X4 GT or Pad 7, then checking
  notification taps, searches, and chat/group retries against local emulators.
- Runtime blocker audit: first consecutive turn with no remaining independently
  justified code edit selected and device availability preventing the next gate.
  Goal remains active; a device reconnection question is pending. Redmi remains
  excluded. No production or remote changes were made.

- Runtime blocker recheck: second consecutive goal turn. ADB still lists no
  devices; whitespace validation passes. No new source defect was established,
  and the existing reconnection question remains unanswered. No rebuild or
  speculative edit was performed. Goal remains active pending the next audit.

- Runtime blocker recheck: third consecutive goal turn. A fresh ADB inventory
  is empty and `git diff --check` passes. The next runtime gate cannot proceed
  without an authorized POCO X4 GT or Pad 7 connection. Earlier emulator startup
  attempts failed as recorded above; unchanged attempts were not repeated.
  No independently justified local code fix remains selected. Goal is being
  marked blocked, not complete. Source, QA artifacts, and validation evidence
  are preserved; no push or deployment occurred.

### Resumed physical QA on POCO and Pad 7, 2026-10-18

- Reacquired and identified POCO X4 GT (`Z9GMOVDMHQV8X84D`) and Xiaomi Pad 7
  (`192.168.1.80:38469`). The current QA APK installed with `adb install -r`
  successfully on both, without clearing app data or uninstalling anything.
- Cold-launched both devices. POCO Login and Pad 7 landscape Login screenshots
  render correctly. POCO instrumentation ran successfully: `OK (2 tests)`.
- Started local Auth/Firestore emulators for `demo-campus4change-rules` and
  reversed ports 9099/8080 on each device. Emulator process remains running
  in exec session 45667 for continued QA.
- On POCO, created the local-emulator-only `runtime-poco-1018@example.test`
  account, completed mandatory TIP setup with Computer Science/Manila, and
  observed mixed input `a2` becoming year `2` and `99ab001018` becoming
  Student ID `99001018`. Setup saved and Home loaded.
- Screenshot `/tmp/c4c-poco-after-setup.png` shows the floating verification
  card with inset rounded edges, icon, close action, and view action. Bell
  navigation reaches the matching verification detail and recovery actions.
- Toast tap destination is not yet verified: rapid resend/back/tap attempts
  lacked a confirmed visible toast at the action time. They do not establish
  a product failure. Next use a freshly observed toast before tapping.
- Checked POCO AndroidRuntime/ReactNativeJS error log sample; no error lines
  were returned. The debug warning strip is visible and kept separate from
  the application toast. No production access, remote push, or Redmi testing.

### Fresh-device cloud restore data loss, 2026-10-18

- Applied only the local emulator QA verification code for the POCO account.
  The physical Notifications screen then showed the verified confirmation
  without resend/recheck actions. The first snapshot preceded asynchronous
  completion; the toast destination remains unverified.
- Created a separate local-only Pad QA account and seeded an atomic private
  profile/Student ID claim with the normal authenticated Firebase SDK. On Pad
  sign-in, the app incorrectly showed empty required setup instead of the
  existing cloud profile. Declined the system password-manager save prompt.
- Reproduced the cause in a regression test: `asState(null, account)` generated
  a fresh default and was treated as a cached profile; its new timestamp won
  over the older real cloud state and could queue the default back to cloud.
- Cache absence is now preserved as null. An untouched generated default is
  treated as a placeholder and cannot outrank valid cloud data. Real cached
  state and actual edits retain the timestamp comparison.
- The regression failed before the fix and now passes, including preservation
  of cloud Student ID/name/year, claimed status, local persistence, and no empty
  cloud overwrite. All 318 tests across 40 suites, focused ESLint, and
  `git diff --check` pass.
- The installed QA APK still contains the old restore logic. Next rebuild and
  install the corrected APK, then use a new local fixture account with no device
  cache to repeat the physical test. Do not clear user app data. Auth/Firestore
  emulator exec session 45667 remains running for QA. No production changes.

### Physical fresh-device restore regression passed, 2026-10-18

- Rebuilt the QA APK successfully with the fresh-device restore fix. Temporary
  Firebase/Gradle settings were restored byte-for-byte. Installed with `-r` on
  POCO successfully, preserving prior test-account data.
- Prepared a new local emulator account `restore-check-1018@example.test`,
  never previously used on either device, with cloud state timestamp 100 and
  an atomically claimed test ID. Switched accounts through the app's sign-out
  confirmation, without clearing data.
- POCO reached Home (`Hello, Restored!`) and Profile showed `Restored Cloud
  Student`, `Computer Science • 3`, and `T.I.P. Manila`. Thus existing cloud
  data bypassed empty required setup on a device without this account cache.
- Authenticated emulator read after physical restore verified cloud name,
  Student ID `99003018`, and year `3` remained intact. Screenshot evidence:
  `/tmp/c4c-poco-restored-profile.png` and UI XML
  `/tmp/c4c-poco-restored-profile.xml`.
- One polling helper incorrectly expected the full name in Home's first-name
  greeting and reported a false test failure. The actual UI showed the intended
  first-name greeting; full-name/course/year assertions were then performed
  against Profile and the saved cloud document. No application change was
  needed for the helper's mistaken expectation.
- Pad 7 update transfer of the corrected APK was started and must be collected
  before claiming installation there. Auth/Firestore emulator session 45667
  remains running. Floating-toast tap destination and two-device shared flows
  remain pending. No production operation, push, or Redmi testing occurred.
- Pending Pad transfer handle: exec session 12678; poll this existing handle,
  do not start another transfer solely because output is delayed.

### Floating notification navigation verified physically, 2026-10-18

- Applied only the local restore-check account's emulator email-verification
  code, then triggered the app's verification recheck on POCO.
- Polled UI hierarchy until `Open notification: Email verified` was present,
  returned to Home, and tapped the observed toast bounds. The resulting XML
  contains Notifications and Email verified, with no resend action. The
  end-to-end tap assertion passed with a visible toast rather than fixed delays.
- Evidence: `/tmp/c4c-verified-toast-observed.xml`,
  `/tmp/c4c-verified-toast-opened.xml`, and
  `/tmp/c4c-verified-notification-destination.png`.
- Collected existing Pad install session 12678: success. Cold-launched the
  corrected APK on Pad; it retains the earlier runtime-pad test account and its
  incomplete cached setup. This old fixture's data had already been affected
  before the fix, so it does not prove fresh restoration on Pad. No data clear
  or uninstall was used. Pad AndroidRuntime/ReactNativeJS error sample was empty.
- Both devices now have the corrected APK. Next finish or replace the old Pad
  local fixture through the normal account flow and verify shared two-account
  group/session messaging. Local Auth/Firestore emulators remain in session
  45667; no production services or Redmi were used.

### Two-device group discovery and interrupted runtime QA, 2026-10-18

- Completed the Pad test account through the normal setup form with Computer
  Engineering/Manila, year 2 and test Student ID 99002018. Refreshed its local
  emulator email verification through the app; verified state was observed.
- Created `Runtime Pair QA` (Calculus) through the POCO application UI. Pad's
  Study Groups discovery list showed the shared group with one member and
  not-joined status. Evidence: `/tmp/c4c-pad-discovery.xml` and
  `/tmp/c4c-poco-create-live.xml`. This proves creation/discovery across the
  devices but does not prove membership or messaging.
- Before joining on Pad, the ADB daemon had stopped. Fresh inventory was empty;
  reconnecting the known Pad address returned connection refused. Both authorized
  devices are currently unavailable. The emulator session 45667 is also missing
  and local ports 8080/9099 have no listener. No restart was based on a timeout.
- The next runtime step remains Pad joining and bidirectional chat. Emulator
  fixture data was temporary; recreate local fixtures if not recoverable after
  service restart. No production data was involved. No new code change or build
  was justified by the connection loss.
- Fresh resumed runtime blocker audit: first turn. Goal remains active while
  waiting for device/service availability. Redmi remains excluded.

- Follow-up discovery found Pad's new wireless port 37193. Connected and
  identified it again as `uke_global` (Pad 7); old port 38469 was stale. This
  removes the single-device blocker. POCO remains absent; reconnection question
  is pending. The previous first-turn blocker note is superseded by recovery.
- Restarted the emulator suite only after its old process handle was confirmed
  missing and ports were closed. New live exec session: 14412. Added graceful
  exit export to `/tmp/c4c-qa-emulator-state` for test fixture preservation.
  New emulator instances have no earlier in-memory fixtures.
- Restored Pad ADB reverse mappings for ports 9099/8080. Opened Campus4Change
  directly, without acting on the unrelated foreground application. Pad now
  uses portrait orientation; reacquire bounds before input. Home shows the
  preserved `Pad Runtime QA` profile. Evidence:
  `/tmp/c4c-pad-app-reconnected.xml`.
- Before further shared checks, reauthenticate/recreate local emulator fixtures
  as needed. Do not interpret empty newly restarted emulator data as cloud
  data loss or an application regression. No app data was cleared.

### Cloud restore shared-feed race reproduced, 2026-10-18

- Recreated verified local test clients and a shared group using the actual
  group/message adapters with authenticated emulator SDK connections. Helper:
  `/tmp/c4c-runtime-clients.mjs` (execute via stdin from repo for dependency
  resolution). No production account or database was used.
- Pad signed out through normal confirmation. Its expected unsynced-data alert
  after the old emulator account disappeared was acknowledged. New fixture
  sign-in again showed empty setup and overwrote its local cloud profile.
- Verified installed and current APK SHA-256 were identical:
  `130b95e3c3cd683e1371bfdbdf5752dcb204724bf584b2b64792cf160772378c`.
  Thus this was not an old APK. Pulled APK evidence:
  `/tmp/c4c-pad-installed.apk`.
- A deferred cloud-read test reproduced the remaining race. A `sharedGroups`
  dispatch copies placeholder state without changing its edit timestamp, so
  the first fix's object-identity check wrongly treated it as a genuine edit.
- Placeholder detection now checks absence of a real cache and unchanged edit
  timestamp. Actual edits retain their incremented timestamp; feed-only copies
  do not outrank the saved cloud profile. The new test failed before the fix.
- Focused ESLint and `git diff --check` pass. Full Jest result is collected in
  the following checkpoint. Stopped the Pad app to avoid further writes from
  the older installed code. Rebuild/install and a new unused fixture account
  are required before continuing shared-flow QA. No app data was cleared.
- Emulator session 14412 remains the current local service; POCO is absent.
- Full Jest verification after the shared-feed race fix: 319 tests across
  40 suites passed. Existing newer-local/cache and account-switch tests pass.

### Pad restore race fix and authenticated chat verified, 2026-10-18

- Rebuilt APK successfully with edit-timestamp placeholder detection; original
  Firebase/Gradle source restored byte-for-byte. Signature check and whitespace
  check passed. Installed on Pad without clearing data. Installed SHA-256
  matches local artifact:
  `4c77e6df0195857319ceed26e5c2dbe241e8f0a92f258b6ee07ed6a3eb9af303`.
- Prepared unused `resume-pad2-1018@example.test` local fixture with claimed ID
  99103018. Completed/sign-out of the older fixture through normal app controls.
  Menu navigation was used after the development LogBox overlay blocked tabs.
  Installation and subsequent UI actions were collected sequentially.
- New fixture restored on physical Pad with shared feed active, reaching
  `Hello, Runtime!` instead of empty setup. Authenticated cloud read afterward
  confirmed `Runtime pad2`, Student ID 99103018, and Computer Science intact.
  Evidence: `/tmp/c4c-pad-fresh-restore.xml`.
- Joined `Reconnected Runtime QA` in the app. Membership showed two members,
  and group chat displayed the authenticated owner's message. Sent
  `Pad reply via physical UI.` after dismissing the debug warning overlay.
  Final XML confirms a TextView chat bubble and cleared EditText composer,
  rather than merely finding the draft text in the input.
- Authenticated owner client read the Pad reply using the app-equivalent query:
  moderationStatus == visible, sentAt descending, limit 50. Two initial helper
  queries lacking required constraints were correctly denied; no rule changes
  were made. Both message directions are verified between one physical Pad and
  one authenticated scripted client, not two physical devices.
- Evidence: `/tmp/c4c-pad-chat-final.xml`,
  `/tmp/c4c-pad-confirmed-chat.png`. Emulator session 14412 remains active with
  graceful export configured. POCO remains absent. Connected Redmi was not used.
- Source tests remain at 319 passing across 40 suites. No source changes were
  made in this build/runtime cycle, and no production operation or push occurred.

### Cold-restart chat and recoverable local fixtures, 2026-10-18

- Force-stopped and cold-launched Campus4Change on Pad. It restored the
  signed-in cloud profile and reached `Hello, Runtime!` without account setup.
- Reopened Study Groups, its joined Reconnected Runtime QA group, and group
  chat. Both the owner's message and the physical Pad reply appeared as TextView
  message bubbles after restart. Composer text was excluded from assertions.
  Evidence: `/tmp/c4c-pad-cold-restart.xml` and
  `/tmp/c4c-pad-chat-after-restart.xml`.
- Exported the running demo Auth/Firestore emulators to
  `/tmp/c4c-qa-checkpoint-20261018-chat`. CLI found the local demo emulator hub
  and completed export successfully. Verified Auth and Firestore metadata and
  the presence of both participant test accounts (three local test users total).
  Import/recovery of this export has not been exercised yet.
- Runtime service remains exec session 14412; graceful export target remains
  `/tmp/c4c-qa-emulator-state`. Use the explicit checkpoint above if a later
  service interruption destroys unexported in-memory fixtures.
- No source changed in this cycle; prior 319-test result still applies.
  `git diff --check` passes. Only Pad was controlled; Redmi remained excluded
  and POCO absent. No production access or remote push occurred.

### Physical tutor search, session request and duplicate empty state, 2026-10-18

- Published a local tutor listing through the real tutor adapter. Pad search
  query `computer   science` retained three internal spaces and still displayed
  the Computer Science tutor. Evidence: `/tmp/c4c-pad-search-spaces.xml`.
- Requested Calculus on Pad for Oct 19, 2 PM. Request-sent confirmation named
  the tutor and showed pending status. Authenticated tutor client read the
  pending booking and accepted through `updateTutorBookingStatus`. Pad's
  Upcoming tab then showed the correct tutor, subject and scheduled time.
  Evidence: `/tmp/c4c-pad-request-created.xml` and
  `/tmp/c4c-pad-upcoming.xml`. Counterpart was a scripted authenticated client,
  not a second physical device. All operations used demo emulators.
- Requests became empty after acceptance and physically rendered two competing
  empty states: `No session requests` and `No requests sessions`. The generic
  history empty-state condition included Requests despite its own specific UI.
- Excluded Requests from the generic empty-state block. New regression failed
  before the fix and passes afterward. All 320 tests across 40 suites, focused
  ESLint, and `git diff --check` pass.
- The installed APK predates this small display fix; its physical appearance
  has not been rechecked yet. No production change or remote push occurred.

### Physical accepted-session cancellation and lock release, 2026-10-18

- Opened the accepted Calculus booking on Pad. Session Details showed the
  correct tutor, upcoming status, one-hour schedule, participant chat wording,
  private workspace explanation, and cancellation action.
- Independently authenticated each participant against demo emulators and
  verified the booking was accepted and both half-hour slot documents existed
  for each participant (four lock checks total).
- Cancelled through the app's explicit confirmation dialog. Pad Session Details
  changed to CANCELLED and removed the cancellation action.
- Re-read the booking as each participant and verified cancelled status plus
  absence of each participant's two locks (four release checks). No rules or
  authorization policy changes were needed. Helper:
  `/tmp/c4c-session-lock-check.mjs`.
- Evidence: `/tmp/c4c-pad-session-details.xml`,
  `/tmp/c4c-pad-cancel-dialog.xml`, `/tmp/c4c-pad-session-cancelled.xml`, and
  `/tmp/c4c-pad-cancelled-session.png`. Error-level AndroidRuntime/ReactNativeJS
  log sample returned no lines. `git diff --check` passes.
- No source changed in this cycle; 320 tests remain the last verified suite.
  The Requests duplicate-empty-state source fix still needs the next APK build
  and physical display check. POCO absent; connected Redmi untouched. No push
  or production operation occurred.

### Requests display fix packaged and verified on Pad, 2026-10-18

- Debug assembly and full-project ESLint passed. Build-only Firebase/Gradle
  edits were restored byte-for-byte; source again points to campus4change with
  no emulator host. `git diff --check` passes.
- Updated Pad without clearing data. Installed APK hash matches the local
  signature-verified artifact:
  `20b4ab7d1dcde3e2cea8fe7fff16d0a125d1329d357927f6ff18e95cbb2ccdcb`.
  Embedded bundle contains the demo project and loopback host for local QA.
- Launched the updated app and used the menu to open Sessions, then Requests.
  Physical XML asserts one `No session requests`, no `No requests sessions`,
  and no generic history empty-state explanation.
- Evidence: `/tmp/c4c-pad-requests-fixed.xml` and
  `/tmp/c4c-pad-requests-single-empty.png`. Latest source test result remains
  320 passing across 40 suites; no source changed after that validation.
- Exported current demo fixtures after tutor/booking/cancellation checks to
  `/tmp/c4c-qa-checkpoint-20261018-bookings`. CLI export completed successfully.
  This supersedes the earlier chat-only export for the newest test data; neither
  export's recovery has been exercised. Current emulator exec session: 14412.
- All current source fixes are in the Pad QA APK. POCO's installed artifact
  remains older because it is disconnected. Redmi was not controlled. No push,
  deployment, production database operation, or release publication occurred.

### Isolated emulator checkpoint recovery verified, 2026-10-18

- Imported `/tmp/c4c-qa-checkpoint-20261018-bookings` into a second local
  emulator suite on Auth 9199, Firestore 8180, hub 4501, logging 4601 and
  Firestore websocket 9250. Primary app connections remained on 9099/8080.
- Authenticated both participants after import; verified expected private
  Student IDs, both delivered group messages, cancelled booking state, and
  absence of all four participant slot locks. The recovery script exited 0.
- Isolated emulators shut down cleanly. Verified their ports are closed and
  the original hub on 4400 still reports Auth 9099 and Firestore 8080.
  Primary service session remains 14412.
- Helpers: `/tmp/c4c-recovery-firebase.json` and
  `/tmp/c4c-recovery-check.mjs`. These operate only on local demo fixtures.
  This closes the earlier unverified-import limitation for the bookings export.
- No source or on-device state changed. Last Jest result remains 320 tests
  across 40 suites; `git diff --check` passes. POCO remains absent, Pad is
  connected, and Redmi remains excluded. No production or remote operation.

### Current-state validation gap review, 2026-10-18

- Rechecked branch main, HEAD bfee40c0822e52ea1ab2dce749e631fb77a6813d,
  whitespace validation, source language files and ADB inventory. Worktree
  remains uncommitted as required by preservation/no-publication scope.
- Later runtime evidence supersedes earlier pending notes for Pad install,
  verified toast navigation, whitespace search, shared group chat, accepted
  booking/cancellation, slot release, and Requests empty-state rendering.
  Latest APK includes all current source fixes and was verified installed on Pad.
- Explicit remaining physical gate: update POCO to latest APK and repeat a
  simultaneous two-physical-device shared flow. Current ADB lists Pad and the
  excluded Redmi only; POCO remains absent. The existing reconnection question
  remains pending. Scripted-counterpart results do not satisfy that gate.
- Production deployment, policy changes, release publication and remote pushes
  remain outside this autonomous task's authorization. Dependency audit risks
  already documented have no justified compatible fix selected; no speculative
  downgrade or new feature was introduced to keep execution busy.
- First consecutive runtime-only blocker audit after the completed local and
  Pad cycles. Goal remains active. No further independently justified source
  change was selected in this review, and no redundant test/build was rerun.

- Runtime-only blocker recheck: second consecutive goal turn. Fresh ADB and
  mDNS inventories show Pad and excluded Redmi only, with no POCO USB or wireless
  endpoint. Whitespace validation passes. The existing POCO reconnection
  question remains unanswered. No code edit, rebuild, or excluded-device action
  was justified; the two-physical-device gate remains pending and goal active.

- Runtime-only blocker recheck: third consecutive goal turn. POCO is still absent
  from the current ADB inventory. Pad and excluded Redmi remain available.
  Whitespace checks pass. The remaining latest-APK POCO update and simultaneous
  physical-device shared-flow check cannot proceed without reconnection.
  Goal marked blocked, not complete. Source, current Pad APK, test evidence and
  recoverable emulator checkpoint are preserved. No further mutation performed.

### Resume and partial local service recovery, 2026-10-19

- Re-read the autonomous objective and current checkpoint. POCO is absent from
  fresh ADB/mDNS discovery. Reconnected Pad via its new wireless port 43427 and
  reidentified uke_global. Excluded Redmi remains untouched.
- Previous service session 14412 is missing. Port 9099/Auth and hub were closed;
  Firestore still runs independently on 8080 (observed JVM PID 10446). Kept that
  database process and its current data intact.
- Restored Auth only from the tested bookings checkpoint. New Auth/hub exec
  session: 81574. Auth listens on 9099 and graceful Auth-only export target is
  `/tmp/c4c-auth-recovery-20261019`. Hub now manages Auth only; Firestore remains
  the separately running process, so future full exports must account for this.
- Restored Pad port reverse mappings for 9099/8080. Both participant SDK reads
  again verified cancelled booking and all four released slots. Pad cold launch
  restored the saved test profile (`Hello, Runtime!`). Evidence:
  `/tmp/c4c-pad-auth-recovery-20261019.xml`.
- No source changes or redundant build/test reruns; 320-test checkpoint remains.
  Whitespace checks pass. POCO update and simultaneous physical shared flow
  remain pending; resumed blocker audit starts fresh, not at the earlier count.
  No production action, remote push, app-data clear, or Redmi interaction.

- Resumed blocker audit, second consecutive turn: current ADB/mDNS inventories
  still contain Pad and excluded Redmi only. POCO has no discovered endpoint.
  Whitespace validation passes. Auth recovery from the previous turn is complete;
  no additional independent fix or resource recovery is selected. Latest POCO
  install and simultaneous two-device test remain pending. Goal remains active.

- Resumed blocker audit, third consecutive turn: fresh ADB inventory still lacks
  POCO. Pad is connected; Redmi is excluded. Whitespace validation passes.
  No remaining independently justified local edit or recovery is selected.
  Marked goal blocked at latest-APK POCO update and simultaneous physical
  shared-flow verification. All work/checkpoints remain preserved; no publication.

### Autonomous improvement cycle completed, 2026-10-19

- Confirmed the requested devices via ADB: POCO X4 GT USB and Pad 7 wireless.
  `android-wireless-connect` reconnected Pad on its changed mDNS endpoint. Redmi
  appeared in the broad ADB inventory but was never targeted or tested.
- Installed the current debug QA APK on POCO without clearing data. Verified
  both installed APK SHA-256 hashes match the local build:
  `20b4ab7d1dcde3e2cea8fe7fff16d0a125d1329d357927f6ff18e95cbb2ccdcb`.
- Re-ran the full current JavaScript suite and full-project lint: 320 tests
  passed across 40 suites, ESLint exited 0. `git diff --check` passed.
- Physical two-device test passed with verified demo accounts: POCO-created
  shared group appeared on Pad; Pad joined; each device displayed the other's
  group message. Latest APK artifact hashes match on both devices.
- Other verified completion evidence remains above: fresh-device cloud-profile
  restore against a shared-feed race, floating notification destination, search
  whitespace behavior, bookings accepted and cancelled, all four slot locks
  released, and the Requests empty-state fix shown on the Pad.
- Recovered emulator export was imported in isolation and checked, and the
  final local Auth/Firestore state was exported under the durable user-state
  checkpoint directory. Production services, security policy, release
  publication, git push and Redmi were untouched.
- Branch remains `main` at bfee40c0822e52ea1ab2dce749e631fb77a6813d. The
  pre-existing/local dirty worktree is preserved and uncommitted. No further
  independently justified safe change was selected after the final audit.
  The requested autonomous improvement cycle is complete; this does not claim
  that uncommitted changes were released or deployed.

### Completion audit resumed, 2026-10-20

- Re-read the full autonomous completion objective and preserved the existing
  `main` worktree changes. This goal authorizes a reviewed push after the
  required checks; no production deployment is authorized.
- Read the live Firestore Rules API without writing to production. The active
  default release still points to the v1.2.2 ruleset. Its source differs from
  the local Student ID claim rules. The six live composite indexes match the
  checked-in index definitions and all report `READY`.
- Installed the 1.3.0 emulator QA build in place on the POCO X4 GT and Pad 7,
  preserving app data. Both installed APKs match SHA-256
  `19989c2c50de7cbc532df1114aefc350986553e74a2c790dbac2db2530c550ba`, use the
  workstation's private debug certificate, and report version code 6,
  version 1.3.0. Both devices cold-launched and displayed About version 1.3.0.
- Reproduced a stale About version in the first 1.3.0 APK: Android package
  metadata was current while Metro's cached bundle still showed 1.2.2. Added
  `package.json` and `firebaseConfig.js` as explicit inputs to every React
  Native bundle task. The debug and release JavaScript bundle tasks then ran
  again; both include the 1.3.0 version, and the QA build embeds only the local
  demo project while restoring the production config byte-for-byte.
- Verified Settings, About, Notifications, group details, the group session,
  and group chat on both devices. Closing the React Native debug warning overlay
  exposed the Pad's bottom group-chat link. A message sent from the Pad appeared
  on the POCO. No source defect was found in that link.
- Updated the existing Figma Settings and About frames to show version 1.3.0.
  The About frame now describes private Firestore state, local recovery,
  verified-email sharing, and the current TIP setup. The Settings and About
  frames were visually checked after editing.
- A clean `npm ci` installed 1,148 packages. Jest passed 320 tests across 40
  suites, ESLint passed, the public Drive-link check passed, and Android unit
  tests plus instrumentation-test compilation passed. The release JavaScript
  bundle and Kotlin compilation passed. Four dependency install scripts were blocked
  by npm's allow-scripts policy; the tested build and test commands still passed.
- An isolated local emulator suite passed the Firestore rules/offline-state,
  booking-overlap, actual group-client adapter, and Auth verification scripts.
  It used separate ports from the active phone/tablet emulator fixture. Markdown
  links, `git diff --check`, and the source secret-pattern scan passed.
- `npm audit --omit=dev` reports 20 high paths and zero critical. The paths lead
  to `braces@3.0.3` in Metro tooling. The GitHub advisory has no patched release,
  and the suggested fix downgrades React Native and the CLI. The release bundle
  source map contains none of `braces`, `micromatch`, or `fast-glob` as bundled
  modules. No unsafe override or downgrade was applied.
- A current signed APK/AAB remains unavailable because the existing release
  keystores require passwords that are not present in this shell. No password
  was requested, guessed, or written. The signed v1.2.2 release remains the
  latest published artifact and does not contain the 1.3.0 source.
- Pushed the reviewed source to `origin/main` as `64c9192`; the remote points to
  the same SHA. GitHub Actions run
  [39307945009](https://github.com/Patt-00/Campus4Change/actions/runs/39307945009)
  passed all jobs, including the clean install, Jest, lint, emulator suites,
  Android tests/builds, and the release-signing guard. The push did not modify
  production Firebase. Only the POCO and Pad were tested; Redmi appeared in ADB
  discovery but was not targeted.
- The completion audit and historical v1.2.2 banner were pushed in the
  documentation-only commit `7642785`. GitHub Actions run
  [39309821674](https://github.com/Patt-00/Campus4Change/actions/runs/39309821674)
  passed on that commit.
- On Pad 7, Edit Profile showed the TIP campus selector, the Student ID field,
  and no School field. The picker exposed Quezon City and Manila. Changing the
  avatar and pressing Back opened the discard confirmation; Keep editing and
  Discard changes both worked. No profile edit was saved.
- A temporary API 24 emulator image was installed to test the legacy password
  hash provider, but its AVD requested 7.37 GB of free space while the volume
  had 5 GB available. The AVD did not boot. Its temporary files and SDK image
  were removed; API 24 runtime behavior remains unverified.

### Touch target accessibility audit, 2026-10-20

- Physical accessibility snapshots on the POCO X4 GT and Pad 7 reproduced
  undersized targets between 40 and 46.5 dp in shared controls, topic chips,
  search inputs, menu links, session filters, and notification actions. The
  clickable controls in the sampled routes already had accessible labels.
- Android recommends a 48 dp by 48 dp focusable or touch area for interactive
  elements in touch interfaces ([accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/apps)).
  Shared input, chip, and link styles and the affected header, home, picker,
  notification, saved-interest, and onboarding controls now use 48 dp minimums.
- Jest passed 320 tests across 40 suites, ESLint passed, and `git diff --check`
  passed. The emulator-only QA APK assembled successfully with hash
  `87f7b20f623115c76f8905de90305d751b1a669c3fe9cad30b9d5836b74b1edd` and the
  installed debug certificate `688f332c76200bc27d097a65ef4b48366596c790e89e08a43625354239f37082`.
  Its Firebase configuration targets only the local demo emulator and was
  restored byte-for-byte after the build.
- The QA APK was installed in place on the POCO and Pad, preserving app data.
  Both cold-launched version 1.3.0. A route sweep checked Home, Sessions,
  Create, Messages, Profile, Edit Profile, Tutor Search, Be a Tutor, the menu,
  Study Groups, Settings, Preferences, About, and Notifications on both devices.
  No unlabeled clickable control appeared. Fully visible controls met the
  48 dp layout minimum; smaller accessibility bounds were rows clipped by the
  scroll viewport or one-pixel density rounding. Scrolling revealed full-size
  topic controls on both devices. No profile, interest, booking, or group change
  was submitted.
- Further physical checks covered Group Details, Group Session, and group chat
  on both devices, plus the owner-only Group Reports view on the POCO. Every
  visible action had an accessible label and a full-size target. On the Pad,
  the group-chat link appeared after scrolling the details page. The QA group
  had no posts, so the Group Post route could not be opened. No post, reply,
  report, membership action, chat message, or session note was submitted.
- On both devices, the profile photo presets, TIP program picker, and campus
  picker opened without saving changes. After scrolling, fully visible course
  rows measured at least 55.7 dp on the POCO and 55.8 dp on the Pad. The picker
  exposed Quezon City and Manila.
- A source scan of 37 direct React Native pressables found no control without an
  explicit accessibility label or static text. A contrast spot check measured
  at least 4.88:1 for sampled text pairs and 3.56:1 for the Google mark on white.
  This does not verify screen-reader focus order or every dynamic screen state.
- The React Native development warning overlay appeared on cold launch and was
  dismissed for testing. It is debug-build UI; a signed release was not built
  or checked in this cycle. Emulator QA data and source configuration remained
  separate from production Firebase.
- The nine-file source change and this progress entry remain uncommitted on
  local `main` under the no-push task boundary. The two audit-document changes
  are also local. GitHub CI run `39311400891` passed on the preceding `ba7961c`
  commit, so it does not cover this source change. The repository completion
  estimate was adjusted to account for the pending GitHub synchronization and
  CI gate.

### Dependency advisory recheck, 2026-10-20

- `npm audit --omit=dev` still reports 20 high paths and zero critical paths.
  Each reported path resolves to `braces@3.0.3` through
  `cli-platform-android -> fast-glob -> micromatch`. The current npm package
  page still lists 3.0.3 as latest, and the [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  lists no patched version.
- The automatic audit fix proposes `@react-native-community/cli@13.5.1`. The
  project uses CLI 20.2.0 and React Native 0.87.1. The [CLI compatibility
  table](https://github.com/react-native-community/cli#compatibility) documents
  CLI 20 with React Native 0.81 through 0.85 and advises against independent
  CLI updates. The installed combination builds and passes CI, but React Native
  0.87.1 is outside that published compatibility range.
- No downgrade or dependency override was applied. Recheck when braces publishes
  a patched version or the CLI project documents support for the installed
  React Native version.

### QA debug startup and memory baseline, 2026-10-20

- Measured three process-cold launches per device using the same installed
  emulator-only QA APK, version 1.3.0, without clearing app data. Both local
  Firebase emulators returned HTTP 200, and ADB reverse mappings for ports
  9099 and 8080 were active.
- ActivityManager `TotalTime` was 530-539 ms on the POCO X4 GT (median 538 ms)
  and 689-788 ms on the Pad 7 (median 729 ms). Home first appeared in an
  accessibility-tree snapshot at 4.417-4.714 seconds on the POCO (median
  4.688 seconds) and 4.328-4.775 seconds on the Pad (median 4.573 seconds).
  Those Home observations include the ADB and UIAutomator dump time and are
  upper bounds, not direct render-time measurements.
- After five seconds at Home, `dumpsys meminfo` reported 156,593 KB total PSS
  on the POCO and 262,856 KB on the Pad. The POCO was charging at 14% battery
  and 25.0 C; the Pad was at 59% and 28.0 C. Android versions were 14/API 34
  and 16/API 36, respectively.
- These are three-run debug-build baselines, not release measurements. The
  project has no startup or memory acceptance thresholds, so this does not
  establish that release performance is acceptable. No code changed in this
  cycle. Both apps remain on Home; no data was cleared or modified.

### API 24 runtime retry, 2026-10-20

- The SDK repository lists the default x86_64 API 24 image as a 419,261,998
  byte archive. It was installed in a temporary SDK root under `/tmp`; the
  expanded system image used 3.1 GB. A minimal AVD used a 768 MB data partition
  and passed the emulator disk-compatibility check.
- The Android Emulator exited with code 139 before API 24 reached boot
  completion. The same result occurred with the default SwiftShader path and
  the software renderer. `emulator-5556` never reached a usable ADB state, so
  the password-hash instrumentation tests were not run.
- Removed the temporary SDK image, AVD files, and emulator artifacts. The two
  pre-existing AVDs remain listed, `/tmp` has 5.3 GB free, and the home volume
  has 7.5 GB free. No project source, production Firebase setting, physical
  device data, or existing AVD data changed. API 24 runtime behavior remains
  unverified.

### Clean worktree rebuild and native checks, 2026-10-20

- Created an isolated detached worktree at `ba7961c` and applied the exact
  current 11-file local diff. A fresh `npm ci` installed 1,148 packages. Jest
  passed 320 tests across 40 suites, ESLint passed, and the public Drive-link
  check passed.
- From that clean copy, `android:qa-emulators` built an emulator-only APK.
  The package remained `com.campus4change` version 1.3.0 with min SDK 24, target
  SDK 36, and the same workstation debug certificate used by the installed
  builds. The bundle contained the demo Firebase project and loopback host; the
  build script restored the production Firebase config byte-for-byte.
- `testDebugUnitTest` passed 16 tests with no failures, and
  `assembleDebugAndroidTest` compiled the instrumentation APK. The clean APK
  SHA-256 was `c345968474a30aea38718eefc9eff5dce71a4321421c80833fb2135509ea7f02`;
  the earlier main-worktree QA APK hash is different. The two bundles have the
  same code bytes, with differences only in the 20-byte Hermes header hash and
  20-byte footer hash. The eight generated native libraries differ only in
  their 20-byte ELF build IDs; all other APK entries are content-identical.
  The APK can be rebuilt cleanly, but the artifacts are not byte-for-byte
  identical.
- The clean worktree, its build outputs, and the temporary patch were removed
  after verification. The user's main worktree and existing device installs
  were left unchanged. GitHub CI still covers `ba7961c`, not the local diff.

### Production rules parity recheck, 2026-10-20

- A read-only Firebase CLI project lookup succeeded. The Firestore Rules API
  still points the default release to
  `projects/campus4change/rulesets/4f66efb8-d8d6-404c-83be-8a2b7b37588a`, last
  updated `2026-10-17T09:33:15.974367Z`. Its source hash remains
  `867e1b314fb639608ef4fe6978892ee6d337536be27a65b01b76c066679ec0a8`; local
  `firestore.rules` remains `25f0ec68a34ce0eb1964164dfa7fb9139413d99fa0ca1a5f323236bf4e302323`.
- The active production rules still omit `studentIdClaims`, while local rules
  include it. This recheck made no production writes or authorization changes.

### Release signing environment recheck, 2026-10-20

- A read-only environment check found all four `C4C_RELEASE_*` variables absent.
  The release keystore files exist locally, but their passwords are not
  available in this build environment. No key material was read, no password
  was guessed, and no signed release build was attempted.

### GitHub publication and source preview, 2026-10-20

- Published the 48 dp touch-target changes and audit records to `main` in
  commit `f5823c900c16cc7bf7870562ec5a6c7d730e8a2d`. GitHub Actions run
  [39321845339](https://github.com/Patt-00/Campus4Change/actions/runs/39321845339)
  passed Jest, lint, public Drive-link scanning, Android unit tests,
  instrumentation compilation, Firebase Auth/Firestore emulator tests,
  production bundle and release Kotlin compilation, debug APK assembly, and
  the dedicated-signing fail-closed check.
- Published [v1.3.0-preview.1](https://github.com/Patt-00/Campus4Change/releases/tag/v1.3.0-preview.1)
  as a GitHub pre-release on the same commit. It is a source-only preview with
  no APK or AAB. The latest signed, installable release remains v1.2.2 because
  release signing credentials were unavailable. The pre-release notes call out
  the production `studentIdClaims` mismatch and the unverified release-key
  Google sign-in and Play Integrity App Check.
- The publication did not deploy Firestore rules, change production data, or
  alter authorization settings. The GitHub `main` push and pre-release were
  explicitly authorized for this work.

### API 24 instrumentation and current device scope, 2026-10-20

- GitHub Actions run
  [39366032936](https://github.com/Patt-00/Campus4Change/actions/runs/39366032936)
  passed on `46fe89a534d98866dc981ef11fe64f24151e8bf4`, including its regular
  checks job and the API 24 instrumentation job. The hosted Android 7.0
  emulator completed both password-hash instrumentation tests with zero
  skips or failures: the current PBKDF2-HMAC-SHA256 vector and legacy
  PBKDF2-HMAC-SHA1 verification/migration. This verifies the password-provider
  path at API 24, not the full application UI or route behavior.
- Local x86 and x86_64 API 24 emulator attempts exited with code 139 before
  boot. The temporary `C4C_API24_X86` AVD was deleted, the installed SDK
  package list contains no API 24 system image, and `/tmp` has 5.2 GB free.
  The existing API 36 AVD remains available. The ADB inventory lists only the
  POCO X4 GT over USB; the Pad 7 is unavailable for this cycle, so no new tablet
  interaction was attempted. Redmi was not targeted.
- `COMPLETION_AUDIT.md` now records 88.5% completion, adding 0.5 points for the
  new minimum-API provider evidence while keeping full API 24 app coverage,
  production rules parity, dependency risk, signing, and presentation gaps
  open. No application data or production Firebase setting changed.

### POCO route review and group reply-count correction, 2026-10-20

- The POCO X4 GT was the only connected device. The installed app was version
  1.3.0, version code 6, Android 14/API 34, at 1080 by 2460 pixels and 345 dpi.
  Read-only route checks covered Home, Find People, Upcoming and Requests,
  Messages, Profile, Edit Profile, Settings, Learning Preferences, About,
  Study Groups, and Group Details. Sampled controls met or exceeded 48 dp.
  No profile edit, group membership change, post, or booking was submitted.
- Group Details reproduced “1 replies” for a post with one reply. The source
  now uses singular “reply” for exactly one known reply and plural “replies”
  for zero, multiple, or partially loaded replies. The first group-screen run
  had one unrelated large-list test exceed Jest's 5-second default timeout;
  rerunning with a 15-second timeout passed all 9 tests. ESLint passed for the
  changed screen.
- `android:qa-emulators` built the 1.3.0, version-code-6, min-API-24 debug APK
  successfully with the same certificate as the POCO installation. The APK
  SHA-256 is `8ea2b173427b28ffdce69070905f4e9e4fd3863a9238461ec802585c3996a80a`.
  Its bundle targets `demo-campus4change-rules` at `127.0.0.1`; the build helper
  restored the production Firebase config byte-for-byte. `adb install -r`
  updated only the POCO and preserved app data.
- After cold launch, the app showed Account Setup with the existing profile
  fields and a Firestore connection warning. Local ports 8080 and 9099 had no
  listener, and this QA APK uses the local emulator configuration. No Save
  action was taken. That prevented reopening the existing QA group for a
  post-fix visual check. The fix is verified by focused tests and packaging,
  but not yet by the updated physical UI. No production data or settings
  changed, and Pad 7 remained unused.

### Offline Student ID claim recovery, 2026-10-20

- The POCO showed account setup for an existing profile after Firebase could
  not confirm its Student ID claim. `AppNavigator` required a `claimed` result
  but rendered the editable setup form for the `unknown` state. That exposed a
  Save button that could not succeed while Firestore was unreachable.
- The app now presents a read-only verification-unavailable screen for an
  existing Firebase profile in the `unknown` state. Its Retry Verification
  action repeats only the claim read. A confirmed claim returns the account to
  Home; an unclaimed result keeps the setup form available for correction; a
  failed check remains on the retry screen. The uniqueness gate stays
  fail-closed.
- Focused claim-hook and profile-screen tests passed (24 tests across two
  suites). The full local Jest suite passed 322 tests across 40 suites, and
  full-project ESLint passed. `android:qa-emulators` built the 1.3.0,
  version-code-6, min-API-24 APK successfully; SHA-256 is
  `eec6430cc09f9bc2230349c5e3862555c8a0d4261542b194ea6adf8e15582e3e`. Its
  signing certificate matched the POCO's installed debug key, and the QA
  Firebase config was restored byte-for-byte after the build.
- `adb install -r` updated only the POCO and preserved app data. On cold launch,
  the device displayed Verify your account, the unavailable-state explanation,
  and Retry Verification. The setup fields and Save action were absent. Tapping
  Retry while Firestore ports 8080 and 9099 were closed left the account on the
  verification screen. The action performs only the claim read; no profile or
  production data was written. The updated physical UI confirms this offline
  state, while successful online recovery still has hook-test evidence only.
- Group Details remains inaccessible on the POCO until a matching QA Firebase
  claim is available, so the group reply-count correction still lacks a
  post-fix physical screen check. Pad 7 remains unavailable and was not used.
  No production authorization or data changed.

### Release-bundle and dependency review, 2026-10-20

- `./gradlew --no-daemon :app:createBundleReleaseJsAndAssets` succeeded on the
  current source. It created a 2,804,684-byte production JavaScript bundle with
  SHA-256 `cb3ea8db4d7d06b58c79f4b9cf8a4204835b2c91378df99ff3b8b4db8dadb7dc`.
  The release source map contains 658 source paths and no module paths for
  `braces`, `micromatch`, or `fast-glob`. The bundle source map confirms the
  production Firebase project setting and an empty emulator host. The literal
  `127.0.0.1` also appears in Firebase SDK and package metadata sources, so its
  presence in a raw string scan alone does not show active emulator routing.
  This was a JavaScript bundle task only; no signed APK/AAB was produced.
- A fresh `npm audit --omit=dev` still reports 20 high paths and zero critical.
  `npm explain braces` traces the paths through CLI 20.2.0 and Metro 0.87.1 to
  `braces@3.0.3`. npm still marks 3.0.3 latest, and the GitHub advisory lists
  no patched version. npm's suggested fixes downgrade React Native to 0.72.17
  or CLI to 13.5.1. The official CLI 20 compatibility table ends at React
  Native 0.85; this project uses 0.87.1. No downgrade or override was applied.
- A read-only signing-environment recheck found all four `C4C_RELEASE_*`
  variables unset. The local release-keystore file is present; no key content
  was read and no password was guessed or attempted. A signed APK/AAB remains
  unavailable in this shell.
- `GroupStudyRoomScreen` and its focused test confirm the meetup, agenda, and
  notes interface has no focus timer. A fresh physical Session Room check was
  not possible because the POCO remains on claim verification while the QA
  Firebase emulator is offline.
- I attempted to locate the existing Figma target through local project notes
  and the connected browser surface. No Figma URL or file key is recorded, and
  the available browser adapter could not open Brave. I did not mutate a Figma
  file; the existing design link is still needed to sync the latest UI states.
- `COMPLETION_AUDIT.md` now reports 87.5%, reflecting that the verified local
  changes are not in GitHub CI or on remote `main` under the no-push instruction.
  Production Student ID rule parity,
  release signing, full all-route/tablet QA, post-fix Group Details verification,
  dependency remediation, and presentation rehearsal remain open. No production
  operation was performed, and no changes were pushed.

### Local Auth and Firestore regression suites, 2026-10-20

- With the Auth and Firestore emulator ports closed, a fresh
  `demo-campus4change-rules` emulator session ran the four CI suites:
  Firestore rules, booking overlap, group-client rules, and Firebase Auth
  verification. `emulators:exec` exited 0 after all chained commands passed and
  shut the emulator processes down. No production project or rules were used.
- Existing ADB reverse mappings for ports 9099 and 8080 connected the POCO to
  the disposable emulator session. The POCO stayed on Verify your account with
  Retry Verification visible; the setup form and Save action remained absent.
  No profile edit was submitted. After shutdown, the emulator ports were closed
  again, and the app's local profile remained unchanged.

### Explicit Home handoff after Student ID claim recovery, 2026-10-20

- The retry screen now explicitly calls account-setup completion when the claim
  check returns `claimed`, avoiding reliance on the parent's later route effect.
  A screen test covers the Home completion callback; a hook test verifies that
  retry updates the active account to `claimed` without writing profile data.
- Focused hook/profile suites passed 25 tests; the full Jest suite passed 323
  tests across 40 suites; full ESLint passed. The latest debug QA build is
  version 1.3.0, version code 6, min API 24, signed with the matching POCO debug
  certificate. Its SHA-256 is
  `9c49b1635dd6dd6b8e1f3904816d3c353b721af882f5ea852932e9cd0c90e27a`.
- `adb install -r` updated only the POCO and preserved app data. Cold launch
  shows the read-only claim-retry screen while the local Auth/Firestore
  emulators are stopped. Retry remains on that screen without exposing setup
  fields or Save. The success callback has hook/screen-test evidence, while
  online recovery remains unverified on a device.
- A force-stop followed by a cold launch returned to the same verification
  screen. No profile edit or Save action was taken, and no app data was cleared.
- A production JavaScript bundle was rebuilt after this change with
  `:app:createBundleReleaseJsAndAssets`. It succeeded using the production
  Firebase project and empty emulator host. The bundle is 2,804,788 bytes with
  SHA-256 `ed78aa9570364b40b3e237dc447582ca58e0c606ccfd96068371e9592aff0a72`.
  The source map contains no `braces`, `micromatch`, or `fast-glob` module paths.
  This task does not produce a signed APK/AAB. No production operation or
  GitHub push occurred.

### Branded Android launch and restore screens, 2026-10-20

- The manifest used `AppTheme` directly on `MainActivity`, so the native launch
  theme had no Campus4Change image. The activity now installs AndroidX Core
  SplashScreen with the existing education-emblem launcher asset; API 31+
  selects the adaptive launcher icon and API 24-30 use its foreground image.
  The React Native account-restore/loading screen now displays the full logo.
- The POCO X4 GT cold-launch capture showed the emblem on the system splash and
  the full Campus4Change logo on the following Restore your account screen.
  This physically verifies the branded start path on Android 14/API 34. The QA
  app then reaches its read-only claim-retry screen because local Firebase
  emulators are stopped.
- `android:qa-emulators` built the current 1.3.0, version-code-6 APK; SHA-256
  `895a6353efe20de37437654d591737bd834549ecca183eedad475663c1b7803c`. Its
  debug certificate matches the POCO installation; `adb install -r` preserved
  app data. `:app:testDebugUnitTest` and `:app:assembleDebugAndroidTest` both
  completed successfully. The new splash library and resource theme compile.
  No release APK/AAB was signed.

### Production JavaScript bundle after launch branding, 2026-10-20

- Rebuilt `:app:createBundleReleaseJsAndAssets` on the current worktree after
  adding the full logo to the restore screen. The task succeeded. The resulting
  2,804,916-byte bundle has SHA-256
  `1745541d7d4cdfc9dc67b32674b5fedadd55c5fac946872c973f57e8733a17e0`.
- Its source map confirms the production Firebase project ID, an empty
  emulator host, and no demo project ID. It contains 658 source paths and no
  `braces`, `micromatch`, or `fast-glob` module paths. This verifies release
  JavaScript bundling only; a signed APK/AAB remains unavailable.
- The native splash uses AndroidX Core SplashScreen 1.2.0, whose official
  compatibility support includes API 23 and later. The POCO visual check is on
  API 34; the minimum API 24 splash presentation has not been visually tested.

### POCO app removal and reinstall restriction, 2026-10-20

- After `:app:connectedDebugAndroidTest` finished, PackageManager no longer
  listed `com.campus4change`. A fresh `adb install` of the verified 1.3.0 QA
  APK returned `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`.
  Developer Options shows the `Install via USB` toggle off, and the Xiaomi
  Security Center page lists the rejected Campus4Change install request. The
  app is currently absent from the POCO.
- A local Firebase export with two Auth accounts exists at
  `/tmp/c4c-audit-emulator-export-20261019`, but it cannot restore Android
  app-private encrypted storage. The prior QA profile/cache may have been
  removed with the package. I did not clear additional data, alter the separate
  USB debugging security toggle, or access production Firebase.
- Reinstalling requires restoring the authorized Install via USB setting and
  accepting the Xiaomi package-install confirmation on the POCO. No further
  install attempts were made after the explicit user restriction result.

### POCO verification-screen accessibility check, 2026-10-20

- An Android accessibility-hierarchy read of the current POCO screen confirms
  the Retry Verification control is exposed as a clickable labeled button. At
  the phone's current 345 dpi density override, its target measures 48.2 dp
  high, above the 48 dp target size used in the audit. No profile interaction
  was performed.

### Resume checkpoint after Pad 7 became unavailable, 2026-10-20

- The user confirmed the Pad 7 is unavailable for now. A fresh `adb devices -l`
  lists only the POCO X4 GT over USB (serial `Z9GMOVDMHQV8X84D`); the Redmi
  remains excluded. The Campus4Change package is absent from the POCO. I did
  not retry installation after Xiaomi previously returned
  `INSTALL_FAILED_USER_RESTRICTED` while Install via USB was off.
- On the preserved local worktree, `npm test -- --runInBand --testTimeout=15000`
  passed 323 tests across 40 suites, `npm run lint` passed,
  `npm run check:public-drive-links` passed, and `git diff --check` passed.
  These checks do not replace the pending POCO UI rerun or unavailable tablet
  checks.
- No source behavior changed in this checkpoint. Completion remains 87.5%;
  current device installation, the tablet sweep, production-rule parity,
  signed-release verification, current-source GitHub CI/synchronization, and
  presentation rehearsal remain open. No commit, push, or production change
  occurred.

### POCO-compatible emulator-QA package rebuild, 2026-10-20

- Rebuilt the current debug QA APK with
  `C4C_DEBUG_STORE_FILE=/home/patt/.android/debug.keystore npm run android:qa-emulators`.
  Gradle completed `:app:assembleDebug` successfully, and the helper restored
  `src/shared/backend/firebaseConfig.js` byte-for-byte (SHA-256
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`).
- The final APK is version 1.3.0, version code 6, min API 24, target API 36,
  SHA-256 `57d65e63269a42a7be3369384da9e2775f85d51ee2476c7014c35e3eadfdb26f`.
  `apksigner` verifies its certificate fingerprint as
  `688f332c76200bc27d097a65ef4b48366596c790e89e08a43625354239f37082`,
  matching the previously verified POCO debug identity. The packaged JS bundle
  contains `demo-campus4change-rules`, confirming it targets only the local
  emulator project. `aapt dump badging` resolves the application label and
  adaptive launcher icon; the APK contains the foreground, monochrome, and
  density-specific launcher resources.
- The first build in this cycle used the repository's generic debug key; its
  certificate did not match the POCO identity. I replaced that output with the
  correctly signed APK above. The POCO package remains absent, and I did not
  attempt installation while Xiaomi's Install via USB restriction is active.
  This is a debug QA artifact, not a signed release or production build.

### Focused review of current local changes, 2026-10-20

- Reviewed the Student ID claim retry path from `useCampusSession` through
  `AppNavigator` into account setup, along with the group reply-count wording
  and native splash resources. No actionable correctness issue was identified
  in these changed paths.
- The focused profile, session-state, and group-screen suites passed 34 tests
  across three suites. Full ESLint passed. This is source and test evidence;
  it does not replace physical runtime verification.
- POCO runtime verification remains pending because Campus4Change is
  uninstalled and Xiaomi's USB-install restriction remains active. Pad 7 is
  unavailable. No source behavior or production configuration changed.
- A fresh read-only POCO screenshot shows Xiaomi's Install via USB page with
  “Rejected Campus4Change installation request” and “No apps.” ADB still finds
  no installed `com.campus4change` package. No security setting was changed.

### Dependency advisory recheck, 2026-10-20

- A fresh `npm audit --omit=dev` still reports 20 high-severity paths and no
  critical findings, all rooted in `braces@3.0.3` through React Native CLI and
  Metro. The installed production JavaScript source map has 653 source paths
  and no `braces`, `micromatch`, or `fast-glob` modules.
- The [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  still marks versions through 3.0.3 affected and lists no patched release;
  [npm](https://www.npmjs.com/package/braces) still marks 3.0.3 as latest.
  CLI 20's [compatibility table](https://github.com/react-native-community/cli#compatibility)
  lists React Native through 0.85, while this app uses 0.87.1. npm's forced
  repair would downgrade React Native to 0.72.17.
- A 9,601-character nested-pattern check completed under the local Node
  v24.21.0 runtime without throwing. The advisory reports reproduction under
  Node 26.5.0, so this local result does not clear the report. No dependency
  override or unmerged upstream patch was introduced.

### React Native and CLI version pairing check, 2026-10-20

- The published `@react-native-community/template@0.87.1` package contains
  `@react-native-community/cli`, `cli-platform-android`, and
  `cli-platform-ios` at 20.2.0. The current project uses the same versions with
  React Native 0.87.1. The CLI compatibility table lists through 0.85, but the
  official 0.87.1 template directly confirms this project pairing.
- npm and the CLI release page report 20.2.0 as the latest stable CLI; the
  project's existing QA and release bundle builds succeed with it. No CLI
  upgrade or downgrade is needed. This resolves the compatibility-table concern
  without changing `package.json` or `package-lock.json`; the `braces` advisory
  remains a separate unresolved tooling risk.
- A live CLI smoke check returned `20.2.0`; `npx react-native config` resolved
  the repository root, Android application ID `com.campus4change`, and
  `react-native-safe-area-context` autolinking without error.

### Group reply-count regression coverage, 2026-10-20

- Added a screen-level regression test that reads each group post card and
  verifies one reply renders as “1 reply” while two replies render as
  “2 replies.” The targeted test passed, then the full `groupScreens` suite
  passed 10 tests.
- The full Jest suite now passes 324 tests across 40 suites, and ESLint passes.
  No app behavior changed in this test-only update. POCO post-fix visual
  verification remains unavailable because the app is uninstalled and Xiaomi's
  USB-install request is still rejected.

### Figma account-restore and claim-recovery states, 2026-10-20

- The existing prototype file was located from the README reference and opened
  through the connected Figma tools. Its current `Campus4Change Prototype`
  page contains the existing Account Setup screen; local Inter styles and
  color, radius, and button variables are available in the same file.
- Added frame `27 Account Restore` (`227:39`) using the existing Campus4Change
  logo and token-bound cyan loading indicator, with the centered
  “Restoring your account...” message. Added frame `28 Student ID Verification
  Unavailable` (`226:39`) with the implementation's read-only explanation and
  retry action, without setup fields or a Save action.
- Both 390-by-844 frames remain editable layers. Figma screenshots were
  inspected after composition. The restore label was centered in a visual
  correction; the final restore and verification screens now match the current
  code states. The retry outcome is left as a state reference because it
  depends on Firebase returning claimed, unclaimed, or still unknown.
- Updated [FIGMA_COVERAGE.md](docs/FIGMA_COVERAGE.md) and the completion audit.
  This closes the missing-frame gap for these two states; all-route pixel
  parity, POCO post-fix Group Details, and Group Post checks remain open.

### Profile photo camera permission and verification checkpoint, 2026-10-20

- Added opt-in camera capture to profile-photo editing while keeping the system
  photo picker and built-in avatars available. The Android module requests the
  runtime camera permission only after the user taps the camera action, captures
  through a cache-only FileProvider URI, and saves the image through the
  existing app-private profile-photo flow. Cancellation and permission denial
  retain the alternate photo choices.
- The focused profile-avatar suite passes 4 tests; the full Jest suite passes
  328 tests across 40 suites, ESLint passes, and Android `assembleDebug` passes.
  Firebase Auth, Firestore rules/offline persistence, booking-overlap, and group
  client-rules emulator suites also pass against the disposable local project.
- Runtime camera testing remains open: the new API 36 AVD exited with code 139
  before Android boot, the POCO is not currently installed with the app, and the
  Pad 7 is unavailable. Redmi devices appeared in ADB but were not used.
- The completion estimate remains 87.5% because this new camera path has not
  been observed at runtime, the current source is not covered by GitHub CI, and
  the production Firestore rules, signed release, dependency advisory, and
  device/presentation checks remain outstanding. No production deployment or
  authorization-policy change was made.

### POCO current-source install gate recheck, 2026-10-20

- Rechecked the active checkout and device inventory before this batch. Only
  the POCO X4 GT USB serial was used; Redmi devices appeared in ADB but were
  excluded, and Pad 7 was absent. The POCO runs Android API 34 and has no
  installed `com.campus4change` package.
- Repeated the 1.3.0 debug APK install after waking and unlocking the POCO. ADB
  returned `INSTALL_FAILED_USER_RESTRICTED`. The on-device Developer Options
  screen shows the `Install via USB` toggle disabled. Tapping it left the
  setting disabled and displayed “Insert your SIM card.” The related Install
  via USB page reports “Rejected Campus4Change installation request” and “No
  apps.”
- The device prerequisite remains unresolved. No SIM-dependent or hidden
  setting workaround was attempted, no app data was cleared, and no production
  service was touched. Current-source installation, cold launch, and camera
  runtime verification remain open. The current audit estimate is 83.5%; this
  batch did not change application source or GitHub.

### Local signed v1.3.0 release artifacts, 2026-10-20

- Preserved the existing v1.2.2 and v2 keystore files. Created a separate
  replacement signer at
  `/home/patt/.android/keystores/campus4change-release-v3.jks` with file mode
  600. Its random credential is stored in the user's GNOME Secret Service
  under service `campus4change-release-signing`, account
  `campus4change-release-v3`; no password is recorded in the repository, shell
  history, or this log.
- Updated `scripts/build-release.sh` to accept a dedicated keystore path and
  alias and optionally read the secret from GNOME Secret Service. Added the
  workstation rebuild command and replacement certificate status to
  [BUILDING.md](docs/BUILDING.md) and [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).
  `bash -n scripts/build-release.sh` and `git diff --check` pass.
- Using JDK 25, `scripts/build-release.sh` completed `assembleRelease` and
  `bundleRelease` successfully on the current 1.3.0 / version-code-6 source.
  The signed APK is 57 MB at
  `android/app/build/outputs/apk/release/app-release.apk`, SHA-256
  `54c72a319a812699b6b9dd569b08fc0fb2f90bd97e66e8ab7784fce5743c819e`. The
  signed AAB is 41 MB at
  `android/app/build/outputs/bundle/release/app-release.aab`, SHA-256
  `e7ed5870ce053104a37d9dad6fe86d3b5a4d16ca2e34cbbaf712c294bedf6b23`.
- `apksigner verify` passed for the APK. `jarsigner -verify` reported the AAB
  verified, and `keytool -printcert -jarfile` showed its certificate matches
  the APK and keystore. The signer SHA-1 is
  `21:24:1E:9A:18:AB:85:31:F5:B3:83:A5:5D:87:14:C9:80:C8:07:D5`; SHA-256 is
  `0C:65:24:06:CF:3B:60:51:A4:F9:65:70:80:7E:F7:38:D4:8A:48:80:2E:E1:0E:06:76:05:5D:61:FE:F5:9E:E7`.
  Jarsigner notes that the self-signed chain is not trusted by the local system
  trust store; Firebase registration is a separate release gate.
- The replacement fingerprints are not registered with Firebase. Release
  Google sign-in, Play Integrity/App Check, installation, launch, and device
  flows remain unverified. No production settings changed; no artifact was
  uploaded or published; no GitHub push occurred. Existing local release keys
  were preserved. The completion estimate rises from 83.5% to 84.0% for the
  locally signed artifacts, while device and service integration gates remain
  open.
- No off-workstation backup was created for the v3 JKS or its GNOME Secret
  Service entry. Secure recovery backups are needed before relying on this
  signer for future updates; neither item belongs in GitHub.


### Dependency advisory and compatible-fix recheck, 2026-10-20

- `npm audit --omit=dev --json` rechecked the current lockfile: 20 high paths,
  zero critical, with all `braces` paths at `3.0.3`. `npm explain braces`
  traces the package through React Native Community CLI 20.2.0 and Metro 0.87.1.
  The current registry query lists `braces@3.0.3` as latest; the
  [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) remains
  high severity and has no patched version.
- Upstream PR [#72](https://github.com/micromatch/braces/pull/72) proposes a
  depth limit but is closed and unmerged. Its review discussion reports a
  `stringify` output change with `escapeInvalid: true`. Upstream issue
  [#84](https://github.com/micromatch/braces/issues/84) records the maintainer
  disputing that the advisory needs a fix. The advisory remains active, so the
  finding is retained rather than dismissed.
- The current release source map has 653 source paths and none for `braces`,
  `micromatch`, or `fast-glob`; the finding is in the build toolchain, not the
  app's bundled JavaScript. npm's proposed automatic repair downgrades React
  Native to 0.72.17, incompatible with the current 0.87.1 source. No patch,
  override, or dependency downgrade was applied, and `package.json` and
  `package-lock.json` remain unchanged.


### Pad 7 wireless reconnection and installed signer check, 2026-10-20

- Ran `/home/patt/.local/bin/android-wireless-connect`, then identified all ADB
  entries. The Pad 7 was absent. The helper connected the Redmi endpoint
  `192.168.1.82:34253` (`rodin`); that newly added connection was immediately
  disconnected. The pre-existing Redmi mDNS transport remains in ADB and was
  not used or tested.
- Read PackageManager metadata for `com.campus4change`: version 1.3.0, code 6.
  Pulled its installed base APK read-only and verified its signer SHA-1 as
  `60:CD:C5:DF:6D:2D:2A:DF:48:DC:E2:4B:72:98:8B:9C:34:A9:CE:4A`, matching the
  workstation debug certificate. The new v3 release certificate is different.
- No app launch, update, uninstall, or app-data change was performed. The Pad is
  now available for a local-emulator QA update signed with its existing debug
  key; current-source runtime behavior remains unverified until that batch runs.


### Current emulator-QA build installed and cold-launched on Pad 7, 2026-10-20

- Built `android/app/build/outputs/apk/debug/app-debug.apk` with
  `npm run android:qa-emulators`, JDK 25, and
  `C4C_DEBUG_STORE_FILE=/home/patt/.android/debug.keystore`. Gradle completed
  83 tasks successfully. The build helper confirmed that
  `firebaseConfig.js` was restored byte-for-byte; its SHA-256 remained
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`.
- The QA APK SHA-256 is
  `6fa27e5be56de65c26478b8eb8e60bbb9173b10446a44b645d535d721165e839`.
  `apksigner` confirmed its signer SHA-1 matches the Pad's existing workstation
  debug signer `60:CD:C5:DF:6D:2D:2A:DF:48:DC:E2:4B:72:98:8B:9C:34:A9:CE:4A`.
  Package metadata is version 1.3.0/code 6, min API 24 and target API 36. The
  bundled JavaScript contains demo project `demo-campus4change-rules` and host
  `127.0.0.1`.
- Installed the update in place with `adb install -r` on Xiaomi Pad 7 serial
  `192.168.1.92:33101`. No uninstall or app-data clear was performed. Cold
  launch displayed the Welcome back login screen. A filtered 900-line logcat
  sample contained no fatal Android or React Native exception. The debug QA
  screen showed the DevSupport warning strip; release UI was not part of this
  device check. No account was created or signed in; no Firestore write, camera
  permission prompt, or core feature interaction was tested.
- Reversed Auth/Firestore emulator ports 9099 and 8080 to the Pad during this
  check, then removed both reverse mappings and stopped the local emulators.
  POCO remains blocked by the SIM-dependent Install via USB toggle. Redmi
  devices were not used. Production Firebase and GitHub were not changed.
- This adds current-source Pad installation and launch evidence but does not
  verify the release-signed APK, camera flow, authentication, backend actions,
  or two-device workflows. The completion estimate rises from 84.0% to 84.5%.


### Pad 7 wireless availability recheck, 2026-10-20

- Before the camera-permission QA batch, `adb devices -l` no longer listed the
  Pad 7. Ran `/home/patt/.local/bin/android-wireless-connect`; it connected the
  Redmi endpoint `192.168.1.82:34253` (`rodin`). I immediately disconnected that
  newly added transport. The pre-existing Redmi mDNS transport remains in ADB
  but was not used or tested.
- Redmi transports remained excluded. No app, account, or data operation was
  performed on them, and no attempt was made to modify Pad or production state.
- The earlier current-source QA install and cold-launch on Pad 7 remains valid
  evidence. Camera permission and authenticated profile interactions were not
  tested in this turn because the authorized Pad endpoint was unavailable.


### Camera QA fallback attempt after Pad 7 disconnect, 2026-10-20

- Re-read the active goal and rechecked the current ADB inventory. Pad 7 was
  absent. The required wireless helper found only Redmi Turbo 4 transports;
  the helper-added `192.168.1.82:34253` connection was disconnected, and no
  Redmi app or data operations were performed.
- Tried the camera QA batch on a fresh API 36 scratch AVD. The GUI attempt
  failed to initialize Qt/XCB without a display. The headless SwiftShader run
  passed the 7.37 GB disk check but exited with SIGSEGV/code 139. A second
  headless Lavapipe attempt also terminated with QEMU SIGSEGV/code 139; a core
  dump was recorded for PID 171043. No app launch or camera interaction took
  place in the emulator.
- Removed only the scratch `C4C_Camera_API36` AVD created for this attempt,
  restored the QA APK, signed release APK/AAB, and CMake cache to their original
  build locations, and verified the QA APK SHA-256 remained
  `6fa27e5be56de65c26478b8eb8e60bbb9173b10446a44b645d535d721165e839`. The
  existing `Codex_API_36` AVD was left untouched. No app data, production
  Firebase, or GitHub state changed.
- Camera runtime verification remains unproven. The previous Pad 7 QA login
  launch remains the latest app runtime evidence; auth, camera, backend, and
  core workflows were not tested. Completion remains 84.5% pending a reachable
  authorized device or working emulator.


### API 36 AVD camera and avatar verification, 2026-10-21

- Installed and launched the emulator-QA APK on the disposable
  `C4C_Camera_API36` API 36 AVD (`emulator-5554`). The installed APK SHA-256 is
  `6dc11a8285bf7e6f927da944973ba84cae5d7c532a0d3cea8bad4f280341f0c8`. Its
  Firebase bundle targets `demo-campus4change-rules` at `10.0.2.2`. The build
  helper restored `firebaseConfig.js` byte-for-byte. After the test, the
  installed base APK was pulled read-only from the AVD and its SHA-256 matched
  the APK at the workspace output path.
- Tapping **Take a Photo** displayed the camera explanation and then Android's
  permission prompt. Denying permission returned to the editor with the photo
  picker and avatar presets still available. Granting permission opened the
  Android camera with its virtual-scene preview; the shutter returned the
  captured image to the editor.
- Saving the photo displayed it on Profile. Selecting the blue avatar and
  saving cleared the photo preview. After force-stopping and cold-launching the
  app, the Home screen displayed the saved blue avatar.
- The first camera attempt lost the AVD connection. A rebooted retry captured
  the image and completed the save flow. The emulator briefly showed a System
  UI not responding prompt during account restoration; tapping Wait returned
  to the app. The final sampled log contained no app fatal exception. The debug
  app showed the DevSupport warning strip, and App Check logged a debug-token
  exchange warning.
- Camera capture, local profile saving, avatar switching, and cold-launch
  persistence are verified on this disposable AVD only. The photo picker,
  camera cancellation, physical camera behavior on POCO or Pad 7, release UI,
  and production App Check remain unverified. No Redmi device, production
  Firebase project, or GitHub branch was used or changed. Auth and Firestore
  emulators were stopped, and the scratch AVD was deleted after the test.
- The overall completion estimate remains 84.5%. The physical-device QA row is
  unchanged because this AVD result does not verify current-source camera or
  core flows on POCO X4 GT or Xiaomi Pad 7.


### POCO Termux clean debug build, 2026-10-21

- Opened the Termux app on POCO X4 GT (`xaga`, Android API 34; ADB serial
  `Z9GMOVDMHQV8X84D`) at
  `/data/data/com.termux/files/home/Campus4Change-termux-validation`. Its Git
  `HEAD` matched local `main` at `46fe89a534d98866dc981ef11fe64f24151e8bf4`.
  The Termux wrapper, Prefab CMake bridge, Android Gradle file, and session
  hook matched the Fedora worktree by SHA-256. The POCO copy of
  `scripts/setup-termux-ndk.sh` has a local `C4C_ANDROID_API` override with a
  default of 24; I preserved it.
- Termux reported Node.js 26.4.0 and JDK 17.0.20. Its ignored
  `android/local.properties` points to the installed SDK, CMake, and a
  Termux-compatible NDK. A clean build ran from this configured checkout with
  `JAVA_HOME=/data/data/com.termux/files/usr/lib/jvm/java-17-openjdk ./scripts/gradlew-termux.sh clean assembleDebug --no-daemon --max-workers=2 --console=plain`.
  Gradle completed 92 tasks in 1 minute 42 seconds, with 77 tasks executed.
- The current Fedora `scripts/setup-termux-ndk.sh` was copied to the POCO and
  run from Termux with the installed NDK and a new scratch output path. It
  reported that the Termux-compatible NDK was prepared. The build itself used
  the existing NDK path in `local.properties`, not that new scratch path.
- The debug APK was copied from Termux to Fedora for read-only verification.
  It is 41,305,406 bytes with SHA-256
  `ef0cbef31725973769e053c17ffe3fc3fda245d83f43ce225cd812d710e5262f`. Package
  metadata reports `com.campus4change`, version 1.3.0/code 6, minimum API 24,
  target API 36, and ABI `arm64-v8a`. `apksigner verify --verbose` succeeded;
  the Termux debug certificate SHA-1 is
  `5e:8f:16:06:2e:a3:cd:2c:4a:0d:54:78:76:ba:a6:f3:8c:ab:f6:25`.
- CMake warned that `ndk.dir` is deprecated and that hard-link attempts fell
  back to copies. Gradle also reported deprecated features. These warnings did
  not fail the clean debug build. No Termux release build or app install/launch
  was performed. macOS build instructions remain unverified because no Mac
  build output or first error block was available.
- Temporary files in shared Downloads and the scratch NDK directory were
  removed. The project score remains 84.5%; this batch verifies build tooling,
  not physical app workflows, release integration, or GitHub synchronization.


### macOS build diagnostic availability, 2026-10-21

- The current build host is Fedora Linux. It has no `sw_vers`, `xcrun`, or
  `xcodebuild`, so I could not run a macOS build here.
- The previously shared image path
  `/storage/emulated/0/DCIM/Camera/IMG_20261020_151354.jpg` is absent from both
  authorized Android devices. No Mac build log or error screenshot was found
  in the available attachments.
- To separate a general Gradle failure from a Mac-specific setup issue, the
  same `:app:assembleDebug` task ran on Fedora with JDK 25. It completed 82
  tasks, with 22 executed, in 44 seconds. This confirms only the Linux build
  path; it does not verify macOS.
- The macOS setup instructions in [BUILDING.md](docs/BUILDING.md) include a
  diagnostic log-capture command, but the command has not been run on a Mac.
  Without a Mac host or the first Gradle failure block, no macOS-specific
  build cause or fix is established.


### Pad 7 physical camera permission fallback, 2026-10-21

- Rebuilt the physical-device QA APK with
  `C4C_DEBUG_STORE_FILE=/home/patt/.android/debug.keystore npm run android:qa-emulators`.
  Gradle completed 83 tasks, with 12 executed and 71 up to date. The build
  helper restored `firebaseConfig.js` byte-for-byte; its SHA-256 is
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`.
- The APK SHA-256 is
  `032f589e1556320ce6c7c0397b2852acafa440b51eaf3d357c7b502dcc868c04`. Its
  bundle targets `demo-campus4change-rules` at `127.0.0.1`; the package is
  version 1.3.0/code 6 and the signer matches the Pad's workstation debug
  certificate. `adb install -r` updated the existing Pad installation in
  place. Auth and Firestore emulator ports 9099 and 8080 were reversed only to
  the Pad during testing.
- A disposable account signed up through the local Auth Emulator and completed
  TIP profile setup while the local Firestore Emulator was running. The app
  reached Home and opened the in-app verification notice. No production account
  or Firebase service was used.
- On Pad 7, **Take a Photo** opened Android's camera permission prompt. Denying
  permission returned to Edit Profile with the camera fallback message and
  photo/avatar actions available. PackageManager still reported the camera
  permission as denied. No photo was captured and the photo picker was not
  opened.
- The QA account was signed out and the app returned to Welcome back. Its
  sign-out dialog states that the encrypted local copy remains on the device;
  app data was not cleared. Auth and Firestore emulators were stopped, and both
  ADB reverse mappings were removed. Only Pad 7 was used; POCO and Redmi were
  not used in this batch.
- This verifies current-source signup/profile setup with local emulators and
  the physical camera denial fallback on Pad 7. Physical camera capture,
  shared group/session flows, POCO runtime, Mac build, and two-device workflows
  remain open. The completion estimate remains 84.5%.


### POCO current-source install gate recheck, 2026-10-21

- Rechecked POCO X4 GT (`xaga`, API 34, USB serial `Z9GMOVDMHQV8X84D`).
  PackageManager reported no installed `com.campus4change` before the install
  attempt.
- Retried `adb install -r` with the current physical-device QA APK
  (`032f589e1556320ce6c7c0397b2852acafa440b51eaf3d357c7b502dcc868c04`). ADB
  returned `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`.
- The on-device Developer Options screen showed USB debugging enabled and
  Install via USB disabled. I did not change the setting, tap a SIM-dependent
  workaround, or clear device data. PackageManager still reports no app after
  the failed attempt, and Termux was restored to the foreground.
- Redmi and Pad 7 were not used in this batch. No production Firebase or
  GitHub state changed. POCO current-source install and runtime QA remain
  blocked on the device's Install via USB setting; the overall estimate stays
  84.5%.


### Pad 7 launcher icon visual check, 2026-10-21

- Opened the Android app drawer on Pad 7 with the current physical QA build
  installed. The launcher displayed the Campus4Change emblem icon beside the
  `Campus4Change` label. The UI hierarchy reported both the app label and
  content description as `Campus4Change`.
- The icon assets and manifest references were already present in the local
  source. This check verifies the icon renders on Pad 7; other launcher sizes,
  device launchers, and release-signed rendering remain unverified.
- The app was left signed out. No code, account, production Firebase, or
  GitHub state changed in this visual check. The overall completion estimate
  remains 84.5%.


### Biometric manifest permission provenance, 2026-10-21

- `:app:dependencyInsight` for `androidx.biometric:biometric` traces the
  dependency to `androidx.credentials:credentials:1.6.0`. The manifest-merger
  report attributes `USE_BIOMETRIC` and `USE_FINGERPRINT` to
  `androidx.biometric:biometric:1.1.0`.
- `CampusGoogleSignInModule.java` uses Credential Manager for Google sign-in.
  Source search found no app-owned `BiometricPrompt` call, and screen tests
  assert that the login UI exposes no biometric option.
- No manifest suppression or dependency removal was applied. Google sign-in
  with the replacement release signer remains unverified, so removing a
  transitive permission without exercising that flow could introduce a
  regression. The permission provenance remains a review item; the user-facing
  biometric login feature remains absent.


### Completion audit checkpoint, 2026-10-21

- The current local worktree passed 328 Jest tests in 40 suites, full-project
  ESLint, the public Drive-link check, and `git diff --check`.
- The Firebase Auth verification, Firestore rules, booking-overlap, and group
  client-rules scripts passed against the disposable
  `demo-campus4change-rules` Auth and Firestore emulators. The emulator
  processes were stopped after the checks. No production Firebase service was
  used or changed.
- Read-only GitHub checks confirmed local `main` and remote `main` at
  `46fe89a534d98866dc981ef11fe64f24151e8bf4`. CI run `39366032936` passed on
  that commit. The published `v1.3.0-preview.1` release has no assets and its
  tag points to `f5823c900c16cc7bf7870562ec5a6c7d730e8a2d`; `v1.2.2` remains
  the latest full release.
- The worktree contains 25 modified tracked files and three untracked files.
  None of these local changes are on GitHub. No application code was changed
  during this audit.
- A read-only package check found the 1.3.0/code 6 app installed on Pad 7 and
  no `com.campus4change` package on the POCO X4 GT. The POCO installation gate,
  physical camera capture, current-source core two-device flows, production
  Student ID rules, release-signer integration, and school-laptop rehearsal
  remain unresolved. The connected Redmi was not used.
- The weighted completion estimate remains 84.5%. The category evidence,
  prioritized checklist, and GitHub/release comparison are in
  [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md).


### Camera result recovery after Android process recreation, 2026-10-21

- On Pad 7, the previous QA build was tested with a disposable Auth/Firestore
  emulator account. **While using the app** permission completed the system
  camera flow, saved a 6,272-byte profile photo, and retained it through a cold
  launch. The Edit Profile accessibility tree exposed **Remove photo from this
  device** after the restart. Selecting a built-in blue avatar and saving
  removed the profile photo file.
- A second attempt selected Android's **Only this time** permission. The camera
  activity remained open during diagnosis for over a minute. Android's event
  log records that it revoked the one-time permission and killed the app
  process. The camera had written a 2,129,032-byte temporary JPEG, but the
  previous in-memory-only activity result handler could not attach it to the
  profile after process recreation. The app returned to Home, and no file was
  present in `files/profile_photos`.
- The local recovery change stores the pending camera request through the
  existing AES-GCM-protected Android preferences, durably records the camera
  activity result from `MainActivity`, and restores a completed capture when
  Edit Profile opens. Saving the profile or replacing the photo clears the
  recovery record and capture cache. A focused Jest regression test covers the
  editor's restored-photo callback.
- Validation passed: 329 Jest tests across 40 suites, ESLint, 19 Android unit
  tests across four suites, `git diff --check`, and
  `C4C_DEBUG_STORE_FILE=/home/patt/.android/debug.keystore npm run
  android:qa-emulators`. The local QA APK has SHA-256
  `73e868f920b4897838480c9599babcd5384018298b1a85c36f0b714fcf06f2d1`; the
  Firebase source config was restored byte-for-byte to SHA-256
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`.
- The current QA APK install on POCO X4 GT returned
  `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`; no application
  package is installed there. Pad 7 is now unavailable. It remains signed in
  with the disposable QA profile, its camera permission is granted while the
  app is in use, `files/profile_photos` is empty, and the first failed attempt's
  temporary camera JPEG remains in
  `cache/profile-photo-captures/950ee698-c69b-41ed-80bc-43160db20b20.jpg`.
  Temporary UI hierarchy dumps under `/sdcard/c4c-*.xml` and ADB reverse
  mappings for ports 9099 and 8080 also remain. Local Auth and Firestore
  emulators are stopped. Pad-side test cleanup and physical validation of the
  recovery change must wait until Pad 7 is available again.
- A later normal `adb install -r` retry on POCO returned the same
  `INSTALL_FAILED_USER_RESTRICTED` result. The QA APK was copied to
  `/sdcard/Download/Campus4Change-QA-73e868f9.apk`; its on-device SHA-256
  matched the local artifact. Opening it through Android's file resolver led
  to MiXplorer's archive view, not the installer, and no app was installed.
  No install setting was changed.
- No production Firebase setting or GitHub ref changed. The estimated
  completion remains 84.5% until current-source physical recovery and the
  remaining app flows are verified.


### POCO QA APK installer route check, 2026-10-21

- The local QA APK passed `unzip -t`, `aapt dump badging`, and
  `apksigner verify`. Its package metadata is `com.campus4change`, version
  1.3.0/code 6, with min SDK 24 and target SDK 36. These checks establish APK
  integrity and signing, not successful installation or runtime behavior.
- On POCO X4 GT (`xaga`, API 34, USB serial `Z9GMOVDMHQV8X84D`), opening the
  APK from Termux displayed Android's "There was a problem parsing the
  package" dialog. The Xiaomi File Manager then requested access to music and
  audio before showing its Recent view. I left that permission ungranted and
  did not change Install via USB. PackageManager still reports no installed
  `com.campus4change` package, so the camera recovery change has not been
  exercised on POCO.
- Pad 7 was unavailable and not accessed. Redmi was not used. The POCO install
  gate remains open; the estimate remains 84.5%. No production Firebase or
  GitHub state changed.


### POCO current-source camera recovery verification, 2026-10-21

- Replaced the legacy camera `startActivityForResult` launch with AndroidX's
  registered `TakePicture` contract in `MainActivity`. The native module still
  persists the encrypted pending capture and result code for profile-editor
  recovery after process recreation.
- `./gradlew --no-daemon :app:testDebugUnitTest` passed 19 tests across four
  suites. `C4C_DEBUG_STORE_FILE=/home/patt/.android/debug.keystore npm run
  android:qa-emulators` built the QA APK successfully and restored
  `firebaseConfig.js` byte-for-byte to SHA-256
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`. The
  artifact SHA-256 is
  `2089ba62b8fce1a06c2afb0144e5c63f1cb9107486ea9350430c34c444a9dbb2`;
  `aapt dump badging` reported version 1.3.0/code 6 and `apksigner verify`
  passed with the workstation debug certificate. The wider JS suite previously
  passed 329 tests across 40 suites with ESLint; no JS source changed in this
  camera lifecycle fix.
- The QA package was updated on POCO X4 GT through the Android Files and system
  package-installer flow. ADB installation remains restricted because Xiaomi's
  `Install via USB` setting requires a SIM. Files' temporary **Install unknown
  apps** permission was revoked after installation; Package Manager reports
  `REQUEST_INSTALL_PACKAGES: deny`. The app remains installed.
- The POCO used ADB reverse ports 9099 and 8080 to the local
  `demo-campus4change-rules` Auth and Firestore emulators. A disposable QA
  account completed TIP profile setup. With **Only this time** camera access,
  Android revoked the one-time permission and killed Campus4Change while the
  system camera remained open. After taking and confirming a photo, the
  Activity Result registry restored `RESULT_OK` (`-1`) in the new app process.
  Reopening Edit Profile showed **Remove photo from this device**. Saving
  created a 6,810-byte private photo; a force-stop and cold launch retained it,
  and the temporary capture cache was cleared. The photo content was not
  inspected.
- The disposable app account and private test data were removed with
  `pm clear`; the installed app now opens at Welcome. The local Auth/Firestore
  emulators were stopped, POCO ADB reverse mappings were removed, and the
  Files install permission is revoked. Pad 7 was unavailable and not accessed;
  its prior QA account, temporary capture, UI dumps, and reverse mappings remain
  untouched. Redmi was not used.
- No production Firebase or GitHub state changed. The overall estimate remains
  84.5% because production Student ID claims, current-source shared core flows,
  two-device verification, release signing/Firebase registration, and GitHub
  synchronization remain open.


### POCO profile photo picker and cancellation verification, 2026-10-21

- With the POCO X4 GT only, a second disposable Auth/Firestore emulator account
  completed TIP profile setup. The Android photo picker was opened from Edit
  Profile, and a newly created non-personal camera test image was selected from
  the local Photos collection. The picker returned the image to Campus4Change,
  the private profile photo file was 12,216 bytes, and Edit Profile exposed
  **Remove photo from this device**. Saving and cold-launching retained the
  selected photo. The photo content was not inspected.
- After restoring the saved image, **Take a Photo** opened the system camera.
  Pressing Android Back cancelled that capture and returned to Edit Profile;
  the existing saved photo remained, and no pending camera file remained in the
  cache.
- QA cleanup removed the disposable app account and private photo with
  `pm clear`. The synthetic test PNG and the system-camera test JPEG were
  removed from shared storage, their MediaStore rows were deleted, and the
  installed app now opens at Welcome. The local Auth/Firestore emulators were
  stopped, POCO ADB reverse mappings were removed, and the Files install
  permission remains denied. No production Firebase or GitHub state changed.
- Pad 7 was unavailable and not accessed. Redmi was not used. Photo-picker
  cancellation and current-source core shared workflows remain unverified. The
  overall estimate remains 84.5% pending the broader project gates.


### POCO photo-picker cancellation verification, 2026-10-21

- On the POCO X4 GT, a disposable local-emulator account opened Edit Profile and
  launched the Android photo picker. Pressing Android Back without selecting a
  photo returned to Edit Profile with no error and created no profile photo or
  camera-cache file. The selection path and camera-back cancellation path were
  also verified in the immediately preceding POCO check.
- The disposable app data was cleared after the test, leaving the installed
  package at Welcome. Temporary test images and their MediaStore rows were
  removed. Local Auth/Firestore emulators were stopped, ADB reverse mappings
  were removed, and the Files install permission remains denied.
- Only POCO X4 GT was used in this check. Pad 7 was unavailable; Redmi was not
  used. No production Firebase or GitHub state changed. Photo-picker
  cancellation is closed; current-source shared core flows and the remaining
  release, production, two-device, and GitHub gates remain open. The estimated
  completion remains 84.5%.


### POCO current-source study group flow, 2026-10-21

- A disposable email-verified account on the POCO used the local Auth/Firestore
  emulators. It created `POCO QA Study Group` for Physics with a meetup topic;
  the group detail screen identified it as shared with one member. The owner
  published a study note and two replies, and the group detail showed the note
  and reply content. One scripted sample reply included a stray `%l` text marker;
  all emulator data was discarded after verification.
- The group session screen showed the meetup, location, and agenda/notes fields.
  It exposed no focus timer or start-timer control. After a force-stop and cold
  launch, the group, post, and both replies remained available from the local
  Firestore emulator.
- QA cleanup cleared the disposable account and app data, stopped Auth and
  Firestore emulators, and removed POCO ADB reverse mappings. The app remains
  installed at Welcome. Only POCO X4 GT was used; Pad 7 was unavailable and
  Redmi was not used. No production Firebase or GitHub state changed.
- The overall estimate remains 84.5%. Multi-account membership/chat, session
  request handling, current-source two-device workflows, production Student ID
  claims, and GitHub synchronization remain open.


### POCO same-device two-account group membership check, 2026-10-21

- With local Auth/Firestore emulators, an email-verified owner created a shared
  Physics study group and published a post. A second email-verified emulator
  account on the same POCO discovered the group, opened its private-post notice,
  joined it, and then saw the member count increase to two and the owner's post
  become visible. This verifies same-device account switching and membership;
  it is not two-device evidence.
- After a force-stop and cold launch, the group remained shared and the post and
  both replies were visible to the member. The Group Session screen displayed
  its agenda and notes, with no focus timer or start-timer control.
- Both test accounts and local Firestore/Auth data were discarded by clearing
  app data and stopping the emulators. The app remains installed at Welcome,
  POCO ADB reverse mappings were removed, and the Files install permission is
  denied. Pad 7 was unavailable and not accessed; Redmi was not used. No
  production Firebase or GitHub state changed.
- The overall estimate remains 84.5%. Current-source two-device verification,
  shared chat/session-request flows, production Student ID claims, release
  signing/Firebase registration, and GitHub synchronization remain open.


### POCO same-device session request and acceptance check, 2026-10-21

- A verified tutor account published an Information Technology subject and
  introduction. A second verified emulator account found the listing, requested
  an Introduction to Computing session for a future slot, and saw **Request
  sent** with a pending status in Sessions.
- After switching accounts on the same POCO, the tutor saw the request under
  **Requests** with **Needs your response**, opened Session Details, and
  accepted it. The session status changed to **UPCOMING**. The flow used local
  Auth/Firestore emulators and no payment or call features.
- The disposable accounts and local app data were cleared; the installed POCO
  app now opens at Welcome. Local emulators were stopped, POCO ADB reverse
  mappings removed, and the Files install permission remains denied. Pad 7 was
  unavailable and not accessed; Redmi was not used. No production Firebase or
  GitHub state changed.
- This is same-device two-account evidence, not two-device proof. Current-source
  group chat between different members, session cancellation, true two-device
  flows, production Student ID claims, release Firebase registration, and
  GitHub synchronization remain open. The estimated completion remains 84.5%.


### POCO cross-account group chat check, 2026-10-21

- Two verified accounts in the local Auth/Firestore emulator used the POCO to
  discover, join, and open the same shared group. The member sent a group chat
  message; the owner saw it after signing back in, sent a response, and the
  member saw that response. This verifies current-source group chat across
  accounts on one phone, not across two physical devices.
- QA cleanup cleared the app data, stopped the local emulators, removed POCO
  ADB reverse mappings and temporary chat hierarchy dumps, and retained the
  app at Welcome. The Files install permission remains denied. Pad 7 was
  unavailable and not accessed; Redmi was not used. No production Firebase or
  GitHub state changed.
- The overall estimate remains 84.5%. Actual two-device verification, current
  session cancellation, production Student ID claims, release Firebase
  registration, and GitHub synchronization remain open.


### POCO current-source session cancellation and slot release, 2026-10-21

- A verified tutor listing with one TIP subject was confirmed in the local
  Auth/Firestore emulator directory. The earlier empty directory observation
  came from a separate QA form with zero subjects selected; it was not a rules
  or tutor-directory failure.
- On POCO, a second verified student account requested a future session; the
  tutor saw the request and accepted it; the student then confirmed
  cancellation. The session detail changed to **CANCELLED**. A direct emulator
  check found status `cancelled` and confirmed both half-hour lock documents
  were absent for the student and tutor.
- QA accounts and app data were cleared, the local emulators were stopped, and
  POCO ADB reverse mappings and temporary tutor/session UI dumps were removed.
  The installed app remains at Welcome. Pad 7 was unavailable and not accessed;
  Redmi was not used. No production Firebase or GitHub state changed.
- The weighted audit is now 85.0%, with the session requirement raised to 6 of
  6. Actual two-device workflows, production Student ID claims, release
  Firebase registration, GitHub synchronization, and a verified macOS build
  remain open.


### Current-source Termux debug build on POCO X4 GT, 2026-10-21

- The active host checkout remains on `main` at `46fe89a` with its existing
  uncommitted changes. I applied that source diff and the untracked build files
  to a separate detached worktree in Termux. The original
  `Campus4Change-termux-validation` checkout and its local changes were left
  untouched. The copied worktree passed `git diff --check` before building.
- The build ran from the POCO's Termux app terminal with Node.js 26.4.0 and
  JDK 17.0.20. The configured SDK, Termux-compatible NDK, Gradle cache, and
  `node_modules` were reused. `./scripts/gradlew-termux.sh clean assembleDebug
  --no-daemon --max-workers=2 --console=plain` completed 92 actionable tasks in
  1 minute 59 seconds, with 81 executed and 11 up-to-date.
- APK metadata and signature verification passed. The artifact is 41,322,431
  bytes, package `com.campus4change`, version 1.3.0/code 6, minimum API 24,
  target API 36, and ABI `arm64-v8a`. Its SHA-256 is
  `8f2e129f54ea80ca8c48d80fc9ef8cbdd0738ce62cebfd3f52dc2461d5d78ddf`.
  It uses the Termux debug certificate. This build was not installed or
  launched, and no Termux release task was run.
- The initial build attempt through `adb shell run-as` failed because that
  process did not inherit Termux's `LD_PRELOAD`; React Native autolinking
  exited 126 there. The same `npx @react-native-community/cli config` command
  passed in the Termux app terminal, and the debug build then succeeded. The
  build guide now records this distinction. The Fedora host cannot reproduce
  the Mac toolchain failure, and no Mac error log is available.
- Only the POCO X4 GT was used. Pad 7 was unavailable and not accessed; Redmi
  was not used. No production Firebase or GitHub state changed. The 85.0%
  completion estimate is unchanged; macOS build evidence and the other audited
  completion gates remain open.


### POCO QA artifact identity and API 24 availability check, 2026-10-21

- ADB listed only the POCO X4 GT (model 22041216G, Android API 34). The
  installed Campus4Change package reported version 1.3.0, code 6, minimum API
  24, and target API 36. Pulling its installed `base.apk` produced the same
  SHA-256 as the host QA APK:
  `2089ba62b8fce1a06c2afb0144e5c63f1cb9107486ea9350430c34c444a9dbb2`.
  Launching the package displayed the Campus4Change logo and welcome screen.
  The sampled log contained React Native packager connection attempts to
  `localhost:8081`; no fatal exception appeared. No sign-in or backend flow was
  exercised in this check.
- A thin gray right-edge handle appeared on the welcome screen and remained in
  the same screen position after returning to the POCO launcher. This points to
  a device/launcher overlay; that attribution is an inference, and no app code
  change was made.
- The API 24 Google APIs x86_64 image was installed temporarily to check
  minimum-API feasibility. The emulator could not start: even with the AVD data
  partition reduced, startup required 7,372.8 MB free and the host had
  6,981.3 MB. The AVD and image were removed, restoring the prior disk-space
  state. No API 24 app test was completed; the minimum-API UI gate remains open.
- Only the POCO X4 GT was used. Pad 7 was unavailable and not accessed; Redmi
  was not used. The app remains signed out at Welcome, with no test account or
  backend data created. No production Firebase or GitHub state changed. The
  completion estimate remains 85.0%.


### POCO onboarding and sign-up UI smoke, 2026-10-21

- The verified installed QA APK (`2089ba62b8fce1a06c2afb0144e5c63f1cb9107486ea9350430c34c444a9dbb2`) ran on the POCO X4 GT. **GET STARTED** opened the three-step introduction; **NEXT** advanced through steps 2/3 and 3/3, and the final **GET STARTED** opened sign-in.
- Sign-in displayed email/password, forgot-password, Google, sign-up, more-options, and About entries. Sign-up displayed the Google and email paths and the TIP profile instructions. Submitting the empty form displayed its inline required-field message and did not create an account. Focusing the name field opened the keyboard while keeping the form controls visible; no text was entered.
- The right-edge gray handle remained at the same screen position on the POCO launcher and the app. It is likely a device-level overlay, so no application source change was made. This attribution is an inference.
- No account or backend data was created. The app remains at the unsigned onboarding flow. Only the POCO X4 GT was used; Pad 7 was unavailable and not accessed; Redmi was not used. No production Firebase or GitHub state changed. The completion estimate remains 85.0%.

### About Student ID wording correction and POCO verification, 2026-10-21

- The About screen said Student IDs “must be unique,” but the active production
  Firestore rules audit records no `studentIdClaims` enforcement. The copy now
  says that Student IDs stay private and are required for TIP setup without
  promising uniqueness. The About-screen test checks that the unsupported
  uniqueness promise is absent. The remaining production claim-enforcement
  gate is unchanged.
- `npm test -- --runInBand __tests__/aboutScreen.test.jsx` passed one suite and
  one test; targeted ESLint passed for the About screen and its test. The QA
  command `C4C_DEBUG_STORE_FILE=/home/patt/.android/debug.keystore npm run
  android:qa-emulators` completed successfully: 83 actionable tasks, 12
  executed and 71 up-to-date. The QA script restored `firebaseConfig.js` to
  SHA-256 `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`.
- The resulting version 1.3.0/code 6 APK has SHA-256
  `415c355dde3283adb50a1c53c6969177bcaafe272c079c05a998f0a38f26a04d` and was
  verified with the workstation debug signer. `adb install -r` succeeded on
  the POCO X4 GT. The pulled installed `base.apk` matched the build hash
  exactly. The updated About text was visible on the device. The POCO was on
  Android API 34; no account was created, and app data was cleared before the
  visual check.
- The focused local test and QA build do not verify duplicate Student ID
  protection under production rules. Pad 7 was unavailable and not accessed;
  Redmi was not used. No production Firebase or GitHub state changed. The
  completion estimate remains 85.0%.

### POCO device-only sign-in empty state and Settings gate, 2026-10-21

- **More sign-in options** exposed **Use existing on-device account**. Selecting
  it switched the form to email-or-Student-ID plus password. An empty sign-in
  showed inline validation and did not submit. The cleared POCO has no existing
  device-only account, so this route could not reach Settings without creating
  an account. No Firebase or device-only account was created in this check.
- The POCO was reset to the signed-out Campus4Change welcome screen afterward.
  Only the POCO X4 GT was used; Pad 7 was unavailable and not accessed; Redmi
  was not used. Settings remains unverified on a signed-in physical account.
  The completion estimate remains 85.0%.


### POCO Settings menu and screen verification, 2026-10-21

- A disposable account signed up against the local Auth emulator, completed TIP
  profile setup with test-only data, and reached Home. The hamburger menu
  showed **Settings** as a separate destination from **Profile**. Opening it
  displayed the Learning Preferences and About rows and the app version.
- QA cleanup cleared Campus4Change app data, stopped the local Auth/Firestore
  emulators (discarding the account and Firestore state), and removed POCO ADB
  reverse mappings. The POCO is back at the signed-out Welcome screen. Only the
  POCO X4 GT was used; Pad 7 was unavailable and not accessed; Redmi was not
  used. No production Firebase or GitHub state changed. The 85.0% estimate is
  unchanged; Settings is verified, while the broader all-route and two-device
  gates remain open.


### Floating verification-toast route check, 2026-10-21

- A disposable local Auth/Firestore signup displayed the floating **Verification
  email sent** card on Home. Its source auto-dismisses after eight seconds. The
  attempted physical tap did not produce reliable evidence: the POCO foreground
  changed away from Campus4Change during the tap, so the notification route is
  not marked physically verified and no timing change was made.
- `npm test -- --runInBand __tests__/notificationToast.test.jsx` passed one
  suite and one test. The component test confirms the open action requests the
  Notifications destination once. This is component-level evidence, not a
  successful POCO interaction.
- QA cleanup cleared app data, stopped local Auth/Firestore emulators, and
  removed ADB reverse mappings. The app is back at Welcome. Only the POCO X4 GT
  was used; Pad 7 was unavailable and not accessed; Redmi was not used. No
  production Firebase or GitHub state changed. The estimate remains 85.0%.


### Full regression check after About copy correction, 2026-10-21

- `npm test -- --runInBand --silent` passed 329 tests across 40 suites.
  `npm run lint` passed for the full project. The build had already passed with
  the About copy change, and the installed POCO QA APK hash matched the local
  artifact. The 19 Android unit tests had passed in the earlier same-day native
  verification.
- Only the POCO X4 GT was in the ADB inventory. The app data was cleared after
  the disposable emulator-backed Settings and notification checks; Auth and
  Firestore emulators are stopped, ADB reverse mappings are empty, and the app
  opens at Welcome. No production Firebase or GitHub state changed. The
  completion estimate remains 85.0%.


### POCO floating verification-toast action verified, 2026-10-21

- A controlled signup in the local Auth/Firestore emulator reached Home with
  the floating **Verification email sent** card. After correcting the test
  automation to wait for the TIP program picker and complete profile setup, a
  tap within the card's display window opened Notifications. `dumpsys` showed
  `com.campus4change/.MainActivity` both before and after the tap, and the
  screen showed the **Notifications** title and **Verify your email** card.
- `NotificationToast` is configured for animated entry/dismissal with an
  eight-second timeout. Its focused component test passed and confirms the
  open callback is called once with the Notifications destination.
- QA cleanup cleared app data, stopped local Auth/Firestore emulators, and
  removed ADB reverse mappings. The POCO is back at the signed-out Welcome
  screen. Only the POCO X4 GT was used; Pad 7 was unavailable and not accessed;
  Redmi was not used. No production Firebase or GitHub state changed. The
  overall completion estimate remains 85.0%.

### Camera profile-photo discard cleanup, 2026-10-21

- Reproduced the defect on the POCO X4 GT: after taking a camera photo and
  confirming **Discard changes**, reopening Edit Profile restored the unsaved
  photo from Android's pending recovery record.
- Added an account-scoped native cleanup method for confirmed profile discard.
  It clears the matching camera recovery record and removes unreferenced draft
  photos while preserving the photo URI in the saved profile. The navigator
  awaits cleanup before leaving the editor; **Keep editing** does not call it.
- The regression test confirms **Keep editing** has no cleanup callback and
  **Discard changes** invokes native cleanup once. Focused profile and app tests
  passed 38 tests; the full Jest suite passed 329 tests across 40 suites;
  full-project ESLint, Gradle Android unit tests, and `git diff --check` passed.
- The emulator-QA APK built successfully, and the QA builder restored
  `firebaseConfig.js` byte-for-byte to SHA-256
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`. The
  version 1.3.0/code 6 artifact SHA-256 is
  `55155f3779fe518faf79eb336211270c8b3183403001c232315203eab7d6ba91`; its
  workstation debug certificate SHA-256 is
  `688f332c76200bc27d097a65ef4b48366596c790e89e08a43625354239f37082`.
  ADB installed it over the existing POCO package, and the pulled installed
  `base.apk` hash matched the build artifact exactly.
- On the POCO, a camera photo appeared as an unsaved profile draft. After
  confirming discard, reopening Edit Profile showed no **Remove photo from
  this device** action, while the pre-existing QA profile avatar remained.
  The captured image content was not inspected. The app's existing QA profile
  was preserved; no new Auth account or Firestore data was created.
- The Android photo picker was also tested with a gallery item. The picker did
  not expose a filename, so the selected item could not be definitively matched
  to the temporary logo file staged for the test. The app-private profile-photo
  file count rose from 34 to 35 after selection, then returned to 34 after
  discard. Reopening Edit Profile showed no draft-photo action. The temporary
  MediaStore row and staged file were removed after the test.
- Pad 7 was unavailable and not accessed; Redmi was not used. The completion
  estimate remains 85.0% because weighted two-device, production-policy,
  current-source CI, and release-sign-in gates remain open. No GitHub push or
  production Firebase change was made.

### POCO group and session empty-state check, 2026-10-21

- The current POCO QA build showed the Study Groups empty state. Opening Create
  Study Group displayed the group name, subject, meetup, and optional schedule
  fields. Submitting the empty form showed its required-name-and-subject error;
  no group was created.
- The My Sessions screen showed the empty states for Upcoming, Requests,
  Completed, and Cancelled. The Messages tab showed **No messages yet** and
  explained the email-verification gate for shared chats. No booking or account
  data changed during these checks.
- The existing QA account has no groups. I left it unchanged rather than add a
  group that would remain in its on-device data. Group Details and Group Post
  still need a safe test fixture for physical visual verification.
- The app returned to Home with the existing QA profile. Only the POCO X4 GT
  was used; Pad 7 was unavailable and not accessed; Redmi was not used. No
  production Firebase or GitHub state changed. The 85.0% estimate is unchanged.

### Locked tutor-search summary, 2026-10-21

- On the POCO, an unverified QA session searched for `computer`. The screen
  showed **People search results · 0** beside a message saying email
  verification is required to browse the directory. No results were available
  because shared tutor browsing was locked.
- The search header now says **Tutor directory** in this locked, empty state and
  omits a result count. Searchable directories still show their result counts.
  The empty state continues to explain the email-verification requirement.
- A new regression test failed against the old heading, then passed after the
  fix. The tutor-flow suite passed 12 tests. The full Jest suite passed 330
  tests across 40 suites; full-project ESLint passed.
- The emulator-QA APK built successfully. `firebaseConfig.js` was restored
  byte-for-byte to SHA-256
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`. The
  version 1.3.0/code 6 APK SHA-256 is
  `82e44495cd7fe7c10023d68e89da2bac8f9191cc0e50e77521d75414664672a0`, signed
  by the workstation debug certificate. ADB installed it on the POCO; the
  installed `base.apk` hash matched exactly.
- On the POCO, the locked search showed **Tutor directory**, the verification
  message, and its explanation without a zero-result heading. The app returned
  to Home with the existing QA profile. No new account, Firestore data,
  production change, or GitHub update was made. Pad 7 was unavailable and
  Redmi was not used. The completion estimate remains 85.0%.
- The existing Figma prototype now includes editable locked-search frame
  `237:106` beside the normal search screen. Its full-frame screenshot shows
  the query, **Tutor directory** heading, verification guidance, and About link.
  The original verified-directory frame remains intact.

### Current-source signed release build, 2026-10-21

- `scripts/build-release.sh` completed `assembleRelease` and `bundleRelease`
  with the documented GNOME Secret Service path. The helper did not print the
  signing passwords. Gradle reported deprecation warnings but no build failure.
- The v1.3.0/code 6 APK SHA-256 is
  `81cfcd78be534a036d32443baf8ffab27773a627fd9af57cc3913fd2f9e2a4eb`. The
  v1.3.0/code 6 AAB SHA-256 is
  `2104cbf53f1b92c0884cc121c0cedbbfdbc35ad8080bd7b541b7701dfdc37c26`.
  Both report the release certificate fingerprint
  `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7`.
- `apkanalyzer` read package `com.campus4change`, version 1.3.0/code 6, min API
  24, and target API 36 from the APK. `apksigner verify` passed. The AAB passed
  `bundletool validate` and ZIP integrity checks. It was not installed on POCO
  because the debug QA package is installed with user data that must be
  preserved. Neither artifact was uploaded or published.
- Release-key Google sign-in, App Check, Play Integrity, and release-device
  runtime remain unverified. No Firebase production or GitHub state changed.

### Compatible launch-editor security update, 2026-10-21

- The fresh `npm audit --omit=dev` report showed 21 high findings and no
  critical findings. `npm explain launch-editor` traced version 2.14.1 through
  `@react-native-community/cli-tools@20.2.0`; its declared `^2.9.1` range accepts
  the patched 2.14.2 release.
- Updated only the resolved `launch-editor` package in `package-lock.json`.
  `package.json` is unchanged. GitHub-reviewed advisories list 2.14.2 as the
  patched version for the [Windows argument escaping](https://github.com/advisories/GHSA-698v-4r3x-3vcv),
  [editor flag interpretation](https://github.com/advisories/GHSA-r825-w8mm-5pxw),
  and [file existence bypass](https://github.com/advisories/GHSA-587h-7wmj-h5pm)
  issues.
- After the update, `npm audit --omit=dev` reported 20 high findings and no
  critical findings. The remaining high paths include `braces@3.0.3`; its
  [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no
  patched release. npm's available bulk fixes downgrade React Native or the
  community CLI to incompatible major versions, so they were not applied.
- The full Jest suite passed 330 tests across 40 suites, full-project ESLint
  passed, and both emulator-QA and signed release build commands passed after
  the lockfile update. The release APK/AAB hashes remained unchanged because
  Gradle reused the identical app bundle inputs. The current release source map
  contains no paths for `launch-editor`, `braces`, `micromatch`, or `fast-glob`;
  the findings remain in the build toolchain. No app source or production
  configuration changed. The completion estimate remains 85.0%.
- The full audit also reports 20 moderate test-tooling paths through
  `sprintf-js@1.1.3` -> `argparse@1.0.10` -> `js-yaml@3.15.2` in Jest coverage
  configuration. The [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)
  has no patched release. npm's automatic resolution downgrades Jest to 25, so
  the compatible Babel plugin patch was not applied as a workaround: its
  published 8.0.2 metadata retains the vulnerable loader chain.

### Saved profile photo preservation and native cleanup tests, 2026-10-21

- Extracted the account-prefix file-selection logic into the native cleanup
  helper called by `CampusStorageModule`. Two JVM tests verify that the helper
  deletes an owner's draft, preserves the saved URI, leaves another account's
  file untouched, and removes all owner photos when no URI is saved.
- `./gradlew --no-daemon :app:testDebugUnitTest` passed 21 tests across five
  suites. The emulator-QA and signed release build commands passed with this
  Kotlin change.
- The updated QA APK SHA-256 is
  `61383e10067e35dc44d618900baa0986ab92191fd6025bb1f0c304f2cdfde4f0`. ADB
  installed it over the same-signed POCO package; the pulled installed
  `base.apk` hash matched. The app cold-launched to Home with the existing QA
  profile, and no app data was cleared.
- The updated v1.3.0/code 6 release APK SHA-256 is
  `51e7f676434955b51f060703cd13dc2895dd2e3409f988ba6651e781a96b5d61`. Its AAB
  SHA-256 is
  `800c86cac2b42a7dfc87f1cff7f426a0614ddf4f4be76191b594b35e699b58dd`. The APK
  signature and AAB structure checks passed with the v3 release certificate.
  Neither artifact was installed or published. No production or GitHub state
  changed; the completion estimate remains 85.0%.
- A physical repeat with an already-saved custom image could not be set up
  because the temporary gallery fixture did not appear in the Photo Picker.
  I canceled without selecting another item; the QA profile remained unchanged.
  Saved-photo retention has native unit-test evidence, not a physical test on
  this build.

### POCO-only Group Details verification attempt, 2026-10-21

- The current audit estimate remains 85.0%. To inspect the post-fix Group
  Details and Group Post screens without creating data in the existing QA
  account, the emulator-QA builder was run with
  `C4C_QA_APPLICATION_ID_SUFFIX=.qa`. The build passed in 46 seconds and
  reported package `com.campus4change.qa`, version 1.3.0/code 6. Its APK
  SHA-256 is
  `ce46d7474f5e45c6a587b454dce81df1008fe6bf2408cb261b462da8ab61fc30`.
  Firebase config was restored byte-for-byte (SHA-256
  `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`).
- A malformed `.qa` suffix validation check failed before changing Firebase
  config. The POCO X4 GT USB serial `Z9GMOVDMHQV8X84D` reports model
  `22041216G`. Xiaomi rejected the side-by-side install with
  `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`; the current
  screen remains the existing `com.campus4change` Home screen, and package
  inventory confirms the `.qa` copy was not installed. No profile, app data,
  emulator data, production Firebase, or GitHub state was changed.
- Group Details and Group Post checks remain open until the POCO permits the
  temporary `.qa` package installation. Pad 7 remains unavailable; Redmi was
  not used.
- A read-only Developer Options UI dump confirmed the **Install via USB**
  checkbox is unchecked. One tap left it unchecked; I did not alter other
  security settings. The existing `__tests__/groupScreens.test.jsx` suite
  passed all 10 tests, including singular/plural reply labels and post-route
  accessibility behavior. This is automated evidence only; physical visual
  verification remains open.
- After that attempt, plain `./gradlew --no-daemon :app:assembleDebug` passed
  in 1 minute 10 seconds and left a Metro-dependent debug APK at the normal
  package ID `com.campus4change` (SHA-256
  `cd2e4037c9faa36c84b021fb08539dba8b165374521ec445b7cf4dfc10a23b13`). The
  APK has no embedded `assets/index.android.bundle`, as expected for the
  Metro-backed debug variant; it was not installed. The existing POCO app and
  its data remain untouched.

### Emulator App Check warning fix and release verification, 2026-10-21

- A cold start of the installed POCO QA app showed the React Native debugger
  warning banner. Logcat recorded repeated failures when the Android debug App
  Check provider tried to exchange an unregistered token for the demo Firebase
  project. The token value is not recorded here.
- `src/shared/backend/firebase.js` now skips App Check initialization only
  when `firebaseEmulatorHost` is set. The same module still initializes App
  Check for live Firebase, and it rejects emulator configuration in release
  builds. `__tests__/firebaseSignUp.test.js` now verifies that emulator mode
  connects Auth and Firestore locally without requesting App Check.
- The focused Firebase and App Check tests passed 42 tests across two suites.
  The `groupScreens` suite passed 10 tests. The full Jest suite passed 331
  tests across 40 suites, and full-project ESLint passed.
- The current emulator-QA APK built as package `com.campus4change.qa`, version
  1.3.0/code 6, with SHA-256
  `057c014b5f534117fb30a93079db5f737768875c19180f18582a0566e479332b`. The
  helper restored `firebaseConfig.js` to the production project, byte-for-byte
  SHA-256 `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`.
- `scripts/build-release.sh` rebuilt the signed v1.3.0/code 6 release APK and
  AAB. Their SHA-256 values are `b1bd6599581d57b47a053e1a8cd341820825d7bd94c3a6ed345cdbe5f0337702`
  and `fc17bb3004f49d35acc8390256486517dce8673c1f6c16fe51c803681dda9aa0`.
  `apksigner verify`, JAR signature verification, ZIP integrity, and Google
  [bundletool 1.18.3 validation](https://github.com/google/bundletool/releases/tag/1.18.3)
  passed. The release artifacts remain local and were not installed or
  published.
- A read-only Developer Options dump confirmed that **Install via USB** is
  unchecked. One tap did not change it. ADB still lists the POCO X4 GT at USB
  serial `Z9GMOVDMHQV8X84D`; its installed base APK remains the prior
  `com.campus4change` QA build, SHA-256
  `61383e10067e35dc44d618900baa0986ab92191fd6025bb1f0c304f2cdfde4f0`.
  The current `.qa` APK was not installed, so the App Check fix has no physical
  runtime verification. Existing app data was not cleared; Pad 7 was
  unavailable, and Redmi was not used.
- No production Firebase policy, production service, or GitHub state changed.
  The completion estimate remains 85.0% until the physical, production, CI, and
  synchronization gates in `COMPLETION_AUDIT.md` are satisfied.

### POCO read-only route sweep, 2026-10-21

- The POCO X4 GT (`22041216G`, USB serial `Z9GMOVDMHQV8X84D`) was running the
  prior QA package `com.campus4change`, version 1.3.0/code 6. Its installed
  `base.apk` SHA-256 was
  `61383e10067e35dc44d618900baa0986ab92191fd6025bb1f0c304f2cdfde4f0`. The
  latest emulator App Check change was not installed on the device.
- Without changing saved data, the Sessions tabs displayed the expected
  Upcoming, Requests, Completed, and Cancelled empty states. Messages showed
  its empty state and verification guidance. Profile and Edit Profile rendered
  the saved TIP program and campus. Learning Preferences and the tutor editor
  showed the 12 core and 12 specialization topic suggestions for Information
  Technology at the selected TIP campus. Focusing the private Student ID field
  opened the Android numeric keyboard; I entered and saved no text.
- Study Groups displayed its empty state. Submitting the blank Create Study
  Group form showed the required group-name and subject validation; no group
  was created. The hamburger menu opened Settings, which linked to Learning
  Preferences and About. The Create tab showed Book a Session, Create a Study
  Group, and Become a Tutor. Book a Session opened the verification-gated Tutor
  Directory without a misleading zero-result count, and no session was
  created. About rendered the current app objective, data and sharing
  boundaries, sign-in requirements, and unavailable services.
- Notifications displayed the existing email-verification notice. I did not
  select it, resend mail, or mark it read. Returning to Home still showed one
  unread notification. The existing account, profile, groups, sessions, and
  notification state were unchanged.
- This sweep verified representative routes on the prior QA package. Group
  Details and Group Post still lack a safe on-device fixture. At that time, the
  latest QA package had not yet been installed because Xiaomi's Install via USB
  setting was off; the later installation and launch are recorded in the
  subsequent POCO entry. No production or GitHub state changed, and the
  completion estimate remained 85.0%.

### Production Firestore state recheck, 2026-10-21

- The Firebase Rules API read-only GET returned active release
  `projects/campus4change/releases/cloud.firestore`, pointing to ruleset
  `projects/campus4change/rulesets/4f66efb8-d8d6-404c-83be-8a2b7b37588a`.
  The live rules source SHA-256 is
  `867e1b314fb639608ef4fe6978892ee6d337536be27a65b01b76c066679ec0a8`;
  local `firestore.rules` remains
  `25f0ec68a34ce0eb1964164dfa7fb9139413d99fa0ca1a5f323236bf4e302323`.
  The live source still lacks `studentIdClaims`, while the local rules contain
  that claim path and pass emulator tests.
- The read-only Firestore indexes API returned six production composite
  indexes, all `READY`. Local `firestore.indexes.json` also defines six. No
  production rules or indexes were changed.
- Live Student ID claim and duplicate-ID behavior remain unverified until the
  authorized project owner updates the production rules. This task does not
  permit deploying or changing those rules. The completion estimate remains
  85.0%.

### Current worktree credential-pattern scan, 2026-10-21

- A read-only scan covered 40 modified and untracked text files with six
  high-confidence patterns for private-key PEM blocks, AWS keys, GitHub tokens,
  Slack tokens, Google OAuth client secrets, and long bearer tokens. The scan
  found no matches and printed no credential values. It does not replace a
  full static-analysis or GitHub secret-scanning result.

### Isolated source-snapshot build verification, 2026-10-21

- Copied the current dirty worktree to `/tmp/c4c-clean-checkout-20261021`,
  excluding `.git`, `node_modules`, Android build outputs, and Gradle project
  caches. Checksums for `package-lock.json`, `firebase.js`,
  `android/app/build.gradle`, and the QA build helper matched the source
  worktree. The snapshot reused the machine's ignored
  `android/local.properties` SDK path.
- On Node.js 24.21.0, `npm ci` installed the locked dependencies successfully.
  npm reported 40 dependency advisories and blocked lifecycle scripts for four
  packages under the current npm policy. With JDK 25, `./gradlew assembleDebug`
  passed all 93 tasks in 3 minutes 30 seconds.
- The clean-snapshot debug APK reports package `com.campus4change`, version
  1.3.0/code 6, min API 24, and target API 36. It has no embedded
  `assets/index.android.bundle`, so it requires Metro and was not installed or
  launched. The current source is not yet a clean GitHub clone, and this check
  did not exercise a fresh SDK installation, the school laptop, macOS, or
  Termux.
- On the same snapshot, `npm test -- --runInBand --silent` passed 331 tests
  across 40 suites, and `npm run lint` passed. The run verified installation
  and build from the lockfile without changing the original worktree.
- A second isolated snapshot with the same fresh `npm ci` completed
  `C4C_QA_APPLICATION_ID_SUFFIX=.qa npm run android:qa-emulators` in 4 minutes
  19 seconds. The signed APK reports `com.campus4change.qa`, version
  1.3.0/code 6, min API 24, target API 36, and includes the JavaScript bundle
  for `demo-campus4change-rules` at `127.0.0.1`. Its SHA-256 is
  `d8070ad0977bb1f3c8fc48b8629a29962fa5824afee8abad5d521facebb943da`;
  `apksigner verify` passed. The helper restored Firebase config byte-for-byte
  to SHA-256 `8a9f95a1a5b504f11d7af156965bde87179c877651a94efe15fbba7530e7c5f3`.
  The APK was not installed. The temporary snapshot was removed.

### Current POCO QA package and visible launch, 2026-10-21

- After the user switched testing back from the lagging API 36 AVD, the POCO
  X4 GT was selected by USB serial `Z9GMOVDMHQV8X84D` (model `22041216G`). The
  separate `com.campus4change.qa` package is version 1.3.0/code 6. Its pulled
  `base.apk` SHA-256 matches the local `app-debug.apk` exactly:
  `057c014b5f534117fb30a93079db5f737768875c19180f18582a0566e479332b`.
- `com.campus4change.qa/.MainActivity` is running and displayed the branded
  Get Started screen. This verifies the current QA package identity, install,
  process launch, and initial rendering only; no account or feature workflow
  was exercised. The main `com.campus4change` package was left installed and
  untouched, and no app or Firebase data was cleared or created.
- The QA APK uses the local demo project `demo-campus4change-rules` at
  `127.0.0.1`. Auth and Firestore emulator ports 9099 and 8080 are listening,
  and POCO USB reverse mappings are active for both ports. Device-side
  `toybox nc -w 2 127.0.0.1 <port> </dev/null` probes returned exit code 0 for
  9099 and 8080. A synthetic sign-in with a nonexistent `example.invalid`
  account returned “Email or password is incorrect,” the app's expected
  invalid-credentials response. This confirms the app-to-Auth-Emulator error
  path; valid sign-in/sign-up and Firestore behavior remain unverified. No
  account or Firestore data was created. The source Firebase config remains
  blank for emulator host; the QA helper changes it only for the build and
  restores it byte-for-byte.
- The visible API 36 AVD was laggy and a QEMU run exited with code 137; it is
  not counted as app runtime evidence. No Pad 7 interaction was possible in
  this cycle. No application code changed; this audit/readiness documentation
  was corrected to reflect the device and emulator evidence. Nothing was
  pushed, deployed, or changed in production Firebase.

### POCO Auth Emulator invalid-credentials path, 2026-10-21

- From the installed `com.campus4change.qa` build, onboarding was skipped and
  the Login form was submitted with a synthetic nonexistent address under
  `example.invalid` and a fake password. The app displayed **Email or password
  is incorrect**, matching the Firebase Auth invalid-credentials mapping. This
  verifies an app-level Auth Emulator request and error response, not a
  successful sign-in or signup.
- No account or Firestore data was created or changed. Android Password
  Manager showed a save-password prompt after the failure; it was dismissed
  without saving. The app was returned to onboarding. POCO remained the only
  test device; Pad 7 was unavailable and Redmi was not used. No production
  Firebase or GitHub state changed, and the completion estimate remains 85.0%.

### Current-source POCO signup, Student ID, and cloud-state flow, 2026-10-21

- On the installed `.qa` package, a temporary Auth Emulator account was created
  through the app's email signup screen. The app showed its verification-email
  notice, opened required TIP account setup, and saved a test profile for
  Computer Science at T.I.P. Manila, year 2, with a synthetic digits-only
  Student ID. It reached Home without an error.
- The app cold-launched back into the signed-in Home screen. After signing out
  and signing back in through the app, the Profile screen displayed the saved
  name, course/year, and campus. Firestore REST reads with the emulator-issued
  test token confirmed that `users/{uid}/private/state` contained the profile
  and `studentIdClaims/{id}` belonged to the same UID. The account remained
  unverified, so verified-user shared features were not tested.
- Cleanup signed the app out, atomically released the test Student ID claim,
  deleted the private-state document and Auth account, and verified with the
  Security-Rules-disabled emulator test SDK that both Firestore documents were
  absent. An Auth Emulator sign-in attempt then returned `EMAIL_NOT_FOUND`.
  `com.campus4change.qa` app data was cleared and its cold launch returned to
  Get Started. The main `com.campus4change` package was untouched.
- Only the POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used.
  No production Firebase or GitHub state changed. The weighted estimate is
  85.0%; current-source Auth signup/sign-in and profile/Firestore behavior is now
  verified on one device, while production rules, two-device checks, CI on the
  final source, and publication remain open. The percentage is unchanged
  because the audit's testing category still requires current-source behavior
  on a second device and CI on the final source.

### Current-source POCO duplicate Student ID rejection, 2026-10-21

- A rules-disabled emulator preflight confirmed that the selected synthetic
  digits-only Student ID had no existing claim. Through the current `.qa` app,
  a first unverified Auth Emulator account completed TIP setup and claimed it.
  A second, distinct Auth Emulator account selected the same Computer Science
  program, campus, year, and ID. Tapping **SAVE AND CONTINUE** kept that account
  on **Set up your account** and showed **That Student ID is already in use,
  or could not be verified. Check the number and try again.** The Firestore
  claim still belonged to the first account.
- Focused Jest checks passed: 46 tests across
  `editProfileValidation.test.jsx` and `firebaseSignUp.test.js`. These cover
  the account-setup error handling and Firebase claim-error mapping; the POCO
  check verified that the complete app flow reaches that behavior.
- Cleanup deleted the second account's private state and Auth user, released
  the first account's claim atomically, then removed its private state and Auth
  user. A Security-Rules-disabled emulator read confirmed that both state
  documents and the claim were absent; Auth sign-in attempts for both returned
  `EMAIL_NOT_FOUND`. QA package data was cleared and a cold launch showed
  **Get Started**. The main app package was untouched.
- Only the POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used.
  No application source, production Firebase, or GitHub state changed. The
  estimate remains 85.0%; local duplicate-ID enforcement is now verified on
  the current build. Production-rule parity, current-source QA on Pad 7, final
  source CI, and publication remain open.

### Current-source POCO email verification and shared-directory gate, 2026-10-21

- A disposable account signed up through the current `.qa` app and completed
  TIP account setup. Before verification, Find People showed **Verify your
  email to browse tutors** and explained that listings require a verified
  Firebase email.
- The Auth Emulator produced a `VERIFY_EMAIL` out-of-band code for the test
  account. Applying it through the emulator's local Identity Toolkit endpoint
  returned `emailVerified: true`; an Auth lookup independently confirmed the
  verified claim. In the app, **I've verified — check again** reloaded the
  account and displayed **Email verified**. Find People then showed
  **Public community profiles · 0** and **No public profiles yet**, the normal
  empty state instead of the verification gate. The emulator had no public
  tutor profiles to list.
- Cleanup signed out the test account, atomically released its Student ID
  claim, deleted its private state and Auth identity, and verified both
  Firestore documents were absent. Auth sign-in then returned `EMAIL_NOT_FOUND`.
  QA package data was cleared and the next cold launch showed **Get Started**.
- Only the POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used.
  No application source, production Firebase, or GitHub state changed. The
  estimate remains 85.0%; production auth/rules, current-source Pad 7 QA, CI on
  the final source, and publication remain open.

### POCO Group Details singular count fix and post-fix Group Post verification, 2026-10-21

- A verified emulator-backed account created a temporary shared study group,
  posted one study note, and replied to it on the current POCO `.qa` app. The
  Details and Post screens rendered the group, owner, note, reply, meetup, and
  shared-membership content. A physical screenshot of Group Details reproduced
  **1 members** for a one-member group.
- `GroupDetailsScreen.jsx` now uses singular **member** when the count is 1 and
  plural **members** otherwise. The focused `groupScreens.test.jsx` suite passed
  all 10 tests, then the full Jest suite passed 331 tests across 40 suites and
  `npm run lint` passed after the fix. The emulator-only QA APK built
  successfully as version 1.3.0/code 6. A first update attempt used the
  machine-private debug signer and was rejected by Android; no uninstall or
  data clear occurred. Rebuilding with the repository debug keystore matched
  the installed signing certificate and the in-place update succeeded.
- After the update and cold launch, Study Groups still showed the synthetic
  group. Group Details displayed **1 member**; its post summary displayed
  **1 reply**. Opening the post still showed the expected note and reply. The
  installed `base.apk` SHA-256 matches the rebuilt artifact:
  `98bab7cba3b912abe82d50a07367c4df9c49769a1a183deae0760c091e21fc`.
- Cleanup removed the temporary group, membership, post, reply, write limit,
  action receipts, private account state, Student ID claim, and Auth user. A
  rules-disabled emulator read confirmed those documents were absent; Auth
  sign-in returned `EMAIL_NOT_FOUND`. QA package data was cleared and it
  launched to **Get Started**. Only POCO X4 GT was used; Pad 7 was unavailable
  and Redmi was not used. No production Firebase or GitHub state changed. The
  estimate remains 85.0% while the all-route, second-device, production, CI,
  release, and presentation gates remain open.

### POCO saved profile photo survives draft discard, 2026-10-22

- On the installed `com.campus4change.qa` v1.3.0/code 6 package, a temporary
  Auth Emulator account saved a synthetic red image as its profile photo. The
  resulting app-private file was 8,008 bytes with SHA-256
  `995aad3bf2cb776c704745152b9d0e6794d1009755146382989f0cf5b5b1802a`.
- The account selected a distinct synthetic blue image from Downloads in Edit
  Profile. After the blue preview appeared, the Back action showed **Discard
  unsaved changes?** and **DISCARD CHANGES**. The app returned to Profile with
  the red image; the private photo directory contained only the original file
  with the same size and SHA-256.
- A force-stop and cold launch returned to Home with the red profile image.
  Reopening Edit Profile displayed the same saved photo, and its app-private
  file hash remained unchanged. The focused
  `npm test -- --runInBand __tests__/profileAvatarEditor.test.jsx` command
  passed all five tests.
- Cleanup deleted the temporary Auth Emulator account, its private state, and
  its Student ID claim. A rules-disabled emulator read confirmed the Firestore
  documents were absent, and Auth Emulator sign-in returned `EMAIL_NOT_FOUND`.
  The QA package data, app-private image, synthetic Downloads and Pictures
  files, and their MediaStore rows were removed. A cold launch returned to
  **Get Started**.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  source code, production Firebase, or GitHub state changed. This closes one
  physical QA gap and raises Testing and QA by 0.25 points, from 9 to 9.25 of
  10. The weighted completion estimate is 85.25%; Pad 7, current-source
  two-device workflows, production rules, release sign-in/App Check, final
  source CI, and presentation rehearsal remain open.

### Current-source signed release build and keyring lookup, 2026-10-22

- `scripts/build-release.sh` now uses the keyring account when configured. With
  no account attribute, it checks the release-signing service for exactly one
  GNOME Secret Service item and uses that entry. If multiple items match, it
  leaves password entry to the explicit account setting or hidden prompt. The
  service-only password was checked against the existing JKS without printing
  it. The helper then read it through Secret Service and completed without a
  password prompt.
- `./scripts/build-release.sh` passed `bash -n`, `assembleRelease`, and
  `bundleRelease` from the current worktree. It produced version 1.3.0/code 6
  APK `android/app/build/outputs/apk/release/app-release.apk` with SHA-256
  `76790483e83fcc2f870949eaf4761c3848e3b4d52a5b2abd7f6ee7855f86d211` and AAB
  `android/app/build/outputs/bundle/release/app-release.aab` with SHA-256
  `9ac3b5997e9efa46ee96bdfc1f267d94888d656a2afb6f548eeb9bebfafc468c`.
- `apksigner verify` passed for the APK. It reports package
  `com.campus4change`, version code 6, min API 24, and target API 36. The APK
  signer SHA-256 is
  `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7` and its
  SHA-1 is `21241e9a18ab8531f5b383a55d8714c980c807d5`. `jarsigner` verified the
  AAB signature, `unzip -t` found no archive errors, and official bundletool
  1.18.3 validated the AAB. The temporary tool came from the [Google bundletool
  1.18.3 release](https://github.com/google/bundletool/releases/tag/1.18.3);
  its SHA-256 matched the release API digest
  `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`. The
  downloaded tool was removed after validation, and no signing credential was
  added to the repository.
- This closes the stale-artifact portion of the signed-release check. Firebase
  still lacks the v3 certificate fingerprints. Google sign-in, Play Integrity,
  and App Check remain unverified.
  The JKS and keyring item remain local; a separate recovery backup was not
  checked. No release was installed or published, and no production Firebase
  or GitHub state changed. The completion estimate increases by 0.25 to 85.5%.

### POCO current-source signed release install and cold launch, 2026-10-22

- The POCO main package `com.campus4change` was version 1.3.0/code 6 but used a
  different signing certificate. The user had previously approved
  replacement-key migration. Uninstalling the old signer cleared device-local
  data and photos; the release test did not access Firebase Auth or Firestore.
- HyperOS first returned `INSTALL_FAILED_USER_RESTRICTED` while its **Install
  via USB** confirmation timed out. A monitored retry detected the
  `com.miui.securitycenter` prompt, tapped the **Remember my choice** checkbox
  and **Install** button, and ADB returned `Success`.
- Package metadata reports `com.campus4change`, version 1.3.0/code 6, minimum
  API 24, and target API 36. The installed `base.apk` SHA-256 matches the
  local release APK exactly at
  `76790483e83fcc2f870949eaf4761c3848e3b4d52a5b2abd7f6ee7855f86d211`. The
  installed signer SHA-256 is
  `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7`.
- A fresh launch displayed the branded **Get Started** screen. The filtered
  process log had no React Native or Android fatal-error matches, but reported
  Firebase App Check token failures. The exact server-side cause was not
  confirmed. The read-only Firebase SHA list check on 2026-10-22 found the v3
  certificate unregistered. No sign-in or Firestore operation was attempted.
- `npx --yes firebase-tools@15.33.0 apps:android:sha:list
  1:722562628798:android:5c20a4828a4478337132ef --project campus4change`
  returned five registered SHA hashes. Neither the v3 SHA-1
  `21241e9a18ab8531f5b383a55d8714c980c807d5` nor SHA-256
  `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7`
  appeared in the response. This confirms the fingerprint registration gap but
  does not establish the cause of the App Check token failure. The CLI command
  was read-only; no Firebase setting changed.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. The
  release APK is installed locally; the AAB is local and unpublished. No
  Firebase Auth/Firestore documents, production settings, or GitHub state
  changed during install or launch. Uninstalling the prior signer cleared
  device-only data and photos. The estimate remains 85.5% while release authentication, App Check, Pad 7
  and current-source two-device QA, current-source CI, and the school laptop
  rehearsal remain open.


### POCO signed release onboarding-to-login smoke, 2026-10-22

- After resetting the newly installed release app's local state, a direct
  `MainActivity` launch displayed the logo and **GET STARTED** screen. Tapping
  it opened Introduction 1. **NEXT** advanced to **2 / 3**, labeled **For
  Intermediates**, then to **3 / 3**, labeled **For Experts**. The final **GET
  STARTED** action opened **Welcome back!** Login.
- The visible Login screen included email and password fields, **Forgot
  password?**, **SIGN IN**, **Continue with Google**, **Sign up**, and **About
  Campus4Change**. No email or password was entered, no sign-in action was
  submitted, and no Auth/Firestore account operation was attempted.
- This release-only first-run navigation passed on POCO X4 GT. Pad 7 was
  unavailable and Redmi was not used. The release app remains at Login. The
  UI/UX estimate rises by 0.25 points, from 12.5 to 12.75 of 15; the total
  estimate is 85.75%. All-route review, release auth/App Check, two-device QA,
  current-source CI, production rules, and school-laptop rehearsal remain open.

### Focused source review and publication hygiene, 2026-10-22

- A focused code review examined the profile-photo recovery and cleanup path,
  Student ID retry logic, Firebase emulator isolation, the release signing
  helper, and the QA build guard. It found no new actionable defect in those
  reviewed paths. The existing regression suites and release build cover the
  corresponding changes; this review does not replace full route QA.
- A high-confidence credential scan covered 34 modified tracked files and six
  untracked text files. It found no private-key PEM, GitHub/Slack/AWS token,
  OAuth token, or service-account key patterns. The scan did not treat public
  Firebase client configuration as a private credential. `git diff --check`
  passed, and `npm run check:public-drive-links` found no Google Drive file
  links in tracked files.
- Read-only `git ls-remote` confirmed that remote `main` remains at
  `46fe89a534d98866dc981ef11fe64f24151e8bf4`, matching local `HEAD`. All
  current changes remain uncommitted and unpushed. No code or Firebase setting
  changed in this review batch; current-source CI and GitHub synchronization
  remain open.

### POCO signed release empty-login validation, 2026-10-22

- On the signed `com.campus4change` release, the Login screen showed empty email
  and password fields. Pressing **SIGN IN** with both empty displayed
  **Enter your email and password.** The `LoginScreen.signIn()` handler checks
  both values and returns before calling its submit callback.
- No credential was entered, and no Firebase Auth or Firestore action was
  submitted. This verifies the release's client-side validation state only;
  release Google sign-in and App Check remain unverified.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  source code, production configuration, or GitHub state changed. The
  completion estimate remains 85.75% while backend, second-device, CI, and
  presentation gates remain open.


### POCO signed release sign-up validation, 2026-10-22

- On the signed release app at Login, opening **Sign up** displayed the email
  account form. Pressing **CREATE ACCOUNT** with the name, email, and password
  fields empty displayed a message requiring a name, valid email, and password length
  between 8 and 1024 characters. The `SignUpScreen.submit()` handler validates
  those values and returns before calling `auth.signUp()`.
- No credential was entered and no Auth or Firestore request was submitted.
  The release app remains on the form with its local validation message. The
  focused `googleAuthScreens.test.jsx` suite passed all 10 tests.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  source code, production configuration, or GitHub state changed. This closes
  one release UI validation gap; the estimate is 86.0%, with release Auth/App
  Check, production rules parity, Pad 7/two-device QA, current-source CI, and
  school-laptop rehearsal still open.


### POCO signed-release About copy fix, 2026-10-22

- Reproduced the signed-out About copy bug on the release app: it described
  Firebase data as belonging to an active device-only account. Updated the
  screen to distinguish signed-out Firebase, signed-in Firebase, and a
  signed-in device-only account. Added regression coverage for the signed-out
  and device-only states.
- The focused `aboutScreen.test.jsx` suite passed all three tests. The full
  Jest suite passed 333 tests across 40 suites and ESLint passed after the
  implementation change. `git diff --check` passes after removing one extra
  blank line at the end of the test file.
- `scripts/build-release.sh` completed for version 1.3.0/code 6. `apksigner`
  verified the APK; its SHA-256 is
  `aad0d97ee792256a4cb49b47b2f2f0b468055299d54f9ea67f4c7f8e218c5c8c` and its
  release signer matches the installed app. `jarsigner -verify` and ZIP
  integrity checks passed for the AAB, SHA-256
  `9d74ed6d940e237f480e1b5703e416c77d45d53ffecab068c87a1eee001ca586`;
  `jarsigner` reports the self-signed certificate and absent timestamp as
  warnings.
- The APK installed in place on POCO X4 GT. The pulled installed APK hash
  matched the local release artifact exactly. After a cold launch, the Login
  screen's **About Campus4Change** route showed “No account is currently signed
  in” and Firebase sign-in guidance; it no longer showed device-only account
  claims. No credentials were entered and no Auth or Firestore operation was
  attempted. Filtered Android fatal-error logs were empty.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  production Firebase setting or GitHub state changed. The weighted estimate
  remains 86.0%; release Auth/App Check, production-rule parity, Pad 7 and
  two-device QA, current-source CI, and school-laptop rehearsal remain open.


### Read-only production Firebase parity recheck, 2026-10-22

- The authenticated Firebase Rules API GET still points the default Firestore
  release to ruleset
  `projects/campus4change/rulesets/4f66efb8-d8d6-404c-83be-8a2b7b37588a`,
  updated `2026-10-17T09:33:15.974367Z`. Its source SHA-256 is
  `867e1b314fb639608ef4fe6978892ee6d337536be27a65b01b76c066679ec0a8`; local
  `firestore.rules` hashes to
  `25f0ec68a34ce0eb1964164dfa7fb9139413d99fa0ca1a5f323236bf4e302323` and
  contains the `studentIdClaims` match. The active production source does not.
- The read-only Firebase CLI SHA list returned five hashes for the Android
  app. The current release signer SHA-1
  `21241e9a18ab8531f5b383a55d8714c980c807d5` and SHA-256
  `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7` were
  absent. This confirms a registration gap; it does not prove the exact cause
  of the observed release App Check failures.
- Both checks were read-only. No production authorization, app registration,
  Auth/Firestore data, or GitHub state changed. Under the current task's
  production-change restriction, live Student ID uniqueness and release
  authentication remain unverified.

### Current dependency advisory and release bundle scope, 2026-10-22

- A fresh `npm audit --omit=dev --json` reports 20 high paths and zero
  critical. `npm explain braces` traces them through `braces@3.0.3` →
  `micromatch@4.0.8` → `fast-glob@3.3.3` into React Native CLI and Metro. The
  [active GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  lists no patched braces version. npm's suggested React Native `0.72.17` fix
  would downgrade the app from `0.87.1`, so it is not a compatible remedy.
- The current release source map contains 653 sources and no `braces`,
  `micromatch`, or `fast-glob` module paths; the release JavaScript bundle
  contains no `node_modules/braces` path. No direct `braces` import was found
  under the application source. The reviewed exposure is therefore in local
  build tooling, not the shipped app bundle.
- The advisory remains open for build-time use of untrusted brace patterns;
  no safe upstream patch is available. No dependency or application code was
  changed in this batch.

### Current-source POCO Settings route, 2026-10-22

- Rebuilt the emulator-QA APK from the current checkout with
  `C4C_QA_APPLICATION_ID_SUFFIX=.qa npm run android:qa-emulators`. Gradle
  completed successfully in 1m52s, and the helper reported restoring
  `firebaseConfig.js` byte-for-byte. APK package/version:
  `com.campus4change.qa`, 1.3.0/code 6.
- Installed in place on POCO X4 GT. `apksigner verify` passed, and the pulled
  installed `base.apk` SHA-256 exactly matched the local APK:
  `4393c043889e4ac5d137ccebc19efcbfe2a2aadd8a6f6ee0411bcc1f8755c50d`.
- Using a disposable account against only the local Auth and Firestore
  emulators, completed TIP setup, opened the hamburger menu, and opened
  **Settings**. The screen showed **Learning Preferences** and **About**; no
  biometric-login control is present. A screenshot and accessibility hierarchy
  confirmed the screen. The focused `App.test.jsx` suite passed all 33 tests.
- Cleanup deleted the test account's Firestore private-state document, matching
  Student ID claim, and Auth Emulator user. Cleanup readback confirmed all three
  were absent. The Auth Emulator also held one stale verification code for
  the deleted test account; following its local-only link returned 400, and
  the next OOB list read showed zero matching codes. No real email was sent.
  Clearing only the QA app package returned its cold launch to **GET STARTED**;
  the release package was untouched.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  production Firebase, GitHub, or other emulator-project data changed. The
  weighted completion estimate remains 86.0%; full route review, Pad 7 and
  two-device QA, production/release checks, current-source CI, and school-laptop
  rehearsal remain open.

### Current-source Learning Preferences QA, 2026-10-22

- Reused the current emulator-QA APK on POCO X4 GT. Its local artifact and
  pulled installed APK matched at SHA-256
  `4393c043889e4ac5d137ccebc19efcbfe2a2aadd8a6f6ee0411bcc1f8755c50d`; the
  bundle contains the demo project ID and `127.0.0.1` emulator host. No app
  source changed since that QA build.
- From the hamburger menu, **Settings → Learning Preferences** opened with the
  saved TIP Manila Computer Science course selected. The editor showed its core
  subjects and specialization areas. Searching for “natural language” reduced
  the specialization list to **Natural language processing**. Selecting it
  showed a 1/20 count and grouped the topic under Computer Science. Adding the
  custom topic **Graph theory** raised the count to 2/20.
- **SAVE CHANGES** returned to Settings. Reopening Learning Preferences showed
  both topics in the Computer Science · T.I.P. Manila group. The current owner
  document in the Firestore Emulator also contained both values.
- The focused `interestEditor.test.jsx` suite passed all four tests. Cleanup
  removed the synthetic Auth Emulator account, private state, Student ID claim,
  and its pending verification code; cleanup checks confirmed each was gone.
  Clearing the QA app package returned the next cold launch to **GET STARTED**.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. The
  QA bundle targeted only the local demo project; no production Firebase or
  GitHub data changed. Full route QA, Pad 7/two-device tests, release Firebase
  checks, current-source CI, and school-laptop rehearsal remain open. The
  completion estimate remains 86.0%.

### Current-source cross-course interest grouping, 2026-10-22

- A second disposable local-emulator account opened Settings → Learning
  Preferences on the installed current-source QA APK (`com.campus4change.qa`,
  SHA-256 `4393c043889e4ac5d137ccebc19efcbfe2a2aadd8a6f6ee0411bcc1f8755c50d`).
- The program picker distinguished Information Technology at T.I.P. Manila and
  Quezon City. Selecting Manila and adding **Cloud computing and deployment**
  created an Information Technology group. Switching the ideas selector to
  Computer Science and adding **Computer programming** created a separate
  course group; the shared selection counter reported 2/20.
- Saving, returning to Settings, and reopening Preferences displayed both
  Manila course groups. An owner read of the local Firestore Emulator private
  state confirmed distinct Information Technology and Computer Science groups
  with their respective topics. The initial CS-only interest flow is recorded
  in the immediately preceding Preferences entry.
- Cleanup removed the synthetic account, its private state, its Student ID
  claim, and its pending email-verification code. Clearing the QA package
  returned the POCO to **GET STARTED**; the release package was untouched. No
  production Firebase or GitHub data changed. The current-source multi-course
  route is now physically verified on POCO; Pad 7, full route review, release
  Firebase, current-source CI, and school-laptop rehearsal remain open. The
  completion estimate remains 86.0%.

### Current-source floating verification notification, 2026-10-22

- On POCO X4 GT's installed current-source `com.campus4change.qa` build, a
  disposable local Auth Emulator signup showed the account setup flow. In the
  Notifications screen, **Resend verification email** triggered the current
  `NotificationToast`. A screenshot showed the raised, rounded card with a
  success icon, message, dismiss control, and **VIEW NOTIFICATION** action.
- Returning to Home showed no persistent email-verification banner. Tapping the
  floating toast from Home opened Notifications, where **Verify your email**
  and the resend/check actions were visible. The verification message was sent
  only through the local emulator; no real email was sent.
- `notificationToast.test.jsx` and `emailVerificationBanner.test.jsx` passed all
  8 focused tests. The synthetic Auth user was deleted; Auth Emulator readback
  confirmed no pending verification codes remained. The QA app was cleared and
  cold-launched to **GET STARTED**. Only POCO X4 GT was used; Pad 7 was
  unavailable and Redmi was not used. No production Firebase or GitHub state
  changed. The completion estimate remains 86.0%; release auth/App Check, Pad
  7 and two-device QA, current-source CI, and school-laptop rehearsal remain
  open.

### Current-source POCO interest-based tutor recommendation, 2026-10-22

- The installed QA APK was verified against the current local artifact at
  SHA-256 `4393c043889e4ac5d137ccebc19efcbfe2a2aadd8a6f6ee0411bcc1f8755c50d`;
  its JavaScript bundle points to `demo-campus4change-rules` and `127.0.0.1`.
- Using only the Auth and Firestore emulators, one verified TIP Manila Computer
  Science account published a tutor listing for **Natural language processing**.
  A second verified student account saved the same learning interest. In the
  POCO app, **Find People** displayed the tutor at the top under
  **Recommended for your interests**, with an exact matched-interest label.
  Tapping the card opened the tutor's profile, subject, and session request
  details. This verifies the current app, Auth verification gate, tutor write,
  directory read, interest ranking, and profile navigation together.
- Cleanup removed both Auth Emulator accounts, their private-state documents
  and Student ID claims, and the tutor listing. Both local verification links
  were consumed; readback confirmed no pending OOB codes. The QA package data
  was cleared and cold-launched to **GET STARTED**.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  production Firebase, release settings, or GitHub state changed. The weighted
  estimate remains 86.0%; current-source two-device QA, live production parity,
  CI on the final source, and school-laptop rehearsal remain open.

### Read-only production composite-index parity recheck, 2026-10-22

- The authenticated Firestore indexes API returned six production composite
  indexes. I matched each against `firestore.indexes.json` by collection group,
  query scope, field path, and field ordering (ignoring Firestore's implicit
  `__name__` suffix). All six local definitions matched a production index,
  and all six reported `READY`.
- This check was read-only. No production rules, indexes, data, or GitHub state
  changed. The active production Firestore rules still lack `studentIdClaims`,
  and the release certificate remains unregistered; those higher-priority
  gates remain open under the current production-change restriction.

### Completion report and public-link consistency check, 2026-10-22

- Parsed the six category rows in `COMPLETION_AUDIT.md`: weights sum to 100
  and earned points sum to 86.0, matching the reported estimate.
- `npm run check:public-drive-links` passed and found no Google Drive file
  links in tracked files. `git diff --check` passed.
- Local `main` and `origin/main` remain at
  `46fe89a534d98866dc981ef11fe64f24151e8bf4`; 34 tracked files are modified
  and six are untracked. No files were staged or committed, and nothing was
  pushed. The dirty worktree remains preserved.

### Fresh local quality suite, 2026-10-22

- `npm test -- --runInBand` passed 333 tests across 40 suites. `npm run lint`
  passed.
- `./gradlew --no-daemon testDebugUnitTest --rerun-tasks` completed
  successfully; the generated JUnit reports contain 21 Android unit tests,
  zero skipped, zero failures, and zero errors.
- `git diff --check` passed. No application source, Firebase production
  configuration, or GitHub state changed in this verification batch. The
  completion estimate remains 86.0%.

### Current-source POCO unsaved-profile exit confirmation, 2026-10-22

- The current emulator-QA build (`com.campus4change.qa`, SHA-256
  `4393c043889e4ac5d137ccebc19efcbfe2a2aadd8a6f6ee0411bcc1f8755c50d`) was
  used on POCO X4 GT with a disposable Auth Emulator account. In Edit Profile,
  changing the full name and pressing Back displayed **Discard unsaved
  changes?** with **Keep editing** and **Discard changes** actions.
- **Keep editing** closed the alert and kept the draft on screen. Pressing Back
  again and choosing **Discard changes** returned to Profile and showed the
  original saved name. A pre-cleanup Firestore Emulator read verified that the
  persisted profile still held the original name and did not contain the draft.
- `__tests__/App.test.jsx` passed all 33 tests, including the matching exit
  confirmation behavior. Cleanup removed the synthetic Auth user, private
  state, Student ID claim, and pending verification code; the QA app returned
  to **GET STARTED**. The release package remained installed and untouched.
- Only POCO X4 GT was used. Pad 7 was unavailable and Redmi was not used. No
  production or GitHub state changed. Full current-source route QA, Pad 7 and
  two-device checks, release Firebase, CI, and school-laptop rehearsal remain
  open; the estimate stays at 86.0%.

### Current-source POCO digits-only profile validation, 2026-10-22

- `__tests__/editProfileValidation.test.jsx` passed all 7 tests. The focused
  `App.test.jsx` suite passed 33 tests. The installed QA APK matched the local
  current-source artifact at SHA-256
  `4393c043889e4ac5d137ccebc19efcbfe2a2aadd8a6f6ee0411bcc1f8755c50d`.
- On POCO X4 GT, I opened Edit Profile, injected alphabetic characters into the
  Year level and Student ID fields, and checked the accessibility values. The
  year field contained only a digit; the Student ID remained digits-only.
- Pressing Back with the draft changed showed **Discard unsaved changes?**.
  The saved profile's original name, year 2, and numeric ID remained stored.
  Choosing **Discard changes** returned to Profile with the original name and
  course/year. This reproduced the validation and exit-confirmation behavior
  on the current QA build.
- Cleanup removed the synthetic Auth Emulator account, private-state document,
  Student ID claim, and pending verification code; cleanup readback confirmed
  the account/claim/OOB code absent, and the QA app returned to **GET STARTED**.
  Only POCO X4 GT was used; Pad 7 was unavailable and Redmi was not used. No
  production or GitHub state changed. The completion estimate remains 86.0%.

### TIP program catalog coverage and signed release rebuild, 2026-10-22

- Read-only review of current official TIP program pages found four program
  entries missing from the local catalog: Artificial Intelligence and Internal
  Auditing in Manila, plus Design and Technology and Accounting Information
  Systems in Quezon City. `tipPrograms.js` now contains 49 campus-program
  entries. The new AI, Design and Technology, and Internal Auditing topic prompts
  use official program outcomes and descriptions as suggestions, not course
  titles. The official pages are linked in `docs/QUALITY_AUDIT.md`.
- `profileCatalog.test.js` verifies 49 unique IDs, both topic groups, the new
  program-campus mappings, and searchable Artificial Intelligence and Design
  and Technology entries. It passed all three tests. The full Jest suite passed
  333 tests across 40 suites, and ESLint passed.
- The current `.qa` APK rebuilt and installed on POCO X4 GT. Its hash matched
  the local artifact at
  `f16c24eb357af85b955ccf1e9d0003f51c9b9868f6b13653e7142192d6a63850`. The
  setup picker returned each new program under the correct campus and college.
  Preferences rendered suggestions for all four programs. The temporary Auth
  account was removed, the QA app returned to **GET STARTED**, and no emulator
  test records remained.
- `scripts/build-release.sh` rebuilt the signed 1.3.0/code 6 APK and AAB.
  `apksigner verify`, `jarsigner -verify`, ZIP integrity, and bundletool
  1.18.3 validation passed. APK hash:
  `d5351481c2f106a48e7557bd560a6fccb55bb8bc7da821178e72d107d625042b`.
  AAB hash:
  `811ba7818eccd9cfdcf34bd9211de3cfc7389f21b1690b4f01064fbb86e78da3`.
  The signed APK installed in place on POCO, its pulled base hash matched, and
  a cold launch reached Login. No sign-in or production write was attempted.
- No production Firebase setting, GitHub state, or commit changed. Pad 7 remains
  unavailable; release Firebase, current-source CI, two-device QA, and
  school-laptop rehearsal remain open. The completion estimate remains 86.0%.

### Local CI-equivalent checks, 2026-10-22

- `:app:assembleDebugAndroidTest` completed successfully on the current local
  worktree. This compiled the Android instrumentation-test APK; the API 24
  emulator run remains unverified because the requested test device is the
  POCO and the user has asked to avoid the laggy emulator.
- The local Auth and Firestore emulator suites passed against the already
  running `demo-campus4change-rules` emulator from this checkout:
  `test:firestore-rules`, `test:booking-overlap`, `test:group-client-rules`,
  and `test:firebase-auth`. The permission-denied messages in Firestore logs
  correspond to expected denial assertions in those suites.
- A fresh `emulators:exec` attempt could not bind ports 9099 and 8080 because
  this project's emulator was already active. Its project ID and checkout were
  verified, so it was reused without stopping or altering the service.
- No production Firebase setting, GitHub state, or commit changed. Pad 7,
  production release Auth/App Check, production rules parity, GitHub CI on the
  final pushed source, two-device QA, and school-laptop rehearsal remain open.
  The weighted completion estimate remains 86.0%.

### GitHub main baseline CI, 2026-10-22

- Read-only GitHub Actions inspection found run `39366032936` for commit
  `46fe89a534d98866dc981ef11fe64f24151e8bf4` completed successfully on
  2026-10-20. Both `checks` and `api24-instrumentation` jobs passed, including
  lint, JavaScript tests, Firebase emulator suites, Android unit tests,
  instrumentation compilation, API 24 instrumentation, and build checks.
- `git ls-remote origin refs/heads/main` confirmed that the current remote
  `main` and local `HEAD` are both `46fe89a534d98866dc981ef11fe64f24151e8bf4`.
  The existing remote CI is green for this baseline only; the current local
  changes are uncommitted and were not part of that run.
- No commit or push was made. The final-source CI gate remains open until the
  reviewed local changes are eligible for publication under the active task
  limits and CI passes on that exact commit.

### Release certificate registration check, 2026-10-22

- Read-only Firebase CLI inspection confirmed project `campus4change` has one
  Android app, `Campus4Change Android`, app ID
  `1:722562628798:android:5c20a4828a4478337132ef`. Its registered SHA list does
  not contain the current signed release certificate.
- `apksigner verify --print-certs` on the current release APK reports SHA-1
  `21241e9a18ab8531f5b383a55d8714c980c807d5` and SHA-256
  `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7`. Neither
  fingerprint appears in the Firebase app's five registered SHA entries.
  Google sign-in for this locally signed release therefore remains unverified;
  the missing registration is a confirmed configuration gap, not proof that it
  is the only cause of any sign-in failure.
- This was a read-only check. No Firebase settings, production rules, GitHub
  state, or commits changed. Release registration/authentication remain open
  under the active no-production-change task limit.

### Current-source POCO onboarding and signup smoke, 2026-10-22

- ADB identified only the authorized POCO X4 GT over USB. The installed
  `com.campus4change.qa` v1.3.0/code 6 APK SHA-256 matched the local QA artifact
  exactly: `f16c24eb357af85b955ccf1e9d0003f51c9b9868f6b13653e7142192d6a63850`.
- Cold start showed the accessible Campus4Change logo and **GET STARTED**.
  The first-start path opened the three-page introduction, then **Welcome
  back!** sign-in. The screen exposed Google sign-in, email sign-in, sign-up,
  About, and optional additional sign-in options.
- Expanding the optional sign-in options exposed **Use existing on-device
  account**; no biometric control appeared. The signup screen showed Google
  signup and email fields, with no demo account or demo credentials. An empty
  **CREATE ACCOUNT** submission stayed on the screen and showed inline name,
  email, and password validation.
- No credentials were entered and no account was created. Clearing only the
  local QA package restored the first-start state; cold launch again showed the
  logo and **GET STARTED**. Only POCO X4 GT was used; Pad 7 was unavailable and
  Redmi was not used. No production Firebase or GitHub state changed.

### Release-signing guide consistency, 2026-10-22

- Cross-checking `docs/FIREBASE_SETUP.md` against `docs/BUILDING.md` and
  `docs/QUALITY_AUDIT.md` found both guides said a release SHA was registered
  without distinguishing the prior signer from the current replacement.
- Updated both guides to identify the v1.2.2 release signer as the previously
  registered certificate and the v1.3.0 replacement as unregistered, linking
  the build instructions to current Firebase details. No app code or
  production setting changed; the completion estimate remains 86.0%.

### Current-source POCO group-session verification, 2026-10-22

- `android-wireless-connect` found no paired device advertising Wireless
  Debugging. A fresh `adb devices -l` showed only the POCO X4 GT over USB; Pad 7
  was unavailable and Redmi was not used. The installed `com.campus4change.qa`
  APK matched the local artifact SHA-256
  `f16c24eb357af85b955ccf1e9d0003f51c9b9868f6b13653e7142192d6a63850`.
- After creating a disposable Auth Emulator account, saving a TIP profile,
  applying its local verification code, and signing in again to refresh the
  verified claim, the POCO opened the Group Session screen through a shared
  group. The group was a leftover `Client Adapter Group` fixture from the local
  group-client rules suite; it was not production data.
- The physical screen showed **Group Session**, member count, **NOT SCHEDULED**,
  topic, date/time placeholders, location, **Agenda and notes**, private-draft
  guidance, and **RETURN TO GROUP**. No Focus timer or timer-start control was
  present. The screenshot was inspected visually. Focused `groupStudyRoom`
  and group-creation App tests also passed: 4 tests across 2 suites.
- Cleanup deleted the disposable Auth Emulator user, cleared the dedicated
  Firestore demo project through its emulator admin endpoint (HTTP 200), and
  cleared only the QA package's device data. The Auth Emulator then showed zero
  remaining verification codes for the test address, and a cold launch returned
  to the branded **GET STARTED** screen. No production Firebase setting,
  GitHub state, or release artifact changed. The completion estimate remains
  86.0%; a current Pad 7 check and the wider all-route sweep remain open.

### Repository secret-hygiene scan, 2026-10-22

- The GitHub secret-scanning alerts endpoint returned HTTP 404 with
  “Secret scanning is disabled on this repository.” No GitHub setting was
  changed.
- Ran official Gitleaks v8.30.1, downloaded to `/tmp` and verified against the
  release asset SHA-256
  `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`. The
  redacted history scan covered 221 commits and found two `gcp-api-key` matches
  in `src/shared/backend/firebaseConfig.js`: `apiKey` and `androidApiKey` fields
  for project `campus4change`. Firebase's official guidance identifies these
  client config keys as public project identifiers, not authorization secrets,
  when used only for Firebase services. No private key, service-account
  credential, OAuth secret, or other provider token was reported.
- The redacted pre-commit scan found no matches in the current dirty diff, and
  Gitleaks directory scans of all six untracked additions found none. Google
  Cloud API restrictions on the historical Firebase keys were not inspected;
  the Firebase setup guide now explains that these client keys are public
  project identifiers and should remain restricted to Firebase APIs. No
  production settings were changed. The existing tracked
  `android/app/debug.keystore` is the documented public cross-clone debug key,
  not the release signing key.
- After updating the Firebase setup guidance, a fresh redacted scan of the
  complete dirty diff again returned no leaks. `git diff --check` and
  `npm run check:public-drive-links` also passed.

### Dependency advisory recheck, 2026-10-22

- A fresh `npm audit --omit=dev` still reports 20 high-severity paths through
  `braces@3.0.3`, plus the previously recorded moderate test-tooling paths.
  The npm registry reports `braces@3.0.3` as latest; the official
  [GHSA-vfj7-8cjw-p6xm advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  still lists no patched release. `npm audit fix --force` would downgrade
  React Native to 0.72.17, a breaking change. No override or local fork was
  applied without a reviewed upstream patch.
- `npm explain braces` traced the dependency through React Native CLI/globbing
  and Metro. Current release artifacts remain APK SHA-256
  `d5351481c2f106a48e7557bd560a6fccb55bb8bc7da821178e72d107d625042b` and AAB
  SHA-256 `811ba7818eccd9cfdcf34bd9211de3cfc7389f21b1690b4f01064fbb86e78da3`.
  `unzip -l` showed the JS bundle in each artifact; searches of all current
  release source maps found no `braces`, `micromatch`, or `fast-glob` module
  paths. This bounds the finding to the Node build/tooling dependency graph,
  while `npm audit` continues to report the vulnerable dependency paths. No
  source or lockfile change was made.

### Current-source POCO camera permission and save, 2026-10-22

- ADB again showed only POCO X4 GT over USB. The installed
  `com.campus4change.qa` v1.3.0/code 6 APK matched the local artifact at
  SHA-256 `f16c24eb357af85b955ccf1e9d0003f51c9b9868f6b13653e7142192d6a63850`.
  The QA app used the local Auth/Firestore emulator, with reverse ports 9099
  and 8080 active.
- A disposable emulator account completed TIP profile setup. From Edit Profile,
  **TAKE A PHOTO** displayed Android's camera permission prompt; granting
  **While using the app** opened `com.android.camera/.OneShotCamera`. Capturing
  and accepting the photo returned to Edit Profile, **SAVE CHANGES** saved it,
  and Profile exposed the image as **Camera QA profile picture**.
- The saved image was app-private under `files/profile_photos`, 9,181 bytes,
  SHA-256 `851648d6602d05c2837e1d1507327612e653a9222d2d4080a0a427e2d721b99d`.
  After force-stop and cold launch, Profile still exposed the camera photo.
  The image content was not opened or copied outside the app-private storage.
- Focused `profileAvatarEditor.test.jsx` passed all 5 tests. Gradle's
  `:app:testDebugUnitTest` task succeeded but was UP-TO-DATE in this run, so no
  new Android unit-test execution is claimed.
- Cleanup deleted the disposable Auth user, cleared the local Firestore demo
  project, reset the QA package, and revoked `CAMERA`; package inspection
  confirmed `granted=false`, and cold launch returned to branded **GET
  STARTED**. Six pending OOB codes remained for synthetic test addresses even
  after the Auth Emulator's `DELETE /accounts` reset; its API offers no OOB-code
  delete operation, so the local emulator process from this checkout was
  gracefully stopped and all emulator ports closed. Only POCO was used; Pad 7
  remains unavailable and Redmi was not used.
  No production Firebase or GitHub state changed.
- This adds current-source single-device camera evidence, but does not close the
  current-source Pad 7/two-device gap. The weighted score remains 86.0%.

### One-time camera grant and process-recreation recovery, 2026-10-22

- On the same current-source POCO QA build, a second synthetic account chose
  **Only this time** at Android's camera permission prompt. The external
  `OneShotCamera` opened. `am kill` left the app PID unchanged immediately and
  direct `kill -9` was denied; after capture/confirmation, the app PID had
  changed by the post-return check and the app resumed at Home. The exact OS
  trigger/timing of that process recreation was not established.
- The capture file remained in `cache/profile-photo-captures`. Opening Profile
  and Edit Profile consumed the pending result, created an app-private JPEG,
  showed **Remove photo from this device**, and allowed **SAVE CHANGES**. After
  another force-stop/cold launch, Profile still exposed the camera photo; the
  saved image remained in `files/profile_photos` and the temporary capture
  cache was empty. The app returned Home after process recreation, so reopening
  Edit Profile was required to see and save the recovered draft.
- A forced rerun of `:app:testDebugUnitTest --rerun-tasks` executed 21 Android
  unit tests with zero failures, including three pending-capture contract and
  two photo-cleanup tests. `profileAvatarEditor.test.jsx` passed all 5 tests.
- Cleanup cleared the QA package and revoked `CAMERA`; package inspection
  confirmed `granted=false`, the profile-photo directories were absent, and
  cold launch showed **GET STARTED**. The local Auth/Firestore emulator process
  exited and its ports closed; no production or GitHub state changed. Only the
  POCO was used; Pad 7 remained unavailable and Redmi was not used. The total
  score remains 86.0% because current-source two-device verification is open.

### Camera result auto-resume navigation fix, 2026-10-22

- The process-recreation test showed that the camera result was recoverable,
  but the recreated app opened Home. The user then had to navigate back to Edit
  Profile to consume the saved camera result. `AppNavigator` now checks for a
  pending camera result after a completed account restore; when one is found
  while Home is still the current route, it automatically opens Edit Profile.
  With no pending result, normal startup remains on Home. The existing Figma
  Edit Profile frame `1:495` is reused; the layout did not change, and
  `docs/FIGMA_COVERAGE.md` records the route behavior.
- Added an App regression test for restoring a pending camera photo and opening
  Edit Profile. The focused test passed; the complete Jest suite passed 334
  tests across 40 suites and ESLint passed. A forced `:app:testDebugUnitTest`
  rerun passed all 21 Android unit tests with zero failures.
- `C4C_QA_APPLICATION_ID_SUFFIX=.qa npm run android:qa-emulators` completed
  successfully and restored `firebaseConfig.js` byte-for-byte. The QA APK hash
  `1d818ee58986daad8e0a263440eadb5f04f492f0a5a87ae75944e917274e04a0` matched
  the installed POCO package. With a disposable Auth Emulator profile and
  **Only this time** camera permission, I killed the QA process under its own
  UID while OneShotCamera was foregrounded. The camera remained open; after
  accepting the capture, the app restarted into Edit Profile automatically,
  recovered the photo, and saved it. A later cold launch retained the profile
  photo; the capture cache was empty after saving.
- Cleanup deleted the disposable Auth Emulator user, reset the dedicated
  Firestore demo project (HTTP 200), stopped the emulator to clear its pending
  test code, cleared the QA package, and revoked `CAMERA`. Final POCO checks
  showed **GET STARTED**, `CAMERA granted=false`, no profile-photo directories,
  and no local emulator ports. No production Firebase or GitHub state changed.
  Pad 7 remains unavailable; the completion estimate remains 86.0% because
  current-source two-device verification and other release gates remain open.

### Post-fix clean-snapshot build check, 2026-10-22

- An isolated copy of the exact dirty worktree, excluding Git metadata,
  `node_modules`, Android build outputs, and machine-local `local.properties`,
  completed `npm ci`, all 334 Jest tests, and full ESLint. `npm ci` warned that
  four dependency install scripts were blocked by npm's script policy; JS tests
  and lint still passed.
- With JDK 25 and the copied Android SDK path, `./gradlew --no-daemon
  assembleDebug` compiled the JavaScript bundle, Kotlin/Java, and native CMake
  targets but failed at `:app:packageDebug` with `Disk quota exceeded`. A second
  identical attempt failed the same way. The temporary copy occupied 2.7 GB;
  removing only that copy restored space. The current workspace filesystem has
  6.2 GB free at 97% usage, insufficient headroom for another safe full snapshot
  build here.
- The in-place current-source QA build and signed release build remain
  successful and physically verified on POCO. This snapshot failure is an
  environment quota limitation; a fresh current-source package build from the
  school-laptop checkout remains unverified. No production or GitHub state
  changed; the completion estimate stays 86.0%.

### Release-signing backup inventory, 2026-10-22

- The active release keystore exists at
  `~/.android/keystores/campus4change-release-v3.jks` with mode `600`; it is
  outside the Git worktree. The older v2 and legacy JKS files differ from v3.
  No v3 copy was found in the inspected keystore directory or release archive.
- The GNOME Secret Service contains the item labeled
  `Campus4Change release v1.3 signing`; no password was read. The current
  session had no accessible removable backup mount, and no separate keyring
  backup was located in the inspected locations. No keystore or password copy
  was created without a designated recovery location.
- The signing file remains ignored/untracked and the repository contains no
  release JKS. Separate secure recovery backups remain an open release-readiness
  item. No production, GitHub, or release configuration changed.

### Current-source signed release rebuild and POCO cold launch, 2026-10-22

- After the camera-result auto-resume route fix, scripts/build-release.sh
  completed successfully in 3m25s (126 Gradle tasks; 17 executed). It produced
  local version 1.3.0/code 6 artifacts: APK SHA-256
  948a561ff4d41d81234f7db64cb840c324884bccefe9824a0f6d8cdc2e5eb3cd and AAB
  SHA-256 a5613bd02df2fdb4e1b94a309438f24f8e93ed0448d965a786e03f66b91a693f.
- The APK passed apksigner verify with the v3 certificate (SHA-1
  21241e9a18ab8531f5b383a55d8714c980c807d5, SHA-256
  0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7). The
  AAB passed jarsigner -verify, ZIP integrity, and Bundletool 1.18.3
  validation. Its base manifest reports com.campus4change, version 1.3.0,
  code 6, min API 24, and target API 36. The packaged JS bundle and source map
  contain the camera-result recovery route identifier.
- The local release APK installed in place on POCO X4 GT
  (Z9GMOVDMHQV8X84D) with adb install -r; the installed certificate matched
  the artifact, and the pulled base.apk SHA-256 matched the APK exactly.
  Package metadata reported version 1.3.0/code 6. A cold launch foregrounded
  com.campus4change/.MainActivity; the visible sign-in screen exposed the
  sign-in and account-creation actions. A current-process log sample contained
  no fatal exception, fatal signal, or React Native error marker. App data was
  preserved and release authentication was not attempted.
- This is release-build and single-device launch evidence; the camera
  process-recreation flow itself remains verified on the .qa build. Pad 7
  was unavailable and Redmi was not used. The APK/AAB remain local and
  unpublished. No production Firebase or GitHub state changed; the overall
  estimate remains 86.0% because production release checks, current-source
  Pad 7/two-device QA, final-source CI, and school-laptop rehearsal remain open.

### Current-source signed release empty-form validation, 2026-10-22

- On the same current signed 1.3.0/code 6 release installed on POCO, an empty
  SIGN IN submission displayed the combined email/password validation message.
  Opening Sign up and submitting the blank CREATE ACCOUNT form displayed its
  local name/email/password requirements. Returning with Android Back restored
  Login and cleared the signup validation state.
- The UI hierarchy confirmed both error states and their respective screens.
  Source inspection confirmed LoginScreen returns before auth.signIn and
  SignUpScreen returns before auth.signUp when the fields are invalid. No
  credentials were entered, no account was created, and app data was not
  cleared. This verifies current-release form validation only; it does not
  verify release Firebase authentication or Google sign-in.
- `git diff --check` and `npm run check:public-drive-links` passed after the
  audit updates. Overall completion remains 86.0%; production Firebase
  checks, current-source Pad 7/two-device QA, final-source CI, and the
  school-laptop rehearsal remain open.

### POCO local-emulator fallback rehearsal, 2026-10-22

- The installed `com.campus4change.qa` APK was checked against the current
  local debug artifact before the rehearsal; both hashes were
  `1d818ee58986daad8e0a263440eadb5f04f492f0a5a87ae75944e917274e04a0`.
  Auth and Firestore emulators started under the explicit demo project
  `demo-campus4change-rules`; USB reverse mappings were added only for the
  POCO X4 GT.
- A disposable test account completed signup, TIP profile setup (Manila,
  Computer Science, year 2, synthetic digits-only Student ID), and reached
  Home. Its Auth Emulator verification code was applied locally. In the app,
  **I've verified — check again** refreshed the account to **Email verified**;
  Find People then opened the normal Tutor Directory state without the email
  verification gate. The current-process log sample contained no fatal or
  React Native error marker.
- Cleanup deleted the synthetic Auth user, reset the demo Firestore database
  (HTTP 200), cleared the QA package data, and cold-launched it back to
  **GET STARTED**. The emulator process shut down cleanly; emulator ports
  and POCO reverse mappings were confirmed closed. The release package and
  app data were untouched.
- This is a partial one-device rehearsal, not a two-device demo or a clean
  school-laptop rehearsal. Pad 7 was unavailable and Redmi was not used. No
  production Firebase or GitHub state changed. The demonstrated current
  source signup/profile/verification/directory segment adds 0.25 points to
  presentation readiness; the overall evidence-weighted estimate is 86.25%.

### Desktop presentation guide refreshed, 2026-10-22

- Read-only `git ls-remote` confirmed `main` remains at
  `46fe89a534d98866dc981ef11fe64f24151e8bf4`; GitHub release inspection
  confirmed `v1.3.0-preview.1` is source-only and the full `v1.2.2` release
  contains the installable APK/AAB assets.
- Updated `/home/patt/Desktop/Campus4Change Presentation Guide.md` to remove
  the stale claim that the POCO was uninstalled because Install via USB was
  off. It now distinguishes the local signed 1.3.0 APK/AAB from GitHub assets,
  records the emulator-backed POCO signup/profile/verification/directory
  rehearsal and cleanup, and lists the unresolved live Firebase, Pad 7, and
  school-laptop gates.
- The guide contains no test password or synthetic account credentials. No
  code, production settings, or GitHub state changed; the Desktop guide remains
  a local artifact. The completion score stays 86.25%.

### Biometric permission removal in signed and QA builds, 2026-10-22

- Reviewed the sign-in source: the native module requests only
  `GetSignInWithGoogleOption`; there is no app `BiometricPrompt` or biometric
  sign-in call. The release manifest merger had inherited `USE_BIOMETRIC` and
  `USE_FINGERPRINT` from AndroidX dependencies, despite the removed user-facing
  biometric flow.
- Added manifest merger removal directives for those two permissions. The
  current signed v1.3.0/code 6 APK SHA-256 is
  `c2191dc45f42d5d9e2a4bbc63d515d1e045a3cbdd72af872b365c5d173fcc210`; the AAB
  SHA-256 is `98e8c92bef8ce215e64f540ce36fd388713d18d79afed3ab843f7b98962d349a`.
  APK signature, AAB JAR signature/ZIP integrity, and Bundletool 1.18.3
  validation passed. Both release artifact manifests omit the two permissions.
- The replacement QA APK SHA-256 is
  `492a895bb7046941cfe5fe4451740de9c602ec3e52e748cf11594607af98fe4e`; it
  rebuilt successfully, restored `firebaseConfig.js` byte-for-byte, and
  installed on POCO with a matching pulled APK hash. Its manifest also omits
  both permissions.
- The signed release was updated in place on POCO with the same release
  certificate; its installed APK hash matched. Both release and QA Login
  screens still show **Continue with Google** and no biometric option. No
  sign-in was attempted. The release cold launch had no fatal or React Native
  error marker. No app data was cleared.
- Only POCO was used; Pad 7 was unavailable and Redmi was not used. The
  emulators were not started, and no production Firebase or GitHub state
  changed. Release Google sign-in/App Check and two-device QA remain open; the
  overall evidence-weighted estimate remains 86.25%.

### Read-only Firebase App Check console audit, 2026-10-22

- The Firebase Console App Check Apps view lists Android app
  `com.campus4change` as **Not registered**. The APIs view lists Authentication
  and Cloud Firestore as **Unenforced**. This is a concrete registration gap
  consistent with the POCO token failures; it does not mean App Check currently
  blocks those APIs.
- The POCO release process log contained six generic `FirebaseException` App
  Check token-request failures. The native bridge intentionally logs only the
  exception class and redacts provider details, so the underlying Play
  Integrity failure remains unidentified. The replacement signer SHA list was
  already confirmed absent by the read-only Firebase CLI check.
- This was read-only console inspection. No registration, enforcement, Auth,
  Firestore, or GitHub setting changed. Release Google sign-in, production
  Student ID rule parity, Pad 7/two-device QA, final-source CI, and the
  school-laptop rehearsal remain open; progress stays at 86.25%.

### POCO release Google sign-in and camera check, 2026-10-23

- The signed 1.4.0/code 7 candidate on the POCO completed Google sign-in through
  Firebase Authentication with the tester account selected by the user. The
  existing Auth record was reused. The app routed the incomplete profile to TIP
  Account Setup, displayed a generated UUID, saved the synthetic profile, and
  opened Home. The profile setup appeared in Firestore Console.
- In Edit Profile, **Take a Photo** displayed Android's camera permission
  prompt. Choosing **While using the app** opened the system `OneShotCamera`.
  The capture returned to the editor, and the saved photo remained after a
  force-stop and cold launch. The user confirmed the phone's flat position
  covered its rear camera and caused the black preview and test image. The
  test image was replaced with the cyan avatar preset and saved.
- This is single-device release evidence. App Check still lists Android as
  **Not registered**; the Play Integrity terms checkbox is unchecked and Save
  is disabled. App Check registration and valid release-token verification
  remain open. No source code, production policy, rules, indexes, or GitHub
  release state changed during this device check.

### POCO live interest-based tutor recommendation, 2026-10-23

- In the signed candidate, Learning Preferences listed the Computer Science
  topics for T.I.P. Quezon City. Saving **Computer programming** and
  **Object-oriented programming** updated the tester profile. Home displayed
  one tutor match.
- Find People displayed a public tutor profile in **Recommended for your
  interests** and listed both selected topics as matches. Opening the profile
  showed its public subjects, biography, and session times. After a force-stop
  and cold launch, Home still showed one matching tutor. No booking or chat
  request was sent.
- This verifies a single-device live directory read and recommendation path.
  It does not verify the other account's view of a new listing or a two-person
  request flow. App Check registration remains open.

### POCO live notification navigation, 2026-10-23

- On the signed 1.4.0 candidate, Home showed one unread notification. Opening
  Notifications showed its unread state and the Mark all as read action.
- Tapping the individual notification opened the related shared-group details
  page. Returning to Notifications and Home showed that the item was read and
  the unread badge was 0. No group post, chat message, or session request was
  created.
- This verifies the release notification destination and read-state update on
  one account. Two-account notification delivery remains unverified.

### POCO release Group Session route, 2026-10-23

- From the current signed candidate, Study Groups opened the user's existing
  shared group. Group Details opened **Group Session** successfully.
- The screen displayed **Agenda and notes**. No focus-timer control appeared in
  the accessibility tree. The route was read-only; no group content changed.
- This verifies the release navigation and Group Session layout for one group.
  Creating or editing a shared session remains unverified.

### POCO release session list empty states, 2026-10-23

- My Sessions on the signed candidate showed no upcoming sessions, no requests,
  and no cancelled sessions for the tester account.
- The public tutor's **Request a Session** action opened Book a Session. The form
  explained that the request remains pending until tutor acceptance and that
  its note is shared. I backed out without submitting.
- The user reports that two-device sync was tested and worked on v1.2.2. This
  is prior-version user-reported evidence. The 1.4.0 request, acceptance, and
  cancellation flow was not submitted to the public tutor on the current build.

### POCO release tutor setup route, 2026-10-23

- Profile → Tutor profile opened the Be a Tutor screen on the signed candidate.
  The screen explained that published listings are visible to verified users
  and showed the TIP core-topic suggestions.
- The form was closed without selecting subjects or saving a listing. This
  verifies the setup route only; publishing, editing, and deleting a public
  tutor profile remain unverified on this release.

### POCO release unsaved profile exit confirmation, 2026-10-23

- In Edit Profile, I removed a saved interest from the draft and tapped Back.
  The app displayed **Discard unsaved changes?** with **Keep editing** and
  **Discard changes** actions.
- **Discard changes** returned to Profile. Home still displayed the saved
  Computer programming interest and one tutor match.
- This verifies the discard confirmation and saved-interest preservation on the
  signed release. No profile changes were saved during the check.

### POCO release profile identity fields, 2026-10-23

- Profile displayed the **Campus4Change ID** label. Edit Profile showed Year
  level and TIP campus fields, and no Student ID field.
- The check read labels only and saved no profile changes.

### POCO release Year level input validation, 2026-10-23

- In Edit Profile, the Year level field contained `1`. Sending alphabetic input
  left its value at `1`. Back returned to Profile without an unsaved-changes
  prompt.
- The test saved no profile changes.

### POCO release Google re-sign-in and UUID persistence, 2026-10-23

- Profile displayed the generated Campus4Change ID before sign-out. The user-
  designated Google account signed back in through Credential Manager and
  returned to Home without reopening Account Setup.
- A one-way digest comparison confirmed the Campus4Change ID matched before and
  after sign-in. Home restored the saved Computer programming interest and one
  tutor match. No additional Auth account was created.

### POCO release Settings menu route, 2026-10-23

- The signed app's Home menu showed Profile, Settings, and Close Menu. Settings
  opened Learning Preferences and About, displayed version 1.4.0, and showed no
  biometric control.
- This was a read-only route check; no settings were changed.

### Play Integrity settings prepared for sideloaded APK, 2026-10-24

- Following the user's direction to support a downloadable APK outside Google
  Play, the Firebase Console draft has **PLAY_RECOGNIZED** unchecked,
  **LICENSED** disabled and unchecked, and minimum integrity set to **Device
  integrity**. Firebase's Play Integrity guide lists those requirements for
  apps distributed exclusively outside Google Play.
- The combined Google APIs and Play Integrity terms checkbox remains
  unchecked, so Save is disabled and Android App Check remains Not registered.
  No production setting has been saved.

### User-reported v1.2.2 two-device sync, 2026-10-24

- The user reports that two-device synchronization worked on v1.2.2. This is
  prior-version user-reported evidence; it is not a new physical retest of the
  signed 1.4.0 candidate.

### Read-only Firestore index parity check, 2026-10-23

- The Firebase Console Indexes page showed all six manual indexes as Enabled.
  Firebase CLI 15.33.0 returned six live definitions.
- The REST output included Firestore's implicit trailing `__name__` field and
  `SPARSE_ALL` density. After normalizing those defaults, all six live
  definitions matched `firestore.indexes.json`. Firebase documents the
  automatic `__name__` ordering in the
  [index overview](https://firebase.google.com/docs/firestore/query-data/index-overview)
  and the `SPARSE_ALL` default in the
  [density reference](https://firebase.google.com/docs/firestore/reference/rest/Shared.Types/Density).
- This was read-only. No indexes or production settings were changed.
