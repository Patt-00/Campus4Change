export function conversationMessages(conversation) {
  return Array.isArray(conversation?.messages)
    ? conversation.messages.filter(
        message =>
          message && typeof message === 'object' && !Array.isArray(message),
      )
    : [];
}

export function messageText(message) {
  return typeof message?.text === 'string' ? message.text : '';
}

export function messageTimestamp(message) {
  const value = message?.sentAt;
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    !(value instanceof Date)
  ) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}
