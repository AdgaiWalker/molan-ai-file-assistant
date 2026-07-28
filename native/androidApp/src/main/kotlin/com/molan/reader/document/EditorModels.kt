package com.molan.reader.document

sealed interface EditorUiState {
    data object Idle : EditorUiState
    data object Loading : EditorUiState
    data class Ready(
        val text: String,
        val jsonFailure: JsonParseResult.Failure?,
        val draftRestored: Boolean,
        val draftSaveFailed: Boolean = false,
        val savingCopy: Boolean = false,
    ) : EditorUiState
}

data class SaveCopyRequest(
    val fileName: String,
    val mimeType: String,
    val text: String,
)

enum class ReaderNotice {
    CopySaved,
    CopySaveFailed,
    ShareFailed,
    DraftSaveFailed,
    EditorTooLarge,
    CollectionAdded,
    CollectionDuplicate,
    CollectionNewVersion,
    CollectionFailed,
    CollectionOpenFailed,
}
