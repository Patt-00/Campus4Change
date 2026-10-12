import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  syncSharedGroupAction,
  watchSharedGroupPosts,
  watchSharedGroups,
} from '../src/features/groups/data/firestore';
import { useSharedGroups } from '../src/features/groups/hooks/useSharedGroups';

jest.mock('../src/features/groups/data/firestore', () => ({
  syncSharedGroupAction: jest.fn(),
  watchSharedGroupPosts: jest.fn(),
  watchSharedGroups: jest.fn(),
}));

let currentResult;

beforeEach(() => {
  jest.clearAllMocks();
});

function Harness({ session }) {
  currentResult = useSharedGroups(session);
  return null;
}

test('the group hook exposes paging state and calls the active directory subscription', async () => {
  let finishLoad;
  const subscription = {
    loadMoreGroups: jest.fn(
      () =>
        new Promise(resolve => {
          finishLoad = resolve;
        }),
    ),
    unsubscribe: jest.fn(),
  };
  watchSharedGroups.mockReturnValue(subscription);
  const session = {
    uid: 'student',
    enabled: true,
    state: {
      profile: { id: 'student', name: 'Student' },
      groups: [],
      pendingSharedActions: [],
    },
    dispatch: jest.fn(),
    activeGroupId: null,
    activePostId: null,
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness session={session} />);
  });

  const onGroups = watchSharedGroups.mock.calls[0][1];
  const latestGroup = {
    id: 'latest-group',
    name: 'Calculus Circle',
    subject: 'Calculus',
    shared: true,
    joined: false,
    members: 4,
    posts: [],
    postsLoaded: true,
  };
  await act(async () => {
    onGroups([latestGroup], { hasMoreGroups: true, groupsLive: true });
  });
  expect(currentResult.hasMoreGroups).toBe(true);
  expect(currentResult.groupsLive).toBe(true);
  expect(currentResult.groups).toEqual([latestGroup]);

  let loadPromise;
  await act(async () => {
    loadPromise = currentResult.loadMoreGroups();
  });
  expect(subscription.loadMoreGroups).toHaveBeenCalledTimes(1);
  expect(currentResult.loadingMoreGroups).toBe(true);

  const olderGroup = { ...latestGroup, id: 'older-group', name: 'Physics Circle' };
  await act(async () => {
    onGroups([latestGroup, olderGroup], {
      hasMoreGroups: false,
      groupsLive: false,
    });
    finishLoad();
    await loadPromise;
  });
  expect(currentResult.hasMoreGroups).toBe(false);
  expect(currentResult.groupsLive).toBe(false);
  expect(currentResult.loadingMoreGroups).toBe(false);
  expect(currentResult.groups.map(group => group.id)).toEqual([
    'latest-group',
    'older-group',
  ]);

  await act(async () => renderer.unmount());
  expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  expect(watchSharedGroupPosts).not.toHaveBeenCalled();
  expect(syncSharedGroupAction).not.toHaveBeenCalled();
});

test('directory errors stay visible and retry replaces the failed subscription', async () => {
  const subscriptions = [];
  watchSharedGroups.mockImplementation((uid, onGroups, onError) => {
    const subscription = {
      loadMoreGroups: jest.fn(),
      unsubscribe: jest.fn(),
    };
    subscriptions.push({ subscription, onGroups, onError });
    return subscription;
  });
  const session = {
    uid: 'student',
    enabled: true,
    state: {
      profile: { id: 'student', name: 'Student' },
      groups: [],
      pendingSharedActions: [],
    },
    dispatch: jest.fn(),
    activeGroupId: null,
    activePostId: null,
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness session={session} />);
  });

  const group = {
    id: 'shared-one',
    name: 'Calculus Circle',
    subject: 'Calculus',
    shared: true,
    joined: false,
    members: 4,
    posts: [],
    postsLoaded: true,
  };
  await act(async () => {
    subscriptions[0].onGroups([group], {
      hasMoreGroups: false,
      groupsLive: true,
    });
  });
  await act(async () => {
    subscriptions[0].onError(new Error('Directory disconnected'));
  });
  expect(currentResult.error).toBe('Directory disconnected');
  expect(currentResult.groups).toEqual([group]);

  await act(async () => currentResult.retry());
  expect(watchSharedGroups).toHaveBeenCalledTimes(2);
  expect(subscriptions[0].subscription.unsubscribe).toHaveBeenCalledTimes(1);
  expect(currentResult.error).toBe('');

  await act(async () => renderer.unmount());
  expect(subscriptions[1].subscription.unsubscribe).toHaveBeenCalledTimes(1);
});

test('a failed shared post shows a retry message and clears after synchronization', async () => {
  const operation = {
    id: 'post-operation',
    type: 'post',
    groupId: 'shared-one',
    post: {
      id: 'post-one',
      author: 'Student',
      text: 'A saved note',
      createdAt: '2026-10-12T10:00:00.000Z',
      replies: [],
    },
  };
  const session = {
    uid: 'student',
    enabled: true,
    state: {
      profile: { id: 'student', name: 'Student' },
      groups: [],
      pendingSharedActions: [operation],
    },
    dispatch: jest.fn(),
    activeGroupId: null,
    activePostId: null,
  };
  watchSharedGroups.mockReturnValue({ unsubscribe: jest.fn() });
  syncSharedGroupAction.mockRejectedValueOnce({ code: 'permission-denied' });
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness session={session} />);
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  expect(currentResult.actionError).toContain('Check group membership');
  expect(currentResult.actionError).toContain('wait five seconds');
  expect(syncSharedGroupAction).toHaveBeenCalledTimes(1);

  syncSharedGroupAction.mockResolvedValueOnce();
  await act(async () => {
    currentResult.retryActions();
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  expect(syncSharedGroupAction).toHaveBeenCalledTimes(2);
  expect(currentResult.actionError).toBe('');
  expect(session.dispatch).toHaveBeenCalledWith({
    type: 'sharedGroupActionSynced',
    id: 'post-operation',
  });
  await act(async () => renderer.unmount());
});

test('failed older post and reply pages expose errors and clear loading state', async () => {
  let rejectPosts;
  let rejectReplies;
  const postSubscription = {
    loadMorePosts: jest.fn(
      () =>
        new Promise((_, reject) => {
          rejectPosts = reject;
        }),
    ),
    loadMoreReplies: jest.fn(
      () =>
        new Promise((_, reject) => {
          rejectReplies = reject;
        }),
    ),
    unsubscribe: jest.fn(),
  };
  watchSharedGroups.mockReturnValue({ unsubscribe: jest.fn() });
  watchSharedGroupPosts.mockReturnValue(postSubscription);
  const session = {
    uid: 'student',
    enabled: true,
    state: {
      profile: { id: 'student', name: 'Student' },
      groups: [
        {
          id: 'shared-one',
          name: 'Calculus Circle',
          subject: 'Calculus',
          shared: true,
          joined: true,
          members: 4,
          posts: [],
          postsLoaded: true,
        },
      ],
      pendingSharedActions: [],
    },
    dispatch: jest.fn(),
    activeGroupId: 'shared-one',
    activePostId: 'post-one',
  };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness session={session} />);
  });

  const onPosts = watchSharedGroupPosts.mock.calls[0][2];
  await act(async () => {
    onPosts(
      [
        {
          id: 'post-one',
          author: 'Student',
          text: 'Notes',
          createdAt: '2026-10-12T10:00:00.000Z',
          replies: [],
        },
      ],
      { hasMorePosts: true, postsLive: false },
    );
  });

  let postsPromise;
  await act(async () => {
    postsPromise = currentResult.loadMorePosts();
    await Promise.resolve();
  });
  expect(currentResult.loadingMorePosts).toBe(true);
  await act(async () => {
    rejectPosts(new Error('Older posts unavailable'));
    await postsPromise;
  });
  expect(currentResult.contentError).toBe('Older posts unavailable');
  expect(currentResult.loadingMorePosts).toBe(false);

  let repliesPromise;
  await act(async () => {
    repliesPromise = currentResult.loadMoreReplies('post-one');
    await Promise.resolve();
  });
  expect(currentResult.loadingReplyIds.has('post-one')).toBe(true);
  await act(async () => {
    rejectReplies(new Error('Older replies unavailable'));
    await repliesPromise;
  });
  expect(currentResult.contentError).toBe('Older replies unavailable');
  expect(currentResult.loadingReplyIds.has('post-one')).toBe(false);
  await act(async () => renderer.unmount());
  expect(postSubscription.unsubscribe).toHaveBeenCalledTimes(1);
});
