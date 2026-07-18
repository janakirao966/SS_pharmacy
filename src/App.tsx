import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ScrollToTop from './components/layout/ScrollToTop';
import Spinner from './components/ui/Spinner';
import { trackPageView } from './utils/analytics';
import { useCart } from './context/CartContext';

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

function ProductDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Spinner size={32} /></div>}>
      <ProductDetail productId={id || 'dr-lion-pain-cream'} />
    </Suspense>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isCartOpen, cartAnnouncement, setIsCartOpen } = useCart();

  // Global keyboard shortcuts: Ctrl/Cmd + K (Search), Ctrl/Cmd + B (Cart Toggle)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsCartOpen(!isCartOpen);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [setIsCartOpen, isCartOpen]);

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
                    />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/products/:id"
                element={
                  <ErrorBoundary>
                    <ProductDetailWrapper />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/product-detail/:id"
                element={
                  <ErrorBoundary>
                    <ProductDetailWrapper />
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
