import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('生成批次模板时保留已经执行的验收报告', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'molan-v2-report-'));
  const reportPath = path.join(root, 'gate-e.md');
  const completedReport = '# Gate E\n\n> 状态：已执行\n\n真实客户端证据已填写。\n';
  await writeFile(reportPath, completedReport, 'utf-8');

  try {
    const result = spawnSync(process.execPath, [
      'scripts/v2_validation_report.mjs',
      '--batch',
      'gate_e_ai_read',
      '--out',
      reportPath,
    ], {
      cwd: path.resolve(import.meta.dirname, '..'),
      encoding: 'utf-8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(reportPath, 'utf-8'), completedReport);
    assert.match(result.stdout, /已保留/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
