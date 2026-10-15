const titles = {
  pending: 'Session request sent',
  accepted: 'Session confirmed',
  declined: 'Session request declined',
  cancelled: 'Session cancelled',
  completed: 'Session completed',
};

export function bookingNotices(bookings, accountId) {
  return bookings.flatMap(booking => {
    const incoming = booking.tutorId === accountId;
    if (
      !accountId ||
      !booking.shared ||
      !booking.id ||
      (!incoming && booking.studentUid !== accountId) ||
      !titles[booking.remoteStatus]
    ) {
      return [];
    }
    // Wait for the server timestamp instead of notifying twice around a local write.
    const occurredAt = Date.parse(booking.updatedAt);
    if (!Number.isFinite(occurredAt)) {
      return [];
    }
    const peer = incoming ? booking.studentName : booking.tutorName;
    const subject = booking.subject || 'tutoring';
    let body;
    switch (booking.remoteStatus) {
      case 'pending':
        body = incoming
          ? `${peer || 'A learner'} requested a ${subject} session. Review it in Sessions.`
          : `Your ${subject} request was sent to ${peer || 'the tutor'}.`;
        break;
      case 'accepted':
        body = incoming
          ? `You accepted the ${subject} request from ${peer || 'a learner'}.`
          : `${peer || 'The tutor'} accepted your ${subject} request.`;
        break;
      case 'declined':
        body = incoming
          ? `You declined the ${subject} request from ${peer || 'a learner'}.`
          : `${peer || 'The tutor'} declined your ${subject} request.`;
        break;
      default:
        body = `Your ${subject} session with ${peer || 'the other participant'} was ${booking.remoteStatus}.`;
    }
    return [{
      id: `shared-booking-${booking.id}`,
      eventKey: `${booking.remoteStatus}:${occurredAt}`,
      occurredAt,
      title: incoming && booking.remoteStatus === 'pending'
        ? 'New session request'
        : titles[booking.remoteStatus],
      body,
      sessionId: booking.id,
      read: false,
    }];
  });
}
