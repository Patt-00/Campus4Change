export type Account = {
  id: string;
  name: string;
  email: string;
  studentId: string;
};
export type Profile = Account & {
  course: string;
  year: string;
  school: string;
  interests: string[];
  tutorSubjects: string[];
  bio: string;
};
export type Tutor = {
  id: string;
  name: string;
  course: string;
  year: string;
  subjects: string[];
  rating: number;
  sessions: number;
  response: number;
  available: boolean;
  availability: string;
  about: string;
};
export type Session = {
  id: string;
  tutorId: string;
  subject: string;
  startsAt: string;
  note: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  rating?: number;
};
export type Post = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  replies: { id: string; author: string; text: string }[];
};
export type Group = {
  id: string;
  name: string;
  subject: string;
  members: number;
  joined: boolean;
  meetup: string;
  room: string;
  posts: Post[];
};
export type Message = {
  id: string;
  text: string;
  mine: boolean;
  sentAt: string;
};
export type Conversation = {
  id: string;
  name: string;
  tutorId?: string;
  groupId?: string;
  messages: Message[];
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  sessionId?: string;
  groupId?: string;
};
export type CampusState = {
  version: 1;
  profile: Profile;
  sessions: Session[];
  groups: Group[];
  conversations: Conversation[];
  notices: Notice[];
  roomNotes?: Record<string, string>;
};
