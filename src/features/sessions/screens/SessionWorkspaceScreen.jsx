import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import {
  Avatar,
  Chip,
  ErrorText,
  Field,
  Link,
} from '../../../shared/components/UI';
import { sessionTime } from '../../../shared/data/utils';
import { canCompleteSession, sessionTimingStatus } from '../data/status';
import { useSessionClock } from '../hooks/useSessionClock';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function SessionWorkspaceScreen({
  session,
  tutor,
  back,
  message,
  initialNotes = '',
  onDraft,
  save,
  complete,
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const now = useSessionClock(session);
  const timingStatus = sessionTimingStatus(session, now);
  const canComplete = canCompleteSession(session, now);

  async function finishSession() {
    if (saving) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await complete(notes);
      if (result?.error) {
        setError(result.error);
        setSaving(false);
      }
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : 'Could not complete the session. Try again.',
      );
      setSaving(false);
    }
  }

  return (
    <Screen title="Booked Session" back={back}>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.grow}>
            <Text style={s.section}>SESSION</Text>
            <Text style={s.heading}>{session.subject}</Text>
          </View>
          <Chip
            label={timingStatus.toUpperCase()}
            color={
              timingStatus === 'Past due'
                ? C.danger
                : timingStatus === 'In progress'
                  ? C.green
                  : C.cyan
            }
          />
        </View>
        <View style={s.divider} />
        <Text style={s.section}>Scheduled time</Text>
        <Text style={s.text}>{sessionTime(session.startsAt)}</Text>
        <Text style={s.section}>{session.incoming ? 'Student' : 'Tutor'}</Text>
        <View style={s.row}>
          <Avatar
            name={session.incoming ? session.studentName : tutor.name}
            variant={session.incoming ? 'avatar' : 'tutor'}
            size={44}
          />
          <View style={s.grow}>
            <Text style={s.name}>
              {session.incoming ? session.studentName || 'Student' : tutor.name}
            </Text>
            <Text style={s.muted}>
              {session.incoming ? 'Student participant' : tutor.course || 'Campus tutor'}
            </Text>
          </View>
          {message && (session.shared || !session.incoming) && (
            <Link
              label={
                session.shared
                  ? session.incoming
                    ? 'Message student'
                    : 'Message tutor'
                  : 'Open private notes'
              }
              onPress={message}
            />
          )}
        </View>
      </View>

      <Text style={s.section}>Session notes</Text>
      <Text style={[s.muted, styles.helper]}>
        {session.shared
          ? 'Your agenda and notes stay private in your account. Use the participant chat above to message the other person. Live calls are not available yet.'
          : 'Your notes and messages stay private on this device and are not sent to the tutor. Live calls are not available in this version.'}
      </Text>
      <Field
        label={session.shared ? 'Private agenda and notes' : 'Agenda and notes'}
        placeholder="Write what you want to cover..."
        multiline
        value={notes}
        onChangeText={value => {
          setNotes(value);
          onDraft(value);
        }}
      />

      <ErrorText value={error} />
      <AppButton
        title={session.shared ? 'SAVE PRIVATE NOTES' : 'SAVE NOTES AND RETURN'}
        outline
        busy={saving}
        disabled={saving}
        onPress={() => save(notes)}
      />
      {canComplete && (
        <AppButton
          title="MARK SESSION COMPLETE"
          busy={saving}
          disabled={saving}
          onPress={finishSession}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: {
    marginBottom: 12,
  },
});
