import { describe, expect, it } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { convertBatch, convertFile, ERROR_CODES, pandocPath } from './converter';

// 失败隔离契约测试:批量转换里单个失败不能污染整批
// 这是 CLI --json 输出给 AI 消费的契约,AI 会按 results[i].ok 逐项处理,
// 一个 reject 就会让整批崩,导致 AI 拿不到任何结果。

describe('convertBatch 失败隔离', () => {
  it('全部输入都不存在时,仍返回与输入等长的结果数组,每项 ok:false', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-batch-'));
    const inputs = [
      { inputPath: path.join(tmp, 'nope1.docx'), fileName: 'nope1.docx' },
      { inputPath: path.join(tmp, 'nope2.pdf'), fileName: 'nope2.pdf' },
      { inputPath: path.join(tmp, 'nope3.pptx'), fileName: 'nope3.pptx' },
    ];
    const results = await convertBatch(inputs, 'md', tmp, 4);
    expect(results).toHaveLength(inputs.length);
    expect(results.every((r) => r.ok === false)).toBe(true);
    expect(results.every((r) => r.errorCode === ERROR_CODES.INPUT_NOT_FOUND)).toBe(true);
    // 每项都映射回正确的输入文件名(顺序不乱)
    expect(results.map((r) => r.fileName)).toEqual(['nope1.docx', 'nope2.pdf', 'nope3.pptx']);
  });

  it('混合成功与失败:不存在的失败项不阻断存在的成功项', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-batch-'));
    // md -> json 走纯 JS 分支,不依赖 pandoc
    const good = path.join(tmp, 'good.md');
    fs.writeFileSync(good, '# Hello\n\nworld', 'utf-8');
    const inputs = [
      { inputPath: path.join(tmp, 'missing.docx'), fileName: 'missing.docx' },
      { inputPath: good, fileName: 'good.md' },
      { inputPath: path.join(tmp, 'missing2.pdf'), fileName: 'missing2.pdf' },
    ];
    const results = await convertBatch(inputs, 'json', tmp, 2);
    expect(results).toHaveLength(3);
    expect(results[0].ok).toBe(false);
    expect(results[1].ok).toBe(true);
    expect(results[2].ok).toBe(false);
    // 成功项真的写出了文件
    expect(results[1].outputPath && fs.existsSync(results[1].outputPath)).toBe(true);
  });

  it('concurrency 大于输入数时不报错(空池/小输入也能跑)', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-batch-'));
    const inputs = [{ inputPath: path.join(tmp, 'only.docx'), fileName: 'only.docx' }];
    const results = await convertBatch(inputs, 'md', tmp, 8);
    expect(results).toHaveLength(1);
  });

  it('空输入列表返回空数组,不抛错', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-batch-'));
    const results = await convertBatch([], 'md', tmp, 4);
    expect(results).toEqual([]);
  });
});

describe('pandocPath 路径解析', () => {
  it('优先使用显式的 PANDOC_PATH', () => {
    const resolved = pandocPath({
      env: { PANDOC_PATH: '/tmp/custom-pandoc' },
      existsSync: (target) => target === '/tmp/custom-pandoc',
      baseDir: '/repo/desktop/out/shared',
      resourcesPath: '/app/resources',
    });
    expect(resolved).toBe('/tmp/custom-pandoc');
  });

  it('打包后的应用优先使用 process.resourcesPath 下的 pandoc', () => {
    const resolved = pandocPath({
      env: {},
      resourcesPath: '/Applications/Molan.app/Contents/Resources',
      platform: 'darwin',
      existsSync: (target) => target === '/Applications/Molan.app/Contents/Resources/pandoc',
      baseDir: '/repo/desktop/out/shared',
    });
    expect(resolved).toBe('/Applications/Molan.app/Contents/Resources/pandoc');
  });

  it('开发环境会回退到 desktop/resources/pandoc.exe', () => {
    const resolved = pandocPath({
      env: {},
      resourcesPath: undefined,
      platform: 'win32',
      baseDir: '/repo/desktop/out/shared',
      existsSync: (target) => target === '/repo/desktop/resources/pandoc.exe',
    });
    expect(resolved).toBe('/repo/desktop/resources/pandoc.exe');
  });

  it('非 Windows 平台不会误选 pandoc.exe，而是回退到系统 pandoc', () => {
    const resolved = pandocPath({
      env: {},
      resourcesPath: '/Applications/Molan.app/Contents/Resources',
      platform: 'darwin',
      baseDir: '/repo/desktop/out/shared',
      existsSync: (target) => target === '/Applications/Molan.app/Contents/Resources/pandoc.exe',
    });
    expect(resolved).toBe('pandoc');
  });
});

describe('AI 可读 Markdown 转换', () => {
  const fixtures = path.join(__dirname, '../../cli/test-fixtures');

  it('从 PDF 提取正文，而不是把 PDF 交给 pandoc reader', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-pdf-'));
    const result = await convertFile(path.join(fixtures, 'sample.pdf'), 'md', tmp);

    expect(result.ok).toBe(true);
    expect(fs.readFileSync(result.outputPath!, 'utf-8')).toContain('Molan PDF Sample');
  });

  it('把 XLSX 工作表转换为 Markdown 表格', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-xlsx-'));
    const result = await convertFile(path.join(fixtures, 'sample.xlsx'), 'md', tmp);

    expect(result.ok).toBe(true);
    const markdown = fs.readFileSync(result.outputPath!, 'utf-8');
    expect(markdown).toContain('## summary');
    expect(markdown).toContain('| documents | 12 | ready |');
  });

  it('把普通 JSON 展开为可引用的 Markdown 字段', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-json-'));
    const result = await convertFile(path.join(fixtures, 'sample.json'), 'md', tmp);

    expect(result.ok).toBe(true);
    const markdown = fs.readFileSync(result.outputPath!, 'utf-8');
    expect(markdown).toContain('- **name**：');
  });

  it('无效 JSON 仍生成带错误说明和完整原文的 Markdown', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-invalid-json-'));
    const input = path.join(tmp, 'invalid.json');
    fs.writeFileSync(input, '{"broken":', 'utf-8');
    const result = await convertFile(input, 'md', tmp);

    expect(result.ok).toBe(true);
    const markdown = fs.readFileSync(result.outputPath!, 'utf-8');
    expect(markdown).toContain('JSON 解析失败，以下为原始内容');
    expect(markdown).toContain('{"broken":');
  });
});
