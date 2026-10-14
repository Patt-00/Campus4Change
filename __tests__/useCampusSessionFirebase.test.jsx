import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { makeQaState } from '../test-support/qaState';
import { useCampusSession } from '../src/shared/state/useCampusSession';

let mockFirebaseObserver;
let mockNativeActiveUser;
let mockCloudStateForUser;
let mockLocalStateForUser;
const mockUnsubscribe = jest.fn();
const mockStore = {
  biometricSignIn: jest.fn(),
  enableBiometrics: jest.fn(),
  loadState: jest.fn(),
  saveState: jest.fn(),
  setActiveUser: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};
const mockLoadCloudState = jest.fn();
const mockSaveCloudState = jest.fn();

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseEnabled: true,
  firebaseCheckEmailVerification: jest.fn(),
  firebaseGoogleSignIn: jest.fn(),
  firebaseGoogleSignInAvailable: jest.fn(() => false),
  firebasePasswordReset: jest.fn(),
  firebaseResendVerificationEmail: jest.fn(),
  firebaseSignIn: jest.fn(),
  firebaseSignOut: jest.fn(),
  firebaseSignUp: jest.fn(),
  loadCloudState: (...args) => mockLoadCloudState(...args),
  saveCloudState: (...args) => mockSaveCloudState(...args),
  watchFirebaseUser: (onUser, onError) => {
    mockFirebaseObserver = { onUser, onError };
    return mockUnsubscribe;
  },
}));

jest.mock('../src/shared/state/storage', () => ({
  deviceStore: () => mockStore,
  parseAccount: value => value,
  parseState: value => JSON.parse(value),
}));

let currentSession;
let renderer;

function Harness() {
  currentSession = useCampusSession({
    onSignedIn: jest.fn(),
    onSignedOut: jest.fn(),
  });
  return null;
}

async function flush() {
  for (let index = 0; index < 8; index += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

async function render() {
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
    await flush();
  });
  expect(mockFirebaseObserver?.onUser).toBeDefined();
}

function firebaseUser(id) {
  return {
    id,
    uid: id,
    name: `Student ${id}`,
    email: `${id}@example.test`,
    emailVerified: true,
    studentId: '',
  };
}

beforeEach(() => {
  mockFirebaseObserver = null;
  mockNativeActiveUser = null;
  mockCloudStateForUser = new Map();
  mockLocalStateForUser = new Map();
  mockStore.setActiveUser.mockImplementation(async uid => {
    mockNativeActiveUser = uid;
    return true;
  });
  mockStore.loadState.mockImplementation(async uid => {
    if (mockNativeActiveUser !== uid) {
      throw new Error('The active account changed before load.');
    }
    return mockLocalStateForUser.get(uid) ?? null;
  });
  mockStore.saveState.mockImplementation(async (uid, value) => {
    if (mockNativeActiveUser !== uid) {
      throw new Error('The active account changed before save.');
    }
    mockLocalStateForUser.set(uid, value);
    return true;
  });
  mockStore.signOut.mockImplementation(async uid => {
    if (mockNativeActiveUser !== uid) {
      throw new Error('The active account changed before sign-out.');
    }
    mockNativeActiveUser = null;
    return true;
  });
  mockLoadCloudState.mockImplementation(async uid =>
    mockCloudStateForUser.get(uid) ?? null,
  );
  mockSaveCloudState.mockResolvedValue(true);
  mockUnsubscribe.mockClear();
  jest.clearAllMocks();
});

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
    renderer = null;
  }
});

test('Firebase restore selects the newer cloud copy and saves it locally', async () => {
  const account = firebaseUser('firebase-a');
  const local = makeQaState(account);
  local.updatedAt = 10;
  const cloud = makeQaState(account);
  cloud.updatedAt = 20;
  cloud.profile.name = 'Cloud copy';
  mockLocalStateForUser.set(account.uid, JSON.stringify(local));
  mockCloudStateForUser.set(account.uid, cloud);

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
  });

  expect(currentSession.state.profile.id).toBe(account.uid);
  expect(currentSession.state.profile.name).toBe('Cloud copy');
  expect(currentSession.restoring).toBe(false);
  expect(JSON.parse(mockLocalStateForUser.get(account.uid)).profile.name).toBe(
    'Cloud copy',
  );
  expect(mockLoadCloudState).toHaveBeenCalledWith(account.uid);
  expect(mockStore.signOut).not.toHaveBeenCalled();
});

test('a delayed old Firebase cache load cannot replace the newer authenticated account', async () => {
  let releaseOldStorageOperation;
  const oldStorageOperation = new Promise(resolve => {
    releaseOldStorageOperation = resolve;
  });
  mockStore.setActiveUser.mockImplementation(async uid => {
    if (uid === 'firebase-a') {
      // Native storage has switched to A, but its bridge promise is delivered
      // after B becomes the active Firebase account.
      mockNativeActiveUser = uid;
      await oldStorageOperation;
      return true;
    }
    mockNativeActiveUser = uid;
    return true;
  });
  mockLocalStateForUser.set(
    'firebase-a',
    JSON.stringify(makeQaState(firebaseUser('firebase-a'))),
  );
  const latestState = makeQaState(firebaseUser('firebase-b'));
  latestState.profile.name = 'Current account B';
  mockLocalStateForUser.set('firebase-b', JSON.stringify(latestState));

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(firebaseUser('firebase-a'));
    await flush();
  });
  await act(async () => {
    mockFirebaseObserver.onUser(firebaseUser('firebase-b'));
    await flush();
  });
  expect(currentSession.state.profile.id).toBe('firebase-b');
  expect(currentSession.state.profile.name).toBe('Current account B');

  await act(async () => {
    releaseOldStorageOperation();
    await flush();
  });

  expect(currentSession.state.profile.id).toBe('firebase-b');
  expect(currentSession.state.profile.name).toBe('Current account B');
  expect(mockNativeActiveUser).toBe('firebase-b');
});

test('hides the prior Firebase account and saves it locally before switching UIDs', async () => {
  const accountA = firebaseUser('firebase-a');
  const stateA = makeQaState(accountA);
  const accountB = firebaseUser('firebase-b');
  const stateB = makeQaState(accountB);
  stateB.profile.name = 'Current account B';
  mockLocalStateForUser.set(accountA.uid, JSON.stringify(stateA));
  mockLocalStateForUser.set(accountB.uid, JSON.stringify(stateB));

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(accountA);
    await flush();
  });
  expect(currentSession.state.profile.id).toBe(accountA.uid);
  mockStore.saveState.mockClear();

  let releaseAccountB;
  const accountBSetup = new Promise(resolve => {
    releaseAccountB = resolve;
  });
  mockStore.setActiveUser.mockImplementation(async uid => {
    if (uid === accountB.uid) {
      await accountBSetup;
    }
    mockNativeActiveUser = uid;
    return true;
  });

  await act(async () => {
    mockFirebaseObserver.onUser(accountB);
    await flush();
  });
  expect(currentSession.state).toBe(null);
  expect(currentSession.restoring).toBe(true);
  expect(mockStore.saveState).toHaveBeenCalledWith(
    accountA.uid,
    expect.any(String),
  );
  expect(JSON.parse(mockStore.saveState.mock.calls[0][1]).profile.id).toBe(
    accountA.uid,
  );

  await act(async () => {
    releaseAccountB();
    await flush();
  });

  expect(currentSession.state.profile.id).toBe(accountB.uid);
  expect(currentSession.state.profile.name).toBe('Current account B');
  expect(currentSession.restoring).toBe(false);
});
