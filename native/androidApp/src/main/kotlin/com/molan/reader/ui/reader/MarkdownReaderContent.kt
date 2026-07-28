package com.molan.reader.ui.reader

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import com.molan.reader.R
import com.molan.reader.document.InlineSegment
import com.molan.reader.document.InlineStyle
import com.molan.reader.document.MarkdownBlock
import com.molan.reader.document.MarkdownParser
import com.molan.reader.document.OpenDocument
import com.molan.reader.document.findTextMatches
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.net.URI
import java.net.URL

@Composable
fun MarkdownReaderContent(
    document: OpenDocument,
    query: String,
    fontSize: TextUnit,
    lineHeight: TextUnit,
    copyText: (String) -> Unit,
    openExternalLink: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val blocks = remember(document.text) { MarkdownParser.parse(document.text) }
    val headings = remember(blocks) {
        blocks.mapIndexedNotNull { index, block ->
            (block as? MarkdownBlock.Heading)?.let { index to it }
        }
    }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var showToc by remember { mutableStateOf(false) }
    var pendingLink by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = modifier,
        state = listState,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item(key = "reader-toc") {
            OutlinedButton(
                modifier = Modifier.padding(horizontal = 16.dp),
                onClick = { showToc = true },
            ) {
                Text(stringResource(R.string.markdown_toc))
            }
        }
        itemsIndexed(
            items = blocks,
            key = { index, block -> "$index-${block::class.simpleName}" },
        ) { _, block ->
            MarkdownBlockView(
                block = block,
                documentKey = document.requestKey,
                query = query,
                fontSize = fontSize,
                lineHeight = lineHeight,
                copyText = copyText,
                requestOpenLink = { pendingLink = it },
            )
        }
        item(key = "reader-bottom-space") {
            Text("", modifier = Modifier.padding(bottom = 24.dp))
        }
    }

    if (showToc) {
        AlertDialog(
            onDismissRequest = { showToc = false },
            title = { Text(stringResource(R.string.markdown_toc)) },
            text = {
                if (headings.isEmpty()) {
                    Text(stringResource(R.string.markdown_toc_empty))
                } else {
                    Column(modifier = Modifier.verticalDialogScroll()) {
                        headings.forEach { (blockIndex, heading) ->
                            TextButton(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = ((heading.level - 1) * 12).dp),
                                onClick = {
                                    showToc = false
                                    scope.launch { listState.animateScrollToItem(blockIndex + 1) }
                                },
                            ) {
                                Text(heading.plainText, modifier = Modifier.fillMaxWidth())
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showToc = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }

    pendingLink?.let { url ->
        AlertDialog(
            onDismissRequest = { pendingLink = null },
            title = { Text(stringResource(R.string.external_link_title)) },
            text = { Text(stringResource(R.string.external_link_message, url)) },
            confirmButton = {
                Button(onClick = {
                    pendingLink = null
                    openExternalLink(url)
                }) {
                    Text(stringResource(R.string.open_external_link))
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingLink = null }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Composable
private fun MarkdownBlockView(
    block: MarkdownBlock,
    documentKey: String,
    query: String,
    fontSize: TextUnit,
    lineHeight: TextUnit,
    copyText: (String) -> Unit,
    requestOpenLink: (String) -> Unit,
) {
    val modifier = Modifier.padding(horizontal = 20.dp)
    when (block) {
        is MarkdownBlock.Heading -> Text(
            text = highlightedOrPlain(block.plainText, query),
            modifier = modifier.padding(top = if (block.level == 1) 8.dp else 0.dp),
            style = when (block.level) {
                1 -> MaterialTheme.typography.headlineMedium
                2 -> MaterialTheme.typography.titleLarge
                else -> MaterialTheme.typography.titleMedium
            },
        )

        is MarkdownBlock.Paragraph -> InlineBlock(
            segments = block.segments,
            query = query,
            fontSize = fontSize,
            lineHeight = lineHeight,
            modifier = modifier,
            requestOpenLink = requestOpenLink,
        )

        is MarkdownBlock.ListItem -> Row(
            modifier = modifier,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(block.marker, fontSize = fontSize, lineHeight = lineHeight)
            InlineBlock(
                segments = block.segments,
                query = query,
                fontSize = fontSize,
                lineHeight = lineHeight,
                modifier = Modifier.weight(1f),
                requestOpenLink = requestOpenLink,
            )
        }

        is MarkdownBlock.Quote -> Surface(
            modifier = modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.secondaryContainer,
            shape = MaterialTheme.shapes.small,
        ) {
            InlineBlock(
                segments = block.segments,
                query = query,
                fontSize = fontSize,
                lineHeight = lineHeight,
                modifier = Modifier.padding(14.dp),
                requestOpenLink = requestOpenLink,
            )
        }

        is MarkdownBlock.Code -> CodeBlock(block, query, copyText, modifier)
        is MarkdownBlock.Table -> TableBlock(block, query, modifier)
        is MarkdownBlock.Image -> MarkdownImage(block, documentKey, requestOpenLink, modifier)
    }
}

@Composable
private fun InlineBlock(
    segments: List<InlineSegment>,
    query: String,
    fontSize: TextUnit,
    lineHeight: TextUnit,
    modifier: Modifier,
    requestOpenLink: (String) -> Unit,
) {
    val plainText = remember(segments) { segments.joinToString("") { it.text } }
    SelectionContainer {
        Column(modifier = modifier) {
            Text(
                text = if (query.isBlank()) inlineAnnotatedString(segments) else highlightedOrPlain(plainText, query),
                fontSize = fontSize,
                lineHeight = lineHeight,
            )
            segments.filter { it.url != null }.forEach { link ->
                TextButton(onClick = { requestOpenLink(link.url!!) }) {
                    Text(link.text)
                }
            }
        }
    }
}

@Composable
private fun inlineAnnotatedString(segments: List<InlineSegment>): AnnotatedString {
    val linkColor = MaterialTheme.colorScheme.primary
    val codeBackground = MaterialTheme.colorScheme.surfaceVariant
    return remember(segments, linkColor, codeBackground) {
        buildAnnotatedString {
            segments.forEach { segment ->
                val start = length
                append(segment.text)
                val style = when (segment.style) {
                    InlineStyle.Plain -> null
                    InlineStyle.Bold -> SpanStyle(fontWeight = FontWeight.Bold)
                    InlineStyle.Italic -> SpanStyle(fontStyle = FontStyle.Italic)
                    InlineStyle.Code -> SpanStyle(fontFamily = FontFamily.Monospace, background = codeBackground)
                    InlineStyle.Link -> SpanStyle(color = linkColor, textDecoration = TextDecoration.Underline)
                }
                if (style != null) addStyle(style, start, length)
            }
        }
    }
}

@Composable
private fun highlightedOrPlain(text: String, query: String): AnnotatedString {
    val highlight = MaterialTheme.colorScheme.tertiaryContainer
    return remember(text, query, highlight) {
        buildAnnotatedString {
            append(text)
            findTextMatches(text, query).ranges.forEach { range ->
                addStyle(SpanStyle(background = highlight), range.first, range.last + 1)
            }
        }
    }
}

@Composable
private fun CodeBlock(
    block: MarkdownBlock.Code,
    query: String,
    copyText: (String) -> Unit,
    modifier: Modifier,
) {
    var copied by remember(block.code) { mutableStateOf(false) }
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    stringResource(R.string.code_language, block.language ?: "code"),
                    style = MaterialTheme.typography.labelMedium,
                )
                TextButton(onClick = {
                    copyText(block.code)
                    copied = true
                }) {
                    Text(stringResource(if (copied) R.string.code_copied else R.string.copy_code))
                }
            }
            SelectionContainer {
                Text(
                    text = highlightedOrPlain(block.code, query),
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    fontFamily = FontFamily.Monospace,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun TableBlock(block: MarkdownBlock.Table, query: String, modifier: Modifier) {
    Column(modifier = modifier.horizontalScroll(rememberScrollState())) {
        TableRow(block.headers, query, header = true)
        block.rows.forEach { TableRow(it, query, header = false) }
    }
}

@Composable
private fun TableRow(cells: List<String>, query: String, header: Boolean) {
    Row {
        cells.forEach { cell ->
            Surface(
                modifier = Modifier.width(TableCellWidth),
                color = if (header) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent,
                tonalElevation = 1.dp,
            ) {
                SelectionContainer {
                    Text(
                        text = highlightedOrPlain(cell, query),
                        modifier = Modifier.padding(10.dp),
                        fontWeight = if (header) FontWeight.Bold else FontWeight.Normal,
                    )
                }
            }
        }
    }
}

@Composable
private fun MarkdownImage(
    block: MarkdownBlock.Image,
    documentKey: String,
    requestOpenLink: (String) -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val loadState by rememberMarkdownImageState(
        source = block.source,
        documentKey = documentKey,
        resolver = context.contentResolver,
    )
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            when (val current = loadState) {
                ImageLoadState.Loading -> Text(stringResource(R.string.markdown_image_loading))
                ImageLoadState.Failed -> Text(
                    stringResource(R.string.markdown_image_placeholder, block.alt.ifBlank { "image" }),
                )
                is ImageLoadState.Ready -> Image(
                    bitmap = current.bitmap.asImageBitmap(),
                    contentDescription = block.alt.ifBlank { null },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = MaximumRenderedImageHeight),
                    contentScale = ContentScale.Fit,
                )
            }
            Text(
                stringResource(R.string.markdown_image_source, block.source),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
            if (block.source.startsWith("https://") || block.source.startsWith("http://")) {
                TextButton(onClick = { requestOpenLink(block.source) }) {
                    Text(stringResource(R.string.open_external_link))
                }
            }
        }
    }
}

@Composable
private fun rememberMarkdownImageState(
    source: String,
    documentKey: String,
    resolver: ContentResolver,
): State<ImageLoadState> = produceState<ImageLoadState>(
    initialValue = ImageLoadState.Loading,
    key1 = source,
    key2 = documentKey,
) {
    value = withContext(Dispatchers.IO) {
        runCatching { loadMarkdownBitmap(source, documentKey, resolver) }
            .fold(
                onSuccess = { ImageLoadState.Ready(it) },
                onFailure = { ImageLoadState.Failed },
            )
    }
}

private fun loadMarkdownBitmap(
    source: String,
    documentKey: String,
    resolver: ContentResolver,
): Bitmap {
    val bytes = when {
        source.startsWith("data:image/") -> decodeDataImage(source)
        else -> openImageStream(source, documentKey, resolver).use { it.readLimitedBytes(MaximumImageBytes) }
    }
    val bounds = BitmapFactory.Options().also { it.inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    check(bounds.outWidth > 0 && bounds.outHeight > 0) { "unsupported image" }
    val options = BitmapFactory.Options().apply {
        inSampleSize = calculateSampleSize(bounds.outWidth, bounds.outHeight)
    }
    return checkNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)) {
        "image decode failed"
    }
}

private fun openImageStream(
    source: String,
    documentKey: String,
    resolver: ContentResolver,
): InputStream {
    val sourceUri = Uri.parse(source)
    if (sourceUri.scheme in setOf(ContentResolver.SCHEME_CONTENT, ContentResolver.SCHEME_FILE)) {
        return checkNotNull(resolver.openInputStream(sourceUri)) { "image stream unavailable" }
    }
    if (sourceUri.scheme == "https") {
        return URL(source).openConnection().apply {
            connectTimeout = ImageNetworkTimeoutMillis
            readTimeout = ImageNetworkTimeoutMillis
        }.getInputStream()
    }
    if (sourceUri.scheme != null) error("unsupported image scheme")

    val documentUri = Uri.parse(documentKey)
    return when (documentUri.scheme) {
        ContentResolver.SCHEME_FILE -> {
            val documentFile = checkNotNull(documentUri.path?.let(::File))
            File(documentFile.parentFile, source).inputStream()
        }
        ContentResolver.SCHEME_CONTENT -> {
            val parentPath = documentUri.path?.substringBeforeLast('/') ?: error("image parent unavailable")
            val sibling = documentUri.buildUpon().path("$parentPath/$source").build()
            checkNotNull(resolver.openInputStream(sibling)) { "image stream unavailable" }
        }
        "https" -> URL(URI(documentKey).resolve(source).toString()).openConnection().apply {
            connectTimeout = ImageNetworkTimeoutMillis
            readTimeout = ImageNetworkTimeoutMillis
        }.getInputStream()
        else -> error("image location unavailable")
    }
}

private fun decodeDataImage(source: String): ByteArray {
    val separator = source.indexOf(',')
    check(separator > 0 && source.substring(0, separator).endsWith(";base64")) { "invalid data image" }
    val encoded = source.substring(separator + 1)
    check(encoded.length <= MaximumEncodedImageCharacters) { "image exceeds limit" }
    return Base64.decode(encoded, Base64.DEFAULT)
}

private fun InputStream.readLimitedBytes(limit: Int): ByteArray {
    val output = ByteArrayOutputStream()
    val buffer = ByteArray(ImageBufferSize)
    var total = 0
    while (true) {
        val count = read(buffer)
        if (count < 0) break
        total += count
        check(total <= limit) { "image exceeds limit" }
        output.write(buffer, 0, count)
    }
    return output.toByteArray()
}

private fun calculateSampleSize(width: Int, height: Int): Int {
    var sampleSize = 1
    while (width / sampleSize > MaximumDecodedImageSide || height / sampleSize > MaximumDecodedImageSide) {
        sampleSize *= 2
    }
    return sampleSize
}

private sealed interface ImageLoadState {
    data object Loading : ImageLoadState
    data object Failed : ImageLoadState
    data class Ready(val bitmap: Bitmap) : ImageLoadState
}

@Composable
private fun Modifier.verticalDialogScroll(): Modifier = verticalScroll(rememberScrollState())

private val TableCellWidth = 160.dp
private val MaximumRenderedImageHeight = 480.dp
private const val MaximumImageBytes = 8 * 1024 * 1024
private const val MaximumEncodedImageCharacters = 12 * 1024 * 1024
private const val MaximumDecodedImageSide = 2_048
private const val ImageNetworkTimeoutMillis = 8_000
private const val ImageBufferSize = 16 * 1024
