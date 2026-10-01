export type Page =
  | 'Onboarding'
  | 'Login'
  | 'Sign Up'
  | 'Home'
  | 'Tutor Search'
  | 'Tutor Details'
  | 'Book Session'
  | 'Booking Confirmed'
  | 'Study Groups'
  | 'Group Details'
  | 'Create Group'
  | 'Group Post'
  | 'Sessions'
  | 'Session Details'
  | 'Messages'
  | 'Chat'
  | 'Notifications'
  | 'Profile'
  | 'Edit Profile'
  | 'Preferences'
  | 'Be a Tutor'
  | 'Create'
  | 'Study Room'
  | 'About';
export type Route = {
  page: Page;
  tutorId?: string;
  sessionId?: string;
  groupId?: string;
  conversationId?: string;
  postId?: string;
  query?: string;
  slot?: number;
};
export type Navigate = (route: Page | Route) => void;
