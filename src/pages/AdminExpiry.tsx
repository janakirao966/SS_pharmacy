import { useState, useEffect } from 'react';
import { supabase, type DatabaseInventoryBatch } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminSkeleton, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminEmptyState 
} from '../components/admin/AdminPrimitives';
import { Warning } from '@phosphor-icons/react';

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

  const columns = [
    { 
      header: 'Batch Number', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono font-semibold text-[#000000]">{b.batch_number}</span> 
    },
    { 
      header: 'Product ID', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono text-xs text-[#71717a]">{b.product_id}</span> 
    },
    { 
      header: 'Expiry Date', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono text-xs font-semibold text-[#000000]">{b.expiry_date}</span> 
    },
    { 
      header: 'Countdown', 
      render: (b: DatabaseInventoryBatch) => {
        const exp = new Date(b.expiry_date);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const isExpired = diffDays <= 0;
        return (
          <span className={`font-mono text-xs font-semibold ${isExpired ? 'text-[#dc2626]' : diffDays <= 30 ? 'text-[#dc2626]' : 'text-[#000000]'}`}>
            {isExpired ? `Expired (${Math.abs(diffDays)}d ago)` : `${diffDays} days remaining`}
          </span>
        );
      } 
    },
    { 
      header: 'On Hand', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono font-semibold text-[#000000]">{b.quantity_on_hand}</span>,
      className: 'text-right' 
    },
    { 
      header: 'FEFO Status', 
      render: (b: DatabaseInventoryBatch) => {
        const exp = new Date(b.expiry_date);
        const isExpired = exp <= today;
        return <AdminStatusBadge status={isExpired ? 'expired' : b.status} />;
      } 
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Header */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Expiry Monitoring & FEFO Security</span>
          <p className="text-xs text-[#71717a] margin-0">Monitor near-expiry inventory (≤90 days) and server-blocked expired batches</p>
        </div>

        {/* Expired Stock Alert Banner */}
        {expiredBatches.length > 0 && (
          <div className="p-3.5 bg-[#fbfbf5] border border-[#dc2626] rounded-xl flex items-center gap-3">
            <Warning size={20} className="text-[#dc2626] shrink-0" />
            <div>
              <span className="font-semibold text-xs text-[#dc2626] block">
                {expiredBatches.length} Expired Batch(es) Detected
              </span>
              <span className="text-[0.7rem] text-[#71717a]">
                Expired batches are automatically blocked from server-side FEFO order allocation.
              </span>
            </div>
          </div>
        )}

        {/* Expiry Data Table Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : batches.length === 0 ? (
          <AdminEmptyState
            title="No Expired or Near-Expiry Inventory"
            description="All active inventory batches meet pharmaceutical shelf-life dispatch standards."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={batches}
                  keyExtractor={(b) => b.id}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {batches.map((b) => {
                const exp = new Date(b.expiry_date);
                const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
                const isExpired = diffDays <= 0;

                return (
                  <AdminMobileRecord
                    key={b.id}
                    title={b.batch_number}
                    subtitle={b.product_id}
                    meta={`Exp: ${b.expiry_date} (${isExpired ? `Expired ${Math.abs(diffDays)}d ago` : `${diffDays}d left`}) · Qty: ${b.quantity_on_hand}`}
                    badge={<AdminStatusBadge status={isExpired ? 'expired' : b.status} />}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
