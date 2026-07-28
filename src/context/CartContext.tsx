/* oxlint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../data/products';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
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
  openCheckout: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, openAuthModal } = useAuth();
  const { products, loading } = useProducts();
  const isUserAction = useRef(false);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartAnnouncement, setCartAnnouncement] = useState('');
  const hasHydrated = useRef(false);

  // Hydrate cart from localStorage once products are loaded
  useEffect(() => {
    if (loading || hasHydrated.current) return;

    try {
      const saved = localStorage.getItem('ss_cart');
      const savedTime = localStorage.getItem('ss_cart_timestamp');
      if (saved && savedTime) {
        const age = Date.now() - parseInt(savedTime, 10);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (age < maxAge) {
          const parsed = JSON.parse(saved);
          let priceChanged = false;
          const hydrated: CartItem[] = [];

          for (const item of parsed) {
            // Support both new (id) and legacy (product object) format
            const productId = item.id || (item.product && item.product.id);
            const quantity = item.quantity;
            if (!productId) continue;

            const dbProduct = products.find((p) => p.id === productId);
            // Verify product exists and is active
            if (dbProduct && dbProduct.isActive) {
              hydrated.push({
                product: dbProduct,
                quantity: quantity
              });

              // Check if price changed since it was added to cart
              const savedPrice = item.priceOnAdd !== undefined
                ? item.priceOnAdd
                : (item.product && (item.product.sellingPrice !== undefined ? item.product.sellingPrice : item.product.mrp));

              if (savedPrice !== undefined && savedPrice !== dbProduct.sellingPrice) {
                priceChanged = true;
              }
            }
          }

          setCartItems(hydrated);

          if (priceChanged) {
            setTimeout(() => {
              showToast("Some product prices have been updated to the latest prices.", "info");
            }, 500);
          }
        }
      }
    } catch (e) {
      console.warn('CartContext: Could not hydrate cart from localStorage', e);
    } finally {
      hasHydrated.current = true;
    }
  }, [loading, products, showToast]);

  const openCheckout = () => {
    setIsCartOpen(false);
    if (!user) {
      openAuthModal('signup', '/checkout');
    } else {
      navigate('/checkout');
    }
  };

  // Sync cart across tabs
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('ss_cart_channel');
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'UPDATE_CART') {
            // Map incoming channel products to the current dynamic context ones
            const mappedItems: CartItem[] = [];
            for (const item of event.data.cartItems) {
              const dbProduct = products.find((p) => p.id === item.product.id);
              if (dbProduct && dbProduct.isActive) {
                mappedItems.push({
                  product: dbProduct,
                  quantity: item.quantity
                });
              }
            }
            setCartItems(mappedItems);
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
  }, [products]);

  // Save to localStorage when cart changes (only after hydration)
  useEffect(() => {
    if (loading || !hasHydrated.current) return;

    try {
      const serialized = cartItems.map((item) => ({
        id: item.product.id,
        quantity: item.quantity,
        priceOnAdd: item.product.sellingPrice
      }));
      localStorage.setItem('ss_cart', JSON.stringify(serialized));
      if (cartItems.length > 0) {
        localStorage.setItem('ss_cart_timestamp', Date.now().toString());
      } else {
        localStorage.removeItem('ss_cart_timestamp');
      }
    } catch (e) {
      console.warn('CartContext: QuotaExceededError or localStorage unavailable', e);
    }
    
    // Only broadcast if the action was initiated by a user click/interaction in this tab
    if (!isUserAction.current) return;
    isUserAction.current = false;
    
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('ss_cart_channel');
        channel.postMessage({ type: 'UPDATE_CART', cartItems });
        channel.close();
      }
    } catch {
      // ignore
    }
  }, [cartItems, loading]);

  const handleAddToCart = (product: Product, quantity = 1) => {
    isUserAction.current = true;
    const sanitizedQty = Math.max(1, Math.min(Math.floor(quantity) || 1, 999));
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + sanitizedQty, 999) }
            : item
        );
      }
      return [...prev, { product, quantity: sanitizedQty }];
    });
    setCartAnnouncement(`${product.name} added to cart`);
    showToast(`${product.name} added to bag`, 'success');
    trackEvent('Cart', 'Add', product.name, sanitizedQty);
  };

  const handleRemoveFromCart = (productId: string) => {
    isUserAction.current = true;
    const itemToRemove = cartItems.find((item) => item.product.id === productId);
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    if (itemToRemove) {
      setCartAnnouncement(`${itemToRemove.product.name} removed from cart`);
      showToast(`${itemToRemove.product.name} removed from bag`, 'info');
    }
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    isUserAction.current = true;
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    const finalQty = Math.max(1, Math.min(Math.floor(quantity) || 1, 999));
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
    isUserAction.current = true;
    setCartItems([]);
    setCartAnnouncement('Cart cleared');
  };

  const handleBuyNow = (product: Product) => {
    isUserAction.current = true;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) return prev;
      return [...prev, { product, quantity: 1 }];
    });
    openCheckout();
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
        openCheckout,
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
