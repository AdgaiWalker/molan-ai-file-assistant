package com.molan.reader.document

data class TextSearchResult(
    val ranges: List<IntRange>,
    val truncated: Boolean,
)

fun findTextMatches(
    text: String,
    query: String,
    maxMatches: Int = 1_000,
): TextSearchResult {
    require(maxMatches > 0)
    if (query.isBlank() || text.isEmpty()) return TextSearchResult(emptyList(), false)

    val ranges = ArrayList<IntRange>(minOf(maxMatches, 32))
    var fromIndex = 0
    while (fromIndex <= text.length - query.length) {
        val match = text.indexOf(query, startIndex = fromIndex, ignoreCase = true)
        if (match < 0) break
        if (ranges.size == maxMatches) return TextSearchResult(ranges, true)
        ranges += match until match + query.length
        fromIndex = match + query.length
    }
    return TextSearchResult(ranges, false)
}
