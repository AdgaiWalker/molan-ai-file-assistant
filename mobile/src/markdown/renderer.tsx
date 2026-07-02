import React, { ReactNode, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Token, Tokens } from 'marked';
import * as Clipboard from 'expo-clipboard';
import { Theme, BASE_FONT_SIZE } from '../theme';

const fs = (base: number, scale: number) => Math.round(base * scale);

// 代码块：横向滚动 + 一键复制
function CodeBlock({ token, theme, scale }: { token: Tokens.Code; theme: Theme; scale: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(token.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <View style={[styles.codeBlock, { backgroundColor: theme.codeBackground }]}>
      <View style={styles.codeHeader}>
        <Text style={{ color: theme.textSecondary, fontSize: 11 }}>{token.lang || 'code'}</Text>
        <TouchableOpacity onPress={copy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: theme.link, fontSize: 12 }}>{copied ? '已复制' : '复制'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={{ color: theme.codeText, fontSize: fs(13, scale), fontFamily: 'monospace' }}>
          {token.text}
        </Text>
      </ScrollView>
    </View>
  );
}

// 图片：长按复制图片地址（保存/分享待图片缓存落本地后支持，见 P0 图片缓存项）
function ImageBlock({ token }: { token: Tokens.Image }) {
  const onLongPress = () => {
    Alert.alert(
      '图片',
      undefined,
      [
        { text: '复制图片地址', onPress: () => Clipboard.setStringAsync(token.href) },
        { text: '取消', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };
  return (
    <TouchableOpacity activeOpacity={1} onLongPress={onLongPress} style={{ marginVertical: 8 }}>
      <Image
        source={{ uri: token.href }}
        style={{ width: '100%', height: 220, borderRadius: 4 }}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={token.href}
        transition={200}
        accessible
        accessibilityLabel={token.text}
      />
    </TouchableOpacity>
  );
}

// ===== 块级渲染 =====

function renderBlocks(
  tokens: Token[],
  theme: Theme,
  scale: number,
): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const key = `block-${i}`;
    out.push(renderBlock(token, key, theme, scale));
  }
  return out;
}

export function renderBlock(
  token: Token,
  key: string,
  theme: Theme,
  scale: number,
): ReactNode {
  switch (token.type) {
    case 'heading':
      return renderHeading(token as Tokens.Heading, key, theme, scale);
    case 'paragraph':
      return (
        <Text
          key={key}
          selectable
          style={[styles.paragraph, { color: theme.text, fontSize: fs(BASE_FONT_SIZE, scale), lineHeight: fs(26, scale) }]}
        >
          {renderInline((token as Tokens.Paragraph).tokens, theme, scale)}
        </Text>
      );
    case 'list':
      return renderList(token as Tokens.List, key, theme, scale);
    case 'code':
      return <CodeBlock key={key} token={token as Tokens.Code} theme={theme} scale={scale} />;
    case 'table':
      return renderTable(token as Tokens.Table, key, theme, scale);
    case 'blockquote':
      return renderBlockquote(token as Tokens.Blockquote, key, theme, scale);
    case 'hr':
      return <View key={key} style={[styles.hr, { borderColor: theme.border }]} />;
    case 'space':
    case 'html':
      return null;
    default:
      return null;
  }
}

function renderHeading(
  token: Tokens.Heading,
  key: string,
  theme: Theme,
  scale: number,
): ReactNode {
  const sizes: Record<number, number> = { 1: 28, 2: 24, 3: 20, 4: 18, 5: 16, 6: 15 };
  const size = fs(sizes[token.depth] ?? 16, scale);
  return (
    <View key={key} style={styles.headingWrap}>
      <Text
        selectable
        style={{
          color: theme.heading,
          fontSize: size,
          fontWeight: '700' as const,
          marginTop: token.depth <= 2 ? 18 : 12,
          marginBottom: 6,
        }}
      >
        {renderInline(token.tokens, theme, scale)}
      </Text>
    </View>
  );
}

function renderList(token: Tokens.List, key: string, theme: Theme, scale: number): ReactNode {
  const items = token.items.map((item, i) => {
    const marker = token.ordered ? `${Number(token.start) + i}. ` : '• ';
    return (
      <View key={`${key}-item-${i}`} style={styles.listItem}>
        <Text
          selectable
          style={{ color: theme.text, fontSize: fs(BASE_FONT_SIZE, scale), lineHeight: fs(26, scale) }}
        >
          <Text style={{ color: theme.textSecondary }}>{marker}</Text>
          {renderInline(item.tokens, theme, scale)}
        </Text>
      </View>
    );
  });
  return <View key={key} style={styles.listWrap}>{items}</View>;
}

function renderTable(token: Tokens.Table, key: string, theme: Theme, scale: number): ReactNode {
  const header = token.header.map((cell, i) => (
    <View key={`th-${i}`} style={[styles.tableCell, { borderColor: theme.border }]}>
      <Text style={{ color: theme.heading, fontSize: fs(14, scale), fontWeight: '600' as const }}>
        {renderInline(cell.tokens, theme, scale)}
      </Text>
    </View>
  ));
  const rows = token.rows.map((row, ri) => (
    <View
      key={`tr-${ri}`}
      style={[styles.tableRow, { borderColor: theme.border, backgroundColor: ri % 2 ? theme.tableRowAltBg : 'transparent' }]}
    >
      {row.map((cell, ci) => (
        <View key={`td-${ri}-${ci}`} style={[styles.tableCell, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: fs(13, scale) }}>
            {renderInline(cell.tokens, theme, scale)}
          </Text>
        </View>
      ))}
    </View>
  ));
  return (
    <ScrollView key={key} horizontal showsHorizontalScrollIndicator={false} style={[styles.table, { borderColor: theme.border }]}>
      <View>
        <View style={[styles.tableRow, { backgroundColor: theme.tableHeaderBg, borderColor: theme.border }]}>
          {header}
        </View>
        {rows}
      </View>
    </ScrollView>
  );
}

function renderBlockquote(
  token: Tokens.Blockquote,
  key: string,
  theme: Theme,
  scale: number,
): ReactNode {
  const inner = renderBlocks(token.tokens, theme, scale);
  return (
    <View key={key} style={[styles.blockquote, { backgroundColor: theme.quoteBackground, borderLeftColor: theme.quoteBorder }]}>
      {inner}
    </View>
  );
}

// ===== 行内渲染 =====

function renderInline(tokens: Token[] | undefined, theme: Theme, scale: number): ReactNode {
  if (!tokens) return null;
  return tokens.map((token, i) => renderInlineToken(token, `inl-${i}`, theme, scale));
}

function renderInlineToken(token: Token, key: string, theme: Theme, scale: number): ReactNode {
  switch (token.type) {
    case 'text': {
      const tt = token as Tokens.Text;
      return <Text key={key} style={{ color: theme.text, fontSize: fs(BASE_FONT_SIZE, scale) }}>{tt.tokens ? renderInline(tt.tokens, theme, scale) : tt.text}</Text>;
    }
    case 'strong':
      return <Text key={key} style={{ color: theme.heading, fontWeight: '700' as const, fontSize: fs(BASE_FONT_SIZE, scale) }}>{renderInline((token as Tokens.Strong).tokens, theme, scale)}</Text>;
    case 'em':
      return <Text key={key} style={{ color: theme.text, fontStyle: 'italic' as const, fontSize: fs(BASE_FONT_SIZE, scale) }}>{renderInline((token as Tokens.Em).tokens, theme, scale)}</Text>;
    case 'del':
      return <Text key={key} style={{ color: theme.textSecondary, textDecorationLine: 'line-through' as const, fontSize: fs(BASE_FONT_SIZE, scale) }}>{renderInline((token as Tokens.Del).tokens, theme, scale)}</Text>;
    case 'codespan':
      return <Text key={key} style={{ color: theme.codeText, backgroundColor: theme.codeBackground, fontSize: fs(13, scale), fontFamily: 'monospace' }}>{(token as Tokens.Codespan).text}</Text>;
    case 'link':
      return renderLink(token as Tokens.Link, key, theme, scale);
    case 'image':
      return <ImageBlock key={key} token={token as Tokens.Image} />;
    case 'br':
      return <Text key={key}>{'\n'}</Text>;
    case 'escape':
      return <Text key={key} style={{ color: theme.text, fontSize: fs(BASE_FONT_SIZE, scale) }}>{(token as Tokens.Escape).text}</Text>;
    default:
      return null;
  }
}

function renderLink(token: Tokens.Link, key: string, theme: Theme, scale: number): ReactNode {
  const href = token.href;
  return (
    <Text
      key={key}
      onPress={() => Linking.openURL(href)}
      style={{ color: theme.link, fontSize: fs(BASE_FONT_SIZE, scale), textDecorationLine: 'underline' as const }}
    >
      {renderInline(token.tokens, theme, scale)}
    </Text>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    marginVertical: 6,
  },
  headingWrap: {},
  listWrap: {
    marginVertical: 6,
  },
  listItem: {
    marginVertical: 2,
  },
  codeBlock: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderRadius: 4,
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    padding: 8,
    borderRightWidth: 1,
    minWidth: 100,
  },
  blockquote: {
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 8,
    borderRadius: 2,
  },
  hr: {
    borderBottomWidth: 1,
    marginVertical: 12,
  },
});
