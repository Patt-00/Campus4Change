# Final sprint acceptance record

This record covers the request to finish Campus4Change, verify it on the POCO
X4 GT, and push the verified source to `main`. The scoped Android/Firebase
application is published to `main`, its GitHub Actions checks pass, and the
remaining store-readiness items are listed separately.

## Verified application scope

| Requirement | Evidence from this sprint |
| --- | --- |
| React Native CLI Android app in JavaScript/JSX, with no bundled demo account | The current debug build was updated and exercised on the POCO X4 GT (`22041216G`). Existing on-device data was preserved. |
| Firebase authentication and any-email-verified shared access | Two temporary verified email/password accounts signed in on the POCO. Earlier approved Google sign-in completed on the same device. The temporary accounts have since been deleted. |
| Live Firestore isolation, groups, tutor listings, and sessions | Deployed rules were read back from Firebase Rules API and match local `firestore.rules` (SHA-256 `4bd5afad4aa7c1e7428c45e018509c33d0ae00721dcdcc549ac72a3c341d35c0`). All six composite indexes report `READY`. |
| Tutor search and bounded pagination | Live verified directory search showed the temporary tutor listing. Cursor-page behavior, loaded-search guidance, and refresh after paging are covered by focused screen/adapter tests. The live project had fewer than 20 listings, so a second physical page was not available to load. |
| Session request, acceptance, cancellation, and conflict protection | On the POCO, the student requested a session, the tutor accepted, the student received a confirmation notice, and the student cancelled the QA booking. The emulator overlap suite covers cross-tutor and cross-role conflicts, concurrent accepts, lock release, and adjacent times. |
| Study-group discovery, posts, replies, and group chat | On the POCO, the tutor's shared group was discovered by the student; the student replied to a tutor post and sent a group-chat message; the tutor account then saw both. Rules tests cover outsiders, moderation, retries, and private receipts. |
| Tutor-session chat and notifications | The tutor sent a participant chat message and the student received it. The tutor saw a “Session confirmed” notice and opening it linked to the session detail. |
| Private notes and state sync | The tutor's private QA note was present in that owner's Firestore state and remained absent from the student's workspace. A shared request note remained on session details and did not prefill either participant's private-note field. The post-fix POCO sign-out completed without a cloud-sync warning. |
| Tutor/session pagination, private-note default, and chat empty state | Cursor paging is exposed in Tutor Search and Sessions. Shared request notes no longer prefill private notes. The empty chat state now renders outside the inverted list; the POCO displayed it upright and centered. |
| Figma alignment | The editable prototype now includes the Requests filter, tutor/session load-more and refresh states, a SEND action, and a separate empty-chat state. The updated frames were visually reviewed. |
| Regression and release builds | 266 Jest tests in 34 suites, lint, public-Drive-link scan, Auth/Firestore/booking-overlap/group-adapter emulator tests, signed `assembleRelease`, and signed `bundleRelease` passed. |
| QA cleanup | The two temporary Auth accounts and their group, tutor profile, cancelled booking, participant locks, and private Firestore data were deleted. Firestore absence checks passed. The temporary POCO App Check debug tokens were revoked, and the local QA credential file was removed. At QA cleanup, the POCO app was signed out; encrypted per-account snapshots remain because this build has no per-account local purge action, and app data was not cleared. A later cold-launch observation is recorded below. |

## Final publication and POCO check — 2026-10-17

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

## Release and remaining scope

The release APK and AAB contain a bundled JavaScript app and use the dedicated
release certificate registered with Firebase (SHA-1 `734c583ad99d2506769677012ab9b63e6750dcfc`,
SHA-256 `8d3013d36bc87451accb4ff455a7839f39397ea0538c367e615c80d1bbd5c1a4`).
The APK and AAB were not installed on the POCO: the existing package uses a
different debug certificate, and replacing it would require uninstalling the
app and erasing its device-local account data. The current POCO debug install
was used for the complete live workflow instead.

Release Play Integrity attestation, App Check request metrics/enforcement,
Google Play account deletion, OS push notifications, live calls, iOS, and the
remaining npm audit findings are documented in [QUALITY_AUDIT.md](QUALITY_AUDIT.md).
They are not part of the verified school Android delivery scope; a Play Store
release would require a separate readiness pass. No app-specific final teacher
acceptance checklist has been provided.

## Publication gate — passed for the scoped Android/Firebase delivery

The application source is on `main`, and its main-branch GitHub Actions run
passed as recorded above. Release Play Integrity/App Check enforcement and
other Play Store readiness items remain outside this school Android delivery
scope; see [QUALITY_AUDIT.md](QUALITY_AUDIT.md). No app-specific final teacher
acceptance checklist has been provided. See [VERIFICATION.md](VERIFICATION.md)
for the dated evidence and [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the
deployed service configuration.
