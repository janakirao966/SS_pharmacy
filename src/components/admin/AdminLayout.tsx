import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { 
  List, 
  X, 
  ArrowSquareOut,
  CaretRight
} from '@phosphor-icons/react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface PageContext {
  group: string;
  title: string;
}

// Helper to translate route paths into clean group breadcrumbs and operational page titles
const getPageContext = (pathname: string): PageContext => {
  if (pathname === '/admin') return { group: 'Overview', title: 'Dashboard' };
  if (pathname === '/admin/analytics') return { group: 'Overview', title: 'Analytics' };
  if (pathname === '/admin/analytics/gst') return { group: 'Overview', title: 'GST Register' };

  if (pathname === '/admin/orders') return { group: 'Commerce', title: 'Orders' };
  if (pathname.startsWith('/admin/orders/')) return { group: 'Commerce', title: 'Order Details' };
  if (pathname === '/admin/returns') return { group: 'Commerce', title: 'Returns' };
  if (pathname.startsWith('/admin/returns/')) return { group: 'Commerce', title: 'Return Details' };
  if (pathname === '/admin/invoices') return { group: 'Commerce', title: 'Invoices' };

  if (pathname === '/admin/products') return { group: 'Catalog & Stock', title: 'Products' };
  if (pathname === '/admin/products/new') return { group: 'Catalog & Stock', title: 'New Product' };
  if (pathname.startsWith('/admin/products/')) return { group: 'Catalog & Stock', title: 'Edit Product' };
  if (pathname === '/admin/inventory') return { group: 'Catalog & Stock', title: 'Inventory' };
  if (pathname.startsWith('/admin/inventory/batches')) return { group: 'Catalog & Stock', title: 'Batches' };
  if (pathname.startsWith('/admin/inventory/')) return { group: 'Catalog & Stock', title: 'Inventory Detail' };
  if (pathname === '/admin/expiry') return { group: 'Catalog & Stock', title: 'Expiry' };

  if (pathname === '/admin/suppliers') return { group: 'Supply', title: 'Suppliers' };
  if (pathname === '/admin/procurement') return { group: 'Supply', title: 'Procurement' };
  if (pathname === '/admin/recalls') return { group: 'Supply', title: 'Recalls' };

  if (pathname === '/admin/support') return { group: 'Customers', title: 'Support' };
  if (pathname.startsWith('/admin/support/')) return { group: 'Customers', title: 'Ticket Details' };
  if (pathname === '/admin/enquiries') return { group: 'Customers', title: 'Enquiries' };
  if (pathname.startsWith('/admin/enquiries/')) return { group: 'Customers', title: 'Enquiry Detail' };
  if (pathname === '/admin/distributors') return { group: 'Customers', title: 'Distributors' };
  if (pathname.startsWith('/admin/distributors/')) return { group: 'Customers', title: 'Distributor Detail' };

  if (pathname === '/admin/content') return { group: 'Content', title: 'Content' };
  if (pathname === '/admin/testimonials') return { group: 'Content', title: 'Testimonials' };
  if (pathname === '/admin/gallery') return { group: 'Content', title: 'Gallery' };
  if (pathname === '/admin/media') return { group: 'Content', title: 'Media' };

  if (pathname === '/admin/operations') return { group: 'System', title: 'Operations' };
  if (pathname.startsWith('/admin/operations/exceptions/')) return { group: 'System', title: 'Exception Diagnostic' };
  if (pathname === '/admin/security') return { group: 'System', title: 'Security' };
  if (pathname === '/admin/settings') return { group: 'System', title: 'Settings' };
  if (pathname === '/admin/profile') return { group: 'System', title: 'Profile' };

  return { group: 'Admin', title: 'Management' };
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();
  const location = useLocation();

  const pageContext = getPageContext(location.pathname);

  // Close mobile drawer on Escape key press or location change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Lock body scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const userInitial = profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'A';

  return (
    <div className="admin-app">
      <div className="admin-layout-root">
        {/* Desktop Sidebar: stays inline on large viewports (z-30) */}
        <div className="hidden lg:block sticky top-0 h-screen z-30">
          <AdminSidebar />
        </div>

        {/* Mobile Sidebar Navigation Drawer Overlay (z-40 scrim, z-50 drawer) */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Admin Navigation Menu">
            {/* Scrim */}
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer Container */}
            <div className="relative z-50 w-[240px] h-full bg-[#18181b]">
              <AdminSidebar onMobileClose={() => setMobileOpen(false)} />
              {/* Close Button Inside Drawer Header area */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white bg-[#27272a] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close admin menu"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* Main Administrative Workplace Area */}
        <div className="admin-workplace-container">
          {/* Top Header Bar (z-20) */}
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              {/* Hamburger Button for Mobile Drawer Trigger */}
              <button
                type="button"
                className="lg:hidden admin-hamburger-btn"
                onClick={() => setMobileOpen(true)}
                aria-label="Open Admin Navigation Drawer"
                aria-expanded={mobileOpen}
              >
                <List size={22} weight="bold" />
              </button>

              {/* Page Context & Breadcrumb Header */}
              <div className="admin-header-title-box">
                {pageContext.group !== 'Overview' && (
                  <nav aria-label="Breadcrumb" className="admin-header-breadcrumb">
                    <span>{pageContext.group}</span>
                    <CaretRight size={10} className="text-[#a1a1aa] mx-0.5" />
                    <span>{pageContext.title}</span>
                  </nav>
                )}
                <h1 className="admin-header-page-title">
                  {pageContext.title}
                </h1>
              </div>
            </div>

            {/* Topbar Right Controls */}
            <div className="admin-topbar-right">
              {/* Storefront view link */}
              <Link 
                to="/" 
                className="admin-topbar-web-link hidden md:inline-flex" 
                title="View storefront homepage"
              >
                <span>Storefront</span>
                <ArrowSquareOut size={14} weight="bold" />
              </Link>

              {/* Mfg. License Badge */}
              <div className="admin-topbar-license-badge hidden sm:inline-flex">
                <span>Lic. R-1970/Ayur</span>
              </div>

              {/* User Profile Badge */}
              <Link to="/admin/profile" className="admin-topbar-profile-box no-underline" title="View Admin Profile">
                <div className="w-7 h-7 rounded-full bg-[#f4f4f0] border border-[#e4e4e7] flex items-center justify-center text-[0.75rem] font-bold text-[#000000]">
                  {userInitial}
                </div>
                <span className="admin-topbar-username hidden sm:inline">
                  {profile?.full_name || 'Administrator'}
                </span>
              </Link>
            </div>
          </header>

          {/* Admin Workspace Content view */}
          <main className="admin-main-body">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
