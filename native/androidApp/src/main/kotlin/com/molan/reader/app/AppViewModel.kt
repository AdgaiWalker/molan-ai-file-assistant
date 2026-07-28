package com.molan.reader.app

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.molan.reader.data.DocumentOpenException
import com.molan.reader.data.DocumentRepository
import com.molan.reader.data.DraftStore
import com.molan.reader.data.library.CollectionRepository
import com.molan.reader.data.library.MolanDatabase
import com.molan.reader.document.DocumentOpenError
import com.molan.reader.document.DocumentOpenRequest
import com.molan.reader.document.DocumentRequestPolicy
import com.molan.reader.document.DocumentUiState
import com.molan.reader.document.EditorUiState
import com.molan.reader.document.JsonDocumentParser
import com.molan.reader.document.JsonParseResult
import com.molan.reader.document.ReaderNotice
import com.molan.reader.document.SaveCopyRequest
import com.molan.reader.document.CollectionResult
import com.molan.reader.document.LibraryUiState
import com.molan.reader.document.LibraryConflict
import com.molan.reader.document.ConflictVersionExport
import com.molan.reader.document.SyncUiState
import com.molan.reader.document.SyncNotice
import com.molan.reader.document.SyncFailure
import com.molan.reader.platform.ExternalIntentParser
import com.molan.reader.data.sync.SyncApiClient
import com.molan.reader.data.sync.SyncCredentialStore
import com.molan.reader.data.sync.SyncScheduler
import com.molan.reader.data.sync.SyncApiException
import com.molan.reader.data.sync.SyncCredentials
import com.molan.shared.SharedContractEngine
import kotlinx.coroutines.Job
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collect
import java.io.File

class AppViewModel(
    application: Application,
    private val savedStateHandle: SavedStateHandle,
) : AndroidViewModel(application) {
    private val sharedContracts = SharedContractEngine()
    private val documentRepository = DocumentRepository(application.contentResolver, sharedContracts)
    private val draftStore = DraftStore(application)
    private val database = MolanDatabase.get(application)
    private val collectionRepository by lazy {
        CollectionRepository(application, application.contentResolver, database, sharedContracts)
    }
    private val stateMachine = AppStateMachine(savedStateHandle[RouteKey]) {
        check(sharedContracts.verifyBaseline())
    }
    private var currentRequestKey: String? = null
    private var openJob: Job? = null
    private var draftJob: Job? = null
    private var pendingSaveCopy: SaveCopyRequest? = null
    private val syncCredentialStore = SyncCredentialStore(application)

    var snapshot by mutableStateOf(stateMachine.snapshot)
        private set

    var documentState by mutableStateOf<DocumentUiState>(DocumentUiState.Idle)
        private set

    var editorState by mutableStateOf<EditorUiState>(EditorUiState.Idle)
        private set

    var readerNotice by mutableStateOf<ReaderNotice?>(null)
        private set

    var libraryState by mutableStateOf<LibraryUiState>(LibraryUiState.Loading)
        private set

    var syncState by mutableStateOf<SyncUiState>(
        syncCredentialStore.load()?.let { SyncUiState.LoggedIn(it.deviceId) } ?: SyncUiState.LoggedOut,
    )
        private set

    var conflicts by mutableStateOf<List<LibraryConflict>>(emptyList())
        private set

    init {
        observeLibrary()
        observeConflicts()
        savedStateHandle.get<String>(DocumentUriKey)?.let { uri ->
            openDocument(
                DocumentOpenRequest(
                    uri = Uri.parse(uri),
                    displayNameHint = savedStateHandle[DocumentNameKey],
                ),
                libraryDocumentId = savedStateHandle[LibraryDocumentIdKey],
            )
        }
    }

    fun handleExternalIntent(intent: Intent?) {
        ExternalIntentParser.parse(intent)?.let { request ->
            openDocument(request, libraryDocumentId = null)
        }
    }

    fun openDocument(
        request: DocumentOpenRequest,
        force: Boolean = false,
        libraryDocumentId: String? = null,
    ) {
        if (!DocumentRequestPolicy.shouldOpen(currentRequestKey, request.key, force)) {
            stateMachine.openReader()
            publish()
            return
        }

        currentRequestKey = request.key
        savedStateHandle[DocumentUriKey] = request.key
        savedStateHandle[DocumentNameKey] = request.displayNameHint
        savedStateHandle[LibraryDocumentIdKey] = libraryDocumentId
        openJob?.cancel()
        documentState = DocumentUiState.Loading(request.key)
        stateMachine.openReader()
        publish()

        openJob = viewModelScope.launch {
            documentRepository.open(request).fold(
                onSuccess = { document ->
                    documentState = DocumentUiState.Ready(
                        document.copy(libraryDocumentId = libraryDocumentId),
                    )
                },
                onFailure = { error ->
                    val reason = (error as? DocumentOpenException)?.reason
                        ?: DocumentOpenError.Unknown
                    documentState = DocumentUiState.Failed(reason, request)
                },
            )
        }
    }

    fun closeReader() {
        editorState = EditorUiState.Idle
        stateMachine.closeReader()
        publish()
    }

    fun startEditing() {
        val document = (documentState as? DocumentUiState.Ready)?.document ?: return
        if (document.text.length > MaxEditableCharacters) {
            readerNotice = ReaderNotice.EditorTooLarge
            return
        }
        editorState = EditorUiState.Loading
        viewModelScope.launch {
            val loadedDraft = runCatching { draftStore.load(document.requestKey) }
            val text = loadedDraft.getOrNull() ?: document.text
            val jsonFailure = withContext(Dispatchers.Default) { validateJson(document.format, text) }
            editorState = EditorUiState.Ready(
                text = text,
                jsonFailure = jsonFailure,
                draftRestored = loadedDraft.getOrNull() != null,
                draftSaveFailed = loadedDraft.isFailure,
            )
        }
    }

    fun updateEditorText(text: String) {
        val document = (documentState as? DocumentUiState.Ready)?.document ?: return
        val current = editorState as? EditorUiState.Ready ?: return
        val updated = current.copy(
            text = text,
            jsonFailure = validateJson(document.format, text),
            draftSaveFailed = false,
        )
        editorState = updated
        draftJob?.cancel()
        draftJob = viewModelScope.launch {
            delay(DraftSaveDebounceMillis)
            runCatching { draftStore.save(document.requestKey, text) }
                .onFailure {
                    val latest = editorState as? EditorUiState.Ready
                    if (latest?.text == text) editorState = latest.copy(draftSaveFailed = true)
                }
        }
    }

    fun cancelEditing() {
        val document = (documentState as? DocumentUiState.Ready)?.document
        val current = editorState as? EditorUiState.Ready
        draftJob?.cancel()
        editorState = EditorUiState.Idle
        if (document != null && current != null) {
            viewModelScope.launch {
                runCatching { draftStore.save(document.requestKey, current.text) }
                    .onFailure { readerNotice = ReaderNotice.DraftSaveFailed }
            }
        }
    }

    fun discardDraft() {
        val document = (documentState as? DocumentUiState.Ready)?.document ?: return
        draftJob?.cancel()
        viewModelScope.launch {
            runCatching { draftStore.delete(document.requestKey) }
                .onSuccess { editorState = EditorUiState.Idle }
                .onFailure {
                    val current = editorState as? EditorUiState.Ready
                    if (current != null) editorState = current.copy(draftSaveFailed = true)
                }
        }
    }

    fun prepareSaveCopy(): SaveCopyRequest? {
        val document = (documentState as? DocumentUiState.Ready)?.document ?: return null
        val current = editorState as? EditorUiState.Ready ?: return null
        val jsonFailure = validateJson(document.format, current.text)
        if (jsonFailure != null) {
            editorState = current.copy(jsonFailure = jsonFailure)
            return null
        }
        val request = SaveCopyRequest(
            fileName = copyFileName(document.displayName, document.format),
            mimeType = when (document.format) {
                "markdown" -> "text/markdown"
                "json" -> "application/json"
                else -> "text/plain"
            },
            text = current.text,
        )
        pendingSaveCopy = request
        return request
    }

    fun completeSaveCopy(uri: Uri?) {
        val request = pendingSaveCopy ?: return
        if (uri == null) {
            pendingSaveCopy = null
            return
        }
        val current = editorState as? EditorUiState.Ready ?: return
        editorState = current.copy(savingCopy = true)
        val document = (documentState as? DocumentUiState.Ready)?.document ?: return
        viewModelScope.launch {
            documentRepository.saveCopy(uri, request.text).fold(
                onSuccess = {
                    runCatching { draftStore.delete(document.requestKey) }
                    editorState = EditorUiState.Idle
                    readerNotice = ReaderNotice.CopySaved
                },
                onFailure = {
                    editorState = current.copy(savingCopy = false)
                    readerNotice = ReaderNotice.CopySaveFailed
                },
            )
            pendingSaveCopy = null
        }
    }

    fun showShareFailed() {
        readerNotice = ReaderNotice.ShareFailed
    }

    fun currentDocument() = (documentState as? DocumentUiState.Ready)?.document

    fun collectCurrentDocument() {
        val document = currentDocument() ?: return
        if (document.libraryDocumentId != null) {
            readerNotice = ReaderNotice.CollectionDuplicate
            return
        }
        viewModelScope.launch {
            runCatching {
                collectionRepository.collect(
                    document,
                    getApplication<Application>().getString(com.molan.reader.R.string.unnamed_document),
                )
            }.onSuccess { result ->
                readerNotice = when (result) {
                    is CollectionResult.Added -> ReaderNotice.CollectionAdded
                    is CollectionResult.Duplicate -> ReaderNotice.CollectionDuplicate
                    is CollectionResult.NewVersion -> ReaderNotice.CollectionNewVersion
                }
                collectionRepository.openRequest(result.documentId)?.let { request ->
                    openDocument(
                        request = request,
                        force = true,
                        libraryDocumentId = result.documentId,
                    )
                }
            }.onFailure {
                readerNotice = ReaderNotice.CollectionFailed
            }
        }
    }

    fun openCollectedDocument(documentId: String) {
        viewModelScope.launch {
            val request = runCatching { collectionRepository.openRequest(documentId) }.getOrNull()
            if (request == null) {
                readerNotice = ReaderNotice.CollectionOpenFailed
            } else {
                openDocument(request, force = true, libraryDocumentId = documentId)
            }
        }
    }

    fun setDocumentArchived(documentId: String, archived: Boolean) {
        viewModelScope.launch {
            runCatching { collectionRepository.setArchived(documentId, archived) }
                .onFailure { readerNotice = ReaderNotice.CollectionFailed }
        }
    }

    fun loginSync(serverUrl: String, phoneNumber: String, code: String) {
        if (syncState == SyncUiState.LoggingIn) return
        syncState = SyncUiState.LoggingIn
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                SyncApiClient(serverUrl).login(
                    phoneNumber = phoneNumber,
                    code = code,
                    installationId = collectionRepository.localDeviceId(),
                )
            }.onSuccess { credentials ->
                syncCredentialStore.save(credentials)
                syncState = SyncUiState.LoggedIn(credentials.deviceId)
                SyncScheduler.enqueue(getApplication())
            }.onFailure {
                syncState = SyncUiState.Failed(SyncFailure.LoginFailed)
            }
        }
    }

    fun logoutSync() {
        SyncScheduler.cancel(getApplication())
        runCatching { syncCredentialStore.clear() }
        syncState = SyncUiState.LoggedOut
    }

    fun queueDocumentSync(documentId: String) {
        if (syncCredentialStore.load() == null) {
            syncState = SyncUiState.Failed(SyncFailure.LoginRequired)
            return
        }
        viewModelScope.launch {
            if (collectionRepository.queueSync(documentId)) {
                syncState = (syncState as? SyncUiState.LoggedIn)?.copy(notice = SyncNotice.QueueAdded)
                    ?: syncState
                SyncScheduler.enqueue(getApplication())
            } else {
                syncState = SyncUiState.Failed(SyncFailure.QueueFailed)
            }
        }
    }

    fun syncNow() {
        if (syncCredentialStore.load() == null) {
            syncState = SyncUiState.Failed(SyncFailure.LoginRequired)
            return
        }
        SyncScheduler.enqueue(getApplication(), replace = true)
        syncState = (syncState as? SyncUiState.LoggedIn)?.copy(notice = SyncNotice.Syncing) ?: syncState
    }

    fun deleteDocument(documentId: String, scope: String) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                if (scope == "current_device") {
                    check(collectionRepository.deleteFromDevice(documentId))
                } else {
                    val versionId = collectionRepository.documentVersionId(documentId)
                    withFreshSyncSession { client, credentials ->
                        client.deleteDocument(
                            credentials,
                            documentId,
                            versionId,
                            scope,
                            collectionRepository.newMutationId(),
                        )
                    }
                    SyncScheduler.enqueue(getApplication(), replace = true)
                }
            }.onFailure { syncState = SyncUiState.Failed(SyncFailure.QueueFailed) }
        }
    }

    fun restoreDocument(documentId: String, scope: String) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                if (scope == "current_device") {
                    val bundle = requireNotNull(collectionRepository.restoreBundle(documentId))
                    withFreshSyncSession { client, credentials ->
                        client.downloadFile(
                            credentials,
                            bundle.fileObjectId,
                            File(bundle.localPath),
                            bundle.contentHash,
                            bundle.sizeBytes,
                        )
                    }
                    collectionRepository.restoreOnDevice(documentId)
                } else {
                    withFreshSyncSession { client, credentials ->
                        client.restoreDocument(credentials, documentId, collectionRepository.newMutationId())
                    }
                    SyncScheduler.enqueue(getApplication(), replace = true)
                }
            }.onFailure { syncState = SyncUiState.Failed(SyncFailure.QueueFailed) }
        }
    }

    fun resolveConflict(conflictId: String, resolution: String) {
        viewModelScope.launch(Dispatchers.IO) {
            runCatching {
                withFreshSyncSession { client, credentials ->
                    client.resolveConflict(
                        credentials,
                        conflictId,
                        resolution,
                        collectionRepository.newMutationId(),
                    )
                }
                collectionRepository.removeConflict(conflictId)
                SyncScheduler.enqueue(getApplication(), replace = true)
            }.onFailure { syncState = SyncUiState.Failed(SyncFailure.QueueFailed) }
        }
    }

    suspend fun conflictVersionExport(versionId: String): ConflictVersionExport? =
        collectionRepository.conflictVersionExport(versionId)

    fun dismissReaderNotice() {
        readerNotice = null
    }

    fun retryDocument() {
        val failed = documentState as? DocumentUiState.Failed ?: return
        openDocument(failed.request, force = true)
    }

    fun retryBootstrap() {
        stateMachine.retryBootstrap()
        publish()
    }

    private fun publish() {
        snapshot = stateMachine.snapshot
        savedStateHandle[RouteKey] = snapshot.route.name
    }

    private fun observeLibrary() {
        viewModelScope.launch {
            collectionRepository.observeDocuments()
                .catch {
                    libraryState = LibraryUiState.Failed
                }
                .collect { documents ->
                    libraryState = LibraryUiState.Ready(documents)
                }
        }
    }

    private fun observeConflicts() {
        viewModelScope.launch {
            collectionRepository.observeConflicts().collect { conflicts = it }
        }
    }

    private suspend fun <T> withFreshSyncSession(
        action: (SyncApiClient, SyncCredentials) -> T,
    ): T {
        var credentials = syncCredentialStore.load() ?: throw SyncApiException(401, "E_AUTH_REQUIRED", "login required")
        val client = SyncApiClient(credentials.serverUrl)
        return try {
            action(client, credentials)
        } catch (error: SyncApiException) {
            if (error.status != 401 || error.errorCode == "E_DEVICE_REVOKED") throw error
            credentials = client.refresh(credentials)
            syncCredentialStore.save(credentials)
            syncState = SyncUiState.LoggedIn(credentials.deviceId)
            action(client, credentials)
        }
    }

    private fun validateJson(format: String, text: String): JsonParseResult.Failure? =
        if (format != "json") null
        else JsonDocumentParser.parse(text) as? JsonParseResult.Failure

    private fun copyFileName(displayName: String?, format: String): String {
        val extension = displayName?.substringAfterLast('.', missingDelimiterValue = "")
            ?.takeIf(String::isNotBlank)
            ?: when (format) {
                "markdown" -> "md"
                "json" -> "json"
                else -> "txt"
            }
        val stem = displayName?.substringBeforeLast('.', missingDelimiterValue = displayName)
            ?.ifBlank { null }
            ?: "molan"
        return "$stem-${getApplication<Application>().getString(com.molan.reader.R.string.copy_file_suffix)}.$extension"
    }

    private companion object {
        const val RouteKey = "molan.navigation.route"
        const val DocumentUriKey = "molan.document.uri"
        const val DocumentNameKey = "molan.document.name"
        const val LibraryDocumentIdKey = "molan.document.library_id"
        const val MaxEditableCharacters = 1 * 1024 * 1024
        const val DraftSaveDebounceMillis = 400L
    }
}
