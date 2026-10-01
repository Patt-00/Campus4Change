import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Chip, Field } from '../../../shared/components/UI';
import type { Group, Post } from '../../../shared/data/types';
import { s } from '../../../shared/theme/styles';

export function GroupPostScreen({
  back,
  group,
  post,
  reply,
}: {
  back: () => void;
  group: Group;
  post: Post;
  reply: (text: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <Screen title="Group Post" back={back}>
      <Text style={s.section}>{group.name}</Text>
      <View style={s.card}>
        <Text style={[s.name, s.blue]}>{post.author}</Text>
        <Text style={s.text}>{post.text}</Text>
      </View>
      {post.id === 'post-mika' && (
        <View style={s.card}>
          <Text style={s.name}>Sample reviewer: integration by parts</Text>
          <Text style={s.text}>∫ u dv = uv − ∫ v du</Text>
          <Text style={s.muted}>
            Choose u so that differentiating it makes the expression simpler.
            Choose dv so that it can be integrated.
          </Text>
          <Text style={s.text}>Example: ∫ x eˣ dx = x eˣ − eˣ + C.</Text>
        </View>
      )}
      <Text style={s.section}>Replies</Text>
      {post.replies.map(r => (
        <View style={s.card} key={r.id}>
          <Text style={[s.name, s.blue]}>{r.author}</Text>
          <Text style={s.text}>{r.text}</Text>
        </View>
      ))}
      {!post.replies.length && <Text style={s.muted}>No replies yet.</Text>}
      {group.joined ? (
        <>
          <View style={s.gap} />
          <Field
            placeholder="Write a reply..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <AppButton
            title="SEND REPLY"
            disabled={!text.trim()}
            onPress={() => {
              reply(text.trim());
              setText('');
            }}
          />
        </>
      ) : (
        <Chip label="Join this group to reply" />
      )}
    </Screen>
  );
}
