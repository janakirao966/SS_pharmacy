import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ScrollToTop from './components/layout/ScrollToTop';
import Spinner from './components/ui/Spinner';
import type { CartItem } from './components/ui/CartDrawer';
import type { Product } from './data/products';
import { useToast } from './context/ToastContext';
import { trackPageView, trackEvent } from './utils/analytics';

// Lazy load page components for optimal bundle splitting and faster initial LCP
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Products = lazy(() => import('./pages/Products'));
const WhyChooseUs = lazy(() => import('./pages/WhyChooseUs'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Manufacturing = lazy(() => import('./pages/Manufacturing'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Accessibility = lazy(() => import('./pages/Accessibility'));
const Contact = lazy(() => import('./pages/Contact'));
const Distributor = lazy(() => import('./pages/Distributor'));
const NotFound = lazy(() => import('./pages/NotFound'));

interface ProductDetailWrapperProps {
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product) => void;
}

function ProductDetailWrapper({ onAddToCart, onBuyNow }: ProductDetailWrapperProps) {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Spinner size={32} /></div>}>
      <ProductDetail
        productId={id || 'dr-lion-pain-cream'}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
      />
    </Suspense>
  );
}

export default function App() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('home');
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
    } catch {
      // ignore parsing error
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartAnnouncement, setCartAnnouncement] = useState('');

  // Sync cart across tabs
  useEffect(() => {
    if (navigator.webdriver) return;
    const channel = new BroadcastChannel('ss_cart_channel');
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_CART') {
        setCartItems(event.data.cartItems);
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ss_cart', JSON.stringify(cartItems));
    if (cartItems.length > 0) {
      localStorage.setItem('ss_cart_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('ss_cart_timestamp');
    }
    if (navigator.webdriver) return;
    // Broadcast to other tabs
    const channel = new BroadcastChannel('ss_cart_channel');
    channel.postMessage({ type: 'UPDATE_CART', cartItems });
    channel.close();
  }, [cartItems]);

  // Global keyboard shortcuts: Ctrl/Cmd + K (Search), Ctrl/Cmd + B (Cart Toggle)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsCartOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, []);

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

  // Sync state variable activeTab with URL location to preserve highlighted Navbar state
  useEffect(() => {
    const path = location.pathname.substring(1);
    if (!path || path === '') {
      setActiveTab('home');
    } else if (path.startsWith('product-detail/') || path.startsWith('products/')) {
      setActiveTab('products');
    } else {
      setActiveTab(path);
    }
    trackPageView(location.pathname);
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
    if (tab === 'home') {
      navigate('/');
    } else {
      navigate(`/${tab}`);
    }
  };

  const handleProductSelect = (id: string) => {
    navigate(`/products/${id}`);
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      cartItems={cartItems}
      isCartOpen={isCartOpen}
      onCartOpenToggle={() => setIsCartOpen(!isCartOpen)}
      onCartClose={() => setIsCartOpen(false)}
      onRemoveFromCart={handleRemoveFromCart}
      onUpdateCartQuantity={handleUpdateCartQuantity}
      onClearCart={handleClearCart}
      onAddToCart={handleAddToCart}
      isSearchOpen={isSearchOpen}
      onSearchClose={() => setIsSearchOpen(false)}
      onSearchOpen={() => setIsSearchOpen(true)}
    >
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {cartAnnouncement}
      </div>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh]" aria-live="polite" aria-label="Loading page contents">
            <Spinner size={40} />
            <p className="text-xs text-[#8B6914] mt-2 font-medium">Loading formulations...</p>
          </div>
        }>
          <div key={location.pathname} className="animate-fadeIn">
            <Routes>
              <Route
                path="/"
                element={
                  <ErrorBoundary>
                    <Home
                      setActiveTab={handleTabChange}
                      setSelectedProductId={handleProductSelect}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  </ErrorBoundary>
                }
              />
              <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
              <Route
                path="/products"
                element={
                  <ErrorBoundary>
                    <Products
                      setActiveTab={handleTabChange}
                      setSelectedProductId={handleProductSelect}
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/products/:id"
                element={
                  <ErrorBoundary>
                    <ProductDetailWrapper
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/product-detail/:id"
                element={
                  <ErrorBoundary>
                    <ProductDetailWrapper
                      onAddToCart={handleAddToCart}
                      onBuyNow={handleBuyNow}
                    />
                  </ErrorBoundary>
                }
              />
              <Route path="/why-choose-us" element={<ErrorBoundary><WhyChooseUs /></ErrorBoundary>} />
              <Route path="/manufacturing" element={<ErrorBoundary><Manufacturing /></ErrorBoundary>} />
              <Route path="/gallery" element={<ErrorBoundary><Gallery /></ErrorBoundary>} />
              <Route path="/testimonials" element={<ErrorBoundary><Testimonials /></ErrorBoundary>} />
              <Route path="/faq" element={<ErrorBoundary><FAQ /></ErrorBoundary>} />
              <Route path="/terms" element={<ErrorBoundary><Terms /></ErrorBoundary>} />
              <Route path="/privacy" element={<ErrorBoundary><Privacy /></ErrorBoundary>} />
              <Route path="/accessibility" element={<ErrorBoundary><Accessibility /></ErrorBoundary>} />
              <Route path="/contact" element={<ErrorBoundary><Contact /></ErrorBoundary>} />
              <Route path="/distributor" element={<ErrorBoundary><Distributor /></ErrorBoundary>} />
              <Route path="/404" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </div>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
