import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type DatabaseOrder, type DatabaseOrderItem, type DatabaseOrderHistoryEvent, type DatabaseShipment, type DatabaseRefund, type DatabaseNotification, type DatabaseInvoice } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton, AdminStatusBadge, AdminInput, AdminTextarea } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { 
  CaretLeft, 
  Warning, 
  ShoppingCart, 
  User, 
  MapPin, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  Truck, 
  ArrowSquareOut, 
  CurrencyInr, 
  Envelope, 
  ArrowClockwise, 
  PaperPlaneRight, 
  Receipt, 
  DownloadSimple 
} from '@phosphor-icons/react';

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
        <div className="flex items-center gap-2">
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('confirmed')} className="admin-btn-primary">
            Confirm Order
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('cancelled')} className="admin-btn-secondary !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2]">
            Cancel Order
          </button>
        </div>
      );
    }
    if (order.order_status === 'confirmed') {
      return (
        <div className="flex items-center gap-2">
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('processing')} className="admin-btn-primary">
            Start Processing
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('cancelled')} className="admin-btn-secondary !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2]">
            Cancel Order
          </button>
        </div>
      );
    }
    if (order.order_status === 'processing') {
      return (
        <div className="flex items-center gap-2">
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('packed')} className="admin-btn-primary">
            Mark as Packed
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('cancelled')} className="admin-btn-secondary !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2]">
            Cancel Order
          </button>
        </div>
      );
    }
    if (order.order_status === 'packed') {
      return (
        <div className="flex items-center gap-2">
          <button disabled={isSubmitting} onClick={() => setIsShipmentModalOpen(true)} className="admin-btn-secondary">
            {shipment ? 'Edit Shipping Details' : 'Add Shipping Details'}
          </button>
          {shipment ? (
            <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('shipped')} className="admin-btn-primary">
              Mark as Shipped
            </button>
          ) : (
            <span className="text-xs font-medium text-[#71717a] bg-[#f4f4f0] px-3 py-1.5 rounded-lg border border-[#e4e4e7]">
              Add details to enable "Mark as Shipped"
            </span>
          )}
        </div>
      );
    }
    if (order.order_status === 'shipped') {
      return (
        <div className="flex items-center gap-2">
          <button disabled={isSubmitting} onClick={() => setIsCorrectionModalOpen(true)} className="admin-btn-secondary">
            Correct Tracking Info
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('out_for_delivery')} className="admin-btn-primary">
            Mark Out for Delivery
          </button>
        </div>
      );
    }
    if (order.order_status === 'out_for_delivery') {
      return (
        <div className="flex items-center gap-2">
          <button disabled={isSubmitting} onClick={() => setIsCorrectionModalOpen(true)} className="admin-btn-secondary">
            Correct Tracking Info
          </button>
          <button disabled={isSubmitting} onClick={() => handleStatusChangeAttempt('delivered')} className="admin-btn-primary">
            Mark Delivered
          </button>
        </div>
      );
    }

    if (order.order_status === 'delivered') {
      return (
        <button disabled={isSubmitting} onClick={() => setIsCorrectionModalOpen(true)} className="admin-btn-secondary">
          Correct Tracking Info
        </button>
      );
    }

    return (
      <span className="text-xs font-semibold text-[#71717a] uppercase">
        No fulfillment actions available
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-5">
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
            <Warning size={44} className="text-[#dc2626] mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#000000]">Operational Failure</h2>
            <p className="text-xs text-[#71717a] mt-1.5 font-medium">{error || 'Order record not found.'}</p>
            <Link to="/admin/orders" className="admin-btn-primary mt-5 inline-block">
              Back to Orders List
            </Link>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-3">
            <Link to="/admin/orders" className="admin-btn-icon" aria-label="Back to orders">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#000000] font-mono">{order.order_number}</span>
                <AdminStatusBadge status={order.order_status} />
              </div>
              <span className="text-xs text-[#71717a]">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice ? (
              <Link
                to="/admin/invoices"
                className="admin-btn-secondary text-xs"
              >
                <DownloadSimple size={14} />
                <span>Invoice ({invoice.invoice_number})</span>
              </Link>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={handleIssueInvoice}
                className="admin-btn-secondary text-xs"
              >
                <Receipt size={14} />
                <span>Issue Tax Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* Operational Status Action Bar */}
        <AdminCard className="bg-[#ffffff]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#71717a] uppercase tracking-wider">Current Pipeline Stage:</span>
              <AdminStatusBadge status={order.order_status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {renderActionButtons()}
            </div>
          </div>
        </AdminCard>

        {/* 3-Column Split Customer, Address, and Billing details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer Card */}
          <AdminCard className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
              <User size={16} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Customer Identity</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Name</span>
                <span className="font-semibold text-[#000000]">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Phone Contact</span>
                <span className="font-mono text-[#000000]">{order.customer_phone}</span>
              </div>
              {order.customer_email && (
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Email</span>
                  <span className="font-mono text-[#000000]">{order.customer_email}</span>
                </div>
              )}
            </div>
          </AdminCard>

          {/* Shipping Address Card */}
          <AdminCard className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
              <MapPin size={16} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Shipping Destination</h3>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-[#000000] leading-relaxed font-sans">{order.shipping_address}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">City</span>
                  <span className="font-semibold text-[#000000]">{order.city}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Pincode</span>
                  <span className="font-mono font-semibold text-[#000000]">{order.pincode}</span>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Transaction Metadata Card */}
          <AdminCard className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
              <CreditCard size={16} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Billing & Payment</h3>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#71717a] font-medium uppercase text-[0.7rem]">Method</span>
                <span className="font-semibold uppercase text-[#000000]">{order.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#71717a] font-medium uppercase text-[0.7rem]">Payment ID</span>
                <span className="font-mono text-[#71717a] text-[0.75rem]">{order.razorpay_payment_id || 'COD / Pending'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#71717a] font-medium uppercase text-[0.7rem]">Payment Status</span>
                <AdminStatusBadge status={order.payment_status} />
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Invoice & Tax Operational Card */}
        <AdminCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-[#000000]" />
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#000000] m-0">GST Tax Invoice & Financial Document</h3>
                <p className="text-[0.7rem] text-[#71717a] m-0">Server-authoritative tax calculations and immutable document snapshot.</p>
              </div>
            </div>
            {invoice ? (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#d4f9e0] text-[#000000]">
                {invoice.invoice_type.replace('_', ' ')}: {invoice.invoice_number}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#f4f4f0] text-[#71717a]">
                Invoice Pending
              </span>
            )}
          </div>

          {invoice ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Invoice Number</span>
                <span className="font-mono font-semibold text-[#000000]">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Taxable Value</span>
                <span className="font-mono font-semibold text-[#000000]">₹{invoice.taxable_value}</span>
              </div>
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Total GST</span>
                <span className="font-mono font-semibold text-[#000000]">
                  ₹{(invoice.cgst_total + invoice.sgst_total + invoice.igst_total).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/admin/invoices"
                  className="admin-btn-secondary text-xs"
                >
                  <DownloadSimple size={14} />
                  <span>Invoices Portal</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="text-[#71717a] italic m-0">
                Tax invoice will be generated when order reaches packed/shipped status.
              </p>
              <button
                disabled={isSubmitting}
                onClick={handleIssueInvoice}
                className="admin-btn-primary text-xs"
              >
                <Receipt size={14} />
                <span>Issue Tax Invoice</span>
              </button>
            </div>
          )}
        </AdminCard>

        {/* Refund Management Card */}
        {(refund || (order.order_status === 'cancelled' && order.payment_status === 'paid')) && (
          <AdminCard className="bg-[#fbfbf5] border-l-4 border-l-[#dc2626]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#e4e4e7] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <CurrencyInr size={18} className="text-[#dc2626]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#000000]">Razorpay Refund Operations</h3>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                refund?.status === 'processed' ? 'bg-[#d4f9e0] text-[#000000]' : 'bg-[#fef2f2] text-[#dc2626]'
              }`}>
                Refund Status: {refund ? refund.status : 'Required'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Refundable Amount</span>
                <span className="font-mono font-semibold text-sm text-[#000000]">₹{order.total_amount}</span>
              </div>
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Razorpay Refund Reference</span>
                <span className="font-mono font-semibold text-[#000000]">{refund?.razorpay_refund_id || 'Not Issued Yet'}</span>
              </div>
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Action</span>
                {refund?.status === 'processed' ? (
                  <span className="text-[#16a34a] font-semibold block mt-1">✓ Refund Processed</span>
                ) : (
                  <button
                    disabled={isSubmitting}
                    onClick={handleProcessRefund}
                    className="admin-btn-primary !bg-[#dc2626] hover:!bg-[#b91c1c] text-xs mt-1"
                  >
                    {isSubmitting ? 'Processing...' : 'Initiate Razorpay Refund'}
                  </button>
                )}
              </div>
            </div>

            {refund?.reason && (
              <div className="mt-3 pt-2.5 border-t border-[#e4e4e7] text-xs">
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Cancellation Reason</span>
                <p className="text-[#71717a] italic m-0">{refund.reason}</p>
              </div>
            )}
          </AdminCard>
        )}

        {/* Dedicated Shipping & Tracking Card */}
        {shipment && (
          <AdminCard>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#000000]">Shipping & Logistics Record</h3>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#f4f4f0] text-[#000000] uppercase">
                Shipment Status: {shipment.shipment_status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Carrier</span>
                <span className="font-semibold text-[#000000]">{shipment.carrier}</span>
                {shipment.service_name && <span className="text-[#71717a] block text-[0.7rem]">{shipment.service_name}</span>}
              </div>

              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Tracking Number</span>
                <span className="font-mono font-semibold text-[#000000]">{shipment.tracking_number}</span>
                {shipment.awb_number && <span className="text-[#71717a] block text-[0.7rem]">AWB: {shipment.awb_number}</span>}
              </div>

              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Tracking Link</span>
                {shipment.tracking_url ? (
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#000000] font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>Open Tracking</span>
                    <ArrowSquareOut size={12} />
                  </a>
                ) : (
                  <span className="text-[#71717a] font-mono text-[0.7rem]">No Link Provided</span>
                )}
              </div>

              <div>
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Timestamps</span>
                <div className="space-y-0.5 text-[0.7rem] text-[#71717a]">
                  {shipment.shipped_at && <div>Shipped: {new Date(shipment.shipped_at).toLocaleDateString('en-IN')}</div>}
                  {shipment.delivered_at && <div>Delivered: {new Date(shipment.delivered_at).toLocaleDateString('en-IN')}</div>}
                  {!shipment.shipped_at && <div className="italic">Not Dispatched Yet</div>}
                </div>
              </div>
            </div>

            {shipment.admin_note && (
              <div className="mt-3 pt-2.5 border-t border-[#f4f4f0] text-xs">
                <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase block">Internal Note</span>
                <p className="text-[#71717a] italic m-0">{shipment.admin_note}</p>
              </div>
            )}
          </AdminCard>
        )}

        {/* Customer Communications Card */}
        <AdminCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Envelope size={18} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#000000]">Customer Communications</h3>
            </div>
            <span className="text-xs font-medium text-[#71717a]">
              Logged: {notifications.length}
            </span>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-[#71717a] italic py-1">No notification events logged for this order yet.</p>
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
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="font-semibold text-[#000000]">
                        {n.event_type}
                        {n.resend_of_notification_id && (
                          <span className="ml-1 text-[0.65rem] bg-[#f4f4f0] text-[#000000] px-1.5 py-0.5 rounded font-mono">
                            RESEND
                          </span>
                        )}
                      </td>
                      <td className="uppercase font-mono text-[0.7rem] text-[#71717a]">{n.channel}</td>
                      <td className="font-mono text-[#71717a] text-[0.75rem]">{n.recipient}</td>
                      <td>
                        <AdminStatusBadge status={n.status} />
                      </td>
                      <td className="font-mono text-center text-[#71717a]">{n.attempt_count} / {n.max_attempts}</td>
                      <td className="text-[0.7rem] text-[#71717a] font-mono">
                        <div>Created: {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        {n.sent_at && <div className="text-[#16a34a] font-semibold">Sent: {new Date(n.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>}
                      </td>
                      <td className="text-right space-x-1.5">
                        {(n.status === 'failed' || n.status === 'retry_scheduled') && (
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleRetryNotification(n.id)}
                            className="admin-btn-secondary !py-0.5 !px-2 text-[0.7rem]"
                          >
                            <ArrowClockwise size={12} weight="bold" />
                            <span>Retry</span>
                          </button>
                        )}
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleResendNotification(n.id)}
                          className="admin-btn-secondary !py-0.5 !px-2 text-[0.7rem]"
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

        {/* Timeline & Items Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* History Timeline */}
          <AdminCard className="lg:col-span-1">
             <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2 mb-4">
              <Clock size={16} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Order History & Lifecycle</h3>
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-[#e4e4e7] before:z-0 pl-8 md:pl-0">
              {timeline.map((event, index) => (
                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white bg-[#000000] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm absolute left-0 md:left-1/2 -translate-x-[18px] md:translate-x-0 z-10">
                    <CheckCircle size={13} weight="bold" />
                  </div>
                  
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-2rem)] bg-[#ffffff] p-2.5 rounded-lg border border-[#e4e4e7] relative">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="font-semibold text-xs text-[#000000] capitalize">
                        {event.to_status.replace('_', ' ')}
                      </div>
                      <div className="text-[0.65rem] text-[#71717a] font-mono ml-2">
                        {new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-[0.7rem] text-[#71717a] flex justify-between">
                      <span className="capitalize">{event.source}</span>
                      <span>{new Date(event.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Order Line Items & Financial Totals */}
          <AdminCard className="p-0 overflow-hidden lg:col-span-2 flex flex-col">
            <div className="flex items-center gap-2 border-b border-[#f4f4f0] p-3.5">
              <ShoppingCart size={16} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Order Items & Financial Summary</h3>
            </div>

            <div className="admin-table-container flex-1">
              <table className="admin-data-table min-w-full">
                <thead>
                  <tr>
                    <th>Product Title</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Line Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold text-[#000000] whitespace-normal min-w-[150px]">{item.product_name}</td>
                      <td className="text-right font-mono text-[#000000]">₹{item.unit_price}</td>
                      <td className="text-center font-mono text-[#000000]">{item.quantity}</td>
                      <td className="text-right font-mono font-semibold text-[#000000]">₹{item.total_price}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#fbfbf5] font-medium border-t border-[#e4e4e7]">
                    <td colSpan={3} className="text-right text-[#71717a] uppercase text-[0.7rem]">Items Subtotal</td>
                    <td className="text-right font-mono text-[#000000]">₹{order.subtotal}</td>
                  </tr>
                  <tr className="bg-[#fbfbf5] font-medium">
                    <td colSpan={3} className="text-right text-[#71717a] uppercase text-[0.7rem]">Delivery Charge</td>
                    <td className="text-right font-mono text-[#000000]">₹{order.delivery_charge}</td>
                  </tr>
                  <tr className="bg-[#fbfbf5] font-bold text-sm text-[#000000] border-t border-[#e4e4e7]">
                    <td colSpan={3} className="text-right uppercase text-[0.75rem] tracking-wider">Grand Total Amount</td>
                    <td className="text-right font-mono text-[#000000]">₹{order.total_amount?.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Mandatory Cancellation Reason Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-xl p-5 max-w-md w-full border border-[#e4e4e7] space-y-3.5 shadow-xl">
            <h3 className="font-semibold text-sm text-[#000000]">
              Cancel Order #{order.order_number}
            </h3>
            <p className="text-xs text-[#71717a]">
              {order.payment_status === 'paid'
                ? 'This order was paid online. Cancelling it will flag it for a Razorpay refund.'
                : 'This order will be marked as cancelled. No payment refund is required for COD/unpaid orders.'}
            </p>

            <form onSubmit={handleCancelOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Cancellation Reason (min 10 chars) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State operational reason for cancelling order..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2 border border-[#e4e4e7] rounded-lg text-xs focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary !bg-[#dc2626] hover:!bg-[#b91c1c]"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-xl p-5 max-w-lg w-full border border-[#e4e4e7] space-y-3.5 shadow-xl">
            <h3 className="font-semibold text-sm text-[#000000]">
              {shipment ? 'Edit Shipping Details' : 'Add Shipping Details'}
            </h3>
            <form onSubmit={handleSaveShipment} className="space-y-3 text-xs">
              <AdminInput
                label="Carrier Name *"
                type="text"
                required
                placeholder="e.g. Delhivery, Bluedart, Speed Post"
                value={shipmentForm.carrier}
                onChange={(e) => setShipmentForm({ ...shipmentForm, carrier: e.target.value })}
                className="focus:outline-none focus:border-[#000000]"
              />

              <AdminInput
                label="Tracking Number *"
                type="text"
                required
                placeholder="e.g. DEL123456789"
                value={shipmentForm.tracking_number}
                onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_number: e.target.value })}
                className="font-mono focus:outline-none focus:border-[#000000]"
              />

              <div className="grid grid-cols-2 gap-3">
                <AdminInput
                  label="Service Name (Optional)"
                  type="text"
                  placeholder="e.g. Surface Express"
                  value={shipmentForm.service_name}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, service_name: e.target.value })}
                  className="focus:outline-none focus:border-[#000000]"
                />
                <AdminInput
                  label="AWB Number (Optional)"
                  type="text"
                  placeholder="e.g. AWB987654"
                  value={shipmentForm.awb_number}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, awb_number: e.target.value })}
                  className="font-mono focus:outline-none focus:border-[#000000]"
                />
              </div>

              <AdminInput
                label="Tracking URL (HTTPS Required)"
                type="url"
                placeholder="https://track.delhivery.com/p/123456789"
                value={shipmentForm.tracking_url}
                onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_url: e.target.value })}
                className="font-mono focus:outline-none focus:border-[#000000]"
              />

              <AdminTextarea
                label="Internal Admin Note (Optional)"
                rows={2}
                placeholder="Internal notes regarding dispatch..."
                value={shipmentForm.admin_note}
                onChange={(e) => setShipmentForm({ ...shipmentForm, admin_note: e.target.value })}
                className="focus:outline-none focus:border-[#000000]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShipmentModalOpen(false)}
                  className="admin-btn-secondary"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-xl p-5 max-w-lg w-full border border-[#e4e4e7] space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f4f4f0] pb-2">
              <h3 className="font-semibold text-sm text-[#dc2626]">
                Post-Dispatch Tracking Correction
              </h3>
            </div>
            <p className="text-xs text-[#71717a]">
              This order has already been dispatched. Modifying tracking information will log an operational audit event.
            </p>

            <form onSubmit={handleCorrectShipment} className="space-y-3 text-xs">
              <AdminInput
                label="New Carrier Name *"
                type="text"
                required
                value={correctionForm.carrier}
                onChange={(e) => setCorrectionForm({ ...correctionForm, carrier: e.target.value })}
                className="focus:outline-none focus:border-[#000000]"
              />

              <AdminInput
                label="New Tracking Number *"
                type="text"
                required
                value={correctionForm.tracking_number}
                onChange={(e) => setCorrectionForm({ ...correctionForm, tracking_number: e.target.value })}
                className="font-mono focus:outline-none focus:border-[#000000]"
              />

              <AdminInput
                label="New Tracking URL (HTTPS Required)"
                type="url"
                value={correctionForm.tracking_url}
                onChange={(e) => setCorrectionForm({ ...correctionForm, tracking_url: e.target.value })}
                className="font-mono focus:outline-none focus:border-[#000000]"
              />

              <AdminTextarea
                label="Correction Reason (min 10 chars) *"
                rows={2}
                required
                placeholder="State why tracking info is being altered after dispatch..."
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                className="!border-[#dc2626] focus:outline-none focus:!border-[#dc2626]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary !bg-[#dc2626] hover:!bg-[#b91c1c]"
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
