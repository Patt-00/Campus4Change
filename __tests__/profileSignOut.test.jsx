import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileScreen } from '../src/features/profile/screens/ProfileScreen';
import { initialState } from '../src/shared/data/utils';

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});

test('Firebase sign-out explains when changes stayed only on the device', async () => {
  const signOut = jest.fn(async () => ({
    signedOut: true,
    cloudSaved: false,
  }));
  const alert = jest.spyOn(Alert, 'alert');
  const account = {
    id: 'firebase-student',
    name: 'Student',
    email: 'student@school.test',
    studentId: 'STU-1',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <ProfileScreen
          go={jest.fn()}
          state={initialState(account)}
          signOut={signOut}
          sessionType="firebase"
          firebaseConfigured
        />
      </SafeAreaProvider>,
    );
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Sign out' }).props.onPress();
  });
  const signOutButton = alert.mock.calls.at(-1)?.[2]?.find(
    button => button.text === 'Sign out',
  );
  expect(signOutButton?.onPress).toBeDefined();
  await act(async () => signOutButton.onPress());

  expect(signOut).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenLastCalledWith(
    'Signed out',
    'Your latest changes are saved on this device but could not sync to Firebase. Sign in again when Firebase is available to retry the sync.',
  );
  await act(async () => renderer.unmount());
});
