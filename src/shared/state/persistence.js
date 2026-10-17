export function stateForPersistence(state, { forCloud = false } = {}) {
  if (!state || typeof state !== 'object') {
    return state;
  }

  let profile = state.profile;
  if (forCloud && profile && typeof profile === 'object') {
    const { profilePhotoUri, ...cloudProfile } = profile;
    profile = cloudProfile;
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
