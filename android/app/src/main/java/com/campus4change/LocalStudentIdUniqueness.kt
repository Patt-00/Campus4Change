package com.campus4change

internal data class LocalAccountIdentity(
    val id: String,
    val email: String,
    val studentId: String,
)

internal object LocalStudentIdUniqueness {
    private val studentIdPattern = Regex("^[0-9]{1,32}$")

    fun isValidStudentId(value: String): Boolean =
        studentIdPattern.matches(value.trim())

    fun isUniqueForAccount(
        accounts: List<LocalAccountIdentity>,
        accountId: String,
        studentId: String,
    ): Boolean {
        val normalizedId = studentId.trim()
        if (!isValidStudentId(normalizedId)) return false

        val accountOwnsId = accounts.any {
            it.id == accountId && it.studentId.trim() == normalizedId
        }
        return accountOwnsId && !hasConflict(accounts, accountId, normalizedId)
    }

    fun hasConflict(
        accounts: List<LocalAccountIdentity>,
        accountId: String,
        studentId: String,
    ): Boolean {
        val normalizedId = studentId.trim()
        if (!isValidStudentId(normalizedId)) return true
        return accounts.any {
            it.id != accountId && digitsOnly(it.studentId) == normalizedId
        }
    }

    fun findSignInMatch(
        accounts: List<LocalAccountIdentity>,
        identifier: String,
    ): Int {
        val normalizedIdentifier = identifier.trim()
        val emailMatch = accounts.indexOfFirst {
            it.email.equals(normalizedIdentifier, ignoreCase = true)
        }
        if (emailMatch >= 0) return emailMatch

        val exactMatches = accounts.indices.filter { index ->
            accounts[index].studentId.equals(
                normalizedIdentifier,
                ignoreCase = true,
            )
        }
        val normalizedDigits = digitsOnly(normalizedIdentifier)
        val numericMatches = if (!normalizedIdentifier.contains('@') && normalizedDigits.isNotEmpty()) {
            accounts.indices.filter { index ->
                digitsOnly(accounts[index].studentId) == normalizedDigits
            }
        } else {
            emptyList()
        }
        val matchingStudentIds = (exactMatches + numericMatches).distinct()

        require(matchingStudentIds.size <= 1) {
            "More than one local account uses this Student ID. Sign in with the account email instead."
        }
        return matchingStudentIds.firstOrNull() ?: -1
    }

    private fun digitsOnly(value: String): String =
        value.filter { it in '0'..'9' }
}
