import { hasCompleteAccountProfile } from '../src/shared/data/profileSetup';

const completeProfile = {
  id: 'firebase-owner-uid',
  accountUuid: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Taylor Student',
  course: 'Computer Science',
  courseId: 'quezon-city-computer-studies-computer-science',
  year: '3',
  campus: 'T.I.P. Quezon City',
};

test('a valid account UUID and complete TIP profile enter the app', () => {
  expect(hasCompleteAccountProfile(completeProfile)).toBe(true);
});

test.each([
  ['missing Campus4Change ID', { accountUuid: '' }],
  ['missing course', { courseId: '' }],
  ['missing year', { year: '' }],
  ['invalid year', { year: 'year three' }],
  ['campus mismatched with selected course', { campus: 'T.I.P. Manila' }],
])('an incomplete profile needs setup: %s', (_reason, changes) => {
  expect(hasCompleteAccountProfile({ ...completeProfile, ...changes })).toBe(false);
});
