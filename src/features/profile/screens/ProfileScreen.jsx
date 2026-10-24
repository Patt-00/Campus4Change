import React from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar } from '../../../shared/components/UI';
import { s } from '../../../shared/theme/styles';
import { C } from '../../../shared/theme/colors';

import { Icon } from '../../../shared/components/Icon';

export function ProfileScreen({
  go,
  state,
  signOut,
  sessionType,
  firebaseConfigured,
}) {
  const p = state.profile;
  const rated = state.sessions.filter(x => x.rating);
  const rating = rated.length
    ? (rated.reduce((sum, x) => sum + x.rating, 0) / rated.length).toFixed(1)
    : '—';
  const stats = [
    {
      label: 'Sessions',
      value: state.sessions.length,
      color: C.cyan,
    },
    {
      label: 'Groups',
      value: state.groups.filter(g => g.joined).length,
      color: C.green,
    },
    {
      label: 'Rating given',
      value: rating,
      color: C.yellow,
    },
  ];
  const accountActions = [
    { label: 'Edit profile', page: 'Edit Profile' },
    { label: 'Tutor profile', page: 'Be a Tutor' },
  ];

  return (
    <Screen title="Profile" go={go} tab="Profile">
      <View style={styles.alignItemscenterpaddingTop8}>
        <Avatar
          name={p.name}
          variant="tutor"
          size={64}
          avatarId={p.avatarId}
          photoUri={p.profilePhotoUri}
        />
        <Text style={[s.heading, styles.marginTop12]}>{p.name}</Text>
        <Text style={s.muted}>
          {[p.course, p.year].filter(Boolean).join(' • ') ||
            'Add your course and year level'}
        </Text>
        {!!p.campus && <Text style={[s.muted, s.center]}>{p.campus}</Text>}
      </View>
      <View style={[s.card, s.row, styles.statsCard]}>
        {stats.map(x => (
          <View key={x.label} style={[s.grow, styles.alignItemscenter]}>
            <Text style={[s.heading, { color: x.color }]}>{x.value}</Text>
            <Text style={s.muted}>{x.label}</Text>
          </View>
        ))}
      </View>
      <Text style={[s.section, styles.accountHeading]}>Account</Text>
      {!!p.accountUuid && (
        <View style={[s.card, styles.accountIdCard]}>
          <Text style={s.label}>Campus4Change ID</Text>
          <Text selectable style={styles.accountIdValue}>
            {p.accountUuid}
          </Text>
          <Text style={[s.muted, styles.accountIdHint]}>
            Long press to copy. This ID does not verify TIP enrollment.
          </Text>
        </View>
      )}
      <View style={[s.card, styles.accountCard]}>
        {accountActions.map((action, index) => (
          <View key={action.label}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={[s.row, styles.accountRow]}
              onPress={() => go(action.page)}
            >
              <Text style={[s.text, s.grow]}>{action.label}</Text>
              <Icon name="right" size={18} color={C.muted} />
            </TouchableOpacity>
            {index < accountActions.length - 1 && (
              <View style={styles.accountDivider} />
            )}
          </View>
        ))}
      </View>
      {firebaseConfigured && sessionType === 'local' && (
        <Text style={[s.muted, s.center]}>
          This existing device account does not sync to Firebase.
        </Text>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={styles.signOutButton}
        onPress={() =>
          Alert.alert(
            'Sign out?',
            sessionType === 'firebase'
              ? 'Your encrypted local copy will stay on this device. If Firebase is unavailable, unsynced changes can be retried the next time you sign in.'
              : 'Your local data will stay saved on this device.',
            [
              {
                text: 'Stay signed in',
                style: 'cancel',
              },
              {
                text: 'Sign out',
                onPress: async () => {
                  const result = await signOut();
                  if (result?.signedOut && result.cloudSaved === false) {
                    Alert.alert(
                      'Signed out',
                      'Your latest changes are saved on this device but could not sync to Firebase. Sign in again when Firebase is available to retry the sync.',
                    );
                  }
                },
              },
            ],
          )
        }
      >
        <Text style={[s.text, s.danger]}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  );
}
const styles = StyleSheet.create({
  alignItemscenterpaddingTop8: {
    alignItems: 'center',
    paddingTop: 8,
  },
  marginTop12: {
    marginTop: 12,
  },
  statsCard: {
    marginTop: 20,
    paddingVertical: 14,
  },
  alignItemscenter: {
    alignItems: 'center',
  },
  accountHeading: { marginTop: 20, marginBottom: 8 },
  accountIdCard: { marginBottom: 10, padding: 14 },
  accountIdValue: {
    color: C.text,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
    marginTop: 5,
  },
  accountIdHint: { marginTop: 6 },
  accountCard: { paddingVertical: 4, paddingHorizontal: 12 },
  accountRow: { minHeight: 48, paddingVertical: 4 },
  accountDivider: { height: 1, backgroundColor: C.border },
  signOutButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
