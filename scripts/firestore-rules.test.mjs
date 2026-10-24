import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  disableNetwork,
  enableNetwork,
  getDoc,
  getCountFromServer,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

if (process.env.C4C_ALLOW_FIRESTORE_EMULATOR_RESET !== '1') {
  console.error(
    'Refusing to clear the selected Firestore emulator project. Set C4C_ALLOW_FIRESTORE_EMULATOR_RESET=1 to confirm.',
  );
  process.exit(1);
}

const emulatorAddress =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [host, portText] = emulatorAddress.split(':');
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const environment = await initializeTestEnvironment({
  projectId: 'demo-campus4change-rules',
  firestore: { host, port: Number(portText), rules },
});

const stateFor = uid => ({
  state: {
    version: 1,
    updatedAt: Date.now(),
    profile: { id: uid },
  },
  updatedAt: Timestamp.now(),
});

try {
  await environment.clearFirestore();
  const verifiedClaims = { email_verified: true };
  const alice = environment.authenticatedContext('alice', verifiedClaims).firestore();
  const bob = environment
    .authenticatedContext('bob', {
      email: 'learner@gmail.com',
      email_verified: true,
    })
    .firestore();
  const carol = environment.authenticatedContext('carol', verifiedClaims).firestore();
  const unverified = environment
    .authenticatedContext('unverified', { email_verified: false })
    .firestore();
  const anonymous = environment.unauthenticatedContext().firestore();
  const aliceState = doc(alice, 'users/alice/private/state');

  await assertSucceeds(setDoc(aliceState, stateFor('alice')));
  await assertSucceeds(getDoc(aliceState));
  await assertFails(getDoc(doc(bob, 'users/alice/private/state')));
  await assertFails(
    setDoc(doc(bob, 'users/alice/private/state'), stateFor('alice')),
  );
  await assertFails(getDoc(doc(anonymous, 'users/alice/private/state')));
  await assertFails(
    setDoc(doc(alice, 'users/alice/private/state'), stateFor('bob')),
  );
  await assertFails(setDoc(doc(alice, 'tutors/mika'), { name: 'Mika' }));

  const legacy = environment
    .authenticatedContext('legacy', verifiedClaims)
    .firestore();
  const legacyState = doc(legacy, 'users/legacy/private/state');
  await assertSucceeds(setDoc(legacyState, {
    ...stateFor('legacy'),
    state: {
      ...stateFor('legacy').state,
      profile: { id: 'legacy', studentId: 'old-value' },
    },
  }));
  await assertSucceeds(setDoc(legacyState, {
    ...stateFor('legacy'),
    state: {
      ...stateFor('legacy').state,
      profile: {
        id: 'legacy',
        accountUuid: '00000000-0000-4000-8000-000000000001',
      },
    },
  }));
  await assertFails(
    setDoc(doc(legacy, 'studentIdClaims/old-value'), { uid: 'legacy' }),
  );
  await assertFails(getDoc(doc(anonymous, 'studentIdClaims/old-value')));
  await assertSucceeds(setDoc(
    doc(unverified, 'users/unverified/private/state'),
    stateFor('unverified'),
  ));

  const privateNoteMessage = {
    conversationId: 'chat-tutor',
    id: 'message-1',
    text: 'Private note',
    mine: true,
    sentAt: Timestamp.now().toDate().toISOString(),
  };
  const alicePrivateNote = doc(
    alice,
    'users/alice/privateMessages/10_chat-tutor__message-1',
  );
  await assertSucceeds(setDoc(alicePrivateNote, privateNoteMessage));
  await assertSucceeds(getDoc(alicePrivateNote));
  await assertSucceeds(setDoc(alicePrivateNote, privateNoteMessage));
  await assertFails(
    setDoc(alicePrivateNote, { ...privateNoteMessage, text: 'Edited note' }),
  );
  await assertSucceeds(
    getDocs(collection(alice, 'users', 'alice', 'privateMessages')),
  );
  const privateNoteCount = await assertSucceeds(
    getCountFromServer(collection(alice, 'users', 'alice', 'privateMessages')),
  );
  assert.equal(privateNoteCount.data().count, 1);
  await assertFails(
    getDocs(collection(bob, 'users', 'alice', 'privateMessages')),
  );
  await assertFails(
    getCountFromServer(collection(bob, 'users', 'alice', 'privateMessages')),
  );
  await assertFails(
    getDoc(doc(bob, 'users/alice/privateMessages/10_chat-tutor__message-1')),
  );
  await assertFails(
    setDoc(
      doc(bob, 'users/alice/privateMessages/10_chat-tutor__message-2'),
      privateNoteMessage,
    ),
  );
  await assertFails(
    getDoc(
      doc(anonymous, 'users/alice/privateMessages/10_chat-tutor__message-1'),
    ),
  );
  await assertFails(
    setDoc(
      doc(alice, 'users/alice/privateMessages/10_chat-tutor__message-too-long'),
      {
        ...privateNoteMessage,
        id: 'message-too-long',
        text: 'x'.repeat(2001),
      },
    ),
  );
  await assertFails(
    setDoc(
      doc(alice, 'users/alice/privateMessages/10_chat-tutor__message-long-id'),
      { ...privateNoteMessage, id: 'x'.repeat(81) },
    ),
  );
  await assertFails(
    setDoc(
      doc(alice, 'users/alice/privateMessages/long-conversation__message-1'),
      { ...privateNoteMessage, conversationId: 'x'.repeat(81) },
    ),
  );
  await assertFails(
    setDoc(
      doc(alice, 'users/alice/privateMessages/10_chat-tutor__message-extra'),
      { ...privateNoteMessage, id: 'message-extra', additionalField: 'not allowed' },
    ),
  );
  const unverifiedPrivateNote = doc(
    unverified,
    'users/unverified/privateMessages/10_chat-tutor__message-1',
  );
  await assertSucceeds(setDoc(unverifiedPrivateNote, privateNoteMessage));
  await assertSucceeds(getDoc(unverifiedPrivateNote));
  const alicePrivateNoteForDeletion = doc(
    alice,
    'users/alice/privateMessages/10_chat-tutor__message-delete-check',
  );
  await assertSucceeds(
    setDoc(alicePrivateNoteForDeletion, {
      ...privateNoteMessage,
      id: 'message-delete-check',
    }),
  );
  await assertFails(deleteDoc(alicePrivateNoteForDeletion));

  const aliceTutorProfile = doc(alice, 'tutorProfiles/alice');
  const tutorProfile = {
    uid: 'alice',
    name: 'Alice Student',
    course: 'BS Mathematics',
    year: '3rd Year',
    avatarId: 'violet',
    subjects: ['Calculus', 'Statistics'],
    bio: 'I explain problems step by step.',
    visibility: 'listed',
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(aliceTutorProfile, tutorProfile));
  const tutorDirectory = await assertSucceeds(
    getDocs(
      query(
        collection(bob, 'tutorProfiles'),
        where('visibility', '==', 'listed'),
        orderBy('updatedAt', 'desc'),
        limit(20),
      ),
    ),
  );
  assert.equal(tutorDirectory.size, 1);
  assert.equal(tutorDirectory.docs[0].data().name, 'Alice Student');
  const legacyTutorProfile = { ...tutorProfile };
  delete legacyTutorProfile.avatarId;
  await assertSucceeds(
    setDoc(doc(bob, 'tutorProfiles/bob'), {
      ...legacyTutorProfile,
      uid: 'bob',
      name: 'Bob Student',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    getDocs(
      query(
        collection(bob, 'tutorProfiles'),
        orderBy('updatedAt', 'desc'),
        limit(20),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(unverified, 'tutorProfiles'),
        where('visibility', '==', 'listed'),
        orderBy('updatedAt', 'desc'),
        limit(20),
      ),
    ),
  );
  await assertFails(getDoc(doc(anonymous, 'tutorProfiles/alice')));
  await assertFails(
    setDoc(doc(bob, 'tutorProfiles/alice'), {
      ...tutorProfile,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(alice, 'tutorProfiles/alice'), {
      ...tutorProfile,
      email: 'private@example.test',
    }),
  );
  await assertFails(
    setDoc(aliceTutorProfile, {
      ...tutorProfile,
      avatarId: 'custom-url',
      updatedAt: serverTimestamp(),
    }),
  );

  const slotBucketMs = 30 * 60 * 1000;
  const nextFutureHalfHour = () =>
    new Date(
      Math.ceil((Date.now() + 86400000) / slotBucketMs) * slotBucketMs,
    );
  const slotBucketsFor = start => {
    const first = Math.floor(start.getTime() / slotBucketMs);
    return [first, first + 1];
  };
  const bookingData = (
    studentUid,
    studentName = 'Bob Student',
    start = nextFutureHalfHour(),
  ) => ({
    studentUid,
    tutorUid: 'alice',
    studentName,
    tutorName: 'Alice Student',
    subject: 'Calculus',
    startsAt: Timestamp.fromDate(start),
    slotBuckets: slotBucketsFor(start),
    note: 'Please review integration by parts.',
    status: 'pending',
    participantUids: [studentUid, 'alice'],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const seedExpiredBookingRequestLimit = async studentUid =>
    environment.withSecurityRulesDisabled(async context => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'tutorBookingLimits', studentUid), {
        uid: studentUid,
        lastRequestAt: Timestamp.fromMillis(Date.now() - 10_000),
        bookingId: 'expired-test-permit',
      });
    });
  const writeBookingRequest = (db, bookingRef, booking) => {
    const batch = writeBatch(db);
    batch.set(bookingRef, booking);
    batch.set(doc(db, 'tutorBookingLimits', booking.studentUid), {
      uid: booking.studentUid,
      lastRequestAt: serverTimestamp(),
      bookingId: bookingRef.id,
    });
    return batch.commit();
  };
  const addSlotLocks = (batch, db, bookingId, booking) => {
    [booking.tutorUid, booking.studentUid].forEach(participantUid => {
      booking.slotBuckets.forEach(slotBucket => {
        batch.set(
          doc(db, 'sessionSlots', participantUid, 'slots', String(slotBucket)),
          {
            bookingId,
            tutorUid: booking.tutorUid,
            studentUid: booking.studentUid,
            slotBucket,
            startsAt: booking.startsAt,
            createdAt: serverTimestamp(),
          },
        );
      });
    });
  };
  const removeSlotLocks = (batch, db, booking) => {
    [booking.tutorUid, booking.studentUid].forEach(participantUid => {
      booking.slotBuckets.forEach(slotBucket => batch.delete(
        doc(db, 'sessionSlots', participantUid, 'slots', String(slotBucket)),
      ));
    });
  };
  const writeBookingChat = (
    context,
    bookingId,
    senderUid,
    senderName,
    messageId,
    text,
  ) => {
    const db = context;
    const batch = writeBatch(db);
    batch.set(doc(db, 'tutorBookings', bookingId, 'chatMessages', messageId), {
      senderUid,
      senderName,
      text,
      sentAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'tutorBookings', bookingId, 'chatWriteLimits', senderUid),
      {
        uid: senderUid,
        lastSentAt: serverTimestamp(),
        messageId,
      },
      { merge: true },
    );
    return batch.commit();
  };
  const writeGroupChat = (
    context,
    groupId,
    senderUid,
    senderName,
    messageId,
    text,
  ) => {
    const db = context;
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'studyGroups', groupId, 'chatMessages', messageId),
      {
        senderUid,
        senderName,
        text,
        sentAt: serverTimestamp(),
        moderationStatus: 'visible',
      },
    );
    batch.set(
      doc(db, 'studyGroups', groupId, 'writeLimits', senderUid),
      {
        uid: senderUid,
        lastWriteAt: serverTimestamp(),
        kind: 'chat',
        writeId: messageId,
        postId: null,
      },
      { merge: true },
    );
    batch.update(doc(db, 'studyGroups', groupId), {
      updatedAt: serverTimestamp(),
    });
    return batch.commit();
  };
  const bobBooking = doc(collection(bob, 'tutorBookings'));
  const bobRequest = bookingData('bob');
  await assertFails(
    setDoc(doc(bob, 'tutorBookings/booking-without-permit'), bobRequest),
  );
  await seedExpiredBookingRequestLimit('bob');
  await assertFails(
    writeBookingRequest(
      bob,
      doc(bob, 'tutorBookings/invalid-subject'),
      { ...bookingData('bob'), subject: 'Chemistry' },
    ),
  );
  await seedExpiredBookingRequestLimit('alice');
  await assertFails(
    writeBookingRequest(
      alice,
      doc(alice, 'tutorBookings/self-booking'),
      bookingData('alice'),
    ),
  );
  const misalignedStart = nextFutureHalfHour();
  await seedExpiredBookingRequestLimit('bob');
  await assertFails(
    writeBookingRequest(
      bob,
      doc(bob, 'tutorBookings/misaligned-start'),
      bookingData(
        'bob',
        'Bob Student',
        new Date(misalignedStart.getTime() + 15 * 60 * 1000),
      ),
    ),
  );
  const forgedBuckets = bookingData('bob');
  forgedBuckets.slotBuckets = [
    forgedBuckets.slotBuckets[0] + 10,
    forgedBuckets.slotBuckets[1] + 10,
  ];
  await seedExpiredBookingRequestLimit('bob');
  await assertFails(
    writeBookingRequest(
      bob,
      doc(bob, 'tutorBookings/forged-buckets'),
      forgedBuckets,
    ),
  );
  await seedExpiredBookingRequestLimit('bob');
  await assertSucceeds(writeBookingRequest(bob, bobBooking, bobRequest));
  const bobBookingLimit = doc(bob, 'tutorBookingLimits', 'bob');
  await assertSucceeds(getDoc(bobBookingLimit));
  await assertFails(getDoc(doc(alice, 'tutorBookingLimits', 'bob')));
  await assertFails(getDocs(collection(bob, 'tutorBookingLimits')));
  const tooSoonBooking = doc(collection(bob, 'tutorBookings'));
  await assertFails(
    writeBookingRequest(bob, tooSoonBooking, bookingData('bob')),
  );
  const forgedBookingLimit = writeBatch(bob);
  forgedBookingLimit.update(bobBookingLimit, {
    uid: 'bob',
    lastRequestAt: Timestamp.fromMillis(Date.now() - 10_000),
    bookingId: 'forged-reset',
  });
  await assertFails(forgedBookingLimit.commit());
  const deletedBookingLimit = writeBatch(bob);
  deletedBookingLimit.delete(bobBookingLimit);
  await assertFails(deletedBookingLimit.commit());

  await seedExpiredBookingRequestLimit('carol');
  const concurrentBookingA = doc(collection(carol, 'tutorBookings'));
  const concurrentBookingB = doc(collection(carol, 'tutorBookings'));
  const concurrentRequests = await Promise.allSettled([
    writeBookingRequest(
      carol,
      concurrentBookingA,
      bookingData('carol', 'Carol Student'),
    ),
    writeBookingRequest(
      carol,
      concurrentBookingB,
      bookingData('carol', 'Carol Student'),
    ),
  ]);
  assert.equal(
    concurrentRequests.filter(result => result.status === 'fulfilled').length,
    1,
    'only one concurrent request should consume the student permit',
  );

  const bobBookings = await assertSucceeds(
    getDocs(
      query(
        collection(bob, 'tutorBookings'),
        where('studentUid', '==', 'bob'),
        limit(100),
      ),
    ),
  );
  assert.equal(bobBookings.size, 1);
  await assertSucceeds(
    getDocs(
      query(
        collection(alice, 'tutorBookings'),
        where('tutorUid', '==', 'alice'),
        limit(100),
      ),
    ),
  );
  await assertFails(getDoc(doc(carol, 'tutorBookings', bobBooking.id)));
  await assertFails(
    getDocs(
      query(
        collection(carol, 'tutorBookings'),
        where('studentUid', '==', 'bob'),
        limit(100),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(bob, 'tutorBookings'),
        limit(100),
      ),
    ),
  );
  await assertFails(
    updateDoc(bobBooking, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    }),
  );
  const forgedSlotPath = writeBatch(alice);
  addSlotLocks(forgedSlotPath, alice, bobBooking.id, bobRequest);
  const firstBucket = bobRequest.slotBuckets[0];
  forgedSlotPath.set(
    doc(alice, 'sessionSlots', 'alice', 'slots', String(firstBucket + 10)),
    {
      bookingId: bobBooking.id,
      tutorUid: 'alice',
      studentUid: 'bob',
      slotBucket: firstBucket,
      startsAt: bobRequest.startsAt,
      createdAt: serverTimestamp(),
    },
  );
  forgedSlotPath.update(doc(alice, 'tutorBookings', bobBooking.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await assertFails(forgedSlotPath.commit());

  const acceptBob = writeBatch(alice);
  addSlotLocks(acceptBob, alice, bobBooking.id, bobRequest);
  acceptBob.update(doc(alice, 'tutorBookings', bobBooking.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(acceptBob.commit());
  for (const bucket of bobRequest.slotBuckets) {
    await assertSucceeds(
      getDoc(doc(bob, 'sessionSlots', 'alice', 'slots', String(bucket))),
    );
    await assertFails(
      getDoc(doc(carol, 'sessionSlots', 'alice', 'slots', String(bucket))),
    );
  }
  await assertSucceeds(
    writeBookingChat(
      bob,
      bobBooking.id,
      'bob',
      'Bob Student',
      'booking-chat-one',
      'I have a question about the session.',
    ),
  );
  await assertFails(
    writeBookingChat(
      bob,
      bobBooking.id,
      'bob',
      'Bob Student',
      'booking-chat-too-soon',
      'The booking chat has a short send cooldown.',
    ),
  );
  await new Promise(resolve => setTimeout(resolve, 1200));
  const bobChatPage = await assertSucceeds(
    getDocs(
      query(
        collection(bob, 'tutorBookings', bobBooking.id, 'chatMessages'),
        orderBy('sentAt', 'desc'),
        limit(50),
      ),
    ),
  );
  assert.equal(bobChatPage.size, 1);
  assert.equal(bobChatPage.docs[0].data().senderUid, 'bob');
  await assertSucceeds(
    getDocs(
      query(
        collection(alice, 'tutorBookings', bobBooking.id, 'chatMessages'),
        orderBy('sentAt', 'desc'),
        limit(50),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(bob, 'tutorBookings', bobBooking.id, 'chatMessages'),
        orderBy('sentAt', 'desc'),
        limit(51),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(carol, 'tutorBookings', bobBooking.id, 'chatMessages'),
        orderBy('sentAt', 'desc'),
        limit(50),
      ),
    ),
  );
  await assertFails(
    writeBookingChat(
      bob,
      bobBooking.id,
      'bob',
      'Impersonated Tutor',
      'booking-chat-spoofed-name',
      'A spoofed sender name should be rejected.',
    ),
  );
  await assertFails(
    updateDoc(
      doc(bob, 'tutorBookings', bobBooking.id, 'chatMessages', 'booking-chat-one'),
      { text: 'Edited after sending' },
    ),
  );
  await assertFails(
    getDoc(
      doc(bob, 'tutorBookings', bobBooking.id, 'chatWriteLimits', 'bob'),
    ),
  );
  await assertFails(
    updateDoc(bobBooking, {
      status: 'completed',
      updatedAt: serverTimestamp(),
    }),
  );

  const duplicateBooking = doc(collection(carol, 'tutorBookings'));
  const duplicateRequest = bookingData(
    'carol',
    'Carol Student',
    bobRequest.startsAt.toDate(),
  );
  await seedExpiredBookingRequestLimit('carol');
  await assertSucceeds(
    writeBookingRequest(carol, duplicateBooking, duplicateRequest),
  );
  const acceptDuplicate = writeBatch(alice);
  addSlotLocks(acceptDuplicate, alice, duplicateBooking.id, duplicateRequest);
  acceptDuplicate.update(doc(alice, 'tutorBookings', duplicateBooking.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await assertFails(acceptDuplicate.commit());

  const overlappingBooking = doc(collection(carol, 'tutorBookings'));
  const overlappingRequest = bookingData(
    'carol',
    'Carol Student',
    new Date(bobRequest.startsAt.toDate().getTime() + 30 * 60 * 1000),
  );
  await seedExpiredBookingRequestLimit('carol');
  await assertSucceeds(
    writeBookingRequest(carol, overlappingBooking, overlappingRequest),
  );
  const acceptOverlap = writeBatch(alice);
  addSlotLocks(acceptOverlap, alice, overlappingBooking.id, overlappingRequest);
  acceptOverlap.update(doc(alice, 'tutorBookings', overlappingBooking.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await assertFails(acceptOverlap.commit());

  const cancelBob = writeBatch(bob);
  removeSlotLocks(cancelBob, bob, bobRequest);
  cancelBob.update(bobBooking, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(cancelBob.commit());
  await assertFails(
    writeBookingChat(
      bob,
      bobBooking.id,
      'bob',
      'Bob Student',
      'cancelled-booking-message',
      'A cancelled session cannot send new messages.',
    ),
  );
  await assertFails(
    updateDoc(doc(carol, 'tutorBookings', bobBooking.id), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    }),
  );

  const futureCompletionBooking = doc(collection(bob, 'tutorBookings'));
  const futureCompletionRequest = bookingData('bob', 'Robert Student');
  await seedExpiredBookingRequestLimit('bob');
  await assertSucceeds(
    writeBookingRequest(bob, futureCompletionBooking, futureCompletionRequest),
  );
  const acceptFutureCompletion = writeBatch(alice);
  addSlotLocks(
    acceptFutureCompletion,
    alice,
    futureCompletionBooking.id,
    futureCompletionRequest,
  );
  acceptFutureCompletion.update(
    doc(alice, 'tutorBookings', futureCompletionBooking.id),
    {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    },
  );
  await assertSucceeds(acceptFutureCompletion.commit());
  const prematureCompletion = writeBatch(bob);
  removeSlotLocks(prematureCompletion, bob, futureCompletionRequest);
  prematureCompletion.update(futureCompletionBooking, {
    status: 'completed',
    updatedAt: serverTimestamp(),
  });
  await assertFails(prematureCompletion.commit());
  const stillUpcoming = await assertSucceeds(getDoc(futureCompletionBooking));
  assert.equal(stillUpcoming.data().status, 'accepted');

  const pastStartsAt = new Date(Date.now() - 60 * 60 * 1000);
  const pastCompletionRequest = bookingData(
    'bob',
    'Robert Student',
    pastStartsAt,
  );
  const completedBooking = doc(collection(bob, 'tutorBookings'));
  await environment.withSecurityRulesDisabled(async context => {
    const adminDb = context.firestore();
    const seededAt = Timestamp.fromDate(
      new Date(pastStartsAt.getTime() - 30 * 60 * 1000),
    );
    await setDoc(doc(adminDb, 'tutorBookings', completedBooking.id), {
      ...pastCompletionRequest,
      status: 'accepted',
      createdAt: seededAt,
      updatedAt: seededAt,
    });
    await Promise.all(
      ['alice', 'bob'].flatMap(participantUid =>
        pastCompletionRequest.slotBuckets.map(slotBucket =>
          setDoc(
            doc(adminDb, 'sessionSlots', participantUid, 'slots', String(slotBucket)),
            {
              bookingId: completedBooking.id,
              tutorUid: 'alice',
              studentUid: 'bob',
              slotBucket,
              startsAt: pastCompletionRequest.startsAt,
              createdAt: seededAt,
            },
          ),
        ),
      ),
    );
  });
  const completePastBooking = writeBatch(bob);
  removeSlotLocks(completePastBooking, bob, pastCompletionRequest);
  completePastBooking.update(completedBooking, {
    status: 'completed',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(completePastBooking.commit());
  await assertSucceeds(
    writeBookingChat(
      bob,
      completedBooking.id,
      'bob',
      'Robert Student',
      'completed-booking-message',
      'A completed session can keep its chat history.',
    ),
  );

  const declinedBooking = doc(collection(bob, 'tutorBookings'));
  await seedExpiredBookingRequestLimit('bob');
  await assertSucceeds(
    writeBookingRequest(
      bob,
      declinedBooking,
      bookingData('bob', 'Robert Student'),
    ),
  );
  await assertSucceeds(
    updateDoc(doc(alice, 'tutorBookings', declinedBooking.id), {
      status: 'declined',
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(declinedBooking, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    }),
  );

  const unverifiedBooking = doc(collection(unverified, 'tutorBookings'));
  await assertFails(
    writeBookingRequest(
      unverified,
      unverifiedBooking,
      bookingData('unverified'),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(unverified, 'tutorBookings'),
        where('studentUid', '==', 'unverified'),
        limit(100),
      ),
    ),
  );

  const groupAlice = doc(alice, 'studyGroups/calculus');
  const ownerMember = doc(alice, 'users/alice/studyGroupMemberships/calculus');
  const createGroup = writeBatch(alice);
  createGroup.set(groupAlice, {
    ownerUid: 'alice',
    name: 'Calculus Circle',
    subject: 'Calculus',
    meetup: '',
    meetupAt: null,
    room: 'C4C-CALC',
    memberCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  createGroup.set(ownerMember, {
    uid: 'alice',
    groupId: 'calculus',
    role: 'owner',
    joinedAt: serverTimestamp(),
  });
  await assertSucceeds(createGroup.commit());
  await assertSucceeds(getDoc(doc(bob, 'studyGroups/calculus')));
  const directoryPage = await assertSucceeds(
    getDocs(
      query(
        collection(alice, 'studyGroups'),
        orderBy('updatedAt', 'desc'),
        limit(20),
      ),
    ),
  );
  assert.equal(directoryPage.size, 1);
  await assertFails(
    getDocs(
      query(collection(alice, 'studyGroups'), orderBy('updatedAt', 'desc')),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(alice, 'studyGroups'),
        orderBy('updatedAt', 'desc'),
        limit(21),
      ),
    ),
  );
  const unverifiedState = doc(unverified, 'users/unverified/private/state');
  await assertSucceeds(setDoc(unverifiedState, stateFor('unverified')));
  await assertSucceeds(getDoc(unverifiedState));
  await assertFails(getDoc(doc(unverified, 'studyGroups/calculus')));
  await assertFails(getDocs(collection(unverified, 'studyGroups')));
  await assertFails(
    setDoc(doc(unverified, 'studyGroups/unverified-group'), {
      ownerUid: 'unverified',
      name: 'Unverified group',
      subject: 'Study',
    }),
  );
  await assertFails(
    getDoc(doc(bob, 'users/alice/studyGroupMemberships/calculus')),
  );
  await assertFails(
    getDocs(
      query(
        collection(bob, 'studyGroups/calculus/posts'),
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  const ownerExit = writeBatch(alice);
  ownerExit.delete(ownerMember);
  ownerExit.update(groupAlice, {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await assertFails(ownerExit.commit());
  await assertFails(getDocs(collection(anonymous, 'studyGroups')));

  const joinGroup = writeBatch(bob);
  joinGroup.set(doc(bob, 'users/bob/studyGroupMemberships/calculus'), {
    uid: 'bob',
    groupId: 'calculus',
    role: 'member',
    joinedAt: serverTimestamp(),
  });
  joinGroup.update(doc(bob, 'studyGroups/calculus'), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(joinGroup.commit());
  assert.equal((await getDoc(doc(alice, 'studyGroups/calculus'))).data().memberCount, 2);
  const aliceMemberships = await assertSucceeds(
    getDocs(collection(alice, 'users/alice/studyGroupMemberships')),
  );
  assert.equal(aliceMemberships.size, 1);
  assert.equal(
    aliceMemberships.docs[0].ref.path,
    'users/alice/studyGroupMemberships/calculus',
  );
  const bobMemberships = await assertSucceeds(
    getDocs(collection(bob, 'users/bob/studyGroupMemberships')),
  );
  assert.equal(bobMemberships.size, 1);
  await assertFails(
    setDoc(doc(carol, 'users/carol/studyGroupMemberships/calculus'), {
      uid: 'carol',
      groupId: 'calculus',
      role: 'member',
      joinedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    getDocs(collection(bob, 'users/alice/studyGroupMemberships')),
  );
  await assertFails(
    getDocs(
      query(collectionGroup(alice, 'members'), where('uid', '==', 'bob')),
    ),
  );
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(
      doc(context.firestore(), 'privateRecords/alice/members/alice'),
      { uid: 'alice', privateValue: 'must stay private' },
    );
  });
  await assertFails(
    getDocs(
      query(collectionGroup(alice, 'members'), where('uid', '==', 'alice')),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collectionGroup(alice, 'studyGroupMemberships'),
        where('uid', '==', 'alice'),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(unverified, 'users/unverified/studyGroupMemberships'),
        where('uid', '==', 'unverified'),
      ),
    ),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(bob, 'studyGroups/calculus/posts'),
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );

  const forbiddenPost = writeBatch(carol);
  forbiddenPost.set(doc(carol, 'studyGroups/calculus/posts/blocked'), {
    authorUid: 'carol',
    author: 'Carol',
    text: 'A non-member cannot post.',
    createdAt: serverTimestamp(),
    moderationStatus: 'visible',
  });
  forbiddenPost.update(doc(carol, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertFails(forbiddenPost.commit());

  const sharedPost = writeBatch(bob);
  sharedPost.set(doc(bob, 'studyGroups/calculus/posts/review'), {
    authorUid: 'bob',
    author: 'Bob',
    text: 'Share a study note.',
    createdAt: serverTimestamp(),
    moderationStatus: 'visible',
  });
  sharedPost.set(doc(bob, 'studyGroups/calculus/writeLimits/bob'), {
    uid: 'bob',
    lastWriteAt: serverTimestamp(),
    kind: 'post',
    writeId: 'review',
    postId: null,
  });
  sharedPost.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(sharedPost.commit());
  await assertFails(getDoc(doc(alice, 'studyGroups/calculus/writeLimits/bob')));

  const rateLimitedPost = writeBatch(bob);
  rateLimitedPost.set(doc(bob, 'studyGroups/calculus/posts/too-soon'), {
    authorUid: 'bob',
    author: 'Bob',
    text: 'This post is too soon.',
    createdAt: serverTimestamp(),
    moderationStatus: 'visible',
  });
  rateLimitedPost.set(
    doc(bob, 'studyGroups/calculus/writeLimits/bob'),
    {
      uid: 'bob',
      lastWriteAt: serverTimestamp(),
      kind: 'post',
      writeId: 'too-soon',
      postId: null,
    },
    { merge: true },
  );
  rateLimitedPost.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertFails(rateLimitedPost.commit());

  await assertFails(
    writeBatch(bob)
      .delete(doc(bob, 'studyGroups/calculus/writeLimits/bob'))
      .commit(),
  );
  const leaveDuringCooldown = writeBatch(bob);
  leaveDuringCooldown.delete(
    doc(bob, 'users/bob/studyGroupMemberships/calculus'),
  );
  leaveDuringCooldown.update(doc(bob, 'studyGroups/calculus'), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(leaveDuringCooldown.commit());
  const rejoinDuringCooldown = writeBatch(bob);
  rejoinDuringCooldown.set(
    doc(bob, 'users/bob/studyGroupMemberships/calculus'),
    {
      uid: 'bob',
      groupId: 'calculus',
      role: 'member',
      joinedAt: serverTimestamp(),
    },
  );
  rejoinDuringCooldown.update(doc(bob, 'studyGroups/calculus'), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(rejoinDuringCooldown.commit());
  const postAfterRejoin = writeBatch(bob);
  postAfterRejoin.set(doc(bob, 'studyGroups/calculus/posts/still-too-soon'), {
    authorUid: 'bob',
    author: 'Bob',
    text: 'Rejoining does not reset the cooldown.',
    createdAt: serverTimestamp(),
    moderationStatus: 'visible',
  });
  postAfterRejoin.set(
    doc(bob, 'studyGroups/calculus/writeLimits/bob'),
    {
      uid: 'bob',
      lastWriteAt: serverTimestamp(),
      kind: 'post',
      writeId: 'still-too-soon',
      postId: null,
    },
    { merge: true },
  );
  postAfterRejoin.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertFails(postAfterRejoin.commit());

  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'studyGroups/calculus/writeLimits/bob'), {
      uid: 'bob',
      lastWriteAt: Timestamp.fromMillis(Date.now() - 6000),
      kind: 'post',
      writeId: 'review',
      postId: null,
    });
  });

  const sharedReply = writeBatch(bob);
  sharedReply.set(
    doc(bob, 'studyGroups/calculus/posts/review/replies/answer'),
    {
      authorUid: 'bob',
      author: 'Bob',
      text: 'A reply for group members.',
      createdAt: serverTimestamp(),
      moderationStatus: 'visible',
    },
  );
  sharedReply.set(
    doc(bob, 'studyGroups/calculus/writeLimits/bob'),
    {
      uid: 'bob',
      lastWriteAt: serverTimestamp(),
      kind: 'reply',
      writeId: 'answer',
      postId: 'review',
    },
    { merge: true },
  );
  sharedReply.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(sharedReply.commit());
  assert.equal(
    (
      await getDocs(
        query(
          collection(alice, 'studyGroups/calculus/posts'),
          where('moderationStatus', '==', 'visible'),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
      )
    ).size,
    1,
  );
  const postCollection = collection(bob, 'studyGroups/calculus/posts');
  const firstPostPage = await assertSucceeds(
    getDocs(
      query(
        postCollection,
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(1),
      ),
    ),
  );
  assert.equal(firstPostPage.size, 1);
  const nextPostPage = await assertSucceeds(
    getDocs(
      query(
        postCollection,
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        startAfter(firstPostPage.docs[0]),
        limit(1),
      ),
    ),
  );
  assert.equal(nextPostPage.size, 0);
  const replyPage = await assertSucceeds(
    getDocs(
      query(
        collection(bob, 'studyGroups/calculus/posts/review/replies'),
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(1),
      ),
    ),
  );
  assert.equal(replyPage.size, 1);
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(
      doc(context.firestore(), 'studyGroups/calculus/writeLimits/bob'),
      {
        uid: 'bob',
        lastWriteAt: Timestamp.fromMillis(Date.now() - 6000),
        kind: 'reply',
        writeId: 'answer',
        postId: 'review',
      },
    );
  });
  const selfReport = writeBatch(bob);
  selfReport.set(
    doc(bob, 'studyGroups/calculus/moderationReports/report-self'),
    {
      targetType: 'post',
      targetId: 'review',
      postId: null,
      targetAuthor: 'Bob',
      contentSnapshot: 'Share a study note.',
      reason: 'spam',
      status: 'open',
      createdAt: serverTimestamp(),
      resolvedAt: null,
    },
  );
  selfReport.set(
    doc(bob, 'studyGroups/calculus/writeLimits/bob'),
    {
      uid: 'bob',
      lastWriteAt: serverTimestamp(),
      kind: 'report',
      writeId: 'report-self',
      postId: null,
    },
    { merge: true },
  );
  await assertFails(selfReport.commit());

  const reportRef = doc(
    alice,
    'studyGroups/calculus/moderationReports/report-review',
  );
  const reportPost = writeBatch(alice);
  reportPost.set(reportRef, {
    targetType: 'post',
    targetId: 'review',
    postId: null,
    targetAuthor: 'Bob',
    contentSnapshot: 'Share a study note.',
    reason: 'abuse',
    status: 'open',
    createdAt: serverTimestamp(),
    resolvedAt: null,
  });
  reportPost.set(doc(alice, 'studyGroups/calculus/writeLimits/alice'), {
    uid: 'alice',
    lastWriteAt: serverTimestamp(),
    kind: 'report',
    writeId: 'report-review',
    postId: null,
  });
  await assertSucceeds(reportPost.commit());
  const reportTooSoon = writeBatch(alice);
  reportTooSoon.set(
    doc(alice, 'studyGroups/calculus/moderationReports/report-too-soon'),
    {
      targetType: 'post',
      targetId: 'review',
      postId: null,
      targetAuthor: 'Bob',
      contentSnapshot: 'Share a study note.',
      reason: 'spam',
      status: 'open',
      createdAt: serverTimestamp(),
      resolvedAt: null,
    },
  );
  reportTooSoon.set(
    doc(alice, 'studyGroups/calculus/writeLimits/alice'),
    {
      uid: 'alice',
      lastWriteAt: serverTimestamp(),
      kind: 'report',
      writeId: 'report-too-soon',
      postId: null,
    },
    { merge: true },
  );
  await assertFails(reportTooSoon.commit());
  await assertFails(
    getDoc(doc(bob, 'studyGroups/calculus/moderationReports/report-review')),
  );
  await assertFails(
    getDocs(
      query(
        collection(bob, 'studyGroups/calculus/moderationReports'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  const ownerReports = await assertSucceeds(
    getDocs(
      query(
        collection(alice, 'studyGroups/calculus/moderationReports'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  assert.equal(ownerReports.size, 1);
  assert.equal(Object.hasOwn(ownerReports.docs[0].data(), 'reporterUid'), false);

  const hideReportedPost = writeBatch(alice);
  hideReportedPost.update(doc(alice, 'studyGroups/calculus/posts/review'), {
    moderationStatus: 'hidden',
    moderatedAt: serverTimestamp(),
  });
  hideReportedPost.update(reportRef, {
    status: 'hidden',
    resolvedAt: serverTimestamp(),
  });
  await assertSucceeds(hideReportedPost.commit());
  await assertFails(getDoc(doc(bob, 'studyGroups/calculus/posts/review')));
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'studyGroups/calculus/writeLimits/bob'), {
      uid: 'bob',
      lastWriteAt: Timestamp.fromMillis(Date.now() - 6000),
      kind: 'reply',
      writeId: 'reply-to-hidden-post',
      postId: 'review',
    });
  });
  const replyToHiddenPost = writeBatch(bob);
  replyToHiddenPost.set(
    doc(bob, 'studyGroups/calculus/posts/review/replies/reply-to-hidden-post'),
    {
      authorUid: 'bob',
      author: 'Bob',
      text: 'This reply should be denied because its post is hidden.',
      createdAt: serverTimestamp(),
      moderationStatus: 'visible',
    },
  );
  replyToHiddenPost.set(
    doc(bob, 'studyGroups/calculus/writeLimits/bob'),
    {
      uid: 'bob',
      lastWriteAt: serverTimestamp(),
      kind: 'reply',
      writeId: 'reply-to-hidden-post',
      postId: 'review',
    },
    { merge: true },
  );
  replyToHiddenPost.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertFails(replyToHiddenPost.commit());
  assert.equal(
    (
      await assertSucceeds(
        getDocs(
          query(
            collection(bob, 'studyGroups/calculus/posts'),
            where('moderationStatus', '==', 'visible'),
            orderBy('createdAt', 'desc'),
            limit(20),
          ),
        ),
      )
    ).size,
    0,
  );

  const restoreReportedPost = writeBatch(alice);
  restoreReportedPost.update(doc(alice, 'studyGroups/calculus/posts/review'), {
    moderationStatus: 'visible',
    moderatedAt: serverTimestamp(),
  });
  restoreReportedPost.update(reportRef, {
    status: 'restored',
    resolvedAt: serverTimestamp(),
  });
  await assertSucceeds(restoreReportedPost.commit());
  assert.equal(
    (
      await getDocs(
        query(
          collection(bob, 'studyGroups/calculus/posts'),
          where('moderationStatus', '==', 'visible'),
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
      )
    ).size,
    1,
  );

  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'studyGroups/calculus/writeLimits/alice'), {
      uid: 'alice',
      lastWriteAt: Timestamp.fromMillis(Date.now() - 6000),
      kind: 'report',
      writeId: 'report-review',
      postId: null,
    });
  });
  const replyReportRef = doc(
    alice,
    'studyGroups/calculus/moderationReports/report-answer',
  );
  const reportReply = writeBatch(alice);
  reportReply.set(replyReportRef, {
    targetType: 'reply',
    targetId: 'answer',
    postId: 'review',
    targetAuthor: 'Bob',
    contentSnapshot: 'A reply for group members.',
    reason: 'spam',
    status: 'open',
    createdAt: serverTimestamp(),
    resolvedAt: null,
  });
  reportReply.set(
    doc(alice, 'studyGroups/calculus/writeLimits/alice'),
    {
      uid: 'alice',
      lastWriteAt: serverTimestamp(),
      kind: 'report',
      writeId: 'report-answer',
      postId: 'review',
    },
    { merge: true },
  );
  await assertSucceeds(reportReply.commit());
  const hideReportedReply = writeBatch(alice);
  hideReportedReply.update(
    doc(alice, 'studyGroups/calculus/posts/review/replies/answer'),
    { moderationStatus: 'hidden', moderatedAt: serverTimestamp() },
  );
  hideReportedReply.update(replyReportRef, {
    status: 'hidden',
    resolvedAt: serverTimestamp(),
  });
  await assertSucceeds(hideReportedReply.commit());
  await assertFails(
    getDoc(doc(bob, 'studyGroups/calculus/posts/review/replies/answer')),
  );
  const restoreReportedReply = writeBatch(alice);
  restoreReportedReply.update(
    doc(alice, 'studyGroups/calculus/posts/review/replies/answer'),
    { moderationStatus: 'visible', moderatedAt: serverTimestamp() },
  );
  restoreReportedReply.update(replyReportRef, {
    status: 'restored',
    resolvedAt: serverTimestamp(),
  });
  await assertSucceeds(restoreReportedReply.commit());

  await assertFails(
    getDocs(
      query(
        collection(carol, 'studyGroups/calculus/posts'),
        where('moderationStatus', '==', 'visible'),
        limit(1),
      ),
    ),
  );
  await assertFails(
    setDoc(doc(bob, 'users/alice/studyGroupMemberships/calculus'), {
      uid: 'bob',
      groupId: 'calculus',
      role: 'owner',
      joinedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    getDocs(
      query(
        collection(carol, 'studyGroups/calculus/posts'),
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(carol, 'studyGroups/calculus/posts/review/replies'),
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  await assertFails(
    setDoc(
      doc(carol, 'studyGroups/calculus/posts/review/replies/blocked'),
      {
        authorUid: 'carol',
        author: 'Carol',
        text: 'A non-member cannot reply.',
        createdAt: serverTimestamp(),
        moderationStatus: 'visible',
      },
    ),
  );
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'studyGroups/calculus/writeLimits/bob'), {
      uid: 'bob',
      lastWriteAt: Timestamp.fromMillis(Date.now() - 6000),
      kind: 'reply',
      writeId: 'answer',
      postId: 'review',
    });
    await setDoc(doc(context.firestore(), 'studyGroups/calculus/writeLimits/alice'), {
      uid: 'alice',
      lastWriteAt: Timestamp.fromMillis(Date.now() - 6000),
      kind: 'report',
      writeId: 'report-answer',
      postId: 'review',
    });
  });
  await assertSucceeds(
    writeGroupChat(
      bob,
      'calculus',
      'bob',
      'Bob Student',
      'group-chat-one',
      'This is a delivered group message.',
    ),
  );
  await assertFails(
    writeGroupChat(
      bob,
      'calculus',
      'bob',
      'Bob Student',
      'group-chat-too-soon',
      'The group chat cooldown applies to messages.',
    ),
  );
  const groupChatMessages = collection(bob, 'studyGroups/calculus/chatMessages');
  const groupChatQuery = () =>
    query(
      groupChatMessages,
      where('moderationStatus', '==', 'visible'),
      orderBy('sentAt', 'desc'),
      limit(50),
    );
  assert.equal((await assertSucceeds(getDocs(groupChatQuery()))).size, 1);
  await assertFails(
    getDocs(
      query(
        collection(carol, 'studyGroups/calculus/chatMessages'),
        where('moderationStatus', '==', 'visible'),
        orderBy('sentAt', 'desc'),
        limit(50),
      ),
    ),
  );
  await assertFails(
    getDocs(collection(bob, 'studyGroups/calculus/chatMessages')),
  );
  await assertFails(
    getDocs(
      query(
        groupChatMessages,
        where('moderationStatus', '==', 'visible'),
        orderBy('sentAt', 'desc'),
        limit(51),
      ),
    ),
  );
  await assertFails(
    updateDoc(
      doc(bob, 'studyGroups/calculus/chatMessages/group-chat-one'),
      { text: 'Changed after sending' },
    ),
  );

  const chatReportRef = doc(
    alice,
    'studyGroups/calculus/moderationReports/report-chat-message',
  );
  const reportChatMessage = writeBatch(alice);
  reportChatMessage.set(chatReportRef, {
    targetType: 'chatMessage',
    targetId: 'group-chat-one',
    postId: null,
    targetAuthor: 'Bob Student',
    contentSnapshot: 'This is a delivered group message.',
    reason: 'abuse',
    status: 'open',
    createdAt: serverTimestamp(),
    resolvedAt: null,
  });
  reportChatMessage.set(
    doc(alice, 'studyGroups/calculus/writeLimits/alice'),
    {
      uid: 'alice',
      lastWriteAt: serverTimestamp(),
      kind: 'report',
      writeId: 'report-chat-message',
      postId: null,
    },
    { merge: true },
  );
  await assertSucceeds(reportChatMessage.commit());
  const hideChatMessage = writeBatch(alice);
  hideChatMessage.update(
    doc(alice, 'studyGroups/calculus/chatMessages/group-chat-one'),
    { moderationStatus: 'hidden', moderatedAt: serverTimestamp() },
  );
  hideChatMessage.update(chatReportRef, {
    status: 'hidden',
    resolvedAt: serverTimestamp(),
  });
  await assertSucceeds(hideChatMessage.commit());
  await assertFails(
    getDoc(doc(bob, 'studyGroups/calculus/chatMessages/group-chat-one')),
  );
  const restoreChatMessage = writeBatch(alice);
  restoreChatMessage.update(
    doc(alice, 'studyGroups/calculus/chatMessages/group-chat-one'),
    { moderationStatus: 'visible', moderatedAt: serverTimestamp() },
  );
  restoreChatMessage.update(chatReportRef, {
    status: 'restored',
    resolvedAt: serverTimestamp(),
  });
  await assertSucceeds(restoreChatMessage.commit());

  const leaveGroup = writeBatch(bob);
  leaveGroup.delete(doc(bob, 'users/bob/studyGroupMemberships/calculus'));
  leaveGroup.update(doc(bob, 'studyGroups/calculus'), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(leaveGroup.commit());
  assert.equal((await getDoc(groupAlice)).data().memberCount, 1);
  await assertFails(
    getDocs(
      query(
        collection(bob, 'studyGroups/calculus/posts'),
        where('moderationStatus', '==', 'visible'),
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  await assertFails(
    getDoc(doc(bob, 'studyGroups/calculus/chatMessages/group-chat-one')),
  );

  const offlineStudent = environment
    .authenticatedContext('offline-student', verifiedClaims)
    .firestore();
  const offlineState = doc(
    offlineStudent,
    'users/offline-student/private/state',
  );
  await disableNetwork(offlineStudent);
  let unsubscribeOfflineState = () => {};
  let timeoutId;
  let writeState = 'pending';
  const offlineSnapshot = new Promise((resolve, reject) => {
    unsubscribeOfflineState = onSnapshot(
      offlineState,
      { includeMetadataChanges: true },
      snapshot => {
        if (snapshot.exists() && snapshot.metadata.hasPendingWrites) {
          resolve(snapshot.data());
        }
      },
      reject,
    );
  });
  const localTimeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Firestore did not expose its offline local write.')),
      5000,
    );
  });
  const offlineWrite = setDoc(
    offlineState,
    stateFor('offline-student'),
  ).then(
    () => {
      writeState = 'acknowledged';
    },
    () => {
      writeState = 'rejected';
    },
  );
  try {
    const localValue = await Promise.race([offlineSnapshot, localTimeout]);
    clearTimeout(timeoutId);
    assert.equal(localValue.state.profile.id, 'offline-student');
    assert.equal(writeState, 'pending');
  } finally {
    clearTimeout(timeoutId);
    unsubscribeOfflineState();
    await enableNetwork(offlineStudent);
  }
  await offlineWrite;
  assert.equal(writeState, 'acknowledged');

  console.log('Firestore rules and offline persistence passed: private account state and note messages, tutor listings and session chat, verified group membership/chat, bounded feeds, cooldowns, owner moderation, and locally visible pending writes are covered.');
} finally {
  await environment.cleanup();
}
