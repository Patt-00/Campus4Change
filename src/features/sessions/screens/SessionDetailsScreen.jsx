import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import {
  Avatar,
  Chip,
  ErrorText,
  Link,
} from '../../../shared/components/UI';
import { dateLabel, timeRange } from '../../../shared/data/utils';
import { canRescheduleSession, sessionTimingStatus } from '../data/status';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function SessionDetailsScreen({
  go,
  back,
  session,
  tutor,
  cancel,
  rate,
  message,
  respond,
  privateNotes = '',
}) {
  const [busyAction, setBusyAction] = useState('');
  const [actionError, setActionError] = useState('');
  const timingStatus = sessionTimingStatus(session);
  async function updateRequest(action) {
    if (!respond || busyAction) {
      return;
    }
    setBusyAction(action);
    setActionError('');
    try {
      const result = await respond(action);
      if (result?.error) {
        setActionError(result.error);
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update this request.',
      );
    } finally {
      setBusyAction('');
    }
  }
  return (
    <Screen title="Session Details" back={back}>
      <View style={s.row}>
        <Text style={[s.heading, s.grow]}>{session.subject}</Text>
        <Chip
          label={timingStatus.toUpperCase()}
          color={
            timingStatus === 'Cancelled' ||
            timingStatus === 'Declined' ||
            timingStatus === 'Past due'
              ? C.danger
              : timingStatus === 'In progress'
                ? C.green
                : C.cyan
          }
        />
      </View>
      <View style={s.divider} />
      <Text style={[s.section, styles.marginTop0]}>Schedule</Text>
      <Text style={s.text}>{dateLabel(session.startsAt)}</Text>
      <Text style={s.text}>{timeRange(session.startsAt)}</Text>
      <Text style={s.section}>{session.incoming ? 'Student' : 'Tutor'}</Text>
      <View style={s.row}>
        <Avatar
          name={session.incoming ? session.studentName : tutor.name}
          variant={session.incoming ? 'avatar' : 'tutor'}
        />
        <View>
          <Text style={s.name}>
            {session.incoming ? session.studentName || 'Student' : tutor.name}
          </Text>
          {!session.shared && !session.incoming && (
            <Link label="Message tutor" onPress={message} />
          )}
        </View>
      </View>
      {session.shared && (
        <Text style={s.muted}>
          Session requests sync between both students. Private chat is not
          available yet.
        </Text>
      )}
      <Text style={s.section}>Session workspace</Text>
      <View style={s.card}>
        <Text style={s.muted}>
          Review the booking and keep session notes here. Live calls and shared
          chat are not available yet.
        </Text>
      </View>
      {!!session.note && (
        <>
          <Text style={s.section}>
            {session.shared ? 'Request note (shared)' : 'Session note'}
          </Text>
          <Text style={s.text}>{session.note}</Text>
        </>
      )}
      {!!session.shared && !!privateNotes && (
        <>
          <Text style={s.section}>Your private notes</Text>
          <Text style={s.text}>{privateNotes}</Text>
        </>
      )}
      {session.status === 'Pending' && session.incoming && (
        <>
          <ErrorText value={actionError} />
          <AppButton
            title="ACCEPT SESSION REQUEST"
            busy={busyAction === 'accept'}
            disabled={Boolean(busyAction && busyAction !== 'accept')}
            onPress={() => updateRequest('accept')}
          />
          <AppButton
            title="DECLINE REQUEST"
            outline
            busy={busyAction === 'decline'}
            disabled={Boolean(busyAction && busyAction !== 'decline')}
            onPress={() => updateRequest('decline')}
          />
        </>
      )}
      {session.status === 'Pending' && !session.incoming && (
        <View style={styles.alignItemscenter}>
          <ErrorText value={actionError} />
          <Link
            label="Cancel request"
            danger
            onPress={() =>
              Alert.alert(
                'Cancel this request?',
                'The tutor will see that you withdrew the request.',
                [
                  { text: 'Keep request', style: 'cancel' },
                  {
                    text: 'Cancel request',
                    style: 'destructive',
                    onPress: () => updateRequest('cancel'),
                  },
                ],
              )
            }
          />
        </View>
      )}
      {session.status === 'Upcoming' && (
        <>
          <AppButton
            title="OPEN SESSION WORKSPACE"
            onPress={() =>
              go({
                page: 'Session Workspace',
                sessionId: session.id,
              })
            }
          />

          {canRescheduleSession(session) && !session.shared && (
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
          )}

          <View style={styles.alignItemscenter}>
            <Link
              label="Cancel session"
              danger
              onPress={() =>
                Alert.alert(
                  'Cancel session?',
                  session.shared
                    ? 'The other student will see that the session was cancelled.'
                    : 'This will move the booking to Cancelled in your private schedule. The tutor is not notified.',
                  [
                    {
                      text: 'Keep session',
                      style: 'cancel',
                    },
                    {
                      text: 'Confirm cancellation',
                      style: 'destructive',
                      onPress: session.shared
                        ? () => updateRequest('cancel')
                        : cancel,
                    },
                  ],
                )
              }
            />
          </View>
        </>
      )}
      {session.status === 'Completed' && !session.shared && (
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
