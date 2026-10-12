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

  expect(copy).toContain('Verified Firebase accounts share study-group details');
  expect(copy).toContain('verification emails');
  expect(copy).toContain('Verified email is required for shared study groups');
  expect(copy).toContain('does not check a school-domain allowlist');
  await act(async () => renderer.unmount());
});
