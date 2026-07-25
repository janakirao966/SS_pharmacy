import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type DatabaseOrder, type DatabaseOrderItem, type DatabaseOrderHistoryEvent, type DatabaseShipment, type DatabaseRefund, type DatabaseNotification, type DatabaseInvoice } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, Warning, ShoppingCart, User, MapPin, CreditCard, Clock, CheckCircle, Truck, ArrowSquareOut, CurrencyInr, Envelope, ArrowClockwise, PaperPlaneRight, Receipt, DownloadSimple } from '@phosphor-icons/react';

export default function AdminOrdersDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<DatabaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<DatabaseOrderItem[]>([]);
  const [timeline, setTimeline] = useState<DatabaseOrderHistoryEvent[]>([]);
  const [shipment, setShipment] = useState<DatabaseShipment | null>(null);
  const [refund, setRefund] = useState<DatabaseRefund | null>(null);
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [invoice, setInvoice] = useState<DatabaseInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Status modification state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shipment Modal States
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    carrier: '',
    service_name: '',
    awb_number: '',
    tracking_number: '',
    tracking_url: '',
    admin_note: ''
  });
  const [correctionForm, setCorrectionForm] = useState({
    carrier: '',
    service_name: '',
    awb_number: '',
    tracking_number: '',
    tracking_url: '',
    reason: ''
  });

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

      // 2. Fetch associated order line items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);

      // 3. Fetch history timeline
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true });
        
      if (historyError) throw historyError;
      setTimeline(historyData || []);

      // 4. Fetch shipment record
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', id)
        .maybeSingle();

      if (!shipmentError && shipmentData) {
        setShipment(shipmentData as DatabaseShipment);
        setShipmentForm({
          carrier: shipmentData.carrier || '',
          service_name: shipmentData.service_name || '',
          awb_number: shipmentData.awb_number || '',
          tracking_number: shipmentData.tracking_number || '',
          tracking_url: shipmentData.tracking_url || '',
          admin_note: shipmentData.admin_note || ''
        });
        setCorrectionForm({
          carrier: shipmentData.carrier || '',
          service_name: shipmentData.service_name || '',
          awb_number: shipmentData.awb_number || '',
          tracking_number: shipmentData.tracking_number || '',
          tracking_url: shipmentData.tracking_url || '',
          reason: ''
        });
      } else {
        setShipment(null);
      }

      // 5. Fetch refund record
      const { data: refundData } = await supabase
        .from('refunds')
        .select('*')
        .eq('order_id', id)
        .maybeSingle();

      setRefund(refundData as DatabaseRefund | null);

      // 6. Fetch notification events
      const { data: notifData } = await supabase
        .from('customer_notifications')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      setNotifications(notifData || []);

      // 7. Fetch invoice record
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', id)
        .maybeSingle();

      setInvoice(invData as DatabaseInvoice | null);
    } catch (err: any) {
      console.error('Fetch order detail error:', err);
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueInvoice = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('issue_order_invoice', { p_order_id: id });
      if (rpcErr || !data?.success) throw new Error(rpcErr?.message || 'Invoice issuance failed');

      showToast(`Invoice ${data.invoice_number} issued successfully.`, 'success');

      // Trigger PDF generation Edge Function asynchronously
      await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: data.invoice_id }
      });

      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Issue invoice error:', err);
      showToast(err.message || 'Failed to issue tax invoice.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChangeAttempt = (newStatus: string) => {
    if (newStatus === 'cancelled') {
      setIsCancelModalOpen(true);
      return;
    }
    setPendingStatus(newStatus);
    setIsConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!id || !pendingStatus || !order) return;
    
    setIsSubmitting(true);
    try {
      let rpcName = 'update_order_status';
      let rpcArgs: any = { p_order_id: id, p_new_status: pendingStatus, p_note: null };

      if (pendingStatus === 'shipped') {
        rpcName = 'mark_order_shipped';
        rpcArgs = { p_order_id: id };
      } else if (pendingStatus === 'out_for_delivery') {
        rpcName = 'mark_order_out_for_delivery';
        rpcArgs = { p_order_id: id };
      } else if (pendingStatus === 'delivered') {
        rpcName = 'mark_order_delivered';
        rpcArgs = { p_order_id: id };
      }

      const { error: updateError } = await supabase.rpc(rpcName, rpcArgs);

      if (updateError) throw updateError;

      await fetchOrderDetail();
      showToast(`Order updated to ${pendingStatus.toUpperCase()} successfully.`, 'success');
    } catch (err: any) {
      console.error('Update status error:', err);
      showToast(err.message || 'Failed to write changes to Supabase.', 'error');
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
      setPendingStatus(null);
    }
  };

  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (cancelReason.trim().length < 10) {
      showToast('Cancellation reason must be at least 10 characters.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: cancelErr } = await supabase.rpc('cancel_order_with_refund_check', {
        p_order_id: id,
        p_reason: cancelReason.trim()
      });

      if (cancelErr) throw cancelErr;

      showToast('Order cancelled successfully.', 'success');
      setIsCancelModalOpen(false);
      setCancelReason('');
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Cancel order error:', err);
      showToast(err.message || 'Failed to cancel order.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('process-refund', {
        body: { order_id: id }
      });

      if (fnError || data?.error) {
        throw new Error(fnError?.message || data?.error || 'Refund initiation failed');
      }

      showToast('Razorpay refund initiated successfully.', 'success');
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Process refund error:', err);
      showToast(err.message || 'Failed to initiate Razorpay refund.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryNotification = async (notifId: string) => {
    setIsSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-notification', {
        body: { notification_id: notifId }
      });

      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'Retry failed');

      showToast('Notification delivery retried.', 'success');
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Retry notification error:', err);
      showToast(err.message || 'Failed to retry notification.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendNotification = async (notifId: string) => {
    setIsSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_resend_notification', {
        p_notification_id: notifId
      });

      if (rpcErr) throw rpcErr;

      // Immediately trigger worker for the newly created resend notification
      const newNotifId = data?.new_notification_id;
      if (newNotifId) {
        await supabase.functions.invoke('send-notification', {
          body: { notification_id: newNotifId }
        });
      }

      showToast('Intentional Resend notification created and triggered.', 'success');
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Resend notification error:', err);
      showToast(err.message || 'Failed to resend notification.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!shipmentForm.carrier.trim() || !shipmentForm.tracking_number.trim()) {
      showToast('Carrier name and Tracking Number are required.', 'error');
      return;
    }

    if (shipmentForm.tracking_url.trim() && !shipmentForm.tracking_url.trim().startsWith('https://')) {
      showToast('Tracking URL must be a valid HTTPS URL.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: saveError } = await supabase.rpc('save_order_shipment', {
        p_order_id: id,
        p_carrier: shipmentForm.carrier.trim(),
        p_service_name: shipmentForm.service_name.trim() || null,
        p_awb_number: shipmentForm.awb_number.trim() || null,
        p_tracking_number: shipmentForm.tracking_number.trim(),
        p_tracking_url: shipmentForm.tracking_url.trim() || null,
        p_admin_note: shipmentForm.admin_note.trim() || null
      });

      if (saveError) throw saveError;

      showToast('Shipping details saved successfully.', 'success');
      setIsShipmentModalOpen(false);
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Save shipment error:', err);
      showToast(err.message || 'Failed to save shipping details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!correctionForm.carrier.trim() || !correctionForm.tracking_number.trim()) {
      showToast('Carrier name and Tracking Number are required.', 'error');
      return;
    }

    if (correctionForm.reason.trim().length < 10) {
      showToast('A detailed correction reason (at least 10 chars) is required.', 'error');
      return;
    }

    if (correctionForm.tracking_url.trim() && !correctionForm.tracking_url.trim().startsWith('https://')) {
      showToast('Tracking URL must be a valid HTTPS URL.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: corrError } = await supabase.rpc('correct_order_shipment', {
        p_order_id: id,
        p_new_carrier: correctionForm.carrier.trim(),
        p_new_service_name: correctionForm.service_name.trim() || null,
        p_new_awb_number: correctionForm.awb_number.trim() || null,
        p_new_tracking_number: correctionForm.tracking_number.trim(),
        p_new_tracking_url: correctionForm.tracking_url.trim() || null,
        p_correction_reason: correctionForm.reason.trim()
      });

      if (corrError) throw corrError;

      showToast('Shipment correction logged and saved.', 'success');
      setIsCorrectionModalOpen(false);
      await fetchOrderDetail();
    } catch (err: any) {
      console.error('Correct shipment error:', err);
      showToast(err.message || 'Failed to apply post-dispatch correction.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActionButtons = () => {
    if (!order) return null;

    if (order.order_status === 'new') {
      return (
        <>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('confirmed')} className="admin-btn-primary">
            Confirm Order
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('cancelled')} className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ring-1 ring-inset ring-red-200">
            Cancel Order
          </button>
        </>
      );
    }
    if (order.order_status === 'confirmed') {
      return (
        <>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('processing')} className="admin-btn-primary">
            Start Processing
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('cancelled')} className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ring-1 ring-inset ring-red-200">
            Cancel Order
          </button>
        </>
      );
    }
    if (order.order_status === 'processing') {
      return (
        <>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('packed')} className="admin-btn-primary">
            Mark as Packed
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('cancelled')} className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm ring-1 ring-inset ring-red-200">
            Cancel Order
          </button>
        </>
      );
    }
    if (order.order_status === 'packed') {
      return (
        <>
          <button disabled={isSubmitting} onClick={() => setIsShipmentModalOpen(true)} className="bg-[#8A6B29] text-white hover:bg-[#7A6027] px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm">
            {shipment ? 'Edit Shipping Details' : 'Add Shipping Details'}
          </button>
          {shipment ? (
            <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('shipped')} className="admin-btn-primary">
              Mark as Shipped
            </button>
          ) : (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-lg">
              Add details to enable "Mark as Shipped"
            </span>
          )}
        </>
      );
    }
    if (order.order_status === 'shipped') {
      return (
        <>
          <button disabled={isSubmitting} onClick={() => setIsCorrectionModalOpen(true)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-300">
            Correct Tracking Info
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('out_for_delivery')} className="admin-btn-primary">
            Mark Out for Delivery
          </button>
        </>
      );
    }
    if (order.order_status === 'out_for_delivery') {
      return (
        <>
          <button disabled={isSubmitting} onClick={() => setIsCorrectionModalOpen(true)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-300">
            Correct Tracking Info
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('delivered')} className="bg-[#2D5016] text-white hover:bg-[#1D3A28] px-4 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm">
            Mark Delivered
          </button>
        </>
      );
    }

    if (order.order_status === 'delivered') {
      return (
        <button disabled={isSubmitting} onClick={() => setIsCorrectionModalOpen(true)} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-2 text-xs font-bold rounded-lg transition-colors border border-slate-300">
          Correct Tracking Info
        </button>
      );
    }

    return (
      <span className="text-sm font-bold text-slate-500 uppercase">
        No fulfillment actions available
      </span>
    );
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
      <div className="space-y-6 animate-fadeIn pb-12">
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

        {/* 3-Column Split Customer, Address, and Billing details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Card */}
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

          {/* Shipping Address Card */}
          <AdminCard className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin size={18} className="text-[#C5A059]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Shipping Destination</h3>
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

          {/* Transaction Metadata Card */}
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
                <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Status</span>
                <span className={`font-bold uppercase ${order.payment_status === 'paid' ? 'text-green-700' : order.payment_status === 'refunded' ? 'text-orange-600' : 'text-slate-700'}`}>
                  {order.payment_status}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Invoice & Tax Operational Card */}
        <AdminCard className="bg-[#FAF8F5] border-l-4 border-l-[#C5A059]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Receipt size={20} className="text-[#C5A059]" />
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#1D3A28] m-0">GST Invoice & Financial Document</h3>
                <p className="text-[11px] text-slate-500 m-0">Authoritative server-side tax calculation and immutable document snapshot.</p>
              </div>
            </div>
            {invoice ? (
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase ${
                invoice.invoice_type === 'TAX_INVOICE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {invoice.invoice_type.replace('_', ' ')}: {invoice.invoice_number}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded uppercase bg-slate-200 text-slate-700">
                Invoice Not Issued
              </span>
            )}
          </div>

          {invoice ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoice Number</span>
                <span className="font-mono font-bold text-sm text-[#1D3A28]">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Taxable Value</span>
                <span className="font-mono font-bold text-sm text-slate-800">₹{invoice.taxable_value}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total GST (CGST+SGST/IGST)</span>
                <span className="font-mono font-bold text-sm text-slate-800">
                  ₹{(invoice.cgst_total + invoice.sgst_total + invoice.igst_total).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/invoices"
                  className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm inline-flex items-center gap-1"
                >
                  <DownloadSimple size={14} />
                  <span>View in Invoices Portal</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 text-xs">
              <p className="text-slate-600 italic m-0">
                Tax invoice will be generated when order reaches packed/shipped eligibility or via admin authorization.
              </p>
              <button
                disabled={isSubmitting}
                onClick={handleIssueInvoice}
                className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5 shrink-0"
              >
                <Receipt size={16} />
                <span>Issue Tax Invoice</span>
              </button>
            </div>
          )}
        </AdminCard>

        {/* Refund Management Card (If order is cancelled and paid, or refund record exists) */}
        {(refund || (order.order_status === 'cancelled' && order.payment_status === 'paid')) && (
          <AdminCard className="bg-[#FFFDFB] border-l-4 border-l-orange-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CurrencyInr size={20} className="text-orange-600" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#1D3A28]">Razorpay Refund Operations</h3>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded uppercase ${
                refund?.status === 'processed' ? 'bg-green-100 text-green-800' :
                refund?.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                Refund Status: {refund ? refund.status : 'Required'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Refundable Amount</span>
                <span className="font-mono font-bold text-base text-[#1D3A28]">₹{order.total_amount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Razorpay Refund Reference</span>
                <span className="font-mono font-bold text-slate-800">{refund?.razorpay_refund_id || 'Not Issued Yet'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Refund Action</span>
                {refund?.status === 'processed' ? (
                  <span className="text-green-700 font-bold block mt-1">✓ Money Refunded via Razorpay</span>
                ) : (
                  <button
                    disabled={isSubmitting}
                    onClick={handleProcessRefund}
                    className="mt-1 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-colors"
                  >
                    {isSubmitting ? 'Processing...' : 'Initiate Razorpay Refund'}
                  </button>
                )}
              </div>
            </div>

            {refund?.reason && (
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cancellation Reason</span>
                <p className="text-slate-700 italic m-0">{refund.reason}</p>
              </div>
            )}
          </AdminCard>
        )}

        {/* Dedicated Shipping & Tracking Card (If shipment exists) */}
        {shipment && (
          <AdminCard className="bg-[#FAF8F5] border-l-4 border-l-[#8A6B29]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-[#8A6B29]" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#1D3A28]">Shipping & Logistics Record</h3>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#8A6B29]/15 text-[#7A6027] uppercase">
                Shipment Status: {shipment.shipment_status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Courier / Carrier</span>
                <span className="font-bold text-[#1D3A28] text-sm">{shipment.carrier}</span>
                {shipment.service_name && <span className="text-slate-500 block text-[11px]">{shipment.service_name}</span>}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tracking Number</span>
                <span className="font-mono font-bold text-slate-800">{shipment.tracking_number}</span>
                {shipment.awb_number && <span className="text-slate-500 block text-[11px]">AWB: {shipment.awb_number}</span>}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tracking Link</span>
                {shipment.tracking_url ? (
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8A6B29] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Open Tracking</span>
                    <ArrowSquareOut size={12} />
                  </a>
                ) : (
                  <span className="text-slate-400 font-mono">No URL Provided</span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Logistics Timestamps</span>
                <div className="space-y-0.5 text-[11px] text-slate-600">
                  {shipment.shipped_at && <div>Shipped: {new Date(shipment.shipped_at).toLocaleDateString('en-IN')}</div>}
                  {shipment.delivered_at && <div>Delivered: {new Date(shipment.delivered_at).toLocaleDateString('en-IN')}</div>}
                  {!shipment.shipped_at && <div className="text-slate-400 italic">Not Dispatched Yet</div>}
                </div>
              </div>
            </div>

            {shipment.admin_note && (
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Internal Admin Note</span>
                <p className="text-slate-700 italic m-0">{shipment.admin_note}</p>
              </div>
            )}
          </AdminCard>
        )}

        {/* Customer Communications Card */}
        <AdminCard className="bg-[#FEFDF8] border-l-4 border-l-[#2D5016]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Envelope size={20} className="text-[#2D5016]" />
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#1D3A28]">Customer Communications & Notifications</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total Logged: {notifications.length}
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No notification events logged for this purchase order yet.</p>
          ) : (
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Timestamps</th>
                    <th className="text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="font-bold text-[#1D3A28]">
                        {n.event_type}
                        {n.resend_of_notification_id && (
                          <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                            RESEND
                          </span>
                        )}
                      </td>
                      <td className="uppercase font-mono text-[11px]">{n.channel}</td>
                      <td className="font-mono text-slate-600">{n.recipient}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          n.status === 'sent' ? 'bg-green-100 text-green-800' :
                          n.status === 'failed' ? 'bg-red-100 text-red-800' :
                          n.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {n.status.replace('_', ' ')}
                        </span>
                        {n.failure_code && (
                          <span className="block text-[10px] text-red-600 font-mono mt-0.5">{n.failure_code}</span>
                        )}
                      </td>
                      <td className="font-mono text-center">{n.attempt_count} / {n.max_attempts}</td>
                      <td className="text-[11px] text-slate-500 font-mono">
                        <div>Created: {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        {n.sent_at && <div className="text-green-700 font-bold">Sent: {new Date(n.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                      </td>
                      <td className="text-right space-x-2">
                        {(n.status === 'failed' || n.status === 'retry_scheduled') && (
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleRetryNotification(n.id)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-colors inline-flex items-center gap-1"
                          >
                            <ArrowClockwise size={12} weight="bold" />
                            <span>Retry</span>
                          </button>
                        )}
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleResendNotification(n.id)}
                          className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-colors inline-flex items-center gap-1"
                        >
                          <PaperPlaneRight size={12} weight="bold" />
                          <span>Resend</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* Live operational controls */}
        <AdminCard className="bg-[#FEFDF8]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status:</span>
              <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                order.order_status === 'delivered' ? 'bg-green-100 text-green-800' :
                order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {order.order_status.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {renderActionButtons()}
            </div>
          </div>
        </AdminCard>

        {/* Timeline & Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History Timeline */}
          <AdminCard className="lg:col-span-1">
             <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-6">
              <Clock size={18} className="text-[#C5A059]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Order Timeline</h3>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200 before:z-0 pl-10 md:pl-0">
              {timeline.map((event, index) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-[#1D3A28] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow absolute left-0 md:left-1/2 -translate-x-[20px] md:translate-x-0 z-10">
                    <CheckCircle size={14} weight="bold" />
                  </div>
                  
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded-lg shadow-sm border border-slate-100 relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm text-[#1D3A28] capitalize">
                        {event.to_status.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap ml-2">
                        {new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex justify-between">
                      <span className="capitalize">{event.source}</span>
                      <span>{new Date(event.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Purchase Line items Table */}
          <AdminCard className="p-0 overflow-hidden lg:col-span-2 flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 p-4">
              <ShoppingCart size={18} className="text-[#C5A059]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Order Invoice Items</h3>
            </div>

            <div className="admin-table-container flex-1">
              <table className="admin-data-table min-w-full">
                <thead>
                  <tr>
                    <th>Product Title</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-bold text-[#1D3A28] whitespace-normal min-w-[150px]">{item.product_name}</td>
                      <td className="text-right font-mono">₹{item.unit_price}</td>
                      <td className="text-center font-mono">{item.quantity}</td>
                      <td className="text-right font-mono font-bold">₹{item.total_price}</td>
                    </tr>
                  ))}
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
      </div>

      {/* Mandatory Cancellation Reason Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <h3 className="font-display font-bold text-lg text-red-800">
              Cancel Order #{order.order_number}
            </h3>
            <p className="text-xs text-slate-600">
              {order.payment_status === 'paid'
                ? 'This order was paid online. Cancelling it will mark it for a Razorpay refund.'
                : 'This order will be cancelled. No payment refund is required for COD/unpaid orders.'}
            </p>

            <form onSubmit={handleCancelOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cancellation Reason (min 10 chars) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter reason for cancelling order..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-red-700 text-white hover:bg-red-800 px-4 py-2 text-xs font-bold rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Shipping Modal */}
      {isShipmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <h3 className="font-display font-bold text-lg text-[#1D3A28]">
              {shipment ? 'Edit Shipping Details' : 'Add Shipping Details'}
            </h3>
            <form onSubmit={handleSaveShipment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Carrier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhivery, Bluedart, Speed Post"
                  value={shipmentForm.carrier}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, carrier: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tracking Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEL123456789"
                  value={shipmentForm.tracking_number}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_number: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Surface Express"
                    value={shipmentForm.service_name}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, service_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">AWB Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. AWB987654"
                    value={shipmentForm.awb_number}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, awb_number: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tracking URL (HTTPS Required)</label>
                <input
                  type="url"
                  placeholder="https://track.delhivery.com/p/123456789"
                  value={shipmentForm.tracking_url}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_url: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Admin Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Internal notes regarding dispatch..."
                  value={shipmentForm.admin_note}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, admin_note: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsShipmentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary"
                >
                  {isSubmitting ? 'Saving...' : 'Save Shipping Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post-Dispatch Correction Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-display font-bold text-lg text-red-800">
                Audited Post-Dispatch Tracking Correction
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              This order has already been dispatched. Modifying tracking information will generate an explicit security audit log.
            </p>

            <form onSubmit={handleCorrectShipment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Carrier Name *</label>
                <input
                  type="text"
                  required
                  value={correctionForm.carrier}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, carrier: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={correctionForm.tracking_number}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, tracking_number: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Tracking URL (HTTPS Required)</label>
                <input
                  type="url"
                  value={correctionForm.tracking_url}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, tracking_url: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-red-800 mb-1">Correction Reason (Mandatory, min 10 chars) *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="State why tracking info is being altered after dispatch..."
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full p-2.5 border border-red-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-red-700 text-white hover:bg-red-800 px-4 py-2 text-xs font-bold rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Logging...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={`Advance Order to ${pendingStatus?.toUpperCase()}?`}
        message={
          pendingStatus === 'delivered'
            ? 'Are you sure you want to mark this order as DELIVERED? This cannot be reversed.'
            : `Are you sure you want to advance this order to ${pendingStatus?.toUpperCase()}?`
        }
        confirmLabel={isSubmitting ? 'Updating...' : 'Confirm Update'}
        cancelLabel="Keep Current"
        isDestructive={false}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => {
          setIsConfirmOpen(false);
          setPendingStatus(null);
        }}
      />
    </AdminLayout>
  );
}
