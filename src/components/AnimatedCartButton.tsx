// src/components/AnimatedCartButton.tsx
import React from 'react';
import styled from 'styled-components';

interface AnimatedCartButtonProps {
  onClick: () => void;
  quantity?: number;
  className?: string;
}

const AnimatedCartButton: React.FC<AnimatedCartButtonProps> = ({ 
  onClick, 
  quantity = 0,
  className 
}) => {
  return (
    <StyledWrapper className={className}>
      <button 
        data-quantity={quantity} 
        className="btn-cart"
        onClick={onClick}
        aria-label={`My Cart - ${quantity} item${quantity !== 1 ? 's' : ''}`}
        type="button"
        data-testid="cart-button"
      >
        <svg 
          className="icon-cart" 
          viewBox="0 0 24.38 30.52" 
          height="22" 
          width="18" 
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <title>Shopping Cart Icon</title>
          <path 
            transform="translate(-3.62 -0.85)" 
            d="M28,27.3,26.24,7.51a.75.75,0,0,0-.76-.69h-3.7a6,6,0,0,0-12,0H6.13a.76.76,0,0,0-.76.69L3.62,27.3v.07a4.29,4.29,0,0,0,4.52,4H23.48a4.29,4.29,0,0,0,4.52-4ZM15.81,2.37a4.47,4.47,0,0,1,4.46,4.45H11.35a4.47,4.47,0,0,1,4.46-4.45Zm7.67,27.48H8.13a2.79,2.79,0,0,1-3-2.45L6.83,8.34h3V11a.76.76,0,0,0,1.52,0V8.34h8.92V11a.76.76,0,0,0,1.52,0V8.34h3L26.48,27.4a2.79,2.79,0,0,1-3,2.44Zm0,0" 
          />
        </svg>
        <span className="cart-text">My Cart</span>
      </button>
      {quantity > 0 && (
        <span className="quantity-badge" data-testid="cart-count">{quantity}</span>
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* Wrapper provides isolation context */
  position: relative;
  isolation: isolate;

  .btn-cart {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: fit-content;
    height: 38px;
    padding: 0 18px 0 20px;
    border-radius: 9999px;
    border: none;
    background-color: transparent;
    position: relative;
    cursor: pointer;
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-weight: 600;
    font-size: 14px;
    color: #5b3a20;
    
    /* Critical: Contain all child animations within button bounds */
    overflow: hidden;
    clip-path: inset(0 round 9999px);
    
    /* Prevent layout shift from hover effects */
    will-change: transform, box-shadow;
  }

  .btn-cart::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-color: #f8eddc;
    z-index: 0;
    pointer-events: none;
    transition: background-color 0.25s ease;
  }

  .btn-cart::after {
    content: '';
    position: absolute;
    inset: -22%;
    border-radius: inherit;
    background:
      radial-gradient(70% 100% at 18% 0%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0)),
      linear-gradient(135deg, rgba(241, 181, 92, 0.25), rgba(207, 142, 68, 0.18));
    opacity: 0;
    transform: scale(0.86);
    transition: opacity 0.35s ease, transform 0.35s ease;
    z-index: 0;
    pointer-events: none;
  }

  .btn-cart:hover {
    box-shadow: 0 12px 26px rgba(211, 166, 97, 0.18);
    transform: translateY(-2px) scale(1.03) !important;
  }

  .btn-cart:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #f1b55c, 0 12px 26px rgba(211, 166, 97, 0.18);
    outline-offset: 2px;
  }

  .btn-cart:active {
    transform: translateY(0) scale(0.99) !important;
    box-shadow: 0 4px 12px rgba(211, 166, 97, 0.12);
  }

  .icon-cart {
    width: 18px;
    height: 22px;
    flex-shrink: 0;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  /* Allow full bag outline rendering; button clip handles containment */
    position: relative;
    z-index: 1;
  overflow: visible;
  }

  .icon-cart path {
    fill: #5b3a20;
    transition: fill 0.22s ease;
  }

  .cart-text {
    position: relative;
    z-index: 1;
    white-space: nowrap;
    user-select: none;
    line-height: 1;
  }

  .quantity-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: white;
    background-color: #5b3a20;
    border-radius: 50%;
    border: 2px solid #fffaf3;
    box-shadow: 0 2px 6px rgba(91, 58, 32, 0.3);
    z-index: 3;
    pointer-events: none;
    animation: badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes badge-pop {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Hover effects - icon scales modestly and changes color */
  .btn-cart:hover > .icon-cart,
  .btn-cart:focus-visible > .icon-cart {
    transform: scale(1.16) !important;
  }

  .btn-cart:hover > .icon-cart path,
  .btn-cart:focus-visible > .icon-cart path {
    fill: #f1b55c !important;
  }

  .btn-cart:hover::after,
  .btn-cart:focus-visible::after {
    opacity: 1;
    transform: scale(1);
  }

  /* Active state for click feedback */
  .btn-cart:active > .icon-cart {
    transform: scale(1.08) !important;
  }

  .quantity {
    display: none;
  }

  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .btn-cart,
    .icon-cart,
    .icon-cart path,
    .quantity-badge,
    .btn-cart::before,
    .btn-cart::after {
      transition: none;
      animation: none;
    }
    
    .btn-cart:hover > .icon-cart,
    .btn-cart:focus-visible > .icon-cart {
      transform: scale(1);
    }

    .btn-cart:hover {
      transform: translateY(0) !important;
    }

    .quantity-badge {
      animation: none;
    }
  }
`;

export default AnimatedCartButton;
