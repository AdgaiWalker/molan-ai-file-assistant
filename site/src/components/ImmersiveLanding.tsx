import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { LANDING_CONTENT as CONTENT } from '@/lib/landingContent';
import { Logo } from './Logo';

const SPRING = { type: 'spring', stiffness: 310, damping: 30, mass: 0.8 } as const;
const SOFT_SPRING = { type: 'spring', stiffness: 180, damping: 24, mass: 0.9 } as const;

function externalLinkProps(href: string) {
  return /^https?:\/\//.test(href) ? { target: '_blank', rel: 'noreferrer' as const } : {};
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={reduceMotion ? { duration: 0 } : SOFT_SPRING}
    >
      {children}
    </motion.div>
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`wordmark${light ? ' wordmark--light' : ''}`}>
      <span className="wordmark__icon"><Logo size={28} /></span>
      <span>{CONTENT.brand.name}</span>
    </span>
  );
}

function Navigation() {
  return (
    <header className="site-nav-wrap">
      <nav className="site-nav" aria-label={CONTENT.brand.homeLabel}>
        <a className="site-nav__brand" href="#" aria-label={CONTENT.brand.homeLabel}>
          <Wordmark />
        </a>
        <div className="site-nav__links">
          {CONTENT.nav.links.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
        <motion.a
          className="nav-cta"
          href={CONTENT.links.github}
          aria-label={CONTENT.nav.ctaLabel}
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          {...externalLinkProps(CONTENT.links.github)}
        >
          {CONTENT.nav.cta}
        </motion.a>
      </nav>
    </header>
  );
}

function FileCard({ stageIndex }: { stageIndex: number }) {
  const stage = CONTENT.stage.stages[stageIndex];

  return (
    <motion.article
      className={`journey-file journey-file--${stage.id}`}
      layoutId="traveling-file"
      transition={SOFT_SPRING}
      aria-live="polite"
    >
      <div className="journey-file__topline">
        <span>{CONTENT.stage.fileSource}</span>
        <span className="journey-file__status">{stage.status}</span>
      </div>
      <div className="journey-file__identity">
        <span className="file-glyph" aria-hidden="true"><i /></span>
        <span>
          <strong>{CONTENT.stage.fileName}</strong>
          <small>{CONTENT.stage.fileMeta}</small>
        </span>
      </div>
      <div className="journey-file__preview">
        <strong>{CONTENT.stage.fileHeading}</strong>
        <p>{CONTENT.stage.fileBody}</p>
        <code>{CONTENT.stage.code}</code>
      </div>
      <motion.div
        key={stage.action}
        className="journey-file__action"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <span aria-hidden="true">✓</span>
        {stage.action}
      </motion.div>
    </motion.article>
  );
}

function ProductStage() {
  const [activeStage, setActiveStage] = useState(0);
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 180, damping: 28 });
  const smoothY = useSpring(pointerY, { stiffness: 180, damping: 28 });
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-2.2, 2.2]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [2.2, -2.2]);
  const stage = CONTENT.stage.stages[activeStage];

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const selectStage = (index: number) => {
    setActiveStage(index);
  };

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + delta + CONTENT.stage.stages.length) % CONTENT.stage.stages.length;
    setActiveStage(next);
    document.getElementById(`journey-tab-${CONTENT.stage.stages[next].id}`)?.focus();
  };

  return (
    <motion.section
      className="product-stage"
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1200 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      aria-label={CONTENT.stage.label}
    >
      <div className="product-stage__header">
        <div>
          <span className="stage-kicker">{CONTENT.stage.label}</span>
          <p>{CONTENT.stage.hint}</p>
        </div>
        <span className="stage-counter">0{activeStage + 1} / 03</span>
      </div>

      <LayoutGroup>
        <div className="stage-world">
          <div className={`stage-destination stage-phone${activeStage === 0 ? ' is-active' : ''}`}>
            <span className="destination-label">{CONTENT.stage.phoneLabel}</span>
            <div className="phone-frame">
              <span className="phone-frame__speaker" />
              <div className="phone-frame__screen">
                {activeStage === 0 ? <FileCard stageIndex={activeStage} /> : <span className="screen-placeholder" />}
              </div>
            </div>
          </div>

          <div className={`stage-destination stage-bridge${activeStage === 1 ? ' is-active' : ''}`}>
            <span className="destination-label">{CONTENT.stage.bridgeLabel}</span>
            <div className="bridge-orbit">
              <span />
              <span />
              <span />
            </div>
            {activeStage === 1 && <FileCard stageIndex={activeStage} />}
          </div>

          <div className={`stage-destination stage-desktop${activeStage === 2 ? ' is-active' : ''}`}>
            <span className="destination-label">{CONTENT.stage.desktopLabel}</span>
            <div className="desktop-frame">
              <div className="desktop-frame__bar"><i /><i /><i /></div>
              <div className="desktop-frame__content">
                <span className="desktop-sidebar" />
                <div className="desktop-canvas">
                  {activeStage === 2 ? <FileCard stageIndex={activeStage} /> : <span className="screen-placeholder" />}
                </div>
              </div>
            </div>
          </div>
          <div className="stage-route" aria-hidden="true"><span /></div>
        </div>
      </LayoutGroup>

      <div
        className="stage-tabs"
        role="tablist"
        aria-label={CONTENT.stage.tabsLabel}
      >
        {CONTENT.stage.stages.map((item, index) => (
          <motion.button
            type="button"
            role="tab"
            id={`journey-tab-${item.id}`}
            aria-selected={activeStage === index}
            aria-controls="journey-stage-panel"
            tabIndex={activeStage === index ? 0 : -1}
            key={item.id}
            className={activeStage === index ? 'is-active' : ''}
            onClick={() => selectStage(index)}
            onKeyDown={(event) => handleTabKey(event, index)}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
          >
            {item.tab}
          </motion.button>
        ))}
      </div>

      <div id="journey-stage-panel" className="stage-copy" role="tabpanel" aria-labelledby={`journey-tab-${stage.id}`}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={stage.id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={SPRING}
          >
            <strong>{stage.title}</strong>
            <span>{stage.description}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="hero">
      <div className="hero-glow hero-glow--one" aria-hidden="true" />
      <div className="hero-glow hero-glow--two" aria-hidden="true" />
      <div className="site-shell hero__grid">
        <div className="hero__copy">
          <motion.div
            className="hero__note"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SOFT_SPRING, delay: reduceMotion ? 0 : 0.05 }}
          >
            <span />{CONTENT.hero.note}
          </motion.div>
          <h1>
            <motion.span
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SOFT_SPRING, delay: reduceMotion ? 0 : 0.12 }}
            >
              {CONTENT.hero.titleLead}
            </motion.span>
            <motion.em
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SOFT_SPRING, delay: reduceMotion ? 0 : 0.19 }}
            >
              {CONTENT.hero.titleAccent}
            </motion.em>
          </h1>
          <motion.p
            className="hero__body"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SOFT_SPRING, delay: reduceMotion ? 0 : 0.26 }}
          >
            {CONTENT.hero.body}
          </motion.p>
          <motion.div
            className="hero__actions"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SOFT_SPRING, delay: reduceMotion ? 0 : 0.32 }}
          >
            <motion.a className="button button--primary" href="#journey" whileTap={{ scale: 0.97 }} transition={SPRING}>
              {CONTENT.hero.primaryCta}<span aria-hidden="true">↓</span>
            </motion.a>
            <motion.a
              className="button button--ghost"
              href={CONTENT.links.github}
              aria-label={CONTENT.hero.secondaryCtaLabel}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              {...externalLinkProps(CONTENT.links.github)}
            >
              {CONTENT.hero.secondaryCta}
            </motion.a>
          </motion.div>
          <motion.p
            className="hero__proof"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.42 }}
          >
            <span aria-hidden="true">✓</span>{CONTENT.hero.proof}
          </motion.p>
        </div>

        <motion.div
          className="hero__stage"
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...SOFT_SPRING, delay: reduceMotion ? 0 : 0.18 }}
        >
          <ProductStage />
        </motion.div>
      </div>
    </section>
  );
}

function ReaderPreview() {
  return (
    <div className="reader-preview">
      <div className="reader-preview__chrome">
        <span>{CONTENT.journey.reader.source}</span>
        <i /><i />
      </div>
      <div className="reader-preview__titlebar">
        <span className="file-glyph file-glyph--small" aria-hidden="true"><i /></span>
        <div><strong>{CONTENT.journey.reader.file}</strong><small>Markdown</small></div>
        <button type="button" aria-label={CONTENT.journey.reader.saved}>•••</button>
      </div>
      <div className="reader-preview__body">
        <span className="reader-preview__eyebrow">H1</span>
        <h3>{CONTENT.journey.reader.title}</h3>
        {CONTENT.journey.reader.paragraphs.map((paragraph, index) => (
          <p key={paragraph} className={index === 1 ? 'reader-highlight' : ''}>{paragraph}</p>
        ))}
        <blockquote>{CONTENT.journey.reader.selection}</blockquote>
      </div>
      <div className="reader-preview__toolbar">
        {CONTENT.journey.reader.toolbar.map((item, index) => (
          <span key={item} className={index === 2 ? 'is-primary' : ''}>{item}</span>
        ))}
      </div>
      <div className="reader-preview__toast"><span>✓</span>{CONTENT.journey.reader.saved}</div>
    </div>
  );
}

function JourneySection() {
  return (
    <section className="journey-section" id="journey">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="eyebrow">{CONTENT.journey.eyebrow}</span>
          <h2>{CONTENT.journey.title}</h2>
          <p>{CONTENT.journey.body}</p>
        </Reveal>

        <div className="journey-layout">
          <Reveal className="journey-reader-wrap"><ReaderPreview /></Reveal>
          <div className="journey-steps">
            {CONTENT.journey.steps.map((step, index) => (
              <Reveal key={step.number}>
                <motion.article
                  className="journey-step"
                  whileHover={{ x: 6 }}
                  transition={SPRING}
                >
                  <div className="journey-step__rail">
                    <span>{step.number}</span>
                    {index < CONTENT.journey.steps.length - 1 && <i />}
                  </div>
                  <div>
                    <span className="journey-step__label">{step.label}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <small><span aria-hidden="true">✓</span>{step.meta}</small>
                  </div>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="privacy-section" id="privacy">
      <div className="privacy-orb" aria-hidden="true" />
      <div className="site-shell privacy-layout">
        <Reveal className="privacy-copy">
          <span className="eyebrow eyebrow--light">{CONTENT.privacy.eyebrow}</span>
          <h2>{CONTENT.privacy.title}</h2>
          <p>{CONTENT.privacy.body}</p>
          <motion.a
            href={CONTENT.links.privacy}
            className="privacy-link"
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
          >
            {CONTENT.privacy.link}
          </motion.a>
        </Reveal>

        <div className="permission-stack">
          {CONTENT.privacy.layers.map((layer, index) => (
            <Reveal key={layer.number}>
              <motion.article
                className={`permission-card permission-card--${layer.tone}`}
                whileHover={{ x: -6, scale: 1.01 }}
                transition={SPRING}
              >
                <span className="permission-card__number">0{layer.number}</span>
                <div>
                  <h3>{layer.title}</h3>
                  <p>{layer.description}</p>
                </div>
                <span className="permission-card__state"><i />{layer.state}</span>
              </motion.article>
              {index < CONTENT.privacy.layers.length - 1 && <div className="permission-gap" aria-hidden="true" />}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AvailabilitySection() {
  return (
    <section className="availability-section" id="availability">
      <div className="site-shell">
        <Reveal className="availability-heading">
          <span className="eyebrow">{CONTENT.availability.eyebrow}</span>
          <h2>{CONTENT.availability.title}</h2>
          <p>{CONTENT.availability.body}</p>
        </Reveal>

        <div className="availability-grid">
          {CONTENT.availability.cards.map((card, index) => (
            <Reveal key={card.title}>
              <motion.a
                className={`availability-card${index === 0 ? ' availability-card--featured' : ''}`}
                href={card.href}
                whileHover={{ y: -8 }}
                whileTap={{ scale: 0.985 }}
                transition={SPRING}
                {...externalLinkProps(card.href)}
              >
                <span className="availability-card__status"><i />{card.status}</span>
                <span className="availability-card__index">0{index + 1}</span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
                <strong>{card.cta}</strong>
              </motion.a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-shell">
        <div className="footer-main">
          <Wordmark light />
          <p>{CONTENT.footer.statement}</p>
        </div>
        <div className="footer-bottom">
          <span>{CONTENT.footer.copyright}</span>
          <nav aria-label={CONTENT.brand.name}>
            {CONTENT.footer.links.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default function ImmersiveLanding() {
  return (
    <div className="landing-page">
      <Navigation />
      <main>
        <Hero />
        <JourneySection />
        <PrivacySection />
        <AvailabilitySection />
      </main>
      <Footer />
    </div>
  );
}
