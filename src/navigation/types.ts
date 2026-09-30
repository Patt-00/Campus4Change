export type Page =
  | 'Onboarding'
  | 'Login'
  | 'Home'
  | 'Tutor Search'
  | 'Tutor Details'
  | 'Sessions'
  | 'Messages'
  | 'Profile';

export type Navigate = (page: Page) => void;
