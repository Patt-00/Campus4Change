import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Empty, Field, Link } from '../../../shared/components/UI';
import { timeLabel } from '../../../shared/data/utils';
import {
  conversationMessages,
  messageText,
  messageTimestamp,
} from '../data/conversation';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function MessagesScreen({
  go,
  conversations = [],
  sharedAccount = false,
  emailVerified = true,
}) {
  const [query, setQuery] = useState('');
  const searchableConversations = useMemo(
    () =>
      conversations
        .filter(
          conversation => conversation && typeof conversation === 'object',
        )
        .map(conversation => {
          const name =
            typeof conversation.name === 'string' && conversation.name.trim()
              ? conversation.name
              : 'Conversation';
          const messages = conversationMessages(conversation);
          return {
            ...conversation,
            name,
            messages,
            latestMessageTime:
              messageTimestamp(messages.at(-1)) ??
              messageTimestamp(conversation.activityAt) ??
              0,
          };
        })
        .filter(
          conversation =>
            typeof conversation.id === 'string' && conversation.id,
        ),
    [conversations],
  );
  const normalizedQuery = query.toLowerCase().trim();
  const list = useMemo(() => {
    const sorted = [...searchableConversations];
    if (normalizedQuery) {
      return sorted
        .filter(
          conversation =>
            conversation.name.toLowerCase().includes(normalizedQuery) ||
            conversation.messages.some(message =>
              messageText(message).toLowerCase().includes(normalizedQuery),
            ),
        )
        .sort((a, b) => b.latestMessageTime - a.latestMessageTime);
    }
    return sorted.sort((a, b) => b.latestMessageTime - a.latestMessageTime);
  }, [normalizedQuery, searchableConversations]);
  return (
    <Screen title="Messages" go={go} tab="Messages" scroll={false}>
      <FlatList
        style={s.grow}
        contentContainerStyle={styles.listContent}
        data={list}
        keyExtractor={conversation => conversation.id}
        renderItem={({ item: conversation }) => {
          const last = conversation.messages.at(-1);
          const latestMessage =
            messageText(last).trim() ||
            (conversation.delivery === 'shared'
              ? conversation.subtitle || 'Shared chat'
              : 'Start a conversation');
          const messagePreview =
            latestMessage.length > 120
              ? latestMessage.slice(0, 117).trimEnd() + '…'
              : latestMessage;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                conversation.delivery === 'shared'
                  ? `Chat with ${conversation.name}. Shared chat: ${messagePreview}`
                  : `Chat with ${conversation.name}. Latest message: ${messagePreview}`
              }
              style={styles.conversation}
              onPress={() =>
                go({
                  page: 'Chat',
                  conversationId: conversation.id,
                })
              }
            >
              <Avatar name={conversation.name} />
              <View style={s.grow}>
                <Text style={s.name}>{conversation.name}</Text>
                <Text numberOfLines={1} style={s.muted}>
                  {latestMessage}
                </Text>
              </View>
              <Text style={[s.muted, styles.fontSize9]}>
                {last ? timeLabel(last.sentAt) : ''}
              </Text>
            </TouchableOpacity>
          );
        }}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View>
            <Field
              placeholder="Search chat names and private notes"
              icon="search"
              value={query}
              onChangeText={setQuery}
            />
            <View style={s.gap} />
          </View>
        }
        ListEmptyComponent={
          <Empty
            title={normalizedQuery ? 'No conversations found' : 'No messages yet'}
            body={
              normalizedQuery
                ? 'Try another chat name or saved note.'
                : sharedAccount
                  ? emailVerified
                    ? 'Group chats appear when you join a shared group. Tutor chats appear with your session requests.'
                    : 'Verify your email before joining group chats or starting tutor chats. Private notes stay in your Firebase account.'
                  : 'Open a tutor profile or joined group to draft a message. Messages are not sent to the other person or group.'
            }
          />
        }
        ListFooterComponent={
          <View>
            <Link label="Find a tutor" onPress={() => go('Tutor Search')} />
            <Link label="Study groups" onPress={() => go('Study Groups')} />
          </View>
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  conversation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 70,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  fontSize9: {
    fontSize: 11,
  },
});
