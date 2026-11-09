package com.molan.reader.ui.home

import androidx.annotation.StringRes
import com.molan.reader.R
import com.molan.reader.document.LibraryDocument

internal enum class LibraryFilter(@param:StringRes val label: Int) {
    Recent(R.string.library_recent),
    Collected(R.string.library_collected),
    Archived(R.string.library_archived),
}

internal fun filterLibraryDocuments(
    documents: List<LibraryDocument>,
    filter: LibraryFilter,
    query: String,
): List<LibraryDocument> = documents.filter { document ->
    document.title.contains(query, ignoreCase = true) && when (filter) {
        LibraryFilter.Recent -> true
        LibraryFilter.Collected -> document.state != "archived" && document.state != "deleted"
        LibraryFilter.Archived -> document.state == "archived"
    }
}

internal fun latestResultIdsBySource(documents: List<LibraryDocument>): Map<String, String> {
    val resultIds = mutableMapOf<String, String>()
    documents.forEach { document ->
        if (document.kind == "ai_result") {
            document.sourceDocumentId?.let { sourceId -> resultIds.putIfAbsent(sourceId, document.id) }
        }
    }
    return resultIds
}
