import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { AboutScreen } from '../features/about/screens/AboutScreen';
import { CreateScreen } from '../features/create/screens/CreateScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { SignUpScreen } from '../features/auth/screens/SignUpScreen';
import { OnboardingScreen } from '../features/onboarding/screens/OnboardingScreen';
import { TutorDetailsScreen } from '../features/tutors/screens/TutorDetailsScreen';
import { TutorSearchScreen } from '../features/tutors/screens/TutorSearchScreen';
import { BookingScreen } from '../features/tutors/screens/BookingScreen';
import { BookingConfirmedScreen } from '../features/tutors/screens/BookingConfirmedScreen';
import { CreateGroupScreen } from '../features/groups/screens/CreateGroupScreen';
import { GroupDetailsScreen } from '../features/groups/screens/GroupDetailsScreen';
import { GroupPostScreen } from '../features/groups/screens/GroupPostScreen';
import { GroupsScreen } from '../features/groups/screens/GroupsScreen';
import { SessionDetailsScreen } from '../features/sessions/screens/SessionDetailsScreen';
import { SessionsScreen } from '../features/sessions/screens/SessionsScreen';
import { StudyRoomScreen } from '../features/sessions/screens/StudyRoomScreen';
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
import {
  directoryTutors,
  knownTutors,
  visibleGroups,
} from '../shared/data/catalog';

import { hasConflict } from '../shared/state/reducer';
import { useCampusSession } from '../shared/state/useCampusSession';
import { s } from '../shared/theme/styles';

const tabs = new Set(['Home', 'Sessions', 'Create', 'Messages', 'Profile']);
export function AppNavigator() {
  const [route, setRoute] = useState({ page: 'Onboarding' });
  const [history, setHistory] = useState([]);
  const { state, saveError, auth, dispatch, signOut, retrySave } =
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
  const go = useCallback(
    next => {
      const target = typeof next === 'string' ? { page: next } : next;
      if (
        !state &&
        !['Onboarding', 'Login', 'Sign Up', 'About'].includes(target.page)
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
  if (route.page === 'Onboarding') {
    return <OnboardingScreen go={go} />;
  }
  if (route.page === 'Login') {
    return <LoginScreen go={go} back={back} auth={auth} />;
  }
  if (route.page === 'Sign Up') {
    return <SignUpScreen go={go} back={back} auth={auth} />;
  }
  if (route.page === 'About' && !state) {
    return <AboutScreen back={back} />;
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
  const group = state.groups.find(x => x.id === route.groupId);
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
      screen = <AboutScreen back={back} />;
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
        <GroupsScreen go={go} back={back} groups={visibleGroups(state)} />
      );

      break;
    case 'Create Group':
      screen = (
        <CreateGroupScreen
          back={back}
          create={(name, subject, meetup, meetupAt) => {
            const id = uid('group');
            dispatch({
              type: 'createGroup',
              group: {
                id,
                name,
                subject,
                members: 1,
                joined: true,
                meetup,
                meetupAt,
                room: 'LOCAL-' + id.slice(-6).toUpperCase(),
                posts: [],
              },
            });
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
              dispatch({ type: 'membership', id: group.id, joined })
            }
            message={groupMessage}
            addPost={text =>
              dispatch({
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
            reply={text =>
              dispatch({
                type: 'reply',
                groupId: group.id,
                postId: post.id,
                reply: { id: uid('reply'), author: state.profile.name, text },
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
              state.groups.some(g => g.id === conversation.groupId && g.joined)
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
      screen = <ProfileScreen go={go} state={state} signOut={signOut} />;
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
    case 'Study Room':
      if (session || group?.joined) {
        screen = (
          <StudyRoomScreen
            key={session?.id ?? group?.id}
            back={back}
            title={session?.subject ?? group.name}
            initialNotes={
              state.roomNotes?.[session?.id ?? group.id] ?? session?.note
            }
            onDraft={text =>
              dispatch({
                type: 'roomDraft',
                id: session?.id ?? group.id,
                text,
              })
            }
            session={!!session}
            finish={(notes, complete) => {
              dispatch({
                type: 'roomDraft',
                id: session?.id ?? group.id,
              });
              if (session) {
                dispatch({
                  type: 'session',
                  id: session.id,
                  changes: {
                    note: notes,
                    ...(complete ? { status: 'Completed' } : {}),
                  },
                });
              } else if (group && notes.trim()) {
                dispatch({
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
      {saveError && (
        <View style={s.banner}>
          <Text style={s.error}>Data has not been saved: {saveError}</Text>
          <Link label="Retry saving" onPress={retrySave} />
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
