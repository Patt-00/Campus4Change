import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import App from '../App';
import { initialState } from '../src/shared/data/utils';

let mockSession;
let mockTutorError = '';
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
        callbacks.onSignedIn();
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
    tutors: [],
    bookings: [],
    error: mockTutorError,
    actionError: '',
    loading: false,
    hasMoreTutors: false,
    hasMoreBookings: false,
    loadingMoreTutors: false,
    loadingMoreBookings: false,
    tutorsLive: true,
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
  return {
    state: initialState({
        id: 'firebase-student',
        name: 'Student',
        email: 'student@school.test',
        studentId: 'STU-1',
      }),
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
  };
}

test('unverified Firebase accounts see recovery actions and cannot sync shared groups', async () => {
  mockSession = makeSession(
    false,
    'Verification email sent to student@school.test. Check your inbox and spam folder.',
  );
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const resend = renderer.root.findByProps({
    accessibilityLabel: 'Resend verification email',
  });
  const refresh = renderer.root.findByProps({
    accessibilityLabel: "I've verified — check again",
  });
  expect(mockSharedGroupOptions.enabled).toBe(false);
  expect(mockGroupReportOptions.enabled).toBe(false);
  expect(
    renderer.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .join(' '),
  ).toContain('Verification email sent to student@school.test');

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

test('pending cloud sync announces updates with native-safe accessibility props', async () => {
  mockSession = { ...makeSession(true), cloudSyncPending: true };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const notice = renderer.root.findAllByType(Text).find(node =>
    String(node.props.children).includes('Waiting to sync with Firebase'),
  );
  expect(notice).toBeDefined();
  expect(notice.props.accessibilityLiveRegion).toBe('polite');
  expect(notice.props.accessibilityRole).toBeUndefined();
  await act(async () => renderer.unmount());
});
