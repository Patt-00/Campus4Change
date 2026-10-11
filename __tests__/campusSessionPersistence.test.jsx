import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useCampusSession } from '../src/shared/state/useCampusSession';

const mockAccount = {
  id: 'firebase-student',
  name: 'Student',
  email: 'student@campus.test',
  studentId: 'STU-1',
};
const mockStore = {
  biometricSignIn: jest.fn(),
  enableBiometrics: jest.fn(),
  loadState: jest.fn(async () => null),
  saveState: jest.fn(async () => {}),
  setActiveUser: jest.fn(async () => {}),
  signIn: jest.fn(async () => mockAccount),
  signOut: jest.fn(async () => {}),
  signUp: jest.fn(),
};

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseEnabled: false,
  firebasePasswordReset: jest.fn(),
  firebaseSignIn: jest.fn(),
  firebaseSignOut: jest.fn(),
  firebaseSignUp: jest.fn(),
  loadCloudState: jest.fn(),
  saveCloudState: jest.fn(),
  watchFirebaseUser: jest.fn(() => () => {}),
}));

jest.mock('../src/shared/state/storage', () => ({
  deviceStore: () => mockStore,
  parseAccount: value => value,
  parseState: JSON.parse,
}));

let currentSession;

function Harness() {
  currentSession = useCampusSession({
    onSignedIn: () => {},
    onSignedOut: () => {},
  });
  return null;
}

async function flushSaveQueue() {
  await new Promise(resolve => setImmediate(resolve));
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('shared directory refreshes stay transient and feed state is not saved', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  await act(async () => {
    await currentSession.auth.signInLocal('student@campus.test', 'pass');
    await flushSaveQueue();
  });
  await act(async () => {
    currentSession.dispatch({
      type: 'createGroup',
      group: {
        id: 'shared-group',
        shared: true,
        joined: true,
        members: 1,
        posts: [],
      },
    });
    await flushSaveQueue();
  });
  mockStore.saveState.mockClear();
  const updatedAt = currentSession.state.updatedAt;

  await act(async () => {
    currentSession.dispatch({
      type: 'sharedGroups',
      groups: [
        {
          id: 'shared-group',
          name: 'Shared group',
          shared: true,
          joined: true,
          members: 2,
          postsLoaded: true,
          posts: [
            {
              id: 'feed-post',
              author: 'Other student',
              text: 'A shared note',
              createdAt: '2026-10-12T10:00:00.000Z',
              replies: [],
            },
          ],
        },
      ],
    });
    await flushSaveQueue();
  });

  expect(currentSession.state.groups[0].posts).toEqual([]);
  expect(currentSession.state.groups[0].members).toBe(2);
  expect(currentSession.state.updatedAt).toBe(updatedAt);
  expect(mockStore.saveState).not.toHaveBeenCalled();

  await act(async () => {
    currentSession.dispatch({
      type: 'profile',
      profile: { course: 'Computer Science' },
    });
    await flushSaveQueue();
  });
  const saved = JSON.parse(mockStore.saveState.mock.calls.at(-1)[0]);
  expect(saved.groups[0].posts).toEqual([]);
  expect(saved.groups[0].postsLoaded).toBe(false);
  await act(async () => renderer.unmount());
});
