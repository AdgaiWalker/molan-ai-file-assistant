package com.molan.reader.ui.reader

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.molan.reader.R
import com.molan.reader.document.EditorUiState
import com.molan.reader.document.JsonDocumentFormatter
import com.molan.reader.document.JsonParseResult
import com.molan.reader.document.MarkdownBlock
import com.molan.reader.document.MarkdownParser
import com.molan.reader.document.OpenDocument
import com.molan.reader.document.ReaderNotice

@Composable
fun DocumentEditorDialog(
    document: OpenDocument,
    state: EditorUiState,
    updateText: (String) -> Unit,
    cancel: () -> Unit,
    discard: () -> Unit,
    saveCopy: () -> Unit,
) {
    Dialog(
        onDismissRequest = cancel,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            when (state) {
                EditorUiState.Idle -> Unit
                EditorUiState.Loading -> Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
                ) {
                    CircularProgressIndicator()
                    Text(stringResource(R.string.loading_document))
                }
                is EditorUiState.Ready -> EditorReadyView(
                    document = document,
                    state = state,
                    updateText = updateText,
                    cancel = cancel,
                    discard = discard,
                    saveCopy = saveCopy,
                )
            }
        }
    }
}

@Composable
private fun EditorReadyView(
    document: OpenDocument,
    state: EditorUiState.Ready,
    updateText: (String) -> Unit,
    cancel: () -> Unit,
    discard: () -> Unit,
    saveCopy: () -> Unit,
) {
    var preview by remember(document.requestKey) { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(stringResource(R.string.editor_title), style = MaterialTheme.typography.headlineSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { preview = false }) {
                Text(stringResource(R.string.editor_source))
            }
            OutlinedButton(onClick = { preview = true }) {
                Text(stringResource(R.string.editor_preview))
            }
        }
        if (state.draftRestored) {
            Text(
                stringResource(R.string.editor_draft_restored),
                color = MaterialTheme.colorScheme.primary,
            )
        }
        if (state.draftSaveFailed) {
            Text(
                stringResource(R.string.editor_draft_failed),
                color = MaterialTheme.colorScheme.error,
            )
        }
        if (state.jsonFailure != null) {
            Text(
                stringResource(R.string.editor_json_invalid),
                color = MaterialTheme.colorScheme.error,
            )
        }

        if (preview) {
            EditorPreview(
                document = document,
                text = state.text,
                jsonFailure = state.jsonFailure,
                modifier = Modifier.weight(1f),
            )
        } else {
            OutlinedTextField(
                value = state.text,
                onValueChange = updateText,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                label = { Text(stringResource(R.string.editor_source)) },
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            TextButton(onClick = cancel) {
                Text(stringResource(R.string.cancel))
            }
            TextButton(onClick = discard) {
                Text(stringResource(R.string.editor_discard))
            }
            Button(
                enabled = state.jsonFailure == null && !state.savingCopy,
                onClick = saveCopy,
            ) {
                Text(
                    stringResource(
                        if (state.savingCopy) R.string.editor_saving else R.string.editor_save_copy,
                    ),
                )
            }
        }
    }
}

@Composable
private fun EditorPreview(
    document: OpenDocument,
    text: String,
    jsonFailure: JsonParseResult.Failure?,
    modifier: Modifier,
) {
    SelectionContainer {
        Column(modifier = modifier.verticalScroll(rememberScrollState())) {
            when {
                document.format == "json" && jsonFailure != null -> Text(
                    stringResource(R.string.editor_json_invalid),
                    color = MaterialTheme.colorScheme.error,
                )
                document.format == "json" -> {
                    val parsed = remember(text) { com.molan.reader.document.JsonDocumentParser.parse(text) }
                    val formatted = (parsed as? JsonParseResult.Success)
                        ?.let { JsonDocumentFormatter.pretty(it.root) }
                        ?: text
                    Text(formatted, fontFamily = FontFamily.Monospace)
                }
                document.format == "markdown" -> MarkdownParser.parse(text).forEach { block ->
                    Text(
                        block.plainText,
                        modifier = Modifier.padding(vertical = 5.dp),
                        fontWeight = if (block is MarkdownBlock.Heading) FontWeight.Bold else FontWeight.Normal,
                    )
                }
                else -> Text(text)
            }
        }
    }
}

@Composable
fun ReaderNoticeDialog(notice: ReaderNotice, dismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = dismiss,
        text = { Text(stringResource(notice.messageResource())) },
        confirmButton = {
            TextButton(onClick = dismiss) {
                Text(stringResource(R.string.close))
            }
        },
    )
}

private fun ReaderNotice.messageResource(): Int = when (this) {
    ReaderNotice.CopySaved -> R.string.copy_saved
    ReaderNotice.CopySaveFailed -> R.string.copy_save_failed
    ReaderNotice.ShareFailed -> R.string.share_failed
    ReaderNotice.DraftSaveFailed -> R.string.draft_save_failed
    ReaderNotice.EditorTooLarge -> R.string.editor_too_large
    ReaderNotice.CollectionAdded -> R.string.collection_added
    ReaderNotice.CollectionDuplicate -> R.string.collection_duplicate
    ReaderNotice.CollectionNewVersion -> R.string.collection_new_version
    ReaderNotice.CollectionFailed -> R.string.collection_failed
    ReaderNotice.CollectionOpenFailed -> R.string.collection_open_failed
}
