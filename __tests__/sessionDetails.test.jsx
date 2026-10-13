import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { SessionDetailsScreen } from '../src/features/sessions/screens/SessionDetailsScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderDetails(session, go = jest.fn(), message = jest.fn()) {
  const renderer = ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <SessionDetailsScreen
        go={go}
        back={jest.fn()}
        session={session}
        tutor={{ id: 'mika', name: 'Mika Santos' }}
        cancel={jest.fn()}
        rate={jest.fn()}
        message={message}
      />
    </SafeAreaProvider>,
  );
  return { renderer, go, message };
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

afterEach(() => {
  jest.restoreAllMocks();
});

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

test('invalid schedules show review copy and hide rescheduling', async () => {
  const session = {
    id: 'missing-start',
    tutorId: 'mika',
    subject: 'Unscheduled booking',
    startsAt: null,
    status: 'Upcoming',
  };
  let renderer;
  await act(async () => {
    ({ renderer } = renderDetails(session));
  });

  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(labels).toContain('NEEDS REVIEW');
  expect(labels).toContain('Date unavailable');
  expect(labels).toContain('Time unavailable');
  expect(button(renderer, 'RESCHEDULE')).toBeUndefined();
  await act(async () => renderer.unmount());
});

test('canceling an upcoming session requires choosing the destructive action', async () => {
  const cancel = jest.fn();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const session = {
    id: 'future-session',
    tutorId: 'mika',
    subject: 'Calculus I',
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'Upcoming',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionDetailsScreen
          go={jest.fn()}
          back={jest.fn()}
          session={session}
          tutor={{ id: 'mika', name: 'Mika Santos' }}
          cancel={cancel}
          rate={jest.fn()}
          message={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  await act(async () => button(renderer, 'Cancel session').props.onPress());
  expect(alert).toHaveBeenCalledWith(
    'Cancel session?',
    'This will move the booking to Cancelled in your private schedule. The tutor is not notified.',
    expect.any(Array),
  );
  const actions = alert.mock.calls[0][2];
  await act(async () => actions.find(action => action.text === 'Keep session').onPress?.());
  expect(cancel).not.toHaveBeenCalled();
  await act(async () => actions.find(action => action.style === 'destructive').onPress());
  expect(cancel).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('incoming shared requests can be accepted or declined without rescheduling', async () => {
  const respond = jest.fn(async () => undefined);
  const session = {
    id: 'incoming-request',
    shared: true,
    incoming: true,
    studentName: 'Casey Student',
    tutorId: 'me',
    subject: 'Physics',
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'Pending',
    note: 'Review vectors.',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionDetailsScreen
          go={jest.fn()}
          back={jest.fn()}
          session={session}
          tutor={{ id: 'me', name: 'Jordan Student' }}
          cancel={jest.fn()}
          rate={jest.fn()}
          message={jest.fn()}
          respond={respond}
          privateNotes="Prepare a worked example."
        />
      </SafeAreaProvider>,
    );
  });

  expect(button(renderer, 'ACCEPT SESSION REQUEST')).toBeDefined();
  expect(button(renderer, 'DECLINE REQUEST')).toBeDefined();
  expect(button(renderer, 'RESCHEDULE')).toBeUndefined();
  const visibleText = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity);
  expect(visibleText).toContain('Casey Student');
  expect(visibleText).toContain('Your private notes');

  await act(async () => button(renderer, 'ACCEPT SESSION REQUEST').props.onPress());
  expect(respond).toHaveBeenCalledWith('accept');
  await act(async () => renderer.unmount());
});

test('shared session participants can open their booking chat', async () => {
  const outgoingMessage = jest.fn();
  let renderer;
  await act(async () => {
    ({ renderer } = renderDetails(
      {
        id: 'outgoing-chat-session',
        shared: true,
        incoming: false,
        tutorName: 'Tutor Student',
        subject: 'Calculus',
        startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'Pending',
      },
      jest.fn(),
      outgoingMessage,
    ));
  });
  const tutorMessageButton = button(renderer, 'Message tutor');
  expect(tutorMessageButton).toBeDefined();
  await act(async () => tutorMessageButton.props.onPress());
  expect(outgoingMessage).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());

  const incomingMessage = jest.fn();
  await act(async () => {
    ({ renderer } = renderDetails(
      {
        id: 'incoming-chat-session',
        shared: true,
        incoming: true,
        studentName: 'Student Student',
        subject: 'Calculus',
        startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'Pending',
      },
      jest.fn(),
      incomingMessage,
    ));
  });
  const studentMessageButton = button(renderer, 'Message student');
  expect(studentMessageButton).toBeDefined();
  await act(async () => studentMessageButton.props.onPress());
  expect(incomingMessage).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('device-only session messaging is labeled as private notes', async () => {
  const privateNotes = jest.fn();
  let renderer;
  await act(async () => {
    ({ renderer } = renderDetails(
      {
        id: 'device-session',
        shared: false,
        incoming: false,
        tutorId: 'mika',
        subject: 'Calculus',
        startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'Upcoming',
      },
      jest.fn(),
      privateNotes,
    ));
  });

  expect(button(renderer, 'Open private notes')).toBeDefined();
  expect(button(renderer, 'Message tutor')).toBeUndefined();
  await act(async () => button(renderer, 'Open private notes').props.onPress());
  expect(privateNotes).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('completed sessions display the current rating and allow updating it', async () => {
  const rate = jest.fn();
  const session = {
    id: 'completed-session',
    tutorId: 'mika',
    subject: 'Calculus I',
    startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'Completed',
    rating: 4,
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionDetailsScreen
          go={jest.fn()}
          back={jest.fn()}
          session={session}
          tutor={{ id: 'mika', name: 'Mika Santos' }}
          cancel={jest.fn()}
          rate={rate}
          message={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  expect(
    renderer.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Your rating: ★ 4'),
  ).toBe(true);
  const selectedRating = button(renderer, '★ 4');
  expect(selectedRating.props.accessibilityState.selected).toBe(true);
  await act(async () => button(renderer, '★ 5').props.onPress());
  expect(rate).toHaveBeenCalledWith(5);
  await act(async () => renderer.unmount());
});
