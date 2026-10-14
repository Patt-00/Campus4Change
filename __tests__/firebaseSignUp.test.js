let mockAuthObserver;
let mockAuth;
let mockApp;
let mockDb;
let mockDoc;
let mockGetDoc;
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
let mockGoogleSignIn;
let mockGoogleCredential;
let mockSignInWithCredential;
let mockClearGoogleCredentialState;
let mockInitializeAppCheck;
let mockNativeAppCheckToken;

jest.mock('react-native', () => ({
  NativeModules: {
    CampusStorage: {
      getFirebaseAuthValue: jest.fn(async () => null),
      setFirebaseAuthValue: jest.fn(async () => true),
      removeFirebaseAuthValue: jest.fn(async () => true),
    },
    CampusGoogleSignIn: {
      signIn: (...args) => mockGoogleSignIn(...args),
      clearCredentialState: (...args) => mockClearGoogleCredentialState(...args),
    },
    CampusAppCheck: {
      getAppCheckToken: (...args) => mockNativeAppCheckToken(...args),
    },
  },
  Platform: { OS: 'android' },
}));

jest.mock('../src/shared/backend/firebaseConfig', () => ({
  firebaseConfig: {
    apiKey: 'test-api-key',
    androidApiKey: 'test-android-api-key',
    authDomain: 'test.example',
    projectId: 'campus-test',
    messagingSenderId: '123456789',
    storageBucket: 'campus-test.appspot.com',
    appId: 'test-app',
    androidAppId: '1:123456789:android:test-app',
  },
  googleWebClientId: '722562628798-test.apps.googleusercontent.com',
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
  signInWithCredential: (...args) => mockSignInWithCredential(...args),
  GoogleAuthProvider: {
    credential: (...args) => mockGoogleCredential(...args),
  },
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
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
}));

jest.mock('firebase/app-check', () => ({
  CustomProvider: jest.fn(function CustomProvider(options) {
    this.getToken = options.getToken;
  }),
  initializeAppCheck: (...args) => mockInitializeAppCheck(...args),
}));

beforeEach(() => {
  mockAuthObserver = null;
  mockApp = {};
  mockInitializeAppCheck = jest.fn(() => ({ app: mockApp }));
  mockNativeAppCheckToken = jest.fn(async () => ({
    token: 'test-app-check-token',
    expireTimeMillis: Date.now() + 60 * 60 * 1000,
  }));
  mockDb = {};
  mockAuth = { currentUser: null };
  mockDoc = jest.fn((db, ...path) => ({ db, path: path.join('/') }));
  mockGetDoc = jest.fn();
  mockSetDoc = jest.fn(async () => {});
  mockServerTimestamp = jest.fn(() => 'server-timestamp');
  mockSignIn = jest.fn();
  mockGoogleSignIn = jest.fn(async () => 'google-id-token');
  mockGoogleCredential = jest.fn(idToken => ({
    providerId: 'google.com',
    idToken,
  }));
  mockSignInWithCredential = jest.fn(async (auth, credential) => {
    const user = {
      uid: 'google-user',
      email: 'google.student@gmail.com',
      displayName: 'Google Student',
      emailVerified: true,
    };
    auth.currentUser = user;
    mockAuthObserver?.(user);
    return { user, credential };
  });
  mockClearGoogleCredentialState = jest.fn(async () => true);
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

test('Android Firebase initializes native-backed App Check before account services', async () => {
  const firebase = require('../src/shared/backend/firebase');
  const { firebaseConfig } = require('../src/shared/backend/firebaseConfig');
  const { initializeApp } = require('firebase/app');
  const { initializeAuth } = require('firebase/auth');
  const { getFirestore } = require('firebase/firestore');
  const { CustomProvider } = require('firebase/app-check');

  expect(initializeApp).toHaveBeenCalledWith({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  expect(mockInitializeAppCheck).toHaveBeenCalledWith(
    mockApp,
    expect.objectContaining({
      isTokenAutoRefreshEnabled: true,
      provider: expect.any(CustomProvider),
    }),
  );
  expect(mockInitializeAppCheck.mock.invocationCallOrder[0]).toBeLessThan(
    initializeAuth.mock.invocationCallOrder[0],
  );
  expect(mockInitializeAppCheck.mock.invocationCallOrder[0]).toBeLessThan(
    getFirestore.mock.invocationCallOrder[0],
  );

  const provider = mockInitializeAppCheck.mock.calls[0][1].provider;
  await expect(provider.getToken()).resolves.toMatchObject({
    token: 'test-app-check-token',
  });
  expect(mockNativeAppCheckToken).toHaveBeenCalledWith({
    apiKey: firebaseConfig.androidApiKey,
    projectId: firebaseConfig.projectId,
    androidAppId: firebaseConfig.androidAppId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    storageBucket: firebaseConfig.storageBucket,
  });
  expect(firebase.firebaseEnabled).toBe(true);
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
    displayNameSaved: true,
  });
  expect(mockSendEmailVerification).toHaveBeenCalledWith(
    mockAuth.currentUser,
  );
});

test('concurrent sign-up attempts cannot overwrite pending Firebase profile data', async () => {
  let finishCreateUser;
  mockCreateUser.mockImplementationOnce((auth, email) =>
    new Promise(resolve => {
      finishCreateUser = () => {
        const user = {
          uid: 'new-firebase-user',
          email,
          displayName: null,
          emailVerified: false,
        };
        auth.currentUser = user;
        mockAuthObserver?.(user);
        resolve({ user });
      };
    }),
  );
  const firebase = require('../src/shared/backend/firebase');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const firstAttempt = firebase.firebaseSignUp(
    'Jamie Student',
    'jamie@school.edu',
    'STU-2048',
    'TestPassword123',
  );
  const conflictingAttempt = firebase.firebaseSignUp(
    'Different Name',
    'JAMIE@school.edu',
    'STU-9999',
    'TestPassword123',
  );

  await expect(conflictingAttempt).rejects.toThrow(
    'A sign-up is already in progress for this email.',
  );
  expect(mockCreateUser).toHaveBeenCalledTimes(1);

  finishCreateUser();
  const account = await firstAttempt;

  expect(observedAccount).toMatchObject({
    uid: account.id,
    name: 'Jamie Student',
    studentId: 'STU-2048',
  });
  expect(mockCreateUser).toHaveBeenCalledTimes(1);
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

test('a profile metadata failure keeps the newly created account and submitted profile', async () => {
  mockUpdateProfile.mockRejectedValueOnce(new Error('Profile metadata unavailable.'));
  const firebase = require('../src/shared/backend/firebase');
  const { deleteUser } = require('firebase/auth');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    'jamie@gmail.com',
    'STU-2048',
    'TestPassword123',
  );

  expect(account).toMatchObject({
    id: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@gmail.com',
    studentId: 'STU-2048',
    displayNameSaved: false,
  });
  expect(observedAccount).toMatchObject({
    uid: account.id,
    name: 'Jamie Student',
    studentId: 'STU-2048',
  });
  expect(mockAuth.currentUser.uid).toBe(account.id);
  expect(deleteUser).not.toHaveBeenCalled();
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

test('Google sign-in exchanges the Credential Manager ID token with Firebase', async () => {
  const firebase = require('../src/shared/backend/firebase');

  expect(firebase.firebaseGoogleSignInAvailable()).toBe(true);
  const account = await firebase.firebaseGoogleSignIn();

  expect(mockGoogleSignIn).toHaveBeenCalledWith(
    '722562628798-test.apps.googleusercontent.com',
  );
  expect(mockGoogleCredential).toHaveBeenCalledWith('google-id-token');
  expect(mockSignInWithCredential).toHaveBeenCalledWith(
    mockAuth,
    expect.objectContaining({ providerId: 'google.com' }),
  );
  expect(mockReload).toHaveBeenCalledWith(mockAuth.currentUser);
  expect(mockGetIdToken).toHaveBeenCalledWith(mockAuth.currentUser, true);
  expect(account).toMatchObject({
    id: 'google-user',
    name: 'Google Student',
    email: 'google.student@gmail.com',
    emailVerified: true,
    studentId: '',
  });
});

test('Google account-picker cancellation returns without signing into Firebase', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockGoogleSignIn.mockRejectedValue({ code: 'GOOGLE_SIGN_IN_CANCELED' });

  await expect(firebase.firebaseGoogleSignIn()).resolves.toBeNull();
  expect(mockSignInWithCredential).not.toHaveBeenCalled();
});

test('Google ID-token parsing failures are returned as handled auth errors', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const firebase = require('../src/shared/backend/firebase');
    mockGoogleSignIn.mockRejectedValueOnce({
      code: 'GOOGLE_SIGN_IN_INVALID_RESPONSE',
      message: 'Do not expose credential data.',
    });

    await expect(firebase.firebaseGoogleSignIn()).rejects.toThrow(
      'Google returned an invalid sign-in response.',
    );
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      '[Campus4Change] Google sign-in failed:',
      'GOOGLE_SIGN_IN_INVALID_RESPONSE',
    );
  } finally {
    warning.mockRestore();
  }
});

test('Firebase Google credential errors show a clear message and log only the error code', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const firebase = require('../src/shared/backend/firebase');
    mockSignInWithCredential.mockRejectedValueOnce({
      code: 'auth/invalid-credential',
      message: 'Do not expose credential data.',
    });

    await expect(firebase.firebaseGoogleSignIn()).rejects.toThrow(
      'Firebase could not verify this Google account. Try again or use email/password.',
    );
    expect(warning).toHaveBeenCalledWith(
      '[Campus4Change] Google sign-in failed:',
      'auth/invalid-credential',
    );
    expect(JSON.stringify(warning.mock.calls)).not.toContain(
      'Do not expose credential data.',
    );
  } finally {
    warning.mockRestore();
  }
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
  expect(mockClearGoogleCredentialState).toHaveBeenCalledTimes(1);

  mockAuthObserver({
    uid: account.id,
    email: account.email,
    displayName: account.name,
    emailVerified: false,
  });
  expect(observedAccount.studentId).toBe('');
});

test('failed Firebase sign-out keeps the account Student ID cache recoverable', async () => {
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
  mockSignOut.mockRejectedValueOnce(new Error('Could not reach Firebase.'));

  await expect(firebase.firebaseSignOut()).rejects.toThrow(
    'Could not reach Firebase.',
  );
  mockAuthObserver({
    uid: account.id,
    email: account.email,
    displayName: account.name,
    emailVerified: false,
  });

  expect(observedAccount.studentId).toBe('STU-2048');
  expect(mockClearGoogleCredentialState).not.toHaveBeenCalled();
});

test('shared Firestore services require verification but allow any email domain', () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = {
    uid: 'unverified-user',
    email: 'learner@gmail.com',
    emailVerified: false,
  };

  expect(() => firebase.firebaseServicesForUser('unverified-user')).toThrow(
    'Verify your email to access shared campus features.',
  );

  mockAuth.currentUser.emailVerified = true;
  expect(firebase.firebaseServicesForUser('unverified-user')).toHaveProperty(
    'firestore',
  );
});

test('shared Firestore services reject a different authenticated UID', () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = {
    uid: 'signed-in-user',
    emailVerified: true,
  };

  expect(() => firebase.firebaseServicesForUser('requested-user')).toThrow(
    'Sign in to use Firebase data.',
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

test('private cloud state loads only from the authenticated UID and works before email verification', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = {
    uid: 'cloud-user',
    emailVerified: false,
  };
  const state = {
    version: 1,
    profile: { id: 'cloud-user', studentId: 'STU-2048' },
  };
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ state, updatedAt: 'server-time' }),
  });

  await expect(firebase.loadCloudState('cloud-user')).resolves.toEqual(state);

  expect(mockDoc).toHaveBeenCalledWith(
    mockDb,
    'users',
    'cloud-user',
    'private',
    'state',
  );
  expect(mockGetDoc).toHaveBeenCalledWith({
    db: mockDb,
    path: 'users/cloud-user/private/state',
  });
});

test('private cloud state returns null when the authenticated user has no saved document', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  mockGetDoc.mockResolvedValue({ exists: () => false });

  await expect(firebase.loadCloudState('cloud-user')).resolves.toBeNull();
});

test('private cloud state refuses to read another UID before constructing a document reference', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'signed-in-user', emailVerified: true };

  await expect(firebase.loadCloudState('requested-user')).rejects.toThrow(
    'Sign in to load your Firebase account data.',
  );
  expect(mockDoc).not.toHaveBeenCalled();
  expect(mockGetDoc).not.toHaveBeenCalled();
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
