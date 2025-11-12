import { memo, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { GoldenSeasonBox } from '@/data/goldenSeasonBoxes';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1548365328-5b79c2ef0003?auto=format&fit=crop&w=640&q=80';

type GiftPreviewCardProps = {
  box?: GoldenSeasonBox;
  recipientName: string;
  senderName: string;
  message: string;
  instructions: string;
  showWrapped: boolean;
  mode: 'page' | 'modal';
};

function GiftPreviewCardComponent({
  box,
  recipientName,
  senderName,
  message,
  instructions,
  showWrapped,
  mode,
}: GiftPreviewCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const toName = recipientName || 'Someone Special';
  const fromName = senderName || 'You';
  const note = message || 'Two warm lines will appear here once you add them.';
  const deliveryHint = instructions ? `Note for courier: ${instructions}` : 'Add a delivery note so we can plan the surprise.';

  const imageSrc = useMemo(() => box?.previewImage ?? FALLBACK_IMAGE, [box?.previewImage]);
  const imageAlt = useMemo(() => box?.previewAlt ?? 'Gift box preview', [box?.previewAlt]);

  return (
    <aside
      ref={containerRef}
      className="rounded-[14px] border border-[rgba(226,185,127,0.28)] bg-[#FFF1E5] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
      onMouseMove={event => {
        if (!containerRef.current || mode === 'modal') return;
        const bounds = containerRef.current.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        setOffset({ x: (x - 0.5) * 8, y: (y - 0.5) * 8 });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-[14px] bg-[#FDE7D7] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
        <div className="relative aspect-[4/3] w-full">
          <motion.img
            src={imageSrc}
            alt={imageAlt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            animate={{ x: offset.x, y: offset.y }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
          />
        </div>
        <AnimatePresence>
          {showWrapped && (
            <motion.div
              key="ribbon"
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.32, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              <div
                className="absolute top-[-20%] left-[-35%] h-[140%] w-[170%] origin-center rotate-12"
                style={{
                  background: 'linear-gradient(135deg, rgba(234,210,181,0.82), rgba(210,151,92,0.95))',
                  boxShadow: 'inset 0 1px 4px rgba(255,255,255,0.65), 0 12px 24px rgba(80,45,20,0.18)',
                }}
              >
                <div
                  className="absolute inset-x-10 top-1/2 h-2 -translate-y-1/2 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,245,230,0.6), rgba(234,197,150,0.4), rgba(255,245,230,0.6))',
                  }}
                />
              </div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: [0.6, 0.95, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="flex flex-col items-center text-[#3B2B1A] drop-shadow">
                  <span className="text-xs uppercase tracking-[0.38em]">Wrapped</span>
                  <span className="text-2xl">🎀</span>
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#E2B97F] via-[#F5D8A6] to-[#FFF3E1]" aria-hidden="true" />
      </div>

      <p className="mt-2 text-sm text-[#6B5E57]">Wrapped in gold satin with handwritten note</p>

      <div className="mt-5 space-y-3 text-[#3B2B1A]">
        <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Gift Preview</p>
        <h3 className="text-2xl font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
          Make Someone Smile
        </h3>
        <div className="rounded-[14px] border border-[rgba(226,185,127,0.28)] bg-white/90 px-5 py-4 shadow-[inset_0_1px_2px_rgba(226,185,127,0.2)]">
          <p className="text-lg font-medium">To: <span className="font-semibold">{toName}</span></p>
          <p className="mt-1 text-base">From: <span className="font-semibold">{fromName}</span></p>
          <p className="mt-3 text-sm leading-relaxed text-[#6B5E57]">{note}</p>
        </div>
        <p className="rounded-[14px] border border-dashed border-[rgba(226,185,127,0.42)] bg-[#FFF6F0] px-4 py-3 text-xs leading-relaxed text-[#6B5E57]">
          {deliveryHint}
        </p>
      </div>
    </aside>
  );
}

export const GiftPreviewCard = memo(GiftPreviewCardComponent);
