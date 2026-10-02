import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Empty, Field, Link } from '../../../shared/components/UI';
import { IconBadge } from '../../../shared/components/Icon';
import { AppButton } from '../../../shared/components/AppButton';
import { sessionTime } from '../../../shared/data/demo';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

const quick = [
  {
    title: 'Find a Tutor',
    body: 'Explore subjects and skills',
    page: 'Tutor Search',
    icon: 'search',
    color: C.cyan,
  },
  {
    title: 'Be a Tutor',
    body: 'Share what you know',
    page: 'Be a Tutor',
    icon: 'graduation',
    color: C.green,
  },
  {
    title: 'Study Groups',
    body: 'Keep study notes together',
    page: 'Study Groups',
    icon: 'users',
    color: C.yellow,
  },
  {
    title: 'Sessions',
    body: 'Manage your schedule',
    page: 'Sessions',
    icon: 'calendar',
    color: C.cyan,
  },
];

export function HomeScreen({ go, state, directory, tutors }) {
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const interest = state.profile.interests[0];
  const matches = interest
    ? directory.filter(
        t =>
          !t.own &&
          t.subjects.some(x =>
            x.toLowerCase().includes(interest.toLowerCase()),
          ),
      ).length
    : 0;
  const next = state.sessions
    .filter(
      x =>
        x.status === 'Upcoming' && new Date(x.startsAt).getTime() > Date.now(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  return (
    <Screen
      title="Campus4Change"
      go={go}
      tab="Home"
      onMenu={() => setMenu(true)}
      onNotifications={() => go('Notifications')}
      unread={state.notices.filter(n => !n.read).length}
    >
      <View style={[s.row, styles.greeting]}>
        <Avatar name={state.profile.name} size={44} />
        <View style={s.grow}>
          <Text style={s.name}>Hello, {state.profile.name.split(' ')[0]}!</Text>
          <Text style={s.muted}>What would you like to learn today?</Text>
        </View>
      </View>
      {state.profile.id === 'demo' && (
        <Text style={[s.muted, styles.demo]}>
          Demo account · Sample tutors, groups, and conversations
        </Text>
      )}
      <Field
        icon="search"
        placeholder="Search for subjects, skills, or tutors..."
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => go({ page: 'Tutor Search', query })}
      />

      {!!query.trim() && (
        <Link
          label="Search tutors"
          onPress={() => go({ page: 'Tutor Search', query })}
        />
      )}
      <View style={[s.card, styles.match]}>
        <Text style={styles.eyebrow}>YOUR LEARNING INTERESTS</Text>
        <Text style={[s.heading, s.blue, styles.top]}>
          {interest || 'Choose what to learn'}
        </Text>
        <Text style={s.muted}>
          {interest
            ? `${matches} ${
                matches === 1 ? 'tutor matches' : 'tutors match'
              } this interest in your directory.`
            : 'Add your own subjects, skills, and topics.'}
        </Text>
        <AppButton
          title={interest ? 'VIEW MATCHES' : 'ADD INTERESTS'}
          onPress={() =>
            interest
              ? go({ page: 'Tutor Search', query: interest })
              : go('Preferences')
          }
        />

        {!!interest && (
          <Link label="Edit interests" onPress={() => go('Preferences')} />
        )}
      </View>
      {!state.profile.school && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Complete your profile"
          style={[s.card, s.row]}
          onPress={() => go('Edit Profile')}
        >
          <IconBadge name="user" />
          <View style={s.grow}>
            <Text style={s.name}>Complete your profile</Text>
            <Text style={s.muted}>
              Add your course, year level, and school.
            </Text>
          </View>
        </TouchableOpacity>
      )}
      <Text style={[s.section, styles.top]}>Quick Actions</Text>
      <View style={styles.grid}>
        {quick.map(q => (
          <TouchableOpacity
            key={q.page}
            accessibilityRole="button"
            accessibilityLabel={q.title}
            style={[s.card, styles.quick]}
            onPress={() => go(q.page)}
          >
            <IconBadge name={q.icon} color={q.color} />
            <Text style={s.name}>{q.title}</Text>
            <Text style={s.muted}>{q.body}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.row}>
        <Text style={[s.section, s.grow]}>Upcoming Sessions</Text>
        <Link label="View all" onPress={() => go('Sessions')} />
      </View>
      {next ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={'Open ' + next.subject + ' session'}
          onPress={() => go({ page: 'Session Details', sessionId: next.id })}
          style={[s.card, s.row]}
        >
          <IconBadge name="calendar" />
          <View style={s.grow}>
            <Text style={s.name}>{next.subject}</Text>
            <Text style={s.muted}>{sessionTime(next.startsAt)}</Text>
            <Text style={s.muted}>
              With{' '}
              {tutors.find(t => t.id === next.tutorId)?.name ?? 'Saved tutor'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <Empty
          title="Your schedule is clear"
          body="Upcoming bookings will appear here."
        />
      )}
      <Modal
        visible={menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <View style={styles.overlay}>
          <View style={[s.card, styles.menu]}>
            <Text style={s.heading}>Campus4Change</Text>
            {[
              'Tutor Search',
              'Study Groups',
              'Sessions',
              'Messages',
              'Notifications',
              'Profile',
              'About',
            ].map(page => (
              <Link
                key={page}
                label={page}
                onPress={() => {
                  setMenu(false);
                  go(page);
                }}
              />
            ))}
            <AppButton
              title="CLOSE MENU"
              outline
              onPress={() => setMenu(false)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  greeting: { marginBottom: 20 },
  demo: { marginBottom: 16 },
  match: { backgroundColor: '#092535', padding: 18, marginTop: 4 },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: 11, color: C.cyan },
  top: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quick: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: 154,
    gap: 10,
    marginBottom: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#000a',
    justifyContent: 'center',
    padding: 24,
  },
  menu: { width: '100%', maxWidth: 480, alignSelf: 'center' },
});
