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

function signUpField(renderer, label) {
  return renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === label);
}

async function renderSignUp(auth) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SignUpScreen auth={auth} back={jest.fn()} go={jest.fn()} />,
    );
  });
  return renderer;
}

async function enterSignUpDetails(renderer, details = {}) {
  const values = {
    'Full name': 'Jamie Student',
    Email: 'jamie@gmail.com',
    Password: 'SecurePassword123',
    ...details,
  };
  await ReactTestRenderer.act(async () => {
    for (const [label, value] of Object.entries(values)) {
      signUpField(renderer, label).props.onChangeText(value);
    }
  });
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

test('login does not show an error when the Google account picker is dismissed', async () => {
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
  expect(copy).not.toContain(
    'Google sign-in did not complete. Try again or use email and password.',
  );
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up offers Google and moves Student ID collection to account setup', async () => {
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
    'After signing in, complete your TIP profile and add your private Student ID.',
  );
  expect(visibleText).toContain(
    'After signup, add your TIP campus, course, year level, and Student ID. Email accounts receive a verification link; a verified email is required for shared features.',
  );
  expect(
    renderer.root
      .findAllByType(TextInput)
      .map(input => input.props.accessibilityLabel),
  ).not.toContain('Student ID');
  await ReactTestRenderer.act(async () =>
    button(renderer, 'Sign up with Google').props.onPress(),
  );
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up does not show an error when the Google account picker is dismissed', async () => {
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
  expect(copy).not.toContain(
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

test('sign-up validation blocks incomplete details before calling Firebase', async () => {
  const signUp = jest.fn();
  const renderer = await renderSignUp({
    firebaseConfigured: true,
    googleSignInAvailable: false,
    signUp,
  });
  await enterSignUpDetails(renderer, {
    Email: 'not-an-email',
    Password: 'short',
  });

  await ReactTestRenderer.act(async () =>
    button(renderer, 'CREATE ACCOUNT').props.onPress(),
  );

  const alerts = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity);
  expect(alerts).toContain(
    'Enter your name and a valid email. Use 8–1024 characters for the password.',
  );
  expect(signUp).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up allows a non-school email address and defers Student ID setup', async () => {
  const signUp = jest.fn(async () => {});
  const renderer = await renderSignUp({
    firebaseConfigured: true,
    googleSignInAvailable: false,
    signUp,
  });
  await enterSignUpDetails(renderer);

  await ReactTestRenderer.act(async () =>
    button(renderer, 'CREATE ACCOUNT').props.onPress(),
  );

  expect(signUp).toHaveBeenCalledWith(
    'Jamie Student',
    'jamie@gmail.com',
    'SecurePassword123',
  );
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up shows Firebase errors and re-enables submission after failure', async () => {
  const signUp = jest.fn(async () => {
    throw new Error('This email is already in use.');
  });
  const renderer = await renderSignUp({
    firebaseConfigured: true,
    googleSignInAvailable: false,
    signUp,
  });
  await enterSignUpDetails(renderer);

  await ReactTestRenderer.act(async () =>
    button(renderer, 'CREATE ACCOUNT').props.onPress(),
  );

  const alerts = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity);
  expect(alerts).toContain('This email is already in use.');
  expect(button(renderer, 'CREATE ACCOUNT').props.disabled).toBe(false);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-up ignores duplicate submissions while Firebase is still creating the account', async () => {
  let finishSignUp;
  const pendingSignUp = new Promise(resolve => {
    finishSignUp = resolve;
  });
  const signUp = jest.fn(() => pendingSignUp);
  const renderer = await renderSignUp({
    firebaseConfigured: true,
    googleSignInAvailable: false,
    signUp,
  });
  await enterSignUpDetails(renderer);

  let firstSubmission;
  await ReactTestRenderer.act(async () => {
    firstSubmission = button(renderer, 'CREATE ACCOUNT').props.onPress();
    await Promise.resolve();
  });
  expect(button(renderer, 'CREATE ACCOUNT').props.disabled).toBe(true);
  await ReactTestRenderer.act(async () =>
    button(renderer, 'CREATE ACCOUNT').props.onPress(),
  );
  expect(signUp).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    finishSignUp();
    await firstSubmission;
  });
  expect(button(renderer, 'CREATE ACCOUNT').props.disabled).toBe(false);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('Firebase login keeps existing device-only sign-in available without biometrics', async () => {
  const signIn = jest.fn(async () => {});
  const signInLocal = jest.fn(async () => {});
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen
        auth={{
          firebaseConfigured: true,
          googleSignInAvailable: true,
          signIn,
          signInLocal,
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
  expect(button(renderer, 'SIGN IN WITH BIOMETRICS')).toBeUndefined();
  await ReactTestRenderer.act(async () => renderer.unmount());
});
