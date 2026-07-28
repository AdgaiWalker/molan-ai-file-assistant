package com.molan.reader.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class JsonDocumentTest {
    @Test
    fun parsesAndFormatsAllJsonValueKinds() {
        val source = """{"text":"中\n文","number":-1.5e2,"bool":true,"none":null,"array":[1,"x"]}"""
        val result = JsonDocumentParser.parse(source) as JsonParseResult.Success

        assertEquals(source, JsonDocumentFormatter.compact(result.root))
        assertTrue(JsonDocumentFormatter.pretty(result.root).contains("\n  \"text\": \"中\\n文\""))
    }

    @Test
    fun invalidJsonReportsActionableLineAndColumn() {
        val result = JsonDocumentParser.parse("{\n  \"bad\": 1,\n}") as JsonParseResult.Failure

        assertEquals(JsonParseError.UnexpectedToken, result.error)
        assertEquals(3, result.line)
        assertEquals(1, result.column)
    }

    @Test
    fun jsonPathQuotesUnsafeKeysAndUsesArrayIndexes() {
        assertEquals("$.safe", jsonPath("$", "safe"))
        assertEquals("$['a b']", jsonPath("$", "a b"))
        assertEquals("$['it\\'s']", jsonPath("$", "it's"))
    }

    @Test
    fun rowsOnlyExpandRequestedContainersAndTruncateLargeArrays() {
        val root = (JsonDocumentParser.parse("[0,1,2,3]") as JsonParseResult.Success).root
        val collapsed = buildJsonTreeRows(root, emptySet(), emptyMap(), pageSize = 2)
        val expanded = buildJsonTreeRows(root, setOf("$"), emptyMap(), pageSize = 2)

        assertEquals(1, collapsed.size)
        assertEquals(4, expanded.size)
        assertTrue(expanded.last() is JsonTreeRow.LoadMore)
    }

    @Test
    fun searchMatchesKeysAndValuesWithLimit() {
        val root = (JsonDocumentParser.parse("{\"target\":1,\"other\":\"TARGET\"}") as JsonParseResult.Success).root
        val result = searchJson(root, "target", maxResults = 1)

        assertEquals("$.target", result.matches.single().path)
        assertTrue(result.truncated)
    }

    @Test
    fun unsafeDepthFailsInsteadOfOverflowing() {
        val source = "[".repeat(20) + "0" + "]".repeat(20)
        val result = JsonDocumentParser.parse(source, maxDepth = 8) as JsonParseResult.Failure

        assertEquals(JsonParseError.TooDeep, result.error)
        assertFalse(result.offset == 0)
    }
}
