/**
 * 桌面转换工具 mockup —— 纯 CSS/SVG 画，模拟墨览桌面端 ConvertPanel。
 */
export default function DesktopMockup() {
  return (
    <div className="w-full rounded-xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      {/* 标题栏 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>墨览 · 桌面版</span>
      </div>

      {/* tab */}
      <div className="flex px-3 text-[10px] border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span className="px-2 py-1.5 border-b-2" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>转换</span>
        <span className="px-2 py-1.5" style={{ color: 'var(--color-text-secondary)' }}>阅读</span>
        <span className="px-2 py-1.5" style={{ color: 'var(--color-text-secondary)' }}>快贴</span>
      </div>

      {/* 拖拽区 */}
      <div className="m-3 p-4 rounded-lg border-2 border-dashed text-center" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-[10px] font-medium">拖入 Office 文件</div>
        <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Word · PDF · PPT · Excel</div>
      </div>

      {/* 任务列表 */}
      <div className="px-3 pb-3 space-y-1.5">
        {[
          { name: '季度报告.docx', status: '成功', color: 'var(--color-success)', bg: '#e6f4ea' },
          { name: '产品方案.pdf', status: '转换中', color: '#b06000', bg: '#fef7e0' },
          { name: '数据分析.xlsx', status: '排队', color: '#5f6368', bg: '#e8eaed' },
        ].map((t) => (
          <div key={t.name} className="flex items-center justify-between px-2 py-1.5 rounded-md text-[9px]" style={{ background: 'var(--color-bg)' }}>
            <span className="font-mono">{t.name}</span>
            <span className="px-1.5 py-0.5 rounded-full" style={{ background: t.bg, color: t.color }}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
