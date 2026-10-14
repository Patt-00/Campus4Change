import { initializeAndroidAppCheck } from '../src/shared/backend/appCheck';

const app = { name: 'campus-test' };
const config = {
  apiKey: 'public-web-test-key',
  androidApiKey: 'public-android-test-key',
  projectId: 'campus-test',
  messagingSenderId: '123456789',
  androidAppId: '1:123456789:android:campus-android-app',
  storageBucket: 'campus-test.appspot.com',
};

function appCheckSdk() {
  return {
    CustomProvider: jest.fn(function CustomProvider(options) {
      this.getToken = options.getToken;
    }),
    initializeAppCheck: jest.fn(() => ({ name: 'app-check' })),
  };
}

test('Android App Check delegates tokens only for a matching Firebase project app ID', async () => {
  const nativeModule = {
    getAppCheckToken: jest.fn(async () => ({
      token: 'synthetic-app-check-token',
      expireTimeMillis: Date.now() + 60_000,
    })),
  };
  const sdk = appCheckSdk();

  const instance = initializeAndroidAppCheck(app, config, {
    platform: 'android',
    nativeModule,
    appCheckSdk: sdk,
  });

  expect(instance).toEqual({ name: 'app-check' });
  expect(sdk.initializeAppCheck).toHaveBeenCalledWith(
    app,
    expect.objectContaining({
      isTokenAutoRefreshEnabled: true,
      provider: expect.any(sdk.CustomProvider),
    }),
  );
  const provider = sdk.initializeAppCheck.mock.calls[0][1].provider;
  await expect(provider.getToken()).resolves.toMatchObject({
    token: 'synthetic-app-check-token',
  });
  expect(nativeModule.getAppCheckToken).toHaveBeenCalledWith({
    apiKey: config.androidApiKey,
    projectId: config.projectId,
    androidAppId: config.androidAppId,
    messagingSenderId: config.messagingSenderId,
    storageBucket: config.storageBucket,
  });
});

test('Android App Check rejects an app ID from a different Firebase project', () => {
  const sdk = appCheckSdk();

  expect(() =>
    initializeAndroidAppCheck(
      app,
      { ...config, androidAppId: '1:999999999:android:other-app' },
      {
        platform: 'android',
        nativeModule: { getAppCheckToken: jest.fn() },
        appCheckSdk: sdk,
      },
    ),
  ).toThrow('The Android Firebase app ID does not match its project.');
  expect(sdk.initializeAppCheck).not.toHaveBeenCalled();
});

test('non-Android platforms skip the Android App Check bridge', () => {
  expect(
    initializeAndroidAppCheck(app, config, {
      platform: 'ios',
      nativeModule: null,
      appCheckSdk: undefined,
    }),
  ).toBeNull();
});
