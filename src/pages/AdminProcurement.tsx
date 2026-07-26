import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminFilterBar, 
  AdminPagination, 
  AdminSkeleton, 
  AdminEmptyState 
} from '../components/admin/AdminPrimitives';

export default function AdminProcurement() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

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

  const filteredPOs = orders.filter(po => {
    const matchesSearch = 
      po.po_number.toLowerCase().includes(search.toLowerCase()) ||
      (po.suppliers?.legal_name && po.suppliers.legal_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalRecords = filteredPOs.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedPOs = filteredPOs.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const filterOptions = [
    { label: 'All PO Statuses', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Issued / Sent', value: 'issued' },
    { label: 'Partially Received', value: 'partially_received' },
    { label: 'Received (GRN)', value: 'received' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  const columns = [
    { 
      header: 'PO Number', 
      render: (po: any) => <span className="font-mono font-semibold text-[#000000]">{po.po_number}</span> 
    },
    { 
      header: 'Supplier Legal Name', 
      render: (po: any) => <span className="font-semibold text-[#000000] text-xs">{po.suppliers?.legal_name || 'Vendor'}</span> 
    },
    { 
      header: 'Status', 
      render: (po: any) => <AdminStatusBadge status={po.status} /> 
    },
    { 
      header: 'Order Date', 
      render: (po: any) => <span className="font-mono text-xs text-[#71717a]">{po.order_date}</span> 
    },
    { 
      header: 'Expected Delivery', 
      render: (po: any) => <span className="font-mono text-xs text-[#71717a]">{po.expected_delivery_date || 'N/A'}</span> 
    },
    { 
      header: 'Grand Total', 
      render: (po: any) => <span className="font-mono text-xs font-bold text-[#000000]">₹{po.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Procurement & Replenishment Workspace</span>
          <p className="text-xs text-[#71717a] margin-0">Issue purchase orders to raw material suppliers, track expected deliveries, and post Goods Receipts (GRN)</p>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search PO Number or Supplier Name..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="PO Status"
          />
        </AdminCard>

        {/* PO Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Purchase Orders Found"
            description="Purchase orders generated for inventory replenishment will appear here."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedPOs}
                  keyExtractor={(po) => po.id}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {paginatedPOs.map((po) => (
                <AdminMobileRecord
                  key={po.id}
                  title={po.po_number}
                  subtitle={po.suppliers?.legal_name || 'Vendor'}
                  meta={`Expected: ${po.expected_delivery_date || 'N/A'} · Total: ₹${po.grand_total?.toLocaleString('en-IN')}`}
                  badge={<AdminStatusBadge status={po.status} />}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
