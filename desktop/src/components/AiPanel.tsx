import React, { useState } from 'react';
import type { AiRunResult } from '../shared/ipc';

export default function AiPanel() {
  const [command, setCommand] = useState('qoder');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!command.trim()) return;
    setRunning(true);
    setOutput('$ ' + command + ' ' + prompt + '\n\n');
    const result: AiRunResult = await window.api.runAi(command.trim(), prompt.trim() ? [prompt.trim()] : []);
    const text =
      (result.stdout ? result.stdout + '\n' : '') +
      (result.stderr ? '[stderr]\n' + result.stderr + '\n' : '') +
      (result.exitCode !== null ? `\n[退出码 ${result.exitCode}]` : '');
    setOutput((prev) => prev + text);
    setRunning(false);
  };

  return (
    <div className="ai-panel">
      <h2>AI 命令行调用</h2>
      <p className="ai-hint">
        在下方输入 AI 命令行工具（如 qoder、claude 等）和提示词，点击运行。
        应用会调用对应 CLI 并显示输出。
      </p>
      <div className="ai-input-row">
        <input
          placeholder="命令（如 qoder）"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={running}
        />
        <button className="btn-primary" onClick={run} disabled={running || !command.trim()}>
          {running ? '运行中…' : '运行'}
        </button>
      </div>
      <textarea
        placeholder="提示词（prompt）"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        disabled={running}
      />
      <div className="ai-output">{output || '输出将显示在此处'}</div>
    </div>
  );
}
