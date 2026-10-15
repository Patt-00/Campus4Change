import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Chip, Field, Link } from '../../../shared/components/UI';

import { s } from '../../../shared/theme/styles';

export function GroupPostScreen({
  back,
  group,
  post,
  userId,
  reportContent,
  reply,
  loadMoreReplies,
  refreshReplies,
  loadingMoreReplies = false,
}) {
  const [text, setText] = useState('');
  const [reportQueued, setReportQueued] = useState(false);
  function chooseReportReason(target) {
    if (!group.shared || !reportContent) {
      return;
    }
    Alert.alert(
      'Report this content',
      'Your name is not included. The group owner can review the content and reason.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Spam',
          onPress: () => submitReport(target, 'spam'),
        },
        {
          text: 'Abuse or unsafe',
          onPress: () => submitReport(target, 'abuse'),
        },
      ],
    );
  }
  function submitReport(target, reason) {
    reportContent({ ...target, reason });
    setReportQueued(true);
  }
  return (
    <Screen title="Group Post" back={back}>
      <Text style={s.section}>{group.name}</Text>
      <View style={s.card}>
        <Text style={[s.name, s.blue]}>{post.author}</Text>
        <Text style={s.text}>{post.text}</Text>
        {group.shared &&
          group.joined &&
          reportContent &&
          post.authorUid !== userId && (
          <Link
            label="Report post"
            danger
            onPress={() =>
              chooseReportReason({
                targetType: 'post',
                targetId: post.id,
                postId: null,
                targetAuthor: post.author,
                contentSnapshot: post.text,
              })
            }
          />
        )}
      </View>
      {reportQueued && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          Report queued for group-owner review. It will sync when connected.
        </Text>
      )}
      <Text style={s.section}>Replies</Text>
      {group.joined && post.hasMoreReplies && (
        <AppButton
          title={
            loadingMoreReplies
              ? 'LOADING OLDER REPLIES...'
              : 'LOAD OLDER REPLIES'
          }
          outline
          disabled={loadingMoreReplies}
          onPress={() => loadMoreReplies(post.id)}
        />
      )}
      {group.joined && post.repliesLive === false && !loadingMoreReplies && (
        <AppButton
          title="REFRESH LATEST REPLIES"
          outline
          onPress={refreshReplies}
        />
      )}
      {post.replies.map(r => (
        <View style={s.card} key={r.id}>
          <Text style={[s.name, s.blue]}>{r.author}</Text>
          <Text style={s.text}>{r.text}</Text>
          {group.shared &&
            group.joined &&
            reportContent &&
            r.authorUid !== userId && (
            <Link
              label={'Report reply by ' + r.author}
              danger
              onPress={() =>
                chooseReportReason({
                  targetType: 'reply',
                  targetId: r.id,
                  postId: post.id,
                  targetAuthor: r.author,
                  contentSnapshot: r.text,
                })
              }
            />
          )}
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
            maxLength={2000}
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
