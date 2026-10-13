# Ongoing application quality audit

Audit scope: the React Native Android checkout on `codex/firebase-auth-firestore`.
The Figma coverage map and current repository docs are evidence; they do not
replace a final teacher rubric or live Firebase project. This inventory records
what is implemented, what has been verified, and what still prevents a
production-ready claim.

## Completed in the current checkpoint

- Firebase email/password auth, encrypted Android auth persistence, and
  private per-user Firestore state are implemented.
- Shared Firebase study groups support signed-in discovery, membership, posts,
  and replies. Membership documents are private to their owners; posts/replies
  are readable only by members.
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
  the subject filter list for previously saved profiles. Tutor profile copy
  clarifies that personal listings are not shared with other students.
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
- Firebase signup sends an email verification link. Firestore rules require a
  verified-email claim for shared study-group data while keeping each user's
  private account state owner-only before verification.
- Password-reset responses do not reveal whether an email is registered or
  disabled. The screen always shows a neutral confirmation while network errors
  remain actionable; tests cover both paths.
- Sign-out distinguishes encrypted local persistence from Firebase sync. It
  keeps the account open if the local save fails, but permits sign-out after a
  successful local save when cloud sync fails and explains how to retry later.
  A successful Firebase sign-out also clears the transient Student ID cache.
- Booked sessions now use a booking-focused workspace for schedule, tutor,
  agenda, and notes; the focus timer is confined to group study rooms.
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
- Booking confirmation and reminders describe a private schedule entry and
  state that the tutor has not been notified.
- Focused tests now cover home navigation and search, tutor listing create and
  removal, private tutor filtering, group-room timer lifecycle and notes,
  shared-group retry errors, storage compatibility, and session cancellation,
  rating, and reschedule timing. Shared-group tests guard against stale
  directory callbacks and pending writes crossing an account switch. Local
  state persistence is bound to the account captured when each save is queued;
  the test recreates a same-timestamp account switch and confirms no old state
  is written under the new account. Theme tests enforce 4.5:1 contrast for
  small foreground text on the dark surfaces and cyan button fill.
- Leaving a group room with Back now keeps note drafts private. Publishing to a
  group happens only from the explicit Save Notes and Leave action.
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
- Partial version-one profiles now fill missing fields from account defaults
  before feature screens render. A record missing name, interests, and tutor
  subjects previously crashed while the directory read `tutorSubjects.length`;
  the app-level restore test verifies Home renders and the defaults persist.
  A Firebase-session test covers partial cloud state through the mocked cloud
  adapter. Personal accounts keep blank defaults and do not inherit demo data.
  Restore also filters null and primitive rows from sessions, groups,
  conversations, and notices while preserving valid records; a regression test
  reproduces the null-group crash in Home.
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
  The latest [remote run](https://github.com/Patt-00/Campus4Change/actions/runs/38338154347)
  passed on commit `6b7a1d2` without production Firebase credentials.

## Open issues

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | The checked-in Firestore rules have not been deployed. | The last live Console check found project `campus4change` on Spark, its Standard database in `asia-southeast1`, and initial production-mode deny-all rules. In this session, `firebase projects:list` failed because Firebase CLI is unauthenticated, and gcloud has no active credentials, so the live rule state cannot be rechecked. Before deployment, inspect for manually seeded legacy group-member documents and migrate any that exist to `users/{uid}/studyGroupMemberships/{groupId}`; then explicitly authorize deployment and live data tests. |
| C4C-02 | High | No real-project, two-account shared-group workflow has been verified. | At the last live check, app access was denied by the initial production-mode rules. The current Firebase CLI is unauthenticated, so recheck that state after signing in. Then deploy the reviewed rules with authorization, verify two test email addresses, and test create/discover/join/post/reply/leave against the project. |
| C4C-03 | High | The final-project acceptance rubric is not accessible in the current course. | The local `Canvas_Modules.md` index contains Modules 1-5 although its heading says nine modules. It lists a Module 1 project proposal, Module 3 prototype, Module 4 React prototype translation, and Module 5 React Native Environment/App/State/Props/Styling topics plus Firebase Integration and Firebase Authentication assignments. At the last browser check, the course Assignments page was disabled and the module link returned Access Denied. The outline confirms React Native/Firebase learning scope but does not define final-project acceptance. Keep Google sign-in, Hosting, cross-student bookings, chat, and moderation as unconfirmed scope until the teacher supplies the rubric. |
| C4C-04 | Medium | Tutor listings, bookings, direct messages, and group chat are not shared between students. | Firebase accounts sync this data inside each user's private state; device-only accounts keep it local. Cross-student tutor, booking, and messaging workflows are not implemented. Confirm whether the final rubric requires those workflows before designing their schemas. |
| C4C-05 | Medium | Shared groups have no content reporting or moderation path. | Rules restrict writes to members, validate authorship and text size, and enforce a five-second cooldown. Students still cannot flag or remove abusive content, and there is no instructor moderation workflow. Add one before wider use. |
| C4C-06 | Medium | The current audit reports 47 high, 5 moderate, and 0 critical findings. | `npm audit --omit=dev` still reports 20 high paths, all rooted in `braces@3.0.3` through `micromatch@4.0.8` in React Native/Metro tooling. The advisory affects `braces <=3.0.3` and has no patched version; the maintainer disputes the report. The production-mode app bundle contains no `braces`/`micromatch` strings, so the exposure is in development/build tooling rather than shipped JavaScript. Metro now binds to loopback by default, reducing LAN exposure without changing that dependency finding. The five moderate findings are test-tooling paths rooted in `sprintf-js@1.0.3`, for which the advisory also has no patched version. Do not apply an unofficial override without a reviewed mitigation. See the [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [braces maintainer discussion](https://github.com/micromatch/braces/issues/84), and [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). |
| C4C-07 | Medium | No dedicated production release key is configured. | Gradle release artifact tasks now fail closed without a dedicated keystore; a no-key release dry run was rejected before build tasks and the existing APK hash stayed unchanged. Debug builds still use the development key. No production keystore was created or used. Prior 1.2.0 APKs use the debug certificate, so a future dedicated release key will require a planned install/data transition. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |
## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). The Pad 7
debug UI check and production-mode Android JavaScript bundle are verified from
earlier checkpoints. The current debug APK installed and ran on the Redmi Turbo
4 (ADB model `24129RT7CC`, Android 16). The local demo account completed
sign-in, Profile, sign-out, and re-sign-in with its state preserved. Sessions
and Session Details remained schedule-focused, while the group room retained
its separate 25-minute timer. Profile counted three demo sessions, all now
visible in Sessions; Home warns about two past-due bookings and routes to that
list. This did not exercise a personal account or
production Firebase. The Firebase emulator is not a substitute for deploying
the reviewed rules or two-account testing against the course project. A
nonfatal React Native focus soft exception was logged before the React context
was ready; no app crash or JS error followed.
