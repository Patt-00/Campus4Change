import { tutors } from './demo';
import type { CampusState, Tutor } from './types';

// Keep historical tutor IDs resolvable when opening an older saved booking.
export function knownTutors(state: CampusState): Tutor[] {
  const p = state.profile;
  return [
    ...tutors.map(t => ({ ...t, sample: true })),
    ...(p.tutorSubjects.length
      ? [
          {
            id: 'local-' + p.id,
            name: p.name,
            course: p.course,
            year: p.year,
            subjects: p.tutorSubjects,
            rating: 0,
            sessions: 0,
            response: 0,
            available: true,
            availability: 'Your listing',
            about: p.bio,
            own: true,
          },
        ]
      : []),
  ];
}
export function directoryTutors(state: CampusState) {
  return knownTutors(state).filter(t => state.profile.id === 'demo' || t.own);
}
export function visibleGroups(state: CampusState) {
  if (state.profile.id === 'demo') {
    return state.groups;
  }
  return state.groups.filter(
    g =>
      !['calculus', 'java', 'physics'].includes(g.id) ||
      g.joined ||
      g.posts.some(
        p =>
          !['post-mika', 'post-renzo'].includes(p.id) || p.replies.length > 0,
      ) ||
      state.conversations.some(
        c => c.groupId === g.id && c.messages.some(m => m.mine),
      ),
  );
}
