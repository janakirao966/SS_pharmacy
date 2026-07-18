import { type ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from '../ui/CartDrawer';

interface LayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: ReactNode;
  isSearchOpen: boolean;
  onSearchClose: () => void;
  onSearchOpen: () => void;
}

export default function Layout({
  activeTab,
  setActiveTab,
  children,
  isSearchOpen,
  onSearchClose,
  onSearchOpen
}: LayoutProps) {
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('ss_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setShowCookieConsent(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('ss_cookie_consent', 'accepted');
    setShowCookieConsent(false);
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('ss_cookie_consent', 'declined');
    setShowCookieConsent(false);
  };

  return (
    <div className="app-layout">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSearchOpen={isSearchOpen}
        onSearchClose={onSearchClose}
        onSearchOpen={onSearchOpen}
      />
      <main id="main-content" className="main-content-area">
        {children}
      </main>
      <Footer setActiveTab={setActiveTab} />
      
      <CartDrawer />
      
      {showCookieConsent && (
        <div className="cookie-consent-banner" role="status" aria-live="polite">
          <div className="cookie-consent-content">
            <p className="cookie-consent-text">
              We use subtle first-party cookies and local storage to optimize your B2B partner experience (such as maintaining your sample cart). By clicking "Accept", you agree to our processing of site usage data in compliance with the DPDP Act and GDPR. Learn more in our <Link to="/privacy" className="cookie-consent-link" onClick={() => setActiveTab('privacy')}>Privacy Policy</Link>.
            </p>
            <div className="cookie-consent-actions">
              <button type="button" onClick={handleDeclineCookies} className="btn-cookie-decline">
                Decline
              </button>
              <button type="button" onClick={handleAcceptCookies} className="btn-cookie-accept">
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating WhatsApp B2B Help Desk FAB */}
      <a
        href="https://wa.me/919494323211"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-btn"
        aria-label="Chat with S.S. Pharmacy on WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.59 1.97 14.12 .947 11.496.947c-5.442 0-9.866 4.372-9.87 9.802 0 1.814.485 3.58 1.402 5.124l-.993 3.626 3.722-.975zm11.367-7.474c-.265-.134-1.57-.775-1.813-.863-.243-.088-.419-.133-.596.134-.176.265-.682.863-.837 1.04-.155.176-.308.198-.573.065-.265-.133-1.12-.413-2.133-1.32-.788-.702-1.32-1.57-1.474-1.835-.155-.265-.017-.409.116-.541.12-.119.265-.309.398-.464.133-.155.177-.265.265-.442.088-.177.044-.332-.022-.464-.066-.133-.596-1.436-.816-1.966-.215-.518-.432-.447-.596-.456-.153-.008-.33-.008-.507-.008-.177 0-.464.066-.706.331-.243.265-.927.906-.927 2.21 0 1.303.948 2.56 1.08 2.737.133.177 1.866 2.85 4.52 3.998.631.27 1.124.432 1.508.555.635.201 1.213.173 1.67.104.509-.077 1.57-.641 1.79-1.259.221-.619.221-1.15.155-1.259-.066-.109-.243-.177-.508-.311z"/>
        </svg>
      </a>
    </div>
  );
}
