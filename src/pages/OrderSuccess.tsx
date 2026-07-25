import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShieldCheck, MessageCircle, Loader2, MapPin, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Container from '../components/layout/Container';
import CleanCard from '../components/cards/CleanCard';
import Button from '../components/ui/Button';

export default function OrderSuccess() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrderDetails() {
      if (!orderNumber) return;
      try {
        setLoading(true);

        if (user) {
          // Query order securely from DB for logged in user
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', orderNumber)
            .single();

          if (orderError || !orderData) {
            setError('Order not found or access restricted.');
            return;
          }
          setOrder(orderData);

          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderData.id);

          if (!itemsError && itemsData) {
            setItems(itemsData);
          }
        } else if (token) {
          // Guest lookup via token
          const { data: guestData, error: guestError } = await supabase.rpc('get_guest_order_receipt', {
            p_order_number: orderNumber,
            p_token: token
          });

          if (guestError || !guestData) {
            setError('Secure receipt session expired or invalid token.');
            return;
          }
          setOrder(guestData);
          setItems(guestData.items || []);
        } else {
          setError('Order access restricted. Please log in to view this receipt.');
          return;
        }

      } catch (err: any) {
        console.error('Fetch order success details error:', err);
        setError('An error occurred while loading order information.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrderDetails();
  }, [orderNumber, user, token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-page-header">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#1D3A28]" size={36} />
          <p className="text-xs text-slate-500 font-semibold">Retrieving secure receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center pt-page-header px-4">
        <CleanCard className="max-w-md w-full text-center" innerClassName="p-8">
          <h2 className="text-red-600 font-display text-xl font-bold mb-2">Order Lookup Failed</h2>
          <p className="text-xs text-slate-600 mb-6">{error || 'This receipt cannot be viewed publicly.'}</p>
          <Button variant="primary" onClick={() => navigate('/products')} className="w-full">
            Back to Products Catalog
          </Button>
        </CleanCard>
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(
    `Hello S.S. PHARMACY team, I have placed order #${order.order_number} for ₹${order.total_amount}. Please confirm dispatch details.`
  );

  return (
    <div className="order-success-page bg-[#FEFDF8] min-h-screen py-12 pt-page-header text-left">
      <Container size="narrow">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header check circle */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#1D3A28]/10 text-[#1D3A28] rounded-full flex items-center justify-center mx-auto border border-[#2D5016]/20">
              <CheckCircle size={36} className="text-[#2D5016]" />
            </div>
            <h1 className="font-display text-3xl font-bold text-[#1D3A28] m-0">Order Confirmed!</h1>
            <p className="text-xs text-slate-600">
              Thank you. Your Ayurvedic formulation order has been securely placed.
            </p>
          </div>

          {/* Receipt ticket */}
          <CleanCard innerClassName="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Number</span>
                <span className="text-lg font-bold text-[#1D3A28] font-mono">{order.order_number}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Status</span>
                <span className="text-xs font-bold text-[#2D5016] uppercase bg-[#2D5016]/10 px-2 py-0.5 rounded">
                  {order.order_status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* List of items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A6B29] m-0">Items Purchased</h3>
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2.5 text-xs text-slate-800">
                    <div>
                      <span className="font-semibold">{item.product_name}</span>
                      <span className="text-slate-500 ml-1.5">× {item.quantity}</span>
                    </div>
                    <span className="font-bold text-[#1D3A28]">₹{item.total_price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="border-t border-slate-200 pt-4 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>{Number(order.delivery_charge) === 0 ? 'FREE' : `₹${order.delivery_charge}`}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between font-bold text-sm text-[#1D3A28]">
                <span>Total Amount Paid</span>
                <span>₹{order.total_amount}</span>
              </div>
            </div>

            {/* Delivery address details */}
            <div className="border-t border-slate-200 pt-4 flex gap-3 text-xs">
              <MapPin size={18} className="text-[#8A6B29] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-800 m-0">Shipping Destination</h4>
                <p className="text-slate-600 mt-1 mb-0 leading-relaxed">
                  <strong>{order.customer_name}</strong><br />
                  {order.destination ? order.destination : `${order.shipping_address}, ${order.city} - ${order.pincode} (${order.state})`}
                </p>
                <p className="text-slate-500 font-mono mt-1 mb-0">📞 {order.customer_phone}</p>
              </div>
            </div>

            {/* Payment method info */}
            <div className="border-t border-slate-200 pt-4 flex gap-3 text-xs">
              <CreditCard size={18} className="text-[#8A6B29] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-800 m-0">Payment Details</h4>
                <p className="text-slate-600 mt-1 mb-0 uppercase font-semibold">
                  {order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Online Payment'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 mb-0">
                  Status: <span className="font-bold text-[#2D5016]">{order.payment_status}</span>
                </p>
              </div>
            </div>

            {/* Shipment Tracking Info (Shown ONLY after fulfillment creates shipment) */}
            {order.shipment && (
              <div className="border-t border-slate-200 pt-4 text-xs space-y-2">
                <h4 className="font-semibold text-[#1D3A28] m-0">Shipment & Logistics Tracking</h4>
                <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#C5A059]/20 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Carrier:</span>
                    <span className="font-bold text-slate-800">{order.shipment.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tracking #:</span>
                    <span className="font-mono font-bold text-slate-800">{order.shipment.tracking_number}</span>
                  </div>
                  {order.shipment.tracking_url && order.shipment.tracking_url.startsWith('https://') && (
                    <div className="pt-2">
                      <a
                        href={order.shipment.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8A6B29] font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        Track Package on Carrier Website →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CleanCard>

          {/* Action CTAs */}
          <div className="space-y-3">
            <a
              href={`https://wa.me/919494323211?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#1EBE5A] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-xs transition-all text-decoration-none"
            >
              <MessageCircle size={18} fill="currentColor" />
              <span>Track Order Live via WhatsApp</span>
            </a>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/account')}
                className="flex-1 text-xs py-2.5"
                style={{ borderColor: '#cbd5e1', color: '#334155' }}
              >
                Go to Account Portal
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/products')}
                className="flex-1 text-xs py-2.5 bg-[#1D3A28] hover:bg-[#2D5016] text-white"
              >
                Continue Shopping
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck size={12} className="text-[#2D5016]" />
            <span>S.S. PHARMACY • Certified Ayurvedic Manufacturing Facility</span>
          </div>
        </div>
      </Container>
    </div>
  );
}
