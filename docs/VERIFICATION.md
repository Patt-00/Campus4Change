# Verification for 1.2.0

## Current source work — 2026-10-13

This local checkpoint is on branch `codex/firebase-auth-firestore`. It includes
the Novice, Intermediate, and Expert introduction, Firebase email/password
accounts, encrypted Android Auth persistence and account cache, private
per-user state sync, and shared study groups with private memberships and
member-only posts and replies. It is configured for Firebase project
`campus4change` on the Spark plan. Email/Password sign-in is enabled, and the
Standard Firestore database is in `asia-southeast1`. Application and test
source contains no TypeScript files.

Verified for this checkpoint:

- `npm run lint`: passed without warnings.
- `npm test -- --runInBand --coverage --coverageReporters=json --coverageReporters=json-summary`:
  121 tests passed in 20 suites. Tests cover stale group callbacks and pending
  shared writes across account changes, queued state persistence after a switch
  even when both accounts share the same `updatedAt`, unknown and past-due
  session statuses, malformed or missing session start times across Home,
  Sessions, and Session Details, contextual accessibility labels for booking
  dates, sessions, groups, tutors, messages, notifications, and group posts, the
  Home overdue warning, and theme color contrast.
- The groups screen uses a virtualized `SectionList`; its regression test feeds
  80 loaded groups and confirms that the initial render mounts no more than 10
  group cards. Search tests cover case-insensitive subject filtering, joined
  group empty copy, and the prompt to search older pages. Other focused tests
  exercise home routes, tutor listing and search, booking validation, session
  reschedule gating, private group-room drafts versus explicit publishing,
  timer controls and cleanup, and shared-group retry paths.
- The Jest coverage run for this checkpoint reports 83.58% line coverage,
  75.22% branch coverage, and 83.96% function coverage. It covers all lines in
  the home screen at 96.87%, session details at 100%, the group-room screen at
  100%, the local storage guard at 100%, tutor search at 96.77%, and booking
  screen at 94.44%. Coverage is
  diagnostic; the phone UI and long-session memory behavior still need device
  verification.
- The Firestore rules test passed against the local Firebase Emulator Suite.
  It checks private account state, authenticated group discovery, member-only
  posts/replies, bounded cursor queries, per-member contribution cooldowns,
  owner-only membership queries, safe member counts, and verified-email
  requirements. Group directory queries are limited to 20 documents; unbounded
  and over-limit queries fail. Unverified accounts can still access only their
  own private state; shared group discovery and writes are denied. The real
  last live Console check found initial production-mode rules that deny all
  client access. Firebase CLI is unauthenticated in this session, so that live
  state was not rechecked; the checked-in rules have not been deployed.
- On 2026-10-13, the rules test refused to start without
  `C4C_ALLOW_FIRESTORE_EMULATOR_RESET=1`. With the explicit opt-in, it passed
  against an isolated emulator on port 8181; the app's existing emulator on
  port 8080 was left untouched.
- A deterministic directory test used two group documents and one membership.
  The previous implementation made two per-group membership `getDoc` calls
  during initial load and another after one metadata update (three total); the
  updated implementation makes zero per-group `getDoc` calls and gets the one
  owned membership through a UID-filtered collection-group query. The live
  query updates joined state.
  Emulator checks allow the caller's UID query and deny unfiltered,
  other-user, and unverified membership queries.
- Group directory pages return at most 20 documents and keep all groups
  discoverable through a load-older action. The test pages through 42 groups,
  checks both cursor positions, verifies membership remains live, and confirms
  the metadata snapshot pauses with a refresh action after paging.
- `npm run test:firebase-auth` passed against the Auth and Firestore emulators.
  It creates a disposable `example.test` user, obtains and applies the local
  verification code, refreshes the ID token, verifies the `email_verified`
  claim, and checks Firestore access before and after verification.
- On 2026-10-13, the Redmi Turbo 4 (`24129RT7CC`, product `rodin`, Android 16)
  loaded the Firebase-emulator-backed group directory and an existing QA
  group's details. No group or post was created during this check. The QA
  account was signed out; the app config was restored to project
  `campus4change` with emulator routing disabled. After Metro restarted on
  port 8081 bound to `127.0.0.1`, ADB reverse loaded the bundle and a cold
  launch rendered the splash screen. This verifies the
  current Android bundle and splash only, not production Firebase access.
- `npm test -- --runInBand` on 2026-10-13 passed all 121 tests in 20 suites.
- An app-level regression removed a saved conversation's message array, opened
  it through Messages and Chat, then sent a new message. The thread rendered,
  recovered the array, and persisted the new message.
- After the malformed-session changes, the current bundle was cold-launched on
  the Redmi Turbo 4 through loopback Metro and ADB reverse. The splash rendered
  and filtered logs contained no React Native JS errors. This confirms launch;
  the malformed schedule cases are verified by the focused component tests.
- The Android accessibility tree announced full booking dates and included
  session, group, tutor, message, notification, and group-post context in the
  list controls. This was checked while signed into the local demo account; no
  booking was submitted, and the app was signed out afterward.
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
- `./gradlew assembleDebug` passed locally with `JAVA_HOME` and `PATH` set to
  `/usr/lib/jvm/java-25-openjdk`, and built the debug APK. The latest [GitHub
  Actions run 38328655174](https://github.com/Patt-00/Campus4Change/actions/runs/38328655174)
  passed on commit `019652e`: lint, all 121 unit tests, Auth/Firestore emulator
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

Shared group metadata, membership counts, posts, and replies now use the
`studyGroups` Firestore collection for authenticated Firebase users. Local/demo
groups remain on-device. Tutor listings, bookings, direct messages, and group
chat are not shared between students; a Firebase user's private account state,
including that user's bookings, syncs only to that account. The current
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

Saved state remains version 1. No saved account data is deleted. Existing interests can be edited. Earlier bookings and conversations retain their sample tutor IDs. Previously joined or edited sample groups stay visible in personal accounts; untouched sample groups are hidden. Old groups without a meetup date display **No meetup scheduled**.

New accounts have blank interests and school details and no sample groups, tutors, bookings, or conversations. The public demo account retains sample content. A personal tutor listing has no fabricated rating or response rate and offers editing instead of self-booking.

The package ID and certificate match older releases, and the version code increases to 3. Installation as an update is intended to retain data; this version has not been installed by the agent.

## Teacher walkthrough

Complete these manual checks on the exact release APK before demonstrating it.

1. Install as an update and open the app. Check existing saved work after signing in.
2. Open the splash screen and step through the Novice, Intermediate, and Expert introductions. Check Back, Skip, page dots, and Get Started.
3. Demonstrate invalid login input, then use **USE DEMO ACCOUNT** for sample content.
4. Search for Mika, choose a time on her profile, and book a future session. Verify the selected tutor, time, note, and overlap rejection.
5. Open a booked session workspace, confirm the tutor, schedule, and notes, and mark it complete without a focus timer. Reschedule, cancel, complete, and rate sessions; check upcoming, in-progress, and past-due labels.
6. Create a group without a date and confirm no schedule is invented. Create another with a valid future date and time; reject a nonexistent date.
7. Join/leave groups, write notes and replies, and use a study-room timer. Firebase accounts share group posts/replies when project settings and Firestore rules are configured; device-only accounts keep local groups. Check drafts after Android Back and after reopening.
8. Save a message and reopen it. Direct messages and group chat remain local and are not delivered to another device.
9. Open notifications and check their read state.
10. Add a custom interest, reject a duplicate with different letter case, remove an interest, and save. Check the home interest and tutor count.
11. Create a separate account and confirm that interests and school fields start blank, with an empty tutor directory and groups. Save preferences without entering school details.
12. Enter your course, year, and school. Create a tutor listing, edit it from search, and remove it.
13. Sign out and sign in again to check saved data. Check biometrics on a personal account if enrolled on the phone.

Tutor listings, bookings, direct messages, and group chat stay in the account's private state. Signed-in Firebase users share group details, membership, posts, and replies; device-only accounts keep groups locally. About explains the remaining limits. Do not present sample contacts as live users.

## Historical 1.1.0 device checks

The previous APK was tested on one Android 16 phone: update over v1.0.0, cold launch, empty-login validation, demo sign-in, Mika search/profile selection, past-time rejection, and future Physics booking with confirmation/details. No crash was observed in those checks. Testing then stopped at the user's request.

Those checks apply to 1.1.0, not this APK. The prior release retains its [device verification record](https://github.com/Patt-00/Campus4Change/releases/tag/v1.1.0).
