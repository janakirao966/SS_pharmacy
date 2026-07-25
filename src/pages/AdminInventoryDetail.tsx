import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type DatabaseInventoryMovement, type DatabaseInventoryReservation } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { CaretLeft, Clock, ClockCounterClockwise } from '@phosphor-icons/react';

export default function AdminInventoryDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any | null>(null);
  const [movements, setMovements] = useState<DatabaseInventoryMovement[]>([]);
  const [reservations, setReservations] = useState<DatabaseInventoryReservation[]>([]);

  const fetchDetail = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      // 1. Fetch Inventory Master Record
      const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('*, products(name, mrp, category)')
        .eq('product_id', productId)
        .maybeSingle();

      if (invErr) throw invErr;
      setInventory(invData);

      // 2. Fetch Movements Ledger
      const { data: movData, error: movErr } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (movErr) throw movErr;
      setMovements(movData || []);

      // 3. Fetch Active Reservations
      const { data: resData, error: resErr } = await supabase
        .from('inventory_reservations')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'active');

      if (resErr) throw resErr;
      setReservations(resData || []);

    } catch (err: any) {
      console.error('Fetch inventory detail error:', err);
      showToast('Failed to load inventory movement details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

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

  const available = inventory ? (inventory.quantity_on_hand - inventory.quantity_reserved) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <Link to="/admin/inventory" className="admin-btn-back text-xs">
            <CaretLeft size={16} weight="bold" />
            <span>Back to Inventory Portal</span>
          </Link>
          <span className="font-mono text-xs text-slate-500">Product Key: {productId}</span>
        </div>

        {/* Product Stock Overview Card */}
        <AdminCard className="bg-[#FAF8F5] border-l-4 border-l-[#C5A059]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-4">
            <div>
              <span className="text-[10px] font-bold text-[#8A6B29] uppercase tracking-wider block">Inventory Ledger Master</span>
              <h2 className="font-bold text-xl text-[#1D3A28] font-display m-0">{inventory?.products?.name || productId}</h2>
              <p className="text-xs text-slate-500 m-0">{inventory?.products?.category} • SKU: {inventory?.sku || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">On Hand</span>
                <span className="font-bold text-base text-slate-800">{inventory?.quantity_on_hand || 0}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-[10px] text-amber-800 block font-bold uppercase">Reserved</span>
                <span className="font-bold text-base text-amber-900">{inventory?.quantity_reserved || 0}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <span className="text-[10px] text-green-800 block font-bold uppercase">Available</span>
                <span className="font-bold text-base text-green-900">{available}</span>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Active Reservations */}
        {reservations.length > 0 && (
          <AdminCard className="bg-amber-50/50 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 border-b border-amber-200 pb-2 mb-3">
              <Clock size={18} className="text-amber-800" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 m-0">Active Order Reservations ({reservations.length})</h3>
            </div>
            <div className="space-y-2 text-xs">
              {reservations.map(r => (
                <div key={r.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-amber-200">
                  <div>
                    <span className="font-bold text-[#1D3A28]">Order #{r.order_id}</span>
                    <span className="text-slate-400 ml-2 font-mono">Qty: {r.quantity}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Expires: {new Date(r.expires_at).toLocaleTimeString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        )}

        {/* Append-Only Movement Ledger */}
        <AdminCard className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ClockCounterClockwise size={20} className="text-[#C5A059]" />
            <h3 className="font-bold text-sm text-[#1D3A28] m-0">Append-Only Inventory Movement History</h3>
          </div>

          {movements.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No inventory movements recorded for this product yet.</p>
          ) : (
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Movement Type</th>
                    <th className="text-right">Change</th>
                    <th className="text-right">Before</th>
                    <th className="text-right">After</th>
                    <th>Reason / Reference</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="font-bold text-[#1D3A28]">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          m.movement_type === 'INITIAL_STOCK' ? 'bg-blue-100 text-blue-800' :
                          m.movement_type === 'SALE_COMMITTED' ? 'bg-green-100 text-green-800' :
                          m.movement_type === 'MANUAL_ADJUSTMENT' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {m.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`text-right font-mono font-bold ${m.quantity_change > 0 ? 'text-green-700' : m.quantity_change < 0 ? 'text-red-700' : 'text-slate-700'}`}>
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </td>
                      <td className="text-right font-mono text-slate-500">{m.quantity_before}</td>
                      <td className="text-right font-mono font-bold text-slate-800">{m.quantity_after}</td>
                      <td className="text-slate-700">{m.reason}</td>
                      <td className="font-mono text-[11px] text-slate-500">
                        {new Date(m.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
