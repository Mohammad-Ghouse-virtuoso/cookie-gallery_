import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GiftForm from '@/components/gifting/GiftForm';
import { getGoldenSeasonBox } from '@/data/goldenSeasonBoxes';
import { useGiftExperience } from '@/context/GiftExperienceContext';
import { getLastGiftId, setLastGiftId } from '@/lib/giftFormStorage';

export default function GiftExperiencePage() {
  const { boxId } = useParams<{ boxId: string }>();
  const navigate = useNavigate();
  const { closeModal } = useGiftExperience();
  const [formEpoch, setFormEpoch] = useState(0);

  useEffect(() => {
    // Ensure modal state is cleared when navigating directly to the page.
    closeModal();
  }, [closeModal]);

  const box = useMemo(() => getGoldenSeasonBox(boxId), [boxId]);

  useEffect(() => {
    if (!boxId) {
      return;
    }
    const lastGiftId = getLastGiftId();
    if (lastGiftId && lastGiftId !== boxId) {
      setFormEpoch(counter => counter + 1);
    }
    setLastGiftId(boxId);
  }, [boxId]);

  const handleExit = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
      return;
    }
    navigate('/golden-season');
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit]);

  return (
    <main
      className="bg-[#FFF9F4] text-[#3B2B1A]"
      style={{ minHeight: 'calc(100vh - 112px)' }}
    >
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-10 px-6 pt-12 pb-16 md:px-10">
        <header className="space-y-3">
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6B5E57] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] hover:text-[#2F2116] active:text-[#2F2116] cursor-pointer no-underline"
          >
            ← Back to Golden Season boxes
          </button>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Golden Season Gifting</p>
            <h1
              id="gift-page-heading"
              className="text-3xl font-semibold text-[#3B2B1A] sm:text-[2.75rem]"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Make Someone Smile
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#6B5E57]">
              Personalise the box, your handwritten note, and delivery details. We’ll wrap everything in satin ribbons and send it straight to their doorstep.
            </p>
          </div>
        </header>

  <section className="rounded-[14px] border border-[rgba(226,185,127,0.24)] bg-[#FFF6F0] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)] md:p-10">
          {box ? (
            <GiftForm
              key={`${box?.key ?? 'gift'}:${formEpoch}`}
              box={box}
              mode="page"
              onRequestClose={handleExit}
              headingId="gift-page-heading"
              giftId={box?.key ?? null}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-base text-[#6B5E57]">
                We couldn’t find that Golden Season box. Please return to browse the collection.
              </p>
              <button
                type="button"
                onClick={() => navigate('/golden-season')}
                className="rounded-[10px] bg-[#3B2B1A] px-6 py-2.5 text-sm font-semibold text-[#FFF6F0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)]"
              >
                View Golden Season boxes
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
