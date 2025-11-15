import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';

type MockCartContext = {
  cart: Record<string, number>;
  setCart: ReturnType<typeof vi.fn>;
};

const mockCartSetter = vi.fn();

vi.mock('@/context/CartContext', () => ({
  useCart: (): MockCartContext => ({
    cart: { 'choco-cookie': 1 },
    setCart: mockCartSetter,
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'baker@cookie.gallery' } }),
}));

const loadCheckoutAddressMock = vi.fn();
const persistCheckoutAddressMock = vi.fn();
const getEmptyCheckoutAddressMock = vi.fn(() => ({
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
}));

vi.mock('@/lib/checkoutAddressStorage', () => ({
  loadCheckoutAddress: () => loadCheckoutAddressMock(),
  persistCheckoutAddress: (address: unknown) => persistCheckoutAddressMock(address),
  getEmptyCheckoutAddress: () => getEmptyCheckoutAddressMock(),
}));

const loadCheckoutDraftMock = vi.fn();
const persistCheckoutDraftMock = vi.fn();
const clearCheckoutDraftMock = vi.fn();

vi.mock('@/lib/checkoutDraft', () => ({
  loadCheckoutDraft: () => loadCheckoutDraftMock(),
  persistCheckoutDraft: (address: unknown) => persistCheckoutDraftMock(address),
  clearCheckoutDraft: () => clearCheckoutDraftMock(),
}));

vi.mock('@/lib/pendingOrderStorage', () => ({
  loadPendingOrder: () => null,
}));

const stripeProps: any[] = [];

vi.mock('@/components/payments/StripeCheckoutFlow', () => {
  const MockStripeCheckoutFlow = (props: any) => {
    stripeProps.push(props);
    return (
      <button type="button" data-testid="stripe-pay-now" disabled={props.initializeDisabled}>
        Pay Now Mock
      </button>
    );
  };

  return {
    __esModule: true,
    StripeCheckoutFlow: MockStripeCheckoutFlow,
    default: MockStripeCheckoutFlow,
  };
});

describe('CheckoutPage', () => {
  beforeEach(() => {
    loadCheckoutAddressMock.mockReturnValue(null);
    loadCheckoutDraftMock.mockReturnValue(null);
    persistCheckoutDraftMock.mockReset();
    clearCheckoutDraftMock.mockReset();
    persistCheckoutAddressMock.mockReset();
    mockCartSetter.mockReset();
    stripeProps.length = 0;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  test('shows draft recovery toast when a draft exists', () => {
    loadCheckoutDraftMock.mockReturnValue({
      address: {
        fullName: 'Ada Lovelace',
      },
      savedAt: Date.now(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/checkout' }]}>
        <CheckoutPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/We recovered your checkout draft/i)).toBeInTheDocument();
  });

  test('disables Pay Now until address fields are valid', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/checkout' }]}>
        <CheckoutPage />
      </MemoryRouter>,
    );

    const payButton = await screen.findByTestId('stripe-pay-now');
    expect(payButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Full name/i), 'Grace Hopper');
    await userEvent.type(screen.getByLabelText(/^Phone$/i), '+919999999999');
    await userEvent.type(screen.getByLabelText(/PIN code/i), '560001');
    await userEvent.type(screen.getByLabelText(/Address line 1/i), '42 Baker Street');
    await userEvent.type(screen.getByLabelText(/^City$/i), 'Bengaluru');
    await userEvent.type(screen.getByLabelText(/Country/i), 'India');

    await waitFor(() => {
      expect(payButton).not.toBeDisabled();
    });
  });
});
