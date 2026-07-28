package com.molan.reader.document

import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets

data class DecodedText(
    val text: String,
    val encoding: String,
)

object TextDocumentDecoder {
    fun decode(bytes: ByteArray): DecodedText? {
        if (bytes.isEmpty()) return DecodedText("", EncodingUtf8)
        if (bytes.startsWith(Utf8Bom)) {
            return decode(bytes.copyOfRange(Utf8Bom.size, bytes.size), StandardCharsets.UTF_8)
                ?.let { DecodedText(it, EncodingUtf8Bom) }
        }
        if (bytes.startsWith(Utf16LeBom)) {
            return decode(bytes.copyOfRange(Utf16LeBom.size, bytes.size), StandardCharsets.UTF_16LE)
                ?.let { DecodedText(it, EncodingUtf16LeBom) }
        }
        if (bytes.startsWith(Utf16BeBom)) {
            return decode(bytes.copyOfRange(Utf16BeBom.size, bytes.size), StandardCharsets.UTF_16BE)
                ?.let { DecodedText(it, EncodingUtf16BeBom) }
        }
        if (binaryControlRatio(bytes) > MaxControlRatio) return null

        return decode(bytes, StandardCharsets.UTF_8)?.let { DecodedText(it, EncodingUtf8) }
            ?: decode(bytes, Charset.forName("GB18030"))?.let { DecodedText(it, EncodingGbk) }
    }

    private fun decode(bytes: ByteArray, charset: Charset): String? = runCatching {
        charset
            .newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(bytes))
            .toString()
    }.getOrNull()

    private fun binaryControlRatio(bytes: ByteArray): Double {
        var controls = 0
        for (byte in bytes) {
            val value = byte.toInt() and 0xff
            if (value == 0) return 1.0
            if ((value < 0x20 && value !in AllowedControls) || value == 0x7f) controls += 1
        }
        return controls.toDouble() / bytes.size
    }

    private fun ByteArray.startsWith(prefix: ByteArray): Boolean =
        size >= prefix.size && prefix.indices.all { this[it] == prefix[it] }

    const val EncodingUtf8 = "utf-8"
    const val EncodingUtf8Bom = "utf-8-bom"
    const val EncodingUtf16LeBom = "utf-16le-bom"
    const val EncodingUtf16BeBom = "utf-16be-bom"
    const val EncodingGbk = "gbk"

    private const val MaxControlRatio = 0.02
    private val AllowedControls = setOf(0x09, 0x0a, 0x0c, 0x0d)
    private val Utf8Bom = byteArrayOf(0xef.toByte(), 0xbb.toByte(), 0xbf.toByte())
    private val Utf16LeBom = byteArrayOf(0xff.toByte(), 0xfe.toByte())
    private val Utf16BeBom = byteArrayOf(0xfe.toByte(), 0xff.toByte())
}
