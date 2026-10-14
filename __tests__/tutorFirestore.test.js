import { firebaseServicesForUser } from '../src/shared/backend/firebase';
import {
  createTutorBooking,
  mapTutorBooking,
  saveTutorProfile,
  updateTutorBookingStatus,
  watchTutorBookings,
  watchTutorDirectory,
} from '../src/features/tutors/data/firestore';

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseServicesForUser: jest.fn(),
}));

function createFirestore() {
  const subscriptions = [];
  const transactions = [];
  const batches = [];
  const firestore = {
    collection: jest.fn((parent, ...segments) => ({
      path: [parent.name ?? parent.path ?? parent, ...segments].join('/'),
    })),
    doc: jest.fn((parent, ...segments) => {
      const parentPath = parent.path ?? parent.name ?? parent;
      const path =
        segments.length === 0 && parentPath === 'db/tutorBookings'
          ? `${parentPath}/booking-1`
          : [parentPath, ...segments].join('/');
      return { path, id: path.split('/').at(-1) };
    }),
    Timestamp: {
      fromDate: jest.fn(date => ({ toDate: () => date })),
    },
    serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
    setDoc: jest.fn(async () => {}),
    deleteDoc: jest.fn(async () => {}),
    writeBatch: jest.fn(() => {
      const batch = {
        set: jest.fn(),
        commit: jest.fn(async () => {}),
      };
      batches.push(batch);
      return batch;
    }),
    updateDoc: jest.fn(async () => {}),
    runTransaction: jest.fn(async (db, operation) => {
      const transaction = {
        get: jest.fn(async ref => {
          if (ref.path === 'db/tutorBookings/booking-1') {
            const start = firestore.bookingStart || new Date(Date.now() + 24 * 60 * 60 * 1000);
            const firstBucket = Math.floor(start.getTime() / (30 * 60 * 1000));
            return {
              exists: () => true,
              data: () => ({
                tutorUid: 'tutor-1',
                studentUid: 'student-1',
                slotBuckets: [firstBucket, firstBucket + 1],
                startsAt: { toDate: () => start },
                status: firestore.bookingStatus || 'pending',
              }),
            };
          }
          if (firestore.occupiedBy) {
            return {
              exists: () => true,
              data: () => ({ bookingId: firestore.occupiedBy }),
            };
          }
          return { exists: () => false };
        }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };
      transactions.push(transaction);
      return operation(transaction);
    }),
    where: jest.fn((field, operator, value) => ({ field, operator, value })),
    orderBy: jest.fn((field, direction) => ({ field, direction })),
    limit: jest.fn(count => ({ count })),
    query: jest.fn((ref, ...constraints) => ({ ref, constraints })),
    onSnapshot: jest.fn((target, next, error) => {
      const subscription = {
        target,
        next,
        error,
        unsubscribe: jest.fn(),
      };
      subscriptions.push(subscription);
      return subscription.unsubscribe;
    }),
  };
  return { db: { name: 'db' }, firestore, subscriptions, transactions, batches };
}

function documentSnapshot(id, data) {
  return { id, data: () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('publishes only bounded, normalized tutor profile fields', async () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);

  await saveTutorProfile('tutor-1', {
    name: '  Taylor Student  ',
    course: ' BS Mathematics ',
    year: ' 3rd Year ',
    subjects: [' Calculus  ', 'CALCULUS', 'Statistics'],
    bio: ' I explain concepts step by step. ',
  });

  expect(services.firestore.doc).toHaveBeenCalledWith(
    services.db,
    'tutorProfiles',
    'tutor-1',
  );
  expect(services.firestore.setDoc).toHaveBeenCalledWith(
    expect.any(Object),
    {
      uid: 'tutor-1',
      name: 'Taylor Student',
      course: 'BS Mathematics',
      year: '3rd Year',
      subjects: ['Calculus', 'Statistics'],
      bio: 'I explain concepts step by step.',
      visibility: 'listed',
      updatedAt: { serverTimestamp: true },
    },
  );
  expect(services.firestore.setDoc.mock.calls[0][1]).not.toHaveProperty('email');
  expect(services.firestore.setDoc.mock.calls[0][1]).not.toHaveProperty('studentId');
});

test('creates a pending request only for a listed tutor and one of their subjects', async () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  const startsAt = new Date(
    Math.ceil((Date.now() + 60 * 60 * 1000) / (30 * 60 * 1000)) *
      (30 * 60 * 1000),
  ).toISOString();
  const tutor = {
    id: 'tutor-1',
    name: 'Taylor Student',
    shared: true,
    subjects: ['Calculus'],
  };

  const booking = await createTutorBooking(
    'student-1',
    'Jordan Student',
    tutor,
    'Calculus',
    startsAt,
    'Review integration by parts.',
  );

  expect(booking).toMatchObject({
    id: 'booking-1',
    shared: true,
    status: 'Pending',
    tutorId: 'tutor-1',
    studentUid: 'student-1',
  });
  const requestBatch = services.batches[0];
  expect(requestBatch.set).toHaveBeenCalledTimes(2);
  expect(requestBatch.commit).toHaveBeenCalledTimes(1);
  const [bookingRef, written] = requestBatch.set.mock.calls[0];
  const [limitRef, limitRecord] = requestBatch.set.mock.calls[1];
  expect(bookingRef).toMatchObject({
    path: 'db/tutorBookings/booking-1',
    id: 'booking-1',
  });
  expect(limitRef.path).toBe('db/tutorBookingLimits/student-1');
  expect(limitRecord).toEqual({
    uid: 'student-1',
    lastRequestAt: { serverTimestamp: true },
    bookingId: 'booking-1',
  });
  expect(written).toMatchObject({
    studentUid: 'student-1',
    tutorUid: 'tutor-1',
    studentName: 'Jordan Student',
    tutorName: 'Taylor Student',
    subject: 'Calculus',
    status: 'pending',
    participantUids: ['student-1', 'tutor-1'],
  });
  expect(written.startsAt.toDate().toISOString()).toBe(startsAt);
  const firstBucket = Math.floor(new Date(startsAt).getTime() / (30 * 60 * 1000));
  expect(written.slotBuckets).toEqual([firstBucket, firstBucket + 1]);
  expect(written).not.toHaveProperty('studentEmail');

  await expect(
    createTutorBooking('student-1', 'Jordan', { ...tutor, shared: false }, 'Calculus', startsAt, ''),
  ).rejects.toThrow('Choose a listed tutor.');
  await expect(
    createTutorBooking('student-1', 'Jordan', tutor, 'Physics', startsAt, ''),
  ).rejects.toThrow('Choose one of this tutor’s listed subjects.');
  await expect(
    createTutorBooking(
      'student-1',
      'Jordan',
      tutor,
      'Calculus',
      new Date(new Date(startsAt).getTime() + 15 * 60 * 1000).toISOString(),
      '',
    ),
  ).rejects.toThrow('Choose a time on the hour or half-hour.');
  expect(services.firestore.writeBatch).toHaveBeenCalledTimes(1);
});

test('subscribes to each participant role with UID-constrained booking queries', () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  const onBookings = jest.fn();
  const stop = watchTutorBookings('student-1', onBookings, jest.fn());

  expect(services.subscriptions).toHaveLength(2);
  const [asStudent, asTutor] = services.subscriptions;
  expect(asStudent.target.constraints[0]).toEqual({
    field: 'studentUid',
    operator: '==',
    value: 'student-1',
  });
  expect(asTutor.target.constraints[0]).toEqual({
    field: 'tutorUid',
    operator: '==',
    value: 'student-1',
  });

  asStudent.next({ docs: [documentSnapshot('outgoing', {
    studentUid: 'student-1',
    tutorUid: 'tutor-2',
    studentName: 'Jordan',
    tutorName: 'Taylor',
    subject: 'Calculus',
    startsAt: { toDate: () => new Date('2026-10-15T09:00:00.000Z') },
    note: '',
    status: 'pending',
  })] });
  expect(onBookings).not.toHaveBeenCalled();
  asTutor.next({ docs: [documentSnapshot('incoming', {
    studentUid: 'student-3',
    tutorUid: 'student-1',
    studentName: 'Casey',
    tutorName: 'Jordan',
    subject: 'Physics',
    startsAt: { toDate: () => new Date('2026-10-16T09:00:00.000Z') },
    note: '',
    status: 'accepted',
  })] });

  expect(onBookings).toHaveBeenCalledWith(
    [
      expect.objectContaining({ id: 'outgoing', incoming: false, status: 'Pending' }),
      expect.objectContaining({ id: 'incoming', incoming: true, status: 'Upcoming' }),
    ],
    { hasMore: false },
  );

  stop();
  expect(asStudent.unsubscribe).toHaveBeenCalledTimes(1);
  expect(asTutor.unsubscribe).toHaveBeenCalledTimes(1);
});

test('acceptance reserves both half-hour buckets and maps Firestore status safely', async () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  services.firestore.bookingStart = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await updateTutorBookingStatus('tutor-1', 'booking-1', 'accept');
  const transaction = services.transactions[0];
  expect(transaction.set).toHaveBeenCalledTimes(2);
  const firstBucket = Math.floor(
    services.firestore.bookingStart.getTime() / (30 * 60 * 1000),
  );
  expect(transaction.set.mock.calls).toEqual(
    expect.arrayContaining([
      [
        expect.objectContaining({ path: `db/tutorSlots/tutor-1/slots/${firstBucket}` }),
        expect.objectContaining({
          bookingId: 'booking-1',
          tutorUid: 'tutor-1',
          studentUid: 'student-1',
          slotBucket: firstBucket,
        }),
      ],
      [
        expect.objectContaining({ path: `db/tutorSlots/tutor-1/slots/${firstBucket + 1}` }),
        expect.objectContaining({
          bookingId: 'booking-1',
          slotBucket: firstBucket + 1,
        }),
      ],
    ]),
  );
  expect(transaction.update).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'db/tutorBookings/booking-1' }),
    { status: 'accepted', updatedAt: { serverTimestamp: true } },
  );
  await expect(
    updateTutorBookingStatus('tutor-1', 'booking-1', 'rewrite-owner'),
  ).rejects.toThrow('That session update is not supported.');

  const mapped = mapTutorBooking(
    documentSnapshot('booking-2', {
      studentUid: 'student-1',
      tutorUid: 'tutor-1',
      studentName: 'Jordan',
      tutorName: 'Taylor',
      subject: 'Calculus',
      startsAt: { toDate: () => new Date('2026-10-15T09:00:00.000Z') },
      note: 'Review limits.',
      status: 'declined',
    }),
    'student-1',
  );
  expect(mapped).toMatchObject({ id: 'booking-2', incoming: false, status: 'Declined' });
});

test('declines an overlapping acceptance and releases both locks on cancellation', async () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  services.firestore.occupiedBy = 'another-booking';
  await expect(
    updateTutorBookingStatus('tutor-1', 'booking-1', 'accept'),
  ).rejects.toThrow('This time was just accepted for another request.');
  expect(services.transactions[0].update).not.toHaveBeenCalled();

  services.firestore.occupiedBy = 'booking-1';
  services.firestore.bookingStatus = 'accepted';
  await updateTutorBookingStatus('tutor-1', 'booking-1', 'cancel');
  const cancellation = services.transactions[1];
  expect(cancellation.delete).toHaveBeenCalledTimes(2);
  expect(cancellation.delete.mock.calls.map(([ref]) => ref.path)).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^db\/tutorSlots\/tutor-1\/slots\/\d+$/),
      expect.stringMatching(/^db\/tutorSlots\/tutor-1\/slots\/\d+$/),
    ]),
  );
  expect(cancellation.update).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'db/tutorBookings/booking-1' }),
    { status: 'cancelled', updatedAt: { serverTimestamp: true } },
  );
});

test('refuses to complete an accepted booking before its scheduled start', async () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  services.firestore.bookingStatus = 'accepted';

  await expect(
    updateTutorBookingStatus('student-1', 'booking-1', 'complete'),
  ).rejects.toThrow(
    'A session can be completed only after its scheduled start time.',
  );
  expect(services.transactions[0].delete).not.toHaveBeenCalled();
  expect(services.transactions[0].update).not.toHaveBeenCalled();
});

test('allows an accepted booking to complete after its scheduled start', async () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  services.firestore.bookingStatus = 'accepted';
  services.firestore.bookingStart = new Date(Date.now() - 60 * 1000);
  services.firestore.occupiedBy = 'booking-1';

  await updateTutorBookingStatus('student-1', 'booking-1', 'complete');

  expect(services.transactions[0].delete).toHaveBeenCalledTimes(2);
  expect(services.transactions[0].update).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'db/tutorBookings/booking-1' }),
    { status: 'completed', updatedAt: { serverTimestamp: true } },
  );
});

test('uses a bounded live tutor directory query and maps owner state', () => {
  const services = createFirestore();
  firebaseServicesForUser.mockReturnValue(services);
  const onTutors = jest.fn();
  watchTutorDirectory('tutor-1', onTutors, jest.fn());
  const subscription = services.subscriptions[0];
  expect(subscription.target.constraints).toContainEqual({
    field: 'visibility',
    operator: '==',
    value: 'listed',
  });
  expect(subscription.target.constraints).toContainEqual({ count: 20 });
  subscription.next({
    size: 1,
    docs: [documentSnapshot('tutor-1', {
      uid: 'tutor-1',
      name: 'Taylor',
      course: 'Math',
      year: '3rd Year',
      subjects: ['Calculus'],
      bio: 'Step-by-step help for calculus.',
      updatedAt: { toDate: () => new Date('2026-10-13T00:00:00.000Z') },
    })],
  });
  expect(onTutors).toHaveBeenCalledWith(
    [expect.objectContaining({ id: 'tutor-1', own: true, shared: true })],
    { hasMore: false },
  );
});
