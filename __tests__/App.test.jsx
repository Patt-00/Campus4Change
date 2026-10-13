import React from 'react';
import {
  Alert,
  BackHandler,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

import { initialState } from '../src/shared/data/demo';

const demo = {
  id: 'demo',
  name: 'Alex Rivera',
  email: 'alex@campus.demo',
  studentId: 'DEMO',
};
let mockCurrent = demo;
let mockSaved = {};
let mockActiveUser = null;
const mockStore = {
  signIn: jest.fn(async () => {
    mockActiveUser = mockCurrent.id;
    return JSON.stringify(mockCurrent);
  }),
  signUp: jest.fn(async (name, email, studentId) => {
    mockCurrent = { id: 'new-user', name, email, studentId };
    mockActiveUser = mockCurrent.id;
    return JSON.stringify(mockCurrent);
  }),
  biometricSignIn: jest.fn(async () => {
    mockActiveUser = mockCurrent.id;
    return JSON.stringify(mockCurrent);
  }),
  enableBiometrics: jest.fn(async () => true),
  loadState: jest.fn(async expectedUserId => {
    if (expectedUserId !== mockActiveUser) {
      throw new Error('The active account changed before load.');
    }
    return mockSaved[expectedUserId] ?? null;
  }),
  saveState: jest.fn(async (expectedUserId, value) => {
    if (expectedUserId !== mockActiveUser) {
      throw new Error('The active account changed before save.');
    }
    mockSaved[expectedUserId] = value;
    return true;
  }),
  signOut: jest.fn(async expectedUserId => {
    if (expectedUserId !== mockActiveUser) {
      throw new Error('The active account changed before sign-out.');
    }
    mockActiveUser = null;
    return true;
  }),
};
jest.mock('../src/shared/backend/firebase', () => ({
  firebaseEnabled: false,
  firebaseSignIn: jest.fn(),
  firebaseSignUp: jest.fn(),
  firebaseSignOut: jest.fn(async () => {}),
  firebasePasswordReset: jest.fn(),
  loadCloudState: jest.fn(),
  saveCloudState: jest.fn(),
  watchFirebaseUser: () => () => {},
}));
jest.mock('../src/shared/state/storage', () => ({
  ...jest.requireActual('../src/shared/state/storage'),
  deviceStore: () => mockStore,
}));
jest.mock('react-native-safe-area-context', () => {
  const R = require('react');
  return {
    SafeAreaProvider: ({ children }) =>
      R.createElement(R.Fragment, null, children),
    initialWindowMetrics: null,
    useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  };
});
let renderer;
async function render() {
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
}
function hasText(value) {
  return renderer.root
    .findAllByType(Text)
    .some(n => n.props.children === value);
}
async function press(label) {
  const control = renderer.root
    .findAllByType(TouchableOpacity)
    .find(n => n.props.accessibilityLabel === label);
  expect(control).toBeDefined();
  expect(control.props.disabled).not.toBe(true);
  await ReactTestRenderer.act(async () => {
    await control.props.onPress();
  });
}
async function pressWithLabelStarting(prefix) {
  const control = renderer.root
    .findAllByType(TouchableOpacity)
    .find(n => n.props.accessibilityLabel?.startsWith(prefix));
  expect(control).toBeDefined();
  expect(control.props.disabled).not.toBe(true);
  await ReactTestRenderer.act(async () => {
    await control.props.onPress();
  });
}
async function pressBookingDate(index) {
  const dateControls = renderer.root
    .findAllByType(TouchableOpacity)
    .filter(n => n.props.accessibilityLabel?.startsWith('Select date '));
  const control = dateControls[index];
  expect(control).toBeDefined();
  expect(control.props.disabled).not.toBe(true);
  await ReactTestRenderer.act(async () => {
    await control.props.onPress();
  });
}
async function fill(label, value) {
  const input = renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === label);
  expect(input).toBeDefined();
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText(value);
  });
}
async function completeIntroduction() {
  await press('GET STARTED');
  await press('NEXT');
  await press('NEXT');
  await press('GET STARTED');
}
async function login() {
  await render();
  await completeIntroduction();
  await press('USE DEMO ACCOUNT');
}
async function confirmSignOut() {
  const alert = jest.spyOn(Alert, 'alert');
  await press('Sign out');
  const confirm = alert.mock.calls
    .at(-1)?.[2]
    ?.find(b => b.text === 'Sign out');
  expect(confirm?.onPress).toBeDefined();
  await ReactTestRenderer.act(async () => {
    await confirm.onPress();
  });
}
beforeEach(() => {
  mockCurrent = demo;
  mockSaved = {};
  mockActiveUser = null;
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
  await completeIntroduction();
  await press('SIGN IN');
  expect(hasText('Enter your email or Student ID and password.')).toBe(true);
  expect(mockStore.signIn).not.toHaveBeenCalled();
});
test('introduces novice, intermediate, and expert learners before account access', async () => {
  await render();
  await press('GET STARTED');
  expect(hasText('For the Novice')).toBe(true);
  await press('NEXT');
  expect(hasText('For Intermediates')).toBe(true);
  await press('Go to introduction 3');
  expect(hasText('For Experts')).toBe(true);
  await press('GET STARTED');
  expect(hasText('Welcome back!')).toBe(true);
});
test('can skip the introduction and open login', async () => {
  await render();
  await press('GET STARTED');
  await press('Skip introduction');
  expect(hasText('Welcome back!')).toBe(true);
});
test('shows an authentication failure without opening the app', async () => {
  await render();
  await completeIntroduction();
  await fill('Email or Student ID', 'wrong@school.edu');
  await fill('Password', 'wrongpass');
  mockStore.signIn.mockRejectedValueOnce(new Error('Incorrect password.'));
  await press('SIGN IN');
  expect(hasText('Incorrect password.')).toBe(true);
  expect(hasText('Quick Actions')).toBe(false);
});
test('rejects saved data from another account and clears the native sign-in', async () => {
  mockStore.loadState.mockResolvedValueOnce(
    JSON.stringify(initialState({ ...demo, id: 'other-account' })),
  );
  await login();
  expect(hasText('Saved data belongs to a different account.')).toBe(true);
  expect(hasText('Quick Actions')).toBe(false);
  expect(mockStore.signOut).toHaveBeenCalledTimes(1);
  expect(mockStore.saveState).not.toHaveBeenCalled();
});

test('partial version-one profiles restore missing defaults before Home renders', async () => {
  const savedState = initialState(demo);
  delete savedState.profile.name;
  delete savedState.profile.interests;
  delete savedState.profile.tutorSubjects;
  delete savedState.profile.course;
  delete savedState.profile.year;
  delete savedState.profile.school;
  mockSaved.demo = JSON.stringify(savedState);

  await login();

  const visibleText = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string')
    .join(' ');
  expect(visibleText).toContain('Alex');
  expect(hasText('Quick Actions')).toBe(true);
  expect(hasText('YOUR LEARNING INTERESTS')).toBe(true);
  expect(hasText('Calculus')).toBe(true);
  expect(hasText('Edit interests')).toBe(true);
  const restoredState = JSON.parse(mockSaved.demo);
  const restoredProfile = restoredState.profile;
  expect(restoredProfile.name).toBe('Alex Rivera');
  expect(restoredProfile.interests).toEqual([
    'Calculus',
    'Java',
    'Machine Learning',
  ]);
  expect(restoredProfile.tutorSubjects).toEqual([]);
  expect(restoredProfile.course).toBe('BS Computer Science');
  expect(restoredState.sessions).toEqual(savedState.sessions);
  expect(restoredState.groups).toEqual(savedState.groups);
  expect(restoredState.conversations).toEqual(savedState.conversations);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('partial personal profiles restore blank defaults without demo data', async () => {
  const personal = {
    id: 'partial-student',
    name: 'Student User',
    email: 'student@school.edu',
    studentId: 'STU-100',
  };
  mockCurrent = personal;
  const savedState = initialState(personal);
  delete savedState.profile.interests;
  delete savedState.profile.tutorSubjects;
  delete savedState.profile.course;
  delete savedState.profile.year;
  delete savedState.profile.school;
  mockSaved[personal.id] = JSON.stringify(savedState);

  await login();

  expect(hasText('Complete your profile')).toBe(true);
  const restoredState = JSON.parse(mockSaved[personal.id]);
  expect(restoredState.profile.interests).toEqual([]);
  expect(restoredState.profile.tutorSubjects).toEqual([]);
  expect(restoredState.profile.course).toBe('');
  expect(restoredState.profile.year).toBe('');
  expect(restoredState.profile.school).toBe('');
  expect(restoredState.groups).toEqual([]);
  expect(restoredState.conversations).toEqual([]);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('saved collections with non-record rows restore without dropping valid rows', async () => {
  const savedState = initialState(demo);
  const validCollections = {
    sessions: savedState.sessions,
    groups: savedState.groups,
    conversations: savedState.conversations,
    notices: savedState.notices,
  };
  savedState.sessions = [null, 'invalid-session', ...savedState.sessions];
  savedState.groups = [null, 'invalid-group', ...savedState.groups];
  savedState.conversations = [
    null,
    'invalid-conversation',
    ...savedState.conversations,
  ];
  savedState.notices = [null, 'invalid-notification', ...savedState.notices];
  mockSaved.demo = JSON.stringify(savedState);

  await login();

  expect(hasText('Quick Actions')).toBe(true);
  const restoredState = JSON.parse(mockSaved.demo);
  expect(restoredState.sessions).toEqual(validCollections.sessions);
  expect(restoredState.groups).toEqual(validCollections.groups);
  expect(restoredState.conversations).toEqual(validCollections.conversations);
  expect(restoredState.notices).toEqual(validCollections.notices);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('sign-out saves the latest profile and resets navigation to login', async () => {
  await login();
  await press('Profile');
  await press('Edit profile');
  await fill('Full name', 'Saved Before Sign Out');
  await press('SAVE CHANGES');
  mockStore.saveState.mockClear();
  await confirmSignOut();
  expect(mockStore.saveState).toHaveBeenCalledTimes(1);
  expect(mockStore.signOut).toHaveBeenCalledTimes(1);
  expect(mockStore.saveState.mock.invocationCallOrder[0]).toBeLessThan(
    mockStore.signOut.mock.invocationCallOrder[0],
  );
  expect(JSON.parse(mockSaved.demo).profile.name).toBe('Saved Before Sign Out');
  expect(hasText('SIGN IN')).toBe(true);
  await press('Back');
  expect(hasText('GET STARTED')).toBe(true);
  await completeIntroduction();
  await press('USE DEMO ACCOUNT');
  await press('Profile');
  expect(hasText('Saved Before Sign Out')).toBe(true);
});
test('a failed sign-out save keeps the account open and can be retried', async () => {
  await login();
  await press('Profile');
  mockStore.saveState.mockRejectedValueOnce(new Error('Storage is full.'));
  await confirmSignOut();
  expect(mockStore.signOut).not.toHaveBeenCalled();
  expect(hasText('SIGN IN')).toBe(false);
  expect(hasText('Edit profile')).toBe(true);
  expect(hasText('Retry saving')).toBe(true);
  await press('Retry saving');
  expect(hasText('Retry saving')).toBe(false);
  await confirmSignOut();
  expect(mockStore.signOut).toHaveBeenCalledTimes(1);
  expect(hasText('SIGN IN')).toBe(true);
});
test('search selects the actual tutor, books a future session, and opens details', async () => {
  await login();
  await press('Find a Tutor');
  await fill('Search subject or tutor', 'Mika');
  expect(hasText('Jamie Dela Cruz')).toBe(false);
  await pressWithLabelStarting('Mika Santos.');
  expect(hasText('BS Applied Physics')).toBe(false);
  expect(hasText('Mika Santos')).toBe(true);
  await press('BOOK SESSION');
  await pressBookingDate(1);
  await fill(
    'Example: I need help with integration by parts.',
    'Practice derivatives',
  );
  await press('CONFIRM BOOKING');
  expect(hasText('Added to your schedule')).toBe(true);
  expect(hasText('The tutor has not been notified.')).toBe(true);
  await press('VIEW SESSION DETAILS');
  expect(hasText('Practice derivatives')).toBe(true);
  expect(hasText('Mika Santos')).toBe(true);
  const saved = JSON.parse(mockSaved.demo);
  expect(
    saved.sessions.some(
      x => x.tutorId === 'mika' && x.note === 'Practice derivatives',
    ),
  ).toBe(true);
});
test('a message is saved and remains after the app is remounted', async () => {
  await login();
  await press('Messages');
  const chatCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Chat with Jamie Dela Cruz.'));
  expect(chatCard.props.accessibilityLabel).toContain('Latest message:');
  expect(chatCard.props.accessibilityLabel).not.toContain('..');
  await pressWithLabelStarting('Chat with Jamie Dela Cruz.');
  await fill('Type a message...', 'Please help with algebra');
  await press('SEND');
  expect(hasText('Please help with algebra')).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
  await login();
  await press('Messages');
  await pressWithLabelStarting('Chat with Jamie Dela Cruz.');
  expect(hasText('Please help with algebra')).toBe(true);
});

test('a saved conversation without a message array opens and recovers on send', async () => {
  const savedState = initialState(demo);
  const conversation = savedState.conversations.find(
    item => item.tutorId === 'jamie',
  );
  const numericTimestampConversation = savedState.conversations.find(
    item => item.tutorId === 'renzo',
  );
  delete conversation.messages;
  numericTimestampConversation.messages[0].sentAt = Date.parse(
    '2026-10-12T06:00:00.000Z',
  );
  mockSaved.demo = JSON.stringify(savedState);

  await login();
  await press('Messages');
  const conversationCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Chat with Jamie Dela Cruz.'));
  expect(conversationCard).toBeDefined();
  expect(conversationCard.props.accessibilityLabel).toContain(
    'Start a conversation',
  );
  const renzoCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Chat with Renzo Lim.'));
  expect(renzoCard.props.accessibilityLabel).toContain('Latest message: Thanks!');

  await pressWithLabelStarting('Chat with Jamie Dela Cruz.');
  await fill('Type a message...', 'Recovered thread');
  await press('SEND');
  expect(hasText('Recovered thread')).toBe(true);
  const savedConversation = JSON.parse(mockSaved.demo).conversations.find(
    item => item.tutorId === 'jamie',
  );
  expect(savedConversation.messages.at(-1)).toMatchObject({
    text: 'Recovered thread',
    mine: true,
  });
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('creates a group, publishes a post, and saves a reply', async () => {
  await login();
  await press('Study Groups');
  await press('+ CREATE GROUP');
  await fill('Group name', 'Exam Review Team');
  await fill('Subject', 'Physics');
  await press('CREATE GROUP');
  expect(hasText('Exam Review Team')).toBe(true);
  expect(hasText('No meetup scheduled')).toBe(true);
  await press('OPEN GROUP SESSION');
  expect(hasText('Group Session')).toBe(true);
  expect(hasText('Exam Review Team')).toBe(true);
  expect(hasText('Focus timer')).toBe(false);
  expect(hasText('START TIMER')).toBe(false);
  await press('Back');
  await fill('Write a study note...', 'Review Newton laws');
  await press('POST NOTE');
  await pressWithLabelStarting('Post by Alex Rivera:');
  await fill('Write a reply...', 'Start with the first law');
  await press('SEND REPLY');
  expect(hasText('Start with the first law')).toBe(true);
  const group = JSON.parse(mockSaved.demo).groups.find(
    g => g.name === 'Exam Review Team',
  );
  expect(group.posts[0].replies[0].text).toBe('Start with the first law');
});
test('group-session Back preserves a private draft until it is saved to the group', async () => {
  await login();
  await press('Study Groups');
  await press('+ CREATE GROUP');
  await fill('Group name', 'Draft Review Team');
  await fill('Subject', 'Physics');
  await press('CREATE GROUP');
  await press('OPEN GROUP SESSION');
  await fill('Session notes', 'Draft not shared yet');
  await press('Back');

  let saved = JSON.parse(mockSaved.demo);
  let group = saved.groups.find(item => item.name === 'Draft Review Team');
  expect(group.posts).toHaveLength(0);
  expect(saved.roomNotes[group.id]).toBe('Draft not shared yet');

  await press('OPEN GROUP SESSION');
  const noteInput = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Session notes');
  expect(noteInput.props.value).toBe('Draft not shared yet');
  await press('SAVE NOTES AND RETURN');

  saved = JSON.parse(mockSaved.demo);
  group = saved.groups.find(item => item.name === 'Draft Review Team');
  expect(group.posts.map(post => post.text)).toContain('Draft not shared yet');
  expect(saved.roomNotes[group.id]).toBeUndefined();
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
  await completeIntroduction();
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
  expect(JSON.parse(mockSaved['new-user']).profile.interests).toEqual([]);
  expect(JSON.parse(mockSaved['new-user']).groups).toHaveLength(0);
});

test('custom interests can be added, deduplicated, removed, and reopened without requiring school fields', async () => {
  mockCurrent = { ...demo, id: 'fresh-user', name: 'New Student' };
  await render();
  await completeIntroduction();
  await fill('Email or Student ID', 'new@school.edu');
  await fill('Password', 'TestPass123');
  await press('SIGN IN');
  expect(hasText('Choose what to learn')).toBe(true);
  await press('ADD INTERESTS');
  await fill('Add an interest', '  Nursing   care  ');
  await press('ADD INTEREST');
  await fill('Add an interest', 'nursing care');
  await press('ADD INTEREST');
  expect(hasText('That interest is already in your list.')).toBe(true);
  await fill('Add an interest', 'Drawing');
  await press('ADD INTEREST');
  await press('Remove Drawing');
  await press('SAVE CHANGES');
  expect(hasText('Nursing care')).toBe(true);
  const saved = JSON.parse(mockSaved['fresh-user']);
  expect(saved.profile.interests).toEqual(['Nursing care']);
  expect(saved.profile.school).toBe('');
  await ReactTestRenderer.act(async () => renderer.unmount());
  await render();
  await completeIntroduction();
  await fill('Email or Student ID', 'new@school.edu');
  await fill('Password', 'TestPass123');
  await press('SIGN IN');
  expect(hasText('Nursing care')).toBe(true);
  await press('Find a Tutor');
  expect(hasText('Your directory is empty')).toBe(true);
  expect(hasText('Mika Santos')).toBe(false);
});

test('a chosen tutor time is retained by the booking form', async () => {
  await login();
  await press('Find a Tutor');
  await pressWithLabelStarting('Mika Santos.');
  await press('6:00 PM');
  await pressBookingDate(1);
  await press('CONFIRM BOOKING');
  expect(hasText('Added to your schedule')).toBe(true);
  const booked = JSON.parse(mockSaved.demo).sessions[0];
  expect(booked.tutorId).toBe('mika');
  expect(new Date(booked.startsAt).getHours()).toBe(18);
});

test('group creation rejects invalid schedules and stores the chosen meetup', async () => {
  await login();
  await press('Study Groups');
  await press('+ CREATE GROUP');
  await fill('Group name', 'Drawing Circle');
  await fill('Subject', 'Drawing');
  await fill('Meetup date', '2030-02-30');
  await fill('Meetup time', '16:30');
  await press('CREATE GROUP');
  expect(
    hasText('Enter a valid future date and time, or leave both fields empty.'),
  ).toBe(true);
  await fill('Meetup date', '2030-04-20');
  await press('CREATE GROUP');
  expect(hasText('Drawing Circle')).toBe(true);
  expect(hasText('No meetup scheduled')).toBe(false);
  const group = JSON.parse(mockSaved.demo).groups.find(
    g => g.name === 'Drawing Circle',
  );
  expect(new Date(group.meetupAt).getHours()).toBe(16);
  expect(new Date(group.meetupAt).getMinutes()).toBe(30);
});

test('About explains device-only behavior before sign-in and returns to login', async () => {
  await render();
  await press('GET STARTED');
  await press('Skip introduction');
  await press('About Campus4Change');
  expect(hasText('Connecting with other students')).toBe(true);
  await press('Back');
  expect(hasText('SIGN IN')).toBe(true);
});
test('booked session workspace preserves drafts and completes without a focus timer', async () => {
  const listener = jest.spyOn(BackHandler, 'addEventListener');
  await login();
  await press('View all');
  await pressWithLabelStarting('View Calculus I details.');
  await press('OPEN SESSION WORKSPACE');
  expect(hasText('Booked Session')).toBe(true);
  expect(hasText('Focus timer')).toBe(false);
  await fill('Agenda and notes', 'Saved study draft');
  await ReactTestRenderer.act(async () => {
    const onBack = listener.mock.calls.at(-1)[1];
    expect(onBack({ type: 'hardwareBackPress', timeStamp: Date.now() })).toBe(
      true,
    );
  });
  await press('OPEN SESSION WORKSPACE');
  const input = renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === 'Agenda and notes');
  expect(input.props.value).toBe('Saved study draft');
  await fill('Agenda and notes', '');
  await ReactTestRenderer.act(async () => {
    expect(
      listener.mock.calls.at(-1)[1]({
        type: 'hardwareBackPress',
        timeStamp: Date.now(),
      }),
    ).toBe(true);
  });
  await press('OPEN SESSION WORKSPACE');
  const cleared = renderer.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === 'Agenda and notes');
  expect(cleared.props.value).toBe('');
  await press('MARK SESSION COMPLETE');
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
  const notificationCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Session reminder.'));
  expect(notificationCard.props.accessibilityLabel).toContain(
    'Your Calculus I session is on your schedule.',
  );
  expect(notificationCard.props.accessibilityLabel).not.toContain('..');
  await pressWithLabelStarting('Session reminder.');
  expect(hasText('Session Details')).toBe(true);
  const saved = JSON.parse(mockSaved.demo);
  expect(saved.notices.find(n => n.title === 'Session reminder').read).toBe(
    true,
  );
});
