import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AboutScreen } from '../src/features/about/screens/AboutScreen';

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});

test('Firebase About copy matches verified-email group access', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <AboutScreen
          back={jest.fn()}
          firebaseConfigured
          cloudSession
        />
      </SafeAreaProvider>,
    );
  });

  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter(value => typeof value === 'string')
    .join(' ');

  expect(copy).toContain(
    'Firebase users with verified email addresses can share study-group details',
  );
  expect(copy).toContain('Google sign-in on Android');
  expect(copy).toContain('complete the required TIP account setup');
  expect(copy).toContain('Student IDs stay private');
  expect(copy).not.toContain('must be unique');
  expect(copy).toContain('verification emails');
  expect(copy).toContain(
    'Email verification confirms control of an address, not school affiliation',
  );
  expect(copy).toContain('does not check a school-domain allowlist');
  expect(copy).toContain('Find a human tutor to explain a subject');
  expect(copy).toContain('publish your tutoring skills so learners can find you');
  expect(copy).toContain('form study groups');
  expect(copy).toContain('TIP campuses in Quezon City and Manila');
  expect(copy).toContain('connect students across the Philippines and around the world');
  expect(copy).toContain('does not process payments');
  await act(async () => renderer.unmount());
});

test('signed-out Firebase About copy does not imply an active device-only account', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <AboutScreen back={jest.fn()} firebaseConfigured />
      </SafeAreaProvider>,
    );
  });

  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter(value => typeof value === 'string')
    .join(' ');

  expect(copy).toContain('No account is currently signed in.');
  expect(copy).toContain('Sign up or sign in with Firebase');
  expect(copy).not.toContain('This account is saved only on this Android device.');
  expect(copy).not.toContain('This device-only account stays private.');
  await act(async () => renderer.unmount());
});

test('signed-in device-only Firebase About copy remains account-specific', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider>
        <AboutScreen back={jest.fn()} firebaseConfigured signedIn />
      </SafeAreaProvider>,
    );
  });

  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .filter(value => typeof value === 'string')
    .join(' ');

  expect(copy).toContain('This account is saved only on this Android device.');
  expect(copy).toContain('This device-only account stays private.');
  expect(copy).not.toContain('No account is currently signed in.');
  await act(async () => renderer.unmount());
});
