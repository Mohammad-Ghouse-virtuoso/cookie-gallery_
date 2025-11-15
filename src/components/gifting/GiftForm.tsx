import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GiftProgressBar } from './GiftProgressBar';
import { GiftPreviewCard } from './GiftPreviewCard';
import { persistGiftAddress, getEmptyAddress, readStoredAddress } from '@/lib/giftFormStorage';
import type { GiftAddress, GiftFormState, GiftRecipientType } from '@/types/giftExperience';
import type { GoldenSeasonBox } from '@/data/goldenSeasonBoxes';
import { useCart } from '@/context/CartContext';
import type { CartGiftDetails, CartStateWithMeta } from '@/types/cart';

const TOTAL_STEPS = 4;

type RecipientOption = {
  id: GiftRecipientType;
  label: string;
  emoji: string;
  description: string;
};

const recipientOptions: RecipientOption[] = [
  { id: 'mom', label: 'Mom', emoji: '🌸', description: 'Add a hug in satin ribbon' },
  { id: 'dad', label: 'Dad', emoji: '🎩', description: 'Pair it with their evening chai' },
  { id: 'friend', label: 'Friend', emoji: '🤝', description: 'Treat your favourite co-conspirator' },
  { id: 'girlfriend', label: 'Girlfriend', emoji: '💐', description: 'Sweeten tonight’s love note' },
  { id: 'boyfriend', label: 'Boyfriend', emoji: '🎧', description: 'Cue the midnight snack playlist' },
  { id: 'spouse', label: 'Spouse', emoji: '💍', description: 'Celebrate the forever kind of love' },
  { id: 'custom', label: 'Custom', emoji: '📝', description: 'Use the name they love most' },
];

const personaVisuals: Record<GiftRecipientType, {
  idleBg: string;
  selectedBg: string;
  accent: string;
  emojiBg: string;
  shadow: string;
}> = {
  mom: {
    idleBg: 'rgba(255, 247, 242, 0.95)',
    selectedBg: 'linear-gradient(145deg, rgba(248, 227, 201, 0.96), rgba(240, 196, 155, 0.88))',
    accent: '#E0A96D',
    emojiBg: 'rgba(224, 169, 109, 0.16)',
    shadow: '0 18px 36px rgba(224, 169, 109, 0.28)',
  },
  dad: {
    idleBg: 'rgba(252, 244, 236, 0.92)',
    selectedBg: 'linear-gradient(145deg, rgba(236, 209, 179, 0.95), rgba(205, 155, 105, 0.82))',
    accent: '#C08C5C',
    emojiBg: 'rgba(192, 140, 92, 0.16)',
    shadow: '0 18px 36px rgba(192, 140, 92, 0.28)',
  },
  friend: {
    idleBg: 'rgba(253, 245, 232, 0.94)',
    selectedBg: 'linear-gradient(145deg, rgba(245, 216, 176, 0.95), rgba(214, 163, 110, 0.82))',
    accent: '#B88958',
    emojiBg: 'rgba(184, 137, 88, 0.16)',
    shadow: '0 18px 36px rgba(184, 137, 88, 0.28)',
  },
  girlfriend: {
    idleBg: 'rgba(255, 246, 247, 0.94)',
    selectedBg: 'linear-gradient(145deg, rgba(252, 226, 232, 0.96), rgba(237, 183, 197, 0.84))',
    accent: '#D9A2B0',
    emojiBg: 'rgba(217, 162, 176, 0.18)',
    shadow: '0 18px 36px rgba(217, 162, 176, 0.3)',
  },
  boyfriend: {
    idleBg: 'rgba(243, 246, 255, 0.94)',
    selectedBg: 'linear-gradient(145deg, rgba(220, 231, 255, 0.95), rgba(167, 190, 238, 0.85))',
    accent: '#9FB4E0',
    emojiBg: 'rgba(159, 180, 224, 0.2)',
    shadow: '0 18px 36px rgba(159, 180, 224, 0.28)',
  },
  spouse: {
    idleBg: 'rgba(250, 244, 255, 0.94)',
    selectedBg: 'linear-gradient(145deg, rgba(235, 220, 251, 0.95), rgba(197, 169, 229, 0.84))',
    accent: '#B897D9',
    emojiBg: 'rgba(184, 151, 217, 0.18)',
    shadow: '0 18px 36px rgba(184, 151, 217, 0.3)',
  },
  custom: {
    idleBg: 'rgba(242, 248, 246, 0.94)',
    selectedBg: 'linear-gradient(145deg, rgba(220, 237, 232, 0.95), rgba(178, 211, 199, 0.84))',
    accent: '#8AA8A1',
    emojiBg: 'rgba(138, 168, 161, 0.2)',
    shadow: '0 18px 36px rgba(138, 168, 161, 0.28)',
  },
};

const fieldBaseClass =
  'mt-2 w-full rounded-[8px] border border-[rgba(58,45,36,0.12)] bg-[#FFF9F4] px-4 py-3 text-sm text-[#3B2B1A] placeholder:text-[#B9AFA6] shadow-[inset_0_1px_2px_rgba(58,45,36,0.04)] transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#CFA676] focus-visible:shadow-[0_0_0_4px_rgba(226,185,127,0.18)]';


function isAddressEmpty(address: GiftAddress) {
  return !address.fullName.trim()
    && !address.phone.trim()
    && !address.line1.trim()
    && !address.line2.trim()
    && !address.city.trim()
    && !address.pincode.trim()
    && !address.landmark.trim();
}

type FormErrors = Record<string, string>;

type GiftFormProps = {
  box?: GoldenSeasonBox;
  mode: 'page' | 'modal';
  onRequestClose: (options?: { canceled?: boolean }) => void;
  onFlowComplete?: () => void;
  headingId?: string;
  scrollParentRef?: RefObject<HTMLElement | null>;
  giftId?: string | null;
};

function buildInitialForm(addressOverride?: GiftAddress): GiftFormState {
  return {
    recipientType: 'mom',
    customRecipient: '',
    senderName: '',
    message: '',
    instructions: '',
    showWrappedPreview: false,
    address: addressOverride ? { ...addressOverride } : getEmptyAddress(),
  };
}

function useMedia(maxWidth: number) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [maxWidth]);

  return matches;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default function GiftForm({ box, mode, onRequestClose, onFlowComplete, headingId, scrollParentRef, giftId }: GiftFormProps) {
  const navigate = useNavigate();
  const isTablet = useMedia(1023);
  const { setCart } = useCart();
  const formRootRef = useRef<HTMLDivElement | null>(null);
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const personaButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const cachedAddressRef = useRef<GiftAddress | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const indicatorTimeoutRef = useRef<number | null>(null);
  const hasUserEditedAddress = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<GiftFormState>(() => buildInitialForm()); // Local state keeps inputs stable to avoid caret jumps.
  const [errors, setErrors] = useState<FormErrors>({});
  const [announcement, setAnnouncement] = useState('');
  const [addressStatus, setAddressStatus] = useState<'idle' | 'dirty' | 'saved'>('idle');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const activeGiftId = giftId ?? box?.key ?? 'default';

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    cachedAddressRef.current = null;
    hasUserEditedAddress.current = false;
    setAddressStatus('idle');

    (async () => {
      if (!activeGiftId) {
        setHydrated(true);
        return;
      }
      const cached = await readStoredAddress(activeGiftId);
      if (cancelled) {
        return;
      }
      if (cached && !isAddressEmpty(cached)) {
        const hydratedAddress = { ...cached };
        cachedAddressRef.current = hydratedAddress;
        setForm(buildInitialForm(hydratedAddress));
        setAddressStatus('saved');
      } else {
        const emptyAddress = getEmptyAddress();
        cachedAddressRef.current = emptyAddress;
        setForm(buildInitialForm(emptyAddress));
        setAddressStatus('idle');
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeGiftId]);

  const debouncedSender = useDebouncedValue(form.senderName, 220);
  const debouncedCustomRecipient = useDebouncedValue(form.customRecipient, 220);
  const debouncedInstructions = useDebouncedValue(form.instructions, 220);

  useEffect(() => {
    setAnnouncement(`Step ${activeStep + 1} of ${TOTAL_STEPS}`);
  }, [activeStep]);

  useEffect(() => {
    if (addressStatus !== 'saved') {
      return;
    }
    if (indicatorTimeoutRef.current) {
      window.clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = window.setTimeout(() => {
      setAddressStatus('idle');
      indicatorTimeoutRef.current = null;
    }, 2200);
    return () => {
      if (indicatorTimeoutRef.current) {
        window.clearTimeout(indicatorTimeoutRef.current);
        indicatorTimeoutRef.current = null;
      }
    };
  }, [addressStatus]);

  useEffect(() => () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    if (indicatorTimeoutRef.current) {
      window.clearTimeout(indicatorTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !activeGiftId) {
      return;
    }
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      persistGiftAddress(activeGiftId, form.address);
      cachedAddressRef.current = form.address;
      if (hasUserEditedAddress.current) {
        setAddressStatus('saved');
        hasUserEditedAddress.current = false;
      }
    }, 240);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [form.address, hydrated, activeGiftId]);

  useEffect(() => {
    const scroller = scrollParentRef?.current ?? internalScrollRef.current;
    if (scroller) {
      window.requestAnimationFrame(() => {
        if (typeof scroller.scrollTo === 'function') {
          scroller.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          scroller.scrollTop = 0;
        }
      });
    }

    window.requestAnimationFrame(() => {
      const rootNode = formRootRef.current;
      if (!rootNode) {
        return;
      }
      const currentStepNode = rootNode.querySelector<HTMLElement>(`[data-step="${activeStep}"] [data-step-focus="true"]`);
      currentStepNode?.focus({ preventScroll: true });
    });
  }, [activeStep, scrollParentRef]);

  const handleAddressChange = useCallback((updates: Partial<GiftAddress>) => {
    hasUserEditedAddress.current = true;
    if (indicatorTimeoutRef.current) {
      window.clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
    setAddressStatus('dirty');
    setForm(previous => ({
      ...previous,
      address: {
        ...previous.address,
        ...updates,
      },
    }));
  }, []);

  const handleFormChange = useCallback((updates: Partial<Omit<GiftFormState, 'address'>>) => {
    setForm(previous => ({
      ...previous,
      ...updates,
    }));
  }, []);

  const resetFlow = useCallback(() => {
    setActiveStep(0);
    setErrors({});
    setForm(() => ({
      ...buildInitialForm(cachedAddressRef.current ?? undefined),
      address: cachedAddressRef.current ? { ...cachedAddressRef.current } : getEmptyAddress(),
    }));
    setAddressStatus(cachedAddressRef.current && !isAddressEmpty(cachedAddressRef.current) ? 'saved' : 'idle');
  }, []);

  const recipientDisplayName = useMemo(() => {
    if (form.recipientType === 'custom') {
      return debouncedCustomRecipient.trim() || 'Someone Special';
    }
    const option = recipientOptions.find(item => item.id === form.recipientType);
    return option?.label ?? 'Someone Special';
  }, [debouncedCustomRecipient, form.recipientType]);

  const validateActiveStep = useCallback(() => {
    const stepErrors: FormErrors = {};
    if (activeStep === 0) {
      if (form.recipientType === 'custom' && !form.customRecipient.trim()) {
        stepErrors.customRecipient = 'Please tell us who you are gifting.';
      }
    }
    if (activeStep === 1) {
      if (!form.senderName.trim()) {
        stepErrors.senderName = 'Add your name so we can hand-letter the note.';
      }
    }
    if (activeStep === 2) {
      const { fullName, phone, line1, city, pincode } = form.address;
      if (!fullName.trim()) stepErrors.fullName = 'Recipient name is required.';
      if (!phone.trim()) stepErrors.phone = 'Phone number helps our courier reach them.';
      if (!line1.trim()) stepErrors.line1 = 'Address line is required.';
      if (!city.trim()) stepErrors.city = 'City is required.';
      if (!pincode.trim()) stepErrors.pincode = 'Pincode is required.';
    }
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      const [firstField] = Object.keys(stepErrors);
      const node = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${firstField}"]`);
      node?.focus({ preventScroll: false });
      node?.setSelectionRange(node.value.length, node.value.length);
      return false;
    }
    return true;
  }, [activeStep, form.address, form.customRecipient, form.recipientType, form.senderName]);

  const goNext = useCallback(() => {
    if (validateActiveStep()) {
      setActiveStep(previous => Math.min(TOTAL_STEPS - 1, previous + 1));
    }
  }, [validateActiveStep]);

  const goPrevious = useCallback(() => {
    if (activeStep === 0) {
      onRequestClose({ canceled: true });
      resetFlow();
      return;
    }
    setActiveStep(previous => Math.max(0, previous - 1));
  }, [activeStep, onRequestClose, resetFlow]);

  const giftOrderData = useMemo(() => {
    if (!box) return undefined;
    const recipientName = form.recipientType === 'custom' && form.customRecipient.trim()
      ? form.customRecipient.trim()
      : recipientDisplayName;
    return {
      isGift: true,
      giftBoxKey: box.key,
      giftBoxTitle: box.title,
      senderName: form.senderName.trim(),
      recipientType: form.recipientType,
      recipientName,
      message: form.message.trim(),
      instructions: form.instructions.trim(),
      address: form.address,
    };
  }, [box, form.address, form.customRecipient, form.instructions, form.message, form.recipientType, form.senderName, recipientDisplayName]);

  const addressSummary = useMemo(() => {
    const { fullName, phone, line1, line2, city, pincode, landmark } = form.address;
    const lines = [line1, line2, city, pincode].map(value => value?.trim()).filter(Boolean) as string[];
    return {
      fullName: fullName.trim(),
      phone: phone.trim(),
      lines,
      landmark: landmark.trim(),
    };
  }, [form.address]);

  const handleConfirmGift = useCallback(() => {
    if (!box || !giftOrderData) {
      setAddError('Complete the gift details before continuing.');
      return;
    }
    setAddError(null);
    setIsAddingToCart(true);

    try {
      const giftLineId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `gift:${crypto.randomUUID()}`
        : `gift:${box.key}:${Date.now()}`;

      const giftMetadata: CartGiftDetails = {
        boxKey: box.key,
        boxTitle: box.title,
        senderName: giftOrderData.senderName,
        recipientType: giftOrderData.recipientType,
        recipientName: giftOrderData.recipientName,
        message: giftOrderData.message,
        instructions: giftOrderData.instructions,
        address: { ...giftOrderData.address },
      };

      setCart(prev => {
        const next = { ...(prev as CartStateWithMeta) } as CartStateWithMeta;
        next._meta = next._meta ? { ...next._meta } : undefined;
        next[giftLineId] = 1;
        const meta = (next._meta ??= {});
        meta[giftLineId] = {
          type: 'gift',
          name: box.title,
          price: box.price,
          image: box.previewImage,
          gift: giftMetadata,
        };
        return next as unknown as typeof prev;
      });

      onFlowComplete?.();
      resetFlow();
      if (mode === 'modal') {
        onRequestClose();
      }
      navigate(`/checkout?from=gift&giftId=${encodeURIComponent(box.key)}`);
    } finally {
      setIsAddingToCart(false);
    }
  }, [box, giftOrderData, mode, navigate, onFlowComplete, onRequestClose, resetFlow, setCart]);

  const handlePersonaClick = useCallback((recipient: GiftRecipientType) => {
    handleFormChange({ recipientType: recipient, customRecipient: recipient === 'custom' ? form.customRecipient : '' });
  }, [form.customRecipient, handleFormChange]);

  const handlePersonaKeyDown = useCallback((index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const total = recipientOptions.length;
    let nextIndex = index;
    if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = total - 1;
    } else {
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      nextIndex = (index + direction + total) % total;
    }
    const nextButton = personaButtonRefs.current[nextIndex];
    if (nextButton) {
      nextButton.focus();
      handlePersonaClick(recipientOptions[nextIndex].id);
    }
  }, [handlePersonaClick]);

  const formContainerLayout = useMemo(() => {
    if (isTablet) {
      return 'space-y-6';
    }
    return 'grid grid-cols-[minmax(0,1fr)_360px] gap-8';
  }, [isTablet]);

  const formColumnClass = useMemo(() => {
    if (mode === 'page' && !isTablet) {
      return 'flex flex-col max-h-[calc(100vh-220px)] overflow-y-auto pr-4 xl:pr-6';
    }
    return 'flex flex-col';
  }, [isTablet, mode]);

  return (
    <div role="form" aria-labelledby={headingId} className="w-full" ref={formRootRef}>
      <GiftProgressBar currentStep={activeStep} totalSteps={TOTAL_STEPS} />
      <div className={formContainerLayout}>
        <div className={formColumnClass} ref={internalScrollRef}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="rounded-[14px] border border-[rgba(226,185,127,0.18)] bg-[#FFF6F0] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
            >
              {activeStep === 0 && (
                <section aria-label="Choose recipient" className="space-y-6 md:space-y-8" data-step="0">
                  <header className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Step 1</p>
                    <h2 className="text-[1.9rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
                      Who are you gifting this to?
                    </h2>
                    <p className="text-sm text-[#6B5E57]">
                      Select a persona to personalise their handwritten note.
                    </p>
                  </header>
                  <div className="grid md:grid-cols-3" role="radiogroup" aria-required="true" style={{ gap: 'var(--space-sm)' }}>
                    {recipientOptions.map((option, index) => {
                      const isSelected = form.recipientType === option.id;
                      const personaTheme = personaVisuals[option.id] ?? personaVisuals.mom;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={isSelected ? 0 : -1}
                          onClick={() => handlePersonaClick(option.id)}
                          onKeyDown={handlePersonaKeyDown(index)}
                          ref={element => {
                            personaButtonRefs.current[index] = element;
                          }}
                          data-step-focus={isSelected ? 'true' : undefined}
                          className="group relative flex h-full min-h-[150px] flex-col items-center justify-center gap-3 text-center text-[#5C4632] hover:-translate-y-[2px] active:translate-y-[0px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(224,169,109,0.45)]"
                          style={{
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-lg)',
                            border: isSelected ? `1px solid ${personaTheme.accent}` : '1px solid transparent',
                            background: isSelected ? personaTheme.selectedBg : personaTheme.idleBg,
                            boxShadow: isSelected ? personaTheme.shadow : 'var(--shadow-light)',
                            transform: isSelected ? 'translateY(-2px)' : undefined,
                            transition: 'transform var(--duration-small) ease, box-shadow var(--duration-small) ease, background var(--duration-small) ease, border-color var(--duration-small) ease',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-14 w-14 items-center justify-center rounded-full text-3xl"
                            style={{
                              background: isSelected ? personaTheme.accent : personaTheme.emojiBg,
                              color: isSelected ? '#3B2B1A' : '#5C4632',
                              transition: 'background var(--duration-small) ease, transform var(--duration-small) ease',
                            }}
                          >
                            {option.emoji}
                          </span>
                          <span className="text-[15px] font-semibold tracking-[0.01em] text-[#5C4632]">
                            {option.label}
                          </span>
                          <span
                            className="text-xs leading-relaxed"
                            style={{ color: isSelected ? '#6B5136' : '#7B6651' }}
                          >
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label htmlFor="customRecipient" className="block text-sm font-semibold text-[#3B2B1A]">
                      Prefer another title?
                    </label>
                    <input
                      id="customRecipient"
                      name="customRecipient"
                      type="text"
                      placeholder="Add their name or nickname"
                      value={form.customRecipient}
                      onChange={event => handleFormChange({ recipientType: 'custom', customRecipient: event.target.value })}
                      className={`${fieldBaseClass} ${errors.customRecipient ? 'border-[#E35B48]' : ''}`}
                      aria-invalid={Boolean(errors.customRecipient)}
                      aria-describedby={errors.customRecipient ? 'customRecipient-error' : undefined}
                    />
                    {errors.customRecipient && (
                      <p id="customRecipient-error" className="mt-2 text-sm text-[#E35B48]">{errors.customRecipient}</p>
                    )}
                  </div>
                </section>
              )}

              {activeStep === 1 && (
                <section aria-label="Add personal message" className="space-y-6 md:space-y-8" data-step="1">
                  <header className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Step 2</p>
                    <h2 className="text-[1.9rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
                      Add your personal touch
                    </h2>
                    <p className="text-sm text-[#6B5E57]">
                      We’ll pen a keepsake card with your message.
                    </p>
                  </header>
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="senderName" className="block text-sm font-semibold text-[#3B2B1A]">
                        Your name
                      </label>
                      <input
                        id="senderName"
                        name="senderName"
                        type="text"
                        value={form.senderName}
                        onChange={event => handleFormChange({ senderName: event.target.value })}
                        className={`${fieldBaseClass} ${errors.senderName ? 'border-[#E35B48]' : ''}`}
                        placeholder="Name to sign the note"
                        data-step-focus="true"
                        aria-invalid={Boolean(errors.senderName)}
                        aria-describedby={errors.senderName ? 'senderName-error' : undefined}
                      />
                      {errors.senderName && (
                        <p id="senderName-error" className="mt-2 text-sm text-[#E35B48]">{errors.senderName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-[#3B2B1A]">
                        Message (1–2 lines)
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        value={form.message}
                        onChange={event => handleFormChange({ message: event.target.value.slice(0, 220) })}
                        className={`${fieldBaseClass} min-h-[140px]`}
                        placeholder="Two heartfelt lines to make them smile"
                        style={{ lineHeight: 1.6 }}
                      />
                    </div>
                    <div>
                      <label htmlFor="instructions" className="block text-sm font-semibold text-[#3B2B1A]">
                        Special instructions (optional)
                      </label>
                      <textarea
                        id="instructions"
                        name="instructions"
                        rows={3}
                        value={form.instructions}
                        onChange={event => handleFormChange({ instructions: event.target.value.slice(0, 220) })}
                        className={`${fieldBaseClass} min-h-[120px]`}
                        placeholder="Delivery notes, surprise timing or packaging details"
                        style={{ lineHeight: 1.55 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFormChange({ showWrappedPreview: !form.showWrappedPreview })}
                      className={`inline-flex items-center gap-2 rounded-[10px] border border-[rgba(226,185,127,0.28)] px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] ${
                        form.showWrappedPreview
                          ? 'bg-[#3B2B1A] text-white'
                          : 'bg-[#FFF1E5] text-[#3B2B1A] hover:bg-[#FDE7D7]'
                      }`}
                    >
                      <span aria-hidden="true">🎀</span>
                      {form.showWrappedPreview ? 'Hide wrapped preview' : 'Show wrapped preview'}
                    </button>
                  </div>
                </section>
              )}

              {activeStep === 2 && (
                <section aria-label="Delivery details" className="space-y-6 md:space-y-8" data-step="2">
                  <header className="space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Step 3</p>
                        <h2 className="text-[1.9rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
                          Where should we send it?
                        </h2>
                        <p className="text-sm text-[#6B5E57]">We ship nationwide with overnight couriers.</p>
                      </div>
                      <AnimatePresence>
                        {addressStatus !== 'idle' && (
                          <motion.span
                            key={addressStatus}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                            className={`self-start rounded-full px-3 py-1 text-xs font-medium ${
                              addressStatus === 'dirty' ? 'bg-[#FCE8D6] text-[#C7803A]' : 'bg-[#E4F6E8] text-[#4C7A4F]'
                            }`}
                          >
                            {addressStatus === 'dirty' ? 'Not saved yet' : 'Address saved'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </header>
                  <div className="grid gap-5" role="group" aria-describedby="delivery-hint">
                    <span id="delivery-hint" className="text-xs text-[#8E7360]">
                      We’ll only use these details to fulfil this order.
                    </span>
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-semibold text-[#3B2B1A]">Recipient full name</label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={form.address.fullName}
                        onChange={event => handleAddressChange({ fullName: event.target.value })}
                        className={`${fieldBaseClass} ${errors.fullName ? 'border-[#E35B48]' : ''}`}
                        placeholder="Recipient name"
                        data-step-focus="true"
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      />
                      {errors.fullName && <p id="fullName-error" className="mt-2 text-sm text-[#E35B48]">{errors.fullName}</p>}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-[#3B2B1A]">Phone number</label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={form.address.phone}
                          onChange={event => handleAddressChange({ phone: event.target.value })}
                          className={`${fieldBaseClass} ${errors.phone ? 'border-[#E35B48]' : ''}`}
                          placeholder="Courier contact"
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? 'phone-error' : undefined}
                        />
                        {errors.phone && <p id="phone-error" className="mt-2 text-sm text-[#E35B48]">{errors.phone}</p>}
                      </div>
                      <div>
                        <label htmlFor="pincode" className="block text-sm font-semibold text-[#3B2B1A]">Pincode</label>
                        <input
                          id="pincode"
                          name="pincode"
                          type="text"
                          value={form.address.pincode}
                          onChange={event => handleAddressChange({ pincode: event.target.value })}
                          className={`${fieldBaseClass} ${errors.pincode ? 'border-[#E35B48]' : ''}`}
                          placeholder="6-digit code"
                          aria-invalid={Boolean(errors.pincode)}
                          aria-describedby={errors.pincode ? 'pincode-error' : undefined}
                        />
                        {errors.pincode && <p id="pincode-error" className="mt-2 text-sm text-[#E35B48]">{errors.pincode}</p>}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="line1" className="block text-sm font-semibold text-[#3B2B1A]">Address line 1</label>
                      <input
                        id="line1"
                        name="line1"
                        type="text"
                        value={form.address.line1}
                        onChange={event => handleAddressChange({ line1: event.target.value })}
                        className={`${fieldBaseClass} ${errors.line1 ? 'border-[#E35B48]' : ''}`}
                        placeholder="Apartment or house number"
                        aria-invalid={Boolean(errors.line1)}
                        aria-describedby={errors.line1 ? 'line1-error' : undefined}
                      />
                      {errors.line1 && <p id="line1-error" className="mt-2 text-sm text-[#E35B48]">{errors.line1}</p>}
                    </div>
                    <div>
                      <label htmlFor="line2" className="block text-sm font-semibold text-[#3B2B1A]">Address line 2 (optional)</label>
                      <input
                        id="line2"
                        name="line2"
                        type="text"
                        value={form.address.line2}
                        onChange={event => handleAddressChange({ line2: event.target.value })}
                        className={fieldBaseClass}
                        placeholder="Street, building or area"
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="city" className="block text-sm font-semibold text-[#3B2B1A]">City</label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={form.address.city}
                          onChange={event => handleAddressChange({ city: event.target.value })}
                          className={`${fieldBaseClass} ${errors.city ? 'border-[#E35B48]' : ''}`}
                          placeholder="City"
                          aria-invalid={Boolean(errors.city)}
                          aria-describedby={errors.city ? 'city-error' : undefined}
                        />
                        {errors.city && <p id="city-error" className="mt-2 text-sm text-[#E35B48]">{errors.city}</p>}
                      </div>
                      <div>
                        <label htmlFor="landmark" className="block text-sm font-semibold text-[#3B2B1A]">Landmark (optional)</label>
                        <input
                          id="landmark"
                          name="landmark"
                          type="text"
                          value={form.address.landmark}
                          onChange={event => handleAddressChange({ landmark: event.target.value })}
                          className={fieldBaseClass}
                          placeholder="Helpful directions"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeStep === 3 && (
                <section aria-label="Summary & payment" className="space-y-6 md:space-y-8" data-step="3">
                  <header className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Step 4</p>
                    <h2 className="text-[1.9rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
                      Summary & basket
                    </h2>
                    <p className="text-sm text-[#6B5E57]">Review every detail, then add this gift to your basket to checkout alongside your cookies.</p>
                  </header>
                  {box ? (
                    <div className="space-y-6">
                      <article className="rounded-[14px] border border-[rgba(226,185,127,0.3)] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Selected Gift Box</p>
                            <h3 className="mt-2 text-xl font-semibold text-[#3B2B1A]">{box.title}</h3>
                            <p className="text-sm text-[#6B5E57] mt-1">For {recipientDisplayName}</p>
                          </div>
                          <span className="text-lg font-semibold text-[#3B2B1A]">₹{box.price}</span>
                        </div>
                        {form.message && (
                          <p className="mt-4 text-sm text-[#6B5E57]">“{form.message}”</p>
                        )}
                      </article>
                    <div className="space-y-4 rounded-[14px] border border-[rgba(226,185,127,0.24)] bg-[#FFF8F1] px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-[#8E7360]">Deliver to</p>
                        <div className="mt-2 space-y-1 text-sm text-[#3B2B1A]">
                          <p className="font-semibold">{addressSummary.fullName || 'Recipient name pending'}</p>
                          {addressSummary.lines.length > 0 ? (
                            <ul className="list-disc space-y-1 pl-5 text-xs text-[#6B5E57]">
                              {addressSummary.lines.map(line => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#9A8F86]">Address will follow once you confirm.</p>
                          )}
                          {addressSummary.landmark ? (
                            <p className="text-xs text-[#6B5E57]">Landmark: {addressSummary.landmark}</p>
                          ) : null}
                          {addressSummary.phone ? (
                            <p className="text-xs text-[#6B5E57]">Courier contact: {addressSummary.phone}</p>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-[#8E7360]">From</p>
                        <p className="mt-2 text-sm text-[#3B2B1A]">{form.senderName.trim() || 'Sender name pending'}</p>
                      </div>
                      {giftOrderData?.instructions ? (
                        <div>
                          <p className="text-xs uppercase tracking-[0.28em] text-[#8E7360]">Special instructions</p>
                          <p className="mt-2 text-xs text-[#6B5E57] leading-relaxed">{giftOrderData.instructions}</p>
                        </div>
                      ) : null}
                    </div>
                    {addError ? (
                      <div className="rounded-[12px] border border-[#F3B3A8] bg-[#FDE8E6] px-4 py-3 text-xs font-medium text-[#9A291E]" role="alert">
                        {addError}
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={handleConfirmGift}
                        disabled={isAddingToCart}
                        data-step-focus="true"
                        className={`inline-flex w-full items-center justify-center rounded-[12px] bg-[#3B2B1A] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(59,43,26,0.18)] transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41] sm:w-auto ${
                          isAddingToCart ? 'cursor-progress opacity-80' : ''
                        }`}
                      >
                        {isAddingToCart ? 'Adding to basket…' : 'Add to basket & continue'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRequestClose({ canceled: true });
                          resetFlow();
                        }}
                        className="inline-flex w-full items-center justify-center rounded-[12px] border border-[rgba(226,185,127,0.34)] bg-white px-6 py-3 text-sm font-semibold text-[#6B5E57] transition-colors duration-150 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] sm:w-auto"
                      >
                        Cancel gift
                      </button>
                    </div>
                    </div>
                  ) : (
                    <p className="rounded-[14px] border border-dashed border-[rgba(226,185,127,0.44)] bg-white/80 px-5 py-6 text-center text-sm text-[#6B5E57] shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                      Please choose a Golden Season box to continue.
                    </p>
                  )}
                </section>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrevious}
              className="rounded-[10px] border border-[rgba(226,185,127,0.38)] bg-white px-5 py-2.5 text-sm font-semibold text-[#3B2B1A] transition-colors duration-200 hover:bg-[#FFF1E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] cursor-pointer"
            >
              {activeStep === 0 ? (mode === 'page' ? 'Back to boxes' : 'Close') : 'Back'}
            </button>
            {activeStep < TOTAL_STEPS - 1 && (
              <button
                type="button"
                onClick={goNext}
                className="rounded-[10px] bg-[#3B2B1A] px-6 py-2.5 text-sm font-semibold text-[#FFF6F0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-transform duration-200 hover:translate-y-[-2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] cursor-pointer"
              >
                Next
              </button>
            )}
          </div>
        </div>

        <div className={isTablet ? 'order-first' : 'sticky top-24'}>
          <GiftPreviewCard
            box={box}
            recipientName={recipientDisplayName}
            senderName={debouncedSender}
            message={form.message}
            instructions={debouncedInstructions}
            showWrapped={form.showWrappedPreview}
            mode={mode}
          />
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
