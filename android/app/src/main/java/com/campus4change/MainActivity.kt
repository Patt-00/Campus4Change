package com.campus4change

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  private lateinit var profilePhotoCaptureLauncher: ActivityResultLauncher<Uri>
  private var profilePhotoCaptureCallback: ((Boolean) -> Unit)? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    super.onCreate(savedInstanceState)
    profilePhotoCaptureLauncher = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
      persistCameraResult(if (success) Activity.RESULT_OK else Activity.RESULT_CANCELED)
      val callback = profilePhotoCaptureCallback
      profilePhotoCaptureCallback = null
      callback?.invoke(success)
    }
  }

  fun launchProfilePhotoCapture(uri: Uri, callback: (Boolean) -> Unit) {
    check(profilePhotoCaptureCallback == null) { "A profile photo capture is already in progress." }
    profilePhotoCaptureCallback = callback
    profilePhotoCaptureLauncher.launch(uri)
  }

  private fun persistCameraResult(resultCode: Int) {
    getSharedPreferences(ProfilePhotoCaptureContract.RESULT_PREFERENCES, MODE_PRIVATE)
      .edit()
      .putInt(ProfilePhotoCaptureContract.RESULT_CODE_KEY, resultCode)
      .commit()
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == ProfilePhotoCaptureContract.CAMERA_REQUEST_CODE) {
      persistCameraResult(resultCode)
    }
    super.onActivityResult(requestCode, resultCode, data)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Campus4Change"

  /** Returns the default activity delegate for the React Native architecture. */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName)
}
