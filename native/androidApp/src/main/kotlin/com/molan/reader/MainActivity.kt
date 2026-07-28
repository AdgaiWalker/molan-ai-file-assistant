package com.molan.reader

import android.content.Intent
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.ActivityNotFoundException
import android.net.Uri
import android.widget.Toast
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.lifecycle.lifecycleScope
import com.molan.reader.app.AppViewModel
import com.molan.reader.app.MolanApp
import com.molan.reader.document.DocumentOpenRequest
import com.molan.reader.platform.ExternalIntentParser
import com.molan.reader.platform.DocumentShareAdapter
import com.molan.reader.platform.CreateDocumentContract
import com.molan.reader.ui.theme.MolanTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val appViewModel: AppViewModel by viewModels()
    private val shareAdapter by lazy { DocumentShareAdapter(this) }
    private val documentPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        try {
            contentResolver.takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        } catch (_: SecurityException) {
            // Some providers only grant access for the current process. Reading can still proceed.
        }
        appViewModel.openDocument(DocumentOpenRequest(uri), force = true)
    }
    private val saveCopyPicker = registerForActivityResult(CreateDocumentContract()) { uri ->
        appViewModel.completeSaveCopy(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        appViewModel.handleExternalIntent(intent)
        setContent {
            MolanTheme {
                MolanApp(
                    snapshot = appViewModel.snapshot,
                    documentState = appViewModel.documentState,
                    pickDocument = ::pickDocument,
                    closeReader = appViewModel::closeReader,
                    retryDocument = appViewModel::retryDocument,
                    retryBootstrap = appViewModel::retryBootstrap,
                    copyText = ::copyText,
                    openExternalLink = ::openExternalLink,
                    editorState = appViewModel.editorState,
                    readerNotice = appViewModel.readerNotice,
                    startEditing = appViewModel::startEditing,
                    updateEditorText = appViewModel::updateEditorText,
                    cancelEditing = appViewModel::cancelEditing,
                    discardDraft = appViewModel::discardDraft,
                    saveCopy = ::startSaveCopy,
                    shareDocument = ::shareCurrentDocument,
                    dismissNotice = appViewModel::dismissReaderNotice,
                    libraryState = appViewModel.libraryState,
                    collectDocument = appViewModel::collectCurrentDocument,
                    openCollectedDocument = appViewModel::openCollectedDocument,
                    setDocumentArchived = appViewModel::setDocumentArchived,
                    syncState = appViewModel.syncState,
                    loginSync = appViewModel::loginSync,
                    logoutSync = appViewModel::logoutSync,
                    queueDocumentSync = appViewModel::queueDocumentSync,
                    syncNow = appViewModel::syncNow,
                    conflicts = appViewModel.conflicts,
                    deleteDocument = appViewModel::deleteDocument,
                    restoreDocument = appViewModel::restoreDocument,
                    resolveConflict = appViewModel::resolveConflict,
                    exportConflictVersion = ::shareConflictVersion,
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        appViewModel.handleExternalIntent(intent)
    }

    private fun pickDocument() {
        documentPicker.launch(SupportedMimeTypes)
    }

    private fun copyText(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.app_name), text))
    }

    private fun openExternalLink(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.link_open_failed, Toast.LENGTH_SHORT).show()
        }
    }

    private fun startSaveCopy() {
        val request = appViewModel.prepareSaveCopy() ?: return
        saveCopyPicker.launch(request)
    }

    private fun shareCurrentDocument() {
        val document = appViewModel.currentDocument() ?: return
        lifecycleScope.launch {
            runCatching {
                val uri = shareAdapter.prepare(document)
                val mimeType = when (document.format) {
                    "json" -> "application/json"
                    "markdown" -> "text/markdown"
                    else -> "text/plain"
                }
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    clipData = ClipData.newUri(contentResolver, document.displayName, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(shareIntent, getString(R.string.share_document)))
            }.onFailure {
                appViewModel.showShareFailed()
            }
        }
    }

    private fun shareConflictVersion(versionId: String) {
        lifecycleScope.launch {
            runCatching {
                val item = requireNotNull(appViewModel.conflictVersionExport(versionId))
                val extension = formatExtension(item.format)
                val stem = item.title.substringBeforeLast('.', item.title).ifBlank { getString(R.string.app_name) }
                val displayName = "$stem-${item.versionId.takeLast(8)}.$extension"
                val uri = shareAdapter.prepareFile(java.io.File(item.localPath), displayName)
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = formatMimeType(item.format)
                    putExtra(Intent.EXTRA_STREAM, uri)
                    clipData = ClipData.newUri(contentResolver, displayName, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(shareIntent, getString(R.string.sync_export_conflict_version)))
            }.onFailure {
                appViewModel.showShareFailed()
            }
        }
    }

    private fun formatExtension(format: String): String = when (format) {
        "markdown" -> "md"
        "json" -> "json"
        "text" -> "txt"
        else -> format
    }

    private fun formatMimeType(format: String): String = when (format) {
        "markdown" -> "text/markdown"
        "json" -> "application/json"
        "text" -> "text/plain"
        "pdf" -> "application/pdf"
        "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else -> "application/octet-stream"
    }

    private companion object {
        val SupportedMimeTypes = arrayOf(
            "text/plain",
            "text/markdown",
            "text/x-markdown",
            "application/json",
        )
    }
}
