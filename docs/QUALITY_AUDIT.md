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
- Android Google sign-in/sign-up uses Credential Manager and Firebase token
  exchange. The Firebase provider and debug certificate are configured; the
  POCO X4 GT showed both auth screens and opened the approved account chooser.
  Google requested a fresh account verification before the Firebase exchange,
  so that end-to-end step remains open.
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
  profiles publish to the verified-student directory without exposing email or
  Student ID; device-only listings remain local.
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
| C4C-01 | High | The checked-in Firestore rules and indexes have not been deployed. | The last live Console check found project `campus4change` on Spark, its Standard database in `asia-southeast1`, and initial production-mode deny-all rules. The global `firebase` and `gcloud` commands are absent; `npx firebase-tools projects:list` is available but failed because this CLI has no authenticated session. Before deployment, inspect for manually seeded legacy group-member documents and migrate any that exist to `users/{uid}/studyGroupMemberships/{groupId}`; add `moderationStatus: "visible"` to any legacy shared posts/replies; then deploy the reviewed rules and indexes with authorization and run live data tests. |
| C4C-02 | High | No real-project, two-account shared-group workflow has been verified. | The current Firebase CLI has no authenticated session, so the last production deny-all state cannot be rechecked. After signing in, deploy the reviewed rules with authorization, verify two test email addresses, and test create/discover/join/post/reply/leave against the project. |
| C4C-03 | High | The final-project acceptance rubric is not present in the accessible course artifacts. | The local Canvas catalog lists the course orientation, numbered Modules 1-5, and two exam modules. The Drive assignment copies found for [Lab 4.1](https://docs.google.com/document/d/1j7UMiR8iUAi6lgwWccmj6C7s4e9RgDkbQaZ2b8mtbgE/edit) and [Seatwork 5.1](https://docs.google.com/document/d/1aaSgtjd0N9-74dTnR6e4ZFcs-bZTIpIuHv9HR7NmLEc/edit) document prototype translation plus Firebase Authentication, auth-driven screen state, owner-scoped Firestore CRUD/rules, and clean UI learning outcomes. They are assignment-specific, not a final Campus4Change acceptance checklist. At the last browser check, the course Assignments page was disabled and a module link returned Access Denied. Keep unrequested Hosting and instructor-wide moderation out until the final rubric confirms them. |
| C4C-04 | Medium | Live chat lacks real-project two-account and push-notification verification. | Emulator rules now allow current shared-group members to exchange live chat messages and limit tutor-session chat to its two booking participants. Test coverage includes participant checks, message limits, cooldowns, cancellation state, group membership, and owner hide/restore. Production rules and indexes remain undeployed, so no real two-account flow is verified; OS push notifications are not implemented. |
| C4C-05 | Medium | Shared groups have no instructor-wide moderation path. | Group members can report another member's post, reply, or chat message without storing reporter UID. The group owner can dismiss a report or reversibly hide and restore the target; chat-message moderation is included in emulator tests. The course has not established an instructor role or broader moderation requirements; confirm that scope from the acceptance rubric. |
| C4C-06 | Medium | The current audit reports 47 high, 5 moderate, and 0 critical findings. | On 2026-10-14, `npm audit --omit=dev` still reported 20 high paths; the affected packages are React Native/Metro build tooling rooted in `braces@3.0.3` through `micromatch@4.0.8`. The advisory affects `braces <=3.0.3` and has no patched release; the maintainer disputes the report. The production bundle has no `braces`/`micromatch` strings, so this is build-tooling exposure rather than shipped JavaScript. `npm audit fix --dry-run` made no changes and offered only major toolchain changes; no compatible fix is available for the direct `braces` or `sprintf-js` advisories. The upstream depth-guard patch is closed without merging and changes existing `stringify` output, so a local override is not a verified compatible fix. Metro binds to loopback by default, reducing LAN exposure without changing the finding. The five moderate findings are test-tooling paths rooted in `sprintf-js@1.0.3`, also with no patched version. Do not apply an unofficial override without a reviewed mitigation. See the [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [braces maintainer discussion](https://github.com/micromatch/braces/issues/84), [closed depth-guard PR](https://github.com/micromatch/braces/pull/72), and [sprintf-js advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). |
| C4C-07 | Medium | No dedicated production release key is configured. | Gradle release artifact tasks now fail closed without a dedicated keystore; a no-key release dry run was rejected before build tasks and the existing APK hash stayed unchanged. Debug builds still use the development key. No production keystore was created or used. Prior 1.2.0 APKs use the debug certificate, so a future dedicated release key will require a planned install/data transition. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |
| C4C-09 | Medium | Google-to-Firebase account exchange is not yet verified. | The Firebase Google provider and debug signing fingerprint are configured, and the native Credential Manager integration builds. The latest single retry on the POCO X4 GT returned `GetCredentialCancellationException` immediately after selecting the previously approved test account, before an ID token reached Firebase. No password, verification code, or biometric was entered. The code now logs only this exception class and safely returns to the auth screen; a user-assisted successful retry is still needed. A release certificate also needs its own fingerprint. |
| C4C-10 | Medium | Campus eligibility is based on verified email ownership, not verified student affiliation. | The client and Firestore rules require a verified email but accept any domain, and Google sign-in can use any Google account. The setup guide records that there is no domain allowlist. Decide whether Campus4Change is TIP-only (`@tip.edu.ph`) or open to any verified email before changing client and server policy; the domain choice has been requested and remains unresolved. |
## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). On commit
`c6fe73d`, 192 Jest tests, lint, Auth/Firestore emulator tests, production
bundling, Android unit tests, and the debug build passed locally. GitHub Actions
run
[38478344342](https://github.com/Patt-00/Campus4Change/actions/runs/38478344342)
passed all configured checks. Commit `94889c0` narrows legacy-state cleanup and
run
[38479904396](https://github.com/Patt-00/Campus4Change/actions/runs/38479904396)
passed all configured checks. The follow-up local migration change also clears
an orphaned legacy biometric pointer; seven native cleanup-plan tests and the
Android debug build pass, and the APK was installed and cold-launched on the
POCO X4 GT. Login showed no demo account or prefilled credentials, and empty
signup validation behaved as expected. The cache-collision case was not seeded
on device. The follow-up migration extension still needs its GitHub Actions
result. The approved test-account retry ended in Credential Manager cancellation
before Firebase received a token, so Google account creation and the production
Firebase project or real two-account chat remain unverified. Emulator success
does not substitute for deploying rules and indexes to Firebase.

Earlier Redmi Turbo 4 checks exercised the then-present seeded account,
schedule-focused Sessions/Session Details, and the separate 25-minute group
room timer. Those are historical UI checks, not current-runtime evidence for a
personal account. A nonfatal focus soft exception was logged before the React
context was ready; no app crash or JavaScript error followed.
