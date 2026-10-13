import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import App from '../App';
import { initialState } from '../src/shared/data/demo';

let mockSession;
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
