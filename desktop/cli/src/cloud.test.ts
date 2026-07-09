import { describe, expect, it } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const cli = path.resolve(__dirname, '../dist/index.js');

function run(args: string[], cwd: string, cloudDir: string) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd,
    env: { ...process.env, MOLAN_CLOUD_DIR: cloudDir },
    encoding: 'utf-8',
  });
}

describe('molan cloud commands', () => {
  it('pushes, pulls, and reads a document as AI-readable JSON', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-cli-'));
    const cloudDir = path.join(root, 'cloud');
    const file = path.join(root, 'sample.md');
    fs.writeFileSync(file, '# Hello\n\nAI readable content.', 'utf-8');

    const push = JSON.parse(run(['push', file, '--json'], root, cloudDir));
    expect(push.ok).toBe(true);
    expect(push.results[0].title).toBe('sample.md');

    const pull = JSON.parse(run(['pull', '--json'], root, cloudDir));
    expect(pull.ok).toBe(true);
    expect(pull.results[0].id).toBe(push.results[0].id);

    const read = JSON.parse(run(['read', push.results[0].id, '--json'], root, cloudDir));
    expect(read.ok).toBe(true);
    expect(read.results[0].content).toContain('AI readable content');
  });
});
