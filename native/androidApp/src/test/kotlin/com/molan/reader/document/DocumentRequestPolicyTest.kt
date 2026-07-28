package com.molan.reader.document

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DocumentRequestPolicyTest {
    @Test
    fun repeatedIntentForCurrentUriIsIgnored() {
        assertFalse(
            DocumentRequestPolicy.shouldOpen(
                currentRequestKey = "content://files/one",
                incomingRequestKey = "content://files/one",
            ),
        )
    }

    @Test
    fun retryForCurrentUriIsAllowed() {
        assertTrue(
            DocumentRequestPolicy.shouldOpen(
                currentRequestKey = "content://files/one",
                incomingRequestKey = "content://files/one",
                force = true,
            ),
        )
    }

    @Test
    fun aDifferentUriIsOpened() {
        assertTrue(
            DocumentRequestPolicy.shouldOpen(
                currentRequestKey = "content://files/one",
                incomingRequestKey = "content://files/two",
            ),
        )
    }
}
