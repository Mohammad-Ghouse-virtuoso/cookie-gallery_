import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StripeCheckoutFlow } from '../StripeCheckoutFlow';
import { persistPendingOrder, clearPendingOrder, loadPendingOrder } from '@/lib/pendingOrderStorage';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  }),
}));

describe('StripeCheckoutFlow', () => {
  const originalFetch = global.fetch;
  const user = { email: 'baker@cookie.gallery' };
  const cart = { classic: 2 };
  const totalAmount = 999;
  const fetchMock = vi.fn();

  beforeAll(() => {
    vi.stubGlobal('fetch', fetchMock);
    const locationMock = {
      href: '',
      assign: vi.fn((url: string) => {
        locationMock.href = url;
      }),
    };
    Object.defineProperty(window, 'location', {
      writable: true,
      value: locationMock,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    navigateSpy.mockReset();
    localStorage.clear();
    clearPendingOrder();
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    // no-op
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  test('creates order and redirects to Stripe on happy path', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      checkoutUrl: 'https://stripe.test/session/abc',
      localOrderId: 'order-abc',
      providerSessionId: 'sess_123',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'pending' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const cartDetails = {
      classic: {
        type: 'cookie' as const,
        name: 'Classic Crunch',
        price: 499,
        image: '/classic.jpg',
        productId: 'classic',
      },
    };

    render(
      <MemoryRouter>
        <StripeCheckoutFlow
          cart={cart}
          cartDetails={cartDetails}
          totalAmount={totalAmount}
          user={user}
          shippingAddress={{ fullName: 'Ada', line1: '42 Baker St', city: 'Bengaluru', postalCode: '560001', country: 'India', phone: '+91000000000' } as any}
          initializeButtonLabel="Pay"
          payButtonLabel="Pay"
        />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /pay/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/create-order'), expect.any(Object));
      expect(window.location.assign).toHaveBeenCalledWith('https://stripe.test/session/abc');
    });

    const [, firstCallOptions] = fetchMock.mock.calls[0];
    const payload = JSON.parse((firstCallOptions?.body as string) ?? '{}');
    expect(payload.cartDetails).toEqual(cartDetails);

    const pending = loadPendingOrder();
    expect(pending?.localOrderId).toBe('order-abc');
    expect(pending?.status).toBe('pending');
    expect(pending?.cartDetails).toEqual(cartDetails);
  });

  test('shows offline recovery message and does not call create order when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });

    render(
      <MemoryRouter>
        <StripeCheckoutFlow
          cart={cart}
          totalAmount={totalAmount}
          user={user}
          initializeButtonLabel="Pay"
          payButtonLabel="Pay"
        />
      </MemoryRouter>,
    );

  await userEvent.click(screen.getByRole('button', { name: /pay/i }));

  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText('You appear offline. Please reconnect to continue or return to your cart.')).toBeInTheDocument();

    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  test('recovers pending order and navigates after verification', async () => {
    persistPendingOrder({
      localOrderId: 'order-pending',
      checkoutUrl: 'https://stripe.test/old',
      providerSessionId: 'sess_pending',
      createdAt: Date.now(),
      cart,
      returnPath: '/payment-status',
      status: 'pending',
    });

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'pending' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'completed' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const { rerender } = render(
      <MemoryRouter>
        <StripeCheckoutFlow
          cart={cart}
          totalAmount={totalAmount}
          user={user}
          returnPath="/payment-status"
          successPath="/order-success"
          initialOrderId="order-pending"
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/order-status'), expect.any(Object));
    });

    const checkButton = await screen.findByRole('button', { name: /check again now/i });
    await userEvent.click(checkButton);

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith('/order-success', { replace: true });
    }, { timeout: 2000 });

    rerender(<div />);
    expect(loadPendingOrder()).toBeNull();
  });
});
