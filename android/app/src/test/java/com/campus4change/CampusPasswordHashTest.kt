package com.campus4change

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class CampusPasswordHashTest {
    private val salt = ByteArray(16) { it.toByte() }

    @Test
    fun oldAccountsWithoutHashMetadataKeepTheirOriginalVerifier() {
        val legacy = CampusPasswordHash.fromStoredMetadata(null, null)

        assertEquals("PBKDF2WithHmacSHA1", legacy.algorithm)
        assertEquals(210_000, legacy.iterations)
        assertTrue(
            CampusPasswordHash.matches(
                "password",
                salt,
                legacy,
                hex("7e6dbcf2714edcdf95e753d2573dc26e515dd3e0c3de4cedd52495c82a17750c"),
            ),
        )
    }

    @Test
    fun currentAndroidAccountsUseSha256AndTheRecommendedWorkFactor() {
        val current = CampusPasswordHash.currentParameters(34)

        assertEquals("PBKDF2WithHmacSHA256", current.algorithm)
        assertEquals(600_000, current.iterations)
        assertFalse(CampusPasswordHash.needsUpgrade(current, current))
        assertTrue(
            CampusPasswordHash.needsUpgrade(
                CampusPasswordHash.fromStoredMetadata(null, null),
                current,
            ),
        )
    }

    @Test
    fun sha256DerivationMatchesAnIndependentReferenceVector() {
        val current = CampusPasswordHash.currentParameters(34)

        assertArrayEquals(
            hex("3bc37118e625093e9b79ed08930ea7af7389591233fdd92dddf369371e60dbc0"),
            CampusPasswordHash.derive("password", salt, current),
        )
    }

    @Test
    fun olderSupportedAndroidUsesStrongerSha1WorkFactorWithoutBreakingAccounts() {
        val current = CampusPasswordHash.currentParameters(24)

        assertEquals("PBKDF2WithHmacSHA1", current.algorithm)
        assertEquals(1_400_000, current.iterations)
        assertTrue(
            CampusPasswordHash.needsUpgrade(
                CampusPasswordHash.fromStoredMetadata(null, null),
                current,
            ),
        )
        assertEquals(
            current,
            CampusPasswordHash.fromStoredMetadata(
                current.algorithm,
                current.iterations,
            ),
        )
        assertArrayEquals(
            hex("34e4252acaf0e6b3fa7af8a548ab702f191d4a5a392f405ed9e3dd31c03840f6"),
            CampusPasswordHash.derive("password", salt, current),
        )
    }

    @Test
    fun incompleteOrUnknownHashMetadataIsRejected() {
        assertThrows(IllegalArgumentException::class.java) {
            CampusPasswordHash.fromStoredMetadata("PBKDF2WithHmacSHA256", null)
        }
        assertThrows(IllegalArgumentException::class.java) {
            CampusPasswordHash.fromStoredMetadata("SHA-256", 1)
        }
    }

    @Test
    fun passwordsLongerThanTheLocalLimitAreRejectedBeforeDerivation() {
        assertThrows(IllegalArgumentException::class.java) {
            CampusPasswordHash.derive(
                "x".repeat(CampusPasswordHash.MAX_PASSWORD_LENGTH + 1),
                salt,
                CampusPasswordHash.currentParameters(34),
            )
        }
    }

    private fun hex(value: String): ByteArray =
        value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
