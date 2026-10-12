import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GroupStudyRoomScreen } from '../src/features/groups/screens/GroupStudyRoomScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderRoom(props = {}) {
  return ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <GroupStudyRoomScreen
        title="Calculus Circle"
        back={jest.fn()}
        finish={jest.fn()}
        onDraft={jest.fn()}
        {...props}
      />
    </SafeAreaProvider>,
  );
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

function hasText(renderer, expected) {
  return renderer.root
    .findAllByType(Text)
    .some(node => {
      const children = node.props.children;
      const value = Array.isArray(children) ? children.join('') : children;
      return value === expected;
    });
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('group room timer starts, pauses, resets, completes, and restarts', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-13T00:00:00.000Z'));
  const setIntervalSpy = jest.spyOn(global, 'setInterval');
  const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
  let renderer;
  await act(async () => {
    renderer = renderRoom();
  });

  expect(hasText(renderer, '25:00')).toBe(true);
  await act(async () => button(renderer, 'START TIMER').props.onPress());
  expect(button(renderer, 'PAUSE TIMER')).toBeTruthy();

  await act(async () => jest.advanceTimersByTime(1000));
  expect(hasText(renderer, '24:59')).toBe(true);
  await act(async () => button(renderer, 'PAUSE TIMER').props.onPress());
  expect(hasText(renderer, '24:59')).toBe(true);
  expect(button(renderer, 'START TIMER')).toBeTruthy();

  await act(async () => button(renderer, 'RESET TIMER').props.onPress());
  expect(hasText(renderer, '25:00')).toBe(true);
  await act(async () => button(renderer, 'START TIMER').props.onPress());
  await act(async () => {
    jest.setSystemTime(new Date(Date.now() + 25 * 60 * 1000));
    jest.advanceTimersByTime(500);
  });
  expect(hasText(renderer, '00:00')).toBe(true);
  expect(button(renderer, 'RESTART TIMER')).toBeTruthy();

  await act(async () => button(renderer, 'RESTART TIMER').props.onPress());
  expect(hasText(renderer, '25:00')).toBe(true);
  expect(button(renderer, 'PAUSE TIMER')).toBeTruthy();
  const roomTimer = setIntervalSpy.mock.results.at(-1).value;
  await act(async () => renderer.unmount());
  expect(clearIntervalSpy).toHaveBeenCalledWith(roomTimer);
});

test('group room saves note drafts and finishes when the user goes back', async () => {
  const back = jest.fn();
  const finish = jest.fn();
  const onDraft = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderRoom({ back, finish, onDraft, initialNotes: 'Earlier notes' });
  });

  const notes = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Write what you learned...');
  await act(async () => notes.props.onChangeText('Reviewed integration rules'));
  expect(onDraft).toHaveBeenLastCalledWith('Reviewed integration rules');

  await act(async () => button(renderer, 'Back').props.onPress());
  expect(finish).toHaveBeenCalledWith('Reviewed integration rules', false);
  expect(back).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('group room Save Notes and Leave finishes with the current notes', async () => {
  const back = jest.fn();
  const finish = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderRoom({ back, finish });
  });

  const notes = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Write what you learned...');
  await act(async () => notes.props.onChangeText('Review chapter six'));
  await act(async () =>
    button(renderer, 'SAVE NOTES AND LEAVE').props.onPress(),
  );
  expect(finish).toHaveBeenCalledWith('Review chapter six', true);
  expect(back).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});
