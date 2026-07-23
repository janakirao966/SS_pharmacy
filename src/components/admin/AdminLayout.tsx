import { useState } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F9F8F3]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <AdminSidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-[280px]">
            <AdminSidebar onMobileClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-[#FEFDF8] px-4 lg:px-8 shadow-sm">
          <button
            type="button"
            className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            onClick={() => setMobileOpen(true)}
            aria-label="Toggle Admin Navigation Menu"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#C5A059]" />
            <span className="font-display font-bold text-sm text-[#1D3A28]">
              S.S. PHARMACY Admin Control Center
            </span>
          </div>

          <div className="text-[11px] font-semibold text-[#8A6B29] bg-[#C5A059]/10 px-3 py-1 rounded-full border border-[#C5A059]/30">
            Mfg. Lic. No. R-1970/Ayur
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
