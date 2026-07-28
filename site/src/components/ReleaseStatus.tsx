import { DOC_LINKS, RELEASE_CHANNELS } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import BlurText from './reactbits/BlurText';

export default function ReleaseStatus() {
  const privacyLinkProps = /^https?:\/\//.test(DOC_LINKS.privacy) ? { target: '_blank', rel: 'noreferrer' as const } : {};
  return (
    <section id="status" className="py-24" style={{ background: 'var(--color-surface)' }}>
      <div className="container-wide">
        <div className="max-w-3xl mb-10">
          <BlurText
            text="当前下载与发布状态"
            animateBy="chars"
            delay={0.04}
            stepDuration={0.4}
            className="font-bold tracking-tight inline-flex"
            style={{ fontSize: FONT_SIZE.h2Sm }}
          />
          <p className="mt-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            这里不放假按钮。已经能拿到的入口直接给真链接；还没完成真机、商店或签名验收的平台，明确标“准备中”。
          </p>
        </div>

        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {RELEASE_CHANNELS.map((item) => (
            <article
              key={item.id}
              className="rounded-card border p-5"
              style={{
                borderColor: 'var(--color-border)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <h3 className="font-semibold">{item.name}</h3>
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    color: item.status === 'available' ? '#34d399' : '#fbbf24',
                    background: item.status === 'available' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                  }}
                >
                  {item.status === 'available' ? '可用' : '准备中'}
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {item.detail}
              </p>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-90"
                style={{ color: 'var(--color-primary)' }}
              >
                {item.cta}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </article>
          ))}
        </div>

        <div
          className="mt-8 rounded-card border p-5 text-sm leading-relaxed"
          style={{ borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}
        >
          当前用户最需要的三份说明都已公开：
          {' '}
          <a href={DOC_LINKS.privacy} style={{ color: 'var(--color-primary)' }} {...privacyLinkProps}>隐私说明</a>
          {' · '}
          <a href={DOC_LINKS.todo} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>开发进度</a>
          {' · '}
          <a href={DOC_LINKS.evidence} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Office / PDF 固定样例</a>
        </div>
      </div>
    </section>
  );
}
