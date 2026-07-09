import { BRAND } from '@/lib/constants';

/**
 * 墨览 Logo —— 直接使用原始 logo 图片（透明 PNG）。
 *
 * 变体：
 *   <Logo />                 单图标（原图）
 *   <Logo size={28} />       指定尺寸
 *   <LogoLockup />           logo + 墨览文字（横排，Nav/Hero 用）
 *   <LogoLockup showTagline  logo + 墨览 + tagline（Footer 用）
 */

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 28, className }: LogoProps) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt={BRAND.name}
      className={className}
      style={{ display: 'block', objectFit: 'contain' }}
      draggable={false}
    />
  );
}

interface LockupProps {
  size?: number;
  showTagline?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Logo 锁定版 —— logo + 墨览文字（+ 可选 tagline）。
 * variant: light=深色背景用白字（Nav/Hero/Footer）；dark=浅色背景用黑字。
 */
export function LogoLockup({
  size = 28,
  showTagline = false,
  variant = 'light',
  className,
}: LockupProps) {
  const textColor = variant === 'light' ? '#ffffff' : 'var(--color-text)';
  const taglineColor = variant === 'light' ? 'rgba(255,255,255,0.5)' : 'var(--color-text-secondary)';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <Logo size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-semibold text-lg" style={{ color: textColor }}>
          {BRAND.name}
        </span>
        {showTagline && (
          <span className="text-[11px] mt-1" style={{ color: taglineColor }}>
            {BRAND.tagline}
          </span>
        )}
      </span>
    </span>
  );
}
