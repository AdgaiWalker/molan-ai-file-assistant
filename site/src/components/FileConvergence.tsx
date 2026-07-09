import { useRef, useEffect } from 'react';
import { FILE_SOURCES, BRAND } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import { gsap } from '@/lib/gsap';
import BlurText from './reactbits/BlurText';

/**
 * 文件汇聚叙事（区块2）—— 页面核心动效区 ⭐
 *
 * 滚动驱动 timeline：
 *   阶段 A (0-0.5)：4 个来源文件从左侧错落飞向中心墨览
 *   阶段 B (0.5-1.0)：墨览"吸收"后，向右侧 AI 发射 Markdown/JSON 文件
 *
 * 用 GSAP ScrollTrigger pin 钉住舞台，scrub 同步滚动进度。
 */
export default function FileConvergence() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const stage = stageRef.current;
    const section = sectionRef.current;
    // 移动端不启用滚动 timeline（改为静态三段展示），避免 pin 在窄屏拥挤
    if (!stage || !section || reduce || !isDesktop) return;

    const ctx = gsap.context(() => {
      const sources = stage!.querySelectorAll('[data-source]');
      const emits = stage!.querySelectorAll('[data-emit]');
      const corePulse = stage!.querySelector('[data-core-pulse]');
      const aiTarget = stage!.querySelector('[data-ai-target]');

      // 初始：来源在左、emit 文件藏在中心、AI 暗淡
      gsap.set(sources, { x: -40, opacity: 0, scale: 0.8 });
      gsap.set(emits, { x: 0, opacity: 0, scale: 0.4 });
      gsap.set(aiTarget, { opacity: 0.4, scale: 0.9 });
      gsap.set(corePulse, { boxShadow: '0 0 0px rgba(26,115,232,0)' });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=120%',
          pin: stage,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // 阶段 A：来源飞向中心
      tl.to(sources, {
        x: 0,
        opacity: 1,
        scale: 1,
        duration: 1,
        stagger: 0.15,
        ease: 'back.out(1.4)',
      })
        // 来源被吸收（向中心收缩淡出）
        .to(sources, {
          x: 280,
          opacity: 0,
          scale: 0.3,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.in',
        }, '+=0.2')
        // 中心墨览脉冲（吸收瞬间能量）
        .to(corePulse, {
          boxShadow: '0 0 80px rgba(26,115,232,0.7)',
          scale: 1.08,
          duration: 0.4,
          ease: 'power2.out',
        }, '<')
        .to(corePulse, {
          boxShadow: '0 0 30px rgba(26,115,232,0.35)',
          scale: 1,
          duration: 0.5,
          ease: 'power2.out',
        })
        // 阶段 B：emit 文件从中心飞向 AI
        .to(emits, {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          stagger: 0.1,
          ease: 'power2.out',
        })
        .to(emits, {
          x: 280,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power1.in',
        })
        .to(emits, {
          opacity: 0,
          scale: 0.5,
          duration: 0.3,
          stagger: 0.1,
        }, '<')
        // AI 收到，亮起
        .to(aiTarget, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.6)',
        }, '<0.2');
    }, section);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="convergence"
      className="relative"
      style={{ background: 'var(--color-bg)', position: 'relative' }}
    >
      {/* pin 舞台：桌面 100vh；移动端自然高度，垂直堆叠 */}
      <div ref={stageRef} className="h-auto md:h-screen flex flex-col items-center justify-center relative overflow-hidden py-20 md:py-0">
        <div className="text-center mb-10 px-6">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
            核心理念
          </p>
          <BlurText
            text="AI 不该读不到你散落在各处的文件"
            animateBy="chars"
            delay={0.02}
            stepDuration={0.4}
            className="font-bold tracking-tight inline-flex justify-center text-center"
            style={{ fontSize: FONT_SIZE.h2Sm }}
          />
        </div>

        {/* 叙事舞台：移动端 flex 垂直流，桌面端绝对定位 */}
        <div className="relative w-full max-w-4xl px-6 flex flex-col md:block gap-6 md:gap-0 items-center" style={{ height: 'auto' }}>
          <div className="md:hidden w-full text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            ↓ 你的文件从各处汇聚
          </div>
          {/* 左侧：散落来源（移动端：上方水平排列） */}
          <div className="static md:absolute md:left-6 md:top-1/2 md:-translate-y-1/2 flex flex-row md:flex-col gap-3 z-20 flex-wrap justify-center">
            {FILE_SOURCES.map((src) => (
              <div
                key={src.id}
                data-source={src.id}
                className="flex items-center gap-2.5 bg-white border rounded-card px-3.5 py-2.5 shadow-md"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: src.color }} />
                <div className="text-left">
                  <div className="text-xs font-semibold">{src.label}</div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    {src.file}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 中心：墨览 logo（移动端自然流，桌面端绝对居中） */}
          <div className="static md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-30 my-2">
            <div
              data-core-pulse
              className="w-24 h-24 rounded-mockup flex flex-col items-center justify-center text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <img src="/logo.png" width={44} height={44} alt={BRAND.name} style={{ objectFit: 'contain' }} draggable={false} />
              <span className="text-[11px] mt-1.5">{BRAND.name}</span>
            </div>
          </div>

          {/* emit 文件：移动端隐藏（无 pin 动画），桌面端从中心飞向 AI */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-y-1/2 z-20 flex-col gap-2" style={{ transform: 'translateX(-50%)' }}>
            {[
              { label: 'README.md', color: 'var(--color-primary)' },
              { label: 'report.json', color: 'var(--color-success)' },
            ].map((f, i) => (
              <div
                key={i}
                data-emit={i}
                className="bg-white border rounded-tag px-3 py-1.5 shadow-lg font-mono text-[10px]"
                style={{ borderColor: 'var(--color-border)', color: f.color }}
              >
                {f.label}
              </div>
            ))}
          </div>

          {/* 右侧：AI 出口（移动端自然流） */}
          <div className="md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2 z-20">
            <div
              data-ai-target
              className="flex items-center gap-2.5 bg-white border rounded-card px-4 py-3 shadow-md"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse-glow" />
              <div className="text-left">
                <div className="text-xs font-semibold">AI / Agent</div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  Markdown · JSON
                </div>
              </div>
            </div>
          </div>

          {/* 流向轨道（虚线，仅桌面端） */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none" aria-hidden style={{ zIndex: 5 }}>
            <line x1="20%" y1="50%" x2="42%" y2="50%" stroke="rgba(26,115,232,0.15)" strokeWidth="1.5" strokeDasharray="3 5" />
            <line x1="58%" y1="50%" x2="80%" y2="50%" stroke="rgba(26,115,232,0.15)" strokeWidth="1.5" strokeDasharray="3 5" />
          </svg>
        </div>

        {/* 阶段提示（仅桌面端 pin 时显示） */}
        <div className="hidden md:block absolute bottom-10 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span data-phase-hint>继续滚动 · 看文件如何汇聚到 AI</span>
        </div>
      </div>
    </section>
  );
}
