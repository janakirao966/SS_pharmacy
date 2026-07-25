import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ScrollToTop from './components/layout/ScrollToTop';
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
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminOrdersDetail = lazy(() => import('./pages/AdminOrdersDetail'));
const AdminInvoices = lazy(() => import('./pages/AdminInvoices'));
const AdminInventory = lazy(() => import('./pages/AdminInventory'));
const AdminInventoryDetail = lazy(() => import('./pages/AdminInventoryDetail'));
const AdminReturns = lazy(() => import('./pages/AdminReturns'));
const AdminReturnDetail = lazy(() => import('./pages/AdminReturnDetail'));
const AdminOperations = lazy(() => import('./pages/AdminOperations'));
const AdminExceptionDetail = lazy(() => import('./pages/AdminExceptionDetail'));
const AdminSupport = lazy(() => import('./pages/AdminSupport'));
const AdminSupportDetail = lazy(() => import('./pages/AdminSupportDetail'));
const AdminSuppliers = lazy(() => import('./pages/AdminSuppliers'));
const AdminProcurement = lazy(() => import('./pages/AdminProcurement'));
const AdminInventoryBatches = lazy(() => import('./pages/AdminInventoryBatches'));
const AdminExpiry = lazy(() => import('./pages/AdminExpiry'));
const AdminRecalls = lazy(() => import('./pages/AdminRecalls'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const AdminGSTReport = lazy(() => import('./pages/AdminGSTReport'));
const AdminSecurityCenter = lazy(() => import('./pages/AdminSecurityCenter'));
const CustomerSupport = lazy(() => import('./pages/CustomerSupport'));
const CustomerSupportNew = lazy(() => import('./pages/CustomerSupportNew'));
const CustomerSupportDetail = lazy(() => import('./pages/CustomerSupportDetail'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/AdminProductForm'));
const AdminEnquiries = lazy(() => import('./pages/AdminEnquiries'));
const AdminEnquiryDetail = lazy(() => import('./pages/AdminEnquiryDetail'));
const AdminDistributors = lazy(() => import('./pages/AdminDistributors'));
const AdminDistributorsDetail = lazy(() => import('./pages/AdminDistributorsDetail'));
const AdminContent = lazy(() => import('./pages/AdminContent'));
const AdminTestimonials = lazy(() => import('./pages/AdminTestimonials'));
const AdminGallery = lazy(() => import('./pages/AdminGallery'));
const AdminMedia = lazy(() => import('./pages/AdminMedia'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminSecurity = lazy(() => import('./pages/AdminSecurity'));
const CustomerAccount = lazy(() => import('./pages/CustomerAccount'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const NotFound = lazy(() => import('./pages/NotFound'));
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import AuthModal from './components/ui/AuthModal';

function ProductDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]" aria-live="polite">
        <div className="w-6 h-6 border-2 border-[#1D3A28]/20 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    }>
      <ProductDetail productId={id || 'dr-lion-pain-cream'} />
    </Suspense>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

  // Dismiss static initial HTML loader once React successfully mounts
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (!loader) return;
    loader.classList.add('is-exiting');
    const timer = setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'home') {
      document.title = 'S.S. PHARMACY | Ayurvedic Products & Licensed Manufacturing';
    } else {
      const formattedTitle = activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      document.title = `${formattedTitle} | S.S. PHARMACY`;
    }
    trackPageView(location.pathname);
  }, [location.pathname, activeTab]);

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
          <div className="flex items-center justify-center min-h-[40vh]" aria-live="polite">
            <div className="w-6 h-6 border-2 border-[#1D3A28]/20 border-t-[#C5A059] rounded-full animate-spin" />
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
              <Route path="/track-order" element={<ErrorBoundary><TrackOrder /></ErrorBoundary>} />
              <Route path="/account" element={<ErrorBoundary><CustomerAccount /></ErrorBoundary>} />
              <Route path="/checkout" element={<ErrorBoundary><Checkout /></ErrorBoundary>} />
              <Route path="/order-success/:orderNumber" element={<ErrorBoundary><OrderSuccess /></ErrorBoundary>} />
              <Route path="/admin/login" element={<ErrorBoundary><AdminLogin /></ErrorBoundary>} />
              
// Protected Administrative Routes Namespace
              <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
                <Route path="/admin/orders" element={<ErrorBoundary><AdminOrders /></ErrorBoundary>} />
                <Route path="/admin/orders/:id" element={<ErrorBoundary><AdminOrdersDetail /></ErrorBoundary>} />
                <Route path="/admin/invoices" element={<ErrorBoundary><AdminInvoices /></ErrorBoundary>} />
                <Route path="/admin/inventory" element={<ErrorBoundary><AdminInventory /></ErrorBoundary>} />
                <Route path="/admin/inventory/:productId" element={<ErrorBoundary><AdminInventoryDetail /></ErrorBoundary>} />
                <Route path="/admin/returns" element={<ErrorBoundary><AdminReturns /></ErrorBoundary>} />
                <Route path="/admin/returns/:returnId" element={<ErrorBoundary><AdminReturnDetail /></ErrorBoundary>} />
                <Route path="/admin/operations" element={<ErrorBoundary><AdminOperations /></ErrorBoundary>} />
                <Route path="/admin/operations/exceptions/:id" element={<ErrorBoundary><AdminExceptionDetail /></ErrorBoundary>} />
                <Route path="/admin/support" element={<ErrorBoundary><AdminSupport /></ErrorBoundary>} />
                <Route path="/admin/support/:ticketNumber" element={<ErrorBoundary><AdminSupportDetail /></ErrorBoundary>} />
                <Route path="/admin/suppliers" element={<ErrorBoundary><AdminSuppliers /></ErrorBoundary>} />
                <Route path="/admin/procurement" element={<ErrorBoundary><AdminProcurement /></ErrorBoundary>} />
                <Route path="/admin/inventory/batches" element={<ErrorBoundary><AdminInventoryBatches /></ErrorBoundary>} />
                <Route path="/admin/expiry" element={<ErrorBoundary><AdminExpiry /></ErrorBoundary>} />
                <Route path="/admin/recalls" element={<ErrorBoundary><AdminRecalls /></ErrorBoundary>} />
                <Route path="/admin/analytics" element={<ErrorBoundary><AdminAnalytics /></ErrorBoundary>} />
                <Route path="/admin/analytics/gst" element={<ErrorBoundary><AdminGSTReport /></ErrorBoundary>} />
                <Route path="/admin/security" element={<ErrorBoundary><AdminSecurityCenter /></ErrorBoundary>} />
                <Route path="/account/support" element={<ErrorBoundary><CustomerSupport /></ErrorBoundary>} />
                <Route path="/account/support/new" element={<ErrorBoundary><CustomerSupportNew /></ErrorBoundary>} />
                <Route path="/account/support/:ticketNumber" element={<ErrorBoundary><CustomerSupportDetail /></ErrorBoundary>} />
                <Route path="/admin/products" element={<ErrorBoundary><AdminProducts /></ErrorBoundary>} />
                <Route path="/admin/products/new" element={<ErrorBoundary><AdminProductForm /></ErrorBoundary>} />
                <Route path="/admin/products/:id" element={<ErrorBoundary><AdminProductForm /></ErrorBoundary>} />
                <Route path="/admin/enquiries" element={<ErrorBoundary><AdminEnquiries /></ErrorBoundary>} />
                <Route path="/admin/enquiries/:id" element={<ErrorBoundary><AdminEnquiryDetail /></ErrorBoundary>} />
                <Route path="/admin/distributors" element={<ErrorBoundary><AdminDistributors /></ErrorBoundary>} />
                <Route path="/admin/distributors/:id" element={<ErrorBoundary><AdminDistributorsDetail /></ErrorBoundary>} />
                <Route path="/admin/content" element={<ErrorBoundary><AdminContent /></ErrorBoundary>} />
                <Route path="/admin/testimonials" element={<ErrorBoundary><AdminTestimonials /></ErrorBoundary>} />
                <Route path="/admin/gallery" element={<ErrorBoundary><AdminGallery /></ErrorBoundary>} />
                <Route path="/admin/media" element={<ErrorBoundary><AdminMedia /></ErrorBoundary>} />
                <Route path="/admin/settings" element={<ErrorBoundary><AdminSettings /></ErrorBoundary>} />
                <Route path="/admin/profile" element={<ErrorBoundary><AdminProfile /></ErrorBoundary>} />
                <Route path="/admin/security" element={<ErrorBoundary><AdminSecurity /></ErrorBoundary>} />
              </Route>
              <Route path="/404" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </div>
        </Suspense>



        {/* Customer Sign In / Sign Up Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      </ErrorBoundary>
    </Layout>
  );
}
