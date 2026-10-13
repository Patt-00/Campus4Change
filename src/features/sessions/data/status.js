const SESSION_DURATION_MS = 60 * 60 * 1000;

export function sessionTimingStatus(session, now = Date.now()) {
  if (session.status === 'Pending') {
    return 'Pending';
  }

  if (session.status === 'Upcoming') {
    const startsAt =
      typeof session.startsAt === 'string'
        ? new Date(session.startsAt).getTime()
        : Number.NaN;
    if (!Number.isFinite(startsAt) || !Number.isFinite(now)) {
      return 'Needs review';
    }
    if (now < startsAt) {
      return 'Upcoming';
    }
    return now < startsAt + SESSION_DURATION_MS ? 'In progress' : 'Past due';
  }

  if (
    ['Completed', 'Cancelled', 'Declined', 'In progress', 'Past due'].includes(
      session.status,
    )
  ) {
    return session.status;
  }
  return 'Needs review';
}

export function isPastDueSession(session, now = Date.now()) {
  return sessionTimingStatus(session, now) === 'Past due';
}

export function canRescheduleSession(session, now = Date.now()) {
  return sessionTimingStatus(session, now) === 'Upcoming';
}

export function canCompleteSession(session, now = Date.now()) {
  const startsAt =
    typeof session?.startsAt === 'string' ||
    typeof session?.startsAt === 'number' ||
    session?.startsAt instanceof Date
      ? new Date(session.startsAt).getTime()
      : Number.NaN;
  return (
    ['Upcoming', 'In progress', 'Past due'].includes(session?.status) &&
    Number.isFinite(startsAt) &&
    Number.isFinite(now) &&
    now >= startsAt
  );
}

export function nextSessionTimingBoundary(sessions, now = Date.now()) {
  if (!Array.isArray(sessions) || !Number.isFinite(now)) {
    return null;
  }

  let nextBoundary = Number.POSITIVE_INFINITY;
  for (const session of sessions) {
    if (!['Upcoming', 'In progress'].includes(session?.status)) {
      continue;
    }
    const startsAt =
      typeof session.startsAt === 'string'
        ? new Date(session.startsAt).getTime()
        : Number.NaN;
    if (!Number.isFinite(startsAt)) {
      continue;
    }
    const endsAt = startsAt + SESSION_DURATION_MS;
    if (startsAt > now) {
      nextBoundary = Math.min(nextBoundary, startsAt);
    }
    if (endsAt > now) {
      nextBoundary = Math.min(nextBoundary, endsAt);
    }
  }
  return Number.isFinite(nextBoundary) ? nextBoundary : null;
}
