import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  createTutorBooking,
  removeTutorProfile,
  saveTutorProfile,
  updateTutorBookingStatus,
  watchTutorBookings,
  watchTutorDirectory,
} from '../src/features/tutors/data/firestore';
import { useSharedTutors } from '../src/features/tutors/hooks/useSharedTutors';

jest.mock('../src/features/tutors/data/firestore', () => ({
  createTutorBooking: jest.fn(),
  removeTutorProfile: jest.fn(),
  saveTutorProfile: jest.fn(),
  updateTutorBookingStatus: jest.fn(),
  watchTutorBookings: jest.fn(),
  watchTutorDirectory: jest.fn(),
}));

let currentResult;

function Harness({ options }) {
  currentResult = useSharedTutors(options);
  return null;
}

function subscriptionsForCurrentUser() {
  const tutors = [];
  const bookings = [];
  watchTutorDirectory.mockImplementation((uid, onTutors, onError) => {
    const subscription = { uid, onTutors, onError, stop: jest.fn() };
    tutors.push(subscription);
    return subscription.stop;
  });
  watchTutorBookings.mockImplementation((uid, onBookings, onError) => {
    const subscription = { uid, onBookings, onError, stop: jest.fn() };
    bookings.push(subscription);
    return subscription.stop;
  });
  return { tutors, bookings };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('waits for both shared queries and cleans up both subscriptions', async () => {
  const subscriptions = subscriptionsForCurrentUser();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness options={{ uid: 'student-1', enabled: true, profile: { name: 'Jordan' } }} />,
    );
  });

  expect(currentResult.loading).toBe(true);
  expect(watchTutorDirectory).toHaveBeenCalledWith(
    'student-1',
    expect.any(Function),
    expect.any(Function),
  );
  expect(watchTutorBookings).toHaveBeenCalledWith(
    'student-1',
    expect.any(Function),
    expect.any(Function),
  );

  const tutor = { id: 'tutor-1', name: 'Taylor', subjects: ['Calculus'] };
  await act(async () => {
    subscriptions.tutors[0].onTutors([tutor], { hasMore: true });
  });
  expect(currentResult.tutors).toEqual([tutor]);
  expect(currentResult.hasMoreTutors).toBe(true);
  expect(currentResult.loading).toBe(true);

  const booking = { id: 'booking-1', status: 'Pending' };
  await act(async () => {
    subscriptions.bookings[0].onBookings([booking], { hasMore: false });
  });
  expect(currentResult.bookings).toEqual([booking]);
  expect(currentResult.hasMoreBookings).toBe(false);
  expect(currentResult.loading).toBe(false);

  await act(async () => renderer.unmount());
  expect(subscriptions.tutors[0].stop).toHaveBeenCalledTimes(1);
  expect(subscriptions.bookings[0].stop).toHaveBeenCalledTimes(1);
});

test('shows listener errors, retries both queries, and ignores callbacks from the old user', async () => {
  const subscriptions = subscriptionsForCurrentUser();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness options={{ uid: 'student-1', enabled: true, profile: {} }} />,
    );
  });

  await act(async () => {
    subscriptions.tutors[0].onTutors([{ id: 'old-tutor' }], { hasMore: false });
    subscriptions.tutors[0].onError({ code: 'permission-denied' });
  });
  expect(currentResult.error).toContain('Verify your email');
  expect(currentResult.error).not.toContain('wait a few seconds');
  expect(currentResult.loading).toBe(false);

  await act(async () => currentResult.retry());
  expect(watchTutorDirectory).toHaveBeenCalledTimes(2);
  expect(watchTutorBookings).toHaveBeenCalledTimes(2);
  expect(subscriptions.tutors[0].stop).toHaveBeenCalledTimes(1);
  expect(subscriptions.bookings[0].stop).toHaveBeenCalledTimes(1);
  expect(currentResult.error).toBe('');
  expect(currentResult.tutors).toEqual([{ id: 'old-tutor' }]);

  await act(async () => {
    subscriptions.tutors[0].onTutors([{ id: 'stale-tutor' }], { hasMore: false });
    subscriptions.bookings[0].onBookings([{ id: 'stale-booking' }], { hasMore: false });
  });
  expect(currentResult.tutors).toEqual([{ id: 'old-tutor' }]);
  expect(currentResult.bookings).toEqual([]);

  await act(async () => {
    subscriptions.tutors[1].onTutors([{ id: 'current-tutor' }], { hasMore: false });
    subscriptions.bookings[1].onBookings([{ id: 'current-booking' }], { hasMore: false });
  });
  expect(currentResult.tutors).toEqual([{ id: 'current-tutor' }]);
  expect(currentResult.bookings).toEqual([{ id: 'current-booking' }]);
  expect(currentResult.error).toBe('');

  await act(async () => renderer.unmount());
  expect(subscriptions.tutors[1].stop).toHaveBeenCalledTimes(1);
  expect(subscriptions.bookings[1].stop).toHaveBeenCalledTimes(1);
});

test('does not carry an action error into another Firebase account', async () => {
  const subscriptions = subscriptionsForCurrentUser();
  saveTutorProfile.mockRejectedValueOnce({ code: 'permission-denied' });
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness options={{ uid: 'student-1', enabled: true, profile: {} }} />,
    );
  });

  await act(async () => {
    await currentResult.publishProfile({ subjects: ['Calculus'] });
  });
  expect(currentResult.actionError).toContain('Verify your email');
  expect(currentResult.actionError).toContain('wait a few seconds');

  await act(async () => {
    renderer.update(
      <Harness options={{ uid: 'student-2', enabled: true, profile: {} }} />,
    );
  });
  expect(currentResult.actionError).toBe('');
  expect(currentResult.tutors).toEqual([]);
  expect(currentResult.bookings).toEqual([]);
  expect(subscriptions.tutors[0].stop).toHaveBeenCalledTimes(1);
  expect(subscriptions.bookings[0].stop).toHaveBeenCalledTimes(1);

  await act(async () => renderer.unmount());
});

test('routes tutor actions to their UID-scoped data functions', async () => {
  subscriptionsForCurrentUser();
  saveTutorProfile.mockResolvedValue();
  removeTutorProfile.mockResolvedValue();
  createTutorBooking.mockResolvedValue({ id: 'booking-1' });
  updateTutorBookingStatus.mockResolvedValue();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness
        options={{ uid: 'student-1', enabled: true, profile: { name: 'Jordan' } }}
      />,
    );
  });

  await act(async () => {
    await currentResult.publishProfile({ tutorSubjects: ['Calculus'] });
    await currentResult.unpublishProfile();
    await currentResult.requestSession(
      { id: 'tutor-1' },
      'Calculus',
      '2026-10-20T09:00:00.000Z',
      'Review integrals',
    );
    await currentResult.updateRequest('booking-1', 'accept');
  });

  expect(saveTutorProfile).toHaveBeenCalledWith('student-1', {
    tutorSubjects: ['Calculus'],
    subjects: ['Calculus'],
  });
  expect(removeTutorProfile).toHaveBeenCalledWith('student-1');
  expect(createTutorBooking).toHaveBeenCalledWith(
    'student-1',
    'Jordan',
    { id: 'tutor-1' },
    'Calculus',
    '2026-10-20T09:00:00.000Z',
    'Review integrals',
  );
  expect(updateTutorBookingStatus).toHaveBeenCalledWith(
    'student-1',
    'booking-1',
    'accept',
  );
  expect(currentResult.actionError).toBe('');

  await act(async () => renderer.unmount());
});

test('keeps shared data empty and subscriptions disabled when signed out', async () => {
  const subscriptions = subscriptionsForCurrentUser();
  saveTutorProfile.mockRejectedValueOnce(new Error('Not authenticated'));
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness options={{ uid: null, enabled: false, profile: {} }} />,
    );
  });

  expect(watchTutorDirectory).not.toHaveBeenCalled();
  expect(watchTutorBookings).not.toHaveBeenCalled();
  expect(currentResult.tutors).toEqual([]);
  expect(currentResult.bookings).toEqual([]);
  expect(currentResult.loading).toBe(false);
  expect(subscriptions.tutors).toEqual([]);
  expect(subscriptions.bookings).toEqual([]);

  let actionResult;
  await act(async () => {
    actionResult = await currentResult.publishProfile({ subjects: ['Calculus'] });
  });
  expect(actionResult).toEqual({ error: 'Not authenticated' });
  expect(currentResult.actionError).toBe('');

  await act(async () => renderer.unmount());
});

test('a denied acceptance explains participant conflicts and asks for a refresh', async () => {
  subscriptionsForCurrentUser();
  updateTutorBookingStatus.mockRejectedValueOnce({ code: 'permission-denied' });
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness options={{ uid: 'tutor-1', enabled: true, profile: {} }} />,
    );
  });
  let result;
  await act(async () => {
    result = await currentResult.updateRequest('booking-1', 'accept');
  });
  expect(result.error).toContain('participant may already be booked');
  expect(result.error).toContain('Refresh session data');
  expect(result.error).not.toContain('wait a few seconds');
  await act(async () => renderer.unmount());
});
