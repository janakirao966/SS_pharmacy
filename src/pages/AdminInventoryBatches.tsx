import { useState, useEffect } from 'react';
import { supabase, type DatabaseInventoryBatch } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Package, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';

export default function AdminInventoryBatches() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<DatabaseInventoryBatch[]>([]);
  const [search, setSearch] = useState('');

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

  const filteredBatches = batches.filter(b => 
    b.batch_number.toLowerCase().includes(search.toLowerCase()) ||
    b.product_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Package size={28} className="text-[#C5A059]" />
              <span>Pharmaceutical Batch & Lot Inventory</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              FEFO allocation view, batch expiry management, stock on hand, reservations, and quarantine status.
            </p>
          </div>
        </div>

        {/* Search */}
        <AdminCard>
          <div className="relative max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Batch #, Product ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </AdminCard>

        {/* Batches Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredBatches.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Inventory Batches Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Batches are created automatically when Goods Receipts (GRN) are posted.
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
                    <th>Status</th>
                    <th>Quality Status</th>
                    <th>On Hand</th>
                    <th>Reserved</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map(b => {
                    const available = b.quantity_on_hand - b.quantity_reserved;
                    return (
                      <tr key={b.id}>
                        <td className="font-mono font-bold text-[#1D3A28]">{b.batch_number}</td>
                        <td className="font-mono">{b.product_id}</td>
                        <td className="font-mono font-bold">{b.expiry_date}</td>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            b.status === 'sellable' ? 'bg-green-100 text-green-800' :
                            b.status === 'recalled' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            b.quality_status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {b.quality_status}
                          </span>
                        </td>
                        <td className="font-mono font-bold">{b.quantity_on_hand}</td>
                        <td className="font-mono">{b.quantity_reserved}</td>
                        <td className="font-mono font-bold text-[#2D5016]">{available}</td>
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
