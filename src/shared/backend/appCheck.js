import { NativeModules, Platform } from 'react-native';

export function initializeAndroidAppCheck(
  app,
  config,
  {
    platform = Platform.OS,
    nativeModule = NativeModules.CampusAppCheck,
    appCheckSdk,
  } = {},
) {
  if (platform !== 'android') {
    return null;
  }
  if (typeof nativeModule?.getAppCheckToken !== 'function') {
    throw new Error('Firebase App Check is unavailable in this Android build.');
  }
  const androidAppId =
    typeof config.androidAppId === 'string' ? config.androidAppId.trim() : '';
  const senderId =
    typeof config.messagingSenderId === 'string'
      ? config.messagingSenderId.trim()
      : '';
  if (!androidAppId || !senderId) {
    throw new Error('The Android Firebase app configuration is incomplete.');
  }
  if (!androidAppId.startsWith(`1:${senderId}:android:`)) {
    throw new Error('The Android Firebase app ID does not match its project.');
  }

  const sdk = appCheckSdk ?? require('firebase/app-check');
  const provider = new sdk.CustomProvider({
    getToken: () => nativeModule.getAppCheckToken(config),
  });
  return sdk.initializeAppCheck(app, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}
