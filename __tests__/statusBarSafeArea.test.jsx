import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBarSafeArea } from '../src/shared/components/StatusBarSafeArea';

const styles = StyleSheet.create({ container: { flex: 1 } });

jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  Object.defineProperty(ReactNative.StatusBar, 'currentHeight', {
    configurable: true,
    value: 44,
  });
  return ReactNative;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 8, left: 0, right: 0 }),
}));

test('Android status-safe layout uses the provider inset without doubling status bar height', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <StatusBarSafeArea style={styles.container}>
        <Text>Content</Text>
      </StatusBarSafeArea>,
    );
  });

  const root = renderer.root.findByType(View);
  expect(root.props.style).toEqual([
    styles.container,
    { paddingTop: 24, paddingBottom: 8 },
  ]);
  await act(async () => renderer.unmount());
});
