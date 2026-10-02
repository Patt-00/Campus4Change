export function reducer(state, action) {
  switch (action.type) {
    case 'profile':
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case 'book': {
      if (hasConflict(state, action.session.startsAt)) {
        return state;
      }
      return {
        ...state,
        sessions: [action.session, ...state.sessions],
        notices: [
          {
            id: 'booking-' + action.session.id,
            title: 'Session booked',
            body: action.session.subject + ' was added to your schedule.',
            sessionId: action.session.id,
            read: false,
          },
          ...state.notices,
        ],
      };
    }
    case 'session': {
      const current = state.sessions.find(x => x.id === action.id);
      if (!current) {
        return state;
      }
      if (
        action.changes.startsAt &&
        (current.status !== 'Upcoming' ||
          hasConflict(state, action.changes.startsAt, current.id))
      ) {
        return state;
      }
      if (
        action.changes.rating !== undefined &&
        (current.status !== 'Completed' ||
          !Number.isInteger(action.changes.rating) ||
          action.changes.rating < 1 ||
          action.changes.rating > 5)
      ) {
        return state;
      }
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.id ? { ...s, ...action.changes } : s,
        ),
      };
    }
    case 'createGroup':
      return { ...state, groups: [action.group, ...state.groups] };
    case 'membership':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.id && g.joined !== action.joined
            ? {
                ...g,
                joined: action.joined,
                members: Math.max(0, g.members + (action.joined ? 1 : -1)),
              }
            : g,
        ),
      };
    case 'post':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId && g.joined
            ? { ...g, posts: [action.post, ...g.posts] }
            : g,
        ),
      };
    case 'reply':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId && g.joined
            ? {
                ...g,
                posts: g.posts.map(p =>
                  p.id === action.postId
                    ? { ...p, replies: [...p.replies, action.reply] }
                    : p,
                ),
              }
            : g,
        ),
      };
    case 'conversation':
      return state.conversations.some(c => c.id === action.conversation.id)
        ? state
        : {
            ...state,
            conversations: [action.conversation, ...state.conversations],
          };
    case 'message': {
      const current = state.conversations.find(x => x.id === action.id);
      if (
        !action.message.text.trim() ||
        (current?.groupId &&
          !state.groups.some(g => g.id === current.groupId && g.joined))
      ) {
        return state;
      }
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.id
            ? { ...c, messages: [...c.messages, action.message] }
            : c,
        ),
      };
    }
    case 'roomDraft': {
      const notes = { ...state.roomNotes };
      if (action.text === undefined) {
        delete notes[action.id];
      } else {
        notes[action.id] = action.text;
      }
      return {
        ...state,
        roomNotes: notes,
      };
    }
    case 'read':
      return {
        ...state,
        notices: state.notices.map(n =>
          !action.id || n.id === action.id ? { ...n, read: true } : n,
        ),
      };
  }
}

export function hasConflict(state, startsAt, exceptId) {
  const start = new Date(startsAt).getTime();
  return state.sessions.some(
    s =>
      s.id !== exceptId &&
      s.status === 'Upcoming' &&
      start < new Date(s.startsAt).getTime() + 3600000 &&
      new Date(s.startsAt).getTime() < start + 3600000,
  );
}
