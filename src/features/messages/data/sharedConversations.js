export function sharedGroupConversationId(groupId) {
  return 'shared-group-' + groupId;
}

export function sharedBookingConversationId(bookingId) {
  return 'shared-booking-' + bookingId;
}

export function buildSharedConversations(uid, groups = [], bookings = []) {
  if (!uid) {
    return [];
  }

  const groupChats = groups
    .filter(group => group?.shared && group.joined && group.id)
    .map(group => ({
      id: sharedGroupConversationId(group.id),
      name: group.name || 'Study group',
      subtitle: `${group.members || 0} members · Group chat`,
      groupId: group.id,
      kind: 'group',
      delivery: 'shared',
      canSend: true,
      activityAt: group.updatedAt || group.createdAt || '',
      messages: [],
    }));
  const bookingChats = bookings
    .filter(booking => booking?.shared && booking.id)
    .map(booking => ({
      id: sharedBookingConversationId(booking.id),
      name: booking.incoming
        ? booking.studentName || 'Student'
        : booking.tutorName || 'Tutor',
      senderName: booking.incoming
        ? booking.tutorName || 'Tutor'
        : booking.studentName || 'Student',
      subtitle: `${booking.subject || 'Session'} · ${booking.status || 'Needs review'}`,
      bookingId: booking.id,
      kind: 'booking',
      delivery: 'shared',
      canSend: ['pending', 'accepted', 'completed'].includes(
        booking.remoteStatus,
      ),
      activityAt: booking.updatedAt || booking.createdAt || booking.startsAt || '',
      messages: [],
    }));

  return [...groupChats, ...bookingChats];
}
