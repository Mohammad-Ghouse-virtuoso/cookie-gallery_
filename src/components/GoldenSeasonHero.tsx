import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { formatPrice } from '@/utils/formatPrice';
import { useCart } from '@/context/CartContext';
import { goldenSeasonBoxes } from '@/data/goldenSeasonBoxes';
import { useGiftExperience } from '@/context/GiftExperienceContext';
import { useNavigate } from 'react-router-dom';
import type { CartStateWithMeta } from '@/types/cart';

type EagerModule = {
  default: string;
};

type AssetCandidate = {
  src: string;
  path: string;
  filename: string;
};

type BadgeDefinition = {
  key: string;
  label: string;
  tooltip: string;
};

type BoxDefinition = (typeof goldenSeasonBoxes)[number];

type CountdownState = {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type EnrichedBox = BoxDefinition & {
  asset: AssetCandidate | null;
  alt: string;
  priceLabel: string;
};

type AmbientLoopCandidate = {
  kind: 'video';
  src: string;
  filename: string;
};

const MAX_BOX_QUANTITY = 3;
const LIMIT_NOTICE_COPY = 'Only three of each box fit in our warm courier tote. Cozy limits keep things special.';

const heroPrimary = import.meta.glob<EagerModule>('/src/assets/golden-season/hero-*.{jpg,jpeg,png,webp}', { eager: true });
const heroGolden = import.meta.glob<EagerModule>('/src/assets/golden-season/hero-gold*.{jpg,jpeg,png,webp}', { eager: true });
const heroFallbackBoxes = import.meta.glob<EagerModule>('/src/assets/golden-season/box-*.{jpg,jpeg,png,webp}', { eager: true });
const iconModules = import.meta.glob<EagerModule>('/src/assets/golden-season/icons/icon-*.{svg,png}', { eager: true });
const warmBoxModules = import.meta.glob<EagerModule>('/src/assets/golden-season/box-warm-*.{jpg,jpeg,png,webp}', { eager: true });
const cozyBoxModules = import.meta.glob<EagerModule>('/src/assets/golden-season/box-cozy-*.{jpg,jpeg,png,webp}', { eager: true });
const midnightBoxModules = import.meta.glob<EagerModule>('/src/assets/golden-season/box-midnight-*.{jpg,jpeg,png,webp}', { eager: true });
const darkBoxModules = import.meta.glob<EagerModule>('/src/assets/golden-season/box-dark-*.{jpg,jpeg,png,webp}', { eager: true });
const starlightBoxModules = import.meta.glob<EagerModule>('/src/assets/golden-season/box-starlight-*.{jpg,jpeg,png,webp}', { eager: true });
const roseBoxModules = import.meta.glob<EagerModule>('/src/assets/golden-season/box-rose-*.{jpg,jpeg,png,webp}', { eager: true });
const timerBackdropModules = import.meta.glob<EagerModule>('/src/assets/golden-season/timer-*.{jpg,jpeg,png,webp}', { eager: true });
const ambientVideoModules = {
  ...import.meta.glob<EagerModule>('/src/assets/golden-season/loop-*.{mp4,webm}', { eager: true }),
  ...import.meta.glob<EagerModule>('/src/assets/loop-*.{mp4,webm}', { eager: true }),
};

const badgeMeta: BadgeDefinition[] = [
  { key: 'icon-delivery', label: 'Fast Delivery', tooltip: 'Fresh batches leave our kitchen within 24 hours.' },
  { key: 'icon-timer', label: 'Limited Drop', tooltip: 'Only small festive batches available each week.' },
  { key: 'icon-handmade', label: 'Handmade', tooltip: 'Every cookie is hand-finished and quality checked.' },
  { key: 'icon-seal', label: 'No Returns', tooltip: 'Perishable goods — crafted to order, no returns.' },
];

function sortByPath(entries: [string, EagerModule][]) {
  return entries.sort((a, b) => a[0].localeCompare(b[0]));
}

function toCandidate(entry: [string, EagerModule]): AssetCandidate {
  const [path, mod] = entry;
  const filename = path.split('/').pop() ?? 'golden-season-hero';
  return { src: mod.default, path, filename };
}

function selectHeroImage(): AssetCandidate | null {
  const primaryEntries = sortByPath(Object.entries(heroPrimary));
  const preferred = primaryEntries.find(([path]) => /hero-1\./i.test(path));
  if (preferred) {
    return toCandidate(preferred);
  }
  if (primaryEntries.length > 0) {
    return toCandidate(primaryEntries[0]!);
  }

  const goldenEntries = sortByPath(Object.entries(heroGolden));
  if (goldenEntries.length > 0) {
    return toCandidate(goldenEntries[0]!);
  }

  const boxEntries = sortByPath(Object.entries(heroFallbackBoxes));
  if (boxEntries.length > 0) {
    return toCandidate(boxEntries[0]!);
  }

  return null;
}

function selectBoxImage(priorityKeys: string[]): AssetCandidate | null {
  const catalogs: Record<string, Record<string, EagerModule>> = {
    'box-warm': warmBoxModules,
    'box-cozy': cozyBoxModules,
    'box-midnight': midnightBoxModules,
    'box-dark': darkBoxModules,
    'box-starlight': starlightBoxModules,
    'box-rose': roseBoxModules,
    box: heroFallbackBoxes,
  };

  for (const key of priorityKeys) {
    const catalog = catalogs[key];
    if (!catalog) continue;
    const entries = sortByPath(Object.entries(catalog));
    if (entries.length > 0) {
      return toCandidate(entries[0]!);
    }
  }

  return null;
}

function selectTimerBackdrop(): AssetCandidate | null {
  const timerEntries = sortByPath(Object.entries(timerBackdropModules));
  if (timerEntries.length > 0) {
    return toCandidate(timerEntries[0]!);
  }

  const fallbackHero = sortByPath(Object.entries(heroPrimary));
  if (fallbackHero.length > 0) {
    return toCandidate(fallbackHero[0]!);
  }

  return null;
}

function selectAmbientLoop(): AmbientLoopCandidate | null {
  const entries = sortByPath(Object.entries(ambientVideoModules));
  if (entries.length === 0) {
    return null;
  }
  const [path, mod] = entries[0]!;
  const filename = path.split('/').pop() ?? 'ambient-loop';
  return { kind: 'video', src: mod.default, filename };
}

function prettifyFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) {
    return 'Golden Season hero image';
  }
  const normalized = base.replace(/^\d+/, '').trim();
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return `Golden Season ${capitalized || 'hero image'}`;
}

function buildAltText(filename: string) {
  const descriptor = prettifyFilename(filename);
  return `${descriptor} from the Cookie Gallery.`;
}

function buildBackdropAlt(candidate: AssetCandidate | null) {
  if (!candidate) {
    return 'Golden Season countdown backdrop';
  }
  const descriptor = prettifyFilename(candidate.filename).replace(/^Golden Season\s*/i, '').trim();
  const suffix = descriptor ? `${descriptor.toLowerCase()} softly blurred behind the countdown.` : 'countdown backdrop';
  return `Golden Season ${suffix}`;
}

function computeNextDropDate() {
  const now = new Date();
  const target = new Date(now.getTime());
  const targetDay = 5; // Friday
  const daysUntil = (targetDay - now.getDay() + 7) % 7;
  const baseDays = daysUntil === 0 && now.getHours() >= 18 ? 7 : daysUntil || 0;
  target.setDate(now.getDate() + (baseDays === 0 ? 7 : baseDays));
  target.setHours(18, 0, 0, 0);
  return target;
}

function calculateTimeLeft(target: Date): CountdownState {
  const total = Math.max(0, target.getTime() - Date.now());
  const seconds = Math.floor(total / 1000);
  const days = Math.floor(seconds / (60 * 60 * 24));
  const hours = Math.floor((seconds / (60 * 60)) % 24);
  const minutes = Math.floor((seconds / 60) % 60);
  const secs = Math.floor(seconds % 60);
  return {
    total,
    days,
    hours,
    minutes,
    seconds: secs,
  };
}

function resolveBadges() {
  return badgeMeta.map(badge => {
    const moduleEntry = Object.entries(iconModules).find(([path]) => path.includes(`${badge.key}.`));
    return {
      ...badge,
      src: moduleEntry?.[1].default ?? '',
      alt: `${badge.label.toLowerCase()} icon`,
    };
  });
}

export default function GoldenSeasonHero() {
  const { cart, setCart } = useCart();
  const { openModal } = useGiftExperience();
  const navigate = useNavigate();
  const heroAsset = useMemo(() => selectHeroImage(), []);
  const heroAlt = useMemo(
    () => (heroAsset ? buildAltText(heroAsset.filename) : 'Golden Season hero placeholder'),
    [heroAsset],
  );
  const ambientLoop = useMemo(() => selectAmbientLoop(), []);
  const ambientVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isMediaHovered, setIsMediaHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const boxGridRef = useRef<HTMLDivElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const badges = useMemo(() => resolveBadges(), []);
  const goldenBoxes = useMemo<EnrichedBox[]>(() => {
    return goldenSeasonBoxes.map(box => {
      const asset = selectBoxImage(box.imagePriority);
      const fallbackAlt = box.placeholderTone === 'warm'
        ? 'Golden Hearth Collection illustration placeholder'
        : box.placeholderTone === 'midnight'
          ? 'Midnight Luxe Box illustration placeholder'
          : 'Starlight Reverie Box illustration placeholder';
      const computedAlt = box.key === 'starlight-box'
        ? 'Starlight Reverie Box with pistachio and rose cookies'
        : asset
          ? buildAltText(asset.filename)
          : fallbackAlt;
      return {
        ...box,
        asset,
        alt: computedAlt,
        priceLabel: formatPrice(box.price),
      };
    });
  }, []);
  const timerBackdrop = useMemo(() => selectTimerBackdrop(), []);
  const timerAlt = useMemo(() => buildBackdropAlt(timerBackdrop), [timerBackdrop]);
  const [dropTarget, setDropTarget] = useState(() => computeNextDropDate());
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(dropTarget));
  const [limitNotices, setLimitNotices] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setLimitNotices(current => {
      const next: Record<string, boolean> = {};
      Object.entries(cart).forEach(([key, qty]) => {
        if (key === '_meta') return;
        if (typeof qty === 'number' && qty >= MAX_BOX_QUANTITY) {
          next[key] = true;
        }
      });
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length && nextKeys.every(key => current[key])) {
        return current;
      }
      return next;
    });
  }, [cart]);
  const countdownSegments = useMemo(
    () => [
      { label: 'Days', value: String(timeLeft.days).padStart(2, '0') },
      { label: 'Hours', value: String(timeLeft.hours).padStart(2, '0') },
      { label: 'Mins', value: String(timeLeft.minutes).padStart(2, '0') },
    ],
    [timeLeft.days, timeLeft.hours, timeLeft.minutes],
  );
  const countdownAnnouncement = useMemo(() => {
    if (timeLeft.total <= 0) {
      return 'The current limited drop is plating now.';
    }
    return `${timeLeft.days} days, ${timeLeft.hours} hours, and ${timeLeft.minutes} minutes until the next Golden Season drop.`;
  }, [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.total]);

  useEffect(() => {
    setImageLoaded(false);
  }, [heroAsset?.src]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    setPrefersReducedMotion(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!ambientLoop || ambientLoop.kind !== 'video') {
      return;
    }
    const video = ambientVideoRef.current;
    if (!video) {
      return;
    }
    if (prefersReducedMotion || isMediaHovered) {
      video.pause();
      return;
    }
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {
        /* ignore autoplay rejections */
      });
    }
  }, [ambientLoop, prefersReducedMotion, isMediaHovered]);

  useEffect(() => {
    const tick = () => {
      const next = calculateTimeLeft(dropTarget);
      if (next.total <= 0) {
        const upcoming = computeNextDropDate();
        setDropTarget(upcoming);
        setTimeLeft(calculateTimeLeft(upcoming));
      } else {
        setTimeLeft(next);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [dropTarget]);

  const handleReserveScroll = () => {
    if (boxGridRef.current) {
      boxGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleQuantityChange = (box: EnrichedBox, desired: number) => {
    const productKey = box.key;
    const nextQty = Math.max(0, Math.min(MAX_BOX_QUANTITY, desired));

    setCart(prev => {
      const prevWithMeta = prev as CartStateWithMeta;
      const currentQty = typeof prevWithMeta[productKey] === 'number' ? prevWithMeta[productKey]! : 0;
      if (nextQty === currentQty) {
        return prev;
      }

      const next = { ...(prevWithMeta as any) } as CartStateWithMeta;
      next._meta = prevWithMeta._meta ? { ...prevWithMeta._meta } : undefined;

      if (nextQty <= 0) {
        delete next[productKey];
        if (next._meta) {
          delete next._meta[productKey];
        }
      } else {
        next[productKey] = nextQty;
        const meta = (next._meta ??= {});
        meta[productKey] = {
          type: 'cookie',
          name: box.title,
          price: box.price,
          image: box.asset?.src ?? '',
          productId: productKey,
        };
      }

      return next as unknown as typeof prev;
    });

    if (desired > MAX_BOX_QUANTITY || nextQty >= MAX_BOX_QUANTITY) {
      setLimitNotices(current => ({ ...current, [productKey]: true }));
    } else {
      setLimitNotices(current => {
        if (!(productKey in current)) {
          return current;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [productKey]: _, ...rest } = current;
        return rest;
      });
    }
  };

  const handleAddToCart = (box: EnrichedBox) => {
    const currentQty = typeof cart[box.key] === 'number' ? cart[box.key]! : 0;
    const desired = currentQty > 0 ? currentQty + 1 : 1;
    handleQuantityChange(box, desired);
  };

  const handleGiftExperience = (boxKey: string) => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
      openModal(boxKey);
      return;
    }
    navigate(`/gift/${boxKey}`);
  };

  return (
    <Section aria-labelledby="golden-season-heading" id="golden-season">
      <div className="hero">
        <div
          className={`media ${imageLoaded ? 'media--loaded' : ''}`}
          onMouseEnter={() => setIsMediaHovered(true)}
          onMouseLeave={() => setIsMediaHovered(false)}
        >
          {!imageLoaded && <div className="media__skeleton" aria-hidden="true" />}
          {heroAsset ? (
            <img
              src={heroAsset.src}
              alt={heroAlt}
              loading="lazy"
              className="media__image"
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="media__fallback" aria-hidden="true" />
          )}
          {!prefersReducedMotion && (
            ambientLoop ? (
              <div className="media__ambient" aria-hidden="true">
                <video
                  ref={ambientVideoRef}
                  className="media__ambient-video"
                  src={ambientLoop.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="media__ambient media__ambient--fallback" aria-hidden="true">
                <div className="media__ambient-particles" />
              </div>
            )
          )}
        </div>
        <div className="copy">
          <p className="eyebrow">Golden Season 2025</p>
          <h2 id="golden-season-heading">The Season Tastes Golden</h2>
          <p className="subhead">Limited festive boxes of our best cookies — crafted to be gifted.</p>
          <div className="cta-row">
            <button className="cta" type="button" onClick={handleReserveScroll}>
              Reserve Your Box
            </button>
            <span className="cta-note">Ships in weekly micro-batches • Gift-ready packaging</span>
          </div>
        </div>
      </div>
      <div className="badge-strip" role="list" aria-label="Golden Season highlights">
        {badges.map(badge => (
          <div
            key={badge.key}
            className="badge"
            role="listitem"
            title={badge.tooltip}
            aria-label={`${badge.label}. ${badge.tooltip}`}
          >
            {badge.src ? (
              <img src={badge.src} alt={badge.alt} loading="lazy" />
            ) : (
              <span className="badge__placeholder" aria-hidden="true" />
            )}
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
      <div className="box-grid" role="list" aria-label="Golden Season limited drop boxes" ref={boxGridRef}>
        {goldenBoxes.map(box => {
          const rawQty = cart[box.key];
          const quantity = typeof rawQty === 'number' ? rawQty : 0;
          const isAtLimit = quantity >= MAX_BOX_QUANTITY;
          const showQuantityControls = quantity > 0;

          return (
            <article className={`box-card box-card--${box.key}`} key={box.key} role="listitem">
              <div className="box-card__media">
                {box.asset ? (
                  <img
                    src={box.asset.src}
                    alt={box.alt}
                    loading="lazy"
                    className="box-card__image"
                  />
                ) : (
                  <div
                    className={`box-card__placeholder box-card__placeholder--${box.placeholderTone}`}
                    role="img"
                    aria-label={box.alt}
                  />
                )}
              </div>
              <div className="box-card__body">
                <div className="box-card__header">
                  <h3>{box.title}</h3>
                  <span className="box-card__price">{box.priceLabel}</span>
                </div>
                <p className="box-card__tagline">{box.tagline}</p>
                {showQuantityControls && (
                  <div className="box-card__quantity" role="group" aria-label={`Adjust quantity for ${box.title}`}>
                    <button
                      type="button"
                      className="box-card__quantity-button"
                      onClick={() => handleQuantityChange(box, quantity - 1)}
                      disabled={quantity <= 0}
                      aria-label={`Decrease ${box.title} quantity`}
                    >
                      <span aria-hidden="true">-</span>
                    </button>
                    <span className="box-card__quantity-value" aria-live="polite">{quantity}</span>
                    <button
                      type="button"
                      className="box-card__quantity-button"
                      onClick={() => handleQuantityChange(box, quantity + 1)}
                      disabled={isAtLimit}
                      aria-label={`Increase ${box.title} quantity`}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                )}
                <div className="box-card__cta">
                  {showQuantityControls ? (
                    <button
                      type="button"
                      className="box-card__secondary"
                      data-product={box.key}
                      onClick={() => handleGiftExperience(box.key)}
                    >
                      Gift this Box
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="box-card__primary"
                        data-product={box.key}
                        onClick={() => handleAddToCart(box)}
                        disabled={isAtLimit}
                      >
                        Add to Cart
                      </button>
                      <button
                        type="button"
                        className="box-card__secondary"
                        data-product={box.key}
                        onClick={() => handleGiftExperience(box.key)}
                      >
                        Gift this Box
                      </button>
                    </>
                  )}
                </div>
                {limitNotices[box.key] && (
                  <p className="box-card__notice" role="status">
                    {LIMIT_NOTICE_COPY}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <section className="countdown" aria-label="Countdown to the next Golden Season drop">
        <div className="countdown__backdrop">
          {timerBackdrop ? (
            <img src={timerBackdrop.src} alt={timerAlt} loading="lazy" className="countdown__image" />
          ) : (
            <div className="countdown__placeholder" role="img" aria-label="Stylised hourglass illustration">
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="hourglassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f4d9b3" />
                    <stop offset="100%" stopColor="#d9a661" />
                  </linearGradient>
                </defs>
                <path
                  d="M18 6h28c1.66 0 3 1.34 3 3v2c0 2.71-1.5 5.19-3.9 6.5L36 24l9.1 6.5c2.4 1.31 3.9 3.79 3.9 6.5v2c0 1.66-1.34 3-3 3H18c-1.66 0-3-1.34-3-3v-2c0-2.71 1.5-5.19 3.9-6.5L28 24l-9.1-6.5C16.5 16.19 15 13.71 15 11V9c0-1.66 1.34-3 3-3Z"
                  fill="url(#hourglassGradient)"
                  opacity="0.8"
                />
                <path d="M24 11h16" stroke="#b97a30" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                <path d="M24 53h16" stroke="#b97a30" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              </svg>
            </div>
          )}
        </div>
        <div className="countdown__overlay">
          <div className="countdown__copy">
            <p className="countdown__eyebrow">Next Drop Timer</p>
            <h3>Countdown to the next bake window</h3>
            <p className="countdown__description">
              {timeLeft.total <= 0
                ? 'This batch is plating right now — explore the limited collection to grab yours.'
                : 'Reserve your box before the clock resets and the trays leave the kitchen.'}
            </p>
          </div>
          <div
            className="countdown__pill"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={countdownAnnouncement}
          >
            {countdownSegments.map(segment => (
              <div className="countdown__segment" key={segment.label}>
                <span className="countdown__value">{segment.value}</span>
                <span className="countdown__label">{segment.label}</span>
              </div>
            ))}
            <div className="countdown__seconds" aria-hidden="true">
              <span className="countdown__seconds-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="countdown__seconds-label">sec</span>
            </div>
          </div>
        </div>
      </section>
    </Section>
  );
}

const Section = styled.section`
  margin: var(--space-xl) auto;
  width: min(100%, 1100px);
  padding: 0 var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  .hero {
    display: grid;
    gap: var(--space-lg);
    align-items: center;
  }

  .media {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: var(--radius-lg, 18px);
    box-shadow: 0 22px 48px -28px rgba(91, 58, 32, 0.45);
    background: linear-gradient(135deg, rgba(248, 237, 220, 0.65), rgba(219, 166, 97, 0.6));
    aspect-ratio: 4 / 3;
    isolation: isolate;
  }

  .media__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition: opacity var(--duration-medium) ease;
    position: relative;
    z-index: 1;
  }

  .media--loaded .media__image {
    opacity: 1;
  }

  .media__skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(241, 181, 92, 0.35), rgba(248, 237, 220, 0.45), rgba(241, 181, 92, 0.35));
    animation: shimmer 1.6s ease-in-out infinite;
    z-index: 1;
  }

  .media__fallback {
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(135deg, rgba(241, 181, 92, 0.4) 0, rgba(241, 181, 92, 0.4) 12px, rgba(219, 166, 97, 0.45) 12px, rgba(219, 166, 97, 0.45) 24px);
  }

  .media__ambient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 2;
    mix-blend-mode: screen;
    opacity: 0.24;
    transition: opacity var(--duration-short) ease;
  }

  .media:hover .media__ambient {
    opacity: 0.16;
  }

  .media__ambient-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(6px) brightness(1.05) saturate(1.05);
    transform: scale(1.02);
  }

  .media__ambient--fallback {
    background: radial-gradient(circle at 20% 20%, rgba(255, 240, 220, 0.25), transparent 60%),
      radial-gradient(circle at 80% 30%, rgba(255, 214, 170, 0.2), transparent 65%),
      radial-gradient(circle at 50% 80%, rgba(219, 166, 97, 0.18), transparent 60%);
  }

  .media__ambient-particles {
    width: 120%;
    height: 120%;
    position: absolute;
    top: -10%;
    left: -10%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0, rgba(255, 255, 255, 0) 70%);
    animation: ambientDrift 14s ease-in-out infinite alternate;
    opacity: 0.35;
  }

  .copy {
    padding: var(--space-sm) 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .eyebrow {
    font-size: 0.85rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(91, 58, 32, 0.72);
    font-weight: 600;
  }

  h2 {
    font-size: clamp(2rem, 3vw + 1rem, 3.1rem);
    font-weight: 800;
    color: #5b3a20;
    line-height: 1.09;
    margin: 0;
  }

  .subhead {
    font-size: clamp(1rem, 1.2vw + 0.9rem, 1.35rem);
    color: rgba(106, 70, 41, 0.87);
    line-height: 1.6;
    max-width: 32ch;
  }

  .cta-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
  }

  .cta {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: 0.875rem 1.75rem;
    border-radius: var(--radius-pill, 999px);
    font-weight: 600;
    color: #ffffff;
    background: linear-gradient(135deg, #e6b76f 0%, #d49a58 45%, #b67837 100%);
    box-shadow: 0 16px 32px -18px rgba(91, 58, 32, 0.55);
    transition: transform var(--duration-short) ease, box-shadow var(--duration-short) ease;
    text-decoration: none;
  }

  .cta:hover,
  .cta:focus-visible {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 22px 36px -16px rgba(219, 166, 97, 0.45);
    outline: none;
  }

  .cta:active {
    transform: translateY(0) scale(0.99);
    box-shadow: 0 14px 24px -18px rgba(91, 58, 32, 0.45);
  }

  .cta-note {
    font-size: 0.8rem;
    color: rgba(91, 58, 32, 0.65);
  }

  .badge-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-sm);
    align-items: stretch;
    text-align: center;
  }

  .badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    background: rgba(248, 237, 220, 0.75);
    border-radius: var(--radius-md, 12px);
    border: 1px solid rgba(219, 166, 97, 0.35);
    box-shadow: 0 12px 30px -22px rgba(91, 58, 32, 0.45);
    transition: transform var(--duration-short) ease, box-shadow var(--duration-short) ease;
  }

  .badge:hover,
  .badge:focus-within {
    transform: translateY(-3px);
    box-shadow: 0 18px 36px -24px rgba(219, 166, 97, 0.5);
  }

  .badge img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .badge__placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(219, 166, 97, 0.25);
  }

  .badge span {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(91, 58, 32, 0.82);
    line-height: 1.2;
  }

  .box-grid {
    display: grid;
    gap: var(--space-md);
    scroll-margin-top: var(--space-xl);
  }

  .box-card {
    display: flex;
    flex-direction: column;
    background: rgba(255, 250, 243, 0.95);
    border-radius: var(--radius-lg, 18px);
    border: 1px solid rgba(219, 166, 97, 0.28);
    overflow: hidden;
    box-shadow: 0 22px 44px -28px rgba(91, 58, 32, 0.4);
    transition: transform var(--duration-short) ease, box-shadow var(--duration-short) ease;
    max-width: 340px;
    width: 100%;
    margin-inline: auto;
  }

  .box-card__media {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
  }

  .box-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .box-card__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .box-card__placeholder::before {
    content: '';
    width: 64%;
    height: 64%;
    border-radius: 26%;
    filter: blur(0.4px);
  }

  .box-card__placeholder--warm {
    background: linear-gradient(135deg, rgba(248, 219, 185, 0.7), rgba(219, 166, 97, 0.6));
  }

  .box-card__placeholder--warm::before {
    background: radial-gradient(circle at 30% 30%, rgba(255, 246, 228, 0.8), rgba(220, 164, 100, 0.8));
  }

  .box-card__placeholder--midnight {
    background: linear-gradient(135deg, rgba(36, 24, 18, 0.85), rgba(84, 52, 36, 0.75));
  }

  .box-card__placeholder--midnight::before {
    background: radial-gradient(circle at 60% 65%, rgba(255, 222, 150, 0.4), rgba(33, 22, 18, 0.9));
  }

  .box-card__placeholder--starlight {
    background: linear-gradient(135deg, rgba(255, 244, 230, 0.78), rgba(230, 203, 176, 0.72));
  }

  .box-card__placeholder--starlight::before {
    background: radial-gradient(circle at 50% 45%, rgba(255, 235, 215, 0.85), rgba(212, 176, 146, 0.65));
  }

  .box-card__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
  }

  .box-card__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .box-card__header h3 {
    font-size: 1.35rem;
    font-weight: 700;
    color: #4b2f1d;
    margin: 0;
  }

  .box-card__price {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.8rem;
    border-radius: var(--radius-pill, 999px);
    background: rgba(217, 163, 96, 0.18);
    color: #7a4b24;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .box-card__tagline {
    font-size: 0.95rem;
    line-height: 1.5;
    color: rgba(74, 47, 26, 0.78);
  }

  .box-card__quantity {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-xs);
    align-self: center;
    padding: 0.4rem 0.9rem;
    border-radius: var(--radius-pill, 999px);
    background: rgba(248, 237, 220, 0.82);
    border: 1px solid rgba(219, 166, 97, 0.28);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  }

  .box-card__quantity-button {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid rgba(219, 166, 97, 0.45);
    background: linear-gradient(135deg, rgba(230, 183, 111, 0.96), rgba(212, 154, 88, 0.85));
    color: #442a18;
    font-weight: 700;
    font-size: 1.1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--duration-short) ease, box-shadow var(--duration-short) ease, opacity var(--duration-short) ease;
  }

  .box-card__quantity-button:hover,
  .box-card__quantity-button:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 14px 24px -16px rgba(91, 58, 32, 0.45);
    outline: none;
  }

  .box-card__quantity-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .box-card__quantity-button:disabled:hover,
  .box-card__quantity-button:disabled:focus-visible {
    transform: none;
    box-shadow: none;
  }

  .box-card__quantity-value {
    min-width: 2ch;
    text-align: center;
    font-weight: 700;
    font-size: 1.05rem;
    color: #4b2f1d;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
  }

  .box-card__cta {
    display: grid;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
  }

  .box-card__primary,
  .box-card__secondary {
    border-radius: var(--radius-pill, 999px);
    padding: 0.75rem 1.4rem;
    font-weight: 600;
    font-size: 0.95rem;
    transition: transform var(--duration-short) ease, box-shadow var(--duration-short) ease;
    border: none;
  }

  .box-card__primary {
    background: linear-gradient(135deg, #e6b76f 0%, #d49a58 100%);
    color: #412715;
    box-shadow: 0 10px 24px -14px rgba(91, 58, 32, 0.5);
  }

  .box-card__primary:hover,
  .box-card__primary:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 16px 32px -14px rgba(219, 166, 97, 0.5);
    outline: none;
  }

  .box-card__secondary {
    background: rgba(248, 237, 220, 0.85);
    color: #5b3a20;
    border: 1px solid rgba(219, 166, 97, 0.42);
  }

  .box-card__secondary:hover,
  .box-card__secondary:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px -16px rgba(91, 58, 32, 0.45);
    outline: none;
  }

  .box-card__primary:disabled,
  .box-card__secondary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .box-card__notice {
    margin-top: var(--space-sm);
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(123, 75, 36, 0.88);
    text-align: center;
  }

  .box-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 28px 48px -26px rgba(91, 58, 32, 0.5);
  }

  .countdown {
    position: relative;
    margin-top: var(--space-xl);
    border-radius: var(--radius-lg, 18px);
    border: 1px solid rgba(219, 166, 97, 0.32);
    overflow: hidden;
    box-shadow: 0 30px 60px -28px rgba(91, 58, 32, 0.45);
    background: linear-gradient(135deg, rgba(255, 250, 243, 0.95), rgba(248, 237, 220, 0.85));
  }

  .countdown__backdrop {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .countdown__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(18px) brightness(0.92);
    transform: scale(1.05);
  }

  .countdown__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, rgba(244, 217, 179, 0.9), rgba(219, 166, 97, 0.55));
  }

  .countdown__overlay {
    position: relative;
    padding: var(--space-xl) var(--space-lg);
    display: grid;
    gap: var(--space-lg);
    z-index: 1;
  }

  .countdown__overlay::before {
    content: '';
    position: absolute;
    inset: var(--space-md);
    border-radius: var(--radius-lg, 18px);
    background: rgba(255, 250, 243, 0.7);
    backdrop-filter: blur(14px);
    z-index: -1;
  }

  .countdown__copy {
    display: grid;
    gap: var(--space-xs);
    color: #5b3a20;
  }

  .countdown__eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: rgba(91, 58, 32, 0.65);
    font-weight: 600;
  }

  .countdown__description {
    color: rgba(74, 47, 26, 0.75);
    line-height: 1.6;
    max-width: 40ch;
  }

  .countdown__pill {
    align-self: center;
    display: grid;
    grid-auto-flow: column;
    gap: var(--space-sm);
    padding: 0.9rem 1.6rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid rgba(219, 166, 97, 0.55);
    background: rgba(248, 237, 220, 0.82);
    box-shadow: 0 22px 42px -26px rgba(91, 58, 32, 0.4);
    position: relative;
  }

  .countdown__pill::after {
    content: '';
    position: absolute;
    inset: -12%;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(circle, rgba(219, 166, 97, 0.22), transparent 70%);
    animation: candleFlicker var(--duration-long, 600ms) ease-in-out infinite alternate;
    opacity: 0.7;
  }

  .countdown__segment {
    display: grid;
    gap: 0.25rem;
    text-align: center;
    min-width: 4ch;
  }

  .countdown__value {
    font-family: var(--font-mono, 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace);
    font-weight: 700;
    font-size: 1.5rem;
    color: #4b2f1d;
    letter-spacing: 0.08em;
  }

  .countdown__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(91, 58, 32, 0.65);
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  .countdown__seconds {
    display: grid;
    gap: 0.2rem;
    text-align: center;
    padding-left: var(--space-sm);
    border-left: 1px solid rgba(219, 166, 97, 0.3);
  }

  .countdown__seconds-value {
    font-family: var(--font-mono, 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace);
    font-weight: 600;
    color: rgba(123, 75, 36, 0.85);
  }

  .countdown__seconds-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(91, 58, 32, 0.55);
  }


  @keyframes ambientDrift {
    0% {
      transform: translate3d(-2%, -2%, 0) scale(1);
    }
    50% {
      transform: translate3d(2%, 3%, 0) scale(1.03);
    }
    100% {
      transform: translate3d(-1%, 1%, 0) scale(1.01);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-30%);
    }
    50% {
      transform: translateX(30%);
    }
    100% {
      transform: translateX(110%);
    }
  }

  @keyframes candleFlicker {
    0% {
      opacity: 0.35;
      transform: scale(1);
    }
    50% {
      opacity: 0.55;
      transform: scale(1.02);
    }
    100% {
      opacity: 0.3;
      transform: scale(1.01);
    }
  }

  @media (min-width: 768px) {
    .hero {
      grid-template-columns: 1.05fr 1fr;
    }

    .media {
      aspect-ratio: 16 / 9;
    }

    .cta-row {
      align-items: flex-start;
    }

    .box-grid {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .box-card__cta {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .countdown__overlay {
      grid-template-columns: 1.1fr auto;
      align-items: center;
    }
  }

  @media (min-width: 1024px) {
    .hero {
      gap: var(--space-xl);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .media__image,
    .media__skeleton,
  .media__ambient,
  .media__ambient-particles,
    .cta,
    .badge,
    .box-card,
    .box-card__primary,
    .box-card__secondary,
    .box-card__quantity-button,
    .countdown__pill::after {
      animation: none;
      transition: none;
    }

    .badge:hover,
    .badge:focus-within,
    .cta:hover,
    .cta:focus-visible,
    .box-card:hover,
    .box-card__primary:hover,
    .box-card__primary:focus-visible,
    .box-card__secondary:hover,
    .box-card__secondary:focus-visible,
    .box-card__quantity-button:hover,
    .box-card__quantity-button:focus-visible,
    .countdown__pill {
      transform: none;
      box-shadow: inherit;
    }

    .media__ambient {
      display: none;
    }
  }
`;