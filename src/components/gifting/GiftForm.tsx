import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { GiftProgressBar } from './GiftProgressBar';
import { GiftPreviewCard } from './GiftPreviewCard';
import { StripeCheckoutFlow } from '@/components/payments/StripeCheckoutFlow';
import { persistGiftAddress, getEmptyAddress, readStoredAddress } from '@/lib/giftFormStorage';
import type { GiftAddress, GiftFormState, GiftRecipientType } from '@/types/giftExperience';
import type { GoldenSeasonBox } from '@/data/goldenSeasonBoxes';

const TOTAL_STEPS = 4;

const recipientOptions: Array<{ id: GiftRecipientType; label: string; emoji: string }> = [
  { id: 'mom', label: 'Mom', emoji: '🌸' },
  { id: 'dad', label: 'Dad', emoji: '🎩' },
  { id: 'friend', label: 'Friend', emoji: '🤝' },
  { id: 'girlfriend', label: 'Girlfriend', emoji: '💐' },
  { id: 'boyfriend', label: 'Boyfriend', emoji: '🎧' },
  { id: 'spouse', label: 'Spouse', emoji: '💍' },
  { id: 'custom', label: 'Custom', emoji: '📝' },
];

const fieldBaseClass =
  'mt-2 w-full rounded-[8px] border border-[rgba(58,45,36,0.12)] bg-[#FFF9F4] px-4 py-3 text-sm text-[#3B2B1A] placeholder:text-[#B9AFA6] shadow-[inset_0_1px_2px_rgba(58,45,36,0.04)] transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#CFA676] focus-visible:shadow-[0_0_0_4px_rgba(226,185,127,0.18)]';

const personaHoverShadow = '0 6px 18px rgba(30,20,10,0.06)';

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

export default function GiftForm({ box, mode, onRequestClose, onFlowComplete, headingId, scrollParentRef }: GiftFormProps) {
  const navigate = useNavigate();
  const isTablet = useMedia(1023);
  const { user } = useAuth();
  const formRootRef = useRef<HTMLDivElement | null>(null);
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const personaButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const cachedAddressRef = useRef<GiftAddress | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<GiftFormState>(() => buildInitialForm()); // Local state keeps inputs stable to avoid caret jumps.
  const [errors, setErrors] = useState<FormErrors>({});
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readStoredAddress();
      if (cancelled) return;
      if (cached) {
        cachedAddressRef.current = cached;
        if (!isAddressEmpty(cached)) {
          setForm(previous => ({
            ...previous,
            address: { ...cached },
          }));
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const cached = cachedAddressRef.current;
    if (!cached || isAddressEmpty(cached)) {
      return;
    }
    if (import.meta.env.DEV && isAddressEmpty(form.address)) {
      console.warn('GiftForm: persisted address was lost after hydration. Reapplying cached values.');
      setForm(previous => ({
        ...previous,
        address: { ...cached },
      }));
    }
  }, [form.address, hydrated]);

  const debouncedSender = useDebouncedValue(form.senderName, 220);
  const debouncedCustomRecipient = useDebouncedValue(form.customRecipient, 220);
  const debouncedInstructions = useDebouncedValue(form.instructions, 220);

  useEffect(() => {
    setAnnouncement(`Step ${activeStep + 1} of ${TOTAL_STEPS}`);
  }, [activeStep]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    persistGiftAddress(form.address);
    cachedAddressRef.current = form.address;
  }, [form.address, hydrated]);

  useEffect(() => {
    const scroller = scrollParentRef?.current ?? internalScrollRef.current;
    if (scroller) {
      if (typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scroller.scrollTop = 0;
      }
    }

    const rootNode = formRootRef.current;
    if (!rootNode) {
      return;
    }
    const currentStepNode = rootNode.querySelector<HTMLElement>(`[data-step="${activeStep}"] [data-step-focus="true"]`);
    if (currentStepNode) {
      window.requestAnimationFrame(() => {
        currentStepNode.focus({ preventScroll: true });
      });
    }
  }, [activeStep, scrollParentRef]);

  const handleAddressChange = useCallback((updates: Partial<GiftAddress>) => {
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
    setForm(buildInitialForm(cachedAddressRef.current ?? undefined));
  }, [cachedAddressRef]);

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

  const giftCart = useMemo(() => {
    if (!box) return {};
    return { [box.key]: 1 } as Record<string, number>;
  }, [box]);

  const giftReturnPath = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    if (mode === 'page' && box) {
      return `/gift/${box.key}`;
    }
    return '/gift';
  }, [box, mode]);

  const handleReturnToCart = useCallback(() => {
    if (mode === 'modal') {
      onRequestClose({ canceled: true });
      resetFlow();
      return;
    }
    navigate('/cookies');
  }, [mode, navigate, onRequestClose, resetFlow]);

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
                  <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-required="true">
                    {recipientOptions.map((option, index) => {
                      const isSelected = form.recipientType === option.id;
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
                          className={`relative flex h-full flex-col items-start gap-3 rounded-[14px] border border-transparent bg-[#FFF6F0] p-4 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(80,45,20,0.24)] hover:-translate-y-1 ${
                            isSelected ? 'bg-[#EED3B7]' : 'hover:bg-[#FBEDE1]'
                          }`}
                          style={{
                            boxShadow: isSelected
                              ? `inset 0 1px 0 rgba(255,255,255,0.65), 0 0 0 2px rgba(80,45,20,0.2), ${personaHoverShadow}`
                              : personaHoverShadow,
                          }}
                        >
                          <span aria-hidden="true" className="text-[28px] leading-none">
                            {option.emoji}
                          </span>
                          <span
                            className={`text-sm font-medium tracking-[0.02em] ${
                              isSelected ? 'text-[#3B2B1A]' : 'text-[#6B5E57]'
                            }`}
                          >
                            {option.label}
                          </span>
                          <span className="text-xs text-[#6B5E57]">Tap to select</span>
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
                    <p className="text-xs uppercase tracking-[0.32em] text-[#8E7360]">Step 3</p>
                    <h2 className="text-[1.9rem] font-semibold text-[#3B2B1A]" style={{ fontFamily: '"Playfair Display", serif' }}>
                      Where should we send it?
                    </h2>
                    <p className="text-sm text-[#6B5E57]">We ship nationwide with overnight couriers.</p>
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
                      Summary & payment
                    </h2>
                    <p className="text-sm text-[#6B5E57]">Review the details before confirming payment.</p>
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
                      <StripeCheckoutFlow
                        cart={giftCart}
                        totalAmount={box.price}
                        user={user}
                        shippingAddress={form.address}
                        extraOrderData={giftOrderData}
                        onCartCleared={() => undefined}
                        onPaymentCompletedChange={completed => {
                          if (completed) {
                            onFlowComplete?.();
                            if (mode === 'modal') {
                              onRequestClose();
                            }
                            resetFlow();
                          }
                        }}
                        initializeButtonLabel="Pay Securely"
                        payButtonLabel="Pay Securely"
                        returnPath={giftReturnPath}
                        successPath="/order-success"
                        onReturnToCart={handleReturnToCart}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onRequestClose({ canceled: true });
                          resetFlow();
                        }}
                        data-step-focus="true"
                        className="text-sm font-medium text-[#6B5E57] transition-colors duration-200 hover:text-[#2F2116] active:text-[#2F2116] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(226,185,127,0.32)] cursor-pointer no-underline"
                      >
                        Cancel gift creation
                      </button>
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
