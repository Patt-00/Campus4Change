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
const privateMessageDocumentCacheByUid = new Map();
const privateConversationMessageRefsByUid = new Map();
const FIRESTORE_WRITE_BATCH_SIZE = 400;
const MAX_PRIVATE_MESSAGE_ID_LENGTH = 80;

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
  if (pendingSignUpsByEmail.has(normalizedEmail)) {
    throw new Error('A sign-up is already in progress for this email.');
  }
  pendingSignUpsByEmail.set(normalizedEmail, pendingAccount);
  try {
    const {
      createUserWithEmailAndPassword,
      sendEmailVerification,
      updateProfile,
    } = firebaseSdk().auth;
    const result = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    pendingStudentIds.set(result.user.uid, pendingAccount.studentId);
    let displayNameSaved = true;
    try {
      await updateProfile(result.user, { displayName: pendingAccount.name });
    } catch {
      // Auth account creation already succeeded. Treat display-name metadata
      // as recoverable so signup cannot fail while leaving a live account
      // signed in behind the signup screen.
      displayNameSaved = false;
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
      displayNameSaved,
    };
  } catch (error) {
    throw readableAuthError(error);
  } finally {
    if (pendingSignUpsByEmail.get(normalizedEmail) === pendingAccount) {
      pendingSignUpsByEmail.delete(normalizedEmail);
    }
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
    privateMessageDocumentCacheByUid.delete(uid);
    privateConversationMessageRefsByUid.delete(uid);
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

function utf8ByteLength(value) {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function privateMessageDocumentId(conversationId, messageId) {
  return `${conversationId.length}_${encodeURIComponent(conversationId)}__${encodeURIComponent(messageId)}`;
}

function privateConversationMessages(conversations = []) {
  const messages = new Map();
  for (const conversation of conversations) {
    if (!conversation || typeof conversation !== 'object') {
      continue;
    }
    const conversationMessages = Array.isArray(conversation.messages)
      ? conversation.messages
      : [];
    if (
      typeof conversation.id !== 'string' ||
      !conversation.id.trim() ||
      conversation.id.length > MAX_PRIVATE_MESSAGE_ID_LENGTH ||
      conversation.id.includes('/')
    ) {
      if (conversationMessages.length > 0) {
        throw new Error(
          'Private notes cannot sync because a saved conversation has an invalid ID.',
        );
      }
      continue;
    }
    conversationMessages.forEach((message, index) => {
      if (
        !message ||
        typeof message !== 'object' ||
        Array.isArray(message) ||
        typeof message.text !== 'string' ||
        !message.text.trim()
      ) {
        return;
      }
      const id =
        typeof message.id === 'string' && message.id.trim()
          ? message.id.trim()
          : `legacy-${index}`;
      const text = message.text.trim();
      if (id.length > MAX_PRIVATE_MESSAGE_ID_LENGTH || text.length > 2000) {
        throw new Error(
          'Private notes must have IDs up to 80 characters and text up to 2,000 characters.',
        );
      }
      const documentId = privateMessageDocumentId(conversation.id, id);
      messages.set(documentId, {
        documentId,
        data: {
          conversationId: conversation.id,
          id,
          text,
          mine: message.mine !== false,
          sentAt:
            typeof message.sentAt === 'string' && message.sentAt
              ? message.sentAt.slice(0, 40)
              : new Date().toISOString(),
        },
      });
    });
  }
  return [...messages.values()];
}

function mergePrivateMessages(state, messageSnapshots, documentCache, messageRefCache) {
  const conversations = new Map(
    (Array.isArray(state?.conversations) ? state.conversations : [])
      .filter(conversation => conversation && typeof conversation.id === 'string')
      .map(conversation => [conversation.id, conversation]),
  );
  const messagesByConversation = new Map();
  const persistedMessageIdsByConversation = new Map();
  const sortedMessages = [...messageSnapshots].sort((left, right) => {
    const leftData = left.data();
    const rightData = right.data();
    return (
      String(leftData.conversationId).localeCompare(String(rightData.conversationId)) ||
      String(leftData.sentAt).localeCompare(String(rightData.sentAt)) ||
      String(leftData.id).localeCompare(String(rightData.id))
    );
  });
  for (const snapshot of sortedMessages) {
    const data = snapshot.data();
    if (
      typeof data.conversationId !== 'string' ||
      data.conversationId.length > MAX_PRIVATE_MESSAGE_ID_LENGTH ||
      data.conversationId.includes('/') ||
      typeof data.id !== 'string' ||
      data.id.length > MAX_PRIVATE_MESSAGE_ID_LENGTH ||
      typeof data.text !== 'string' ||
      !data.text.trim() ||
      data.text.length > 2000 ||
      typeof data.mine !== 'boolean' ||
      typeof data.sentAt !== 'string' ||
      data.sentAt.length > 40
    ) {
      continue;
    }
    documentCache.add(snapshot.id);
    let messages = messagesByConversation.get(data.conversationId);
    if (!messages) {
      const existing = conversations.get(data.conversationId)?.messages;
      messages = new Map(
        (Array.isArray(existing) ? existing : [])
          .filter(message => message && typeof message.id === 'string')
          .map(message => [message.id, message]),
      );
      messagesByConversation.set(data.conversationId, messages);
    }
    let persistedIds = persistedMessageIdsByConversation.get(data.conversationId);
    if (!persistedIds) {
      persistedIds = new Set();
      persistedMessageIdsByConversation.set(data.conversationId, persistedIds);
    }
    if (!messages.has(data.id)) {
      messages.set(data.id, {
        id: data.id,
        text: data.text,
        mine: data.mine,
        sentAt: data.sentAt,
      });
    }
    persistedIds.add(data.id);
  }
  for (const [conversationId, messages] of messagesByConversation) {
    const current = conversations.get(conversationId) || {
      id: conversationId,
      name: 'Conversation',
    };
    conversations.set(conversationId, {
      ...current,
      messages: [...messages.values()],
    });
  }
  for (const conversation of conversations.values()) {
    const messages = Array.isArray(conversation.messages)
      ? conversation.messages
      : [];
    const persistedIds = persistedMessageIdsByConversation.get(conversation.id);
    if (
      messages.length === 0 ||
      (persistedIds &&
        messages.every(message => persistedIds.has(message.id)))
    ) {
      messageRefCache.set(conversation.id, conversation.messages);
    }
  }
  return [...conversations.values()];
}

export async function loadCloudState(uid) {
  if (!db || auth?.currentUser?.uid !== uid) {
    throw new Error('Sign in to load your Firebase account data.');
  }
  const firestore = firebaseSdk().firestore;
  const { collection, doc, getDoc, getDocs } = firestore;
  const documentCache = new Set();
  const messageRefCache = new Map();
  const [snapshot, messageSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'private', 'state')),
    getDocs(collection(db, 'users', uid, 'privateMessages')),
  ]);
  privateMessageDocumentCacheByUid.set(uid, documentCache);
  privateConversationMessageRefsByUid.set(uid, messageRefCache);
  const data = snapshot.exists() ? snapshot.data().state : null;
  const conversations = mergePrivateMessages(
    data,
    messageSnapshot.docs || [],
    documentCache,
    messageRefCache,
  );
  if (!data && conversations.length === 0) {
    return null;
  }
  const base = data || {
    version: 1,
    profile: { id: uid },
    sessions: [],
    groups: [],
    notices: [],
  };
  return { ...base, conversations };
}

export async function saveCloudState(uid, state) {
  if (!db || auth?.currentUser?.uid !== uid) {
    throw new Error('Sign in to save your Firebase account data.');
  }
  if (state?.profile?.id !== uid || state.version !== 1) {
    throw new Error('The account data is not valid for this Firebase user.');
  }

  const cloudState = {
    ...state,
    conversations: Array.isArray(state.conversations)
      ? state.conversations.map(conversation => ({ ...conversation, messages: [] }))
      : [],
  };
  const serialized = JSON.stringify(cloudState);
  // Firestore documents are limited to 1 MiB. This conservative cap leaves
  // room for field names and Firestore's document encoding overhead.
  if (utf8ByteLength(serialized) > 250_000) {
    throw new Error(
      'This account has too much non-message data for the current cloud record.',
    );
  }

  const firestore = firebaseSdk().firestore;
  const documentCache = privateMessageDocumentCacheByUid.get(uid) || new Set();
  privateMessageDocumentCacheByUid.set(uid, documentCache);
  const conversations = Array.isArray(state.conversations)
    ? state.conversations
    : [];
  const messageRefCache =
    privateConversationMessageRefsByUid.get(uid) || new Map();
  privateConversationMessageRefsByUid.set(uid, messageRefCache);
  const changedConversations = conversations.filter(
    conversation =>
      conversation &&
      typeof conversation === 'object' &&
      messageRefCache.get(conversation.id) !== conversation.messages,
  );
  const desiredMessages = privateConversationMessages(changedConversations);
  const pendingMessages = desiredMessages
    .filter(message => !documentCache.has(message.documentId))
    .map(message => ({
      documentId: message.documentId,
      data: message.data,
    }));
  for (
    let offset = 0;
    offset < pendingMessages.length;
    offset += FIRESTORE_WRITE_BATCH_SIZE
  ) {
    const currentBatch = pendingMessages.slice(
      offset,
      offset + FIRESTORE_WRITE_BATCH_SIZE,
    );
    const batch = firestore.writeBatch(db);
    currentBatch.forEach(message => {
      batch.set(
        firestore.doc(
          db,
          'users',
          uid,
          'privateMessages',
          message.documentId,
        ),
        message.data,
      );
    });
    await batch.commit();
    currentBatch.forEach(message => documentCache.add(message.documentId));
  }
  changedConversations.forEach(conversation =>
    messageRefCache.set(conversation.id, conversation.messages),
  );

  await firestore.setDoc(
    firestore.doc(db, 'users', uid, 'private', 'state'),
    {
      state: cloudState,
      updatedAt: firestore.serverTimestamp(),
    },
  );
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
