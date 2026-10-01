import React from 'react';
import { BackHandler, Text, TextInput, TouchableOpacity } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import type { Account } from '../src/shared/data/types';

const demo: Account = {
  id: 'demo',
  name: 'Alex Rivera',
  email: 'alex@campus.demo',
  studentId: 'DEMO',
};
let mockCurrent = demo;
let mockSaved: Record<string, string> = {};
const mockStore = {
  signIn: jest.fn(async () => JSON.stringify(mockCurrent)),
  signUp: jest.fn(async (name: string, email: string, studentId: string) => {
    mockCurrent = { id: 'new-user', name, email, studentId };
    return JSON.stringify(mockCurrent);
  }),
  biometricSignIn: jest.fn(async () => JSON.stringify(mockCurrent)),
  enableBiometrics: jest.fn(async () => true),
  loadState: jest.fn(async () => mockSaved[mockCurrent.id] ?? null),
  saveState: jest.fn(async (value: string) => {
    mockSaved[mockCurrent.id] = value;
    return true;
  }),
  signOut: jest.fn(async () => true),
};
jest.mock('../src/shared/state/storage', () => ({
  ...jest.requireActual('../src/shared/state/storage'),
  deviceStore: () => mockStore,
}));
jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});
let renderer: ReturnType<typeof ReactTestRenderer.create>;
async function render() {
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
}
function hasText(value: string) {
  return renderer.root
    .findAllByType(Text)
    .some(n => n.props.children === value);
}
async function press(label: string) {
  const control = renderer.root
    .findAllByType(TouchableOpacity)
    .find(n => n.props.accessibilityLabel === label);
  expect(control).toBeDefined();
  expect(control!.props.disabled).not.toBe(true);
  await ReactTestRenderer.act(async () => {
    await control!.props.onPress();
  });
}
async function fill(label: string, value: string) {
  const input = renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === label);
  expect(input).toBeDefined();
  await ReactTestRenderer.act(async () => {
    input!.props.onChangeText(value);
  });
}
async function login() {
  await render();
  await press('GET STARTED');
  await press('USE DEMO ACCOUNT');
}
beforeEach(() => {
  mockCurrent = demo;
  mockSaved = {};
  jest.clearAllMocks();
});
afterEach(async () => {
  if (renderer) {
    await ReactTestRenderer.act(async () => renderer.unmount());
  }
  jest.restoreAllMocks();
});

test('renders onboarding and rejects an empty sign-in form', async () => {
  await render();
  expect(hasText('GET STARTED')).toBe(true);
  await press('GET STARTED');
  await press('SIGN IN');
  expect(hasText('Enter your email or Student ID and password.')).toBe(true);
  expect(mockStore.signIn).not.toHaveBeenCalled();
});
test('shows an authentication failure without opening the app', async () => {
  await render();
  await press('GET STARTED');
  await fill('Email or Student ID', 'wrong@school.edu');
  await fill('Password', 'wrongpass');
  mockStore.signIn.mockRejectedValueOnce(new Error('Incorrect password.'));
  await press('SIGN IN');
  expect(hasText('Incorrect password.')).toBe(true);
  expect(hasText('Quick Actions')).toBe(false);
});
test('search selects the actual tutor, books a future session, and opens details', async () => {
  await login();
  await press('Find a Tutor');
  await fill('Search subject or tutor', 'Mika');
  expect(hasText('Jamie Dela Cruz')).toBe(false);
  await press('Mika Santos, view profile');
  expect(hasText('BS Applied Physics')).toBe(false);
  expect(hasText('Mika Santos')).toBe(true);
  await press('BOOK SESSION');
  await press('Date 1');
  await fill(
    'Example: I need help with integration by parts.',
    'Practice derivatives',
  );
  await press('CONFIRM BOOKING');
  expect(hasText('Session booked!')).toBe(true);
  await press('VIEW SESSION DETAILS');
  expect(hasText('Practice derivatives')).toBe(true);
  expect(hasText('Mika Santos')).toBe(true);
  const saved = JSON.parse(mockSaved.demo);
  expect(
    saved.sessions.some(
      (x: { tutorId: string; note: string }) =>
        x.tutorId === 'mika' && x.note === 'Practice derivatives',
    ),
  ).toBe(true);
});
test('a message is saved and remains after the app is remounted', async () => {
  await login();
  await press('Messages');
  await press('Chat with Jamie Dela Cruz');
  await fill('Type a message...', 'Please help with algebra');
  await press('SEND');
  expect(hasText('Please help with algebra')).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
  await login();
  await press('Messages');
  await press('Chat with Jamie Dela Cruz');
  expect(hasText('Please help with algebra')).toBe(true);
});
test('creates a group, publishes a post, and saves a reply', async () => {
  await login();
  await press('Study Groups');
  await press('+ CREATE GROUP');
  await fill('Group name', 'Exam Review Team');
  await fill('Subject', 'Physics');
  await press('CREATE GROUP');
  expect(hasText('Exam Review Team')).toBe(true);
  await fill('Write a study note...', 'Review Newton laws');
  await press('POST NOTE');
  await press('Post by Alex Rivera');
  await fill('Write a reply...', 'Start with the first law');
  await press('SEND REPLY');
  expect(hasText('Start with the first law')).toBe(true);
  const group = JSON.parse(mockSaved.demo).groups.find(
    (g: { name: string }) => g.name === 'Exam Review Team',
  );
  expect(group.posts[0].replies[0].text).toBe('Start with the first law');
});
test('profile changes appear in the profile and survive saved state', async () => {
  await login();
  await press('Profile');
  await press('Edit profile');
  await fill('Full name', 'Alex Updated');
  await press('SAVE CHANGES');
  expect(hasText('Alex Updated')).toBe(true);
  expect(JSON.parse(mockSaved.demo).profile.name).toBe('Alex Updated');
});
test('sign-up validates fields and creates a separate local account', async () => {
  await render();
  await press('GET STARTED');
  await press('Sign up');
  await press('CREATE ACCOUNT');
  expect(mockStore.signUp).not.toHaveBeenCalled();
  await fill('Full name', 'New Student');
  await fill('School email', 'new@school.edu');
  await fill('Student ID', '123456');
  await fill('Password', 'TestPass123');
  await press('CREATE ACCOUNT');
  expect(mockStore.signUp).toHaveBeenCalledWith(
    'New Student',
    'new@school.edu',
    '123456',
    'TestPass123',
  );
  expect(JSON.parse(mockSaved['new-user']).sessions).toHaveLength(0);
});
test('Android back preserves written and empty study drafts, and a session can be completed', async () => {
  const listener = jest.spyOn(BackHandler, 'addEventListener');
  await login();
  await press('View all');
  await press('View Calculus I details');
  await press('JOIN SESSION');
  await fill('Write what you learned...', 'Saved study draft');
  await ReactTestRenderer.act(async () => {
    const onBack = listener.mock.calls.at(-1)![1];
    expect(onBack({ type: 'hardwareBackPress', timeStamp: Date.now() })).toBe(
      true,
    );
  });
  await press('JOIN SESSION');
  const input = renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === 'Write what you learned...');
  expect(input!.props.value).toBe('Saved study draft');
  await fill('Write what you learned...', '');
  await ReactTestRenderer.act(async () => {
    expect(
      listener.mock.calls.at(-1)![1]({
        type: 'hardwareBackPress',
        timeStamp: Date.now(),
      }),
    ).toBe(true);
  });
  await press('JOIN SESSION');
  const cleared = renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === 'Write what you learned...');
  expect(cleared!.props.value).toBe('');
  await press('COMPLETE SESSION');
  expect(hasText('COMPLETED')).toBe(true);
});

test('failed local saves show a retry action that saves the current account data', async () => {
  mockStore.saveState.mockRejectedValueOnce(new Error('Storage is full.'));
  await login();
  expect(hasText('Retry saving')).toBe(true);
  expect(mockSaved.demo).toBeUndefined();
  await press('Retry saving');
  expect(hasText('Retry saving')).toBe(false);
  expect(JSON.parse(mockSaved.demo).profile.id).toBe('demo');
});

test('opening a notification marks it read and opens its linked session', async () => {
  await login();
  await press('Notifications, 3 unread');
  await press('Session reminder, unread');
  expect(hasText('Session Details')).toBe(true);
  const saved = JSON.parse(mockSaved.demo);
  expect(
    saved.notices.find((n: { title: string }) => n.title === 'Session reminder')
      .read,
  ).toBe(true);
});
