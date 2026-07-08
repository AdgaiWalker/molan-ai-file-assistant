import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HERO, BRAND } from '@/lib/constants';
import { gsap } from '@/lib/gsap';
import Aurora from './reactbits/Aurora';
import BlurText from './reactbits/BlurText';
import { useTilt } from '@/hooks/useTilt';
import { useSpotlight } from '@/hooks/useSpotlight';
import { Logo } from './Logo';

/**
 * Hero（区块1）—— v5 antfu 风格。
 *
 * 设计参考 antfu.me：一段话搞定，无标题/副标题/eyebrow 分层。
 *   - 文字区：左对齐段落 + 一个文字链接 CTA（不要大按钮）
 *   - 强调片段："AI 能读" 用品牌蓝
 *   - 背景：Aurora 极光
 *   - 下半：阅读器 mockup 窗口（保留产品预览）
 */
export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const tiltRef = useTilt<HTMLDivElement>(4);
  const spotlightRef = useSpotlight<HTMLDivElement>();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-hero-fade]', {
        y: 16,
        opacity: 0,
        duration: 0.7,
        stagger: 0.18,
        ease: 'power3.out',
        delay: 0.4,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20 pb-16"
      style={{ background: 'var(--color-bg-dark)' }}
    >
      <Aurora amplitude={0.85} blend={0.6} speed={0.7} />
      {/* 顶部渐隐（让 Nav 干净） */}
      <div
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, var(--color-bg-dark), transparent)' }}
      />

      <div className="container-wide relative z-10 w-full max-w-3xl mx-auto px-6">
        {/* Logo（小，左上对齐段落流） */}
        <div data-hero-fade className="flex items-center gap-2 mb-10 text-white/80">
          <Logo size={22} />
          <span className="font-semibold text-base">{BRAND.name}</span>
        </div>

        {/* 主段落 —— 整句 blur 入场（中文不拆字，避免逐字换行） */}
        <BlurText
          text={HERO.lead}
          animateBy="words"
          delay={0}
          stepDuration={0.6}
          className="text-white font-medium tracking-tight"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            lineHeight: 1.3,
            maxWidth: '22ch',
          }}
        />

        {/* CTA —— 文字链接，不要大按钮（antfu 风） */}
        <div data-hero-fade className="mt-10 flex items-center gap-6 text-sm font-mono">
          <a
            href="#early-access"
            className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors group"
          >
            <span className="border-b border-white/30 group-hover:border-white/70 transition-colors pb-0.5">
              {HERO.ctaPrimary}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href={BRAND.github}
            target="_blank"
            rel="noreferrer"
            className="text-white/45 hover:text-white/80 transition-colors"
          >
            {HERO.ctaSecondary}
          </a>
        </div>

        {/* 阅读器 mockup */}
        <div data-hero-fade className="mt-14">
          <div
            ref={spotlightRef}
            className="relative rounded-mockup overflow-hidden border border-white/10"
            style={{
              background: 'rgba(18, 24, 38, 0.55)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(26,115,232,0.12)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  'radial-gradient(circle 220px at var(--mx, 50%) var(--my, 50%), rgba(26,115,232,0.10), transparent 70%)',
              }}
            />
            <div ref={tiltRef} style={{ transition: 'transform 0.2s ease-out', transformStyle: 'preserve-3d' }}>
              <ReaderWindow />
            </div>
          </div>
        </div>
      </div>

      {/* 滚动提示 */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/25 flex flex-col items-center gap-2"
        style={{ fontSize: '0.7rem' }}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
          <path d="M7 1v16m0 0-5-5m5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </motion.div>
    </section>
  );
}

/**
 * 阅读器窗口内容 —— 模拟墨览打开一份微信收到的 .md 文件。
 */
function ReaderWindow() {
  return (
    <div className="flex" style={{ minHeight: '280px' }}>
      <aside
        className="hidden sm:flex flex-col gap-1.5 p-3.5 border-r border-white/5 w-40 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.2)' }}
      >
        <div className="text-[10px] font-mono text-white/35 mb-1.5">最近文档</div>
        {[
          { name: '会议纪要.md', from: '微信', active: true },
          { name: 'api-response.json', from: 'QQ' },
          { name: 'README.md', from: 'GitHub' },
        ].map((f) => (
          <div
            key={f.name}
            className="px-2 py-1.5 rounded-tag"
            style={{
              background: f.active ? 'rgba(26,115,232,0.16)' : 'transparent',
              borderLeft: f.active ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            <div className="text-[11px] text-white/85 truncate">{f.name}</div>
            <div className="text-[9px] text-white/35 font-mono mt-0.5">{f.from}</div>
          </div>
        ))}
      </aside>

      <main className="flex-1 p-5 text-left overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Logo size={16} />
            <div>
              <div className="text-[11px] text-white/85 font-medium">会议纪要.md</div>
              <div className="text-[9px] text-white/35 font-mono">微信 · 2 分钟前</div>
            </div>
          </div>
          <div className="flex gap-1">
            {['复制', '编辑', '分享'].map((a) => (
              <span
                key={a}
                className="text-[10px] text-white/45 px-1.5 py-0.5 rounded-tag"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-bold text-white">项目周会 · 2026 W27</div>
          <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="text-[11px] font-semibold text-white/65">进展</div>
          <div className="text-[11px] text-white/50 leading-relaxed">
            手机端 .md 阅读闭环完成，微信打开链路已通。
          </div>
          <div className="text-[11px] font-semibold text-white/65 mt-1.5">待办</div>
          {['Office → Markdown 转换', '云存储汇聚'].map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
              <span className="w-2.5 h-2.5 rounded-sm border" style={{ borderColor: 'var(--color-primary)' }} />
              {t}
            </div>
          ))}
          <div
            className="mt-2 rounded-tag px-2.5 py-1.5 font-mono text-[10px]"
            style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)' }}
          >
            <span style={{ color: 'var(--color-primary)' }}>molan</span> convert 季度报告.docx --json
          </div>
        </div>
      </main>
    </div>
  );
}
