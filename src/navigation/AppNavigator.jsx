import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { AboutScreen } from '../features/about/screens/AboutScreen';
import { CreateScreen } from '../features/create/screens/CreateScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { IntroductionScreen } from '../features/onboarding/screens/IntroductionScreen';
import { TutorDetailsScreen } from '../features/tutors/screens/TutorDetailsScreen';
import { TutorSearchScreen } from '../features/tutors/screens/TutorSearchScreen';
import { BookingScreen } from '../features/tutors/screens/BookingScreen';
import { BookingConfirmedScreen } from '../features/tutors/screens/BookingConfirmedScreen';
import { CreateGroupScreen } from '../features/groups/screens/CreateGroupScreen';
import { GroupDetailsScreen } from '../features/groups/screens/GroupDetailsScreen';
import { GroupPostScreen } from '../features/groups/screens/GroupPostScreen';
import { GroupStudyRoomScreen } from '../features/groups/screens/GroupStudyRoomScreen';
import { GroupsScreen } from '../features/groups/screens/GroupsScreen';
import { SessionDetailsScreen } from '../features/sessions/screens/SessionDetailsScreen';
import { SessionWorkspaceScreen } from '../features/sessions/screens/SessionWorkspaceScreen';
import { SessionsScreen } from '../features/sessions/screens/SessionsScreen';
import { ChatScreen } from '../features/messages/screens/ChatScreen';
import { MessagesScreen } from '../features/messages/screens/MessagesScreen';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { BeTutorScreen } from '../features/profile/screens/BeTutorScreen';
import { EditProfileScreen } from '../features/profile/screens/EditProfileScreen';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { AppButton } from '../shared/components/AppButton';
import { Empty, Link } from '../shared/components/UI';
import { Screen } from '../shared/components/Screen';
import { uid } from '../shared/data/demo';
import { useSharedGroups } from '../features/groups/hooks/useSharedGroups';
import {
  directoryTutors,
  knownTutors,
  visibleGroups,
} from '../shared/data/catalog';

import { hasConflict } from '../shared/state/reducer';
import { useCampusSession } from '../shared/state/useCampusSession';
import { s } from '../shared/theme/styles';

const tabs = new Set(['Home', 'Sessions', 'Create', 'Messages', 'Profile']);
const restoreStyles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: 16 },
});

export function AppNavigator() {
  const [route, setRoute] = useState({ page: 'Onboarding' });
  const [history, setHistory] = useState([]);
  const {
    state,
    saveError,
    auth,
    dispatch,
    signOut,
    retrySave,
    restoring,
    sessionType,
    emailVerified,
    emailVerificationMessage,
  } =
    useCampusSession({
      onSignedIn: () => {
        setHistory([]);
        setRoute({ page: 'Home' });
      },
      onSignedOut: () => {
        setHistory([]);
        setRoute({ page: 'Login' });
      },
    });
  const syncUid =
    sessionType === 'firebase' && emailVerified ? state?.profile?.id : null;
  const activeGroupId =
    route.page === 'Group Details' || route.page === 'Group Post'
      ? route.groupId
      : null;
  const activePostId = route.page === 'Group Post' ? route.postId : null;
  const {
    groups: groupDirectory,
    error: sharedGroupsError,
    retry: retrySharedGroups,
    hasMoreGroups: hasMoreSharedGroups,
    groupsLive: sharedGroupsLive,
    loadingMoreGroups,
    loadMoreGroups,
    actionError: groupActionError,
    retryActions: retryGroupActions,
    contentError: groupContentError,
    retryContent: retryGroupContent,
    hasMorePosts: hasMoreGroupPosts,
    postsLive: groupPostsLive,
    loadingMorePosts,
    loadMorePosts,
    loadingReplyIds,
    loadMoreReplies,
    queueGroupCreation,
    dispatchGroupChange,
  } = useSharedGroups({
    uid: syncUid,
    enabled: Boolean(syncUid),
    state,
    dispatch,
    activeGroupId,
    activePostId,
  });
  const go = useCallback(
    next => {
      const target = typeof next === 'string' ? { page: next } : next;
      if (
        !state &&
        !['Onboarding', 'Introduction', 'Login', 'Sign Up', 'About'].includes(target.page)
      ) {
        return;
      }
      if (
        target.page === route.page &&
        JSON.stringify(target) === JSON.stringify(route)
      ) {
        return;
      }
      setHistory(prev => (tabs.has(target.page) ? [] : [...prev, route]));
      setRoute(target);
    },
    [route, state],
  );
  const back = useCallback(() => {
    if (history.length) {
      setRoute(history[history.length - 1]);
      setHistory(history.slice(0, -1));
    } else {
      setRoute({ page: state ? 'Home' : 'Onboarding' });
    }
  }, [history, state]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (
        !history.length &&
        (route.page === 'Home' || route.page === 'Onboarding')
      ) {
        return false;
      }
      back();
      return true;
    });
    return () => listener.remove();
  }, [back, history.length, route.page]);
  if (restoring) {
    return (
      <Screen title="Campus4Change">
        <View style={restoreStyles.content}>
          <ActivityIndicator color="#52d6e8" size="large" />
          <Text style={[s.muted, s.center, restoreStyles.message]}>
            Restoring your account...
          </Text>
        </View>
      </Screen>
    );
  }
  if (route.page === 'Onboarding') {
    return <OnboardingScreen go={go} />;
  }
  if (route.page === 'Introduction') {
    return <IntroductionScreen go={go} back={back} />;
  }
  if (route.page === 'Login') {
    return <LoginScreen go={go} back={back} auth={auth} />;
  }
  if (route.page === 'Sign Up') {
    return <SignUpScreen go={go} back={back} auth={auth} />;
  }
  if (route.page === 'About' && !state) {
    return <AboutScreen back={back} firebaseConfigured={auth.firebaseConfigured} />;
  }
  if (!state) {
    return <OnboardingScreen go={go} />;
  }
  const ownId = 'local-' + state.profile.id;
  const list = knownTutors(state);
  const directory = directoryTutors(state);
  const tutor = list.find(t => t.id === route.tutorId);
  const session = state.sessions.find(x => x.id === route.sessionId);
  const sessionTutor = list.find(x => x.id === session?.tutorId);
  const group = groupDirectory.find(x => x.id === route.groupId);
  const post = group?.posts.find(x => x.id === route.postId);
  const conversation = state.conversations.find(
    x => x.id === route.conversationId,
  );
  function message(t) {
    const id = 'chat-' + t.id;
    dispatch({
      type: 'conversation',
      conversation: { id, name: t.name, tutorId: t.id, messages: [] },
    });
    go({ page: 'Chat', conversationId: id });
  }
  function groupMessage() {
    if (!group?.joined) {
      return;
    }
    const id = 'chat-' + group.id;
    dispatch({
      type: 'conversation',
      conversation: { id, name: group.name, groupId: group.id, messages: [] },
    });
    go({ page: 'Chat', conversationId: id });
  }
  let screen;
  switch (route.page) {
    case 'About':
      screen = (
        <AboutScreen
          back={back}
          firebaseConfigured={auth.firebaseConfigured}
          cloudSession={sessionType === 'firebase'}
        />
      );
      break;
    case 'Home':
      screen = (
        <HomeScreen go={go} state={state} directory={directory} tutors={list} />
      );

      break;
    case 'Tutor Search':
      screen = (
        <TutorSearchScreen
          key={route.query ?? ''}
          go={go}
          back={back}
          list={directory}
          initialQuery={route.query}
        />
      );

      break;
    case 'Tutor Details':
      if (tutor) {
        screen = (
          <TutorDetailsScreen
            go={go}
            back={back}
            tutor={tutor}
            message={message}
          />
        );
      }
      break;
    case 'Book Session':
      if (tutor) {
        screen = (
          <BookingScreen
            key={session?.id ?? tutor.id}
            back={back}
            tutor={tutor}
            session={session}
            initialSlot={route.slot}
            onSave={(subject, startsAt, note) => {
              if (tutor.id === ownId) {
                return 'Choose another tutor. You cannot book yourself.';
              }
              if (session && session.status !== 'Upcoming') {
                return 'Only upcoming sessions can be rescheduled.';
              }
              if (hasConflict(state, startsAt, session?.id)) {
                return 'You already have a session during this time. Choose another slot.';
              }
              if (session) {
                dispatch({
                  type: 'session',
                  id: session.id,
                  changes: { startsAt, note },
                });
                back();
              } else {
                const id = uid('session');
                dispatch({
                  type: 'book',
                  session: {
                    id,
                    tutorId: tutor.id,
                    subject,
                    startsAt,
                    note,
                    status: 'Upcoming',
                  },
                });
                go({ page: 'Booking Confirmed', sessionId: id });
              }
              return undefined;
            }}
          />
        );
      }
      break;
    case 'Booking Confirmed':
      if (session && sessionTutor) {
        screen = (
          <BookingConfirmedScreen
            go={go}
            session={session}
            tutor={sessionTutor}
          />
        );
      }
      break;
    case 'Sessions':
      screen = (
        <SessionsScreen
          go={go}
          back={back}
          sessions={state.sessions}
          list={list}
        />
      );

      break;
    case 'Session Details':
      if (session && sessionTutor) {
        screen = (
          <SessionDetailsScreen
            go={go}
            back={back}
            session={session}
            tutor={sessionTutor}
            cancel={() =>
              dispatch({
                type: 'session',
                id: session.id,
                changes: { status: 'Cancelled' },
              })
            }
            rate={rating =>
              dispatch({ type: 'session', id: session.id, changes: { rating } })
            }
            message={() => message(sessionTutor)}
          />
        );
      }
      break;
    case 'Study Groups':
      screen = (
        <GroupsScreen
          go={go}
          back={back}
          groups={visibleGroups({ ...state, groups: groupDirectory })}
          hasMoreGroups={hasMoreSharedGroups}
          groupsLive={sharedGroupsLive}
          loadingMoreGroups={loadingMoreGroups}
          loadMoreGroups={loadMoreGroups}
          refreshGroups={retrySharedGroups}
        />
      );

      break;
    case 'Create Group':
      screen = (
        <CreateGroupScreen
          back={back}
          sharingEnabled={Boolean(syncUid)}
          create={(name, subject, meetup, meetupAt) => {
            const id = uid('group');
            const sharedGroup = Boolean(syncUid);
            const nextGroup = {
              id,
              name,
              subject,
              members: 1,
              joined: true,
              meetup,
              meetupAt,
              room: 'C4C-' + id.slice(-6).toUpperCase(),
              posts: [],
              postsLoaded: true,
              shared: sharedGroup,
              ownerUid: sharedGroup ? syncUid : undefined,
              isOwner: sharedGroup,
            };
            dispatch({
              type: 'createGroup',
              group: nextGroup,
            });
            queueGroupCreation(nextGroup);
            go({ page: 'Group Details', groupId: id });
          }}
        />
      );

      break;
    case 'Group Details':
      if (group) {
        screen = (
          <GroupDetailsScreen
            go={go}
            back={back}
            group={group}
            membership={joined =>
              dispatchGroupChange({
                type: 'membership',
                id: group.id,
                joined,
              })
            }
            message={groupMessage}
            hasMorePosts={hasMoreGroupPosts}
            postsLive={groupPostsLive}
            loadingMorePosts={loadingMorePosts}
            loadMorePosts={loadMorePosts}
            refreshPosts={retryGroupContent}
            addPost={text =>
              dispatchGroupChange({
                type: 'post',
                groupId: group.id,
                post: {
                  id: uid('post'),
                  author: state.profile.name,
                  text,
                  createdAt: new Date().toISOString(),
                  replies: [],
                },
              })
            }
          />
        );
      }
      break;
    case 'Group Post':
      if (group && post) {
        screen = (
          <GroupPostScreen
            key={post.id}
            back={back}
            group={group}
            post={post}
            loadingMoreReplies={loadingReplyIds.has(post.id)}
            loadMoreReplies={loadMoreReplies}
            refreshReplies={retryGroupContent}
            reply={text =>
              dispatchGroupChange({
                type: 'reply',
                groupId: group.id,
                postId: post.id,
                reply: {
                  id: uid('reply'),
                  author: state.profile.name,
                  text,
                  createdAt: new Date().toISOString(),
                },
              })
            }
          />
        );
      }
      break;
    case 'Messages':
      screen = <MessagesScreen go={go} conversations={state.conversations} />;
      break;
    case 'Chat':
      if (conversation) {
        screen = (
          <ChatScreen
            key={conversation.id}
            back={back}
            conversation={conversation}
            canSend={
              !conversation.groupId ||
              groupDirectory.some(g => g.id === conversation.groupId && g.joined)
            }
            send={text =>
              dispatch({
                type: 'message',
                id: conversation.id,
                message: {
                  id: uid('message'),
                  text,
                  mine: true,
                  sentAt: new Date().toISOString(),
                },
              })
            }
          />
        );
      }
      break;
    case 'Notifications':
      screen = (
        <NotificationsScreen
          go={go}
          back={back}
          notices={state.notices}
          read={id => dispatch({ type: 'read', id })}
        />
      );

      break;
    case 'Profile':
      screen = (
        <ProfileScreen
          go={go}
          state={state}
          signOut={signOut}
          sessionType={sessionType}
          firebaseConfigured={auth.firebaseConfigured}
          enableBiometrics={auth.enableBiometrics}
        />
      );
      break;
    case 'Edit Profile':
    case 'Preferences':
      screen = (
        <EditProfileScreen
          key={route.page}
          back={back}
          profile={state.profile}
          preferences={route.page === 'Preferences'}
          save={profile => dispatch({ type: 'profile', profile })}
        />
      );

      break;
    case 'Be a Tutor':
      screen = (
        <BeTutorScreen
          back={back}
          profile={state.profile}
          save={profile => dispatch({ type: 'profile', profile })}
        />
      );

      break;
    case 'Create':
      screen = <CreateScreen go={go} />;
      break;
    case 'Session Workspace':
      if (session && sessionTutor) {
        screen = (
          <SessionWorkspaceScreen
            key={session.id}
            back={back}
            session={session}
            tutor={sessionTutor}
            message={() => message(sessionTutor)}
            initialNotes={state.roomNotes?.[session.id] ?? session.note}
            onDraft={text =>
              dispatch({ type: 'roomDraft', id: session.id, text })
            }
            save={notes => {
              dispatch({ type: 'roomDraft', id: session.id });
              dispatch({
                type: 'session',
                id: session.id,
                changes: { note: notes },
              });
              back();
            }}
            complete={notes => {
              dispatch({ type: 'roomDraft', id: session.id });
              dispatch({
                type: 'session',
                id: session.id,
                changes: { note: notes, status: 'Completed' },
              });
              back();
            }}
          />
        );
      }
      break;
    case 'Group Study Room':
      if (group?.joined) {
        screen = (
          <GroupStudyRoomScreen
            key={group.id}
            back={back}
            title={group.name}
            initialNotes={state.roomNotes?.[group.id] ?? ''}
            onDraft={text =>
              dispatch({ type: 'roomDraft', id: group.id, text })
            }
            finish={notes => {
              dispatch({ type: 'roomDraft', id: group.id });
              if (notes.trim()) {
                dispatchGroupChange({
                  type: 'post',
                  groupId: group.id,
                  post: {
                    id: uid('post'),
                    author: state.profile.name,
                    text: notes.trim(),
                    createdAt: new Date().toISOString(),
                    replies: [],
                  },
                });
              }
            }}
          />
        );
      }
      break;
  }
  return (
    <View style={s.grow}>
      {sessionType === 'firebase' && !emailVerified && (
          <View style={s.banner}>
            <Text style={emailVerified ? s.muted : s.error}>
              {emailVerificationMessage ||
                `Verify ${state?.profile?.email || 'your school email'} to access shared study groups.`}
            </Text>
            {!emailVerified && (
              <>
                <Link
                  label="Resend verification email"
                  onPress={auth.resendEmailVerification}
                />
                <Link
                  label="I've verified — check again"
                  onPress={auth.refreshEmailVerification}
                />
              </>
            )}
          </View>
        )}
      {sharedGroupsError && (
        <View style={s.banner}>
          <Text style={s.error}>Study groups could not be refreshed: {sharedGroupsError}</Text>
          <Link label="Retry groups" onPress={retrySharedGroups} />
        </View>
      )}
      {groupActionError && (
        <View style={s.banner}>
          <Text style={s.error}>A group change has not synced: {groupActionError}</Text>
          <Link
            label="Retry group changes"
            onPress={retryGroupActions}
          />
        </View>
      )}
      {groupContentError && (
        <View style={s.banner}>
          <Text style={s.error}>Group posts could not be loaded: {groupContentError}</Text>
          <Link label="Retry posts" onPress={retryGroupContent} />
        </View>
      )}
      {saveError && (
        <View style={s.banner}>
          <Text style={s.error}>
            {sessionType === 'firebase' ? 'Some changes are not synced' : 'Data has not been saved'}: {saveError}
          </Text>
          <Link
            label={sessionType === 'firebase' ? 'Retry sync' : 'Retry saving'}
            onPress={retrySave}
          />
        </View>
      )}
      {screen ?? (
        <Screen title="Not found" back={back}>
          <Empty
            title="This item is unavailable"
            body="Return home and select another item."
          />

          <AppButton title="BACK TO HOME" onPress={() => go('Home')} />
        </Screen>
      )}
    </View>
  );
}
