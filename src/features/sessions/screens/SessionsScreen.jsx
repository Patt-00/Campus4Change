import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Chip, Empty, Link } from '../../../shared/components/UI';
import { sessionTime } from '../../../shared/data/utils';
import { isPastDueSession, sessionTimingStatus } from '../data/status';
import { useSessionClock } from '../hooks/useSessionClock';

import { s } from '../../../shared/theme/styles';

import { Icon, IconBadge } from '../../../shared/components/Icon';
import { C } from '../../../shared/theme/colors';

export function SessionsScreen({
  go,
  back,
  sessions,
  list,
  initialFilter = 'Upcoming',
  hasMoreSessions = false,
  loadingMoreSessions = false,
  sessionsLive = true,
  loadMoreSessions,
  refreshSessions,
}) {
  const [filter, setFilter] = useState(initialFilter);
  const now = useSessionClock(sessions);
  const requests = sessions.filter(session => session.status === 'Pending');
  function card(session) {
    const timingStatus = sessionTimingStatus(session, now);
    const savedTutorName =
      list.find(t => t.id === session.tutorId)?.name ?? 'Saved tutor';
    const contactName = session.incoming
      ? session.studentName || 'Student'
      : session.tutorName || savedTutorName;
    const contactLabel = session.incoming
      ? 'Request from ' + contactName
      : session.status === 'Pending'
        ? 'Waiting for ' + contactName
        : contactName;
    const statusLabel =
      session.status === 'Pending'
        ? session.incoming
          ? 'Needs your response'
          : 'Waiting for tutor'
        : timingStatus;
    return (
      <TouchableOpacity
        key={session.id}
        accessibilityRole="button"
        accessibilityLabel={
          'View ' +
          session.subject +
          ' details. Scheduled ' +
          sessionTime(session.startsAt) +
          '. Status: ' +
          statusLabel.toLowerCase() +
          '. ' +
          contactLabel +
          '.'
        }
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
        <View style={[s.row, styles.sessionRow]}>
          <IconBadge name="calendar" />
          <View style={s.grow}>
            <Text style={s.name}>{session.subject}</Text>
            <Text style={s.muted}>
              {sessionTime(session.startsAt)} • {statusLabel}
            </Text>
            <Text style={s.muted}>
              {contactLabel}
            </Text>
            {session.shared && session.incoming && session.status === 'Pending' && session.timeType && (
              <Text style={styles.requestType}>
                {session.timeType === 'custom'
                  ? 'Custom time request'
                  : 'Tutor availability request'}
              </Text>
            )}
          </View>
          <Icon name="right" size={18} color={C.muted} />
        </View>
      </TouchableOpacity>
    );
  }
  const filtered = sessions
    .filter(session => {
      if (filter === 'Requests') {
        return session.status === 'Pending';
      }
      if (filter === 'Cancelled') {
        return ['Cancelled', 'Declined'].includes(session.status);
      }
      return sessionTimingStatus(session, now) === filter;
    })
    .sort((a, b) => {
      const aStartsAt = new Date(a.startsAt).getTime();
      const bStartsAt = new Date(b.startsAt).getTime();
      const aHasValidStart = Number.isFinite(aStartsAt);
      const bHasValidStart = Number.isFinite(bStartsAt);
      if (!aHasValidStart || !bHasValidStart) {
        return aHasValidStart === bHasValidStart
          ? 0
          : aHasValidStart
            ? -1
            : 1;
      }
      return filter === 'Upcoming' || filter === 'Requests'
        ? aStartsAt - bStartsAt
        : bStartsAt - aStartsAt;
    });
  const inProgress =
    filter === 'Upcoming'
      ? sessions.filter(x => sessionTimingStatus(x, now) === 'In progress')
      : [];
  const pastDue =
    filter === 'Upcoming'
      ? sessions.filter(session => isPastDueSession(session, now))
      : [];
  const needsReview =
    filter === 'Upcoming'
      ? sessions.filter(x => sessionTimingStatus(x, now) === 'Needs review')
      : [];
  const completedHistory =
    filter === 'Upcoming'
      ? sessions.filter(x => x.status === 'Completed')
      : [];
  const hasOtherSessions = [
    inProgress,
    pastDue,
    needsReview,
    completedHistory,
  ].some(items => items.length > 0);
  return (
    <Screen title="My Sessions" back={back} go={go} tab="Sessions">
      <View style={s.wrap}>
        {['Upcoming', 'Requests', 'Completed', 'Cancelled'].map(x => (
          <Chip
            key={x}
            label={x === 'Requests' && requests.length ? `Requests ${requests.length}` : x}
            selected={filter === x}
            onPress={() => setFilter(x)}
          />
        ))}
      </View>
      <Text style={s.section}>{filter}</Text>
      {hasMoreSessions && loadMoreSessions && (
        <AppButton
          title={loadingMoreSessions ? 'LOADING MORE SESSIONS...' : 'LOAD MORE SESSIONS'}
          outline
          disabled={loadingMoreSessions}
          onPress={loadMoreSessions}
        />
      )}
      {!sessionsLive && refreshSessions && (
        <>
          <Text style={s.muted}>
            Older sessions are a snapshot. Refresh to check for changes.
          </Text>
          <AppButton title="REFRESH LATEST SESSIONS" outline onPress={refreshSessions} />
        </>
      )}
      {filtered.map(card)}
      {filter === 'Upcoming' && !filtered.length && (
        <Empty
          title="No upcoming sessions"
          body={
            hasOtherSessions
              ? 'Your other sessions are grouped below by status.'
              : hasMoreSessions
                ? 'Load more sessions to check older bookings.'
                : 'Find a tutor to book your next session.'
          }
        />
      )}
      {filter === 'Requests' && !filtered.length && (
        <Empty
          title="No session requests"
          body={
            hasMoreSessions
              ? 'No requests in the loaded records. Load more sessions to check older requests.'
              : 'Requests you send and requests waiting for your response will appear here.'
          }
        />
      )}
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
      {filter !== 'Upcoming' && filter !== 'Requests' && !filtered.length && (
        <Empty
          title={'No ' + filter.toLowerCase() + ' sessions'}
          body={
            hasMoreSessions
              ? 'No sessions in the loaded records. Load more to check older sessions.'
              : 'Sessions will appear here when their status changes.'
          }
        />
      )}
      {filter === 'Upcoming' &&
        completedHistory.length > 0 && (
          <>
            <Text style={s.section}>Past sessions</Text>
            {completedHistory.map(card)}
          </>
        )}
      <Link label="Find a tutor" onPress={() => go('Tutor Search')} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  upcomingCard: { minHeight: 88, paddingVertical: 12 },
  historyCard: { minHeight: 88, paddingVertical: 12 },
  sessionRow: { gap: 10 },
  requestType: {
    color: C.cyan,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginTop: 3,
  },
});
