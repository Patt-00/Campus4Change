# Figma coverage

Reference: [Campus4Change Mobile App Prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2).

The file contains the original 19 mobile screens, an empty-chat frame, a new Create screen, a past-meetup state, a program-grouped Be a Tutor form, and a separate `Campus4Change Components` page. The Login and Sign-up frames show the implemented Google buttons and account guidance, using a reusable token-bound Google button component. The component page also includes the red inline auth-feedback component used when Google sign-in does not complete and a token-bound cloud-sync pending banner. The Home frame shows its instance at the top when Firebase has not acknowledged the newest local state. The Group Session and Booked Session Workspace frames use editable text, variables, and component instances; pagination and chat-composer updates were visually checked in Figma.

The prototype has 69 navigation action nodes: 42 directional 220 ms ease-out move-ins and 27 tab dissolves. The new Booked Session Workspace flow adds four visible links/buttons: Session Details to the workspace, Back to Session Details, and participant links to Chat. The Back and Open Workspace targets have reactions on both the text and button surface for reliable hit coverage.

The app follows the dark background, cyan actions, rounded cards, Inter typography, circle avatars, and five-tab layout. Scrolling, device insets, editable data, validation, and local-storage notices adapt the fixed 390-by-844 reference to Android. Exact 1:1 pixel matching has not been verified.

The latest visual pass keeps the existing colors and card style while removing secondary copy from Home quick actions, shortening Study Groups rows to one metadata line with a trailing chevron, grouping Profile actions in one divided card, and using a chevron on Session rows. The Login design contains no demo sign-in.

| Figma node | Screen | Local behavior |
| --- | --- | --- |
| 1:2 | Onboarding | Open login. |
| 1:15 | Login | Firebase email/password or Android Google sign-in, existing local credentials, password reset, and biometrics for local accounts. No demo sign-in is included. |
| 1:39 | Sign-up | Create an email/password Firebase or device account; any verified email may use shared features. Google sign-up uses the Google name/email and adds Student ID privately after sign-in. |
| 1:69 | Home | Search, quick actions, next session, menu, notifications, tabs; shows pending cloud sync when device state is waiting for Firebase acknowledgement. |
| 1:133 | Tutor Search | Email-verified Firebase listings, subject/request filters, loaded-page search guidance, and a load-more control. |
| 1:187 | Tutor Details | Selected community tutor profile, public subjects, and request-a-session action. A tutor chat opens from the resulting session request. |
| 1:218 | Book Session | Subject/date/time/note selection; Firebase accounts send a pending request. Future and overlap checks apply. |
| 1:251 | Booking Confirmed | Local schedule confirmation or shared request status and link to Requests; the screen has a clear “Booking confirmed” header. |
| 1:263 | Study Groups | Joined/discover views, search, creation, membership. |
| 1:302 | Group Details | Join/leave, meetup schedule, posts/replies, shared-member group chat, group session entry. Device-only chats remain private. |
| 93:2 | Group Session | Meetup topic, status, date/time, location, group notes, and explicit save/share action. |
| 1:324 | Sessions | Upcoming, requests, completed, and cancelled filters, incoming/outgoing context, load-more history, and latest-refresh state. |
| 1:361 | Session Details | Accept/decline/cancel shared requests, tutor/student participant chat, private notes, and local reschedule/rating flows. |
| 147:35 | Booked Session Workspace | Private agenda and notes, participant chat, and completion only after the scheduled start; Back returns to Session Details. |
| 1:386 | Messages | Search chat names and private notes; open member or tutor-session chats. |
| 1:422 | Chat | Deliver group messages to current members and tutor-session messages to their two participants; the composer uses a SEND action. |
| 1:438 | Notifications | Mark read and open linked session/group. |
| 1:458 | Profile | Current data/counts, edit, preferences, biometric setup, sign-out. |
| 1:495 | Edit Profile | Choose a device-only photo or color avatar, select TIP programs by campus and college, search broad core-subject and specialization suggestion groups, and keep selected interests grouped by course. |
| 160:52 | Empty Chat State | Centered “No messages yet” and first-message guidance outside the inverted message list. |
| 171:40 | Create | Minimal action cards for booking, creating a study group, and becoming a tutor; five-tab navigation remains consistent. |
| 172:41 | Past Meetup state | A dated meetup that has passed is labeled “Past meetup” and explains why it is no longer upcoming. |
| 173:40 | Be a Tutor | Search course-aware core-subject and specialization suggestions; keep selected tutor subjects grouped by program, with an introduction field. |

## Supporting flows and adaptations

The app adds supporting forms for group creation, study posts/replies, learning preferences, About, and other account flows. Profile counts use current data rather than the design's fixed numbers. Five avatar color tokens were added to the existing dark-theme collection for the new presets; the existing cyan and green tokens are reused.

Version 1.2.2 keeps the visual theme while replacing letter icons with outline icons, increasing text and touch sizes, and allowing custom interests and optional user-entered school details. The profile now uses a searchable TIP catalog grouped by campus and college, with topic suggestions grouped by the selected program. A custom photo stays on the device; a selected color avatar can appear in a shared tutor listing. The dashboard uses saved interests and current tutor counts. Chosen tutor times carry into booking. Group schedules show past meetups as past; no schedule is invented for old groups. New accounts contain no seeded content, and device-only users see only their own saved groups and tutor listing. Android uses a branded adaptive launcher icon based on the existing education emblem, with a matching launcher-icon specimen on the Figma Components page; platform launcher art stays outside the mobile-screen prototype frames.

Group sessions show their meetup topic, scheduled date and time, location, and member count in the same appointment-style layout as booked-session workspaces. Draft notes stay private when returning with Back. The explicit Post Notes to Group action shares notes to a joined group's feed; device-only groups keep their notes local. Group sessions do not include a focus timer or a live call.

The Booked Session Workspace is a supporting screen for tutor requests. Session Details opens it; Firebase sessions expose the participant chat there, and the Message tutor link opens the existing Chat frame. The mark-complete action is shown only after the booked start time.

## Limits

Device-only data stays in the account's state. With Firebase configured, accounts with verified email addresses share the study-group directory, memberships, posts, replies, published tutor profiles, and participant-only session requests. Email verification confirms control of an address; the app does not verify school affiliation. Custom profile-photo files remain on the originating device, while only the selected built-in avatar preset is included in a public tutor profile. The code now includes a Requests filter and response actions that extend the original flow.

Firestore rules are deployed with six ready composite indexes, and two-account tutor-session and study-group flows were exercised on the POCO X4 GT. Rooms have no live participants, voice, or video. Notifications have no OS push delivery. Firebase password reset is available to configured Firebase accounts; device-only accounts must use their original password.

Firebase Authentication, private account-state sync, and shared study-group data are configured for Firebase project `campus4change` with Firestore in Singapore. Firebase verifies email control before allowing shared-group access; there is no school-domain allowlist or file-upload service. Release Play Integrity metrics/enforcement, OS push delivery, and live calls remain outside the verified prototype flow.
