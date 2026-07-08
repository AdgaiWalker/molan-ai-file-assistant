import { useRef, useEffect } from 'react';

/**
 * 光晕跟随 hook —— 卡片背景跟随鼠标的径向光斑。
 * 通过 CSS 变量 --mx / --my 注入，配合组件内的 radial-gradient 使用。
 * 用法：在卡片元素上 const ref = useSpotlight(); 然后在 CSS 用 var(--mx)。
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };

    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return ref;
}
