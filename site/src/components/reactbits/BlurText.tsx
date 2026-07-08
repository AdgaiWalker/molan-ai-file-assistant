import { useEffect, useRef, useState, useMemo, type CSSProperties } from 'react';
import { motion, type Variants } from 'framer-motion';

/**
 * BlurText —— 移植自 React Bits（reactbits.dev），用 framer-motion variants 重写。
 * 字符/词从 blur(10px)+位移 → blur(0)+归位，父级 staggerChildren 逐个浮入。
 *
 * 相比原版的关键改动：
 *  1. 用 variants + staggerChildren 替代手动 keyframe 数组 —— 类型干净，无 TS 联合爆炸
 *  2. 导入路径 motion/react → framer-motion
 *  3. 增加 prefers-reduced-motion 兜底
 *  4. 中文按字拆用 Array.from（比 split('') 更稳）
 */

interface BlurTextProps {
  text: string;
  /** 每个字符/词的 stagger 间隔 s */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  animateBy?: 'words' | 'chars';
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  stepDuration?: number;
  onAnimationComplete?: () => void;
}

export default function BlurText({
  text,
  delay = 0.04,
  className = '',
  style,
  animateBy = 'chars',
  direction = 'top',
  threshold = 0.1,
  rootMargin = '0px',
  stepDuration = 0.5,
  onAnimationComplete,
}: BlurTextProps) {
  const elements = animateBy === 'words' ? text.split(' ') : Array.from(text);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  // 父级 variants：控制子级 stagger（visible 时逐个触发）
  const containerVariants = useMemo<Variants>(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: delay },
      },
    }),
    [delay],
  );

  // 子级 variants：每个字符的 blur→clear 动画（类型完全固定，无动态字段）
  const childVariants = useMemo<Variants>(
    () => ({
      hidden: {
        filter: 'blur(10px)',
        opacity: 0,
        y: direction === 'top' ? -24 : 24,
      },
      visible: {
        filter: 'blur(0px)',
        opacity: 1,
        y: 0,
        transition: {
          duration: stepDuration,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    }),
    [direction, stepDuration],
  );

  // reduced-motion：直接渲染纯文本
  if (reduce) {
    return (
      <p ref={ref} className={className} style={style}>
        {text}
      </p>
    );
  }

  return (
    <motion.p
      ref={ref}
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', ...style }}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      onAnimationComplete={onAnimationComplete}
    >
      {elements.map((segment, index) => (
        <motion.span
          key={index}
          className="inline-block will-change-[transform,filter,opacity]"
          variants={childVariants}
        >
          {segment === ' ' ? '\u00A0' : segment}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </motion.p>
  );
}
