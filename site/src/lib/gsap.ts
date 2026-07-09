import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * GSAP 全局注册入口。所有需要 ScrollTrigger 的组件都从此处引入 gsap，
 * 避免重复注册。遵循 AGENTS.md「Reuse before create」——单一注册点。
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  // 尊重无障碍：减少动效时禁用滚动驱动动画
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };
