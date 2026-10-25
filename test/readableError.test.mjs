import assert from 'node:assert/strict';
import test from 'node:test';
import { readableErrorText } from '../src/shared/data/readableError.js';

test('turns Firestore offline errors into connection guidance', () => {
  const error = Object.assign(
    new Error('Failed to get document because the client is offline.'),
    { code: 'unavailable' },
  );

  assert.equal(
    readableErrorText(error),
    'Check your internet connection, then try again.',
  );
});

test('recognizes Firebase Authentication network failures', () => {
  const error = Object.assign(new Error('The request failed.'), {
    code: 'auth/network-request-failed',
  });

  assert.equal(
    readableErrorText(error),
    'Check your internet connection, then try again.',
  );
});

test('keeps actionable permission guidance unchanged', () => {
  const error = Object.assign(new Error('Verify your email and try again.'), {
    code: 'permission-denied',
  });

  assert.equal(readableErrorText(error), 'Verify your email and try again.');
});

test('uses the provided fallback when an error has no message', () => {
  assert.equal(
    readableErrorText(null, 'Could not save your profile.'),
    'Could not save your profile.',
  );
});
