import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Cart = { [cookieId: string]: number };

type CartContextValue = {
  cart: Cart;
  setCart: React.Dispatch<React.SetStateAction<Cart>>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const detectE2EMode = (): boolean => {
  if (import.meta.env.VITE_E2E === 'true') {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      return window.sessionStorage.getItem('cg_e2e_mode') === 'true';
    } catch {
      return false;
    }
  }
  return false;
};

const isE2ETestMode = detectE2EMode();
const TEST_CART_STORAGE_KEY = 'cg-e2e-cart';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart>(() => {
    if (!isE2ETestMode) {
      return {};
    }
    try {
      const stored = sessionStorage.getItem(TEST_CART_STORAGE_KEY);
      if (!stored) {
        return {};
      }
      const parsed = JSON.parse(stored) as Cart;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      /* ignore malformed data in test mode */
    }
    return {};
  });

  useEffect(() => {
    if (!isE2ETestMode) {
      return;
    }
    try {
      sessionStorage.setItem(TEST_CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore storage quota issues in test mode */
    }
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, setCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
};
