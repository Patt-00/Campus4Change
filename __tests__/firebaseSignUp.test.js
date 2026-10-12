let mockAuthObserver;
let mockAuth;
let mockApp;
let mockDb;
let mockDoc;
let mockSetDoc;
let mockServerTimestamp;
let mockCreateUser;
let mockSignIn;
let mockSignOut;
let mockSendPasswordResetEmail;
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
  signOut: (...args) => mockSignOut(...args),
  sendPasswordResetEmail: (...args) => mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args) => mockSendEmailVerification(...args),
  reload: (...args) => mockReload(...args),
  getIdToken: (...args) => mockGetIdToken(...args),
  updateProfile: (...args) => mockUpdateProfile(...args),
  deleteUser: jest.fn(async () => {}),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
}));

beforeEach(() => {
  mockAuthObserver = null;
  mockApp = {};
  mockDb = {};
  mockAuth = { currentUser: null };
  mockDoc = jest.fn((db, ...path) => ({ db, path: path.join('/') }));
  mockSetDoc = jest.fn(async () => {});
  mockServerTimestamp = jest.fn(() => 'server-timestamp');
  mockSignIn = jest.fn();
  mockSignOut = jest.fn(async auth => {
    auth.currentUser = null;
  });
  mockSendPasswordResetEmail = jest.fn(async () => {});
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

test.each([
  'auth/invalid-credential',
  'auth/user-disabled',
  'auth/user-not-found',
])(
  'password reset hides account status for %s',
  async code => {
    mockSendPasswordResetEmail.mockRejectedValueOnce({ code });
    const firebase = require('../src/shared/backend/firebase');

    await expect(
      firebase.firebasePasswordReset('  Jamie@School.edu '),
    ).resolves.toBeUndefined();

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      mockAuth,
      'jamie@school.edu',
    );
  },
);

test('password reset still reports network failures', async () => {
  mockSendPasswordResetEmail.mockRejectedValueOnce({
    code: 'auth/network-request-failed',
  });
  const firebase = require('../src/shared/backend/firebase');

  await expect(
    firebase.firebasePasswordReset('student@school.edu'),
  ).rejects.toThrow('Could not connect. Check your internet and try again.');
});

test('successful Firebase sign-out clears the transient Student ID cache', async () => {
  const firebase = require('../src/shared/backend/firebase');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    'jamie@school.edu',
    'STU-2048',
    'TestPassword123',
  );
  expect(observedAccount.studentId).toBe('STU-2048');

  await firebase.firebaseSignOut();
  expect(mockSignOut).toHaveBeenCalledWith(mockAuth);

  mockAuthObserver({
    uid: account.id,
    email: account.email,
    displayName: account.name,
    emailVerified: false,
  });
  expect(observedAccount.studentId).toBe('');
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

test('cloud state saves target the authenticated user document', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const state = {
    version: 1,
    updatedAt: 123,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [],
    notices: [],
  };

  await firebase.saveCloudState('cloud-user', state);

  const stateRef = {
    db: mockDb,
    path: 'users/cloud-user/private/state',
  };
  expect(mockDoc).toHaveBeenCalledWith(
    mockDb,
    'users',
    'cloud-user',
    'private',
    'state',
  );
  expect(mockSetDoc).toHaveBeenCalledWith(stateRef, {
    state,
    updatedAt: 'server-timestamp',
  });
});

test('cloud state rejects profile data owned by a different Firebase user', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: true };

  await expect(
    firebase.saveCloudState('cloud-user', {
      version: 1,
      profile: { id: 'another-user' },
    }),
  ).rejects.toThrow('The account data is not valid for this Firebase user.');
  expect(mockSetDoc).not.toHaveBeenCalled();
});

test('cloud state rejects oversized documents before calling Firestore', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: true };

  await expect(
    firebase.saveCloudState('cloud-user', {
      version: 1,
      profile: { id: 'cloud-user' },
      note: 'x'.repeat(250_001),
    }),
  ).rejects.toThrow('too much saved data for the current cloud record');
  expect(mockSetDoc).not.toHaveBeenCalled();
});
