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
