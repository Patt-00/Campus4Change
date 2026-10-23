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
  loadState: jest.fn(),
  saveState: jest.fn(),
  generateAccountUuid: jest.fn(async () => '00000000-0000-4000-8000-000000000009'),
  setActiveUser: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};
const mockLoadCloudState = jest.fn();
const mockSaveCloudState = jest.fn();
const mockFirebaseSignOut = jest.fn();

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseEnabled: true,
  firebaseCheckEmailVerification: jest.fn(),
  firebaseGoogleSignIn: jest.fn(),
  firebaseGoogleSignInAvailable: jest.fn(() => false),
  firebasePasswordReset: jest.fn(),
  firebaseResendVerificationEmail: jest.fn(),
  firebaseSignIn: jest.fn(),
  firebaseSignOut: (...args) => mockFirebaseSignOut(...args),
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
  mockFirebaseSignOut.mockResolvedValue(true);
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
  expect(mockLoadCloudState).toHaveBeenCalledWith(
    account.uid,
    expect.objectContaining({
      profile: expect.objectContaining({ id: account.uid }),
    }),
  );
  expect(mockStore.signOut).not.toHaveBeenCalled();
});

test('an auth observer error does not strand the current account restore', async () => {
  const account = firebaseUser('firebase-a');
  let finishCloudLoad;
  mockLoadCloudState.mockImplementationOnce(
    () => new Promise(resolve => {
      finishCloudLoad = resolve;
    }),
  );

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
  });
  expect(currentSession.state.profile.id).toBe(account.uid);

  await act(async () => {
    mockFirebaseObserver.onError(new Error('Auth observer disconnected.'));
    await flush();
  });
  expect(currentSession.saveError).toBe('Auth observer disconnected.');

  await act(async () => {
    finishCloudLoad(null);
    await flush();
  });
  mockStore.saveState.mockClear();

  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { course: 'Observer recovery' },
    });
    await flush();
  });

  expect(mockStore.saveState).toHaveBeenCalledWith(
    account.uid,
    expect.stringContaining('Observer recovery'),
  );
});

test('an auth observer error without a reported user ends initial restoration', async () => {
  await render();
  expect(currentSession.restoring).toBe(true);

  await act(async () => {
    mockFirebaseObserver.onError(new Error('Firebase auth is unavailable.'));
    await flush();
  });

  expect(currentSession.restoring).toBe(false);
  expect(currentSession.saveError).toBe('Firebase auth is unavailable.');
  expect(currentSession.state).toBe(null);
});

test('an auth observer error does not reveal the sign-in screen during account setup', async () => {
  let finishNativeSetup;
  const nativeSetup = new Promise(resolve => {
    finishNativeSetup = resolve;
  });
  mockStore.setActiveUser.mockImplementationOnce(async uid => {
    await nativeSetup;
    mockNativeActiveUser = uid;
    return true;
  });
  const account = firebaseUser('firebase-a');

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
  });
  expect(currentSession.restoring).toBe(true);

  await act(async () => {
    mockFirebaseObserver.onError(new Error('Auth observer disconnected.'));
    await flush();
  });
  expect(currentSession.restoring).toBe(true);

  await act(async () => {
    finishNativeSetup();
    await flush();
  });
  expect(currentSession.restoring).toBe(false);
  expect(currentSession.state.profile.id).toBe(account.uid);
});

test('signup reports a recoverable Firebase display-name sync failure', async () => {
  const firebase = require('../src/shared/backend/firebase');
  firebase.firebaseSignUp.mockResolvedValueOnce({
    id: 'firebase-new',
    name: 'Jamie Student',
    email: 'jamie@gmail.com',
    emailVerified: false,
    verificationEmailSent: true,
    displayNameSaved: false,
  });

  await render();
  await act(async () => {
    await currentSession.auth.signUp(
      'Jamie Student',
      'jamie@gmail.com',
      'TestPassword123',
    );
    await flush();
  });

  expect(currentSession.emailVerificationMessage).toBe(
    'Verification email sent to jamie@gmail.com. Check your inbox and spam folder. Your account was created, but its sign-in name could not be saved. The name you entered is still in your app profile.',
  );
  expect(currentSession.emailVerificationToast).toMatchObject({
    tone: 'success',
    title: 'Verification email sent',
    message: expect.stringContaining(
      'Your name could not be saved to Firebase, but it remains in your profile.',
    ),
  });
  expect(currentSession.emailVerificationToast.message).toContain(
    'jamie@gmail.com',
  );
  expect(currentSession.state.profile).toMatchObject({
    id: 'firebase-new',
    name: 'Jamie Student',
  });
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

test('a late restore failure cannot corrupt the next account profile', async () => {
  let failOldRestore;
  mockLoadCloudState.mockImplementationOnce(
    () => new Promise((_resolve, reject) => { failOldRestore = reject; }),
  );
  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(firebaseUser('firebase-a'));
    await flush();
  });
  await act(async () => {
    mockFirebaseObserver.onUser(firebaseUser('firebase-b'));
    await flush();
  });
  await act(async () => {
    failOldRestore(new Error('Old account restore failed.'));
    await flush();
  });
  expect(currentSession.state.profile.id).toBe('firebase-b');
  expect(currentSession.state.profile.accountUuid).toBe(
    '00000000-0000-4000-8000-000000000009',
  );
  expect(currentSession.saveError).not.toBe('Old account restore failed.');
});

test.each(['success', 'failure'])(
  'a late cloud-write %s from the previous account cannot replace the current profile',
  async outcome => {
    let finishOldWrite;
    let failOldWrite;
    mockSaveCloudState.mockImplementationOnce(
      () => new Promise((resolve, reject) => {
        finishOldWrite = resolve;
        failOldWrite = reject;
      }),
    );
    await render();
    await act(async () => {
      mockFirebaseObserver.onUser(firebaseUser('firebase-a'));
      await flush();
    });
    expect(finishOldWrite).toBeDefined();

    await act(async () => {
      mockFirebaseObserver.onUser(firebaseUser('firebase-b'));
      await flush();
    });

    await act(async () => {
      if (outcome === 'success') finishOldWrite(true);
      else failOldWrite(new Error('Previous account save failed.'));
      await flush();
    });
    expect(currentSession.state.profile.id).toBe('firebase-b');
    expect(currentSession.state.profile.accountUuid).toBe(
      '00000000-0000-4000-8000-000000000009',
    );
  },
);

test('profile edits persist locally while an earlier Firebase write waits for acknowledgement', async () => {
  const account = firebaseUser('firebase-a');
  const local = makeQaState(account);
  local.updatedAt = 10;
  const cloud = makeQaState(account);
  cloud.updatedAt = 20;
  cloud.profile.name = 'Cloud copy';
  mockLocalStateForUser.set(account.uid, JSON.stringify(local));
  mockCloudStateForUser.set(account.uid, cloud);

  let acknowledgeFirstWrite;
  let reportWriteStarted;
  const writeStarted = new Promise(resolve => {
    reportWriteStarted = resolve;
  });
  mockSaveCloudState.mockImplementation(() => {
    if (!acknowledgeFirstWrite) {
      return new Promise(resolve => {
        acknowledgeFirstWrite = resolve;
        reportWriteStarted();
      });
    }
    return Promise.resolve(true);
  });

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
  });

  if (!acknowledgeFirstWrite) {
    await act(async () => {
      currentSession.dispatch({
        type: 'profile',
        profile: { bio: 'First change waiting for Firebase.' },
      });
      await flush();
    });
  }
  await writeStarted;
  mockStore.saveState.mockClear();

  let profileSaved = false;
  const profileSave = currentSession
    .saveProfileUpdate({ bio: 'Profile edited offline.' })
    .then(result => {
      profileSaved = true;
      return result;
    });
  await act(async () => flush());
  const localSaveBeforeCloudAck = mockStore.saveState.mock.calls.some(
    ([uid, value]) =>
      uid === account.uid &&
      JSON.parse(value).profile.bio === 'Profile edited offline.',
  );
  const resolvedBeforeCloudAck = profileSaved;

  acknowledgeFirstWrite(true);
  await act(async () => {
    await profileSave;
    await flush();
  });

  expect(localSaveBeforeCloudAck).toBe(true);
  expect(resolvedBeforeCloudAck).toBe(true);
  expect(currentSession.state.profile.bio).toBe('Profile edited offline.');
  expect(mockSaveCloudState.mock.calls.at(-1)[1].profile.bio).toBe(
    'Profile edited offline.',
  );
});

test('legacy Student ID data migrates to a generated account UUID', async () => {
  const account = firebaseUser('firebase-a');
  const cloud = makeQaState(account);
  cloud.profile.studentId = '10001';
  cloud.updatedAt = Date.now() + 10_000;
  mockCloudStateForUser.set(account.uid, cloud);
  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
    await flush();
    await flush();
  });

  expect(currentSession.state.profile.accountUuid).toBe(
    '00000000-0000-4000-8000-000000000009',
  );
  expect(currentSession.state.profile).not.toHaveProperty('studentId');
  expect(
    JSON.parse(mockLocalStateForUser.get(account.uid)).profile,
  ).not.toHaveProperty('studentId');
  const migratedCloudState = mockSaveCloudState.mock.calls
    .map(([, state]) => state)
    .find(state => state.profile.id === account.uid);
  expect(migratedCloudState.profile.accountUuid).toBe(
    '00000000-0000-4000-8000-000000000009',
  );
  expect(migratedCloudState.profile).not.toHaveProperty('studentId');

  await act(async () => renderer.unmount());
});

test('cloud save failure still signs Firebase out after the local snapshot is saved', async () => {
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
  await act(async () => flush());
  mockSaveCloudState.mockRejectedValueOnce(new Error('Cloud is offline.'));

  let result;
  await act(async () => {
    result = await currentSession.signOut();
    await flush();
  });

  expect(result).toEqual({ signedOut: true, cloudSaved: false });
  expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  expect(mockStore.signOut).toHaveBeenCalledWith(account.uid);
  expect(mockNativeActiveUser).toBe(null);
  expect(currentSession.state).toBe(null);
  expect(JSON.parse(mockLocalStateForUser.get(account.uid)).profile.name).toBe(
    'Cloud copy',
  );
});

test('a Firebase sign-out failure leaves the current account and local session intact', async () => {
  const account = firebaseUser('firebase-a');
  const local = makeQaState(account);
  local.updatedAt = 10;
  const cloud = makeQaState(account);
  cloud.updatedAt = 20;
  mockLocalStateForUser.set(account.uid, JSON.stringify(local));
  mockCloudStateForUser.set(account.uid, cloud);

  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
  });
  await act(async () => flush());
  mockFirebaseSignOut.mockRejectedValueOnce(
    new Error('Firebase sign-out unavailable.'),
  );

  let result;
  await act(async () => {
    result = await currentSession.signOut();
    await flush();
  });

  expect(result.signedOut).toBe(false);
  expect(currentSession.state.profile.id).toBe(account.uid);
  expect(currentSession.sessionType).toBe('firebase');
  expect(currentSession.saveError).toBe('Firebase sign-out unavailable.');
  expect(mockStore.signOut).not.toHaveBeenCalled();
  expect(mockNativeActiveUser).toBe(account.uid);
});

test('a first-device restore prefers the saved cloud profile over a newly generated empty default', async () => {
  const account = firebaseUser('new-device-cloud-owner');
  const cloud = makeQaState(account);
  cloud.updatedAt = 100;
  Object.assign(cloud.profile, {
    name: 'Saved cloud student',
    studentId: '99002018',
    course: 'Computer Science',
    courseId: 'manila-computer-studies-computer-science',
    year: '2',
    campus: 'manila',
  });
  mockCloudStateForUser.set(account.uid, cloud);
  await render();
  await act(async () => {
    mockFirebaseObserver.onUser(account);
    await flush();
  });
  expect(currentSession.state.profile).toMatchObject({
    name: 'Saved cloud student', year: '2',
  });
  expect(currentSession.state.profile).not.toHaveProperty('studentId');
  expect(JSON.parse(mockLocalStateForUser.get(account.uid)).profile.name).toBe('Saved cloud student');
  expect(mockSaveCloudState.mock.calls.some(([, state]) => Object.hasOwn(state.profile, 'studentId'))).toBe(false);
});

test('a shared-feed update during first restore cannot turn the empty default into a real local edit', async () => {
  const account = firebaseUser('fresh-feed-race');
  const cloud = makeQaState(account);
  cloud.updatedAt = 100;
  Object.assign(cloud.profile, { name: 'Cloud profile during feed load', studentId: '99103018' });
  let finishCloud;
  mockLoadCloudState.mockImplementationOnce(() => new Promise(resolve => { finishCloud = resolve; }));
  await render();
  await act(async () => { mockFirebaseObserver.onUser(account); await flush(); });
  const placeholderTime = currentSession.state.updatedAt;
  await act(async () => currentSession.dispatch({ type: 'sharedGroups', groups: [] }));
  expect(currentSession.state.updatedAt).toBe(placeholderTime);
  await act(async () => { finishCloud(cloud); await flush(); });
  expect(currentSession.state.profile.name).toBe('Cloud profile during feed load');
  expect(currentSession.state.profile).not.toHaveProperty('studentId');
});
