import { useState, useEffect } from 'react';
import { User, PackageCheck, Clock, Truck, CheckCircle2, ShoppingBag, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { supabase, type DatabaseOrder } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function CustomerAccount() {
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setUser(sessionData.session.user);
          fetchCustomerOrders(sessionData.session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Session load error:', err);
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const fetchCustomerOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as DatabaseOrder[]);
      }
    } catch (err) {
      console.error('Fetch customer orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    showToast('Signed out successfully', 'info');
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 1;
      case 'preparing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 1;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-[#1D3A28]/20 border-t-[#C5A059] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-[#1D3A28]/10 text-[#1D3A28] rounded-full flex items-center justify-center mx-auto border border-[#C5A059]/30">
          <User size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-[#1D3A28]">Customer Member Account</h2>
        <p className="text-xs text-slate-600">
          Please sign in to view your past orders, active shipment tracking, and delivery preferences.
        </p>
        <Button
          variant="primary"
          onClick={() => (window.location.href = '/track-order')}
          className="bg-[#1D3A28] hover:bg-[#2D5016] text-white py-2.5 px-6 rounded-xl font-bold text-xs"
        >
          Track Order Without Account
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEO title="My Account | S.S. PHARMACY" description="Customer profile and order tracking portal." />

      <div className="py-10 px-4 max-w-5xl mx-auto space-y-8">
        {/* Profile Card Header */}
        <div className="bg-[#FEFDF8] border border-[#C5A059]/30 rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#1D3A28] text-[#C5A059] rounded-2xl flex items-center justify-center font-bold text-xl font-display">
              {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#1D3A28]">
                {user.user_metadata?.full_name || 'S.S. Pharmacy Customer'}
              </h1>
              <p className="text-xs text-slate-500">{user.email}</p>
              {user.user_metadata?.phone && (
                <p className="text-xs text-slate-500 font-mono">📞 {user.user_metadata.phone}</p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="text-xs border-slate-300 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </Button>
        </div>

        {/* Order History */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[#1D3A28] flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#C5A059]" />
            <span>My Order History</span>
          </h2>

          {orders.length === 0 ? (
            <div className="bg-[#FEFDF8] border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <ShoppingBag size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold">You have not placed any orders yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-[#FEFDF8] border border-[#C5A059]/30 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order ID</span>
                      <span className="text-lg font-bold text-[#1D3A28] font-mono">{order.order_number}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Paid</span>
                      <span className="text-lg font-bold text-[#1D3A28]">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Live Progress Stepper */}
                  <div>
                    <span className="text-[10px] font-bold text-[#8A6B29] uppercase tracking-wider block mb-3">Live Order Progress</span>
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      <div className={`space-y-1 ${getStatusStep(order.order_status) >= 1 ? 'text-[#2D5016] font-bold' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 1 ? 'bg-[#1D3A28] text-white' : 'bg-slate-200'}`}>
                          <PackageCheck size={16} />
                        </div>
                        <span className="text-[10px] block">Placed</span>
                      </div>

                      <div className={`space-y-1 ${getStatusStep(order.order_status) >= 2 ? 'text-[#2D5016] font-bold' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 2 ? 'bg-[#1D3A28] text-white' : 'bg-slate-200'}`}>
                          <Clock size={16} />
                        </div>
                        <span className="text-[10px] block">Preparing</span>
                      </div>

                      <div className={`space-y-1 ${getStatusStep(order.order_status) >= 3 ? 'text-[#2D5016] font-bold' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 3 ? 'bg-[#1D3A28] text-white' : 'bg-slate-200'}`}>
                          <Truck size={16} />
                        </div>
                        <span className="text-[10px] block">Dispatched</span>
                      </div>

                      <div className={`space-y-1 ${getStatusStep(order.order_status) >= 4 ? 'text-[#2D5016] font-bold' : 'text-slate-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 4 ? 'bg-[#1D3A28] text-white' : 'bg-slate-200'}`}>
                          <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[10px] block">Delivered</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
