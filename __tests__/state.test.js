import { initialState } from '../src/shared/data/utils';
import { filterTutors } from '../src/features/tutors/data/search';
import { hasConflict, reducer } from '../src/shared/state/reducer';
import { parseState } from '../src/shared/state/storage';

import {
  directoryTutors,
  knownTutors,
  visibleGroups,
} from '../src/shared/data/catalog';
import { parseMeetup } from '../src/features/groups/data/meetup';
import {
  canCompleteSession,
  canRescheduleSession,
  nextSessionTimingBoundary,
  sessionTimingStatus,
} from '../src/features/sessions/data/status';
import { stateForPersistence } from '../src/shared/state/persistence';

const account = {
  id: 'student',
  name: 'Student',
  email: 's@school.edu',
  studentId: '123',
};
const booking = {
  id: 'one',
  tutorId: 'mika',
  subject: 'Physics',
  startsAt: '2027-01-01T14:00:00+08:00',
  status: 'Upcoming',
  note: '',
};
test('booking conflicts include partial overlaps but allow adjacent sessions', () => {
  let state = reducer(initialState(account), {
    type: 'book',
    session: booking,
  });
  expect(hasConflict(state, '2027-01-01T14:30:00+08:00')).toBe(true);
  expect(hasConflict(state, '2027-01-01T13:30:00+08:00')).toBe(true);
  expect(hasConflict(state, '2027-01-01T15:00:00+08:00')).toBe(false);
  expect(state.notices[0]).toMatchObject({
    title: 'Session added to schedule',
    body:
      'Physics was added to your private schedule. The tutor has not been notified.',
  });
  state = reducer(state, { type: 'book', session: { ...booking, id: 'two' } });
  expect(state.sessions).toHaveLength(1);
  expect(state.notices).toHaveLength(1);
  state = reducer(state, {
    type: 'session',
    id: 'one',
    changes: { status: 'Cancelled' },
  });
  expect(hasConflict(state, booking.startsAt)).toBe(false);
});
test('pending shared requests reserve the student time until the tutor responds', () => {
  const startsAt = '2027-01-02T14:00:00.000Z';
  const state = {
    sessions: [
      { id: 'request', status: 'Pending', startsAt },
    ],
  };
  expect(hasConflict(state, '2027-01-02T14:30:00.000Z')).toBe(true);
  expect(hasConflict(state, '2027-01-02T15:00:00.000Z')).toBe(false);
  expect(hasConflict(state, startsAt, 'request')).toBe(false);
});
test('scheduled sessions switch to in-progress and past-due labels without rewriting saved status', () => {
  const session = {
    id: 'timed',
    status: 'Upcoming',
    startsAt: '2026-10-12T10:00:00.000Z',
  };
  expect(sessionTimingStatus(session, Date.parse('2026-10-12T09:59:59Z'))).toBe(
    'Upcoming',
  );
  expect(sessionTimingStatus(session, Date.parse('2026-10-12T10:30:00Z'))).toBe(
    'In progress',
  );
  expect(sessionTimingStatus(session, Date.parse('2026-10-12T11:00:00Z'))).toBe(
    'Past due',
  );
  expect(session.status).toBe('Upcoming');
  expect(sessionTimingStatus({ ...session, status: 'Pending' }, Date.now())).toBe(
    'Pending',
  );
  expect(
    sessionTimingStatus({ ...session, status: 'Completed' }, Date.now()),
  ).toBe('Completed');
});
test('only sessions whose scheduled time is still upcoming can be rescheduled', () => {
  const session = {
    id: 'timed',
    status: 'Upcoming',
    startsAt: '2026-10-12T10:00:00.000Z',
  };
  expect(
    canRescheduleSession(session, Date.parse('2026-10-12T09:00:00.000Z')),
  ).toBe(true);
  expect(
    canRescheduleSession(session, Date.parse('2026-10-12T10:30:00.000Z')),
  ).toBe(false);
  expect(
    canRescheduleSession(session, Date.parse('2026-10-12T11:00:00.000Z')),
  ).toBe(false);
  expect(
    canRescheduleSession(
      { ...session, status: 'Completed' },
      Date.parse('2026-10-12T09:00:00.000Z'),
    ),
  ).toBe(false);
});
test('sessions can be completed only at or after a valid scheduled start', () => {
  const session = {
    id: 'timed',
    status: 'Upcoming',
    startsAt: '2026-10-12T10:00:00.000Z',
  };

  expect(
    canCompleteSession(session, Date.parse('2026-10-12T09:59:59.999Z')),
  ).toBe(false);
  expect(
    canCompleteSession(session, Date.parse('2026-10-12T10:00:00.000Z')),
  ).toBe(true);
  expect(
    canCompleteSession(session, Date.parse('2026-10-12T11:00:00.000Z')),
  ).toBe(true);
  expect(
    canCompleteSession(
      { ...session, status: 'Completed' },
      Date.parse('2026-10-12T11:00:00.000Z'),
    ),
  ).toBe(false);
  expect(
    canCompleteSession(
      { ...session, startsAt: 'invalid' },
      Date.parse('2026-10-12T11:00:00.000Z'),
    ),
  ).toBe(false);
});
test('the session clock schedules status refresh at start and end boundaries', () => {
  const startsAt = Date.parse('2026-10-12T10:00:00.000Z');
  const session = {
    id: 'timed',
    status: 'Upcoming',
    startsAt: new Date(startsAt).toISOString(),
  };

  expect(nextSessionTimingBoundary([session], startsAt - 1000)).toBe(startsAt);
  expect(nextSessionTimingBoundary([session], startsAt)).toBe(
    startsAt + 60 * 60 * 1000,
  );
  expect(nextSessionTimingBoundary([session], startsAt + 60 * 60 * 1000)).toBe(
    null,
  );
  expect(nextSessionTimingBoundary([{ status: 'Pending' }], startsAt)).toBeNull();
});
test.each([undefined, null, '', 'not-a-date'])(
  'upcoming sessions with an invalid start time need review: %s',
  startsAt => {
    const session = { status: 'Upcoming', startsAt };
    const now = Date.parse('2026-10-13T06:00:00.000Z');

    expect(sessionTimingStatus(session, now)).toBe('Needs review');
    expect(canRescheduleSession(session, now)).toBe(false);
  },
);
test('rescheduling cannot overlap another booking, and only completed sessions accept a valid rating', () => {
  let state = reducer(initialState(account), {
    type: 'book',
    session: booking,
  });
  state = reducer(state, {
    type: 'book',
    session: { ...booking, id: 'two', startsAt: '2027-01-01T16:00:00+08:00' },
  });
  state = reducer(state, {
    type: 'session',
    id: 'two',
    changes: { startsAt: booking.startsAt },
  });
  expect(state.sessions[0].startsAt).toBe('2027-01-01T16:00:00+08:00');
  state = reducer(state, {
    type: 'session',
    id: 'one',
    changes: { rating: 5 },
  });
  expect(state.sessions[1].rating).toBeUndefined();
  state = reducer(state, {
    type: 'session',
    id: 'one',
    changes: { status: 'Completed' },
  });
  state = reducer(state, {
    type: 'session',
    id: 'one',
    changes: { rating: 6 },
  });
  expect(state.sessions[1].rating).toBeUndefined();
  state = reducer(state, {
    type: 'session',
    id: 'one',
    changes: { rating: 4 },
  });
  expect(state.sessions[1].rating).toBe(4);
});
test('membership changes are idempotent and nonmembers cannot post or send group messages', () => {
  let state = initialState(account);
  state.groups = [
    {
      id: 'calculus',
      name: 'Calculus Circle',
      subject: 'Calculus',
      members: 1,
      joined: false,
      posts: [
        {
          id: 'existing-post',
          author: 'Another student',
          text: 'Study notes',
          createdAt: booking.startsAt,
          replies: [],
        },
      ],
    },
  ];
  const members = state.groups[0].members;
  state = reducer(state, { type: 'membership', id: 'calculus', joined: true });
  state = reducer(state, { type: 'membership', id: 'calculus', joined: true });
  expect(state.groups[0].members).toBe(members + 1);
  state = reducer(state, { type: 'membership', id: 'calculus', joined: false });
  state = reducer(state, {
    type: 'post',
    groupId: 'calculus',
    post: {
      id: 'blocked',
      author: 'Student',
      text: 'Blocked',
      createdAt: booking.startsAt,
      replies: [],
    },
  });
  expect(state.groups[0].posts).toHaveLength(1);
  state = reducer(state, {
    type: 'conversation',
    conversation: {
      id: 'chat',
      name: 'Group',
      groupId: 'calculus',
      messages: [],
    },
  });
  state = reducer(state, {
    type: 'message',
    id: 'chat',
    message: { id: 'm', text: 'Blocked', mine: true, sentAt: booking.startsAt },
  });
  expect(state.conversations[0].messages).toHaveLength(0);
});
test('private notes reject empty or overlong messages at the state boundary', () => {
  let state = initialState(account);
  state = reducer(state, {
    type: 'conversation',
    conversation: { id: 'chat-tutor', name: 'Tutor', messages: [] },
  });
  state = reducer(state, {
    type: 'message',
    id: 'chat-tutor',
    message: { id: 'empty', text: '   ', mine: true },
  });
  state = reducer(state, {
    type: 'message',
    id: 'chat-tutor',
    message: { id: 'too-long', text: 'x'.repeat(2001), mine: true },
  });
  expect(state.conversations[0].messages).toHaveLength(0);

  state = reducer(state, {
    type: 'message',
    id: 'chat-tutor',
    message: { id: 'allowed', text: 'x'.repeat(2000), mine: true },
  });
  expect(state.conversations[0].messages).toEqual([
    { id: 'allowed', text: 'x'.repeat(2000), mine: true },
  ]);
});
test('shared group updates retain device groups and replay queued offline changes', () => {
  const deviceGroup = {
    id: 'device-group',
    name: 'Device Group',
    subject: 'Writing',
    members: 1,
    joined: true,
    posts: [],
  };
  const pendingGroup = {
    id: 'pending-group',
    name: 'Pending Group',
    subject: 'Math',
    members: 1,
    joined: true,
    posts: [],
    shared: true,
  };
  const remoteGroup = {
    id: 'remote-group',
    name: 'Remote Group',
    subject: 'Physics',
    members: 4,
    joined: false,
    posts: [],
    shared: true,
  };
  const post = {
    id: 'queued-post',
    author: account.name,
    text: 'A note saved while offline.',
    createdAt: booking.startsAt,
    replies: [],
  };
  const reply = {
    id: 'queued-reply',
    author: account.name,
    text: 'A reply saved while offline.',
  };
  let state = initialState(account);
  state.groups = [deviceGroup, pendingGroup];
  state = reducer(state, {
    type: 'queueSharedGroupAction',
    operation: { id: 'create-op', type: 'createGroup', group: pendingGroup },
  });
  state = reducer(state, {
    type: 'queueSharedGroupAction',
    operation: {
      id: 'join-op',
      type: 'membership',
      groupId: remoteGroup.id,
      joined: true,
    },
  });
  state = reducer(state, {
    type: 'queueSharedGroupAction',
    operation: {
      id: 'post-op',
      type: 'post',
      groupId: remoteGroup.id,
      post,
    },
  });
  state = reducer(state, {
    type: 'queueSharedGroupAction',
    operation: {
      id: 'reply-op',
      type: 'reply',
      groupId: remoteGroup.id,
      postId: post.id,
      reply,
    },
  });

  state = reducer(state, { type: 'sharedGroups', groups: [remoteGroup] });
  expect(state.groups.map(group => group.id)).toEqual([
    'remote-group',
    'device-group',
    'pending-group',
  ]);
  expect(state.groups[0].joined).toBe(true);
  expect(state.groups[0].members).toBe(5);
  expect(state.groups[0].posts[0].replies).toEqual([reply]);
});
test('shared directory metadata clears stale feed caches until the live feed loads', () => {
  const cachedPost = {
    id: 'cached-post',
    author: 'Other student',
    text: 'A shared note.',
    createdAt: booking.startsAt,
    replies: [],
  };
  let state = initialState(account);
  state.groups = [
    {
      id: 'remote-group',
      name: 'Remote Group',
      subject: 'Physics',
      members: 2,
      joined: true,
      shared: true,
      postsLoaded: true,
      posts: [cachedPost],
    },
  ];

  state = reducer(state, {
    type: 'sharedGroups',
    groups: [
      {
        id: 'remote-group',
        name: 'Remote Group',
        subject: 'Physics',
        members: 2,
        joined: true,
        shared: true,
        postsLoaded: false,
        posts: [],
      },
    ],
  });
  expect(state.groups[0].posts).toEqual([]);
  expect(state.groups[0].postsLoaded).toBe(false);

  state = reducer(state, {
    type: 'sharedGroups',
    groups: [
      {
        id: 'remote-group',
        name: 'Remote Group',
        subject: 'Physics',
        members: 1,
        joined: false,
        shared: true,
        postsLoaded: true,
        posts: [],
      },
    ],
  });
  expect(state.groups[0].posts).toEqual([]);
  expect(state.groups[0].postsLoaded).toBe(true);
});
test('synced shared posts and replies leave the optimistic cache', () => {
  const post = {
    id: 'shared-post',
    author: account.name,
    text: 'A shared note',
    createdAt: booking.startsAt,
    replies: [],
  };
  const reply = {
    id: 'shared-reply',
    author: account.name,
    text: 'A shared reply',
  };
  let state = initialState(account);
  state.groups = [
    {
      id: 'remote-group',
      shared: true,
      joined: true,
      posts: [],
    },
  ];
  state = reducer(state, {
    type: 'queueSharedGroupAction',
    operation: {
      id: 'post-operation',
      type: 'post',
      groupId: 'remote-group',
      post,
    },
  });
  state = reducer(state, {
    type: 'queueSharedGroupAction',
    operation: {
      id: 'reply-operation',
      type: 'reply',
      groupId: 'remote-group',
      postId: post.id,
      reply,
    },
  });
  expect(state.groups[0].posts[0].replies).toEqual([reply]);

  state = reducer(state, {
    type: 'sharedGroupActionSynced',
    id: 'post-operation',
  });
  state = reducer(state, {
    type: 'sharedGroupActionSynced',
    id: 'reply-operation',
  });

  expect(state.pendingSharedActions).toEqual([]);
  expect(state.groups[0].posts).toEqual([]);
});
test('persisted account state omits shared feed caches but preserves local group content', () => {
  const localPost = {
    id: 'device-post',
    author: account.name,
    text: 'Local note',
    createdAt: booking.startsAt,
    replies: [],
  };
  const sharedPost = { ...localPost, id: 'shared-post' };
  const state = initialState(account);
  state.groups = [
    {
      id: 'shared',
      shared: true,
      joined: true,
      postsLoaded: true,
      posts: [sharedPost],
    },
    {
      id: 'local',
      shared: false,
      joined: true,
      postsLoaded: true,
      posts: [localPost],
    },
  ];

  const saved = stateForPersistence(state);

  expect(saved.groups[0].posts).toEqual([]);
  expect(saved.groups[0].postsLoaded).toBe(false);
  expect(saved.groups[1].posts).toEqual([localPost]);
  expect(state.groups[0].posts).toEqual([sharedPost]);
});
test('new accounts start empty and keep independent local data', () => {
  const a = initialState(account);
  const b = initialState({ ...account, id: 'other' });
  a.profile.interests.push('Nursing');
  expect(b.profile.interests).toEqual([]);
  expect(a.groups).toHaveLength(0);
  expect(a.profile.course).toBe('');
  expect(a.profile.school).toBe('');
  expect(a.profile.year).toBe('');
  expect(a.sessions).toHaveLength(0);
  expect(a.conversations).toHaveLength(0);
});
test('search uses names and subjects, combines filters, and handles no results', () => {
  const tutors = [
    {
      id: 'tutor-1',
      name: 'Mika Student',
      subjects: ['Physics'],
      rating: 4.8,
      available: false,
    },
    {
      id: 'tutor-2',
      name: 'Jamie Student',
      subjects: ['Calculus I'],
      rating: 4.9,
      available: true,
    },
  ];
  expect(
    filterTutors(tutors, ' mIkA ', '', false, false).map(x => x.id),
  ).toEqual(['tutor-1']);
  expect(filterTutors(tutors, 'Physics', '', true, false)).toHaveLength(0);
  expect(
    filterTutors(tutors, '', 'Calculus I', true, true).map(x => x.id),
  ).toEqual(['tutor-2']);
});
test('device-only accounts have no bundled tutor or group listings', () => {
  const state = initialState(account);
  expect(directoryTutors(state)).toEqual([]);
  expect(knownTutors(state)).toEqual([]);
  expect(visibleGroups(state)).toEqual([]);

  const localGroup = {
    id: 'local-group',
    name: 'Student Study Circle',
    subject: 'Writing',
    members: 1,
    joined: true,
    posts: [],
  };
  state.groups.push(localGroup);
  expect(visibleGroups(state)).toEqual([localGroup]);

  state.profile.tutorSubjects = ['Nursing'];
  expect(directoryTutors(state).map(t => t.subjects)).toEqual([['Nursing']]);
  expect(directoryTutors(state)[0].response).toBe(0);
});
test('meetup dates reject nonexistent dates and invalid times, and old saved groups need no invented schedule', () => {
  expect(parseMeetup('2030-02-30', '16:00')).toBeUndefined();
  expect(parseMeetup('2030-04-20', '25:00')).toBeUndefined();
  expect(parseMeetup('2030-04-20', '16:60')).toBeUndefined();
  expect(parseMeetup('2030-04-20', '')).toBeUndefined();
  const date = new Date(parseMeetup('2030-04-20', '16:30'));
  expect(date.getDate()).toBe(20);
  expect(date.getHours()).toBe(16);
  expect(date.getMinutes()).toBe(30);
  const state = initialState(account);
  state.groups.push({ id: 'old-group', name: 'Old Group' });
  delete state.groups[0].meetupAt;
  expect(parseState(JSON.stringify(state)).groups[0].meetupAt).toBeUndefined();
});
test('persisted state round-trips and unknown versions are rejected', () => {
  const state = initialState(account);
  expect(parseState(JSON.stringify(state))).toEqual(state);
  expect(() => parseState(JSON.stringify({ ...state, version: 99 }))).toThrow(
    'not compatible',
  );
  expect(() => parseState('{}')).toThrow();
});
