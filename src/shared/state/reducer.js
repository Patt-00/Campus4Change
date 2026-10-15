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
            title: 'Session added to schedule',
            body:
              action.session.subject +
              ' was added to your private schedule. The tutor has not been notified.',
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
    case 'sharedGroups':
    {
      const remoteIds = new Set(action.groups.map(group => group.id));
      const groups = [
        ...action.groups.map(group => ({
          ...group,
          posts: [],
          postsLoaded: !group.joined,
        })),
        ...state.groups.filter(group => !remoteIds.has(group.id)),
      ];
      return {
        ...state,
        groups: replayPendingGroupActions(
          groups,
          state.pendingSharedActions ?? [],
        ),
      };
    }
    case 'queueSharedGroupAction': {
      const pending = state.pendingSharedActions ?? [];
      if (pending.some(item => item.id === action.operation.id)) {
        return state;
      }
      return {
        ...state,
        groups: replayPendingGroupActions(state.groups, [action.operation]),
        pendingSharedActions: [...pending, action.operation],
      };
    }
    case 'sharedGroupActionSynced': {
      const pending = state.pendingSharedActions ?? [];
      const operation = pending.find(item => item.id === action.id);
      let groups = state.groups;
      if (operation?.type === 'post') {
        groups = state.groups.map(group =>
          group.id === operation.groupId
            ? {
                ...group,
                posts: group.posts.filter(
                  post => post.id !== operation.post.id,
                ),
              }
            : group,
        );
      } else if (operation?.type === 'reply') {
        groups = state.groups.map(group =>
          group.id === operation.groupId
            ? {
                ...group,
                posts: group.posts.map(post =>
                  post.id === operation.postId
                    ? {
                        ...post,
                        replies: post.replies.filter(
                          reply => reply.id !== operation.reply.id,
                        ),
                      }
                    : post,
                ),
              }
            : group,
        );
      }
      return {
        ...state,
        groups,
        pendingSharedActions: pending.filter(
          item => item.id !== action.id,
        ),
      };
    }
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
        typeof action.message?.text !== 'string' ||
        !action.message.text.trim() ||
        action.message.text.trim().length > 2000 ||
        (current?.groupId &&
          !state.groups.some(g => g.id === current.groupId && g.joined))
      ) {
        return state;
      }
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.id === action.id
            ? {
                ...c,
                messages: [
                  ...(Array.isArray(c.messages)
                    ? c.messages.filter(
                        message =>
                          message &&
                          typeof message === 'object' &&
                          !Array.isArray(message),
                      )
                    : []),
                  action.message,
                ],
              }
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
    case 'syncNotices': {
      if (action.accountId !== state.profile.id) {
        return state;
      }
      const byId = new Map(state.notices.map(notice => [notice.id, notice]));
      for (const notice of action.notices) {
        const previous = byId.get(notice.id);
        if (
          previous?.eventKey === notice.eventKey ||
          previous?.occurredAt > notice.occurredAt
        ) {
          continue;
        }
        byId.set(notice.id, { ...notice, read: false });
      }
      const notices = [...byId.values()]
        .sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0))
        .slice(0, 200);
      if (
        notices.length === state.notices.length &&
        notices.every((notice, index) => notice === state.notices[index])
      ) {
        return state;
      }
      return { ...state, notices };
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

function replayPendingGroupActions(groups, pendingActions) {
  let next = groups;
  for (const action of pendingActions) {
    if (action.type === 'createGroup' && action.group) {
      if (!next.some(group => group.id === action.group.id)) {
        next = [action.group, ...next];
      }
    } else if (action.type === 'membership') {
      next = next.map(group => {
        if (group.id !== action.groupId || group.joined === action.joined) {
          return group;
        }
        return {
          ...group,
          joined: action.joined,
          members: Math.max(0, group.members + (action.joined ? 1 : -1)),
        };
      });
    } else if (action.type === 'post') {
      next = next.map(group => {
        if (
          group.id !== action.groupId ||
          !group.joined ||
          group.posts.some(post => post.id === action.post.id)
        ) {
          return group;
        }
        return { ...group, posts: [action.post, ...group.posts] };
      });
    } else if (action.type === 'reply') {
      next = next.map(group => {
        if (group.id !== action.groupId || !group.joined) {
          return group;
        }
        return {
          ...group,
          posts: group.posts.map(post => {
            if (
              post.id !== action.postId ||
              post.replies.some(reply => reply.id === action.reply.id)
            ) {
              return post;
            }
            return { ...post, replies: [...post.replies, action.reply] };
          }),
        };
      });
    }
  }
  return next;
}

export function hasConflict(state, startsAt, exceptId) {
  const start = new Date(startsAt).getTime();
  return state.sessions.some(
    s =>
      s.id !== exceptId &&
      ['Upcoming', 'Pending'].includes(s.status) &&
      start < new Date(s.startsAt).getTime() + 3600000 &&
      new Date(s.startsAt).getTime() < start + 3600000,
  );
}
