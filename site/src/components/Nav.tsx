import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/constants';
import { LogoLockup } from './Logo';

/**
 * 顶部导航 —— 固定顶部，滚动时背景加深；常驻「下载」CTA。
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'glass-dark border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <nav className="container-wide flex items-center justify-between h-14">
        <a href="#top" aria-label={BRAND.name}>
          <LogoLockup size={26} variant="light" />
        </a>

        <div className="hidden md:flex items-center gap-7 text-sm text-white/70">
          <a href="#platforms" className="hover:text-white transition-colors">三端</a>
          <a href="#flow" className="hover:text-white transition-colors">流程</a>
          <a href="#features" className="hover:text-white transition-colors">能力</a>
          <a href="#status" className="hover:text-white transition-colors">状态</a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={BRAND.github}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors"
          >
            GitHub
          </a>
          {/* 常驻预约 CTA */}
          <a
            href="#early-access"
            className="inline-flex items-center gap-1.5 rounded-btn px-3.5 py-1.5 text-sm font-medium text-white transition-transform hover:scale-105"
            style={{ background: 'var(--color-primary)' }}
          >
            加入候补
          </a>
        </div>
      </nav>
    </header>
  );
}
