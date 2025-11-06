// src/components/NavBar.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCookieBite } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartPreviewModal from './CartPreviewModal';
import AnimatedSignOutButton from './AnimatedSignOutButton';
import AnimatedCartButton from './AnimatedCartButton';

export default function NavBar() {
  const { user, loading, signOutUser } = useAuth();
  const navigate = useNavigate();
  const { cart, setCart } = useCart();
  const [showCart, setShowCart] = useState(false);

  const handleSignOutClick = async () => {
    try {
      await signOutUser();
      navigate('/signed-out');
    } catch (error) {
      console.error("Error signing out from NavBar:", error);
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
            <Link
              to="/"
              className="px-4 py-2 rounded-full text-[color:#5b3a20] bg-[color:#f8eddc] font-medium transition-all duration-200 text-base hover:shadow-[0_2px_8px_rgba(219,166,97,0.2)] hover:-translate-y-0.5"
            >
              Home
            </Link>
            
            {/* Animated Cart Button */}
            <AnimatedCartButton 
              onClick={() => setShowCart(true)}
              quantity={Object.keys(cart).filter(k => k !== '_meta').length}
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
        items={Object.entries(cart as Record<string, number>).map(([id, qty]) => {
          return {
            id,
            name: (cart as any)._meta?.[id]?.name || id,
            image: (cart as any)._meta?.[id]?.image || '',
            price: (cart as any)._meta?.[id]?.price || 0,
            qty: qty as number,
          };
        })}
        totals={(function(){
          const entries = Object.entries(cart as Record<string, number>);
          let subtotal = 0;
          entries.forEach(([id, qty]) => {
            const price = (cart as any)._meta?.[id]?.price || 0;
            subtotal += price * (qty as number);
          });
          return { subtotal, grandTotal: subtotal };
        })()}
        onUpdateQty={(id, qty) => setCart(prev => {
          const next = { ...(prev as any) } as Record<string, number>;
          if (qty > 0) next[id] = qty; else delete next[id];
          return next as any;
        })}
        onRemove={(id) => setCart(prev => {
          const next = { ...(prev as any) } as Record<string, number>;
          delete next[id];
          return next as any;
        })}
        onCheckout={() => { setShowCart(false); navigate('/checkout'); }}
        onExplore={() => { setShowCart(false); navigate('/cookies'); }}
      />
    )}
    </>
  );
}