import { NativeModules, Platform } from 'react-native';
import {
  firebaseConfig,
  firebaseEmulatorHost,
  isFirebaseConfigured,
} from './firebaseConfig';

export const firebaseEnabled = isFirebaseConfigured();
let sdk;

function firebaseSdk() {
  if (!sdk) {
    sdk = {
      app: require('firebase/app'),
      auth: require('firebase/auth'),
      firestore: require('firebase/firestore'),
    };
  }
  return sdk;
}

function secureAuthStorage() {
  if (Platform.OS !== 'android' || !NativeModules.CampusStorage) {
    throw new Error(
      'Secure Firebase sign-in storage is available in the Android app.',
    );
  }

  const storage = NativeModules.CampusStorage;
  return {
    getItem: key => storage.getFirebaseAuthValue(key),
    setItem: (key, value) => storage.setFirebaseAuthValue(key, value),
    removeItem: key => storage.removeFirebaseAuthValue(key),
  };
}

let auth = null;
let db = null;
const pendingStudentIds = new Map();

if (firebaseEnabled) {
  const { app: appSdk, auth: authSdk, firestore: firestoreSdk } = firebaseSdk();
  const app = appSdk.getApps().length
    ? appSdk.getApp()
    : appSdk.initializeApp(firebaseConfig);
  try {
    auth = authSdk.initializeAuth(app, {
      persistence: authSdk.getReactNativePersistence(secureAuthStorage()),
    });
  } catch (error) {
    if (error?.code !== 'auth/already-initialized') {
      throw error;
    }
    auth = authSdk.getAuth(app);
  }
  db = firestoreSdk.getFirestore(app);
  if (firebaseEmulatorHost.trim()) {
    if (!__DEV__) {
      throw new Error('Firebase emulators must never be enabled in a release app.');
    }
    authSdk.connectAuthEmulator(
      auth,
      `http://${firebaseEmulatorHost}:9099`,
      { disableWarnings: true },
    );
    firestoreSdk.connectFirestoreEmulator(db, firebaseEmulatorHost, 8080);
  }
}

export function watchFirebaseUser(onUser, onError) {
  if (!auth) {
    return () => {};
  }
  return firebaseSdk().auth.onAuthStateChanged(
    auth,
    user =>
      onUser(
        user
          ? { ...accountFromFirebaseUser(user), uid: user.uid }
          : null,
      ),
    onError,
  );
}

export async function firebaseSignIn(email, password) {
  ensureFirebaseEnabled();
  try {
    const result = await firebaseSdk().auth.signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    return accountFromFirebaseUser(result.user);
  } catch (error) {
    throw readableAuthError(error);
  }
}

export async function firebaseSignUp(name, email, studentId, password) {
  ensureFirebaseEnabled();
  try {
    const { createUserWithEmailAndPassword, updateProfile, deleteUser } =
      firebaseSdk().auth;
    const result = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    pendingStudentIds.set(result.user.uid, studentId.trim());
    try {
      await updateProfile(result.user, { displayName: name.trim() });
    } catch (error) {
      pendingStudentIds.delete(result.user.uid);
      await deleteUser(result.user).catch(() => {});
      throw error;
    }
    return {
      ...accountFromFirebaseUser(result.user),
      studentId: studentId.trim(),
    };
  } catch (error) {
    throw readableAuthError(error);
  }
}

export async function firebasePasswordReset(email) {
  ensureFirebaseEnabled();
  try {
    await firebaseSdk().auth.sendPasswordResetEmail(
      auth,
      email.trim().toLowerCase(),
    );
  } catch (error) {
    throw readableAuthError(error);
  }
}

export function firebaseSignOut() {
  return auth ? firebaseSdk().auth.signOut(auth) : Promise.resolve();
}

export function firestoreAvailable() {
  return Boolean(db && auth?.currentUser);
}

export function firebaseServicesForUser(uid) {
  if (!db || auth?.currentUser?.uid !== uid) {
    throw new Error('Sign in to use Firebase data.');
  }
  return { db, firestore: firebaseSdk().firestore };
}

export async function loadCloudState(uid) {
  if (!db || auth?.currentUser?.uid !== uid) {
    throw new Error('Sign in to load your Firebase account data.');
  }
  const { doc, getDoc } = firebaseSdk().firestore;
  const snapshot = await getDoc(doc(db, 'users', uid, 'private', 'state'));
  return snapshot.exists() ? snapshot.data().state : null;
}

export async function saveCloudState(uid, state) {
  if (!db || auth?.currentUser?.uid !== uid) {
    throw new Error('Sign in to save your Firebase account data.');
  }
  if (state?.profile?.id !== uid || state.version !== 1) {
    throw new Error('The account data is not valid for this Firebase user.');
  }

  const serialized = JSON.stringify(state);
  // Firestore documents are limited to 1 MiB. This conservative cap leaves
  // room for field names and Firestore's document encoding overhead.
  if (serialized.length > 250_000) {
    throw new Error(
      'This account has too much saved data for the current cloud record.',
    );
  }

  const { doc, serverTimestamp, setDoc } = firebaseSdk().firestore;
  await setDoc(doc(db, 'users', uid, 'private', 'state'), {
    state,
    updatedAt: serverTimestamp(),
  });
}

export function ensureFirebaseEnabled() {
  if (!firebaseEnabled) {
    throw new Error(
      'Firebase is not configured. Add your Firebase app settings in src/shared/backend/firebaseConfig.js.',
    );
  }
}

function accountFromFirebaseUser(user) {
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Student',
    email: user.email || '',
    studentId: pendingStudentIds.get(user.uid) || '',
  };
}

function readableAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already uses that email.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled. Contact your instructor.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'Could not connect. Check your internet and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase Console.',
  };
  const message = messages[error?.code];
  return new Error(message || 'Firebase could not complete sign-in. Try again.');
}
