import { CheckCircle2, ShieldCheck, MessageCircle, X } from 'lucide-react';
import type { DatabaseOrder } from '../../lib/supabase';
import Button from './Button';

interface OrderConfirmationModalProps {
  order: Partial<DatabaseOrder> | null;
  onClose: () => void;
}

export default function OrderConfirmationModal({ order, onClose }: OrderConfirmationModalProps) {
  if (!order) return null;

  const whatsappMessage = encodeURIComponent(
    `Hello S.S. PHARMACY team, I have placed an order #${order.order_number} for ₹${order.total_amount}. Please confirm my order details.`
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FEFDF8] rounded-2xl max-w-md w-full border border-[#C5A059]/40 shadow-2xl p-6 relative text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X size={18} />
        </button>

        {/* Success Icon */}
        <div className="w-16 h-16 bg-[#1D3A28]/10 text-[#1D3A28] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#2D5016]/20">
          <CheckCircle2 size={36} className="text-[#2D5016]" />
        </div>

        <h2 className="font-display text-2xl font-bold text-[#1D3A28] mb-1">
          {order.payment_method === 'cod' ? 'Order Confirmed!' : 'Payment Successful!'}
        </h2>
        <p className="text-xs text-slate-600 mb-5">
          Thank you for choosing S.S. PHARMACY authentic Ayurvedic medicines.
        </p>

        {/* Receipt Ticket Box */}
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#C5A059]/30 text-left space-y-2 mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Number</span>
            <span className="text-sm font-bold text-[#1D3A28] font-mono">{order.order_number}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Customer Name</span>
            <span className="font-semibold text-slate-800">{order.customer_name}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Payment Status</span>
            <span className="font-bold text-[#2D5016] uppercase text-[10px] bg-[#2D5016]/10 px-2 py-0.5 rounded">
              {order.payment_status}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Total Paid / Amount</span>
            <span className="font-bold text-[#1D3A28] text-sm">₹{order.total_amount}</span>
          </div>

          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            <span className="font-semibold block text-slate-700">Delivery Address:</span>
            <span>{order.shipping_address}, {order.city}, {order.pincode}</span>
          </div>
        </div>

        {/* WhatsApp Tracking CTA */}
        <div className="space-y-3">
          <a
            href={`https://wa.me/919494323211?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#1EBE5A] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md text-xs transition-all"
          >
            <MessageCircle size={18} fill="currentColor" />
            <span>Track Order on WhatsApp</span>
          </a>

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full text-xs font-semibold py-2.5 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Continue Browsing Products
          </Button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck size={12} className="text-[#2D5016]" />
          <span>S.S. PHARMACY • Mfg. Lic. No. R-1970/Ayur</span>
        </div>
      </div>
    </div>
  );
}
