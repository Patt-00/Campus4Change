import React from 'react';
import { useLayoutEffect } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSharedMessages } from '../src/features/messages/hooks/useSharedMessages';

let mockSubscriptions;
let mockSendSharedMessage;
jest.mock('../src/features/messages/data/firestore', () => ({
  sendSharedMessage: (...args) => mockSendSharedMessage(...args),
  watchSharedMessages: (...args) => {
    const subscription = {
      uid: args[0],
      conversation: args[1],
      onMessages: args[2],
      onError: args[3],
      unsubscribe: jest.fn(),
      loadMoreMessages: jest.fn(async () => {}),
    };
    mockSubscriptions.push(subscription);
    return subscription;
  },
}));

const sharedGroup = {
  id: 'group-one',
  name: 'Calculus Circle',
  members: 3,
  shared: true,
  joined: true,
};
const localGroup = {
  id: 'local-group',
  name: 'Private notes',
  members: 1,
  shared: false,
  joined: true,
};
const unjoinedGroup = {
  id: 'group-two',
  name: 'Other group',
  members: 8,
  shared: true,
  joined: false,
};
const booking = {
  id: 'booking-one',
  shared: true,
  incoming: false,
  tutorName: 'Tutor Student',
  studentName: 'Jordan Student',
  subject: 'Physics',
  status: 'Pending',
  remoteStatus: 'pending',
};

let latest;
let layoutSnapshot;
function Probe({ options }) {
  latest = useSharedMessages(options);
  useLayoutEffect(() => {
    layoutSnapshot = latest;
  }, [options.uid, options.activeConversationId]);
  return null;
}

async function mount(options) {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Probe options={options} />);
  });
  return renderer;
}

beforeEach(() => {
  mockSubscriptions = [];
  mockSendSharedMessage = jest.fn(async () => 'message-id');
  latest = null;
  layoutSnapshot = null;
});

test('builds shared chats only for joined groups and session participants', async () => {
  const renderer = await mount({
    uid: 'student-one',
    groups: [sharedGroup, localGroup, unjoinedGroup],
    bookings: [booking, { id: 'local-session', shared: false }],
    activeConversationId: null,
    senderName: 'Jordan Student',
  });

  expect(latest.conversations.map(conversation => conversation.id)).toEqual([
    'shared-group-group-one',
    'shared-booking-booking-one',
  ]);
  expect(latest.conversations[1]).toMatchObject({
    name: 'Tutor Student',
    senderName: 'Jordan Student',
    kind: 'booking',
    canSend: true,
  });
  const incomingBooking = latest.conversations.find(
    conversation => conversation.bookingId === 'booking-one',
  );
  expect(incomingBooking).toMatchObject({
    name: 'Tutor Student',
    senderName: 'Jordan Student',
  });
  expect(latest.conversations.some(conversation => conversation.groupId === 'group-two')).toBe(false);
  await act(async () => renderer.unmount());
});

test('incoming tutor bookings name the student as the chat counterpart and stop sends after cancellation', async () => {
  const incoming = {
    ...booking,
    incoming: true,
    remoteStatus: 'cancelled',
    status: 'Cancelled',
  };
  const renderer = await mount({
    uid: 'tutor-uid',
    groups: [],
    bookings: [incoming],
    activeConversationId: 'shared-booking-booking-one',
    senderName: 'Tutor Student',
  });

  expect(latest.activeConversation).toMatchObject({
    name: 'Jordan Student',
    senderName: 'Tutor Student',
    canSend: false,
  });
  await expect(latest.send('A late message')).rejects.toThrow(
    'This conversation is not accepting messages.',
  );
  expect(mockSendSharedMessage).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test('subscribes to the active chat and sends through its authorized thread', async () => {
  const renderer = await mount({
    uid: 'student-one',
    groups: [sharedGroup],
    bookings: [booking],
    activeConversationId: 'shared-group-group-one',
    senderName: 'Jordan Student',
  });
  expect(mockSubscriptions).toHaveLength(1);
  expect(mockSubscriptions[0]).toMatchObject({
    uid: 'student-one',
    conversation: expect.objectContaining({
      id: 'shared-group-group-one',
      groupId: 'group-one',
    }),
  });

  const message = {
    id: 'message-one',
    text: 'Hello group',
    senderUid: 'student-one',
    mine: true,
  };
  await act(async () =>
    mockSubscriptions[0].onMessages([message], { hasMoreMessages: true }),
  );
  expect(latest.messages).toEqual([message]);
  await act(async () => latest.send('A question'));
  expect(mockSendSharedMessage).toHaveBeenCalledWith(
    'student-one',
    'Jordan Student',
    expect.objectContaining({ id: 'shared-group-group-one' }),
    'A question',
  );
  await act(async () => latest.loadMoreMessages());
  expect(mockSubscriptions[0].loadMoreMessages).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
  expect(mockSubscriptions[0].unsubscribe).toHaveBeenCalledTimes(1);
});

test('account changes stop old chat callbacks from replacing the new account feed', async () => {
  const group = { ...sharedGroup };
  const renderer = await mount({
    uid: 'student-one',
    groups: [group],
    bookings: [],
    activeConversationId: 'shared-group-group-one',
    senderName: 'Jordan Student',
  });
  const oldSubscription = mockSubscriptions[0];

  await act(async () => {
    renderer.update(
      <Probe
        options={{
          uid: 'student-two',
          groups: [group],
          bookings: [],
          activeConversationId: 'shared-group-group-one',
          senderName: 'Taylor Student',
        }}
      />,
    );
  });
  expect(oldSubscription.unsubscribe).toHaveBeenCalledTimes(1);
  const currentSubscription = mockSubscriptions[1];
  await act(async () => currentSubscription.onMessages([{ id: 'new', text: 'New account' }]));
  await act(async () => oldSubscription.onMessages([{ id: 'stale', text: 'Old account' }]));
  expect(latest.messages).toEqual([{ id: 'new', text: 'New account' }]);
  await act(async () => renderer.unmount());
});

test('switching chats never renders the previous chat messages under the new title', async () => {
  const otherGroup = {
    ...sharedGroup,
    id: 'group-two',
    name: 'Physics Circle',
  };
  const renderer = await mount({
    uid: 'student-one',
    groups: [sharedGroup, otherGroup],
    bookings: [],
    activeConversationId: 'shared-group-group-one',
    senderName: 'Jordan Student',
  });
  const oldSubscription = mockSubscriptions[0];
  await act(async () =>
    oldSubscription.onMessages(
      [{ id: 'message-from-first-group', text: 'Private group details' }],
      { hasMoreMessages: true },
    ),
  );

  await act(async () => {
    renderer.update(
      <Probe
        options={{
          uid: 'student-one',
          groups: [sharedGroup, otherGroup],
          bookings: [],
          activeConversationId: 'shared-group-group-two',
          senderName: 'Jordan Student',
        }}
      />,
    );
  });

  expect(layoutSnapshot.activeConversation?.id).toBe('shared-group-group-two');
  expect(layoutSnapshot.messages).toEqual([]);
  expect(layoutSnapshot.hasMoreMessages).toBe(false);
  expect(oldSubscription.unsubscribe).toHaveBeenCalledTimes(1);
  expect(latest.messages).toEqual([]);
  expect(mockSubscriptions).toHaveLength(2);
  await act(async () => renderer.unmount());
});

test('group activity updates keep the active live chat listener instead of re-subscribing', async () => {
  const renderer = await mount({
    uid: 'student-one',
    groups: [sharedGroup],
    bookings: [],
    activeConversationId: 'shared-group-group-one',
    senderName: 'Jordan Student',
  });
  const subscription = mockSubscriptions[0];

  await act(async () => {
    renderer.update(
      <Probe
        options={{
          uid: 'student-one',
          groups: [{ ...sharedGroup, updatedAt: '2026-10-14T12:00:00.000Z' }],
          bookings: [],
          activeConversationId: 'shared-group-group-one',
          senderName: 'Jordan Student',
        }}
      />,
    );
  });

  expect(mockSubscriptions).toHaveLength(1);
  expect(subscription.unsubscribe).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test.each(['conversation', 'account'])('a late older-message failure stays with its original %s', async change => {
  const otherGroup = { ...sharedGroup, id: 'group-two', name: 'Physics Circle' };
  const options = {
    uid: 'student-one',
    groups: [sharedGroup, otherGroup],
    bookings: [],
    activeConversationId: 'shared-group-group-one',
    senderName: 'Jordan Student',
  };
  const renderer = await mount(options);
  let rejectOlder;
  let request;
  try {
    const oldSubscription = mockSubscriptions[0];
    oldSubscription.loadMoreMessages.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectOlder = reject;
    }));
    await act(async () => oldSubscription.onMessages([], { hasMoreMessages: true }));
    await act(async () => {
      request = latest.loadMoreMessages();
    });
    expect(latest.loadingOlderMessages).toBe(true);
    await act(async () => {
      renderer.update(<Probe options={{
        ...options,
        ...(change === 'account'
          ? { uid: 'student-two' }
          : { activeConversationId: 'shared-group-group-two' }),
      }} />);
    });
    await act(async () => mockSubscriptions[1].onMessages([{ id: 'new-message' }]));
    await act(async () => {
      rejectOlder(new Error('Old chat history failed.'));
      await request;
    });
    expect(latest.error).toBe('');
    expect(latest.messages).toEqual([{ id: 'new-message' }]);
    expect(latest.loadingOlderMessages).toBe(false);
  } finally {
    await act(async () => renderer.unmount());
  }
});

test('older-message failures remain visible in the active chat', async () => {
  const renderer = await mount({
    uid: 'student-one',
    groups: [sharedGroup],
    bookings: [],
    activeConversationId: 'shared-group-group-one',
    senderName: 'Jordan Student',
  });
  try {
    const subscription = mockSubscriptions[0];
    subscription.loadMoreMessages.mockRejectedValue(new Error('History is offline.'));
    await act(async () => subscription.onMessages([], { hasMoreMessages: true }));
    await act(async () => latest.loadMoreMessages());
    expect(latest.error).toBe('History is offline.');
    expect(latest.loadingOlderMessages).toBe(false);
  } finally {
    await act(async () => renderer.unmount());
  }
});
