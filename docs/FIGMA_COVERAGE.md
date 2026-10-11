# Figma coverage

Reference: [Campus4Change Mobile App Prototype](https://www.figma.com/proto/i23zbYooPqV1EkTLXfnxMo/Campus4Change-Mobile-App-Prototype?node-id=1-2&starting-point-node-id=1%3A2).

The file was inspected again for 1.1.0. Page metadata lists the 17 screens below. Detailed design context was retrieved for onboarding, sign-up, home, and tutor search. The connector's usage limit blocked further detailed requests. Public prototype screens and complete page metadata were used for the remaining views.

The app follows the dark background, cyan actions, rounded cards, Inter typography, circle avatars, and five-tab layout. Scrolling, device insets, editable data, validation, and local-storage notices adapt the fixed 390-by-844 reference to Android. Exact 1:1 pixel matching has not been verified.

| Figma node | Screen | Local behavior |
| --- | --- | --- |
| 1:2 | Onboarding | Open login. |
| 1:15 | Login | Firebase email/password or local credentials, explicit demo entry, password reset, Android biometrics for local accounts. |
| 1:39 | Sign-up | Validate fields and create a Firebase or device account, depending on configuration. |
| 1:69 | Home | Search, quick actions, next session, menu, notifications, tabs. |
| 1:133 | Tutor Search | Text search, subjects from actual listings, request/rating filters, clear filters. |
| 1:187 | Tutor Details | Selected tutor, subjects, booking, conversation. |
| 1:218 | Book Session | Subject/date/time/note selection; future and overlap checks. |
| 1:251 | Booking Confirmed | Saved booking summary, home, session details. |
| 1:263 | Study Groups | Joined/discover views, search, creation, membership. |
| 1:302 | Group Details | Join/leave, actual meetup schedule, posts/replies, local chat, study room. |
| 1:324 | Sessions | Upcoming/completed/cancelled filters, selected details. |
| 1:361 | Session Details | Reschedule, cancel, message, room, completion, rating. |
| 1:386 | Messages | Search conversations and open chat. |
| 1:422 | Chat | Save sent messages and reopen them. |
| 1:438 | Notifications | Mark read and open linked session/group. |
| 1:458 | Profile | Current data/counts, edit, preferences, biometric setup, sign-out. |
| 1:495 | Edit Profile | Save name, course, year, school, interests. |

## Supporting flows and adaptations

The app adds supporting forms for group creation, study posts/replies, becoming a tutor, learning preferences, About, and the Create tab. Profile counts use current data rather than the design's fixed numbers.

Version 1.2.0 keeps the visual theme while replacing letter icons with outline icons, increasing text and touch sizes, and allowing custom interests and optional user-entered school details. The dashboard uses saved interests and current tutor counts. Chosen tutor times carry into booking. Group schedules use their optional saved date/time; no schedule is invented for old groups. Sample content belongs to the demo account, with historical personal work preserved.

The local study room has a 25-minute focus timer and saved notes. Session rooms can mark a session completed. Group room notes are published to the joined group's feed; Firebase groups share those notes with their members. Back navigation preserves drafts.

## Limits

Most prototype data stays in this account's state. With Firebase configured, signed-in students share the study-group directory, memberships, posts, and replies; demo/device-only groups remain local. Tutor listings and bookings are not published to other users.

Bookings have no remote approval or payment. Direct messages and group chat have no live delivery. Rooms have no live participants, voice, or video. Notifications have no OS push delivery. Firebase password reset is available to configured Firebase accounts; device-only accounts must use their original password.

Firebase Authentication, private account-state sync, and shared study-group data are implemented when configured. The current checkout has blank Firebase client settings and has not deployed its Firestore rules to a real project. No school email verification or file-upload service is connected, so this is not yet a complete online service.
