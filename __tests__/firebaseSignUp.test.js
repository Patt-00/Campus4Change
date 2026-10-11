let mockAuthObserver;
let mockAuth;
let mockApp;
let mockCreateUser;
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
  mockCreateUser = jest.fn(async (auth, email) => {
    const user = { uid: 'new-firebase-user', email, displayName: null };
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
  });
  expect(account).toMatchObject({
    id: 'new-firebase-user',
    name: 'Jamie Student',
    email: 'jamie@school.edu',
    studentId: 'STU-2048',
  });
});
