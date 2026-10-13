package com.campus4change

import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
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

    @Test
    fun removingLegacyAccountDoesNotDeleteAnotherProfilesState() {
        val cleanup = LegacySeedIdentity.cleanupPlan(
            legacyAccountFound = true,
            stateProfileId = "demo",
            stateEmail = "student@school.edu",
        )

        assertTrue(cleanup?.removeAccount == true)
        assertFalse(cleanup?.removeState == true)
    }

    @Test
    fun cleanupPlanRemovesOnlyTheLegacyState() {
        val cleanup = LegacySeedIdentity.cleanupPlan(
            legacyAccountFound = false,
            stateProfileId = "demo",
            stateEmail = "ALEX@CAMPUS.DEMO",
        )

        assertTrue(cleanup?.removeAccount == false)
        assertTrue(cleanup?.removeState == true)
    }

    @Test
    fun cleanupPlanRemovesBothMatchingLegacyRecords() {
        val cleanup = LegacySeedIdentity.cleanupPlan(
            legacyAccountFound = true,
            stateProfileId = "demo",
            stateEmail = "alex@campus.demo",
        )

        assertTrue(cleanup?.removeAccount == true)
        assertTrue(cleanup?.removeState == true)
    }

    @Test
    fun cleanupPlanDoesNothingWithoutLegacyData() {
        assertNull(
            LegacySeedIdentity.cleanupPlan(
                legacyAccountFound = false,
                stateProfileId = "student-uid",
                stateEmail = "student@school.edu",
            ),
        )
    }
}
