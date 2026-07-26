import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, type DatabaseInventoryMovement, type DatabaseInventoryReservation } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton, AdminStatusBadge } from '../components/admin/AdminPrimitives';
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
        <div className="space-y-5">
          <AdminSkeleton type="card" />
          <AdminSkeleton type="table" rows={4} />
        </div>
      </AdminLayout>
    );
  }

  const available = inventory ? (inventory.quantity_on_hand - inventory.quantity_reserved) : 0;

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/inventory" className="admin-btn-icon" aria-label="Back to inventory">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Inventory Detail & Ledger</span>
              <h2 className="text-base font-bold text-[#000000]">{inventory?.products?.name || productId}</h2>
            </div>
          </div>
          <span className="font-mono text-xs text-[#71717a]">SKU: {inventory?.sku || 'N/A'}</span>
        </div>

        {/* Product Stock Overview Card */}
        <AdminCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-3 mb-3">
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Stock Level Summary</span>
              <h3 className="font-bold text-sm text-[#000000] m-0">{inventory?.products?.name || productId}</h3>
              <p className="text-xs text-[#71717a] m-0">{inventory?.products?.category}</p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="text-center px-3 py-1.5 bg-[#ffffff] rounded-lg border border-[#e4e4e7]">
                <span className="text-[0.68rem] text-[#71717a] block font-semibold uppercase">On Hand</span>
                <span className="font-semibold text-sm text-[#000000]">{inventory?.quantity_on_hand || 0}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-[#ffffff] rounded-lg border border-[#e4e4e7]">
                <span className="text-[0.68rem] text-[#71717a] block font-semibold uppercase">Reserved</span>
                <span className="font-semibold text-sm text-[#000000]">{inventory?.quantity_reserved || 0}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-[#d4f9e0] rounded-lg border border-[#c1fbd4]">
                <span className="text-[0.68rem] text-[#000000] block font-semibold uppercase">Available</span>
                <span className="font-semibold text-sm text-[#000000]">{available}</span>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Active Reservations Card */}
        {reservations.length > 0 && (
          <AdminCard>
            <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2 mb-3">
              <Clock size={16} className="text-[#000000]" />
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#000000] m-0">Active Order Reservations ({reservations.length})</h3>
            </div>
            <div className="space-y-2 text-xs">
              {reservations.map(r => (
                <div key={r.id} className="flex justify-between items-center bg-[#fbfbf5] p-2.5 rounded-lg border border-[#e4e4e7]">
                  <div>
                    <span className="font-semibold text-[#000000]">Order #{r.order_id}</span>
                    <span className="text-[#71717a] ml-2 font-mono text-[0.75rem]">Qty: {r.quantity}</span>
                  </div>
                  <div className="text-[0.7rem] text-[#71717a] font-mono">
                    Expires: {new Date(r.expires_at).toLocaleTimeString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        )}

        {/* Append-Only Movement Ledger */}
        <AdminCard className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
            <ClockCounterClockwise size={16} className="text-[#000000]" />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#000000] m-0">Append-Only Inventory Movement Ledger</h3>
          </div>

          {movements.length === 0 ? (
            <p className="text-xs text-[#71717a] italic py-2">No inventory movements recorded for this formulation yet.</p>
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
                      <td className="font-semibold text-[#000000]">
                        <AdminStatusBadge status={m.movement_type.toLowerCase()} />
                      </td>
                      <td className={`text-right font-mono font-semibold ${m.quantity_change > 0 ? 'text-[#16a34a]' : m.quantity_change < 0 ? 'text-[#dc2626]' : 'text-[#000000]'}`}>
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </td>
                      <td className="text-right font-mono text-[#71717a]">{m.quantity_before}</td>
                      <td className="text-right font-mono font-semibold text-[#000000]">{m.quantity_after}</td>
                      <td className="text-[#000000]">{m.reason}</td>
                      <td className="font-mono text-[0.7rem] text-[#71717a]">
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
