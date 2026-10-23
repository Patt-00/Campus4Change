export function stateForPersistence(state, { forCloud = false } = {}) {
  if (!state || typeof state !== 'object') {
    return state;
  }

  let profile = state.profile;
  if (profile && typeof profile === 'object') {
    profile = { ...profile };
    delete profile.studentId;
    if (forCloud) {
      const { profilePhotoUri, ...cloudProfile } = profile;
      profile = cloudProfile;
    }
  }

  return {
    ...state,
    ...(profile !== state.profile ? { profile } : {}),
    ...(Array.isArray(state.groups)
      ? {
          groups: state.groups.map(group =>
            group.shared
              ? { ...group, posts: [], postsLoaded: !group.joined }
              : group,
          ),
        }
      : {}),
  };
}
