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
}) {
  return (
    <Screen title="About Campus4Change" back={back}>
      <IconBadge name="graduation" />
      <Text style={s.section}>Campus4Change {version}</Text>
      <Text style={s.text}>
        Plan your learning, keep study notes, and manage your sessions.
      </Text>
      <Text style={s.section}>Your data</Text>
      <View style={s.card}>
        <Text style={s.text}>
          {firebaseConfigured && cloudSession
            ? 'Firebase Authentication manages your account. Private app data is encrypted on this Android device and synced to your Firestore record. A tutor profile you publish and session requests you participate in are shared with verified students.'
            : firebaseConfigured
              ? 'This account is saved only on this Android device. Use Firebase sign-in for encrypted cloud sync across your devices.'
              : 'Accounts, interests, groups, messages, and bookings are saved on this Android device. Accounts have separate data. Sign in again when you reopen the app.'}
        </Text>
        <Text style={s.muted}>
          {firebaseConfigured && cloudSession
            ? 'Firebase sign-in is restored when you reopen the app. A local encrypted copy supports recovery when sync fails. Uninstalling removes that local copy; cloud data remains in Firebase.'
            : 'Uninstalling the app or clearing its data removes your accounts and saved work.'}
        </Text>
      </View>
      <Text style={s.section}>Connecting with other students</Text>
      <Text style={s.text}>
        {firebaseConfigured && cloudSession
          ? 'Verified Firebase accounts can share study-group details, membership, posts, replies, and tutor listings. A session request is visible to the student and tutor and stays pending until the tutor responds. Notes in booked sessions stay private. Direct messages and group chat are private notes and are not delivered to other students. Group-session notes are shared only when posted. Live calls are not available.'
          : firebaseConfigured
            ? 'This device-only account stays private. Verified Firebase accounts can share study-group details, membership, posts, replies, tutor listings, and session requests. Direct messages and group chat are not delivered to other students. Group sessions show meetup details and save notes on this device; live calls are not available.'
            : 'This version has no campus server or sharing between devices. Bookings, messages, and group posts stay on this device. Group sessions show meetup details and save notes on this device. Live calls are not available.'}
      </Text>
      <Text style={s.section}>Demo account</Text>
      <Text style={s.text}>
        The demo account includes sample tutors, groups, bookings, and
        conversations. New accounts start with an empty directory and your own
        data. A Firebase account can publish a tutor profile to verified
        students; device-only accounts keep that listing on this device.
      </Text>
      <Text style={s.section}>Sign-in</Text>
      <Text style={s.text}>
        {firebaseConfigured
          ? 'Firebase handles email/password and Google sign-in on Android, password reset, and verification emails. Google provides your name and email; add your Student ID privately in Edit Profile. Verified email is required for shared study groups, tutor listings, and session requests, but the app does not check a school-domain allowlist. Your Firebase refresh token is encrypted by Android Keystore.'
          : 'Passwords protect local accounts. Android biometrics can be enabled after signing in. School identity checks, email verification, and password recovery require an online service and are not available here.'}
      </Text>
    </Screen>
  );
}
