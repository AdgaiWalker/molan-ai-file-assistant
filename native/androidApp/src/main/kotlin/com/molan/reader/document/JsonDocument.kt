package com.molan.reader.document

sealed interface JsonValue {
    data class ObjectValue(val entries: List<Entry>) : JsonValue {
        data class Entry(val key: String, val value: JsonValue)
    }

    data class ArrayValue(val items: List<JsonValue>) : JsonValue
    data class StringValue(val value: String) : JsonValue
    data class NumberValue(val raw: String) : JsonValue
    data class BooleanValue(val value: Boolean) : JsonValue
    data object NullValue : JsonValue
}

enum class JsonParseError {
    Empty,
    UnexpectedToken,
    InvalidString,
    InvalidNumber,
    TrailingContent,
    TooDeep,
}

sealed interface JsonParseResult {
    data class Success(val root: JsonValue) : JsonParseResult
    data class Failure(
        val error: JsonParseError,
        val offset: Int,
        val line: Int,
        val column: Int,
    ) : JsonParseResult
}

object JsonDocumentParser {
    fun parse(text: String, maxDepth: Int = 512): JsonParseResult = Parser(text, maxDepth).parse()

    private class Parser(private val source: String, private val maxDepth: Int) {
        private var index = 0

        fun parse(): JsonParseResult = try {
            skipWhitespace()
            if (index == source.length) fail(JsonParseError.Empty)
            val root = value(depth = 0)
            skipWhitespace()
            if (index != source.length) fail(JsonParseError.TrailingContent)
            JsonParseResult.Success(root)
        } catch (failure: ParseFailure) {
            val before = source.take(failure.offset)
            val line = before.count { it == '\n' } + 1
            val lastLineBreak = before.lastIndexOf('\n')
            JsonParseResult.Failure(
                error = failure.error,
                offset = failure.offset,
                line = line,
                column = failure.offset - lastLineBreak,
            )
        }

        private fun value(depth: Int): JsonValue {
            if (depth > maxDepth) fail(JsonParseError.TooDeep)
            skipWhitespace()
            if (index >= source.length) fail(JsonParseError.UnexpectedToken)
            return when (source[index]) {
                '{' -> objectValue(depth + 1)
                '[' -> arrayValue(depth + 1)
                '"' -> JsonValue.StringValue(stringValue())
                't' -> literal("true", JsonValue.BooleanValue(true))
                'f' -> literal("false", JsonValue.BooleanValue(false))
                'n' -> literal("null", JsonValue.NullValue)
                '-', in '0'..'9' -> JsonValue.NumberValue(numberValue())
                else -> fail(JsonParseError.UnexpectedToken)
            }
        }

        private fun objectValue(depth: Int): JsonValue.ObjectValue {
            index += 1
            skipWhitespace()
            val entries = mutableListOf<JsonValue.ObjectValue.Entry>()
            if (takeIfPresent('}')) return JsonValue.ObjectValue(entries)
            while (true) {
                skipWhitespace()
                if (index >= source.length || source[index] != '"') fail(JsonParseError.UnexpectedToken)
                val key = stringValue()
                skipWhitespace()
                expect(':')
                entries += JsonValue.ObjectValue.Entry(key, value(depth))
                skipWhitespace()
                if (takeIfPresent('}')) break
                expect(',')
            }
            return JsonValue.ObjectValue(entries)
        }

        private fun arrayValue(depth: Int): JsonValue.ArrayValue {
            index += 1
            skipWhitespace()
            val items = mutableListOf<JsonValue>()
            if (takeIfPresent(']')) return JsonValue.ArrayValue(items)
            while (true) {
                items += value(depth)
                skipWhitespace()
                if (takeIfPresent(']')) break
                expect(',')
            }
            return JsonValue.ArrayValue(items)
        }

        private fun stringValue(): String {
            expect('"')
            val result = StringBuilder()
            while (index < source.length) {
                val char = source[index++]
                when {
                    char == '"' -> return result.toString()
                    char == '\\' -> result.append(escapeSequence())
                    char.code < 0x20 -> fail(JsonParseError.InvalidString, index - 1)
                    else -> result.append(char)
                }
            }
            fail(JsonParseError.InvalidString)
        }

        private fun escapeSequence(): Char {
            if (index >= source.length) fail(JsonParseError.InvalidString)
            return when (val escaped = source[index++]) {
                '"', '\\', '/' -> escaped
                'b' -> '\b'
                'f' -> '\u000c'
                'n' -> '\n'
                'r' -> '\r'
                't' -> '\t'
                'u' -> unicodeEscape()
                else -> fail(JsonParseError.InvalidString, index - 1)
            }
        }

        private fun unicodeEscape(): Char {
            if (index + 4 > source.length) fail(JsonParseError.InvalidString)
            val hex = source.substring(index, index + 4)
            if (!hex.all { it.isDigit() || it.lowercaseChar() in 'a'..'f' }) {
                fail(JsonParseError.InvalidString)
            }
            index += 4
            return hex.toInt(16).toChar()
        }

        private fun numberValue(): String {
            val start = index
            takeIfPresent('-')
            when {
                takeIfPresent('0') -> {
                    if (index < source.length && source[index].isDigit()) fail(JsonParseError.InvalidNumber)
                }
                index < source.length && source[index] in '1'..'9' -> {
                    while (index < source.length && source[index].isDigit()) index += 1
                }
                else -> fail(JsonParseError.InvalidNumber)
            }
            if (takeIfPresent('.')) {
                val fractionStart = index
                while (index < source.length && source[index].isDigit()) index += 1
                if (fractionStart == index) fail(JsonParseError.InvalidNumber)
            }
            if (index < source.length && source[index].lowercaseChar() == 'e') {
                index += 1
                if (index < source.length && source[index] in "+-") index += 1
                val exponentStart = index
                while (index < source.length && source[index].isDigit()) index += 1
                if (exponentStart == index) fail(JsonParseError.InvalidNumber)
            }
            return source.substring(start, index)
        }

        private fun <T : JsonValue> literal(expected: String, result: T): T {
            if (!source.startsWith(expected, index)) fail(JsonParseError.UnexpectedToken)
            index += expected.length
            return result
        }

        private fun skipWhitespace() {
            while (index < source.length && source[index] in JsonWhitespace) index += 1
        }

        private fun expect(expected: Char) {
            if (!takeIfPresent(expected)) fail(JsonParseError.UnexpectedToken)
        }

        private fun takeIfPresent(expected: Char): Boolean {
            if (index >= source.length || source[index] != expected) return false
            index += 1
            return true
        }

        private fun fail(error: JsonParseError, offset: Int = index): Nothing =
            throw ParseFailure(error, offset)
    }

    private class ParseFailure(val error: JsonParseError, val offset: Int) : RuntimeException()
    private val JsonWhitespace = setOf(' ', '\t', '\r', '\n')
}

object JsonDocumentFormatter {
    fun compact(value: JsonValue): String = buildString { appendValue(value, indent = null, depth = 0) }
    fun pretty(value: JsonValue, indent: String = "  "): String =
        buildString { appendValue(value, indent = indent, depth = 0) }

    private fun StringBuilder.appendValue(value: JsonValue, indent: String?, depth: Int) {
        when (value) {
            is JsonValue.ObjectValue -> {
                append('{')
                value.entries.forEachIndexed { index, entry ->
                    if (index > 0) append(',')
                    newline(indent, depth + 1)
                    appendQuoted(entry.key)
                    append(if (indent == null) ':' else ": ")
                    appendValue(entry.value, indent, depth + 1)
                }
                if (value.entries.isNotEmpty()) newline(indent, depth)
                append('}')
            }
            is JsonValue.ArrayValue -> {
                append('[')
                value.items.forEachIndexed { index, item ->
                    if (index > 0) append(',')
                    newline(indent, depth + 1)
                    appendValue(item, indent, depth + 1)
                }
                if (value.items.isNotEmpty()) newline(indent, depth)
                append(']')
            }
            is JsonValue.StringValue -> appendQuoted(value.value)
            is JsonValue.NumberValue -> append(value.raw)
            is JsonValue.BooleanValue -> append(value.value)
            JsonValue.NullValue -> append("null")
        }
    }

    private fun StringBuilder.newline(indent: String?, depth: Int) {
        if (indent == null) return
        append('\n')
        repeat(depth) { append(indent) }
    }

    private fun StringBuilder.appendQuoted(text: String) {
        append('"')
        text.forEach { char ->
            when (char) {
                '"' -> append("\\\"")
                '\\' -> append("\\\\")
                '\b' -> append("\\b")
                '\u000c' -> append("\\f")
                '\n' -> append("\\n")
                '\r' -> append("\\r")
                '\t' -> append("\\t")
                else -> if (char.code < 0x20) append("\\u%04x".format(char.code)) else append(char)
            }
        }
        append('"')
    }
}

sealed interface JsonTreeRow {
    val depth: Int

    data class Node(
        val path: String,
        val label: String,
        val preview: String,
        val value: JsonValue,
        val childCount: Int,
        override val depth: Int,
    ) : JsonTreeRow

    data class LoadMore(
        val parentPath: String,
        val remaining: Int,
        override val depth: Int,
    ) : JsonTreeRow
}

fun buildJsonTreeRows(
    root: JsonValue,
    expandedPaths: Set<String>,
    visibleLimits: Map<String, Int>,
    pageSize: Int = 100,
): List<JsonTreeRow> {
    require(pageSize > 0)
    val rows = mutableListOf<JsonTreeRow>()

    fun appendNode(path: String, label: String, value: JsonValue, depth: Int) {
        val children = value.children(path)
        rows += JsonTreeRow.Node(path, label, value.preview(), value, children.size, depth)
        if (children.isEmpty() || path !in expandedPaths) return
        val limit = visibleLimits[path] ?: pageSize
        children.take(limit).forEach { child ->
            appendNode(child.path, child.label, child.value, depth + 1)
        }
        if (children.size > limit) {
            rows += JsonTreeRow.LoadMore(path, children.size - limit, depth + 1)
        }
    }

    appendNode("$", "$", root, 0)
    return rows
}

data class JsonSearchMatch(val path: String, val preview: String)
data class JsonSearchResult(val matches: List<JsonSearchMatch>, val truncated: Boolean)

fun searchJson(root: JsonValue, query: String, maxResults: Int = 200): JsonSearchResult {
    require(maxResults > 0)
    if (query.isBlank()) return JsonSearchResult(emptyList(), false)
    val matches = mutableListOf<JsonSearchMatch>()
    val stack = ArrayDeque<JsonChild>()
    stack.add(JsonChild("$", "$", root))
    while (stack.isNotEmpty()) {
        val current = stack.removeLast()
        val preview = current.value.preview()
        if (current.label.contains(query, ignoreCase = true) || preview.contains(query, ignoreCase = true)) {
            if (matches.size == maxResults) return JsonSearchResult(matches, true)
            matches += JsonSearchMatch(current.path, preview)
        }
        current.value.children(current.path).asReversed().forEach(stack::add)
    }
    return JsonSearchResult(matches, false)
}

fun jsonPath(parent: String, key: String): String =
    if (IdentifierPattern.matches(key)) "$parent.$key"
    else "$parent['${key.replace("\\", "\\\\").replace("'", "\\'")}']"

fun JsonValue.looksLikeMarkdown(): Boolean =
    this is JsonValue.StringValue && MarkdownHintPattern.containsMatchIn(value)

private data class JsonChild(val path: String, val label: String, val value: JsonValue)

private fun JsonValue.children(parentPath: String): List<JsonChild> = when (this) {
    is JsonValue.ObjectValue -> entries.map { JsonChild(jsonPath(parentPath, it.key), it.key, it.value) }
    is JsonValue.ArrayValue -> items.mapIndexed { index, value ->
        JsonChild("$parentPath[$index]", "[$index]", value)
    }
    else -> emptyList()
}

private fun JsonValue.preview(): String = when (this) {
    is JsonValue.ObjectValue -> "{${entries.size}}"
    is JsonValue.ArrayValue -> "[${items.size}]"
    is JsonValue.StringValue -> value.replace('\n', ' ').let { if (it.length > 160) it.take(160) + "…" else it }
    is JsonValue.NumberValue -> raw
    is JsonValue.BooleanValue -> value.toString()
    JsonValue.NullValue -> "null"
}

private val IdentifierPattern = Regex("[A-Za-z_$][A-Za-z0-9_$]*")
private val MarkdownHintPattern = Regex("(^|\\n)#{1,6}\\s|\\*\\*[^*]+\\*\\*|```|\\[[^]]+]\\([^)]+\\)")
