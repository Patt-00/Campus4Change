import { NativeModules, Platform } from 'react-native';
import { initializeAndroidAppCheck } from './appCheck';
import {
  firebaseConfig,
  firebaseEmulatorHost,
  googleWebClientId,
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
const pendingSignUpsByEmail = new Map();

if (firebaseEnabled) {
  const { app: appSdk, auth: authSdk, firestore: firestoreSdk } = firebaseSdk();
  const webFirebaseConfig = { ...firebaseConfig };
  delete webFirebaseConfig.androidApiKey;
  delete webFirebaseConfig.androidAppId;
  const app = appSdk.getApps().length
    ? appSdk.getApp()
    : appSdk.initializeApp(webFirebaseConfig);
  initializeAndroidAppCheck(app, firebaseConfig);
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
    const { getIdToken, reload, signInWithEmailAndPassword } =
      firebaseSdk().auth;
    const result = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    await reload(result.user);
    await getIdToken(result.user, true);
    return accountFromFirebaseUser(result.user);
  } catch (error) {
    throw readableAuthError(error);
  }
}

export function firebaseGoogleSignInAvailable() {
  return Boolean(
    firebaseEnabled &&
      Platform.OS === 'android' &&
      typeof googleWebClientId === 'string' &&
      googleWebClientId.trim() &&
      NativeModules.CampusGoogleSignIn?.signIn,
  );
}

export async function firebaseGoogleSignIn() {
  ensureFirebaseEnabled();
  if (!firebaseGoogleSignInAvailable()) {
    throw new Error('Google sign-in is not configured on this Android build.');
  }

  try {
    const idToken = await NativeModules.CampusGoogleSignIn.signIn(
      googleWebClientId,
    );
    if (!idToken) {
      return null;
    }
    const { GoogleAuthProvider, getIdToken, reload, signInWithCredential } =
      firebaseSdk().auth;
    const result = await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(idToken),
    );
    await reload(result.user);
    await getIdToken(result.user, true);
    return accountFromFirebaseUser(result.user);
  } catch (error) {
    if (error?.code === 'GOOGLE_SIGN_IN_CANCELED') {
      return null;
    }
    if (__DEV__ && typeof error?.code === 'string') {
      // Keep debug logs useful without writing tokens or provider messages.
      console.warn('[Campus4Change] Google sign-in failed:', error.code);
    }
    throw readableGoogleAuthError(error);
  }
}

export async function firebaseSignUp(name, email, studentId, password) {
  ensureFirebaseEnabled();
  const normalizedEmail = email.trim().toLowerCase();
  const pendingAccount = {
    name: name.trim(),
    studentId: studentId.trim(),
  };
  pendingSignUpsByEmail.set(normalizedEmail, pendingAccount);
  try {
    const {
      createUserWithEmailAndPassword,
      deleteUser,
      sendEmailVerification,
      updateProfile,
    } = firebaseSdk().auth;
    const result = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    pendingStudentIds.set(result.user.uid, pendingAccount.studentId);
    try {
      await updateProfile(result.user, { displayName: pendingAccount.name });
    } catch (error) {
      pendingStudentIds.delete(result.user.uid);
      await deleteUser(result.user).catch(() => {});
      throw error;
    }
    let verificationEmailSent = true;
    let verificationEmailError = '';
    try {
      await sendEmailVerification(result.user);
    } catch (error) {
      verificationEmailSent = false;
      verificationEmailError = readableAuthError(error).message;
    }
    return {
      ...accountFromFirebaseUser(result.user),
      name: result.user.displayName || pendingAccount.name,
      studentId: pendingAccount.studentId,
      verificationEmailSent,
      verificationEmailError,
    };
  } catch (error) {
    throw readableAuthError(error);
  } finally {
    pendingSignUpsByEmail.delete(normalizedEmail);
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
    // Keep user status indistinguishable if Firebase returns a status error.
    if (
      ['auth/invalid-credential', 'auth/user-disabled', 'auth/user-not-found'].includes(
        error?.code,
      )
    ) {
      return;
    }
    throw readableAuthError(error);
  }
}

export async function firebaseResendVerificationEmail() {
  ensureFirebaseEnabled();
  if (!auth?.currentUser) {
    throw new Error('Sign in to resend your verification email.');
  }
  try {
    await firebaseSdk().auth.sendEmailVerification(auth.currentUser);
  } catch (error) {
    throw readableAuthError(error);
  }
}

export async function firebaseCheckEmailVerification() {
  ensureFirebaseEnabled();
  if (!auth?.currentUser) {
    throw new Error('Sign in to check your email verification status.');
  }
  try {
    const { getIdToken, reload } = firebaseSdk().auth;
    await reload(auth.currentUser);
    await getIdToken(auth.currentUser, true);
    return accountFromFirebaseUser(auth.currentUser);
  } catch (error) {
    throw readableAuthError(error);
  }
}

export async function firebaseSignOut() {
  if (!auth) {
    return;
  }
  const uid = auth.currentUser?.uid;
  await firebaseSdk().auth.signOut(auth);
  if (uid) {
    pendingStudentIds.delete(uid);
  }
  if (Platform.OS === 'android') {
    const googleSignIn = NativeModules.CampusGoogleSignIn;
    if (googleSignIn?.clearCredentialState) {
      await googleSignIn.clearCredentialState().catch(() => {});
    }
  }
}

export function firestoreAvailable() {
  return Boolean(db && auth?.currentUser);
}

export function firebaseServicesForUser(uid) {
  if (!db || auth?.currentUser?.uid !== uid) {
    throw new Error('Sign in to use Firebase data.');
  }
  if (auth.currentUser.emailVerified !== true) {
    throw new Error('Verify your email to access shared campus features.');
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
  const pendingAccount = pendingSignUpsByEmail.get(
    user.email?.trim().toLowerCase(),
  );
  return {
    id: user.uid,
    name:
      user.displayName ||
      pendingAccount?.name ||
      user.email?.split('@')[0] ||
      'Student',
    email: user.email || '',
    emailVerified: Boolean(user.emailVerified),
    studentId:
      pendingStudentIds.get(user.uid) || pendingAccount?.studentId || '',
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

function readableGoogleAuthError(error) {
  const messages = {
    GOOGLE_SIGN_IN_CONFIG: 'Google sign-in is not configured for this app.',
    GOOGLE_SIGN_IN_UNAVAILABLE: 'Open the app before signing in with Google.',
    GOOGLE_SIGN_IN_NO_CREDENTIAL: 'No Google account is available on this device.',
    GOOGLE_SIGN_IN_INVALID_RESPONSE: 'Google returned an invalid sign-in response.',
    GOOGLE_SIGN_IN_FAILED: 'Could not complete Google sign-in. Try again.',
    'auth/account-exists-with-different-credential':
      'This email already uses a different sign-in method. Use that method instead.',
    'auth/invalid-credential':
      'Firebase could not verify this Google account. Try again or use email/password.',
    'auth/operation-not-allowed':
      'Google sign-in is not enabled in Firebase Console yet.',
    'auth/network-request-failed':
      'Could not connect. Check your internet and try again.',
  };
  return new Error(
    messages[error?.code] || 'Google sign-in failed. Try again or use email/password.',
  );
}
