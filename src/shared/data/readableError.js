const networkErrorCodes = new Set([
  'auth/network-request-failed',
  'deadline-exceeded',
  'network-request-failed',
  'unavailable',
]);

export function readableErrorText(
  error,
  fallback = 'Something went wrong. Try again.',
) {
  const message =
    typeof error?.message === 'string'
      ? error.message
      : String(error ?? '');
  const code = typeof error?.code === 'string' ? error.code.toLowerCase() : '';

  if (
    networkErrorCodes.has(code) ||
    /client is offline|network (request )?failed|network error|connection (was )?(lost|interrupted)/i.test(
      message,
    )
  ) {
    return 'Check your internet connection, then try again.';
  }

  return message.trim() || fallback;
}
