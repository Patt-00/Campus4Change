import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import {
  Chip,
  Empty,
  ErrorText,
  Field,
  Link,
} from '../../../shared/components/UI';
import type { Group, Post } from '../../../shared/data/types';
import { dateLabel } from '../../../shared/data/demo';
import { s } from '../../../shared/theme/styles';
import type { Navigate } from '../../../navigation/types';
export function GroupsScreen({
  go,
  back,
  groups,
}: {
  go: Navigate;
  back: () => void;
  groups: Group[];
}) {
  const [query, setQuery] = useState('');
  const filtered = groups.filter(g =>
    (g.name + ' ' + g.subject)
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  function cards(list: Group[]) {
    return list.map(g => (
      <TouchableOpacity
        key={g.id}
        accessibilityRole="button"
        accessibilityLabel={'Open ' + g.name}
        style={[s.card, s.row, styles.minHeight104]}
        onPress={() =>
          go({
            page: 'Group Details',
            groupId: g.id,
          })
        }
      >
        <View style={styles.width52height52}>
          <Text style={[s.heading, s.blue]}>{g.name[0]}</Text>
        </View>
        <View style={s.grow}>
          <Text style={s.name}>{g.name}</Text>
          <Text style={s.muted}>
            {g.members} members • {g.joined ? 'Your group' : 'Public'}
          </Text>
          <Text style={[s.link, styles.marginTop8]}>Open group</Text>
        </View>
      </TouchableOpacity>
    ));
  }
  return (
    <Screen title="Study Groups" back={back} go={go} tab="Home">
      <AppButton title="+ CREATE GROUP" onPress={() => go('Create Group')} />
      <View style={s.gap} />
      <Field
        placeholder="Search study groups"
        value={query}
        onChangeText={setQuery}
      />
      <Text style={[s.section, styles.marginTop8]}>Your groups</Text>
      {cards(filtered.filter(g => g.joined))}
      {!filtered.some(g => g.joined) && (
        <Text style={s.muted}>Join a group or create your own.</Text>
      )}
      <Text style={s.section}>Discover</Text>
      {cards(filtered.filter(g => !g.joined))}
      {!filtered.some(g => !g.joined) && (
        <Text style={s.muted}>No more groups match this search.</Text>
      )}
    </Screen>
  );
}
export function GroupDetailsScreen({
  go,
  back,
  group,
  membership,
  addPost,
  message,
}: {
  go: Navigate;
  back: () => void;
  group: Group;
  membership: (joined: boolean) => void;
  addPost: (text: string) => void;
  message: () => void;
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
        <Text style={s.muted}>Friday • 4:00 PM</Text>
        <Text style={s.muted}>Room {group.room} • local demo</Text>
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
export function CreateGroupScreen({
  back,
  create,
}: {
  back: () => void;
  create: (name: string, subject: string, meetup: string) => void;
}) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [meetup, setMeetup] = useState('');
  const [error, setError] = useState('');
  return (
    <Screen title="Create Study Group" back={back}>
      <Text style={[s.muted, styles.marginBottom20]}>
        Build a space to learn with your campus peers.
      </Text>
      <Field
        label="Group name"
        placeholder="Example: Calculus Study Circle"
        value={name}
        onChangeText={setName}
      />
      <Field
        label="Subject"
        placeholder="Example: Calculus"
        value={subject}
        onChangeText={setSubject}
      />
      <Field
        label="Meetup topic"
        placeholder="What will you study together?"
        value={meetup}
        onChangeText={setMeetup}
      />
      <ErrorText value={error} />
      <AppButton
        title="CREATE GROUP"
        onPress={() => {
          if (name.trim().length < 3 || !subject.trim()) {
            setError(
              'Enter a group name with at least 3 characters and a subject.',
            );
            return;
          }
          create(
            name.trim(),
            subject.trim(),
            meetup.trim() || subject.trim() + ' review',
          );
        }}
      />
      <Text style={[s.muted, styles.marginTop16]}>
        Groups in this version are stored on this device.
      </Text>
    </Screen>
  );
}
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
const styles = StyleSheet.create({
  minHeight104: {
    minHeight: 104,
  },
  width52height52: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#112832',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marginTop8: {
    marginTop: 8,
  },
  minHeight106: {
    minHeight: 106,
  },
  marginTop12: {
    marginTop: 12,
  },
  fontSize9marginTop12: {
    fontSize: 9,
    marginTop: 12,
  },
  marginBottom20: {
    marginBottom: 20,
  },
  marginTop16: {
    marginTop: 16,
  },
});
