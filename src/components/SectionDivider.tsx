import { useEffect, useRef, useState } from 'react';

type SectionDividerProps = {
  color?: string; // hex or css color
  width?: number; // px
  className?: string;
};

export default function SectionDivider({ color = '#dba661', width = 140, className = '' }: SectionDividerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { root: null, threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`my-12 flex items-center justify-center opacity-0 animate-fade-in ${className}`}
      aria-hidden="true"
    >
      <div className={`divider-wrapper ${inView ? 'shimmer' : ''}`} style={{ width, height: 28 }}>
        <svg viewBox="0 0 200 40" width={width} height={28} style={{ display: 'block' }} aria-hidden="true">
          <title>decorative divider</title>
          <defs>
            <clipPath id="sweepClip">
              <rect className="sweepRect" x="-80" y="0" width="80" height="40" />
            </clipPath>
          </defs>
          {/* Base ornament stroke */}
          <g stroke={color} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* minimal symmetric flourish */}
            <path id="ornamentPath" d="M10 20 C 40 5, 60 35, 100 20 C 140 5, 160 35, 190 20" />
            <circle cx="100" cy="20" r="2.2" fill={color} />
          </g>
          {/* Shimmer overlay using clip-path sweep (low opacity, gentle) */}
          <g clipPath="url(#sweepClip)" opacity="0.3">
            <g stroke="#f1b55c" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <use href="#ornamentPath" />
              <circle cx="100" cy="20" r="2.2" fill="#f1b55c" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
