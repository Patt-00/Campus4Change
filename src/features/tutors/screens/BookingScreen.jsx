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
  const [offset, setOffset] = useState(() => {
    if (!session) {
      return 0;
    }
    const sessionStart = new Date(session.startsAt);
    if (!Number.isFinite(sessionStart.getTime())) {
      return 0;
    }
    return Math.max(
      0,
      Math.round(
        (sessionStart.setHours(0, 0, 0, 0) - dayAt(0, 0).getTime()) /
          86400000,
      ),
    );
  });
  const [slot, setSlot] = useState(() => {
    if (!session) {
      return Math.max(0, Math.min(slots.length - 1, initialSlot));
    }
    const sessionStart = new Date(session.startsAt);
    if (!Number.isFinite(sessionStart.getTime())) {
      return -1;
    }
    return slots.findIndex(
      x =>
        x.hour === sessionStart.getHours() &&
        x.minute === sessionStart.getMinutes(),
    );
  });
  const [subject, setSubject] = useState(session?.subject ?? tutor.subjects[0]);
  const [note, setNote] = useState(session?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const offsets = [...new Set([0, 1, 2, offset])];
  async function save() {
    if (saving) {
      return;
    }
    if (!slots[slot]) {
      setError('Choose a time to continue.');
      return;
    }
    const start = dayAt(offset, slots[slot].hour, slots[slot].minute);
    if (start.getTime() <= Date.now()) {
      setError('Choose a future date and time.');
      return;
    }
    setSaving(true);
    try {
      const result = await onSave(subject, start.toISOString(), note.trim());
      setError(
        typeof result === 'string'
          ? result
          : result?.error || '',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save this session. Try again.',
      );
    } finally {
      setSaving(false);
    }
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
      <Text style={s.section}>
        {tutor.shared ? 'Request date' : 'Choose date'}
      </Text>
      <View style={s.wrap}>
        {offsets.map(n => {
          const d = dayAt(n);
          return (
            <TouchableOpacity
              key={n}
              accessibilityRole="button"
              accessibilityLabel={
                'Select date ' +
                d.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              }
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
      <Text style={s.section}>
        {tutor.shared ? 'Requested time' : 'Choose time'}
      </Text>
      {session && !slots[slot] && (
        <Text style={s.muted}>
          This session&apos;s saved time is not a preset. Choose a new time to
          reschedule it.
        </Text>
      )}
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
      <Text style={s.section}>
        {tutor.shared ? 'Note for the tutor' : 'Session note'}
      </Text>
      <Field
        placeholder={
          tutor.shared
            ? 'This note is shared with the tutor.'
            : 'Example: I need help with integration by parts.'
        }
        multiline
        value={note}
        onChangeText={setNote}
      />

      <ErrorText value={error} />
      <View style={s.bigGap} />
      <AppButton
        title={session ? 'SAVE NEW SCHEDULE' : tutor.shared ? 'SEND SESSION REQUEST' : 'CONFIRM BOOKING'}
        busy={saving}
        onPress={save}
      />

      <Text style={[s.muted, s.center, styles.marginTop14]}>
        {tutor.shared
          ? 'Your subject, requested time, and note are shared with the tutor. This is a request, not a confirmed booking; it is scheduled only after the tutor accepts.'
          : 'One-hour session. Saved to your private schedule; the tutor is not notified.'}
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
