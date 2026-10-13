import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Field } from '../../../shared/components/UI';
import { timeLabel } from '../../../shared/data/utils';
import { conversationMessages, messageText } from '../data/conversation';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function ChatScreen({
  back,
  conversation,
  send,
  canSend = true,
  cloudSynced = false,
}) {
  const [text, setText] = useState('');
  const sourceMessages = conversation?.messages;
  const messages = useMemo(
    () => conversationMessages({ messages: sourceMessages }).reverse(),
    [sourceMessages],
  );
  function submit() {
    if (canSend && text.trim()) {
      send(text.trim());
      setText('');
    }
  }
  return (
    <Screen
      title={conversation.name || 'Conversation'}
      back={back}
      scroll={false}
    >
      <Text style={[s.muted, styles.marginBottom12]}>
        {cloudSynced
          ? 'Messages are saved on this device and sync to your private Firebase account when online. They are not sent to the other person.'
          : 'Messages are saved on this device and are not sent to the other person.'}
      </Text>
      <FlatList
        style={s.grow}
        contentContainerStyle={styles.chatContent}
        data={messages}
        inverted
        keyExtractor={(message, index) =>
          typeof message.id === 'string' && message.id
            ? message.id
            : `message-${messages.length - 1 - index}`
        }
        renderItem={({ item: message }) => (
          <View
            style={[styles.bubble, message.mine ? styles.mine : styles.theirs]}
          >
            <Text style={s.text}>{messageText(message)}</Text>
            <Text style={styles.time}>
              {timeLabel(message.sentAt)}
              {message.mine ? ' • Not delivered' : ''}
            </Text>
          </View>
        )}
        initialNumToRender={18}
        maxToRenderPerBatch={12}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <Empty
            title="Start a conversation"
            body="Keep notes for this conversation here."
          />
        }
      />
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
  marginBottom12: {
    marginBottom: 12,
  },
  chatContent: {
    flexGrow: 1,
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
