import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Alert, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GroupDetailsScreen } from '../src/features/groups/screens/GroupDetailsScreen';
import { GroupPostScreen } from '../src/features/groups/screens/GroupPostScreen';
import { GroupReportsScreen } from '../src/features/groups/screens/GroupReportsScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function renderScreen(screen) {
  return ReactTestRenderer.create(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {screen}
    </SafeAreaProvider>,
  );
}

afterEach(() => jest.restoreAllMocks());

test('shared group owners can open their report queue', async () => {
  const go = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupDetailsScreen
        go={go}
        back={jest.fn()}
        group={{
          id: 'group-one',
          name: 'Calculus Circle',
          members: 3,
          joined: true,
          shared: true,
          isOwner: true,
          postsLoaded: true,
          meetup: '',
          room: 'C4C-CALC',
          posts: [],
        }}
        membership={jest.fn()}
        addPost={jest.fn()}
        message={jest.fn()}
      />,
    );
  });

  const review = renderer.root.findByProps({
    accessibilityLabel: 'REVIEW GROUP REPORTS',
  });
  await act(async () => review.props.onPress());
  expect(go).toHaveBeenCalledWith({
    page: 'Group Reports',
    groupId: 'group-one',
  });
  await act(async () => renderer.unmount());
});

test('group report queue labels moderated chat messages', async () => {
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupReportsScreen
        back={jest.fn()}
        group={{ id: 'group-one', name: 'Calculus Circle' }}
        reports={[
          {
            id: 'chat-report',
            targetType: 'chatMessage',
            targetAuthor: 'Group member',
            contentSnapshot: 'A reported message.',
            reason: 'abuse',
            status: 'open',
            createdAt: '2026-10-14T12:00:00.000Z',
          },
        ]}
        moderateReport={jest.fn()}
      />,
    );
  });

  const text = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity);
  expect(text).toContain('Chat message');
  expect(text).toContain('A reported message.');
  await act(async () => renderer.unmount());
});

test('nonowners do not get a moderation queue entry point', async () => {
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupDetailsScreen
        go={jest.fn()}
        back={jest.fn()}
        group={{
          id: 'group-one',
          name: 'Calculus Circle',
          members: 3,
          joined: true,
          shared: true,
          isOwner: false,
          postsLoaded: true,
          meetup: '',
          room: 'C4C-CALC',
          posts: [],
        }}
        membership={jest.fn()}
        addPost={jest.fn()}
        message={jest.fn()}
      />,
    );
  });

  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'REVIEW GROUP REPORTS',
    }),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});

test('members can report other members posts and replies without identifying themselves', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const reportContent = jest.fn();
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupPostScreen
        back={jest.fn()}
        group={{
          id: 'group-one',
          name: 'Calculus Circle',
          joined: true,
          shared: true,
        }}
        post={{
          id: 'post-one',
          author: 'Group Owner',
          authorUid: 'owner-uid',
          text: 'A potentially unsafe post',
          replies: [
            {
              id: 'reply-one',
              author: 'Other Member',
              authorUid: 'other-uid',
              text: 'A harmful reply',
              createdAt: '2026-10-13T10:00:00.000Z',
            },
          ],
        }}
        userId="reporter-uid"
        reportContent={reportContent}
        reply={jest.fn()}
      />,
    );
  });

  const reportPost = renderer.root.findByProps({
    accessibilityLabel: 'Report post',
  });
  await act(async () => reportPost.props.onPress());
  expect(alert.mock.calls[0][1]).toContain('Your name is not included');
  await act(async () => {
    alert.mock.calls[0][2].find(button => button.text === 'Spam').onPress();
  });
  expect(reportContent).toHaveBeenCalledWith({
    targetType: 'post',
    targetId: 'post-one',
    postId: null,
    targetAuthor: 'Group Owner',
    contentSnapshot: 'A potentially unsafe post',
    reason: 'spam',
  });
  expect(
    renderer.root
      .findAllByType(Text)
      .some(node =>
        node.props.children?.includes?.(
          'Report queued for group-owner review.',
        ),
      ),
  ).toBe(true);

  const reportNotice = renderer.root.findAllByType(Text).find(node =>
    String(node.props.children).includes('Report queued for group-owner review.'),
  );
  expect(reportNotice.props.accessibilityLiveRegion).toBe('polite');
  expect(reportNotice.props.accessibilityRole).toBeUndefined();

  const reportReply = renderer.root.findByProps({
    accessibilityLabel: 'Report reply by Other Member',
  });
  await act(async () => reportReply.props.onPress());
  await act(async () => {
    alert.mock.calls[1][2]
      .find(button => button.text === 'Abuse or unsafe')
      .onPress();
  });
  expect(reportContent).toHaveBeenLastCalledWith({
    targetType: 'reply',
    targetId: 'reply-one',
    postId: 'post-one',
    targetAuthor: 'Other Member',
    contentSnapshot: 'A harmful reply',
    reason: 'abuse',
  });
  expect(reportContent.mock.calls.flat().some(value => value.reporterUid)).toBe(
    false,
  );
  await act(async () => renderer.unmount());
});

test('members cannot report their own posts or replies in the UI', async () => {
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupPostScreen
        back={jest.fn()}
        group={{
          id: 'group-one',
          name: 'Calculus Circle',
          joined: true,
          shared: true,
        }}
        post={{
          id: 'post-one',
          author: 'Student',
          authorUid: 'student-uid',
          text: 'My own note',
          replies: [
            {
              id: 'reply-one',
              author: 'Student',
              authorUid: 'student-uid',
              text: 'My own reply',
            },
          ],
        }}
        userId="student-uid"
        reportContent={jest.fn()}
        reply={jest.fn()}
      />,
    );
  });

  expect(
    renderer.root.findAllByProps({ accessibilityLabel: 'Report post' }),
  ).toHaveLength(0);
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'Report reply by Student',
    }),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});

test('report owners can dismiss, hide, and restore content', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const moderateReport = jest.fn();
  const reports = [
    {
      id: 'report-open',
      targetType: 'post',
      targetAuthor: 'Student A',
      contentSnapshot: 'Flagged study note',
      reason: 'spam',
      status: 'open',
      createdAt: '2026-10-13T10:00:00.000Z',
    },
    {
      id: 'report-hidden',
      targetType: 'reply',
      targetAuthor: 'Student B',
      contentSnapshot: 'Hidden reply',
      reason: 'abuse',
      status: 'hidden',
      createdAt: '2026-10-13T09:00:00.000Z',
    },
  ];
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupReportsScreen
        back={jest.fn()}
        group={{ id: 'group-one', name: 'Calculus Circle' }}
        reports={reports}
        moderateReport={moderateReport}
      />,
    );
  });

  const copy = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string');
  expect(copy).toContain(
    'Only group owners can review reports. Reporter identity is not included in a report.',
  );
  const hide = renderer.root.findByProps({
    accessibilityLabel: 'HIDE CONTENT',
  });
  await act(async () => hide.props.onPress());
  await act(async () => {
    alert.mock.calls[0][2]
      .find(button => button.text === 'Hide content')
      .onPress();
  });
  expect(moderateReport).toHaveBeenCalledWith('report-open', 'hidden');

  const restore = renderer.root.findByProps({
    accessibilityLabel: 'RESTORE CONTENT',
  });
  await act(async () => restore.props.onPress());
  await act(async () => {
    alert.mock.calls[1][2]
      .find(button => button.text === 'Restore content')
      .onPress();
  });
  expect(moderateReport).toHaveBeenCalledWith('report-hidden', 'restored');
  await act(async () => renderer.unmount());
});
