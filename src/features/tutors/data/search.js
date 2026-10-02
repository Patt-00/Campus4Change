export function filterTutors(list, query, subject, available, top) {
  const q = query.trim().toLowerCase();
  return list
    .filter(
      t =>
        (!q ||
          (t.name + ' ' + t.subjects.join(' ')).toLowerCase().includes(q)) &&
        (!subject ||
          t.subjects.some(x => x.toLowerCase() === subject.toLowerCase())) &&
        (!available || t.available),
    )
    .sort((a, b) => (top ? b.rating - a.rating : 0));
}
