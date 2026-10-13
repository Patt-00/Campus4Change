import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { BookingScreen } from '../src/features/tutors/screens/BookingScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderBooking(onSave, session) {
  return ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <BookingScreen
        back={jest.fn()}
        tutor={{
          id: 'mika',
          name: 'Mika Santos',
          subjects: ['Physics', 'Calculus'],
        }}
        session={session}
        onSave={onSave}
      />
    </SafeAreaProvider>,
  );
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

function input(renderer, label) {
  return renderer.root
    .findAllByType(TextInput)
    .find(control => control.props.accessibilityLabel === label);
}

afterEach(() => {
  jest.useRealTimers();
});

test('booking form rejects past slots and forwards a valid future selection', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 13, 20, 0, 0));
  const onSave = jest.fn(() => 'That time is already booked.');
  let renderer;
  await act(async () => {
    renderer = renderBooking(onSave);
  });

  await act(async () => button(renderer, 'CONFIRM BOOKING').props.onPress());
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Choose a future date and time.'),
  ).toBe(true);
  expect(onSave).not.toHaveBeenCalled();

  const nextDate = button(
    renderer,
    'Select date Wednesday, October 14, 2026',
  );
  expect(nextDate.props.accessibilityState.selected).toBe(false);
  await act(async () => nextDate.props.onPress());
  await act(async () => button(renderer, 'Calculus').props.onPress());
  await act(async () => button(renderer, '4:30 PM').props.onPress());
  await act(async () =>
    input(renderer, 'Example: I need help with integration by parts.').props.onChangeText(
      '  Review limits  ',
    ),
  );
  await act(async () => button(renderer, 'CONFIRM BOOKING').props.onPress());

  expect(onSave).toHaveBeenCalledTimes(1);
  const [subject, startsAt, note] = onSave.mock.calls[0];
  expect(subject).toBe('Calculus');
  expect(new Date(startsAt).getTime()).toBeGreaterThan(Date.now());
  expect(new Date(startsAt).getHours()).toBe(16);
  expect(new Date(startsAt).getMinutes()).toBe(30);
  expect(note).toBe('Review limits');
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'That time is already booked.'),
  ).toBe(true);
  await act(async () => renderer.unmount());
});

test('rescheduling a non-preset time requires an explicit new time', async () => {
  const onSave = jest.fn();
  const sessionStart = new Date();
  sessionStart.setDate(sessionStart.getDate() + 1);
  sessionStart.setHours(9, 15, 0, 0);
  const session = {
    id: 'custom-time',
    subject: 'Physics',
    startsAt: sessionStart.toISOString(),
    note: 'Earlier note',
  };
  let renderer;
  await act(async () => {
    renderer = renderBooking(onSave, session);
  });

  expect(
    renderer.root
      .findAllByType(Text)
      .some(
        node =>
          node.props.children ===
          'This session\'s saved time is not a preset. Choose a new time to reschedule it.',
      ),
  ).toBe(true);
  const timeLabels = ['2:00 PM', '4:30 PM', '6:00 PM'];
  expect(
    renderer.root
      .findAllByType(TouchableOpacity)
      .filter(control => timeLabels.includes(control.props.accessibilityLabel))
      .some(control => control.props.accessibilityState.selected),
  ).toBe(false);

  await act(async () => button(renderer, 'SAVE NEW SCHEDULE').props.onPress());
  expect(onSave).not.toHaveBeenCalled();
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Choose a time to continue.'),
  ).toBe(true);

  await act(async () => button(renderer, '4:30 PM').props.onPress());
  await act(async () => button(renderer, 'SAVE NEW SCHEDULE').props.onPress());
  expect(onSave).toHaveBeenCalledWith(
    'Physics',
    expect.any(String),
    'Earlier note',
  );
  expect(new Date(onSave.mock.calls[0][1]).getTime()).toBeGreaterThan(Date.now());
  await act(async () => renderer.unmount());
});
