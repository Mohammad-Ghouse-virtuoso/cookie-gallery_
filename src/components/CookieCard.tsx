// src/components/CookieCard.tsx

import React from 'react';
import { formatPrice } from '../utils/formatPrice';
import type { CookieData } from '../data/cookies';

interface CookieCardProps {
  cookie: CookieData;
  quantity: number;
  onChange: (newQty: number) => void;
  onShowDetails: () => void;
}

const CookieCard: React.FC<CookieCardProps> = ({ cookie, quantity, onChange, onShowDetails }) => {
  const maxQuantity = 10;
  const isMaxQuantity = quantity >= maxQuantity;
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  return (
    <article
      id={cookie.id}
      className="cookie-card group bg-white flex flex-col h-full"
      data-testid="cookie-item"
      style={{
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-light)',
        padding: 'var(--space-lg)',
        border: '1px solid #f3f4f6',
        transition: 'all var(--duration-medium) cubic-bezier(0.215, 0.61, 0.355, 1)'
      }}
      aria-label={`${cookie.name} cookie card`}
    >
      {/* Cookie Image with Fixed Aspect Ratio 1:1 */}
      <div 
        className="image-frame ambient-glow relative w-full mb-4 overflow-hidden"
        style={{
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {!imageLoaded && !imageError && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"
            style={{ borderRadius: 'var(--radius-md)' }}
          />
        )}
        <img
          src={cookie.src}
          alt={`${cookie.name} - ${cookie.description}`}
          loading="lazy"
          decoding="async"
          srcSet={`${cookie.src} 1x`}
          className={`w-full h-full object-cover transition-all ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--duration-medium) ease',
            contentVisibility: 'auto',
            containIntrinsicSize: '100% 100%'
          }}
          width="300"
          height="300"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => { 
            setImageError(true);
            (e.target as HTMLImageElement).onerror = null; 
            (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/E0E0E0/616161?text=No+Image'; 
          }}
        />
        {/* Light sweep & gloss overlays */}
        <div 
          className="img-light-sweep"
          style={{ borderRadius: 'var(--radius-md)' }}
          aria-hidden="true"
        ></div>
        <div 
          className="img-gloss"
          style={{ borderRadius: 'var(--radius-md)' }}
          aria-hidden="true"
        ></div>
      </div>

      {/* Cookie Name and Price */}
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-800" style={{ marginBottom: 'var(--space-xs)' }}>
          {cookie.name}
        </h3>
        <p className="text-lg font-semibold text-[#5b3a20]" style={{ marginBottom: 'var(--space-md)' }}>
          {formatPrice(cookie.price)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div 
        className="flex items-center justify-center gap-3"
        style={{ marginBottom: 'var(--space-md)' }}
        role="group" 
        aria-label="Quantity controls"
      >
        <button
          onClick={() => onChange(quantity - 1)}
          className={`flex items-center justify-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-2
            ${quantity > 0 
              ? 'bg-white border text-[#5b3a20] hover:bg-[#f8eddc] hover:scale-110 active:scale-95' 
                : 'bg-[#2C2C2F] text-[#A7A7AA] border border-[#2C2C2F] cursor-not-allowed'}`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-pill)',
            borderColor: quantity > 0 ? 'var(--color-accent-beige)' : undefined,
            transition: 'all var(--duration-small) ease'
          }}
          aria-label={`Decrease quantity of ${cookie.name}`}
          disabled={quantity <= 0}
          type="button"
          data-testid={`decrease-quantity-${cookie.id}`}
        >
          −
        </button>
        <div 
          className="px-4 py-1.5 text-center"
          style={{
            backgroundColor: 'rgba(248, 237, 220, 0.3)',
            borderRadius: 'var(--radius-pill)',
            minWidth: '3rem'
          }}
        >
          <span
            className="text-lg font-semibold text-[#5b3a20]"
            aria-live="polite"
            aria-atomic="true"
            data-testid={`quantity-display-${cookie.id}`}
          >
            {quantity}
          </span>
        </div>
        <button
          onClick={(e) => {
            onChange(quantity + 1);
            const btn = e.currentTarget;
            btn.classList.add('btn-glow');
            setTimeout(() => btn.classList.remove('btn-glow'), 320);
            const host = btn.closest('article');
            if (host) {
              host.classList.add('pulse-once');
              setTimeout(() => host.classList.remove('pulse-once'), 220);
            }
          }}
          className={`flex items-center justify-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-2
            ${isMaxQuantity 
              ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-50' 
              : 'bg-[#5b3a20] text-white hover:bg-[#3a2310] hover:scale-110 active:scale-95'}`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-pill)',
            transition: 'all var(--duration-small) ease'
          }}
          aria-label={`Increase quantity of ${cookie.name}`}
          disabled={isMaxQuantity}
          type="button"
          data-testid={`add-to-cart-${cookie.id}`}
        >
          +
        </button>
      </div>
      
      {/* Optional message when max quantity is reached */}
      {isMaxQuantity && (
        <p 
          className="text-sm text-[#5b3a20] font-medium animate-pulse" 
          role="status" 
          aria-live="polite"
          style={{ marginBottom: 'var(--space-sm)' }}
        >
          Max quantity reached!
        </p>
      )}

      {/* Details Button */}
      <button
        onClick={onShowDetails}
        className="w-full px-5 py-2 bg-[#5b3a20] text-white text-sm font-semibold hover:bg-[#3a2310] hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:ring-offset-2"
        style={{
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-light)',
          transition: 'all var(--duration-small) ease'
        }}
        aria-label={`View details for ${cookie.name}`}
        type="button"
      >
        View Details
      </button>
    </article>
  );
};

export default CookieCard;