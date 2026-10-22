# Ongoing application quality audit

Audit scope: the React Native Android checkout at
`/home/patt/October Shits/Campus4Change`, with the current 1.3.0 source on
`main`. See [COMPLETION_AUDIT.md](../COMPLETION_AUDIT.md) and
[AUTONOMOUS_PROGRESS.md](../AUTONOMOUS_PROGRESS.md) for current readiness and
verification evidence. The release evidence below describes the pinned v1.2.2
source and does not verify the 1.3.0 source.
The Figma coverage map and current repository docs are evidence; they do not
replace a final teacher rubric or live Firebase project. This inventory records
what is implemented, what has been verified, and what still prevents a
production-ready claim. Older checkpoint notes below are historical; the current
issue dispositions are summarized immediately after this scope.
Current completion and unresolved gates are in
[COMPLETION_AUDIT.md](../COMPLETION_AUDIT.md). Historical release entries
below describe the v1.2.2 release only.

## Current sprint status — 2026-10-17, version 1.2.2 released

Source commit cb386acc29c1cd2b55d4c9ed620b657b874f1c91 is on main and
codex/firebase-auth-firestore. GitHub Actions run
[39041101459](https://github.com/Patt-00/Campus4Change/actions/runs/39041101459)
passed on this exact source commit. Lint, 277 Jest tests, the public Drive-link
scan, Firestore emulator tests, and Android CI checks passed. The v1.2.2 APK and
AAB were signed with the dedicated private release key and published to GitHub.
Their APK/AAB metadata and SHA-256 checksums are attached to the release. The
new certificate SHA-1 and SHA-256 are registered in Firebase. The APK was
installed and cold-launched on a REDMI Turbo 4 running Android 16; the branded
start screen and first introduction screen loaded without a React Native fatal
exception in the checked log sample. Google sign-in with the replacement key and
release Play Integrity attestation, metrics, and enforcement remain unverified.

The prior v1.0.0, v1.1.0, and v1.2.0 GitHub releases were archived and removed;
the Git tags remain for source history. Copies already downloaded cannot be
revoked. Older installs require a reinstall to use the new signing identity,
which clears device-only state and app-private profile photos.

## UI audit and profile changes — 2026-10-17

The audit covered all routed screens in `AppNavigator` and physically checked
Home, Sessions, Create, Messages, Profile, Edit Profile, Study Groups, Group
Details, and the Group Session workspace on the POCO. It found and corrected
the learning-interest chips that stretched into blank vertical pills, replaced
the unstructured course field with a searchable TIP program picker, grouped
saved interests by program, and added searchable course-specific suggestions
and custom topic entry. Each of the 45 campus-and-college catalog entries now
has at least 24 prompts split into core subjects and specialization areas.
These suggestions draw on TIP's published curricula and program descriptions;
they are not an official syllabus. Reference sources include
TIP's [undergraduate program index](https://dru.tip.edu.ph/what-we-offer/undergraduate-programs/),
the [revised 2024 Computer Science curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/Revised-2018-TIPM-BSCS-Curriculum-Aug-2024.pdf),
[2023 Computer Engineering curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/2023-CPE_09032024_Updated.pdf),
[2023 Civil Engineering curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/BSCE-2023-Curriculum.pdf),
[2023 Industrial Engineering curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/2023-Curriculum_IE_Manila.pdf),
[2023 Logistics and Supply Chain Management curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/BSBA-LSCM-2023-CURRICULUM.pdf),
[2023 Financial Management curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/BSBA-FM-2023-CURRICULUM.pdf),
the [Bachelor of Special Needs Education curriculum](https://dru.tip.edu.ph/assets/generic-pages/downloadables/RE-SPED-2018-Bachelor-of-Special-Needs-Education-Curriculum.xlsx-BSNEd-2018-CURR.-CHECKLIST.pdf),
and the [TIP Teaching Certificate Program](https://dru.tip.edu.ph/what-we-offer/undergraduate-programs/t-i-p-quezon-city/college-of-education/teaching-certificate-program/).

Edit Profile now supports Android's system photo picker and eight built-in
color avatars. The Be a Tutor form uses the same course-aware subject tags.
Custom photo files remain in app-private storage on the device and are removed
from the cloud-state payload. Only the selected built-in avatar ID can appear
on a public tutor listing. On the POCO, Android Photo Picker imported a
generated 1600×1200 image and displayed its profile preview. The unsaved edit
was discarded; relaunch removed the staged app-private copy, and the temporary
gallery fixture was removed. No personal photo was selected or opened. A preset
change was also previewed and discarded without saving.

The same audit reduced full-width retry errors to compact notices, labeled
expired group meetups as past, showed why posts are waiting when group access
has an unsynced change, and gave booking confirmations a visible title. The
Create tab now uses compact action cards. The connected Figma prototype now
contains the updated Edit Profile screen, a Create screen, a past-meetup state,
an updated booking-confirmation header, and a course-aware Be a Tutor screen;
the dark color-token collection includes the missing avatar colors.

One live account condition remains visible: the POCO still lists a shared group
named “Final Sprint QA mva67ozd” with an unsynced permission error and posts
waiting for group access to sync. I left that shared account data intact. The
screen now explains the wait and offers the existing retry action; this audit
did not replay or delete the live group operation. The debug Metro warning
toast is development-only and does not appear in release builds.

## Implementation history and prior evidence

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
  email/Student ID sign-in routes to the local auth action, Firebase controls
  are hidden in local-only mode, and local password recovery clearly requires
  the original device-account password. Biometric login was later removed.
- Android device-only account passwords now use versioned PBKDF2 parameters:
  HMAC-SHA256/600,000 iterations on API 26+, and HMAC-SHA1/1,400,000 on API
  24-25. Existing unversioned HMAC-SHA1/210,000 hashes remain valid and are
  rehashed after a successful login. Metadata is allowlisted, comparisons use
  `MessageDigest.isEqual`, and local sign-up caps passwords at 1,024 characters.
  JVM tests verify both old and new derivation vectors, metadata validation,
  migration decisions, and the length bound. Both instrumentation vectors pass
  on the POCO's Android 14 runtime; one debug current-hash sample took 2,572 ms.
  GitHub Actions run
  [39366032936](https://github.com/Patt-00/Campus4Change/actions/runs/39366032936)
  passed both vectors on a hosted Android 7.0/API 24 emulator. Full app
  UI/routes at API 24 and a repeatable timing baseline remain unverified.
- Firebase account restoration now uses a generation guard so late local or
  cloud reads cannot replace the state for a newer authenticated UID. During a
  direct UID switch, the old screen is hidden while its local snapshot is saved
  before storage changes accounts. Five hook tests cover cloud-newer restore,
  delayed native account-switch completion, hiding/saving the old profile,
  signing out after a cloud-save failure, and retaining the session if Firebase
  sign-out itself fails.
- Android Google sign-in/sign-up uses Credential Manager and Firebase token
  exchange. The Firebase Google provider is enabled, and the private workstation
  debug signer is registered. On 2026-10-15, the POCO completed the approved
  Google flow and entered Firebase-backed Home/Profile. Release signing and
  its separate certificate registration remain open.
- Android Firebase App Check bridges the Firebase JavaScript SDK to the native Firebase SDK. Debug builds use the native debug provider and release builds use Play Integrity. The POCO debug token was allowlisted only for QA; live private-state sync succeeded and the token was revoked after QA. The v1.2.2 release SHA-256 is registered; the current v1.3.0 replacement signer SHA-256 is not, according to the Firebase SHA list checked on 2026-10-22. Release attestation, request metrics, and enforcement remain unverified.
- The Android release manifest disables cleartext traffic. The React Native
  Gradle plugin sets `usesCleartextTraffic` to `true` for debug builds and
  `false` for release builds; the merged manifests were inspected locally.
  The only app-source `http://` endpoint is the optional Firebase Auth emulator,
  and runtime configuration rejects it in release builds. The checked-in
  emulator host is empty.
- Cloud error banners are now scoped to the screens that use the affected data:
  group-directory errors appear in Study Groups, group action/content errors on
  group pages, and tutor/session errors on tutor or session pages. A route test
  verifies that Profile no longer carries unrelated group and tutor warnings;
  its actionable private-state sync warning remains visible. Tutor read denials
  now give read-specific email-verification and Firestore guidance; write
  denials retain request-limit guidance, covered separately by hook tests.
- In-app notifications reflect participant booking changes and joined shared-group activity. Two-account live QA verified the Session confirmed notice and its session-detail destination on the POCO; emulator tests cover read state, duplicate snapshots, old-event rejection, and retention.
- Tutor and booking history now use cursor pagination with bounded live heads. Tutor pages contain 20 profiles and each participant booking query contains 100 records. Screens expose load-more and refresh-latest actions, search/snapshot guidance, and focused page-controller tests.
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
  locks per participant are written atomically for each one-hour acceptance.
  Emulator tests reproduced and now reject student conflicts across tutors and
  student/tutor role changes, including concurrent accepts. Cancellation releases
  all four locks; pending requests can be cancelled while another booking is
  busy. Rules reject forged bucket IDs and mismatched lock paths. Shared
  workspace notes stay private to each account.
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
  deletion atomically. Startup also removes the retired biometric preference.
  If an older partial
  migration already removed the account row, recovery recognizes only the
  matching legacy profile ID/email. Six Android local unit tests protect the
  exact identity boundary, and CI runs `:app:testDebugUnitTest`. The shipped
  sign-in flow has no demo account or prefilled demo credentials; in application
  code the old identity is referenced only by the cleanup migration and tests.
  The migration now deletes `state_demo` only when its own profile matches that
  identity, even if the old account row is also present, protecting an unrelated
  Firebase cache that happens to use the same storage key. Biometric sign-in
  and its setup UI were subsequently removed from the app.
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

## Current local completion status

The current weighted estimate, requirement scores, and remaining acceptance gates are in [COMPLETION_AUDIT.md](../COMPLETION_AUDIT.md). After the final Group Details label correction on 2026-10-21, the full Jest suite passed 331 tests across 40 suites and full-project ESLint passed; the focused group-screen suite passed all 10 tests. Earlier Android unit, emulator-suite, and signed release checks passed before the correction. The corrected QA APK was rebuilt, signature-checked, and installed in place. On 2026-10-22, the current-source signed APK/AAB were built and validated; the APK was installed and cold-launched on POCO. Its startup log showed App Check token failures. The read-only Firebase SHA list check on 2026-10-22 found the v3 certificate unregistered. The exact cause of the logged App Check token failures is unconfirmed, and no release sign-in was tested. A clean source snapshot also built the bundled emulator-QA package after fresh `npm ci`. The App Check emulator guard has source, test, build, APK-signature, and AAB-validation evidence. The current `com.campus4change.qa` APK is installed on POCO; its pulled base hash matches the rebuilt artifact. On this build, a temporary Auth Emulator signup, TIP profile and Student ID claim, sign-out/sign-in, and display of the saved profile succeeded. A second account was rejected when it tried the same ID, and the first account's claim remained intact. A separate verification link changed a test account to verified; the in-app refresh displayed Email verified and Find People opened its normal empty-directory state. A verified temporary account created a shared group, post, and reply; Group Details and Group Post rendered on POCO, and Group Details now uses the singular **1 member** label. Direct Firestore reads confirmed the private state and claim; cleanup removed and verified absence of all temporary accounts and documents. Focused UI/backend Jest checks passed 46 duplicate-ID tests, 54 email-verification tests, and 10 group-screen tests. The QA APK targets local Auth/Firestore emulators at `127.0.0.1`; POCO USB reverse mappings are active, and device-side TCP probes reached ports 9099 and 8080. A read-only POCO sweep rechecked Sessions empty states, Messages, Profile/Edit Profile, Groups, Settings/About, Notifications, and the Create tab's verification-gated session path on the prior QA package. Pad 7 is unavailable, so current two-device flows remain open. The release APK is installed locally and the AAB remains local; neither is published. The worktree remains unpushed, and production Firestore authorization remains older than the local rules.

The current TIP program catalog contains 49 campus-and-college entries in `src/shared/data/tipPrograms.js`. `profileCatalog.test.js` verifies 49 unique identifiers and two populated topic groups with at least 12 suggestions each. A read-only review of TIP's current program pages confirmed Artificial Intelligence and Internal Auditing in Manila, plus Design and Technology and Accounting Information Systems in Quezon City. Topic prompts for Artificial Intelligence, Internal Auditing, and Design and Technology draw on their published program outcomes and descriptions; they remain suggestions rather than official course titles. See TIP's [Artificial Intelligence program](https://dru.tip.edu.ph/what-we-offer/undergraduate-programs/tip-manila/college-of-computer-studies/artificial-intelligence/), [Internal Auditing program](https://dru.tip.edu.ph/what-we-offer/undergraduate-programs/tip-manila/college-of-business-education/internal-auditing/), [Design and Technology program](https://dru.tip.edu.ph/what-we-offer/undergraduate-programs/t-i-p-quezon-city/college-of-engineering-and-architecture/design-and-technology/), and [Quezon City College of Business Education programs](https://dru.tip.edu.ph/what-we-offer/undergraduate-programs/t-i-p-quezon-city/college-of-business-education/outcomes-based-education/).

## Audit items and disposition

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | Production Firestore rules do not match the current Student ID claim source. | The read-only Rules API check on 2026-10-22 confirmed the mismatch; the exact release and hashes are recorded in [FIREBASE_SETUP.md](FIREBASE_SETUP.md). A read-only Firestore API recheck on 2026-10-22 confirmed all six local composite indexes are present and `READY`. Current Student ID claim rules pass emulator tests only. Production deployment is outside this goal's scope. |
| C4C-02 | High | Real-project, two-account shared workflows were not verified in the earlier audit. | Resolved for the current Android scope: two verified test accounts completed tutor discovery, request/accept/cancel, session chat, group discovery, reply, and group chat on the POCO. The temporary users and their Firestore test data were deleted after verification. |
| C4C-03 | Informational | No Campus4Change-specific final acceptance checklist was found. | The user confirmed no final teacher checklist is available; this is an accepted scope limitation, not a code failure. The known Lab/Seatwork materials cover React Native/Firebase fundamentals but do not specify additional app-specific acceptance criteria; current feature scope is recorded in `FINAL_SPRINT.md`. |
| C4C-04 | Medium | OS push notification delivery is not implemented. | In-app booking/group notices and tutor-session/group chat were verified live across two verified accounts on the POCO, including the Session confirmed deep link. OS push is outside the verified school Android scope; live calls are also unavailable. |
| C4C-05 | Conditional | Shared groups have no instructor-wide moderation path. | Group members can report another member's post, reply, or chat message without storing reporter UID. The group owner can dismiss a report or reversibly hide and restore the target; chat-message moderation is included in emulator tests. No instructor role or broader moderation requirement was supplied; revisit only if a future rubric requires it. |
| C4C-06 | High in build tooling | The 2026-10-22 `npm audit --omit=dev` reports 20 high paths and 0 critical. | The lockfile now resolves `launch-editor@2.14.2` through `@react-native-community/cli-tools@20.2.0`; this patch resolves three reviewed advisories for [Windows argument escaping](https://github.com/advisories/GHSA-698v-4r3x-3vcv), [editor flag handling](https://github.com/advisories/GHSA-r825-w8mm-5pxw), and [Windows file-check bypass](https://github.com/advisories/GHSA-587h-7wmj-h5pm). `package.json` is unchanged. The remaining high paths include `braces@3.0.3`; its [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. Upstream PR [#72](https://github.com/micromatch/braces/pull/72) proposes depth guards but is closed unmerged; the review discussion identifies changed `stringify` output when `escapeInvalid: true`, so that patch is not safe to apply without compatibility tests. The upstream [issue #84](https://github.com/micromatch/braces/issues/84) records the maintainer disputing that a fix is needed, while the GitHub advisory remains active. The 2026-10-22 release source map has 653 sources and none for `launch-editor`, `braces`, `micromatch`, or `fast-glob`; the AAB contains no raw module paths for them. This bounds the finding to build tooling rather than the shipped JavaScript bundle, but the build-time advisory remains unresolved. npm's available fixes downgrade React Native or CLI major versions. The published React Native 0.87.1 template pins CLI 20.2.0, matching this app. |
| C4C-07 | High for release distribution | The public v1.2.0 release APK was signed with the repository debug certificate. | Resolved for new downloads on 2026-10-17: archived the old release assets, published the private-signed v1.2.2 APK/AAB, registered the new Firebase SHA-1/SHA-256, and removed old release entries. Historical tags remain; downloaded copies cannot be revoked, and installs signed by the old key require reinstalling, which clears device-only data. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure local account storage and photo selection are implemented and verified there. |
| C4C-09 | Medium if distributing binaries | Google-to-Firebase sign-in has not been run with the v1.3.0 release-signed app. | The v1.2.2 release key SHA-1 is registered, but Google sign-in with that release remains unverified. The read-only Firebase SHA list check on 2026-10-22 found the current v1.3.0 v3 certificate unregistered; owner authorization and a live sign-in check are required. |
| C4C-11 | Medium if enabling production enforcement | Release App Check attestation, request metrics, and enforcement have not been verified for the v1.3.0 signer. | The v1.2.2 release key SHA-256 is registered. The read-only Firebase SHA list check on 2026-10-22 found the current v1.3.0 v3 key SHA-256 unregistered; authorized Firebase configuration and Play Integrity metrics are required before testing enforcement. Firestore rules remain the authorization boundary. The temporary POCO debug token used for QA was revoked after cleanup. |
| C4C-12 | Medium | Public Git history retains a link to the Lab 4.1 Google Doc, which remains readable to anyone with the link. | The value-redacted history scan found Drive links only in historical commit `51f0100`; the current tree has none and CI rejects new Google Drive links in tracked files. On 2026-10-15, the owner-approved Share-dialog change replaced `anyone:writer` with `anyone:reader`; Google Docs showed **Access updated**, and Drive metadata readback confirmed `anyone:reader` with the named owner unchanged. The link remains in public history, so the document's course and group details are still publicly readable to anyone who finds it. Rewriting public Git history is a separate operation requiring approval and collaborator resynchronization. |
| C4C-13 | Low | Password-hash performance and minimum-API coverage have partial evidence. | On 2026-10-15, the POCO X4 GT (Android 14/API 34) passed both Android instrumentation tests: the current PBKDF2-HMAC-SHA256/600,000 vector and legacy PBKDF2-HMAC-SHA1 verification/migration. GitHub Actions run [39366032936](https://github.com/Patt-00/Campus4Change/actions/runs/39366032936) passed the same two tests on a hosted Android 7.0/API 24 emulator. Full application UI and route behavior at API 24 remain unverified. One current-hash sample took 2,572 ms in the debug instrumentation process. Local password operations run on `CampusStorageModule`'s single-thread worker, not the UI thread. After physical instrumentation, the app remained installed and cold-launched back to the signed-in Home screen without clearing its data. This single timing sample is not a stable performance baseline. Do not reduce the current 600,000 work factor without a security review; it matches the [OWASP PBKDF2-HMAC-SHA256 recommendation](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). |
| C4C-14 | High if Google Play distribution is planned | Firebase-created accounts have no in-app deletion flow or external deletion-request resource. | The app supports Firebase email/password and Google account creation, but a source search found no account-deletion workflow. Google Play requires both an in-app deletion path and a web resource for deletion requests, including deletion of associated account data. Campus4Change stores private account state and user-authored shared records, so deleting only the Firebase Auth user would leave orphaned data. Decide whether Play distribution is in scope, then design a trusted, authorized cascade and external request page before claiming Play readiness; see [Google Play account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) and the [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en). |
| C4C-15 | Medium | Tutor discovery and session history exposed only their first bounded query page. | Resolved 2026-10-17: cursor-based tutor (20) and per-role booking (100) pages now expose Load more and Refresh latest controls, with loaded-search/snapshot guidance. Six live indexes are ready; focused tests cover cursor advancement and stale/live boundaries. The POCO directory held only one listing, so a second live page was unavailable for physical testing. |

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
orphaned legacy biometric pointer; six native identity-cleanup tests and the
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
returned `INSTALL_FAILED_USER_RESTRICTED`; the separate Xiaomi **Install via
USB** permission page showed **No apps**. MiXplorer opened the APK as an
archive, while the system File Manager's unrelated audio/photo permissions
were declined. Its root option remains off, and an on-device install
confirmation and cold launch remain pending. The Developer options **Install
via USB** switch was on, and read-only policy checks found no device-owner or
global install restriction.
The API 36 AVD exited with code 139 before boot, and the Pixel 8a AVD references
a missing system image. The Firebase CLI remains unauthenticated; no live
Firebase settings, rules, indexes, or data changed.
Registry checks found no newer React Native or CLI release and no newer
published `braces`, `micromatch`, or `fast-glob` version that would resolve the
current audit findings without a breaking toolchain downgrade. Drive metadata
also reconfirmed the anyone-writer permission described by C4C-12. At that
checkpoint the owner-approved downgrade was still pending because the Drive
connector could not edit an existing anyone permission and no browser was
available through CUA. The change was completed on 2026-10-15 and verified by
Drive metadata readback.

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
