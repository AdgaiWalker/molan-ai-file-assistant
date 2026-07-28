package com.molan.shared

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class SharedContractEngineTest {
    private val engine = SharedContractEngine()

    @Test
    fun uuidV7IsDeterministicAndHasRequiredBits() {
        val id = engine.entityId(
            timestampMillis = 0x0123456789ab,
            entropyHex = "00112233445566778899",
        )

        assertEquals("01234567-89ab-7011-a233-445566778899", id)
    }

    @Test
    fun uuidV7RejectsInvalidEntropy() {
        assertFailsWith<IllegalArgumentException> {
            engine.entityId(0, "not-hex")
        }
    }

    @Test
    fun lifecycleUsesFrozenTransitionRules() {
        assertTrue(engine.canTransition("temporary_open", "read"))
        assertFalse(engine.canTransition("temporary_open", "synced"))
        assertFalse(engine.canTransition("failed", "collected"))
        assertTrue(engine.canTransition("deleted", "conflict"))
    }

    @Test
    fun formatDetectionUsesSignatureThenExtensionThenTextFallback() {
        assertEquals("pdf", engine.detectFormat("wrong.txt", "%PDF-1.7"))
        assertEquals("markdown", engine.detectFormat("note.MD", "# 标题"))
        assertEquals("json", engine.detectFormat("no-extension", "\uFEFF {\"ok\":true}"))
        assertEquals("text", engine.detectFormat("README", "普通文本"))
    }

    @Test
    fun baselineProbeCoversAllThreeSharedContracts() {
        assertTrue(engine.verifyBaseline())
    }
}
