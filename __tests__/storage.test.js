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

test('parseAccount removes legacy Student ID and normalizes account UUID', () => {
  const account = { id: 'student', email: 'student@example.test' };
  expect(parseAccount(JSON.stringify(account))).toEqual({
    ...account,
    accountUuid: '',
  });

  const legacyAccount = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'student@example.test',
    studentId: '1234',
  };
  expect(parseAccount(JSON.stringify(legacyAccount))).toEqual({
    id: legacyAccount.id,
    email: legacyAccount.email,
    accountUuid: legacyAccount.id,
  });
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
