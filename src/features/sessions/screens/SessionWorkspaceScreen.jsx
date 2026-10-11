import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, Field, Link } from '../../../shared/components/UI';
import { sessionTime } from '../../../shared/data/demo';
import { sessionTimingStatus } from '../data/status';
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
  const timingStatus = sessionTimingStatus(session);

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
        <Text style={s.section}>Tutor</Text>
        <View style={s.row}>
          <Avatar name={tutor.name} variant="tutor" size={44} />
          <View style={s.grow}>
            <Text style={s.name}>{tutor.name}</Text>
            <Text style={s.muted}>{tutor.course || 'Campus tutor'}</Text>
          </View>
          <Link label="Message tutor" onPress={message} />
        </View>
      </View>

      <Text style={s.section}>Session notes</Text>
      <Text style={[s.muted, styles.helper]}>
        Keep the booking details and your notes together. Live calls are not
        available in this version.
      </Text>
      <Field
        label="Agenda and notes"
        placeholder="Write what you want to cover..."
        multiline
        value={notes}
        onChangeText={value => {
          setNotes(value);
          onDraft(value);
        }}
      />

      <AppButton
        title="SAVE NOTES AND RETURN"
        outline
        onPress={() => save(notes)}
      />
      {session.status === 'Upcoming' && (
        <AppButton
          title="MARK SESSION COMPLETE"
          onPress={() => complete(notes)}
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
