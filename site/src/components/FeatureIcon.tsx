/**
 * 能力图标 —— 统一的线性 SVG 图标，描边用品牌色。
 * 集中在此避免散落在 JSX（遵循 AGENTS.md §分离原则）。
 */
export function FeatureIcon({ id }: { id: string }) {
  const stroke = 'var(--color-primary)';
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (id) {
    case 'read':
      return (
        <svg {...common}>
          <path d="M4 5h12a3 3 0 0 1 3 3v11l-3-2-3 2V8" />
          <path d="M4 5v14l3-2 3 2V5" />
        </svg>
      );
    case 'prompt':
      return (
        <svg {...common}>
          <path d="M4 5h16v10H8l-4 3z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );
    case 'office':
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 14h6M9 17h4" />
        </svg>
      );
    case 'convert':
      return (
        <svg {...common}>
          <path d="M4 8h11l-3-3M20 16H9l3 3" />
        </svg>
      );
    case 'cloud':
      return (
        <svg {...common}>
          <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18z" />
          <path d="M12 13v5m-2-2 2 2 2-2" />
        </svg>
      );
    case 'ai':
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <path d="M9 9v6M9 12h6M15 9v6" />
        </svg>
      );
    default:
      return null;
  }
}
