import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShoppingBag, Search } from 'lucide-react';
import SearchModal from '../ui/SearchModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  cartCount?: number;
  onCartClick?: () => void;
  isSearchOpen: boolean;
  onSearchClose: () => void;
  onSearchOpen: () => void;
}

export default function Navbar({
  activeTab,
  cartCount = 0,
  onCartClick,
  isSearchOpen,
  onSearchClose,
  onSearchOpen
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnnounceVisible, setIsAnnounceVisible] = useState(() => {
    return localStorage.getItem('announce-dismissed') !== 'true';
  });

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
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="Instagram">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="YouTube">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://wa.me/919494323211" target="_blank" rel="noopener noreferrer" className="top-bar-social-link" aria-label="WhatsApp">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" width="16" height="16"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.117-2.877-6.979-1.858-1.862-4.332-2.885-6.976-2.887-5.443 0-9.87 4.42-9.874 9.865-.001 1.748.461 3.454 1.336 4.97L1.879 21.05l5.068-1.33c-.02.01-.1.054-.3.134zM16.924 13.91c-.27-.136-1.593-.787-1.84-.877-.246-.09-.425-.136-.605.136-.18.27-.696.877-.853 1.057-.157.18-.314.202-.584.067-.27-.136-1.14-.42-2.172-1.341-.803-.715-1.345-1.6-1.502-1.87-.157-.27-.017-.417.118-.552.122-.122.27-.315.405-.472.135-.158.18-.27.27-.45.09-.18.045-.337-.023-.472-.068-.136-.605-1.46-.829-2.002-.218-.524-.46-.453-.63-.462-.163-.008-.35-.01-.537-.01-.187 0-.493.07-.752.35-.26.28-1 .977-1 2.383s1.025 2.76 1.17 2.955c.145.195 2.018 3.081 4.889 4.32.683.295 1.216.47 1.632.602.687.219 1.312.188 1.807.114.551-.082 1.593-.652 1.817-1.282.225-.63.225-1.17.157-1.282-.068-.113-.247-.202-.517-.337z"/></svg>
              </a>
            </div>
            <button
              type="button"
              onClick={handleDismissAnnouncement}
              className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Dismiss announcement"
              style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
              src="/products/logo/logo.webp"
              alt="AYU S.S. PHARMACY Logo"
              className="w-12 h-12 object-contain rounded-full border border-[#EBE6DC]"
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
              onClick={onCartClick}
              className="cart-navbar-btn"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span key={cartCount} className="cart-badge-count">{cartCount}</span>
              )}
            </button>
          </div>

          {/* Mobile Search Toggle */}
          <button
            type="button"
            className="mobile-cart-navbar-btn"
            onClick={onSearchOpen}
            aria-label="Search Catalog"
            style={{ marginRight: '0.5rem' }}
          >
            <Search size={20} />
          </button>

          {/* Mobile Cart Toggle */}
          <button
            type="button"
            className="mobile-cart-navbar-btn"
            onClick={onCartClick}
            aria-label="Open Shopping Bag"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span key={cartCount} className="cart-badge-count">{cartCount}</span>
            )}
          </button>

          {/* Mobile Toggle */}
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
        </nav>
      </div>

      {/* Mobile Navigation Overlay */}
      <div className={`nav-mobile-overlay ${isOpen ? 'active' : ''}`} role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
        <ul className="nav-links-mobile">
          {navItems.map((item, index) => (
            <li
              key={item.id}
              style={{ animationDelay: `${index * 80}ms` }}
              className={isOpen ? 'fade-in-slide' : ''}
            >
              <Link
                to={item.path}
                className={`nav-link-mobile-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li style={{ animationDelay: `${navItems.length * 80}ms` }} className={isOpen ? 'fade-in-slide' : ''}>
            <Link
              to="/contact"
              className="btn-pill btn-pill-primary w-full mt-4 justify-center"
              onClick={() => setIsOpen(false)}
            >
              Enquire Now
            </Link>
          </li>
        </ul>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={onSearchClose} />
    </header>
  );
}
