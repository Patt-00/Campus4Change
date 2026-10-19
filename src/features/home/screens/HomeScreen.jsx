import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Empty, Field, Link } from '../../../shared/components/UI';
import { IconBadge } from '../../../shared/components/Icon';
import { AppButton } from '../../../shared/components/AppButton';
import { sessionTime } from '../../../shared/data/utils';
import {
  isPastDueSession,
  sessionTimingStatus,
} from '../../sessions/data/status';
import { useSessionClock } from '../../sessions/hooks/useSessionClock';
import { recommendTutorMatches } from '../../tutors/data/search';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

const quick = [
  {
    title: 'Find People',
    page: 'Tutor Search',
    icon: 'search',
    color: C.cyan,
  },
  {
    title: 'Be a Tutor',
    page: 'Be a Tutor',
    icon: 'graduation',
    color: C.green,
  },
  {
    title: 'Study Groups',
    page: 'Study Groups',
    icon: 'users',
    color: C.yellow,
  },
  {
    title: 'Sessions',
    page: 'Sessions',
    icon: 'calendar',
    color: C.cyan,
  },
];

export function HomeScreen({
  go,
  state,
  directory,
  tutors,
  verificationPending,
  sharedDirectoryAvailable = true,
  directoryAccessMessage = '',
  tutorsLoaded = true,
  hasMoreTutors = false,
  tutorDirectoryError = '',
}) {
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const now = useSessionClock(state.sessions);
  const interests = state.profile.interests || [];
  const recommendations = recommendTutorMatches(directory, interests);
  const interest =
    recommendations[0]?.matchedInterests[0] || interests[0] || '';
  const matches = recommendations.length;
  const recommendationSummary = !interests.length
    ? 'Add learning interests to get personalized people recommendations.'
    : !sharedDirectoryAvailable
      ? directoryAccessMessage ||
        'Sign in with a verified Firebase account to see public tutor matches.'
      : !tutorsLoaded
        ? tutorDirectoryError
          ? 'Tutor matches are not ready yet. Check the notice above for status.'
          : 'Checking public tutor profiles…'
          : hasMoreTutors
            ? matches
              ? `${matches} ${matches === 1 ? 'matching tutor' : 'matching tutors'} found in the loaded listings. More may match as you browse.`
              : 'No matches in the loaded listings yet. More tutors may match as you browse.'
            : matches
              ? `${matches} ${matches === 1 ? 'tutor matches' : 'tutors match'} your interests.`
              : directory.length
                ? 'No public tutor profiles match your interests.'
                : 'No public tutor profiles are listed yet.';
  const next = state.sessions
    .filter(x => sessionTimingStatus(x, now) === 'Upcoming')
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )[0];
  const pastDue = state.sessions.filter(session => isPastDueSession(session, now));
  return (
    <Screen
      title="Campus4Change"
      go={go}
      tab="Home"
      onMenu={() => setMenu(true)}
      onNotifications={() => go('Notifications')}
      unread={
        state.notices.filter(n => !n.read).length +
        (verificationPending ? 1 : 0)
      }
    >
      <View style={[s.row, styles.greeting]}>
        <Avatar
          name={state.profile.name}
          size={40}
          avatarId={state.profile.avatarId}
          photoUri={state.profile.profilePhotoUri}
        />
        <View style={s.grow}>
          <Text style={s.name}>Hello, {state.profile.name.split(' ')[0]}!</Text>
          <Text style={s.muted}>What would you like to learn today?</Text>
        </View>
      </View>
      {pastDue.length > 0 && (
        <View style={[s.card, styles.pastDueCard]}>
          <Text style={[s.name, s.danger]}>
            {pastDue.length} past-due{' '}
            {pastDue.length === 1 ? 'booking needs' : 'bookings need'} review
          </Text>
          <Text style={s.muted}>
            These sessions passed their scheduled time. Review the details in
            your session list.
          </Text>
          <AppButton
            title="REVIEW PAST-DUE BOOKINGS"
            outline
            onPress={() => go('Sessions')}
          />
        </View>
      )}
      <Field
        icon="search"
        placeholder="Search people by name, course, or subject..."
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => go({ page: 'Tutor Search', query })}
      />

      {!!query.trim() && (
        <Link
          label="Search people"
          onPress={() => go({ page: 'Tutor Search', query })}
        />
      )}
      <View style={[s.card, styles.match]}>
        <Text style={styles.eyebrow}>YOUR NEXT MATCH AWAITS</Text>
        <View style={[s.row, styles.matchRow]}>
          <View style={s.grow}>
            <Text style={[s.name, s.blue]}>
              {interest || 'Choose what to learn'}
            </Text>
            <Text style={s.muted}>{recommendationSummary}</Text>
          </View>
          <AppButton
            title={interest ? 'VIEW MATCHES' : 'ADD INTERESTS'}
            style={styles.matchAction}
            onPress={() =>
              interest
                ? go({ page: 'Tutor Search', query: interest })
                : go('Preferences')
            }
          />
        </View>
        {!!interest && (
          <Link label="Edit interests" onPress={() => go('Preferences')} />
        )}
      </View>
      {!state.profile.campus && (
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
              Add your course, year level, and TIP campus.
            </Text>
          </View>
        </TouchableOpacity>
      )}
      <Text style={[s.section, styles.compactSection]}>Quick Actions</Text>
      <View style={styles.grid}>
        {quick.map(q => (
          <TouchableOpacity
            key={q.page}
            accessibilityRole="button"
            accessibilityLabel={q.title}
            style={[s.card, s.row, styles.quick]}
            onPress={() => go(q.page)}
          >
            <IconBadge name={q.icon} color={q.color} size={36} />
            <Text style={[s.name, s.grow]} numberOfLines={2}>
              {q.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.row}>
        <Text style={[s.section, s.grow, styles.compactSection]}>
          Upcoming Sessions
        </Text>
        <Link label="View all" onPress={() => go('Sessions')} />
      </View>
      {next ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            'Open ' +
            next.subject +
            ' session. Scheduled ' +
            sessionTime(next.startsAt) +
            '. Upcoming. With ' +
            (tutors.find(t => t.id === next.tutorId)?.name ?? 'Saved tutor')
          }
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
          title={pastDue.length ? 'No upcoming sessions' : 'Your schedule is clear'}
          body={
            pastDue.length
              ? 'Past-due bookings are flagged above for review.'
              : 'Upcoming bookings will appear here.'
          }
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
              { label: 'Find People', page: 'Tutor Search' },
              { label: 'Study Groups', page: 'Study Groups' },
              { label: 'Sessions', page: 'Sessions' },
              { label: 'Messages', page: 'Messages' },
              { label: 'Notifications', page: 'Notifications' },
              { label: 'Profile', page: 'Profile' },
              { label: 'Settings', page: 'Settings' },
            ].map(item => (
              <Link
                key={item.page}
                label={item.label}
                onPress={() => {
                  setMenu(false);
                  go(item.page);
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
  greeting: { marginBottom: 14 },
  pastDueCard: { borderColor: C.danger, marginTop: 8 },
  match: { padding: 14, marginTop: 4 },
  matchRow: { marginTop: 4 },
  matchAction: {
    width: 128,
    minHeight: 48,
    paddingHorizontal: 8,
    marginTop: 0,
    borderRadius: 10,
  },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: 11, color: C.cyan },
  compactSection: { marginTop: 20, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quick: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 84,
    padding: 12,
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
