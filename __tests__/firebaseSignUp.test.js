let mockAuthObserver;
let mockAuth;
let mockApp;
let mockDb;
let mockDoc;
let mockCollection;
let mockGetDoc;
let mockGetDocs;
let mockGetCountFromServer;
let mockSetDoc;
let mockWriteBatch;
let mockBatches;
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
let mockFirebaseAuthValues;
let mockFirebaseEmulatorHost;
let mockConnectAuthEmulator;
let mockConnectFirestoreEmulator;

jest.mock('react-native', () => ({
  NativeModules: {
    CampusStorage: {
      getFirebaseAuthValue: jest.fn(async key => mockFirebaseAuthValues.get(key) || null),
      setFirebaseAuthValue: jest.fn(async (key, value) => {
        mockFirebaseAuthValues.set(key, value);
        return true;
      }),
      removeFirebaseAuthValue: jest.fn(async key => {
        mockFirebaseAuthValues.delete(key);
        return true;
      }),
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
  firebaseEmulatorHost: mockFirebaseEmulatorHost,
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
  connectAuthEmulator: (...args) => mockConnectAuthEmulator(...args),
  updateProfile: (...args) => mockUpdateProfile(...args),
  deleteUser: jest.fn(async () => {}),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  doc: (...args) => mockDoc(...args),
  collection: (...args) => mockCollection(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  getCountFromServer: (...args) => mockGetCountFromServer(...args),
  connectFirestoreEmulator: (...args) => mockConnectFirestoreEmulator(...args),
  setDoc: (...args) => mockSetDoc(...args),
  writeBatch: (...args) => mockWriteBatch(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
}));

jest.mock('firebase/app-check', () => ({
  CustomProvider: jest.fn(function CustomProvider(options) {
    this.getToken = options.getToken;
  }),
  initializeAppCheck: (...args) => mockInitializeAppCheck(...args),
}));

beforeEach(() => {
  mockFirebaseEmulatorHost = '';
  mockConnectAuthEmulator = jest.fn();
  mockConnectFirestoreEmulator = jest.fn();
  mockFirebaseAuthValues = new Map();
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
  mockCollection = jest.fn((db, ...path) => ({ db, path: path.join('/') }));
  mockGetDoc = jest.fn();
  mockGetDocs = jest.fn(async () => ({ docs: [] }));
  mockGetCountFromServer = jest.fn(async () => ({ data: () => ({ count: 0 }) }));
  mockSetDoc = jest.fn(async () => {});
  mockBatches = [];
  mockWriteBatch = jest.fn(() => {
    const batch = {
      set: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(async () => {}),
    };
    mockBatches.push(batch);
    return batch;
  });
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

test('Firebase emulator mode skips App Check and connects Auth and Firestore locally', () => {
  mockFirebaseEmulatorHost = '127.0.0.1';

  const firebase = require('../src/shared/backend/firebase');

  expect(firebase.firebaseEnabled).toBe(true);
  expect(mockInitializeAppCheck).not.toHaveBeenCalled();
  expect(mockNativeAppCheckToken).not.toHaveBeenCalled();
  expect(mockConnectAuthEmulator).toHaveBeenCalledWith(
    mockAuth,
    'http://127.0.0.1:9099',
    { disableWarnings: true },
  );
  expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(
    mockDb,
    '127.0.0.1',
    8080,
  );
});

test('signup listener receives the new account before TIP profile setup', async () => {
  const firebase = require('../src/shared/backend/firebase');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    '  Jamie@School.edu ',
    'TestPassword123',
  );

  expect(observedAccount).toMatchObject({
    uid: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@school.edu',
    emailVerified: false,
  });
  expect(account).toMatchObject({
    id: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@school.edu',
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
    'TestPassword123',
  );
  const conflictingAttempt = firebase.firebaseSignUp(
    'Different Name',
    'JAMIE@school.edu',
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
    'TestPassword123',
  );

  expect(account).toMatchObject({
    id: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@gmail.com',
    displayNameSaved: false,
  });
  expect(observedAccount).toMatchObject({
    uid: account.id,
    name: 'Jamie Student',
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

test('Firebase Auth account data does not expose a Student ID field', async () => {
  const firebase = require('../src/shared/backend/firebase');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    'jamie@school.edu',
    'TestPassword123',
  );
  expect(observedAccount).not.toHaveProperty('studentId');

  await firebase.firebaseSignOut();
  expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
  expect(mockClearGoogleCredentialState).toHaveBeenCalledTimes(1);

  mockAuthObserver({
    uid: account.id,
    email: account.email,
    displayName: account.name,
    emailVerified: false,
  });
  expect(observedAccount).not.toHaveProperty('studentId');
});

test('failed Firebase sign-out keeps the Firebase account recoverable', async () => {
  const firebase = require('../src/shared/backend/firebase');
  let observedAccount;
  firebase.watchFirebaseUser(user => {
    observedAccount = user;
  });

  const account = await firebase.firebaseSignUp(
    'Jamie Student',
    'jamie@school.edu',
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

  expect(observedAccount).not.toHaveProperty('studentId');
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

test('legacy Student ID data is stripped before private state is saved', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const state = {
    version: 1,
    updatedAt: 123,
    profile: { id: 'cloud-user', studentId: '2026101234' },
    sessions: [],
    groups: [],
    conversations: [],
    notices: [],
  };

  await firebase.saveCloudState('cloud-user', state);

  const stateRef = { db: mockDb, path: 'users/cloud-user/private/state' };
  expect(mockSetDoc).toHaveBeenCalledWith(
    stateRef,
    {
      state: { ...state, profile: { id: 'cloud-user' } },
      updatedAt: 'server-timestamp',
    },
  );
  expect(mockWriteBatch).not.toHaveBeenCalled();
  expect(state.profile).toHaveProperty('studentId', '2026101234');
});

test('private notes move to bounded owner-scoped documents instead of the state document', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  let state = {
    version: 1,
    updatedAt: 123,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [
      {
        id: 'chat-tutor-1',
        name: 'Tutor',
        tutorId: 'tutor-1',
        messages: Array.from({ length: 401 }, (_, index) => ({
          id: `message-${index}`,
          text: 'x'.repeat(2000),
          mine: true,
          sentAt: new Date(1_800_000_000_000 + index).toISOString(),
        })),
      },
    ],
    notices: [],
  };

  await firebase.saveCloudState('cloud-user', state);

  expect(mockSetDoc).toHaveBeenCalledWith(
    {
      db: mockDb,
      path: 'users/cloud-user/private/state',
    },
    expect.objectContaining({
      state: expect.objectContaining({
        conversations: [
          expect.objectContaining({
            id: 'chat-tutor-1',
            messages: [],
          }),
        ],
      }),
    }),
  );
  const writes = mockBatches.flatMap(batch => batch.set.mock.calls);
  expect(writes).toHaveLength(401);
  expect(mockBatches.map(batch => batch.set.mock.calls.length)).toEqual([
    400,
    1,
  ]);
  expect(writes[0]).toEqual([
    {
      db: mockDb,
      path: 'users/cloud-user/privateMessages/12_chat-tutor-1__message-0',
    },
    expect.objectContaining({
      conversationId: 'chat-tutor-1',
      id: 'message-0',
      text: 'x'.repeat(2000),
    }),
  ]);
  for (const [, data] of writes) {
    expect(data.text.length).toBeLessThanOrEqual(2000);
  }

  await firebase.saveCloudState('cloud-user', state);
  expect(mockWriteBatch).toHaveBeenCalledTimes(2);

  state = {
    ...state,
    conversations: state.conversations.map(conversation => ({
      ...conversation,
      messages: [
        ...conversation.messages,
        {
          id: 'message-401',
          text: 'new note',
          mine: true,
          sentAt: new Date(1_800_000_000_151).toISOString(),
        },
      ],
    })),
  };
  await firebase.saveCloudState('cloud-user', state);
  expect(mockWriteBatch).toHaveBeenCalledTimes(3);
  expect(mockBatches[2].set).toHaveBeenCalledTimes(1);
});

test('private note documents merge with legacy messages embedded in account state', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const state = {
    version: 1,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [
      {
        id: 'chat-tutor-1',
        name: 'Tutor',
        tutorId: 'tutor-1',
        messages: [
          {
            id: 'legacy-message',
            text: 'Saved before message-document migration',
            mine: true,
            sentAt: '2026-10-01T10:00:00.000Z',
          },
        ],
      },
    ],
    notices: [],
  };
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ state, updatedAt: 'server-time' }),
  });
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: '12_chat-tutor-1__remote-message',
        data: () => ({
          conversationId: 'chat-tutor-1',
          id: 'remote-message',
          text: 'Saved in a private message document',
          mine: true,
          sentAt: '2026-10-01T11:00:00.000Z',
        }),
      },
    ],
  });

  const restored = await firebase.loadCloudState('cloud-user');
  expect(restored).toMatchObject({
    conversations: [
      {
        id: 'chat-tutor-1',
        messages: [
          { id: 'legacy-message' },
          { id: 'remote-message' },
        ],
      },
    ],
  });
  await firebase.saveCloudState('cloud-user', restored);
  const migratedMessages = mockBatches.flatMap(batch => batch.set.mock.calls);
  expect(migratedMessages).toHaveLength(1);
  expect(migratedMessages[0][1].id).toBe('legacy-message');
  expect(mockSetDoc.mock.calls.at(-1)[1].state.conversations[0].messages).toEqual(
    [],
  );
  expect(mockCollection).toHaveBeenCalledWith(
    mockDb,
    'users',
    'cloud-user',
    'privateMessages',
  );
});

test('private note merges preserve chronological order across legacy and document history', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const conversationId = 'chat-tutor-1';
  const state = {
    version: 1,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [
      {
        id: conversationId,
        name: 'Tutor',
        messages: [
          {
            id: 'newer-legacy',
            text: 'A later embedded note',
            mine: true,
            sentAt: '2026-10-01T12:00:00.000Z',
          },
          {
            id: 'older-legacy',
            text: 'An earlier embedded note',
            mine: true,
            sentAt: '2026-10-01T10:00:00.000Z',
          },
        ],
      },
    ],
    notices: [],
  };
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ state }),
  });
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: `${conversationId.length}_${encodeURIComponent(conversationId)}__remote-mid`,
        data: () => ({
          conversationId,
          id: 'remote-mid',
          text: 'Middle remote note',
          mine: true,
          sentAt: '2026-10-01T11:00:00.000Z',
        }),
      },
    ],
  });

  const restored = await firebase.loadCloudState('cloud-user');

  expect(restored.conversations[0].messages.map(message => message.id)).toEqual([
    'older-legacy',
    'remote-mid',
    'newer-legacy',
  ]);
});

test('repeat private-note restores reuse all verified local messages', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const conversationId = 'chat-tutor-1';
  const messages = Array.from({ length: 300 }, (_, index) => ({
    conversationId,
    id: `message-${index}`,
    text: `Saved note ${index}`,
    mine: true,
    sentAt: `2026-10-01T10:${String(index % 60).padStart(2, '0')}:00.000Z`,
  }));
  const snapshots = messages.map(data => ({
    id: `${conversationId.length}_${encodeURIComponent(conversationId)}__${encodeURIComponent(data.id)}`,
    data: () => data,
  }));
  const state = {
    version: 1,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [{ id: conversationId, name: 'Tutor', messages: [] }],
    notices: [],
  };
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ state }),
  });
  mockGetDocs.mockResolvedValue({ docs: snapshots });
  mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 300 }) });

  const firstRestore = await firebase.loadCloudState('cloud-user');
  expect(firstRestore.conversations[0].messages).toHaveLength(300);
  expect(mockGetDocs).toHaveBeenCalledTimes(1);

  const secondRestore = await firebase.loadCloudState('cloud-user', firstRestore);
  expect(secondRestore.conversations[0].messages).toHaveLength(300);
  expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
  expect(mockGetDocs).toHaveBeenCalledTimes(1);

  mockGetCountFromServer.mockRejectedValueOnce(new Error('offline'));
  const offlineRestore = await firebase.loadCloudState('cloud-user', secondRestore);
  expect(offlineRestore.conversations[0].messages).toHaveLength(300);
  expect(mockGetDocs).toHaveBeenCalledTimes(2);
});

test('private-note cache misses when local history has an unsynced message', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const conversationId = 'chat-tutor-1';
  const remoteMessage = {
    conversationId,
    id: 'remote-message',
    text: 'Saved in the cloud',
    mine: true,
    sentAt: '2026-10-01T11:00:00.000Z',
  };
  const state = {
    version: 1,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [{ id: conversationId, name: 'Tutor', messages: [] }],
    notices: [],
  };
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({ state }),
  });
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: `${conversationId.length}_${encodeURIComponent(conversationId)}__remote-message`,
        data: () => remoteMessage,
      },
    ],
  });
  mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) });

  const firstRestore = await firebase.loadCloudState('cloud-user');
  const cachedWithUnsyncedMessage = {
    ...firstRestore,
    conversations: firstRestore.conversations.map(conversation => ({
      ...conversation,
      messages: [
        ...conversation.messages,
        {
          id: 'local-message',
          text: 'Not uploaded yet',
          mine: true,
          sentAt: '2026-10-01T12:00:00.000Z',
        },
      ],
    })),
  };

  const restored = await firebase.loadCloudState(
    'cloud-user',
    cachedWithUnsyncedMessage,
  );
  expect(mockGetCountFromServer).not.toHaveBeenCalled();
  expect(mockGetDocs).toHaveBeenCalledTimes(2);
  expect(restored.conversations[0].messages).toHaveLength(1);
});

test('private-note cache refreshes when embedded cloud history changes', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  const conversationId = 'chat-tutor-1';
  const remoteMessage = {
    conversationId,
    id: 'remote-message',
    text: 'Saved in the cloud',
    mine: true,
    sentAt: '2026-10-01T11:00:00.000Z',
  };
  let state = {
    version: 1,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [{ id: conversationId, name: 'Tutor', messages: [] }],
    notices: [],
  };
  mockGetDoc.mockImplementation(async () => ({
    exists: () => true,
    data: () => ({ state }),
  }));
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: `${conversationId.length}_${encodeURIComponent(conversationId)}__remote-message`,
        data: () => remoteMessage,
      },
    ],
  });
  mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) });

  const firstRestore = await firebase.loadCloudState('cloud-user');
  state = {
    ...state,
    conversations: [
      {
        ...state.conversations[0],
        messages: [
          {
            id: 'legacy-message',
            text: 'Added by an older app version',
            mine: true,
            sentAt: '2026-10-01T09:00:00.000Z',
          },
        ],
      },
    ],
  };

  const restored = await firebase.loadCloudState('cloud-user', firstRestore);
  expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
  expect(mockGetDocs).toHaveBeenCalledTimes(2);
  expect(restored.conversations[0].messages.map(message => message.id)).toEqual([
    'legacy-message',
    'remote-message',
  ]);
});

test('duplicate legacy message IDs produce one private Firestore write', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };
  await firebase.saveCloudState('cloud-user', {
    version: 1,
    profile: { id: 'cloud-user' },
    sessions: [],
    groups: [],
    conversations: [
      {
        id: 'chat-tutor-1',
        name: 'Tutor',
        messages: [
          {
            id: 'duplicate',
            text: 'Old copy',
            mine: true,
            sentAt: '2026-10-01T10:00:00.000Z',
          },
          {
            id: 'duplicate',
            text: 'Latest copy',
            mine: true,
            sentAt: '2026-10-01T10:01:00.000Z',
          },
        ],
      },
    ],
    notices: [],
  });

  const writes = mockBatches.flatMap(batch => batch.set.mock.calls);
  expect(writes).toHaveLength(1);
  expect(writes[0][1].text).toBe('Latest copy');
});

test.each([null, 'invalid/'.repeat(10), 'x'.repeat(81)])(
  'cloud saves refuse to strip private notes when a conversation ID is invalid: %s',
  async conversationId => {
    const firebase = require('../src/shared/backend/firebase');
    mockAuth.currentUser = { uid: 'cloud-user', emailVerified: false };

    await expect(
      firebase.saveCloudState('cloud-user', {
        version: 1,
        profile: { id: 'cloud-user' },
        sessions: [],
        groups: [],
        conversations: [
          {
            id: conversationId,
            name: 'Tutor',
            messages: [
              {
                id: 'message-1',
                text: 'Keep this private note intact.',
                mine: true,
                sentAt: '2026-10-01T10:00:00.000Z',
              },
            ],
          },
        ],
        notices: [],
      }),
    ).rejects.toThrow('conversation has an invalid ID');
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockWriteBatch).not.toHaveBeenCalled();
  },
);

test('private cloud state loads only from the authenticated UID and works before email verification', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = {
    uid: 'cloud-user',
    emailVerified: false,
  };
  const state = {
    version: 1,
    profile: { id: 'cloud-user', studentId: 'STU-2048' },
    conversations: [],
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
  ).rejects.toThrow('too much non-message data for the current cloud record');
  expect(mockSetDoc).not.toHaveBeenCalled();
});

test('cloud state size checks count UTF-8 bytes for non-ASCII text', async () => {
  const firebase = require('../src/shared/backend/firebase');
  mockAuth.currentUser = { uid: 'cloud-user', emailVerified: true };
  await expect(
    firebase.saveCloudState('cloud-user', {
      version: 1,
      profile: { id: 'cloud-user' },
      note: '😀'.repeat(70_000),
    }),
  ).rejects.toThrow('too much non-message data for the current cloud record');
  expect(mockSetDoc).not.toHaveBeenCalled();
  expect(mockWriteBatch).not.toHaveBeenCalled();
});
