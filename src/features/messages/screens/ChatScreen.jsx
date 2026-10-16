import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Empty, ErrorText, Field, Link } from '../../../shared/components/UI';
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
  loading = false,
  loadError = '',
  retry,
  hasMoreMessages = false,
  loadingOlderMessages = false,
  loadMoreMessages,
  reportMessage,
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const delivered = conversation.delivery === 'shared';
  const sourceMessages = conversation?.messages;
  const messages = useMemo(
    () => conversationMessages({ messages: sourceMessages }).reverse(),
    [sourceMessages],
  );
  async function submit() {
    const value = text.trim();
    if (!canSend || !value || busy) {
      return;
    }
    setBusy(true);
    setSendError('');
    try {
      await send(value);
      setText('');
    } catch (error) {
      setSendError(
        error?.code === 'permission-denied'
          ? conversation.kind === 'group'
            ? 'Only current group members can send messages, and group contributions are limited to one every five seconds.'
            : 'Only the tutor-session participants can send messages. Wait briefly and try again.'
          : error instanceof Error
            ? error.message
            : 'Could not send the message. Check your connection and retry.',
      );
    } finally {
      setBusy(false);
    }
  }
  function report(message) {
    if (!reportMessage || message.mine || !message.id) {
      return;
    }
    Alert.alert(
      'Report this message',
      'Your name is not included. The group owner can review the message and reason.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => queueReport(message, 'spam'),
        },
        {
          text: 'Abuse or unsafe',
          onPress: () => queueReport(message, 'abuse'),
        },
      ],
    );
  }
  function queueReport(message, reason) {
    reportMessage(message, reason);
    setReportStatus('Report queued for group-owner review.');
  }
  return (
    <Screen
      title={conversation.name || 'Conversation'}
      back={back}
      scroll={false}
    >
      <Text style={[s.muted, styles.marginBottom12]}>
        {delivered
          ? conversation.kind === 'group'
            ? 'Messages are delivered to current members of this group.'
            : 'Messages are delivered to the other participant in this tutor session.'
          : cloudSynced
          ? 'Messages are saved on this device and sync to your private Firebase account when online. They are not sent to the other person.'
          : 'Messages are saved on this device and are not sent to the other person.'}
      </Text>
      <ErrorText value={loadError || sendError} />
      {!!reportStatus && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {reportStatus}
        </Text>
      )}
      {!!loadError && retry && (
        <Link label="Retry loading chat" onPress={retry} />
      )}
      {hasMoreMessages && loadMoreMessages && (
        <AppButton
          title={
            loadingOlderMessages ? 'LOADING OLDER MESSAGES...' : 'LOAD OLDER MESSAGES'
          }
          outline
          disabled={loadingOlderMessages}
          onPress={loadMoreMessages}
        />
      )}
      {messages.length ? (
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
              {conversation.kind === 'group' && !message.mine && (
                <Text style={styles.sender}>{message.senderName || 'Group member'}</Text>
              )}
              <Text style={s.text}>{messageText(message)}</Text>
              <Text style={styles.time}>
                {timeLabel(message.sentAt)}
                {message.mine && !delivered ? ' • Not delivered' : ''}
              </Text>
              {conversation.kind === 'group' && reportMessage && !message.mine && (
                <Link
                  label="Report message"
                  danger
                  onPress={() => report(message)}
                />
              )}
            </View>
          )}
          initialNumToRender={18}
          maxToRenderPerBatch={12}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : (
        <View style={[s.grow, styles.emptyContent]}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={C.cyan} />
              <Text style={s.muted}>Loading messages…</Text>
            </View>
          ) : (
            <Empty
              title={delivered ? 'No messages yet' : 'Start private notes'}
              body={
                delivered
                  ? 'Send the first message to this conversation.'
                  : 'Notes here stay in your account and are not delivered to the other person.'
              }
            />
          )}
        </View>
      )}
      {!canSend && (
        <Text style={s.muted}>
          {conversation.kind === 'group'
            ? 'Join this group before sending messages.'
            : 'This tutor session chat is read-only.'}
        </Text>
      )}
      <View style={[s.row, styles.alignItemsflexend]}>
        <View style={s.grow}>
          <Field
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            maxLength={2000}
            onSubmitEditing={submit}
            editable={canSend && !busy}
            returnKeyType="send"
          />
        </View>
        <AppButton
          title="SEND"
          busy={busy}
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
  sender: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: C.cyan,
    marginBottom: 6,
  },
  marginBottom12: {
    marginBottom: 12,
  },
  chatContent: {
    flexGrow: 1,
    paddingBottom: 12,
    paddingTop: 20,
  },
  emptyContent: {
    justifyContent: 'center',
  },
  alignItemsflexend: {
    alignItems: 'flex-end',
  },
  loading: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  marginBottom14marginTop0: {
    marginBottom: 14,
    marginTop: 0,
  },
});
