import { useState } from 'react';
import { BRAND, FAQS, FOOTER_LINKS } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import { LogoLockup } from './Logo';
import BlurText from './reactbits/BlurText';

/**
 * Footer + FAQ（区块8）—— C1 骨架版。
 * FAQ 用原生 details/summary 折叠，无 JS 依赖。
 */
export default function Footer() {
  return (
    <>
      <section className="py-24" style={{ background: 'var(--color-surface)' }}>
        <div className="container-wide max-w-3xl">
          <BlurText
            text="常见问题"
            animateBy="chars"
            delay={0.05}
            stepDuration={0.4}
            className="font-bold tracking-tight mb-10 inline-flex justify-center w-full"
            style={{ fontSize: FONT_SIZE.h2Sm }}
          />
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {FAQS.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12" style={{ background: 'var(--color-bg-dark)', color: '#fff' }}>
        <div className="container-wide">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <LogoLockup size={28} variant="light" showTagline className="mb-4" />
              <p className="text-sm text-white/50 leading-relaxed">{BRAND.description}</p>
            </div>

            <FooterCol title="产品" links={FOOTER_LINKS.product} />
            <FooterCol title="资源" links={FOOTER_LINKS.resource} />
            <FooterCol title="法律" links={FOOTER_LINKS.legal} />
          </div>

          <div
            className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 text-xs text-white/40"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span>© {new Date().getFullYear()} {BRAND.name}. 开源项目。</span>
            <span className="font-mono">v0.1 · {BRAND.slug}</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        className="flex items-center justify-between w-full text-left font-medium"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="flex-shrink-0 ml-4 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--color-text-secondary)' }}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '200px' : '0' }}
      >
        <p className="text-sm leading-relaxed pt-3" style={{ color: 'var(--color-text-secondary)' }}>
          {a}
        </p>
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 text-white/80">{title}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
