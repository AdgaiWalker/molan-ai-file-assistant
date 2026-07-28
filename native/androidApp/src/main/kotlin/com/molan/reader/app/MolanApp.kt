package com.molan.reader.app

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import com.molan.reader.document.DocumentUiState
import com.molan.reader.document.EditorUiState
import com.molan.reader.document.ReaderNotice
import com.molan.reader.document.LibraryUiState
import com.molan.reader.document.LibraryConflict
import com.molan.reader.document.SyncUiState
import com.molan.reader.ui.error.AppErrorScreen
import com.molan.reader.ui.home.HomeScreen
import com.molan.reader.ui.reader.ReaderScreen

@Composable
fun MolanApp(
    snapshot: AppSnapshot,
    documentState: DocumentUiState,
    pickDocument: () -> Unit,
    closeReader: () -> Unit,
    retryDocument: () -> Unit,
    retryBootstrap: () -> Unit,
    copyText: (String) -> Unit,
    openExternalLink: (String) -> Unit,
    editorState: EditorUiState,
    readerNotice: ReaderNotice?,
    startEditing: () -> Unit,
    updateEditorText: (String) -> Unit,
    cancelEditing: () -> Unit,
    discardDraft: () -> Unit,
    saveCopy: () -> Unit,
    shareDocument: () -> Unit,
    dismissNotice: () -> Unit,
    libraryState: LibraryUiState,
    collectDocument: () -> Unit,
    openCollectedDocument: (String) -> Unit,
    setDocumentArchived: (String, Boolean) -> Unit,
    syncState: SyncUiState,
    loginSync: (String, String, String) -> Unit,
    logoutSync: () -> Unit,
    queueDocumentSync: (String) -> Unit,
    syncNow: () -> Unit,
    conflicts: List<LibraryConflict>,
    deleteDocument: (String, String) -> Unit,
    restoreDocument: (String, String) -> Unit,
    resolveConflict: (String, String) -> Unit,
    exportConflictVersion: (String) -> Unit,
) {
    when (snapshot.bootstrapState) {
        BootstrapState.Ready -> when (snapshot.route) {
            AppRoute.Home -> HomeScreen(
                libraryState = libraryState,
                pickDocument = pickDocument,
                openDocument = openCollectedDocument,
                setArchived = setDocumentArchived,
                syncState = syncState,
                loginSync = loginSync,
                logoutSync = logoutSync,
                queueSync = queueDocumentSync,
                syncNow = syncNow,
                conflicts = conflicts,
                deleteDocument = deleteDocument,
                restoreDocument = restoreDocument,
                resolveConflict = resolveConflict,
                exportConflictVersion = exportConflictVersion,
            )
            AppRoute.Reader -> {
                BackHandler(onBack = closeReader)
                ReaderScreen(
                    state = documentState,
                    close = closeReader,
                    retry = retryDocument,
                    copyText = copyText,
                    openExternalLink = openExternalLink,
                    editorState = editorState,
                    readerNotice = readerNotice,
                    startEditing = startEditing,
                    updateEditorText = updateEditorText,
                    cancelEditing = cancelEditing,
                    discardDraft = discardDraft,
                    saveCopy = saveCopy,
                    shareDocument = shareDocument,
                    dismissNotice = dismissNotice,
                    collectDocument = collectDocument,
                )
            }
        }

        BootstrapState.Failed -> AppErrorScreen(retry = retryBootstrap)
    }
}
