import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Avatar, Empty, Field, Link } from '../../../shared/components/UI';
import { timeLabel } from '../../../shared/data/demo';

import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function MessagesScreen({ go, conversations }) {
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
  fontSize9: {
    fontSize: 11,
  },
});
