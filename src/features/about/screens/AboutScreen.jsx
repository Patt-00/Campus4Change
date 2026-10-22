import React from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { IconBadge } from '../../../shared/components/Icon';
import { s } from '../../../shared/theme/styles';
import { version } from '../../../../package.json';

export function AboutScreen({
  back,
  firebaseConfigured = false,
  cloudSession = false,
  signedIn = false,
}) {
  const deviceOnlyAccount = signedIn && !cloudSession;
  const signedOutFirebase = firebaseConfigured && !signedIn && !cloudSession;
  return (
    <Screen title="About Campus4Change" back={back}>
      <IconBadge name="graduation" />
      <Text style={s.section}>Campus4Change {version}</Text>
      <Text style={s.text}>
        Campus4Change connects students who need help with peers who can teach.
        Find a human tutor to explain a subject or clarify a concept, or publish
        your tutoring skills so learners can find you. Students can also form
        study groups and learn together.
      </Text>
      <Text style={[s.muted, styles.message]}>
        The project starts with the TIP campuses in Quezon City and Manila. Its
        long-term goal is to connect students across the Philippines and around
        the world. Tutors and students may arrange fees directly; this app does
        not process payments.
      </Text>
      <Text style={s.section}>Your data</Text>
      <View style={s.card}>
        <Text style={s.text}>
          {firebaseConfigured && cloudSession
            ? 'Firebase Authentication manages your account. Private app data is encrypted on this Android device and synced to your Firestore record. A tutor profile you publish and session requests you participate in are shared with other Firebase users whose email addresses are verified.'
            : deviceOnlyAccount && firebaseConfigured
              ? 'This account is saved only on this Android device. Use Firebase sign-in for encrypted cloud sync across your devices.'
              : signedOutFirebase
                ? 'No account is currently signed in. Sign up or sign in with Firebase to save private data and use shared features.'
                : signedIn
                  ? 'Accounts, interests, groups, messages, and bookings are saved on this Android device. Accounts have separate data. Sign in again when you reopen the app.'
                  : 'No account is currently signed in. Create a local account to save your work on this device.'}
        </Text>
        <Text style={s.muted}>
          {firebaseConfigured && cloudSession
            ? 'Firebase sign-in is restored when you reopen the app. A local encrypted copy supports recovery when sync fails. Uninstalling removes that local copy; cloud data remains in Firebase.'
            : signedOutFirebase
              ? 'After sign-in, an encrypted local copy supports recovery when sync fails. Uninstalling removes the local copy and profile photos; Firebase data stays in the cloud.'
              : 'Uninstalling the app or clearing its data removes your accounts and saved work.'}
        </Text>
        <Text style={s.muted}>
          Profile photos are stored in app-private storage on this device. The avatar preset you select can appear on a published tutor listing.
        </Text>
      </View>
      <Text style={s.section}>Connecting with the community</Text>
      <Text style={s.text}>
        {firebaseConfigured && cloudSession
          ? 'Firebase users with verified email addresses can share study-group details, membership, posts, replies, group chats, tutor listings, and session requests. Chat messages are delivered only to current group members or the participants in a tutor request. A request stays pending until the tutor responds. Notes in booked sessions stay private, and group-session notes are shared only when posted. Push notifications and live calls are not available.'
          : deviceOnlyAccount && firebaseConfigured
            ? 'This device-only account stays private. Firebase users with verified email addresses can share study-group details, membership, posts, replies, group chats, tutor listings, and session requests. Chat messages are delivered only to current group members or tutor-request participants. Group-session notes from this device-only account stay on this device; push notifications and live calls are not available.'
            : firebaseConfigured
              ? 'Firebase users with verified email addresses can share study-group details, membership, posts, replies, group chats, tutor listings, and session requests. Chat messages are delivered only to current group members or tutor-request participants. Sign in with a verified email to use shared features. Push notifications and live calls are not available.'
              : 'This version has no campus server or sharing between devices. Bookings, messages, and group posts stay on this device. Group sessions show meetup details and save notes on this device. Live calls are not available.'}
      </Text>
      <Text style={s.section}>Sign-in</Text>
      <Text style={s.text}>
        {firebaseConfigured
          ? 'Firebase handles email/password and Google sign-in on Android, password reset, and verification emails. After signup, complete the required TIP account setup with your course, year level, campus, and Student ID. Student IDs stay private. A verified email is required for shared study groups, tutor listings, and session requests. Email verification confirms control of an address, not school affiliation; the app does not check a school-domain allowlist. Your Firebase refresh token is encrypted by Android Keystore.'
          : 'Passwords protect local accounts. School identity checks, email verification, and password recovery require an online service and are not available here.'}
      </Text>
    </Screen>
  );
}

const styles = {
  message: { marginTop: 12 },
};
