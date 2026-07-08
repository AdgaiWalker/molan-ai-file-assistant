import { describe, it, expect } from 'vitest';
import {
  inferKind,
  isBatchDone,
  summarize,
  buildJobs,
  mergeJobs,
  setJobStatus,
  resetFailed,
  type BatchJobInput,
} from '../storage/batchJobs';

describe('inferKind', () => {
  it('json 扩展名识别', () => {
    expect(inferKind('a.json')).toBe('json');
    expect(inferKind('CONFIG.JSON')).toBe('json');
  });
  it('其余按 markdown', () => {
    expect(inferKind('readme.md')).toBe('markdown');
    expect(inferKind('notes.txt')).toBe('markdown');
  });
});

describe('buildJobs 去重', () => {
  it('同名同内容只保留一个', () => {
    const inputs: BatchJobInput[] = [
      { name: 'a.md', content: 'x', kind: 'markdown' },
      { name: 'a.md', content: 'x', kind: 'markdown' },
    ];
    expect(buildJobs(inputs)).toHaveLength(1);
  });
  it('同名不同内容都保留', () => {
    const inputs: BatchJobInput[] = [
      { name: 'a.md', content: 'x', kind: 'markdown' },
      { name: 'a.md', content: 'y', kind: 'markdown' },
    ];
    expect(buildJobs(inputs)).toHaveLength(2);
  });
  it('初始状态全 pending，id 唯一', () => {
    const jobs = buildJobs([
      { name: 'a.md', content: 'x', kind: 'markdown' },
      { name: 'b.md', content: 'y', kind: 'markdown' },
    ]);
    expect(jobs.every((j) => j.status === 'pending')).toBe(true);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(2);
  });
});

describe('mergeJobs', () => {
  it('已存在的不重复加', () => {
    const existing = buildJobs([{ name: 'a.md', content: 'x', kind: 'markdown' }]);
    const merged = mergeJobs(existing, [
      { name: 'a.md', content: 'x', kind: 'markdown' },
      { name: 'b.md', content: 'y', kind: 'markdown' },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.map((j) => j.name).sort()).toEqual(['a.md', 'b.md']);
  });
});

describe('isBatchDone / summarize', () => {
  it('空数组未完成', () => {
    expect(isBatchDone([])).toBe(false);
  });
  it('全成功才算完成（有失败不算）', () => {
    const jobs = buildJobs([{ name: 'a.md', content: 'x', kind: 'markdown' }]);
    expect(isBatchDone(jobs)).toBe(false);
    const running = setJobStatus(jobs, jobs[0].id, 'running');
    expect(isBatchDone(running)).toBe(false);
    const ok = setJobStatus(running, running[0].id, 'success');
    expect(isBatchDone(ok)).toBe(true);
  });
  it('summarize 计数', () => {
    const jobs = buildJobs([
      { name: 'a.md', content: 'x', kind: 'markdown' },
      { name: 'b.md', content: 'y', kind: 'markdown' },
      { name: 'c.md', content: 'z', kind: 'markdown' },
    ]);
    let s = summarize(jobs);
    expect(s).toEqual({ total: 3, success: 0, failed: 0, pending: 3 });
    s = summarize(setJobStatus(jobs, jobs[0].id, 'success'));
    expect(s.success).toBe(1);
    s = summarize(setJobStatus(jobs, jobs[1].id, 'failed', { error: 'boom' }));
    expect(s.failed).toBe(1);
    expect(s.pending).toBe(2);
  });
});

describe('resetFailed', () => {
  it('只回退 failed，不动 success/pending', () => {
    let jobs = buildJobs([{ name: 'a.md', content: 'x', kind: 'markdown' }]);
    jobs = setJobStatus(jobs, jobs[0].id, 'failed', { error: 'e' });
    jobs = [...jobs, ...buildJobs([{ name: 'b.md', content: 'y', kind: 'markdown' }])];
    jobs = setJobStatus(jobs, jobs[1].id, 'success');
    const reset = resetFailed(jobs);
    expect(reset.find((j) => j.name === 'a.md')?.status).toBe('pending');
    expect(reset.find((j) => j.name === 'a.md')?.error).toBeUndefined();
    expect(reset.find((j) => j.name === 'b.md')?.status).toBe('success');
  });
});
