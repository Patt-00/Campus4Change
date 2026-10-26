import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatAvailabilitySummary,
  getAvailableTimesForDate,
  getCustomTimesForDate,
  normalizeAvailability,
} from '../src/features/tutors/data/availability.js';

test('availability accepts one valid weekly window per day', () => {
  const availability = normalizeAvailability({
    mon: { startMinute: 480, endMinute: 600 },
    tue: { startMinute: 481, endMinute: 600 },
    other: { startMinute: 540, endMinute: 1020 },
  });

  assert.deepEqual(availability, {
    mon: { startMinute: 480, endMinute: 600 },
  });
  assert.deepEqual(formatAvailabilitySummary(availability), [
    'Mon 8:00 AM to 10:00 AM',
  ]);
});

test('available starts cover one hour and exclude elapsed times', () => {
  const date = new Date('2026-10-26T00:00:00.000Z');
  const slots = getAvailableTimesForDate(
    date,
    { mon: { startMinute: 480, endMinute: 600 } },
    'UTC',
    new Date('2026-10-26T08:30:00.000Z').getTime(),
  );

  assert.deepEqual(
    slots.map(slot => slot.startsAt.toISOString()),
    ['2026-10-26T09:00:00.000Z'],
  );
});

test('custom requests offer future half-hour starts for one-hour sessions', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const options = getCustomTimesForDate(tomorrow, tomorrow.getTime() - 1);

  assert.equal(options.length, 31);
  assert.equal(options[0].label, '6:00 AM');
  assert.equal(options.at(-1).label, '9:00 PM');
  assert.ok(options.every(option => option.startsAt.getTime() % 1800000 === 0));
});
