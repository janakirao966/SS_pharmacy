import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Banknote, ArrowRight, Loader2, User, MapPin, Edit3, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { calculateSubtotal, calculateDelivery, calculateOrderTotal } from '../lib/pricing';
import Container from '../components/layout/Container';
import CleanCard from '../components/cards/CleanCard';

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
  const [error, setError] = useState<string | null>(null);

  // Guest vs Logged-In Flow
  const [authMode, setAuthMode] = useState<'guest' | 'login' | 'signup'>(user ? 'guest' : 'login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');

  // Shipping Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Yerraguntla',
    state: 'Andhra Pradesh',
    pincode: ''
  });

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: profile?.full_name || '',
        email: user.email || '',
        phone: profile?.phone || ''
      }));
    }
  }, [user, profile]);

  const subtotal = calculateSubtotal(cartItems);
  const deliveryCharge = calculateDelivery(subtotal);
  const totalAmount = calculateOrderTotal(subtotal, deliveryCharge);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (authError) {
          setError(authError.message);
        } else if (data.session) {
          showToast('Signed in successfully!', 'success');
        }
      } else if (authMode === 'signup') {
        if (authPassword !== authConfirmPassword) {
          setError('Passwords do not match. Please re-enter your password.');
          setLoading(false);
          return;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: authName,
              phone: authPhone
            }
          }
        });
        if (authError) {
          setError(authError.message);
        } else if (data.user) {
          showToast('Account created successfully! Welcome to S.S. Pharmacy.', 'success');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
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

    if (!/^\d{6}$/.test(formData.pincode.replace(/\D/g, ''))) {
      setError('Please enter a valid 6-digit PIN code.');
      document.getElementsByName('pincode')[0]?.focus();
      return;
    }

    setLoading(true);

    try {
      if (paymentMethod === 'cod') {
        // Handle secure Cash On Delivery Order via DB Transaction (RPC)
        const { data, error: rpcError } = await supabase.rpc('create_checkout_order', {
          p_customer_name: formData.name,
          p_customer_phone: formData.phone,
          p_customer_email: formData.email || null,
          p_shipping_address: formData.address,
          p_city: formData.city,
          p_state: formData.state,
          p_pincode: formData.pincode,
          p_payment_method: 'cod',
          p_items: cartItems.map(item => ({ id: item.product.id, quantity: item.quantity })),
          p_checkout_attempt_id: checkoutAttemptId.current
        });

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        const res = typeof data === 'string' ? JSON.parse(data) : data;

        if (res?.success) {
          handleClearCart();
          showToast('Your Cash on Delivery order has been placed!', 'success');
          if (res.receipt_token) {
            navigate(`/order-success/${res.order_number}?token=${res.receipt_token}`);
          } else {
            navigate(`/order-success/${res.order_number}`);
          }
        } else {
          throw new Error('Order creation returned unsuccessful status.');
        }

      } else {
        // Handle Secure Online Checkout using Supabase Edge Function & Razorpay SDK
        const isLoaded = await loadRazorpay();
        if (!isLoaded || !window.Razorpay) {
          throw new Error('Failed to load Razorpay Checkout SDK. Please check your network connection.');
        }

        // Call secure Supabase Edge Function to calculate totals and retrieve order ID
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

        if (edgeError || !edgeRes.success) {
          throw new Error(edgeError?.message || edgeRes.error || 'Failed to initialize secure payment.');
        }

        const options = {
          key: edgeRes.key_id,
          amount: edgeRes.amount,
          currency: 'INR',
          name: 'S.S. PHARMACY',
          description: `Order #${edgeRes.order_number} - Ayurvedic Formulations`,
          image: `${import.meta.env.BASE_URL}products/logo/logo.webp`,
          order_id: edgeRes.razorpay_order_id,
          handler: async function (response: any) {
            setLoading(true);
            try {
              // Send signature callback to secure verify-payment Edge Function
              const { data: verifyRes, error: verifyError } = await supabase.functions.invoke('verify-payment', {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                }
              });

              if (verifyError || !verifyRes.success) {
                throw new Error(verifyError?.message || verifyRes.error || 'Payment verification failed.');
              }

              handleClearCart();
              showToast('Payment verified successfully!', 'success');
              if (edgeRes.receipt_token) {
                navigate(`/order-success/${verifyRes.order_number}?token=${edgeRes.receipt_token}`);
              } else {
                navigate(`/order-success/${verifyRes.order_number}`);
              }
            } catch (err: any) {
              console.error('Signature verification error:', err);
              setError(`Payment verified on gateway, but order update failed: ${err.message}. Please contact customer support with payment ID: ${response.razorpay_payment_id}.`);
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
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setError(err.message || 'We could not place your order. Your cart has been preserved. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page bg-[#FEFDF8] min-h-screen py-10 pt-page-header">
      <Container>
        {/* Secure Checkout Header */}
        <div className="checkout-header">
          <div className="checkout-title-wrap">
            <Lock className="text-[#8A6B29]" size={24} />
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1D3A28] m-0">Secure Checkout</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans mt-0.5">S.S. PHARMACY • License No. R-1970/Ayur</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="checkout-back-btn"
          >
            ← Back to Store
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="checkout-error-banner">
            ⚠️ {error}
          </div>
        )}

        <div className="checkout-page-grid">
          {/* Column 1: Info & Checkout Forms (65%) */}
          <div className="checkout-form-column">
            {/* Step 1: User Account Auth */}
            {!user ? (
              <CleanCard className="mb-6" innerClassName="p-6">
                <div className="checkout-title-wrap mb-4">
                  <User className="text-[#8A6B29]" size={18} />
                  <h2 className="font-display text-lg font-bold text-[#1D3A28] m-0">1. Customer Identification</h2>
                </div>

                <div className="checkout-auth-tabs">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`checkout-auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                  >
                    Sign In (Existing Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`checkout-auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                  >
                    Register (New Customer)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('guest')}
                    className={`checkout-auth-tab-btn ${authMode === 'guest' ? 'active' : ''}`}
                  >
                    Guest Checkout
                  </button>
                </div>

                {authMode !== 'guest' ? (
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'signup' && (
                      <div className="checkout-form-grid-2">
                        <div className="form-field-group">
                          <label>Full Name *</label>
                          <input
                            type="text"
                            required
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            className="form-input-field"
                            placeholder="e.g. Ramanujam"
                          />
                        </div>
                        <div className="form-field-group">
                          <label>Mobile Number</label>
                          <input
                            type="tel"
                            value={authPhone}
                            onChange={(e) => setAuthPhone(e.target.value)}
                            className="form-input-field"
                            placeholder="e.g. +91 94943..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-field-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="form-input-field"
                        placeholder="name@domain.com"
                      />
                    </div>

                    <div className="form-field-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="form-input-field"
                        placeholder="••••••••"
                      />
                    </div>

                    {authMode === 'signup' && (
                      <div className="form-field-group">
                        <label>Confirm Password *</label>
                        <input
                          type="password"
                          required
                          value={authConfirmPassword}
                          onChange={(e) => setAuthConfirmPassword(e.target.value)}
                          className="form-input-field"
                          placeholder="••••••••"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-pill btn-pill-primary w-full justify-center py-2.5 font-bold"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : modeText(authMode)}
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <p className="text-xs text-slate-600 m-0">
                      You are checking out as a guest. You can register an account at the end of the order to track deliveries and review histories.
                    </p>
                  </div>
                )}
              </CleanCard>
            ) : (
              <CleanCard className="mb-6 bg-slate-50 border-slate-200" innerClassName="p-4 flex items-center justify-between">
                <div className="checkout-title-wrap">
                  <ShieldCheck className="text-[#2D5016]" size={18} />
                  <span className="text-xs text-slate-700">
                    Logged in as <strong>{profile?.full_name || 'Member'}</strong> ({user.email})
                  </span>
                </div>
                <span className="checkout-verified-badge">SSP Account Verified</span>
              </CleanCard>
            )}

            {/* Step 2: Shipping & Delivery Form */}
            <form onSubmit={handlePlaceOrder}>
              <CleanCard className="mb-6" innerClassName="p-6">
                <div className="checkout-title-wrap mb-4">
                  <MapPin className="text-[#8A6B29]" size={18} />
                  <h2 className="font-display text-lg font-bold text-[#1D3A28] m-0">2. Delivery Address</h2>
                </div>

                <div className="checkout-form-grid-2">
                  <div className="form-field-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Ramesh Kumar"
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="phone">Mobile Phone *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number"
                      className="form-input-field"
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label htmlFor="email">Email Address (Optional)</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@domain.com"
                    className="form-input-field"
                  />
                </div>

                <div className="form-field-group">
                  <label htmlFor="address">Shipping Address *</label>
                  <textarea
                    id="address"
                    name="address"
                    required
                    autoComplete="street-address"
                    rows={3}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House/Apartment Number, Street Name, Area / Landmark"
                    className="form-textarea-field"
                  />
                </div>

                <div className="checkout-form-grid-3">
                  <div className="form-field-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="state">State</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="form-input-field"
                    />
                  </div>

                  <div className="form-field-group">
                    <label htmlFor="pincode">PIN Code *</label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="6 digits"
                      className="form-input-field"
                    />
                  </div>
                </div>
              </CleanCard>

              {/* Step 3: Payment Selection */}
              <CleanCard className="mb-8" innerClassName="p-6">
                <div className="checkout-title-wrap mb-4">
                  <CreditCard className="text-[#8A6B29]" size={18} />
                  <h2 className="font-display text-lg font-bold text-[#1D3A28] m-0">3. Payment Selection</h2>
                </div>

                <div className="checkout-payment-methods-wrapper checkout-form-grid-2">
                  <label className={`checkout-payment-method ${paymentMethod === 'online_razorpay' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online_razorpay"
                      checked={paymentMethod === 'online_razorpay'}
                      onChange={() => setPaymentMethod('online_razorpay')}
                      className="checkout-payment-radio"
                    />
                    <CreditCard size={18} color={paymentMethod === 'online_razorpay' ? '#1D3A28' : '#C5A059'} />
                    <div className="checkout-payment-details">
                      <strong>Pay Online Securely</strong>
                      <span>UPI, Credit/Debit Cards, NetBanking</span>
                    </div>
                  </label>

                  <label className={`checkout-payment-method ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="checkout-payment-radio"
                    />
                    <Banknote size={18} color={paymentMethod === 'cod' ? '#1D3A28' : '#2D5016'} />
                    <div className="checkout-payment-details">
                      <strong>Cash on Delivery (COD)</strong>
                      <span>Pay cash upon delivery at your doorstep</span>
                    </div>
                  </label>
                </div>
              </CleanCard>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="checkout-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>{paymentMethod === 'online_razorpay' ? `Pay Securely • ₹${totalAmount}` : `Place COD Order • ₹${totalAmount}`}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="checkout-footer-assurance">
                <ShieldCheck size={14} className="text-[#2D5016]" />
                <span>Payments processed securely through Razorpay Sandboxed Gateway</span>
              </div>
            </form>
          </div>

          {/* Column 2: Cart Summary Sidebar (35%) */}
          <div className="checkout-summary-column text-left">
            <div className="checkout-summary-sticky">
              <CleanCard innerClassName="p-6">
                <div className="checkout-header pb-3 mb-4">
                  <h3 className="font-display text-lg font-bold text-[#1D3A28] m-0">Order Summary</h3>
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="checkout-back-btn"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                </div>

                {/* Items list */}
                <div className="checkout-summary-items">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="checkout-summary-item">
                      <div className="checkout-summary-img-box">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div className="checkout-summary-item-details">
                        <h4>{item.product.name}</h4>
                        <p>{item.product.packSize} • Qty: {item.quantity}</p>
                      </div>
                      <div className="checkout-summary-price">
                        <span>₹{item.product.mrp * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="checkout-price-breakdown">
                  <div className="checkout-price-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="checkout-price-row">
                    <span>GST (Simulated)</span>
                    <span className="checkout-verified-badge">Included in MRP</span>
                  </div>
                  <div className="checkout-price-row">
                    <span>Delivery Charge</span>
                    <span>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                  </div>
                  <div className="checkout-price-total">
                    <span>Total Payable</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              </CleanCard>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function modeText(mode: 'login' | 'signup' | 'guest') {
  if (mode === 'login') return 'Sign In';
  if (mode === 'signup') return 'Register Account';
  return 'Continue';
}
