import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as firestore from 'firebase/firestore';

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
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const filename = fileURLToPath(
  new URL('../src/features/groups/data/firestore.js', import.meta.url),
);
const code = transformSync(await readFile(filename, 'utf8'), {
  filename,
  babelrc: false,
  configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;
const clients = new Map();
// Execute the actual app adapter; substitute only the Android auth/service bridge.
const adapterModule = new Module(filename);
adapterModule.filename = filename;
adapterModule.paths = Module._nodeModulePaths(
  fileURLToPath(new URL('../src/features/groups/data', import.meta.url)),
);
const originalRequire = adapterModule.require.bind(adapterModule);
adapterModule.require = specifier =>
  specifier.endsWith('/shared/backend/firebase')
    ? { firebaseServicesForUser: uid => ({ db: clients.get(uid), firestore }) }
    : originalRequire(specifier);
adapterModule._compile(code, filename);
const { syncSharedGroupAction: sync } = adapterModule.exports;
const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} = firestore;
const groupId = 'client-adapter-group';
async function expirePermit(uid) {
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(
      doc(context.firestore(), 'studyGroups', groupId, 'writeLimits', uid),
      {
        lastWriteAt: Timestamp.fromMillis(Date.now() - 10000),
      },
    );
  });
}

try {
  await environment.clearFirestore();
  for (const uid of ['owner', 'member', 'outsider']) {
    clients.set(
      uid,
      environment
        .authenticatedContext(uid, { email_verified: true })
        .firestore(),
    );
  }
  const owner = clients.get('owner');
  const member = clients.get('member');
  const outsider = clients.get('outsider');
  const ownerProfile = { name: 'Group Owner' };
  const memberProfile = { name: 'Group Member' };
  await assertSucceeds(
    sync('owner', ownerProfile, {
      type: 'createGroup',
      group: {
        id: groupId,
        name: 'Client Adapter Group',
        subject: 'Calculus',
        room: 'QA',
      },
    }),
  );
  await assertSucceeds(
    sync('member', memberProfile, {
      type: 'membership',
      groupId,
      joined: true,
    }),
  );
  const post = {
    type: 'post',
    groupId,
    post: { id: 'post-one', text: 'An actual client post.' },
  };
  const reply = {
    type: 'reply',
    groupId,
    postId: 'post-one',
    reply: { id: 'reply-one', text: 'An actual client reply.' },
  };
  const report = {
    type: 'report',
    groupId,
    report: {
      id: 'report-one',
      targetType: 'post',
      targetId: 'post-one',
      postId: null,
      targetAuthor: 'Group Owner',
      contentSnapshot: post.post.text,
      reason: 'spam',
    },
  };
  await assertSucceeds(sync('owner', ownerProfile, post));
  await assertSucceeds(sync('owner', ownerProfile, post));
  assert.equal(
    (
      await getDoc(doc(member, 'studyGroups', groupId, 'posts', 'post-one'))
    ).data().text,
    post.post.text,
  );
  await assertSucceeds(sync('member', memberProfile, reply));
  await assertSucceeds(sync('member', memberProfile, reply));
  await expirePermit('member');
  await assertSucceeds(sync('member', memberProfile, report));
  const reportRef = doc(
    owner,
    'studyGroups',
    groupId,
    'moderationReports',
    'report-one',
  );
  assert.equal((await getDoc(reportRef)).data().reporterUid, undefined);
  await assertFails(
    getDoc(
      doc(member, 'studyGroups', groupId, 'moderationReports', 'report-one'),
    ),
  );
  await assertSucceeds(
    sync('owner', ownerProfile, {
      type: 'moderateReport',
      groupId,
      reportId: 'report-one',
      resolution: 'hidden',
    }),
  );
  await assertFails(
    getDoc(doc(member, 'studyGroups', groupId, 'posts', 'post-one')),
  );
  // Acknowledgement remains private and readable even after moderation or leaving.
  await assertSucceeds(sync('owner', ownerProfile, post));
  await assertSucceeds(sync('member', memberProfile, reply));
  await assertSucceeds(sync('member', memberProfile, report));
  assert.equal((await getDoc(reportRef)).data().status, 'hidden');
  await assertSucceeds(
    sync('owner', ownerProfile, {
      type: 'moderateReport',
      groupId,
      reportId: 'report-one',
      resolution: 'restored',
    }),
  );
  await expirePermit('member');
  await assertSucceeds(
    sync('member', memberProfile, {
      ...reply,
      reply: { id: 'reply-two', text: 'A later contribution.' },
    }),
  );
  await assertSucceeds(
    sync('member', memberProfile, {
      type: 'membership',
      groupId,
      joined: false,
    }),
  );
  await assertSucceeds(sync('member', memberProfile, reply));
  const receipts = await getDocs(
    collection(member, 'users', 'member', 'groupActionReceipts'),
  );
  assert.equal(receipts.size, 3);
  const receiptId = receipts.docs[0].id;
  await assertFails(
    getDoc(doc(outsider, 'users', 'member', 'groupActionReceipts', receiptId)),
  );
  await assertFails(
    getDocs(collection(outsider, 'users', 'member', 'groupActionReceipts')),
  );
  await assertFails(
    updateDoc(
      doc(member, 'users', 'member', 'groupActionReceipts', receiptId),
      { kind: 'post' },
    ),
  );
  await assertFails(
    deleteDoc(doc(member, 'users', 'member', 'groupActionReceipts', receiptId)),
  );
  await assertFails(
    setDoc(doc(member, 'users', 'member', 'groupActionReceipts', 'forged'), {
      groupId,
      kind: 'report',
      writeId: 'not-sent',
      postId: null,
      createdAt: serverTimestamp(),
    }),
  );
  console.log(
    'Actual group client adapter passed: post/reply/report creation, retry after moderation or leaving, owner-only reports, private immutable receipts, and forgery denial.',
  );
} finally {
  await environment.cleanup();
}
