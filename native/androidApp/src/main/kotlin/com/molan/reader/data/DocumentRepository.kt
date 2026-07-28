package com.molan.reader.data

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.provider.OpenableColumns
import com.molan.reader.document.DocumentOpenError
import com.molan.reader.document.DocumentOpenRequest
import com.molan.reader.document.OpenDocument
import com.molan.reader.document.TextDocumentDecoder
import com.molan.reader.document.JsonDocumentParser
import com.molan.shared.SharedContractEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.FileNotFoundException
import java.io.InputStream
import java.io.IOException
import kotlin.coroutines.coroutineContext

class DocumentRepository(
    private val contentResolver: ContentResolver,
    private val contracts: SharedContractEngine = SharedContractEngine(),
) {
    suspend fun saveCopy(uri: Uri, text: String): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            contentResolver.openOutputStream(uri, "wt")?.use { output ->
                output.write(text.toByteArray(Charsets.UTF_8))
                output.flush()
            } ?: throw IOException("output stream unavailable")
        }
    }

    suspend fun open(request: DocumentOpenRequest): Result<OpenDocument> = withContext(Dispatchers.IO) {
        runCatching {
            val displayName = request.displayNameHint
                ?: displayName(request.uri)
                ?: request.uri.lastPathSegment
            val bytes = contentResolver.openInputStream(request.uri)?.use { stream ->
                stream.readLimitedBytes(MaxBufferedDocumentBytes)
            } ?: throw FileNotFoundException(request.uri.toString())
            val decoded = TextDocumentDecoder.decode(bytes)
                ?: throw DocumentOpenException(DocumentOpenError.DecodeFailed)
            val format = contracts.detectFormat(
                displayName.orEmpty(),
                decoded.text.take(DetectionPrefixLength),
            )
            if (format !in SupportedFormats) {
                throw DocumentOpenException(DocumentOpenError.UnsupportedFormat)
            }
            val maxBytes = if (format == "json") MaxJsonDocumentBytes else MaxTextDocumentBytes
            if (bytes.size > maxBytes) {
                throw DocumentOpenException(DocumentOpenError.TooLarge)
            }
            if (format == "markdown" && decoded.encoding !in MarkdownEncodings) {
                throw DocumentOpenException(DocumentOpenError.DecodeFailed)
            }
            OpenDocument(
                requestKey = request.key,
                displayName = displayName,
                format = format,
                encoding = decoded.encoding,
                text = decoded.text,
                json = if (format == "json") JsonDocumentParser.parse(decoded.text) else null,
            )
        }.recoverCatching { error ->
            throw when (error) {
                is DocumentOpenException -> error
                is SecurityException -> DocumentOpenException(DocumentOpenError.PermissionDenied, error)
                is FileNotFoundException -> DocumentOpenException(DocumentOpenError.SourceMissing, error)
                else -> DocumentOpenException(DocumentOpenError.Unknown, error)
            }
        }
    }

    private fun displayName(uri: Uri): String? =
        contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null,
        )?.use { cursor -> cursor.displayName() }

    private suspend fun InputStream.readLimitedBytes(maxBytes: Int): ByteArray {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(BufferSize)
        var total = 0
        while (true) {
            coroutineContext.ensureActive()
            val count = read(buffer)
            if (count == -1) break
            total += count
            if (total > maxBytes) {
                throw DocumentOpenException(DocumentOpenError.TooLarge)
            }
            output.write(buffer, 0, count)
        }
        return output.toByteArray()
    }

    private fun Cursor.displayName(): String? {
        if (!moveToFirst()) return null
        val column = getColumnIndex(OpenableColumns.DISPLAY_NAME)
        return if (column >= 0 && !isNull(column)) getString(column) else null
    }

    private companion object {
        const val MaxBufferedDocumentBytes = 16 * 1024 * 1024
        const val MaxTextDocumentBytes = 8 * 1024 * 1024
        const val MaxJsonDocumentBytes = 16 * 1024 * 1024
        const val BufferSize = 16 * 1024
        const val DetectionPrefixLength = 512
        val SupportedFormats = setOf("markdown", "json", "text")
        val MarkdownEncodings = setOf(
            TextDocumentDecoder.EncodingUtf8,
            TextDocumentDecoder.EncodingUtf8Bom,
        )
    }
}

class DocumentOpenException(
    val reason: DocumentOpenError,
    cause: Throwable? = null,
) : Exception(cause)
