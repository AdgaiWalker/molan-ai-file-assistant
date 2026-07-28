package com.molan.reader.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TextSearchTest {
    @Test
    fun searchIsCaseInsensitiveAndNonOverlapping() {
        val result = findTextMatches("Molan molan MOLAN", "molan")

        assertEquals(listOf(0..4, 6..10, 12..16), result.ranges)
        assertFalse(result.truncated)
    }

    @Test
    fun blankQueryDoesNotMatchEveryPosition() {
        assertTrue(findTextMatches("content", " ").ranges.isEmpty())
    }

    @Test
    fun resultLimitReportsTruncation() {
        val result = findTextMatches("a a a", "a", maxMatches = 2)

        assertEquals(listOf(0..0, 2..2), result.ranges)
        assertTrue(result.truncated)
    }
}
