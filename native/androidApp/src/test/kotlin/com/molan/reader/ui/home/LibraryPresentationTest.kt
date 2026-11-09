package com.molan.reader.ui.home

import com.molan.reader.document.LibraryDocument
import org.junit.Assert.assertEquals
import org.junit.Test

class LibraryPresentationTest {
    @Test
    fun collectedFilterExcludesArchivedAndDeletedDocuments() {
        val documents = listOf(
            document(id = "local", title = "项目周报", state = "collected"),
            document(id = "archived", title = "历史周报", state = "archived"),
            document(id = "deleted", title = "删除周报", state = "deleted"),
        )

        val result = filterLibraryDocuments(documents, LibraryFilter.Collected, "周报")

        assertEquals(listOf("local"), result.map(LibraryDocument::id))
    }

    @Test
    fun archivedFilterAndQueryAreCaseInsensitive() {
        val documents = listOf(
            document(id = "match", title = "Release Notes", state = "archived"),
            document(id = "wrong-state", title = "Release Draft", state = "collected"),
            document(id = "wrong-query", title = "Roadmap", state = "archived"),
        )

        val result = filterLibraryDocuments(documents, LibraryFilter.Archived, "release")

        assertEquals(listOf("match"), result.map(LibraryDocument::id))
    }

    @Test
    fun latestResultMapKeepsFirstResultForEachSource() {
        val documents = listOf(
            document(id = "source", title = "来源"),
            document(id = "result-new", title = "新结果", kind = "ai_result", sourceDocumentId = "source"),
            document(id = "result-old", title = "旧结果", kind = "ai_result", sourceDocumentId = "source"),
            document(id = "orphan", title = "孤立结果", kind = "ai_result"),
        )

        assertEquals(mapOf("source" to "result-new"), latestResultIdsBySource(documents))
    }

    private fun document(
        id: String,
        title: String,
        state: String = "collected",
        kind: String = "document",
        sourceDocumentId: String? = null,
    ) = LibraryDocument(
        id = id,
        kind = kind,
        title = title,
        format = "markdown",
        state = state,
        updatedAt = "2026-07-28T00:00:00Z",
        contentHash = "sha256:$id",
        sizeBytes = 1,
        sourceDocumentId = sourceDocumentId,
        sourceTitle = null,
        resultType = null,
        isStale = false,
    )
}
