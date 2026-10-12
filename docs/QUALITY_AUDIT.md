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
- Shared group membership state now comes from a live collection-group query
  constrained to the current UID instead of a separate point read for each
  group. Rules and emulator tests keep that query private to its owner.
- A repeatable two-group test with one joined membership measured three
  per-group membership reads before the change and none after, including one
  subsequent metadata update; the membership query returned only the one owned
  record and continued to update join state live.
- The group directory loads 20 metadata documents initially and exposes
  cursor-based older pages; Firestore rules reject missing or larger limits.
  Older browsing pauses the live metadata page and offers an explicit refresh,
  while the owner-scoped membership stream stays live.
- The groups screen renders those loaded pages with a virtualized `SectionList`.
  A regression test supplies 80 loaded groups and confirms no more than 10
  group cards are mounted initially.
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
- Added a GitHub Actions workflow for lint, unit tests, Auth/Firestore emulator
  tests, production bundling, the Android debug build, and the release-signing
  guard. The latest [remote run](https://github.com/Patt-00/Campus4Change/actions/runs/38300386092)
  passed on commit `93504c2` without production Firebase credentials.

## Open issues

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | The Firebase project is configured, but the app's Firestore rules are not deployed. | Project `campus4change` is on Spark, has a registered Web app and Email/Password sign-in, and its Standard Firestore database is in `asia-southeast1`. The app client config is populated. Firestore still has its initial production-mode deny-all rules; review and explicitly authorize deployment before live data tests. |
| C4C-02 | High | No real-project, two-account shared-group workflow has been verified. | The Firebase project and database are ready, but app access remains denied until the checked-in rules are deployed. Emulator rules and email-verification workflow tests pass; deploy the rules, verify two test email addresses, then test create/discover/join/post/reply/leave against the project. |
| C4C-03 | High | The final-project acceptance rubric is not present in the current course modules. | Canvas course 80483 currently exposes the prototype assignment and Lab 4.1 frontend milestone: select 3-4 high-fidelity screens (including the splash, audience-specific introduction, and auth screens where applicable), preserve clickable navigation, and build reusable React components; static content is acceptable for that milestone. Lab 5.1 is a separate mobile-responsive React/Firebase Auth exercise covering email/password, Google sign-in, persistent sessions, clear errors, mobile-first layout, Firebase Hosting, and real-phone testing. These assignment-level criteria do not establish the final React Native app rubric. Keep Google sign-in, Hosting, cross-student bookings, chat, and moderation as unconfirmed final-app scope until that rubric is available. |
| C4C-04 | Medium | Tutor listings, bookings, direct messages, and group chat are not shared between students. | Firebase accounts sync this data inside each user's private state; device-only accounts keep it local. Cross-student tutor, booking, and messaging workflows are not implemented. Confirm whether the final rubric requires those workflows before designing their schemas. |
| C4C-05 | Medium | Shared groups have no content reporting or moderation path. | Rules restrict writes to members, validate authorship and text size, and enforce a five-second cooldown. Students still cannot flag or remove abusive content, and there is no instructor moderation workflow. Add one before wider use. |
| C4C-06 | Medium | The current audit reports 47 high, 5 moderate, and 0 critical findings. | `npm audit --omit=dev` still reports 20 high paths, all rooted in `braces@3.0.3` through `micromatch@4.0.8` in React Native/Metro tooling. The advisory affects `braces <=3.0.3` and has no patched version; the maintainer disputes the report. The production-mode app bundle contains no `braces`/`micromatch` strings, so the exposure is in development/build tooling rather than shipped JavaScript. The five moderate findings are test-tooling paths rooted in `sprintf-js@1.0.3`. `npm audit fix --force` proposes a breaking React Native downgrade to 0.72.17; do not apply an unofficial override without a reviewed mitigation. See the [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [maintainer discussion](https://github.com/micromatch/braces/issues/84). |
| C4C-07 | Medium | No dedicated production release key is configured. | Gradle release artifact tasks now fail closed without a dedicated keystore; a no-key release dry run was rejected before build tasks and the existing APK hash stayed unchanged. Debug builds still use the development key. No production keystore was created or used. Prior 1.2.0 APKs use the debug certificate, so a future dedicated release key will require a planned install/data transition. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |
## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). The Pad 7
debug UI check and production-mode Android JavaScript bundle are verified. The
POCO X4 GT is currently visible through paired Wireless debugging, but
Campus4Change is not installed. The latest install attempt was blocked by
`INSTALL_FAILED_USER_RESTRICTED`; device-side install approval is still needed.
The Firebase emulator is not a substitute for deploying the reviewed rules or
two-account testing against the course project.
