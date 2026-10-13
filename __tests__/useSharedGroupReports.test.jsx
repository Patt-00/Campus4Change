import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSharedGroupReports } from '../src/features/groups/hooks/useSharedGroupReports';
import { watchSharedGroupReports } from '../src/features/groups/data/firestore';

jest.mock('../src/features/groups/data/firestore', () => ({
  watchSharedGroupReports: jest.fn(),
}));

let currentResult;

function Harness({ options }) {
  currentResult = useSharedGroupReports(options);
  return null;
}

beforeEach(() => jest.clearAllMocks());

test('owner report queue subscribes, pages, refreshes, and cleans up', async () => {
  let finishLoad;
  const subscription = {
    loadMoreReports: jest.fn(
      () =>
        new Promise(resolve => {
          finishLoad = resolve;
        }),
    ),
    refreshReports: jest.fn(),
    unsubscribe: jest.fn(),
  };
  watchSharedGroupReports.mockReturnValue(subscription);
  const options = { uid: 'owner-uid', groupId: 'group-one', enabled: true };
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Harness options={options} />);
  });

  expect(watchSharedGroupReports).toHaveBeenCalledWith(
    'owner-uid',
    'group-one',
    expect.any(Function),
    expect.any(Function),
  );
  await act(async () => {
    watchSharedGroupReports.mock.calls[0][2](
      [{ id: 'report-one', status: 'open' }],
      { hasMoreReports: true, reportsLive: true },
    );
  });
  expect(currentResult.reports.map(report => report.id)).toEqual([
    'report-one',
  ]);
  expect(currentResult.hasMoreReports).toBe(true);

  let loadPromise;
  await act(async () => {
    loadPromise = currentResult.loadMoreReports();
  });
  expect(currentResult.loadingMoreReports).toBe(true);
  await act(async () => {
    finishLoad();
    await loadPromise;
  });
  expect(currentResult.loadingMoreReports).toBe(false);
  await act(async () => currentResult.refreshReports());
  expect(subscription.refreshReports).toHaveBeenCalledTimes(1);

  await act(async () => {
    watchSharedGroupReports.mock.calls[0][3](new Error('Report sync failed'));
  });
  expect(currentResult.error).toBe('Report sync failed');

  await act(async () => renderer.unmount());
  expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
});

test('report queue remains disabled for a non-owner or signed-out session', async () => {
  let renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Harness options={{ uid: null, groupId: 'group-one', enabled: false }} />,
    );
  });
  expect(watchSharedGroupReports).not.toHaveBeenCalled();
  expect(currentResult.reports).toEqual([]);
  expect(currentResult.error).toBe('');
  await act(async () => renderer.unmount());
});
