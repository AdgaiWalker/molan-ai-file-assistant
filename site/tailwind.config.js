/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 复用桌面端 styles.css 的品牌色
        brand: {
          primary: 'var(--color-primary)',
          'primary-hover': 'var(--color-primary-hover)',
          success: 'var(--color-success)',
          danger: 'var(--color-danger)',
        },
        ink: {
          950: 'var(--color-bg-dark)',
          900: 'var(--color-bg-dark-2)',
          100: 'var(--color-bg)',
          50: 'var(--color-surface)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius: {
        // 语义化圆角 token（与 src/lib/tokens.ts RADIUS 对应）
        tag: '8px', // 小标签、徽章
        btn: '16px', // 按钮
        card: '16px', // 卡片（与 btn 同级，统一视觉重量）
        mockup: '24px', // 大卡片、mockup 外框
        pill: '999px', // 胶囊、圆形
        // 兼容保留（mockup 内部细节用）
        '2xl': '16px',
        '3xl': '24px',
      },
      backdropBlur: {
        glass: '22px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
