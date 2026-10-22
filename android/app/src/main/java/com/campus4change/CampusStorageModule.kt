package com.campus4change

import android.app.Activity
import android.Manifest
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
import android.content.pm.PackageManager
import androidx.core.content.FileProvider
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.URLDecoder
import java.net.URLEncoder
import java.security.MessageDigest
import java.security.KeyStore
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

internal data class PendingProfilePhotoCapture(
    val accountId: String,
    val capturePath: String,
    val captureUri: String,
    val resultReady: Boolean = false,
    val savedUri: String? = null,
) {
    fun serialize(): String = listOf(
        "1",
        encode(accountId),
        encode(capturePath),
        encode(captureUri),
        if (resultReady) "1" else "0",
        savedUri?.let(::encode) ?: "-",
    ).joinToString("\n")

    private fun encode(value: String): String = URLEncoder.encode(value, "UTF-8")

    companion object {
        fun deserialize(value: String?): PendingProfilePhotoCapture? = runCatching {
            val fields = value?.split('\n', limit = 6) ?: return null
            if (fields.size != 6 || fields[0] != "1") return null
            val accountId = URLDecoder.decode(fields[1], "UTF-8")
            val capturePath = URLDecoder.decode(fields[2], "UTF-8")
            val captureUri = URLDecoder.decode(fields[3], "UTF-8")
            val resultReady = when (fields[4]) {
                "0" -> false
                "1" -> true
                else -> return null
            }
            val savedUri = if (fields[5] == "-") {
                null
            } else {
                URLDecoder.decode(fields[5], "UTF-8").takeIf(String::isNotBlank)
                    ?: return null
            }
            if (accountId.isBlank() || capturePath.isBlank() || captureUri.isBlank()) {
                return null
            }
            PendingProfilePhotoCapture(
                accountId = accountId,
                capturePath = capturePath,
                captureUri = captureUri,
                resultReady = resultReady,
                savedUri = savedUri,
            )
        }.getOrNull()
    }
}

internal fun deleteUnusedProfilePhotos(
    directory: File,
    ownerFilePrefix: String,
    keepUri: String?,
): List<File> {
    val keepPath = keepUri?.removePrefix("file://")
    val failedDeletes = mutableListOf<File>()
    directory.listFiles()
        ?.filter { file ->
            file.name.startsWith(ownerFilePrefix) && file.absolutePath != keepPath
        }
        ?.forEach { file ->
            if (file.exists() && !file.delete() && file.exists()) {
                failedDeletes.add(file)
            }
        }
    return failedDeletes
}

/** Android-only local accounts, encrypted app state, and private profile photos. */
class CampusStorageModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), ActivityEventListener {
    private val worker = Executors.newSingleThreadExecutor()
    private val prefs = context.getSharedPreferences("campus_private", 0)
    private val appPreferences = context.getSharedPreferences("campus_app_preferences", 0)
    @Volatile private var activeUser: String? = null
    private var pendingProfilePhotoPromise: Promise? = null
    private var pendingProfilePhotoUserId: String? = null
    private var pendingProfilePhotoCaptureFile: File? = null
    private var pendingProfilePhotoCaptureUri: Uri? = null

    private companion object {
        const val PROFILE_PHOTO_REQUEST_CODE = ProfilePhotoCaptureContract.PHOTO_PICKER_REQUEST_CODE
        const val PROFILE_CAMERA_REQUEST_CODE = ProfilePhotoCaptureContract.CAMERA_REQUEST_CODE
        const val PENDING_PROFILE_PHOTO_KEY = "pending_profile_photo_capture_v1"
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

    private fun pendingProfilePhotoCapture(): PendingProfilePhotoCapture? =
        PendingProfilePhotoCapture.deserialize(read(PENDING_PROFILE_PHOTO_KEY))

    private fun savePendingProfilePhotoCapture(capture: PendingProfilePhotoCapture) {
        write(PENDING_PROFILE_PHOTO_KEY, capture.serialize())
    }

    private fun storedCameraActivityResult(): Int? {
        val resultPreferences = context.getSharedPreferences(
            ProfilePhotoCaptureContract.RESULT_PREFERENCES,
            0,
        )
        return if (resultPreferences.contains(ProfilePhotoCaptureContract.RESULT_CODE_KEY)) {
            resultPreferences.getInt(ProfilePhotoCaptureContract.RESULT_CODE_KEY, Activity.RESULT_CANCELED)
        } else {
            null
        }
    }

    private fun clearCameraActivityResult() {
        check(
            context.getSharedPreferences(ProfilePhotoCaptureContract.RESULT_PREFERENCES, 0)
                .edit()
                .remove(ProfilePhotoCaptureContract.RESULT_CODE_KEY)
                .commit(),
        ) { "Could not clear the camera result." }
    }

    private fun profilePhotoCaptureFile(capture: PendingProfilePhotoCapture): File? =
        runCatching {
            val directory = File(context.cacheDir, "profile-photo-captures").canonicalFile
            val file = File(capture.capturePath).canonicalFile
            file.takeIf { it.parentFile == directory && it.extension == "jpg" }
        }.getOrNull()

    private fun clearPendingProfilePhotoRecovery(deleteCaptureFile: Boolean = true) {
        val capture = pendingProfilePhotoCapture()
        if (deleteCaptureFile && capture != null) {
            profilePhotoCaptureFile(capture)?.delete()
        }
        check(prefs.edit().remove(PENDING_PROFILE_PHOTO_KEY).commit()) {
            "Could not clear the pending profile photo."
        }
        clearCameraActivityResult()
    }

    private fun hasSavedProfilePhoto(expectedUserId: String, uri: String): Boolean =
        runCatching {
            val directory = File(context.filesDir, "profile_photos").canonicalFile
            val file = File(Uri.parse(uri).path ?: return false).canonicalFile
            file.parentFile == directory &&
                file.name.startsWith(profilePhotoPrefix(expectedUserId)) &&
                file.isFile
        }.getOrDefault(false)

    private fun resolvePendingProfilePhoto(
        expectedUserId: String,
        capture: PendingProfilePhotoCapture,
    ): String {
        requireActiveUser(expectedUserId)
        check(capture.accountId == expectedUserId) {
            "The active account changed. Choose the photo again."
        }
        capture.savedUri?.takeIf { hasSavedProfilePhoto(expectedUserId, it) }?.let {
            return it
        }
        val captureFile = profilePhotoCaptureFile(capture)
            ?: throw IllegalStateException("The pending camera photo is unavailable.")
        check(capture.resultReady && captureFile.isFile && captureFile.length() > 0) {
            "The camera did not return a photo. Try again."
        }
        val savedUri = saveProfilePhoto(expectedUserId, Uri.parse(capture.captureUri))
        savePendingProfilePhotoCapture(capture.copy(savedUri = savedUri))
        return savedUri
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
    @ReactMethod fun consumePendingProfilePhoto(expectedUserId: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        val capture = pendingProfilePhotoCapture()
        if (capture == null) {
            clearCameraActivityResult()
            return@run null
        }
        if (capture.accountId != expectedUserId) {
            clearPendingProfilePhotoRecovery()
            return@run null
        }
        val resultCode = storedCameraActivityResult()
        if (!capture.resultReady && resultCode == Activity.RESULT_CANCELED) {
            clearPendingProfilePhotoRecovery()
            return@run null
        }
        val readyCapture = if (capture.resultReady) {
            capture
        } else if (resultCode == Activity.RESULT_OK) {
            capture.copy(resultReady = true).also(::savePendingProfilePhotoCapture)
        } else {
            return@run null
        }
        clearCameraActivityResult()
        resolvePendingProfilePhoto(expectedUserId, readyCapture)
    }
    @ReactMethod fun discardProfilePhotoDraft(expectedUserId: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        val pendingCapture = pendingProfilePhotoCapture()
        if (pendingCapture?.accountId == expectedUserId) {
            clearPendingProfilePhotoRecovery()
        }
        cleanProfilePhotos(
            expectedUserId,
            profilePhotoUri(read("state_$expectedUserId")),
        )
        true
    }
    @ReactMethod fun saveState(expectedUserId: String, value: String, promise: Promise) = run(promise) {
        requireActiveUser(expectedUserId)
        val previousPhoto = profilePhotoUri(read("state_$expectedUserId"))
        val parsed = JSONObject(value)
        val nextPhoto = profilePhotoUri(parsed.toString())
        val pendingPhoto = pendingProfilePhotoCapture()
            ?.takeIf { it.accountId == expectedUserId && it.resultReady }
        write("state_$expectedUserId", value)
        if (pendingPhoto != null) {
            cleanProfilePhotos(expectedUserId, nextPhoto)
            clearPendingProfilePhotoRecovery()
        } else if (previousPhoto != nextPhoto) {
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
            pendingProfilePhotoCaptureFile = null
            pendingProfilePhotoCaptureUri = null
            activity.runOnUiThread {
                try {
                    activity.startActivityForResult(intent, PROFILE_PHOTO_REQUEST_CODE)
                } catch (error: Exception) {
                    clearPendingProfilePhoto()
                    promise.reject("PROFILE_PHOTO", error.message ?: "Could not open the photo picker.")
                }
            }
        } catch (error: Exception) {
            promise.reject("PROFILE_PHOTO", error.message ?: "Could not open the photo picker.")
        }
    }

    @ReactMethod fun captureProfilePhoto(expectedUserId: String, promise: Promise) {
        var captureFile: File? = null
        try {
            requireActiveUser(expectedUserId)
            check(pendingProfilePhotoPromise == null) { "Finish the current photo action first." }
            val previousCapture = pendingProfilePhotoCapture()
            if (previousCapture != null) {
                check(previousCapture.resultReady) {
                    "Finish the camera photo already in progress first."
                }
                clearPendingProfilePhotoRecovery()
            }
            val activity = context.currentActivity
                ?: throw IllegalStateException("Open the app before taking a profile photo.")
            val cameraActivity = activity as? MainActivity
                ?: throw IllegalStateException("Open the app before taking a profile photo.")
            check(activity.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                "Allow camera access before taking a profile photo."
            }

            val captureDirectory = File(context.cacheDir, "profile-photo-captures")
            check(captureDirectory.mkdirs() || captureDirectory.isDirectory) {
                "Could not prepare temporary camera storage."
            }
            val outputFile = File(captureDirectory, "${UUID.randomUUID()}.jpg")
            captureFile = outputFile
            val captureUri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.profilephotos",
                outputFile,
            )
            clearCameraActivityResult()
            savePendingProfilePhotoCapture(
                PendingProfilePhotoCapture(
                    accountId = expectedUserId,
                    capturePath = outputFile.absolutePath,
                    captureUri = captureUri.toString(),
                ),
            )
            pendingProfilePhotoPromise = promise
            pendingProfilePhotoUserId = expectedUserId
            pendingProfilePhotoCaptureFile = captureFile
            pendingProfilePhotoCaptureUri = captureUri
            cameraActivity.runOnUiThread {
                try {
                    cameraActivity.launchProfilePhotoCapture(captureUri) { success ->
                        handleCameraActivityResult(
                            if (success) Activity.RESULT_OK else Activity.RESULT_CANCELED,
                        )
                    }
                } catch (error: Exception) {
                    clearPendingProfilePhoto()
                    clearPendingProfilePhotoRecovery()
                    promise.reject("PROFILE_PHOTO", error.message ?: "Could not open the camera.")
                }
            }
        } catch (error: Exception) {
            captureFile?.delete()
            if (pendingProfilePhotoCapture()?.accountId == expectedUserId) {
                clearPendingProfilePhotoRecovery(deleteCaptureFile = false)
            }
            promise.reject("PROFILE_PHOTO", error.message ?: "Could not take this profile photo.")
        }
    }

    private fun clearPendingProfilePhoto() {
        pendingProfilePhotoPromise = null
        pendingProfilePhotoUserId = null
        pendingProfilePhotoCaptureFile = null
        pendingProfilePhotoCaptureUri = null
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
    ) {
        if (requestCode == PROFILE_CAMERA_REQUEST_CODE) {
            handleCameraActivityResult(resultCode)
            return
        }
        if (requestCode != PROFILE_PHOTO_REQUEST_CODE) return
        val promise = pendingProfilePhotoPromise ?: return
        val expectedUserId = pendingProfilePhotoUserId
        val photoUri = data?.data
        clearPendingProfilePhoto()
        if (resultCode != Activity.RESULT_OK || photoUri == null) {
            promise.resolve(null)
            return
        }
        if (expectedUserId == null) {
            promise.reject("PROFILE_PHOTO", "The active account changed. Choose the photo again.")
            return
        }
        worker.execute {
            try {
                promise.resolve(saveProfilePhoto(expectedUserId, photoUri))
            } catch (error: Exception) {
                promise.reject("PROFILE_PHOTO", error.message ?: "Could not save this profile photo.")
            }
        }
    }

    private fun handleCameraActivityResult(resultCode: Int) {
        val promise = pendingProfilePhotoPromise
        val previousCapture = pendingProfilePhotoCapture()
        val expectedUserId = pendingProfilePhotoUserId ?: previousCapture?.accountId
        val captureFile = pendingProfilePhotoCaptureFile
            ?: previousCapture?.let(::profilePhotoCaptureFile)
        val captureUri = pendingProfilePhotoCaptureUri
            ?: previousCapture?.captureUri?.let(Uri::parse)
        clearPendingProfilePhoto()

        if (resultCode != Activity.RESULT_OK) {
            clearPendingProfilePhotoRecovery()
            promise?.resolve(null)
            return
        }
        if (expectedUserId == null || captureFile == null || captureUri == null) {
            clearPendingProfilePhotoRecovery()
            promise?.reject("PROFILE_PHOTO", "The camera result could not be matched to your account.")
            return
        }

        val pending = (previousCapture ?: PendingProfilePhotoCapture(
            accountId = expectedUserId,
            capturePath = captureFile.absolutePath,
            captureUri = captureUri.toString(),
        )).copy(resultReady = true)
        try {
            savePendingProfilePhotoCapture(pending)
        } catch (error: Exception) {
            clearPendingProfilePhotoRecovery()
            promise?.reject("PROFILE_PHOTO", error.message ?: "Could not save the camera result.")
            return
        }
        clearCameraActivityResult()

        // The app process can be recreated while the external camera is open.
        // Keep the encrypted result record so the profile editor can recover it.
        if (promise == null) return

        worker.execute {
            try {
                promise.resolve(resolvePendingProfilePhoto(expectedUserId, pending))
            } catch (error: Exception) {
                clearPendingProfilePhotoRecovery()
                promise.reject("PROFILE_PHOTO", error.message ?: "Could not save this profile photo.")
            }
        }
    }

    private fun saveProfilePhoto(expectedUserId: String, uri: Uri): String {
        requireActiveUser(expectedUserId)
        val savedPhotoUri = profilePhotoUri(read("state_$expectedUserId"))
        cleanProfilePhotos(expectedUserId, savedPhotoUri)
        val bitmap = decodeProfilePhoto(uri)
        val bytes = try {
            compressProfilePhoto(bitmap)
        } finally {
            if (!bitmap.isRecycled) bitmap.recycle()
        }
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
        return "file://${destination.absolutePath}"
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
        deleteUnusedProfilePhotos(
            directory,
            profilePhotoPrefix(expectedUserId),
            keepUri,
        ).forEach {
            Log.w("CampusStorage", "Unused profile photo cleanup failed.")
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
        // The camera activity may still be writing into this file after the
        // React bridge is recreated, so leave the encrypted request record intact.
        clearPendingProfilePhoto()
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
