import { firebaseServicesForUser } from '../../../shared/backend/firebase';
import { getAvatarPreset } from '../../../shared/data/avatarPresets';

const PROFILE_PAGE_SIZE = 20;
const BOOKING_PAGE_SIZE = 100;
const SLOT_BUCKET_MS = 30 * 60 * 1000;

function isoTime(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return '';
}

function mapTutor(snapshot, uid) {
  const profile = snapshot.data();
  return {
    id: snapshot.id,
    shared: true,
    ownerUid: profile.uid,
    own: profile.uid === uid,
    name: profile.name,
    course: profile.course,
    year: profile.year,
    avatarId: getAvatarPreset(profile.avatarId).id,
    subjects: profile.subjects,
    rating: 0,
    sessions: 0,
    response: 0,
    available: true,
    availability: 'Accepting session requests',
    about: profile.bio,
    updatedAt: isoTime(profile.updatedAt),
  };
}

function appStatus(status) {
  return {
    pending: 'Pending',
    accepted: 'Upcoming',
    declined: 'Declined',
    cancelled: 'Cancelled',
    completed: 'Completed',
  }[status] || 'Needs review';
}

export function mapTutorBooking(snapshot, uid) {
  const booking = snapshot.data();
  return {
    id: snapshot.id,
    shared: true,
    incoming: booking.tutorUid === uid,
    tutorId: booking.tutorUid,
    tutorName: booking.tutorName,
    studentUid: booking.studentUid,
    studentName: booking.studentName,
    subject: booking.subject,
    startsAt: isoTime(booking.startsAt),
    slotBuckets: booking.slotBuckets,
    note: booking.note,
    status: appStatus(booking.status),
    remoteStatus: booking.status,
    createdAt: isoTime(booking.createdAt),
    updatedAt: isoTime(booking.updatedAt),
  };
}

export function watchTutorDirectory(uid, onTutors, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } = firestore;
  let active = true;
  let live = true;
  let loadingMore = false;
  let hasMore = false;
  let cursor = null;
  let liveDocs = [];
  const olderDocs = new Map();
  let stopLive = () => {};

  function publish() {
    if (!active) return;
    const docs = new Map(olderDocs);
    liveDocs.forEach(snapshot => docs.set(snapshot.id, snapshot));
    const tutors = [...docs.values()]
      .map(snapshot => mapTutor(snapshot, uid))
      .sort((a, b) => a.name.localeCompare(b.name));
    onTutors(tutors, { hasMore, loadingMore, live });
  }

  function pauseLive() {
    if (live) {
      live = false;
      stopLive();
      stopLive = () => {};
    }
  }

  stopLive = onSnapshot(
    query(
      collection(db, 'tutorProfiles'),
      where('visibility', '==', 'listed'),
      orderBy('updatedAt', 'desc'),
      limit(PROFILE_PAGE_SIZE),
    ),
    snapshot => {
      if (!active || !live) return;
      liveDocs = snapshot.docs;
      cursor = snapshot.docs.at(-1) ?? cursor;
      hasMore = snapshot.docs.length === PROFILE_PAGE_SIZE;
      publish();
    },
    error => active && onError(error),
  );

  return {
    unsubscribe: () => {
      active = false;
      stopLive();
    },
    loadMore: async () => {
      if (!active || !hasMore || loadingMore) return;
      loadingMore = true;
      pauseLive();
      publish();
      try {
        const page = await getDocs(query(
          collection(db, 'tutorProfiles'),
          where('visibility', '==', 'listed'),
          orderBy('updatedAt', 'desc'),
          startAfter(cursor),
          limit(PROFILE_PAGE_SIZE),
        ));
        if (!active) return;
        page.docs.forEach(snapshot => olderDocs.set(snapshot.id, snapshot));
        cursor = page.docs.at(-1) ?? cursor;
        hasMore = page.docs.length === PROFILE_PAGE_SIZE;
      } catch (error) {
        if (active) onError(error);
      } finally {
        loadingMore = false;
        publish();
      }
    },
  };
}

export function watchTutorBookings(uid, onBookings, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } = firestore;
  let active = true;
  const bookings = collection(db, 'tutorBookings');
  let studentPage;
  let tutorPage;

  function publish() {
    if (!active || !studentPage?.loaded || !tutorPage?.loaded) {
      return;
    }
    const snapshots = new Map([
      ...studentPage.docs().map(snapshot => [snapshot.id, snapshot]),
      ...tutorPage.docs().map(snapshot => [snapshot.id, snapshot]),
    ]);
    const mergedBookings = [...snapshots.values()]
      .map(docSnapshot => mapTutorBooking(docSnapshot, uid))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    onBookings(mergedBookings, {
      hasMore: studentPage.hasMore || tutorPage.hasMore,
      loadingMore: studentPage.loadingMore || tutorPage.loadingMore,
      live: studentPage.live && tutorPage.live,
    });
  }

  function watchParticipant(field) {
    let live = true;
    let loadingMore = false;
    let hasMore = false;
    let loaded = false;
    let cursor = null;
    let liveDocs = [];
    const olderDocs = new Map();
    let stopLive = () => {};
    const page = {
      get hasMore() { return hasMore; },
      get loadingMore() { return loadingMore; },
      get live() { return live; },
      get loaded() { return loaded; },
      docs: () => [...new Map([
        ...olderDocs,
        ...liveDocs.map(snapshot => [snapshot.id, snapshot]),
      ]).values()],
      pause: () => {
        if (!live) return;
        live = false;
        stopLive();
        stopLive = () => {};
      },
      unsubscribe: () => {
        live = false;
        stopLive();
      },
      loadMore: async () => {
        if (!active || !hasMore || loadingMore) return;
        loadingMore = true;
        page.pause();
        publish();
        try {
          const nextPage = await getDocs(query(
            bookings,
            where(field, '==', uid),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(BOOKING_PAGE_SIZE),
          ));
          if (!active) return;
          nextPage.docs.forEach(snapshot => olderDocs.set(snapshot.id, snapshot));
          cursor = nextPage.docs.at(-1) ?? cursor;
          hasMore = nextPage.docs.length === BOOKING_PAGE_SIZE;
        } catch (error) {
          if (active) onError(error);
        } finally {
          loadingMore = false;
          publish();
        }
      },
    };
    stopLive = onSnapshot(
      query(bookings, where(field, '==', uid), orderBy('createdAt', 'desc'), limit(BOOKING_PAGE_SIZE)),
      snapshot => {
        if (!active || !live) return;
        liveDocs = snapshot.docs;
        cursor = snapshot.docs.at(-1) ?? cursor;
        hasMore = snapshot.docs.length === BOOKING_PAGE_SIZE;
        loaded = true;
        publish();
      },
      error => active && onError(error),
    );
    return page;
  }

  studentPage = watchParticipant('studentUid');
  tutorPage = watchParticipant('tutorUid');
  return {
    unsubscribe: () => {
      active = false;
      studentPage.unsubscribe();
      tutorPage.unsubscribe();
    },
    loadMore: async () => {
      await Promise.all([studentPage.loadMore(), tutorPage.loadMore()]);
    },
  };
}

export async function saveTutorProfile(uid, profile) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { doc, serverTimestamp, setDoc } = firestore;
  const subjectsByKey = new Map();
  for (const value of Array.isArray(profile.subjects) ? profile.subjects : []) {
    const subject = String(value).trim().replace(/\s+/g, ' ').slice(0, 80);
    const key = subject.toLowerCase();
    if (subject && !subjectsByKey.has(key)) {
      subjectsByKey.set(key, subject);
    }
  }
  const subjects = [...subjectsByKey.values()].slice(0, 10);
  const name = String(profile.name || 'Student').trim().slice(0, 100);
  const bio = String(profile.bio || '').trim().slice(0, 1000);
  if (!subjects.length || bio.length < 10) {
    throw new Error('Add a subject and an introduction of at least 10 characters.');
  }
  await setDoc(doc(db, 'tutorProfiles', uid), {
    uid,
    name,
    course: String(profile.course || '').trim().slice(0, 100),
    year: String(profile.year || '').trim().slice(0, 40),
    avatarId: getAvatarPreset(profile.avatarId).id,
    subjects,
    bio,
    visibility: 'listed',
    updatedAt: serverTimestamp(),
  });
}

export async function removeTutorProfile(uid) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { deleteDoc, doc } = firestore;
  await deleteDoc(doc(db, 'tutorProfiles', uid));
}

export async function createTutorBooking(uid, studentName, tutor, subject, startsAt, note) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { Timestamp, collection, doc, serverTimestamp, writeBatch } = firestore;
  if (!tutor?.shared || !tutor.id || tutor.id === uid) {
    throw new Error('Choose a listed tutor.');
  }
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
    throw new Error('Choose a future date and time.');
  }
  if (start.getTime() % SLOT_BUCKET_MS !== 0) {
    throw new Error('Choose a time on the hour or half-hour.');
  }
  if (!tutor.subjects?.includes(subject)) {
    throw new Error('Choose one of this tutor’s listed subjects.');
  }
  const firstBucket = Math.floor(start.getTime() / SLOT_BUCKET_MS);
  const slotBuckets = [firstBucket, firstBucket + 1];
  const booking = {
    studentUid: uid,
    tutorUid: tutor.id,
    studentName: String(studentName || 'Student').trim().slice(0, 100),
    tutorName: String(tutor.name || 'Campus tutor').trim().slice(0, 100),
    subject: String(subject).trim().slice(0, 100),
    startsAt: Timestamp.fromDate(start),
    slotBuckets,
    note: String(note || '').trim().slice(0, 2000),
    status: 'pending',
    participantUids: [uid, tutor.id],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const bookingRef = doc(collection(db, 'tutorBookings'));
  const batch = writeBatch(db);
  batch.set(bookingRef, booking);
  batch.set(doc(db, 'tutorBookingLimits', uid), {
    uid,
    lastRequestAt: serverTimestamp(),
    bookingId: bookingRef.id,
  });
  await batch.commit();
  return {
    id: bookingRef.id,
    shared: true,
    incoming: false,
    tutorId: tutor.id,
    tutorName: booking.tutorName,
    studentUid: uid,
    studentName: booking.studentName,
    subject: booking.subject,
    startsAt: start.toISOString(),
    slotBuckets,
    note: booking.note,
    status: 'Pending',
    remoteStatus: 'pending',
  };
}

export async function updateTutorBookingStatus(uid, bookingId, status) {
  const remoteStatus = {
    accept: 'accepted',
    decline: 'declined',
    cancel: 'cancelled',
    complete: 'completed',
  }[status];
  if (!remoteStatus) {
    throw new Error('That session update is not supported.');
  }
  const { db, firestore } = firebaseServicesForUser(uid);
  const { doc, runTransaction, serverTimestamp } = firestore;
  const bookingRef = doc(db, 'tutorBookings', bookingId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists()) {
      throw new Error('This session request is no longer available.');
    }
    const booking = snapshot.data();
    if (
      !Array.isArray(booking.slotBuckets) ||
      booking.slotBuckets.length !== 2 ||
      !booking.slotBuckets.every(Number.isSafeInteger) ||
      booking.slotBuckets[1] !== booking.slotBuckets[0] + 1
    ) {
      throw new Error('The reserved session time is invalid. Refresh and retry.');
    }
    const tutorSlotRefs = booking.slotBuckets.map(bucket =>
      doc(db, 'sessionSlots', booking.tutorUid, 'slots', String(bucket)),
    );
    const studentSlotRefs = booking.slotBuckets.map(bucket =>
      doc(db, 'sessionSlots', booking.studentUid, 'slots', String(bucket)),
    );
    const slotRefs = [...tutorSlotRefs, ...studentSlotRefs];

    if (status === 'accept') {
      if (booking.status !== 'pending') {
        throw new Error('This request has already been answered.');
      }
      const occupiedSlots = await Promise.all(
        tutorSlotRefs.map(slotRef => transaction.get(slotRef)),
      );
      if (occupiedSlots.some(slot => slot.exists())) {
        throw new Error('This time was just accepted for another request.');
      }
      // Student slots are blind writes: another tutor cannot read that schedule.
      // Rules permit creates only and require all four matching locks atomically.
      for (let index = 0; index < slotRefs.length; index += 1) {
        transaction.set(slotRefs[index], {
          bookingId,
          tutorUid: booking.tutorUid,
          studentUid: booking.studentUid,
          slotBucket: booking.slotBuckets[index % booking.slotBuckets.length],
          startsAt: booking.startsAt,
          createdAt: serverTimestamp(),
        });
      }
    } else if (
      booking.status === 'accepted' &&
      ['cancel', 'complete'].includes(status)
    ) {
      if (status === 'complete') {
        const startsAt = booking.startsAt?.toDate?.();
        const startTime = startsAt instanceof Date ? startsAt.getTime() : Number.NaN;
        if (!Number.isFinite(startTime) || Date.now() < startTime) {
          throw new Error(
            'A session can be completed only after its scheduled start time.',
          );
        }
      }
      const occupiedSlots = await Promise.all(
        tutorSlotRefs.map(slotRef => transaction.get(slotRef)),
      );
      if (
        occupiedSlots.some(
          slot => !slot.exists() || slot.data().bookingId !== bookingId,
        )
      ) {
        throw new Error('The session time is no longer reserved. Refresh and retry.');
      }
      slotRefs.forEach(slotRef => transaction.delete(slotRef));
    } else if (
      booking.status !== 'pending' ||
      !['decline', 'cancel'].includes(status)
    ) {
      throw new Error('This request can no longer be changed.');
    }

    transaction.update(bookingRef, {
      status: remoteStatus,
      updatedAt: serverTimestamp(),
    });
  });
}
