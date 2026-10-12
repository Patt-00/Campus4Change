import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Chip, Empty, Link } from '../../../shared/components/UI';
import { sessionTime } from '../../../shared/data/demo';
import { isPastDueSession, sessionTimingStatus } from '../data/status';

import { s } from '../../../shared/theme/styles';

import { IconBadge } from '../../../shared/components/Icon';

export function SessionsScreen({ go, back, sessions, list }) {
  const [filter, setFilter] = useState('Upcoming');
  function card(session) {
    const timingStatus = sessionTimingStatus(session);
    return (
      <TouchableOpacity
        key={session.id}
        accessibilityRole="button"
        accessibilityLabel={'View ' + session.subject + ' details'}
        onPress={() =>
          go({
            page: 'Session Details',
            sessionId: session.id,
          })
        }
        style={[
          s.card,
          timingStatus === 'Upcoming' || timingStatus === 'In progress'
            ? styles.upcomingCard
            : styles.historyCard,
        ]}
      >
        <View style={s.row}>
          <IconBadge name="calendar" />
          <View style={s.grow}>
            <Text style={s.name}>{session.subject}</Text>
            <Text style={s.muted}>
              {sessionTime(session.startsAt)} • {sessionTimingStatus(session)}
            </Text>
            <Text style={s.muted}>
              {list.find(t => t.id === session.tutorId)?.name}
            </Text>
          </View>
        </View>
        <Text style={[s.link, styles.textAlignrightmarginTop12]}>
          {session.status === 'Completed'
            ? session.rating
              ? 'Rated ★ ' + session.rating
              : 'Rate tutor'
            : 'View details'}
        </Text>
      </TouchableOpacity>
    );
  }
  const filtered = sessions
    .filter(x => sessionTimingStatus(x) === filter)
    .sort((a, b) =>
      filter === 'Upcoming'
        ? a.startsAt.localeCompare(b.startsAt)
        : b.startsAt.localeCompare(a.startsAt),
    );
  const inProgress =
    filter === 'Upcoming'
      ? sessions.filter(x => sessionTimingStatus(x) === 'In progress')
      : [];
  const pastDue =
    filter === 'Upcoming'
      ? sessions.filter(session => isPastDueSession(session))
      : [];
  const needsReview =
    filter === 'Upcoming'
      ? sessions.filter(x => sessionTimingStatus(x) === 'Needs review')
      : [];
  return (
    <Screen title="My Sessions" back={back} go={go} tab="Sessions">
      <View style={s.wrap}>
        {['Upcoming', 'Completed', 'Cancelled'].map(x => (
          <Chip
            key={x}
            label={x}
            selected={filter === x}
            onPress={() => setFilter(x)}
          />
        ))}
      </View>
      <Text style={s.section}>{filter}</Text>
      {filtered.map(card)}
      {inProgress.length > 0 && (
        <>
          <Text style={s.section}>In progress</Text>
          {inProgress.map(card)}
        </>
      )}
      {pastDue.length > 0 && (
        <>
          <Text style={s.section}>Past due • review these bookings</Text>
          {pastDue.map(card)}
        </>
      )}
      {needsReview.length > 0 && (
        <>
          <Text style={s.section}>Needs review</Text>
          {needsReview.map(card)}
        </>
      )}
      {!filtered.length &&
        !inProgress.length &&
        !pastDue.length &&
        !needsReview.length && (
          <Empty
            title={'No ' + filter.toLowerCase() + ' sessions'}
            body={
              filter === 'Upcoming'
                ? 'Find a tutor to book your next session.'
                : 'Sessions will appear here when their status changes.'
            }
          />
      )}
      {filter === 'Upcoming' &&
        sessions.some(x => x.status === 'Completed') && (
          <>
            <Text style={s.section}>Past sessions</Text>
            {sessions.filter(x => x.status === 'Completed').map(card)}
          </>
        )}
      <Link label="Find a tutor" onPress={() => go('Tutor Search')} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  upcomingCard: { minHeight: 126 },
  historyCard: { minHeight: 100 },
  textAlignrightmarginTop12: {
    textAlign: 'right',
    marginTop: 12,
  },
});
