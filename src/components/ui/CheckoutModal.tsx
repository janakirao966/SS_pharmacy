import { useState, useEffect } from 'react';
import { X, ShieldCheck, CreditCard, Banknote, ArrowRight } from 'lucide-react';
import { renderAyurvedicText } from '../../utils/lang';
import { useCart, type CartItem } from '../../context/CartContext';
import Button from './Button';
import { supabase, type DatabaseOrder } from '../../lib/supabase';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Partial<DatabaseOrder>) => void;
}

export default function CheckoutModal({ isOpen, onClose, onOrderSuccess }: CheckoutModalProps) {
  const { cartItems, handleClearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'online_razorpay' | 'cod'>('online_razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Yerraguntla',
    state: 'Andhra Pradesh',
    pincode: ''
  });

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
  const deliveryCharge = subtotal > 999 ? 0 : 50;
  const totalAmount = subtotal + deliveryCharge;

  // Load Razorpay Script dynamically
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateOrderNumber = () => {
    return `SSP-${Math.floor(100000 + Math.random() * 900000)}`;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.pincode.trim()) {
      setError('Please fill in all required contact and shipping details.');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    const orderNumber = generateOrderNumber();

    try {
      if (paymentMethod === 'cod') {
        // Handle Cash On Delivery Order Insertion
        const newOrder: Partial<DatabaseOrder> = {
          order_number: orderNumber,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || undefined,
          shipping_address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          subtotal,
          delivery_charge: deliveryCharge,
          total_amount: totalAmount,
          payment_method: 'cod',
          payment_status: 'cod_pending',
          order_status: 'new'
        };

        // Try inserting into Supabase DB (or fallback gracefully for demo)
        try {
          await supabase.from('orders').insert([newOrder]);
        } catch (err) {
          console.warn('Supabase DB offline, continuing with local confirmation state', err);
        }

        handleClearCart();
        setLoading(false);
        onOrderSuccess(newOrder);
        onClose();
      } else {
        // Handle Online Payment via Razorpay
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

        const options = {
          key: razorpayKey,
          amount: Math.round(totalAmount * 100), // Amount in paise
          currency: 'INR',
          name: 'S.S. PHARMACY',
          description: `Order ${orderNumber} - Ayurvedic Medicines`,
          image: `${import.meta.env.BASE_URL}products/logo/logo.webp`,
          handler: async function (response: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }) {
            const newOrder: Partial<DatabaseOrder> = {
              order_number: orderNumber,
              customer_name: formData.name,
              customer_phone: formData.phone,
              customer_email: formData.email || undefined,
              shipping_address: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              subtotal,
              delivery_charge: deliveryCharge,
              total_amount: totalAmount,
              payment_method: 'online_razorpay',
              payment_status: 'paid',
              order_status: 'new',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            };

            try {
              await supabase.from('orders').insert([newOrder]);
            } catch (err) {
              console.warn('Supabase DB sync warning', err);
            }

            handleClearCart();
            setLoading(false);
            onOrderSuccess(newOrder);
            onClose();
          },
          prefill: {
            name: formData.name,
            contact: formData.phone,
            email: formData.email
          },
          theme: {
            color: '#1D3A28'
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            }
          }
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          // Fallback if SDK loading failed
          alert('Razorpay Checkout SDK is loading. Please try again in 5 seconds.');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setError('An error occurred while creating your order. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-[#FEFDF8] rounded-2xl max-w-xl w-full border border-[#C5A059]/30 shadow-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="bg-[#1D3A28] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-[#C5A059]" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide">Checkout & Shipping</h2>
              <p className="text-[11px] text-slate-300 font-sans">Mfg. Lic. No. R-1970/Ayur • S.S. PHARMACY</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close Checkout Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePlaceOrder} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Cart Summary Header */}
          <div className="bg-[#F5F3EF] p-4 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Order Items</span>
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {cartItems.map((item: CartItem) => (
                <div key={item.product.id} className="flex justify-between items-center text-xs text-[#1D3A28]">
                  <span className="font-medium">{renderAyurvedicText(item.product.name)} × {item.quantity}</span>
                  <span className="font-bold">₹{item.product.mrp * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 mt-2.5 pt-2 flex justify-between text-sm font-bold text-[#1D3A28]">
              <span>Total Payable</span>
              <span>₹{totalAmount} <span className="text-[10px] font-normal text-slate-500">(Incl. taxes)</span></span>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A6B29]">Delivery Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Shipping Address *</label>
              <textarea
                name="address"
                required
                rows={2}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="House No, Street Name, Area / Landmark"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">PIN Code *</label>
                <input
                  type="text"
                  name="pincode"
                  required
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="6 digits"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A6B29]">Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'online_razorpay'
                    ? 'border-[#1D3A28] bg-[#1D3A28]/5 text-[#1D3A28] font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online_razorpay"
                  checked={paymentMethod === 'online_razorpay'}
                  onChange={() => setPaymentMethod('online_razorpay')}
                  className="accent-[#1D3A28]"
                />
                <CreditCard size={18} className="text-[#C5A059]" />
                <div className="text-xs">
                  <span className="block font-bold">Online Payment</span>
                  <span className="text-[10px] text-slate-500">UPI, PhonePe, Cards, NetBanking</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[#1D3A28] bg-[#1D3A28]/5 text-[#1D3A28] font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="accent-[#1D3A28]"
                />
                <Banknote size={18} className="text-[#2D5016]" />
                <div className="text-xs">
                  <span className="block font-bold">Cash on Delivery</span>
                  <span className="text-[10px] text-slate-500">Pay cash upon delivery</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full bg-[#1D3A28] hover:bg-[#2D5016] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <span>{paymentMethod === 'online_razorpay' ? `Pay ₹${totalAmount} via Razorpay` : `Place COD Order (₹${totalAmount})`}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add global Window declaration for Razorpay SDK
declare global {
  interface Window {
    Razorpay: any;
  }
}
