// 批量转换任务状态机 —— 纯逻辑，无副作用。
// 任务状态：pending → running → success | failed；失败可重试（回 pending）。
// 这里的状态转移错了 UI 还能跑但结果列表会乱，故单测覆盖（见 batchJobs.test.ts）。

export type BatchJobStatus = 'pending' | 'running' | 'success' | 'failed';
export type BatchOutputFormat = 'md' | 'docx' | 'pdf';

export interface BatchJob {
  id: string;
  name: string;        // 文件名（含扩展名）
  content: string;     // 原始文本（md/json）
  kind: 'markdown' | 'json';
  status: BatchJobStatus;
  error?: string;      // 失败原因
  outputPath?: string; // 成功后的输出（blob URL / file URI）
  createdAt: number;
}

export interface BatchJobInput {
  name: string;
  content: string;
  kind: 'markdown' | 'json';
}

/** 从文件名推断文档类型。 */
export function inferKind(name: string): 'markdown' | 'json' {
  return name.toLowerCase().endsWith('.json') ? 'json' : 'markdown';
}

/** 判断整批是否全部结束（无论成功失败）。 */
export function isBatchDone(jobs: BatchJob[]): boolean {
  return jobs.length > 0 && jobs.every((j) => j.status === 'success' || j.status === 'failed');
}

/** 统计成功/失败数。 */
export function summarize(jobs: BatchJob[]): { total: number; success: number; failed: number; pending: number } {
  let success = 0, failed = 0, pending = 0;
  for (const j of jobs) {
    if (j.status === 'success') success++;
    else if (j.status === 'failed') failed++;
    else pending++;
  }
  return { total: jobs.length, success, failed, pending };
}

/** 把一批输入初始化为 pending 任务。去重：同名同内容不重复加。 */
export function buildJobs(inputs: BatchJobInput[]): BatchJob[] {
  const now = Date.now();
  const seen = new Set<string>();
  const jobs: BatchJob[] = [];
  let i = 0;
  for (const input of inputs) {
    const key = `${input.name}\u0000${input.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push({
      id: `b_${now.toString(36)}_${i.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      content: input.content,
      kind: input.kind,
      status: 'pending',
      createdAt: now + i,
    });
    i++;
  }
  return jobs;
}

/** 合并已有任务与新输入，避免重复（按 name+content）。已有的不改。 */
export function mergeJobs(existing: BatchJob[], inputs: BatchJobInput[]): BatchJob[] {
  const seen = new Set(existing.map((j) => `${j.name}\u0000${j.content}`));
  const fresh = inputs.filter((inp) => !seen.has(`${inp.name}\u0000${inp.content}`));
  return [...existing, ...buildJobs(fresh)];
}

/** 标记单个任务状态。返回新数组（不可变）。 */
export function setJobStatus(jobs: BatchJob[], id: string, status: BatchJobStatus, patch?: { error?: string; outputPath?: string }): BatchJob[] {
  return jobs.map((j) => (j.id === id ? { ...j, status, ...patch } : j));
}

/** 把失败的回退为 pending（供重试）。 */
export function resetFailed(jobs: BatchJob[]): BatchJob[] {
  return jobs.map((j) => (j.status === 'failed' ? { ...j, status: 'pending', error: undefined } : j));
}
