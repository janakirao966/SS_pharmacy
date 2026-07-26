import { useState, useEffect } from 'react';
import { supabase, type DatabaseProductRecall } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminSkeleton, 
  AdminEmptyState 
} from '../components/admin/AdminPrimitives';
import { Warning } from '@phosphor-icons/react';

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

  const activeRecalls = recalls.filter(r => r.status === 'active');

  const columns = [
    { 
      header: 'Recall #', 
      render: (r: DatabaseProductRecall) => <span className="font-mono font-semibold text-[#000000]">{r.recall_number}</span> 
    },
    { 
      header: 'Product ID', 
      render: (r: DatabaseProductRecall) => <span className="font-mono text-xs text-[#71717a]">{r.product_id}</span> 
    },
    { 
      header: 'Severity', 
      render: (r: DatabaseProductRecall) => <AdminStatusBadge status={r.severity} /> 
    },
    { 
      header: 'Status', 
      render: (r: DatabaseProductRecall) => <AdminStatusBadge status={r.status} /> 
    },
    { 
      header: 'Recall Reason', 
      render: (r: DatabaseProductRecall) => <span className="font-medium text-[#000000] text-xs">{r.reason}</span> 
    },
    { 
      header: 'Created Date', 
      render: (r: DatabaseProductRecall) => <span className="font-mono text-xs text-[#71717a]">{new Date(r.created_at).toLocaleDateString('en-IN')}</span> 
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Pharmaceutical Safety & Batch Recalls</span>
          <p className="text-xs text-[#71717a] margin-0">Manage safety recalls, quarantine affected batch inventory, and track quality control actions</p>
        </div>

        {/* Active Safety Recall Alert Banner */}
        {activeRecalls.length > 0 && (
          <div className="p-3.5 bg-[#fbfbf5] border border-[#dc2626] rounded-xl flex items-center gap-3">
            <Warning size={20} className="text-[#dc2626] shrink-0" />
            <div>
              <span className="font-semibold text-xs text-[#dc2626] block">
                {activeRecalls.length} Active Product/Batch Safety Recall(s)
              </span>
              <span className="text-[0.7rem] text-[#71717a]">
                Affected inventory batches are automatically quarantined from customer checkout and order fulfillment.
              </span>
            </div>
          </div>
        )}

        {/* Recalls Workspace Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : recalls.length === 0 ? (
          <AdminEmptyState
            title="No Product Safety Recalls Active"
            description="All manufactured Ayurvedic formulations and lot batches meet strict pharmaceutical quality standards."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={recalls}
                  keyExtractor={(r) => r.id}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden space-y-3">
              {recalls.map((r) => (
                <AdminMobileRecord
                  key={r.id}
                  title={r.recall_number}
                  subtitle={r.product_id}
                  meta={`Reason: ${r.reason}`}
                  badge={<AdminStatusBadge status={r.severity} />}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
