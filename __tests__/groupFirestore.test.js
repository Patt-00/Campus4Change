import { firebaseServicesForUser } from '../src/shared/backend/firebase';
import {
  syncSharedGroupAction,
  watchSharedGroupPosts,
  watchSharedGroups,
} from '../src/features/groups/data/firestore';
import {
  mergeGroupDirectory,
  mergeSharedGroupFeed,
  mergeSyncedGroupAction,
} from '../src/features/groups/hooks/useSharedGroups';

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
    getDocs: jest.fn(async () => ({ docs: [] })),
    limit: count => ({ type: 'limit', count }),
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
    startAfter: snapshot => ({ type: 'startAfter', snapshot }),
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

function postSnapshot(id, createdAt) {
  return {
    id,
    ref: { path: 'studyGroups/group-one/posts/' + id },
    data: () => ({
      authorUid: 'owner',
      author: 'Owner',
      text: 'Post ' + id,
      createdAt,
    }),
  };
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

  const [group] = mergeGroupDirectory([cachedGroup], [sharedGroup], [
    {
      id: 'post-op',
      type: 'post',
      groupId: 'group-one',
      post,
    },
  ]);

  expect(group.name).toBe('Current Firestore name');
  expect(group.posts).toEqual([post]);
  expect(group.postsLoaded).toBe(true);

  const [withoutPendingContent] = mergeGroupDirectory(
    [cachedGroup],
    [sharedGroup],
  );
  expect(withoutPendingContent.posts).toEqual([]);
  expect(withoutPendingContent.postsLoaded).toBe(false);

  const pendingReply = {
    id: 'reply-pending',
    author: 'Student',
    text: 'Saved while offline',
    createdAt: '2026-10-11T10:06:00.000Z',
  };
  const [withPendingReply] = mergeGroupDirectory(
    [cachedGroup],
    [{ ...sharedGroup, posts: [{ ...post, text: 'Live post', replies: [] }] }],
    [
      {
        id: 'reply-op',
        type: 'reply',
        groupId: 'group-one',
        postId: post.id,
        reply: pendingReply,
      },
    ],
  );
  expect(withPendingReply.posts[0].text).toBe('Live post');
  expect(withPendingReply.posts[0].replies).toEqual([pendingReply]);
});

test('live member feed is retained if it arrives before directory metadata', () => {
  const post = {
    id: 'post-one',
    author: 'Owner',
    text: 'A live note',
    createdAt: '2026-10-12T10:00:00.000Z',
    replies: [],
  };
  const fallbackGroup = {
    id: 'group-one',
    name: 'Cached group name',
    shared: true,
    joined: true,
    posts: [],
    postsLoaded: false,
  };

  const [group] = mergeSharedGroupFeed([], 'group-one', fallbackGroup, {
    posts: [post],
    postsLoaded: true,
    hasMorePosts: false,
    postsLive: true,
  });

  expect(group.name).toBe('Cached group name');
  expect(group.posts).toEqual([post]);
  expect(group.postsLoaded).toBe(true);
});

test('a synced reply remains visible while the latest reply window is paused', () => {
  const group = {
    id: 'group-one',
    shared: true,
    joined: true,
    posts: [
      {
        id: 'post-one',
        author: 'Student',
        text: 'Post',
        createdAt: '2026-10-12T09:00:00.000Z',
        replies: [],
        repliesLive: false,
      },
    ],
  };
  const reply = {
    id: 'reply-one',
    author: 'Student',
    text: 'Saved reply',
    createdAt: '2026-10-12T10:00:00.000Z',
  };

  const [updated] = mergeSyncedGroupAction([group], 'student', {
    type: 'reply',
    groupId: group.id,
    postId: 'post-one',
    reply,
  });

  expect(updated.posts[0].replies).toEqual([{ ...reply, authorUid: 'student' }]);
  expect(updated.posts[0].repliesLive).toBe(false);
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

test('shared posts and replies update the private cooldown record atomically', async () => {
  const { firestore } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  firestore.getDoc.mockResolvedValue({ exists: () => false });
  firestore.serverTimestamp = jest.fn(() => 'server-time');
  const postBatch = {
    commit: jest.fn(async () => {}),
    set: jest.fn(),
    update: jest.fn(),
  };
  const replyBatch = {
    commit: jest.fn(async () => {}),
    set: jest.fn(),
    update: jest.fn(),
  };
  firestore.writeBatch = jest
    .fn()
    .mockReturnValueOnce(postBatch)
    .mockReturnValueOnce(replyBatch);

  await syncSharedGroupAction('student', { name: 'Student' }, {
    type: 'post',
    groupId: 'group-one',
    post: { id: 'post-one', text: 'A note' },
  });
  await syncSharedGroupAction('student', { name: 'Student' }, {
    type: 'reply',
    groupId: 'group-one',
    postId: 'post-one',
    reply: { id: 'reply-one', text: 'A reply' },
  });

  const postLimitWrite = postBatch.set.mock.calls.find(([ref]) =>
    ref.path.endsWith('/writeLimits/student'),
  );
  const replyLimitWrite = replyBatch.set.mock.calls.find(([ref]) =>
    ref.path.endsWith('/writeLimits/student'),
  );
  expect(postLimitWrite[1]).toEqual({
    uid: 'student',
    lastWriteAt: 'server-time',
    kind: 'post',
    writeId: 'post-one',
    postId: null,
  });
  expect(postLimitWrite[2]).toEqual({ merge: true });
  expect(replyLimitWrite[1]).toEqual({
    uid: 'student',
    lastWriteAt: 'server-time',
    kind: 'reply',
    writeId: 'reply-one',
    postId: 'post-one',
  });
  expect(replyLimitWrite[2]).toEqual({ merge: true });
  expect(postBatch.commit).toHaveBeenCalledTimes(1);
  expect(replyBatch.commit).toHaveBeenCalledTimes(1);
});

test('active member post listener releases reply listeners when posts leave its page', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onPosts = jest.fn();
  const onError = jest.fn();
  const subscription = watchSharedGroupPosts(
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

  const firstPostSnapshot = postSnapshot(
    'post-one',
    '2026-10-11T10:00:00.000Z',
  );
  postsListener.next({ docs: [firstPostSnapshot] });
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
  subscription.unsubscribe();
  expect(postsListener.unsubscribe).toHaveBeenCalledTimes(1);
  expect(repliesListener.unsubscribe).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});

test('the open post stays available when new live posts move it off the latest page', async () => {
  const { firestore, subscriptions } = createFirestore();
  const pinned = postSnapshot('post-open', '2026-10-12T08:00:00.000Z');
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  firestore.getDoc
    .mockResolvedValueOnce({ exists: () => true })
    .mockResolvedValueOnce({
      id: pinned.id,
      ref: pinned.ref,
      data: pinned.data,
      exists: () => true,
    });
  const onPosts = jest.fn();
  const subscription = watchSharedGroupPosts(
    'student',
    'group-one',
    onPosts,
    jest.fn(),
    pinned.id,
  );
  await flushAsyncCallbacks();

  const postsListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/posts'),
  );
  postsListener.next({
    docs: [postSnapshot('post-newer', '2026-10-12T09:00:00.000Z')],
  });
  expect(onPosts.mock.calls.at(-1)[0].map(post => post.id)).toContain('post-open');

  postsListener.next({
    docs: [postSnapshot('post-newest', '2026-10-12T10:00:00.000Z')],
  });
  expect(onPosts.mock.calls.at(-1)[0].map(post => post.id)).toEqual([
    'post-newest',
    'post-open',
  ]);

  const pinnedReplyListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/posts/post-open/replies'),
  );
  expect(pinnedReplyListener).toBeDefined();
  pinnedReplyListener.next({
    docs: [
      {
        id: 'reply-open',
        data: () => ({
          authorUid: 'student',
          author: 'Student',
          text: 'An older post can still load its replies.',
          createdAt: '2026-10-12T08:05:00.000Z',
        }),
      },
    ],
  });
  expect(onPosts.mock.calls.at(-1)[0].find(post => post.id === 'post-open').replies)
    .toEqual([
      {
        id: 'reply-open',
        authorUid: 'student',
        author: 'Student',
        text: 'An older post can still load its replies.',
        createdAt: '2026-10-12T08:05:00.000Z',
      },
    ]);
  subscription.unsubscribe();
});

test('active group feeds page older posts and replies from bounded live windows', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onPosts = jest.fn();
  const subscription = watchSharedGroupPosts(
    'student',
    'group-one',
    onPosts,
    jest.fn(),
  );
  await flushAsyncCallbacks();

  const postsListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/posts'),
  );
  const firstPage = Array.from({ length: 20 }, (_, index) =>
    postSnapshot(
      'post-' + index,
      new Date(Date.parse('2026-10-12T10:00:00Z') - index * 60000).toISOString(),
    ),
  );
  postsListener.next({ docs: firstPage });

  expect(postsListener.target.constraints).toContainEqual({
    type: 'limit',
    count: 20,
  });
  expect(onPosts.mock.calls.at(-1)[0]).toHaveLength(20);
  expect(onPosts.mock.calls.at(-1)[1].hasMorePosts).toBe(true);
  expect(onPosts.mock.calls.at(-1)[1].postsLive).toBe(true);

  const replyListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/posts/post-0/replies'),
  );
  const firstReplyPage = Array.from({ length: 20 }, (_, index) => ({
    id: 'reply-' + index,
    data: () => ({
      authorUid: 'student',
      author: 'Student',
      text: 'Reply ' + index,
      createdAt: new Date(
        Date.parse('2026-10-12T11:00:00Z') - index * 60000,
      ).toISOString(),
    }),
  }));
  replyListener.next({ docs: firstReplyPage });
  expect(onPosts.mock.calls.at(-1)[0][0].hasMoreReplies).toBe(true);

  const olderPost = postSnapshot('post-older', '2026-10-12T09:00:00.000Z');
  const olderReply = {
    id: 'reply-older',
    data: () => ({
      authorUid: 'owner',
      author: 'Owner',
      text: 'Older reply',
      createdAt: '2026-10-12T09:00:00.000Z',
    }),
  };
  firestore.getDocs
    .mockResolvedValueOnce({ docs: [olderPost] })
    .mockResolvedValueOnce({ docs: [olderReply] })
    .mockResolvedValueOnce({ docs: [olderReply] });

  await subscription.loadMorePosts();
  expect(onPosts.mock.calls.at(-1)[1].postsLive).toBe(false);
  expect(firestore.getDocs.mock.calls[0][0].constraints).toContainEqual({
    type: 'startAfter',
    snapshot: firstPage.at(-1),
  });
  expect(firestore.getDocs.mock.calls[1][0].ref.path).toBe(
    'studyGroups/group-one/posts/post-older/replies',
  );
  expect(onPosts.mock.calls.at(-1)[0]).toHaveLength(21);

  await subscription.loadMoreReplies('post-0');
  expect(firestore.getDocs.mock.calls[2][0].constraints).toContainEqual({
    type: 'startAfter',
    snapshot: firstReplyPage.at(-1),
  });
  const firstPost = onPosts.mock.calls.at(-1)[0].find(p => p.id === 'post-0');
  expect(firstPost.replies).toHaveLength(21);
  expect(firstPost.replies[0].id).toBe('reply-older');
  expect(firstPost.hasMoreReplies).toBe(false);
  expect(firstPost.repliesLive).toBe(false);
  subscription.unsubscribe();
});

test('older post pages load reply previews without additional listeners', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const olderPageOne = Array.from({ length: 20 }, (_, index) =>
    postSnapshot(
      'older-one-' + index,
      new Date(Date.parse('2026-10-12T08:00:00Z') - index * 60000).toISOString(),
    ),
  );
  const olderPageTwo = Array.from({ length: 20 }, (_, index) =>
    postSnapshot(
      'older-two-' + index,
      new Date(Date.parse('2026-10-12T07:00:00Z') - index * 60000).toISOString(),
    ),
  );
  const olderPages = [olderPageOne, olderPageTwo];
  firestore.getDocs.mockImplementation(async target =>
    target.ref.path.endsWith('/posts')
      ? { docs: olderPages.shift() }
      : { docs: [] },
  );
  const onPosts = jest.fn();
  const subscription = watchSharedGroupPosts(
    'student',
    'group-one',
    onPosts,
    jest.fn(),
  );
  await flushAsyncCallbacks();

  const postsListener = subscriptions.find(item =>
    item.target.ref.path.endsWith('/posts'),
  );
  postsListener.next({
    docs: Array.from({ length: 20 }, (_, index) =>
      postSnapshot(
        'latest-' + index,
        new Date(Date.parse('2026-10-12T10:00:00Z') - index * 60000).toISOString(),
      ),
    ),
  });

  const replyListeners = () =>
    subscriptions.filter(item => item.target.ref.path.endsWith('/replies'));
  const olderReplyQueries = () =>
    firestore.getDocs.mock.calls.filter(([target]) =>
      target.ref.path.endsWith('/replies'),
    );
  expect(replyListeners()).toHaveLength(20);

  await subscription.loadMorePosts();
  expect(replyListeners()).toHaveLength(20);
  expect(olderReplyQueries()).toHaveLength(20);
  expect(olderReplyQueries()[0][0].constraints).toContainEqual({
    type: 'limit',
    count: 20,
  });
  expect(
    onPosts.mock.calls.at(-1)[0].find(post => post.id === 'older-one-0')
      .repliesLive,
  ).toBe(false);

  await subscription.loadMorePosts();
  expect(replyListeners()).toHaveLength(20);
  expect(olderReplyQueries()).toHaveLength(40);

  const olderPost = onPosts.mock.calls.at(-1)[0].find(post => post.id === 'older-two-0');
  expect(olderPost.repliesLive).toBe(false);
  subscription.unsubscribe();
  expect(replyListeners().every(item => item.unsubscribe.mock.calls.length === 1)).toBe(true);
});

test('nonmembers do not open post or reply listeners', async () => {
  const { firestore, subscriptions } = createFirestore();
  firestore.getDoc.mockResolvedValue({ exists: () => false });
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onPosts = jest.fn();
  const subscription = watchSharedGroupPosts(
    'student',
    'group-one',
    onPosts,
    jest.fn(),
  );
  await flushAsyncCallbacks();

  expect(onPosts.mock.calls[0][0]).toEqual([]);
  expect(subscriptions).toHaveLength(0);
  subscription.unsubscribe();
});
