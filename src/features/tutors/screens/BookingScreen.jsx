import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Chip, ErrorText, Field } from '../../../shared/components/UI';
import { dayAt } from '../../../shared/data/demo';

import { s } from '../../../shared/theme/styles';
import { bookingSlots as slots } from '../data/booking';

export function BookingScreen({
  back,
  tutor,
  session,
  initialSlot = 0,
  onSave,
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
      : Math.max(0, Math.min(slots.length - 1, initialSlot)),
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
        One-hour session. Saved to your schedule on this device; not sent to the
        tutor.
      </Text>
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
});
