import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { CaretLeft } from '@phosphor-icons/react';

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
        <div className="space-y-6">
          <AdminSkeleton type="card" />
          <AdminSkeleton type="table" rows={4} />
        </div>
      </AdminLayout>
    );
  }

  const totalEligibleRefund = returnItems.reduce((acc, it) => acc + (it.refund_eligible_amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <Link to="/admin/returns" className="admin-btn-back text-xs">
            <CaretLeft size={16} weight="bold" />
            <span>Back to Returns Portal</span>
          </Link>
          <span className="font-mono text-xs text-slate-500">Return Key: {returnRecord?.return_number}</span>
        </div>

        {/* Action Header Card */}
        <AdminCard className="bg-[#FAF8F5] border-l-4 border-l-[#C5A059] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold text-[#8A6B29] uppercase tracking-wider block">Return Operations Dashboard</span>
              <h2 className="font-bold text-xl text-[#1D3A28] font-display m-0">{returnRecord?.return_number}</h2>
              <p className="text-xs text-slate-500 m-0">Order: #{returnRecord?.orders?.order_number} • Customer: {returnRecord?.orders?.customer_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase ${
                returnRecord?.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                returnRecord?.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                returnRecord?.status === 'completed' ? 'bg-green-100 text-green-800' :
                returnRecord?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {returnRecord?.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {returnRecord?.status === 'requested' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm"
                >
                  Approve Return Request
                </button>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm"
                >
                  Reject Return
                </button>
              </>
            )}

            {(returnRecord?.status === 'approved' || returnRecord?.status === 'received' || returnRecord?.status === 'inspection') && (
              <button
                onClick={() => setIsInspectModalOpen(true)}
                className="bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm"
              >
                Record Physical Inspection & Disposition
              </button>
            )}

            {returnRecord?.orders?.payment_method === 'cod' && !codPayout && (
              <button
                onClick={() => setIsCodModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm"
              >
                Record COD Bank Payout
              </button>
            )}

            {returnRecord?.status === 'inspection_completed' && (
              <button
                onClick={handleCompleteReturn}
                disabled={isSubmitting}
                className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-3 py-1.5 text-xs font-bold rounded shadow-sm"
              >
                Finalize Return & Issue Credit Note
              </button>
            )}
          </div>
        </AdminCard>

        {/* Returned Items Table */}
        <AdminCard className="space-y-3">
          <h3 className="font-bold text-sm text-[#1D3A28] m-0">Returned Line Items</h3>
          <div className="admin-table-container overflow-x-auto">
            <table className="admin-data-table min-w-full text-xs">
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th className="text-right">Return Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Eligible Refund</th>
                  <th>Condition</th>
                  <th>Inventory Disposition</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map(it => (
                  <tr key={it.id}>
                    <td className="font-bold text-[#1D3A28]">{it.products?.name || it.product_id}</td>
                    <td className="text-right font-mono font-bold text-slate-800">{it.quantity}</td>
                    <td className="text-right font-mono text-slate-600">₹{it.unit_price_snapshot}</td>
                    <td className="text-right font-mono font-bold text-[#1D3A28]">₹{it.refund_eligible_amount}</td>
                    <td>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded">
                        {it.condition_status || 'UNOPENED'}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        it.inventory_disposition === 'restock' ? 'bg-green-100 text-green-800' :
                        it.inventory_disposition === 'damaged' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {it.inventory_disposition.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        {/* COD Payout Summary if applicable */}
        {codPayout && (
          <AdminCard className="bg-amber-50/60 border-l-4 border-l-amber-500">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 m-0 mb-2">COD Bank Payout Record</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Method</span>
                <span className="font-bold">{codPayout.payout_method}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Beneficiary</span>
                <span className="font-bold">{codPayout.beneficiary_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Amount</span>
                <span className="font-bold text-[#1D3A28]">₹{codPayout.amount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Bank UTR / Ref</span>
                <span className="font-bold text-amber-900">{codPayout.reference_number}</span>
              </div>
            </div>
          </AdminCard>
        )}

        {/* Return Status History Timeline */}
        <AdminCard className="space-y-4">
          <h3 className="font-bold text-sm text-[#1D3A28] m-0">Return Status Audit History</h3>
          <div className="space-y-3">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#C5A059] mt-1.5 shrink-0" />
                <div>
                  <div className="font-bold text-[#1D3A28]">
                    {h.from_status.toUpperCase()} → {h.to_status.toUpperCase()}
                  </div>
                  {h.note && <p className="text-slate-500 text-[11px] m-0">{h.note}</p>}
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(h.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Physical Inspection Modal */}
        {isInspectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-[#1D3A28] m-0">Physical Merchandise Inspection</h3>
                <p className="text-slate-500 m-0">Select condition and disposition for returned items.</p>
              </div>

              <form onSubmit={handleInspectionSubmit} className="space-y-4">
                {returnItems.map(it => (
                  <div key={it.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="font-bold text-[#1D3A28]">{it.products?.name || it.product_id}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Condition</label>
                        <select
                          value={itemDispositions[it.id]?.condition || 'UNOPENED'}
                          onChange={(e) => setItemDispositions(prev => ({
                            ...prev,
                            [it.id]: { ...prev[it.id], condition: e.target.value }
                          }))}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        >
                          <option value="UNOPENED">Unopened / Sealed</option>
                          <option value="OPENED">Opened</option>
                          <option value="DAMAGED">Damaged Container</option>
                          <option value="EXPIRED">Expired Product</option>
                          <option value="LEAKING">Leaking Container</option>
                          <option value="TAMPERED">Tampered Seal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500">Inventory Disposition</label>
                        <select
                          value={itemDispositions[it.id]?.disposition || 'restock'}
                          onChange={(e) => setItemDispositions(prev => ({
                            ...prev,
                            [it.id]: { ...prev[it.id], disposition: e.target.value }
                          }))}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        >
                          <option value="restock">Sellable (Restock Stock)</option>
                          <option value="damaged">Damaged (No Restock)</option>
                          <option value="expired">Expired (No Restock)</option>
                          <option value="quarantine">Quarantine Inspection</option>
                          <option value="discard">Discard / Waste</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsInspectModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#2D5016] hover:bg-[#1D3A28] text-white font-bold px-4 py-1.5 rounded-lg shadow-sm"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-[#1D3A28] m-0">Record COD Refund Payout</h3>
                <p className="text-slate-500 m-0">Amount: ₹{totalEligibleRefund}</p>
              </div>

              <form onSubmit={handleSaveCodPayout} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payout Method *</label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="BANK_TRANSFER">NEFT / RTGS / IMPS Bank Transfer</option>
                    <option value="UPI">UPI Instant Payout</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Beneficiary Name *</label>
                  <input
                    type="text"
                    placeholder="Customer Account Name"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {payoutMethod === 'BANK_TRANSFER' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Account Last 4</label>
                      <input
                        type="text"
                        placeholder="e.g. 4882"
                        value={accountLast4}
                        onChange={(e) => setAccountLast4(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">UPI ID</label>
                    <input
                      type="text"
                      placeholder="customer@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Reference / UTR Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR1299482910"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsCodModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#2D5016] hover:bg-[#1D3A28] text-white font-bold px-4 py-1.5 rounded-lg shadow-sm"
                  >
                    Save Payout Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
