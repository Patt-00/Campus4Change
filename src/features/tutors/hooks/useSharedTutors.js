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

function listenerErrorText(error) {
  if (error?.code === 'permission-denied') {
    return 'Shared data is not accessible right now. Verify your email and try again. If this continues, contact the project team.';
  }
  if (error?.code === 'failed-precondition' && /index/i.test(error.message || '')) {
    return 'Shared data is temporarily unavailable. Please try again shortly.';
  }
  return error instanceof Error ? error.message : String(error);
}

function actionErrorText(error) {
  if (error?.code === 'permission-denied') {
    return 'This change could not be saved. Verify your email and try again, or wait a few seconds if you just sent a session request.';
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
    loadingMoreTutors: false,
    loadingMoreBookings: false,
    tutorsLive: true,
    bookingsLive: true,
    tutorsLoaded: false,
    bookingsLoaded: false,
  });
  const [actionError, setActionError] = useState({ uid: null, message: '' });
  const [retryKey, setRetryKey] = useState(0);
  const activeUid = useRef(enabled ? uid : null);
  const previousUid = useRef(uid);
  const subscriptions = useRef({ uid: null, tutors: null, bookings: null });
  activeUid.current = enabled ? uid : null;

  useEffect(() => {
    const accountChanged = previousUid.current !== uid;
    previousUid.current = uid;

    if (!enabled || !uid) {
      setResult({
        uid: null,
        tutors: EMPTY,
        bookings: EMPTY,
        error: '',
        hasMoreTutors: false,
        hasMoreBookings: false,
        loadingMoreTutors: false,
        loadingMoreBookings: false,
        tutorsLive: true,
        bookingsLive: true,
        tutorsLoaded: false,
        bookingsLoaded: false,
      });
      setActionError({ uid: null, message: '' });
      return undefined;
    }

    if (accountChanged) {
      setActionError({ uid: null, message: '' });
    }

    let active = true;
    setResult(current => ({
      uid,
      tutors: current.uid === uid ? current.tutors : EMPTY,
      bookings: current.uid === uid ? current.bookings : EMPTY,
      error: '',
      hasMoreTutors: false,
      hasMoreBookings: false,
      loadingMoreTutors: false,
      loadingMoreBookings: false,
      tutorsLive: true,
      bookingsLive: true,
      tutorsLoaded: current.uid === uid ? current.tutorsLoaded : false,
      bookingsLoaded: current.uid === uid ? current.bookingsLoaded : false,
    }));

    const currentSubscriptions = { uid, tutors: null, bookings: null };
    subscriptions.current = currentSubscriptions;
    let tutorSubscription = { unsubscribe: () => {}, loadMore: async () => {} };
    let bookingSubscription = { unsubscribe: () => {}, loadMore: async () => {} };
    const onError = error => {
      if (active) {
        setResult(current => ({
          ...current,
          uid,
          error: listenerErrorText(error),
        }));
      }
    };

    try {
      tutorSubscription = watchTutorDirectory(
        uid,
        (tutors, metadata) => {
          if (active) {
            setResult(current => ({
              ...current,
              uid,
              tutors,
              hasMoreTutors: metadata.hasMore,
              loadingMoreTutors: metadata.loadingMore,
              tutorsLive: metadata.live,
              tutorsLoaded: true,
            }));
          }
        },
        onError,
      );
      bookingSubscription = watchTutorBookings(
        uid,
        (bookings, metadata) => {
          if (active) {
            setResult(current => ({
              ...current,
              uid,
              bookings,
              hasMoreBookings: metadata.hasMore,
              loadingMoreBookings: metadata.loadingMore,
              bookingsLive: metadata.live,
              bookingsLoaded: true,
            }));
          }
        },
        onError,
      );
      currentSubscriptions.tutors = tutorSubscription;
      currentSubscriptions.bookings = bookingSubscription;
    } catch (error) {
      onError(error);
    }

    return () => {
      active = false;
      tutorSubscription.unsubscribe();
      bookingSubscription.unsubscribe();
      if (subscriptions.current === currentSubscriptions) {
        subscriptions.current = { uid: null, tutors: null, bookings: null };
      }
    };
  }, [enabled, retryKey, uid]);

  const runAction = useCallback(async (action, permissionMessage) => {
    if (activeUid.current === uid) {
      setActionError({ uid, message: '' });
    }
    try {
      return await action();
    } catch (error) {
      const message = error?.code === 'permission-denied' && permissionMessage
        ? permissionMessage
        : actionErrorText(error);
      if (activeUid.current === uid) {
        setActionError({ uid, message });
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
      runAction(
        () => updateTutorBookingStatus(uid, bookingId, status),
        status === 'accept'
          ? 'Could not accept this request. A participant may already be booked, or your access may have changed. Refresh session data before trying again.'
          : undefined,
      ),
    [runAction, uid],
  );
  const loadMoreTutors = useCallback(() => {
    const current = subscriptions.current;
    return current.uid === uid && current.tutors
      ? current.tutors.loadMore()
      : Promise.resolve();
  }, [uid]);
  const loadMoreBookings = useCallback(() => {
    const current = subscriptions.current;
    return current.uid === uid && current.bookings
      ? current.bookings.loadMore()
      : Promise.resolve();
  }, [uid]);

  return {
    tutors: result.uid === uid ? result.tutors : EMPTY,
    bookings: result.uid === uid ? result.bookings : EMPTY,
    error: result.uid === uid ? result.error : '',
    tutorsLoaded: Boolean(result.uid === uid && result.tutorsLoaded),
    loading: Boolean(
      enabled &&
        uid &&
        result.uid === uid &&
        !(result.tutorsLoaded && result.bookingsLoaded) &&
        !result.error,
    ),
    actionError:
      enabled && uid && actionError.uid === uid ? actionError.message : '',
    hasMoreTutors: result.uid === uid && result.hasMoreTutors,
    hasMoreBookings: result.uid === uid && result.hasMoreBookings,
    loadingMoreTutors: result.uid === uid && result.loadingMoreTutors,
    loadingMoreBookings: result.uid === uid && result.loadingMoreBookings,
    tutorsLive: result.uid === uid && result.tutorsLive,
    bookingsLive: result.uid === uid && result.bookingsLive,
    retry: () => setRetryKey(value => value + 1),
    loadMoreTutors,
    loadMoreBookings,
    publishProfile,
    unpublishProfile,
    requestSession,
    updateRequest,
  };
}
