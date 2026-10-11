import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GroupDetailsScreen } from '../src/features/groups/screens/GroupDetailsScreen';
import { GroupPostScreen } from '../src/features/groups/screens/GroupPostScreen';

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

test('member group feed exposes the older-post page action', async () => {
  const loadMorePosts = jest.fn();
  const groupProps = {
    back: jest.fn(),
    go: jest.fn(),
    group: {
      id: 'group-one',
      name: 'Calculus Circle',
      members: 5,
      joined: true,
      shared: true,
      postsLoaded: true,
      posts: [],
      meetup: '',
      meetupAt: undefined,
      room: 'C-1',
    },
    membership: jest.fn(),
    addPost: jest.fn(),
    message: jest.fn(),
  };
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupDetailsScreen
        {...groupProps}
        hasMorePosts
        postsLive
        loadMorePosts={loadMorePosts}
      />,
    );
  });

  const button = renderer.root.findByProps({
    accessibilityLabel: 'LOAD OLDER POSTS',
  });
  await act(async () => button.props.onPress());
  expect(loadMorePosts).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());

  const refreshPosts = jest.fn();
  await act(async () => {
    renderer = renderScreen(
      <GroupDetailsScreen
        {...groupProps}
        hasMorePosts={false}
        postsLive={false}
        refreshPosts={refreshPosts}
      />,
    );
  });
  const refreshButton = renderer.root.findByProps({
    accessibilityLabel: 'REFRESH LATEST POSTS',
  });
  await act(async () => refreshButton.props.onPress());
  expect(refreshPosts).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test('post details expose older replies only to joined members', async () => {
  const loadMoreReplies = jest.fn();
  const props = {
    back: jest.fn(),
    group: { id: 'group-one', name: 'Calculus Circle', joined: true },
    post: {
      id: 'post-one',
      author: 'Student',
      text: 'Study note',
      replies: [],
      hasMoreReplies: true,
    },
    reply: jest.fn(),
    loadMoreReplies,
  };
  let renderer;
  await act(async () => {
    renderer = renderScreen(<GroupPostScreen {...props} />);
  });

  const button = renderer.root.findByProps({
    accessibilityLabel: 'LOAD OLDER REPLIES',
  });
  await act(async () => button.props.onPress());
  expect(loadMoreReplies).toHaveBeenCalledWith('post-one');
  await act(async () => renderer.unmount());

  const refreshReplies = jest.fn();
  await act(async () => {
    renderer = renderScreen(
      <GroupPostScreen
        {...props}
        post={{ ...props.post, repliesLive: false }}
        refreshReplies={refreshReplies}
      />,
    );
  });
  const refreshButton = renderer.root.findByProps({
    accessibilityLabel: 'REFRESH LATEST REPLIES',
  });
  await act(async () => refreshButton.props.onPress());
  expect(refreshReplies).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());

  await act(async () => {
    renderer = renderScreen(
      <GroupPostScreen
        {...props}
        group={{ ...props.group, joined: false }}
      />,
    );
  });
  expect(
    renderer.root.findAllByProps({
      accessibilityLabel: 'LOAD OLDER REPLIES',
    }),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});
