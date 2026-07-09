/**
 * 墨览官网设计 token —— 收口散落的魔法数字，统一圆角/字号/动效参数。
 * 遵循 AGENTS.md §分离原则 #6「Config externalized」。
 *
 * 用法：import { RADIUS, FONT_SIZE, REVEAL } from '@/lib/tokens';
 * 不要在组件里硬编码 borderRadius: 16 / fontSize: '1.8rem'。
 */

/** 圆角：从 4 套收敛到 3 级 + pill */
export const RADIUS = {
  sm: '8px', // 小标签、徽章
  md: '16px', // 卡片、按钮（主）
  lg: '24px', // mockup、大卡片
  pill: '999px', // 胶囊
} as const;

/** 字号层级：明确 token，避免散落的 clamp/text-[Npx] */
export const FONT_SIZE = {
  /** Hero 主标题 */
  hero: 'clamp(2.4rem, 5vw, 4rem)',
  /** 区块 H2 标题 */
  h2: 'clamp(1.75rem, 3.5vw, 2.6rem)',
  /** 信任区 H2（略小） */
  h2Sm: 'clamp(1.6rem, 3vw, 2.2rem)',
  /** 卡片 H3 */
  h3: '1.125rem',
  /** 正文 */
  body: '0.875rem',
  /** 正文大（副标题） */
  bodyLg: '1.125rem',
  /** 小字、mono */
  mono: '0.75rem',
} as const;

/**
 * 统一的滚动入场动效参数。
 * 所有"整块浮入"（非 BlurText 的逐字动效）都用这套，删掉多套 gsap.from。
 */
export const REVEAL = {
  y: 28,
  opacity: 0,
  duration: 0.7,
  stagger: 0.1,
  ease: 'power3.out',
  /** ScrollTrigger start 位置 */
  start: 'top 80%',
} as const;

/** BlurText 统一参数（Hero + 区块标题都用同一套，只调 delay） */
export const BLUR_TEXT_DEFAULTS = {
  stepDuration: 0.4,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;
