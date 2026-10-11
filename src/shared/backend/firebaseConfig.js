// Copy these values from Firebase Console > Project settings > Your apps.
// Firebase's client configuration is public; protect the app with Auth and
// Firestore Security Rules instead of relying on these values as secrets.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Set this only while using local Auth and Firestore emulators.
export const firebaseEmulatorHost = '';

const requiredValues = ['apiKey', 'authDomain', 'projectId', 'appId'];

export function isFirebaseConfigured(config = firebaseConfig) {
  return requiredValues.every(value => {
    const setting = config[value];
    return (
      typeof setting === 'string' &&
      setting.trim().length > 0 &&
      !setting.includes('YOUR_')
    );
  });
}
