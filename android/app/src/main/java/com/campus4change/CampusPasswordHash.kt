package com.campus4change

import java.security.MessageDigest
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

internal data class PasswordHashParameters(
    val algorithm: String,
    val iterations: Int,
)

/** Versioned local password hashing with a login-time upgrade path. */
internal object CampusPasswordHash {
    const val MAX_PASSWORD_LENGTH = 1024

    private const val LEGACY_ALGORITHM = "PBKDF2WithHmacSHA1"
    private const val LEGACY_ITERATIONS = 210_000
    private const val SHA1_UPGRADED_ITERATIONS = 1_400_000
    private const val CURRENT_ALGORITHM = "PBKDF2WithHmacSHA256"
    private const val CURRENT_ITERATIONS = 600_000
    private const val KEY_LENGTH_BITS = 256

    private val legacyParameters = PasswordHashParameters(
        LEGACY_ALGORITHM,
        LEGACY_ITERATIONS,
    )

    fun currentParameters(apiLevel: Int): PasswordHashParameters =
        if (apiLevel >= 26) {
            PasswordHashParameters(CURRENT_ALGORITHM, CURRENT_ITERATIONS)
        } else {
            // Android only provides PBKDF2-HMAC-SHA256 from API 26 onward.
            PasswordHashParameters(LEGACY_ALGORITHM, SHA1_UPGRADED_ITERATIONS)
        }

    fun fromStoredMetadata(
        algorithm: String?,
        iterations: Int?,
    ): PasswordHashParameters {
        if (algorithm == null && iterations == null) return legacyParameters

        val parameters = PasswordHashParameters(
            algorithm ?: throw IllegalArgumentException("Incomplete local password hash."),
            iterations ?: throw IllegalArgumentException("Incomplete local password hash."),
        )
        require(
            parameters == legacyParameters ||
                parameters == PasswordHashParameters(
                    LEGACY_ALGORITHM,
                    SHA1_UPGRADED_ITERATIONS,
                ) ||
                parameters == PasswordHashParameters(
                    CURRENT_ALGORITHM,
                    CURRENT_ITERATIONS,
                ),
        ) { "The saved local password hash is unsupported." }
        return parameters
    }

    fun needsUpgrade(
        stored: PasswordHashParameters,
        current: PasswordHashParameters,
    ): Boolean = stored != current

    fun matches(
        password: String,
        salt: ByteArray,
        parameters: PasswordHashParameters,
        expectedHash: ByteArray,
    ): Boolean = MessageDigest.isEqual(
        derive(password, salt, parameters),
        expectedHash,
    )

    fun derive(
        password: String,
        salt: ByteArray,
        parameters: PasswordHashParameters,
    ): ByteArray {
        require(password.length <= MAX_PASSWORD_LENGTH) {
            "Password must be no longer than $MAX_PASSWORD_LENGTH characters."
        }
        require(salt.size == 16) { "Invalid local password salt." }
        val spec = PBEKeySpec(
            password.toCharArray(),
            salt,
            parameters.iterations,
            KEY_LENGTH_BITS,
        )
        return try {
            SecretKeyFactory.getInstance(parameters.algorithm)
                .generateSecret(spec)
                .encoded
        } finally {
            spec.clearPassword()
        }
    }
}
