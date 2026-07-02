export const SAMPLE_MD = `# Markdown 阅读器示例

这是一份用于展示渲染效果的示例文档。支持以下所有元素。

## 文本样式

普通文本、**加粗文本**、*斜体文本*、~~删除线~~、\`行内代码\`。

可以混合：**加粗里有 *斜体* 和 \`代码\`**。

## 标题层级

### 三级标题
#### 四级标题
##### 五级标题

## 列表

无序列表：
- 苹果
- 香蕉
  - 芭蕉
  - 牛奶蕉
- 橙子

有序列表：
1. 第一步
2. 第二步
3. 第三步

## 代码块

\`\`\`typescript
interface Reader {
  content: string;
  fontSize: number;
  theme: 'day' | 'night';
}

function render(md: string): Reader {
  return { content: md, fontSize: 16, theme: 'day' };
}
\`\`\`

## 表格

| 名称 | 类型 | 说明 |
|------|------|------|
| 标题 | block | # 开头 |
| 列表 | block | - 或 1. |
| 代码 | inline | \` 包裹 |

## 引用

> 这是一段引用文字。
>
> 引用可以有多段。

## 链接与图片

[访问 Expo 文档](https://docs.expo.dev)

行内链接 [GitHub](https://github.com) 穿插在文字中。

## 分割线

---

## 结语

至此所有核心元素均已展示。调节字号、切换主题、目录跳转均可体验。
`;
