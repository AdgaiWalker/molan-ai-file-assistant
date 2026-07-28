package com.molan.reader.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.nio.charset.Charset

class TextDocumentDecoderTest {
    @Test
    fun decodesUtf8BomAndGbkWithoutMojibake() {
        val utf8Bom = byteArrayOf(0xef.toByte(), 0xbb.toByte(), 0xbf.toByte()) +
            "中文".toByteArray(Charsets.UTF_8)
        val gbk = "GBK: 中文测试".toByteArray(Charset.forName("GB18030"))

        assertEquals(DecodedText("中文", "utf-8-bom"), TextDocumentDecoder.decode(utf8Bom))
        assertEquals(DecodedText("GBK: 中文测试", "gbk"), TextDocumentDecoder.decode(gbk))
    }

    @Test
    fun rejectsBinaryControlsBeforeTextFallback() {
        val disguisedBinary = byteArrayOf(0x00, 0x01, 0x02, 0x7f, 0x41)

        assertNull(TextDocumentDecoder.decode(disguisedBinary))
    }

    @Test
    fun emptyFileIsValidUtf8Text() {
        assertEquals(DecodedText("", "utf-8"), TextDocumentDecoder.decode(byteArrayOf()))
    }
}
