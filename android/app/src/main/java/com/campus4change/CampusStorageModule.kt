package com.campus4change

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.security.KeyStore
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Android-only local accounts, encrypted app state, and private profile photos. */
class CampusStorageModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), ActivityEventListener {
    private val worker = Executors.newSingleThreadExecutor()
    private val prefs = context.getSharedPreferences("campus_private", 0)
    private val appPreferences = context.getSharedPreferences("campus_app_preferences", 0)
    @Volatile private var activeUser: String? = null
    private var pendingProfilePhotoPromise: Promise? = null
    private var pendingProfilePhotoUserId: String? = null

    private companion object {
        const val PROFILE_PHOTO_REQUEST_CODE = 7341
        const val PROFILE_PHOTO_MAX_EDGE = 512
        const val PROFILE_PHOTO_MAX_BYTES = 450_000
    }

    init {
        context.addActivityEventListener(this)
        // Queue cleanup before any bridge method can enqueue local account work.
        worker.execute {
            try {
                check(prefs.edit().remove("biometric_user").commit()) {
                    "Could not clear the removed biometric sign-in preference."
                }
                removeLegacySeedAccount()
            } catch (error: Exception) {
                Log.e(
                    "CampusStorage",
                    "Legacy seeded-account migration failed: ${error.javaClass.simpleName}",
                )
            }
        }
    }

    override fun getName() = "CampusStorage"

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("campus_state_v1", null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("campus_state_v1", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }

    private fun read(name: String): String? {
        val value = prefs.getString(name, null) ?: return null
        val parts = value.split(":")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
        return String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
            Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
    }

    private fun write(name: String, value: String) {
        val encrypted = encrypt(value)
        check(prefs.edit().putString(name, encrypted).commit()) { "Could not save data on this device." }
    }

    private fun firebaseAuthKey(key: String): String {
        require(
            (key == "__sak" || key.startsWith("firebase:")) && key.length <= 512
        ) { "Invalid Firebase storage key." }
        val encoded = Base64.encodeToString(
            key.toByteArray(Charsets.UTF_8),
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
        return "firebase_auth_$encoded"
    }

    private fun requireActiveUser(expectedUserId: String) {
        require(expectedUserId.isNotBlank() && expectedUserId.length <= 256) { "Invalid account ID." }
        check(activeUser == expectedUserId) { "The active account changed. Please try again." }
    }

    private fun account(name: String, email: String, studentId: String, password: String, id: String = UUID.randomUUID().toString()): JSONObject {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val hashParameters = CampusPasswordHash.currentParameters(Build.VERSION.SDK_INT)
        return JSONObject().put("id", id).put("name", name).put("email", email).put("studentId", studentId)
            .put("salt", Base64.encodeToString(salt, Base64.NO_WRAP))
            .put("hash", Base64.encodeToString(CampusPasswordHash.derive(password, salt, hashParameters), Base64.NO_WRAP))
            .put("passwordHashAlgorithm", hashParameters.algorithm)
            .put("passwordHashIterations", hashParameters.iterations)
    }

    private fun isLegacySeedAccount(account: JSONObject): Boolean =
        LegacySeedIdentity.matchesAccount(
            account.optString("id"),
            account.optString("email"),
            account.optString("studentId"),
        )

    private fun removeLegacySeedAccount() {
        val serializedAccounts = read("accounts")
        val existing = serializedAccounts?.let { JSONArray(it) } ?: JSONArray()
        val retained = JSONArray()
        var foundLegacyAccount = false
        for (index in 0 until existing.length()) {
            val account = existing.optJSONObject(index)
            if (account != null && isLegacySeedAccount(account)) {
                foundLegacyAccount = true
            } else if (account != null) {
                retained.put(account)
            }
        }
        val legacyStateProfile = runCatching { read("state_demo") }
            .getOrNull()
            ?.let { runCatching { JSONObject(it).optJSONObject("profile") }.getOrNull() }
        val cleanup = LegacySeedIdentity.cleanupPlan(
            legacyAccountFound = foundLegacyAccount,
            stateProfileId = legacyStateProfile?.optString("id"),
            stateEmail = legacyStateProfile?.optString("email"),
        ) ?: return

        // Commit the account list and state together so a failed write cannot
        // leave the removed seed's state orphaned.
        val editor = prefs.edit()
        if (cleanup.removeAccount && serializedAccounts != null) {
            editor.putString("accounts", encrypt(retained.toString()))
        }
        if (cleanup.removeState) editor.remove("state_demo")
        check(editor.commit()) { "Could not remove the legacy seeded account." }
        if (cleanup.removeAccount && activeUser == "demo") activeUser = null
    }

    private fun accounts(): JSONArray {
        removeLegacySeedAccount()
        read("accounts")?.let { return JSONArray(it) }
        return JSONArray()
    }

    private fun accountIdentities(list: JSONArray): List<LocalAccountIdentity> {
        val identities = mutableListOf<LocalAccountIdentity>()
        for (index in 0 until list.length()) {
            val account = list.getJSONObject(index)
            identities.add(
                LocalAccountIdentity(
                    account.optString("id"),
                    account.optString("email"),
                    account.optString("studentId"),
                ),
            )
        }
        return identities
    }

    private fun publicAccount(a: JSONObject): String = JSONObject().put("id", a.getString("id"))
        .put("name", a.getString("name")).put("email", a.getString("email"))
        .put("studentId", a.getString("studentId")).toString()

    private fun run(promise: Promise, block: () -> Any?) {
        worker.execute { try { promise.resolve(block()) } catch (e: Exception) { promise.reject("LOCAL_ACCOUNT", e.message ?: "Device storage failed.") } }
    }

    @ReactMethod fun signUp(name: String, email: String, password: String, promise: Promise) = run(promise) {
        require(name.trim().length >= 2 && email.matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) && password.length in 8..CampusPasswordHash.MAX_PASSWORD_LENGTH) { "Enter your name and a valid email. Use 8–1024 characters for the password." }
        val list = accounts()
        for (i in 0 until list.length()) {
            val item = list.getJSONObject(i)
            require(!item.getString("email").equals(email.trim(), true)) { "An account already uses that email on this device." }
        }
        val a = account(name.trim(), email.trim().lowercase(), "", password)
        list.put(a); write("accounts", list.toString()); activeUser = a.getString("id")
        publicAccount(a)
    }

    @ReactMethod fun isStudentIdUnique(expectedUserId: String, studentId: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        LocalStudentIdUniqueness.isUniqueForAccount(
            accountIdentities(accounts()),
            expectedUserId,
            studentId,
        )
    }

    @ReactMethod fun completeAccountSetup(expectedUserId: String, studentId: String, value: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        val normalizedStudentId = studentId.trim()
        require(LocalStudentIdUniqueness.isValidStudentId(normalizedStudentId)) { "Enter a Student ID using digits only." }
        val list = accounts()
        val identities = accountIdentities(list)
        val accountIndex = identities.indexOfFirst { it.id == expectedUserId }
        require(accountIndex >= 0) { "The local account could not be found. Sign in again." }
        require(
            !LocalStudentIdUniqueness.hasConflict(
                identities,
                expectedUserId,
                normalizedStudentId,
            ),
        ) {
            "That Student ID is already in use on this device. Check the number and try again."
        }

        val parsedState = JSONObject(value)
        val profile = parsedState.optJSONObject("profile")
        require(
            profile != null &&
                profile.optString("id") == expectedUserId &&
                profile.optString("studentId") == normalizedStudentId
        ) { "The profile does not match the active account." }

        val previousPhoto = profilePhotoUri(read("state_$expectedUserId"))
        list.getJSONObject(accountIndex).put("studentId", normalizedStudentId)
        val editor = prefs.edit()
            .putString("accounts", encrypt(list.toString()))
            .putString("state_$expectedUserId", encrypt(value))
        check(editor.commit()) { "Could not save the completed profile on this device." }
        val nextPhoto = profilePhotoUri(value)
        if (previousPhoto != nextPhoto) cleanProfilePhotos(expectedUserId, nextPhoto)
        true
    }

    @ReactMethod fun signIn(identifier: String, password: String, promise: Promise) = run(promise) {
        val list = accounts()
        val matchIndex = LocalStudentIdUniqueness.findSignInMatch(
            accountIdentities(list),
            identifier,
        )
        val a = if (matchIndex >= 0) list.getJSONObject(matchIndex) else null
        requireNotNull(a) { "Email/Student ID or password is incorrect." }
        require(password.isNotEmpty() && password.length <= CampusPasswordHash.MAX_PASSWORD_LENGTH) { "Enter a password no longer than ${CampusPasswordHash.MAX_PASSWORD_LENGTH} characters." }
        val storedParameters = CampusPasswordHash.fromStoredMetadata(
            if (a.has("passwordHashAlgorithm")) a.getString("passwordHashAlgorithm") else null,
            if (a.has("passwordHashIterations")) a.getInt("passwordHashIterations") else null,
        )
        val salt = Base64.decode(a.getString("salt"), Base64.NO_WRAP)
        require(
            CampusPasswordHash.matches(
                password,
                salt,
                storedParameters,
                Base64.decode(a.getString("hash"), Base64.NO_WRAP),
            ),
        ) { "Email/Student ID or password is incorrect." }
        val currentParameters = CampusPasswordHash.currentParameters(Build.VERSION.SDK_INT)
        if (CampusPasswordHash.needsUpgrade(storedParameters, currentParameters)) {
            try {
                list.put(
                    matchIndex,
                    account(
                        a.getString("name"),
                        a.getString("email"),
                        a.getString("studentId"),
                        password,
                        a.getString("id"),
                    ),
                )
                write("accounts", list.toString())
            } catch (error: Exception) {
                // Keep a verified local sign-in available if rehash persistence fails.
                Log.w(
                    "CampusStorage",
                    "Local password hash upgrade failed: ${error.javaClass.simpleName}",
                )
            }
        }
        activeUser = a.getString("id"); publicAccount(a)
    }

    @ReactMethod fun loadState(expectedUserId: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        val serialized = read("state_$expectedUserId")
        cleanProfilePhotos(expectedUserId, profilePhotoUri(serialized))
        serialized
    }
    @ReactMethod fun setActiveUser(userId: String, promise: Promise) = run(promise) {
        require(userId.isNotBlank() && userId.length <= 256) { "Invalid account ID." }
        activeUser = userId
        true
    }
    @ReactMethod fun saveState(expectedUserId: String, value: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        val previousPhoto = profilePhotoUri(read("state_$expectedUserId"))
        val parsed = JSONObject(value)
        val nextPhoto = profilePhotoUri(parsed.toString())
        write("state_$expectedUserId", value)
        if (previousPhoto != nextPhoto) {
            cleanProfilePhotos(expectedUserId, nextPhoto)
        }
        true
    }
    @ReactMethod fun signOut(expectedUserId: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        activeUser = null
        true
    }

    // This device-wide display preference is not part of any account's private data.
    @ReactMethod fun hasCompletedIntroduction(promise: Promise) = run(promise) {
        appPreferences.getBoolean("introduction_completed_v1", false)
    }

    @ReactMethod fun markIntroductionCompleted(promise: Promise) = run(promise) {
        check(
            appPreferences.edit().putBoolean("introduction_completed_v1", true).commit(),
        ) { "Could not save the introduction preference on this device." }
        true
    }

    // Firebase Auth's refresh token is kept in the same AES-GCM protected
    // private preferences as local app data, rather than plain AsyncStorage.
    @ReactMethod fun getFirebaseAuthValue(key: String, promise: Promise) = run(promise) {
        read(firebaseAuthKey(key))
    }
    @ReactMethod fun setFirebaseAuthValue(key: String, value: String, promise: Promise) = run(promise) {
        require(value.length <= 100_000) { "Firebase sign-in data is too large." }
        write(firebaseAuthKey(key), value)
        true
    }
    @ReactMethod fun removeFirebaseAuthValue(key: String, promise: Promise) = run(promise) {
        check(prefs.edit().remove(firebaseAuthKey(key)).commit()) { "Could not clear Firebase sign-in data." }
        true
    }

    @ReactMethod fun pickProfilePhoto(expectedUserId: String, promise: Promise) {
        try {
            requireActiveUser(expectedUserId)
            check(pendingProfilePhotoPromise == null) { "Finish the current photo selection first." }
            val activity = context.currentActivity
                ?: throw IllegalStateException("Open the app before choosing a profile photo.")
            val intent = if (Build.VERSION.SDK_INT >= 33) {
                Intent(MediaStore.ACTION_PICK_IMAGES).apply { type = "image/*" }
            } else {
                Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }
            }.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            pendingProfilePhotoPromise = promise
            pendingProfilePhotoUserId = expectedUserId
            activity.runOnUiThread {
                try {
                    activity.startActivityForResult(intent, PROFILE_PHOTO_REQUEST_CODE)
                } catch (error: Exception) {
                    pendingProfilePhotoPromise = null
                    pendingProfilePhotoUserId = null
                    promise.reject("PROFILE_PHOTO", error.message ?: "Could not open the photo picker.")
                }
            }
        } catch (error: Exception) {
            promise.reject("PROFILE_PHOTO", error.message ?: "Could not open the photo picker.")
        }
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
    ) {
        if (requestCode != PROFILE_PHOTO_REQUEST_CODE) return
        val promise = pendingProfilePhotoPromise ?: return
        val expectedUserId = pendingProfilePhotoUserId
        pendingProfilePhotoPromise = null
        pendingProfilePhotoUserId = null
        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            promise.resolve(null)
            return
        }
        val uri = data.data ?: run {
            promise.resolve(null)
            return
        }
        if (expectedUserId == null) {
            promise.reject("PROFILE_PHOTO", "The active account changed. Choose the photo again.")
            return
        }
        worker.execute {
            try {
                requireActiveUser(expectedUserId)
                val savedPhotoUri = profilePhotoUri(read("state_$expectedUserId"))
                cleanProfilePhotos(expectedUserId, savedPhotoUri)
                val bitmap = decodeProfilePhoto(uri)
                val bytes = compressProfilePhoto(bitmap)
                if (bitmap.isRecycled.not()) bitmap.recycle()
                require(bytes.size <= PROFILE_PHOTO_MAX_BYTES) {
                    "Choose an image that can be reduced below 450 KB."
                }
                val destination = profilePhotoFile(expectedUserId)
                check(destination.parentFile?.mkdirs() == true || destination.parentFile?.isDirectory == true) {
                    "Could not prepare private photo storage on this device."
                }
                val temporary = File(destination.parentFile, destination.name + ".tmp")
                FileOutputStream(temporary).use { output ->
                    output.write(bytes)
                    output.fd.sync()
                }
                check(temporary.renameTo(destination)) {
                    temporary.delete()
                    "Could not save the profile photo on this device."
                }
                promise.resolve("file://${destination.absolutePath}")
            } catch (error: Exception) {
                promise.reject("PROFILE_PHOTO", error.message ?: "Could not save this profile photo.")
            }
        }
    }

    override fun onNewIntent(intent: Intent) = Unit

    private fun profilePhotoPrefix(expectedUserId: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(expectedUserId.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) } + "-"

    private fun profilePhotoFile(expectedUserId: String): File = File(
        File(context.filesDir, "profile_photos"),
        profilePhotoPrefix(expectedUserId) + UUID.randomUUID().toString() + ".jpg",
    )

    private fun profilePhotoUri(serializedState: String?): String? {
        if (serializedState.isNullOrBlank()) return null
        return runCatching {
            JSONObject(serializedState)
                .optJSONObject("profile")
                ?.optString("profilePhotoUri")
                ?.takeIf { it.startsWith("file://") && it.contains("/profile_photos/") }
        }.getOrNull()
    }

    private fun cleanProfilePhotos(expectedUserId: String, keepUri: String?) {
        val directory = File(context.filesDir, "profile_photos")
        val keepPath = keepUri?.removePrefix("file://")
        directory.listFiles()
            ?.filter { file ->
                file.name.startsWith(profilePhotoPrefix(expectedUserId)) &&
                    file.absolutePath != keepPath
            }
            ?.forEach { file ->
                if (file.exists()) {
                    if (!file.delete()) {
                        Log.w("CampusStorage", "Unused profile photo cleanup failed.")
                    }
                }
            }
    }

    private fun decodeProfilePhoto(uri: Uri): Bitmap {
        if (Build.VERSION.SDK_INT >= 28) {
            val source = ImageDecoder.createSource(context.contentResolver, uri)
            return ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
                val width = info.size.width
                val height = info.size.height
                require(width > 0 && height > 0) { "This image could not be read." }
                val scale = minOf(1.0, PROFILE_PHOTO_MAX_EDGE.toDouble() / maxOf(width, height))
                decoder.setTargetSize(
                    (width * scale).toInt().coerceAtLeast(1),
                    (height * scale).toInt().coerceAtLeast(1),
                )
            }
        }

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri).use { stream ->
            requireNotNull(stream) { "This image could not be opened." }
            BitmapFactory.decodeStream(stream, null, bounds)
        }
        require(bounds.outWidth > 0 && bounds.outHeight > 0) { "This image could not be read." }
        var sample = 1
        while (maxOf(bounds.outWidth / sample, bounds.outHeight / sample) > PROFILE_PHOTO_MAX_EDGE * 2) {
            sample *= 2
        }
        val options = BitmapFactory.Options().apply { inSampleSize = sample }
        val decoded = context.contentResolver.openInputStream(uri).use { stream ->
            requireNotNull(stream) { "This image could not be opened." }
            BitmapFactory.decodeStream(stream, null, options)
        } ?: throw IllegalArgumentException("This image could not be decoded.")
        val scale = minOf(
            1.0,
            PROFILE_PHOTO_MAX_EDGE.toDouble() / maxOf(decoded.width, decoded.height),
        )
        if (scale >= 1.0) return decoded
        val scaled = Bitmap.createScaledBitmap(
            decoded,
            (decoded.width * scale).toInt().coerceAtLeast(1),
            (decoded.height * scale).toInt().coerceAtLeast(1),
            true,
        )
        if (scaled !== decoded) decoded.recycle()
        return scaled
    }

    private fun compressProfilePhoto(bitmap: Bitmap): ByteArray {
        val output = ByteArrayOutputStream()
        var quality = 88
        var encoded = false
        do {
            output.reset()
            encoded = bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)
            quality -= 8
        } while (output.size() > PROFILE_PHOTO_MAX_BYTES && quality >= 56)
        check(encoded && output.size() > 0) { "Could not encode this profile photo." }
        return output.toByteArray()
    }
    override fun invalidate() {
        context.removeActivityEventListener(this)
        pendingProfilePhotoPromise?.reject("PROFILE_PHOTO", "The app closed before photo selection finished.")
        pendingProfilePhotoPromise = null
        pendingProfilePhotoUserId = null
        worker.shutdown()
        super.invalidate()
    }
}

class CampusStoragePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(CampusStorageModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
