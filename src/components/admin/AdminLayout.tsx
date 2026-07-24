import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { 
  List, 
  X, 
  ArrowSquareOut,
  UserCircle
} from '@phosphor-icons/react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();
  const location = useLocation();

  // Helper to translate route paths into clean breadcrumbs/titles
  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (path === 'admin') return 'Dashboard Overview';
    
    // Split and clean segments
    const segments = path.split('/');
    if (segments.length > 1) {
      if (segments[1] === 'products') return 'Product Catalog';
      if (segments[1] === 'orders') return 'Orders & Invoices';
      if (segments[1] === 'enquiries') return 'Customer Enquiries';
      if (segments[1] === 'distributors') return 'Distributor Leads';
      if (segments[1] === 'content') return 'CMS Site Content';
    }

    // Capitalize and format last segment
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="admin-app">
      <div className="admin-layout-root">
        {/* Desktop Sidebar: stays inline on large viewports */}
        <div className="hidden lg:block sticky top-0 h-screen">
          <AdminSidebar />
        </div>

        {/* Mobile Sidebar Navigation Drawer Overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
            {/* Scrim */}
            <div
              className="fixed inset-0 bg-[#13281C]/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer Container */}
            <div className="relative z-10 w-[240px] h-full animate-slideInRight">
              <AdminSidebar onMobileClose={() => setMobileOpen(false)} />
              {/* Close Button Inside Drawer Header area */}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-20 p-1.5 text-white/85 hover:text-white bg-[#214A2F]/20 hover:bg-[#214A2F]/40 rounded-lg"
                aria-label="Close admin menu"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* Main Administrative Workplace Area */}
        <div className="admin-workplace-container">
          {/* Top Header Bar */}
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              {/* Hamburger Button for Mobile Drawer Trigger */}
              <button
                type="button"
                className="lg:hidden admin-hamburger-btn"
                onClick={() => setMobileOpen(true)}
                aria-label="Open Admin Navigation Drawer"
              >
                <List size={22} weight="bold" />
              </button>

              {/* Page Title & Context Header */}
              <div className="admin-header-title-box">
                <h1 className="admin-header-page-title font-display">
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            {/* Topbar Right Controls */}
            <div className="admin-topbar-right">
              {/* Web link */}
              <Link 
                to="/" 
                className="admin-topbar-web-link hidden md:inline-flex" 
                title="View storefront homepage"
              >
                <span>Storefront</span>
                <ArrowSquareOut size={14} weight="bold" />
              </Link>

              {/* License display */}
              <div className="admin-topbar-license-badge">
                <span>Mfg. Lic. No. R-1970/Ayur</span>
              </div>

              {/* User Profile menu display */}
              <div className="admin-topbar-profile-box">
                <UserCircle size={20} className="text-[#C5A059]" />
                <span className="admin-topbar-username hidden sm:inline">
                  {profile?.full_name || 'Administrator'}
                </span>
              </div>
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
