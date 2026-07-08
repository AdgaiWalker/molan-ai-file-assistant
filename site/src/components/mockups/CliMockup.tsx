/**
 * CLI mockup —— 模拟终端运行 molan convert 的输出。
 */
export default function CliMockup() {
  return (
    <div className="w-full rounded-xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--color-border)', background: '#0a0e1a' }}>
      {/* 终端标题栏 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-white/50">molan — zsh</span>
      </div>
      {/* 终端内容 */}
      <div className="p-3 font-mono text-[10px] leading-relaxed text-left">
        <div className="text-white/40">$ <span className="text-emerald-400">molan</span> convert 季度报告.docx --json</div>
        <div className="text-white/60 mt-1">→ reading 季度报告.docx</div>
        <div className="text-white/60">→ pandoc convert: docx → markdown</div>
        <div className="text-emerald-400 mt-1">✓ done · 季度报告.md (12.4 KB)</div>
        <div className="mt-2 text-cyan-300">{'{'}</div>
        <div className="text-cyan-300 pl-3">"ok": <span className="text-amber-300">true</span>,</div>
        <div className="text-cyan-300 pl-3">"output": <span className="text-emerald-300">"季度报告.md"</span>,</div>
        <div className="text-cyan-300 pl-3">"inputFormat": <span className="text-emerald-300">"docx"</span>,</div>
        <div className="text-cyan-300 pl-3">"duration": <span className="text-amber-300">842</span></div>
        <div className="text-cyan-300">{'}'}</div>
        <div className="text-white/40 mt-1">$ <span className="inline-block w-1.5 h-3 bg-white/60 animate-pulse-glow align-middle" /></div>
      </div>
    </div>
  );
}
