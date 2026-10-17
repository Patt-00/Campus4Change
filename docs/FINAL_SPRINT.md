# Final sprint acceptance record

This record covers the request to finish Campus4Change, verify it on the POCO
X4 GT, and push the verified source to `main`. The branded-icon correction
for version 1.2.1 is already on `main` at `158961c`; GitHub Actions run
[39017646958](https://github.com/Patt-00/Campus4Change/actions/runs/39017646958)
passed on that commit. Version 1.2.2 source commit
`fe112d9b13d79bcf5995d8e8fa6a037d11967f34` is now on both `main` and
`codex/firebase-auth-firestore`. GitHub Actions run
[39026925785](https://github.com/Patt-00/Campus4Change/actions/runs/39026925785)
passed every configured check on that exact main SHA.

## Verified application scope

| Requirement | Evidence from this sprint |
| --- | --- |
| React Native CLI Android app in JavaScript/JSX, with no bundled demo account | The current debug build was updated and exercised on the POCO X4 GT (`22041216G`). Existing on-device data was preserved. |
| Firebase authentication and any-email-verified shared access | Two temporary verified email/password accounts signed in on the POCO. Earlier approved Google sign-in completed on the same device. The temporary accounts have since been deleted. |
| Live Firestore isolation, groups, tutor listings, and sessions | The 1.2.2 rules emulator suite passes, and a rules-only deployment to `campus4change` succeeded for the optional allowlisted avatar ID field. The six existing composite indexes were unchanged and were previously reported `READY`. |
| Tutor search and bounded pagination | Live verified directory search showed the temporary tutor listing. Cursor-page behavior, loaded-search guidance, and refresh after paging are covered by focused screen/adapter tests. The live project had fewer than 20 listings, so a second physical page was not available to load. |
| Session request, acceptance, cancellation, and conflict protection | On the POCO, the student requested a session, the tutor accepted, the student received a confirmation notice, and the student cancelled the QA booking. The emulator overlap suite covers cross-tutor and cross-role conflicts, concurrent accepts, lock release, and adjacent times. |
| Study-group discovery, posts, replies, and group chat | On the POCO, the tutor's shared group was discovered by the student; the student replied to a tutor post and sent a group-chat message; the tutor account then saw both. Rules tests cover outsiders, moderation, retries, and private receipts. |
| Tutor-session chat and notifications | The tutor sent a participant chat message and the student received it. The tutor saw a “Session confirmed” notice and opening it linked to the session detail. |
| Private notes and state sync | The tutor's private QA note was present in that owner's Firestore state and remained absent from the student's workspace. A shared request note remained on session details and did not prefill either participant's private-note field. The post-fix POCO sign-out completed without a cloud-sync warning. |
| Tutor/session pagination, private-note default, and chat empty state | Cursor paging is exposed in Tutor Search and Sessions. Shared request notes no longer prefill private notes. The empty chat state now renders outside the inverted list; the POCO displayed it upright and centered. |
| Profile and learning-interest flow | Edit Profile now provides a device photo picker, eight built-in avatar presets, a searchable TIP catalog grouped by campus and college, at least 24 searchable core and specialization prompts per program, and selected interests grouped by course. The POCO imported a generated 1600×1200 test image through Android Photo Picker; its preview appeared, then the unsaved edit was discarded and the staged app-private copy was cleaned on relaunch. The temporary gallery fixture was removed. No personal photo was selected or opened. |
| UI issues found and fixed | Oversized blank interest pills, the past-meetup heading, the blank booking-confirmation header, the tall sync-error panel, and indefinite post loading while group access changes are pending were corrected. Existing shared group data was left intact. |
| Figma alignment | The editable prototype includes updated Edit Profile and Be a Tutor screens, a Create action screen, a past-meetup state, and the booking-confirmation header. Five missing avatar color tokens were added to the dark collection. The updated frames were visually checked. |
| Regression and Android builds | 277 Jest tests in 38 suites, lint, public-Drive-link scan, Auth/Firestore emulator tests, Android unit/instrumentation compilation, release JS bundling/Kotlin compilation, and debug APK assembly passed in CI. Version 1.2.2 code 5 was exercised on the POCO using the matching private debug install. GitHub's published v1.2.0 APK was signed with the public repository debug key; the replacement private-signed v1.2.2 APK/AAB are in progress. |
| QA cleanup | The two temporary Auth accounts and their group, tutor profile, cancelled booking, participant locks, and private Firestore data were deleted. Firestore absence checks passed. The temporary POCO App Check debug tokens were revoked, and the local QA credential file was removed. At QA cleanup, the POCO app was signed out; encrypted per-account snapshots remain because this build has no per-account local purge action, and app data was not cleared. A later cold-launch observation is recorded below. |
| Codebase and workspace cleanup | Removed the unused logo-mark and logo-circle PNG/SVG files; no tracked TypeScript source or bundled demo-data module remains. Lint found no TODO/FIXME/HACK markers, and local Markdown links resolve. Removed about 3.7 GB of ignored Gradle, CMake, and coverage output after verification. `node_modules` and ignored `android/local.properties` remain as local development dependencies/configuration. |

## Previous publication checkpoint — 2026-10-17

Application source commit `d4e4f89` was pushed to both `main` and
`codex/firebase-auth-firestore`. GitHub Actions run
[39013996889](https://github.com/Patt-00/Campus4Change/actions/runs/39013996889)
passed all configured checks on that exact `main` commit: lint, public-link
scan, Jest, Android unit tests, instrumentation compilation, Firebase Auth and
Firestore emulator tests, production bundle and release Kotlin compilation,
debug APK assembly, and the release-signing guard.

On the POCO X4 GT (`22041216G`, Android 14), the installed version 1.2.0 debug
app was force-stopped and cold-launched with Metro available. It loaded the
JavaScript bundle and displayed Home with the existing profile; the captured
log sample had no React Native JavaScript or Android fatal error. The account
type was not inspected. No sign-out, account change, or app-data operation was
performed during this check, so the earlier signed-out cleanup state should
not be read as the phone's current state.

## Main branch checkpoint — 2026-10-17

The version 1.2.1 launcher-icon correction was published at `158961c` to
`main` and `codex/firebase-auth-firestore`. GitHub Actions run
[39017646958](https://github.com/Patt-00/Campus4Change/actions/runs/39017646958)
passed all configured checks on that exact SHA. The version 1.2.2 UI/profile
changes were not yet on `main` at this earlier checkpoint; their publication
is recorded below.

## Version 1.2.2 publication — 2026-10-17

The profile, course-topic, avatar, and UI audit changes were pushed to both
`main` and `codex/firebase-auth-firestore` at
`fe112d9b13d79bcf5995d8e8fa6a037d11967f34`. GitHub Actions run
[39026925785](https://github.com/Patt-00/Campus4Change/actions/runs/39026925785)
passed every configured check on that exact `main` SHA.

## Release and remaining scope

GitHub releases `v1.0.0`, `v1.1.0`, and `v1.2.0` were downloaded to
`/home/patt/Documents/Codex/Campus4Change-release-archive-2026-10-17` before
cleanup; archived APK hashes match the GitHub asset digests. The published
v1.2.0 APK's `SOURCE-BUILD.json` and `apksigner` readback show it was signed
with the repository's public debug key (SHA-256
`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`), not the
private release key. The v1.2.0 APK has two recorded downloads. Deleting the
GitHub release page cannot revoke copies already downloaded. The older release
APK therefore cannot be updated in place by the new private signing identity;
existing installs will need reinstall/migration, which can remove local-only
data. The version 1.2.1 debug APK's icon was verified in Android App Info, and
version 1.2.2 code 5 was installed in place with the POCO's matching private
debug signer and cold-launched. A replacement private release signer and
version 1.2.2 APK/AAB are being prepared before old release entries are deleted.

Release Play Integrity attestation, App Check request metrics/enforcement,
Google Play account deletion, OS push notifications, live calls, iOS, and the
remaining npm audit findings are documented in [QUALITY_AUDIT.md](QUALITY_AUDIT.md).
They are not part of the verified school Android delivery scope; a Play Store
release would require a separate readiness pass. No app-specific final teacher
acceptance checklist has been provided.

## Launcher-icon correction — 2026-10-17

A review of the installed Android resources found that the prior `ic_launcher`
PNGs were the default Android robot, despite the manifest referencing them as
the app icon. Version 1.2.1 replaces them with the Campus4Change education
emblem: adaptive, themed monochrome, and density-specific legacy assets. The
version 1.2.1 debug APK was built as version code 4 and installed in place on
the POCO using the same debug certificate. Android App Info displayed the new
icon and version; the app data was preserved. A cold launch loaded the Home
screen. The same icon was added to the Figma Components page.

## POCO account state after final review

The POCO's signed-in account still shows a shared “Final Sprint QA” group with
a pending permission error and posts waiting for access to sync. Its cause is
unconfirmed, and its data was preserved without retrying or deleting the
pending operation. See [VERIFICATION.md](VERIFICATION.md) for dated evidence
and [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for service configuration.
