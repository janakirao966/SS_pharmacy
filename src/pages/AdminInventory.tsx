import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Package, MagnifyingGlass, Warning, CheckCircle, ArrowClockwise } from '@phosphor-icons/react';

export default function AdminInventory() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjustment Modal State
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('*, products(name, mrp, category)');

      if (invErr) throw invErr;
      setInventoryList(invData || []);
    } catch (err: any) {
      console.error('Fetch inventory error:', err);
      showToast('Failed to load inventory from Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAdjustModal = (item: any) => {
    setSelectedProduct(item);
    setAdjustDelta(0);
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (adjustDelta === 0) {
      showToast('Quantity delta must be non-zero.', 'error');
      return;
    }
    if (!adjustReason.trim()) {
      showToast('Adjustment reason is mandatory.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('adjust_inventory', {
        p_product_id: selectedProduct.product_id,
        p_quantity_delta: adjustDelta,
        p_reason: adjustReason.trim()
      });

      if (rpcErr || !data?.success) {
        throw new Error(rpcErr?.message || 'Inventory adjustment failed');
      }

      showToast(`Stock updated for ${selectedProduct.products?.name || selectedProduct.product_id}.`, 'success');
      setIsAdjustModalOpen(false);
      await fetchInventory();
    } catch (err: any) {
      console.error('Adjust inventory error:', err);
      showToast(err.message || 'Failed to adjust stock.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventoryList.filter(item => {
    const prodName = item.products?.name || item.product_id;
    const matchesSearch = prodName.toLowerCase().includes(search.toLowerCase()) ||
                          (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
    
    const available = item.quantity_on_hand - item.quantity_reserved;
    let status = 'IN_STOCK';
    if (!item.inventory_enabled) status = 'DISABLED';
    else if (available <= 0) status = 'OUT_OF_STOCK';
    else if (available <= item.reorder_level) status = 'LOW_STOCK';

    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSKUs = inventoryList.length;
  const lowStockCount = inventoryList.filter(i => (i.quantity_on_hand - i.quantity_reserved) > 0 && (i.quantity_on_hand - i.quantity_reserved) <= i.reorder_level).length;
  const outOfStockCount = inventoryList.filter(i => (i.quantity_on_hand - i.quantity_reserved) <= 0).length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Package size={28} className="text-[#C5A059]" />
              <span>Production Inventory & Stock Control</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Server-authoritative stock levels, active reservations, and append-only movement ledger.
            </p>
          </div>
        </div>

        {/* KPI Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminCard className="bg-[#FAF8F5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tracked SKUs</span>
            <span className="text-2xl font-bold font-mono text-[#1D3A28]">{totalSKUs}</span>
          </AdminCard>

          <AdminCard className="bg-amber-50/60 border-l-4 border-l-amber-500">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Low Stock Warnings</span>
            <span className="text-2xl font-bold font-mono text-amber-900">{lowStockCount}</span>
          </AdminCard>

          <AdminCard className="bg-red-50/60 border-l-4 border-l-red-500">
            <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Out of Stock Alert</span>
            <span className="text-2xl font-bold font-mono text-red-900">{outOfStockCount}</span>
          </AdminCard>
        </div>

        {/* Filter Controls */}
        <AdminCard className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Product Name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="DISABLED">Inventory Disabled</option>
              </select>
            </div>
          </div>
        </AdminCard>

        {/* Inventory Data Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredInventory.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <Package size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Inventory Products Found</h3>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Product Description</th>
                    <th>SKU</th>
                    <th className="text-right">Stock On Hand</th>
                    <th className="text-right">Reserved</th>
                    <th className="text-right">Available</th>
                    <th className="text-center">Reorder Level</th>
                    <th>Status</th>
                    <th className="text-right">Stock Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const available = item.quantity_on_hand - item.quantity_reserved;
                    let isLow = available > 0 && available <= item.reorder_level;
                    let isOut = available <= 0;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="font-bold text-[#1D3A28]">{item.products?.name || item.product_id}</div>
                          <div className="text-[10px] text-slate-400">{item.products?.category}</div>
                        </td>
                        <td className="font-mono text-slate-600">{item.sku || 'N/A'}</td>
                        <td className="text-right font-mono font-bold text-slate-800">{item.quantity_on_hand}</td>
                        <td className="text-right font-mono text-amber-800 font-bold">{item.quantity_reserved}</td>
                        <td className="text-right font-mono font-bold text-[#1D3A28] text-sm">{available}</td>
                        <td className="text-center font-mono text-slate-500">{item.reorder_level}</td>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase inline-flex items-center gap-1 ${
                            isOut ? 'bg-red-100 text-red-800' :
                            isLow ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {isOut && <Warning size={12} />}
                            {isLow && <Warning size={12} />}
                            {!isOut && !isLow && <CheckCircle size={12} />}
                            <span>{isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}</span>
                          </span>
                        </td>
                        <td className="text-right space-x-2">
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-colors inline-flex items-center gap-1"
                          >
                            <ArrowClockwise size={12} weight="bold" />
                            <span>Adjust Stock</span>
                          </button>
                          <Link
                            to={`/admin/inventory/${item.product_id}`}
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-bold rounded border border-slate-300 inline-block"
                          >
                            Ledger History
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}

        {/* Stock Adjustment Modal */}
        {isAdjustModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-[#1D3A28] m-0">Manual Stock Adjustment</h3>
                <p className="text-slate-500 m-0">{selectedProduct.products?.name || selectedProduct.product_id}</p>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#C5A059]/30 grid grid-cols-2 gap-2 font-mono text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Stock On Hand</span>
                    <span className="font-bold text-sm text-[#1D3A28]">{selectedProduct.quantity_on_hand}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 block uppercase">Active Reserved</span>
                    <span className="font-bold text-sm text-amber-900">{selectedProduct.quantity_reserved}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity Delta (+ to Add, - to Deduct) *</label>
                  <input
                    type="number"
                    placeholder="e.g. +50 or -5"
                    value={adjustDelta || ''}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">New Stock On Hand will become: {selectedProduct.quantity_on_hand + adjustDelta}</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mandatory Adjustment Reason *</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Received supplier batch shipment #8841"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#2D5016] hover:bg-[#1D3A28] text-white font-bold px-4 py-1.5 rounded-lg shadow-sm"
                  >
                    Save Stock Adjustment
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
