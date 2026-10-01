import { initialState, tutors } from '../src/shared/data/demo';
import { filterTutors } from '../src/features/tutors/data/search';
import { hasConflict, reducer } from '../src/shared/state/reducer';
import { parseState } from '../src/shared/state/storage';
import type { Session } from '../src/shared/data/types';
import {
  directoryTutors,
  knownTutors,
  visibleGroups,
} from '../src/shared/data/catalog';
import { parseMeetup } from '../src/features/groups/data/meetup';

const account = {
  id: 'student',
  name: 'Student',
  email: 's@school.edu',
  studentId: '123',
};
const booking: Session = {
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
  let state = initialState({ ...account, id: 'demo' });
  state.groups[0].joined = false;
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
  expect(state.groups[0].posts).toHaveLength(2);
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
test('new accounts have no demo bookings or messages and start with independent data', () => {
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
  expect(
    filterTutors(tutors, ' mIkA ', '', false, false).map(x => x.id),
  ).toEqual(['mika']);
  expect(filterTutors(tutors, 'Physics', '', true, false)).toHaveLength(0);
  expect(
    filterTutors(tutors, '', 'Calculus I', true, true).map(x => x.id),
  ).toEqual(['jamie']);
});
test('sample data stays in the demo directory while historical IDs and used groups remain available', () => {
  const state = initialState(account);
  expect(directoryTutors(state)).toEqual([]);
  expect(knownTutors(state).find(t => t.id === 'mika')?.name).toBe(
    'Mika Santos',
  );
  const demoState = initialState({ ...account, id: 'demo' });
  expect(directoryTutors(demoState)).toHaveLength(3);
  state.groups = demoState.groups.map(g => ({ ...g, joined: false }));
  expect(visibleGroups(state)).toEqual([]);
  state.groups[0].joined = true;
  state.groups[1].posts.push({
    id: 'my-note',
    author: 'Student',
    text: 'Saved work',
    createdAt: booking.startsAt,
    replies: [],
  });
  expect(visibleGroups(state).map(g => g.id)).toEqual(['calculus', 'java']);
  expect(state.groups).toHaveLength(3);
  state.profile.tutorSubjects = ['Nursing'];
  expect(directoryTutors(state).map(t => t.subjects)).toEqual([['Nursing']]);
  expect(directoryTutors(state)[0].response).toBe(0);
});
test('meetup dates reject nonexistent dates and invalid times, and old saved groups need no invented schedule', () => {
  expect(parseMeetup('2030-02-30', '16:00')).toBeUndefined();
  expect(parseMeetup('2030-04-20', '25:00')).toBeUndefined();
  expect(parseMeetup('2030-04-20', '16:60')).toBeUndefined();
  expect(parseMeetup('2030-04-20', '')).toBeUndefined();
  const date = new Date(parseMeetup('2030-04-20', '16:30')!);
  expect(date.getDate()).toBe(20);
  expect(date.getHours()).toBe(16);
  expect(date.getMinutes()).toBe(30);
  const state = initialState({ ...account, id: 'demo' });
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
