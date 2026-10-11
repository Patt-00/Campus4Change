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
            ? 'Firebase Authentication manages your account. Private app data is encrypted on this Android device and synced to your own Firestore record.'
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
          ? 'Signed-in Firebase accounts share study-group details, membership, posts, and replies. Tutor listings, bookings, direct messages, and group chat remain private to each account. Group study rooms have a focus timer; booked-session workspaces organize session details and notes. Live calls are not available.'
          : firebaseConfigured
            ? 'This device-only account stays private. Signed-in Firebase accounts can share study-group details, membership, posts, and replies. Bookings, direct messages, and group chat remain private. Group rooms have a focus timer; booked sessions use a notes workspace without live calls.'
            : 'This version has no campus server or sharing between devices. Bookings, messages, and group posts stay on this device. Group study rooms have a focus timer; booked sessions use a notes workspace. Live calls are not available.'}
      </Text>
      <Text style={s.section}>Demo account</Text>
      <Text style={s.text}>
        The demo account includes sample tutors, groups, bookings, and
        conversations. New accounts start with an empty directory and your own
        data. Creating a tutor profile adds your listing to this device.
      </Text>
      <Text style={s.section}>Sign-in</Text>
      <Text style={s.text}>
        {firebaseConfigured
          ? 'Firebase handles email/password sign-in and password reset. Your Firebase refresh token is encrypted by Android Keystore. School identity checks and email verification are not configured.'
          : 'Passwords protect local accounts. Android biometrics can be enabled after signing in. School identity checks, email verification, and password recovery require an online service and are not available here.'}
      </Text>
    </Screen>
  );
}
