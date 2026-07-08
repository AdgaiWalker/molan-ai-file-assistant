import { useRef, useEffect, type CSSProperties, type ReactNode } from 'react';
import { gsap } from '@/lib/gsap';

/**
 * FadeContent —— 移植自 React Bits（reactbits.dev），JSX→TSX。
 * GSAP ScrollTrigger 触发的滚动入场包装器：子元素从 opacity 0（可选 blur）归位。
 *
 * 用途：替代散落在各区块的 gsap.from，统一"整块滚动入场"动效。
 *
 * 相比原版的精简：
 *  1. 去掉 disappearAfter（落地页不需要滚过后消失）
 *  2. 去掉 container/scroller 参数（我们用默认 window）
 *  3. 导入路径改为单点 @/lib/gsap
 *  4. 加 prefers-reduced-motion 兜底
 *  5. duration 统一用秒（原版混用 ms/s）
 */

interface FadeContentProps {
  children: ReactNode;
  /** 入场位移距离 px（0 = 纯淡入） */
  distance?: number;
  /** 入场方向 */
  direction?: 'vertical' | 'horizontal';
  /** 是否带 blur 过渡 */
  blur?: boolean;
  /** 入场时长 s */
  duration?: number;
  /** 缓动 */
  ease?: string;
  /** 延迟 s */
  delay?: number;
  /** ScrollTrigger threshold（0-1，元素可见比例触发） */
  threshold?: number;
  /** 起始透明度 */
  initialOpacity?: number;
  className?: string;
  style?: CSSProperties;
}

export default function FadeContent({
  children,
  distance = 28,
  direction = 'vertical',
  blur = false,
  duration = 0.8,
  ease = 'power3.out',
  delay = 0,
  threshold = 0.15,
  initialOpacity = 0,
  className,
  style,
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // reduced-motion：直接显示，无动画
    if (reduce) {
      gsap.set(el, { opacity: 1, filter: 'blur(0px)', x: 0, y: 0 });
      return;
    }

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const startPct = (1 - threshold) * 100;

    gsap.set(el, {
      [axis]: distance,
      autoAlpha: initialOpacity,
      filter: blur ? 'blur(10px)' : 'blur(0px)',
      willChange: 'opacity, filter, transform',
    });

    const st = gsap.to(el, {
      [axis]: 0,
      autoAlpha: 1,
      filter: 'blur(0px)',
      duration,
      ease,
      delay,
      scrollTrigger: {
        trigger: el,
        start: `top ${startPct}%`,
        once: true,
      },
    });

    return () => {
      st.scrollTrigger?.kill();
      st.kill();
    };
  }, [distance, direction, blur, duration, ease, delay, threshold, initialOpacity, reduce]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, ...style }}>
      {children}
    </div>
  );
}
