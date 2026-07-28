import { BRAND, DOC_LINKS, PUBLIC_DOC_PAGES } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import { LogoLockup } from './Logo';

type PublicDocRoute = keyof typeof PUBLIC_DOC_PAGES;

const DOC_NAV: { id: PublicDocRoute; label: string }[] = [
  { id: 'privacy', label: '隐私说明' },
  { id: 'terms', label: '服务条款' },
  { id: 'deletion', label: '删除与注销' },
  { id: 'support', label: '支持与反馈' },
];

function externalLinkProps(href: string) {
  return /^https?:\/\//.test(href) ? { target: '_blank', rel: 'noreferrer' as const } : {};
}

export default function PublicDocPage({ routeId }: { routeId: PublicDocRoute }) {
  const page = PUBLIC_DOC_PAGES[routeId];

  return (
    <main style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', color: '#fff' }}>
      <header className="border-b border-white/10">
        <div className="container-wide h-16 flex items-center justify-between gap-4">
          <a href="#" aria-label={`${BRAND.name} 首页`}>
            <LogoLockup size={26} variant="light" />
          </a>

          <nav className="hidden md:flex items-center gap-5 text-sm text-white/65">
            {DOC_NAV.map((item) => (
              <a
                key={item.id}
                href={`#/${item.id}`}
                aria-current={item.id === routeId ? 'page' : undefined}
                className={item.id === routeId ? 'text-white' : 'hover:text-white transition-colors'}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a href="#" className="text-sm text-white/75 hover:text-white transition-colors">
            返回首页
          </a>
        </div>
      </header>

      <section className="py-20">
        <div className="container-wide max-w-4xl">
          <span
            className="inline-flex rounded-full px-3 py-1 text-xs font-medium mb-6"
            style={{ background: 'rgba(26,115,232,0.14)', color: '#8ab4ff' }}
          >
            {page.badge}
          </span>

          <h1 className="font-bold tracking-tight mb-5" style={{ fontSize: FONT_SIZE.h2 }}>
            {page.title}
          </h1>

          <p className="text-base leading-8 max-w-3xl" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {page.intro}
          </p>

          <div
            className="mt-8 rounded-card border p-5"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="text-sm font-semibold mb-3">快速摘要</div>
            <ul className="space-y-2 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {page.summary.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-10 space-y-6">
            {page.sections.map((section) => (
              <section
                key={section.heading}
                className="rounded-card border p-6"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
              >
                <h2 className="text-lg font-semibold mb-4">{section.heading}</h2>
                <ul className="space-y-2 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.72)' }}>
                  {section.bullets.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div
            className="mt-10 rounded-card border p-6 text-sm leading-7"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
          >
            当前页面是官网公开草案；仓库里仍同步保留可审计的原始文档与进度记录：
            {' '}
            <a href={DOC_LINKS.todo} style={{ color: '#8ab4ff' }} {...externalLinkProps(DOC_LINKS.todo)}>
              查看开发进度
            </a>
            {' · '}
            <a href={DOC_LINKS.repo} style={{ color: '#8ab4ff' }} {...externalLinkProps(DOC_LINKS.repo)}>
              查看 GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
