import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const cli = path.resolve(__dirname, '../dist/index.js');

describe('molan check', () => {
  it('PATH 中没有 pandoc 时返回稳定失败结果', () => {
    const emptyPath = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-no-pandoc-'));
    const isolatedDist = path.join(emptyPath, 'dist');
    fs.mkdirSync(isolatedDist);
    const isolatedCli = path.join(isolatedDist, 'index.js');
    fs.copyFileSync(cli, isolatedCli);
    const result = spawnSync(process.execPath, [isolatedCli, 'check'], {
      cwd: isolatedDist,
      env: {
        ...process.env,
        PATH: emptyPath,
        PANDOC_PATH: '',
        NODE_PATH: path.resolve(__dirname, '../node_modules'),
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({
      ok: false,
      pandocPath: 'pandoc',
      supportedFormats: ['docx', 'pdf', 'pptx', 'xlsx', 'csv', 'md', 'json'],
    }));
  });
});
