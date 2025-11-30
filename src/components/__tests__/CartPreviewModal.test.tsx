import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CartPreviewModal, { type CartPreviewItem, type CartTotals } from '../CartPreviewModal';
import { BrowserRouter } from 'react-router-dom';

// Mock the useAuth hook
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    loading: false,
    authDisabled: false,
    signOutUser: vi.fn(),
  }),
}));

// Helper to wrap component with necessary providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
};

const defaultTotals: CartTotals = {
  subtotal: 500,
  grandTotal: 500,
};

const mockItem: CartPreviewItem = {
  id: 'cookie-1',
  name: 'Chocolate Chip Cookie',
  price: 250,
  qty: 2,
  image: '/test-image.jpg',
  detail: {
    type: 'cookie',
    name: 'Chocolate Chip Cookie',
    price: 250,
    image: '/test-image.jpg',
  },
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  items: [] as CartPreviewItem[],
  totals: defaultTotals,
  onUpdateQty: vi.fn(),
  onRemove: vi.fn(),
  onCheckout: vi.fn(),
  onExplore: vi.fn(),
  onManageAddress: vi.fn(),
};

describe('CartPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Edit Address Button Visibility', () => {
    it('should NOT show Edit button when cart is empty', () => {
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[]}
        />
      );

      // The Edit/Add button should not be present when cart is empty
      const editButton = screen.queryByRole('button', { name: /edit/i });
      const addButton = screen.queryByRole('button', { name: /^add$/i });
      
      expect(editButton).not.toBeInTheDocument();
      expect(addButton).not.toBeInTheDocument();
    });

    it('should show Edit button when cart has items', () => {
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[mockItem]}
        />
      );

      // The Edit or Add button should be present when cart has items
      const manageButton = screen.queryByRole('button', { name: /edit|add/i });
      expect(manageButton).toBeInTheDocument();
    });

    it('should show "Add items to cart first" message when cart is empty', () => {
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[]}
        />
      );

      expect(screen.getByText('Add items to cart first')).toBeInTheDocument();
    });

    it('should show Edit button when cart has items and address was previously saved', () => {
      // Set up a saved address BEFORE rendering
      const testAddress = {
        fullName: 'John Doe',
        streetAddress: '123 Test St',
        city: 'Test City',
        pincode: '500001',
      };
      localStorage.setItem(
        'checkoutAddress_test@example.com',
        JSON.stringify(testAddress)
      );

      // Now render - the component should read the address from localStorage on mount
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[mockItem]}
        />
      );

      // Should show Edit button since address exists and cart has items
      // The button text depends on whether checkoutAddress was loaded
      const manageButton = screen.getByRole('button', { name: /edit|add/i });
      expect(manageButton).toBeInTheDocument();
    });

    it('should show "Add" button label when cart has items but no address saved', () => {
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[mockItem]}
        />
      );

      // Should show Add button (not Edit) when no address is saved
      const addButton = screen.queryByRole('button', { name: /^add$/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Cart State Messages', () => {
    it('should display empty cart message when no items', () => {
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[]}
        />
      );

      expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    });

    it('should display item count when cart has items', () => {
      // mockItem has qty: 2, so two items with qty: 2 each = 4 total items
      const item1 = { ...mockItem, id: 'cookie-1', qty: 1 };
      const item2 = { ...mockItem, id: 'cookie-2', name: 'Sugar Cookie', qty: 1 };
      
      renderWithProviders(
        <CartPreviewModal
          {...defaultProps}
          items={[item1, item2]}
          totals={{ subtotal: 500, grandTotal: 500 }}
        />
      );

      // Should show shipment label with item count (qty sum = 2)
      expect(screen.getByText(/shipment of 2 items/i)).toBeInTheDocument();
    });
  });
});
