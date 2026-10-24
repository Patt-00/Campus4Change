package com.campus4change

/** Request and durable result identifiers shared by the Activity and storage module. */
internal object ProfilePhotoCaptureContract {
    const val PHOTO_PICKER_REQUEST_CODE = 7341
    const val CAMERA_REQUEST_CODE = 7342
    const val RESULT_PREFERENCES = "campus_profile_photo_capture"
    const val RESULT_CODE_KEY = "camera_result_code"
}
