package com.campus4change

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LegacySeedIdentityTest {
    @Test
    fun accountCleanupRequiresTheFullLegacyIdentity() {
        assertTrue(
            LegacySeedIdentity.matchesAccount(
                "demo",
                "alex@campus.demo",
                "DEMO",
            ),
        )
        assertTrue(
            LegacySeedIdentity.matchesAccount(
                "demo",
                "ALEX@CAMPUS.DEMO",
                "DEMO",
            ),
        )
        assertFalse(
            LegacySeedIdentity.matchesAccount(
                "another-account",
                "alex@campus.demo",
                "DEMO",
            ),
        )
        assertFalse(
            LegacySeedIdentity.matchesAccount(
                "demo",
                "student@school.edu",
                "DEMO",
            ),
        )
        assertFalse(
            LegacySeedIdentity.matchesAccount(
                "demo",
                "alex@campus.demo",
                "STUDENT-100",
            ),
        )
    }

    @Test
    fun partialMigrationRecoveryRequiresTheLegacyIdAndEmail() {
        assertTrue(LegacySeedIdentity.matchesState("demo", "alex@campus.demo"))
        assertTrue(LegacySeedIdentity.matchesState("demo", "ALEX@CAMPUS.DEMO"))
        assertFalse(LegacySeedIdentity.matchesState("demo", "student@school.edu"))
        assertFalse(LegacySeedIdentity.matchesState("another-account", "alex@campus.demo"))
    }
}
