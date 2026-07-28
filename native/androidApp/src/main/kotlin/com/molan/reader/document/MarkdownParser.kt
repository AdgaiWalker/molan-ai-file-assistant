package com.molan.reader.document

sealed interface MarkdownBlock {
    val plainText: String

    data class Heading(val level: Int, override val plainText: String) : MarkdownBlock
    data class Paragraph(val segments: List<InlineSegment>) : MarkdownBlock {
        override val plainText: String = segments.joinToString(separator = "") { it.text }
    }
    data class ListItem(val marker: String, val segments: List<InlineSegment>) : MarkdownBlock {
        override val plainText: String = segments.joinToString(separator = "") { it.text }
    }
    data class Quote(val segments: List<InlineSegment>) : MarkdownBlock {
        override val plainText: String = segments.joinToString(separator = "") { it.text }
    }
    data class Code(val language: String?, val code: String) : MarkdownBlock {
        override val plainText: String = code
    }
    data class Table(val headers: List<String>, val rows: List<List<String>>) : MarkdownBlock {
        override val plainText: String = (listOf(headers) + rows).flatten().joinToString(" ")
    }
    data class Image(val alt: String, val source: String) : MarkdownBlock {
        override val plainText: String = alt
    }
}

enum class InlineStyle {
    Plain,
    Bold,
    Italic,
    Code,
    Link,
}

data class InlineSegment(
    val text: String,
    val style: InlineStyle = InlineStyle.Plain,
    val url: String? = null,
)

object MarkdownParser {
    fun parse(markdown: String): List<MarkdownBlock> {
        if (markdown.isEmpty()) return emptyList()
        val lines = markdown.replace("\r\n", "\n").replace('\r', '\n').split('\n')
        val blocks = mutableListOf<MarkdownBlock>()
        var index = 0
        while (index < lines.size) {
            val line = lines[index]
            if (line.isBlank()) {
                index += 1
                continue
            }

            val fence = FencePattern.matchEntire(line)
            if (fence != null) {
                val codeLines = mutableListOf<String>()
                index += 1
                while (index < lines.size && !ClosingFencePattern.matches(lines[index])) {
                    codeLines += lines[index]
                    index += 1
                }
                if (index < lines.size) index += 1
                blocks += MarkdownBlock.Code(
                    language = fence.groupValues[1].trim().ifBlank { null },
                    code = codeLines.joinToString("\n"),
                )
                continue
            }

            val heading = HeadingPattern.matchEntire(line)
            if (heading != null) {
                blocks += MarkdownBlock.Heading(
                    level = heading.groupValues[1].length,
                    plainText = heading.groupValues[2].trim(),
                )
                index += 1
                continue
            }

            val image = ImagePattern.matchEntire(line.trim())
            if (image != null) {
                blocks += MarkdownBlock.Image(image.groupValues[1], image.groupValues[2])
                index += 1
                continue
            }

            if (index + 1 < lines.size && isTableHeader(line, lines[index + 1])) {
                val headers = tableCells(line)
                val rows = mutableListOf<List<String>>()
                index += 2
                while (index < lines.size && lines[index].contains('|') && lines[index].isNotBlank()) {
                    rows += tableCells(lines[index])
                    index += 1
                }
                blocks += MarkdownBlock.Table(headers, rows)
                continue
            }

            val quote = QuotePattern.matchEntire(line)
            if (quote != null) {
                blocks += MarkdownBlock.Quote(parseInline(quote.groupValues[1]))
                index += 1
                continue
            }

            val unordered = UnorderedListPattern.matchEntire(line)
            if (unordered != null) {
                blocks += MarkdownBlock.ListItem("•", parseInline(unordered.groupValues[1]))
                index += 1
                continue
            }

            val ordered = OrderedListPattern.matchEntire(line)
            if (ordered != null) {
                blocks += MarkdownBlock.ListItem(
                    marker = "${ordered.groupValues[1]}.",
                    segments = parseInline(ordered.groupValues[2]),
                )
                index += 1
                continue
            }

            val paragraphLines = mutableListOf(line.trim())
            index += 1
            while (index < lines.size && lines[index].isNotBlank() && !startsBlock(lines, index)) {
                paragraphLines += lines[index].trim()
                index += 1
            }
            blocks += MarkdownBlock.Paragraph(parseInline(paragraphLines.joinToString(" ")))
        }
        return blocks
    }

    fun parseInline(text: String): List<InlineSegment> {
        if (text.isEmpty()) return emptyList()
        val segments = mutableListOf<InlineSegment>()
        var index = 0
        while (index < text.length) {
            val token = InlinePatterns.firstNotNullOfOrNull { candidate ->
                candidate.regex.find(text, index)
                    ?.takeIf { it.range.first == index }
                    ?.let { candidate to it }
            }
            if (token != null) {
                val (candidate, match) = token
                val label = match.groupValues[1]
                val url = if (candidate.style == InlineStyle.Link) match.groupValues[2] else null
                segments += InlineSegment(label, candidate.style, url)
                index = match.range.last + 1
                continue
            }

            val nextToken = InlinePatterns.mapNotNull { it.regex.find(text, index)?.range?.first }.minOrNull()
                ?: text.length
            val end = if (nextToken == index) index + 1 else nextToken
            segments += InlineSegment(text.substring(index, end))
            index = end
        }
        return segments.mergePlainSegments()
    }

    private fun startsBlock(lines: List<String>, index: Int): Boolean {
        val line = lines[index]
        return FencePattern.matches(line) ||
            HeadingPattern.matches(line) ||
            ImagePattern.matches(line.trim()) ||
            QuotePattern.matches(line) ||
            UnorderedListPattern.matches(line) ||
            OrderedListPattern.matches(line) ||
            (index + 1 < lines.size && isTableHeader(line, lines[index + 1]))
    }

    private fun isTableHeader(header: String, delimiter: String): Boolean =
        header.contains('|') && TableDelimiterPattern.matches(delimiter.trim())

    private fun tableCells(line: String): List<String> =
        line.trim().trim('|').split('|').map(String::trim)

    private fun List<InlineSegment>.mergePlainSegments(): List<InlineSegment> {
        val merged = mutableListOf<InlineSegment>()
        for (segment in this) {
            val previous = merged.lastOrNull()
            if (previous?.style == InlineStyle.Plain && segment.style == InlineStyle.Plain) {
                merged[merged.lastIndex] = previous.copy(text = previous.text + segment.text)
            } else {
                merged += segment
            }
        }
        return merged
    }

    private data class InlinePattern(val regex: Regex, val style: InlineStyle)

    private val FencePattern = Regex("^\\s*```(.*)$")
    private val ClosingFencePattern = Regex("^\\s*```\\s*$")
    private val HeadingPattern = Regex("^(#{1,6})\\s+(.+)$")
    private val ImagePattern = Regex("^!\\[([^]]*)]\\(([^)]+)\\)$")
    private val QuotePattern = Regex("^\\s*>\\s?(.*)$")
    private val UnorderedListPattern = Regex("^\\s*[-+*]\\s+(.+)$")
    private val OrderedListPattern = Regex("^\\s*(\\d+)\\.\\s+(.+)$")
    private val TableDelimiterPattern = Regex("^\\|?\\s*:?-{3,}:?\\s*(\\|\\s*:?-{3,}:?\\s*)+\\|?$")
    private val InlinePatterns = listOf(
        InlinePattern(Regex("\\[([^]]+)]\\((https?://[^\\s)]+)\\)"), InlineStyle.Link),
        InlinePattern(Regex("\\*\\*([^*]+)\\*\\*"), InlineStyle.Bold),
        InlinePattern(Regex("`([^`]+)`"), InlineStyle.Code),
        InlinePattern(Regex("\\*([^*]+)\\*"), InlineStyle.Italic),
    )
}
