import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import {
  formatTimeMinute,
  MAX_AVAILABLE_END,
  MIN_AVAILABLE_START,
  normalizeAvailability,
  SESSION_DURATION_MINUTES,
  WEEKDAYS,
} from '../data/availability';

const startChoices = Array.from(
  {
    length:
      (MAX_AVAILABLE_END - MIN_AVAILABLE_START - SESSION_DURATION_MINUTES) /
        30 +
      1,
  },
  (_, index) => MIN_AVAILABLE_START + index * 30,
);
const endChoices = Array.from(
  {
    length:
      (MAX_AVAILABLE_END - MIN_AVAILABLE_START - SESSION_DURATION_MINUTES) /
        30 +
      1,
  },
  (_, index) => MIN_AVAILABLE_START + SESSION_DURATION_MINUTES + index * 30,
);

export function AvailabilityEditor({ value, onChange, timeZone }) {
  const schedule = useMemo(() => normalizeAvailability(value), [value]);
  const [picker, setPicker] = useState(null);

  function updateDay(dayKey, range) {
    const next = { ...schedule };
    if (range) {
      next[dayKey] = range;
    } else {
      delete next[dayKey];
    }
    onChange(next);
  }

  function optionsForPicker() {
    if (!picker) {
      return [];
    }
    const range = schedule[picker.dayKey];
    if (picker.field === 'start') {
      return startChoices.filter(
        minute => minute + SESSION_DURATION_MINUTES <= range.endMinute,
      );
    }
    return endChoices.filter(
      minute => minute >= range.startMinute + SESSION_DURATION_MINUTES,
    );
  }

  return (
    <>
      <Text style={[s.muted, styles.timeZoneNote]}>
        Times use your device time zone: {timeZone}.
      </Text>
      {WEEKDAYS.map(day => {
        const range = schedule[day.key];
        return (
          <View key={day.key} style={[s.card, styles.dayCard]}>
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityLabel={`${day.label} availability`}
              accessibilityState={{ checked: Boolean(range) }}
              onPress={() =>
                updateDay(
                  day.key,
                  range ? null : { startMinute: 9 * 60, endMinute: 17 * 60 },
                )
              }
              style={styles.dayHeader}
            >
              <View style={[styles.check, range && styles.checked]}>
                {range && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={s.grow}>
                <Text style={s.name}>{day.label}</Text>
                <Text style={s.muted}>
                  {range
                    ? `${formatTimeMinute(
                        range.startMinute,
                      )} to ${formatTimeMinute(range.endMinute)}`
                    : 'Unavailable'}
                </Text>
              </View>
              <Text style={styles.dayAction}>{range ? 'EDIT' : 'ADD'}</Text>
            </TouchableOpacity>
            {range && (
              <View style={styles.rangeRow}>
                <View style={styles.rangeField}>
                  <Text style={styles.rangeLabel}>From</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${day.label} start time`}
                    onPress={() =>
                      setPicker({ dayKey: day.key, field: 'start' })
                    }
                    style={styles.timeButton}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatTimeMinute(range.startMinute)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.rangeField}>
                  <Text style={styles.rangeLabel}>To</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Change ${day.label} end time`}
                    onPress={() => setPicker({ dayKey: day.key, field: 'end' })}
                    style={styles.timeButton}
                  >
                    <Text style={styles.timeButtonText}>
                      {formatTimeMinute(range.endMinute)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
      <Text style={[s.muted, styles.note]}>
        Each booking lasts one hour. Students can also request a different time
        for your approval.
      </Text>
      <Modal
        visible={Boolean(picker)}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={s.name}>
              {picker?.field === 'start'
                ? 'Choose a start time'
                : 'Choose an end time'}
            </Text>
            <Text style={[s.muted, styles.sheetHint]}>
              {WEEKDAYS.find(day => day.key === picker?.dayKey)?.label}
            </Text>
            <ScrollView style={styles.optionList}>
              {optionsForPicker().map(minute => (
                <TouchableOpacity
                  key={minute}
                  accessibilityRole="button"
                  onPress={() => {
                    const current = schedule[picker.dayKey];
                    updateDay(picker.dayKey, {
                      ...current,
                      [picker.field === 'start' ? 'startMinute' : 'endMinute']:
                        minute,
                    });
                    setPicker(null);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>
                    {formatTimeMinute(minute)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPicker(null)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>CLOSE</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  timeZoneNote: { marginBottom: 12 },
  dayCard: { padding: 12, marginBottom: 10 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  check: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: C.muted,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { borderColor: C.cyan, backgroundColor: C.cyan },
  checkmark: { color: C.bg, fontFamily: 'Inter-Bold', fontSize: 14 },
  dayAction: { color: C.cyan, fontFamily: 'Inter-Bold', fontSize: 11 },
  rangeRow: { flexDirection: 'row', gap: 12, marginTop: 12, paddingLeft: 34 },
  rangeField: { flex: 1 },
  rangeLabel: {
    color: C.muted,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginBottom: 6,
  },
  timeButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.chip,
    justifyContent: 'center',
  },
  timeButtonText: { color: C.cyan, fontFamily: 'Inter-SemiBold', fontSize: 13 },
  note: { marginTop: 6 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    maxHeight: '78%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    padding: 20,
  },
  sheetHint: { marginTop: 4, marginBottom: 12 },
  optionList: { flexGrow: 0 },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  optionText: { color: C.text, fontFamily: 'Inter-Medium', fontSize: 14 },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: C.cyan, fontFamily: 'Inter-Bold', fontSize: 12 },
});
