package com.molan.reader.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class CollectionPolicyTest {
    @Test
    fun sameSourceAndHashIsDuplicateButChangedHashIsNewVersion() {
        assertEquals(CollectionPlan.Duplicate, decideCollectionPlan(true, "sha256:a", "sha256:a"))
        assertEquals(CollectionPlan.NewVersion, decideCollectionPlan(true, "sha256:a", "sha256:b"))
    }

    @Test
    fun unseenSourceCreatesDocument() {
        assertEquals(CollectionPlan.NewDocument, decideCollectionPlan(false, null, "sha256:a"))
    }

    @Test
    fun inconsistentExistingHashInputIsRejected() {
        assertThrows(IllegalArgumentException::class.java) {
            decideCollectionPlan(false, "sha256:orphan", "sha256:new")
        }
    }
}
