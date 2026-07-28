package com.molan.reader.ui.reader

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.molan.reader.R
import com.molan.reader.document.JsonDocumentFormatter
import com.molan.reader.document.JsonParseError
import com.molan.reader.document.JsonParseResult
import com.molan.reader.document.JsonSearchResult
import com.molan.reader.document.JsonTreeRow
import com.molan.reader.document.JsonValue
import com.molan.reader.document.MarkdownBlock
import com.molan.reader.document.MarkdownParser
import com.molan.reader.document.OpenDocument
import com.molan.reader.document.buildJsonTreeRows
import com.molan.reader.document.looksLikeMarkdown
import com.molan.reader.document.searchJson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

@Composable
fun JsonReaderContent(
    document: OpenDocument,
    query: String,
    copyText: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val parseResult = document.json ?: return
    var mode by remember(document.requestKey) { mutableStateOf(JsonViewMode.Tree) }

    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            JsonViewMode.entries.forEach { candidate ->
                OutlinedButton(onClick = { mode = candidate }) {
                    Text(stringResource(candidate.label))
                }
            }
        }

        when (parseResult) {
            is JsonParseResult.Failure -> JsonFailureView(parseResult, document.text)
            is JsonParseResult.Success -> when (mode) {
                JsonViewMode.Tree -> JsonTreeView(parseResult.root, query, copyText)
                JsonViewMode.Source -> JsonRawView(document.text, copyText)
                JsonViewMode.Pretty -> JsonRawView(JsonDocumentFormatter.pretty(parseResult.root), copyText)
                JsonViewMode.Compact -> JsonRawView(JsonDocumentFormatter.compact(parseResult.root), copyText)
            }
        }
    }
}

@Composable
private fun JsonRawView(text: String, copyText: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        Button(
            modifier = Modifier.padding(horizontal = 12.dp),
            onClick = { copyText(text) },
        ) {
            Text(stringResource(R.string.copy_document))
        }
        SelectionContainer {
            Text(
                text = text,
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                fontFamily = FontFamily.Monospace,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun JsonFailureView(failure: JsonParseResult.Failure, source: String) {
    Column(modifier = Modifier.fillMaxSize()) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            color = MaterialTheme.colorScheme.errorContainer,
            shape = MaterialTheme.shapes.medium,
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(stringResource(R.string.json_parse_error), fontWeight = FontWeight.Bold)
                Text(stringResource(failure.error.messageResource()))
                Text(stringResource(R.string.json_error_location, failure.line, failure.column, failure.offset))
            }
        }
        SelectionContainer {
            Text(
                text = source,
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                fontFamily = FontFamily.Monospace,
            )
        }
    }
}

@Composable
private fun JsonTreeView(root: JsonValue, query: String, copyText: (String) -> Unit) {
    var expanded by remember(root) { mutableStateOf(setOf("$")) }
    var visibleLimits by remember(root) { mutableStateOf(emptyMap<String, Int>()) }
    var selected by remember(root) { mutableStateOf<JsonTreeRow.Node?>(null) }
    var markdownPreview by remember { mutableStateOf<String?>(null) }
    var searchResult by remember(root) { mutableStateOf(JsonSearchResult(emptyList(), false)) }

    LaunchedEffect(root, query) {
        if (query.isBlank()) {
            searchResult = JsonSearchResult(emptyList(), false)
        } else {
            delay(SearchDebounceMillis)
            searchResult = withContext(Dispatchers.Default) { searchJson(root, query) }
        }
    }

    val rows = remember(root, expanded, visibleLimits) {
        buildJsonTreeRows(root, expanded, visibleLimits, pageSize = JsonPageSize)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        selected?.let { node ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                TextButton(onClick = { copyText(JsonDocumentFormatter.compact(node.value)) }) {
                    Text(stringResource(R.string.json_copy_value))
                }
                TextButton(onClick = { copyText(node.path) }) {
                    Text(stringResource(R.string.json_copy_path))
                }
                if (node.value.looksLikeMarkdown()) {
                    TextButton(onClick = {
                        markdownPreview = (node.value as JsonValue.StringValue).value
                    }) {
                        Text(stringResource(R.string.json_markdown_preview))
                    }
                }
            }
        }

        if (query.isNotBlank()) {
            Text(
                text = stringResource(
                    if (searchResult.truncated) R.string.json_search_results_truncated
                    else R.string.json_search_results,
                    searchResult.matches.size,
                ),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(searchResult.matches, key = { it.path }) { match ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { copyText(match.path) }
                            .padding(horizontal = 18.dp, vertical = 10.dp),
                    ) {
                        Text(match.path, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)
                        Text(match.preview, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(rows, key = { row ->
                    when (row) {
                        is JsonTreeRow.Node -> row.path
                        is JsonTreeRow.LoadMore -> "${row.parentPath}-load-more"
                    }
                }) { row ->
                    when (row) {
                        is JsonTreeRow.Node -> JsonNodeRow(
                            row = row,
                            expanded = row.path in expanded,
                            selected = selected?.path == row.path,
                            onClick = {
                                selected = row
                                if (row.childCount > 0) {
                                    expanded = if (row.path in expanded) expanded - row.path else expanded + row.path
                                }
                            },
                        )
                        is JsonTreeRow.LoadMore -> TextButton(
                            modifier = Modifier.padding(start = (row.depth * JsonIndentDp).dp),
                            onClick = {
                                visibleLimits = visibleLimits +
                                    (row.parentPath to ((visibleLimits[row.parentPath] ?: JsonPageSize) + JsonPageSize))
                            },
                        ) {
                            Text(stringResource(R.string.json_load_more, row.remaining))
                        }
                    }
                }
            }
        }
    }

    markdownPreview?.let { markdown ->
        AlertDialog(
            onDismissRequest = { markdownPreview = null },
            title = { Text(stringResource(R.string.json_markdown_preview)) },
            text = {
                Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                    MarkdownParser.parse(markdown).forEach { block ->
                        Text(
                            text = block.plainText,
                            modifier = Modifier.padding(vertical = 4.dp),
                            fontWeight = if (block is MarkdownBlock.Heading) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { markdownPreview = null }) {
                    Text(stringResource(R.string.close))
                }
            },
        )
    }
}

@Composable
private fun JsonNodeRow(
    row: JsonTreeRow.Node,
    expanded: Boolean,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = if (selected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surface,
    ) {
        Row(
            modifier = Modifier.padding(
                start = (12 + row.depth * JsonIndentDp).dp,
                end = 12.dp,
                top = 9.dp,
                bottom = 9.dp,
            ),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(if (row.childCount == 0) "·" else if (expanded) "▾" else "▸")
            Text(row.label, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)
            Text(
                text = row.preview,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
            )
        }
    }
}

@StringRes
private fun JsonParseError.messageResource(): Int = when (this) {
    JsonParseError.Empty -> R.string.json_error_empty
    JsonParseError.UnexpectedToken -> R.string.json_error_unexpected
    JsonParseError.InvalidString -> R.string.json_error_string
    JsonParseError.InvalidNumber -> R.string.json_error_number
    JsonParseError.TrailingContent -> R.string.json_error_trailing
    JsonParseError.TooDeep -> R.string.json_error_depth
}

private enum class JsonViewMode(@param:StringRes val label: Int) {
    Tree(R.string.json_tree),
    Source(R.string.json_source),
    Pretty(R.string.json_pretty),
    Compact(R.string.json_compact),
}

private const val JsonPageSize = 100
private const val JsonIndentDp = 14
private const val SearchDebounceMillis = 120L
