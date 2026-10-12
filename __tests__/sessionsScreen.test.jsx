import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity } from 'react-native';
import { SessionsScreen } from '../src/features/sessions/screens/SessionsScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

afterEach(() => {
  jest.restoreAllMocks();
});

test('sessions with unrecognized saved statuses stay visible for review', async () => {
  const go = jest.fn();
  const sessions = [
    {
      id: 'legacy-booking',
      tutorId: 'mika',
      subject: 'Legacy booking',
      startsAt: '2026-09-24T14:00:00.000Z',
      status: 'Booked',
    },
    {
      id: 'missing-status',
      tutorId: 'mika',
      subject: 'Older appointment',
      startsAt: '2026-09-25T14:00:00.000Z',
    },
    {
      id: 'completed-session',
      tutorId: 'mika',
      subject: 'Completed session',
      startsAt: '2026-09-26T14:00:00.000Z',
      status: 'Completed',
    },
  ];
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionsScreen
          go={go}
          back={jest.fn()}
          sessions={sessions}
          list={[{ id: 'mika', name: 'Mika Santos' }]}
        />
      </SafeAreaProvider>,
    );
  });

  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(labels).toContain('Needs review');
  const legacyBooking = renderer.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'View Legacy booking details');
  const olderAppointment = renderer.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'View Older appointment details');
  expect(legacyBooking).toBeDefined();
  expect(olderAppointment).toBeDefined();

  await act(async () => legacyBooking.props.onPress());
  expect(go).toHaveBeenCalledWith({
    page: 'Session Details',
    sessionId: 'legacy-booking',
  });
  await act(async () => renderer.unmount());
});

test('past-due bookings are shown instead of disappearing from the upcoming tab', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T06:00:00Z'));
  const go = jest.fn();
  const session = {
    id: 'past-due-session',
    tutorId: 'mika',
    subject: 'Past-due Calculus',
    startsAt: '2026-10-02T06:00:00.000Z',
    status: 'Upcoming',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionsScreen
          go={go}
          back={jest.fn()}
          sessions={[session]}
          list={[{ id: 'mika', name: 'Mika Santos' }]}
        />
      </SafeAreaProvider>,
    );
  });

  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(labels).toContain('Past due • review these bookings');
  const card = renderer.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'View Past-due Calculus details');
  expect(card).toBeDefined();

  await act(async () => renderer.unmount());
});

test('upcoming bookings with a missing start time stay reviewable without crashing', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T06:00:00Z'));
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionsScreen
          go={jest.fn()}
          back={jest.fn()}
          sessions={[
            {
              id: 'missing-start',
              tutorId: 'mika',
              subject: 'Unscheduled booking',
              status: 'Upcoming',
            },
            {
              id: 'future-start',
              tutorId: 'mika',
              subject: 'Future booking',
              startsAt: '2026-10-14T06:00:00.000Z',
              status: 'Upcoming',
            },
          ]}
          list={[{ id: 'mika', name: 'Mika Santos' }]}
        />
      </SafeAreaProvider>,
    );
  });

  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(label => typeof label === 'string');
  expect(labels).toContain('Needs review');
  expect(labels.join(' ')).toContain('Date unavailable');
  expect(labels.join(' ')).toContain('Time unavailable');
  expect(
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === 'View Unscheduled booking details'),
  ).toBeDefined();
  await act(async () => renderer.unmount());
});

test('completed sessions with malformed start times still render in history', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionsScreen
          go={jest.fn()}
          back={jest.fn()}
          sessions={[
            {
              id: 'completed-missing-start',
              tutorId: 'mika',
              subject: 'Completed without a schedule',
              status: 'Completed',
            },
            {
              id: 'completed-valid-start',
              tutorId: 'mika',
              subject: 'Completed with a schedule',
              startsAt: '2026-10-12T06:00:00.000Z',
              status: 'Completed',
            },
          ]}
          list={[{ id: 'mika', name: 'Mika Santos' }]}
        />
      </SafeAreaProvider>,
    );
  });

  const completedFilter = renderer.root
    .findAllByType(TouchableOpacity)
    .find(node => node.props.accessibilityLabel === 'Completed');
  await act(async () => completedFilter.props.onPress());

  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(label => typeof label === 'string');
  expect(labels).toContain('Date unavailable • Time unavailable');
  expect(
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === 'View Completed without a schedule details'),
  ).toBeDefined();
  await act(async () => renderer.unmount());
});
