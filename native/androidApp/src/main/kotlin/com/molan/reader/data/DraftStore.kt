package com.molan.reader.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest

class DraftStore(context: Context) {
    private val directory = File(context.filesDir, "drafts")

    suspend fun load(documentKey: String): String? = withContext(Dispatchers.IO) {
        file(documentKey).takeIf(File::exists)?.readText(Charsets.UTF_8)
    }

    suspend fun save(documentKey: String, text: String) = withContext(Dispatchers.IO) {
        check(directory.exists() || directory.mkdirs()) { "draft directory unavailable" }
        val target = file(documentKey)
        val temporary = File(directory, "${target.name}.tmp")
        temporary.writeText(text, Charsets.UTF_8)
        check(temporary.renameTo(target)) { "draft replace failed" }
    }

    suspend fun delete(documentKey: String) = withContext(Dispatchers.IO) {
        val target = file(documentKey)
        check(!target.exists() || target.delete()) { "draft delete failed" }
    }

    private fun file(documentKey: String): File {
        val digest = MessageDigest.getInstance("SHA-256").digest(documentKey.toByteArray(Charsets.UTF_8))
        val name = digest.joinToString(separator = "") { byte -> "%02x".format(byte) }
        return File(directory, "$name.txt")
    }
}
