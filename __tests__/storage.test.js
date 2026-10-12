jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'ios' },
}));

import { NativeModules, Platform } from 'react-native';
import {
  deviceStore,
  parseAccount,
  parseState,
} from '../src/shared/state/storage';

afterEach(() => {
  delete NativeModules.CampusStorage;
  Platform.OS = 'ios';
});

test('deviceStore requires Android and the native storage bridge', () => {
  expect(() => deviceStore()).toThrow(
    'Local accounts are supported in the Android app.',
  );

  Platform.OS = 'android';
  expect(() => deviceStore()).toThrow(
    'Local accounts are supported in the Android app.',
  );

  const bridge = { saveState: jest.fn() };
  NativeModules.CampusStorage = bridge;
  expect(deviceStore()).toBe(bridge);
});

test('parseAccount returns the stored account record', () => {
  const account = { id: 'student', email: 'student@example.test' };
  expect(parseAccount(JSON.stringify(account))).toEqual(account);
});

test('legacy version-one state defaults the pending action queue', () => {
  const legacyState = {
    version: 1,
    profile: { id: 'student' },
    sessions: [],
    groups: [],
    conversations: [],
    notices: [],
  };

  expect(parseState(JSON.stringify(legacyState)).pendingSharedActions).toEqual(
    [],
  );
});
