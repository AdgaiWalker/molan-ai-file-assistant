package com.molan.reader.document

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MarkdownParserTest {
    @Test
    fun parsesRequiredBlockTypesAndInlineStyles() {
        val markdown = """
            # 标题
            段落含 **粗体**、*斜体*、`代码` 和 [链接](https://example.com)。
            - 列表
            > 引用
            | A | B |
            |---|---|
            | 1 | 2 |
            ```ts
            val ok = true
            ```
            ![图片](image.png)
        """.trimIndent()

        val blocks = MarkdownParser.parse(markdown)

        assertTrue(blocks.any { it is MarkdownBlock.Heading })
        assertTrue(blocks.any { it is MarkdownBlock.ListItem })
        assertTrue(blocks.any { it is MarkdownBlock.Quote })
        assertTrue(blocks.any { it is MarkdownBlock.Table })
        assertTrue(blocks.any { it is MarkdownBlock.Code })
        assertTrue(blocks.any { it is MarkdownBlock.Image })
        val paragraph = blocks.filterIsInstance<MarkdownBlock.Paragraph>().single()
        assertEquals(
            setOf(InlineStyle.Plain, InlineStyle.Bold, InlineStyle.Italic, InlineStyle.Code, InlineStyle.Link),
            paragraph.segments.map { it.style }.toSet(),
        )
    }

    @Test
    fun malformedAndUnclosedSyntaxFallsBackWithoutThrowing() {
        val blocks = MarkdownParser.parse("**未闭合\n```js\nconst unfinished = true")

        assertEquals("**未闭合", blocks[0].plainText)
        assertEquals("const unfinished = true", (blocks[1] as MarkdownBlock.Code).code)
    }

    @Test
    fun unsafeLinkSchemesRemainPlainText() {
        val segments = MarkdownParser.parseInline("[危险](javascript:alert(1))")

        assertTrue(segments.all { it.url == null })
        assertEquals("[危险](javascript:alert(1))", segments.joinToString("") { it.text })
    }
}
