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
const PROD_CART_STORAGE_KEY = 'cg-cart';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart>(() => {
    try {
      // E2E mode: use sessionStorage
      if (isE2ETestMode) {
        const stored = sessionStorage.getItem(TEST_CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Cart;
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
        return {};
      }
      
      // Production: use localStorage for persistence
      const stored = localStorage.getItem(PROD_CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Cart;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      /* ignore malformed data */
    }
    return {};
  });

  useEffect(() => {
    try {
      if (isE2ETestMode) {
        sessionStorage.setItem(TEST_CART_STORAGE_KEY, JSON.stringify(cart));
      } else {
        localStorage.setItem(PROD_CART_STORAGE_KEY, JSON.stringify(cart));
      }
    } catch {
      /* ignore storage quota issues */
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
