import { useRef, useEffect } from 'react';
import { FEATURES } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import { FeatureIcon } from './FeatureIcon';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useTilt } from '@/hooks/useTilt';
import { gsap } from '@/lib/gsap';
import BlurText from './reactbits/BlurText';

/**
 * 能力网格（区块5）—— C3 完整版。
 * 动效：① spotlight 光晕跟随鼠标（useSpotlight 注入 --mx/--my）
 *      ② 3D tilt（useTilt，轻微 perspective rotate）
 *      ③ GSAP 滚动入场（依次浮入）
 */
export default function FeatureGrid() {
  const sectionRef = useRef<HTMLElement>(null);
  // 6 张卡片各自独立 hook
  const spotlights = [
    useSpotlight<HTMLDivElement>(),
    useSpotlight<HTMLDivElement>(),
    useSpotlight<HTMLDivElement>(),
    useSpotlight<HTMLDivElement>(),
    useSpotlight<HTMLDivElement>(),
    useSpotlight<HTMLDivElement>(),
  ];
  const tilts = [
    useTilt<HTMLDivElement>(5),
    useTilt<HTMLDivElement>(5),
    useTilt<HTMLDivElement>(5),
    useTilt<HTMLDivElement>(5),
    useTilt<HTMLDivElement>(5),
    useTilt<HTMLDivElement>(5),
  ];

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-feature-card]', {
        y: 36,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 78%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="features" className="py-28" style={{ background: 'var(--color-bg)' }}>
      <div className="container-wide">
        <div className="text-center mb-16">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-primary)' }}>能力</p>
          <BlurText
            text="把文件整成 AI 能读的格式"
            animateBy="chars"
            delay={0.025}
            stepDuration={0.45}
            className="font-bold tracking-tight inline-flex justify-center"
            style={{ fontSize: FONT_SIZE.h2 }}
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.id}
              data-feature-card
              ref={spotlights[i]}
              className="relative bg-white rounded-card p-6 border overflow-hidden transition-shadow hover:shadow-xl group"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* spotlight 光晕层 */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    'radial-gradient(circle 180px at var(--mx, 50%) var(--my, 50%), rgba(26,115,232,0.10), transparent 70%)',
                }}
              />
              {/* tilt 内容层 */}
              <div ref={tilts[i]} className="relative" style={{ transition: 'transform 0.2s ease-out', transformStyle: 'preserve-3d' }}>
                <div
                  className="w-11 h-11 rounded-card flex items-center justify-center mb-4"
                  style={{ background: 'rgba(26,115,232,0.1)' }}
                >
                  <FeatureIcon id={f.icon} />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
