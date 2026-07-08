import { useRef, useEffect } from 'react';
import { PLATFORMS } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useTilt } from '@/hooks/useTilt';
import BlurText from './reactbits/BlurText';
import PhoneMockup from './mockups/PhoneMockup';
import DesktopMockup from './mockups/DesktopMockup';
import CliMockup from './mockups/CliMockup';

/**
 * 三端并列（区块3）—— C3 完整版。
 * 动效：① GSAP clip-path wipe 视差揭示（三端错开被"擦"出来）
 *      ② useTilt 3D 倾斜（卡片内 mockup 区跟随鼠标 perspective rotate）
 *      ③ 真实 CSS mockup（手机/桌面/CLI）
 */
export default function ThreePlatforms() {
  const sectionRef = useRef<HTMLElement>(null);

  const tiltA = useTilt<HTMLDivElement>(6);
  const tiltB = useTilt<HTMLDivElement>(6);
  const tiltC = useTilt<HTMLDivElement>(6);
  const tilts = [tiltA, tiltB, tiltC];

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set('[data-platform-card]', { clipPath: 'inset(100% 0 0 0)', opacity: 0, y: 40 });
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.to('[data-platform-card]', {
            clipPath: 'inset(0% 0 0 0)',
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: 'power3.out',
          });
        },
      });
    }, sectionRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} id="platforms" className="py-28" style={{ background: 'var(--color-bg)' }}>
      <div className="container-wide">
        <div className="text-center mb-16">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
            一处汇聚，三端协同
          </p>
          <BlurText
            text="为不同场景而生"
            animateBy="chars"
            delay={0.03}
            stepDuration={0.45}
            className="font-bold tracking-tight inline-flex justify-center"
            style={{ fontSize: FONT_SIZE.h2 }}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLATFORMS.map((p, i) => (
            <div
              key={p.id}
              data-platform-card
              className="bg-white rounded-card p-6 border transition-shadow hover:shadow-xl"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                ref={tilts[i]}
                className="mb-5"
                style={{ transition: 'transform 0.2s ease-out', transformStyle: 'preserve-3d' }}
              >
                <div className="h-[300px] flex items-center justify-center">
                  {p.id === 'mobile' && (
                    <div className="scale-[0.85] origin-center">
                      <PhoneMockup />
                    </div>
                  )}
                  {p.id === 'desktop' && <DesktopMockup />}
                  {p.id === 'cli' && <CliMockup />}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-tag" style={{ background: 'var(--color-code-bg)', color: 'var(--color-text-secondary)' }}>
                  {p.role}
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {p.desc}
              </p>
              <ul className="space-y-1.5">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-xs">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-success)' }}>
                      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
