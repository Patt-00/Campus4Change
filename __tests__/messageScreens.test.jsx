import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FlatList, Text, TextInput, TouchableOpacity } from 'react-native';
import { ChatScreen } from '../src/features/messages/screens/ChatScreen';
import { MessagesScreen } from '../src/features/messages/screens/MessagesScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 800, height: 1200 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

async function settleVirtualizedLists() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 80));
  });
}

test('chat virtualizes long threads and keeps the newest message at the bottom', async () => {
  const messageCount = 1200;
  const messages = Array.from({ length: messageCount }, (_, index) => ({
    id: 'message-' + index,
    text: 'Body message-' + index,
    sentAt: new Date(Date.UTC(2026, 9, 13, 0, index)).toISOString(),
    mine: index % 2 === 0,
  }));
  let chatRenderer;
  await act(async () => {
    chatRenderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ChatScreen
          back={jest.fn()}
          conversation={{ id: 'large-chat', name: 'Large chat', messages }}
          send={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });
  await settleVirtualizedLists();
  const chatList = chatRenderer.root.findByType(FlatList);
  const mountedMessages = chatRenderer.root
    .findAllByType(Text)
    .filter(
      node =>
        typeof node.props.children === 'string' &&
        node.props.children.startsWith('Body message-'),
    ).length;
  expect(chatList.props.data).toHaveLength(messageCount);
  expect(chatList.props.data[0].text).toBe(`Body message-${messageCount - 1}`);
  expect(chatList.props.inverted).toBe(true);
  expect(mountedMessages).toBeLessThanOrEqual(50);
  expect(mountedMessages).toBeLessThan(messageCount);
  await act(async () => chatRenderer.unmount());
});

test('chat sends a trimmed draft from the keyboard action', async () => {
  const send = jest.fn();
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ChatScreen
          back={jest.fn()}
          conversation={{ id: 'chat-one', name: 'Tutor', messages: [] }}
          send={send}
        />
      </SafeAreaProvider>,
    );
  });

  await act(async () =>
    renderer.root
      .findByType(TextInput)
      .props.onChangeText('  New study note  '),
  );
  await act(async () =>
    renderer.root.findByType(TextInput).props.onSubmitEditing(),
  );
  expect(send).toHaveBeenCalledWith('New study note');
  await act(async () => renderer.unmount());
});

test('chat explains local and Firebase storage without implying delivery', async () => {
  let localRenderer;
  await act(async () => {
    localRenderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ChatScreen
          back={jest.fn()}
          conversation={{ id: 'local-chat', name: 'Tutor', messages: [] }}
          send={jest.fn()}
        />
      </SafeAreaProvider>,
    );
  });
  await settleVirtualizedLists();
  const localCopy = localRenderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string');
  expect(localCopy).toContain(
    'Messages are saved on this device and are not sent to the other person.',
  );
  await act(async () => localRenderer.unmount());

  let cloudRenderer;
  await act(async () => {
    cloudRenderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ChatScreen
          back={jest.fn()}
          conversation={{ id: 'cloud-chat', name: 'Tutor', messages: [] }}
          send={jest.fn()}
          cloudSynced
        />
      </SafeAreaProvider>,
    );
  });
  await settleVirtualizedLists();
  const cloudCopy = cloudRenderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string');
  expect(cloudCopy).toContain(
    'Messages are saved on this device and sync to your private Firebase account when online. They are not sent to the other person.',
  );
  await act(async () => cloudRenderer.unmount());
});

test('inbox virtualizes conversations and searches the full message text', async () => {
  const conversationCount = 120;
  const conversations = Array.from(
    { length: conversationCount },
    (_, index) => ({
      id: 'conversation-' + index,
      name: 'Tutor ' + index,
      messages: [
        {
          id: 'latest-' + index,
          text: 'Latest message ' + index,
          sentAt: new Date(Date.UTC(2026, 9, 13, 0, index)).toISOString(),
        },
      ],
    }),
  );
  let inboxRenderer;
  await act(async () => {
    inboxRenderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <MessagesScreen go={jest.fn()} conversations={conversations} />
      </SafeAreaProvider>,
    );
  });
  await settleVirtualizedLists();
  const mountedConversations = inboxRenderer.root
    .findAllByType(TouchableOpacity)
    .filter(node =>
      node.props.accessibilityLabel?.startsWith('Chat with '),
    ).length;
  const inboxList = inboxRenderer.root.findByType(FlatList);
  expect(inboxList.props.data).toHaveLength(conversationCount);
  expect(mountedConversations).toBeLessThanOrEqual(16);
  expect(mountedConversations).toBeLessThan(conversationCount);

  const search = inboxRenderer.root.findByType(TextInput);
  await act(async () => search.props.onChangeText('latest message 99'));
  await settleVirtualizedLists();
  const filteredInbox = inboxRenderer.root.findByType(FlatList);
  expect(filteredInbox.props.data.map(item => item.id)).toEqual([
    'conversation-99',
  ]);
  expect(
    inboxRenderer.root
      .findAllByType(TouchableOpacity)
      .some(node =>
        node.props.accessibilityLabel?.startsWith('Chat with Tutor 99.'),
      ),
  ).toBe(true);
  await act(async () => inboxRenderer.unmount());
});

test('empty inbox copy does not imply Firebase messages stay only on device', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <MessagesScreen go={jest.fn()} conversations={[]} />
      </SafeAreaProvider>,
    );
  });
  await settleVirtualizedLists();

  const labels = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .filter(value => typeof value === 'string');
  expect(labels).toContain(
    'Open a tutor profile or joined group to draft a message. Messages are not sent to the other person or group.',
  );
  expect(labels.some(value => value.includes('local conversation'))).toBe(
    false,
  );

  await act(async () => renderer.unmount());
});
