import React from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Link } from '../../../shared/components/UI';
import { s } from '../../../shared/theme/styles';
import { C } from '../../../shared/theme/colors';

import { Icon } from '../../../shared/components/Icon';
import { version } from '../../../../package.json';

export function ProfileScreen({
  go,
  state,
  signOut,
  sessionType,
  firebaseConfigured,
  enableBiometrics,
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

  return (
    <Screen title="Profile" go={go} tab="Profile">
      <View style={styles.alignItemscenterpaddingTop8}>
        <Avatar name={p.name} variant="tutor" size={72} />
        <Text style={[s.heading, styles.marginTop16]}>{p.name}</Text>
        <Text style={s.muted}>
          {[p.course, p.year].filter(Boolean).join(' • ') ||
            'Add your course and year level'}
        </Text>
        {!!p.school && <Text style={[s.muted, s.center]}>{p.school}</Text>}
      </View>
      <View style={[s.card, s.row, styles.marginTop28paddingVertical20]}>
        {stats.map(x => (
          <View key={x.label} style={[s.grow, styles.alignItemscenter]}>
            <Text style={[s.heading, { color: x.color }]}>{x.value}</Text>
            <Text style={s.muted}>{x.label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.section}>Account</Text>
      {[
        {
          label: 'Edit profile',
          page: 'Edit Profile',
        },
        {
          label: 'Learning preferences',
          page: 'Preferences',
        },
        {
          label: 'Tutor profile',
          page: 'Be a Tutor',
        },
        { label: 'About Campus4Change', page: 'About' },
      ].map(x => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={x.label}
          key={x.label}
          style={[s.card, s.row, styles.minHeight54]}
          onPress={() => go(x.page)}
        >
          <Text style={[s.text, s.grow]}>{x.label}</Text>
          <Icon name="right" size={20} color={C.muted} />
        </TouchableOpacity>
      ))}
      {sessionType === 'local' && state.profile.id !== 'demo' && (
        <Link
          label="Enable biometric sign-in"
          onPress={async () => {
            try {
              await enableBiometrics();
              Alert.alert(
                'Biometrics enabled',
                'Sign in with the biometrics enrolled on this device next time.',
              );
            } catch (e) {
              Alert.alert(
                'Biometrics',
                e instanceof Error ? e.message : String(e),
              );
            }
          }}
        />
      )}

      {firebaseConfigured && sessionType === 'local' && state.profile.id !== 'demo' && (
        <Text style={[s.muted, s.center]}>
          This existing device account does not sync to Firebase.
        </Text>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={[s.card, styles.minHeight54justifyContentcenter]}
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
      <Text style={[s.muted, s.center]}>
        Campus4Change {version}
        {p.id === 'demo' ? ' • Demo account' : ''}
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  alignItemscenterpaddingTop8: {
    alignItems: 'center',
    paddingTop: 8,
  },
  marginTop16: {
    marginTop: 16,
  },
  marginTop28paddingVertical20: {
    marginTop: 28,
    paddingVertical: 20,
  },
  alignItemscenter: {
    alignItems: 'center',
  },
  minHeight54: {
    minHeight: 54,
  },
  minHeight54justifyContentcenter: {
    minHeight: 54,
    justifyContent: 'center',
  },
});
