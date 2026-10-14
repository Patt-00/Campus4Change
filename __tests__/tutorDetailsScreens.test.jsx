import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity } from 'react-native';
import { BookingConfirmedScreen } from '../src/features/tutors/screens/BookingConfirmedScreen';
import { TutorDetailsScreen } from '../src/features/tutors/screens/TutorDetailsScreen';

jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});

function renderScreen(screen) {
  return ReactTestRenderer.create(
    <SafeAreaProvider>{screen}</SafeAreaProvider>,
  );
}

function button(renderer, label) {
  return renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel === label);
}

function texts(renderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string');
}

function communityTutor(overrides = {}) {
  return {
    id: 'tutor-1',
    name: 'Mika Santos',
    course: 'BS Physics',
    year: '3rd Year',
    subjects: ['Calculus', 'Physics'],
    about: 'I explain topics with step-by-step examples.',
    shared: true,
    own: false,
    ...overrides,
  };
}

function futureSession(overrides = {}) {
  return {
    id: 'session-1',
    subject: 'Calculus',
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

test('shared tutor profile routes preset slots and session requests without private notes', async () => {
  const go = jest.fn();
  const message = jest.fn();
  const tutor = communityTutor();
  let renderer;

  await act(async () => {
    renderer = renderScreen(
      <TutorDetailsScreen
        go={go}
        back={jest.fn()}
        tutor={tutor}
        message={message}
      />,
    );
  });

  expect(texts(renderer)).toContain('Community tutor · accepts session requests');
  expect(button(renderer, 'OPEN PRIVATE CHAT NOTES')).toBeUndefined();
  await act(async () => button(renderer, '4:30 PM').props.onPress());
  expect(go).toHaveBeenLastCalledWith({
    page: 'Book Session',
    tutorId: tutor.id,
    slot: 1,
  });
  await act(async () => button(renderer, 'REQUEST A SESSION').props.onPress());
  expect(go).toHaveBeenLastCalledWith({
    page: 'Book Session',
    tutorId: tutor.id,
  });
  expect(message).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test('a device-only tutor profile opens private notes and keeps local booking available', async () => {
  const go = jest.fn();
  const message = jest.fn();
  const tutor = communityTutor({ shared: false });
  let renderer;

  await act(async () => {
    renderer = renderScreen(
      <TutorDetailsScreen
        go={go}
        back={jest.fn()}
        tutor={tutor}
        message={message}
      />,
    );
  });

  await act(async () => button(renderer, 'OPEN PRIVATE CHAT NOTES').props.onPress());
  expect(message).toHaveBeenCalledWith(tutor);
  await act(async () => button(renderer, 'BOOK SESSION').props.onPress());
  expect(go).toHaveBeenLastCalledWith({
    page: 'Book Session',
    tutorId: tutor.id,
  });
  await act(async () => renderer.unmount());
});

test('an owner can edit their tutor profile but cannot request a session from themself', async () => {
  const go = jest.fn();
  let renderer;

  await act(async () => {
    renderer = renderScreen(
      <TutorDetailsScreen
        go={go}
        back={jest.fn()}
        tutor={communityTutor({ own: true })}
        message={jest.fn()}
      />,
    );
  });

  expect(button(renderer, 'EDIT TUTOR PROFILE')).toBeDefined();
  expect(button(renderer, 'REQUEST A SESSION')).toBeUndefined();
  expect(button(renderer, 'BOOK SESSION')).toBeUndefined();
  await act(async () => button(renderer, 'EDIT TUTOR PROFILE').props.onPress());
  expect(go).toHaveBeenCalledWith('Be a Tutor');
  await act(async () => renderer.unmount());
});

test('a shared booking confirmation keeps the request pending and opens Requests', async () => {
  const go = jest.fn();
  const session = futureSession({ shared: true, status: 'Pending' });
  let renderer;

  await act(async () => {
    renderer = renderScreen(
      <BookingConfirmedScreen
        go={go}
        session={session}
        tutor={communityTutor()}
      />,
    );
  });

  expect(texts(renderer)).toContain('Request sent');
  expect(texts(renderer)).toContain('Waiting for tutor response');
  expect(button(renderer, 'VIEW MY REQUESTS')).toBeDefined();
  await act(async () => button(renderer, 'VIEW MY REQUESTS').props.onPress());
  expect(go).toHaveBeenCalledWith({ page: 'Sessions', filter: 'Requests' });
  await act(async () => renderer.unmount());
});

test('a device-only booking confirmation offers Home and session details with safe date fallbacks', async () => {
  const go = jest.fn();
  const session = futureSession({
    shared: false,
    status: 'Upcoming',
    startsAt: 'invalid-date',
  });
  let renderer;

  await act(async () => {
    renderer = renderScreen(
      <BookingConfirmedScreen
        go={go}
        session={session}
        tutor={communityTutor({ shared: false })}
      />,
    );
  });

  expect(texts(renderer)).toContain('Added to your schedule');
  expect(texts(renderer)).toContain('Date unavailable');
  expect(texts(renderer)).toContain('Time unavailable');
  await act(async () => button(renderer, 'BACK TO HOME').props.onPress());
  expect(go).toHaveBeenLastCalledWith('Home');
  await act(async () => button(renderer, 'VIEW SESSION DETAILS').props.onPress());
  expect(go).toHaveBeenLastCalledWith({
    page: 'Session Details',
    sessionId: session.id,
  });
  await act(async () => renderer.unmount());
});
