export function groupNotices(groups) {
  return groups.flatMap(group => {
    const occurredAt = Date.parse(group.updatedAt);
    if (!group.shared || !group.joined || !Number.isFinite(occurredAt)) {
      return [];
    }
    return [{
      id: `shared-group-${group.id}`,
      eventKey: `activity:${occurredAt}`,
      occurredAt,
      title: 'Study group activity',
      body: `${group.name || 'Your study group'} has new activity. Open the group to check its current posts and members.`,
      groupId: group.id,
      read: false,
    }];
  });
}
