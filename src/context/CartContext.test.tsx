import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';
import { ToastProvider } from './ToastContext';
import { AuthProvider } from './AuthContext';
import { products } from '../data/products';

// Mock ProductContext to prevent network calls to Supabase in unit tests
vi.mock('./ProductContext', () => ({
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

const MOCK_MRP_1 = 2999;

// Mock component to test the context
function TestComponent() {
  const { cartItems, handleAddToCart, handleRemoveFromCart, isCartOpen, setIsCartOpen } = useCart();
  
  const cartTotal = cartItems.reduce((total, item) => total + ((item.product.sellingPrice ?? item.product.mrp ?? 0) * item.quantity), 0);

  return (
    <div>
      <div data-testid="cart-total">{cartTotal}</div>
      <div data-testid="is-open">{isCartOpen ? 'true' : 'false'}</div>
      <button onClick={() => setIsCartOpen(true)}>Open Cart</button>
      <button onClick={() => setIsCartOpen(false)}>Close Cart</button>
      
      {cartItems.map(item => (
        <div key={item.product.id} data-testid={`cart-item-${item.product.id}`}>
          {item.product.name} x {item.quantity}
          <button onClick={() => handleRemoveFromCart(item.product.id)}>Remove</button>
        </div>
      ))}
      
      <button onClick={() => handleAddToCart(products[0])}>Add Product 1</button>
      <button onClick={() => handleAddToCart(products[1])}>Add Product 2</button>
    </div>
  );
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides initial state', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <TestComponent />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('cart-total')).toHaveTextContent('0');
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('adds items to the cart and updates total', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <TestComponent />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByText('Add Product 1'));
    
    expect(screen.getByTestId(`cart-item-${products[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent(MOCK_MRP_1.toString());
    
    // Add same product again to increase quantity
    await user.click(screen.getByText('Add Product 1'));
    expect(screen.getByTestId('cart-total')).toHaveTextContent((MOCK_MRP_1 * 2).toString());
  });

  it('removes items from the cart', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <TestComponent />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByText('Add Product 1'));
    expect(screen.getByTestId(`cart-item-${products[0].id}`)).toBeInTheDocument();
    
    await user.click(screen.getByText('Remove'));
    expect(screen.queryByTestId(`cart-item-${products[0].id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('cart-total')).toHaveTextContent('0');
  });

  it('toggles cart drawer visibility', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <TestComponent />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    
    await user.click(screen.getByText('Open Cart'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    
    await user.click(screen.getByText('Close Cart'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });
});
