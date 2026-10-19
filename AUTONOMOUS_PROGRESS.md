# Autonomous improvement progress

This log separates source changes, emulator checks, physical-device checks,
GitHub state, and production Firebase state. A build or install is not a release
or a production deployment.

## Current workspace

- Checkout: `/home/patt/October Shits/Campus4Change`, branch `main`, HEAD
  `bfee40c`, with `origin/main` at the same commit when inspected.
- The worktree already contains numerous uncommitted application, test, and
  documentation changes. Preserve them and review before staging. The active
  completion goal authorizes a normal push to `main` after the review and checks
  pass; do not reset or force-push.
- The current source version is 1.3.0. The application is a React Native CLI
  Android app using JavaScript/JSX, Firebase Authentication, Firestore, and a
  native encrypted local account store.
- The current feature work includes required account setup after signup and
  Student ID uniqueness claims. A read-only Rules API check confirmed the live
  Firestore release is older than the local rules. This goal forbids deploying
  production rules.

## Improvement cycles

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
- This turn did not push to GitHub or modify production Firebase. The POCO and
  Pad were the only devices tested. Redmi appeared in ADB discovery but was not
  targeted.
