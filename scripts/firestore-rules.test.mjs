import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
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
  writeBatch,
} from 'firebase/firestore';

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
  const alice = environment.authenticatedContext('alice').firestore();
  const bob = environment.authenticatedContext('bob').firestore();
  const carol = environment.authenticatedContext('carol').firestore();
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
  const ownerMember = doc(alice, 'studyGroups/calculus/members/alice');
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
    role: 'owner',
    joinedAt: serverTimestamp(),
  });
  await assertSucceeds(createGroup.commit());
  await assertSucceeds(getDoc(doc(bob, 'studyGroups/calculus')));
  await assertFails(getDoc(doc(bob, 'studyGroups/calculus/members/alice')));
  await assertFails(
    getDocs(collection(bob, 'studyGroups/calculus/posts')),
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
  joinGroup.set(doc(bob, 'studyGroups/calculus/members/bob'), {
    uid: 'bob',
    role: 'member',
    joinedAt: serverTimestamp(),
  });
  joinGroup.update(doc(bob, 'studyGroups/calculus'), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(joinGroup.commit());
  assert.equal((await getDoc(doc(alice, 'studyGroups/calculus'))).data().memberCount, 2);
  await assertSucceeds(
    getDocs(collection(bob, 'studyGroups/calculus/posts')),
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
  sharedPost.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(sharedPost.commit());

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
  sharedReply.update(doc(bob, 'studyGroups/calculus'), {
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(sharedReply.commit());
  assert.equal(
    (await getDocs(collection(alice, 'studyGroups/calculus/posts'))).size,
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
    setDoc(doc(bob, 'studyGroups/calculus/members/alice'), {
      uid: 'bob',
      role: 'owner',
      joinedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    getDocs(collection(carol, 'studyGroups/calculus/posts')),
  );
  await assertFails(
    getDocs(
      collection(carol, 'studyGroups/calculus/posts/review/replies'),
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
  leaveGroup.delete(doc(bob, 'studyGroups/calculus/members/bob'));
  leaveGroup.update(doc(bob, 'studyGroups/calculus'), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(leaveGroup.commit());
  assert.equal((await getDoc(groupAlice)).data().memberCount, 1);
  await assertFails(
    getDocs(collection(bob, 'studyGroups/calculus/posts')),
  );

  console.log('Firestore rules passed: private state, memberships, member content, and bounded feed queries are scoped.');
} finally {
  await environment.cleanup();
}
