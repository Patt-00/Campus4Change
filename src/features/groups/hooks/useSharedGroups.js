import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uid as createId } from '../../../shared/data/demo';
import {
  syncSharedGroupAction,
  watchSharedGroupPosts,
  watchSharedGroups,
} from '../data/firestore';

const EMPTY_GROUPS = [];
const EMPTY_ACTIONS = [];

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function mergeGroupDirectory(localGroups, sharedGroups) {
  const sharedIds = new Set(sharedGroups.map(group => group.id));
  return [
    ...sharedGroups,
    ...localGroups.filter(group => !sharedIds.has(group.id)),
  ];
}

export function useSharedGroups({
  uid,
  enabled,
  state,
  dispatch,
  activeGroupId,
}) {
  const [result, setResult] = useState({ uid: null, groups: [], error: '' });
  const [retryKey, setRetryKey] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actionRetryKey, setActionRetryKey] = useState(0);
  const [contentResult, setContentResult] = useState({
    uid: null,
    groupId: null,
    error: '',
  });
  const [contentRetryKey, setContentRetryKey] = useState(0);
  const actionsInFlight = useRef(new Set());
  const activeUid = useRef(uid);
  activeUid.current = uid;
  const pendingActions = state?.pendingSharedActions ?? EMPTY_ACTIONS;
  const profile = state?.profile;
  const localGroups = state?.groups ?? EMPTY_GROUPS;
  const sharedGroups = result.uid === uid ? result.groups : EMPTY_GROUPS;
  const groupDirectory = useMemo(
    () => mergeGroupDirectory(localGroups, sharedGroups),
    [localGroups, sharedGroups],
  );
  const activeGroup = groupDirectory.find(group => group.id === activeGroupId);
  const pendingCreate = pendingActions.some(
    operation =>
      operation.type === 'createGroup' &&
      operation.group?.id === activeGroupId,
  );
  const pendingMembership = pendingActions.some(
    operation =>
      operation.type === 'membership' &&
      operation.groupId === activeGroupId,
  );

  useEffect(() => {
    if (!enabled || !uid) {
      setResult({ uid: null, groups: [], error: '' });
      return undefined;
    }

    let active = true;
    setResult({ uid, groups: [], error: '' });
    let unsubscribe = () => {};
    try {
      unsubscribe = watchSharedGroups(
        uid,
        groups => {
          if (active) {
            setResult({ uid, groups, error: '' });
          }
        },
        error => {
          if (active) {
            setResult(current => ({
              uid,
              groups: current.uid === uid ? current.groups : [],
              error: errorText(error),
            }));
          }
        },
      );
    } catch (error) {
      setResult({ uid, groups: [], error: errorText(error) });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, retryKey, uid]);

  useEffect(() => {
    if (uid && sharedGroups.length) {
      dispatch({ type: 'sharedGroups', groups: sharedGroups });
    }
  }, [dispatch, sharedGroups, uid]);

  useEffect(() => {
    if (
      !enabled ||
      !uid ||
      !activeGroupId ||
      !activeGroup?.shared ||
      !activeGroup.joined ||
      pendingCreate ||
      pendingMembership
    ) {
      setContentResult({ uid, groupId: activeGroupId, error: '' });
      return undefined;
    }

    let active = true;
    setContentResult({ uid, groupId: activeGroupId, error: '' });
    let unsubscribe = () => {};
    try {
      unsubscribe = watchSharedGroupPosts(
        uid,
        activeGroupId,
        posts => {
          if (active) {
            dispatch({
              type: 'sharedGroupPosts',
              id: activeGroupId,
              posts,
            });
            setContentResult({ uid, groupId: activeGroupId, error: '' });
          }
        },
        error => {
          if (active) {
            setContentResult({
              uid,
              groupId: activeGroupId,
              error: errorText(error),
            });
          }
        },
      );
    } catch (error) {
      setContentResult({
        uid,
        groupId: activeGroupId,
        error: errorText(error),
      });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    activeGroup?.joined,
    activeGroup?.shared,
    activeGroupId,
    contentRetryKey,
    dispatch,
    enabled,
    pendingCreate,
    pendingMembership,
    uid,
  ]);

  useEffect(() => {
    setActionError('');
  }, [uid]);

  useEffect(() => {
    if (!uid || !pendingActions.length || !profile) {
      return;
    }

    async function syncPendingActions() {
      for (const operation of pendingActions) {
        if (activeUid.current !== uid) {
          return;
        }
        if (actionsInFlight.current.has(operation.id)) {
          continue;
        }
        actionsInFlight.current.add(operation.id);
        try {
          await syncSharedGroupAction(uid, profile, operation);
          if (activeUid.current === uid) {
            dispatch({
              type: 'sharedGroupActionSynced',
              id: operation.id,
            });
            setActionError('');
          }
        } catch (error) {
          if (activeUid.current === uid) {
            setActionError(errorText(error));
          }
          return;
        } finally {
          actionsInFlight.current.delete(operation.id);
        }
      }
    }
    syncPendingActions();
  }, [actionRetryKey, dispatch, pendingActions, profile, uid]);

  const retry = useCallback(() => setRetryKey(value => value + 1), []);
  const retryActions = useCallback(
    () => setActionRetryKey(value => value + 1),
    [],
  );
  const retryContent = useCallback(
    () => setContentRetryKey(value => value + 1),
    [],
  );
  const queueGroupCreation = useCallback(
    group => {
      if (uid) {
        dispatch({
          type: 'queueSharedGroupAction',
          operation: {
            id: createId('group-action'),
            type: 'createGroup',
            group,
          },
        });
      }
    },
    [dispatch, uid],
  );
  const dispatchGroupChange = useCallback(
    action => {
      const groupId = action.groupId || action.id;
      const target = groupDirectory.find(group => group.id === groupId);
      if (uid && target?.shared) {
        dispatch({ type: 'sharedGroups', groups: sharedGroups });
        dispatch({
          type: 'queueSharedGroupAction',
          operation: {
            ...action,
            groupId,
            id: createId('group-action'),
          },
        });
      }
      dispatch(action);
    },
    [dispatch, groupDirectory, sharedGroups, uid],
  );

  return {
    groups: groupDirectory,
    error: result.uid === uid ? result.error : '',
    retry,
    actionError,
    retryActions,
    contentError:
      contentResult.uid === uid && contentResult.groupId === activeGroupId
        ? contentResult.error
        : '',
    retryContent,
    queueGroupCreation,
    dispatchGroupChange,
  };
}
