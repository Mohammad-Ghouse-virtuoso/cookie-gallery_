import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TestCardBanner } from '../TestCardBanner';

describe('TestCardBanner', () => {
  it('renders with default props', () => {
    render(<TestCardBanner />);
    
    expect(screen.getByTestId('test-card-banner')).toBeInTheDocument();
    expect(screen.getByText(/This is a demo store/)).toBeInTheDocument();
    expect(screen.getByText('4242 4242 4242 4242')).toBeInTheDocument();
    expect(screen.getByText(/Use any future date/)).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    render(<TestCardBanner show={false} />);
    
    expect(screen.queryByTestId('test-card-banner')).not.toBeInTheDocument();
  });

  it('renders custom card number and hint', () => {
    render(
      <TestCardBanner
        cardNumber="5555 5555 5555 4444"
        hint="MasterCard test card"
      />
    );
    
    expect(screen.getByText('5555 5555 5555 4444')).toBeInTheDocument();
    expect(screen.getByText('MasterCard test card')).toBeInTheDocument();
  });

  it('can be dismissed when dismissible', () => {
    const onDismiss = vi.fn();
    render(<TestCardBanner dismissible onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss test card info');
    fireEvent.click(dismissButton);
    
    expect(screen.queryByTestId('test-card-banner')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss button when dismissible is false', () => {
    render(<TestCardBanner dismissible={false} />);
    
    expect(screen.queryByLabelText('Dismiss test card info')).not.toBeInTheDocument();
  });

  it('has copy button for card number', () => {
    render(<TestCardBanner />);
    
    expect(screen.getByLabelText('Copy card number to clipboard')).toBeInTheDocument();
  });

  it('renders warning variant with different styles', () => {
    render(<TestCardBanner variant="warning" />);
    
    const banner = screen.getByTestId('test-card-banner');
    expect(banner).toHaveClass('bg-[#FFF8E6]');
  });

  it('renders info variant by default', () => {
    render(<TestCardBanner />);
    
    const banner = screen.getByTestId('test-card-banner');
    expect(banner).toHaveClass('bg-[#EDF7F6]');
  });

  it('accepts custom className', () => {
    render(<TestCardBanner className="my-custom-class" />);
    
    const banner = screen.getByTestId('test-card-banner');
    expect(banner).toHaveClass('my-custom-class');
  });
});
