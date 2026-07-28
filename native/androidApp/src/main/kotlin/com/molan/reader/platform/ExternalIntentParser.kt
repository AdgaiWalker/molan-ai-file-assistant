package com.molan.reader.platform

import android.content.Intent
import android.net.Uri
import com.molan.reader.document.DocumentOpenRequest

object ExternalIntentParser {
    fun parse(intent: Intent?): DocumentOpenRequest? {
        val sourceIntent = intent ?: return null
        val uri = when (sourceIntent.action) {
            Intent.ACTION_VIEW -> sourceIntent.data
            Intent.ACTION_SEND -> streamUri(sourceIntent) ?: sourceIntent.clipData?.getItemAt(0)?.uri
            else -> null
        } ?: return null

        return DocumentOpenRequest(
            uri = uri,
            displayNameHint = sourceIntent.getStringExtra(Intent.EXTRA_TITLE),
        )
    }

    @Suppress("DEPRECATION")
    private fun streamUri(intent: Intent): Uri? =
        intent.getParcelableExtra(Intent.EXTRA_STREAM)
}
