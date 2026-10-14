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
  if (typeof config.androidAppId !== 'string' || !config.androidAppId.trim()) {
    throw new Error('The Android Firebase app ID is missing.');
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
