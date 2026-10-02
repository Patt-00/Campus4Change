import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Field } from '../../../shared/components/UI';
import { timeLabel } from '../../../shared/data/demo';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function ChatScreen({ back, conversation, send, canSend = true }) {
  const [text, setText] = useState('');
  const scroll = useRef(null);
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
