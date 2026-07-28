package com.molan.reader.ui.reader

import androidx.annotation.StringRes
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.molan.reader.R
import com.molan.reader.document.DocumentOpenError
import com.molan.reader.document.DocumentUiState
import com.molan.reader.document.EditorUiState
import com.molan.reader.document.OpenDocument
import com.molan.reader.document.ReaderNotice
import com.molan.reader.document.TextSearchResult
import com.molan.reader.document.findTextMatches

@Composable
fun ReaderScreen(
    state: DocumentUiState,
    close: () -> Unit,
    retry: () -> Unit,
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
    collectDocument: () -> Unit,
) {
    Surface(modifier = Modifier.fillMaxSize()) {
        when (state) {
            DocumentUiState.Idle -> ReaderMessage(
                title = stringResource(R.string.empty_home_title),
                message = stringResource(R.string.empty_home_message),
                close = close,
            )

            is DocumentUiState.Loading -> Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
            ) {
                CircularProgressIndicator()
                Text(stringResource(R.string.loading_document))
            }

            is DocumentUiState.Ready -> DocumentReader(
                document = state.document,
                close = close,
                copyText = copyText,
                openExternalLink = openExternalLink,
                startEditing = startEditing,
                shareDocument = shareDocument,
                collectDocument = collectDocument,
            )

            is DocumentUiState.Failed -> ReaderMessage(
                title = stringResource(R.string.document_open_failed),
                message = stringResource(state.error.messageResource()),
                close = close,
                retry = retry,
            )
        }
    }

    val readyDocument = (state as? DocumentUiState.Ready)?.document
    if (readyDocument != null && editorState != EditorUiState.Idle) {
        DocumentEditorDialog(
            document = readyDocument,
            state = editorState,
            updateText = updateEditorText,
            cancel = cancelEditing,
            discard = discardDraft,
            saveCopy = saveCopy,
        )
    }
    readerNotice?.let { notice ->
        ReaderNoticeDialog(notice = notice, dismiss = dismissNotice)
    }
}

@Composable
private fun DocumentReader(
    document: OpenDocument,
    close: () -> Unit,
    copyText: (String) -> Unit,
    openExternalLink: (String) -> Unit,
    startEditing: () -> Unit,
    shareDocument: () -> Unit,
    collectDocument: () -> Unit,
) {
    var query by rememberSaveable(document.requestKey) { mutableStateOf("") }
    var copied by rememberSaveable(document.requestKey) { mutableStateOf(false) }
    var typeScaleIndex by rememberSaveable(document.requestKey) { mutableIntStateOf(DefaultTypeScale) }
    val scrollState = rememberSaveable(document.requestKey, saver = ScrollState.Saver) {
        ScrollState(initial = 0)
    }
    val searchResult = remember(document.text, query) { findTextMatches(document.text, query) }
    val highlightedText = highlightedText(
        text = document.text,
        result = searchResult,
        highlightColor = MaterialTheme.colorScheme.tertiaryContainer,
    )

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedButton(onClick = close) {
                Text(stringResource(R.string.back_home))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = document.displayName ?: stringResource(R.string.unnamed_document),
                    maxLines = 1,
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    text = stringResource(
                        R.string.document_metadata,
                        document.format.uppercase(),
                        document.encoding.uppercase(),
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                copied = false
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp),
            label = { Text(stringResource(R.string.search_document)) },
            singleLine = true,
            supportingText = {
                if (query.isNotBlank()) {
                    Text(searchResult.description())
                }
            },
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(onClick = startEditing) {
                Text(stringResource(R.string.edit_document))
            }
            OutlinedButton(onClick = shareDocument) {
                Text(stringResource(R.string.share_document))
            }
            OutlinedButton(
                enabled = document.libraryDocumentId == null,
                onClick = collectDocument,
            ) {
                Text(
                    stringResource(
                        if (document.libraryDocumentId == null) R.string.collect_document
                        else R.string.document_collected,
                    ),
                )
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedButton(
                enabled = typeScaleIndex > 0,
                onClick = { typeScaleIndex -= 1 },
            ) {
                Text(stringResource(R.string.text_smaller))
            }
            OutlinedButton(
                enabled = typeScaleIndex < TypeScales.lastIndex,
                onClick = { typeScaleIndex += 1 },
            ) {
                Text(stringResource(R.string.text_larger))
            }
            Button(onClick = {
                copyText(document.text)
                copied = true
            }) {
                Text(
                    stringResource(
                        if (copied) R.string.document_copied else R.string.copy_document,
                    ),
                )
            }
        }
        if (document.text.isEmpty()) {
            SelectionContainer {
                Text(
                    text = stringResource(R.string.empty_document),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        } else if (document.format == "markdown") {
            key(document.requestKey) {
                MarkdownReaderContent(
                    document = document,
                    query = query,
                    fontSize = TypeScales[typeScaleIndex].fontSize,
                    lineHeight = TypeScales[typeScaleIndex].lineHeight,
                    copyText = copyText,
                    openExternalLink = openExternalLink,
                    modifier = Modifier.weight(1f),
                )
            }
        } else if (document.format == "json") {
            key(document.requestKey) {
                JsonReaderContent(
                    document = document,
                    query = query,
                    copyText = copyText,
                    modifier = Modifier.weight(1f),
                )
            }
        } else {
            SelectionContainer {
                Text(
                    text = highlightedText,
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    style = MaterialTheme.typography.bodyLarge.copy(
                        fontSize = TypeScales[typeScaleIndex].fontSize,
                        lineHeight = TypeScales[typeScaleIndex].lineHeight,
                    ),
                )
            }
        }
    }
}

@Composable
private fun TextSearchResult.description(): String = when {
    ranges.isEmpty() -> stringResource(R.string.search_no_results)
    truncated -> stringResource(R.string.search_results_truncated, ranges.size)
    else -> stringResource(R.string.search_results, ranges.size)
}

@Composable
private fun highlightedText(
    text: String,
    result: TextSearchResult,
    highlightColor: Color,
): AnnotatedString = remember(text, result, highlightColor) {
    buildAnnotatedString {
        append(text)
        result.ranges.forEach { range ->
            addStyle(
                style = SpanStyle(background = highlightColor),
                start = range.first,
                end = range.last + 1,
            )
        }
    }
}

@Composable
private fun ReaderMessage(
    title: String,
    message: String,
    close: () -> Unit,
    retry: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text(text = title, style = MaterialTheme.typography.headlineMedium)
        Text(
            text = message,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodyLarge,
        )
        retry?.let { action ->
            Button(onClick = action) {
                Text(stringResource(R.string.retry))
            }
        }
        OutlinedButton(onClick = close) {
            Text(stringResource(R.string.back_home))
        }
    }
}

@StringRes
private fun DocumentOpenError.messageResource(): Int = when (this) {
    DocumentOpenError.PermissionDenied -> R.string.document_permission_error
    DocumentOpenError.SourceMissing -> R.string.document_missing_error
    DocumentOpenError.TooLarge -> R.string.document_too_large_error
    DocumentOpenError.DecodeFailed -> R.string.document_decode_error
    DocumentOpenError.UnsupportedFormat -> R.string.document_unsupported_error
    DocumentOpenError.Unknown -> R.string.document_unknown_error
}

private data class TypeScale(
    val fontSize: TextUnit,
    val lineHeight: TextUnit,
)

private val TypeScales = listOf(
    TypeScale(fontSize = 15.sp, lineHeight = 22.sp),
    TypeScale(fontSize = 18.sp, lineHeight = 28.sp),
    TypeScale(fontSize = 22.sp, lineHeight = 34.sp),
)
private const val DefaultTypeScale = 1
