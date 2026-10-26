export const WEEKDAYS = [
  { key: 'sun', label: 'Sunday', shortLabel: 'Sun' },
  { key: 'mon', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tue', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wed', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thu', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'fri', label: 'Friday', shortLabel: 'Fri' },
  { key: 'sat', label: 'Saturday', shortLabel: 'Sat' },
];

export const SLOT_STEP_MS = 30 * 60 * 1000;
export const SESSION_DURATION_MINUTES = 60;
export const MIN_AVAILABLE_START = 6 * 60;
export const MAX_AVAILABLE_END = 22 * 60;

const WEEKDAY_BY_SHORT_LABEL = Object.fromEntries(
  WEEKDAYS.map((day, index) => [day.shortLabel, WEEKDAYS[index].key]),
);

export function normalizeAvailability(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    WEEKDAYS.flatMap(({ key }) => {
      const range = value[key];
      const startMinute = Number(range?.startMinute);
      const endMinute = Number(range?.endMinute);
      const valid =
        Number.isInteger(startMinute) &&
        Number.isInteger(endMinute) &&
        startMinute >= MIN_AVAILABLE_START &&
        endMinute <= MAX_AVAILABLE_END &&
        startMinute % 30 === 0 &&
        endMinute % 30 === 0 &&
        endMinute - startMinute >= SESSION_DURATION_MINUTES;

      return valid ? [[key, { startMinute, endMinute }]] : [];
    }),
  );
}

export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
  } catch {
    return 'Asia/Manila';
  }
}

export function normalizeTimeZone(value) {
  if (typeof value !== 'string' || value.length > 64) {
    return 'Asia/Manila';
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'Asia/Manila';
  }
}

export function formatTimeMinute(value) {
  const minute = Number(value);
  if (!Number.isInteger(minute) || minute < 0 || minute >= 24 * 60) {
    return 'Time unavailable';
  }
  const date = new Date(0);
  date.setUTCHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return date.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatAvailabilitySummary(value) {
  const availability = normalizeAvailability(value);
  return WEEKDAYS.flatMap(({ key, shortLabel }) => {
    const range = availability[key];
    return range
      ? [
          `${shortLabel} ${formatTimeMinute(
            range.startMinute,
          )} to ${formatTimeMinute(range.endMinute)}`,
        ]
      : [];
  });
}

function datePartsInTimeZone(date, formatter) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(part => [part.type, part.value]),
  );
  return {
    weekdayKey: WEEKDAY_BY_SHORT_LABEL[parts.weekday],
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function getAvailableTimesForDate(
  date,
  value,
  timeZone = 'Asia/Manila',
  after = Date.now(),
) {
  const availability = normalizeAvailability(value);
  const day = new Date(date);
  if (!Number.isFinite(day.getTime()) || !Object.keys(availability).length) {
    return [];
  }

  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);
  const zone = normalizeTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let timestamp = Math.ceil(startOfDay.getTime() / SLOT_STEP_MS) * SLOT_STEP_MS;
  const slots = [];

  for (; timestamp < startOfNextDay.getTime(); timestamp += SLOT_STEP_MS) {
    if (timestamp <= after) {
      continue;
    }
    const start = new Date(timestamp);
    const { weekdayKey, minuteOfDay } = datePartsInTimeZone(start, formatter);
    const range = availability[weekdayKey];
    if (
      range &&
      minuteOfDay >= range.startMinute &&
      minuteOfDay + SESSION_DURATION_MINUTES <= range.endMinute
    ) {
      slots.push({
        startsAt: start,
        label: start.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
    }
  }
  return slots;
}

export function getCustomTimesForDate(date, after = Date.now()) {
  const day = new Date(date);
  if (!Number.isFinite(day.getTime())) {
    return [];
  }
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);
  let timestamp = Math.ceil(startOfDay.getTime() / SLOT_STEP_MS) * SLOT_STEP_MS;
  const times = [];
  for (; timestamp < startOfNextDay.getTime(); timestamp += SLOT_STEP_MS) {
    const startsAt = new Date(timestamp);
    const minuteOfDay = startsAt.getHours() * 60 + startsAt.getMinutes();
    if (
      timestamp > after &&
      minuteOfDay >= MIN_AVAILABLE_START &&
      minuteOfDay + SESSION_DURATION_MINUTES <= MAX_AVAILABLE_END
    ) {
      times.push({
        startsAt,
        label: startsAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
    }
  }
  return times;
}

export function firstAvailableDateOffset(
  value,
  timeZone,
  maxDays = 30,
  now = new Date(),
) {
  if (!Object.keys(normalizeAvailability(value)).length) {
    return 0;
  }
  for (let offset = 0; offset < maxDays; offset += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    date.setHours(0, 0, 0, 0);
    if (getAvailableTimesForDate(date, value, timeZone, now.getTime()).length) {
      return offset;
    }
  }
  return 0;
}
