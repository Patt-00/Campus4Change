import { firebaseServicesForUser } from '../../../shared/backend/firebase';

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
  const { collection, limit, onSnapshot, orderBy, query, where } = firestore;
  return onSnapshot(
    query(
      collection(db, 'tutorProfiles'),
      where('visibility', '==', 'listed'),
      orderBy('updatedAt', 'desc'),
      limit(PROFILE_PAGE_SIZE),
    ),
    snapshot => {
      const tutors = snapshot.docs
        .map(docSnapshot => mapTutor(docSnapshot, uid))
        .sort((a, b) => a.name.localeCompare(b.name));
      onTutors(tutors, { hasMore: snapshot.size === PROFILE_PAGE_SIZE });
    },
    onError,
  );
}

export function watchTutorBookings(uid, onBookings, onError) {
  const { db, firestore } = firebaseServicesForUser(uid);
  const { collection, limit, onSnapshot, query, where } = firestore;
  const studentSnapshots = new Map();
  const tutorSnapshots = new Map();
  let studentLoaded = false;
  let tutorLoaded = false;

  function publish() {
    if (!studentLoaded || !tutorLoaded) {
      return;
    }
    const snapshots = new Map([...studentSnapshots, ...tutorSnapshots]);
    const bookings = [...snapshots.values()]
      .map(docSnapshot => mapTutorBooking(docSnapshot, uid))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    onBookings(bookings, {
      hasMore:
        studentSnapshots.size === BOOKING_PAGE_SIZE ||
        tutorSnapshots.size === BOOKING_PAGE_SIZE,
    });
  }

  const bookings = collection(db, 'tutorBookings');
  const stopAsStudent = onSnapshot(
    query(bookings, where('studentUid', '==', uid), limit(BOOKING_PAGE_SIZE)),
    snapshot => {
      studentSnapshots.clear();
      snapshot.docs.forEach(docSnapshot =>
        studentSnapshots.set(docSnapshot.id, docSnapshot),
      );
      studentLoaded = true;
      publish();
    },
    onError,
  );
  const stopAsTutor = onSnapshot(
    query(bookings, where('tutorUid', '==', uid), limit(BOOKING_PAGE_SIZE)),
    snapshot => {
      tutorSnapshots.clear();
      snapshot.docs.forEach(docSnapshot =>
        tutorSnapshots.set(docSnapshot.id, docSnapshot),
      );
      tutorLoaded = true;
      publish();
    },
    onError,
  );
  return () => {
    stopAsStudent();
    stopAsTutor();
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
    const slotRefs = booking.slotBuckets.map(bucket =>
      doc(db, 'tutorSlots', booking.tutorUid, 'slots', String(bucket)),
    );

    if (status === 'accept') {
      if (booking.status !== 'pending') {
        throw new Error('This request has already been answered.');
      }
      const occupiedSlots = await Promise.all(
        slotRefs.map(slotRef => transaction.get(slotRef)),
      );
      if (occupiedSlots.some(slot => slot.exists())) {
        throw new Error('This time was just accepted for another request.');
      }
      for (let index = 0; index < slotRefs.length; index += 1) {
        transaction.set(slotRefs[index], {
          bookingId,
          tutorUid: booking.tutorUid,
          studentUid: booking.studentUid,
          slotBucket: booking.slotBuckets[index],
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
        slotRefs.map(slotRef => transaction.get(slotRef)),
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
