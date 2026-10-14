import React from 'react';
import { Alert, TextInput, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { LoginScreen } from '../src/features/auth/screens/LoginScreen';

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});

test('password reset confirmation does not reveal whether the account exists', async () => {
  const sendPasswordReset = jest.fn(async () => {});
  const alert = jest.spyOn(Alert, 'alert');
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen
        auth={{
          firebaseConfigured: true,
          sendPasswordReset,
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  const email = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Email');
  await ReactTestRenderer.act(async () => {
    email.props.onChangeText('student@example.test');
  });

  const forgotPassword = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === 'Forgot password?');
  const alertShown = new Promise(resolve => {
    alert.mockImplementation((title, message) => resolve({ title, message }));
  });
  await ReactTestRenderer.act(async () => {
    forgotPassword.props.onPress();
    await alertShown;
  });

  expect(sendPasswordReset).toHaveBeenCalledWith('student@example.test');
  expect(alert.mock.calls.at(-1)).toEqual([
    'Check your email',
    'If an account exists for this email, a reset link has been sent.',
  ]);
  await ReactTestRenderer.act(async () => renderer.unmount());
  jest.restoreAllMocks();
});
