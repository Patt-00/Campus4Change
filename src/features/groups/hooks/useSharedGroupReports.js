import { useCallback, useEffect, useRef, useState } from 'react';
import { watchSharedGroupReports } from '../data/firestore';

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

export function useSharedGroupReports({ uid, groupId, enabled }) {
  const [result, setResult] = useState({
    uid: null,
    groupId: null,
    reports: [],
    error: '',
    loadingReports: false,
    hasMoreReports: false,
    reportsLive: false,
  });
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !uid || !groupId) {
      subscriptionRef.current = null;
      setLoadingMoreReports(false);
      setResult({
        uid,
        groupId,
        reports: [],
        error: '',
        loadingReports: false,
        hasMoreReports: false,
        reportsLive: false,
      });
      return undefined;
    }

    let active = true;
    let subscription = null;
    setLoadingMoreReports(false);
    setResult({
      uid,
      groupId,
      reports: [],
      error: '',
      loadingReports: true,
      hasMoreReports: false,
      reportsLive: true,
    });
    try {
      subscription = watchSharedGroupReports(
        uid,
        groupId,
        (reports, paging) => {
          if (active) {
            setResult({
              uid,
              groupId,
              reports,
              error: '',
              loadingReports: false,
              hasMoreReports: Boolean(paging?.hasMoreReports),
              reportsLive: Boolean(paging?.reportsLive),
            });
          }
        },
        error => {
          if (active) {
            setResult(current => ({
              ...current,
              uid,
              groupId,
              error: errorText(error),
              loadingReports: false,
              reportsLive: false,
            }));
          }
        },
      );
      subscriptionRef.current = { uid, groupId, subscription };
    } catch (error) {
      setResult({
        uid,
        groupId,
        reports: [],
        error: errorText(error),
        loadingReports: false,
        hasMoreReports: false,
        reportsLive: false,
      });
    }

    return () => {
      active = false;
      if (subscriptionRef.current?.subscription === subscription) {
        subscriptionRef.current = null;
      }
      subscription?.unsubscribe();
    };
  }, [enabled, groupId, uid]);

  const loadMoreReports = useCallback(async () => {
    const current = subscriptionRef.current;
    if (!current || current.uid !== uid || current.groupId !== groupId) {
      return;
    }
    setLoadingMoreReports(true);
    try {
      await current.subscription.loadMoreReports();
    } catch (error) {
      setResult(previous =>
        previous.uid === uid && previous.groupId === groupId
          ? { ...previous, error: errorText(error) }
          : previous,
      );
    } finally {
      if (subscriptionRef.current?.subscription === current.subscription) {
        setLoadingMoreReports(false);
      }
    }
  }, [groupId, uid]);

  const refreshReports = useCallback(() => {
    const current = subscriptionRef.current;
    if (current?.uid === uid && current.groupId === groupId) {
      setResult(previous =>
        previous.uid === uid && previous.groupId === groupId
          ? { ...previous, error: '', loadingReports: true }
          : previous,
      );
      current.subscription.refreshReports();
    }
  }, [groupId, uid]);

  const isCurrent = result.uid === uid && result.groupId === groupId;
  return {
    reports: isCurrent ? result.reports : [],
    error: isCurrent ? result.error : '',
    loadingReports: isCurrent
      ? result.loadingReports
      : Boolean(enabled && uid && groupId),
    hasMoreReports: isCurrent && result.hasMoreReports,
    reportsLive: isCurrent && result.reportsLive,
    loadingMoreReports,
    loadMoreReports,
    refreshReports,
  };
}
