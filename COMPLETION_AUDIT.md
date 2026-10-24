# Campus4Change completion audit

## Current estimate

**SCOPED 1.4.0 APK RELEASE GOAL: COMPLETE (100%), 2026-10-24**

This status covers the signed direct-install APK, Firebase reset and cleanup,
POCO verification, merge to `main`, green merged-source CI, public pre-release,
updated Desktop guide, and email delivery. Google Play, an AAB, payments, and
live voice/video calls are outside this release scope.

**HISTORICAL WEIGHTED PROJECT CHECKPOINT: 88.25% (before commit `4d8968a`)**

The weighted tables below preserve that earlier broad-project assessment; they
are not the current score for the scoped 1.4.0 APK release goal.

This is an evidence-weighted engineering estimate, not a teacher's grade. No app-specific final acceptance checklist has been supplied. The assessed scope is the documented Android TIP peer-learning app. Payments and live voice or video calls are outside the user's stated scope.

## Current release decisions and evidence, 2026-10-24

The user selected a signed APK for direct installation. Google Play publishing
and AAB distribution are not required. The signed v1.4.0/code 7 APK is public
as the [Campus4Change v1.4.0 GitHub pre-release](https://github.com/Patt-00/Campus4Change/releases/tag/v1.4.0).
Its SHA-256 is `e1c13ca9af40494302fcee8b717503d2e1f3f8a5b19d580368a27f859cd94b8a`.
APK signature verification passed, and a fresh download matched the local
artifact byte-for-byte. Compatible lockfile patches updated `body-parser`,
`qs`, and `zod`; current full and production-only npm audits report 0
vulnerabilities. The protected release helper rebuilt the signed APK and AAB,
and both hashes matched the published APK and recorded local AAB.
The package paths and release rebuild are detailed in
[QUALITY_AUDIT.md](docs/QUALITY_AUDIT.md) and
[verification history](docs/VERIFICATION.md).

The source is merged to `main` at `119c22defeb05f461a6b15f3a107ffeee749bc12`.
GitHub Actions run [40077193029](https://github.com/Patt-00/Campus4Change/actions/runs/40077193029)
passed checks and API 24 instrumentation on that commit. Manual run
[40075453885](https://github.com/Patt-00/Campus4Change/actions/runs/40075453885)
passed the clean macOS build on release source `5f8bdd8`. The earlier PR-run
API 24 attempt received HTTP 429 from Maven Central before tests started; its
retry passed in run [40075464037](https://github.com/Patt-00/Campus4Change/actions/runs/40075464037).

On POCO, live Google sign-in reached Home after generated UUID setup and saved
profile and interest data. Two verified disposable accounts exercised a tutor
request, acceptance, and student cancellation; Session Details displayed
**CANCELLED**. After cleanup, Firebase Auth export reported 0 accounts and
recursive Firestore inventory found 0 collection paths and 0 documents. The
two encrypted pre-reset backups and their temporary keyring entries were
removed after verifying the published APK. Firestore rules and all six
production indexes match local source. App Check remains unregistered and
unenforced; its token exchange is unverified. The user reports that two-device
sync worked on v1.2.2. See [verification history](docs/VERIFICATION.md).

The older signed APK for version 1.3.0/code 6 remains in the
[v1.3.0-preview.2 pre-release](https://github.com/Patt-00/Campus4Change/releases/tag/v1.3.0-preview.2).

### Historical candidate validation notes

The following paragraphs preserve evidence from earlier candidate checkpoints,
before the completed reset, merge, and v1.4.0 publication. The current state is
summarized above and recorded in [verification history](docs/VERIFICATION.md).

The 1.4.0 versioned source passes 337 Jest tests across 41 suites, ESLint,
`git diff --check`, rules-test script syntax validation, and
`:app:testDebugUnitTest` with JDK 25. The first native test attempt used the
workstation's default JDK 27 and failed with unsupported class file major
version 71; the documented JDK 25 rerun passed. The release APK passes
`apksigner verify`; the AAB passes `jarsigner -verify` and ZIP integrity
checks. PR run `39964691039` passed both jobs on `9bbdb82`; manual run
`39966502505` passed the clean macOS build on the same source. The source
changes after the Termux build affect documentation and CI configuration, not
app source or Android Gradle configuration. The Termux debug APK was verified
but not installed. The macOS build ran on a GitHub-hosted macOS 15.7.9 ARM64
runner with Node.js 24.20.0, npm 11.19.0, JDK 17.0.21+9, and Gradle 9.4.1. It
passed package/version and signature checks. This does not reproduce the user's
personal Mac environment.
Figma shows UUID setup and profile states and has no Student ID input or
verification screen. The file does not verify App Check token exchange or
production API enforcement. The signed candidate's live Google sign-in and
profile setup passed on the POCO; camera capture and local-photo retention also
passed, with the black test image explained by the phone's flat placement.

GitHub Actions run
[39829733295](https://github.com/Patt-00/Campus4Change/actions/runs/39829733295)
passed on preview commit `55dcc571436d705827b7b069d6bb077350a7e6f5`, including
hosted API 24 instrumentation tests. Draft PR #1's run
[39942899889](https://github.com/Patt-00/Campus4Change/actions/runs/39942899889)
passed both checks and hosted API 24 instrumentation on `6101ee2`. Run
[39948381988](https://github.com/Patt-00/Campus4Change/actions/runs/39948381988)
passed both checks on `7fc0d00`; run
[39952360701](https://github.com/Patt-00/Campus4Change/actions/runs/39952360701)
passed both checks on `1d5c451`. Confirm the current PR head is green before
merge.

The Google account-picker cancellation issue was reproduced on POCO and
corrected: dismissing Credential Manager now returns to Login without a false
red failure message. The focused Google screen suite passed 10 tests, the full
JavaScript suite passed 334 tests across 40 suites, and ESLint passed. The
release APK was rebuilt, verified, and installed in place. Selecting the
previously authorized work account reached Google's organization prompt
requiring a screen lock. No screen-lock setting was changed and no live
Firebase sign-in completed. The user asked to use another account, and an
account choice is still pending.

A session-level test verifies that a successful mocked Google account hydrates
Firebase state and calls the `onSignedIn` callback used by `AppNavigator`.
Commit `4d8968a` routes complete profiles to Home, incomplete profiles to
Account Setup, and displays a neutral cancellation message. This JavaScript
behavior does not prove a real Google token exchange.

Firebase CLI access for the owner account is verified, and the project is
`campus4change`. The v4 release SHA-1 and SHA-256 have been added to the Android
app registration. The App Check Console still shows the Android app as Not
registered; the Play Integrity provider form is waiting for the user to accept
the Google APIs and Play Integrity terms. Auth and Firestore App Check
enforcement remain Unenforced. On POCO cold launch, Google Play Integrity
returned its token callback, but Firebase App Check token exchange failed with
a generic `FirebaseException`; the native bridge omits the underlying service
response. The exact cause remains unknown. Production Firestore rules have now been
deployed and the active ruleset SHA-256 exactly matches local source at
`31f4827c128dcc063a21f7de1dc0542db720dd45efce13b8d0ac3a63630f4cfa`. The six
live composite index definitions match local source and all are READY.

Before any deletion, an encrypted local export was verified. It contains
metadata for 9 Auth accounts and 13 Firestore documents across 8 collection
paths, with password hashes and tokens excluded. The plaintext export was
removed from temporary storage. After the user-authorized reset and disposable
account cleanup, Auth export reports 0 accounts and recursive Firestore
inventory reports 0 collection paths and 0 documents. The encrypted backup is
retained outside the repository until final release verification.

The user selected a one-time pre-release reset of **all** Firebase Auth users
and Firestore documents, including real-user data, after verifying a temporary
encrypted local export. The reset and post-QA cleanup are complete. The POCO is
the only required physical QA device; Pad 7 is deferred.

The detailed weighted tables below describe the previous 88.25% checkpoint.
Refresh their evidence and recalculate the score only after the 1.4.0 candidate
passes all final gates; historical rows are not proof of current-source
behavior. Current dependency advisory status is tracked in
[QUALITY_AUDIT.md](docs/QUALITY_AUDIT.md).
behavior.

After the signed-out About copy fix on 2026-10-22, the full Jest suite passed
333 tests across 40 suites and ESLint passed. The rebuilt 1.3.0/code 6 release
APK was signature-verified, installed in place on POCO, cold-launched, and
checked through Login → About. The signed-out copy now says no account is
signed in and explains Firebase sign-in; the installed `base.apk` SHA-256
matches the local APK at
`aad0d97ee792256a4cb49b47b2f2f0b468055299d54f9ea67f4c7f8e218c5c8c`. The
rebuilt AAB passed `jarsigner -verify` and ZIP integrity checks and remains
local. No credentials were entered and no Auth/Firestore request was made.

After the TIP catalog correction on 2026-10-22, the signed 1.3.0/code 6
release was rebuilt. The APK SHA-256 is
`d5351481c2f106a48e7557bd560a6fccb55bb8bc7da821178e72d107d625042b`; it
passed `apksigner verify`, installed in place on POCO, cold-launched to Login,
and the pulled `base.apk` matched the local artifact. The AAB SHA-256 is
`811ba7818eccd9cfdcf34bd9211de3cfc7389f21b1690b4f01064fbb86e78da3`;
`jarsigner`, ZIP integrity, and bundletool 1.18.3 validation passed. The signed
APK and AAB contain the four catalog additions. At that build checkpoint the artifacts remained local and unpublished; the APK
was later published in v1.3.0-preview.2. Release Firebase sign-in remains
unverified.

A POCO cold start reproduced App Check debug-token exchange warnings in the
emulator-backed QA app. The source skips App Check initialization only when
local Firebase emulators are configured; its live Firebase path still
initializes App Check. The regression test verifies both emulator connections
and absence of App Check requests in emulator mode.

The current emulator-QA APK, `com.campus4change.qa` version 1.3.0/code 6, is
installed on the POCO. Its pulled `base.apk` SHA-256 matches the local APK
exactly at `1d818ee58986daad8e0a263440eadb5f04f492f0a5a87ae75944e917274e04a`. It
cold-launched to the branded **Get Started** screen. A follow-up POCO flow
  created a disposable Auth Emulator account in the app, completed TIP profile
  setup and its Student ID claim, signed out, signed in again, and displayed the
  saved profile. A second account was rejected when it attempted to claim the
  same ID, and the owner claim stayed intact. Cleanup removed both accounts and
  their data; the QA app data was cleared and its next cold launch returned to
Get Started. In a separate flow, Auth Emulator email verification succeeded;
the app refreshed its state to **Email verified**, and Find People opened the
normal empty-directory state. That account and its data were removed too.
Production Firebase and release-key verification remain untested.
The emulator App Check guard still lacks release and broader feature-level
physical verification. Pad 7 is unavailable. The current estimate is 86.25%.
The 2026-10-22 POCO photo check added 0.25 points to physical QA, and the
current-source signed release build added 0.25 points to technical reliability.
Current-source POCO QA also triggered the camera permission prompt, captured
and saved a photo, and confirmed the profile photo remained available after a
force-stop and cold launch. The synthetic Auth user and photo data were
removed, and camera permission was revoked. This single-device check does not
close current-source Pad 7/two-device QA, so the score remains 86.25%; CI on the
final source also remains open.

On 2026-10-22, the installed `com.campus4change.qa` v1.3.0/code 6 build on
POCO saved one synthetic profile image, then discarded a second selected image.
The Profile screen and Edit Profile showed the original image after discard and
after a force-stop and cold launch. Its app-private file SHA-256 remained
`995aad3bf2cb776c704745152b9d0e6794d1009755146382989f0cf5b5b1802a`. The
focused profile-avatar suite passed all five tests. Cleanup removed the test
Auth Emulator account, private state, Student ID claim, photo files, and
MediaStore rows. The QA app returned to Get Started. No production Firebase or
GitHub state changed; see [AUTONOMOUS_PROGRESS.md](AUTONOMOUS_PROGRESS.md).

Earlier POCO checks verified the revised About and Settings screens, camera
and gallery photo-draft cleanup, camera recovery, and tutor-search gating. The
Termux debug build and APK metadata/signature check also passed on POCO, but
that artifact was not installed or launched. The release package remains local.
Earlier the same day, four Firebase Auth/Firestore demo-emulator suites and the
public Drive-link check passed. These checks do not verify production Firebase
or CI for uncommitted changes.

The latest local `android/app/build/outputs/apk/debug/app-debug.apk` is the
side-by-side emulator-QA package `com.campus4change.qa`, version 1.3.0/code 6,
min API 24 / target API 36. Its bundle targets `demo-campus4change-rules` at
`127.0.0.1`, and its SHA-256 is
`1d818ee58986daad8e0a263440eadb5f04f492f0a5a87ae75944e917274e04a`. The
builder restored `firebaseConfig.js` byte-for-byte; the checked-in source keeps
the emulator host blank. On the POCO, the QA package's pulled `base.apk` matches
that hash. It cold-launched, completed a disposable Auth Emulator signup and
TIP profile setup, saved and reloaded the profile, and displayed the expected
invalid-credentials response in an earlier probe. Firestore reads confirmed
the state and Student ID claim. The synthetic account and both user documents
were removed and cleanup was verified; QA package data was cleared. The app
now opens to Get Started. POCO USB reverse mappings for Auth and Firestore are
active, with device-side TCP probes passed. The release APK/AAB remain separate,
local artifacts.
The prior Pad-installed QA APK has SHA-256
`032f589e1556320ce6c7c0397b2852acafa440b51eaf3d357c7b502dcc868c04`; it does
not include the current camera-recovery change.

At an earlier POCO X4 GT checkpoint on Android API 34, the installed package's
`base.apk` hash matched that checkpoint's QA artifact. Launching it displayed
the branded welcome screen and **GET STARTED**. That check verified package
identity and welcome-screen rendering only; it was not a full-route or
minimum-API test.

On the Pad 7's previous QA build, a disposable emulator-backed TIP account
completed profile setup. Denying camera permission showed the fallback and
kept photo/avatar choices available. Granting **While using the app** opened
the system camera, saved a profile photo, and kept the photo available after a
cold launch. Choosing a built-in avatar and saving removed the profile photo
file. The current-source process-death recovery change was verified on POCO
X4 GT with a disposable Auth/Firestore emulator account. Android revoked the
one-time camera permission and killed the app while the external camera stayed
open. After taking and confirming a photo, the recreated app recorded
`RESULT_OK`; reopening Edit Profile exposed **Remove photo from this device**.
Saving produced a 6,810-byte private profile photo. A force-stop and cold
launch retained the photo in Edit Profile, and saving removed the temporary
camera capture. The photo content was not inspected.

At a separate 2026-10-21 photo-discard checkpoint, a then-current emulator-QA
artifact was installed over the existing POCO package. Its pulled `base.apk`
SHA-256 matched that checkpoint's build at
`55155f3779fe518faf79eb336211270c8b3183403001c232315203eab7d6ba91`; the app
cold-launched into the existing QA profile. After taking a camera photo in Edit
Profile, returning, and confirming **Discard changes**, reopening the editor no
longer showed **Remove photo from this device**. The previously displayed QA
avatar remained. The captured image content was not inspected, and the
existing account state was preserved. The Android photo picker was then tested
with a gallery item after staging a copy of the app's logo. The picker did not
expose a filename, so the selected item could not be conclusively identified as
the staged image. The app-private profile-photo file count rose from 34 to 35
after selection and returned to 34 after discard. The reopened editor showed no
draft-photo action; the staged MediaStore row and file were removed, and the app
returned to Home.

Native cleanup now uses a small owner-scoped file-selection helper. Two JVM
tests confirm that it deletes the owner's unsaved photo, preserves the saved
profile URI, leaves another account's file in place, and removes all owner
photos when no saved URI exists. Gradle passed 21 Android unit tests across five
suites.

At that 2026-10-21 checkpoint, a physical repeat with an already-saved custom
image was not verified because the Photo Picker did not show the staged
fixture. The POCO verification from 2026-10-22 is recorded in
[AUTONOMOUS_PROGRESS.md](AUTONOMOUS_PROGRESS.md).

At an earlier POCO QA checkpoint, the then-current same-signed package was
installed and its pulled `base.apk` SHA-256 matched that checkpoint's artifact
at
`61383e10067e35dc44d618900baa0986ab92191fd6025bb1f0c304f2cdfde4f0`. The app
cold-launched to Home with the existing QA profile; no app data was cleared.
The current signed release APK/AAB were rebuilt with the helper, and their
validation evidence is recorded in [AUTONOMOUS_PROGRESS.md](AUTONOMOUS_PROGRESS.md).

An earlier `10.0.2.2` QA APK ran on the disposable API 36 AVD. That AVD verified
permission denial fallback, virtual-scene capture, profile photo saving,
avatar selection, and avatar persistence after a cold launch. POCO also
verified current-source physical photo recovery after process recreation.
Release UI remains unverified.

Profile-camera capture uses an explicit permission request, cache-only
FileProvider capture, and the existing private photo-save flow. The camera is
launched through AndroidX's registered `TakePicture` contract, which restores
its result across process recreation. The POCO verification above exercises
that path after Android revokes a one-time grant. POCO also verified photo-picker
selection and camera cancellation. An earlier QA manifest inherited `USE_BIOMETRIC` / `USE_FINGERPRINT` from
AndroidX dependencies. The current signed release and rebuilt QA APK/AAB now
remove both permissions at manifest merge; the source has no `BiometricPrompt`
call or biometric sign-in flow. Google sign-in still uses Credential Manager.

At the earlier QA-install checkpoint, the APK was updated on POCO X4 GT through
Android's Files and package installer flow after ADB installation was
restricted. The package remained at version 1.3.0/code 6. The Files install
permission was revoked, and app data was cleared after QA so the app opened at
Welcome. That checkpoint recorded Xiaomi requiring a SIM to enable
`Install via USB`. Pad 7 was unavailable and was not accessed during that
check. Its prior QA account, temporary camera file, UI dumps, and ADB reverse
mappings were not rechecked. The emulators were stopped and POCO reverse
mappings removed at the end of that checkpoint; later QA restarted them as
recorded below.

In a later POCO QA pass, the current APK was installed with ADB using the
workstation debug signer, and its installed base hash was checked against the
artifact. The existing QA profile was preserved. The Auth and Firestore demo
emulators were already running and remained running; POCO reverse mappings for
ports 9099 and 8080 were active. Pad 7 was unavailable and Redmi was not used.

At the locked-search QA checkpoint on 2026-10-21, the installed `base.apk`
SHA-256 matched the local artifact at
`82e44495cd7fe7c10023d68e89da2bac8f9191cc0e50e77521d75414664672a0`. In the
unverified search flow, the screen displayed **Tutor directory** and the email
verification message without **People search results · 0**. The existing QA
profile remained signed in, and the app returned to Home.

After the native cleanup tests were added, QA APK `61383e10067e35dc44d618900baa0986ab92191fd6025bb1f0c304f2cdfde4f0` installed over the same-signed POCO package. The pulled `base.apk` hash matched, and the app returned to Home with the existing QA profile signed in. No app data was cleared. The current-source release APK/AAB were rebuilt with the helper; their hashes are recorded in [AUTONOMOUS_PROGRESS.md](AUTONOMOUS_PROGRESS.md).

The AVD run displayed the DevSupport warning strip and logged a Firebase App
Check debug-token warning; release UI was not checked. The replacement release
certificate remains unregistered with Firebase. An earlier headless API 36
AVD attempt passed disk preflight after scratch space was recovered, then QEMU
exited with SIGSEGV/code 139. A later scratch AVD completed the camera test
after reboot and was deleted. Current-source two-device workflows remain open.

Read-only GitHub checks on 2026-10-21 confirmed that remote `main` still equals local `HEAD` at
`46fe89a534d98866dc981ef11fe64f24151e8bf4`. The working tree has 34 modified
tracked files and six untracked additions that are absent from GitHub. CI run
[39366032936](https://github.com/Patt-00/Campus4Change/actions/runs/39366032936)
passed on that SHA. The `v1.3.0-preview.1` tag points to
`f5823c900c16cc7bf7870562ec5a6c7d730e8a2d`; its GitHub release has no assets,
and `v1.2.2` is still the latest full release. The local signed 1.3.0 APK/AAB
are ignored build outputs and are not published. The replacement release
certificate is not registered with Firebase. At that 2026-10-21 checkpoint,
the estimate was 85.0%. The
functional score adds 0.5 points for the POCO QA session request, acceptance,
cancellation, and verified slot release. Local release artifacts, the Pad 7's earlier signup/profile and
camera flow, POCO camera/photo-picker flows, and single-device group/session
flows are verified. Production integration, true two-device workflows, and
GitHub gates remain open.

The six category weights below follow the autonomous goal. Each category is split into measurable requirements; the earned points sum to the weighted completion estimate. “Implemented but unverified” does not receive full credit.

| Category | Weight | Earned | Current implementation and evidence | Required final state and remaining work | Priority | Estimate |
| --- | ---: | ---: | --- | --- | --- | ---: |
| Functional completeness | 35 | 33.0 | Auth, profile, tutor, groups, and session flows have tests and earlier physical checks. Pad 7's previous QA build verified camera denial, physical capture, profile save, cold-launch restore, and photo cleanup. Earlier POCO QA builds verified camera recovery, photo selection and cancellation, profile save, cold launch, and photo-draft discard. A previous `.qa` build verified Auth Emulator signup/sign-in, TIP setup, private-state write/read, and Student ID claim on POCO; that historical flow predates the UUID change. A separate flow verified email verification and verified Tutor Directory access. On 2026-10-22, POCO QA published a verified tutor profile to the local emulator, then a second verified student account with a matching saved interest saw it ranked under “Recommended for your interests” and opened its details. The current TIP program catalog has 49 unique program-campus entries; `profileCatalog.test.js` checks each has core and specialization suggestions. The POCO also verified that discarding a newly selected photo preserves the saved profile image across cold launch. Current-source UUID setup has not yet been installed on a physical device. | Verify the UUID migration and Google sign-in navigation on POCO; complete release Google Auth verification. | Critical | 94.3% |
| UI/UX completeness | 15 | 13.25 | Branding, the launcher icon, representative routes, profile controls, notifications, and Figma states are documented. Earlier POCO QA checks covered onboarding, sign-in/sign-up, empty-form feedback, keyboard behavior, and the locked tutor-search state. On 2026-10-21, a read-only sweep of the installed prior QA package rechecked Sessions empty states, Messages, Profile/Edit Profile, TIP topic catalogs, Groups empty/Create Group validation, Settings/About, and Notifications while preserving the unread marker. The Create tab's Book a Session action opened the verification gate without showing a false zero-result count. Figma frame 237:106 matches the verification-gated search state. On 2026-10-22, the current-source emulator-QA app on POCO opened Settings from the hamburger menu; it showed Learning Preferences and About, with no biometric-login control. The same build filtered Computer Science topic suggestions, selected a specialization and added a custom interest, then preserved both when Preferences was reopened. A second disposable profile switched to Information Technology, selected a separate specialization, and preserved distinct topic groups for both Manila programs after save and reopen. Pad 7's launcher displays the Campus4Change emblem and label. The signed release Login-to-About route was rechecked on POCO after correcting the signed-out Firebase copy. On current-source QA, resending verification displayed the floating NotificationToast; tapping it from Home opened Notifications, while Home had no persistent verification banner. A 2026-10-22 POCO profile check also injected alphabetic text into the Year level and Student ID fields; neither displayed value contained letters, and discarding the unsaved draft left the saved profile unchanged. A further current-source POCO cold-start smoke verified the branded logo/Get Started, introduction, welcome/sign-in and sign-up screens, no demo credentials or biometric option, and inline validation on an empty signup; the installed QA APK matched the local build hash. The current Group Session screen was also opened and visually inspected on POCO after joining a shared local-emulator group: it showed meetup status, date/time, location, agenda notes, and the return action with no focus timer. The current one-time-camera recovery now automatically opens the existing Edit Profile screen after process recreation; it uses Figma frame 1:495 with no new visual state. On 2026-10-22, dismissing Google Credential Manager on the updated POCO build returned to Login without the previous false failure message. | Recheck all routes, layouts, keyboard states, accessibility targets, and recent profile/group changes on the current build. | High | 88.3% |
| Stability and technical reliability | 20 | 16.25 | 334 Jest tests, 21 Android unit tests, four current-source emulator suites, current-source debug and signed release assembly, and API 24 hashing instrumentation are evidenced. Read-only Firebase CLI inspection on 2026-10-22 confirmed the current release certificate SHA-1 `21241e9a18ab8531f5b383a55d8714c980c807d5` and SHA-256 `0c652406cf3b6051a4f96570807ef738d48a48802ee10e0676055d61fef59ee7` are absent from the registered fingerprints for the Campus4Change Android app. | Register the replacement certificate through authorized Firebase changes, verify release sign-in/App Check, resolve or bound the tooling advisory, and test full UI at minimum API. | Critical | 81.25% |
| GitHub and documentation | 10 | 9 | README, architecture, Firebase, build, audit, and presentation guides are current. The 1.3.0 preview source snapshot and signed APK are published on branch/tag release/v1.3.0-preview.2. GitHub Actions run [39829733295](https://github.com/Patt-00/Campus4Change/actions/runs/39829733295) passed on the exact preview commit. The default main branch remains on the earlier baseline. | Merge the verified release to main when the remaining release gates are complete. | Critical | 90% |
| Testing and quality assurance | 10 | 9.75 | GitHub Actions run [39829733295](https://github.com/Patt-00/Campus4Change/actions/runs/39829733295) passed on the exact preview commit; see the GitHub CI row for job results. The full local suite also passed 334 Jest tests across 40 suites and full-project ESLint. On 2026-10-22, `:app:testDebugUnitTest --rerun-tasks` executed 21 Android unit tests with zero failures, including pending camera-capture and photo-cleanup tests; all four Firebase emulator suites and Android instrumentation-test compilation also passed earlier in the audit. The current `.qa` APK rebuilt and installed on POCO with a matching local hash. Physical POCO checks covered camera permission, capture, saved-photo cold-start persistence, and a one-time-permission process-recreation case: after the QA process was killed while OneShotCamera was open, the new build reopened Edit Profile and restored the pending photo automatically. The synthetic account and local Firestore state were cleaned, the QA app was reset, and CAMERA permission was revoked. Focused suites passed 5 avatar tests, 4 group-room/group-creation tests, 46 duplicate-ID tests, 54 email-verification tests, and 10 group-screen tests. Pad 7's earlier build verified physical capture, profile save, cold launch, and photo cleanup. | Verify current-source flows on the second physical device and rerun CI after any source changes before final release. | Critical | 97.5% |
| Presentation readiness | 10 | 7 | The current-source local emulator path was partially rehearsed on POCO through signup, TIP profile setup, email verification, and verified tutor-directory access; test data were removed. The complete two-device demo and school-laptop rehearsal remain open. | Rehearse the full two-device flow from the school-laptop checkout and confirm the local or live backend setup there. | High | 70% |
| **Total** | **100** | **88.25** | **Pad 7's previous build verifies signup, profile setup, permission denial, physical photo capture/save, cold-launch restore, and cleanup. A previous POCO QA source verified Auth Emulator signup, profile/Student ID claims, duplicate-ID rejection, email verification, verified tutor-directory access, Group Details/Post, and saved-photo preservation after draft discard and cold launch. Those identity checks predate the current UUID source. The current uncommitted changes have passed local JavaScript and Android unit tests but have not been installed on a phone. The preview commit passes CI, including hosted API 24 instrumentation. Current-source device verification, the full two-device workflow, and the school-laptop rehearsal remain open. Release authentication, App Check, and production authorization remain open.** | **100% requires every listed gate below.** | **N/A** | **88.25%** |

## Functional completeness: 33 of 35

| Requirement | Weight | Earned | Status | Evidence and remaining work | Priority |
| --- | ---: | ---: | --- | --- | --- |
| Authentication, signup, verification, account setup, logout, and restore | 8 | 7.5 | IMPLEMENTED BUT UNVERIFIED | Jest and earlier physical flows cover signup, verification, account setup, and restore. The current POCO build accepted an Auth Emulator verification code, refreshed the in-app status to **Email verified**, and opened the verified Tutor Directory empty state. Production and release-key Google sign-in remain unverified. | High |
| Profile editing, TIP catalog, interests, photos, and account UUIDs | 7 | 6 | PARTIALLY VERIFIED | The previous source version validated profile fields and Student ID claims. Current uncommitted code generates a v4 UUID, displays it during setup and on Profile, strips legacy Student ID values from local and cloud snapshots, and uses course/year/campus completeness to gate Home. Focused source tests cover UUID format, migration, setup validation, and navigation state. Physical-device verification remains open. The 49-entry campus catalog and course suggestions pass `profileCatalog.test.js`. See [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md). | High |
| Tutor publishing, search, recommendations, filters, and paging | 6 | 5.5 | COMPLETE AND VERIFIED | Adapter and screen tests pass; physical search found the Computer Science tutor with extra query whitespace. A second live page was unavailable during the physical test. On 2026-10-22, current-source POCO QA verified local tutor publication, two-account email verification, interest-based recommendation and the tutor-details route; both test accounts, private data, claims, tutor listing, and verification codes were removed afterward. | Medium |
| Study groups, membership, posts/replies, reports, and chat | 8 | 8 | COMPLETE AND VERIFIED | Emulator rules/client tests pass. POCO and Pad discovered/joined a shared group and exchanged messages in both directions. The current POCO QA build also created a shared group, saved a post and reply, and rendered Group Details and Group Post after the singular-member label fix; test data was removed. | Medium |
| Session requests, acceptance, cancellation, conflict locks, and notices | 6 | 6 | COMPLETE AND VERIFIED | Pad 7 previously verified request, acceptance, cancellation, and release of four participant slot locks. POCO QA with local emulators verified the request, tutor acceptance, student cancellation, the Cancelled state, and absence of both participants' slot documents after cancellation. | Medium |

## UI/UX completeness: 13.25 of 15

| Requirement | Weight | Earned | Status | Evidence and remaining work | Priority |
| --- | ---: | ---: | --- | --- | --- |
| Navigation and consistent Android visual identity | 6 | 5.75 | IMPLEMENTED BUT UNVERIFIED | The POCO shows the Campus4Change emblem on Android launch and the full logo on account restore. Pad 7's app drawer displays the Campus4Change launcher emblem with its app label. Home, profile, sessions, groups, search, chat, settings, and notification routes had earlier checks. The current POCO build visually checked post-fix Group Details and Group Post. The signed release flow also showed Get Started, Introduction slides 1-3, and Login without sign-in. A full visual sweep of every route remains open. | Medium |
| Phone/tablet layouts, resizing, and input behavior | 5 | 3.5 | PARTIALLY IMPLEMENTED | POCO phone and Pad tablet use passed representative portrait/landscape checks. Verify all forms, keyboard states, and supported sizes in a final sweep. | Medium |
| Empty, loading, error, validation, success, and accessibility states | 4 | 3.75 | IMPLEMENTED BUT UNVERIFIED | Focused tests and physical checks cover restore, search, the unverified locked-directory state, group/session/messages empty states, Create Group validation, TIP campus selection, profile discard confirmation (reproduced on the current-source POCO build on 2026-10-22: Back showed the unsaved-changes alert, Keep editing retained the draft, and Discard changes returned to the saved profile), profile/course/campus pickers, and labeled 48 dp targets across representative routes and group detail, chat, session, and reports screens. The POCO verified that tapping the floating email-verification card opens Notifications. On the POCO, the read-only retry button is accessible and measures 48.2 dp high; the offline claim-recovery screen persists across cold launch. The account-restore and offline Student ID claim states are in the Figma prototype. Current POCO QA visually rechecked post-fix Group Details and Group Post, including the corrected one-member label. The signed release first-run path reached Login. On release, empty SIGN IN and CREATE ACCOUNT submissions displayed local validation errors without submitting Auth. Full all-route accessibility review and exact pixel parity remain open. | Medium |

## Technical reliability: 16.25 of 20

| Requirement | Weight | Earned | Status | Evidence and remaining work | Priority |
| --- | ---: | ---: | --- | --- | --- |
| Reproducible debug build and native verification | 5 | 5 | COMPLETE AND VERIFIED | An isolated snapshot before the final Group Details label edit, excluding `.git`, `node_modules`, Android build outputs, and Gradle project caches, passed `npm ci`, 331 Jest tests, ESLint, and `./gradlew assembleDebug` on Fedora with JDK 25. After the label fix, the full local Jest suite passed 331 tests across 40 suites and full-project ESLint passed; `groupScreens.test.jsx` passed all 10 tests. The emulator-QA builder rebuilt the current APK, `apksigner verify` passed, and the in-place POCO update matched the repository debug signer. The installed base hash matches the rebuilt version 1.3.0/code 6 artifact. The current QA APK targets demo Firebase emulators at `127.0.0.1`; Auth, private profile/claim, email-verification, and group post/reply flows were physically checked. A current-source release APK/AAB were built and validated on 2026-10-22. Both isolated snapshots reused the machine SDK path and were not GitHub or school-laptop clones. A current camera-route clean snapshot passed npm ci, 334 Jest tests, and ESLint, but assembleDebug failed at packageDebug with a temporary disk-quota error; in-place current-source QA and release builds passed. | High |
| Persistence, account switching, and asynchronous state integrity | 5 | 5 | COMPLETE AND VERIFIED | Regression tests caught and fixed cloud restore, stale subscription, pagination, and account-switch races. Fresh-device cloud restore and cold-start state were physically verified. | Low |
| Firestore authorization and data integrity parity | 5 | 3 | PARTIALLY VERIFIED | Local rules and emulator suites verify owner privacy, member access, chat, and atomic booking locks. The 2026-10-22 Rules API record describes the source before the current UUID change. The local worktree no longer reads or writes Student ID claim documents. Production rules have not been rechecked against the current worktree, and no production rules were deployed. A read-only Firestore API recheck on 2026-10-22 found all six production composite indexes READY. See [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md). | Critical |
| Dependency risk, supported Android versions, and performance | 3 | 1.5 | PARTIALLY IMPLEMENTED | `npm audit --omit=dev` on 2026-10-23 reports 20 high paths and zero critical. The full `npm audit` reports 20 high and 20 moderate vulnerabilities, with zero critical. `npm view braces version` still returns 3.0.3. The lockfile now resolves `launch-editor@2.14.2`, the patched version for three reviewed advisories: [argument escaping](https://github.com/advisories/GHSA-698v-4r3x-3vcv), [editor flag handling](https://github.com/advisories/GHSA-r825-w8mm-5pxw), and [Windows file-check bypass](https://github.com/advisories/GHSA-587h-7wmj-h5pm). The patch is within the CLI's declared range and changed no direct dependency. The [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) still lists no patched `braces` version. npm's forced fix proposes React Native CLI 13.5.1, below this project's 20.2.0 CLI. The 20 moderate paths run through `sprintf-js@1.1.3` in Jest coverage tooling. The [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) still lists no patched release, and npm's forced fix proposes Jest 25.0.0. The current release source map contains no paths for `launch-editor`, `braces`, `micromatch`, or `fast-glob`; these findings remain in build tooling. The [published React Native 0.87.1 template](https://registry.npmjs.org/@react-native-community/template/-/template-0.87.1.tgz) pins CLI 20.2.0, matching this app. A three-run QA-debug cold-start baseline measured ActivityManager medians of 538 ms on POCO X4 GT and 729 ms on Pad 7; idle PSS after five seconds was 156,593 KB and 262,856 KB. Home accessibility-snapshot timings include tool overhead and are upper bounds. No release performance threshold exists. GitHub run [39366032936](https://github.com/Patt-00/Campus4Change/actions/runs/39366032936) passed both password-hash instrumentation tests on a hosted Android 7.0/API 24 emulator; full app UI and route behavior at API 24 remain unverified. | High |
| Signed release, release Google sign-in, and App Check | 2 | 1.75 | PARTIALLY VERIFIED | On 2026-10-22, the current-source APK/AAB built with `scripts/build-release.sh` and the existing v3 release certificate. The APK passed `apksigner verify`; the AAB passed `jarsigner`, ZIP integrity, and `bundletool validate` using bundletool 1.18.3. The latest APK was installed on POCO with a matching pulled hash and cold-launched to Login. Both release and QA artifact manifests omit `USE_BIOMETRIC` and `USE_FINGERPRINT`; the installed Login screens still show Continue with Google and no biometric option. Its process log showed App Check token failures. The POCO work-account attempt stopped at Google's device-lock policy prompt before Firebase authentication completed. A read-only Firebase CLI check on 2026-10-23 confirmed that the current release signer SHA-1/SHA-256 remain unregistered, so release Google sign-in and Play Integrity remain unverified. The App Check Console lists the Android app as Not registered, with Authentication and Firestore enforcement Unenforced. The active v3 JKS is mode 600 outside Git and the GNOME keyring item exists, but no separate backup was located in the inspected local locations. Preview 2 contains the updated signed APK with the cancellation UX fix. Dismissing Credential Manager returns to Login without an error on POCO. Selecting the tested work account opened Google's device-lock policy prompt; release Firebase authentication remains unverified because the SHA-1 is not registered. | High |

## GitHub and repository completeness: 9 of 10

| Requirement | Weight | Earned | Status | Evidence and remaining work | Priority |
| --- | ---: | ---: | --- | --- | --- |
| Current verified source on the intended GitHub branch | 6 | 5 | PARTIALLY IMPLEMENTED | The current source snapshot is committed and published on branch/tag release/v1.3.0-preview.2 with a signed installable APK. Main remains at 46fe89a534d98866dc981ef11fe64f24151e8bf4, GitHub Actions run [39829733295](https://github.com/Patt-00/Campus4Change/actions/runs/39829733295) passed on preview commit `55dcc571436d705827b7b069d6bb077350a7e6f5`. The main-branch update remains open until the other release gates are complete. | Critical |
| README, architecture, build, and Firebase guidance | 2 | 2 | COMPLETE AND VERIFIED | Existing guides describe project scope, setup, Android builds, and data boundaries. New audit and presentation documents are indexed from README. | Medium |
| Ignore rules, CI, and repository secret hygiene | 2 | 2 | COMPLETE AND VERIFIED | On 2026-10-22, redacted Gitleaks v8.30.1 scanned 221 commits and the current worktree. Its two history matches are the `apiKey` and `androidApiKey` Firebase client-config fields for `campus4change`; Firebase documents these as public project identifiers, not authorization secrets, when restricted to Firebase services ([Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys)). The current dirty diff and all six untracked files had no matches for private keys, service-account credentials, OAuth secrets, or other provider tokens. GitHub Secret Scanning is disabled on the repository, and Google Cloud API restrictions were not inspected. The Firebase setup guide now explains this distinction and recommends Firebase-only API restrictions. Ignore rules exclude local signing files; published source CI passed on the older main SHA. | High |

## Testing and quality assurance: 9.75 of 10

| Requirement | Weight | Earned | Status | Evidence and remaining work | Priority |
| --- | ---: | ---: | --- | --- | --- |
| Current JavaScript tests and lint | 4 | 4 | COMPLETE AND VERIFIED | On 2026-10-22, the full local JavaScript suite passed 334 tests across 40 suites and full-project ESLint passed. The focused `groupScreens.test.jsx` suite also passed all 10 tests. GitHub CI run [39366032936](https://github.com/Patt-00/Campus4Change/actions/runs/39366032936) independently passed 320 tests on published `main`. | Low |
| Firebase Auth, Firestore rules, booking, and adapter tests | 3 | 3 | COMPLETE AND VERIFIED | On 2026-10-21, the current local worktree passed Firestore rules, booking-overlap, group-client rules, and Firebase Auth verification suites against the disposable `demo-campus4change-rules` emulators. Earlier, an exported Auth/Firestore checkpoint was imported in isolation and its accounts, messages, cancelled booking, and released slots were verified. | Medium |
| Physical debug installation and two-device core flows | 2 | 1.75 | PARTIALLY VERIFIED | The current `.qa` build on POCO completed Auth Emulator signup, TIP setup, Student ID claim, sign-out/sign-in, duplicate-ID rejection, email verification, shared-directory access, and current-source Study Group creation, post, reply, Group Details, and Group Post screens. On 2026-10-22, POCO confirmed saved-photo preservation after replacement-photo discard and camera permission/capture/save across cold start. In a one-time permission test, the QA process was explicitly terminated under its own UID while OneShotCamera was foregrounded; after the camera returned, the new build automatically reopened Edit Profile and recovered the pending photo. Saving the draft and a later cold launch retained the photo. Earlier POCO builds verified photo-picker selection/cancellation, tutor search, and group/session flows. Pad 7's previous build covered setup and physical camera capture/save with cold-launch restore. Current-source two-device tutor/group/session flows remain unverified; Pad 7 is unavailable, so the remaining 0.25 stays open. | Critical |
| GitHub CI on the current source | 1 | 1 | COMPLETE AND VERIFIED | GitHub Actions run [39829733295](https://github.com/Patt-00/Campus4Change/actions/runs/39829733295) passed all workflow jobs on preview commit `55dcc571436d705827b7b069d6bb077350a7e6f5`, including the hosted API 24 Android instrumentation suite. This verifies CI for the preview source but does not replace the pending physical Pad 7 check. | Medium |

## Presentation readiness: 7 of 10

| Requirement | Weight | Earned | Status | Evidence and remaining work | Priority |
| --- | ---: | ---: | --- | --- | --- |
| Overview and technical architecture | 2 | 2 | COMPLETE AND VERIFIED | README, About, architecture, and Firebase setup describe the application and data flow. | Low |
| Demonstration sequence | 3 | 2.25 | PARTIALLY VERIFIED | On 2026-10-22, the current QA build on POCO completed local Auth Emulator signup, TIP profile and Student ID setup, email verification through the in-app refresh action, and access to the verified Tutor Directory. The synthetic account and data were removed. Earlier builds covered photo capture/save, tutor/group flows, and session actions. Current-source two-device flows and a clean school-laptop rehearsal remain open; the isolated source snapshot is not a GitHub clone. | High |
| Accounts, services, devices, and install steps | 3 | 1.75 | PARTIALLY IMPLEMENTED | The updated signed 1.3.0/code 6 APK is downloadable from the v1.3.0-preview.2 GitHub pre-release and is installed on POCO with a matching hash. Credential Manager cancellation now returns cleanly to Login. The previously authorized work account requires a device screen lock on POCO; no live Firebase sign-in completed. The AAB remains local. Pad 7 and the school-laptop rehearsal are still open. | Critical |
| Presentation risks and fallback | 2 | 1 | PARTIALLY IMPLEMENTED | The local emulator fallback has been partially rehearsed on POCO, including signup, profile setup, verification, and directory access. It has not been rehearsed from a clean school-laptop clone or across two physical devices. | Medium |

## Prioritized completion checklist

1. **Critical bugs and crashes: PARTIALLY VERIFIED.** A Pad 7 test reproduced a camera result lost after Android revoked a one-time permission and killed the background app process. The prior POCO QA run verified recovery through the registered AndroidX result flow, profile save, and cold launch. POCO verified camera and gallery draft cleanup while preserving the prior avatar. On 2026-10-22, POCO also verified that discarding a second selected photo preserves a saved custom photo and its file hash across cold launch.
2. **Missing required functionality: PARTIALLY VERIFIED.** The API 36 AVD passed virtual camera capture, profile save, avatar selection, and cold-launch persistence. Pad 7's previous build passed the permission denial fallback and a normal physical camera capture/save/cold-launch flow with a while-in-use grant. POCO verified photo-picker selection and cancellation, camera cancellation, one-time-permission recovery, camera and gallery draft cleanup, and saved-photo preservation after a replacement photo is discarded.
3. **Incomplete features: COMPLETE FOR THE DIRECT APK RELEASE SCOPE.** The signed 1.4.0/code 7 APK is public as a pre-release, installed on POCO with a matching hash, and passed live Google sign-in, generated-UUID TIP setup, Home routing, and Firestore saves. Payments, live calls, Google Play distribution, and AAB delivery are outside this scope. App Check remains unregistered and unenforced, an optional protection that is not required for this direct APK. A full all-route accessibility audit and current-version two-device sync were not part of the release acceptance criteria.
4. **Backend and database: VERIFIED FOR THE DIRECT APK RELEASE.** The deployed Firestore rules hash matches local source at 31f4827c128dcc063a21f7de1dc0542db720dd45efce13b8d0ac3a63630f4cfa; all six live indexes match checked-in definitions. The signed APK completed live Google sign-in and saved profile and interest data. After the authorized reset and QA cleanup, Firebase Auth has 0 accounts and recursive Firestore inventory has 0 collection paths and 0 documents. The encrypted pre-reset backups and temporary keyring entries were removed after release verification. App Check attestation remains unverified and unenforced, as accepted for this APK-only release.
5. **UI/UX: PARTIALLY VERIFIED.** Branded launch, profile validation, notifications, settings, profile photos, and Figma states have implementation/tests and representative visual checks. The current-source POCO Settings and Learning Preferences routes are verified from the hamburger menu. Topic search, selection, custom interests, save, reopen persistence, separate Information Technology/Computer Science groups, and the floating verification-toast destination passed on current-source QA against local emulators; full all-route review remains open. The current POCO build verified post-fix Group Details and Group Post and now displays **1 member** for a one-member group. The current-source Group Session screen was opened on POCO and showed meetup details and agenda notes without a timer. The release flow reached Login after all three Introduction slides, and both release auth screens showed client-side validation for empty submissions. Recheck all routes, supported sizes, keyboard states, empty/error/success states, accessibility targets, and the remaining recent profile/group changes on the current build.
6. **Performance and stability: PARTIALLY IMPLEMENTED.** `npm audit --omit=dev` rechecked on 2026-10-23 reports 20 high paths and zero critical. The full `npm audit` reports 20 high and 20 moderate vulnerabilities, with zero critical. Current release source-map inspection confirms the `braces` path is in build tooling and absent from the shipped JavaScript bundle. A lockfile-only update moves `launch-editor` to patched 2.14.2; the current release source map has no path for it. The remaining `braces@3.0.3` advisory lists no patched version. npm's suggested fixes downgrade React Native or CLI majors; no braces override is justified until a compatible upstream fix is available. Full app UI at API 24 also remains unverified.
7. **Testing: VERIFIED FOR THE DIRECT APK RELEASE.** The signed 1.4.0 APK passed POCO Google sign-in, UUID setup and persistence after re-sign-in, profile saves, camera capture and local-photo retention, profile discard and Year level validation, interest-based tutor recommendations, notification navigation, Settings, Group Session navigation, and tutor request/acceptance/cancellation across two verified disposable accounts. The user's v1.2.2 two-device sync result remains prior-version user-reported evidence. App Check remains unverified and unenforced. GitHub Actions run 40077193029 passed checks and API 24 instrumentation on merged commit `119c22d`.
8. **GitHub synchronization: COMPLETE.** PR #1 is merged to `main` at `119c22defeb05f461a6b15f3a107ffeee749bc12`. GitHub Actions run 40077193029 passed both required jobs on that commit. The signed v1.4.0 APK is published as a GitHub pre-release.
9. **Documentation: COMPLETE FOR THIS RELEASE.** README, architecture, Firebase, build, quality, verification, progress, readiness, completion, and Desktop presentation guides describe the signed APK scope and verified Firebase state. The Desktop guide includes the pre-release link and was sent by email with the APK link. The clean Termux build and GitHub-hosted macOS build passed; the user's personal Mac setup was not independently reproduced.
10. **Presentation: READY.** The Desktop guide contains nontechnical and teacher-facing explanations, a demo flow, version details, current Firebase limits, and the signed pre-release download link. It contains no app-embedded demo credentials. The clean-data reset and test-data cleanup are complete. A school-laptop rehearsal is useful but is not part of the APK acceptance scope.
