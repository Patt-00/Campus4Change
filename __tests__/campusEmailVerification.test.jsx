import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useCampusSession } from '../src/shared/state/useCampusSession';

let mockUserListener;
let mockCheckEmailVerification;
let mockResendVerificationEmail;
let mockFirebaseSignOut;
let mockLoadCloudState;
let mockSaveCloudState;
let mockGoogleSignIn;
let currentSession;
const mockStore = {
  biometricSignIn: jest.fn(),
  enableBiometrics: jest.fn(),
  loadState: jest.fn(async () => null),
  saveState: jest.fn(async () => true),
  setActiveUser: jest.fn(async () => true),
  signIn: jest.fn(),
  signOut: jest.fn(async () => true),
  signUp: jest.fn(),
};

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseEnabled: true,
  firebaseCheckEmailVerification: (...args) =>
    mockCheckEmailVerification(...args),
  firebasePasswordReset: jest.fn(),
  firebaseGoogleSignIn: (...args) => mockGoogleSignIn(...args),
  firebaseGoogleSignInAvailable: () => true,
  firebaseResendVerificationEmail: (...args) =>
    mockResendVerificationEmail(...args),
  firebaseSignIn: jest.fn(),
  firebaseSignOut: (...args) => mockFirebaseSignOut(...args),
  firebaseSignUp: jest.fn(),
  loadCloudState: (...args) => mockLoadCloudState(...args),
  saveCloudState: (...args) => mockSaveCloudState(...args),
  watchFirebaseUser: listener => {
    mockUserListener = listener;
    return jest.fn();
  },
}));

jest.mock('../src/shared/state/storage', () => ({
  deviceStore: () => mockStore,
  parseAccount: value => value,
  parseState: JSON.parse,
}));

function Harness() {
  currentSession = useCampusSession({
    onSignedIn: jest.fn(),
    onSignedOut: jest.fn(),
  });
  return null;
}

function flushTasks() {
  return new Promise(resolve => setImmediate(resolve));
}

beforeEach(() => {
  mockUserListener = null;
  mockCheckEmailVerification = jest.fn(async () => ({
    id: 'firebase-student',
    email: 'student@school.test',
    emailVerified: false,
  }));
  mockResendVerificationEmail = jest.fn(async () => {});
  mockFirebaseSignOut = jest.fn(async () => {});
  mockLoadCloudState = jest.fn(async () => null);
  mockSaveCloudState = jest.fn(async () => {});
  mockGoogleSignIn = jest.fn(async () => ({
    id: 'google-student',
    name: 'Google Student',
    email: 'google.student@gmail.com',
    studentId: '',
    emailVerified: true,
  }));
  jest.clearAllMocks();
});

test('Google sign-in enters the verified Firebase account with empty initial state', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });

  let result;
  await act(async () => {
    result = await currentSession.auth.signInWithGoogle();
    await flushTasks();
    await flushTasks();
  });

  expect(result).toBe(true);
  expect(mockGoogleSignIn).toHaveBeenCalledTimes(1);
  expect(currentSession.sessionType).toBe('firebase');
  expect(currentSession.emailVerified).toBe(true);
  expect(currentSession.state.profile).toMatchObject({
    id: 'google-student',
    name: 'Google Student',
    email: 'google.student@gmail.com',
    studentId: '',
    interests: [],
    tutorSubjects: [],
  });
  expect(mockStore.setActiveUser).toHaveBeenCalledWith('google-student');
  await act(async () => renderer.unmount());
});

test('the session keeps shared access closed until refreshed email verification succeeds', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });

  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: false,
    });
    await flushTasks();
    await flushTasks();
  });

  expect(currentSession.sessionType).toBe('firebase');
  expect(currentSession.emailVerified).toBe(false);

  await act(async () => {
    await currentSession.auth.resendEmailVerification();
  });
  expect(currentSession.emailVerificationMessage).toContain(
    'Verification email sent to student@school.test',
  );

  mockCheckEmailVerification.mockResolvedValueOnce({
    id: 'firebase-student',
    email: 'student@school.test',
    emailVerified: true,
  });
  await act(async () => {
    await currentSession.auth.refreshEmailVerification();
  });

  expect(currentSession.emailVerified).toBe(true);
  expect(currentSession.emailVerificationMessage).toBe('');
  expect(mockCheckEmailVerification).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('Firebase cloud profiles missing optional fields restore account defaults', async () => {
  const now = Date.now();
  mockLoadCloudState.mockResolvedValueOnce({
    version: 1,
    updatedAt: now + 10_000,
    profile: { id: 'firebase-student' },
    sessions: [],
    groups: [],
    conversations: [],
    notices: [],
  });
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });

  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Cloud Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
    await flushTasks();
  });

  expect(currentSession.state.profile).toMatchObject({
    id: 'firebase-student',
    name: 'Cloud Student',
    email: 'student@school.test',
    studentId: 'STU-1',
    course: '',
    year: '',
    school: '',
    interests: [],
    tutorSubjects: [],
    bio: '',
  });
  const savedCloudState = JSON.parse(mockStore.saveState.mock.calls.at(-1)[1]);
  expect(savedCloudState.profile.interests).toEqual([]);
  expect(savedCloudState.profile.tutorSubjects).toEqual([]);
  await act(async () => renderer.unmount());
});

test('Firebase sign-out succeeds when cloud sync fails after local state is saved', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });

  mockStore.saveState.mockClear();
  mockSaveCloudState.mockRejectedValue(new Error('Firebase is unavailable.'));
  let result;
  await act(async () => {
    result = await currentSession.signOut();
  });

  expect(mockStore.saveState).toHaveBeenCalled();
  expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  expect(mockStore.signOut).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ signedOut: true, cloudSaved: false });
  expect(currentSession.sessionType).toBeNull();
  expect(currentSession.state).toBeNull();
  await act(async () => renderer.unmount());
});

test('a pending Firebase write does not block local persistence or sign-out', async () => {
  let releaseCloudWrite;
  const pendingCloudWrite = new Promise(resolve => {
    releaseCloudWrite = resolve;
  });
  mockSaveCloudState.mockImplementation(() => pendingCloudWrite);

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });
  expect(currentSession.sessionType).toBe('firebase');
  expect(currentSession.state.profile.id).toBe('firebase-student');

  mockStore.saveState.mockClear();
  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { course: 'Computer Science' },
    });
    await flushTasks();
    await flushTasks();
  });
  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { year: '3rd Year' },
    });
    await flushTasks();
    await flushTasks();
  });

  expect(mockStore.saveState).toHaveBeenCalledTimes(2);
  expect(currentSession.cloudSyncPending).toBe(true);
  const newestLocalState = JSON.parse(mockStore.saveState.mock.calls.at(-1)[1]);
  expect(newestLocalState.profile).toMatchObject({
    course: 'Computer Science',
    year: '3rd Year',
  });

  let signOutTimedOut = false;
  let signOutResult;
  await act(async () => {
    signOutResult = await Promise.race([
      currentSession.signOut(),
      new Promise(resolve =>
        setTimeout(() => {
          signOutTimedOut = true;
          resolve(null);
        }, 1800),
      ),
    ]);
  });
  expect(signOutTimedOut).toBe(false);
  expect(signOutResult).toEqual({ signedOut: true, cloudSaved: false });
  expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);

  mockStore.loadState.mockResolvedValueOnce(JSON.stringify(newestLocalState));
  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });
  expect(currentSession.state.profile).toMatchObject({
    course: 'Computer Science',
    year: '3rd Year',
  });

  releaseCloudWrite();
  await act(async () => {
    await flushTasks();
    await flushTasks();
    await flushTasks();
  });
  expect(mockSaveCloudState).toHaveBeenCalledTimes(2);
  expect(currentSession.cloudSyncPending).toBe(false);
  await act(async () => renderer.unmount());
});

test('a pending cloud write cannot be replayed into a different Firebase account', async () => {
  let releaseFirstWrite;
  const firstWritePending = new Promise(resolve => {
    releaseFirstWrite = resolve;
  });
  const cloudWrites = [];
  mockSaveCloudState.mockImplementation((uid, value) => {
    cloudWrites.push({ uid, profileId: value.profile.id });
    return uid === 'firebase-a' ? firstWritePending : Promise.resolve();
  });

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  await act(async () => {
    mockUserListener({
      uid: 'firebase-a',
      id: 'firebase-a',
      name: 'Student A',
      email: 'a@school.test',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });
  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { course: 'Private to A' },
    });
    await flushTasks();
    await flushTasks();
  });

  await act(async () => {
    mockUserListener({
      uid: 'firebase-b',
      id: 'firebase-b',
      name: 'Student B',
      email: 'b@school.test',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });
  expect(currentSession.state.profile.id).toBe('firebase-b');
  expect(currentSession.cloudSyncPending).toBe(false);

  releaseFirstWrite();
  await act(async () => {
    await flushTasks();
    await flushTasks();
  });
  expect(cloudWrites).toContainEqual({ uid: 'firebase-a', profileId: 'firebase-a' });
  expect(cloudWrites).toContainEqual({ uid: 'firebase-b', profileId: 'firebase-b' });
  expect(cloudWrites).not.toContainEqual({ uid: 'firebase-b', profileId: 'firebase-a' });
  await act(async () => renderer.unmount());
});

test('an older cloud acknowledgement does not clear a newer local save error', async () => {
  let releaseCloudWrite;
  const pendingCloudWrite = new Promise(resolve => {
    releaseCloudWrite = resolve;
  });
  mockLoadCloudState.mockResolvedValueOnce({
    version: 1,
    updatedAt: Date.now() + 1_000_000,
    profile: { id: 'firebase-student', name: 'Student' },
    sessions: [],
    groups: [],
    conversations: [],
    notices: [],
  });

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });

  mockSaveCloudState.mockImplementation(() => pendingCloudWrite);
  mockStore.saveState.mockClear();
  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { course: 'Cloud snapshot' },
    });
    await flushTasks();
    await flushTasks();
  });
  mockStore.saveState.mockRejectedValueOnce(
    new Error('Encrypted storage write failed.'),
  );
  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { year: 'Unsaved local change' },
    });
    await flushTasks();
    await flushTasks();
  });
  expect(currentSession.saveError).toBe('Encrypted storage write failed.');

  releaseCloudWrite();
  await act(async () => {
    await flushTasks();
    await flushTasks();
    await flushTasks();
  });
  expect(currentSession.saveError).toBe('Encrypted storage write failed.');
  expect(currentSession.cloudSyncPending).toBe(false);
  await act(async () => renderer.unmount());
});

test('Firebase sign-out keeps the session active when encrypted local save fails', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  await act(async () => {
    mockUserListener({
      uid: 'firebase-student',
      id: 'firebase-student',
      name: 'Student',
      email: 'student@school.test',
      studentId: 'STU-1',
      emailVerified: true,
    });
    await flushTasks();
    await flushTasks();
  });

  mockStore.saveState.mockClear();
  mockStore.saveState.mockRejectedValueOnce(new Error('Encrypted storage is full.'));
  let result;
  await act(async () => {
    result = await currentSession.signOut();
  });

  expect(result).toMatchObject({ signedOut: false, cloudSaved: false });
  expect(mockFirebaseSignOut).not.toHaveBeenCalled();
  expect(currentSession.sessionType).toBe('firebase');
  expect(currentSession.state).not.toBeNull();
  expect(currentSession.saveError).toBe('Encrypted storage is full.');
  await act(async () => renderer.unmount());
});
