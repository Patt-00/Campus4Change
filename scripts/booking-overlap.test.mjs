import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';

if (process.env.C4C_ALLOW_FIRESTORE_EMULATOR_RESET !== '1') {
  throw new Error(
    'Set C4C_ALLOW_FIRESTORE_EMULATOR_RESET=1 for this demo-only test.',
  );
}
const [host, port] = (
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
).split(':');
const environment = await initializeTestEnvironment({
  projectId: 'demo-campus4change-rules',
  firestore: {
    host,
    port: Number(port),
    rules: await readFile(
      new URL('../firestore.rules', import.meta.url),
      'utf8',
    ),
  },
});
const bucketMs = 30 * 60 * 1000;
const firstBucket = Math.ceil((Date.now() + 86400000) / bucketMs);
function request(tutorUid, offset = 0, studentUid = 'student') {
  return {
    studentUid,
    tutorUid,
    studentName: 'Student',
    tutorName: tutorUid,
    subject: 'Calculus',
    note: '',
    status: 'pending',
    participantUids: [studentUid, tutorUid],
    startsAt: Timestamp.fromMillis((firstBucket + offset) * bucketMs),
    slotBuckets: [firstBucket + offset, firstBucket + offset + 1],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}
function accept(
  db,
  bookingId,
  booking,
  participants = [booking.tutorUid, booking.studentUid],
) {
  const batch = writeBatch(db);
  for (const participantUid of participants) {
    for (const bucket of booking.slotBuckets) {
      batch.set(
        doc(db, 'sessionSlots', participantUid, 'slots', String(bucket)),
        {
          bookingId,
          tutorUid: booking.tutorUid,
          studentUid: booking.studentUid,
          slotBucket: bucket,
          startsAt: booking.startsAt,
          createdAt: serverTimestamp(),
        },
      );
    }
  }
  batch.update(doc(db, 'tutorBookings', bookingId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}
function cancel(
  db,
  bookingId,
  booking,
  participants = [booking.tutorUid, booking.studentUid],
) {
  const batch = writeBatch(db);
  for (const participantUid of participants) {
    for (const bucket of booking.slotBuckets) {
      batch.delete(
        doc(db, 'sessionSlots', participantUid, 'slots', String(bucket)),
      );
    }
  }
  batch.update(doc(db, 'tutorBookings', bookingId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

try {
  await environment.clearFirestore();
  const claims = { email_verified: true };
  const tutorA = environment
    .authenticatedContext('tutor-a', claims)
    .firestore();
  const tutorB = environment
    .authenticatedContext('tutor-b', claims)
    .firestore();
  const student = environment
    .authenticatedContext('student', claims)
    .firestore();
  const outsider = environment
    .authenticatedContext('outsider', claims)
    .firestore();
  const bookingA = request('tutor-a');
  const bookingB = request('tutor-b');
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'tutorBookings', 'first'), bookingA);
    await setDoc(doc(db, 'tutorBookings', 'overlap'), bookingB);
    await setDoc(
      doc(db, 'tutorBookings', 'partial-overlap'),
      request('tutor-b', 1),
    );
    await setDoc(doc(db, 'tutorBookings', 'adjacent'), request('tutor-b', 2));
    await setDoc(
      doc(db, 'tutorBookings', 'cross-role'),
      request('student', 0, 'third'),
    );
    await setDoc(
      doc(db, 'tutorBookings', 'missing-student-locks'),
      request('tutor-b', 4),
    );
    await setDoc(doc(db, 'tutorBookings', 'race-a'), request('tutor-a', 10));
    await setDoc(doc(db, 'tutorBookings', 'race-b'), request('tutor-b', 10));
  });
  await assertSucceeds(accept(tutorA, 'first', bookingA));
  await assertFails(accept(tutorB, 'overlap', bookingB));
  assert.equal(
    (await getDoc(doc(tutorB, 'tutorBookings', 'overlap'))).data().status,
    'pending',
  );
  await assertFails(accept(tutorB, 'partial-overlap', request('tutor-b', 1)));
  await assertFails(
    accept(student, 'cross-role', request('student', 0, 'third')),
  );
  await assertFails(
    accept(tutorB, 'missing-student-locks', request('tutor-b', 4), ['tutor-b']),
  );
  for (const bucket of bookingA.slotBuckets) {
    const ownSlot = doc(
      student,
      'sessionSlots',
      'student',
      'slots',
      String(bucket),
    );
    assert.equal(
      (await assertSucceeds(getDoc(ownSlot))).data().bookingId,
      'first',
    );
    await assertFails(
      getDoc(doc(outsider, 'sessionSlots', 'student', 'slots', String(bucket))),
    );
  }

  // Pending requests own no locks and remain cancellable when another session is busy.
  const cancelPending = writeBatch(student);
  cancelPending.update(doc(student, 'tutorBookings', 'overlap'), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(cancelPending.commit());
  assert.equal(
    (await getDoc(doc(tutorA, 'tutorBookings', 'first'))).data().status,
    'accepted',
  );

  await assertSucceeds(accept(tutorB, 'adjacent', request('tutor-b', 2)));
  await assertFails(cancel(student, 'first', bookingA, ['tutor-a']));
  await assertSucceeds(cancel(student, 'first', bookingA));
  for (const participantUid of ['tutor-a', 'student']) {
    for (const bucket of bookingA.slotBuckets) {
      const db = participantUid === 'student' ? student : tutorA;
      assert.equal(
        (
          await getDoc(
            doc(db, 'sessionSlots', participantUid, 'slots', String(bucket)),
          )
        ).exists(),
        false,
      );
    }
  }

  const race = await Promise.allSettled([
    accept(tutorA, 'race-a', request('tutor-a', 10)),
    accept(tutorB, 'race-b', request('tutor-b', 10)),
  ]);
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(race.filter(result => result.status === 'rejected').length, 1);
  console.log(
    'Participant overlap passed: cross-tutor and cross-role conflicts, concurrent accepts, private locks, adjacent sessions, pending cancellation, and atomic release.',
  );
} finally {
  await environment.cleanup();
}
