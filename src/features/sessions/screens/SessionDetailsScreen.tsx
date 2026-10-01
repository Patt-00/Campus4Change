import React from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, Link } from '../../../shared/components/UI';
import { dateLabel, timeRange } from '../../../shared/data/demo';
import type { Session, Tutor } from '../../../shared/data/types';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';

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
  marginTop0: {
    marginTop: 0,
  },
  alignItemscenter: {
    alignItems: 'center',
  },
});
