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
import { GroupReportsScreen } from '../features/groups/screens/GroupReportsScreen';
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
import { canRescheduleSession } from '../features/sessions/data/status';
import { AppButton } from '../shared/components/AppButton';
import { Empty, Link } from '../shared/components/UI';
import { RouteTransition } from '../shared/components/RouteTransition';
import { Screen } from '../shared/components/Screen';
import { uid } from '../shared/data/utils';
import { useSharedGroups } from '../features/groups/hooks/useSharedGroups';
import { useSharedGroupReports } from '../features/groups/hooks/useSharedGroupReports';
import { useSharedTutors } from '../features/tutors/hooks/useSharedTutors';
import { useSharedMessages } from '../features/messages/hooks/useSharedMessages';
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
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const routeKey = JSON.stringify(route);
  const renderTransition = children => (
    <RouteTransition key={routeKey} direction={transitionDirection}>
      {children}
    </RouteTransition>
  );
  const {
    state,
    saveError,
    cloudSyncPending,
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
        setTransitionDirection('forward');
        setRoute({ page: 'Home' });
      },
      onSignedOut: () => {
        setHistory([]);
        setTransitionDirection('forward');
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
  const sharedTutors = useSharedTutors({
    uid: syncUid,
    enabled: Boolean(syncUid),
    profile: state?.profile,
  });
  const sharedMessages = useSharedMessages({
    uid: syncUid,
    groups: groupDirectory,
    bookings: sharedTutors.bookings,
    activeConversationId:
      route.page === 'Chat' ? route.conversationId : null,
    senderName: state?.profile?.name,
  });
  const reportGroup = groupDirectory.find(group => group.id === route.groupId);
  const groupReports = useSharedGroupReports({
    uid: syncUid,
    groupId: route.groupId,
    enabled: Boolean(
      route.page === 'Group Reports' &&
        reportGroup?.shared &&
        reportGroup?.isOwner,
    ),
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
      setTransitionDirection(tabs.has(target.page) ? 'tab' : 'forward');
      setHistory(prev => (tabs.has(target.page) ? [] : [...prev, route]));
      setRoute(target);
    },
    [route, state],
  );
  const back = useCallback(() => {
    setTransitionDirection('backward');
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
    return renderTransition(<OnboardingScreen go={go} />);
  }
  if (route.page === 'Introduction') {
    return renderTransition(<IntroductionScreen go={go} back={back} />);
  }
  if (route.page === 'Login') {
    return renderTransition(<LoginScreen go={go} back={back} auth={auth} />);
  }
  if (route.page === 'Sign Up') {
    return renderTransition(<SignUpScreen go={go} back={back} auth={auth} />);
  }
  if (route.page === 'About' && !state) {
    return renderTransition(
      <AboutScreen back={back} firebaseConfigured={auth.firebaseConfigured} />,
    );
  }
  if (!state) {
    return renderTransition(<OnboardingScreen go={go} />);
  }
  const ownId = 'local-' + state.profile.id;
  const list = syncUid ? sharedTutors.tutors : knownTutors(state);
  const directory = syncUid ? sharedTutors.tutors : directoryTutors(state);
  const sharedBookings = syncUid ? sharedTutors.bookings : [];
  const sharedBookingIds = new Set(sharedBookings.map(item => item.id));
  const sessions = [
    ...sharedBookings,
    ...state.sessions.filter(item => !sharedBookingIds.has(item.id)),
  ];
  const appState = { ...state, sessions };
  const tutor = list.find(t => t.id === route.tutorId);
  const session = sessions.find(x => x.id === route.sessionId);
  const sessionTutor =
    list.find(x => x.id === session?.tutorId) ||
    (session
      ? {
          id: session.tutorId,
          name: session.tutorName || 'Campus tutor',
          course: '',
          subjects: [session.subject],
          about: 'This tutor profile is no longer listed.',
          shared: Boolean(session.shared),
        }
      : null);
  const group = reportGroup;
  const post = group?.posts.find(x => x.id === route.postId);
  const conversation =
    sharedMessages.conversations.find(x => x.id === route.conversationId) ||
    state.conversations.find(x => x.id === route.conversationId);
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
    if (syncUid && group.shared) {
      const sharedConversation = sharedMessages.conversations.find(
        candidate => candidate.groupId === group.id,
      );
      if (sharedConversation) {
        go({ page: 'Chat', conversationId: sharedConversation.id });
      }
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
        <HomeScreen go={go} state={appState} directory={directory} tutors={list} />
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
          sharedAccount={sessionType === 'firebase'}
          emailVerified={emailVerified}
          loading={sharedTutors.loading}
          error={sharedTutors.error}
          retry={sharedTutors.retry}
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
            message={tutor.shared ? undefined : message}
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
              if (session && !canRescheduleSession(session)) {
                return 'Only upcoming sessions can be rescheduled.';
              }
              if (hasConflict({ sessions }, startsAt, session?.id)) {
                return 'You already have a session during this time. Choose another slot.';
              }
              if (tutor.shared) {
                return sharedTutors
                  .requestSession(tutor, subject, startsAt, note)
                  .then(result => {
                    if (result?.error) {
                      return result.error;
                    }
                    go({ page: 'Booking Confirmed', booking: result });
                    return undefined;
                  });
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
      if (session || route.booking) {
        screen = (
          <BookingConfirmedScreen
            go={go}
            session={session || route.booking}
            tutor={
              route.booking
                ? list.find(item => item.id === route.booking.tutorId) || {
                    id: route.booking.tutorId,
                    name: route.booking.tutorName || 'Campus tutor',
                  }
                : sessionTutor
            }
          />
        );
      }
      break;
    case 'Sessions':
      screen = (
        <SessionsScreen
          go={go}
          back={back}
          key={route.filter || 'Upcoming'}
          initialFilter={route.filter || 'Upcoming'}
          sessions={sessions}
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
              session.shared
                ? sharedTutors.updateRequest(session.id, 'cancel')
                : dispatch({
                    type: 'session',
                    id: session.id,
                    changes: { status: 'Cancelled' },
                  })
            }
            respond={action => {
              if (
                action === 'accept' &&
                hasConflict({ sessions }, session.startsAt, session.id)
              ) {
                return {
                  error:
                    'This request overlaps another pending or accepted session. Resolve the other request first.',
                };
              }
              return sharedTutors.updateRequest(session.id, action);
            }}
            privateNotes={state.roomNotes?.[session.id] ?? ''}
            message={
              session.shared
                ? () => {
                    const sharedConversation = sharedMessages.conversations.find(
                      candidate => candidate.bookingId === session.id,
                    );
                    if (sharedConversation) {
                      go({
                        page: 'Chat',
                        conversationId: sharedConversation.id,
                      });
                    }
                  }
                : () => message(sessionTutor)
            }
            rate={rating =>
              dispatch({ type: 'session', id: session.id, changes: { rating } })
            }
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
            userId={state.profile.id}
            reportContent={report =>
              dispatchGroupChange({
                type: 'report',
                groupId: group.id,
                report: { ...report, id: uid('report') },
              })
            }
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
    case 'Group Reports':
      if (group?.shared && group.isOwner) {
        screen = (
          <GroupReportsScreen
            back={back}
            group={group}
            reports={groupReports.reports}
            error={groupReports.error}
            loadingReports={groupReports.loadingReports}
            hasMoreReports={groupReports.hasMoreReports}
            reportsLive={groupReports.reportsLive}
            loadingMoreReports={groupReports.loadingMoreReports}
            loadMoreReports={groupReports.loadMoreReports}
            refreshReports={groupReports.refreshReports}
            moderateReport={(reportId, resolution) =>
              dispatchGroupChange({
                type: 'moderateReport',
                groupId: group.id,
                reportId,
                resolution,
              })
            }
          />
        );
      }
      break;
    case 'Messages':
      screen = (
        <MessagesScreen
          go={go}
          conversations={[...sharedMessages.conversations, ...state.conversations]}
          sharedAccount={sessionType === 'firebase'}
          emailVerified={emailVerified}
        />
      );
      break;
    case 'Chat':
      if (conversation) {
        const isSharedChat = conversation.delivery === 'shared';
        screen = (
          <ChatScreen
            key={conversation.id}
            back={back}
            conversation={
              isSharedChat
                ? { ...conversation, messages: sharedMessages.messages }
                : conversation
            }
            cloudSynced={sessionType === 'firebase'}
            canSend={
              isSharedChat
                ? conversation.canSend
                : !conversation.groupId ||
                  groupDirectory.some(
                    g => g.id === conversation.groupId && g.joined,
                  )
            }
            loading={isSharedChat && sharedMessages.loading}
            loadError={isSharedChat ? sharedMessages.error : ''}
            retry={isSharedChat ? sharedMessages.retry : undefined}
            hasMoreMessages={isSharedChat && sharedMessages.hasMoreMessages}
            loadingOlderMessages={isSharedChat && sharedMessages.loadingOlderMessages}
            loadMoreMessages={
              isSharedChat ? sharedMessages.loadMoreMessages : undefined
            }
            reportMessage={
              isSharedChat && conversation.kind === 'group'
                ? (chatMessage, reason) =>
                    dispatchGroupChange({
                      type: 'report',
                      groupId: conversation.groupId,
                      report: {
                        id: uid('report'),
                        targetType: 'chatMessage',
                        targetId: chatMessage.id,
                        postId: null,
                        targetAuthor: chatMessage.senderName || 'Group member',
                        contentSnapshot: chatMessage.text,
                        reason,
                      },
                    })
                : undefined
            }
            send={
              isSharedChat
                ? sharedMessages.send
                : text =>
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
          state={appState}
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
          firebaseAccount={sessionType === 'firebase'}
          save={profile => dispatch({ type: 'profile', profile })}
        />
      );

      break;
    case 'Be a Tutor':
      screen = (
        <BeTutorScreen
          back={back}
          profile={state.profile}
          sharedAccount={sessionType === 'firebase'}
          canShare={emailVerified}
          save={async profile => {
            if (sessionType === 'firebase') {
              if (!emailVerified) {
                return 'Verify your email before publishing a tutor profile.';
              }
              const result = profile.tutorSubjects.length
                ? await sharedTutors.publishProfile({
                    ...state.profile,
                    tutorSubjects: profile.tutorSubjects,
                    bio: profile.bio,
                  })
                : await sharedTutors.unpublishProfile();
              if (result?.error) {
                return result.error;
              }
            }
            dispatch({ type: 'profile', profile });
            return undefined;
          }}
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
            message={
              session.shared
                ? () => {
                    const sharedConversation = sharedMessages.conversations.find(
                      candidate => candidate.bookingId === session.id,
                    );
                    if (sharedConversation) {
                      go({
                        page: 'Chat',
                        conversationId: sharedConversation.id,
                      });
                    }
                  }
                : () => message(sessionTutor)
            }
            initialNotes={state.roomNotes?.[session.id] ?? session.note}
            onDraft={text =>
              dispatch({ type: 'roomDraft', id: session.id, text })
            }
            save={notes => {
              if (session.shared) {
                dispatch({ type: 'roomDraft', id: session.id, text: notes });
              } else {
                dispatch({ type: 'roomDraft', id: session.id });
                dispatch({
                  type: 'session',
                  id: session.id,
                  changes: { note: notes },
                });
              }
              back();
            }}
            complete={async notes => {
              if (session.shared) {
                dispatch({ type: 'roomDraft', id: session.id, text: notes });
                const result = await sharedTutors.updateRequest(
                  session.id,
                  'complete',
                );
                if (result?.error) {
                  return result;
                }
              } else {
                dispatch({ type: 'roomDraft', id: session.id });
                dispatch({
                  type: 'session',
                  id: session.id,
                  changes: { note: notes, status: 'Completed' },
                });
              }
              back();
              return undefined;
            }}
          />
        );
      }
      break;
    case 'Group Session':
      if (group?.joined) {
        screen = (
          <GroupStudyRoomScreen
            key={group.id}
            back={back}
            group={group}
            shared={group.shared}
            initialNotes={state.roomNotes?.[group.id] ?? ''}
            onDraft={text =>
              dispatch({ type: 'roomDraft', id: group.id, text })
            }
            finish={(notes, publish) => {
              if (!publish) {
                dispatch({
                  type: 'roomDraft',
                  id: group.id,
                  text: notes || undefined,
                });
                return;
              }
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
      {sharedTutors.error && (
        <View style={s.banner}>
          <Text style={s.error}>
            Tutor listings and session requests could not be refreshed: {sharedTutors.error}
          </Text>
          <Link label="Retry tutor data" onPress={sharedTutors.retry} />
        </View>
      )}
      {sharedTutors.actionError && (
        <View style={s.banner}>
          <Text style={s.error}>
            A tutor change was not saved: {sharedTutors.actionError}
          </Text>
        </View>
      )}
      {cloudSyncPending && !saveError && (
        <View style={s.banner}>
          <Text accessibilityRole="status" style={s.muted}>
            Saved on this device. Waiting to sync with Firebase.
          </Text>
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
      {renderTransition(
        screen ?? (
          <Screen title="Not found" back={back}>
            <Empty
              title="This item is unavailable"
              body="Return home and select another item."
            />

            <AppButton title="BACK TO HOME" onPress={() => go('Home')} />
          </Screen>
        ),
      )}
    </View>
  );
}
