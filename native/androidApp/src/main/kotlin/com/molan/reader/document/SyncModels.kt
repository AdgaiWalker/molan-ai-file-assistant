package com.molan.reader.document

sealed interface SyncUiState {
    data object LoggedOut : SyncUiState
    data object LoggingIn : SyncUiState
    data class LoggedIn(val deviceId: String, val notice: SyncNotice? = null) : SyncUiState
    data class Failed(val reason: SyncFailure) : SyncUiState
}

enum class SyncNotice { QueueAdded, Syncing }
enum class SyncFailure { LoginFailed, LoginRequired, QueueFailed }
