import { useRef } from 'react';
import { FLOW_STEPS } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import BlurText from './reactbits/BlurText';
import FadeContent from './reactbits/FadeContent';

/**
 * 文件流转（区块4）—— 纵向 3 步流程。
 * 布局：左侧大号序号 01/02/03，右侧标题+描述+标签，步骤间渐进绘制连接线。
 * 动效：BlurText 标题 + FadeContent 步骤入场 + ScrollTrigger 连接线生长。
 *
 * 砍掉了原来的横向 pin（占屏多、节奏拖、移动端体验差）。
 */
export default function FlowTimeline() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="flow"
      className="py-28"
      style={{ background: 'var(--color-surface)' }}
    >
      <div className="container-wide max-w-4xl">
        {/* 标题 */}
        <div className="text-center mb-20">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
            怎么运作
          </p>
          <BlurText
            text="三步到 AI"
            animateBy="chars"
            delay={0.04}
            stepDuration={0.45}
            className="font-bold tracking-tight inline-flex justify-center"
            style={{ fontSize: FONT_SIZE.h2 }}
          />
          <p className="mt-4 max-w-md mx-auto" style={{ fontSize: FONT_SIZE.bodyLg, color: 'var(--color-text-secondary)' }}>
            从散落文件到 AI 能读，中间只隔一个墨览。
          </p>
        </div>

        {/* 3 步纵向列表 */}
        <div className="relative">
          {FLOW_STEPS.map((step, i) => (
            <FadeContent key={step.id} distance={36} threshold={0.2}>
              <FlowRow step={step} isLast={i === FLOW_STEPS.length - 1} />
            </FadeContent>
          ))}
        </div>
      </div>
    </section>
  );
}

interface FlowRowProps {
  step: (typeof FLOW_STEPS)[number];
  isLast: boolean;
}

function FlowRow({ step, isLast }: FlowRowProps) {
  return (
    <div className="relative flex gap-6 md:gap-10 pb-16 last:pb-0">
      {/* 左侧：大号序号 + 连接线 */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        <div
          className="w-14 h-14 rounded-card flex items-center justify-center font-mono font-semibold text-white"
          style={{
            background: step.id === FLOW_STEPS.length ? 'var(--color-text)' : 'var(--color-primary)',
            fontSize: '1.05rem',
          }}
        >
          {String(step.id).padStart(2, '0')}
        </div>
        {/* 渐进连接线（最后一步不画） */}
        {!isLast && (
          <div
            className="absolute top-14 bottom-0 w-0.5 my-2 overflow-hidden"
            style={{ background: 'var(--color-border)' }}
          >
            <div
              className="w-full h-full origin-top"
              style={{
                background: 'var(--color-primary)',
                transform: 'scaleY(0)',
                animation: 'flowline 1.2s ease-out forwards',
                animationDelay: '0.3s',
              }}
            />
          </div>
        )}
      </div>

      {/* 右侧：内容 */}
      <div className="flex-1 pt-1.5">
        <h3 className="font-semibold mb-2" style={{ fontSize: FONT_SIZE.h3 }}>
          {step.label}
        </h3>
        <p className="leading-relaxed mb-3" style={{ fontSize: FONT_SIZE.bodyLg, color: 'var(--color-text-secondary)' }}>
          {step.detail}
        </p>
        <div className="flex flex-wrap gap-2">
          {step.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono rounded-tag"
              style={{
                fontSize: FONT_SIZE.mono,
                padding: '4px 10px',
                background: 'var(--color-code-bg)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
