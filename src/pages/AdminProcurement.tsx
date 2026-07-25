import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { ShoppingCart, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';

export default function AdminProcurement() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(legal_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Fetch POs error:', err);
      showToast('Failed to load purchase orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPOs = orders.filter(po => 
    po.po_number.toLowerCase().includes(search.toLowerCase()) ||
    (po.suppliers?.legal_name && po.suppliers.legal_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <ShoppingCart size={28} className="text-[#C5A059]" />
              <span>Procurement & Purchase Orders</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Issue purchase orders to Ayurvedic suppliers, track expected deliveries, and process Goods Receipts (GRN).
            </p>
          </div>
        </div>

        {/* Search */}
        <AdminCard>
          <div className="relative max-w-md">
            <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO Number, Supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </AdminCard>

        {/* PO Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredPOs.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Purchase Orders Issued</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Purchase orders generated for stock replenishment will be listed here.
              </p>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th>Expected Delivery</th>
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map(po => (
                    <tr key={po.id}>
                      <td className="font-mono font-bold text-[#1D3A28]">{po.po_number}</td>
                      <td className="font-bold">{po.suppliers?.legal_name || 'Vendor'}</td>
                      <td>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-amber-100 text-amber-800">
                          {po.status}
                        </span>
                      </td>
                      <td className="font-mono text-[11px]">{po.order_date}</td>
                      <td className="font-mono text-[11px]">{po.expected_delivery_date || 'N/A'}</td>
                      <td className="font-mono font-bold">₹{po.grand_total}</td>
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
