// Copy these values from Firebase Console > Project settings > Your apps.
// Firebase's client configuration is public; protect the app with Auth and
// Firestore Security Rules instead of relying on these values as secrets.
export const firebaseConfig = {
  apiKey: 'AIzaSyCAGFqPzSeJMMoem8mCV0xRUJIeIEwi5hI',
  authDomain: 'campus4change.firebaseapp.com',
  projectId: 'campus4change',
  messagingSenderId: '722562628798',
  appId: '1:722562628798:web:8670cd83eb25b3ca7132ef',
};

// Public OAuth audience used by Android Credential Manager. This is the
// Firebase project's Web client ID, not its private client secret.
export const googleWebClientId =
  '722562628798-m5c0fbquq68a2ml7eabkukjq2putlkuv.apps.googleusercontent.com';

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
