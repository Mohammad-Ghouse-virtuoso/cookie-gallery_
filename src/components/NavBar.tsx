// src/components/NavBar.tsx
import { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaCookieBite } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartPreviewModal, { type CartPreviewItem, type CartTotals } from './CartPreviewModal';
import { hasCheckoutAddress } from '@/lib/checkoutAddressStorage';
import AnimatedSignOutButton from './AnimatedSignOutButton';
import AnimatedCartButton from './AnimatedCartButton';
import { cookies as allCookies } from '@/data/cookies';
import styled from 'styled-components';
import { checkoutPageEnabled } from '@/config/features';
import type { CartLineItemDetail, CartStateWithMeta } from '@/types/cart';

export default function NavBar() {
  const { user, loading, signOutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, setCart } = useCart();
  const [showCart, setShowCart] = useState(false);
  const cookieLookup = useMemo(() => {
    const map = new Map<string, (typeof allCookies)[number]>();
    allCookies.forEach(cookie => map.set(cookie.id, cookie));
    return map;
  }, []);

  const cartItems = useMemo<CartPreviewItem[]>(() => {
    const state = cart as CartStateWithMeta;
    const meta = state._meta ?? {};

    const entries: Array<{ id: string; qty: number }> = [];
    Object.entries(state).forEach(([id, value]) => {
      if (id === '_meta') {
        return;
      }
      if (typeof value === 'number' && value > 0) {
        entries.push({ id, qty: value });
      }
    });

    return entries.map(({ id, qty }) => {
      const metaEntry = meta[id] as CartLineItemDetail | undefined;
      const cookieInfo = cookieLookup.get(id);
      const fallbackDetail: CartLineItemDetail = metaEntry ?? {
        type: 'cookie',
        name: cookieInfo?.name ?? id,
        price: cookieInfo?.price ?? 0,
        image: cookieInfo?.src ?? '',
        productId: cookieInfo?.id,
      };
      const resolvedDetail: CartLineItemDetail = {
        ...fallbackDetail,
        name: fallbackDetail.name || cookieInfo?.name || id,
        price: typeof fallbackDetail.price === 'number' && fallbackDetail.price > 0
          ? fallbackDetail.price
          : cookieInfo?.price ?? 0,
        image: fallbackDetail.image ?? cookieInfo?.src ?? '',
        productId: fallbackDetail.productId ?? cookieInfo?.id,
      };

      return {
        id,
        name: resolvedDetail.name,
        image: resolvedDetail.image ?? '',
        price: resolvedDetail.price,
        qty,
        detail: resolvedDetail,
      } satisfies CartPreviewItem;
    });
  }, [cart, cookieLookup]);

  const cartTotals = useMemo<CartTotals>(() => {
    const subtotal = cartItems.reduce((total, item) => total + (item.detail?.price ?? item.price) * item.qty, 0);
    return { subtotal, grandTotal: subtotal };
  }, [cartItems]);

  const cartBadgeCount = useMemo(() => cartItems.reduce((total, item) => total + item.qty, 0), [cartItems]);

  const handleSignOutClick = async () => {
    try {
      await signOutUser();
      navigate('/signed-out');
    } catch (error) {
      console.error("Error signing out from NavBar:", error);
    }
  };

  const buildCheckoutUrl = (anchorHash?: string) => {
    if (!checkoutPageEnabled) {
      return hasCheckoutAddress() ? '/checkout' : '/checkout/address';
    }

    const params = new URLSearchParams();
    const giftMatch = location.pathname.match(/^\/gift\/([^/]+)/);
    if (giftMatch) {
      params.set('from', 'gift');
      params.set('giftId', giftMatch[1]);
    }

    const query = params.toString();
    const base = query ? `/checkout?${query}` : '/checkout';
    return anchorHash ? `${base}${anchorHash}` : base;
  };

  return (
    <>
      <nav className="bg-gradient-to-r from-[#fffaf3] to-[#f8eddc] shadow-sm py-3.5 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-50 font-inter antialiased border-b border-[#dba661]/20">
      {/* Logo and Site Title */}
      <div className="flex items-center gap-2.5">
        <FaCookieBite className="text-[color:#dba661] text-[32px]" style={{ maxHeight: '40px' }} />
        <Link to="/" className="text-xl font-bold text-[color:#5b3a20] hover:text-[color:#8a5a3a] transition-colors duration-200">
          Cookie Gallery 🍪
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Hide links while auth loading or when user is not logged in */}
        {loading || !user ? (
          <Link
            to="/signin"
            className="px-5 py-2.5 rounded-full text-[color:#5b3a20] bg-[color:#f8eddc] font-semibold transition-all duration-200 text-base hover:shadow-[0_2px_8px_rgba(219,166,97,0.25)] hover:-translate-y-0.5"
          >
            Sign In
          </Link>
        ) : (
          <>
            <HomeNavLink to="/">
              <span>Home</span>
            </HomeNavLink>
            
            {/* Animated Cart Button */}
            <AnimatedCartButton 
              onClick={() => setShowCart(true)}
              quantity={cartBadgeCount}
            />

            {/* Signed-in identity avatar (hover to reveal email) */}
            <div className="relative group select-none">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-[#f8eddc]" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[color:#5b3a20] text-white font-semibold flex items-center justify-center shadow-sm">
                  {(user?.email || 'C').slice(0,1).toUpperCase()}
                </div>
              )}
              <div className="absolute -left-2 top-11 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-white text-gray-700 text-xs px-3 py-2 rounded-xl shadow-md whitespace-nowrap border border-[#dba661]/20">
                {user?.email || 'Signed in'}
              </div>
            </div>

            {/* Animated Sign Out Button */}
            <AnimatedSignOutButton onClick={handleSignOutClick} />
          </>
        )}
      </div>
      </nav>
      {user && (
        <CartPreviewModal
          isOpen={showCart}
          onClose={() => setShowCart(false)}
          items={cartItems}
          totals={cartTotals}
          onUpdateQty={(id, qty) => setCart(prev => {
            const next = { ...(prev as CartStateWithMeta) } as CartStateWithMeta;
            next._meta = next._meta ? { ...next._meta } : undefined;

            if (qty > 0) {
              next[id] = qty;
              const cookieInfo = cookieLookup.get(id);
              const meta = (next._meta ??= {});
              if (cookieInfo) {
                meta[id] = {
                  type: 'cookie',
                  name: cookieInfo.name,
                  image: cookieInfo.src,
                  price: cookieInfo.price,
                  productId: cookieInfo.id,
                };
              }
            } else {
              delete next[id];
              if (next._meta) {
                delete next._meta[id];
              }
            }
            return next as unknown as typeof prev;
          })}
          onRemove={(id) => setCart(prev => {
            const next = { ...(prev as CartStateWithMeta) } as CartStateWithMeta;
            next._meta = next._meta ? { ...next._meta } : undefined;
            delete next[id];
            if (next._meta) {
              delete next._meta[id];
            }
            return next as unknown as typeof prev;
          })}
          onCheckout={() => {
            setShowCart(false);
            navigate(buildCheckoutUrl());
          }}
          onManageAddress={() => {
            setShowCart(false);
            navigate(buildCheckoutUrl('#address'));
          }}
          onExplore={() => { setShowCart(false); navigate('/cookies'); }}
        />
      )}
    </>
  );
}

const HomeNavLink = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 18px;
  border-radius: 9999px;
  color: #5b3a20;
  background: transparent;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  text-decoration: none;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  isolation: isolate;
  overflow: hidden;
  will-change: transform, box-shadow;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: #f8eddc;
    z-index: 0;
    transition: background-color 0.25s ease;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -22%;
    border-radius: inherit;
    background:
      radial-gradient(68% 100% at 15% 0%, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0)),
      linear-gradient(135deg, rgba(241, 181, 92, 0.25), rgba(207, 142, 68, 0.2));
    opacity: 0;
    transform: scale(0.85);
    transition: opacity 0.35s ease, transform 0.35s ease;
    z-index: 0;
    pointer-events: none;
  }

  span {
    position: relative;
    z-index: 1;
  }

  &:hover,
  &:focus-visible {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 12px 26px rgba(211, 166, 97, 0.18);
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
    transform: scale(1);
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #f1b55c, 0 12px 26px rgba(211, 166, 97, 0.18);
  }

  &:active {
    transform: translateY(0) scale(0.99);
    box-shadow: 0 4px 12px rgba(211, 166, 97, 0.12);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: box-shadow 0.2s ease;

    &::after {
      transition: opacity 0.2s ease;
    }

    &:hover,
    &:focus-visible {
      transform: none;
    }
  }
`;