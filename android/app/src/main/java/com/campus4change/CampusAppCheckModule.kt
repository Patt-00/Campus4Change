package com.campus4change

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ViewManager
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.appcheck.FirebaseAppCheck

class CampusAppCheckModule(
    private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    private val lock = Any()

    companion object {
        private const val APP_CHECK_APP_NAME = "Campus4ChangeAppCheck"
        private const val TAG = "CampusAppCheck"
    }

    @Volatile
    private var appCheck: FirebaseAppCheck? = null

    override fun getName() = "CampusAppCheck"

    @ReactMethod
    fun getAppCheckToken(config: ReadableMap, promise: Promise) {
        val provider = try {
            getOrCreateAppCheck(config)
        } catch (error: Exception) {
            Log.w(TAG, "App Check setup failed (${error.javaClass.simpleName}).")
            promise.reject("APPCHECK_SETUP", "Firebase App Check could not be initialized.")
            return
        }

        provider.getAppCheckToken(false)
            .addOnSuccessListener { token ->
                promise.resolve(
                    Arguments.createMap().apply {
                        putString("token", token.token)
                        putDouble("expireTimeMillis", token.expireTimeMillis.toDouble())
                    },
                )
            }
            .addOnFailureListener { error ->
                // Do not forward native provider messages or token data to the JS error path.
                Log.w(TAG, "App Check token request failed (${error.javaClass.simpleName}).")
                promise.reject("APPCHECK_TOKEN", "Firebase App Check could not obtain a token.")
            }
    }

    private fun getOrCreateAppCheck(config: ReadableMap): FirebaseAppCheck = synchronized(lock) {
        appCheck?.let { return it }

        val apiKey = requiredConfig(config, "apiKey")
        val projectId = requiredConfig(config, "projectId")
        val androidAppId = requiredConfig(config, "androidAppId")
        val senderId = requiredConfig(config, "messagingSenderId")
        check(androidAppId.startsWith("1:$senderId:android:")) {
            "Firebase Android app ID does not match its project number."
        }
        val storageBucket = config.getString("storageBucket")
        val options = FirebaseOptions.Builder()
            .setApiKey(apiKey)
            .setApplicationId(androidAppId)
            .setProjectId(projectId)
            .setGcmSenderId(senderId)
            .setStorageBucket(storageBucket)
            .build()

        val firebaseApp = FirebaseApp.getApps(context)
            .firstOrNull { it.name == APP_CHECK_APP_NAME }
            ?: FirebaseApp.initializeApp(context, options, APP_CHECK_APP_NAME)
            ?: error("Firebase App Check app initialization failed.")

        check(
            firebaseApp.options.apiKey == apiKey &&
                firebaseApp.options.projectId == projectId &&
                firebaseApp.options.applicationId == androidAppId,
        ) { "Firebase App Check configuration does not match this app." }

        FirebaseAppCheck.getInstance(firebaseApp).also {
            // The JavaScript App Check SDK owns the refresh loop for Firebase JS requests.
            it.installAppCheckProviderFactory(CampusAppCheckProvider.factory(), false)
            appCheck = it
        }
    }

    private fun requiredConfig(config: ReadableMap, key: String): String =
        config.getString(key)?.trim()?.takeIf { it.isNotEmpty() && it.length <= 512 }
            ?: throw IllegalArgumentException("Invalid Firebase App Check configuration.")
}

class CampusAppCheckPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(CampusAppCheckModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
