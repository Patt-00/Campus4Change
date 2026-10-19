package com.campus4change

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalStudentIdUniquenessTest {
    private val accounts = listOf(
        LocalAccountIdentity("first", "first@example.test", "2048"),
        LocalAccountIdentity("second", "second@example.test", "3012"),
    )

    @Test
    fun recognizesTheCurrentAccountsUniqueStudentId() {
        assertTrue(
            LocalStudentIdUniqueness.isUniqueForAccount(
                accounts,
                "first",
                "2048",
            ),
        )
    }

    @Test
    fun detectsStudentIdsAlreadyAssignedToAnotherLocalAccount() {
        val duplicateAccounts = listOf(
            LocalAccountIdentity("first", "first@example.test", "2048"),
            LocalAccountIdentity("second", "second@example.test", "2048"),
        )
        assertTrue(
            LocalStudentIdUniqueness.hasConflict(
                duplicateAccounts,
                "second",
                "2048",
            ),
        )
        assertFalse(
            LocalStudentIdUniqueness.isUniqueForAccount(
                duplicateAccounts,
                "first",
                "2048",
            ),
        )
    }

    @Test
    fun detectsDuplicatesFromLegacyFormattedIds() {
        val legacyAccounts = listOf(
            LocalAccountIdentity("first", "first@example.test", "STU-2048"),
            LocalAccountIdentity("second", "second@example.test", "2048"),
        )

        assertTrue(
            LocalStudentIdUniqueness.hasConflict(legacyAccounts, "second", "2048"),
        )
        assertFalse(
            LocalStudentIdUniqueness.isUniqueForAccount(
                legacyAccounts,
                "first",
                "2048",
            ),
        )
    }

    @Test
    fun requiresEmailWhenMoreThanOneLocalAccountMatchesTheStudentId() {
        val duplicateAccounts = listOf(
            LocalAccountIdentity("first", "first@example.test", "2048"),
            LocalAccountIdentity("second", "second@example.test", "3012"),
        )

        assertEquals(
            0,
            LocalStudentIdUniqueness.findSignInMatch(
                duplicateAccounts,
                "first@example.test",
            ),
        )
        assertEquals(
            1,
            LocalStudentIdUniqueness.findSignInMatch(duplicateAccounts, "3012"),
        )

        val legacyDuplicateAccounts = listOf(
            LocalAccountIdentity("legacy", "legacy@example.test", "STU-2048"),
            LocalAccountIdentity("current", "current@example.test", "2048"),
        )
        assertAmbiguousStudentId(legacyDuplicateAccounts, "STU-2048")

        val exactDuplicateAccounts = duplicateAccounts.map {
            it.copy(studentId = "2048")
        }
        assertAmbiguousStudentId(exactDuplicateAccounts, "2048")
    }

    private fun assertAmbiguousStudentId(
        accounts: List<LocalAccountIdentity>,
        identifier: String,
    ) {
        try {
            LocalStudentIdUniqueness.findSignInMatch(
                accounts,
                identifier,
            )
            throw AssertionError("Duplicate Student ID sign-in should be rejected.")
        } catch (error: IllegalArgumentException) {
            assertTrue(error.message!!.contains("Sign in with the account email"))
        }
    }
}
