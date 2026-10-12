import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  applyActionCode,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdToken,
  getIdTokenResult,
  inMemoryPersistence,
  initializeAuth,
  reload,
  sendEmailVerification,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const projectId = 'demo-campus4change-rules';
const authAddress = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const firestoreAddress =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [authHost, authPort] = authAddress.split(':');
const [firestoreHost, firestorePort] = firestoreAddress.split(':');
const app = initializeApp(
  {
    apiKey: 'demo-api-key',
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    appId: '1:1234567890:web:campus4change-auth-test',
  },
  `auth-verification-${process.pid}-${Date.now()}`,
);
const auth = initializeAuth(app, { persistence: inMemoryPersistence });
const firestore = getFirestore(app);
connectAuthEmulator(auth, `http://${authAddress}`, { disableWarnings: true });
connectFirestoreEmulator(
  firestore,
  firestoreHost,
  Number(firestorePort),
);

let user;
let privateState;

try {
  const email = `verification-${Date.now()}-${process.pid}@example.test`;
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    'TestPassword123',
  );
  user = credential.user;
  assert.equal(user.emailVerified, false);

  privateState = doc(firestore, 'users', user.uid, 'private', 'state');
  await setDoc(privateState, {
    state: {
      version: 1,
      updatedAt: Date.now(),
      profile: { id: user.uid },
    },
    updatedAt: serverTimestamp(),
  });
  await assert.rejects(
    getDoc(doc(firestore, 'studyGroups', 'verification-check')),
    error => error?.code === 'permission-denied',
  );

  await sendEmailVerification(user);
  const response = await fetch(
    `http://${authAddress}/emulator/v1/projects/${projectId}/oobCodes`,
  );
  assert.equal(response.ok, true, 'Auth emulator should expose OOB codes');
  const { oobCodes = [] } = await response.json();
  const verificationCode = oobCodes
    .filter(code => code.email === email && code.requestType === 'VERIFY_EMAIL')
    .at(-1);
  assert.ok(verificationCode?.oobCode, 'verification email code should exist');

  await applyActionCode(auth, verificationCode.oobCode);
  await reload(user);
  assert.equal(user.emailVerified, true);
  await getIdToken(user, true);
  const token = await getIdTokenResult(user);
  assert.equal(token.claims.email_verified, true);
  await getDoc(doc(firestore, 'studyGroups', 'verification-check'));

  console.log(
    'Firebase Auth emulator passed: private state stays owner-only before verification; a refreshed verified claim unlocks shared group reads.',
  );
} finally {
  if (privateState && user) {
    await deleteDoc(privateState).catch(() => {});
  }
  if (user) {
    await deleteUser(user).catch(() => {});
  }
  await deleteApp(app);
}
