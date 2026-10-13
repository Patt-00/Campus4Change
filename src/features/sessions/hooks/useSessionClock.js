import { useEffect, useMemo, useState } from 'react';
import { nextSessionTimingBoundary } from '../data/status';

const MAX_TIMEOUT_MS = 2_147_000_000;

export function useSessionClock(sessionOrSessions) {
  const sessions = useMemo(
    () =>
      Array.isArray(sessionOrSessions)
        ? sessionOrSessions
        : sessionOrSessions
          ? [sessionOrSessions]
          : [],
    [sessionOrSessions],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const boundary = nextSessionTimingBoundary(sessions, now);
    if (boundary === null) {
      return undefined;
    }
    const delay = Math.min(
      Math.max(0, boundary - Date.now()),
      MAX_TIMEOUT_MS,
    );
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [sessions, now]);

  return now;
}
