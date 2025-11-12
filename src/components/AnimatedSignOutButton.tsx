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
        type="button"
        onClick={onClick}
        aria-label="Sign out from your account"
      >
        <span className="fill" aria-hidden="true" />
        <span className="label">Sign Out</span>
      </button>
    </StyledWrapper>
  );
};
const StyledWrapper = styled.div`
  button {
    position: relative;
    overflow: hidden;
    border-radius: 9999px;
    padding: 0.55rem 1.4rem;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    color: #884b1d;
    background: transparent;
    border: 2px solid #f1b55c;
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, color 0.2s ease;
    box-shadow: 0 4px 14px rgba(210, 153, 70, 0.14);
    min-width: 110px;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px rgba(210, 153, 70, 0.28);
    color: #fff;
  }

  button:focus-visible {
    outline: none;
    color: #fff;
    box-shadow: 0 0 0 3px rgba(69, 44, 24, 0.18), 0 12px 26px rgba(210, 153, 70, 0.28);
  }

  .fill {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(135deg, #f7c876 0%, #f1a94a 100%);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 0;
  }

  button:hover .fill,
  button:focus-visible .fill {
    transform: scaleX(1);
  }

  .label {
    position: relative;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }

    .fill {
      transition: none;
    }
  }
`;

export default AnimatedSignOutButton;
