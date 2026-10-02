import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { ErrorText, Field } from '../../../shared/components/UI';
import { parseMeetup } from '../data/meetup';
import { s } from '../../../shared/theme/styles';

export function CreateGroupScreen({ back, create }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [meetup, setMeetup] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  return (
    <Screen title="Create Study Group" back={back}>
      <Text style={[s.muted, styles.marginBottom20]}>
        Organize a subject, a study schedule, and your notes.
      </Text>
      <Field
        label="Group name"
        placeholder="Example: Exam Review Team"
        value={name}
        onChangeText={setName}
      />

      <Field
        label="Subject"
        placeholder="Any subject or skill"
        value={subject}
        onChangeText={setSubject}
      />

      <Field
        label="Meetup topic"
        placeholder="What will you study together?"
        value={meetup}
        onChangeText={setMeetup}
      />

      <Text style={s.section}>Schedule a meetup (optional)</Text>
      <Field
        label="Meetup date"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
        maxLength={10}
        keyboardType="numbers-and-punctuation"
      />

      <Field
        label="Meetup time"
        placeholder="HH:mm (24-hour time)"
        value={time}
        onChangeText={setTime}
        maxLength={5}
        keyboardType="numbers-and-punctuation"
      />

      <ErrorText value={error} />
      <AppButton
        title="CREATE GROUP"
        onPress={() => {
          if (name.trim().length < 3 || !subject.trim()) {
            setError(
              'Enter a group name with at least 3 characters and a subject.',
            );
            return;
          }
          const meetupAt =
            date.trim() || time.trim() ? parseMeetup(date, time) : undefined;
          if (
            (date.trim() || time.trim()) &&
            (!meetupAt || new Date(meetupAt).getTime() <= Date.now())
          ) {
            setError(
              'Enter a valid future date and time, or leave both fields empty.',
            );
            return;
          }
          create(
            name.trim(),
            subject.trim(),
            meetup.trim() || subject.trim() + ' review',
            meetupAt,
          );
        }}
      />

      <Text style={[s.muted, styles.marginTop16]}>
        Saved on this device. Group changes are not shared with other people.
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  marginBottom20: {
    marginBottom: 20,
  },
  marginTop16: {
    marginTop: 16,
  },
});
