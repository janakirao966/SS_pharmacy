import { useState, useEffect } from 'react';
import { supabase, type DatabaseInventoryBatch } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Calendar, ShieldWarning, CheckCircle } from '@phosphor-icons/react';

export default function AdminExpiry() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<DatabaseInventoryBatch[]>([]);

  const fetchExpiry = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setBatches(data || []);
    } catch (err: any) {
      console.error('Fetch expiry error:', err);
      showToast('Failed to load expiry monitoring data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  const expiredBatches = batches.filter(b => new Date(b.expiry_date) <= today);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Calendar size={28} className="text-[#C5A059]" />
              <span>Pharmaceutical Expiry Management Center</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Monitor near-expiry Ayurvedic inventory (≤90 days) and server-blocked expired batches.
            </p>
          </div>
        </div>

        {/* Expired Stock Alert */}
        {expiredBatches.length > 0 && (
          <div className="p-4 bg-red-100 border-l-4 border-l-red-600 text-red-950 rounded-xl space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-red-900">
              <ShieldWarning size={20} />
              <span>{expiredBatches.length} EXPIRED BATCH(ES) DETECTED</span>
            </div>
            <p className="m-0">
              Expired batches are automatically blocked from server-side FEFO checkout allocation.
            </p>
          </div>
        )}

        {/* Expiry Data Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : batches.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Expired or Near-Expiry Inventory</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                All inventory batches meet pharmaceutical shelf-life dispatch standards.
              </p>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Batch Number</th>
                    <th>Product ID</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Quantity On Hand</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => {
                    const exp = new Date(b.expiry_date);
                    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
                    const isExpired = diffDays <= 0;
                    return (
                      <tr key={b.id} className={isExpired ? 'bg-red-50/50' : ''}>
                        <td className="font-mono font-bold text-[#1D3A28]">{b.batch_number}</td>
                        <td className="font-mono">{b.product_id}</td>
                        <td className="font-mono font-bold">{b.expiry_date}</td>
                        <td className="font-mono font-bold">
                          {isExpired ? (
                            <span className="text-red-700">Expired ({Math.abs(diffDays)}d ago)</span>
                          ) : (
                            <span className={diffDays <= 30 ? 'text-red-600' : diffDays <= 60 ? 'text-amber-600' : 'text-slate-700'}>
                              {diffDays} days
                            </span>
                          )}
                        </td>
                        <td className="font-mono font-bold">{b.quantity_on_hand}</td>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {isExpired ? 'EXPIRED (BLOCKED)' : b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminLayout>
  );
}
