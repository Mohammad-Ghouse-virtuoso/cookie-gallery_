// src/components/NavBar.tsx
import { useMemo, useState, useRef, useEffect, type FocusEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaCookieBite } from 'react-icons/fa';
import { FiPackage, FiLogOut, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartPreviewModal, { type CartPreviewItem, type CartTotals } from './CartPreviewModal';
import { hasCheckoutAddress } from '@/lib/checkoutAddressStorage';
import AnimatedCartButton from './AnimatedCartButton';
import { cookies as allCookies } from '@/data/cookies';
import styled from 'styled-components';
import { checkoutPageEnabled } from '@/config/features';
import type { CartLineItemDetail, CartStateWithMeta } from '@/types/cart';

export default function NavBar() {
  const { user, loading, authDisabled, signOutUser, guestMode, setGuestMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, setCart } = useCart();
  const [showCart, setShowCart] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  
  // Close avatar menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setShowAvatarMenu(false);
      }
    }
    if (showAvatarMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAvatarMenu]);

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

  const isGuest = guestMode && !user;
  const allowGuestExperience = authDisabled && !user;
  const showSignedInUi = Boolean(user) || isGuest || allowGuestExperience;
  const identityTitle = user?.displayName || user?.email || user?.phoneNumber || (isGuest ? 'Guest Explorer' : 'Cookie Friend');
  const identityStatusLabel = user ? 'Signed in' : isGuest ? 'Guest mode' : 'Demo access';
  const identitySubline = user?.email || user?.phoneNumber || (isGuest ? 'Browsing without an account' : 'Try guest checkout');
  const showSessionAction = Boolean(user) || isGuest;
  const quickAuthCta = user ? 'Sign Out' : isGuest ? 'Sign In' : 'Sign In';
  const quickAuthHint = user ? 'Sign off securely' : isGuest ? 'Jump into your account' : 'Unlock full access';

  const handleGuestExit = () => {
    setGuestMode(false);
    navigate('/signin', { replace: true });
  };

  const handleAvatarPanelBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setShowAvatarMenu(false);
    }
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
        {/* Hide the nav only while real auth is resolving */}
        {loading && !authDisabled ? (
          <span className="px-5 py-2.5 rounded-full text-[color:#5b3a20] bg-[color:#f8eddc] font-semibold opacity-75 select-none">
            Loading…
          </span>
        ) : showSignedInUi ? (
          <>
            <HomeNavLink to="/">
              <span>Home</span>
            </HomeNavLink>

            <div className="flex items-center gap-3">
              <AnimatedCartButton 
                onClick={() => setShowCart(true)}
                quantity={cartBadgeCount}
              />

              {/* Identity avatar with hover panel + session controls */}
              <IdentityTray>
                {/* Avatar with hover panel */}
                <div 
                  className="relative z-50" 
                  ref={avatarMenuRef}
                  onMouseEnter={() => setShowAvatarMenu(true)}
                  onMouseLeave={() => setShowAvatarMenu(false)}
                  onFocusCapture={() => setShowAvatarMenu(true)}
                  onBlurCapture={handleAvatarPanelBlur}
                >
                  <button
                    className="block transition-transform duration-200 hover:scale-105"
                    style={{ outline: 'none', border: 'none', background: 'none', padding: 0 }}
                    aria-label="User menu"
                    aria-expanded={showAvatarMenu}
                  >
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="avatar" className="w-9 h-9 rounded-full object-cover block" />
                    ) : guestMode ? (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white font-bold flex items-center justify-center shadow-md">
                        G
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#5b3a20] text-white font-semibold flex items-center justify-center">
                        {(user?.email || user?.phoneNumber || 'U').slice(0,1).toUpperCase()}
                      </div>
                    )}
                  </button>
                  
                  <QuickActionsPanel
                    role="menu"
                    aria-hidden={!showAvatarMenu}
                    $visible={showAvatarMenu}
                  >
                    <QuickPanelHeader>
                      <span className="title">{identityTitle}</span>
                      <span className="subtitle">{identitySubline}</span>
                    </QuickPanelHeader>
                    <QuickActionButton
                      type="button"
                      onClick={() => {
                        setShowAvatarMenu(false);
                        navigate('/orders');
                      }}
                    >
                      <FiPackage className="action-icon" />
                      <div>
                        <span className="label">My Orders</span>
                        <span className="hint">Track your recent treats</span>
                      </div>
                    </QuickActionButton>
                    <QuickActionButton
                      type="button"
                      onClick={() => {
                        setShowAvatarMenu(false);
                        if (user) {
                          handleSignOutClick();
                        } else if (isGuest) {
                          handleGuestExit();
                        } else {
                          navigate('/signin');
                        }
                      }}
                    >
                      {user ? (
                        <FiLogOut className="action-icon" />
                      ) : (
                        <FiLogIn className="action-icon" />
                      )}
                      <div>
                        <span className="label">{quickAuthCta}</span>
                        <span className="hint">{quickAuthHint}</span>
                      </div>
                    </QuickActionButton>
                  </QuickActionsPanel>
                </div>

                <IdentityMeta>
                  <IdentityStatus>{identityStatusLabel}</IdentityStatus>
                  <IdentityName>{identityTitle}</IdentityName>
                </IdentityMeta>

                {showSessionAction && (
                  <SessionActionButton
                    onClick={user ? handleSignOutClick : handleGuestExit}
                    aria-label={user ? 'Sign out' : 'Exit guest mode'}
                  >
                    <FiLogOut className="session-action-icon" />
                    <span>{user ? 'Sign Out' : 'Exit Guest'}</span>
                  </SessionActionButton>
                )}
              </IdentityTray>
            </div>
          </>
        ) : (
          <Link
            to="/signin"
            onClick={() => setGuestMode(false)}
            className="px-5 py-2.5 rounded-full text-[color:#5b3a20] bg-[color:#f8eddc] font-semibold transition-all duration-200 text-base hover:shadow-[0_2px_8px_rgba(219,166,97,0.25)] hover:-translate-y-0.5"
          >
            Sign In
          </Link>
        )}
      </div>
      </nav>
      {(user || authDisabled) && (
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

const IdentityTray = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0.45rem 0.35rem 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(219, 166, 97, 0.35);
  box-shadow: 0 10px 30px rgba(219, 166, 97, 0.15);
  backdrop-filter: blur(10px);
`;

const IdentityMeta = styled.div`
  display: none;
  flex-direction: column;
  line-height: 1.1;
  min-width: 120px;

  @media (min-width: 640px) {
    display: flex;
  }
`;

const IdentityStatus = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #c29357;
  opacity: 0.85;
`;

const IdentityName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #5b3a20;
`;

const SessionActionButton = styled.button`
  --btn-bg: linear-gradient(135deg, #fdeedc 0%, #f2cfab 100%);
  --btn-bg-hover: linear-gradient(135deg, #ffe9cf 0%, #f4c48f 100%);

  outline: none;
  cursor: pointer;
  border: none;
  padding: 0.45rem 0.85rem;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 12px;
  border-radius: 50px;
  background: var(--btn-bg);
  color: #654427;
  box-shadow:
    0 3px 10px rgba(212, 165, 116, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: all 0.25s ease;

  .session-action-icon {
    width: 14px;
    height: 14px;
    opacity: 0.8;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  span {
    white-space: nowrap;
  }

  &:hover {
    background: var(--btn-bg-hover);
    box-shadow:
      0 6px 16px rgba(212, 165, 116, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.55);
    transform: translateY(-1px);
  }

  &:hover .session-action-icon {
    transform: translateX(1px);
    opacity: 1;
  }

  &:active {
    transform: translateY(0);
    box-shadow:
      0 2px 6px rgba(212, 165, 116, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.45);
  }

  @media (max-width: 640px) {
    gap: 0;
    padding: 0.45rem 0.55rem;

    span {
      display: none;
    }
  }
`;

const QuickActionsPanel = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 240px;
  padding: 0.75rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(219, 166, 97, 0.35);
  box-shadow: 0 20px 45px rgba(91, 58, 32, 0.16);
  backdrop-filter: blur(12px);
  transform: translateY(${({ $visible }) => ($visible ? '0' : '6px')});
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition: opacity 0.25s ease, transform 0.25s ease;
  z-index: 60;
`;

const QuickPanelHeader = styled.div`
  padding-bottom: 0.55rem;
  margin-bottom: 0.45rem;
  border-bottom: 1px solid rgba(219, 166, 97, 0.25);

  .title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #5b3a20;
    margin-bottom: 2px;
  }

  .subtitle {
    display: block;
    font-size: 11px;
    color: #9d7a4b;
  }
`;

const QuickActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.4rem;
  border-radius: 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: #5b3a20;
  transition: background 0.2s ease, transform 0.2s ease;

  .action-icon {
    width: 18px;
    height: 18px;
    color: #d4a574;
    flex-shrink: 0;
  }

  .label {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.1;
    display: block;
  }

  .hint {
    display: block;
    font-size: 11px;
    color: #9d7a4b;
    margin-top: 2px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(248, 237, 220, 0.9);
    transform: translateY(-1px);
    outline: none;
  }

  &:active {
    transform: translateY(0);
  }
`;