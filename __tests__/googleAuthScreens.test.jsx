import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { LoginScreen } from '../src/features/auth/screens/LoginScreen';
import { SignUpScreen } from '../src/features/auth/screens/SignUpScreen';

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

test('login offers Google sign-in and calls the shared Firebase action', async () => {
  const signInWithGoogle = jest.fn(async () => true);
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: true,
          signInWithGoogle,
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  const googleButton = button(renderer, 'Continue with Google');
  expect(googleButton).toBeDefined();
  await ReactTestRenderer.act(async () => googleButton.props.onPress());
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('login explains when Google sign-in returns without an account', async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: true,
          signInWithGoogle: async () => false,
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  await ReactTestRenderer.act(async () =>
    button(renderer, 'Continue with Google').props.onPress(),
  );
  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity);
  expect(copy).toContain(
    'Google sign-in did not complete. Try again or use email and password.',
  );
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up offers Google and explains how to add the private Student ID later', async () => {
  const signInWithGoogle = jest.fn(async () => true);
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SignUpScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: true,
          signInWithGoogle,
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  const visibleText = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(text => typeof text === 'string');
  expect(visibleText).toContain(
    'Google supplies your name and email. Add your private Student ID in Edit Profile after signing in.',
  );
  await ReactTestRenderer.act(async () =>
    button(renderer, 'Sign up with Google').props.onPress(),
  );
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up explains when Google sign-in returns without an account', async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SignUpScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: true,
          signInWithGoogle: async () => false,
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  await ReactTestRenderer.act(async () =>
    button(renderer, 'Sign up with Google').props.onPress(),
  );
  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity);
  expect(copy).toContain(
    'Google sign-in did not complete. Try again or use email and password.',
  );
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('Google buttons remain disabled until the native and Firebase setup is present', async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: false,
          signInWithGoogle: jest.fn(),
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  const googleButton = button(renderer, 'Continue with Google');
  expect(googleButton.props.disabled).toBe(true);
  expect(googleButton.props.accessibilityState.disabled).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('Firebase login keeps existing device-only sign-in and biometrics available', async () => {
  const signIn = jest.fn(async () => {});
  const signInLocal = jest.fn(async () => {});
  const biometrics = jest.fn(async () => {});
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: true,
          signIn,
          signInLocal,
          biometrics,
        }}
        back={jest.fn()}
        go={jest.fn()}
      />,
    );
  });

  await ReactTestRenderer.act(async () =>
    button(renderer, 'More sign-in options').props.onPress(),
  );
  await ReactTestRenderer.act(async () =>
    button(renderer, 'Use existing on-device account').props.onPress(),
  );

  expect(button(renderer, 'Continue with Google')).toBeUndefined();
  expect(button(renderer, 'Forgot password?')).toBeUndefined();
  expect(button(renderer, 'Back to Firebase sign-in')).toBeDefined();
  const identifier = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Email or Student ID');
  const password = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Password');
  await ReactTestRenderer.act(async () => {
    identifier.props.onChangeText('STU-1042');
    password.props.onChangeText('LocalPass123');
  });
  await ReactTestRenderer.act(async () =>
    button(renderer, 'SIGN IN').props.onPress(),
  );

  expect(signInLocal).toHaveBeenCalledWith('STU-1042', 'LocalPass123');
  expect(signIn).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () =>
    button(renderer, 'SIGN IN WITH BIOMETRICS').props.onPress(),
  );
  expect(biometrics).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => renderer.unmount());
});
