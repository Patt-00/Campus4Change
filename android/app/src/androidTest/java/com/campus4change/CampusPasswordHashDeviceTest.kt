package com.campus4change

import android.os.Build
import android.os.SystemClock
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CampusPasswordHashDeviceTest {
    private val salt = ByteArray(16) { it.toByte() }

    @Test
    fun androidProviderCanVerifyTheCurrentLocalPasswordFormat() {
        val current = CampusPasswordHash.currentParameters(Build.VERSION.SDK_INT)
        val expectedHash = if (Build.VERSION.SDK_INT >= 26) {
            assertEquals("PBKDF2WithHmacSHA256", current.algorithm)
            assertEquals(600_000, current.iterations)
            hex("3bc37118e625093e9b79ed08930ea7af7389591233fdd92dddf369371e60dbc0")
        } else {
            assertEquals("PBKDF2WithHmacSHA1", current.algorithm)
            assertEquals(1_400_000, current.iterations)
            hex("34e4252acaf0e6b3fa7af8a548ab702f191d4a5a392f405ed9e3dd31c03840f6")
        }

        val startedAt = SystemClock.elapsedRealtime()
        val actual = CampusPasswordHash.derive("password", salt, current)
        val elapsedMs = SystemClock.elapsedRealtime() - startedAt

        assertArrayEquals(expectedHash, actual)
        Log.i("CampusPasswordHashTest", "Current password derivation took ${elapsedMs}ms")
    }

    @Test
    fun androidSha1ProviderCanMigrateLegacyAndMinimumApiFormats() {
        val legacy = CampusPasswordHash.fromStoredMetadata(null, null)
        val upgradedMinimumApi = CampusPasswordHash.currentParameters(24)

        assertTrue(
            CampusPasswordHash.matches(
                "password",
                salt,
                legacy,
                hex("7e6dbcf2714edcdf95e753d2573dc26e515dd3e0c3de4cedd52495c82a17750c"),
            ),
        )
        assertEquals("PBKDF2WithHmacSHA1", upgradedMinimumApi.algorithm)
        assertEquals(1_400_000, upgradedMinimumApi.iterations)
        assertTrue(CampusPasswordHash.needsUpgrade(legacy, upgradedMinimumApi))
    }

    private fun hex(value: String): ByteArray =
        value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
