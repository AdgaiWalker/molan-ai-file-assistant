import { useRef, useEffect } from 'react';
import { TRUST } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import { gsap } from '@/lib/gsap';
import BlurText from './reactbits/BlurText';

/**
 * 信任区（区块6）—— C4 完整版。
 * 动效：GSAP 滚动揭示（徽章依次浮入 + 图标轻微弹跳）。
 */
export default function TrustBadges() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-trust-badge]', {
        y: 28,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      className="py-24"
      style={{ background: 'var(--color-bg-dark)', color: '#fff' }}
    >
      <div className="container-wide">
        <div className="text-center mb-14">
          <p className="text-sm font-medium mb-3 text-white/60">为什么敢用</p>
          <BlurText
            text="你的文件，归你掌控"
            animateBy="chars"
            delay={0.035}
            stepDuration={0.45}
            className="font-bold tracking-tight inline-flex justify-center"
            style={{ fontSize: FONT_SIZE.h2Sm, color: '#fff' }}
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TRUST.map((t) => (
            <div
              key={t.id}
              data-trust-badge
              className="rounded-card p-6 glass-dark"
            >
              <div className="w-10 h-10 rounded-card flex items-center justify-center mb-4" style={{ background: 'rgba(30,142,62,0.18)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" stroke="#34d399" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-4" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-2">{t.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
