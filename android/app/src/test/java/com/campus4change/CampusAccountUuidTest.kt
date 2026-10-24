package com.campus4change

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CampusAccountUuidTest {
    @Test
    fun generatedAccountIdsAreUniqueVersionFourUuids() {
        val ids = List(1_000) { CampusAccountUuid.generate() }

        assertEquals(ids.size, ids.toSet().size)
        assertTrue(ids.all(CampusAccountUuid::isValid))
    }

    @Test
    fun acceptsUppercaseVersionFourIdsAndRejectsMalformedIds() {
        assertTrue(!CampusAccountUuid.isValid("not-an-id"))
        assertTrue(CampusAccountUuid.isValid("550e8400-e29b-41d4-a716-446655440000".uppercase()))
        assertTrue(CampusAccountUuid.isValid("550e8400-e29b-41d4-a716-446655440000"))
    }
}
