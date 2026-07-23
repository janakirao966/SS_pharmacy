import { useState } from 'react';
import { Search, PackageCheck, Truck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { supabase, type DatabaseOrder } from '../lib/supabase';

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<DatabaseOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSearched(false);

    if (!orderNumber.trim() || !phone.trim()) {
      setError('Please enter both Order Number and Phone Number.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber.trim())
        .single();

      if (dbError || !data) {
        setError('No order found matching this Order Number and Phone Number.');
        setOrder(null);
      } else {
        setOrder(data as DatabaseOrder);
      }
    } catch (err) {
      console.error('Track Order Query Error:', err);
      setError('Unable to fetch order status. Please check your details and try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
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

  return (
    <>
      <SEO
        title="Track Order | S.S. PHARMACY"
        description="Track your S.S. PHARMACY Ayurvedic medicine order live status using your Order Number and Mobile Phone."
      />

      <div className="py-12 px-4 max-w-4xl mx-auto">
        <SectionHeader
          title="Track Your Order"
          subtitle="Enter your Order Number (e.g. SSP-1001) and Mobile Number to check real-time status."
          align="center"
        />

        {/* Form Input Box */}
        <div className="bg-[#FEFDF8] border border-[#C5A059]/30 rounded-2xl p-6 shadow-md max-w-xl mx-auto mb-10">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Number *</label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. SSP-1001"
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit registered mobile number"
                className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full bg-[#1D3A28] hover:bg-[#2D5016] text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs"
            >
              <Search size={14} />
              <span>{loading ? 'Searching...' : 'Check Status'}</span>
            </Button>
          </form>
        </div>

        {/* Results Card */}
        {searched && order && (
          <div className="bg-[#FAF7F2] border border-[#C5A059]/40 rounded-2xl p-6 shadow-lg space-y-6 animate-fadeIn max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Order ID</span>
                <span className="text-xl font-bold text-[#1D3A28] font-mono">{order.order_number}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Placed On</span>
                <span className="text-xs text-slate-600 font-medium">
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Status Progress Bar */}
            <div>
              <h4 className="text-xs font-bold text-[#8A6B29] uppercase tracking-wider mb-4">Order Progress</h4>
              <div className="grid grid-cols-4 gap-2 text-center relative">
                <div className={`space-y-1 ${getStatusStep(order.order_status) >= 1 ? 'text-[#2D5016] font-bold' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 1 ? 'bg-[#1D3A28] text-white' : 'bg-slate-200'}`}>
                    <PackageCheck size={16} />
                  </div>
                  <span className="text-[10px] block">Order Placed</span>
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

            {/* Details Grid */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-semibold text-slate-800">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold text-slate-800 uppercase">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold text-[#2D5016] bg-[#2D5016]/10 px-2 py-0.5 rounded text-[10px] uppercase">
                  {order.payment_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-[#1D3A28] text-sm">₹{order.total_amount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
