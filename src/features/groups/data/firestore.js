import { firebaseServicesForUser } from '../../../shared/backend/firebase';

const collectionName = 'studyGroups';

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

function mapPost(postSnapshot, replies = []) {
  const post = postSnapshot.data();
  return {
    id: postSnapshot.id,
    author: post.author,
    authorUid: post.authorUid,
    text: post.text,
    createdAt: isoTime(post.createdAt),
    replies,
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

export function watchSharedGroupPosts(uid, groupId, onPosts, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, doc, getDoc, onSnapshot, orderBy, query } = firestore;
  const groupRef = doc(db, collectionName, groupId);
  let active = true;
  let unsubscribePosts = () => {};
  const replySubscriptions = new Map();
  const repliesByPost = new Map();
  let postsInOrder = [];

  function publishPosts() {
    if (!active) {
      return;
    }
    onPosts(
      postsInOrder.map(snapshot =>
        mapPost(snapshot, repliesByPost.get(snapshot.id) ?? []),
      ),
    );
  }

  function handleError(error) {
    if (active) {
      onError(error);
    }
  }

  getDoc(doc(groupRef, 'members', uid))
    .then(membership => {
      if (!active) {
        return;
      }
      if (!membership.exists()) {
        onPosts([]);
        return;
      }

      unsubscribePosts = onSnapshot(
        query(collection(groupRef, 'posts'), orderBy('createdAt', 'desc')),
        postsSnapshot => {
          postsInOrder = postsSnapshot.docs;
          const postIds = new Set(postsInOrder.map(snapshot => snapshot.id));
          for (const [postId, unsubscribe] of replySubscriptions) {
            if (!postIds.has(postId)) {
              unsubscribe();
              replySubscriptions.delete(postId);
              repliesByPost.delete(postId);
            }
          }
          for (const snapshot of postsInOrder) {
            if (replySubscriptions.has(snapshot.id)) {
              continue;
            }
            repliesByPost.set(snapshot.id, []);
            const unsubscribe = onSnapshot(
              query(
                collection(snapshot.ref, 'replies'),
                orderBy('createdAt', 'asc'),
              ),
              repliesSnapshot => {
                repliesByPost.set(
                  snapshot.id,
                  repliesSnapshot.docs.map(mapReply),
                );
                publishPosts();
              },
              handleError,
            );
            replySubscriptions.set(snapshot.id, unsubscribe);
          }
          publishPosts();
        },
        handleError,
      );
    })
    .catch(handleError);

  return () => {
    active = false;
    unsubscribePosts();
    replySubscriptions.forEach(unsubscribe => unsubscribe());
    replySubscriptions.clear();
    repliesByPost.clear();
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
    batch.update(groupRefForAction, { updatedAt: serverTimestamp() });
    await batch.commit();
  }
}
