import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

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

  console.log('Firestore rules passed: owner access works; other access is denied.');
} finally {
  await environment.cleanup();
}
