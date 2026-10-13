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
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
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
  const bob = environment.authenticatedContext('bob', verifiedClaims).firestore();
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

  const aliceTutorProfile = doc(alice, 'tutorProfiles/alice');
  const tutorProfile = {
    uid: 'alice',
    name: 'Alice Student',
    course: 'BS Mathematics',
    year: '3rd Year',
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
  const addSlotLocks = (batch, db, bookingId, booking) => {
    booking.slotBuckets.forEach(slotBucket => {
      batch.set(
        doc(db, 'tutorSlots', booking.tutorUid, 'slots', String(slotBucket)),
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
  };
  const bobBooking = doc(collection(bob, 'tutorBookings'));
  const bobRequest = bookingData('bob');
  await assertFails(
    setDoc(doc(bob, 'tutorBookings/invalid-subject'), {
      ...bookingData('bob'),
      subject: 'Chemistry',
    }),
  );
  await assertFails(
    setDoc(doc(alice, 'tutorBookings/self-booking'), bookingData('alice')),
  );
  const misalignedStart = nextFutureHalfHour();
  await assertFails(
    setDoc(
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
  await assertFails(
    setDoc(doc(bob, 'tutorBookings/forged-buckets'), forgedBuckets),
  );
  await assertSucceeds(setDoc(bobBooking, bobRequest));
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
  const firstBucket = bobRequest.slotBuckets[0];
  const secondBucket = bobRequest.slotBuckets[1];
  forgedSlotPath.set(
    doc(alice, 'tutorSlots', 'alice', 'slots', String(firstBucket + 10)),
    {
      bookingId: bobBooking.id,
      tutorUid: 'alice',
      studentUid: 'bob',
      slotBucket: firstBucket,
      startsAt: bobRequest.startsAt,
      createdAt: serverTimestamp(),
    },
  );
  forgedSlotPath.set(
    doc(alice, 'tutorSlots', 'alice', 'slots', String(secondBucket)),
    {
      bookingId: bobBooking.id,
      tutorUid: 'alice',
      studentUid: 'bob',
      slotBucket: secondBucket,
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
      getDoc(doc(bob, 'tutorSlots', 'alice', 'slots', String(bucket))),
    );
    await assertFails(
      getDoc(doc(carol, 'tutorSlots', 'alice', 'slots', String(bucket))),
    );
  }
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
  await assertSucceeds(setDoc(duplicateBooking, duplicateRequest));
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
  await assertSucceeds(setDoc(overlappingBooking, overlappingRequest));
  const acceptOverlap = writeBatch(alice);
  addSlotLocks(acceptOverlap, alice, overlappingBooking.id, overlappingRequest);
  acceptOverlap.update(doc(alice, 'tutorBookings', overlappingBooking.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await assertFails(acceptOverlap.commit());

  const cancelBob = writeBatch(bob);
  bobRequest.slotBuckets.forEach(slotBucket =>
    cancelBob.delete(
      doc(bob, 'tutorSlots', 'alice', 'slots', String(slotBucket)),
    ),
  );
  cancelBob.update(bobBooking, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(cancelBob.commit());
  await assertFails(
    updateDoc(doc(carol, 'tutorBookings', bobBooking.id), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    }),
  );

  const completedBooking = doc(collection(bob, 'tutorBookings'));
  const completedRequest = bookingData('bob', 'Robert Student');
  await assertSucceeds(setDoc(completedBooking, completedRequest));
  const acceptCompleted = writeBatch(alice);
  addSlotLocks(acceptCompleted, alice, completedBooking.id, completedRequest);
  acceptCompleted.update(doc(alice, 'tutorBookings', completedBooking.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(acceptCompleted.commit());
  const completeBooking = writeBatch(bob);
  completedRequest.slotBuckets.forEach(slotBucket =>
    completeBooking.delete(
      doc(bob, 'tutorSlots', 'alice', 'slots', String(slotBucket)),
    ),
  );
  completeBooking.update(completedBooking, {
    status: 'completed',
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(completeBooking.commit());

  const declinedBooking = doc(collection(bob, 'tutorBookings'));
  await assertSucceeds(
    setDoc(declinedBooking, bookingData('bob', 'Robert Student')),
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
  await assertFails(setDoc(unverifiedBooking, bookingData('unverified')));
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

  console.log('Firestore rules passed: private state, tutor listings and requests, verified groups, bounded feeds, cooldowns, membership, and owner moderation are scoped.');
} finally {
  await environment.cleanup();
}
