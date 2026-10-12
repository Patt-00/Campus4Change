import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useCampusSession } from '../src/shared/state/useCampusSession';

let mockUserListener;
let mockCheckEmailVerification;
let mockResendVerificationEmail;
let mockFirebaseSignOut;
let mockLoadCloudState;
let mockSaveCloudState;
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
  jest.clearAllMocks();
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
