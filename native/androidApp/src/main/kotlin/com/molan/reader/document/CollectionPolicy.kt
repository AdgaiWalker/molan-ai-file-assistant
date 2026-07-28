package com.molan.reader.document

enum class CollectionPlan {
    NewDocument,
    Duplicate,
    NewVersion,
}

fun decideCollectionPlan(
    documentExists: Boolean,
    currentContentHash: String?,
    incomingContentHash: String,
): CollectionPlan {
    require(documentExists || currentContentHash == null)
    return when {
        !documentExists -> CollectionPlan.NewDocument
        currentContentHash == incomingContentHash -> CollectionPlan.Duplicate
        else -> CollectionPlan.NewVersion
    }
}
