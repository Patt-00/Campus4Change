import {
  filterTipProgramGroups,
  getTipProgram,
  tipProgramCatalogVerifiedAt,
  tipProgramGroups,
  tipPrograms,
  tipTopicSuggestionsVerifiedAt,
} from '../src/shared/data/tipPrograms';
import {
  flattenInterestGroups,
  normalizeInterestGroups,
} from '../src/shared/data/interestGroups';
import { initialState } from '../src/shared/data/utils';
import { stateForPersistence } from '../src/shared/state/persistence';

test('TIP undergraduate offerings are grouped by campus and college', () => {
  expect(tipProgramCatalogVerifiedAt).toBe('2026-10-22');
  expect(tipTopicSuggestionsVerifiedAt).toBe('2026-10-22');
  expect(tipProgramGroups.map(campus => campus.campus)).toEqual([
    'T.I.P. Manila',
    'T.I.P. Quezon City',
  ]);
  expect(tipPrograms).toHaveLength(49);
  expect(new Set(tipPrograms.map(program => program.id)).size).toBe(49);
  expect(tipPrograms.every(program => program.topicGroups.length === 2)).toBe(true);
  expect(tipPrograms.every(program => program.topicGroups.every(group => group.topics.length))).toBe(true);
  expect(
    tipPrograms.every(program =>
      program.topicGroups.every(group => group.topics.length >= 12),
    ),
  ).toBe(true);
  expect(
    tipPrograms.every(program => {
      const topics = program.topicGroups.flatMap(group => group.topics);
      return new Set(topics.map(topic => topic.toLocaleLowerCase())).size === topics.length;
    }),
  ).toBe(true);

  const computerScience = getTipProgram('manila-computer-studies-computer-science');
  expect(computerScience.topicGroups.map(group => group.title)).toEqual([
    'Core subjects',
    'Specialization areas',
  ]);
  expect(computerScience.topicGroups[0].topics).toContain(
    'Data structures and algorithms',
  );
  expect(computerScience.topicGroups[1].topics).toContain(
    'Natural language processing',
  );

  const specialNeeds = getTipProgram('quezon-city-education-bachelor-of-special-needs-education');
  expect(specialNeeds.topicGroups[0].topics).toContain(
    'Educational assessment of students with additional needs',
  );
  expect(specialNeeds.topicGroups[1].topics).toContain(
    'Augmentative and alternative communication',
  );

  const qcEnvironmental = filterTipProgramGroups('Environmental and Sanitary');
  expect(qcEnvironmental).toHaveLength(1);
  expect(qcEnvironmental[0].campus).toBe('T.I.P. Quezon City');
  expect(qcEnvironmental[0].colleges[0].programs[0].name).toBe(
    'Environmental and Sanitary Engineering',
  );
  expect(getTipProgram('quezon-city-computer-studies-information-systems')).toMatchObject({
    name: 'Information Systems',
    campus: 'T.I.P. Quezon City',
    college: 'College of Computer Studies',
  });
  expect(getTipProgram('quezon-city-business-education-logistics-and-supply-chain-management')).toMatchObject({
    name: 'Logistics and Supply Chain Management',
    campus: 'T.I.P. Quezon City',
  });

  expect(getTipProgram('manila-computer-studies-artificial-intelligence')).toMatchObject({
    name: 'Artificial Intelligence',
    campus: 'T.I.P. Manila',
    college: 'College of Computer Studies',
  });
  expect(
    getTipProgram('manila-computer-studies-artificial-intelligence').topicGroups[0].topics,
  ).toContain('Responsible AI, ethics, and privacy');
  expect(getTipProgram('manila-business-education-internal-auditing')).toMatchObject({
    name: 'Internal Auditing',
    campus: 'T.I.P. Manila',
    college: 'College of Business Education',
  });
  expect(getTipProgram('quezon-city-engineering-architecture-design-and-technology')).toMatchObject({
    name: 'Design and Technology',
    campus: 'T.I.P. Quezon City',
    college: 'College of Engineering and Architecture',
  });
  expect(
    getTipProgram('quezon-city-engineering-architecture-design-and-technology').topicGroups[1].topics,
  ).toContain('Product prototyping and iterative testing');
  expect(getTipProgram('quezon-city-business-education-accounting-information-systems')).toMatchObject({
    name: 'Accounting Information Systems',
    campus: 'T.I.P. Quezon City',
    college: 'College of Business Education',
  });

  const aiSearch = filterTipProgramGroups('Artificial Intelligence');
  expect(aiSearch).toHaveLength(1);
  expect(aiSearch[0].campus).toBe('T.I.P. Manila');
  const designTechSearch = filterTipProgramGroups('Design and Technology');
  expect(designTechSearch).toHaveLength(1);
  expect(designTechSearch[0].campus).toBe('T.I.P. Quezon City');
});

test('older flat interests migrate into a course group and groups stay distinct', () => {
  const legacy = normalizeInterestGroups(
    [],
    ['Algorithms', 'Statistics'],
    'manila-computer-studies-computer-science',
    'Computer Science',
  );
  expect(legacy).toEqual([
    {
      id: 'manila-computer-studies-computer-science',
      programId: 'manila-computer-studies-computer-science',
      programName: 'Computer Science',
      campus: 'T.I.P. Manila',
      interests: ['Algorithms', 'Statistics'],
    },
  ]);

  const distinct = normalizeInterestGroups([
    {
      programId: 'manila-computer-studies-computer-science',
      programName: 'Computer Science',
      interests: ['Statistics'],
    },
    {
      programId: 'quezon-city-business-education-business-administration',
      programName: 'Business Administration',
      interests: ['Statistics'],
    },
  ]);
  expect(distinct).toHaveLength(2);
  expect(distinct.map(group => group.interests)).toEqual([
    ['Statistics'],
    ['Statistics'],
  ]);
  expect(flattenInterestGroups(distinct)).toEqual(['Statistics']);
});

test('custom profile photos stay in device persistence and are excluded from cloud state', () => {
  const state = initialState({
    id: 'student-1',
    name: 'Student',
    email: 'student@example.test',
  });
  state.profile.profilePhotoUri =
    'file:///data/user/0/com.campus4change/files/profile_photos/abc.jpg';
  state.profile.avatarId = 'violet';

  expect(stateForPersistence(state).profile.profilePhotoUri).toContain('profile_photos');
  expect(stateForPersistence(state, { forCloud: true }).profile).not.toHaveProperty(
    'profilePhotoUri',
  );
  expect(stateForPersistence(state, { forCloud: true }).profile.avatarId).toBe('violet');
});
