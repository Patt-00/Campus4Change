export function parseMeetup(date, time) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) {
    return undefined;
  }
  const [year, month, day] = d.slice(1).map(Number);
  const [hour, minute] = t.slice(1).map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  ) {
    return undefined;
  }
  return value.toISOString();
}
