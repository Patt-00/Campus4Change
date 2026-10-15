# Ongoing application quality audit

Audit scope: the React Native Android checkout on `codex/firebase-auth-firestore`.
The Figma coverage map and current repository docs are evidence; they do not
replace a final teacher rubric or live Firebase project. This inventory records
what is implemented, what has been verified, and what still prevents a
production-ready claim.

## Completed in the current checkpoint

- Firebase email/password auth, encrypted Android auth persistence, and
  private per-user Firestore state are implemented.
- Private cloud-state reads verify the authenticated UID before constructing a
  document reference and remain available to the owner before email
  verification. Regression tests cover missing documents, cross-UID denial,
  and preservation of the transient Student ID when Firebase sign-out fails.
- Completing or skipping the introduction now records a device-level
  preference; later cold launches go directly to Login. Preference-read errors
  fall back to first-run onboarding. Jest covers first and later launch paths,
  and a POCO cold launch showed Login without replaying the introduction.
- When Firebase is configured, existing device-only accounts remain reachable
  through Login's **More sign-in options** path. Focused tests verify local
  email/Student ID sign-in routes to the local auth action, local biometrics
  stay available, Firebase controls are hidden in local-only mode, and local
  password recovery clearly requires the original device-account password.
- Android device-only account passwords now use versioned PBKDF2 parameters:
  HMAC-SHA256/600,000 iterations on API 26+, and HMAC-SHA1/1,400,000 on API
  24-25. Existing unversioned HMAC-SHA1/210,000 hashes remain valid and are
  rehashed after a successful login. Metadata is allowlisted, comparisons use
  `MessageDigest.isEqual`, and local sign-up caps passwords at 1,024 characters.
  JVM tests verify both old and new derivation vectors, metadata validation,
  migration decisions, and the length bound. The instrumentation APK compiles;
  device-provider timing is still unverified because Xiaomi rejected installing
  the test APK, and the configured headless API 36 AVD exited with code 139
  before boot completed.
- Firebase account restoration now uses a generation guard so late local or
  cloud reads cannot replace the state for a newer authenticated UID. During a
  direct UID switch, the old screen is hidden while its local snapshot is saved
  before storage changes accounts. Five hook tests cover cloud-newer restore,
  delayed native account-switch completion, hiding/saving the old profile,
  signing out after a cloud-save failure, and retaining the session if Firebase
  sign-out itself fails.
- Android Google sign-in/sign-up uses Credential Manager and Firebase token
  exchange. The Firebase Google provider is enabled. On 2026-10-14, Project
  settings showed only the previous Android SHA-1 and no SHA-256; it does not
  match the local debug signer. The POCO X4 GT showed both auth screens and
  opened the account chooser, but Google requested fresh account verification
  before Firebase received a token, so this end-to-end step remains open.
- Android Firebase App Check now bridges the existing Firebase JavaScript SDK
  to the native Firebase App Check SDK. Debug builds select the native debug
  provider; release builds select Play Integrity. A JS regression test verifies
  initialization before Auth and Firestore, native token delegation, use of the
  Android-specific API key, and the project-number/app-ID consistency check.
  The Web Firebase app receives only Web configuration. Debug and release
  Kotlin variants compile; release packaging still requires a dedicated key.
  Live registration, debug-token allowlisting, valid token exchange, and
  enforcement remain open in the Firebase Console.
- Shared Firebase study groups support signed-in discovery, membership, posts,
  and replies. Membership documents are private to their owners; posts/replies
  are readable only by members.
- Members can report another member's visible post/reply without storing the
  reporter UID. A paged report queue is available to the group owner, who can
  dismiss a report or reversibly hide/restore its content; instructor-wide
  moderation remains open until the teacher confirms that role and scope.
- Shared group feeds are merged with live directory metadata so the active
  member post listener's content reaches the details and post screens. A
  regression test covers this source-to-screen data merge.
- Shared group membership state now comes from one live listener on the signed-in
  user's `users/{uid}/studyGroupMemberships` subcollection. The same private
  records authorize group access and update the member count atomically, so the
  app no longer needs a recursive collection-group rule for the generic
  `members` collection ID.
- An emulator probe reproduced the old rule's leak: a `members` collection-group
  query returned a seeded private document from an unrelated path alongside the
  expected group membership. A two-group regression test now verifies the
  owner-scoped listener updates join state without per-group reads; emulator
  rules deny collection-group reads for both `members` and
  `studyGroupMemberships` and allow only the owner's exact membership path.
- The group directory loads 20 metadata documents initially and exposes
  cursor-based older pages; Firestore rules reject missing or larger limits.
  Older browsing pauses the live metadata page and offers an explicit refresh,
  while the owner-scoped membership stream stays live.
- The groups screen renders those loaded pages with a virtualized `SectionList`.
  A regression test supplies 80 loaded groups and confirms no more than 10
  group cards are mounted initially.
- Group search reports when no joined groups match, distinguishes an empty
  discovery list from an empty directory, and prompts users to load older pages
  when more search results may exist.
- Tutor subjects are trimmed and deduplicated without regard to case, including
  the subject filter list for previously saved profiles. Firebase tutor
  profiles publish to the email-verified community directory without exposing
  email or Student ID; device-only listings remain local.
- Shared tutor subscription state now scopes action errors to the active
  Firebase UID. Five focused hook tests cover the two-query loading barrier,
  retry and unsubscribe behavior, stale callbacks, account switches, signed-out
  state, and UID-bound tutor actions.
- Screen routes now enter with a short opacity and horizontal movement using the
  native animation driver. Back and tab changes use distinct motion, and all
  existing prototype navigation links have matching transitions in Figma.
- Android screens no longer add the status-bar height on top of a root view that
  already begins below the status bar. A focused test distinguishes the safe-area
  provider inset from `StatusBar.currentHeight`; the POCO Login header moved up by
  100 native pixels without clipping or startup errors.
- Firebase students can send tutor session requests, see incoming/outgoing
  requests live in Sessions, and accept, decline, cancel, or complete them.
  Participant-only rules protect each request. Two timestamp-derived half-hour
  locks are written atomically for each one-hour acceptance, preventing both
  duplicate and overlapping reservations. Rules reject forged bucket IDs and
  mismatched lock paths. Shared workspace notes stay private to each account.
- Tutor-session requests now require a private, non-deletable per-student
  `tutorBookingLimits/{uid}` permit in the same batch as the booking. Firestore
  rules enforce a five-second cooldown. Emulator tests cover the first request,
  missing permits, too-soon retries, forged cooldown reset, owner-only reads,
  denied deletion, and two concurrent request batches where only one can
  consume the student's permit.
- Shared feeds cap live windows at 20 posts and 20 replies per post; members
  can load older cursor pages on demand. Feed snapshots are kept out of durable
  private account-state records. Paging pauses the current live window until
  the user refreshes to latest, keeping the loaded window bounded.
- Older post pages fetch one bounded reply preview per post without adding
  live listeners. Regression coverage pages through 40 older posts and confirms
  the active reply-listener count remains at the latest window's 20.
- Group directory updates now read changed metadata and membership only. Post
  and reply listeners are started only while a member has that group open, and
  listeners are removed when the group closes or the user leaves.
- Firebase signup stages the entered name and Student ID before account
  creation so an early auth-state callback cannot initialize an incomplete
  profile; a regression test covers that event order.
- Firebase signup allows only one in-flight request per normalized email, so
  a duplicate form submission cannot replace pending name or Student ID data.
  A deferred Auth callback test verifies that a conflicting second request is
  rejected and the first account keeps its submitted profile.
- Firebase signup treats a failed optional Auth display-name update as
  recoverable after account creation, keeps the entered app profile, and shows
  a user-facing notice instead of attempting a partial account rollback.
- Firebase signup sends an email verification link. Firestore rules require a
  verified-email claim for shared study-group data while keeping each user's
  private account state owner-only before verification.
- Android Google ID-token parsing now catches the parser exception that the
  Kotlin Credential Manager library can throw through its Java API. Debug logs
  record only exception classes or Firebase error codes, and invalid-credential
  errors now get an actionable message. The approved-device retry still ended
  before returning a token, so Google-to-Firebase account exchange is open.
- The project Node engine range now matches React Native 0.87.1's declared
  support range; the separate Firebase rules-test package requires Node 24.12+.
- Password-reset responses do not reveal whether an email is registered or
  disabled. The screen always shows a neutral confirmation while network errors
  remain actionable; tests cover both paths.
- Sign-out distinguishes encrypted local persistence from Firebase sync. It
  keeps the account open if the local save fails, but permits sign-out after a
  successful local save when cloud sync fails and explains how to retry later.
  A successful Firebase sign-out also clears the transient Student ID cache.
- Local account-state writes no longer wait behind Firestore server
  acknowledgements. Cloud snapshots are coalesced by Firebase UID, and sign-out
  waits at most 1.2 seconds for a remote acknowledgement after saving locally.
  The app reports when a cloud write is pending. Regression tests hold a cloud
  write indefinitely, verify later local changes still persist, ensure a
  pending write cannot cross into another account, retry the latest state after
  signing back into the same Firebase UID, and keep an older acknowledgement
  from clearing a newer local-save error. Firestore emulator coverage confirms a
  local listener sees an offline write before its server acknowledgement and
  that the write resolves after network access returns.
- Booked and group sessions use appointment-style workspaces for their schedule,
  location or tutor, agenda, and notes. Group notes stay private until the member
  explicitly posts them.
- Firebase tutor-session chat is now reachable directly from the booked-session
  workspace for both participants; the previous helper copy incorrectly said
  chat was unavailable. A booking can no longer be marked complete before its
  scheduled start: the UI, client update path, and Firestore rule enforce the
  time boundary, with tests for denial before start and success after start.
  Home, Sessions, Session Details, and Session Workspace now refresh derived
  time status at the next start/end boundary while they remain open. Device-only
  session contact links now say **Open private notes** and explain that they are
  not delivered to the tutor.
- Verified Firebase users now have live chat inside current shared groups and
  between the two participants in a tutor booking. Chat reads are limited to the
  active conversation and newest 50 messages, with older pages loaded on demand.
  Group chat shares the five-second member contribution limiter and its messages
  can be reported, hidden, and restored by the group owner. Device-only
  conversations remain private notes. Hook state is scoped to the active user
  and conversation; a regression test ensures a route change cannot briefly
  render the prior conversation's messages beneath the new title.
- Session timing is displayed as upcoming, in progress, or past due from the
  stored start time without silently rewriting the user's saved status.
- Upcoming sessions with a missing or malformed start time now go to Needs
  review instead of appearing as upcoming. Home selects its next session from
  valid upcoming times; session lists sort malformed values safely. Details,
  workspaces, and cards show clear fallback text for unavailable dates and
  times. Regression tests cover missing, null, empty, malformed, and numeric
  start values.
- Rescheduling now uses the computed timing status. A session that has started
  or passed its scheduled time no longer exposes the reschedule action, and the
  save handler rejects the same stale route.
- Rescheduling a saved session whose time is not one of the current preset slots
  now requires an explicit replacement choice instead of silently selecting
  the first slot.
- Sessions with legacy or missing statuses remain visible under Needs review.
  Past-due bookings are shown in Sessions; the filter callback explicitly
  passes each session so JavaScript cannot substitute the array index for its
  optional clock argument. Home also surfaces past-due bookings with a direct
  route to their list.
- The Sessions screen now explains when there are no future bookings while
  keeping in-progress, past-due, needs-review, and completed sessions grouped
  below. Tests cover this message with past-due data and for an empty account;
  the updated screen was checked on the Redmi Turbo 4.
- Messages and Chat now use virtualized `FlatList` windows instead of mounting
  every saved conversation and message. A repeatable renderer scenario reduced
  mounted message bodies from 1,200 to 18 and inbox cards from 120 to 12 while
  keeping full-message search and send behavior covered.
- Firebase booking confirmation says the request is pending until the tutor
  responds. Device-only confirmation remains a private schedule entry
  and explains that the tutor is not notified.
- Focused tests now cover home navigation and search, local/shared tutor profile
  behavior, participant request mapping and slot updates, private tutor
  filtering, group-room timer lifecycle and notes,
  shared-group retry errors, storage compatibility, and session cancellation,
  rating, and reschedule timing. Shared-group tests guard against stale
  directory callbacks and pending writes crossing an account switch. Local
  state persistence is bound to the account captured when each save is queued;
  the test recreates a same-timestamp account switch and confirms no old state
  is written under the new account. Theme tests enforce 4.5:1 contrast for
  small foreground text on the dark surfaces and cyan button fill.
- Leaving a group session with Back keeps note drafts private. Publishing to a
  shared group happens only from the explicit Post Notes to Group action.
- Device-only groups remain available. Pending shared writes are saved in
  account state and can be retried.
- Firestore emulator tests cover account isolation, group discovery, membership
  counts, owner/member boundaries, and member-only content. Unit tests cover
  state merging, offline replay, and listener behavior.
- Firestore rules require each post/reply to update a private member write-limit
  record in the same batch and enforce a five-second per-member group cooldown.
  Emulator tests cover allowed writes, too-early writes, and private limiter data.
- Removed the unused `@react-native/new-app-screen` starter dependency after
  confirming no application or test source imports it; the reported audit total
  dropped by one high-severity package path.
- The `npm start` script now binds Metro to `127.0.0.1` by default. ADB reverse
  still delivered the debug bundle to the Redmi Turbo 4, and the app relaunched
  successfully. This reduces LAN exposure of the development server; it does
  not remediate the unpatched upstream `braces` advisory.
- The Firestore rules test now requires an explicit opt-in before clearing the
  selected emulator project's default database. CI supplies that flag for its
  fresh emulator; normal local invocations refuse to erase existing test data.
- Messages and Chat now handle saved conversation records with missing or
  malformed message arrays. The list shows an empty-thread summary, and sending
  a new message repairs the array; malformed timestamps no longer break sorting.
  An app-level regression loads such a saved state, opens the thread, sends, and
  verifies persistence.
- Chat privacy copy now distinguishes device-only accounts from Firebase
  accounts whose private conversation state syncs to Firestore. Both cases say
  messages are not delivered to the other person; the inbox empty state no
  longer describes every conversation as device-local.
- Private Firebase note history now uses one owner-scoped Firestore document per
  message instead of growing inside the private account-state document. Legacy
  embedded messages migrate on the next save; per-message idempotent writes and
  immutable rules preserve privacy and avoid cross-device overwrites. The
  emulator tests verify owner access before email verification, cross-account
  and anonymous denial, the 2,000-character limit, immutable updates, and denied
  message deletion. The account-state cap now measures UTF-8 bytes.
- Partial version-one profiles now fill missing fields from account defaults
  before feature screens render. A record missing name, interests, and tutor
  subjects previously crashed while the directory read `tutorSubjects.length`;
  the app-level restore test verifies Home renders and the defaults persist.
  A Firebase-session test covers partial cloud state through the mocked cloud
  adapter. New accounts keep blank defaults and do not inherit bundled data.
  Restore also filters null and primitive rows from sessions, groups,
  conversations, and notices while preserving valid records; a regression test
  reproduces the null-group crash in Home.
- Legacy seeded-account cleanup now commits the account list, saved-state
  deletion, and biometric-pointer deletion atomically. If an older partial
  migration already removed the account row, recovery recognizes only the
  matching legacy profile ID/email. Two Android local unit tests protect the
  exact identity boundary, and CI runs `:app:testDebugUnitTest`. The shipped
  sign-in flow has no demo account or prefilled demo credentials; in application
  code the old identity is referenced only by the cleanup migration and tests.
  The migration now deletes `state_demo` only when its own profile matches that
  identity, even if the old account row is also present, protecting an unrelated
  Firebase cache that happens to use the same storage key. It can also remove
  the exact old biometric pointer when a partial migration left that pointer
  after the account row and matching profile were already removed.
- Interactive list labels now include their visible context: session time,
  status, and tutor; group subject, membership, and sharing state; tutor
  subjects and rating; message preview; and notification body and read state.
  Booking date controls announce the full date, and group post buttons include
  the author and note text. The Redmi accessibility tree and focused tests
  verify these summaries.
- Added a GitHub Actions workflow for lint, unit tests, Auth/Firestore emulator
  tests, production bundling, the Android debug build, and the release-signing
  guard. Gradle dependency and wrapper caching is enabled through the
  [`setup-java` cache option](https://github.com/actions/setup-java/blob/main/README.md).
  Remote run
  [38456821435](https://github.com/Patt-00/Campus4Change/actions/runs/38456821435)
  passed on commit `af7ea01` without production Firebase credentials. It also
  ran `:app:testDebugUnitTest`, including both migration identity tests.

## Open issues

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | The checked-in Firestore rules and indexes have not been deployed. | On 2026-10-14, the authenticated Console session confirmed project `campus4change`, default database `asia-southeast1`, an empty Data tab, deny-all rules, and no Manual indexes. `.firebaserc` now pins the default CLI target to `campus4change`. The owner chose any verified email for shared features. The local four-index manifest matches current queries: tutor listings, filtered group posts, filtered replies, and filtered group chat. The rules also now include owner-only private message documents; this requires re-review of the earlier deployment scope but adds no index. The previous prompt specified 3 indexes, so the chat index remains an approval-scope delta. The Firebase CLI is unauthenticated. Confirm deployment of this exact ruleset and all four indexes before replacing live deny-all rules, then exercise real account workflows. |
| C4C-02 | High | No real-project, two-account shared-group workflow has been verified. | Live Firebase rules remain deny-all and the database is empty, so signup/verification, group create/discover/join/post/reply/leave, tutor publishing, and chat have not been tested against production. After the reviewed rules/indexes are deployed, verify two test accounts and exercise those workflows against the project. |
| C4C-03 | High | The final-project acceptance rubric is not present in the accessible course artifacts. | The local Canvas catalog lists the course orientation, numbered Modules 1-5, and two exam modules. The Drive assignment copies found for Lab 4.1 and Seatwork 5.1 document prototype translation plus Firebase Authentication, auth-driven screen state, owner-scoped Firestore CRUD/rules, and clean UI learning outcomes. They are assignment-specific, not a final Campus4Change acceptance checklist. At the last browser check, the course Assignments page was disabled and a module link returned Access Denied. Keep unrequested Hosting and instructor-wide moderation out until the final rubric confirms them. |
| C4C-04 | Medium | Live chat lacks real-project two-account and push-notification verification. | Emulator rules now allow current shared-group members to exchange live chat messages and limit tutor-session chat to its two booking participants. Test coverage includes participant checks, message limits, cooldowns, cancellation state, group membership, and owner hide/restore. Production rules and indexes remain undeployed, so no real two-account flow is verified; OS push notifications are not implemented. |
| C4C-05 | Medium | Shared groups have no instructor-wide moderation path. | Group members can report another member's post, reply, or chat message without storing reporter UID. The group owner can dismiss a report or reversibly hide and restore the target; chat-message moderation is included in emulator tests. The course has not established an instructor role or broader moderation requirements; confirm that scope from the acceptance rubric. |
| C4C-06 | Medium | The current audit reports 28 high, 17 moderate, and 0 critical findings. | On 2026-10-14, `npm audit --omit=dev` still reported 20 high paths; the full tree reports 28 high/17 moderate after upgrading Jest from 29.7.0 to 30.5.2 (previously 47 high/5 moderate). All 250 tests pass, lint and Android bundle/debug builds pass, and Firestore/Auth emulator suites pass with the new private-message model. Focused coverage includes auth-observer restore recovery, private-note migration and owner rules, sign-up validation and retry behavior, Gmail address entry, tutor details/booking confirmation, session cancellation/completion failures, and duplicate action suppression while requests are pending. `@react-native/jest-preset@0.87.1` still uses its own Jest 29-compatible packages. Installed `braces@3.0.3` and `micromatch@4.0.8` remain on affected versions; installed `sprintf-js@1.0.3` is within the advisory range `<=1.1.3`, and `npm view` shows 1.1.3 as the latest published version. No patched version was available at the time of the audit; the `braces` maintainer disputes its finding. The production Hermes bundle does not contain `braces`, `micromatch`, or `fast-glob`, so those paths are in the build/test toolchain rather than shipped JavaScript. npm's suggested React Native 0.72.17 and CLI 13.5.1 remediations remain incompatible downgrades from the project's 0.87.1/20.2.0 toolchain. Revisit after an upstream patch or a separately tested toolchain migration. See the [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [braces maintainer discussion](https://github.com/micromatch/braces/issues/84), and [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). |
| C4C-07 | Medium | No dedicated production release key is configured. | Gradle release artifact tasks now fail closed without a dedicated keystore; a no-key release dry run was rejected before build tasks and the existing APK hash stayed unchanged. The tracked `android/app/debug.keystore` is public and remains a shared development-only identity, never a release trust anchor or Firebase Google-OAuth certificate. `C4C_DEBUG_STORE_FILE` now allows local builds to use a per-machine key without changing the shared default. APKs signed with different debug keys cannot update each other; switching an installed device requires uninstall/reinstall and loses device-only data. No production keystore was created or used. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |
| C4C-09 | Medium | Google-to-Firebase account exchange is not yet verified on-device. | Previous POCO X4 GT attempts returned `GetCredentialCancellationException` before Firebase received an ID token. Firebase Console has one registered SHA-1 (`60:CD:C5:DF:6D:2D:2A:DF:48:DC:E2:4B:72:98:8B:9C:34:A9:CE:4A`) that matches the private per-user debug keystore at `~/.android/debug.keystore` on this workstation. Gradle now supports `C4C_DEBUG_STORE_FILE`; the 2026-10-15 ARM64 APK was verified by `apksigner` to use the registered SHA-1. Its SHA-256 is `6b74de52c20ec7933e86bf98df670422bda089b92b830b4bbb7a753922b848bd`. The keystore is outside the public repo. The repository-tracked key remains public and is not registered. The APK is copied to the POCO, but Android's direct install returned `INSTALL_FAILED_USER_RESTRICTED`; Google token exchange remains unverified pending a File Manager install. The private key's SHA-256 is not registered for Play Integrity. The release certificate needs its own SHA-1 and SHA-256 fingerprints. |
| C4C-11 | Medium | Firebase App Check is not registered or enforced. | A read-only Console check on 2026-10-14 showed the Android and Web apps as **Not registered**. The Android app details offer Play Integrity and require a SHA-256 fingerprint plus acceptance of Google APIs and Play Integrity API terms before saving. The native bridge uses the Android API key from `google-services.json`-derived config and checks that the Android app ID uses the same project number; the JavaScript Firebase app receives only Web config. Debug uses the debug provider, while release uses Play Integrity. Both variants compile, but valid token exchange has not been verified because no Android App Check registration or debug-token allowlist entry exists. Register the Android app, allowlist the debug token, verify real request metrics, then configure release attestation with the dedicated release certificate before considering enforcement. The [official Android setup](https://firebase.google.com/docs/app-check/android/play-integrity-provider) requires app registration and a SHA-256 signing fingerprint. App Check supplements, but does not replace, Firestore rules. No App Check settings or terms were accepted during this check. |
| C4C-12 | High | Public Git history retains links to Google Docs, including a document with anyone-writer access. | A value-redacted scan of all 152 reachable commits found the links only in historical commit `51f0100`; the current tree has none. Read-only Drive metadata reconfirmed on 2026-10-15 that the linked Lab 4.1 instructions document still has an `anyone:writer` permission, while the Seatwork 5.1 document is owner-only. CI now rejects new Google Drive file links in tracked files. The owner approved changing this anyone-link role to viewer on 2026-10-15, but the available Drive connector cannot update an existing `anyone` permission and no browser is available through CUA; the owner must make this change in the document's Share dialog and the result still needs metadata verification. Rewriting Git history is a separate action and still needs approval plus collaborator resynchronization. |
| C4C-13 | Medium | Device-only password-hash performance and the migration path are not yet exercised on Android. | JVM tests verify the legacy SHA-1/210,000 and current SHA-256/600,000 vectors, and `:app:assembleDebugAndroidTest` compiles two provider tests. Direct install attempts returned `INSTALL_FAILED_USER_RESTRICTED`; read-only device checks show the owner profile is unlocked, not device-managed, and has the Developer options **Install via USB** switch enabled. A fresh ARM64 APK is now in POCO Downloads with a verified SHA-256, but the File Manager installer flow has not been completed. The API 36 AVD again exited with code 139 before boot, and the Pixel 8a AVD cannot load because its configured Android 37.1 system image is absent. Do not treat the host JVM result as Android provider or device-timing proof. |
| C4C-14 | High if Google Play distribution is planned | Firebase-created accounts have no in-app deletion flow or external deletion-request resource. | The app supports Firebase email/password and Google account creation, but a source search found no account-deletion workflow. Google Play requires both an in-app deletion path and a web resource for deletion requests, including deletion of associated account data. Campus4Change stores private account state and user-authored shared records, so deleting only the Firebase Auth user would leave orphaned data. Decide whether Play distribution is in scope, then design a trusted, authorized cascade and external request page before claiming Play readiness; see [Google Play account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) and the [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en). |

## Accepted policy decisions

- C4C-10: Shared Firebase features intentionally accept any email address after
  Firebase verifies it. The owner decided against a TIP-only or `.edu` domain
  restriction on 2026-10-14. This confirms control of an address, not school
  affiliation; the current client and rules already implement the chosen policy.
  Client and rules regression tests now exercise a verified `gmail.com` account
  and continue to reject unverified access. Sign-up, About, group creation, and
  tutor-directory copy now describes email verification rather than verified
  student identity; the existing Figma tutor frames already use generic tutor
  labels.

## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). On commit
`c6fe73d`, 192 Jest tests, lint, Auth/Firestore emulator tests, production
bundling, Android unit tests, and the debug build passed locally. GitHub Actions
run
[38478344342](https://github.com/Patt-00/Campus4Change/actions/runs/38478344342)
passed all configured checks. Commit `94889c0` narrows legacy-state cleanup and
run
[38479904396](https://github.com/Patt-00/Campus4Change/actions/runs/38479904396)
passed all configured checks. The follow-up migration change also clears an
orphaned legacy biometric pointer; seven native cleanup-plan tests and the
Android debug build pass, and the APK was installed and cold-launched on the
POCO X4 GT. Login showed no demo account or prefilled credentials, and empty
signup validation behaved as expected. The cache-collision case was not seeded
on device. The complete workflow passed on the current tree in run
[38480817534](https://github.com/Patt-00/Campus4Change/actions/runs/38480817534).
The approved test-account retry ended in Credential Manager cancellation
before Firebase received a token, so Google account creation and the production
Firebase project or real two-account chat remain unverified. Emulator success
does not substitute for deploying rules and indexes to Firebase.

Earlier Redmi Turbo 4 checks exercised the then-present seeded account,
schedule-focused Sessions/Session Details, and the separate 25-minute group
room timer. Those are historical UI checks, not current-runtime evidence for a
personal account. A nonfatal focus soft exception was logged before the React
context was ready; no app crash or JavaScript error followed.

The 2026-10-15 refresh confirms that GitHub Actions run
[38694610740](https://github.com/Patt-00/Campus4Change/actions/runs/38694610740)
passed every configured check on `b9b2382`, including lint, all Jest and native
unit tests, Auth/Firestore emulator tests, instrumentation-test compilation,
the release JS bundle/Kotlin compile, the debug APK build, and the release
signing guard. A fresh ARM64-only debug APK was built with the private per-user
debug key; `apksigner` verified the registered Firebase SHA-1 and the artifact
SHA-256 is
`6b74de52c20ec7933e86bf98df670422bda089b92b830b4bbb7a753922b848bd`. The APK
was copied to the POCO and its device checksum matched. ADB installation still
returned `INSTALL_FAILED_USER_RESTRICTED`; opening the APK showed Xiaomi's
**Open with** chooser, so a manual File Manager installation and cold launch
remain pending. The Developer options **Install via USB** switch was on, and
read-only policy checks found no device-owner or global install restriction.
The API 36 AVD exited with code 139 before boot, and the Pixel 8a AVD references
a missing system image. The Firebase CLI remains unauthenticated; no live
Firebase settings, rules, indexes, or data changed.
Registry checks found no newer React Native or CLI release and no newer
published `braces`, `micromatch`, or `fast-glob` version that would resolve the
current audit findings without a breaking toolchain downgrade. Drive metadata
also reconfirmed the anyone-writer permission described by C4C-12.
The owner approved downgrading that permission to viewer, but the available
Drive connector cannot edit an existing anyone permission and no browser was
available through CUA; the change remains pending the owner's Share-dialog
action and metadata readback.

The 2026-10-14 session-workspace update passes all 203 Jest tests in 30 suites,
lint, the Firestore rules emulator checks, production JavaScript bundling,
Android unit tests, and the debug build. Its new screen labels keep device-only
notes distinct from participant chat. Physical-device verification of the
signed-in shared workspace remains outstanding because no user account was
signed in during this check. GitHub Actions run
[38487319960](https://github.com/Patt-00/Campus4Change/actions/runs/38487319960)
passed all configured checks on commit `55278a1`.

The documentation-only follow-up commit `fe44050` also passed GitHub Actions
run [38487752667](https://github.com/Patt-00/Campus4Change/actions/runs/38487752667).
On the POCO X4 GT, the current debug build was installed over the prior app
without clearing data; cold launch, the branded start screen, onboarding, Login,
and empty-form validation were visually checked. No demo credentials appeared,
and no account was created. The shared signed-in workspace remains untested on
the device.

The App Check client integration passes all 207 Jest tests in 31 suites and
lint. Gradle compiled both debug and release Kotlin variants, passed Android
local unit tests, and assembled the debug APK. The POCO X4 GT update cold-launched
through the branded start screen and onboarding to Login, and empty-form
validation worked. A redacted App Check log scan found no warnings/errors; it
did not establish valid token exchange or server enforcement. GitHub Actions
run [38489738104](https://github.com/Patt-00/Campus4Change/actions/runs/38489738104)
passed all configured checks on commit `5adedf9`.
