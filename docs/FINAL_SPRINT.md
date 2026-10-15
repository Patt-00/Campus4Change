# Final sprint acceptance record

This record tracks the final-sprint request: finish Campus4Change, verify the
application on the POCO X4 GT, then push the verified result to `main`. A passing
source test alone does not establish a working live service or device workflow.

## Completion gates

| Required behavior | Evidence required before completion | Current state |
| --- | --- | --- |
| React Native CLI Android app in JavaScript/JSX | Source inventory, Android build, installed app | Implemented; final artifact verification pending |
| Existing logo, splash, introduction, minimalist design, and navigation animations | POCO cold launch and screen walkthrough | Previous device evidence; repeat on final artifact |
| Real email/password and Google sign-in/signup; no bundled demo account | Live Firebase Auth, account restoration and sign-out on POCO, signup/reset/verification checks | Google debug login verified; final configuration checks pending |
| Shared features available to any email-verified account | Rules tests plus live verified/unverified access checks | Emulator tests pass; live rules deployment pending |
| Private profile, interests, notes, encrypted persistence, account isolation | Two-account writes/read denial, restart and sync checks | Automated coverage; live and final-device checks pending |
| Tutor discovery, filtering, profile publishing/removal | Two-account live directory and device search | Implemented first page; additional-page controls need review |
| Session request, accept/decline, cancellation, completion and conflict rejection | Two-account live lifecycle, concurrent overlap checks, session screens on POCO | Both-participant cross-tutor/role conflicts and atomic release verified in emulator; live verification pending |
| Study-group create/discover/join/leave, posts/replies and owner moderation | Live two-account workflow and unauthorized-access rejection | Implemented; deployment and live verification pending |
| Scheduled group and booked-session workspaces with private drafts and explicit sharing | POCO walkthrough; no focus timer | Implemented; final walkthrough pending |
| Current-member group chat, participant-only session chat, and private notes | Two-account message delivery, access denial, pagination and persistence | Automated coverage; live verification pending |
| Useful in-app notifications, read state and linked destinations | Real booking/group events, duplicate/read-state tests, POCO check | Booking and joined-group activity notices added in this sprint; live check pending |
| Standalone release artifact and Google authentication for its signer | Dedicated signing setup, bundled JS, signature verification, POCO install/cold launch without Metro | Release key and signer registration pending |
| Firebase deployment and protection | Deployed reviewed rules/indexes, live isolation checks, App Check setup/metrics review | CLI authenticated; deployment and live checks pending |
| Final regression checks | Lint, unit tests, Android tests/build, Firebase emulators, CI on final source | Prior head CI passes; repeat after sprint changes |
| Publish completed source to `main` | Exact local/remote commit identity and successful main CI | Pending all gates above |

The available teacher materials establish mobile-app, Firebase Authentication,
owner-scoped data and clean-UI requirements. No further final teacher checklist
has been supplied. The existing audit also tracks platform/distribution limits
and dependency findings; those must be assessed explicitly rather than hidden
by a percentage. See [QUALITY_AUDIT.md](QUALITY_AUDIT.md) and
[VERIFICATION.md](VERIFICATION.md).

## Current sprint evidence

- Starting commit: `94a24e7`; GitHub Actions run `38714166454` passed all checks.
- The authorized physical test device is the POCO X4 GT. Redmi Turbo 4 is
  excluded.
- The POCO opened the current Home screen with the revised read-permission
  message. Its signed-in account still encounters live Firestore denial.
- Browser control recovered on 2026-10-16. The owner approved the official
  Firebase CLI grant, login completed, and `projects:list` confirms access to
  `campus4change`. The live composite-index manifest is still empty.
- In-app notices now derive from real participant booking statuses and joined
  shared-group activity. They preserve read state on repeated snapshots, reject
  old status callbacks, keep one current notice per item, and retain the most
  recent 200 notices.
