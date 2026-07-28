package com.molan.reader.platform

import android.content.Context
import androidx.core.content.FileProvider
import com.molan.reader.document.OpenDocument
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class DocumentShareAdapter(private val context: Context) {
    suspend fun prepare(document: OpenDocument) = withContext(Dispatchers.IO) {
        val directory = shareDirectory()
        val safeName = document.displayName
            ?.replace(UnsafeFileNameCharacters, "_")
            ?.take(MaxShareFileNameLength)
            ?.ifBlank { null }
            ?: "molan-document.${document.defaultExtension()}"
        val output = File(directory, safeName)
        output.writeText(document.text, Charsets.UTF_8)
        FileProvider.getUriForFile(context, "${context.packageName}.files", output)
    }

    suspend fun prepareFile(source: File, displayName: String) = withContext(Dispatchers.IO) {
        check(source.isFile) { "share source unavailable" }
        val directory = shareDirectory()
        val output = File(directory, safeFileName(displayName))
        source.copyTo(output, overwrite = true)
        FileProvider.getUriForFile(context, "${context.packageName}.files", output)
    }

    private fun shareDirectory(): File {
        val directory = File(context.cacheDir, "shared-documents")
        check(directory.exists() || directory.mkdirs()) { "share directory unavailable" }
        directory.listFiles()?.forEach { file ->
            if (file.lastModified() < System.currentTimeMillis() - ShareCacheMaxAgeMillis) file.delete()
        }
        return directory
    }

    private fun safeFileName(value: String): String = value
        .replace(UnsafeFileNameCharacters, "_")
        .take(MaxShareFileNameLength)
        .ifBlank { "molan-conflict-version.bin" }

    private fun OpenDocument.defaultExtension(): String = when (format) {
        "markdown" -> "md"
        "json" -> "json"
        else -> "txt"
    }

    private companion object {
        const val ShareCacheMaxAgeMillis = 24 * 60 * 60 * 1_000L
        const val MaxShareFileNameLength = 120
        val UnsafeFileNameCharacters = Regex("[\\\\/:*?\"<>|]")
    }
}
