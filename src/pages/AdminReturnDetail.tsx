import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge, AdminInput, AdminSelect, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { CaretLeft, Check, X, ClipboardText, CreditCard } from '@phosphor-icons/react';

export default function AdminReturnDetail() {
  const { returnId } = useParams<{ returnId: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [returnRecord, setReturnRecord] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [codPayout, setCodPayout] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inspection Modal State
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [itemDispositions, setItemDispositions] = useState<Record<string, { condition: string; disposition: string; note: string }>>({});

  // COD Payout Modal State
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [accountLast4, setAccountLast4] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const fetchDetail = async () => {
    if (!returnId) return;
    setLoading(true);
    try {
      const { data: retData, error: retErr } = await supabase
        .from('returns')
        .select('*, orders(*)')
        .eq('id', returnId)
        .maybeSingle();

      if (retErr) throw retErr;
      setReturnRecord(retData);

      const { data: itemData } = await supabase
        .from('return_items')
        .select('*, products(name)')
        .eq('return_id', returnId);

      setReturnItems(itemData || []);

      const { data: histData } = await supabase
        .from('return_status_history')
        .select('*')
        .eq('return_id', returnId)
        .order('created_at', { ascending: true });

      setHistory(histData || []);

      const { data: payoutData } = await supabase
        .from('cod_payouts')
        .select('*')
        .eq('return_id', returnId)
        .maybeSingle();

      setCodPayout(payoutData);

      // Initialize inspection defaults
      const dispMap: Record<string, { condition: string; disposition: string; note: string }> = {};
      (itemData || []).forEach(it => {
        dispMap[it.id] = {
          condition: it.condition_status || 'UNOPENED',
          disposition: it.inventory_disposition === 'pending_inspection' ? 'restock' : it.inventory_disposition,
          note: it.inspection_note || ''
        };
      });
      setItemDispositions(dispMap);

    } catch (err: any) {
      console.error('Fetch return detail error:', err);
      showToast('Failed to load return details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  const handleApprove = async () => {
    if (!returnRecord) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('returns')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', returnRecord.id);

      if (error) throw error;

      await supabase.from('return_status_history').insert({
        return_id: returnRecord.id,
        from_status: returnRecord.status,
        to_status: 'approved',
        source: 'admin',
        note: 'Return request approved by admin'
      });

      showToast('Return request approved successfully.', 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve return.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!returnRecord) return;
    const reason = prompt('Enter rejection reason:');
    if (!reason || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('returns')
        .update({ status: 'rejected', rejected_at: new Date().toISOString(), admin_note: reason })
        .eq('id', returnRecord.id);

      if (error) throw error;

      await supabase.from('return_status_history').insert({
        return_id: returnRecord.id,
        from_status: returnRecord.status,
        to_status: 'rejected',
        source: 'admin',
        note: `Return rejected: ${reason}`
      });

      showToast('Return request rejected.', 'info');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject return.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRecord) return;
    setIsSubmitting(true);

    try {
      const payload = returnItems.map(it => ({
        return_item_id: it.id,
        condition_status: itemDispositions[it.id]?.condition || 'UNOPENED',
        inventory_disposition: itemDispositions[it.id]?.disposition || 'restock',
        inspection_note: itemDispositions[it.id]?.note || ''
      }));

      const { data, error } = await supabase.rpc('complete_return_inspection', {
        p_return_id: returnRecord.id,
        p_dispositions: payload
      });

      if (error || !data?.success) throw new Error(error?.message || 'Inspection failed');

      showToast('Physical inspection recorded and inventory updated.', 'success');
      setIsInspectModalOpen(false);
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete inspection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCodPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRecord) return;
    if (!referenceNumber.trim()) {
      showToast('Bank Reference / UTR Number is mandatory.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalRefund = returnItems.reduce((acc, it) => acc + (it.refund_eligible_amount || 0), 0);

      const { error } = await supabase.from('cod_payouts').insert({
        return_id: returnRecord.id,
        order_id: returnRecord.order_id,
        payout_method: payoutMethod,
        beneficiary_name: beneficiaryName.trim() || returnRecord.orders?.customer_name,
        account_number_last4: accountLast4,
        ifsc_code: ifscCode,
        upi_id: upiId,
        amount: totalRefund,
        status: 'completed',
        reference_number: referenceNumber.trim(),
        processed_at: new Date().toISOString()
      });

      if (error) throw error;

      showToast('COD payout details saved and marked completed.', 'success');
      setIsCodModalOpen(false);
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to save COD payout.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteReturn = async () => {
    if (!returnRecord) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('complete_return', {
        p_return_id: returnRecord.id
      });

      if (error || !data?.success) throw new Error(error?.message || 'Completion failed');

      showToast('Return completed successfully. Credit note generated.', 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete return.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-5">
          <AdminSkeleton type="card" />
          <AdminSkeleton type="table" rows={4} />
        </div>
      </AdminLayout>
    );
  }

  const totalEligibleRefund = returnItems.reduce((acc, it) => acc + (it.refund_eligible_amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-3">
            <Link to="/admin/returns" className="admin-btn-icon" aria-label="Back to returns queue">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Merchandise Return Detail</span>
              <h2 className="text-base font-bold text-[#000000] font-mono">Return #{returnRecord?.return_number}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={returnRecord?.status} />
          </div>
        </div>

        {/* Master Return & Order Summary Card */}
        <AdminCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-3 mb-3">
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Customer</span>
              <h3 className="font-bold text-sm text-[#000000] m-0">{returnRecord?.orders?.customer_name}</h3>
              <p className="text-xs text-[#71717a] m-0">Phone: {returnRecord?.orders?.customer_phone || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <div className="text-center px-3 py-1.5 bg-[#ffffff] rounded-lg border border-[#e4e4e7]">
                <span className="text-[0.68rem] text-[#71717a] block font-semibold uppercase">Linked Order</span>
                <span className="font-semibold text-sm text-[#000000]">#{returnRecord?.orders?.order_number}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-[#ffffff] rounded-lg border border-[#e4e4e7]">
                <span className="text-[0.68rem] text-[#71717a] block font-semibold uppercase">Reason Code</span>
                <span className="font-semibold text-xs text-[#000000] uppercase">{returnRecord?.reason_code?.replace('_', ' ')}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-[#d4f9e0] rounded-lg border border-[#c1fbd4]">
                <span className="text-[0.68rem] text-[#000000] block font-semibold uppercase">Refund Amount</span>
                <span className="font-bold text-sm text-[#000000]">₹{totalEligibleRefund.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#71717a]">Customer Comments: <strong className="text-[#000000]">{returnRecord?.reason_detail || 'None provided'}</strong></span>
            <span className="font-mono text-[#71717a]">Requested: {new Date(returnRecord?.requested_at).toLocaleString('en-IN')}</span>
          </div>
        </AdminCard>

        {/* Workflow Operational Action Buttons */}
        <AdminCard className="space-y-3">
          <div className="border-b border-[#f4f4f0] pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Return Workflow Operations</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {returnRecord?.status === 'requested' && (
              <>
                <button
                  disabled={isSubmitting}
                  onClick={handleApprove}
                  className="admin-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Approve Return</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleReject}
                  className="admin-btn-secondary !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2]"
                >
                  <X size={14} weight="bold" />
                  <span>Reject Return</span>
                </button>
              </>
            )}

            {(returnRecord?.status === 'received' || returnRecord?.status === 'inspection') && (
              <button
                disabled={isSubmitting}
                onClick={() => setIsInspectModalOpen(true)}
                className="admin-btn-primary"
              >
                <ClipboardText size={14} weight="bold" />
                <span>Complete Physical Inspection</span>
              </button>
            )}

            {returnRecord?.status === 'inspection_completed' && (
              <>
                {!codPayout && returnRecord?.orders?.payment_method === 'cod' && (
                  <button
                    disabled={isSubmitting}
                    onClick={() => setIsCodModalOpen(true)}
                    className="admin-btn-secondary"
                  >
                    <CreditCard size={14} weight="bold" />
                    <span>Record COD Payout</span>
                  </button>
                )}
                <button
                  disabled={isSubmitting}
                  onClick={handleCompleteReturn}
                  className="admin-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Finalize & Issue Credit Note</span>
                </button>
              </>
            )}
          </div>
        </AdminCard>

        {/* Return Line Items Table */}
        <AdminCard className="space-y-3">
          <div className="border-b border-[#f4f4f0] pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Returned Line Items</h3>
          </div>
          <div className="admin-table-container overflow-x-auto">
            <table className="admin-data-table min-w-full text-xs">
              <thead>
                <tr>
                  <th>Product Formulation</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Refund Eligible</th>
                  <th>Condition</th>
                  <th>Inventory Disposition</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map(it => (
                  <tr key={it.id}>
                    <td className="font-semibold text-[#000000]">{it.products?.name || it.product_id}</td>
                    <td className="text-right font-mono font-semibold text-[#000000]">{it.quantity}</td>
                    <td className="text-right font-mono text-[#71717a]">₹{it.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right font-mono font-bold text-[#000000]">₹{it.refund_eligible_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <AdminStatusBadge status={it.condition_status?.toLowerCase()} />
                    </td>
                    <td>
                      <span className="font-mono text-xs uppercase text-[#71717a]">{it.inventory_disposition?.replace('_', ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        {/* Audit Status History */}
        <AdminCard className="space-y-3">
          <div className="border-b border-[#f4f4f0] pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Return Audit History Log</h3>
          </div>
          <div className="space-y-2 text-xs">
            {history.map((h) => (
              <div key={h.id} className="flex justify-between items-center bg-[#fbfbf5] p-2.5 rounded-lg border border-[#e4e4e7]">
                <div>
                  <span className="font-semibold text-[#000000] capitalize">{h.from_status || 'Initial'} → {h.to_status}</span>
                  {h.note && <span className="text-[#71717a] ml-2">({h.note})</span>}
                </div>
                <span className="font-mono text-[0.7rem] text-[#71717a]">{new Date(h.created_at).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      {/* Physical Inspection Modal */}
      {isInspectModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-[#000000]">Physical Warehouse Inspection</h3>
            <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs">
              {returnItems.map(it => (
                <div key={it.id} className="space-y-2 p-3 bg-[#fbfbf5] rounded-lg border border-[#e4e4e7]">
                  <span className="font-semibold text-[#000000] block">{it.products?.name} (Qty: {it.quantity})</span>
                  <div className="grid grid-cols-2 gap-2">
                    <AdminSelect
                      label="Condition"
                      value={itemDispositions[it.id]?.condition}
                      onChange={(e) => setItemDispositions({
                        ...itemDispositions,
                        [it.id]: { ...itemDispositions[it.id], condition: e.target.value }
                      })}
                      options={[
                        { label: "Unopened", value: "UNOPENED" },
                        { label: "Damaged in Transit", value: "DAMAGED_TRANSIT" },
                        { label: "Expired", value: "EXPIRED" },
                        { label: "Tampered", value: "TAMPERED" }
                      ]}
                    />
                    <AdminSelect
                      label="Disposition"
                      value={itemDispositions[it.id]?.disposition}
                      onChange={(e) => setItemDispositions({
                        ...itemDispositions,
                        [it.id]: { ...itemDispositions[it.id], disposition: e.target.value }
                      })}
                      options={[
                        { label: "Restock to Inventory", value: "restock" },
                        { label: "Quarantine Batch", value: "quarantine" },
                        { label: "Scrap / Destroy", value: "scrap" }
                      ]}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInspectModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary"
                >
                  Save Inspection Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COD Payout Modal */}
      {isCodModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-[#000000]">Record COD Refund Payout</h3>
            <form onSubmit={handleSaveCodPayout} className="space-y-3 text-xs">
              <AdminSelect
                label="Payout Method"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as any)}
                options={[
                  { label: "NEFT / RTGS Bank Transfer", value: "BANK_TRANSFER" },
                  { label: "UPI Instant Payout", value: "UPI" }
                ]}
              />

              <AdminInput
                label="Beneficiary Name"
                type="text"
                placeholder="e.g. Customer Full Name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
              />

              {payoutMethod === 'BANK_TRANSFER' ? (
                <div className="grid grid-cols-2 gap-2">
                  <AdminInput
                    label="Account Last 4 Digits"
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 5678"
                    value={accountLast4}
                    onChange={(e) => setAccountLast4(e.target.value)}
                    className="font-mono"
                  />
                  <AdminInput
                    label="IFSC Code"
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                  />
                </div>
              ) : (
                <AdminInput
                  label="UPI VPA ID"
                  type="text"
                  placeholder="e.g. customer@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="font-mono"
                />
              )}

              <AdminInput
                label="Bank Reference / UTR Number *"
                type="text"
                required
                placeholder="e.g. UTR123456789"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="font-mono"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCodModalOpen(false)}
                  className="admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn-primary"
                >
                  Record Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
