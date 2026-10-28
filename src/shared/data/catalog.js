function ownTutorProfile(state) {
  const profile = state.profile;
  if (!profile.tutorSubjects.length) {
    return [];
  }

  return [
    {
      id: 'local-' + profile.id,
      name: profile.name,
      course: profile.course,
      year: profile.year,
      avatarId: profile.avatarId,
      profilePhotoUri: profile.profilePhotoUri,
      subjects: profile.tutorSubjects,
      sessions: 0,
      response: 0,
      available: true,
      availability: 'Your listing',
      about: profile.bio,
      own: true,
      shared: false,
    },
  ];
}

// Local accounts can see their own device-only listing. Firebase directories
// are supplied separately by the verified shared-tutor subscription.
export function knownTutors(state) {
  return ownTutorProfile(state);
}

export function directoryTutors(state) {
  return ownTutorProfile(state);
}

export function visibleGroups(state) {
  return Array.isArray(state.groups) ? state.groups : [];
}
