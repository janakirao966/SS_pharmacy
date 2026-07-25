import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { calculateSubtotal, calculateDelivery, calculateOrderTotal } from '../../lib/pricing';

export default function CartDrawer() {
  const {
    isCartOpen: isOpen,
    setIsCartOpen,
    cartItems,
    handleRemoveFromCart: onRemove,
    handleUpdateCartQuantity: onUpdateQuantity,
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

  if (!isMounted) return null;

  const subtotal = calculateSubtotal(cartItems);
  const shippingFee = calculateDelivery(subtotal);
  const total = calculateOrderTotal(subtotal, shippingFee);

  return (
    <div className={`cart-drawer-overlay z-[5000] ${isClosing ? 'closing' : ''}`} role="dialog" aria-modal="true">
      <div className="cart-drawer-backdrop" onClick={onClose} />
      
      <div ref={containerRef} className="cart-drawer-panel">
        {/* Panel Header */}
        <div className="cart-drawer-header">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#8B6914]" />
            <h2 className="font-display font-semibold text-lg text-[#2D5016]">
              Your Order Bag
            </h2>
          </div>
          <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* Panel Scrollable Content */}
        <div className="cart-drawer-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty-view text-center">
              <ShoppingBag size={48} className="text-[#B0A796] mx-auto mb-4" />
              <p className="text-secondary text-sm mb-6">Your order bag is currently empty.</p>
              
              <button type="button" onClick={onClose} className="btn-pill btn-pill-primary mt-2 w-full justify-center">
                Browse Ayurvedic Formulations
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={item.product.id} className="cart-item-card text-left">
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
        </div>

        {/* Panel Footer (Calculations and CTAs) */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-calculation-row text-left">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="cart-calculation-row text-left">
              <span>GST (Simulated)</span>
              <span>Included (in MRP)</span>
            </div>
            <div className="cart-calculation-row text-left">
              <span>Shipping Fee</span>
              <span>{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
            </div>
            <div className="cart-calculation-row total text-left">
              <span>Total Price</span>
              <span>₹{total}</span>
            </div>

            {/* Panel Buttons */}
            <div className="cart-actions-row mt-6">
              <button
                type="button"
                onClick={openCheckout}
                className="btn-pill btn-pill-primary w-full justify-center space-x-2 py-3"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
