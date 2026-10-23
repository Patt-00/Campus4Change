import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Image, Text, TouchableOpacity } from 'react-native';
import App from '../App';
import { initialState } from '../src/shared/data/utils';

let mockSession;
let mockTutorError = '';
let mockTutorListings = [];
let mockTutorHasMore = false;
let mockTutorsLoaded = true;
let mockSharedGroupOptions;
let mockGroupReportOptions;
const mockSharedGroupState = {
  groups: [],
  error: '',
  retry: jest.fn(),
  actionError: '',
  retryActions: jest.fn(),
  contentError: '',
  retryContent: jest.fn(),
  hasMorePosts: false,
  postsLive: false,
  loadingMorePosts: false,
  loadMorePosts: jest.fn(),
  loadingReplyIds: new Set(),
  loadMoreReplies: jest.fn(),
  queueGroupCreation: jest.fn(),
  dispatchGroupChange: jest.fn(),
};
const mockGroupReportState = {
  reports: [],
  error: '',
  loadingReports: false,
  hasMoreReports: false,
  reportsLive: false,
  loadingMoreReports: false,
  loadMoreReports: jest.fn(),
  refreshReports: jest.fn(),
};

jest.mock('../src/shared/state/useCampusSession', () => ({
  useCampusSession: callbacks => {
    const R = require('react');
    R.useEffect(() => {
      if (mockSession?.sessionType) {
        callbacks.onSignedIn(mockSession.state);
      }
    }, []);
    return mockSession;
  },
}));

jest.mock('../src/shared/state/storage', () => ({
  hasCompletedIntroduction: jest.fn(async () => true),
  markIntroductionCompleted: jest.fn(async () => true),
}));

jest.mock('../src/features/groups/hooks/useSharedGroups', () => ({
  useSharedGroups: options => {
    mockSharedGroupOptions = options;
    return mockSharedGroupState;
  },
}));

jest.mock('../src/features/groups/hooks/useSharedGroupReports', () => ({
  useSharedGroupReports: options => {
    mockGroupReportOptions = options;
    return mockGroupReportState;
  },
}));

jest.mock('../src/features/tutors/hooks/useSharedTutors', () => ({
  useSharedTutors: () => ({
    tutors: mockTutorListings,
    bookings: [],
    error: mockTutorError,
    actionError: '',
    loading: false,
    hasMoreTutors: mockTutorHasMore,
    hasMoreBookings: false,
    loadingMoreTutors: false,
    loadingMoreBookings: false,
    tutorsLive: true,
    tutorsLoaded: mockTutorsLoaded,
    bookingsLive: true,
    loadMoreTutors: jest.fn(),
    loadMoreBookings: jest.fn(),
    retry: jest.fn(),
    publishProfile: jest.fn(),
    unpublishProfile: jest.fn(),
    requestSession: jest.fn(),
    updateRequest: jest.fn(),
  }),
}));

jest.mock('../src/features/messages/hooks/useSharedMessages', () => ({
  useSharedMessages: () => ({
    conversations: [],
    activeConversation: null,
    messages: [],
    loading: false,
    error: '',
    send: jest.fn(),
    retry: jest.fn(),
  }),
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

function makeSession(emailVerified, emailVerificationMessage = '') {
  const state = initialState({
        id: 'firebase-student',
        accountUuid: '00000000-0000-4000-8000-000000000012',
        name: 'Student',
        email: 'student@school.test',
      });
  state.profile.courseId = 'quezon-city-computer-studies-computer-science';
  state.profile.course = 'Computer Science';
  state.profile.year = '3';
  state.profile.campus = 'T.I.P. Quezon City';
  return {
    state,
    saveError: '',
    auth: {
      firebaseConfigured: true,
      resendEmailVerification: jest.fn(),
      refreshEmailVerification: jest.fn(),
    },
    dispatch: jest.fn(),
    signOut: jest.fn(),
    retrySave: jest.fn(),
    restoring: false,
    sessionType: 'firebase',
    emailVerified,
    emailVerificationMessage,
    emailVerificationToast: null,
    dismissVerificationToast: jest.fn(),
  };
}

beforeEach(() => {
  mockTutorError = '';
  mockTutorListings = [];
  mockTutorHasMore = false;
  mockTutorsLoaded = true;
  mockSharedGroupState.error = '';
  mockSession = null;
});

test('shows the branded restore screen while account restoration is pending', async () => {
  mockSession = makeSession(true);
  mockSession.restoring = true;

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(
    renderer.root.findByProps({ accessibilityLabel: 'Campus4Change logo' }),
  ).toBeDefined();
  expect(renderer.root.findAllByType(Image)).toHaveLength(1);
  expect(
    renderer.root
      .findAllByType(Text)
      .map(node => String(node.props.children))
      .join(' '),
  ).toContain('Restoring your account...');

  await act(async () => renderer.unmount());
});

test('unverified Firebase accounts receive a Notifications item with recovery actions', async () => {
  mockSession = makeSession(
    false,
    'Verification email sent to student@school.test. Check your inbox and spam folder.',
  );
  mockSession.state.profile.interests = ['Physics'];
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(mockSharedGroupOptions.enabled).toBe(false);
  expect(mockGroupReportOptions.enabled).toBe(false);
  expect(
    renderer.root
      .findAllByType(Text)
      .map(node => String(node.props.children))
      .join(' '),
  ).toContain('Verify your email to browse public tutor profiles.');
  const bell = renderer.root
    .findAllByType(TouchableOpacity)
    .find(control => control.props.accessibilityLabel?.startsWith('Notifications, '));
  expect(bell.props.accessibilityLabel).toBe('Notifications, 1 unread');
  await act(async () => bell.props.onPress());

  const resend = renderer.root.findByProps({
    accessibilityLabel: 'Resend verification email',
  });
  const refresh = renderer.root.findByProps({
    accessibilityLabel: "I've verified — check again",
  });
  expect(
    renderer.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .join(' '),
  ).toContain('Verify student@school.test');

  await act(async () => resend.props.onPress());
  await act(async () => refresh.props.onPress());
  expect(mockSession.auth.resendEmailVerification).toHaveBeenCalledTimes(1);
  expect(mockSession.auth.refreshEmailVerification).toHaveBeenCalledTimes(1);

  mockSession = makeSession(true);
  await act(async () => renderer.update(<App />));
  expect(mockSharedGroupOptions.enabled).toBe(true);
  expect(mockGroupReportOptions.enabled).toBe(false);
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Resend verification email',
    }),
  ).toHaveLength(0);

  await act(async () => renderer.unmount());
});

test('Home carries paged tutor recommendations through its shared-data hook', async () => {
  mockSession = makeSession(true);
  mockSession.state.profile.interests = ['Physics'];
  mockTutorListings = [
    {
      id: 'physics-tutor',
      name: 'Taylor Student',
      subjects: ['Physics'],
      own: false,
    },
  ];
  mockTutorHasMore = true;

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const copy = renderer.root
    .findAllByType(Text)
    .map(node => String(node.props.children))
    .join(' ');
  expect(copy).toContain(
    '1 matching tutor found in the loaded listings. More may match as you browse.',
  );
  expect(copy).not.toContain('1 tutor matches your interests.');

  await act(async () => renderer.unmount());
});

test('verification toast opens its related Notifications screen when tapped', async () => {
  mockSession = makeSession(
    false,
    'Verification email sent to student@school.test. Check your inbox and spam folder.',
  );
  mockSession.emailVerificationToast = {
    id: 'verification-event-1',
    tone: 'success',
    title: 'Verification email sent',
    message: 'Open the link we sent to student@school.test to verify your account.',
    destination: 'Notifications',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(
    renderer.root.findAllByType(Text).some(
      node => node.props.children === 'Verification email sent',
    ),
  ).toBe(true);
  const open = renderer.root.findByProps({
    accessibilityLabel: 'Open notification: Verification email sent',
  });
  expect(open.props.accessibilityRole).toBe('button');
  await act(async () => open.props.onPress());
  expect(
    renderer.root.findAllByType(Text).some(
      node => node.props.children === 'Verify your email',
    ),
  ).toBe(true);
  await act(async () => renderer.unmount());
});

test('email-verified toast opens a matching success notice without recovery actions', async () => {
  mockSession = makeSession(
    true,
    'Email verified. Your account can now use shared campus features.',
  );
  mockSession.emailVerificationToast = {
    id: 'verification-complete-1',
    tone: 'success',
    title: 'Email verified',
    message: 'Your account can now use shared campus features.',
    destination: 'Notifications',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const open = renderer.root.findByProps({
    accessibilityLabel: 'Open notification: Email verified',
  });
  await act(async () => open.props.onPress());

  const copy = renderer.root
    .findAllByType(Text)
    .map(node => String(node.props.children))
    .join(' ');
  expect(copy).toContain('Email verified');
  expect(copy).toContain(
    'Your account can now use shared campus features.',
  );
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Resend verification email',
    }),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});

test('pending sync no longer shows the old full-width top banner', async () => {
  mockSession = makeSession(true);
  mockSession.cloudSyncPending = true;
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .join(' ');
  expect(copy).not.toContain('Saved on this device. Waiting to sync with Firebase.');
  await act(async () => renderer.unmount());
});

test('shared-data errors only appear on screens that use that data', async () => {
  mockSession = makeSession(true);
  mockSharedGroupState.error = 'Group permissions are unavailable.';
  mockTutorError = 'Tutor permissions are unavailable.';

  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const copy = () =>
    renderer.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .join(' ');
  expect(copy()).toContain(
    'Tutor listings and session requests could not be refreshed',
  );
  expect(copy()).not.toContain('Study groups could not be refreshed');

  const profileTab = renderer.root.findByProps({
    accessibilityLabel: 'Profile',
  });
  await act(async () => profileTab.props.onPress());
  expect(copy()).not.toContain(
    'Tutor listings and session requests could not be refreshed',
  );
  expect(copy()).not.toContain('Study groups could not be refreshed');

  const homeTab = renderer.root.findByProps({ accessibilityLabel: 'Home' });
  await act(async () => homeTab.props.onPress());
  const studyGroupsAction = renderer.root.findByProps({
    accessibilityLabel: 'Study Groups',
  });
  await act(async () => studyGroupsAction.props.onPress());
  expect(copy()).toContain('Study groups could not be refreshed');
  expect(copy()).not.toContain(
    'Tutor listings and session requests could not be refreshed',
  );

  await act(async () => renderer.unmount());
  mockSharedGroupState.error = '';
  mockTutorError = '';
});
