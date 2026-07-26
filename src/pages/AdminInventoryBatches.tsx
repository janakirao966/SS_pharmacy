import { useState, useEffect } from 'react';
import { supabase, type DatabaseInventoryBatch } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminSkeleton, 
  AdminStatusBadge, 
  AdminFilterBar, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminEmptyState 
} from '../components/admin/AdminPrimitives';

export default function AdminInventoryBatches() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<DatabaseInventoryBatch[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setBatches(data || []);
    } catch (err: any) {
      console.error('Fetch batches error:', err);
      showToast('Failed to load inventory batches.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBatches = batches.filter(b => {
    const matchesSearch = 
      b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
      b.product_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filterOptions = [
    { label: 'All Batch Statuses', value: 'all' },
    { label: 'Sellable', value: 'sellable' },
    { label: 'Quarantine', value: 'quarantine' },
    { label: 'Recalled', value: 'recalled' }
  ];

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
      header: 'Batch Status', 
      render: (b: DatabaseInventoryBatch) => <AdminStatusBadge status={b.status} /> 
    },
    { 
      header: 'Quality Clearance', 
      render: (b: DatabaseInventoryBatch) => <AdminStatusBadge status={b.quality_status} /> 
    },
    { 
      header: 'On Hand', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono text-[#000000] font-semibold">{b.quantity_on_hand}</span>,
      className: 'text-right'
    },
    { 
      header: 'Reserved', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono text-[#71717a]">{b.quantity_reserved}</span>,
      className: 'text-right'
    },
    { 
      header: 'Available', 
      render: (b: DatabaseInventoryBatch) => <span className="font-mono text-[#000000] font-semibold">{b.quantity_on_hand - b.quantity_reserved}</span>,
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Workspace Title Header */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Batch Management & FEFO Allocation</span>
          <p className="text-xs text-[#71717a] margin-0">Track pharmaceutical lot numbers, expiry sequences, and FEFO priorities</p>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search Batch # or Product ID..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Batch Status"
          />
        </AdminCard>

        {/* Batches Table Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : filteredBatches.length === 0 ? (
          <AdminEmptyState
            title="No Inventory Batches Found"
            description={
              search || statusFilter !== 'all'
                ? 'No batches match your search and filter parameters.'
                : 'Inventory batches will appear automatically when Goods Receipts (GRN) are posted.'
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={filteredBatches}
                  keyExtractor={(b) => b.id}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked View */}
            <div className="md:hidden space-y-3">
              {filteredBatches.map((b) => (
                <AdminMobileRecord
                  key={b.id}
                  title={b.batch_number}
                  subtitle={b.product_id}
                  meta={`Exp: ${b.expiry_date} · Avail: ${b.quantity_on_hand - b.quantity_reserved} · On Hand: ${b.quantity_on_hand}`}
                  badge={<AdminStatusBadge status={b.status} />}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
