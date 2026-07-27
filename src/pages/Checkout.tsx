import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, ArrowRight, Loader2, MapPin, Navigation } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { calculateSubtotal, calculateDelivery, calculateOrderTotal } from '../lib/pricing';
import SEO from '../components/ui/SEO';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const { cartItems, handleClearCart } = useCart();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const checkoutAttemptId = useRef(crypto.randomUUID());

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/products');
      showToast('Your cart is empty. Please add items before checking out.', 'info');
    }
  }, [cartItems, navigate, showToast]);

  const [paymentMethod, setPaymentMethod] = useState<'online_razorpay' | 'cod'>('online_razorpay');
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shipping Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: profile?.full_name || user.user_metadata?.full_name || prev.name,
        email: user.email || prev.email,
        phone: profile?.phone || user.phone || prev.phone
      }));
    }
  }, [user, profile]);

  const subtotal = calculateSubtotal(cartItems);
  const deliveryCharge = calculateDelivery(subtotal);
  const totalAmount = calculateOrderTotal(subtotal, deliveryCharge);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDetectGPSLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setDetectingLocation(true);
    showToast('Detecting location via GPS...', 'info');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const street = [addr.house_number, addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ') || data.display_name || '';
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const pincode = addr.postcode || '';

            setFormData(prev => ({
              ...prev,
              address: street || prev.address,
              city: city || prev.city,
              state: state || prev.state,
              pincode: pincode || prev.pincode
            }));

            showToast('Shipping location auto-filled via GPS!', 'success');
          } else {
            showToast('GPS location acquired. Please confirm address details.', 'info');
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
          showToast('Location coordinates detected. Please confirm address.', 'info');
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation permission error:', err);
        setDetectingLocation(false);
        showToast('Location permission denied. Please enter address manually.', 'info');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const createDirectDatabaseOrder = async (pMethod: 'cod' | 'online_razorpay') => {
    // 1. Try atomic RPC function first (runs as SECURITY DEFINER bypassing RLS)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_checkout_order', {
        p_customer_name: formData.name,
        p_customer_phone: formData.phone,
        p_customer_email: formData.email || null,
        p_shipping_address: formData.address,
        p_city: formData.city,
        p_state: formData.state,
        p_pincode: formData.pincode,
        p_payment_method: pMethod,
        p_items: cartItems.map(item => ({ id: item.product.id, quantity: item.quantity })),
        p_checkout_attempt_id: checkoutAttemptId.current
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return {
          order_number: rpcRes.order_number,
          receipt_token: rpcRes.receipt_token
        };
      }
    } catch (e) {
      console.warn('RPC create_checkout_order fallback to direct insert:', e);
    }

    // 2. Direct client database insert fallback
    const generatedOrderNum = `SSP-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: generatedOrderNum,
        user_id: user?.id || null,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_email: formData.email || null,
        shipping_address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        subtotal: subtotal,
        delivery_charge: deliveryCharge,
        total_amount: totalAmount,
        payment_method: pMethod,
        payment_status: pMethod === 'cod' ? 'cod_pending' : 'pending',
        order_status: 'new'
      })
      .select()
      .single();

    if (orderErr || !newOrder) {
      throw new Error(orderErr?.message || 'Database order creation failed');
    }

    const itemsToInsert = cartItems.map((item) => ({
      order_id: newOrder.id,
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.mrp,
      total_price: item.product.mrp * item.quantity
    }));

    await supabase.from('order_items').insert(itemsToInsert);
    return newOrder;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.pincode.trim()) {
      setError('Please fill in all required contact and shipping details.');
      const firstEmpty = document.querySelector('input:invalid, textarea:invalid') as HTMLElement;
      firstEmpty?.focus();
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      document.getElementsByName('phone')[0]?.focus();
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === 'cod') {
        // Try Edge Function first, fallback to direct DB if unreachable
        try {
          const { data: edgeRes, error: edgeError } = await supabase.functions.invoke('checkout', {
            body: {
              customer_name: formData.name,
              customer_phone: formData.phone,
              customer_email: formData.email || null,
              shipping_address: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              payment_method: 'cod',
              items: cartItems.map(item => ({ id: item.product.id, quantity: item.quantity })),
              checkout_attempt_id: checkoutAttemptId.current
            }
          });

          if (edgeError || !edgeRes?.success) {
            throw edgeError || new Error(edgeRes?.error || 'Edge Function offline');
          }

          handleClearCart();
          showToast('Cash on Delivery Order Placed Successfully!', 'success');
          if (edgeRes.receipt_token) {
            navigate(`/order-success/${edgeRes.order_number}?token=${edgeRes.receipt_token}`);
          } else {
            navigate(`/order-success/${edgeRes.order_number}`);
          }
        } catch {
          // Direct Database Fallback
          const directOrder = await createDirectDatabaseOrder('cod');
          handleClearCart();
          showToast('Cash on Delivery Order Placed Successfully!', 'success');
          navigate(`/order-success/${directOrder.order_number}`);
        }
      } else {
        // Razorpay Gateway Flow with Direct DB fallback if Edge Function is offline
        const res = await loadRazorpay();
        let razorpayKey = 'rzp_test_SSPharmacyDummyKey';
        let razorpayOrderId = null;
        let orderNum = `SSP-${Math.floor(100000 + Math.random() * 900000)}`;

        try {
          const { data: edgeRes, error: edgeError } = await supabase.functions.invoke('checkout', {
            body: {
              customer_name: formData.name,
              customer_phone: formData.phone,
              customer_email: formData.email || null,
              shipping_address: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              items: cartItems.map(item => ({ id: item.product.id, quantity: item.quantity })),
              checkout_attempt_id: checkoutAttemptId.current
            }
          });

          if (!edgeError && edgeRes?.success) {
            razorpayKey = edgeRes.key_id;
            razorpayOrderId = edgeRes.razorpay_order_id;
            orderNum = edgeRes.order_number;
          }
        } catch {
          console.log('Proceeding with direct gateway checkout fallback...');
        }

        if (res && window.Razorpay) {
          const options = {
            key: razorpayKey,
            amount: totalAmount * 100,
            currency: 'INR',
            name: 'S.S. PHARMACY',
            description: `Order #${orderNum} - Ayurvedic Formulations`,
            image: `${import.meta.env.BASE_URL}products/logo/logo.webp`,
            order_id: razorpayOrderId || undefined,
            handler: async function () {
              setLoading(true);
              try {
                const directOrder = await createDirectDatabaseOrder('online_razorpay');
                handleClearCart();
                showToast('Payment completed successfully!', 'success');
                navigate(`/order-success/${directOrder.order_number}`);
              } catch (err: any) {
                setError(`Order creation error: ${err.message}`);
              } finally {
                setLoading(false);
              }
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
                showToast('Payment window closed. Cart preserved.', 'info');
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          // Direct DB creation fallback
          const directOrder = await createDirectDatabaseOrder('online_razorpay');
          handleClearCart();
          showToast('Order Placed Successfully!', 'success');
          navigate(`/order-success/${directOrder.order_number}`);
        }
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setError(err.message || 'We could not place your order. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="checkout-portal-wrapper">
      <SEO
        title="Secure Ayurvedic Checkout | S.S. PHARMACY"
        description="Complete your order for authentic Ayurvedic formulations securely at S.S. PHARMACY."
      />

      <div className="checkout-portal-container">
        {/* Breadcrumb Bar */}
        <div className="account-breadcrumb-bar">
          <button onClick={() => navigate('/')} className="account-breadcrumb-btn">Home</button>
          <span>/</span>
          <button onClick={() => navigate('/products')} className="account-breadcrumb-btn">Catalog</button>
          <span>/</span>
          <span className="account-breadcrumb-current">Secure Checkout</span>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 text-left">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="checkout-main-grid">
          {/* LEFT FORM COLUMN */}
          <div className="space-y-6">
            {/* Account Status Indicator */}
            {(() => {
              const displayName = profile?.full_name && profile.full_name !== 'Admin User' 
                ? profile.full_name 
                : (user?.user_metadata?.full_name || formData.name);

              return (
                <div className="bg-[#EEF7F1] border border-[#D1E2D5] p-3.5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-left">
                    <ShieldCheck className="text-[#1D3A28]" size={18} />
                    <span className="text-xs text-[#1D3A28]">
                      {displayName ? (
                        <>Shopping as <strong>{displayName}</strong> {user?.email ? `(${user.email})` : ''}</>
                      ) : (
                        <>Logged in as <strong>{user?.email || 'Valued Customer'}</strong></>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#1D3A28] bg-white px-2.5 py-1 rounded-full border border-[#D1E2D5] tracking-wider uppercase">SECURE CHECKOUT</span>
                </div>
              );
            })()}

            {/* Delivery Address Form with GPS Auto-Fill */}
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div className="checkout-section-box">
                <div className="checkout-section-header-row">
                  <div className="checkout-section-title">
                    <MapPin className="text-[#C5A059]" size={20} />
                    <span>Delivery Address</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGPSLocation}
                    disabled={detectingLocation}
                    className="checkout-gps-btn"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Detecting Location...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={13} />
                        <span>Use Current Location</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="address-form-grid">
                  <div>
                    <label className="address-form-label">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Ramesh Kumar"
                      className="address-form-input"
                    />
                  </div>

                  <div>
                    <label className="address-form-label">Mobile Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number"
                      className="address-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="address-form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@domain.com"
                    className="address-form-input"
                  />
                </div>

                <div>
                  <label className="address-form-label">Shipping Address *</label>
                  <textarea
                    name="address"
                    required
                    rows={2}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House/Apartment Number, Street Name, Area / Landmark"
                    className="address-form-textarea"
                  />
                </div>

                <div className="address-form-grid">
                  <div>
                    <label className="address-form-label">City / Town *</label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="address-form-input"
                    />
                  </div>

                  <div>
                    <label className="address-form-label">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="address-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="address-form-label">PIN Code *</label>
                  <input
                    type="text"
                    name="pincode"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="6-digit PIN"
                    className="address-form-input font-mono"
                  />
                </div>
              </div>

              {/* Payment Selection */}
              <div className="checkout-section-box">
                <div className="checkout-section-title mb-4">
                  <CreditCard className="text-[#C5A059]" size={20} />
                  <span>Select Payment Method</span>
                </div>

                <div className="checkout-payment-grid mb-4">
                  <div
                    className={`checkout-payment-card ${paymentMethod === 'online_razorpay' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('online_razorpay')}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online_razorpay"
                      checked={paymentMethod === 'online_razorpay'}
                      onChange={() => setPaymentMethod('online_razorpay')}
                      className="mt-1"
                    />
                    <div>
                      <strong className="text-xs font-bold text-[#1D3A28] block">Pay Online Securely</strong>
                      <span className="text-[11px] text-[#667068] block mt-0.5">UPI, Credit/Debit Cards, NetBanking</span>
                    </div>
                  </div>

                  <div
                    className={`checkout-payment-card ${paymentMethod === 'cod' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cod')}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1"
                    />
                    <div>
                      <strong className="text-xs font-bold text-[#1D3A28] block">Cash on Delivery (COD)</strong>
                      <span className="text-[11px] text-[#667068] block mt-0.5">Pay cash upon delivery at doorstep</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="checkout-place-btn mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <>
                      <span>{paymentMethod === 'online_razorpay' ? `Pay Securely • ₹${totalAmount}` : `Place COD Order • ₹${totalAmount}`}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#667068] pt-2">
                  <ShieldCheck size={14} className="text-[#1D3A28]" />
                  <span>Payments processed securely via S.S. PHARMACY Gateway</span>
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT ORDER SUMMARY SIDEBAR */}
          <div className="checkout-summary-column">
            <div className="checkout-summary-card-refined sticky top-24">
              <div className="checkout-summary-header">
                <h3 className="checkout-summary-title">Order Summary</h3>
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="checkout-edit-cart-btn"
                >
                  <span>Edit Cart</span>
                </button>
              </div>

              {/* Items List */}
              <div className="checkout-summary-items-list">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="checkout-summary-item-card">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="checkout-summary-item-thumb"
                    />
                    <div className="checkout-summary-item-info">
                      <h4 className="checkout-summary-item-name">{item.product.name}</h4>
                      {item.product.packSize && (
                        <span className="checkout-summary-item-pack">{item.product.packSize}</span>
                      )}
                      <span className="checkout-summary-item-qty">Qty: {item.quantity} × ₹{item.product.mrp}</span>
                    </div>
                    <div className="checkout-summary-item-price">
                      ₹{item.product.mrp * item.quantity}/-
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="checkout-summary-breakdown">
                <div className="checkout-summary-row">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#1F2A22]">₹{subtotal}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Delivery Charge</span>
                  <span className="checkout-free-badge">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                </div>
                <div className="checkout-summary-total-row">
                  <span>Total Amount</span>
                  <span className="checkout-total-price">₹{totalAmount}/-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
