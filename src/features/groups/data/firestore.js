import { firebaseServicesForUser } from '../../../shared/backend/firebase';

const collectionName = 'studyGroups';
const GROUP_PAGE_SIZE = 20;
const POST_PAGE_SIZE = 20;
const REPLY_PAGE_SIZE = 20;
const REPORT_PAGE_SIZE = 20;

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

function mapModerationReport(reportSnapshot) {
  const report = reportSnapshot.data();
  return {
    id: reportSnapshot.id,
    targetType: report.targetType,
    targetId: report.targetId,
    postId: report.postId,
    targetAuthor: report.targetAuthor,
    contentSnapshot: report.contentSnapshot,
    reason: report.reason,
    status: report.status,
    createdAt: isoTime(report.createdAt),
  };
}

function groupIdFromMembership(snapshot, uid) {
  const membership = snapshot.data();
  return membership.uid === uid && membership.groupId === snapshot.id
    ? snapshot.id
    : null;
}

function mapGroup(uid, groupSnapshot, memberGroupIds) {
  const groupId = groupSnapshot.id;
  const joined = memberGroupIds.has(groupId);
  const data = groupSnapshot.data();
  return {
    id: groupId,
    shared: true,
    ownerUid: data.ownerUid,
    isOwner: data.ownerUid === uid,
    name: data.name,
    subject: data.subject,
    members: data.memberCount,
    joined,
    meetup: data.meetup || '',
    meetupAt: data.meetupAt || undefined,
    updatedAt: data.updatedAt ? isoTime(data.updatedAt) : '',
    room: data.room,
    posts: [],
    postsLoaded: !joined,
  };
}

export function watchSharedGroups(uid, onGroups, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const {
    collection,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    startAfter,
  } = firestore;
  let active = true;
  const groupsById = new Map();
  let memberGroupIds = new Set();
  let groupOrder = [];
  const olderPages = [];
  let groupsLoaded = false;
  let membershipsLoaded = false;
  let groupsLive = true;
  let hasMoreGroups = false;
  let loadingMoreGroups = false;
  let cursor = null;
  let unsubscribeGroups = () => {};

  function publishGroups() {
    if (!active || !groupsLoaded || !membershipsLoaded) {
      return;
    }
    const groupIds = [...groupOrder];
    olderPages.forEach(page =>
      page.docs.forEach(snapshot => groupIds.push(snapshot.id)),
    );
    const seen = new Set();
    const groups = [];
    groupIds.forEach(groupId => {
      if (seen.has(groupId)) {
        return;
      }
      seen.add(groupId);
      const group = groupsById.get(groupId);
      if (!group) {
        return;
      }
      const joined = memberGroupIds.has(groupId);
      groups.push({ ...group, joined, postsLoaded: !joined });
    });
    onGroups(groups, { hasMoreGroups, groupsLive });
  }

  function handleError(error) {
    if (active) {
      onError(error);
    }
  }

  unsubscribeGroups = onSnapshot(
    query(
      collection(db, collectionName),
      orderBy('updatedAt', 'desc'),
      limit(GROUP_PAGE_SIZE),
    ),
    snapshot => {
      if (!active || !groupsLive) {
        return;
      }
      for (const change of snapshot.docChanges()) {
        if (change.type === 'removed') {
          groupsById.delete(change.doc.id);
        } else {
          groupsById.set(
            change.doc.id,
            mapGroup(uid, change.doc, memberGroupIds),
          );
        }
      }
      groupOrder = snapshot.docs.map(groupSnapshot => groupSnapshot.id);
      cursor = snapshot.docs.at(-1) ?? null;
      hasMoreGroups = snapshot.docs.length === GROUP_PAGE_SIZE;
      groupsLoaded = true;
      publishGroups();
    },
    handleError,
  );
  // This exact user path avoids a database-wide collection-group grant.
  const unsubscribeMemberships = onSnapshot(
    collection(db, 'users', uid, 'studyGroupMemberships'),
    snapshot => {
      if (!active) {
        return;
      }
      memberGroupIds = new Set(
        snapshot.docs.map(doc => groupIdFromMembership(doc, uid)).filter(Boolean),
      );
      membershipsLoaded = true;
      publishGroups();
    },
    handleError,
  );

  return {
    loadMoreGroups: async () => {
      if (!active || !hasMoreGroups || loadingMoreGroups) {
        return;
      }
      loadingMoreGroups = true;
      try {
        if (groupsLive) {
          groupsLive = false;
          unsubscribeGroups();
          unsubscribeGroups = () => {};
          publishGroups();
        }
        const pageCursor = olderPages.at(-1)?.cursor ?? cursor;
        if (!pageCursor) {
          hasMoreGroups = false;
          publishGroups();
          return;
        }
        const page = await getDocs(
          query(
            collection(db, collectionName),
            orderBy('updatedAt', 'desc'),
            startAfter(pageCursor),
            limit(GROUP_PAGE_SIZE),
          ),
        );
        if (!active) {
          return;
        }
        page.docs.forEach(snapshot => {
          if (!groupsById.has(snapshot.id)) {
            groupsById.set(
              snapshot.id,
              mapGroup(uid, snapshot, memberGroupIds),
            );
          }
        });
        olderPages.push({
          docs: page.docs,
          cursor: page.docs.at(-1) ?? pageCursor,
        });
        hasMoreGroups = page.docs.length === GROUP_PAGE_SIZE;
        publishGroups();
      } finally {
        loadingMoreGroups = false;
      }
    },
    unsubscribe: () => {
      active = false;
      unsubscribeGroups();
      unsubscribeMemberships();
    },
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
    where,
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
        where('moderationStatus', '==', 'visible'),
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
        where('moderationStatus', '==', 'visible'),
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
          where('moderationStatus', '==', 'visible'),
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
          where('moderationStatus', '==', 'visible'),
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

  getDoc(doc(db, 'users', uid, 'studyGroupMemberships', groupId))
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
          where('moderationStatus', '==', 'visible'),
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

export function watchSharedGroupReports(uid, groupId, onReports, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter } =
    firestore;
  const reportsRef = collection(
    doc(db, collectionName, groupId),
    'moderationReports',
  );
  let active = true;
  let reportsLive = true;
  let hasMoreReports = false;
  let loadingMore = false;
  let liveReports = [];
  let unsubscribe = () => {};
  const olderReports = new Map();

  function allReports() {
    return mergeSnapshotsDescending([...olderReports.values()], liveReports);
  }

  function publishReports() {
    if (!active) {
      return;
    }
    onReports(allReports().map(mapModerationReport), {
      hasMoreReports,
      reportsLive,
    });
  }

  function handleError(error) {
    if (active) {
      onError(error);
    }
  }

  function subscribeLatest() {
    unsubscribe = onSnapshot(
      query(reportsRef, orderBy('createdAt', 'desc'), limit(REPORT_PAGE_SIZE)),
      snapshot => {
        if (!active || !reportsLive) {
          return;
        }
        liveReports = snapshot.docs;
        hasMoreReports = snapshot.docs.length === REPORT_PAGE_SIZE;
        publishReports();
      },
      handleError,
    );
  }

  subscribeLatest();

  return {
    loadMoreReports: async () => {
      if (!active || !hasMoreReports || loadingMore) {
        return;
      }
      loadingMore = true;
      try {
        if (reportsLive) {
          reportsLive = false;
          unsubscribe();
          unsubscribe = () => {};
          publishReports();
        }
        const loaded = allReports();
        const cursor = loaded[loaded.length - 1];
        if (!cursor) {
          hasMoreReports = false;
          publishReports();
          return;
        }
        const page = await getDocs(
          query(
            reportsRef,
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(REPORT_PAGE_SIZE),
          ),
        );
        if (!active) {
          return;
        }
        page.docs.forEach(snapshot => olderReports.set(snapshot.id, snapshot));
        hasMoreReports = page.docs.length === REPORT_PAGE_SIZE;
        publishReports();
      } finally {
        loadingMore = false;
      }
    },
    refreshReports: () => {
      if (!active) {
        return;
      }
      unsubscribe();
      olderReports.clear();
      liveReports = [];
      hasMoreReports = false;
      reportsLive = true;
      unsubscribe = () => {};
      subscribeLatest();
    },
    unsubscribe: () => {
      active = false;
      unsubscribe();
      olderReports.clear();
      liveReports = [];
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
    batch.set(doc(db, 'users', uid, 'studyGroupMemberships', group.id), {
      uid,
      groupId: group.id,
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
  const memberRef = doc(
    db,
    'users',
    uid,
    'studyGroupMemberships',
    groupId,
  );
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
        groupId,
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
      moderationStatus: 'visible',
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
      moderationStatus: 'visible',
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
    return;
  }

  if (action.type === 'report') {
    const report = action.report;
    if (!report || typeof report.id !== 'string' || !report.id) {
      throw new Error('The report has no ID.');
    }
    const reportRef = doc(
      groupRefForAction,
      'moderationReports',
      report.id,
    );
    const existing = await getDoc(reportRef);
    if (existing.exists()) {
      return;
    }

    const batch = writeBatch(db);
    batch.set(reportRef, {
      targetType: report.targetType,
      targetId: report.targetId,
      postId: report.postId ?? null,
      targetAuthor: report.targetAuthor,
      contentSnapshot: report.contentSnapshot,
      reason: report.reason,
      status: 'open',
      createdAt: serverTimestamp(),
      resolvedAt: null,
    });
    batch.set(
      writeLimitRef,
      {
        uid,
        lastWriteAt: serverTimestamp(),
        kind: 'report',
        writeId: report.id,
        postId: report.postId ?? null,
      },
      { merge: true },
    );
    await batch.commit();
    return;
  }

  if (action.type === 'moderateReport') {
    const reportRef = doc(
      groupRefForAction,
      'moderationReports',
      action.reportId,
    );
    const reportSnapshot = await getDoc(reportRef);
    if (!reportSnapshot.exists()) {
      throw new Error('This report is no longer available.');
    }
    const report = reportSnapshot.data();
    const resolution = action.resolution;
    if (
      !['dismissed', 'hidden', 'restored'].includes(resolution) ||
      (resolution === 'restored' && report.status !== 'hidden') ||
      (resolution !== 'restored' && report.status !== 'open')
    ) {
      return;
    }

    const batch = writeBatch(db);
    if (resolution === 'hidden' || resolution === 'restored') {
      const targetRef =
        report.targetType === 'post'
          ? doc(groupRefForAction, 'posts', report.targetId)
          : report.targetType === 'chatMessage'
            ? doc(groupRefForAction, 'chatMessages', report.targetId)
            : doc(
                groupRefForAction,
                'posts',
                report.postId,
                'replies',
                report.targetId,
              );
      batch.update(targetRef, {
        moderationStatus: resolution === 'hidden' ? 'hidden' : 'visible',
        moderatedAt: serverTimestamp(),
      });
    }
    batch.update(reportRef, {
      status: resolution,
      resolvedAt: serverTimestamp(),
    });
    await batch.commit();
  }
}
