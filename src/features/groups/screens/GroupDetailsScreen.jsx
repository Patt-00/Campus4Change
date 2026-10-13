import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Field, Link } from '../../../shared/components/UI';

import { dateLabel, sessionTime } from '../../../shared/data/utils';
import { s } from '../../../shared/theme/styles';

export function GroupDetailsScreen({
  go,
  back,
  group,
  membership,
  addPost,
  message,
  hasMorePosts = false,
  postsLive = false,
  loadingMorePosts = false,
  loadMorePosts,
  refreshPosts,
}) {
  const [draft, setDraft] = useState('');
  return (
    <Screen title={group.name} back={back}>
      <Text style={s.muted}>{group.members} members</Text>
      <AppButton
        title={group.joined ? 'OPEN GROUP SESSION' : 'JOIN GROUP'}
        onPress={() =>
          group.joined
            ? go({
                page: 'Group Session',
                groupId: group.id,
              })
            : membership(true)
        }
      />
      <Text style={styles.sharingStatus}>
        {group.shared
          ? 'Shared group • Posts and replies are visible to members.'
          : 'Saved on this device • Other students cannot see this group.'}
      </Text>
      {group.shared && group.isOwner && (
        <AppButton
          title="REVIEW GROUP REPORTS"
          outline
          onPress={() => go({ page: 'Group Reports', groupId: group.id })}
        />
      )}

      <Text style={s.section}>Next group session</Text>
      <View style={s.card}>
        <Text style={s.name}>{group.meetup || 'Study session'}</Text>
        <Text style={s.muted}>
          {group.meetupAt ? sessionTime(group.meetupAt) : 'No meetup scheduled'}
        </Text>
        <Text style={s.muted}>
          Location • {group.room || 'Not set'}
        </Text>
      </View>
      <Text style={s.section}>Recent posts</Text>
      {group.shared && !group.joined ? (
        <Empty
          title="Member posts are private"
          body="Join this group to read posts and replies."
        />
      ) : group.shared && !group.postsLoaded ? (
        <Text style={s.muted}>Loading group posts...</Text>
      ) : (
        <>
          {group.posts.map(p => (
            <TouchableOpacity
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={'Post by ' + p.author + ': ' + p.text}
              accessibilityHint="Opens this post and its replies."
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
                {p.replies.length}
                {p.hasMoreReplies ? '+' : ''} replies • {dateLabel(p.createdAt)}
              </Text>
            </TouchableOpacity>
          ))}
          {group.posts.length === 0 && (
            <Empty title="No posts yet" body="Share the first study note." />
          )}
          {group.shared && hasMorePosts && (
            <AppButton
              title={
                loadingMorePosts ? 'LOADING OLDER POSTS...' : 'LOAD OLDER POSTS'
              }
              outline
              disabled={loadingMorePosts}
              onPress={loadMorePosts}
            />
          )}
          {group.shared && !postsLive && !loadingMorePosts && (
            <AppButton
              title="REFRESH LATEST POSTS"
              outline
              onPress={refreshPosts}
            />
          )}
        </>
      )}
      {group.joined && (
        <>
          <Text style={s.section}>Share with the group</Text>
          <Text style={s.muted}>
            {group.shared
              ? 'Your posts, replies, and chat messages are shared with current group members.'
              : 'Posts and replies stay on this device.'}
          </Text>
          <View style={s.gap} />
          <Field
            placeholder="Write a study note..."
            multiline
            maxLength={3000}
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
          {!group.isOwner && (
            <Link
              label="Leave group"
              danger
              onPress={() => membership(false)}
            />
          )}
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
  sharingStatus: {
    color: '#9CAFC2',
    fontSize: 12,
    marginTop: 6,
  },
});
