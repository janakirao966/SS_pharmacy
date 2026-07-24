import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AdminConfirmDialog } from './AdminConfirmDialog';
import { 
  SquaresFour, 
  Package, 
  ShoppingBag, 
  ChatCircleText, 
  Handshake, 
  FileText, 
  Quotes, 
  Images, 
  Image, 
  GearSix, 
  ArrowSquareOut, 
  UserCircle, 
  SignOut,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';

interface AdminSidebarProps {
  onMobileClose?: () => void;
}

export function AdminSidebar({ onMobileClose }: AdminSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOutClick = () => {
    setIsSignOutDialogOpen(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutDialogOpen(false);
    try {
      await signOut();
      showToast('Signed out successfully.', 'success');
      window.location.href = '/admin/login';
    } catch (err) {
      console.error('Sign out failed:', err);
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  const navClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Toggle Collapse Button (Desktop Only) */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="admin-sidebar-toggle-btn hidden lg:flex"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <CaretRight size={12} weight="bold" /> : <CaretLeft size={12} weight="bold" />}
        </button>

        {/* Brand/Logo Section */}
        <div className="admin-sidebar-brand-box">
          <Link to="/admin" onClick={navClick} className="admin-brand-link">
            <img 
              src={`${import.meta.env.BASE_URL}products/logo/logo.webp`}
              alt="S.S. Pharmacy Logo" 
              className="admin-brand-logo-img"
            />
            {!isCollapsed && (
              <div className="admin-brand-text-box">
                <span className="admin-brand-title">S.S. PHARMACY</span>
                <span className="admin-brand-subtitle">CONTROL CENTER</span>
              </div>
            )}
          </Link>
        </div>

        {/* Scrollable Navigation */}
        <nav className="admin-sidebar-nav">
          {/* OVERVIEW SECTION */}
          <div className="admin-nav-group">
            {!isCollapsed && <p className="admin-nav-group-title">Overview</p>}
            <NavItem 
              href="/admin" 
              icon={<SquaresFour size={18} />} 
              label="Dashboard" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
          </div>

          {/* COMMERCE SECTION */}
          <div className="admin-nav-group">
            {!isCollapsed && <p className="admin-nav-group-title">Commerce</p>}
            <NavItem 
              href="/admin/orders" 
              icon={<ShoppingBag size={18} />} 
              label="Orders" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/products" 
              icon={<Package size={18} />} 
              label="Products" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
          </div>

          {/* CUSTOMERS SECTION */}
          <div className="admin-nav-group">
            {!isCollapsed && <p className="admin-nav-group-title">Customers</p>}
            <NavItem 
              href="/admin/enquiries" 
              icon={<ChatCircleText size={18} />} 
              label="Enquiries" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/distributors" 
              icon={<Handshake size={18} />} 
              label="Distributor Leads" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
          </div>

          {/* WEBSITE SECTION */}
          <div className="admin-nav-group">
            {!isCollapsed && <p className="admin-nav-group-title">Website</p>}
            <NavItem 
              href="/admin/content" 
              icon={<FileText size={18} />} 
              label="Content" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/testimonials" 
              icon={<Quotes size={18} />} 
              label="Testimonials" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/gallery" 
              icon={<Images size={18} />} 
              label="Gallery" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/media" 
              icon={<Image size={18} />} 
              label="Media Library" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
          </div>

          {/* SYSTEM SECTION */}
          <div className="admin-nav-group">
            {!isCollapsed && <p className="admin-nav-group-title">System</p>}
            <NavItem 
              href="/admin/settings" 
              icon={<GearSix size={18} />} 
              label="Settings" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/profile" 
              icon={<UserCircle size={18} />} 
              label="Profile" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
            <NavItem 
              href="/admin/security" 
              icon={<GearSix size={18} />} 
              label="Security" 
              collapsed={isCollapsed} 
              pathname={pathname} 
              onClick={navClick} 
            />
          </div>
        </nav>

        {/* Footer Area */}
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-footer-btn" onClick={navClick} title="View Website">
            <ArrowSquareOut size={16} />
            {!isCollapsed && <span>View Website</span>}
          </Link>
          <button 
            type="button" 
            onClick={handleSignOutClick} 
            className="admin-footer-btn logout" 
            title="Sign Out"
          >
            <SignOut size={16} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <AdminConfirmDialog
        isOpen={isSignOutDialogOpen}
        title="Sign Out"
        message="Are you sure you want to sign out from the S.S. Pharmacy Admin Control Center?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setIsSignOutDialogOpen(false)}
      />
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  pathname: string;
  onClick?: () => void;
}

function NavItem({ href, icon, label, collapsed, pathname, onClick }: NavItemProps) {
  // Matches exact dashboard or sub-pages under specific modules
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));

  return (
    <Link
      to={href}
      onClick={onClick}
      className={`admin-nav-item ${isActive ? 'active' : ''}`}
      title={collapsed ? label : undefined}
    >
      <span className="admin-nav-item-icon">{icon}</span>
      {!collapsed && <span className="admin-nav-item-label">{label}</span>}
    </Link>
  );
}
