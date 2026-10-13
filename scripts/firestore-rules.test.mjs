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
          orderBy('createdAt', 'desc'),
          limit(20),
        ),
      )
    ).size,
    1,
  );
  const postCollection = collection(bob, 'studyGroups/calculus/posts');
  const firstPostPage = await assertSucceeds(
    getDocs(query(postCollection, orderBy('createdAt', 'desc'), limit(1))),
  );
  assert.equal(firstPostPage.size, 1);
  const nextPostPage = await assertSucceeds(
    getDocs(
      query(
        postCollection,
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
        orderBy('createdAt', 'desc'),
        limit(1),
      ),
    ),
  );
  assert.equal(replyPage.size, 1);
  await assertFails(
    getDocs(query(collection(carol, 'studyGroups/calculus/posts'), limit(1))),
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
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );
  await assertFails(
    getDocs(
      query(
        collection(carol, 'studyGroups/calculus/posts/review/replies'),
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
        orderBy('createdAt', 'desc'),
        limit(20),
      ),
    ),
  );

  console.log('Firestore rules passed: private state, verified shared access, bounded member feeds, contribution cooldowns, and membership are scoped.');
} finally {
  await environment.cleanup();
}
