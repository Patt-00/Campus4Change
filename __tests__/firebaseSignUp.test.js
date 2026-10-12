let mockAuthObserver;
let mockAuth;
let mockApp;
let mockCreateUser;
let mockSignIn;
let mockSendEmailVerification;
let mockReload;
let mockGetIdToken;
let mockUpdateProfile;

jest.mock('react-native', () => ({
  NativeModules: {
    CampusStorage: {
      getFirebaseAuthValue: jest.fn(async () => null),
      setFirebaseAuthValue: jest.fn(async () => true),
      removeFirebaseAuthValue: jest.fn(async () => true),
    },
  },
  Platform: { OS: 'android' },
}));

jest.mock('../src/shared/backend/firebaseConfig', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    authDomain: 'test.example',
    projectId: 'campus-test',
    appId: 'test-app',
  },
  firebaseEmulatorHost: '',
  isFirebaseConfigured: () => true,
}));

jest.mock('firebase/app', () => ({
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => mockApp),
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => mockAuth),
  getReactNativePersistence: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    mockAuthObserver = callback;
    return jest.fn();
  }),
  createUserWithEmailAndPassword: (...args) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  reload: (...args) => mockReload(...args),
  getIdToken: (...args) => mockGetIdToken(...args),
  updateProfile: (...args) => mockUpdateProfile(...args),
  deleteUser: jest.fn(async () => {}),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

beforeEach(() => {
  mockAuthObserver = null;
  mockApp = {};
  mockAuth = { currentUser: null };
  mockSignIn = jest.fn();
  mockSendEmailVerification = jest.fn(async () => {});
  mockReload = jest.fn(async () => {});
  mockGetIdToken = jest.fn(async () => 'fresh-token');
  mockCreateUser = jest.fn(async (auth, email) => {
    const user = {
      uid: 'new-firebase-user',
      email,
      displayName: null,
      emailVerified: false,
    };
    auth.currentUser = user;
    // Firebase Auth can notify listeners before the create-user promise returns.
    mockAuthObserver?.(user);
    return { user };
  });
  mockUpdateProfile = jest.fn(async (user, profile) => {
    Object.assign(user, profile);
  });
  jest.resetModules();
});

test('signup listener receives the new student ID even when Auth notifies before signup resolves', async () => {
  const firebase = require('../src/shared/backend/firebase');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    '  Jamie@School.edu ',
    '  STU-2048 ',
    'TestPassword123',
  );

  expect(observedAccount).toMatchObject({
    uid: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@school.edu',
    studentId: 'STU-2048',
    emailVerified: false,
  });
  expect(account).toMatchObject({
    id: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@school.edu',
    studentId: 'STU-2048',
    emailVerified: false,
    verificationEmailSent: true,
  });
  expect(mockSendEmailVerification).toHaveBeenCalledWith(
    mockAuth.currentUser,
  );
});

test('a verification-email delivery failure leaves a recoverable Firebase account', async () => {
  mockSendEmailVerification.mockRejectedValueOnce({
    code: 'auth/network-request-failed',
  });
  const firebase = require('../src/shared/backend/firebase');

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    'jamie@school.edu',
    'STU-2048',
    'TestPassword123',
  );

  expect(account).toMatchObject({
    id: 'new-firebase-user',
    verificationEmailSent: false,
    verificationEmailError:
      'Could not connect. Check your internet and try again.',
  });
});

test('sign-in reloads the user and refreshes the token before reporting verification', async () => {
  const user = {
    uid: 'verified-user',
    email: 'student@school.edu',
    displayName: 'Verified Student',
    emailVerified: false,
  };
  mockSignIn.mockResolvedValue({ user });
  mockReload.mockImplementation(async currentUser => {
    currentUser.emailVerified = true;
  });
  const firebase = require('../src/shared/backend/firebase');

  const account = await firebase.firebaseSignIn(
    ' Student@School.edu ',
    'TestPassword123',
  );

  expect(mockSignIn).toHaveBeenCalledWith(
    mockAuth,
    'student@school.edu',
    'TestPassword123',
  );
  expect(mockReload).toHaveBeenCalledWith(user);
  expect(mockGetIdToken).toHaveBeenCalledWith(user, true);
  expect(account).toMatchObject({
    id: 'verified-user',
    emailVerified: true,
  });
});

test('shared Firestore services reject an unverified Firebase user', () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = {
    uid: 'unverified-user',
    emailVerified: false,
  };

  expect(() => firebase.firebaseServicesForUser('unverified-user')).toThrow(
    'Verify your email to access shared study groups.',
  );

  mockAuth.currentUser.emailVerified = true;
  expect(firebase.firebaseServicesForUser('unverified-user')).toHaveProperty(
    'firestore',
  );
});

test('verification controls resend a link and refresh the verified token claim', async () => {
  const user = {
    uid: 'verification-user',
    email: 'student@school.edu',
    displayName: 'Student',
    emailVerified: false,
  };
  mockAuth.currentUser = user;
  mockReload.mockImplementation(async currentUser => {
    currentUser.emailVerified = true;
  });
  const firebase = require('../src/shared/backend/firebase');

  await firebase.firebaseResendVerificationEmail();
  const account = await firebase.firebaseCheckEmailVerification();

  expect(mockSendEmailVerification).toHaveBeenCalledWith(user);
  expect(mockReload).toHaveBeenCalledWith(user);
  expect(mockGetIdToken).toHaveBeenCalledWith(user, true);
  expect(account.emailVerified).toBe(true);
});
