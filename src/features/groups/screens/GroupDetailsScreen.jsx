import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Field, Link } from '../../../shared/components/UI';

import { dateLabel, sessionTime } from '../../../shared/data/demo';
import { s } from '../../../shared/theme/styles';

export function GroupDetailsScreen({
  go,
  back,
  group,
  membership,
  addPost,
  message,
}) {
  const [draft, setDraft] = useState('');
  return (
    <Screen title={group.name} back={back}>
      <Text style={s.muted}>{group.members} members</Text>
      <AppButton
        title={group.joined ? 'START STUDY ROOM' : 'JOIN GROUP'}
        onPress={() =>
          group.joined
            ? go({
                page: 'Study Room',
                groupId: group.id,
              })
            : membership(true)
        }
      />

      <Text style={s.section}>Next meetup</Text>
      <View style={s.card}>
        <Text style={s.name}>{group.meetup}</Text>
        <Text style={s.muted}>
          {group.meetupAt ? sessionTime(group.meetupAt) : 'No meetup scheduled'}
        </Text>
        <Text style={s.muted}>Focus room • {group.room}</Text>
      </View>
      <Text style={s.section}>Recent posts</Text>
      {group.posts.map(p => (
        <TouchableOpacity
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={'Post by ' + p.author}
          style={[s.card, styles.minHeight106]}
          onPress={() =>
            go({
              page: 'Group Post',
              groupId: group.id,
              postId: p.id,
            })
          }
        >
          <Text style={[s.name, s.blue]}>{p.author}</Text>
          <Text style={[s.text, styles.marginTop12]}>{p.text}</Text>
          <Text style={[s.muted, styles.fontSize9marginTop12]}>
            {p.replies.length} replies • {dateLabel(p.createdAt)}
          </Text>
        </TouchableOpacity>
      ))}
      {group.posts.length === 0 && (
        <Empty title="No posts yet" body="Share the first study note." />
      )}
      {group.joined && (
        <>
          <Text style={s.section}>Share with the group</Text>
          <Text style={s.muted}>Posts and replies stay on this device.</Text>
          <View style={s.gap} />
          <Field
            placeholder="Write a study note..."
            multiline
            value={draft}
            onChangeText={setDraft}
          />

          <AppButton
            title="POST NOTE"
            disabled={!draft.trim()}
            onPress={() => {
              addPost(draft.trim());
              setDraft('');
            }}
          />

          <Link label="Open group chat" onPress={message} />
          <Link label="Leave group" danger onPress={() => membership(false)} />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  minHeight106: {
    minHeight: 106,
  },
  marginTop12: {
    marginTop: 12,
  },
  fontSize9marginTop12: {
    fontSize: 12,
    marginTop: 12,
  },
});
