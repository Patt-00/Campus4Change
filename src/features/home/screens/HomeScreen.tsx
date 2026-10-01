import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Field, Link } from '../../../shared/components/UI';
import { AppButton } from '../../../shared/components/AppButton';
import { sessionTime, tutors } from '../../../shared/data/demo';
import type { CampusState } from '../../../shared/data/types';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import type { Navigate, Page } from '../../../navigation/types';
const quick: {
  title: string;
  body: string;
  page: Page;
  icon: string;
  variant: 'tutor' | 'teach' | 'group' | 'session';
}[] = [
  {
    title: 'Find a Tutor',
    body: 'Get help in subjects',
    page: 'Tutor Search',
    icon: 'T',
    variant: 'tutor',
  },
  {
    title: 'Be a Tutor',
    body: 'Help others & earn',
    page: 'Be a Tutor',
    icon: '+',
    variant: 'teach',
  },
  {
    title: 'Study Groups',
    body: 'Learn with peers',
    page: 'Study Groups',
    icon: 'G',
    variant: 'group',
  },
  {
    title: 'Sessions',
    body: 'Manage bookings',
    page: 'Sessions',
    icon: 'S',
    variant: 'session',
  },
];
export function HomeScreen({
  go,
  state,
}: {
  go: Navigate;
  state: CampusState;
}) {
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const next = state.sessions
    .filter(x => x.status === 'Upcoming')
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
      <View style={[s.row, styles.marginBottom24]}>
        <Avatar name={state.profile.name} />
        <View style={s.grow}>
          <Text style={s.name}>Hello, {state.profile.name.split(' ')[0]}!</Text>
          <Text style={[s.muted, styles.fontSize10]}>
            What would you like to learn or teach today?
          </Text>
        </View>
      </View>
      <Field
        placeholder="Search for subjects, skills, or tutors..."
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() =>
          go({
            page: 'Tutor Search',
            query,
          })
        }
      />
      {query.trim().length > 0 && (
        <Link
          label="Search tutors"
          onPress={() =>
            go({
              page: 'Tutor Search',
              query,
            })
          }
        />
      )}
      <View style={[s.card, styles.match]}>
        <Text style={styles.eyebrow}>YOUR NEXT MATCH AWAITS</Text>
        <View style={[s.row, styles.alignItemsflexendmarginTop12]}>
          <View style={s.grow}>
            <Text style={s.text}>Need help in</Text>
            <Text style={[s.heading, s.blue]}>Calculus I?</Text>
            <Text style={[s.muted, styles.fontSize10]}>
              3 sample tutors are available
            </Text>
          </View>
          <AppButton
            title="VIEW MATCHES"
            onPress={() =>
              go({
                page: 'Tutor Search',
                query: 'Calculus',
              })
            }
            style={styles.matchButton}
          />
        </View>
      </View>
      <Text style={[s.section, styles.marginTop4]}>Quick Actions</Text>
      <View style={styles.grid}>
        {quick.map(q => (
          <TouchableOpacity
            key={q.page}
            accessibilityRole="button"
            accessibilityLabel={q.title}
            style={[s.card, styles.quick]}
            onPress={() => go(q.page)}
          >
            <Avatar name={q.icon} variant={q.variant} />
            <View style={s.grow}>
              <Text style={[s.name, styles.fontSize13]}>{q.title}</Text>
              <Text style={[s.muted, styles.fontSize10]}>{q.body}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[s.row, styles.marginTop4justifyContentspacebetween]}>
        <Text style={s.section}>Upcoming Sessions</Text>
        <Link label="View all" onPress={() => go('Sessions')} />
      </View>
      {next ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={'Open ' + next.subject + ' session'}
          onPress={() =>
            go({
              page: 'Session Details',
              sessionId: next.id,
            })
          }
          style={[s.card, s.row]}
        >
          <View style={styles.course}>
            <Text style={styles.courseSmall}>MATH</Text>
            <Text style={styles.courseNumber}>101</Text>
          </View>
          <View style={s.grow}>
            <Text style={s.name}>{next.subject}</Text>
            <Text style={s.muted}>{sessionTime(next.startsAt)}</Text>
            <Text style={s.muted}>
              With{' '}
              {tutors.find(t => t.id === next.tutorId)?.name ??
                state.profile.name}
            </Text>
          </View>
          <Text style={[s.link, styles.fontSize9]}>UPCOMING</Text>
        </TouchableOpacity>
      ) : (
        <Text style={s.muted}>
          No upcoming sessions. Find a tutor to make your first booking.
        </Text>
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
            <Text style={s.muted}>Offline school prototype</Text>
            {(
              [
                'Tutor Search',
                'Study Groups',
                'Sessions',
                'Messages',
                'Notifications',
                'Profile',
              ] as Page[]
            ).map(page => (
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
  match: {
    backgroundColor: '#092535',
    padding: 12,
    marginTop: 4,
    minHeight: 124,
  },
  eyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: C.cyan,
  },
  matchButton: {
    minHeight: 36,
    marginTop: 0,
    paddingHorizontal: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quick: {
    width: '48%',
    minHeight: 78,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    marginBottom: 0,
  },
  course: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#302662',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  courseSmall: {
    fontFamily: 'Inter-Bold',
    color: C.text,
    fontSize: 8,
  },
  courseNumber: {
    fontFamily: 'Inter-Bold',
    color: C.text,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#000a',
    justifyContent: 'center',
    padding: 24,
  },
  menu: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  marginBottom24: {
    marginBottom: 24,
  },
  fontSize10: {
    fontSize: 10,
  },
  alignItemsflexendmarginTop12: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  marginTop4: {
    marginTop: 4,
  },
  fontSize13: {
    fontSize: 13,
  },
  marginTop4justifyContentspacebetween: {
    marginTop: 4,
    justifyContent: 'space-between',
  },
  fontSize9: {
    fontSize: 9,
  },
});
