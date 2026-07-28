package com.molan.reader.document

data class LibraryDocument(
    val id: String,
    val kind: String,
    val title: String,
    val format: String,
    val state: String,
    val updatedAt: String,
    val contentHash: String,
    val sizeBytes: Long,
    val sourceDocumentId: String?,
    val sourceTitle: String?,
    val resultType: String?,
    val isStale: Boolean,
)

data class LibraryConflict(
    val id: String,
    val documentId: String,
    val localVersionId: String,
    val remoteVersionId: String,
    val detectedAt: String,
)

data class ConflictVersionExport(
    val versionId: String,
    val title: String,
    val format: String,
    val localPath: String,
)

sealed interface LibraryUiState {
    data object Loading : LibraryUiState
    data class Ready(val documents: List<LibraryDocument>) : LibraryUiState
    data object Failed : LibraryUiState
}

sealed interface CollectionResult {
    val documentId: String

    data class Added(override val documentId: String) : CollectionResult
    data class NewVersion(override val documentId: String) : CollectionResult
    data class Duplicate(override val documentId: String) : CollectionResult
}
