import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminInput, 
  AdminTextarea,
  AdminFilterBar,
  AdminDataTable,
  AdminMobileRecord,
  AdminEmptyState,
  AdminSkeleton
} from '../components/admin/AdminPrimitives';
import { ArrowClockwise } from '@phosphor-icons/react';

export default function AdminInventory() {
  const { showToast } = useToast();
  const navigate = useNavigate();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const filterOptions = [
    { label: 'All Stock Statuses', value: 'ALL' },
    { label: 'In Stock', value: 'IN_STOCK' },
    { label: 'Low Stock', value: 'LOW_STOCK' },
    { label: 'Out of Stock', value: 'OUT_OF_STOCK' },
    { label: 'Disabled', value: 'DISABLED' }
  ];

  const columns = [
    {
      header: 'Product Description',
      render: (item: any) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{item.products?.name || item.product_id}</span>
          <span className="text-[0.7rem] text-[#71717a]">{item.products?.category}</span>
        </div>
      )
    },
    {
      header: 'SKU',
      render: (item: any) => <span className="font-mono text-xs text-[#71717a]">{item.sku || 'N/A'}</span>
    },
    {
      header: 'On Hand',
      render: (item: any) => <span className="font-mono font-semibold text-[#000000]">{item.quantity_on_hand}</span>,
      className: 'text-right'
    },
    {
      header: 'Reserved',
      render: (item: any) => <span className="font-mono text-[#71717a]">{item.quantity_reserved}</span>,
      className: 'text-right'
    },
    {
      header: 'Available',
      render: (item: any) => {
        const available = item.quantity_on_hand - item.quantity_reserved;
        return <span className="font-mono font-semibold text-[#000000]">{available}</span>;
      },
      className: 'text-right'
    },
    {
      header: 'Reorder Level',
      render: (item: any) => <span className="font-mono text-xs text-[#71717a]">{item.reorder_level}</span>,
      className: 'text-center'
    },
    {
      header: 'Stock Condition',
      render: (item: any) => {
        const available = item.quantity_on_hand - item.quantity_reserved;
        let status = 'in_stock';
        if (!item.inventory_enabled) status = 'disabled';
        else if (available <= 0) status = 'out_of_stock';
        else if (available <= item.reorder_level) status = 'low_stock';

        return <AdminStatusBadge status={status} />;
      }
    },
    {
      header: 'Actions',
      render: (item: any) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAdjustModal(item);
            }}
            className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
          >
            <ArrowClockwise size={13} weight="bold" />
            <span>Adjust</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/inventory/${item.product_id}`);
            }}
            aria-label={`View ledger history for ${item.products?.name || item.product_id}`}
            className="admin-btn-icon"
            title="Ledger History"
          >
            <span>Ledger</span>
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Subtitle Header */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Inventory Management Workspace</span>
          <p className="text-xs text-[#71717a] margin-0">Server-authoritative stock levels, reservations, and adjustment ledger</p>
        </div>

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Total Tracked SKUs</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{totalSKUs}</span>
          </AdminCard>

          <AdminCard className="!border-[#e4e4e7]">
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Low Stock Warnings</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{lowStockCount}</span>
          </AdminCard>

          <AdminCard className="!border-[#dc2626]">
            <span className="text-[0.7rem] font-semibold text-[#dc2626] uppercase tracking-wider block">Out of Stock Alert</span>
            <span className="text-xl font-bold font-mono text-[#dc2626]">{outOfStockCount}</span>
          </AdminCard>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search product title or SKU..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Stock Status"
          />
        </AdminCard>

        {/* Inventory Data Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : filteredInventory.length === 0 ? (
          <AdminEmptyState
            title="No Inventory Records Found"
            description="No inventory items match your search and filter criteria."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={filteredInventory}
                  keyExtractor={(item: any) => item.id}
                  onRowClick={(item: any) => navigate(`/admin/inventory/${item.product_id}`)}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {filteredInventory.map((item) => {
                const available = item.quantity_on_hand - item.quantity_reserved;
                let status = 'in_stock';
                if (!item.inventory_enabled) status = 'disabled';
                else if (available <= 0) status = 'out_of_stock';
                else if (available <= item.reorder_level) status = 'low_stock';

                return (
                  <AdminMobileRecord
                    key={item.id}
                    title={item.products?.name || item.product_id}
                    subtitle={`SKU: ${item.sku || 'N/A'}`}
                    meta={`Avail: ${available} · On Hand: ${item.quantity_on_hand} · Res: ${item.quantity_reserved}`}
                    badge={<AdminStatusBadge status={status} />}
                    actionUrl={`/admin/inventory/${item.product_id}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {isAdjustModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[#ffffff] rounded-xl max-w-md w-full p-5 border border-[#e4e4e7] space-y-3.5 shadow-xl text-xs">
              <div className="border-b border-[#f4f4f0] pb-2">
                <h3 className="font-semibold text-sm text-[#000000]">
                  Adjust Stock: {selectedProduct.products?.name || selectedProduct.product_id}
                </h3>
                <span className="text-[0.7rem] text-[#71717a] font-mono">Current Stock: {selectedProduct.quantity_on_hand}</span>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
                <AdminInput
                  label="Quantity Delta (+ / -)"
                  type="number"
                  required
                  placeholder="e.g. +10 or -5"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  className="font-mono focus:outline-none focus:border-[#000000]"
                  helperText="Use positive numbers to add stock, negative to reduce."
                />

                <AdminTextarea
                  label="Adjustment Reason (Mandatory)"
                  rows={2}
                  required
                  placeholder="State reason for stock adjustment..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="focus:outline-none focus:border-[#000000]"
                />

                <div className="flex justify-end gap-2 pt-2 border-t border-[#f4f4f0]">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="admin-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="admin-btn-primary"
                  >
                    {isSubmitting ? 'Updating...' : 'Save Stock Adjustment'}
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
