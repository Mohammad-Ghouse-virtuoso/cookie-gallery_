// src/components/AnimatedSignOutButton.tsx
import React from 'react';
import styled from 'styled-components';

interface AnimatedSignOutButtonProps {
  onClick: () => void;
  className?: string;
}

const AnimatedSignOutButton: React.FC<AnimatedSignOutButtonProps> = ({ onClick, className }) => {
  return (
    <StyledWrapper className={className}>
      <button
        onClick={onClick}
        aria-label="Sign out from your account"
        role="button"
        type="button"
      >
        <span className="circle1" aria-hidden="true" />
        <span className="circle2" aria-hidden="true" />
        <span className="circle3" aria-hidden="true" />
        <span className="circle4" aria-hidden="true" />
        <span className="circle5" aria-hidden="true" />
        <span className="text">Sign Out</span>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  button {
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-weight: 600;
    color: #3a2310;
    background-color: transparent;
    padding: 0.5rem 1rem;
    border: 2px solid #3a2310;
    border-radius: 9999px;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    clip-path: inset(0);
    transition: all 0.2s ease;
    font-size: 1rem;
    line-height: 1.5;
    z-index: 2;
    pointer-events: auto;
  }

  button:hover {
    color: white !important;
    border-color: #f1b55c !important;
    box-shadow: 0 8px 20px rgba(241, 181, 92, 0.12) !important;
  }

  button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px #f1b55c !important;
    outline-offset: 2px;
  }

  button span:not(:nth-child(6)) {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    height: 30px;
    width: 30px;
    background-color: #f1b55c;
    border-radius: 50%;
    transition: 0.6s cubic-bezier(0.2, 0.9, 0.3, 1);
    z-index: 0;
    pointer-events: none;
  }

  button span:nth-child(6) {
    position: relative;
    z-index: 1;
  }

  button span:nth-child(1) {
    transform: translate(-3.3em, -4em);
  }

  button span:nth-child(2) {
    transform: translate(-6em, 1.3em);
  }

  button span:nth-child(3) {
    transform: translate(-0.2em, 1.8em);
  }

  button span:nth-child(4) {
    transform: translate(3.5em, 1.4em);
  }

  button span:nth-child(5) {
    transform: translate(3.5em, -3.8em);
  }

  button:hover span:not(:nth-child(6)),
  button:focus-visible span:not(:nth-child(6)) {
    transform: translate(-50%, -50%) scale(2.5) !important;
    transition: 1s cubic-bezier(0.2, 0.9, 0.3, 1);
  }

  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    button span:not(:nth-child(6)) {
      transition: none;
    }
    
    button:hover span:not(:nth-child(6)),
    button:focus-visible span:not(:nth-child(6)) {
      transform: translate(-50%, -50%) scale(1);
    }
    
    button {
      transition: color 0.2s ease, border-color 0.2s ease;
    }
  }
`;

export default AnimatedSignOutButton;
