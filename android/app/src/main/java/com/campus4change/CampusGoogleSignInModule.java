package com.campus4change;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.ReactPackage;
import com.facebook.react.uimanager.ViewManager;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.Executor;

public final class CampusGoogleSignInModule extends ReactContextBaseJavaModule {
  private final ReactApplicationContext context;

  CampusGoogleSignInModule(ReactApplicationContext context) {
    super(context);
    this.context = context;
  }

  @Override
  public String getName() {
    return "CampusGoogleSignIn";
  }

  @ReactMethod
  public void signIn(String webClientId, Promise promise) {
    if (webClientId == null || webClientId.trim().isEmpty() || webClientId.length() > 512) {
      promise.reject("GOOGLE_SIGN_IN_CONFIG", "Google sign-in is not configured.");
      return;
    }

    Activity activity = getCurrentActivity();
    if (activity == null) {
      promise.reject("GOOGLE_SIGN_IN_UNAVAILABLE", "Open the app before signing in with Google.");
      return;
    }

    try {
      GetSignInWithGoogleOption option =
          new GetSignInWithGoogleOption.Builder(webClientId).build();
      GetCredentialRequest request =
          new GetCredentialRequest.Builder().addCredentialOption(option).build();
      CredentialManager credentialManager = CredentialManager.create(activity);
      Executor mainExecutor = activity::runOnUiThread;

      credentialManager.getCredentialAsync(
          activity,
          request,
          null,
          mainExecutor,
          new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
            @Override
            public void onResult(GetCredentialResponse result) {
              if (!(result.getCredential() instanceof CustomCredential)) {
                promise.reject(
                    "GOOGLE_SIGN_IN_INVALID_RESPONSE",
                    "Google returned an unsupported sign-in credential.");
                return;
              }

              CustomCredential credential = (CustomCredential) result.getCredential();
              if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(
                  credential.getType())) {
                promise.reject(
                    "GOOGLE_SIGN_IN_INVALID_RESPONSE",
                    "Google returned an unsupported sign-in credential.");
                return;
              }

              try {
                String idToken = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                if (idToken == null || idToken.trim().isEmpty()) {
                  promise.reject(
                      "GOOGLE_SIGN_IN_INVALID_RESPONSE",
                      "Google did not return an ID token.");
                } else {
                  promise.resolve(idToken);
                }
              } catch (RuntimeException error) {
                promise.reject(
                    "GOOGLE_SIGN_IN_INVALID_RESPONSE",
                    "Google returned an invalid sign-in response.");
              }
            }

            @Override
            public void onError(GetCredentialException error) {
              if (error instanceof GetCredentialCancellationException) {
                promise.reject("GOOGLE_SIGN_IN_CANCELED", "Google sign-in was cancelled.");
              } else if (error instanceof NoCredentialException) {
                promise.reject(
                    "GOOGLE_SIGN_IN_NO_CREDENTIAL",
                    "No Google account is available on this device.");
              } else {
                promise.reject(
                    "GOOGLE_SIGN_IN_FAILED",
                    "Could not complete Google sign-in. Try again.");
              }
            }
          });
    } catch (Exception error) {
      promise.reject("GOOGLE_SIGN_IN_FAILED", "Could not open Google sign-in. Try again.");
    }
  }

  @ReactMethod
  public void clearCredentialState(Promise promise) {
    try {
      Executor mainExecutor = command -> new Handler(Looper.getMainLooper()).post(command);
      CredentialManager.create(context).clearCredentialStateAsync(
          new ClearCredentialStateRequest(
              ClearCredentialStateRequest.TYPE_CLEAR_CREDENTIAL_STATE),
          null,
          mainExecutor,
          new CredentialManagerCallback<Void, ClearCredentialException>() {
            @Override
            public void onResult(Void result) {
              promise.resolve(true);
            }

            @Override
            public void onError(ClearCredentialException error) {
              promise.reject("GOOGLE_SIGN_OUT_FAILED", "Could not clear Google sign-in state.");
            }
          });
    } catch (Exception error) {
      promise.reject("GOOGLE_SIGN_OUT_FAILED", "Could not clear Google sign-in state.");
    }
  }
}

final class CampusGoogleSignInPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext context) {
    return Collections.singletonList(new CampusGoogleSignInModule(context));
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext context) {
    return Collections.emptyList();
  }
}
