import { firebaseServicesForUser } from '../src/shared/backend/firebase';
import {
  syncSharedGroupAction,
  watchSharedGroupReports,
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
    collectionGroup: jest.fn(name => ({ path: 'collectionGroup/' + name })),
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
    where: (field, operator, value) => ({ field, operator, value }),
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

function membershipSnapshot(groupId, uid = 'student') {
  return {
    id: groupId,
    data: () => ({ uid, groupId, role: 'member' }),
  };
}

function moderationReportSnapshot(id, createdAt) {
  return {
    id,
    data: () => ({
      targetType: 'post',
      targetId: 'post-' + id,
      postId: null,
      targetAuthor: 'Student',
      contentSnapshot: 'A reported study note',
      reason: 'spam',
      status: 'open',
      createdAt,
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

test('group directory listens to the owner-scoped membership path without per-group reads', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onGroups = jest.fn();
  const onError = jest.fn();
  const subscription = watchSharedGroups('student', onGroups, onError);
  const directory = subscriptions.find(
    entry => entry.target.ref.path === 'db/studyGroups',
  );
  const memberships = subscriptions.find(
    entry => entry.target.path === 'db/users/student/studyGroupMemberships',
  );
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
  expect(onGroups).not.toHaveBeenCalled();

  memberships.next({ docs: [membershipSnapshot('two')] });
  await flushAsyncCallbacks();
  expect(onGroups).toHaveBeenCalledTimes(1);
  expect(onGroups.mock.calls[0][0].map(group => group.id)).toEqual([
    'one',
    'two',
  ]);
  expect(firestore.getDoc).not.toHaveBeenCalled();
  expect(firestore.onSnapshot).toHaveBeenCalledTimes(2);
  expect(directory.target.constraints).toContainEqual({
    type: 'limit',
    count: 20,
  });
  expect(memberships.target.path).toBe(
    'db/users/student/studyGroupMemberships',
  );
  expect(onGroups.mock.calls[0][0].map(group => group.joined)).toEqual([
    false,
    true,
  ]);
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

  expect(firestore.getDoc).not.toHaveBeenCalled();
  expect(onGroups.mock.calls[1][0].map(group => [group.id, group.members])).toEqual([
    ['two', 4],
    ['one', 2],
  ]);
  expect(onGroups.mock.calls[1][0][0].joined).toBe(true);

  memberships.next({ docs: [] });
  await flushAsyncCallbacks();
  expect(onGroups.mock.calls[2][0].map(group => group.joined)).toEqual([
    false,
    false,
  ]);
  expect(firestore.getDoc).not.toHaveBeenCalled();
  expect(firestore.collection).toHaveBeenCalledTimes(2);
  subscription.unsubscribe();
  expect(directory.unsubscribe).toHaveBeenCalledTimes(1);
  expect(memberships.unsubscribe).toHaveBeenCalledTimes(1);
});

test('shared group directory pages all groups and pauses live metadata while browsing older pages', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const firstPage = Array.from({ length: 20 }, (_, index) =>
    groupSnapshot(
      'latest-' + index,
      1,
      new Date(Date.parse('2026-10-12T10:00:00Z') - index * 60000).toISOString(),
    ),
  );
  const olderPageOne = Array.from({ length: 20 }, (_, index) =>
    groupSnapshot(
      'older-one-' + index,
      1,
      new Date(Date.parse('2026-10-12T08:00:00Z') - index * 60000).toISOString(),
    ),
  );
  const olderPageTwo = [
    groupSnapshot('older-two-0', 1, '2026-10-12T07:00:00.000Z'),
    groupSnapshot('older-two-1', 1, '2026-10-12T06:00:00.000Z'),
  ];
  firestore.getDocs
    .mockResolvedValueOnce({ docs: olderPageOne })
    .mockResolvedValueOnce({ docs: olderPageTwo });
  const onGroups = jest.fn();
  const subscription = watchSharedGroups(
    'student',
    onGroups,
    jest.fn(),
  );
  const directory = subscriptions.find(
    item => item.target.ref.path === 'db/studyGroups',
  );
  const memberships = subscriptions.find(
    item => item.target.path === 'db/users/student/studyGroupMemberships',
  );
  directory.next({
    docs: firstPage,
    docChanges: () =>
      firstPage.map(doc => ({ type: 'added', doc })),
  });
  memberships.next({ docs: [membershipSnapshot('older-one-0')] });
  await flushAsyncCallbacks();
  expect(onGroups.mock.calls.at(-1)[0]).toHaveLength(20);
  expect(onGroups.mock.calls.at(-1)[1]).toEqual({
    hasMoreGroups: true,
    groupsLive: true,
  });

  await subscription.loadMoreGroups();
  expect(firestore.getDocs.mock.calls[0][0].constraints).toContainEqual({
    type: 'startAfter',
    snapshot: firstPage.at(-1),
  });
  expect(firestore.getDocs.mock.calls[0][0].constraints).toContainEqual({
    type: 'limit',
    count: 20,
  });
  expect(onGroups.mock.calls.at(-1)[0]).toHaveLength(40);
  expect(onGroups.mock.calls.at(-1)[1]).toEqual({
    hasMoreGroups: true,
    groupsLive: false,
  });
  expect(onGroups.mock.calls.at(-1)[0].find(group => group.id === 'older-one-0').joined)
    .toBe(true);

  await subscription.loadMoreGroups();
  expect(firestore.getDocs.mock.calls[1][0].constraints).toContainEqual({
    type: 'startAfter',
    snapshot: olderPageOne.at(-1),
  });
  expect(onGroups.mock.calls.at(-1)[0]).toHaveLength(42);
  expect(onGroups.mock.calls.at(-1)[1]).toEqual({
    hasMoreGroups: false,
    groupsLive: false,
  });

  memberships.next({ docs: [membershipSnapshot('older-two-1')] });
  expect(onGroups.mock.calls.at(-1)[0].find(group => group.id === 'older-two-1').joined)
    .toBe(true);
  await subscription.loadMoreGroups();
  expect(firestore.getDocs).toHaveBeenCalledTimes(2);
  subscription.unsubscribe();
  expect(directory.unsubscribe).toHaveBeenCalledTimes(1);
  expect(memberships.unsubscribe).toHaveBeenCalledTimes(1);
});

test('owner report queue pages older reports and refreshes the live page', async () => {
  const { firestore, subscriptions } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  const onReports = jest.fn();
  const onError = jest.fn();
  const newer = moderationReportSnapshot(
    'newer',
    '2026-10-13T10:00:00.000Z',
  );
  const older = moderationReportSnapshot(
    'older',
    '2026-10-13T09:00:00.000Z',
  );
  const firstPage = [
    newer,
    ...Array.from({ length: 19 }, (_, index) =>
      moderationReportSnapshot(
        'page-' + index,
        new Date(Date.parse('2026-10-13T09:59:00Z') - index * 60000).toISOString(),
      ),
    ),
  ];
  firestore.getDocs.mockResolvedValueOnce({ docs: [older] });

  const subscription = watchSharedGroupReports(
    'owner',
    'group-one',
    onReports,
    onError,
  );
  const latestListener = subscriptions[0];
  expect(latestListener.target.ref.path).toBe(
    'db/studyGroups/group-one/moderationReports',
  );
  expect(latestListener.target.constraints).toContainEqual({
    field: 'createdAt',
    direction: 'desc',
  });
  expect(latestListener.target.constraints).toContainEqual({
    type: 'limit',
    count: 20,
  });

  latestListener.next({ docs: firstPage });
  expect(onReports.mock.calls.at(-1)[0][0].id).toBe('newer');
  expect(onReports.mock.calls.at(-1)[1].reportsLive).toBe(true);
  expect(onReports.mock.calls.at(-1)[1].hasMoreReports).toBe(true);

  await subscription.loadMoreReports();
  expect(firestore.getDocs.mock.calls[0][0].constraints).toContainEqual({
    type: 'startAfter',
    snapshot: firstPage.at(-1),
  });
  expect(onReports.mock.calls.at(-1)[0]).toHaveLength(21);
  expect(onReports.mock.calls.at(-1)[0].at(-1).id).toBe('older');
  expect(onReports.mock.calls.at(-1)[1].reportsLive).toBe(false);
  expect(latestListener.unsubscribe).toHaveBeenCalledTimes(1);

  subscription.refreshReports();
  expect(subscriptions).toHaveLength(2);
  const refreshed = moderationReportSnapshot(
    'fresh',
    '2026-10-13T11:00:00.000Z',
  );
  subscriptions[1].next({ docs: [refreshed] });
  expect(onReports.mock.calls.at(-1)[0].map(report => report.id)).toEqual([
    'fresh',
  ]);
  subscription.unsubscribe();
  expect(subscriptions[1].unsubscribe).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
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

test('report submission omits reporter identity and shares a cooldown write', async () => {
  const { firestore } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  firestore.getDoc.mockResolvedValue({ exists: () => false });
  firestore.serverTimestamp = jest.fn(() => 'server-time');
  const batch = {
    commit: jest.fn(async () => {}),
    set: jest.fn(),
    update: jest.fn(),
  };
  firestore.writeBatch = jest.fn(() => batch);

  await syncSharedGroupAction('reporter-uid', { name: 'Reporter' }, {
    type: 'report',
    groupId: 'group-one',
    report: {
      id: 'report-one',
      targetType: 'post',
      targetId: 'post-one',
      postId: null,
      targetAuthor: 'Group Owner',
      contentSnapshot: 'A reported note',
      reason: 'spam',
    },
  });

  const reportWrite = batch.set.mock.calls.find(([ref]) =>
    ref.path.endsWith('/moderationReports/report-one'),
  );
  expect(reportWrite[1]).toEqual({
    targetType: 'post',
    targetId: 'post-one',
    postId: null,
    targetAuthor: 'Group Owner',
    contentSnapshot: 'A reported note',
    reason: 'spam',
    status: 'open',
    createdAt: 'server-time',
    resolvedAt: null,
  });
  expect(reportWrite[1]).not.toHaveProperty('reporterUid');
  expect(
    batch.set.mock.calls.find(([ref]) =>
      ref.path.endsWith('/writeLimits/reporter-uid'),
    )[1],
  ).toMatchObject({
    uid: 'reporter-uid',
    kind: 'report',
    writeId: 'report-one',
    postId: null,
  });
  expect(batch.commit).toHaveBeenCalledTimes(1);
});

test('group owner moderation hides and restores reported content atomically', async () => {
  const { firestore } = createFirestore();
  firebaseServicesForUser.mockReturnValue({ db: 'db', firestore });
  firestore.getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      status: 'open',
      targetType: 'reply',
      postId: 'post-one',
      targetId: 'reply-one',
    }),
  });
  firestore.serverTimestamp = jest.fn(() => 'server-time');
  const hideBatch = {
    commit: jest.fn(async () => {}),
    update: jest.fn(),
  };
  const restoreBatch = {
    commit: jest.fn(async () => {}),
    update: jest.fn(),
  };
  firestore.writeBatch = jest
    .fn()
    .mockReturnValueOnce(hideBatch)
    .mockReturnValueOnce(restoreBatch);

  await syncSharedGroupAction('owner-uid', { name: 'Owner' }, {
    type: 'moderateReport',
    groupId: 'group-one',
    reportId: 'report-one',
    resolution: 'hidden',
  });
  expect(hideBatch.update.mock.calls).toEqual([
    [
      { path: 'db/studyGroups/group-one/posts/post-one/replies/reply-one' },
      { moderationStatus: 'hidden', moderatedAt: 'server-time' },
    ],
    [
      { path: 'db/studyGroups/group-one/moderationReports/report-one' },
      { status: 'hidden', resolvedAt: 'server-time' },
    ],
  ]);

  firestore.getDoc.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({
      status: 'hidden',
      targetType: 'reply',
      postId: 'post-one',
      targetId: 'reply-one',
    }),
  });
  await syncSharedGroupAction('owner-uid', { name: 'Owner' }, {
    type: 'moderateReport',
    groupId: 'group-one',
    reportId: 'report-one',
    resolution: 'restored',
  });
  expect(restoreBatch.update.mock.calls).toEqual([
    [
      { path: 'db/studyGroups/group-one/posts/post-one/replies/reply-one' },
      { moderationStatus: 'visible', moderatedAt: 'server-time' },
    ],
    [
      { path: 'db/studyGroups/group-one/moderationReports/report-one' },
      { status: 'restored', resolvedAt: 'server-time' },
    ],
  ]);
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
