import { useState } from 'react';
import { Search, PackageCheck, Truck, Clock, CheckCircle2, AlertCircle, ShieldCheck, Compass } from 'lucide-react';
import SEO from '../components/ui/SEO';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSearched(false);

    if (!orderNumber.trim() || !phone.trim()) {
      setError('Please enter both Order Number and Registered Mobile Phone.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: dbError } = await supabase.rpc('track_guest_order', {
        p_order_number: orderNumber.trim(),
        p_customer_phone: phone.trim()
      });

      if (dbError || !data) {
        setError('No order found matching this Order Reference Number and Phone Number.');
        setOrder(null);
      } else {
        setOrder(data);
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
      case 'processing':
      case 'packed':
        return 2;
      case 'shipped':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="track-portal-wrapper">
      <SEO
        title="Live Order Dispatch Tracking | S.S. PHARMACY"
        description="Track your S.S. PHARMACY Ayurvedic formulation order live status using your Order Number and Mobile Phone."
      />

      <div className="track-portal-container">
        {/* Breadcrumb Bar */}
        <div className="account-breadcrumb-bar">
          <button onClick={() => navigate('/')} className="account-breadcrumb-btn">Home</button>
          <span>/</span>
          <span className="account-breadcrumb-current">Live Order Tracking</span>
        </div>

        {/* HERO HEADER CARD */}
        <div className="track-hero-card">
          <span className="track-hero-badge">
            <ShieldCheck size={14} />
            <span>AYURVEDIC DISPATCH TRACKING PORTAL</span>
          </span>
          <h1 className="track-hero-title">Track Your Shipment Status</h1>
          <p className="track-hero-desc">
            Enter your Order Reference Number (e.g. SSP-1001) and registered mobile phone to view real-time package dispatch, courier tracking AWB numbers, and fulfillment steps.
          </p>
        </div>

        {/* SEARCH FORM CARD */}
        <div className="track-search-card">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 text-left">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="address-form-label">Order Number *</label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. SSP-1001"
                className="address-form-input font-mono"
              />
            </div>

            <div>
              <label className="address-form-label">Registered Mobile Phone *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="address-form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="track-search-btn"
            >
              <Search size={16} />
              <span>{loading ? 'Querying Order Record...' : 'Track Package Live'}</span>
            </button>
          </form>
        </div>

        {/* SEARCH RESULTS CARD */}
        {searched && order && (
          <div className="track-results-card">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E8E5DE]">
              <div>
                <span className="text-[10px] font-bold text-[#667068] uppercase tracking-wider block">Order Reference</span>
                <span className="text-xl font-bold text-[#1D3A28] font-mono">{order.order_number}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#667068] uppercase tracking-wider block">Placed On</span>
                <span className="text-xs text-[#1F2A22] font-semibold">
                  {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* FULFILLMENT TIMELINE */}
            <div>
              <h4 className="text-xs font-bold text-[#C5A059] uppercase tracking-wider mb-3">Order Progress</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className={`space-y-1.5 ${getStatusStep(order.order_status) >= 1 ? 'text-[#1D3A28] font-bold' : 'text-[#667068]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 1 ? 'bg-[#1D3A28] text-white shadow-xs' : 'bg-[#E8E5DE]'}`}>
                    <PackageCheck size={16} />
                  </div>
                  <span className="text-xs block">Placed</span>
                </div>

                <div className={`space-y-1.5 ${getStatusStep(order.order_status) >= 2 ? 'text-[#1D3A28] font-bold' : 'text-[#667068]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 2 ? 'bg-[#1D3A28] text-white shadow-xs' : 'bg-[#E8E5DE]'}`}>
                    <Clock size={16} />
                  </div>
                  <span className="text-xs block">Processing</span>
                </div>

                <div className={`space-y-1.5 ${getStatusStep(order.order_status) >= 3 ? 'text-[#1D3A28] font-bold' : 'text-[#667068]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 3 ? 'bg-[#1D3A28] text-white shadow-xs' : 'bg-[#E8E5DE]'}`}>
                    <Truck size={16} />
                  </div>
                  <span className="text-xs block">Dispatched</span>
                </div>

                <div className={`space-y-1.5 ${getStatusStep(order.order_status) >= 4 ? 'text-[#1D3A28] font-bold' : 'text-[#667068]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto text-xs ${getStatusStep(order.order_status) >= 4 ? 'bg-[#1D3A28] text-white shadow-xs' : 'bg-[#E8E5DE]'}`}>
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-xs block">Delivered</span>
                </div>
              </div>
            </div>

            {/* DESTINATION & PAYMENT DETAILS */}
            <div className="bg-[#FEFDF8] p-4 rounded-xl border border-[#E8E5DE] text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[#667068]">Shipping Destination:</span>
                <span className="font-semibold text-[#1D3A28] text-right">{order.destination}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#667068]">Payment Status:</span>
                <span className="font-bold text-[#1D3A28] bg-[#EEF7F1] px-2.5 py-0.5 rounded-full text-[10px] uppercase border border-[#D1E2D5]">
                  {order.payment_status}
                </span>
              </div>
            </div>

            {/* SHIPMENT COURIER TRACKING BOX */}
            {order.shipment && (
              <div className="bg-[#EEF7F1] p-4 rounded-xl border border-[#D1E2D5] text-xs space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-[#D1E2D5] pb-2">
                  <span className="text-[10px] font-bold text-[#1D3A28] uppercase tracking-wider">Courier &amp; AWB Tracking</span>
                  <span className="text-[10px] font-bold uppercase text-[#1D3A28] bg-white px-2 py-0.5 rounded border border-[#D1E2D5]">
                    {order.shipment.shipment_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[#1F2A22]">
                  <div>
                    <span className="text-[10px] font-semibold text-[#667068] block">Courier Partner</span>
                    <span className="font-bold text-[#1D3A28]">{order.shipment.carrier}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#667068] block">Tracking Number</span>
                    <span className="font-mono font-bold text-[#1D3A28]">{order.shipment.tracking_number}</span>
                  </div>
                </div>

                {order.shipment.tracking_url && order.shipment.tracking_url.startsWith('https://') && (
                  <div className="pt-1">
                    <a
                      href={order.shipment.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#1D3A28] hover:bg-[#2D5016] text-white py-2.5 px-4 rounded-full font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors text-decoration-none shadow-xs"
                    >
                      <Compass size={14} />
                      <span>Open Live Courier Tracking Website</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
