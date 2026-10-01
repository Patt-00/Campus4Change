import React from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { IconBadge } from '../../../shared/components/Icon';
import { s } from '../../../shared/theme/styles';
import { version } from '../../../../package.json';

export function AboutScreen({ back }: { back: () => void }) {
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
          Accounts, interests, groups, messages, and bookings are saved on this
          Android device. Accounts have separate data. Sign in again when you
          reopen the app.
        </Text>
        <Text style={s.muted}>
          Uninstalling the app or clearing its data removes your accounts and
          saved work.
        </Text>
      </View>
      <Text style={s.section}>Connecting with other students</Text>
      <Text style={s.text}>
        This version has no campus server or sharing between devices. Bookings
        are entries in your own schedule. Messages and group posts are saved
        here and are not delivered to other people. Study rooms provide a focus
        timer and notes, without calls.
      </Text>
      <Text style={s.section}>Demo account</Text>
      <Text style={s.text}>
        The demo account includes sample tutors, groups, bookings, and
        conversations. New accounts start with an empty directory and your own
        data. Creating a tutor profile adds your listing to this device.
      </Text>
      <Text style={s.section}>Sign-in</Text>
      <Text style={s.text}>
        Passwords protect local accounts. Android biometrics can be enabled
        after signing in. School identity checks, email verification, and
        password recovery require an online service and are not available here.
      </Text>
    </Screen>
  );
}
