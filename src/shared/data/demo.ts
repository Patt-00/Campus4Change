import type { Account, CampusState, Tutor } from './types';

export const tutors: Tutor[] = [
  {
    id: 'jamie',
    name: 'Jamie Dela Cruz',
    course: 'BS Computer Science',
    year: '3rd Year',
    subjects: ['Calculus I', 'Algebra', 'Programming'],
    rating: 4.9,
    sessions: 36,
    response: 98,
    available: true,
    availability: 'Available',
    about:
      'I explain concepts using simple examples and step-by-step problem solving. I can help with quizzes, homework, and exam review.',
  },
  {
    id: 'mika',
    name: 'Mika Santos',
    course: 'BS Applied Physics',
    year: '3rd Year',
    subjects: ['Calculus I', 'Physics'],
    rating: 4.8,
    sessions: 24,
    response: 96,
    available: false,
    availability: 'Sample schedule',
    about:
      'Let’s make physics and calculus easier with diagrams, worked examples, and practice problems.',
  },
  {
    id: 'renzo',
    name: 'Renzo Lim',
    course: 'BS Mathematics',
    year: '4th Year',
    subjects: ['Calculus', 'Statistics'],
    rating: 4.7,
    sessions: 42,
    response: 94,
    available: false,
    availability: 'Sample schedule',
    about:
      'I help you understand the reasoning behind each step, from calculus to statistics.',
  },
];

export function uid(prefix: string) {
  return (
    prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)
  );
}
export function dayAt(offset: number, hour = 14, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}
export function dateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear()
      ? { year: 'numeric' as const }
      : {}),
  });
}
export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
export function sessionTime(iso: string) {
  return dateLabel(iso) + ' • ' + timeLabel(iso);
}
export function timeRange(iso: string) {
  return (
    timeLabel(iso) +
    ' – ' +
    timeLabel(new Date(new Date(iso).getTime() + 3600000).toISOString())
  );
}

export function initialState(account: Account): CampusState {
  const today = dayAt(1, 10).toISOString();
  const before = dayAt(-7).toISOString();
  return {
    version: 1,
    profile: {
      ...account,
      course: account.id === 'demo' ? 'BS Computer Science' : '',
      year: account.id === 'demo' ? '2nd Year' : '',
      school: account.id === 'demo' ? 'Sample campus' : '',
      interests:
        account.id === 'demo' ? ['Calculus', 'Java', 'Machine Learning'] : [],
      tutorSubjects: [],
      bio: '',
    },
    sessions:
      account.id === 'demo'
        ? [
            {
              id: 'sample-session',
              tutorId: 'jamie',
              subject: 'Calculus I',
              startsAt: today,
              note: 'Integration Techniques Review',
              status: 'Upcoming',
            },
            {
              id: 'sample-past',
              tutorId: 'jamie',
              subject: 'Java OOP',
              startsAt: before,
              note: 'Classes and inheritance',
              status: 'Completed',
            },
          ]
        : [],
    groups:
      account.id === 'demo'
        ? [
            {
              id: 'calculus',
              name: 'Calculus Study Circle',
              subject: 'Calculus',
              members: 12,
              joined: account.id === 'demo',
              meetup: 'Integration Techniques Review',
              meetupAt: dayAt(2, 16).toISOString(),
              room: 'Q-5221',
              posts: [
                {
                  id: 'post-mika',
                  author: 'Mika',
                  text: 'I uploaded a short reviewer for integration by parts.',
                  createdAt: before,
                  replies: [],
                },
                {
                  id: 'post-renzo',
                  author: 'Renzo',
                  text: 'Who wants to practice before Friday?',
                  createdAt: before,
                  replies: [],
                },
              ],
            },
            {
              id: 'java',
              name: 'Java OOP Review',
              subject: 'Java',
              members: 8,
              joined: account.id === 'demo',
              meetup: 'Classes, objects, and inheritance',
              meetupAt: dayAt(3, 10).toISOString(),
              room: 'J-1010',
              posts: [],
            },
            {
              id: 'physics',
              name: 'Physics Problem Solvers',
              subject: 'Physics',
              members: 24,
              joined: false,
              meetup: 'Mechanics practice',
              meetupAt: dayAt(4, 15).toISOString(),
              room: 'P-2400',
              posts: [],
            },
          ]
        : [],
    conversations:
      account.id === 'demo'
        ? [
            {
              id: 'chat-jamie',
              name: 'Jamie Dela Cruz',
              tutorId: 'jamie',
              messages: [
                {
                  id: 'm1',
                  text: 'Hi Alex, what topic should we focus on?',
                  mine: false,
                  sentAt: today,
                },
                {
                  id: 'm2',
                  text: 'Integration by parts. I get confused with u and dv.',
                  mine: true,
                  sentAt: today,
                },
                {
                  id: 'm3',
                  text: 'Got it. I will prepare two examples before our session.',
                  mine: false,
                  sentAt: today,
                },
                {
                  id: 'm4',
                  text: 'See you at ' + timeLabel(today) + '.',
                  mine: false,
                  sentAt: today,
                },
              ],
            },
            {
              id: 'chat-calculus',
              name: 'Calculus Study Circle',
              groupId: 'calculus',
              messages: [
                {
                  id: 'g1',
                  text: 'Mika: Reviewer uploaded',
                  mine: false,
                  sentAt: today,
                },
              ],
            },
            {
              id: 'chat-renzo',
              name: 'Renzo Lim',
              tutorId: 'renzo',
              messages: [
                { id: 'r1', text: 'Thanks!', mine: false, sentAt: before },
              ],
            },
          ]
        : [],
    notices:
      account.id === 'demo'
        ? [
            {
              id: 'n1',
              title: 'Session reminder',
              body: 'Your Calculus I session is on your schedule.',
              sessionId: 'sample-session',
              read: false,
            },
            {
              id: 'n2',
              title: 'New study group post',
              body: 'Mika posted in Calculus Study Circle.',
              groupId: 'calculus',
              read: false,
            },
            {
              id: 'n3',
              title: 'Explore tutors',
              body: 'See sample tutor profiles and subjects.',
              read: false,
            },
          ]
        : [],
  };
}
