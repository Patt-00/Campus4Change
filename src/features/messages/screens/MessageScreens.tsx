import React, { useRef, useState, type ComponentRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Empty, Field, Link } from '../../../shared/components/UI';
import { timeLabel } from '../../../shared/data/demo';
import type { Conversation } from '../../../shared/data/types';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
export function MessagesScreen({
  go,
  conversations,
}: {
  go: Navigate;
  conversations: Conversation[];
}) {
  const [query, setQuery] = useState('');
  const list = conversations
    .filter(c =>
      (c.name + ' ' + c.messages.map(m => m.text).join(' '))
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) =>
      (b.messages.at(-1)?.sentAt ?? '').localeCompare(
        a.messages.at(-1)?.sentAt ?? '',
      ),
    );
  return (
    <Screen title="Messages" go={go} tab="Messages">
      <Field
        placeholder="Search messages"
        icon="search"
        value={query}
        onChangeText={setQuery}
      />
      <View style={s.gap} />
      {list.map(c => {
        const last = c.messages.at(-1);
        return (
          <TouchableOpacity
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={'Chat with ' + c.name}
            style={styles.conversation}
            onPress={() =>
              go({
                page: 'Chat',
                conversationId: c.id,
              })
            }
          >
            <Avatar name={c.name} />
            <View style={s.grow}>
              <Text style={s.name}>{c.name}</Text>
              <Text numberOfLines={1} style={s.muted}>
                {last?.text ?? 'Start a conversation'}
              </Text>
            </View>
            <Text style={[s.muted, styles.fontSize9]}>
              {last ? timeLabel(last.sentAt) : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
      {!list.length && (
        <Empty
          title="No conversations found"
          body="Open a tutor profile or joined group to start a local conversation."
        />
      )}
      <Link label="Find a tutor" onPress={() => go('Tutor Search')} />
      <Link label="Study groups" onPress={() => go('Study Groups')} />
    </Screen>
  );
}
export function ChatScreen({
  back,
  conversation,
  send,
  canSend = true,
}: {
  back: () => void;
  conversation: Conversation;
  send: (text: string) => void;
  canSend?: boolean;
}) {
  const [text, setText] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  function submit() {
    if (canSend && text.trim()) {
      send(text.trim());
      setText('');
    }
  }
  return (
    <Screen title={conversation.name} back={back} scroll={false}>
      <Text style={[s.muted, styles.marginBottom12]}>
        Messages stay on this device and are not delivered.
      </Text>
      <ScrollView
        ref={scroll}
        style={s.grow}
        contentContainerStyle={styles.paddingBottom12paddingTop20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({
            animated: true,
          })
        }
      >
        {conversation.messages.map(m => (
          <View
            key={m.id}
            style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}
          >
            <Text style={s.text}>{m.text}</Text>
            <Text style={styles.time}>
              {timeLabel(m.sentAt)}
              {m.mine ? ' • Not delivered' : ''}
            </Text>
          </View>
        ))}
        {!conversation.messages.length && (
          <Empty
            title="Start a conversation"
            body="Keep notes for this conversation here."
          />
        )}
      </ScrollView>
      {!canSend && (
        <Text style={s.muted}>Join this group before sending messages.</Text>
      )}
      <View style={[s.row, styles.alignItemsflexend]}>
        <View style={s.grow}>
          <Field
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            maxLength={2000}
            onSubmitEditing={submit}
            returnKeyType="send"
          />
        </View>
        <AppButton
          title="SEND"
          disabled={!canSend || !text.trim()}
          onPress={submit}
          style={styles.marginBottom14marginTop0}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  conversation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 70,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  bubble: {
    maxWidth: '86%',
    minHeight: 64,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#0c3443',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: C.card,
  },
  time: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: C.muted,
    marginTop: 8,
  },
  fontSize9: {
    fontSize: 11,
  },
  marginBottom12: {
    marginBottom: 12,
  },
  paddingBottom12paddingTop20: {
    paddingBottom: 12,
    paddingTop: 20,
  },
  alignItemsflexend: {
    alignItems: 'flex-end',
  },
  marginBottom14marginTop0: {
    marginBottom: 14,
    marginTop: 0,
  },
});
