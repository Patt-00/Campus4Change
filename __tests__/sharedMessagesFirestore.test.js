let mockServices;

jest.mock('../src/shared/backend/firebase', () => ({
  firebaseServicesForUser: (...args) => mockServices(...args),
}));

function makeFirestore() {
  const db = { name: 'test-db' };
  const subscriptions = [];
  const writes = [];
  const batch = {
    set: jest.fn((ref, value, options) =>
      writes.push({ type: 'set', ref, value, options }),
    ),
    update: jest.fn((ref, value) => writes.push({ type: 'update', ref, value })),
    commit: jest.fn(async () => true),
  };
  let messageCounter = 0;
  const firestore = {
    collection: jest.fn((parent, ...parts) => ({
      path: [parent?.path ?? parent?.name ?? parent, ...parts].join('/'),
    })),
    doc: jest.fn((parent, ...parts) => ({
      path: [parent?.path ?? parent?.name ?? parent, ...parts].filter(Boolean).join('/'),
      id: parts.at(-1) || `message-${++messageCounter}`,
    })),
    limit: count => ({ type: 'limit', count }),
    orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
    where: (field, operator, value) => ({ type: 'where', field, operator, value }),
    query: (ref, ...constraints) => ({ ref, constraints }),
    onSnapshot: jest.fn((target, next, error) => {
      const subscription = { target, next, error, unsubscribe: jest.fn() };
      subscriptions.push(subscription);
      return subscription.unsubscribe;
    }),
    getDocs: jest.fn(async () => ({ docs: [] })),
    startAfter: snapshot => ({ type: 'startAfter', snapshot }),
    serverTimestamp: jest.fn(() => 'server-time'),
    writeBatch: jest.fn(() => batch),
  };
  return { db, firestore, subscriptions, writes, batch };
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockServices = jest.fn();
});

test('group chat watches only visible messages in a bounded newest-first window', () => {
  const fake = makeFirestore();
  mockServices.mockReturnValue({ db: fake.db, firestore: fake.firestore });
  const { watchSharedMessages, SHARED_MESSAGE_PAGE_SIZE } = require('../src/features/messages/data/firestore');
  const onMessages = jest.fn();
  const subscription = watchSharedMessages(
    'bob',
    { delivery: 'shared', kind: 'group', groupId: 'calculus' },
    onMessages,
    jest.fn(),
  );

  const target = fake.subscriptions[0].target;
  expect(target.ref.path).toBe('test-db/studyGroups/calculus/chatMessages');
  expect(target.constraints).toEqual([
    { type: 'where', field: 'moderationStatus', operator: '==', value: 'visible' },
    { type: 'orderBy', field: 'sentAt', direction: 'desc' },
    { type: 'limit', count: SHARED_MESSAGE_PAGE_SIZE },
  ]);
  fake.subscriptions[0].next({
    docs: [
      {
        id: 'newer',
        data: () => ({
          senderUid: 'alice',
          text: 'Newest',
          sentAt: { toDate: () => new Date('2026-10-14T10:02:00.000Z') },
          moderationStatus: 'visible',
        }),
      },
      {
        id: 'older',
        data: () => ({
          senderUid: 'bob',
          text: 'Older',
          sentAt: { toDate: () => new Date('2026-10-14T10:01:00.000Z') },
          moderationStatus: 'visible',
        }),
      },
    ],
  });

  expect(onMessages).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'older', text: 'Older', mine: true }),
    expect.objectContaining({ id: 'newer', text: 'Newest', mine: false }),
  ], { hasMoreMessages: false, loadingOlderMessages: false });
  subscription.unsubscribe();
  expect(fake.subscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
  expect(subscription.loadMoreMessages).toEqual(expect.any(Function));
});

test('tutor chat stays under its participant booking and enforces the sendable session state', async () => {
  const fake = makeFirestore();
  mockServices.mockReturnValue({ db: fake.db, firestore: fake.firestore });
  const { sendSharedMessage, watchSharedMessages } = require('../src/features/messages/data/firestore');
  const conversation = {
    delivery: 'shared',
    kind: 'booking',
    bookingId: 'booking-one',
    canSend: true,
  };
  const subscription = watchSharedMessages('bob', conversation, jest.fn(), jest.fn());
  expect(fake.subscriptions[0].target.ref.path).toBe(
    'test-db/tutorBookings/booking-one/chatMessages',
  );
  expect(fake.subscriptions[0].target.constraints).toEqual([
    { type: 'orderBy', field: 'sentAt', direction: 'desc' },
    { type: 'limit', count: 50 },
  ]);
  subscription.unsubscribe();

  await sendSharedMessage('bob', 'Bob Student', conversation, 'When should I arrive?');
  expect(fake.writes[0]).toMatchObject({
    type: 'set',
    ref: { path: 'test-db/tutorBookings/booking-one/chatMessages', id: 'message-1' },
    value: {
      senderUid: 'bob',
      senderName: 'Bob Student',
      text: 'When should I arrive?',
      sentAt: 'server-time',
    },
  });
  expect(fake.writes[1]).toMatchObject({
    type: 'set',
    ref: { path: 'test-db/tutorBookings/booking-one/chatWriteLimits/bob' },
    value: { uid: 'bob', messageId: 'message-1', lastSentAt: 'server-time' },
  });
  expect(fake.batch.commit).toHaveBeenCalledTimes(1);

  await expect(
    sendSharedMessage('bob', 'Bob Student', { ...conversation, canSend: false }, 'Late message'),
  ).rejects.toThrow('This conversation is not accepting messages.');
});

test('shared chat pages older messages with a document cursor and retains the live window', async () => {
  const fake = makeFirestore();
  mockServices.mockReturnValue({ db: fake.db, firestore: fake.firestore });
  const { watchSharedMessages } = require('../src/features/messages/data/firestore');
  const onMessages = jest.fn();
  const subscription = watchSharedMessages(
    'bob',
    { delivery: 'shared', kind: 'group', groupId: 'calculus' },
    onMessages,
    jest.fn(),
  );
  const currentPage = Array.from({ length: 50 }, (_, index) => ({
    id: 'live-' + index,
    data: () => ({
      senderUid: 'bob',
      text: 'Live ' + index,
      sentAt: { toDate: () => new Date(Date.UTC(2026, 9, 14, 12, 49 - index)) },
      moderationStatus: 'visible',
    }),
  }));
  fake.subscriptions[0].next({ docs: currentPage });
  expect(onMessages.mock.calls.at(-1)[1]).toMatchObject({
    hasMoreMessages: true,
    loadingOlderMessages: false,
  });

  const olderPage = {
    id: 'older-message',
    data: () => ({
      senderUid: 'alice',
      text: 'Older message',
      sentAt: { toDate: () => new Date(Date.UTC(2026, 9, 14, 11, 59)) },
      moderationStatus: 'visible',
    }),
  };
  fake.firestore.getDocs.mockResolvedValueOnce({ docs: [olderPage] });
  await subscription.loadMoreMessages();

  const olderQuery = fake.firestore.getDocs.mock.calls[0][0];
  expect(olderQuery.constraints).toContainEqual({
    type: 'startAfter',
    snapshot: currentPage.at(-1),
  });
  const latest = onMessages.mock.calls.at(-1);
  expect(latest[0]).toHaveLength(51);
  expect(latest[0][0]).toMatchObject({ id: 'older-message', mine: false });
  expect(latest[1]).toMatchObject({
    hasMoreMessages: false,
    loadingOlderMessages: false,
  });
  fake.subscriptions[0].next({
    docs: [
      {
        id: 'new-live-message',
        data: () => ({
          senderUid: 'bob',
          text: 'A live message after paging.',
          sentAt: { toDate: () => new Date(Date.UTC(2026, 9, 14, 13, 0)) },
          moderationStatus: 'visible',
        }),
      },
      ...currentPage,
    ].slice(0, 50),
  });
  expect(onMessages.mock.calls.at(-1)[1].hasMoreMessages).toBe(false);
  subscription.unsubscribe();
});

test('group chat writes the message, contribution cooldown, and group activity atomically', async () => {
  const fake = makeFirestore();
  mockServices.mockReturnValue({ db: fake.db, firestore: fake.firestore });
  const { sendSharedMessage } = require('../src/features/messages/data/firestore');
  const messageId = await sendSharedMessage(
    'bob',
    'Bob Student',
    { delivery: 'shared', kind: 'group', groupId: 'calculus', canSend: true },
    '  Can someone review this problem?  ',
  );

  expect(messageId).toBe('message-1');
  expect(fake.writes).toHaveLength(3);
  expect(fake.writes[0]).toMatchObject({
    type: 'set',
    value: {
      senderUid: 'bob',
      senderName: 'Bob Student',
      text: 'Can someone review this problem?',
      sentAt: 'server-time',
      moderationStatus: 'visible',
    },
  });
  expect(fake.writes[1]).toMatchObject({
    type: 'set',
    ref: { path: 'test-db/studyGroups/calculus/writeLimits/bob' },
    value: {
      uid: 'bob',
      lastWriteAt: 'server-time',
      kind: 'chat',
      writeId: 'message-1',
      postId: null,
    },
    options: { merge: true },
  });
  expect(fake.writes[2]).toMatchObject({
    type: 'update',
    ref: { path: 'test-db/studyGroups/calculus' },
    value: { updatedAt: 'server-time' },
  });
  expect(fake.batch.commit).toHaveBeenCalledTimes(1);
});

test.each(['', '   ', 'x'.repeat(2001)])(
  'shared chat rejects empty or oversized text before writing (%s)',
  async text => {
    const fake = makeFirestore();
    mockServices.mockReturnValue({ db: fake.db, firestore: fake.firestore });
    const { sendSharedMessage } = require('../src/features/messages/data/firestore');
    await expect(
      sendSharedMessage(
        'bob',
        'Bob',
        { delivery: 'shared', kind: 'group', groupId: 'calculus', canSend: true },
        text,
      ),
    ).rejects.toThrow('Messages must contain 1 to 2,000 characters.');
    expect(fake.firestore.writeBatch).not.toHaveBeenCalled();
  },
);
