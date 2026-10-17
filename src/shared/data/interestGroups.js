import { getTipProgram } from './tipPrograms';

function normalizedText(value, maxLength = 80) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
    : '';
}

function uniqueTopics(value, remaining) {
  const seen = new Set();
  const topics = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const topic = normalizedText(raw);
    const key = topic.toLocaleLowerCase();
    if (topic && !seen.has(key) && topics.length < remaining) {
      seen.add(key);
      topics.push(topic);
    }
  }
  return topics;
}

function customGroupId(name, campus = '') {
  const key = `${name} ${campus}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return key ? `custom-${key}` : 'other-interests';
}

export function flattenInterestGroups(groups, maxItems = 20) {
  const topics = [];
  const seen = new Set();
  for (const group of Array.isArray(groups) ? groups : []) {
    for (const topic of uniqueTopics(group?.interests, maxItems)) {
      const key = topic.toLocaleLowerCase();
      if (!seen.has(key) && topics.length < maxItems) {
        seen.add(key);
        topics.push(topic);
      }
    }
  }
  return topics;
}

export function normalizeInterestGroups(
  value,
  fallbackInterests = [],
  courseId = '',
  courseName = '',
  maxItems = 20,
) {
  const groups = [];
  const indexes = new Map();
  let remaining = maxItems;
  for (const raw of Array.isArray(value) ? value : []) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }
    const program = getTipProgram(raw.programId);
    const programName = normalizedText(
      program?.name || raw.programName || courseName || 'Other interests',
    );
    const campus = normalizedText(program?.campus || raw.campus, 60);
    const id = program?.id || normalizedText(raw.id, 120) || customGroupId(programName, campus);
    const topics = uniqueTopics(raw.interests, remaining);
    if (!topics.length) {
      continue;
    }
    let index = indexes.get(id);
    if (index === undefined) {
      index = groups.length;
      indexes.set(id, index);
      groups.push({
        id,
        programId: program?.id || '',
        programName,
        campus,
        interests: [],
      });
    }
    const target = groups[index];
    const seen = new Set(target.interests.map(topic => topic.toLocaleLowerCase()));
    for (const topic of topics) {
      const key = topic.toLocaleLowerCase();
      if (remaining > 0 && !seen.has(key)) {
        target.interests.push(topic);
        seen.add(key);
        remaining -= 1;
      }
    }
  }

  const normalizedGroups = groups.filter(group => group.interests.length);
  if (normalizedGroups.length) {
    return normalizedGroups;
  }

  const legacyTopics = uniqueTopics(fallbackInterests, maxItems);
  if (!legacyTopics.length) {
    return [];
  }
  const course = getTipProgram(courseId);
  const fallbackName = normalizedText(
    course?.name || courseName || 'Other interests',
  );
  return [
    {
      id: course?.id || customGroupId(fallbackName, course?.campus || ''),
      programId: course?.id || '',
      programName: fallbackName,
      campus: course?.campus || '',
      interests: legacyTopics,
    },
  ];
}
