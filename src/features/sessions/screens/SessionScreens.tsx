import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, Empty, Link } from '../../../shared/components/UI';
import { dateLabel, sessionTime, timeRange } from '../../../shared/data/demo';
import type { Session, Tutor } from '../../../shared/data/types';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
import { IconBadge } from '../../../shared/components/Icon';
export function SessionsScreen({
  go,
  back,
  sessions,
  list,
}: {
  go: Navigate;
  back: () => void;
  sessions: Session[];
  list: Tutor[];
}) {
  const [filter, setFilter] = useState<Session['status']>('Upcoming');
  function card(session: Session) {
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
          session.status === 'Upcoming'
            ? styles.upcomingCard
            : styles.historyCard,
        ]}
      >
        <View style={s.row}>
          <IconBadge name="calendar" />
          <View style={s.grow}>
            <Text style={s.name}>{session.subject}</Text>
            <Text style={s.muted}>
              {sessionTime(session.startsAt)} • {session.status}
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
    .filter(x => x.status === filter)
    .sort((a, b) =>
      filter === 'Upcoming'
        ? a.startsAt.localeCompare(b.startsAt)
        : b.startsAt.localeCompare(a.startsAt),
    );
  return (
    <Screen title="My Sessions" back={back} go={go} tab="Sessions">
      <View style={s.wrap}>
        {(['Upcoming', 'Completed', 'Cancelled'] as const).map(x => (
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
      {!filtered.length && (
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
export function SessionDetailsScreen({
  go,
  back,
  session,
  tutor,
  cancel,
  rate,
  message,
}: {
  go: Navigate;
  back: () => void;
  session: Session;
  tutor: Tutor;
  cancel: () => void;
  rate: (rating: number) => void;
  message: () => void;
}) {
  return (
    <Screen title="Session Details" back={back}>
      <View style={s.row}>
        <Text style={[s.heading, s.grow]}>{session.subject}</Text>
        <Chip
          label={session.status.toUpperCase()}
          color={session.status === 'Cancelled' ? C.danger : C.cyan}
        />
      </View>
      <View style={s.divider} />
      <Text style={[s.section, styles.marginTop0]}>Schedule</Text>
      <Text style={s.text}>{dateLabel(session.startsAt)}</Text>
      <Text style={s.text}>{timeRange(session.startsAt)}</Text>
      <Text style={s.section}>Tutor</Text>
      <View style={s.row}>
        <Avatar name={tutor.name} variant="tutor" />
        <View>
          <Text style={s.name}>{tutor.name}</Text>
          <Link label="Message tutor" onPress={message} />
        </View>
      </View>
      <Text style={s.section}>Study room</Text>
      <View style={s.card}>
        <Text style={s.muted}>Focus timer and study notes • no live call</Text>
      </View>
      {!!session.note && (
        <>
          <Text style={s.section}>Session note</Text>
          <Text style={s.text}>{session.note}</Text>
        </>
      )}
      {session.status === 'Upcoming' && (
        <>
          <AppButton
            title="JOIN SESSION"
            onPress={() =>
              go({
                page: 'Study Room',
                sessionId: session.id,
              })
            }
          />
          <AppButton
            title="RESCHEDULE"
            outline
            onPress={() =>
              go({
                page: 'Book Session',
                tutorId: tutor.id,
                sessionId: session.id,
              })
            }
          />
          <View style={styles.alignItemscenter}>
            <Link
              label="Cancel session"
              danger
              onPress={() =>
                Alert.alert(
                  'Cancel session?',
                  'This will move the booking to Cancelled.',
                  [
                    {
                      text: 'Keep session',
                      style: 'cancel',
                    },
                    {
                      text: 'Cancel session',
                      style: 'destructive',
                      onPress: cancel,
                    },
                  ],
                )
              }
            />
          </View>
        </>
      )}
      {session.status === 'Completed' && (
        <>
          <Text style={s.section}>
            {session.rating
              ? 'Your rating: ★ ' + session.rating
              : 'Rate your tutor'}
          </Text>
          <View style={s.wrap}>
            {[1, 2, 3, 4, 5].map(n => (
              <Chip
                label={'★ ' + n}
                key={n}
                selected={session.rating === n}
                color={C.yellow}
                onPress={() => rate(n)}
              />
            ))}
          </View>
        </>
      )}
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
  marginTop0: {
    marginTop: 0,
  },
  alignItemscenter: {
    alignItems: 'center',
  },
});
