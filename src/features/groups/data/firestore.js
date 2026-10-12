import { firebaseServicesForUser } from '../../../shared/backend/firebase';

const collectionName = 'studyGroups';
const POST_PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 20;

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeSnapshotsDescending(...pages) {
  const snapshotsById = new Map();
  pages.forEach(page => {
    page.forEach(snapshot => snapshotsById.set(snapshot.id, snapshot));
  });
  return [...snapshotsById.values()].sort(
    (a, b) =>
      timestampMillis(b.data().createdAt) -
        timestampMillis(a.data().createdAt) ||
      b.id.localeCompare(a.id),
  );
}

function isoTime(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function authorName(profile) {
  return String(profile?.name || 'Student').trim().slice(0, 100) || 'Student';
}

function mapReply(replySnapshot) {
  const reply = replySnapshot.data();
  return {
    id: replySnapshot.id,
    author: reply.author,
    authorUid: reply.authorUid,
    text: reply.text,
    createdAt: isoTime(reply.createdAt),
  };
}

function mapPost(
  postSnapshot,
  replies = [],
  hasMoreReplies = false,
  repliesLive = true,
) {
  const post = postSnapshot.data();
  return {
    id: postSnapshot.id,
    author: post.author,
    authorUid: post.authorUid,
    text: post.text,
    createdAt: isoTime(post.createdAt),
    replies,
    hasMoreReplies,
    repliesLive,
  };
}

async function readGroup(db, firestore, uid, groupSnapshot) {
  const { doc, getDoc } = firestore;
  const groupId = groupSnapshot.id;
  const groupRef = doc(db, collectionName, groupId);
  const membership = await getDoc(doc(groupRef, 'members', uid));
  const data = groupSnapshot.data();
  return {
    id: groupId,
    shared: true,
    ownerUid: data.ownerUid,
    isOwner: data.ownerUid === uid,
    name: data.name,
    subject: data.subject,
    members: data.memberCount,
    joined: membership.exists(),
    meetup: data.meetup || '',
    meetupAt: data.meetupAt || undefined,
    updatedAt: isoTime(data.updatedAt),
    room: data.room,
    posts: [],
    postsLoaded: !membership.exists(),
  };
}

async function readDirectory(db, firestore, uid, snapshots) {
  return Promise.all(
    snapshots.map(snapshot => readGroup(db, firestore, uid, snapshot)),
  );
}

export async function loadSharedGroups(uid) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, getDocs, orderBy, query } = firestore;
  const snapshot = await getDocs(
    query(collection(db, collectionName), orderBy('updatedAt', 'desc')),
  );
  return readDirectory(db, firestore, uid, snapshot.docs);
}

export function watchSharedGroups(uid, onGroups, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, onSnapshot, orderBy, query } = firestore;
  let active = true;
  const groupsById = new Map();
  let pendingSnapshot = Promise.resolve();
  const unsubscribe = onSnapshot(
    query(collection(db, collectionName), orderBy('updatedAt', 'desc')),
    snapshot => {
      pendingSnapshot = pendingSnapshot
        .then(async () => {
          if (!active) {
            return;
          }
          const changes = snapshot.docChanges();
          for (const change of changes) {
            if (change.type === 'removed') {
              groupsById.delete(change.doc.id);
            }
          }
          const changedGroups = changes.filter(
            change => change.type !== 'removed',
          );
          const values = await Promise.all(
            changedGroups.map(change =>
              readGroup(db, firestore, uid, change.doc),
            ),
          );
          if (!active) {
            return;
          }
          changedGroups.forEach((change, index) => {
            groupsById.set(change.doc.id, values[index]);
          });
          onGroups(
            snapshot.docs
              .map(groupSnapshot => groupsById.get(groupSnapshot.id))
              .filter(Boolean),
          );
        })
        .catch(error => {
          if (active) {
            onError(error);
          }
        });
    },
    onError,
  );
  return () => {
    active = false;
    unsubscribe();
  };
}

export function watchSharedGroupPosts(
  uid,
  groupId,
  onPosts,
  onError,
  pinnedPostId,
) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    startAfter,
  } = firestore;
  const groupRef = doc(db, collectionName, groupId);
  const postsRef = collection(groupRef, 'posts');
  let active = true;
  let unsubscribePosts = () => {};
  const replyStates = new Map();
  const olderPosts = new Map();
  const pinnedPosts = new Map();
  let livePosts = [];
  let hasMorePosts = false;
  let postsLive = true;
  let loadingMorePosts = false;

  function pagedPostSnapshots() {
    return mergeSnapshotsDescending([...olderPosts.values()], livePosts);
  }

  function allPostSnapshots() {
    return mergeSnapshotsDescending(
      [...olderPosts.values()],
      livePosts,
      [...pinnedPosts.values()],
    );
  }

  function allReplySnapshots(replyState) {
    return mergeSnapshotsDescending(
      [...replyState.older.values()],
      replyState.live,
    );
  }

  function publishPosts() {
    if (!active) {
      return;
    }
    onPosts(
      allPostSnapshots().map(snapshot => {
        const replyState = replyStates.get(snapshot.id);
        const replies = replyState
          ? allReplySnapshots(replyState).reverse().map(mapReply)
          : [];
        return mapPost(
          snapshot,
          replies,
          replyState?.hasMore ?? false,
          replyState?.liveSubscription ?? true,
        );
      }),
      { hasMorePosts, postsLive },
    );
  }

  function handleError(error) {
    if (active) {
      onError(error);
    }
  }

  function subscribeReplies(postSnapshot) {
    if (replyStates.has(postSnapshot.id)) {
      return;
    }
    const replyState = {
      live: [],
      older: new Map(),
      hasMore: false,
      liveSubscription: true,
      loading: false,
      unsubscribe: () => {},
    };
    replyStates.set(postSnapshot.id, replyState);
    replyState.unsubscribe = onSnapshot(
      query(
        collection(postSnapshot.ref, 'replies'),
        orderBy('createdAt', 'desc'),
        limit(REPLY_PAGE_SIZE),
      ),
      repliesSnapshot => {
        if (!active || !replyState.liveSubscription) {
          return;
        }
        replyState.live = repliesSnapshot.docs;
        replyState.hasMore = repliesSnapshot.docs.length === REPLY_PAGE_SIZE;
        publishPosts();
      },
      handleError,
    );
  }

  async function loadReplyPageOnce(postSnapshot) {
    const repliesSnapshot = await getDocs(
      query(
        collection(postSnapshot.ref, 'replies'),
        orderBy('createdAt', 'desc'),
        limit(REPLY_PAGE_SIZE),
      ),
    );
    return {
      live: repliesSnapshot.docs,
      older: new Map(),
      hasMore: repliesSnapshot.docs.length === REPLY_PAGE_SIZE,
      liveSubscription: false,
      loading: false,
      unsubscribe: () => {},
    };
  }

  async function loadMorePosts() {
    if (!active || !hasMorePosts || loadingMorePosts) {
      return;
    }
    loadingMorePosts = true;
    try {
      if (postsLive) {
        postsLive = false;
        unsubscribePosts();
        unsubscribePosts = () => {};
        publishPosts();
      }
      const loaded = pagedPostSnapshots();
      const cursor = loaded[loaded.length - 1];
      if (!cursor) {
        hasMorePosts = false;
        publishPosts();
        return;
      }
      const olderSnapshot = await getDocs(
        query(
          postsRef,
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(POST_PAGE_SIZE),
        ),
      );
      if (!active) {
        return;
      }
      // Older pages need reply previews without additional live listeners.
      const replyPages = await Promise.all(
        olderSnapshot.docs.map(loadReplyPageOnce),
      );
      if (!active) {
        return;
      }
      olderSnapshot.docs.forEach((snapshot, index) => {
        olderPosts.set(snapshot.id, snapshot);
        replyStates.set(snapshot.id, replyPages[index]);
      });
      hasMorePosts = olderSnapshot.docs.length === POST_PAGE_SIZE;
      publishPosts();
    } finally {
      loadingMorePosts = false;
    }
  }

  async function loadMoreReplies(postId) {
    const replyState = replyStates.get(postId);
    if (!active || !replyState?.hasMore || replyState.loading) {
      return;
    }
    replyState.loading = true;
    try {
      if (replyState.liveSubscription) {
        replyState.liveSubscription = false;
        replyState.unsubscribe();
        replyState.unsubscribe = () => {};
        publishPosts();
      }
      const loaded = allReplySnapshots(replyState);
      const cursor = loaded[loaded.length - 1];
      if (!cursor) {
        replyState.hasMore = false;
        publishPosts();
        return;
      }
      const olderSnapshot = await getDocs(
        query(
          collection(doc(groupRef, 'posts', postId), 'replies'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(REPLY_PAGE_SIZE),
        ),
      );
      if (!active) {
        return;
      }
      olderSnapshot.docs.forEach(snapshot =>
        replyState.older.set(snapshot.id, snapshot),
      );
      replyState.hasMore = olderSnapshot.docs.length === REPLY_PAGE_SIZE;
      publishPosts();
    } finally {
      replyState.loading = false;
    }
  }

  getDoc(doc(groupRef, 'members', uid))
    .then(membership => {
      if (!active) {
        return;
      }
      if (!membership.exists()) {
        onPosts([], { hasMorePosts: false, postsLive: false });
        return;
      }

      unsubscribePosts = onSnapshot(
        query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(POST_PAGE_SIZE),
        ),
        postsSnapshot => {
          if (!active || !postsLive) {
            return;
          }
          livePosts = postsSnapshot.docs;
          hasMorePosts = postsSnapshot.docs.length === POST_PAGE_SIZE;
          const currentPostSnapshots = allPostSnapshots();
          const currentPostIds = new Set(
            currentPostSnapshots.map(snapshot => snapshot.id),
          );
          for (const [postId, replyState] of replyStates) {
            if (!currentPostIds.has(postId)) {
              replyState.unsubscribe();
              replyStates.delete(postId);
            }
          }
          for (const snapshot of currentPostSnapshots) {
            subscribeReplies(snapshot);
          }
          publishPosts();
        },
        handleError,
      );
      if (pinnedPostId) {
        getDoc(doc(groupRef, 'posts', pinnedPostId))
          .then(snapshot => {
            if (!active || !snapshot.exists()) {
              return;
            }
            pinnedPosts.set(snapshot.id, snapshot);
            subscribeReplies(snapshot);
            publishPosts();
          })
          .catch(handleError);
      }
    })
    .catch(handleError);

  return {
    loadMorePosts,
    loadMoreReplies,
    unsubscribe: () => {
      active = false;
      unsubscribePosts();
      replyStates.forEach(replyState => replyState.unsubscribe());
      replyStates.clear();
      olderPosts.clear();
      pinnedPosts.clear();
      livePosts = [];
    },
  };
}

export async function syncSharedGroupAction(uid, profile, action) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const {
    doc,
    getDoc,
    increment,
    serverTimestamp,
    writeBatch,
  } = firestore;
  const groupRef = doc(db, collectionName, action.groupId || action.group?.id);

  if (action.type === 'createGroup') {
    const existing = await getDoc(groupRef);
    if (existing.exists()) {
      if (existing.data().ownerUid === uid) {
        return;
      }
      throw new Error('That group ID is already in use.');
    }
    const group = action.group;
    const batch = writeBatch(db);
    batch.set(groupRef, {
      ownerUid: uid,
      name: group.name.trim(),
      subject: group.subject.trim(),
      meetup: group.meetup || '',
      meetupAt: group.meetupAt || null,
      room: group.room,
      memberCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(groupRef, 'members', uid), {
      uid,
      role: 'owner',
      joinedAt: serverTimestamp(),
    });
    await batch.commit();
    return;
  }

  const groupId = action.groupId;
  if (typeof groupId !== 'string' || !groupId) {
    throw new Error('The group action has no group ID.');
  }
  const groupRefForAction = doc(db, collectionName, groupId);
  const memberRef = doc(groupRefForAction, 'members', uid);
  const writeLimitRef = doc(groupRefForAction, 'writeLimits', uid);

  if (action.type === 'membership') {
    const membership = await getDoc(memberRef);
    if (membership.exists() === action.joined) {
      return;
    }
    if (!action.joined && membership.data()?.role === 'owner') {
      throw new Error('The group owner cannot leave without transferring ownership.');
    }
    const batch = writeBatch(db);
    if (action.joined) {
      batch.set(memberRef, {
        uid,
        role: 'member',
        joinedAt: serverTimestamp(),
      });
    } else {
      batch.delete(memberRef);
    }
    batch.update(groupRefForAction, {
      memberCount: increment(action.joined ? 1 : -1),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return;
  }

  if (action.type === 'post') {
    const post = action.post;
    const postRef = doc(groupRefForAction, 'posts', post.id);
    const existing = await getDoc(postRef);
    if (existing.exists()) {
      if (existing.data().authorUid === uid) {
        return;
      }
      throw new Error('That post ID is already in use.');
    }
    const batch = writeBatch(db);
    batch.set(postRef, {
      authorUid: uid,
      author: authorName(profile),
      text: post.text.trim(),
      createdAt: serverTimestamp(),
    });
    batch.set(
      writeLimitRef,
      {
        uid,
        lastWriteAt: serverTimestamp(),
        kind: 'post',
        writeId: post.id,
        postId: null,
      },
      { merge: true },
    );
    batch.update(groupRefForAction, { updatedAt: serverTimestamp() });
    await batch.commit();
    return;
  }

  if (action.type === 'reply') {
    const reply = action.reply;
    const replyRef = doc(
      groupRefForAction,
      'posts',
      action.postId,
      'replies',
      reply.id,
    );
    const existing = await getDoc(replyRef);
    if (existing.exists()) {
      if (existing.data().authorUid === uid) {
        return;
      }
      throw new Error('That reply ID is already in use.');
    }
    const batch = writeBatch(db);
    batch.set(replyRef, {
      authorUid: uid,
      author: authorName(profile),
      text: reply.text.trim(),
      createdAt: serverTimestamp(),
    });
    batch.set(
      writeLimitRef,
      {
        uid,
        lastWriteAt: serverTimestamp(),
        kind: 'reply',
        writeId: reply.id,
        postId: action.postId,
      },
      { merge: true },
    );
    batch.update(groupRefForAction, { updatedAt: serverTimestamp() });
    await batch.commit();
  }
}
