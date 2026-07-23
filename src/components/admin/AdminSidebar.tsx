import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  Users, 
  Settings, 
  ShoppingCart,
  Inbox,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminSidebarProps {
  className?: string;
  onMobileClose?: () => void;
}

export function AdminSidebar({ className = '', onMobileClose }: AdminSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside className={`w-[280px] flex-shrink-0 flex flex-col h-full bg-[#1D3A28] text-white border-r border-[#C5A059]/30 shadow-2xl z-30 ${className}`}>
      {/* Header Logo Box */}
      <div className="h-20 flex-shrink-0 flex items-center px-6 border-b border-white/10 bg-[#142A1D]">
        <Link to="/admin/orders" onClick={navClick} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="font-display font-bold text-lg leading-none text-white tracking-wide block">S.S. PHARMACY</span>
            <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em] mt-0.5 block">Admin Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold text-[#C5A059]/80 mb-3 uppercase tracking-[0.2em]">General</p>
          <div className="space-y-1">
            <NavItem href="/admin/orders" icon={<ShoppingCart size={18} />} label="Orders & Fulfillment" pathname={pathname} onClick={navClick} />
            <NavItem href="/admin/analytics" icon={<TrendingUp size={18} />} label="Sales Analytics" pathname={pathname} onClick={navClick} />
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] font-bold text-[#C5A059]/80 mb-3 uppercase tracking-[0.2em]">Inventory & Catalog</p>
          <div className="space-y-1">
            <NavItem href="/products" icon={<Package size={18} />} label="Product Catalog" pathname={pathname} onClick={navClick} />
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] font-bold text-[#C5A059]/80 mb-3 uppercase tracking-[0.2em]">B2B & Customer Leads</p>
          <div className="space-y-1">
            <NavItem href="/admin/inquiries" icon={<Inbox size={18} />} label="Distributor Leads" pathname={pathname} onClick={navClick} />
            <NavItem href="/track-order" icon={<Users size={18} />} label="Order Tracking Tool" pathname={pathname} onClick={navClick} />
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] font-bold text-[#C5A059]/80 mb-3 uppercase tracking-[0.2em]">System Config</p>
          <div className="space-y-1">
            <NavItem href="/admin/settings" icon={<Settings size={18} />} label="System Settings" pathname={pathname} onClick={navClick} />
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className="p-4 space-y-2 border-t border-white/10 bg-[#142A1D] mt-auto">
        <Link
          to="/"
          onClick={navClick}
          className="flex items-center justify-between w-full px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <ExternalLink size={16} className="text-[#C5A059]" />
            <span>Back to Storefront</span>
          </div>
          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-4 py-3 text-xs font-bold text-red-300 hover:text-red-100 hover:bg-red-500/10 rounded-xl transition-all text-left"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon,
  label,
  pathname,
  onClick
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = pathname === href || (href !== '/admin/orders' && pathname.startsWith(href));

  return (
    <Link
      to={href}
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3 text-xs rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-[#C5A059] text-[#1D3A28] font-bold shadow-md'
          : 'text-slate-200 hover:text-white hover:bg-white/10 font-medium'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={isActive ? 'text-[#1D3A28]' : 'text-[#C5A059]'}>
          {icon}
        </span>
        <span>{label}</span>
      </div>
    </Link>
  );
}
