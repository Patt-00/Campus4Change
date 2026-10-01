import { initialState, tutors } from '../src/shared/data/demo';
import { filterTutors } from '../src/features/tutors/screens/TutorSearchScreen';
import { hasConflict, reducer } from '../src/shared/state/reducer';
import { parseState } from '../src/shared/state/storage';
import type { Session } from '../src/shared/data/types';

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
  let state = initialState(account);
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
  a.groups[0].posts[0].text = 'changed';
  expect(b.groups[0].posts[0].text).not.toBe('changed');
  expect(a.sessions).toHaveLength(0);
  expect(a.conversations).toHaveLength(0);
});
test('search uses names and subjects, combines filters, and handles no results', () => {
  expect(
    filterTutors(tutors, ' mIkA ', false, false, false).map(x => x.id),
  ).toEqual(['mika']);
  expect(filterTutors(tutors, 'Physics', false, true, false)).toHaveLength(0);
  expect(filterTutors(tutors, '', true, true, true).map(x => x.id)).toEqual([
    'jamie',
  ]);
});
test('persisted state round-trips and unknown versions are rejected', () => {
  const state = initialState(account);
  expect(parseState(JSON.stringify(state))).toEqual(state);
  expect(() => parseState(JSON.stringify({ ...state, version: 99 }))).toThrow(
    'not compatible',
  );
  expect(() => parseState('{}')).toThrow();
});
