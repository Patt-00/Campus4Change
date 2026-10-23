package com.campus4change

import java.util.UUID

internal object CampusAccountUuid {
    private val uuidV4Pattern = Regex(
        "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        RegexOption.IGNORE_CASE,
    )

    fun generate(): String = UUID.randomUUID().toString()

    fun isValid(value: String): Boolean = uuidV4Pattern.matches(value)
}
