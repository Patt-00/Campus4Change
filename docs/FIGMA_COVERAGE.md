# Figma coverage

Reference: [Campus4Change Mobile App Prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2).

The file now lists the 18 mobile screens below and a separate `Campus4Change Components` page for reusable dark-theme controls. The Login and Sign-up frames now show the implemented Google buttons and account guidance, using a reusable token-bound Google button component. The Group Session frame is also built from editable text, vectors, variables, and component instances; its visual composition and the updated Group Details screen were inspected in Figma.

The app follows the dark background, cyan actions, rounded cards, Inter typography, circle avatars, and five-tab layout. Scrolling, device insets, editable data, validation, and local-storage notices adapt the fixed 390-by-844 reference to Android. Exact 1:1 pixel matching has not been verified.

| Figma node | Screen | Local behavior |
| --- | --- | --- |
| 1:2 | Onboarding | Open login. |
| 1:15 | Login | Firebase email/password or Android Google sign-in, local credentials, explicit demo entry, password reset, and biometrics for local accounts. |
| 1:39 | Sign-up | Create an email/password Firebase or device account; Google sign-up uses the Google name/email and adds Student ID privately after sign-in. |
| 1:69 | Home | Search, quick actions, next session, menu, notifications, tabs. |
| 1:133 | Tutor Search | Local/demo search or live Firebase student listings, subject filters, and a real empty state. |
| 1:187 | Tutor Details | Selected tutor profile, public subjects, and request-a-session action. Shared chat remains unavailable. |
| 1:218 | Book Session | Subject/date/time/note selection; Firebase accounts send a pending request. Future and overlap checks apply. |
| 1:251 | Booking Confirmed | Local schedule confirmation or shared request status and link to Requests. |
| 1:263 | Study Groups | Joined/discover views, search, creation, membership. |
| 1:302 | Group Details | Join/leave, actual meetup schedule, posts/replies, local chat, group session entry. |
| 93:2 | Group Session | Meetup topic, status, date/time, location, group notes, and explicit save/share action. |
| 1:324 | Sessions | Upcoming, requests, completed, and cancelled filters with incoming/outgoing request context. |
| 1:361 | Session Details | Accept/decline/cancel shared requests, private notes, local reschedule/rating flows. |
| 1:386 | Messages | Search conversations and open chat. |
| 1:422 | Chat | Save sent messages and reopen them. |
| 1:438 | Notifications | Mark read and open linked session/group. |
| 1:458 | Profile | Current data/counts, edit, preferences, biometric setup, sign-out. |
| 1:495 | Edit Profile | Save name, course, year, school, interests. |

## Supporting flows and adaptations

The app adds supporting forms for group creation, study posts/replies, becoming a tutor, learning preferences, About, and the Create tab. Profile counts use current data rather than the design's fixed numbers.

Version 1.2.0 keeps the visual theme while replacing letter icons with outline icons, increasing text and touch sizes, and allowing custom interests and optional user-entered school details. The dashboard uses saved interests and current tutor counts. Chosen tutor times carry into booking. Group schedules use their optional saved date/time; no schedule is invented for old groups. Sample content belongs to the demo account, with historical personal work preserved.

Group sessions show their meetup topic, scheduled date and time, location, and member count in the same appointment-style layout as booked-session workspaces. Draft notes stay private when returning with Back. The explicit Post Notes to Group action shares notes to a joined group's feed; device-only groups keep their notes local. Group sessions do not include a focus timer or a live call.

## Limits

Demo/device-only data stays in the account's state. With Firebase configured, verified students share the study-group directory, memberships, posts, replies, published tutor profiles, and participant-only session requests. The code now includes a Requests filter and response actions that extend the original prototype flow.

The checked-in Firestore rules and indexes have not been deployed to the project, so real-project sharing is not verified. Direct messages and group chat have no live delivery. Rooms have no live participants, voice, or video. Notifications have no OS push delivery. Firebase password reset is available to configured Firebase accounts; device-only accounts must use their original password.

Firebase Authentication, private account-state sync, and shared study-group data are implemented when configured. This checkout now uses Firebase project `campus4change`; its Email/Password provider and Singapore Firestore database are configured, but the checked-in rules have not been deployed. Firebase verifies ownership of the entered email before allowing shared-group access; no school-domain allowlist or file-upload service is connected, and real two-account workflows remain unverified, so this is not yet a complete online service.
