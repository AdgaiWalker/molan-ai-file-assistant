package com.molan.shared

class SharedContractEngine {
    fun entityId(timestampMillis: Long, entropyHex: String): String =
        uuidV7(timestampMillis, entropyHex)

    fun canTransition(from: String, to: String): Boolean =
        to in (GeneratedLifecycleTransitions[from] ?: emptySet())

    fun detectFormat(fileName: String, textPrefix: String): String {
        GeneratedSignatureFormats.firstOrNull { (prefix) -> textPrefix.startsWith(prefix) }
            ?.let { (_, format) -> return format }

        val extension = fileName.substringAfterLast('.', missingDelimiterValue = "").lowercase()
        return GeneratedExtensionFormats[extension]
            ?: if (looksLikeJson(textPrefix)) "json" else GeneratedFallbackFormat
    }

    fun verifyBaseline(): Boolean {
        val id = entityId(
            timestampMillis = 1_700_000_000_000,
            entropyHex = "00112233445566778899",
        )
        return id.length == 36 &&
            id[14] == '7' &&
            id[19] in "89ab" &&
            canTransition("temporary_open", "read") &&
            !canTransition("temporary_open", "synced") &&
            detectFormat("sample.md", "# 墨览") == "markdown"
    }
}

internal fun uuidV7(timestampMillis: Long, entropyHex: String): String {
    require(timestampMillis in 0..MaxUuidTimestamp) {
        "timestampMillis must fit the UUIDv7 48-bit timestamp"
    }
    require(entropyHex.length == 20 && entropyHex.all { it.isHexDigit() }) {
        "entropyHex must contain exactly 20 hexadecimal characters"
    }

    val bytes = ByteArray(16)
    for (index in 0 until 6) {
        val shift = (5 - index) * 8
        bytes[index] = ((timestampMillis shr shift) and 0xff).toByte()
    }
    for (index in 0 until 10) {
        val offset = index * 2
        bytes[index + 6] = entropyHex.substring(offset, offset + 2).toInt(16).toByte()
    }

    bytes[6] = ((bytes[6].toInt() and 0x0f) or 0x70).toByte()
    bytes[8] = ((bytes[8].toInt() and 0x3f) or 0x80).toByte()

    return buildString(36) {
        bytes.forEachIndexed { index, byte ->
            if (index == 4 || index == 6 || index == 8 || index == 10) append('-')
            val value = byte.toInt() and 0xff
            append(HexDigits[value ushr 4])
            append(HexDigits[value and 0x0f])
        }
    }
}

private fun Char.isHexDigit(): Boolean =
    this in '0'..'9' || this in 'a'..'f' || this in 'A'..'F'

private fun looksLikeJson(textPrefix: String): Boolean {
    val trimmed = textPrefix.trimStart('\uFEFF', ' ', '\t', '\r', '\n')
    return trimmed.startsWith('{') || trimmed.startsWith('[')
}

private const val MaxUuidTimestamp = 0xffffffffffff
private const val HexDigits = "0123456789abcdef"
