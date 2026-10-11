const SESSION_DURATION_MS = 60 * 60 * 1000;

export function sessionTimingStatus(session, now = Date.now()) {
  if (session.status !== 'Upcoming') {
    return session.status;
  }
  const startsAt = new Date(session.startsAt).getTime();
  if (!Number.isFinite(startsAt) || now < startsAt) {
    return 'Upcoming';
  }
  return now < startsAt + SESSION_DURATION_MS ? 'In progress' : 'Past due';
}

export function isPastDueSession(session, now = Date.now()) {
  return sessionTimingStatus(session, now) === 'Past due';
}
