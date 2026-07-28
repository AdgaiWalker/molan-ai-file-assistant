package com.molan.reader.document

import android.net.Uri

data class DocumentOpenRequest(
    val uri: Uri,
    val displayNameHint: String? = null,
) {
    val key: String = uri.toString()
}

data class OpenDocument(
    val requestKey: String,
    val displayName: String?,
    val format: String,
    val encoding: String,
    val text: String,
    val json: JsonParseResult? = null,
    val libraryDocumentId: String? = null,
)

enum class DocumentOpenError {
    PermissionDenied,
    SourceMissing,
    TooLarge,
    DecodeFailed,
    UnsupportedFormat,
    Unknown,
}

sealed interface DocumentUiState {
    data object Idle : DocumentUiState

    data class Loading(val requestKey: String) : DocumentUiState

    data class Ready(val document: OpenDocument) : DocumentUiState

    data class Failed(
        val error: DocumentOpenError,
        val request: DocumentOpenRequest,
    ) : DocumentUiState
}

object DocumentRequestPolicy {
    fun shouldOpen(
        currentRequestKey: String?,
        incomingRequestKey: String,
        force: Boolean = false,
    ): Boolean = force || currentRequestKey != incomingRequestKey
}
