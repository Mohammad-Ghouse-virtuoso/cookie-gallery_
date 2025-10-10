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

  return (
  <div role="article" aria-labelledby={`cookie-${cookie.id}-title`} className="group bg-white rounded-2xl shadow-xl md:shadow-2xl p-5 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 border border-gray-100 ring-1 ring-gray-50 hover:ring-rose-200/70 hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
      {/* Cookie Image */}
      {cookie.src?.sources ? (
        <picture>
          {cookie.src.sources.map((s: any) => (
            <source key={s.type} type={s.type} srcSet={s.srcset} />
          ))}
          <img
            src={cookie.src.img?.src || cookie.src?.src}
            alt={`${cookie.name} product photo`}
            loading="lazy"
            width="192"
            height="192"
            className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-xl mb-4 shadow-lg bg-gray-50 p-2 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl"
            onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = 'https://placehold.co/192x192/E0E0E0/616161?text=No+Image'; }}
          />
        </picture>
      ) : (
        <img
          src={typeof cookie.src === 'string' ? cookie.src : ''}
          alt={`${cookie.name} product photo`}
          loading="lazy"
          width="192"
          height="192"
          className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-xl mb-4 shadow-lg bg-gray-50 p-2 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl"
          onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = 'https://placehold.co/192x192/E0E0E0/616161?text=No+Image'; }}
        />
      )}

      {/* Cookie Name and Price */}
  <h3 id={`cookie-${cookie.id}-title`} className="text-xl font-bold text-gray-800 mb-1">{cookie.name}</h3>
  <p className="text-lg font-semibold text-indigo-700 mb-3">{formatPrice(cookie.price)}</p>

      {/* Quantity Controls */}
      <div className="flex items-center justify-center space-x-2 mb-2"> {/* Compact spacing for message */}
        <button
          onClick={() => onChange(quantity - 1)}
          className={`rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500
            ${quantity > 0 ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          aria-label="Decrease quantity"
          disabled={quantity <= 0}
        >
          -
        </button>
        <span className="text-xl font-bold text-gray-800 w-8 text-center">{quantity}</span>
        <button
          onClick={() => onChange(quantity + 1)}
          className={`text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500
            ${isMaxQuantity ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          aria-label="Increase quantity"
          disabled={isMaxQuantity}
        >
          +
        </button>
      </div>
      
      {/* Optional message when max quantity is reached */}
      {isMaxQuantity && (
        <p className="text-sm text-rose-500 font-medium animate-pulse">Max quantity reached!</p>
      )}

      {/* Details Button */}
      <button
        onClick={onShowDetails}
        className="text-sm text-indigo-700 hover:text-indigo-900 hover:underline transition-colors mt-2 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        View Details
      </button>
    </div>
  );
};

export default CookieCard;