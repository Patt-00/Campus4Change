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

function groupActionErrorText(error, operation) {
  if (
    error?.code === 'permission-denied' &&
    (operation.type === 'post' || operation.type === 'reply')
  ) {
    return 'Could not send this post or reply. Check group membership and wait five seconds between sends, then retry.';
  }
  return errorText(error);
}

function mergePosts(sharedPosts = [], cachedPosts = []) {
  const postsById = new Map();

  for (const post of sharedPosts) {
    postsById.set(post.id, post);
  }
  for (const cachedPost of cachedPosts) {
    const sharedPost = postsById.get(cachedPost.id);
    if (!sharedPost) {
      postsById.set(cachedPost.id, cachedPost);
      continue;
    }

    const repliesById = new Map(
      (cachedPost.replies ?? []).map(reply => [reply.id, reply]),
    );
    for (const reply of sharedPost.replies ?? []) {
      repliesById.set(reply.id, reply);
    }
    postsById.set(cachedPost.id, {
      ...cachedPost,
      ...sharedPost,
      replies: [...repliesById.values()].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      ),
      hasMoreReplies:
        sharedPost.hasMoreReplies ?? cachedPost.hasMoreReplies ?? false,
    });
  }

  return [...postsById.values()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}

function mergePendingContent(sharedPosts, cachedPosts, groupId, pendingActions) {
  const postsById = new Map(sharedPosts.map(post => [post.id, post]));

  for (const operation of pendingActions) {
    if (operation.groupId !== groupId) {
      continue;
    }
    if (operation.type === 'post') {
      const current = postsById.get(operation.post.id);
      postsById.set(
        operation.post.id,
        current ? mergePosts([current], [operation.post])[0] : operation.post,
      );
      continue;
    }
    if (operation.type === 'reply') {
      const post =
        postsById.get(operation.postId) ??
        cachedPosts.find(candidate => candidate.id === operation.postId);
      if (!post) {
        continue;
      }
      const replies = new Map(
        (post.replies ?? []).map(reply => [reply.id, reply]),
      );
      replies.set(operation.reply.id, operation.reply);
      postsById.set(post.id, { ...post, replies: [...replies.values()] });
    }
  }

  return [...postsById.values()].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}

export function mergeGroupDirectory(
  localGroups,
  sharedGroups,
  pendingActions = EMPTY_ACTIONS,
) {
  const sharedIds = new Set(sharedGroups.map(group => group.id));
  const localById = new Map(localGroups.map(group => [group.id, group]));
  return [
    ...sharedGroups.map(group => {
      const cached = localById.get(group.id);
      const cachedPosts = group.joined && cached?.joined ? cached.posts ?? [] : [];
      const posts = group.joined
        ? mergePendingContent(group.posts ?? [], cachedPosts, group.id, pendingActions)
        : group.posts ?? [];
      return {
        ...group,
        posts,
        postsLoaded: Boolean(group.postsLoaded) || posts.length > 0,
      };
    }),
    ...localGroups.filter(group => !sharedIds.has(group.id)),
  ];
}

function retainLoadedFeeds(previousGroups, nextGroups) {
  const previousById = new Map(previousGroups.map(group => [group.id, group]));
  return nextGroups.map(group => {
    const previous = previousById.get(group.id);
    if (!group.joined || !previous?.joined || !previous.postsLoaded) {
      return group;
    }
    return {
      ...group,
      posts: mergePosts(group.posts, previous.posts),
      postsLoaded: true,
      hasMorePosts: previous.hasMorePosts,
      postsLive: previous.postsLive,
    };
  });
}

export function mergeSharedGroupFeed(groups, groupId, fallbackGroup, feed) {
  const existing = groups.find(group => group.id === groupId) ?? fallbackGroup;
  const mergedFeed = existing
    ? {
        ...feed,
        posts: mergePosts(feed.posts, existing.posts),
        postsLoaded: Boolean(feed.postsLoaded || existing.postsLoaded),
      }
    : feed;
  if (groups.some(group => group.id === groupId)) {
    return groups.map(group =>
      group.id === groupId ? { ...group, ...mergedFeed } : group,
    );
  }
  return fallbackGroup?.id === groupId
    ? [{ ...fallbackGroup, ...mergedFeed }, ...groups]
    : groups;
}

export function mergeSyncedGroupAction(groups, uid, operation) {
  if (operation.type === 'post') {
    return groups.map(group => {
      if (group.id !== operation.groupId) {
        return group;
      }
      const existing = group.posts.find(post => post.id === operation.post.id);
      const post = existing
        ? { ...operation.post, ...existing }
        : { ...operation.post, authorUid: uid };
      return {
        ...group,
        posts: mergePosts([post, ...group.posts], []),
        postsLoaded: true,
      };
    });
  }

  if (operation.type === 'reply') {
    return groups.map(group =>
      group.id === operation.groupId
        ? {
            ...group,
            posts: group.posts.map(post => {
              if (post.id !== operation.postId) {
                return post;
              }
              const repliesById = new Map(
                (post.replies ?? []).map(reply => [reply.id, reply]),
              );
              if (!repliesById.has(operation.reply.id)) {
                repliesById.set(operation.reply.id, {
                  ...operation.reply,
                  authorUid: uid,
                });
              }
              return {
                ...post,
                replies: [...repliesById.values()].sort(
                  (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
                ),
              };
            }),
          }
        : group,
    );
  }

  return groups;
}

export function useSharedGroups({
  uid,
  enabled,
  state,
  dispatch,
  activeGroupId,
  activePostId,
}) {
  const [result, setResult] = useState({ uid: null, groups: [], error: '' });
  const [retryKey, setRetryKey] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actionRetryKey, setActionRetryKey] = useState(0);
  const [contentResult, setContentResult] = useState({
    uid: null,
    groupId: null,
    error: '',
    hasMorePosts: false,
    postsLive: false,
  });
  const [contentRetryKey, setContentRetryKey] = useState(0);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [loadingReplyIds, setLoadingReplyIds] = useState(new Set());
  const actionsInFlight = useRef(new Set());
  const contentSubscription = useRef(null);
  const activeUid = useRef(uid);
  activeUid.current = uid;
  const pendingActions = state?.pendingSharedActions ?? EMPTY_ACTIONS;
  const profile = state?.profile;
  const localGroups = state?.groups ?? EMPTY_GROUPS;
  const sharedGroups = result.uid === uid ? result.groups : EMPTY_GROUPS;
  const sharedMetadataJson = JSON.stringify(
    sharedGroups.map(group => {
      const metadata = {
        ...group,
        posts: [],
        postsLoaded: !group.joined,
      };
      delete metadata.hasMorePosts;
      delete metadata.postsLive;
      return metadata;
    }),
  );
  const sharedMetadata = useMemo(
    () => JSON.parse(sharedMetadataJson),
    [sharedMetadataJson],
  );
  const groupDirectory = useMemo(
    () => mergeGroupDirectory(localGroups, sharedGroups, pendingActions),
    [localGroups, pendingActions, sharedGroups],
  );
  const activeGroup = groupDirectory.find(group => group.id === activeGroupId);
  const activeGroupRef = useRef(activeGroup);
  activeGroupRef.current = activeGroup;
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
            setResult(current => ({
              uid,
              groups: retainLoadedFeeds(
                current.uid === uid ? current.groups : [],
                groups,
              ),
              error: '',
            }));
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
    if (uid && sharedMetadata.length) {
      dispatch({ type: 'sharedGroups', groups: sharedMetadata });
    }
  }, [dispatch, sharedMetadata, uid]);

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
      contentSubscription.current = null;
      setContentResult({
        uid,
        groupId: activeGroupId,
        error: '',
        hasMorePosts: false,
        postsLive: false,
      });
      return undefined;
    }

    let active = true;
    let subscription = null;
    setContentResult({
      uid,
      groupId: activeGroupId,
      error: '',
      hasMorePosts: false,
      postsLive: true,
    });
    setLoadingMorePosts(false);
    setLoadingReplyIds(new Set());
    try {
      subscription = watchSharedGroupPosts(
        uid,
        activeGroupId,
        (posts, pagination) => {
          if (active) {
            setResult(current => {
              const groups = current.uid === uid ? current.groups : [];
              const feed = {
                posts,
                postsLoaded: true,
                hasMorePosts: Boolean(pagination?.hasMorePosts),
                postsLive: Boolean(pagination?.postsLive),
              };
              return {
                uid,
                groups: mergeSharedGroupFeed(
                  groups,
                  activeGroupId,
                  activeGroupRef.current,
                  feed,
                ),
                error: current.error,
              };
            });
            setContentResult({
              uid,
              groupId: activeGroupId,
              error: '',
              hasMorePosts: Boolean(pagination?.hasMorePosts),
              postsLive: Boolean(pagination?.postsLive),
            });
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
        activePostId,
      );
      contentSubscription.current = {
        uid,
        groupId: activeGroupId,
        subscription,
      };
    } catch (error) {
      setContentResult({
        uid,
        groupId: activeGroupId,
        error: errorText(error),
      });
    }
    return () => {
      active = false;
      if (contentSubscription.current?.subscription === subscription) {
        contentSubscription.current = null;
      }
      subscription?.unsubscribe();
      const currentGroup = activeGroupRef.current;
      if (
        currentGroup?.id !== activeGroupId ||
        !currentGroup.shared ||
        !currentGroup.joined
      ) {
        setResult(current =>
          current.uid !== uid
            ? current
            : {
                ...current,
                groups: current.groups.map(group =>
                  group.id === activeGroupId
                    ? {
                        ...group,
                        posts: [],
                        postsLoaded: !group.joined,
                        hasMorePosts: false,
                        postsLive: false,
                      }
                    : group,
                ),
              },
        );
      }
    };
  }, [
    activeGroup?.joined,
    activeGroup?.shared,
    activeGroupId,
    activePostId,
    contentRetryKey,
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
            if (operation.type === 'post' || operation.type === 'reply') {
              setResult(current =>
                current.uid === uid
                  ? {
                      ...current,
                      groups: mergeSyncedGroupAction(
                        current.groups,
                        uid,
                        operation,
                      ),
                    }
                  : current,
              );
            }
            dispatch({
              type: 'sharedGroupActionSynced',
              id: operation.id,
            });
            setActionError('');
          }
        } catch (error) {
          if (activeUid.current === uid) {
            setActionError(groupActionErrorText(error, operation));
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
  const loadMorePosts = useCallback(async () => {
    const current = contentSubscription.current;
    if (
      !current ||
      current.uid !== uid ||
      current.groupId !== activeGroupId
    ) {
      return;
    }
    setLoadingMorePosts(true);
    try {
      await current.subscription.loadMorePosts();
    } catch (error) {
      setContentResult(previousContent =>
        previousContent.uid === uid &&
        previousContent.groupId === activeGroupId
          ? { ...previousContent, error: errorText(error) }
          : previousContent,
      );
    } finally {
      if (contentSubscription.current?.subscription === current.subscription) {
        setLoadingMorePosts(false);
      }
    }
  }, [activeGroupId, uid]);
  const loadMoreReplies = useCallback(
    async postId => {
      const current = contentSubscription.current;
      if (
        !current ||
        current.uid !== uid ||
        current.groupId !== activeGroupId
      ) {
        return;
      }
      setLoadingReplyIds(ids => new Set(ids).add(postId));
      try {
        await current.subscription.loadMoreReplies(postId);
      } catch (error) {
        setContentResult(previousContent =>
          previousContent.uid === uid &&
          previousContent.groupId === activeGroupId
            ? { ...previousContent, error: errorText(error) }
            : previousContent,
        );
      } finally {
        if (contentSubscription.current?.subscription === current.subscription) {
          setLoadingReplyIds(ids => {
            const next = new Set(ids);
            next.delete(postId);
            return next;
          });
        }
      }
    },
    [activeGroupId, uid],
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
        dispatch({ type: 'sharedGroups', groups: sharedMetadata });
        dispatch({
          type: 'queueSharedGroupAction',
          operation: {
            ...action,
            groupId,
            id: createId('group-action'),
          },
        });
        return;
      }
      dispatch(action);
    },
    [dispatch, groupDirectory, sharedMetadata, uid],
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
    hasMorePosts:
      contentResult.uid === uid && contentResult.groupId === activeGroupId
        ? contentResult.hasMorePosts
        : false,
    postsLive:
      contentResult.uid === uid && contentResult.groupId === activeGroupId
        ? contentResult.postsLive
        : false,
    loadingMorePosts,
    loadMorePosts,
    loadingReplyIds,
    loadMoreReplies,
    queueGroupCreation,
    dispatchGroupChange,
  };
}
