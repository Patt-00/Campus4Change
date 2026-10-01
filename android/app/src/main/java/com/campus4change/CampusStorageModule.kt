package com.campus4change

import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec

/** Android-only local prototype accounts and encrypted, per-account app state. */
class CampusStorageModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val worker = Executors.newSingleThreadExecutor()
    private val prefs = context.getSharedPreferences("campus_private", 0)
    @Volatile private var activeUser: String? = null
    private var biometricCancel: CancellationSignal? = null

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

    private fun write(name: String, value: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val encrypted = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
            Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        check(prefs.edit().putString(name, encrypted).commit()) { "Could not save data on this device." }
    }

    private fun hash(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, 210000, 256)
        return try { SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1").generateSecret(spec).encoded }
        finally { spec.clearPassword() }
    }

    private fun account(name: String, email: String, studentId: String, password: String, id: String = UUID.randomUUID().toString()): JSONObject {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        return JSONObject().put("id", id).put("name", name).put("email", email).put("studentId", studentId)
            .put("salt", Base64.encodeToString(salt, Base64.NO_WRAP))
            .put("hash", Base64.encodeToString(hash(password, salt), Base64.NO_WRAP))
    }

    private fun accounts(): JSONArray {
        read("accounts")?.let { return JSONArray(it) }
        val list = JSONArray().put(account("Alex Rivera", "alex@campus.demo", "DEMO", "Campus123!", "demo"))
        write("accounts", list.toString())
        return list
    }

    private fun publicAccount(a: JSONObject): String = JSONObject().put("id", a.getString("id"))
        .put("name", a.getString("name")).put("email", a.getString("email"))
        .put("studentId", a.getString("studentId")).toString()

    private fun run(promise: Promise, block: () -> Any?) {
        worker.execute { try { promise.resolve(block()) } catch (e: Exception) { promise.reject("LOCAL_ACCOUNT", e.message ?: "Device storage failed.") } }
    }

    @ReactMethod fun signUp(name: String, email: String, studentId: String, password: String, promise: Promise) = run(promise) {
        require(name.trim().length >= 2 && email.matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) && studentId.trim().isNotEmpty() && password.length >= 8) { "Complete all fields. Use a password with at least 8 characters." }
        val list = accounts()
        for (i in 0 until list.length()) {
            val item = list.getJSONObject(i)
            require(!item.getString("email").equals(email.trim(), true) && !item.getString("studentId").equals(studentId.trim(), true)) { "An account with that email or Student ID already exists on this device." }
        }
        val a = account(name.trim(), email.trim().lowercase(), studentId.trim(), password)
        list.put(a); write("accounts", list.toString()); activeUser = a.getString("id")
        publicAccount(a)
    }

    @ReactMethod fun signIn(identifier: String, password: String, promise: Promise) = run(promise) {
        val list = accounts()
        var match: JSONObject? = null
        for (i in 0 until list.length()) {
            val a = list.getJSONObject(i)
            if (a.getString("email").equals(identifier.trim(), true) || a.getString("studentId").equals(identifier.trim(), true)) match = a
        }
        val a = match ?: throw IllegalArgumentException("Email/Student ID or password is incorrect.")
        require(MessageDigest.isEqual(hash(password, Base64.decode(a.getString("salt"), Base64.NO_WRAP)), Base64.decode(a.getString("hash"), Base64.NO_WRAP))) { "Email/Student ID or password is incorrect." }
        activeUser = a.getString("id"); publicAccount(a)
    }

    @ReactMethod fun loadState(promise: Promise) = run(promise) { read("state_${activeUser ?: error("Sign in first.")}") }
    @ReactMethod fun saveState(value: String, promise: Promise) {
        val user = activeUser ?: return promise.reject("SIGNED_OUT", "Sign in first.")
        run(promise) { JSONObject(value); write("state_$user", value); true }
    }
    @ReactMethod fun signOut(promise: Promise) = run(promise) { activeUser = null; true }
    @ReactMethod fun enableBiometrics(promise: Promise) {
        val id = activeUser
        if (id == null || id == "demo") {
            promise.reject("BIOMETRIC", "Sign in to your own local account before enabling biometrics.")
            return
        }
        authenticate(promise) { write("biometric_user", id); true }
    }

    @ReactMethod fun biometricSignIn(promise: Promise) {
        worker.execute {
            try {
                val id = read("biometric_user") ?: error("Sign in with your password, then enable biometrics in Profile.")
                val list = accounts()
                val a = (0 until list.length()).map { list.getJSONObject(it) }.first { it.getString("id") == id }
                authenticate(promise) { activeUser = id; publicAccount(a) }
            } catch(e: Exception) { promise.reject("BIOMETRIC", e.message ?: "Biometrics are unavailable.") }
        }
    }

    private fun authenticate(promise: Promise, success: () -> Any?) {
        if (Build.VERSION.SDK_INT < 28) {
            promise.reject("UNAVAILABLE", "Biometrics need Android 9 or newer.")
            return
        }
        val activity = context.currentActivity
        if (activity == null) {
            promise.reject("BIOMETRIC", "Open the app before using biometrics.")
            return
        }
        activity.runOnUiThread {
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    val manager = activity.getSystemService(android.hardware.biometrics.BiometricManager::class.java)
                    require(manager.canAuthenticate() == android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS) {
                        "Enroll biometrics in Android Settings before using this feature."
                    }
                }
                    biometricCancel?.cancel()
                    val cancel = CancellationSignal().also { biometricCancel = it }
                    BiometricPrompt.Builder(activity).setTitle("Sign in to Campus4Change")
                        .setSubtitle("Use the biometrics enrolled on this device")
                        .setNegativeButton("Cancel", activity.mainExecutor) { _, _ -> cancel.cancel() }
                        .build().authenticate(cancel, activity.mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
                            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                                if (biometricCancel === cancel) biometricCancel = null
                                run(promise, success)
                            }
                            override fun onAuthenticationError(code: Int, message: CharSequence) {
                                if (biometricCancel === cancel) biometricCancel = null
                                promise.reject("BIOMETRIC", message.toString())
                            }
                        })
            } catch(e: Exception) { promise.reject("BIOMETRIC", e.message ?: "Biometrics are unavailable.") }
        }
    }

    override fun invalidate() { biometricCancel?.cancel(); worker.shutdown(); super.invalidate() }
}

class CampusStoragePackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(CampusStorageModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
