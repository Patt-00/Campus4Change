import { dayAt, initialState } from '../src/shared/data/utils';

export const qaAccount = {
  id: 'qa-student',
  name: 'Jordan Student',
  email: 'jordan@school.test',
  studentId: '2048',
};

export function makeQaState(account = qaAccount) {
  const state = initialState(account);
  const upcoming = dayAt(1, 10).toISOString();
  const previous = dayAt(-7).toISOString();

  state.profile.course = 'BS Computer Science';
  state.profile.year = '2nd Year';
  state.profile.campus = 'T.I.P. Quezon City';
  state.profile.interests = ['Calculus', 'Java', 'Machine Learning'];
  state.sessions = [
    {
      id: 'qa-upcoming-session',
      tutorId: 'tutor-taylor',
      tutorName: 'Taylor Student',
      subject: 'Calculus I',
      startsAt: upcoming,
      note: 'Integration techniques review',
      status: 'Upcoming',
    },
    {
      id: 'qa-completed-session',
      tutorId: 'tutor-casey',
      tutorName: 'Casey Student',
      subject: 'Java OOP',
      startsAt: previous,
      note: 'Classes and inheritance',
      status: 'Completed',
    },
  ];
  state.groups = [
    {
      id: 'qa-calculus-group',
      name: 'Calculus Study Circle',
      subject: 'Calculus',
      members: 4,
      joined: true,
      shared: false,
      meetup: 'Integration techniques review',
      meetupAt: dayAt(2, 16).toISOString(),
      room: 'Q-5221',
      posts: [],
      postsLoaded: true,
    },
    {
      id: 'qa-java-group',
      name: 'Java OOP Review',
      subject: 'Java',
      members: 3,
      joined: true,
      shared: false,
      meetup: 'Classes, objects, and inheritance',
      meetupAt: dayAt(3, 10).toISOString(),
      room: 'J-1010',
      posts: [],
      postsLoaded: true,
    },
  ];
  state.conversations = [
    {
      id: 'chat-taylor',
      name: 'Taylor Student',
      tutorId: 'tutor-taylor',
      messages: [
        {
          id: 'qa-message-1',
          text: 'What topic should we focus on?',
          mine: false,
          sentAt: upcoming,
        },
        {
          id: 'qa-message-2',
          text: 'Integration by parts.',
          mine: true,
          sentAt: upcoming,
        },
      ],
    },
    {
      id: 'chat-casey',
      name: 'Casey Student',
      tutorId: 'tutor-casey',
      messages: [
        { id: 'qa-message-3', text: 'Thanks!', mine: false, sentAt: previous },
      ],
    },
    {
      id: 'chat-calculus-group',
      name: 'Calculus Study Circle',
      groupId: 'qa-calculus-group',
      messages: [],
    },
  ];
  state.notices = [
    {
      id: 'qa-session-reminder',
      title: 'Session reminder',
      body: 'Your Calculus I session is on your schedule.',
      sessionId: 'qa-upcoming-session',
      read: false,
    },
    {
      id: 'qa-group-notice',
      title: 'New study group post',
      body: 'A student posted in Calculus Study Circle.',
      groupId: 'qa-calculus-group',
      read: false,
    },
    {
      id: 'qa-tutor-notice',
      title: 'Tutor directory update',
      body: 'Verified tutor listings are available in the directory.',
      read: false,
    },
  ];
  return state;
}
