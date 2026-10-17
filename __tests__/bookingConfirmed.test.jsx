import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppHeader } from '../src/shared/components/AppHeader';
import { BookingConfirmedScreen } from '../src/features/tutors/screens/BookingConfirmedScreen';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

async function renderScreen(session) {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <BookingConfirmedScreen
          go={jest.fn()}
          session={session}
          tutor={{ name: 'Taylor Student' }}
        />
      </SafeAreaProvider>,
    );
  });
  return renderer;
}

test('confirmation screens use a clear header title for bookings and requests', async () => {
  const booking = await renderScreen({
    id: 'booking-one',
    startsAt: '2026-10-18T08:00:00.000Z',
    subject: 'Calculus',
    status: 'Upcoming',
    shared: false,
  });
  expect(booking.root.findByType(AppHeader).props.title).toBe('Booking confirmed');
  await act(async () => booking.unmount());

  const request = await renderScreen({
    id: 'request-one',
    startsAt: '2026-10-18T08:00:00.000Z',
    subject: 'Calculus',
    status: 'Pending',
    shared: true,
  });
  expect(request.root.findByType(AppHeader).props.title).toBe('Request sent');
  await act(async () => request.unmount());
});
