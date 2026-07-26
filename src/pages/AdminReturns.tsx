import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Eye } from '@phosphor-icons/react';

export default function AdminReturns() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*, orders(order_number, customer_name, customer_phone, total_amount), return_items(*)')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setReturnsList(data || []);
    } catch (err: any) {
      console.error('Fetch returns error:', err);
      showToast('Failed to load returns list from Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReturns = returnsList.filter(r => {
    const returnNo = r.return_number || '';
    const orderNo = r.orders?.order_number || '';
    const custName = r.orders?.customer_name || '';

    const matchesSearch = returnNo.toLowerCase().includes(search.toLowerCase()) ||
                          orderNo.toLowerCase().includes(search.toLowerCase()) ||
                          custName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalRecords = filteredReturns.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedReturns = filteredReturns.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalRequests = returnsList.length;
  const pendingReview = returnsList.filter(r => r.status === 'requested' || r.status === 'under_review').length;
  const inTransit = returnsList.filter(r => r.status === 'pickup_scheduled' || r.status === 'in_transit' || r.status === 'received').length;
  const awaitingInspection = returnsList.filter(r => r.status === 'inspection').length;

  const filterOptions = [
    { label: 'All Return Statuses', value: 'ALL' },
    { label: 'Requested (New)', value: 'requested' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Pickup Scheduled', value: 'pickup_scheduled' },
    { label: 'In Reverse Transit', value: 'in_transit' },
    { label: 'Received at Warehouse', value: 'received' },
    { label: 'Under Inspection', value: 'inspection' },
    { label: 'Completed & Refunded', value: 'completed' },
    { label: 'Rejected', value: 'rejected' }
  ];

  const columns = [
    { 
      header: 'Return #', 
      render: (r: any) => <span className="font-mono font-semibold text-[#000000]">{r.return_number}</span> 
    },
    { 
      header: 'Order Details', 
      render: (r: any) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{r.orders?.customer_name}</span>
          <span className="text-[0.68rem] font-mono text-[#71717a]">Order: #{r.orders?.order_number}</span>
        </div>
      ) 
    },
    { 
      header: 'Reason', 
      render: (r: any) => <span className="text-xs text-[#71717a] font-medium">{r.reason_code?.replace('_', ' ')}</span> 
    },
    { 
      header: 'Items', 
      render: (r: any) => <span className="font-mono text-xs text-[#000000]">{r.return_items?.length || 0} Item(s)</span> 
    },
    { 
      header: 'Status', 
      render: (r: any) => <AdminStatusBadge status={r.status} /> 
    },
    { 
      header: 'Requested At', 
      render: (r: any) => <span className="font-mono text-xs text-[#71717a]">{new Date(r.requested_at).toLocaleDateString('en-IN')}</span> 
    },
    { 
      header: 'Action', 
      render: (r: any) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/returns/${r.id}`)}
          className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
          aria-label={`Review return ${r.return_number}`}
        >
          <Eye size={13} />
          <span>Review</span>
        </button>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Reverse Logistics & Returns Workspace</span>
          <p className="text-xs text-[#71717a] margin-0">Manage merchandise return requests, warehouse inspections, COD payouts, and credit notes</p>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Total Return Requests</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{totalRequests}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Awaiting Review</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{pendingReview}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">In Reverse Transit</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{inTransit}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Awaiting Inspection</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{awaitingInspection}</span>
          </AdminCard>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search Return #, Order #, or Customer Name..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Status"
          />
        </AdminCard>

        {/* Returns Table Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Return Requests Found"
            description="No customer return requests match your search and filter parameters."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedReturns}
                  keyExtractor={(r) => r.id}
                  onRowClick={(r) => navigate(`/admin/returns/${r.id}`)}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {paginatedReturns.map((r) => (
                <AdminMobileRecord
                  key={r.id}
                  title={r.return_number}
                  subtitle={r.orders?.customer_name}
                  meta={`Order: #${r.orders?.order_number} · ${r.return_items?.length || 0} items`}
                  badge={<AdminStatusBadge status={r.status} />}
                  actionUrl={`/admin/returns/${r.id}`}
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
