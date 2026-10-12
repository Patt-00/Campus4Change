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

## Open issues

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | No real Firebase project is connected. | `firebaseConfig.js` is blank and rules are not deployed. Select the course project, configure its Web app settings, and explicitly authorize deployment before live tests. |
| C4C-02 | High | No real-project, two-account shared-group workflow has been verified. | The Xiaomi Pad 7 is available over USB ADB and the booked-session/group-room UI was checked there. Emulator rules and app unit tests pass, but `firebaseConfig.js` is blank, so create/discover/join/post/reply/leave still needs a configured course project and two accounts. |
| C4C-03 | High | Teacher-specific requirements are not fully established in this checkout. | The Figma map describes prototype screens, not the teacher's final acceptance rubric. Compare the finished requirements/module list when available. |
| C4C-04 | Medium | Tutor listings, bookings, direct messages, and group chat are not shared between students. | Firebase accounts sync this data inside each user's private state; device-only accounts keep it local. Cross-student tutor, booking, and messaging workflows are not implemented. Confirm whether the final rubric requires those workflows before designing their schemas. |
| C4C-05 | Medium | Shared groups have no content reporting or moderation path. | Rules restrict writes to members, validate authorship and text size, and enforce a five-second cooldown. Students still cannot flag or remove abusive content, and there is no instructor moderation workflow. Add one before wider use. |
| C4C-06 | Medium | The dependency audit reports 21 high paths to one `braces` advisory. | The tree resolves `braces@3.0.3` through `micromatch@4.0.8` in Metro/React Native CLI and Jest tooling. GitHub lists `<=3.0.3` as affected with no patched version; the package maintainer publicly disputes that a fix is needed. The production-mode app bundle contains no `braces`/`micromatch` strings, so the current exposure is in the build/test toolchain. `npm audit fix --force` proposes a breaking React Native downgrade; do not use an unofficial override without a reviewed mitigation. See the [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [maintainer discussion](https://github.com/micromatch/braces/issues/84). |
| C4C-07 | Medium | Release signing is still debug signing. | The current APK can update the existing prototype install, but distribution requires a protected release keystore and signing procedure. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |

## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). The Pad 7
debug UI check and production-mode Android JavaScript bundle are verified; no
new native APK was built or installed for the latest JavaScript changes. The
Firebase emulator is not a substitute for deployment to the course project or
two-account testing against that project.
