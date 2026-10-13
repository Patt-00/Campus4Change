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

import { initialState } from '../src/shared/data/utils';
import { makeQaState, qaAccount } from '../test-support/qaState';

let mockCurrent = qaAccount;
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
  await signInCurrentAccount();
}
async function signInCurrentAccount() {
  await fill('Email or Student ID', mockCurrent.email);
  await fill('Password', 'TestPass123');
  await press('SIGN IN');
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
  mockCurrent = qaAccount;
  mockSaved = { [qaAccount.id]: JSON.stringify(makeQaState()) };
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
  expect(hasText('USE DEMO ACCOUNT')).toBe(false);
  expect(hasText('alex@campus.demo')).toBe(false);
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
    JSON.stringify(initialState({ ...qaAccount, id: 'other-account' })),
  );
  await login();
  expect(hasText('Saved data belongs to a different account.')).toBe(true);
  expect(hasText('Quick Actions')).toBe(false);
  expect(mockStore.signOut).toHaveBeenCalledTimes(1);
  expect(mockStore.saveState).not.toHaveBeenCalled();
});

test('partial version-one profiles restore blank defaults before Home renders', async () => {
  const savedState = makeQaState();
  delete savedState.profile.name;
  delete savedState.profile.interests;
  delete savedState.profile.tutorSubjects;
  delete savedState.profile.course;
  delete savedState.profile.year;
  delete savedState.profile.school;
  mockSaved[qaAccount.id] = JSON.stringify(savedState);

  await login();

  const visibleText = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string')
    .join(' ');
  expect(visibleText).toContain('Jordan');
  expect(hasText('Quick Actions')).toBe(true);
  expect(hasText('YOUR NEXT MATCH AWAITS')).toBe(true);
  expect(hasText('Choose what to learn')).toBe(true);
  expect(hasText('ADD INTERESTS')).toBe(true);
  const restoredState = JSON.parse(mockSaved[qaAccount.id]);
  const restoredProfile = restoredState.profile;
  expect(restoredProfile.name).toBe('Jordan Student');
  expect(restoredProfile.interests).toEqual([]);
  expect(restoredProfile.tutorSubjects).toEqual([]);
  expect(restoredProfile.course).toBe('');
  expect(restoredProfile.year).toBe('');
  expect(restoredProfile.school).toBe('');
  expect(restoredState.sessions).toEqual(savedState.sessions);
  expect(restoredState.groups).toEqual(savedState.groups);
  expect(restoredState.conversations).toEqual(savedState.conversations);
  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('partial personal profiles restore blank defaults and empty collections', async () => {
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
  const savedState = makeQaState();
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
  mockSaved[qaAccount.id] = JSON.stringify(savedState);

  await login();

  expect(hasText('Quick Actions')).toBe(true);
  const restoredState = JSON.parse(mockSaved[qaAccount.id]);
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
  expect(JSON.parse(mockSaved[qaAccount.id]).profile.name).toBe(
    'Saved Before Sign Out',
  );
  expect(hasText('SIGN IN')).toBe(true);
  await press('Back');
  expect(hasText('GET STARTED')).toBe(true);
  await completeIntroduction();
  await signInCurrentAccount();
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
test('device-only tutor search starts without bundled tutor profiles', async () => {
  await login();
  await press('Find a Tutor');
  expect(hasText('Your directory is empty')).toBe(true);
  expect(hasText('Mika Santos')).toBe(false);
  expect(hasText('Jamie Dela Cruz')).toBe(false);
  await press('Create tutor profile');
  expect(hasText('Be a Tutor')).toBe(true);
});
test('a message is saved and remains after the app is remounted', async () => {
  await login();
  await press('Messages');
  const chatCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Chat with Taylor Student.'));
  expect(chatCard.props.accessibilityLabel).toContain('Latest message:');
  expect(chatCard.props.accessibilityLabel).not.toContain('..');
  await pressWithLabelStarting('Chat with Taylor Student.');
  await fill('Type a message...', 'Please help with algebra');
  await press('SEND');
  expect(hasText('Please help with algebra')).toBe(true);
  await ReactTestRenderer.act(async () => renderer.unmount());
  await login();
  await press('Messages');
  await pressWithLabelStarting('Chat with Taylor Student.');
  expect(hasText('Please help with algebra')).toBe(true);
});

test('a saved conversation without a message array opens and recovers on send', async () => {
  const savedState = makeQaState();
  const conversation = savedState.conversations.find(
    item => item.tutorId === 'tutor-taylor',
  );
  const numericTimestampConversation = savedState.conversations.find(
    item => item.tutorId === 'tutor-casey',
  );
  delete conversation.messages;
  numericTimestampConversation.messages[0].sentAt = Date.parse(
    '2026-10-12T06:00:00.000Z',
  );
  mockSaved[qaAccount.id] = JSON.stringify(savedState);

  await login();
  await press('Messages');
  const conversationCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Chat with Taylor Student.'));
  expect(conversationCard).toBeDefined();
  expect(conversationCard.props.accessibilityLabel).toContain(
    'Start a conversation',
  );
  const renzoCard = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Chat with Casey Student.'));
  expect(renzoCard.props.accessibilityLabel).toContain('Latest message: Thanks!');

  await pressWithLabelStarting('Chat with Taylor Student.');
  await fill('Type a message...', 'Recovered thread');
  await press('SEND');
  expect(hasText('Recovered thread')).toBe(true);
  const savedConversation = JSON.parse(mockSaved[qaAccount.id]).conversations.find(
    item => item.tutorId === 'tutor-taylor',
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
  await pressWithLabelStarting('Post by Jordan Student:');
  await fill('Write a reply...', 'Start with the first law');
  await press('SEND REPLY');
  expect(hasText('Start with the first law')).toBe(true);
  const group = JSON.parse(mockSaved[qaAccount.id]).groups.find(
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

  let saved = JSON.parse(mockSaved[qaAccount.id]);
  let group = saved.groups.find(item => item.name === 'Draft Review Team');
  expect(group.posts).toHaveLength(0);
  expect(saved.roomNotes[group.id]).toBe('Draft not shared yet');

  await press('OPEN GROUP SESSION');
  const noteInput = renderer.root
    .findAllByType(TextInput)
    .find(input => input.props.accessibilityLabel === 'Session notes');
  expect(noteInput.props.value).toBe('Draft not shared yet');
  await press('SAVE NOTES AND RETURN');

  saved = JSON.parse(mockSaved[qaAccount.id]);
  group = saved.groups.find(item => item.name === 'Draft Review Team');
  expect(group.posts.map(post => post.text)).toContain('Draft not shared yet');
  expect(saved.roomNotes[group.id]).toBeUndefined();
});
test('profile changes appear in the profile and survive saved state', async () => {
  await login();
  await press('Profile');
  await press('Edit profile');
  await fill('Full name', 'Jordan Updated');
  await press('SAVE CHANGES');
  expect(hasText('Jordan Updated')).toBe(true);
  expect(JSON.parse(mockSaved[qaAccount.id]).profile.name).toBe(
    'Jordan Updated',
  );
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
  mockCurrent = { ...qaAccount, id: 'fresh-user', name: 'New Student' };
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
  const group = JSON.parse(mockSaved[qaAccount.id]).groups.find(
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
test('booked session workspace preserves drafts and completes after start without a focus timer', async () => {
  const timedState = makeQaState();
  timedState.sessions[0].startsAt = new Date(
    Date.now() - 15 * 60 * 1000,
  ).toISOString();
  mockSaved[qaAccount.id] = JSON.stringify(timedState);
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

test('future booked sessions cannot be completed before their scheduled start', async () => {
  await login();
  await press('View all');
  await pressWithLabelStarting('View Calculus I details.');
  await press('OPEN SESSION WORKSPACE');
  expect(hasText('UPCOMING')).toBe(true);
  expect(hasText('MARK SESSION COMPLETE')).toBe(false);
});

test('failed local saves show a retry action that saves the current account data', async () => {
  mockStore.saveState.mockRejectedValueOnce(new Error('Storage is full.'));
  await login();
  expect(hasText('Retry saving')).toBe(true);
  expect(mockSaved[qaAccount.id]).toBeDefined();
  await press('Retry saving');
  expect(hasText('Retry saving')).toBe(false);
  expect(JSON.parse(mockSaved[qaAccount.id]).profile.id).toBe(qaAccount.id);
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
  const saved = JSON.parse(mockSaved[qaAccount.id]);
  expect(saved.notices.find(n => n.title === 'Session reminder').read).toBe(
    true,
  );
});
