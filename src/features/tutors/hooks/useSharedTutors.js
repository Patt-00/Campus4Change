import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createTutorBooking,
  removeTutorProfile,
  saveTutorProfile,
  updateTutorBookingStatus,
  watchTutorBookings,
  watchTutorDirectory,
} from '../data/firestore';

const EMPTY = [];

function errorText(error) {
  if (error?.code === 'permission-denied') {
    return 'Firebase denied this change. Verify your email and confirm the latest Firestore rules are deployed.';
  }
  return error instanceof Error ? error.message : String(error);
}

export function useSharedTutors({ uid, enabled, profile }) {
  const [result, setResult] = useState({
    uid: null,
    tutors: EMPTY,
    bookings: EMPTY,
    error: '',
    hasMoreTutors: false,
    hasMoreBookings: false,
    tutorsLoaded: false,
    bookingsLoaded: false,
  });
  const [actionError, setActionError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const activeUid = useRef(uid);
  activeUid.current = uid;

  useEffect(() => {
    if (!enabled || !uid) {
      setResult({
        uid: null,
        tutors: EMPTY,
        bookings: EMPTY,
        error: '',
        hasMoreTutors: false,
        hasMoreBookings: false,
        tutorsLoaded: false,
        bookingsLoaded: false,
      });
      setActionError('');
      return undefined;
    }

    let active = true;
    setResult(current => ({
      uid,
      tutors: current.uid === uid ? current.tutors : EMPTY,
      bookings: current.uid === uid ? current.bookings : EMPTY,
      error: '',
      hasMoreTutors: current.uid === uid ? current.hasMoreTutors : false,
      hasMoreBookings: current.uid === uid ? current.hasMoreBookings : false,
      tutorsLoaded: current.uid === uid ? current.tutorsLoaded : false,
      bookingsLoaded: current.uid === uid ? current.bookingsLoaded : false,
    }));

    let stopTutors = () => {};
    let stopBookings = () => {};
    const onError = error => {
      if (active) {
        setResult(current => ({
          ...current,
          uid,
          error: errorText(error),
        }));
      }
    };

    try {
      stopTutors = watchTutorDirectory(
        uid,
        (tutors, metadata) => {
          if (active) {
            setResult(current => ({
              ...current,
              uid,
              tutors,
              hasMoreTutors: metadata.hasMore,
              tutorsLoaded: true,
            }));
          }
        },
        onError,
      );
      stopBookings = watchTutorBookings(
        uid,
        (bookings, metadata) => {
          if (active) {
            setResult(current => ({
              ...current,
              uid,
              bookings,
              hasMoreBookings: metadata.hasMore,
              bookingsLoaded: true,
            }));
          }
        },
        onError,
      );
    } catch (error) {
      onError(error);
    }

    return () => {
      active = false;
      stopTutors();
      stopBookings();
    };
  }, [enabled, retryKey, uid]);

  const runAction = useCallback(async action => {
    setActionError('');
    try {
      return await action();
    } catch (error) {
      const message = errorText(error);
      if (activeUid.current === uid) {
        setActionError(message);
      }
      return { error: message };
    }
  }, [uid]);

  const publishProfile = useCallback(
    profileValue =>
      runAction(() =>
        saveTutorProfile(uid, {
          ...profileValue,
          subjects: profileValue.tutorSubjects ?? profileValue.subjects,
        }),
      ),
    [runAction, uid],
  );
  const unpublishProfile = useCallback(
    () => runAction(() => removeTutorProfile(uid)),
    [runAction, uid],
  );
  const requestSession = useCallback(
    (tutor, subject, startsAt, note) =>
      runAction(() =>
        createTutorBooking(uid, profile?.name, tutor, subject, startsAt, note),
      ),
    [profile?.name, runAction, uid],
  );
  const updateRequest = useCallback(
    (bookingId, status) =>
      runAction(() => updateTutorBookingStatus(uid, bookingId, status)),
    [runAction, uid],
  );

  return {
    tutors: result.uid === uid ? result.tutors : EMPTY,
    bookings: result.uid === uid ? result.bookings : EMPTY,
    error: result.uid === uid ? result.error : '',
    loading: Boolean(
      enabled &&
        uid &&
        result.uid === uid &&
        !(result.tutorsLoaded && result.bookingsLoaded) &&
        !result.error,
    ),
    actionError,
    hasMoreTutors: result.uid === uid && result.hasMoreTutors,
    hasMoreBookings: result.uid === uid && result.hasMoreBookings,
    retry: () => setRetryKey(value => value + 1),
    publishProfile,
    unpublishProfile,
    requestSession,
    updateRequest,
  };
}
