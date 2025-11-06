import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cookies } from '../data/cookies';
import chocoCarousel from '../assets/Choco_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import oatCarousel from '../assets/Oat_meal_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import peanutCarousel from '../assets/Peanut_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import redVelvetCarousel from '../assets/Red_velvet_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import cranberryCarousel from '../assets/Cranberry_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import matchaCarousel from '../assets/Matcha_white_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import caramelCarousel from '../assets/Caramel_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';
import seaSaltCarousel from '../assets/Sea_salt_carousel.jpg?w=640;960;1440;1920&format=avif;webp;jpg&as=picture';

// Build ordered picks from the specified cookie names using carousel assets
const desiredOrder = [
  'Choco cookie',
  'Oatmeal cookie',
  'Peanut cookie',
  'Red Velvet Cookie',
  'Cranberry cookie',
  'Matcha White Choc',
  'Salted Caramel Cookie',
  'Dark Choco Sea Salt'
];

const carouselAssets: Record<string, any> = {
  'Choco cookie': chocoCarousel,
  'Oatmeal cookie': oatCarousel,
  'Peanut cookie': peanutCarousel,
  'Red Velvet Cookie': redVelvetCarousel,
  'Cranberry cookie': cranberryCarousel,
  'Matcha White Choc': matchaCarousel,
  'Salted Caramel Cookie': caramelCarousel,
  'Dark Choco Sea Salt': seaSaltCarousel,
};

const picksOrdered = desiredOrder.map(name => {
  const found = cookies.find(c => c.name === name);
  if (!found) return null;
  return { ...found, src: carouselAssets[name] || found.src };
}).filter(Boolean) as typeof cookies;

const picks = picksOrdered.length > 0 ? picksOrdered : cookies.slice(0, 8);

const TRANSITION_DURATION = 1.2; // seconds
const INTERVAL = 4000; // ms
const EASE_OUT_CUBIC: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

export default function BestsellerCarousel() {
  const [index, setIndex] = React.useState(0);
  const navigate = useNavigate();
  const [loaded, setLoaded] = React.useState<Record<string, boolean>>({});
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    if (prefersReduced) return; // don't auto-advance if reduced motion preferred
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % picks.length);
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [prefersReduced]);

  return (
    <section className="w-full py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFF8EC] to-[#F6EBD8] shadow-lg carousel-ambient">
          <div className="relative w-full h-72 sm:h-96 lg:h-112">
            <div className="ambient-shimmer" aria-hidden="true"></div>
            <AnimatePresence mode="popLayout" initial={false}>
              {picks.map((cookie, i) => {
                const isVisible = i === index;
                return (
                  isVisible && (
                    <motion.div
                      key={cookie.id}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.03 }}
                      transition={{ duration: TRANSITION_DURATION, ease: 'easeInOut' }}
                      className="absolute inset-0 flex items-center justify-center cursor-pointer carousel-item"
                      style={{ willChange: 'opacity, transform' }}
                      onClick={() => {
                        // Navigate to catalogue and pass highlight state
                        navigate('/cookies', { state: { highlight: cookie.id } });
                      }}
                    >
                      {/* Shimmer placeholder while image loads */}
                      <div className="image-frame ambient-glow absolute inset-0">
                        {!loaded[cookie.id] && (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
                        )}
                        {(() => {
                          // Normalize imagetools picture output defensively
                          const srcData = cookie.src as any;
                          const sourcesNormalized = Array.isArray(srcData?.sources)
                            ? srcData.sources
                            : (srcData?.sources ? [srcData.sources] : []);
                          const imgPayload = srcData?.img || {};
                          const imgSrc = imgPayload.src || (typeof cookie.src === 'string' ? cookie.src : '');
                          const imgW = imgPayload.w || 1920;
                          const imgH = imgPayload.h || 1280;

                          return typeof srcData?.sources !== 'undefined' ? (
                            <picture>
                              {sourcesNormalized.map((s: any, idx: number) => (
                                <source key={s?.type || idx} type={s?.type} srcSet={s?.srcset} sizes="100vw" />
                              ))}
                              <img
                                src={imgSrc}
                                width={imgW}
                                height={imgH}
                                alt={cookie.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onLoad={() => setLoaded(prev => ({ ...prev, [cookie.id]: true }))}
                                onError={() => setLoaded(prev => ({ ...prev, [cookie.id]: true }))}
                                style={{ display: 'block', filter: 'brightness(0.95)' }}
                              />
                            </picture>
                          ) : (
                            <img
                              src={imgSrc}
                              alt={cookie.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              onLoad={() => setLoaded(prev => ({ ...prev, [cookie.id]: true }))}
                              onError={() => setLoaded(prev => ({ ...prev, [cookie.id]: true }))}
                              style={{ display: 'block', filter: 'brightness(0.95)' }}
                            />
                          );
                        })()}
                        {/* Light sweep & gloss overlays */}
                        <div className="img-light-sweep" aria-hidden="true"></div>
                        <div className="img-gloss" aria-hidden="true"></div>
                      </div>

                      {/* Bottom translucent gradient overlay for text legibility */}
                      <div
                        aria-hidden="true"
                        className="absolute left-0 right-0 bottom-0 pointer-events-none"
                        style={{
                          height: '40%',
                          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.28) 100%)',
                          zIndex: 1
                        }}
                      />

                      {/* Lower-third overlay: name + tagline */}
                      <div className="absolute left-0 right-0 bottom-[10%] flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
                        <div className="text-center max-w-2xl px-4">
                          <motion.h3
                            aria-label={`Cookie name ${cookie.name}`}
                            initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            animate={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                            exit={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
                            transition={{ duration: 0.7, delay: 0.18, ease: EASE_OUT_CUBIC }}
                            className="font-black uppercase leading-[1.15]"
                            style={{ 
                              fontFamily: '"Playfair Display", Georgia, serif', 
                              fontWeight: 900, 
                              fontSize: 'clamp(1.75rem, 5vw, 4rem)',
                              letterSpacing: '0.02em',
                              color: '#fffef9',
                              textShadow: '2px 4px 18px rgba(0,0,0,0.28), 0 2px 8px rgba(91,58,32,0.15)',
                              background: 'linear-gradient(180deg, #fffef9 0%, #f5e8d8 80%, #dba661 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}
                          >
                            {cookie.name}
                          </motion.h3>

                          <motion.p
                            aria-label={`Tagline ${cookie.tagline || ''}`}
                            initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                            animate={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                            exit={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
                            transition={{ duration: 0.7, delay: 0.22, ease: EASE_OUT_CUBIC }}
                            className="mt-3 font-medium leading-[1.2]"
                            style={{ 
                              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              fontWeight: 500,
                              fontSize: 'clamp(0.875rem, 2vw, 1.375rem)',
                              letterSpacing: '0.01em',
                              color: '#f5e0c3',
                              opacity: 0.75,
                              textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}
                          >
                            {cookie.tagline}
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>
                  )
                );
              })}
            </AnimatePresence>
            
            {/* Compact dot pagination - like reference image */}
            <div 
              className="absolute bottom-4 left-0 right-0 flex items-center justify-center carousel-pagination" 
              style={{ 
                zIndex: 3,
                pointerEvents: 'none' // Container doesn't block
              }}
            >
              <div className="flex items-center gap-2.5 py-2" style={{ pointerEvents: 'auto' }}>
                {picks.map((p, idx) => {
                  const active = idx === index;
                  return (
                    <button
                      key={p.id}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIndex(idx); 
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setIndex(idx);
                        }
                      }}
                      aria-label={`Go to slide ${idx + 1}: ${p.name}`}
                      aria-current={active ? 'true' : 'false'}
                      tabIndex={0}
                      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f1b55c] focus-visible:ring-offset-1" 
                      style={{
                        width: active ? 10 : 8,
                        height: active ? 10 : 8,
                        padding: 0,
                        background: active ? '#f1b55c' : '#e9dfd0',
                        border: active ? 'none' : '1px solid rgba(233, 223, 208, 0.6)',
                        transform: active ? 'scale(1.2)' : 'scale(1)',
                        opacity: active ? 1 : 0.65,
                        transition: prefersReduced 
                          ? 'none' 
                          : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, background 0.2s ease',
                        cursor: 'pointer',
                        willChange: 'transform, opacity',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
