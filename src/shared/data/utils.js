export function uid(prefix) {
  return (
    prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)
  );
}
export function dayAt(offset, hour = 14, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function validDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function dateLabel(iso) {
  const d = validDate(iso);
  if (!d) {
    return 'Date unavailable';
  }
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}
export function timeLabel(iso) {
  const date = validDate(iso);
  if (!date) {
    return 'Time unavailable';
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
export function sessionTime(iso) {
  return dateLabel(iso) + ' • ' + timeLabel(iso);
}
export function timeRange(iso) {
  const start = validDate(iso);
  if (!start) {
    return 'Time unavailable';
  }
  return timeLabel(start) + ' – ' + timeLabel(start.getTime() + 3600000);
}

export function initialState(account) {
  return {
    version: 1,
    updatedAt: Date.now(),
    pendingSharedActions: [],
    profile: {
      ...account,
      course: '',
      courseId: '',
      year: '',
      campus: '',
      interests: [],
      interestGroups: [],
      avatarId: 'cyan',
      profilePhotoUri: '',
      tutorSubjects: [],
      tutorSubjectGroups: [],
      bio: '',
    },
    sessions: [],
    groups: [],
    conversations: [],
    notices: [],
  };
}
