import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TextInput, TouchableOpacity } from 'react-native';
import { SessionWorkspaceScreen } from '../src/features/sessions/screens/SessionWorkspaceScreen';
import { sessionTimingStatus } from '../src/features/sessions/data/status';
import { useSessionClock } from '../src/features/sessions/hooks/useSessionClock';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

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

function visibleCopy(renderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string')
    .join(' ');
}

function SessionTimingHarness({ session }) {
  const now = useSessionClock(session);
  return <Text>{sessionTimingStatus(session, now)}</Text>;
}

afterEach(() => {
  jest.useRealTimers();
});

test.each([
  [false, 'Message tutor'],
  [true, 'Message student'],
])('shared workspace opens participant chat (incoming=%s)', async (incoming, label) => {
  const message = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'shared-session',
            shared: true,
            incoming,
            studentName: 'Casey Student',
            subject: 'Physics',
            startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={message}
          save={jest.fn()}
          complete={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  const copy = visibleCopy(renderer);
  expect(button(renderer, label)).toBeDefined();
  expect(copy).toContain('Your agenda and notes stay private in your account.');
  expect(copy).toContain('Use the participant chat above to message the other person.');
  expect(copy).not.toContain('Live chat and calls are not available yet.');
  expect(button(renderer, 'MARK SESSION COMPLETE')).toBeUndefined();

  await act(async () => button(renderer, label).props.onPress());
  expect(message).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('a started shared session exposes the complete action', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'started-shared-session',
            shared: true,
            incoming: false,
            subject: 'Calculus',
            startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={jest.fn()}
          save={jest.fn()}
          complete={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  expect(visibleCopy(renderer)).toContain('IN PROGRESS');
  expect(button(renderer, 'MARK SESSION COMPLETE')).toBeDefined();
  await act(async () => renderer.unmount());
});

test('a failed completion result keeps the workspace action retryable', async () => {
  const complete = jest.fn(async () => ({ error: 'The tutor request changed.' }));
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'started-session',
            shared: true,
            incoming: false,
            subject: 'Calculus',
            startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={jest.fn()}
          save={jest.fn()}
          complete={complete}
        />
      </SafeAreaProvider>,
    );
  });

  await act(async () =>
    button(renderer, 'MARK SESSION COMPLETE').props.onPress(),
  );

  const buttonAfterFailure = button(renderer, 'MARK SESSION COMPLETE');
  expect(complete).toHaveBeenCalledWith('');
  expect(visibleCopy(renderer)).toContain('The tutor request changed.');
  expect(buttonAfterFailure.props.disabled).not.toBe(true);
  await act(async () => renderer.unmount());
});

test('a rejected completion request shows a recoverable error', async () => {
  const complete = jest.fn(async () => {
    throw new Error('The server is unavailable.');
  });
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'started-session',
            shared: false,
            incoming: false,
            subject: 'Calculus',
            startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={jest.fn()}
          save={jest.fn()}
          complete={complete}
        />
      </SafeAreaProvider>,
    );
  });

  await act(async () =>
    button(renderer, 'MARK SESSION COMPLETE').props.onPress(),
  );

  const completeButton = button(renderer, 'MARK SESSION COMPLETE');
  expect(complete).toHaveBeenCalledWith('');
  expect(visibleCopy(renderer)).toContain('The server is unavailable.');
  expect(completeButton.props.disabled).not.toBe(true);
  await act(async () => renderer.unmount());
});

test('an in-flight completion cannot be submitted twice', async () => {
  let finishComplete;
  const complete = jest.fn(
    () => new Promise(resolve => {
      finishComplete = resolve;
    }),
  );
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'started-session',
            shared: false,
            incoming: false,
            subject: 'Calculus',
            startsAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={jest.fn()}
          save={jest.fn()}
          complete={complete}
        />
      </SafeAreaProvider>,
    );
  });

  let completionPromise;
  await act(async () => {
    completionPromise = button(renderer, 'MARK SESSION COMPLETE').props.onPress();
  });
  expect(complete).toHaveBeenCalledTimes(1);
  expect(button(renderer, 'MARK SESSION COMPLETE').props.disabled).toBe(true);

  await act(async () =>
    button(renderer, 'MARK SESSION COMPLETE').props.onPress(),
  );
  expect(complete).toHaveBeenCalledTimes(1);

  await act(async () => {
    finishComplete(undefined);
    await completionPromise;
  });
  await act(async () => renderer.unmount());
});

test('saving workspace notes forwards the latest draft to the owner flow', async () => {
  const save = jest.fn();
  const onDraft = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'device-session',
            shared: false,
            incoming: false,
            subject: 'Physics',
            startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={jest.fn()}
          onDraft={onDraft}
          save={save}
          complete={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  await act(async () =>
    input(renderer, 'Agenda and notes').props.onChangeText('Review wave motion'),
  );
  expect(onDraft).toHaveBeenCalledWith('Review wave motion');
  await act(async () =>
    button(renderer, 'SAVE NOTES AND RETURN').props.onPress(),
  );
  expect(save).toHaveBeenCalledWith('Review wave motion');
  await act(async () => renderer.unmount());
});

test('a past-due session remains completable for overdue cleanup', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'past-due-session',
            shared: false,
            incoming: false,
            subject: 'Calculus',
            startsAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={jest.fn()}
          save={jest.fn()}
          complete={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  expect(visibleCopy(renderer)).toContain('PAST DUE');
  expect(button(renderer, 'MARK SESSION COMPLETE')).toBeDefined();
  await act(async () => renderer.unmount());
});

test('device-only workspace labels messages as private notes', async () => {
  const privateNotes = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SessionWorkspaceScreen
          session={{
            id: 'device-session',
            shared: false,
            incoming: false,
            subject: 'Calculus',
            startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            status: 'Upcoming',
          }}
          tutor={{ id: 'tutor', name: 'Jordan Student' }}
          back={jest.fn()}
          message={privateNotes}
          save={jest.fn()}
          complete={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });

  const copy = visibleCopy(renderer);
  expect(button(renderer, 'Open private notes')).toBeDefined();
  expect(button(renderer, 'Message tutor')).toBeUndefined();
  expect(copy).toContain('not sent to the tutor');
  await act(async () => button(renderer, 'Open private notes').props.onPress());
  expect(privateNotes).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('the workspace timing updates when an upcoming session starts', async () => {
  jest.useFakeTimers();
  const session = {
    id: 'clocked-session',
    status: 'Upcoming',
    startsAt: new Date(Date.now() + 1000).toISOString(),
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SessionTimingHarness session={session} />,
    );
  });
  expect(visibleCopy(renderer)).toContain('Upcoming');

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(visibleCopy(renderer)).toContain('In progress');
  await act(async () => renderer.unmount());
});
