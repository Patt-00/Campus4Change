import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Modal, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '../src/features/home/screens/HomeScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

afterEach(() => {
  jest.restoreAllMocks();
});

function renderHome(props) {
  return ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <HomeScreen {...props} />
    </SafeAreaProvider>,
  );
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

function buttonStartingWith(renderer, prefix) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith(prefix));
}

function input(renderer, label) {
  return renderer.root
    .findAllByType(TextInput)
    .find(control => control.props.accessibilityLabel === label);
}

test('home searches tutors, shows interest matches, quick actions, and next session', async () => {
  const go = jest.fn();
  const state = {
    profile: {
      id: 'student',
      name: 'Alex Student',
      interests: ['Physics'],
      school: '',
    },
    notices: [],
    sessions: [
      {
        id: 'later',
        subject: 'Calculus II',
        tutorId: 'mika',
        startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'Upcoming',
      },
      {
        id: 'sooner',
        subject: 'Physics',
        tutorId: 'mika',
        startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'Upcoming',
      },
    ],
  };
  let renderer;
  await act(async () => {
    renderer = renderHome({
      go,
      state,
      directory: [
        { id: 'mika', subjects: ['Physics'], own: false },
        { id: 'own', subjects: ['Physics'], own: true },
      ],
      tutors: [{ id: 'mika', name: 'Mika Santos' }],
    });
  });

  await act(async () => button(renderer, 'VIEW MATCHES').props.onPress());
  expect(go).toHaveBeenLastCalledWith({
    page: 'Tutor Search',
    query: 'Physics',
  });
  await act(async () => button(renderer, 'Edit interests').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Preferences');

  const search = input(renderer, 'Search for subjects, skills, or tutors...');
  await act(async () => search.props.onChangeText('Mika'));
  await act(async () => search.props.onSubmitEditing());
  expect(go).toHaveBeenLastCalledWith({ page: 'Tutor Search', query: 'Mika' });
  await act(async () => button(renderer, 'Search tutors').props.onPress());
  expect(go).toHaveBeenLastCalledWith({ page: 'Tutor Search', query: 'Mika' });

  for (const [label, destination] of [
    ['Find a Tutor', 'Tutor Search'],
    ['Be a Tutor', 'Be a Tutor'],
    ['Study Groups', 'Study Groups'],
    ['Sessions', 'Sessions'],
  ]) {
    await act(async () => button(renderer, label).props.onPress());
    expect(go).toHaveBeenLastCalledWith(destination);
  }
  await act(async () => button(renderer, 'Complete your profile').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Edit Profile');

  const nextSession = buttonStartingWith(
    renderer,
    'Open Physics session. Scheduled',
  );
  expect(nextSession.props.accessibilityLabel).toContain('With Mika Santos');
  await act(async () => nextSession.props.onPress());
  expect(go).toHaveBeenLastCalledWith({
    page: 'Session Details',
    sessionId: 'sooner',
  });
  await act(async () => renderer.unmount());
});

test('home skips malformed session times when selecting the next booking', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T06:00:00Z'));
  const state = {
    profile: { id: 'student', name: 'Alex Student', interests: [], school: '' },
    notices: [],
    sessions: [
      {
        id: 'valid-session',
        subject: 'Valid',
        tutorId: 'mika',
        startsAt: '2026-10-14T06:00:00.000Z',
        status: 'Upcoming',
      },
      {
        id: 'malformed-session',
        subject: 'Malformed',
        tutorId: 'mika',
        startsAt: Date.parse('2026-10-15T06:00:00.000Z'),
        status: 'Upcoming',
      },
    ],
  };
  let renderer;
  await act(async () => {
    renderer = renderHome({ go: jest.fn(), state, directory: [], tutors: [] });
  });

  expect(
    buttonStartingWith(renderer, 'Open Valid session. Scheduled'),
  ).toBeDefined();
  expect(
    buttonStartingWith(renderer, 'Open Malformed session. Scheduled'),
  ).toBeUndefined();
  await act(async () => renderer.unmount());
});

test('home menu opens, routes to a page, and closes on request', async () => {
  const go = jest.fn();
  const state = {
    profile: { id: 'student', name: 'Alex Rivera', interests: [], school: 'TIP' },
    notices: [],
    sessions: [],
  };
  let renderer;
  await act(async () => {
    renderer = renderHome({ go, state, directory: [], tutors: [] });
  });

  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  await act(async () => button(renderer, 'Open menu').props.onPress());
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  await act(async () => button(renderer, 'Profile').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Profile');
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);

  await act(async () => button(renderer, 'Open menu').props.onPress());
  await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  await act(async () => renderer.unmount());
});

test('empty home state offers interest and profile setup', async () => {
  const go = jest.fn();
  const state = {
    profile: { id: 'student', name: 'New Student', interests: [], school: '' },
    notices: [],
    sessions: [],
  };
  let renderer;
  await act(async () => {
    renderer = renderHome({ go, state, directory: [], tutors: [] });
  });

  await act(async () => button(renderer, 'ADD INTERESTS').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Preferences');
  await act(async () => button(renderer, 'Complete your profile').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Edit Profile');
  await act(async () => renderer.unmount());
});

test('home warns about past-due bookings instead of showing a clear schedule', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T06:00:00Z'));
  const go = jest.fn();
  const state = {
    profile: { id: 'student', name: 'Alex Student', interests: [], school: 'TIP' },
    notices: [],
    sessions: [
      {
        id: 'past-physics',
        subject: 'Physics',
        tutorId: 'mika',
        startsAt: '2026-10-02T06:00:00.000Z',
        status: 'Upcoming',
      },
      {
        id: 'past-calculus',
        subject: 'Calculus I',
        tutorId: 'jamie',
        startsAt: '2026-10-01T06:00:00.000Z',
        status: 'Upcoming',
      },
    ],
  };
  let renderer;
  await act(async () => {
    renderer = renderHome({ go, state, directory: [], tutors: [] });
  });

  const visibleText = renderer.root
    .findAllByType(Text)
    .map(node =>
      Array.isArray(node.props.children)
        ? node.props.children.join('')
        : String(node.props.children),
    )
    .join(' ');
  expect(visibleText).toContain('2 past-due bookings need review');
  expect(visibleText).not.toContain('Your schedule is clear');
  expect(
    buttonStartingWith(renderer, 'Open Physics session. Scheduled'),
  ).toBeUndefined();
  await act(async () => button(renderer, 'REVIEW PAST-DUE BOOKINGS').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Sessions');
  await act(async () => renderer.unmount());
});
