import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated } from 'react-native';
import { NotificationToast } from '../src/features/notifications/components/NotificationToast';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));

test('a notification navigates only once while its dismissal animation runs', async () => {
  jest.useFakeTimers();
  const timing = jest.spyOn(Animated, 'timing').mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
  });
  const onOpen = jest.fn();
  const onDismiss = jest.fn();
  let renderer;
  try {
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <NotificationToast
          notice={{ title: 'Email verified', message: 'Your account is ready.' }}
          onOpen={onOpen}
          onDismiss={onDismiss}
        />,
      );
    });
    const open = renderer.root.findByProps({
      accessibilityLabel: 'Open notification: Email verified',
    });
    await act(async () => {
      open.props.onPress();
      open.props.onPress();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('Notifications');
    expect(onDismiss).not.toHaveBeenCalled();
  } finally {
    if (renderer) {
      await act(async () => renderer.unmount());
    }
    timing.mockRestore();
    jest.useRealTimers();
  }
});
