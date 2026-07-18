import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Product } from '../data/products';
import { useToast } from './ToastContext';
import { trackEvent } from '../utils/analytics';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  cartAnnouncement: string;
  cartCount: number;
  handleAddToCart: (product: Product, quantity?: number) => void;
  handleRemoveFromCart: (productId: string) => void;
  handleUpdateCartQuantity: (productId: string, quantity: number) => void;
  handleClearCart: () => void;
  handleBuyNow: (product: Product) => void;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ss_cart');
      const savedTime = localStorage.getItem('ss_cart_timestamp');
      if (saved && savedTime) {
        const age = Date.now() - parseInt(savedTime, 10);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (age < maxAge) {
          return JSON.parse(saved);
        }
      }
    } catch (e) {
      console.warn('CartContext: Could not access or parse localStorage', e);
    }
    return [];
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartAnnouncement, setCartAnnouncement] = useState('');

  // Sync cart across tabs
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('ss_cart_channel');
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'UPDATE_CART') {
            setCartItems(event.data.cartItems);
          }
        };
        channel.addEventListener('message', handleMessage);
        
        return () => {
          channel?.removeEventListener('message', handleMessage);
          channel?.close();
        };
      }
    } catch (e) {
      console.warn('CartContext: BroadcastChannel is not supported or restricted', e);
    }
  }, []);

  // Save to localStorage when cart changes
  useEffect(() => {
    try {
      localStorage.setItem('ss_cart', JSON.stringify(cartItems));
      if (cartItems.length > 0) {
        localStorage.setItem('ss_cart_timestamp', Date.now().toString());
      } else {
        localStorage.removeItem('ss_cart_timestamp');
      }
    } catch (e) {
      console.warn('CartContext: QuotaExceededError or localStorage unavailable', e);
    }
    
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('ss_cart_channel');
        channel.postMessage({ type: 'UPDATE_CART', cartItems });
        channel.close();
      }
    } catch (e) {
      // ignore
    }
  }, [cartItems]);

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, 10) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(quantity, 10) }];
    });
    setCartAnnouncement(`${product.name} added to cart`);
    showToast(`${product.name} added to bag`, 'success');
    trackEvent('Cart', 'Add', product.name, quantity);
  };

  const handleRemoveFromCart = (productId: string) => {
    const itemToRemove = cartItems.find((item) => item.product.id === productId);
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    if (itemToRemove) {
      setCartAnnouncement(`${itemToRemove.product.name} removed from cart`);
      showToast(`${itemToRemove.product.name} removed from bag`, 'info');
    }
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    const finalQty = Math.min(quantity, 10);
    const item = cartItems.find((i) => i.product.id === productId);
    if (item) {
      const action = finalQty > item.quantity ? 'Increased' : 'Decreased';
      setCartAnnouncement(`${action} ${item.product.name} quantity to ${finalQty}`);
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: finalQty } : item
      )
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
    setCartAnnouncement('Cart cleared');
  };

  const handleBuyNow = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) return prev;
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };
  
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        cartAnnouncement,
        cartCount,
        handleAddToCart,
        handleRemoveFromCart,
        handleUpdateCartQuantity,
        handleClearCart,
        handleBuyNow,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
