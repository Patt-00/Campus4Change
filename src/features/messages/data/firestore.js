import { firebaseServicesForUser } from '../../../shared/backend/firebase';

export const SHARED_MESSAGE_PAGE_SIZE = 50;

function messageCollection(db, firestore, conversation) {
  const { collection } = firestore;
  if (conversation.kind === 'group') {
    return collection(db, 'studyGroups', conversation.groupId, 'chatMessages');
  }
  if (conversation.kind === 'booking') {
    return collection(
      db,
      'tutorBookings',
      conversation.bookingId,
      'chatMessages',
    );
  }
  throw new Error('This chat is not supported.');
}

function isoTime(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return '';
}

function mapMessage(snapshot, uid) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    senderUid: data.senderUid,
    senderName: data.senderName,
    text: data.text,
    sentAt: isoTime(data.sentAt),
    mine: data.senderUid === uid,
  };
}

export function watchSharedMessages(uid, conversation, onMessages, onError) {
  if (!conversation || conversation.delivery !== 'shared') {
    throw new Error('Choose a shared conversation.');
  }
  const { db, firestore } = firebaseServicesForUser(uid);
  const { getDocs, limit, onSnapshot, orderBy, query, startAfter, where } =
    firestore;
  const constraints = [];
  if (conversation.kind === 'group') {
    constraints.push(where('moderationStatus', '==', 'visible'));
  }
  constraints.push(orderBy('sentAt', 'desc'), limit(SHARED_MESSAGE_PAGE_SIZE));
  const messagesRef = messageCollection(db, firestore, conversation);
  let active = true;
  let firstSnapshot = true;
  let loadedOlderMessages = false;
  let liveMessages = [];
  let hasMoreMessages = false;
  let loadingOlderMessages = false;
  const olderMessages = new Map();
  const pinnedMessages = new Map();

  function allMessagesDescending() {
    const unique = new Map();
    [...olderMessages.values(), ...pinnedMessages.values(), ...liveMessages]
      .forEach(snapshot => unique.set(snapshot.id, snapshot));
    return [...unique.values()].sort((left, right) => {
      const leftTime = messageMillis(left);
      const rightTime = messageMillis(right);
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return right.id.localeCompare(left.id);
    });
  }

  function publish() {
    if (!active) {
      return;
    }
    onMessages(
      allMessagesDescending().reverse().map(snapshot => mapMessage(snapshot, uid)),
      { hasMoreMessages, loadingOlderMessages },
    );
  }

  const unsubscribe = onSnapshot(
    query(messagesRef, ...constraints),
    snapshot => {
      if (!active) {
        return;
      }
      if (!firstSnapshot && olderMessages.size > 0) {
        liveMessages.forEach(message => pinnedMessages.set(message.id, message));
      }
      firstSnapshot = false;
      liveMessages = snapshot.docs;
      if (!loadedOlderMessages && snapshot.docs.length === SHARED_MESSAGE_PAGE_SIZE) {
        hasMoreMessages = true;
      }
      publish();
    },
    error => {
      if (active) {
        onError(error);
      }
    },
  );

  return {
    unsubscribe: () => {
      active = false;
      unsubscribe();
      olderMessages.clear();
      pinnedMessages.clear();
      liveMessages = [];
    },
    loadMoreMessages: async () => {
      if (!active || !hasMoreMessages || loadingOlderMessages) {
        return;
      }
      loadingOlderMessages = true;
      publish();
      try {
        const loaded = allMessagesDescending();
        const cursor = loaded.at(-1);
        if (!cursor) {
          loadedOlderMessages = true;
          hasMoreMessages = false;
          return;
        }
        const page = await getDocs(
          query(
            messagesRef,
            ...constraints.slice(0, -1),
            startAfter(cursor),
            limit(SHARED_MESSAGE_PAGE_SIZE),
          ),
        );
        if (!active) {
          return;
        }
        page.docs.forEach(message => olderMessages.set(message.id, message));
        loadedOlderMessages = true;
        hasMoreMessages = page.docs.length === SHARED_MESSAGE_PAGE_SIZE;
      } catch (error) {
        if (active) {
          onError(error);
        }
      } finally {
        loadingOlderMessages = false;
        publish();
      }
    },
  };
}

function messageMillis(snapshot) {
  const value = snapshot.data().sentAt;
  if (value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function sendSharedMessage(uid, senderName, conversation, text) {
  if (!conversation || conversation.delivery !== 'shared' || !conversation.canSend) {
    throw new Error('This conversation is not accepting messages.');
  }
  const trimmedText = String(text || '').trim();
  if (!trimmedText || trimmedText.length > 2000) {
    throw new Error('Messages must contain 1 to 2,000 characters.');
  }

  const { db, firestore } = firebaseServicesForUser(uid);
  const { doc, serverTimestamp, writeBatch } = firestore;
  const messages = messageCollection(db, firestore, conversation);
  const messageRef = doc(messages);
  const batch = writeBatch(db);
  const message = {
    senderUid: uid,
    text: trimmedText,
    sentAt: serverTimestamp(),
  };

  if (conversation.kind === 'group') {
    const groupRef = doc(db, 'studyGroups', conversation.groupId);
    message.senderName = String(senderName || 'Student').trim().slice(0, 100);
    message.moderationStatus = 'visible';
    batch.set(messageRef, message);
    batch.set(
      doc(groupRef, 'writeLimits', uid),
      {
        uid,
        lastWriteAt: serverTimestamp(),
        kind: 'chat',
        writeId: messageRef.id,
        postId: null,
      },
      { merge: true },
    );
    batch.update(groupRef, { updatedAt: serverTimestamp() });
  } else if (conversation.kind === 'booking') {
    const bookingRef = doc(db, 'tutorBookings', conversation.bookingId);
    message.senderName = String(senderName || 'Student').trim().slice(0, 100);
    batch.set(messageRef, message);
    batch.set(
      doc(bookingRef, 'chatWriteLimits', uid),
      {
        uid,
        lastSentAt: serverTimestamp(),
        messageId: messageRef.id,
      },
      { merge: true },
    );
  } else {
    throw new Error('This chat is not supported.');
  }

  await batch.commit();
  return messageRef.id;
}
