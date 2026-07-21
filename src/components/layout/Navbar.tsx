import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShoppingBag, Search, MessageCircle, X, Phone } from 'lucide-react';
import SearchModal from '../ui/SearchModal';
import { useCart } from '../../context/CartContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  isSearchOpen: boolean;
  onSearchClose: () => void;
  onSearchOpen: () => void;
}

export default function Navbar({
  activeTab,
  isSearchOpen,
  onSearchClose,
  onSearchOpen
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnnounceVisible, setIsAnnounceVisible] = useState(() => {
    return localStorage.getItem('announce-dismissed') !== 'true';
  });

  const { cartCount, setIsCartOpen } = useCart();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--nav-total-height', `${height}px`);
      }
    });

    observer.observe(header);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleDismissAnnouncement = () => {
    setIsAnnounceVisible(false);
    localStorage.setItem('announce-dismissed', 'true');
  };

  // Escape key closes mobile menu (WCAG 2.1.2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navItems = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'about', label: 'About', path: '/about' },
    { id: 'products', label: 'Products', path: '/products' },
    { id: 'why-choose-us', label: 'Why Choose Us', path: '/why-choose-us' },
    { id: 'manufacturing', label: 'Manufacturing', path: '/manufacturing' },
    { id: 'contact', label: 'Contact', path: '/contact' }
  ];

  return (
    <header ref={headerRef} className="nav-wrapper">
      {/* Skip-to-content link for keyboard navigation (WCAG 2.4.1) */}
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      {/* 1. Top Announcement Bar */}
      {isAnnounceVisible && (
        <div className="top-bar">
          <div className="top-bar-left">
            <span>Welcome to AYU S.S. Pharmacy - One Step Solution for Your Health</span>
          </div>
          <div className="top-bar-middle">
            <span>Mfg. Lic. No. R-1970/Ayur</span>
          </div>
          <div className="top-bar-right flex items-center gap-4">
            <div className="top-bar-socials">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-youtube">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
                  <path d="m10 15 5-3-5-3z" />
                </svg>
              </a>
              <a href="https://wa.me/919494323211" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="WhatsApp">
                <MessageCircle size={14} />
              </a>
            </div>
            <button
              type="button"
              onClick={handleDismissAnnouncement}
              className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Dismiss announcement"
              style={{ minWidth: '44px', minHeight: '44px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="nav-container">
        {/* Flat Navbar layout */}
        <nav className="nav-pill" aria-label="Main Navigation">
          <Link to="/" className="nav-logo" onClick={() => setIsOpen(false)}>
            <img
              src={`${import.meta.env.BASE_URL}products/logo/logo.webp`}
              alt="AYU S.S. PHARMACY Logo"
              className="w-12 h-12 object-contain rounded-full border border-[var(--color-border-hairline,#EBE6DC)]"
              style={{ width: '44px', height: '44px' }}
              width={44}
              height={44}
              decoding="async"
            />
            <span className="logo-text">
              <span>AYU S.S. PHARMACY</span>
              <span className="logo-tagline">One Step Solution</span>
            </span>
          </Link>

          <ul className="nav-links-desktop">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`nav-link-btn ${activeTab === item.id ? 'active' : ''}`}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-actions-desktop">
            {/* Desktop Search Toggle */}
            <button
              type="button"
              onClick={onSearchOpen}
              className="cart-navbar-btn"
              aria-label="Search Catalog"
            >
              <Search size={18} />
            </button>

            <Link
              to="/contact"
              className="btn-pill btn-pill-primary nav-cta"
            >
              Enquire Now
              <span className="cta-icon-wrapper">
                <ArrowUpRight className="cta-icon" size={14} />
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="cart-navbar-btn"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span key={cartCount} className="cart-badge-count">{cartCount}</span>
              )}
            </button>
          </div>

          {/* Mobile Actions Wrapper (Search, Cart, Hamburger Toggle) */}
          <div className="mobile-actions-wrapper">
            <button
              type="button"
              className="mobile-cart-navbar-btn"
              onClick={onSearchOpen}
              aria-label="Search Catalog"
            >
              <Search size={20} />
            </button>

            <button
              type="button"
              className="mobile-cart-navbar-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span key={cartCount} className="cart-badge-count">{cartCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`nav-mobile-toggle ${isOpen ? 'open' : ''}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
            >
              <span className="hamburger-line line-1"></span>
              <span className="hamburger-line line-2"></span>
              <span className="hamburger-line line-3"></span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation Overlay */}
      <div className={`nav-mobile-overlay ${isOpen ? 'active' : ''}`} role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
        {/* Mobile Overlay Top Header Bar */}
        <div className="mobile-overlay-header">
          <Link to="/" className="nav-logo" onClick={() => setIsOpen(false)}>
            <img
              src={`${import.meta.env.BASE_URL}products/logo/logo.webp`}
              alt="AYU S.S. PHARMACY Logo"
              style={{ width: '40px', height: '40px' }}
              width={40}
              height={40}
              decoding="async"
              className="rounded-full border border-[var(--color-border-hairline)]"
            />
            <span className="logo-text">
              <span style={{ fontSize: '1.1rem' }}>AYU S.S. PHARMACY</span>
              <span className="logo-tagline" style={{ fontSize: '0.75rem' }}>One Step Solution</span>
            </span>
          </Link>
          <button
            type="button"
            className="mobile-overlay-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Mobile Overlay Navigation Links Body */}
        <div className="mobile-overlay-body">
          <ul className="nav-links-mobile">
            {navItems.map((item, index) => (
              <li
                key={item.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className={isOpen ? 'fade-in-slide' : ''}
              >
                <Link
                  to={item.path}
                  className={`nav-link-mobile-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <span>{item.label}</span>
                  {activeTab === item.id && <span className="mobile-active-indicator" />}
                </Link>
              </li>
            ))}
            <li style={{ animationDelay: `${navItems.length * 60}ms` }} className={isOpen ? 'fade-in-slide' : ''}>
              <Link
                to="/contact"
                className="btn-pill btn-pill-primary w-full mt-4 justify-center"
                onClick={() => setIsOpen(false)}
              >
                Enquire Now
                <ArrowUpRight size={16} style={{ marginLeft: '4px' }} />
              </Link>
            </li>
          </ul>
        </div>

        {/* Mobile Overlay Footer Strip */}
        <div className="mobile-overlay-footer">
          <a href="tel:+919494323211" className="mobile-footer-contact">
            <Phone size={14} />
            <span>+91 94943 23211</span>
          </a>
          <span className="mobile-footer-lic">Mfg. Lic. No. R-1970/Ayur</span>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={onSearchClose} />
    </header>
  );
}
