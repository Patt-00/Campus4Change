import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, ErrorText, Field } from '../../../shared/components/UI';
import { dayAt, dateLabel, timeRange } from '../../../shared/data/demo';
import type { Session, Tutor } from '../../../shared/data/types';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
const slots = [
  {
    label: '2:00 PM',
    hour: 14,
    minute: 0,
  },
  {
    label: '4:30 PM',
    hour: 16,
    minute: 30,
  },
  {
    label: '6:00 PM',
    hour: 18,
    minute: 0,
  },
];
export function BookingScreen({
  back,
  tutor,
  session,
  onSave,
}: {
  back: () => void;
  tutor: Tutor;
  session?: Session;
  onSave: (
    subject: string,
    startsAt: string,
    note: string,
  ) => string | undefined;
}) {
  const [offset, setOffset] = useState(
    session
      ? Math.max(
          0,
          Math.round(
            (new Date(session.startsAt).setHours(0, 0, 0, 0) -
              dayAt(0, 0).getTime()) /
              86400000,
          ),
        )
      : 0,
  );
  const [slot, setSlot] = useState(
    session
      ? Math.max(
          0,
          slots.findIndex(
            x =>
              x.hour === new Date(session.startsAt).getHours() &&
              x.minute === new Date(session.startsAt).getMinutes(),
          ),
        )
      : 0,
  );
  const [subject, setSubject] = useState(session?.subject ?? tutor.subjects[0]);
  const [note, setNote] = useState(session?.note ?? '');
  const [error, setError] = useState('');
  const offsets = [...new Set([0, 1, 2, offset])];
  function save() {
    const start = dayAt(offset, slots[slot].hour, slots[slot].minute);
    if (start.getTime() <= Date.now()) {
      setError('Choose a future date and time.');
      return;
    }
    setError(onSave(subject, start.toISOString(), note.trim()) ?? '');
  }
  return (
    <Screen
      title={session ? 'Reschedule Session' : 'Book a Session'}
      back={back}
    >
      <Text style={s.label}>Tutor</Text>
      <View style={[s.card, s.row]}>
        <Avatar name={tutor.name} variant="tutor" />
        <View>
          <Text style={s.name}>{tutor.name}</Text>
          <Text style={s.muted}>{subject}</Text>
        </View>
      </View>
      {tutor.subjects.length > 1 && (
        <View style={s.wrap}>
          {tutor.subjects.map(x => (
            <Chip
              key={x}
              label={x}
              selected={x === subject}
              onPress={() => setSubject(x)}
            />
          ))}
        </View>
      )}
      <Text style={s.section}>Choose date</Text>
      <View style={s.wrap}>
        {offsets.map(n => {
          const d = dayAt(n);
          return (
            <TouchableOpacity
              key={n}
              accessibilityRole="button"
              accessibilityLabel={'Date ' + n}
              accessibilityState={{
                selected: n === offset,
              }}
              onPress={() => setOffset(n)}
              style={[
                s.card,
                styles.width100minHeight68,
                n === offset && s.selected,
              ]}
            >
              <Text style={s.muted}>
                {n === 0
                  ? 'TODAY'
                  : d
                      .toLocaleDateString('en-US', {
                        weekday: 'short',
                      })
                      .toUpperCase()}
              </Text>
              <Text style={s.name}>
                {d
                  .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                  .toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.section}>Choose time</Text>
      <View style={s.wrap}>
        {slots.map((x, i) => (
          <Chip
            label={x.label}
            key={x.label}
            selected={i === slot}
            onPress={() => setSlot(i)}
          />
        ))}
      </View>
      <Text style={s.section}>Session note</Text>
      <Field
        placeholder="Example: I need help with integration by parts."
        multiline
        value={note}
        onChangeText={setNote}
      />
      <ErrorText value={error} />
      <View style={s.bigGap} />
      <AppButton
        title={session ? 'SAVE NEW SCHEDULE' : 'CONFIRM BOOKING'}
        onPress={save}
      />
      <Text style={[s.muted, s.center, styles.marginTop14]}>
        Each session lasts one hour. Sample tutor bookings stay on this device.
      </Text>
    </Screen>
  );
}
export function BookingConfirmedScreen({
  go,
  session,
  tutor,
}: {
  go: Navigate;
  session: Session;
  tutor: Tutor;
}) {
  return (
    <Screen title="">
      <Text
        style={[s.heading, s.green, s.center, styles.fontSize84lineHeight102]}
      >
        ✓
      </Text>
      <Text style={[s.heading, s.center, styles.marginTop24]}>
        Session booked!
      </Text>
      <Text style={[s.muted, s.center, styles.marginTop8]}>
        Your {session.subject} session with {tutor.name.split(' ')[0]} is
        confirmed.
      </Text>
      <View style={[s.card, styles.marginTop36padding20]}>
        <Text style={s.name}>{session.subject}</Text>
        <View style={s.gap} />
        <Text style={s.muted}>
          {dateLabel(session.startsAt)}, {timeRange(session.startsAt)}
        </Text>
        <Text style={s.muted}>Local study room</Text>
      </View>
      <View style={s.bigGap} />
      <AppButton title="BACK TO HOME" onPress={() => go('Home')} />
      <AppButton
        title="VIEW SESSION DETAILS"
        outline
        onPress={() =>
          go({
            page: 'Session Details',
            sessionId: session.id,
          })
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  width100minHeight68: {
    width: 100,
    minHeight: 68,
    alignItems: 'center',
    marginBottom: 0,
    padding: 8,
  },
  marginTop14: {
    marginTop: 14,
  },
  fontSize84lineHeight102: {
    fontSize: 84,
    lineHeight: 102,
    marginTop: 45,
  },
  marginTop24: {
    marginTop: 24,
  },
  marginTop8: {
    marginTop: 8,
  },
  marginTop36padding20: {
    marginTop: 36,
    padding: 20,
    minHeight: 124,
  },
});
