import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, CreditCard, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
import { products } from '../../data/products';
import { useCart } from '../../context/CartContext';

interface ShippingFormType {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  country: string;
}

type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'success';
type PaymentMethod = 'card' | 'upi' | 'cod';

export default function CartDrawer() {
  const {
    isCartOpen: isOpen,
    setIsCartOpen,
    cartItems,
    handleRemoveFromCart: onRemove,
    handleUpdateCartQuantity: onUpdateQuantity,
    handleClearCart: onClear,
    handleAddToCart: onAddToCart,
    openCheckout
  } = useCart();

  const onClose = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      setIsMounted(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key close & focus trapping trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Auto focus the close button on opening (a11y check)
      setTimeout(() => {
        const container = containerRef.current;
        const closeBtn = container?.querySelector('.cart-drawer-close') as HTMLElement;
        closeBtn?.focus();
      }, 100);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const [step, setStep] = useState<CheckoutStep>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [shippingForm, setShippingForm] = useState<ShippingFormType>(() => {
    try {
      const saved = localStorage.getItem('ss_shipping_form');
      return saved ? JSON.parse(saved) : {
        name: '',
        phone: '',
        address: '',
        city: '',
        pincode: '',
        country: 'India'
      };
    } catch {
      return {
        name: '',
        phone: '',
        address: '',
        city: '',
        pincode: '',
        country: 'India'
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('ss_shipping_form', JSON.stringify(shippingForm));
  }, [shippingForm]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiAddress, setUpiAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Reset steps and forms when closed/opened
  useEffect(() => {
    if (isOpen) {
      setStep('cart');
      setIsProcessing(false);
      setPaymentError('');
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
  const shippingFee = subtotal > 1500 ? 0 : 150;
  const gst = Math.round(subtotal * 0.12); // 12% GST simulation
  const total = subtotal + shippingFee + gst;

  // Phone input formatting helper
  const handlePhoneChange = (val: string) => {
    let cleaned = val.replace(/[^\d\s\-()+]/g, '');
    if (cleaned.indexOf('+') > 0) {
      cleaned = cleaned.charAt(0) + cleaned.slice(1).replace(/\+/g, '');
    }
    if (shippingForm.country === 'India' && !cleaned.startsWith('+') && cleaned.replace(/\D/g, '').length > 0) {
      const digits = cleaned.replace(/\D/g, '');
      if (digits.startsWith('91')) {
        cleaned = '+' + digits;
      } else {
        cleaned = '+91 ' + digits;
      }
    }
    setShippingForm((prev: ShippingFormType) => ({ ...prev, phone: cleaned }));
    validateField('phone', cleaned);
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    if (!value.trim()) {
      error = 'This field is required';
    } else if (field === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        error = 'Enter a valid phone number (10 to 15 digits)';
      }
    } else if (field === 'pincode') {
      if (shippingForm.country === 'India') {
        if (!/^\d{6}$/.test(value)) {
          error = 'Enter a valid 6-digit PIN code';
        }
      }
    }
    setFormErrors((prev: Record<string, string>) => ({ ...prev, [field]: error }));
  };

  const handleBlur = (field: string) => {
    setFormTouched((prev: Record<string, boolean>) => ({ ...prev, [field]: true }));
    validateField(field, shippingForm[field as keyof ShippingFormType]);
  };

  const handleInputChange = (field: string, value: string) => {
    setShippingForm((prev: ShippingFormType) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleNextStep = () => {
    if (step === 'cart') {
      if (cartItems.length === 0) return;
      setStep('shipping');
    } else if (step === 'shipping') {
      // Validate all fields
      const errors: Record<string, string> = {};
      Object.keys(shippingForm).forEach((key) => {
        const val = shippingForm[key as keyof typeof shippingForm];
        if (!val.trim()) {
          errors[key] = 'This field is required';
        }
      });
      
      const phoneNum = shippingForm.phone.replace(/\D/g, '');
      if (phoneNum.length < 10 || phoneNum.length > 15) {
        errors.phone = 'Enter a valid phone number (10 to 15 digits)';
      }
      if (shippingForm.country === 'India' && !/^\d{6}$/.test(shippingForm.pincode)) {
        errors.pincode = 'Enter a valid 6-digit PIN code';
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        const touched: Record<string, boolean> = {};
        Object.keys(shippingForm).forEach(k => touched[k] = true);
        setFormTouched(touched);
        return;
      }
      setStep('payment');
    }
  };

  const handleSimulatePayment = () => {
    setPaymentError('');
    if (paymentMethod === 'card') {
      if (cardNumber.length < 16 || cardExpiry.length < 4 || cardCvv.length < 3) {
        setPaymentError('Please fill in valid simulated card details (16-digit card number, MMYY expiry, and 3-digit CVV).');
        return;
      }
    } else if (paymentMethod === 'upi') {
      if (!/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/.test(upiAddress.trim())) {
        setPaymentError('Please enter a valid simulated UPI ID (e.g. name@upi).');
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStatus('Verifying credentials...');
    
    // progress simulation steps
    setTimeout(() => {
      setProcessingStatus('Authorizing transaction securely...');
    }, 700);

    setTimeout(() => {
      setProcessingStatus('Securing payment gateway connection...');
    }, 1400);

    setTimeout(() => {
      setIsProcessing(false);
      if (simulateFailure) {
        setPaymentError('Simulated transaction failed (Declined by bank). Please retry.');
        return;
      }
      setOrderId('SSP-' + Math.floor(100000 + Math.random() * 900000));
      setStep('success');
      onClear();
    }, 2200);
  };

  return (
    <div className={`cart-drawer-overlay z-[5000] ${isClosing ? 'closing' : ''}`} role="dialog" aria-modal="true">
      <div className="cart-drawer-backdrop" onClick={onClose} />
      
      <div ref={containerRef} className="cart-drawer-panel">
        {/* Panel Header */}
        <div className="cart-drawer-header">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#8B6914]" />
            <h2 className="font-display font-semibold text-lg text-[#2D5016]">
              {step === 'cart' && 'Your Order Bag'}
              {step === 'shipping' && 'Shipping Details'}
              {step === 'payment' && 'Simulated Payment'}
              {step === 'success' && 'Order Placed!'}
            </h2>
          </div>
          <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* Steps Breadcrumbs Indicator */}
        {step !== 'success' && (
          <div className="cart-steps-indicator">
            <span className={step === 'cart' ? 'active' : ''}>1. Bag</span>
            <span className="step-sep">›</span>
            <span className={step === 'shipping' ? 'active' : ''}>2. Delivery</span>
            <span className="step-sep">›</span>
            <span className={step === 'payment' ? 'active' : ''}>3. Pay</span>
          </div>
        )}

        {/* Panel Scrollable Content */}
        <div className="cart-drawer-content">
          {/* STEP 1: CART LIST */}
          {step === 'cart' && (
            <>
              {cartItems.length === 0 ? (
                <div className="cart-empty-view text-center">
                  <ShoppingBag size={48} className="text-[#B0A796] mx-auto mb-4" />
                  <p className="text-secondary text-sm mb-6">Your order bag is currently empty.</p>
                  
                  <div className="cart-recommended-section border-t border-[#EBE6DC] pt-6 text-left w-full">
                    <h5 className="font-sans text-[11px] font-bold text-[#8B6914] uppercase tracking-wider mb-4">Recommended Formulations</h5>
                    <div className="flex flex-col gap-3">
                      {products.slice(0, 2).map((prod) => (
                        <div key={prod.id} className="flex items-center gap-3 p-3 bg-[#FEFDF8]/60 rounded-2xl border border-[#EBE6DC] hover:border-[#8B6914] transition-all">
                          <img src={prod.image} alt={prod.name} className="w-12 h-12 object-contain bg-white rounded-lg p-1 border border-[#EBE6DC]" width={48} height={48} loading="lazy" decoding="async" />
                          <div className="flex-1 min-w-0">
                            <h6 className="text-xs font-semibold text-[#1A1A1A] truncate">{prod.name}</h6>
                            <span className="text-[10px] text-secondary">₹{prod.mrp}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddToCart(prod, 1)}
                            className="btn-pill btn-pill-secondary py-1 px-3 text-[10px] uppercase font-bold tracking-wider"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button type="button" onClick={onClose} className="btn-pill btn-pill-primary mt-6 w-full justify-center">
                    Browse Formulations
                  </button>
                </div>
              ) : (
                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="cart-item-card">
                      <div className="cart-item-img-box">
                        <img src={item.product.image} alt={item.product.name} width={64} height={64} loading="lazy" decoding="async" />
                      </div>
                      <div className="cart-item-info">
                        <span className="cart-item-tag">{item.product.category}</span>
                        <Link to={`/products/${item.product.id}`} onClick={onClose} className="cart-item-link">
                          <h4 className="hover:underline">{item.product.name}</h4>
                        </Link>
                        <span className="cart-item-pack">{item.product.packSize}</span>
                        <div className="cart-item-footer-row">
                          <span className="cart-item-price">₹{item.product.mrp * item.quantity}</span>
                          <div className="quantity-adjuster">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${item.product.name}`}
                            >
                              <Minus size={12} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.product.name}`}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cart-item-remove"
                        onClick={() => {
                          onRemove(item.product.id);
                        }}
                        aria-label={`Remove ${item.product.name} from bag`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* STEP 2: SHIPPING DETAILS */}
          {step === 'shipping' && (
            <div className="checkout-form-container">
              <div className="form-field-group">
                <label htmlFor="shipping-country">Country *</label>
                <select
                  id="shipping-country"
                  value={shippingForm.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="form-input-field"
                >
                  <option value="India">India (IN)</option>
                  <option value="United States">United States (US)</option>
                  <option value="United Kingdom">United Kingdom (UK)</option>
                  <option value="Australia">Australia (AU)</option>
                  <option value="Canada">Canada (CA)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field-group">
                <label htmlFor="shipping-name">Full Name *</label>
                <div className="input-relative">
                  <input
                    id="shipping-name"
                    type="text"
                    placeholder="Enter your name"
                    value={shippingForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onBlur={() => handleBlur('name')}
                    aria-describedby={formErrors.name && formTouched.name ? 'shipping-name-error' : undefined}
                    className={`form-input-field ${formErrors.name && formTouched.name ? 'invalid' : ''}`}
                  />
                  {formTouched.name && !formErrors.name && <span className="input-success-tick">✓</span>}
                </div>
                {formErrors.name && formTouched.name && <span id="shipping-name-error" className="input-error-msg">{formErrors.name}</span>}
              </div>

              <div className="form-field-group">
                <label htmlFor="shipping-phone">Contact Mobile *</label>
                <div className="input-relative">
                  <input
                    id="shipping-phone"
                    type="tel"
                    placeholder={shippingForm.country === 'India' ? '+91 XXXXX XXXXX' : 'Enter mobile number'}
                    value={shippingForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    aria-describedby={formErrors.phone && formTouched.phone ? 'shipping-phone-error' : undefined}
                    className={`form-input-field ${formErrors.phone && formTouched.phone ? 'invalid' : ''}`}
                  />
                  {formTouched.phone && !formErrors.phone && <span className="input-success-tick">✓</span>}
                </div>
                {formErrors.phone && formTouched.phone && <span id="shipping-phone-error" className="input-error-msg">{formErrors.phone}</span>}
              </div>

              <div className="form-field-group">
                <label htmlFor="shipping-address">Delivery Address *</label>
                <textarea
                  id="shipping-address"
                  placeholder="Street name, building, landmark"
                  value={shippingForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  onBlur={() => handleBlur('address')}
                  aria-describedby={formErrors.address && formTouched.address ? 'shipping-address-error' : undefined}
                  rows={3}
                  className={`form-textarea-field ${formErrors.address && formTouched.address ? 'invalid' : ''}`}
                />
                {formErrors.address && formTouched.address && <span id="shipping-address-error" className="input-error-msg">{formErrors.address}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field-group">
                  <label htmlFor="shipping-city">City *</label>
                  <div className="input-relative">
                    <input
                      id="shipping-city"
                      type="text"
                      placeholder="City"
                      value={shippingForm.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      onBlur={() => handleBlur('city')}
                      aria-describedby={formErrors.city && formTouched.city ? 'shipping-city-error' : undefined}
                      className={`form-input-field ${formErrors.city && formTouched.city ? 'invalid' : ''}`}
                    />
                    {formTouched.city && !formErrors.city && <span className="input-success-tick">✓</span>}
                  </div>
                  {formErrors.city && formTouched.city && <span id="shipping-city-error" className="input-error-msg">{formErrors.city}</span>}
                </div>

                <div className="form-field-group">
                  <label htmlFor="shipping-pincode">
                    {shippingForm.country === 'India' ? 'PIN Code *' : 'ZIP / Postal Code *'}
                  </label>
                  <div className="input-relative">
                    <input
                      id="shipping-pincode"
                      type="text"
                      maxLength={shippingForm.country === 'India' ? 6 : 10}
                      placeholder={shippingForm.country === 'India' ? '6-digit PIN' : 'Postal Code'}
                      value={shippingForm.pincode}
                      onChange={(e) => handleInputChange('pincode', shippingForm.country === 'India' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                      onBlur={() => handleBlur('pincode')}
                      aria-describedby={formErrors.pincode && formTouched.pincode ? 'shipping-pincode-error' : undefined}
                      className={`form-input-field ${formErrors.pincode && formTouched.pincode ? 'invalid' : ''}`}
                    />
                    {formTouched.pincode && !formErrors.pincode && <span className="input-success-tick">✓</span>}
                  </div>
                  {formErrors.pincode && formTouched.pincode && <span id="shipping-pincode-error" className="input-error-msg">{formErrors.pincode}</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SIMULATED PAYMENT METHOD */}
          {step === 'payment' && (
            <div className="checkout-payment-container">
              <h5 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#8B6914] mb-3">Delivery Destination:</h5>
              <div className="border border-[#EBE6DC] bg-[#FEFDF8]/60 p-4 rounded-xl text-left w-full mb-6">
                <p className="text-xs text-secondary mb-1"><strong>Name:</strong> {shippingForm.name}</p>
                <p className="text-xs text-secondary mb-1"><strong>Address:</strong> {shippingForm.address}, {shippingForm.city} - {shippingForm.pincode} ({shippingForm.country})</p>
                <p className="text-xs text-secondary"><strong>Mobile:</strong> {shippingForm.phone}</p>
              </div>

              <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#8B6914] mb-4">Select Simulated Payment Method</h4>
              
              <div className="payment-methods-grid mb-6">
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={18} />
                  <span>Debit / Credit Card</span>
                </button>
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('upi')}
                >
                  <Smartphone size={18} />
                  <span>UPI Payment</span>
                </button>
                <button
                  type="button"
                  className={`payment-method-btn ${paymentMethod === 'cod' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cod')}
                >
                  <ShoppingBag size={18} />
                  <span>Cash on Delivery</span>
                </button>
              </div>

              {/* CARD DETAILS SIMULATOR */}
              {paymentMethod === 'card' && (
                <div className="checkout-form-container checkout-simulator-box">
                  <span className="checkout-portal-label">🔒 Sandboxed Simulated card transaction</span>
                  
                  <div className="form-field-group">
                    <label>Card Number</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                      className="form-input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 card-expiry-cvv-row">
                    <div className="form-field-group">
                      <label>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="MMYY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, ''))}
                        className="form-input-field text-center"
                      />
                    </div>
                    <div className="form-field-group">
                      <label>CVV</label>
                      <input
                        type="password"
                        maxLength={3}
                        placeholder="***"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="form-input-field text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI SIMULATOR */}
              {paymentMethod === 'upi' && (
                <div className="checkout-form-container checkout-simulator-box">
                  <span className="checkout-portal-label">📱 Simulated UPI portal</span>
                  
                  <div className="form-field-group">
                    <label>UPI ID (VPA)</label>
                    <input
                      type="text"
                      placeholder="username@upi"
                      value={upiAddress}
                      onChange={(e) => setUpiAddress(e.target.value)}
                      className="form-input-field"
                    />
                  </div>
                </div>
              )}

              {/* COD DETAILS */}
              {paymentMethod === 'cod' && (
                <div className="checkout-simulator-box text-center">
                  <p className="text-sm text-secondary leading-relaxed">
                    You can pay in cash or via QR code to our delivery executive when your Ayurvedic remedies are delivered.
                  </p>
                </div>
              )}

              {/* PAYMENT Gateway processing status / Error logs */}
              {isProcessing && (
                <div className="border border-[#EBE6DC] bg-[#FEFDF8]/60 p-4 rounded-xl text-center mt-6" aria-live="polite">
                  <div className="circular-spinner mx-auto mb-2 animate-spin w-6 h-6 border-2 border-brand-secondary border-t-transparent rounded-full"></div>
                  <p className="text-xs font-semibold text-brand-primary">{processingStatus}</p>
                </div>
              )}
              {paymentError && (
                <div className="border border-red-200 bg-red-50 p-4 rounded-xl text-left text-xs text-red-600 mt-6 font-medium">
                  ⚠️ {paymentError}
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 text-xs text-secondary">
                <input
                  type="checkbox"
                  id="simulate-failure"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                />
                <label htmlFor="simulate-failure">Simulate payment transaction failure</label>
              </div>
            </div>
          )}

          {/* STEP 4: SIMULATED TRANSACTION SUCCESS SCREEN */}
          {step === 'success' && (
            <div className="cart-success-view">
              <div className="success-icon-wrapper scale-up-animation">
                <CheckCircle size={60} className="text-[#2D5016]" />
              </div>
              <h3 className="font-display font-semibold text-xl text-[#2D5016] mt-4 mb-2">Order Confirmed!</h3>
              <p className="text-secondary text-sm leading-relaxed mb-6">
                Your Ayurvedic formulation order has been successfully placed. Order ID is <strong>{orderId}</strong>.
              </p>
              
              <div className="border border-[#EBE6DC] bg-[#FEFDF8]/60 p-5 rounded-2xl text-left w-full mb-8">
                <h5 className="font-sans text-xs font-bold text-[#2D5016] uppercase tracking-wider mb-3">Delivery Destination:</h5>
                <p className="text-xs text-secondary mb-1"><strong>Name:</strong> {shippingForm.name}</p>
                <p className="text-xs text-secondary mb-1"><strong>Contact:</strong> {shippingForm.phone}</p>
                <p className="text-xs text-secondary"><strong>Address:</strong> {shippingForm.address}, {shippingForm.city} - {shippingForm.pincode} ({shippingForm.country})</p>
              </div>

              <button type="button" onClick={onClose} className="btn-pill btn-pill-primary w-full justify-center">
                Continue Exploring
              </button>
            </div>
          )}
        </div>

        {/* Panel Footer (Calculations and CTAs) */}
        {step !== 'success' && cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-calculation-row">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="cart-calculation-row">
              <span>GST (12% Simulated)</span>
              <span>₹{gst}</span>
            </div>
            <div className="cart-calculation-row">
              <span>Shipping Fee</span>
              <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
            </div>
            <div className="cart-calculation-row total">
              <span>Total Price</span>
              <span>₹{total}</span>
            </div>

            {/* Panel Buttons */}
            <div className="cart-actions-row mt-6">
              {step !== 'cart' && (
                <button
                  type="button"
                  onClick={() => setStep(step === 'payment' ? 'shipping' : 'cart')}
                  className="btn-pill btn-pill-secondary border-dark"
                  disabled={isProcessing}
                >
                  Back
                </button>
              )}
              
              {step === 'payment' ? (
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  className="btn-pill btn-pill-primary flex-1 justify-center relative overflow-hidden"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing Transaction...' : `Simulate Pay ₹${total}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'cart') {
                      openCheckout();
                    } else {
                      handleNextStep();
                    }
                  }}
                  className="btn-pill btn-pill-primary flex-1 justify-center space-x-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
