import { motion } from 'framer-motion';

/**
 * 手机阅读器 mockup —— 纯 CSS/SVG 画，模拟墨览 Reader 界面。
 * C2 版：静态展示，带轻微浮动动画。后续可换真截图。
 */
export default function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ maxWidth: '320px' }}>
      {/* 光晕背景 */}
      <div
        className="absolute inset-0 -z-10 blur-3xl"
        style={{ background: 'var(--color-glow)', transform: 'scale(1.2)' }}
      />
      {/* 手机外框 */}
      <motion.div
        className="aspect-[9/19] rounded-[2.5rem] border border-white/15 p-2.5 glass-dark"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-full h-full rounded-[2rem] overflow-hidden flex flex-col" style={{ background: 'var(--color-surface)' }}>
          {/* 状态栏 */}
          <div className="flex justify-between items-center px-5 py-2 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2 rounded-sm border border-current opacity-60" />
              <span className="w-4 h-2 rounded-sm border border-current opacity-60" />
            </div>
          </div>

          {/* 文件标题栏 */}
          <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>微信 · Markdown</div>
              <div className="text-xs font-semibold">会议纪要.md</div>
            </div>
            <div className="flex gap-1.5">
              <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--color-code-bg)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="11" height="11" rx="2" stroke="var(--color-text-secondary)" strokeWidth="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="var(--color-text-secondary)" strokeWidth="2" />
                </svg>
              </span>
              <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>

          {/* 阅读内容（模拟 Markdown 渲染） */}
          <div className="flex-1 px-5 py-4 overflow-hidden text-left space-y-2.5" style={{ color: 'var(--color-text)' }}>
            <div className="text-[13px] font-bold">项目周会 · 2026 W27</div>
            <div className="h-px my-2" style={{ background: 'var(--color-border)' }} />
            <div className="text-[10px] font-semibold opacity-70">一、进展</div>
            <div className="text-[10px] leading-relaxed opacity-80">
              手机端 .md 阅读闭环完成，正在打磨微信打开链路。
            </div>
            <div className="text-[10px] font-semibold opacity-70 mt-2">二、待办</div>
            <div className="space-y-1">
              {['CLI 真实样例验收', 'Windows installer 打包', '官网下载页上线'].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] opacity-80">
                  <span className="w-2.5 h-2.5 rounded-sm border" style={{ borderColor: 'var(--color-primary)' }} />
                  {t}
                </div>
              ))}
            </div>
            {/* 代码块 */}
            <div className="mt-2 rounded-md p-2 font-mono text-[9px] leading-snug" style={{ background: 'var(--color-code-bg)', color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-primary)' }}>molan</span> convert report.docx --json
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="px-5 py-2.5 border-t flex justify-around" style={{ borderColor: 'var(--color-border)' }}>
            {['复制', '编辑', '转换', '分享'].map((a) => (
              <span key={a} className="text-[9px]" style={{ color: 'var(--color-text-secondary)' }}>{a}</span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
