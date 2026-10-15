import { bookingNotices } from '../src/features/notifications/data/bookingNotices';
import { groupNotices } from '../src/features/notifications/data/groupNotices';
import { initialState } from '../src/shared/data/utils';
import { reducer } from '../src/shared/state/reducer';

const request = {
  id: 'request-1',
  shared: true,
  tutorId: 'tutor',
  tutorName: 'Taylor',
  studentUid: 'student',
  studentName: 'Jordan',
  subject: 'Calculus',
  remoteStatus: 'pending',
  updatedAt: '2026-10-15T10:00:00.000Z',
};

function receive(state, booking, accountId = state.profile.id) {
  return reducer(state, {
    type: 'syncNotices',
    accountId,
    notices: bookingNotices([booking], accountId),
  });
}

test('real requests produce participant-specific notices and a session deep link', () => {
  expect(bookingNotices([request], 'tutor')[0]).toMatchObject({
    title: 'New session request',
    body: 'Jordan requested a Calculus session. Review it in Sessions.',
    sessionId: 'request-1',
    read: false,
  });
  expect(bookingNotices([request], 'student')[0]).toMatchObject({
    title: 'Session request sent',
    body: 'Your Calculus request was sent to Taylor.',
  });
  expect(bookingNotices([request], 'outsider')).toEqual([]);
  expect(bookingNotices([{ ...request, shared: false }], 'student')).toEqual([]);
  expect(bookingNotices([{ ...request, updatedAt: '' }], 'student')).toEqual([]);
  expect(bookingNotices([{ ...request, remoteStatus: 'unknown' }], 'student')).toEqual([]);
});

test('read state survives repeated snapshots and restored state; a newer status becomes unread', () => {
  let state = receive(initialState({ id: 'student' }), request);
  state = reducer(state, { type: 'read', id: 'shared-booking-request-1' });
  expect(receive(state, request)).toBe(state);
  state = JSON.parse(JSON.stringify(state));
  expect(receive(state, request)).toBe(state);

  state = receive(state, {
    ...request,
    remoteStatus: 'accepted',
    updatedAt: '2026-10-15T10:01:00.000Z',
  });
  expect(state.notices).toHaveLength(1);
  expect(state.notices[0]).toMatchObject({
    title: 'Session confirmed',
    body: 'Taylor accepted your Calculus request.',
    read: false,
  });
  // A delayed listener callback cannot resurrect a superseded request notice.
  expect(receive(state, request)).toBe(state);
  expect(receive(state, request, 'tutor')).toBe(state);
});

test.each([
  ['declined', 'Session request declined'],
  ['cancelled', 'Session cancelled'],
  ['completed', 'Session completed'],
])('the %s outcome is visible to both participants', (remoteStatus, title) => {
  for (const accountId of ['student', 'tutor']) {
    const notices = bookingNotices([{ ...request, remoteStatus }], accountId);
    expect(notices[0].title).toBe(title);
    expect(notices[0].body).toContain('Calculus');
    expect(notices[0].sessionId).toBe('request-1');
  }
});

test('notice storage stays bounded and an old snapshot does not cause repeated saves', () => {
  const bookings = Array.from({ length: 205 }, (_, index) => ({
    ...request,
    id: `request-${index}`,
    updatedAt: new Date(Date.parse(request.updatedAt) + index * 1000).toISOString(),
  }));
  const action = {
    type: 'syncNotices',
    accountId: 'student',
    notices: bookingNotices(bookings, 'student'),
  };
  const state = reducer(initialState({ id: 'student' }), action);
  expect(state.notices).toHaveLength(200);
  expect(state.notices[0].sessionId).toBe('request-204');
  expect(reducer(state, action)).toBe(state);
});

test('group activity notices come only from joined shared groups with acknowledged timestamps', () => {
  const group = {
    id: 'group-1',
    name: 'Exam Review',
    shared: true,
    joined: true,
    updatedAt: request.updatedAt,
  };
  const notices = groupNotices([
    group,
    { ...group, id: 'not-joined', joined: false },
    { ...group, id: 'local', shared: false },
    { ...group, id: 'pending', updatedAt: '' },
  ]);
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({
    title: 'Study group activity',
    groupId: 'group-1',
  });
  let state = reducer(initialState({ id: 'student' }), {
    type: 'syncNotices', accountId: 'student', notices,
  });
  state = reducer(state, { type: 'read', id: notices[0].id });
  expect(reducer(state, {
    type: 'syncNotices', accountId: 'student', notices,
  })).toBe(state);
});
