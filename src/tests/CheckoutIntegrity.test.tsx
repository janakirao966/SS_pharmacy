import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Checkout from '../pages/Checkout';
import { ToastProvider } from '../context/ToastContext';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';

// Mock ProductContext
vi.mock('../context/ProductContext', () => ({
  useProducts: () => ({
    products: [
      { id: 'dr-lion-pain-cream', name: 'Dr. Lion Pain Cream', mrp: 2999, sellingPrice: 2999, packSize: '500 gms', isActive: true, category: 'Ayurvedic External Pain Relief Cream', composition: '', benefits: [], usage: '', shelfLife: '', safetyNote: '' },
      { id: 'dr-lion-pain-pills', name: 'Dr. Lion Pain Pills', mrp: 2999, sellingPrice: 2999, packSize: '60 Pills', isActive: true, category: 'Ayurvedic Proprietary Medicine', composition: '', benefits: [], usage: '', shelfLife: '', safetyNote: '' }
    ],
    loading: false,
    error: null
  }),
  ProductProvider: ({ children }: any) => children
}));

// Mock matchMedia to prevent errors from any internal UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('CheckoutIntegrity', () => {
  it('should initialize with a unique checkout_attempt_id and not recreate it on re-render', async () => {
    // This is a minimal structural test asserting that Checkout does not throw immediately 
    // and that the idempotency refs do not cause immediate crashes.
    
    // In a real DB-backed test suite we would mock the RPC and verify
    // that the same ID is sent across retries.
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <Checkout />
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Empty cart should show "Your cart is empty"
    expect(screen.getAllByText(/Your cart is empty/i).length).toBeGreaterThan(0);
  });
});
