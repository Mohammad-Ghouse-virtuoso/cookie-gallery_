import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type GiftToast = {
  message: string;
  id: number;
} | null;

export type GiftExperienceState = {
  isModalOpen: boolean;
  selectedBoxKey: string | null;
};

type GiftExperienceValue = {
  state: GiftExperienceState;
  openModal: (boxKey: string) => void;
  closeModal: (showCanceledToast?: boolean) => void;
  clearToast: () => void;
  toast: GiftToast;
};

const GiftExperienceContext = createContext<GiftExperienceValue | undefined>(undefined);

export function GiftExperienceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GiftExperienceState>({
    isModalOpen: false,
    selectedBoxKey: null,
  });
  const [toast, setToast] = useState<GiftToast>(null);

  const openModal = useCallback((boxKey: string) => {
    setState({ isModalOpen: true, selectedBoxKey: boxKey });
  }, []);

  const closeModal = useCallback((showCanceledToast?: boolean) => {
    setState({ isModalOpen: false, selectedBoxKey: null });
    if (showCanceledToast) {
      setToast({ message: 'Gift creation canceled.', id: Date.now() });
    }
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const value: GiftExperienceValue = {
    state,
    openModal,
    closeModal,
    clearToast,
    toast,
  };

  return (
    <GiftExperienceContext.Provider value={value}>
      {children}
    </GiftExperienceContext.Provider>
  );
}

export function useGiftExperience() {
  const ctx = useContext(GiftExperienceContext);
  if (!ctx) {
    throw new Error('useGiftExperience must be used within a GiftExperienceProvider');
  }
  return ctx;
}
