import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EARLY_ACCESS, BRAND } from '@/lib/constants';
import { FONT_SIZE } from '@/lib/tokens';
import BlurText from './reactbits/BlurText';
import FadeContent from './reactbits/FadeContent';

/**
 * 预约/候补区 —— 放在 Hero 之后，是主转化入口。
 * 邮箱输入框 + 提交后显示「已加入候补名单」。
 *
 * 数据持久化：localStorage 记录已提交的邮箱，避免重复提示。
 * 后端对接：handleSubmit 里的 fetch 占位，接后端时替换 URL。
 */
const STORAGE_KEY = 'molan:early-access:email';

export default function EarlyAccess() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // 首次挂载：检查是否已提交过（避免重复提示）
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) setStatus('done');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      // TODO: 接后端时替换为真实 API
      // await fetch('/api/early-access', { method: 'POST', body: JSON.stringify({ email: trimmed }) });
      await new Promise((r) => setTimeout(r, 600)); // 模拟网络
      localStorage.setItem(STORAGE_KEY, trimmed);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      id="early-access"
      className="py-28 relative overflow-hidden"
      style={{ background: 'var(--color-bg-dark)' }}
    >
      {/* 蓝光晕（与 Hero 呼应） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,115,232,0.18), transparent 60%)',
        }}
      />
      <div className="container-wide relative z-10 max-w-xl text-center">
        <FadeContent blur duration={0.8}>
          <p className="text-sm font-medium mb-3 text-white/60">{EARLY_ACCESS.eyebrow}</p>
          <BlurText
            text={EARLY_ACCESS.title}
            animateBy="chars"
            delay={0.03}
            stepDuration={0.45}
            className="font-bold tracking-tight inline-flex justify-center text-white"
            style={{ fontSize: FONT_SIZE.h2 }}
          />
          <p className="mt-4 text-white/60 leading-relaxed" style={{ fontSize: FONT_SIZE.bodyLg }}>
            {EARLY_ACCESS.subtitle}
          </p>

          {/* 表单 / 成功态 */}
          <div className="mt-8 min-h-[60px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {status === 'done' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-card flex items-center justify-center"
                    style={{ background: 'rgba(30,142,62,0.18)' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="m5 13 4 4L19 7" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-white font-medium">{EARLY_ACCESS.successTitle}</p>
                  <p className="text-white/50 text-sm max-w-sm">{EARLY_ACCESS.successDesc}</p>
                  <a
                    href={BRAND.github}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
                  >
                    {EARLY_ACCESS.githubCta}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col sm:flex-row gap-2 w-full max-w-md mx-auto"
                >
                  <input
                    type="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder={EARLY_ACCESS.placeholder}
                    disabled={status === 'loading'}
                    className="flex-1 px-4 py-3 bg-white/8 border rounded-btn text-white placeholder-white/35 outline-none transition-colors focus:border-white/40 disabled:opacity-50"
                    style={{ borderColor: status === 'error' ? 'var(--color-danger)' : 'rgba(255,255,255,0.12)' }}
                    aria-label="邮箱"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-5 py-3 rounded-btn text-white font-medium transition-transform hover:scale-[1.03] disabled:opacity-60 whitespace-nowrap"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {status === 'loading' ? '提交中…' : EARLY_ACCESS.button}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* 错误提示 */}
          <AnimatePresence>
            {status === 'error' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-sm"
                style={{ color: 'var(--color-danger)' }}
              >
                邮箱格式不对，检查一下？
              </motion.p>
            )}
          </AnimatePresence>

          {/* 社交证明 */}
          {status !== 'done' && (
            <p className="mt-6 text-white/35 text-xs font-mono">{EARLY_ACCESS.socialProof}</p>
          )}
        </FadeContent>
      </div>
    </section>
  );
}
