import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import {
  Avatar,
  Chip,
  ErrorText,
  Field,
  Link,
} from '../../../shared/components/UI';
import { deviceStore } from '../../../shared/state/storage';
import type { CampusState, Profile } from '../../../shared/data/types';
import { s } from '../../../shared/theme/styles';
import { C } from '../../../shared/theme/colors';
import type { Navigate } from '../../../navigation/types';
export function ProfileScreen({
  go,
  state,
  signOut,
}: {
  go: Navigate;
  state: CampusState;
  signOut: () => void;
}) {
  const p = state.profile;
  const rated = state.sessions.filter(x => x.rating);
  const rating = rated.length
    ? (rated.reduce((sum, x) => sum + x.rating!, 0) / rated.length).toFixed(1)
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
        <Avatar name={p.name} variant="tutor" />
        <Text style={[s.heading, styles.marginTop16]}>{p.name}</Text>
        <Text style={s.muted}>
          {p.course} • {p.year}
        </Text>
        <Text style={[s.muted, s.center]}>{p.school}</Text>
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
      ].map(x => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={x.label}
          key={x.label}
          style={[s.card, s.row, styles.minHeight54]}
          onPress={() =>
            go(x.page as 'Edit Profile' | 'Preferences' | 'Be a Tutor')
          }
        >
          <Text style={[s.text, s.grow]}>{x.label}</Text>
          <Text style={s.name}>›</Text>
        </TouchableOpacity>
      ))}
      <Link
        label="Enable biometric sign-in"
        onPress={async () => {
          try {
            await deviceStore().enableBiometrics();
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
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={[s.card, styles.minHeight54justifyContentcenter]}
        onPress={() =>
          Alert.alert(
            'Sign out?',
            'Your local data will stay saved on this device.',
            [
              {
                text: 'Stay signed in',
                style: 'cancel',
              },
              {
                text: 'Sign out',
                onPress: signOut,
              },
            ],
          )
        }
      >
        <Text style={[s.text, s.danger]}>Sign out</Text>
      </TouchableOpacity>
      <Text style={[s.muted, s.center]}>
        Campus4Change 1.1.0 • offline school prototype
      </Text>
    </Screen>
  );
}
const choices = [
  'Calculus',
  'Java',
  'Machine Learning',
  'Algebra',
  'Physics',
  'Statistics',
  'Programming',
];
export function EditProfileScreen({
  back,
  profile,
  save,
  preferences = false,
}: {
  back: () => void;
  profile: Profile;
  save: (changes: Partial<Profile>) => void;
  preferences?: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [course, setCourse] = useState(profile.course);
  const [year, setYear] = useState(profile.year);
  const [school, setSchool] = useState(profile.school);
  const [interests, setInterests] = useState(profile.interests);
  const [error, setError] = useState('');
  function toggle(x: string) {
    setInterests(
      interests.includes(x)
        ? interests.filter(v => v !== x)
        : [...interests, x],
    );
  }
  return (
    <Screen
      title={preferences ? 'Learning Preferences' : 'Edit Profile'}
      back={back}
    >
      {!preferences && (
        <>
          <Field
            label="Full name"
            icon="N"
            value={name}
            onChangeText={setName}
          />
          <Field
            label="Course"
            icon="C"
            value={course}
            onChangeText={setCourse}
          />
          <Field
            label="Year level"
            icon="Y"
            value={year}
            onChangeText={setYear}
          />
          <Field label="School" value={school} onChangeText={setSchool} />
        </>
      )}
      <Text style={s.section}>Learning interests</Text>
      <View style={s.wrap}>
        {choices.map(x => (
          <Chip
            key={x}
            label={x}
            selected={interests.includes(x)}
            onPress={() => toggle(x)}
          />
        ))}
      </View>
      <View style={s.bigGap} />
      <ErrorText value={error} />
      <AppButton
        title="SAVE CHANGES"
        onPress={() => {
          if (
            !name.trim() ||
            !course.trim() ||
            !year.trim() ||
            !school.trim()
          ) {
            setError(
              'Complete the name, course, year level, and school fields.',
            );
            return;
          }
          save({
            name: name.trim(),
            course: course.trim(),
            year: year.trim(),
            school: school.trim(),
            interests,
          });
          back();
        }}
      />
    </Screen>
  );
}
export function BeTutorScreen({
  back,
  profile,
  save,
}: {
  back: () => void;
  profile: Profile;
  save: (changes: Partial<Profile>) => void;
}) {
  const [subjects, setSubjects] = useState(profile.tutorSubjects.join(', '));
  const [bio, setBio] = useState(profile.bio);
  const [error, setError] = useState('');
  return (
    <Screen title="Be a Tutor" back={back}>
      <Text style={[s.muted, styles.marginBottom24]}>
        Share what you know with your campus. This profile is listed locally in
        tutor search.
      </Text>
      <Field
        label="Subjects (separate with commas)"
        placeholder="Calculus I, Algebra, Programming"
        value={subjects}
        onChangeText={setSubjects}
      />
      <Field
        label="About you"
        multiline
        placeholder="How do you help other students?"
        value={bio}
        onChangeText={setBio}
      />
      <ErrorText value={error} />
      <AppButton
        title="SAVE TUTOR PROFILE"
        onPress={() => {
          const list = [
            ...new Set(
              subjects
                .split(',')
                .map(x => x.trim())
                .filter(Boolean),
            ),
          ];
          if (!list.length || bio.trim().length < 10) {
            setError(
              'Add at least one subject and an introduction of at least 10 characters.',
            );
            return;
          }
          save({
            tutorSubjects: list,
            bio: bio.trim(),
          });
          back();
        }}
      />
      {!!profile.tutorSubjects.length && (
        <Link
          label="Remove tutor listing"
          danger
          onPress={() => {
            save({
              tutorSubjects: [],
              bio: '',
            });
            back();
          }}
        />
      )}
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
  marginBottom24: {
    marginBottom: 24,
  },
});
