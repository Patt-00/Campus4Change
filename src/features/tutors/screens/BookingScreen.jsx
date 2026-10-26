import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import {
  Avatar,
  Chip,
  Empty,
  ErrorText,
  Field,
} from '../../../shared/components/UI';
import { dayAt } from '../../../shared/data/utils';
import { readableErrorText } from '../../../shared/data/readableError';
import { s } from '../../../shared/theme/styles';
import {
  firstAvailableDateOffset,
  getAvailableTimesForDate,
  getCustomTimesForDate,
  normalizeAvailability,
} from '../data/availability';

const BOOKING_LOOKAHEAD_DAYS = 30;
const DATE_PAGE_SIZE = 7;

function dateOffsetFor(value) {
  const sessionStart = new Date(value);
  if (!Number.isFinite(sessionStart.getTime())) {
    return 0;
  }
  const sessionDay = new Date(sessionStart);
  sessionDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.min(
      BOOKING_LOOKAHEAD_DAYS - 1,
      Math.round((sessionDay.getTime() - today.getTime()) / 86400000),
    ),
  );
}

function datePage(offset) {
  const first = Math.floor(offset / DATE_PAGE_SIZE) * DATE_PAGE_SIZE;
  return Array.from(
    { length: Math.min(DATE_PAGE_SIZE, BOOKING_LOOKAHEAD_DAYS - first) },
    (_, index) => first + index,
  );
}

function dateTitle(date, offset) {
  if (offset === 0) {
    return 'TODAY';
  }
  if (offset === 1) {
    return 'TOMORROW';
  }
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

export function BookingScreen({ back, tutor, session, onSave }) {
  const availability = normalizeAvailability(tutor.availability);
  const hasPostedTimes = Object.keys(availability).length > 0;
  const [offset, setOffset] = useState(() =>
    session
      ? dateOffsetFor(session.startsAt)
      : firstAvailableDateOffset(
          availability,
          tutor.timeZone,
          BOOKING_LOOKAHEAD_DAYS,
        ),
  );
  const [mode, setMode] = useState(() =>
    session || !hasPostedTimes ? 'custom' : 'availability',
  );
  const [selectedTime, setSelectedTime] = useState(() =>
    session && Number.isFinite(new Date(session.startsAt).getTime())
      ? new Date(session.startsAt)
      : null,
  );
  const [subject, setSubject] = useState(session?.subject ?? tutor.subjects[0]);
  const [note, setNote] = useState(session?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const date = dayAt(offset, 0, 0);
  const pageDates = datePage(offset);
  const availableTimes = getAvailableTimesForDate(
    date,
    availability,
    tutor.timeZone,
  );
  const customTimes = getCustomTimesForDate(date);
  const options = mode === 'availability' ? availableTimes : customTimes;

  async function save() {
    if (saving) {
      return;
    }
    if (!selectedTime) {
      setError('Choose a time to continue.');
      return;
    }
    if (selectedTime.getTime() <= Date.now()) {
      setError('Choose a future date and time.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await onSave(
        subject,
        selectedTime.toISOString(),
        note.trim(),
        mode === 'availability' ? 'availability' : 'custom',
      );
      setError(typeof result === 'string' ? result : result?.error || '');
    } catch (saveError) {
      setError(
        readableErrorText(saveError, 'Could not save this session. Try again.'),
      );
    } finally {
      setSaving(false);
    }
  }

  function chooseDate(nextOffset) {
    setOffset(nextOffset);
    setSelectedTime(null);
    setError('');
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setSelectedTime(null);
    setError('');
  }

  return (
    <Screen
      title={session ? 'Reschedule Session' : 'Request a Session'}
      back={back}
    >
      <Text style={s.label}>Tutor</Text>
      <View style={[s.card, s.row]}>
        <Avatar
          name={tutor.name}
          variant="tutor"
          avatarId={tutor.avatarId}
          photoUri={tutor.profilePhotoUri}
        />
        <View>
          <Text style={s.name}>{tutor.name}</Text>
          <Text style={s.muted}>{subject}</Text>
        </View>
      </View>
      {tutor.subjects.length > 1 && (
        <View style={s.wrap}>
          {tutor.subjects.map(value => (
            <Chip
              key={value}
              label={value}
              selected={value === subject}
              onPress={() => setSubject(value)}
            />
          ))}
        </View>
      )}
      <Text style={s.section}>Choose a date</Text>
      <View style={styles.dateNavigation}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous seven days"
          disabled={offset === 0}
          onPress={() => chooseDate(Math.max(0, pageDates[0] - DATE_PAGE_SIZE))}
          style={[styles.pageButton, offset === 0 && styles.disabled]}
        >
          <Text style={styles.pageButtonText}>‹ Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Next seven days"
          disabled={pageDates.at(-1) >= BOOKING_LOOKAHEAD_DAYS - 1}
          onPress={() =>
            chooseDate(
              Math.min(
                BOOKING_LOOKAHEAD_DAYS - 1,
                pageDates[0] + DATE_PAGE_SIZE,
              ),
            )
          }
          style={[
            styles.pageButton,
            pageDates.at(-1) >= BOOKING_LOOKAHEAD_DAYS - 1 && styles.disabled,
          ]}
        >
          <Text style={styles.pageButtonText}>Next ›</Text>
        </TouchableOpacity>
      </View>
      <View style={s.wrap}>
        {pageDates.map(value => {
          const dateOption = dayAt(value, 0, 0);
          return (
            <TouchableOpacity
              key={value}
              accessibilityRole="button"
              accessibilityLabel={
                'Select date ' +
                dateOption.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              }
              accessibilityState={{ selected: value === offset }}
              onPress={() => chooseDate(value)}
              style={[
                s.card,
                styles.dateButton,
                value === offset && s.selected,
              ]}
            >
              <Text
                style={s.muted}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {dateTitle(dateOption, value)}
              </Text>
              <Text style={s.name}>
                {dateOption
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
      {hasPostedTimes && (
        <>
          <Text style={s.section}>Time options</Text>
          <View style={s.wrap}>
            <Chip
              label="Tutor's available times"
              selected={mode === 'availability'}
              onPress={() => chooseMode('availability')}
            />
            <Chip
              label="Suggest another time"
              selected={mode === 'custom'}
              onPress={() => chooseMode('custom')}
            />
          </View>
        </>
      )}
      <Text style={s.section}>
        {mode === 'availability'
          ? 'Available start times'
          : 'Suggested start times'}
      </Text>
      {mode === 'availability' && availableTimes.length === 0 && (
        <Empty
          title="No posted times on this date"
          body="Choose another date or suggest a time for the tutor to review."
        />
      )}
      {mode === 'custom' && customTimes.length === 0 && (
        <Empty
          title="No future times available today"
          body="Choose another date to propose a session time."
        />
      )}
      <View style={s.wrap}>
        {options.map(option => (
          <Chip
            key={option.startsAt.toISOString()}
            label={option.label}
            selected={selectedTime?.getTime() === option.startsAt.getTime()}
            onPress={() => {
              setSelectedTime(option.startsAt);
              setError('');
            }}
          />
        ))}
      </View>
      <Text style={[s.muted, styles.timeZoneNote]}>
        {hasPostedTimes
          ? `Times appear in your device time zone. The tutor's weekly hours use ${
              tutor.timeZone || 'Asia/Manila'
            }. Sessions last one hour.`
          : 'Times appear in your device time zone. Sessions last one hour.'}
      </Text>
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
        title={session ? 'SAVE NEW SCHEDULE' : 'SEND SESSION REQUEST'}
        busy={saving}
        onPress={save}
      />

      <Text style={[s.muted, s.center, styles.requestNote]}>
        {tutor.shared
          ? mode === 'custom'
            ? 'This suggested time will appear in the tutor’s requests. The session is scheduled only after the tutor accepts.'
            : 'The tutor’s posted time will be sent as a request. The session is scheduled only after the tutor accepts.'
          : 'This adds a one-hour session to your local schedule.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pageButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pageButtonText: {
    color: '#12c8ff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  disabled: { opacity: 0.35 },
  dateButton: {
    width: 94,
    minHeight: 68,
    alignItems: 'center',
    marginBottom: 0,
    padding: 8,
  },
  timeZoneNote: { marginTop: 12 },
  requestNote: { marginTop: 14 },
});
