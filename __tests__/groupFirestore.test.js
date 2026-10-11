import { firebaseServicesForUser } from '../src/shared/backend/firebase';
import {
  watchSharedGroupPosts,
  watchSharedGroups,
} from '../src/features/groups/data/firestore';
import { mergeGroupDirectory } from '../src/features/groups/hooks/useSharedGroups';

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseServicesForUser: jest.fn(),
}));

function createFirestore() {
  const subscriptions = [];
  const firestore = {
    collection: jest.fn((parent, ...segments) => ({
      path: [parent.path ?? parent, ...segments].join('/'),
    })),
    doc: (parent, ...segments) => ({
      path: [parent.path ?? parent, ...segments].join('/'),
    }),
    getDoc: jest.fn(async () => ({ exists: () => true })),
    onSnapshot: jest.fn((target, next, error) => {
      const subscription = {
        target,
        next,
        error,
        unsubscribe: jest.fn(),
      };
      subscriptions.push(subscription);
      return subscription.unsubscribe;
    }),
    orderBy: (field, direction) => ({ field, direction }),
    query: (ref, ...constraints) => ({ ref, constraints }),
  };
  return { firestore, subscriptions };
}

function groupSnapshot(id, memberCount, updatedAt) {
  return {
    id,
    data: () => ({
      ownerUid: 'owner',
      name: 'Study Group ' + id,
      subject: 'Physics',
      memberCount,
      updatedAt,
      room: 'C4C-ROOM',
    }),
  };
}

async function flushAsyncCallbacks() {
  await new Promise(resolve => setImmediate(resolve));
}

beforeEach(() => jest.clearAllMocks());

test('shared directory entries surface posts loaded into the account cache', () => {
  const post = {
    id: 'post-one',
    author: 'Owner',
    text: 'A shared note',
    createdAt: '2026-10-11T10:00:00.000Z',
    replies: [{ id: 'reply-one', createdAt: '2026-10-11T10:05:00.000Z' }],
  };
  const sharedGroup = {
    id: 'group-one',
    name: 'Current Firestore name',
    shared: true,
    joined: true,
    posts: [],
    postsLoaded: false,
  };
  const cachedGroup = {
    id: 'group-one',
    name: 'Old cached name',
    shared: true,
    joined: true,
    posts: [post],
    postsLoaded: true,
  };

  const [group] = mergeGroupDirectory([cachedGroup], [sharedGroup]);

  expect(group.name).toBe('Current Firestore name');
  expect(group.posts).toEqual([post]);
  expect(group.postsLoaded).toBe(true);
});

test('group directory refreshes only changed metadata and leaves post reads lazy', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onGroups = jest.fn();
  const onError = jest.fn();
  const unsubscribe = watchSharedGroups('student', onGroups, onError);
  const directory = subscriptions[0];
  const firstGroup = groupSnapshot('one', 2, '2026-10-11T10:00:00.000Z');
  const secondGroup = groupSnapshot('two', 3, '2026-10-11T09:00:00.000Z');

  directory.next({
    docs: [firstGroup, secondGroup],
    docChanges: () => [
      { type: 'added', doc: firstGroup },
      { type: 'added', doc: secondGroup },
    ],
  });
  await flushAsyncCallbacks();
  expect(onGroups).toHaveBeenCalledTimes(1);
  expect(onGroups.mock.calls[0][0].map(group => group.id)).toEqual([
    'one',
    'two',
  ]);
  expect(firestore.getDoc).toHaveBeenCalledTimes(2);
  expect(firestore.onSnapshot).toHaveBeenCalledTimes(1);
  expect(onGroups.mock.calls[0][0][0].posts).toEqual([]);

  const updatedSecond = groupSnapshot(
    'two',
    4,
    '2026-10-11T11:00:00.000Z',
  );
  directory.next({
    docs: [updatedSecond, firstGroup],
    docChanges: () => [{ type: 'modified', doc: updatedSecond }],
  });
  await flushAsyncCallbacks();

  expect(firestore.getDoc).toHaveBeenCalledTimes(3);
  expect(onGroups.mock.calls[1][0].map(group => [group.id, group.members])).toEqual([
    ['two', 4],
    ['one', 2],
  ]);
  expect(firestore.collection).toHaveBeenCalledTimes(1);
  unsubscribe();
  expect(directory.unsubscribe).toHaveBeenCalledTimes(1);
});

test('active member post listener streams posts and replies and releases removed listeners', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onPosts = jest.fn();
  const onError = jest.fn();
  const unsubscribe = watchSharedGroupPosts(
    'student',
    'group-one',
    onPosts,
    onError,
  );
  await flushAsyncCallbacks();
  const postsListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/posts'),
  );
  expect(postsListener).toBeDefined();

  const postSnapshot = {
    id: 'post-one',
    ref: { path: 'studyGroups/group-one/posts/post-one' },
    data: () => ({
      authorUid: 'owner',
      author: 'Owner',
      text: 'First note',
      createdAt: '2026-10-11T10:00:00.000Z',
    }),
  };
  postsListener.next({ docs: [postSnapshot] });
  const repliesListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/replies'),
  );
  expect(repliesListener).toBeDefined();
  expect(onPosts.mock.calls.at(-1)[0][0].replies).toEqual([]);

  repliesListener.next({
    docs: [
      {
        id: 'reply-one',
        data: () => ({
          authorUid: 'student',
          author: 'Student',
          text: 'Thanks',
          createdAt: '2026-10-11T10:05:00.000Z',
        }),
      },
    ],
  });
  expect(onPosts.mock.calls.at(-1)[0][0].replies).toEqual([
    {
      id: 'reply-one',
      authorUid: 'student',
      author: 'Student',
      text: 'Thanks',
      createdAt: '2026-10-11T10:05:00.000Z',
    },
  ]);

  postsListener.next({ docs: [] });
  expect(repliesListener.unsubscribe).toHaveBeenCalledTimes(1);
  expect(onPosts.mock.calls.at(-1)[0]).toEqual([]);
  unsubscribe();
  expect(postsListener.unsubscribe).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});

test('nonmembers do not open post or reply listeners', async () => {
  const { firestore, subscriptions } = createFirestore();
  firestore.getDoc.mockResolvedValue({ exists: () => false });
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onPosts = jest.fn();
  const unsubscribe = watchSharedGroupPosts(
    'student',
    'group-one',
    onPosts,
    jest.fn(),
  );
  await flushAsyncCallbacks();

  expect(onPosts).toHaveBeenCalledWith([]);
  expect(subscriptions).toHaveLength(0);
  unsubscribe();
});
