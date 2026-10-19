package com.campus4change

/** Identity checks used only to remove data from the old seeded local account. */
internal object LegacySeedIdentity {
    private const val ACCOUNT_ID = "demo"
    private const val ACCOUNT_EMAIL = "alex@campus.demo"
    private const val ACCOUNT_STUDENT_ID = "DEMO"

    fun matchesAccount(id: String, email: String, studentId: String): Boolean =
        id == ACCOUNT_ID &&
            email.equals(ACCOUNT_EMAIL, ignoreCase = true) &&
            studentId == ACCOUNT_STUDENT_ID

    fun matchesState(profileId: String, email: String): Boolean =
        profileId == ACCOUNT_ID && email.equals(ACCOUNT_EMAIL, ignoreCase = true)

    fun cleanupPlan(
        legacyAccountFound: Boolean,
        stateProfileId: String?,
        stateEmail: String?,
    ): LegacySeedCleanupPlan? {
        val legacyStateFound = matchesState(stateProfileId.orEmpty(), stateEmail.orEmpty())
        if (!legacyAccountFound && !legacyStateFound) {
            return null
        }
        return LegacySeedCleanupPlan(
            removeAccount = legacyAccountFound,
            removeState = legacyStateFound,
        )
    }
}

internal data class LegacySeedCleanupPlan(
    val removeAccount: Boolean,
    val removeState: Boolean,
)
