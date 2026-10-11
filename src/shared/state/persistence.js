export function stateForPersistence(state) {
  if (!state || !Array.isArray(state.groups)) {
    return state;
  }

  return {
    ...state,
    groups: state.groups.map(group =>
      group.shared
        ? { ...group, posts: [], postsLoaded: !group.joined }
        : group,
    ),
  };
}
