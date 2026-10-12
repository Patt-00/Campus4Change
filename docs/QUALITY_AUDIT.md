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
- Shared feeds cap live windows at 20 posts and 20 replies per post; members
  can load older cursor pages on demand. Feed snapshots are kept out of durable
  private account-state records. Paging pauses the current live window until
  the user refreshes to latest, keeping the loaded window bounded.
- Group directory updates now read changed metadata and membership only. Post
  and reply listeners are started only while a member has that group open, and
  listeners are removed when the group closes or the user leaves.
- Firebase signup stages the entered name and Student ID before account
  creation so an early auth-state callback cannot initialize an incomplete
  profile; a regression test covers that event order.
- Firebase signup sends an email verification link. Firestore rules require a
  verified-email claim for shared study-group data while keeping each user's
  private account state owner-only before verification.
- Sign-out distinguishes encrypted local persistence from Firebase sync. It
  keeps the account open if the local save fails, but permits sign-out after a
  successful local save when cloud sync fails and explains how to retry later.
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

## Open issues

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | The Firebase project is configured, but the app's Firestore rules are not deployed. | Project `campus4change` is on Spark, has a registered Web app and Email/Password sign-in, and its Standard Firestore database is in `asia-southeast1`. The app client config is populated. Firestore still has its initial production-mode deny-all rules; review and explicitly authorize deployment before live data tests. |
| C4C-02 | High | No real-project, two-account shared-group workflow has been verified. | The Firebase project and database are ready, but app access remains denied until the checked-in rules are deployed. Emulator rules and email-verification workflow tests pass; deploy the rules, verify two test email addresses, then test create/discover/join/post/reply/leave against the project. |
| C4C-03 | High | The final project acceptance rubric is not present in the visible course outline. | Canvas course 80483 shows Mobile Computing through React Native basics and includes Firebase integration and Firebase Authentication assignments. It lists a final-project prototype and development assignment, but the visible outline does not provide the final feature criteria. Current coverage follows the Figma prototype and implemented Firebase flows; verify against the teacher's final rubric before adding broader requirements such as cross-student bookings, chat, or moderation. |
| C4C-04 | Medium | Tutor listings, bookings, direct messages, and group chat are not shared between students. | Firebase accounts sync this data inside each user's private state; device-only accounts keep it local. Cross-student tutor, booking, and messaging workflows are not implemented. Confirm whether the final rubric requires those workflows before designing their schemas. |
| C4C-05 | Medium | Shared groups have no content reporting or moderation path. | Rules restrict writes to members, validate authorship and text size, and enforce a five-second cooldown. Students still cannot flag or remove abusive content, and there is no instructor moderation workflow. Add one before wider use. |
| C4C-06 | Medium | The current audit reports 47 high, 5 moderate, and 0 critical findings. | `npm audit --omit=dev` still reports 20 high paths, all rooted in `braces@3.0.3` through `micromatch@4.0.8` in React Native/Metro tooling. The advisory affects `braces <=3.0.3` and has no patched version; the maintainer disputes the report. The production-mode app bundle contains no `braces`/`micromatch` strings, so the exposure is in development/build tooling rather than shipped JavaScript. The five moderate findings are test-tooling paths rooted in `sprintf-js@1.0.3`. `npm audit fix --force` proposes a breaking React Native downgrade to 0.72.17; do not apply an unofficial override without a reviewed mitigation. See the [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [maintainer discussion](https://github.com/micromatch/braces/issues/84). |
| C4C-07 | Medium | Release signing is still debug signing. | The current APK can update the existing prototype install, but distribution requires a protected release keystore and signing procedure. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |

## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). The Pad 7
debug UI check and production-mode Android JavaScript bundle are verified. A
Poco X4 GT debug install attempt for the current Firebase configuration was
blocked by `INSTALL_FAILED_USER_RESTRICTED`; device approval is still needed.
The Firebase emulator is not a substitute for deploying the reviewed rules or
two-account testing against the course project.
