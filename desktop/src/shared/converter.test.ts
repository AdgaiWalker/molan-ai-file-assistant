import { describe, expect, it } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { convertBatch, ERROR_CODES } from './converter';

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
