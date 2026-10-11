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
- Group directory updates now read changed metadata and membership only. Post
  and reply listeners are started only while a member has that group open, and
  listeners are removed when the group closes or the user leaves.
- Firebase signup stages the entered name and Student ID before account
  creation so an early auth-state callback cannot initialize an incomplete
  profile; a regression test covers that event order.
- Device-only groups remain available. Pending shared writes are saved in
  account state and can be retried.
- Firestore emulator tests cover account isolation, group discovery, membership
  counts, owner/member boundaries, and member-only content. Unit tests cover
  state merging, offline replay, and listener behavior.

## Open issues

| ID | Priority | Issue | Evidence and next action |
| --- | --- | --- | --- |
| C4C-01 | High | No real Firebase project is connected. | `firebaseConfig.js` is blank and rules are not deployed. Select the course project, configure its Web app settings, and explicitly authorize deployment before live tests. |
| C4C-02 | High | Updated shared-group screens have not been verified on the Xiaomi Pad 7. | Linux sees the Pad 7 over USB as MTP (`2717:ff40`), but `adb devices -l` is empty. Switch USB to File Transfer and accept the debugging authorization prompt if shown; then test two Firebase accounts through create, discover, join, post, reply, and leave. |
| C4C-03 | High | Teacher-specific requirements are not fully established in this checkout. | The Figma map describes prototype screens, not the teacher's final acceptance rubric. Compare the finished requirements/module list when available. |
| C4C-04 | Medium | Tutor listings, bookings, direct messages, and group chat remain private/local. | Only groups, membership, posts, and replies are shared between Firebase users. Confirm whether cross-user tutor/booking/chat workflows are required before designing those schemas. |
| C4C-05 | Medium | Group content is still unbounded within the active group. | Lazy subscriptions prevent reading every group's content, but a member opening a very large group still loads all posts and replies. Add pagination and moderated/rate-limited writes before wider use. |
| C4C-06 | Medium | The dependency audit reports 21 high findings. | The current graph includes `braces` at an affected version; GitHub's advisory lists no patched release. `npm audit fix --force` proposes a breaking React Native downgrade, so do not apply it without a compatible upstream fix or reviewed exception. See the [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). |
| C4C-07 | Medium | Release signing is still debug signing. | The current APK can update the existing prototype install, but distribution requires a protected release keystore and signing procedure. |
| C4C-08 | Low | The iOS scaffold cannot use the Android storage module. | Current app support is Android-only; do not claim iOS parity until secure storage and biometrics are implemented and verified there. |

## Verification record

Verification is recorded in [VERIFICATION.md](VERIFICATION.md). Source tests,
Firestore emulator rules, an Android release build, and package installation
have been checked separately; installation does not prove visible runtime
behavior. The Firebase emulator is not a substitute for deployment to the
course project or two-account testing against that project.
