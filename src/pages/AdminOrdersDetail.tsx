import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type DatabaseOrder, type DatabaseOrderItem } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, Warning, ShoppingCart, User, MapPin, CreditCard } from '@phosphor-icons/react';

export default function AdminOrdersDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DatabaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<DatabaseOrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Status modification state
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ field: 'order_status' | 'payment_status'; value: string } | null>(null);

  const fetchOrderDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch main order metadata
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData as DatabaseOrder);
      setSelectedOrderStatus(orderData.order_status);
      setSelectedPaymentStatus(orderData.payment_status);

      // 2. Fetch associated order line items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);

    } catch (err: any) {
      console.error('Failed to query order details:', err);
      setError('Unable to load purchase order details from Supabase.');
      showToast('Error syncing order detail.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleStatusChangeAttempt = (field: 'order_status' | 'payment_status', value: string) => {
    setPendingChange({ field, value });
    setIsConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!id || !pendingChange || !order) return;
    setIsConfirmOpen(false);

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ [pendingChange.field]: pendingChange.value })
        .eq('id', id);

      if (updateError) throw updateError;

      setOrder((prev) => (prev ? { ...prev, [pendingChange.field]: pendingChange.value } : null));
      if (pendingChange.field === 'order_status') setSelectedOrderStatus(pendingChange.value);
      if (pendingChange.field === 'payment_status') setSelectedPaymentStatus(pendingChange.value);

      showToast(`Order updated successfully.`, 'success');
    } catch (err: any) {
      console.error('Update status error:', err);
      showToast('Failed to write changes to Supabase.', 'error');
    } finally {
      setPendingChange(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="skeleton-pulse w-36 h-6 rounded" />
          <AdminSkeleton type="card" />
          <AdminSkeleton type="table" rows={3} />
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <AdminCard className="admin-error-boundary">
          <div className="text-center py-12">
            <Warning size={48} className="text-[#B91C1C] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1D3A28] font-display">Operational Failure</h2>
            <p className="text-sm text-[#B91C1C] mt-2 font-medium">{error || 'Order record not found.'}</p>
            <Link to="/admin/orders" className="admin-btn-primary mt-6 inline-block">
              Back to Orders
            </Link>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Top bar back button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <Link to="/admin/orders" className="admin-btn-back">
            <CaretLeft size={16} weight="bold" />
            <span>Orders List</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">ID: {order.id}</span>
          </div>
        </div>

        {/* 3-Column Split Customer and Payment details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Identity & Customer card */}
          <AdminCard className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User size={18} className="text-[#C5A059]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Customer Identity</h3>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Name</span>
                <span className="text-sm font-bold text-[#1D3A28]">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Phone Contact</span>
                <span className="text-sm font-mono text-slate-700">{order.customer_phone}</span>
              </div>
              {order.customer_email && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Email</span>
                  <span className="text-sm font-mono text-slate-700">{order.customer_email}</span>
                </div>
              )}
            </div>
          </AdminCard>

          {/* Shipping Address card */}
          <AdminCard className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin size={18} className="text-[#C5A059]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Shipping Address</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed font-sans">{order.shipping_address}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">City</span>
                  <span className="font-semibold text-[#1D3A28]">{order.city}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pincode</span>
                  <span className="font-mono font-semibold text-[#1D3A28]">{order.pincode}</span>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Transaction Metadata card */}
          <AdminCard className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard size={18} className="text-[#C5A059]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Billing & Payment</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Method</span>
                <span className="font-bold uppercase text-slate-700">{order.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Payment ID</span>
                <span className="font-mono text-slate-500">{order.razorpay_payment_id || 'COD/Pending'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Receipt Created</span>
                <span className="text-slate-700">{new Date(order.created_at).toLocaleDateString('en-IN')} {new Date(order.created_at).toLocaleTimeString('en-IN')}</span>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Live operational dropdown selectors */}
        <AdminCard className="flex flex-wrap items-center gap-6 bg-[#FEFDF8]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fulfillment State:</span>
            <select
              value={selectedOrderStatus}
              onChange={(e) => handleStatusChangeAttempt('order_status', e.target.value)}
              className="admin-filter-select"
            >
              <option value="new">New</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment State:</span>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => handleStatusChangeAttempt('payment_status', e.target.value)}
              className="admin-filter-select"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cod_pending">COD Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </AdminCard>

        {/* Purchase Line items Table */}
        <AdminCard className="p-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 p-4">
            <ShoppingCart size={18} className="text-[#C5A059]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Order Invoice Items</h3>
          </div>

          <div className="admin-table-container">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Product Title</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-center">Quantity</th>
                  <th className="text-right">Item Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id}>
                    <td className="font-bold text-[#1D3A28]">{item.product_name}</td>
                    <td className="text-right font-mono">₹{item.unit_price}</td>
                    <td className="text-center font-mono">{item.quantity}</td>
                    <td className="text-right font-mono font-bold">₹{item.total_price}</td>
                  </tr>
                ))}
                {/* Math summation */}
                <tr className="bg-[#FAF8F5] font-semibold border-t-2 border-slate-200">
                  <td colSpan={3} className="text-right text-slate-500 uppercase text-[10px]">Items Subtotal</td>
                  <td className="text-right font-mono">₹{order.subtotal}</td>
                </tr>
                <tr className="bg-[#FAF8F5] font-semibold">
                  <td colSpan={3} className="text-right text-slate-500 uppercase text-[10px]">Delivery Surcharge</td>
                  <td className="text-right font-mono">₹{order.delivery_charge}</td>
                </tr>
                <tr className="bg-[#FAF8F5] font-bold text-sm text-[#1D3A28] border-t border-slate-200">
                  <td colSpan={3} className="text-right uppercase text-[11px] tracking-wider">Grand Total Amount</td>
                  <td className="text-right font-mono text-[#1D3A28]">₹{order.total_amount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      {/* Access guard Confirm dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={`Modify Order Status?`}
        message={`Are you sure you want to change this order's ${
          pendingChange?.field === 'order_status' ? 'fulfillment status' : 'payment status'
        } to "${pendingChange?.value.toUpperCase()}"?`}
        confirmLabel="Update Status"
        cancelLabel="Keep Current"
        isDestructive={pendingChange?.value === 'cancelled' || pendingChange?.value === 'failed'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => {
          setIsConfirmOpen(false);
          setPendingChange(null);
          // Restore selected selectors
          setSelectedOrderStatus(order.order_status);
          setSelectedPaymentStatus(order.payment_status);
        }}
      />
    </AdminLayout>
  );
}
