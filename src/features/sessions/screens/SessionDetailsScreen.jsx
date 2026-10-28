import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, ErrorText, Link } from '../../../shared/components/UI';
import { dateLabel, timeRange } from '../../../shared/data/utils';
import { readableErrorText } from '../../../shared/data/readableError';
import {
  canCompleteSession,
  canRescheduleSession,
  sessionTimingStatus,
} from '../data/status';
import { useSessionClock } from '../hooks/useSessionClock';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function SessionDetailsScreen({
  go,
  back,
  session,
  tutor,
  cancel,
  message,
  respond,
  complete,
}) {
  const [busyAction, setBusyAction] = useState('');
  const [actionError, setActionError] = useState('');
  const now = useSessionClock(session);
  const timingStatus = sessionTimingStatus(session, now);
  const canComplete = canCompleteSession(session, now);
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
        readableErrorText(error, 'Could not update this request.'),
      );
    } finally {
      setBusyAction('');
    }
  }
  return (
    <Screen title="Session Details" back={back}>
      <View style={[s.card, styles.summaryCard]}>
        <View style={s.row}>
          <View style={s.grow}>
            <Text style={s.label}>
              {session.shared ? 'SESSION REQUEST' : 'SESSION'}
            </Text>
            <Text style={s.heading}>{session.subject}</Text>
          </View>
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
        <Text style={s.section}>When</Text>
        <Text style={s.name}>{dateLabel(session.startsAt)}</Text>
        <Text style={s.muted}>{timeRange(session.startsAt)}</Text>
        {session.shared && session.timeType && (
          <Text style={[s.muted, styles.requestType]}>
            {session.timeType === 'custom'
              ? 'Suggested time'
              : 'Tutor availability'}
          </Text>
        )}
        <Text style={s.section}>{session.incoming ? 'Learner' : 'Tutor'}</Text>
        <View style={s.row}>
          <Avatar
            name={session.incoming ? session.studentName : tutor.name}
            variant={session.incoming ? 'avatar' : 'tutor'}
            avatarId={session.incoming ? undefined : tutor.avatarId}
            photoUri={session.incoming ? undefined : tutor.profilePhotoUri}
          />
          <View style={s.grow}>
            <Text style={s.name}>
              {session.incoming ? session.studentName || 'Student' : tutor.name}
            </Text>
            {!session.incoming && !!tutor.course && (
              <Text style={s.muted}>{tutor.course}</Text>
            )}
          </View>
          {session.shared && message && (
            <Link
              label={session.incoming ? 'Message learner' : 'Message tutor'}
              onPress={message}
            />
          )}
        </View>
      </View>
      {session.shared && !!session.note?.trim() && (
        <View style={s.card}>
          <Text style={s.label}>REQUEST NOTE</Text>
          <Text style={[s.text, styles.note]}>{session.note}</Text>
        </View>
      )}
      {session.shared && (
        <Text style={[s.muted, styles.participantHint]}>
          Request updates and messages are shared with the session participants.
        </Text>
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
          {canRescheduleSession(session, now) && !session.shared && (
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
      {canComplete && (
        <>
          <ErrorText value={actionError} />
          <AppButton
            title="MARK SESSION COMPLETE"
            busy={busyAction === 'complete'}
            disabled={Boolean(busyAction)}
            onPress={async () => {
              if (!complete || busyAction) return;
              setBusyAction('complete');
              setActionError('');
              try {
                const result = await complete();
                if (result?.error) setActionError(result.error);
              } catch (error) {
                setActionError(
                  readableErrorText(error, 'Could not complete the session.'),
                );
              } finally {
                setBusyAction('');
              }
            }}
          />
        </>
      )}
      {session.status === 'Upcoming' && !canComplete && (
        <Text style={[s.muted, s.center, styles.completionHint]}>
          You can mark the session complete after its scheduled start time.
        </Text>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  summaryCard: { padding: 16 },
  alignItemscenter: {
    alignItems: 'center',
  },
  requestType: { marginTop: 4 },
  note: { marginTop: 8 },
  participantHint: { marginTop: 4 },
  completionHint: { marginTop: 12 },
});
