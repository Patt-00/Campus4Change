function normalizedTopic(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

function topicsMatch(left, right) {
  const a = normalizedTopic(left);
  const b = normalizedTopic(right);
  return Boolean(
    a &&
      b &&
      (a === b ||
        (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)))),
  );
}

export function recommendTutorMatches(list, interests) {
  const topics = [];
  const seen = new Set();
  for (const value of Array.isArray(interests) ? interests : []) {
    const label = String(value ?? '').trim().replace(/\s+/g, ' ');
    const key = normalizedTopic(label);
    if (key && !seen.has(key)) {
      topics.push(label);
      seen.add(key);
    }
  }

  if (!topics.length) {
    return [];
  }

  return list
    .filter(tutor => !tutor.own)
    .map(tutor => ({
      ...tutor,
      matchedInterests: topics.filter(interest =>
        (Array.isArray(tutor.subjects) ? tutor.subjects : []).some(subject =>
          topicsMatch(subject, interest),
        ),
      ),
    }))
    .filter(tutor => tutor.matchedInterests.length > 0)
    .sort(
      (a, b) =>
        b.matchedInterests.length - a.matchedInterests.length ||
        a.name.localeCompare(b.name),
    );
}

export function filterTutors(list, query, subject, available, top) {
  const q = normalizedTopic(query);
  const selectedSubject = normalizedTopic(subject);
  return list
    .filter(
      t =>
        (!q ||
          normalizedTopic(
            [t.name, t.course, t.year, t.about, ...(t.subjects || [])]
              .filter(Boolean)
              .join(' '),
          ).includes(q)) &&
        (!selectedSubject ||
          t.subjects.some(x => normalizedTopic(x) === selectedSubject)) &&
        (!available || t.available),
    )
    .sort((a, b) => (top ? b.rating - a.rating : 0));
}
