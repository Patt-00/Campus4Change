import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { SessionDetailsScreen } from '../src/features/sessions/screens/SessionDetailsScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderDetails(session, go = jest.fn()) {
  const renderer = ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <SessionDetailsScreen
        go={go}
        back={jest.fn()}
        session={session}
        tutor={{ id: 'mika', name: 'Mika Santos' }}
        cancel={jest.fn()}
        rate={jest.fn()}
        message={jest.fn()}
      />
    </SafeAreaProvider>,
  );
  return { renderer, go };
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

test('past-due sessions remain openable but cannot be rescheduled', async () => {
  const session = {
    id: 'missed-session',
    tutorId: 'mika',
    subject: 'Calculus I',
    startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'Upcoming',
  };
  let renderer;
  await act(async () => {
    ({ renderer } = renderDetails(session));
  });

  expect(button(renderer, 'OPEN SESSION WORKSPACE')).toBeTruthy();
  expect(button(renderer, 'RESCHEDULE')).toBeUndefined();
  await act(async () => renderer.unmount());
});

test('upcoming sessions retain their reschedule action', async () => {
  const go = jest.fn();
  const session = {
    id: 'future-session',
    tutorId: 'mika',
    subject: 'Calculus I',
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'Upcoming',
  };
  let renderer;
  await act(async () => {
    ({ renderer } = renderDetails(session, go));
  });

  await act(async () => button(renderer, 'RESCHEDULE').props.onPress());
  expect(go).toHaveBeenCalledWith({
    page: 'Book Session',
    tutorId: 'mika',
    sessionId: 'future-session',
  });
  await act(async () => renderer.unmount());
});
