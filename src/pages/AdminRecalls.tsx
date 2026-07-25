import { useState, useEffect } from 'react';
import { supabase, type DatabaseProductRecall } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Warning, CheckCircle } from '@phosphor-icons/react';

export default function AdminRecalls() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recalls, setRecalls] = useState<DatabaseProductRecall[]>([]);

  const fetchRecalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_recalls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecalls(data || []);
    } catch (err: any) {
      console.error('Fetch recalls error:', err);
      showToast('Failed to load product recalls.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Warning size={28} className="text-[#C5A059]" />
              <span>Pharmaceutical Product & Batch Recalls</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Initiate, activate, and manage product/batch safety recalls, release reservations, and notify affected customer orders.
            </p>
          </div>
        </div>

        {/* Recalls Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : recalls.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Safety Recalls Active</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Product and batch safety recalls initiated for quality issues will appear here.
              </p>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Recall Number</th>
                    <th>Product ID</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {recalls.map(r => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-[#1D3A28]">{r.recall_number}</td>
                      <td className="font-mono">{r.product_id}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          r.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          r.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="font-medium text-slate-800">{r.reason}</td>
                      <td className="font-mono text-[11px] text-slate-500">
                        {new Date(r.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminLayout>
  );
}
