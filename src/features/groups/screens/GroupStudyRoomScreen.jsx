import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Chip, Field } from '../../../shared/components/UI';
import { Icon } from '../../../shared/components/Icon';
import { dateLabel, timeLabel } from '../../../shared/data/utils';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

function meetupStatus(meetupAt) {
  if (!meetupAt || !Number.isFinite(new Date(meetupAt).getTime())) {
    return 'NOT SCHEDULED';
  }
  return new Date(meetupAt).getTime() > Date.now() ? 'UPCOMING' : 'DATE PASSED';
}

export function GroupStudyRoomScreen({
  group,
  title = group?.name || 'Study group',
  shared = group?.shared ?? false,
  back,
  finish,
  initialNotes = '',
  onDraft,
}) {
  const [notes, setNotes] = useState(initialNotes);
  const groupName = group?.name || title;
  const meetupAt = group?.meetupAt;
  const status = meetupStatus(meetupAt);
  const hasMeetupTime = status !== 'NOT SCHEDULED';
  const sessionTopic =
    group?.meetup?.trim() || `${group?.subject || 'Group'} study session`;
  const memberCount = Number.isFinite(Number(group?.members))
    ? Number(group.members)
    : 1;
  const location = group?.room?.trim() || 'Location not set';
  const sharedNotes = Boolean(shared && notes.trim());

  function returnToGroup(publish) {
    finish(notes, publish);
    back();
  }

  return (
    <Screen
      title="Group Session"
      back={() => {
        finish(notes, false);
        back();
      }}
    >
      <View style={[s.row, styles.groupMetaRow]}>
        <Text style={[s.muted, s.grow]}>{groupName}</Text>
        <Text style={s.muted}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </Text>
      </View>

      <View style={s.card}>
        <View style={[s.row, styles.statusRow]}>
          <Text style={[s.label, s.grow]}>GROUP SESSION</Text>
          <Chip
            label={status}
            color={status === 'UPCOMING' ? C.green : C.muted}
          />
        </View>
        <Text style={s.heading}>{sessionTopic}</Text>
        <Text style={[s.muted, styles.subject]}>{group?.subject || groupName}</Text>
        <View style={s.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={s.label}>DATE</Text>
            <Text style={s.text}>
              {hasMeetupTime ? dateLabel(meetupAt) : 'No date added'}
            </Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={s.label}>TIME</Text>
            <Text style={s.text}>
              {hasMeetupTime ? timeLabel(meetupAt) : 'No time added'}
            </Text>
          </View>
        </View>

        <View style={[s.row, styles.locationRow]}>
          <View style={styles.locationIcon}>
            <Icon name="home" size={20} color={C.cyan} />
          </View>
          <View style={s.grow}>
            <Text style={s.label}>LOCATION</Text>
            <Text style={s.name}>{location}</Text>
          </View>
        </View>
      </View>

      <Text style={s.section}>Agenda and notes</Text>
      <Text style={[s.muted, styles.notesHint]}>
        {shared
          ? 'Your draft stays private until you post it to the group.'
          : 'This device-only group and its notes stay on this device.'}
      </Text>
      <Field
        label="Session notes"
        placeholder="Add topics, questions, or study notes..."
        multiline
        maxLength={2000}
        value={notes}
        onChangeText={value => {
          setNotes(value);
          onDraft(value);
        }}
      />

      <AppButton
        title={
          shared
            ? sharedNotes
              ? 'POST NOTES TO GROUP'
              : 'RETURN TO GROUP'
            : 'SAVE NOTES AND RETURN'
        }
        onPress={() => returnToGroup(sharedNotes || !shared)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupMetaRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  subject: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailColumn: {
    flex: 1,
  },
  locationRow: {
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.chip,
  },
  notesHint: {
    marginBottom: 12,
  },
});
