import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GroupsScreen } from '../src/features/groups/screens/GroupsScreen';
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

test('group directory only mounts the first window for a large loaded list', async () => {
  const groups = Array.from({ length: 80 }, (_, index) => ({
    id: 'group-' + index,
    name: 'Study Group ' + index,
    subject: 'Physics',
    members: 1,
    joined: false,
    shared: true,
  }));
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupsScreen go={jest.fn()} back={jest.fn()} groups={groups} />,
    );
  });

  const mountedGroupCards = renderer.root
    .findAllByType(TouchableOpacity)
    .filter(control => control.props.accessibilityLabel?.startsWith('Open '));
  expect(mountedGroupCards.length).toBeLessThanOrEqual(10);
  expect(mountedGroupCards.length).toBeLessThan(groups.length);
  await act(async () => renderer.unmount());
});

test('group search distinguishes joined results and prompts older-page search', async () => {
  const groups = [
    {
      id: 'joined-calculus',
      name: 'Calculus Study Team',
      subject: 'Calculus',
      members: 4,
      joined: true,
      shared: true,
    },
    {
      id: 'discover-biology',
      name: 'Biology Circle',
      subject: 'Physics',
      members: 3,
      joined: false,
      shared: true,
    },
  ];
  let renderer;
  await act(async () => {
    renderer = renderScreen(
      <GroupsScreen
        go={jest.fn()}
        back={jest.fn()}
        groups={groups}
        hasMoreGroups
      />,
    );
  });

  const search = renderer.root.findByType(TextInput);
  await act(async () => search.props.onChangeText('PHYSICS'));
  const visibleGroupLabels = renderer.root
    .findAllByType(TouchableOpacity)
    .map(control => control.props.accessibilityLabel)
    .filter(label => label?.startsWith('Open '));
  expect(visibleGroupLabels).toEqual(['Open Biology Circle']);
  expect(
    renderer.root.findByProps({
      children: 'No joined groups match this search.',
    }),
  ).toBeTruthy();

  await act(async () => search.props.onChangeText('accounting'));
  expect(
    renderer.root.findByProps({
      children:
        'No discoverable matches on this page. Load older groups to search further.',
    }),
  ).toBeTruthy();
  await act(async () => renderer.unmount());
});

test('study group directory exposes older pages and refresh after paging', async () => {
  const loadMoreGroups = jest.fn();
  const refreshGroups = jest.fn();
  const props = {
    back: jest.fn(),
    go: jest.fn(),
    groups: [
      {
        id: 'shared-one',
        name: 'Calculus Circle',
        subject: 'Calculus',
        members: 5,
        joined: false,
        shared: true,
      },
    ],
    hasMoreGroups: true,
    groupsLive: true,
    loadMoreGroups,
    refreshGroups,
  };
  let renderer;
  await act(async () => {
    renderer = renderScreen(<GroupsScreen {...props} />);
  });

  const loadButton = renderer.root.findByProps({
    accessibilityLabel: 'LOAD OLDER GROUPS',
  });
  await act(async () => loadButton.props.onPress());
  expect(loadMoreGroups).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());

  await act(async () => {
    renderer = renderScreen(
      <GroupsScreen {...props} groupsLive={false} hasMoreGroups={false} />,
    );
  });
  const refreshButton = renderer.root.findByProps({
    accessibilityLabel: 'REFRESH LATEST GROUPS',
  });
  await act(async () => refreshButton.props.onPress());
  expect(refreshGroups).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

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
