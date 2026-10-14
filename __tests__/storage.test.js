jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'ios' },
}));

import { NativeModules, Platform } from 'react-native';
import {
  deviceStore,
  hasCompletedIntroduction,
  markIntroductionCompleted,
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

test('introduction completion uses the device-level native preference', async () => {
  Platform.OS = 'android';
  const bridge = {
    hasCompletedIntroduction: jest.fn(async () => true),
    markIntroductionCompleted: jest.fn(async () => true),
  };
  NativeModules.CampusStorage = bridge;

  await expect(hasCompletedIntroduction()).resolves.toBe(true);
  await expect(markIntroductionCompleted()).resolves.toBe(true);
  expect(bridge.hasCompletedIntroduction).toHaveBeenCalledTimes(1);
  expect(bridge.markIntroductionCompleted).toHaveBeenCalledTimes(1);
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
