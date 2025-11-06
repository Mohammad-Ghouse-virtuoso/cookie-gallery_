import { Link } from 'react-router-dom';

import heroPlatter from '../assets/Hero-cookie-platter.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import packaging from '../assets/packaging_new2.jpeg';
import cookieBox from '../assets/Cookie-gallery-bake.jpeg';

type SeasonKey = 'golden' | 'spring' | 'winter' | 'diwali' | 'custom';

type SeasonTheme = {
  gradient: string;
  headline: string;
  subtext: string;
  ctaBg: string;
  ctaText: string;
};

const THEMES: Record<SeasonKey, SeasonTheme> = {
  golden: {
    gradient: 'linear-gradient(90deg, #faf3e5 0%, #f7dfb9 60%, #f5cbb0 100%)',
    headline: 'The Golden Season',
    subtext: 'Celebrate warmth, joy, and the art of sweetness.',
    ctaBg: '#f1b55c',
    ctaText: '#3a2310',
  },
  spring: {
    gradient: 'linear-gradient(90deg, #f1f8f4 0%, #d9f0e6 60%, #f9ead9 100%)',
    headline: 'Spring Delights',
    subtext: 'Fresh notes and light textures in bloom.',
    ctaBg: '#79d0a3',
    ctaText: '#123a28',
  },
  winter: {
    gradient: 'linear-gradient(90deg, #f5f7fb 0%, #eaeff7 60%, #e6e2dc 100%)',
    headline: 'Winter Indulgence',
    subtext: 'Cozy bakes, deep cocoa, and soft spice.',
    ctaBg: '#c9b39c',
    ctaText: '#2b1e13',
  },
  diwali: {
    gradient: 'linear-gradient(90deg, #fff5e0 0%, #ffd7a3 60%, #ffc2a1 100%)',
    headline: 'Festival of Sweets',
    subtext: 'Gilded flavors, joyful gatherings.',
    ctaBg: '#f2a14f',
    ctaText: '#3a2310',
  },
  custom: {
    gradient: 'linear-gradient(90deg, #fafafa 0%, #f0f0f0 100%)',
    headline: 'Seasonal Collection',
    subtext: 'Limited creations for special days.',
    ctaBg: '#bbbbbb',
    ctaText: '#1a1a1a',
  },
};

export default function FestiveBanner({ season = 'golden' as SeasonKey }: { season?: SeasonKey }) {
  const theme = THEMES[season] || THEMES.golden;
  // Normalize imagetools picture output defensively in case plugin returns a single source or different shape
  const sourcesNormalized = Array.isArray((heroPlatter as any)?.sources)
    ? (heroPlatter as any).sources
    : ((heroPlatter as any)?.sources ? [ (heroPlatter as any).sources ] : []);
  const imgPayload = (heroPlatter as any)?.img || {};
  const imgSrc = imgPayload.src || cookieBox; // fallback to cookieBox if imagetools payload missing
  const imgW = imgPayload.w || 768;
  const imgH = imgPayload.h || 512;
  return (
    <section
      aria-label="The Golden Season limited festive drop"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-8"
    >
  <div className="group relative overflow-hidden rounded-2xl animate-hue-osc" style={{ background: theme.gradient }}>
        {/* readability overlay for dynamic gradient */}
  <div className="pointer-events-none absolute inset-0 bg-white/10 sm:bg-white/10 md:bg-white/5 lg:bg-white/0" aria-hidden="true" />
        {/* soft particle flares */}
        <div className="pointer-events-none absolute inset-0">
          {/* reduce density on mobile: show 1-2 flares */}
          <div className="absolute w-40 h-40 bg-white rounded-full opacity-10 blur-3xl animate-slow-drift left-6 top-6 md:w-48 md:h-48" />
          <div className="hidden sm:block absolute w-28 h-28 bg-white rounded-full opacity-8 blur-2xl animate-slow-drift left-1/2 -translate-x-1/2 top-10 md:w-36 md:h-36" />
          <div className="hidden md:block absolute w-56 h-56 bg-white rounded-full opacity-6 blur-3xl animate-slow-drift right-8 bottom-10" />
        </div>

        <div className="relative px-6 py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* text side */}
            <div className="text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-[#3a2310] mb-3">
                <span className="block animate-fade-scale">{theme.headline}</span>
              </h2>
              <p className="text-lg text-[#4a2f1a] max-w-xl mx-auto md:mx-0 animate-fade-in animation-delay-200">{theme.subtext}</p>

              <div className="mt-6 animate-fade-in animation-delay-400">
                <Link
                  to="/cookies?filter=limited"
                  className="cta-glow inline-block w-full sm:w-auto rounded-full py-4 px-7 sm:px-8"
                  style={{ backgroundColor: theme.ctaBg, color: theme.ctaText }}
                >
                  Shop Limited Drops
                </Link>
              </div>
            </div>

            {/* image side */}
            <div className="order-first md:order-last flex items-end justify-center md:justify-end">
              <div className="relative w-64 h-44 sm:w-80 sm:h-56 lg:w-96 lg:h-64 animate-fade-in animation-delay-300">
                <picture>
                  {sourcesNormalized.map((s: any, idx: number) => (
                    <source key={s?.type || idx} type={s?.type} srcSet={s?.srcset} sizes="(min-width: 1024px) 32rem, 75vw" />
                  ))}
                  <img
                    src={imgSrc}
                    width={imgW}
                    height={imgH}
                    alt="Festive cookie platter on marble surface"
                    className="w-full h-full object-cover rounded-xl shadow-2xl brightness-95"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
                {/* overlay product cluster - decorative but with descriptive alt */}
                <img src={cookieBox} alt="Cookie gift box with golden tones" className="absolute -bottom-6 -left-6 w-32 h-20 object-cover rounded-lg shadow-lg transform rotate-2" />
                <img src={packaging} alt="Cookie packaging with warm palette" className="absolute -bottom-8 -right-8 w-28 h-20 object-cover rounded-lg shadow-lg transform -rotate-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
