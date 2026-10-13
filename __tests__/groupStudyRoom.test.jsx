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

test('group session shows meetup details without a focus timer', async () => {
  let renderer;
  await act(async () => {
    renderer = renderRoom({
      group: {
        name: 'Calculus Study Circle',
        subject: 'Calculus',
        members: 12,
        meetup: 'Integration Techniques Review',
        meetupAt: '2099-05-15T16:00:00.000Z',
        room: 'Q-5221',
      },
    });
  });

  expect(hasText(renderer, 'Group Session')).toBe(true);
  expect(hasText(renderer, 'UPCOMING')).toBe(true);
  expect(hasText(renderer, 'Integration Techniques Review')).toBe(true);
  expect(hasText(renderer, 'Q-5221')).toBe(true);
  expect(hasText(renderer, 'Calculus Study Circle')).toBe(true);
  expect(hasText(renderer, '12 members')).toBe(true);
  expect(hasText(renderer, 'Focus timer')).toBe(false);
  expect(hasText(renderer, 'START TIMER')).toBe(false);
  await act(async () => renderer.unmount());
});

test('group session explains when a meetup has not been scheduled', async () => {
  let renderer;
  await act(async () => {
    renderer = renderRoom({
      group: {
        name: 'Exam Review Team',
        subject: 'Physics',
        members: 1,
        meetup: 'Physics review',
      },
    });
  });

  expect(hasText(renderer, 'NOT SCHEDULED')).toBe(true);
  expect(hasText(renderer, 'No date added')).toBe(true);
  expect(hasText(renderer, 'No time added')).toBe(true);
  expect(hasText(renderer, 'Location not set')).toBe(true);
  await act(async () => renderer.unmount());
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
    .find(input => input.props.accessibilityLabel === 'Session notes');
  await act(async () => notes.props.onChangeText('Reviewed integration rules'));
  expect(onDraft).toHaveBeenLastCalledWith('Reviewed integration rules');

  await act(async () => button(renderer, 'Back').props.onPress());
  expect(finish).toHaveBeenCalledWith('Reviewed integration rules', false);
  expect(back).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('group session posts notes only from the explicit group-share action', async () => {
  const back = jest.fn();
  const finish = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderRoom({ back, finish, shared: true });
  });

  const notes = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Session notes');
  await act(async () => notes.props.onChangeText('Review chapter six'));
  await act(async () =>
    button(renderer, 'POST NOTES TO GROUP').props.onPress(),
  );
  expect(finish).toHaveBeenCalledWith('Review chapter six', true);
  expect(back).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});
