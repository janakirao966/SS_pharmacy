import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type DatabaseOrder } from '../lib/supabase';
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

export default function AdminOrders() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError('Unable to retrieve purchase orders. Please check network connectivity.');
      showToast('Error syncing orders list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || o.order_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalRecords = filteredOrders.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Handle page resets when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'New', value: 'new' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Packed', value: 'packed' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  // Quick category summary counts
  const counts = {
    all: orders.length,
    new: orders.filter(o => o.order_status === 'new').length,
    confirmed: orders.filter(o => o.order_status === 'confirmed').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    shipped: orders.filter(o => o.order_status === 'shipped').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    cancelled: orders.filter(o => o.order_status === 'cancelled').length
  };

  const columns = [
    { 
      header: 'Order #', 
      render: (o: DatabaseOrder) => <span className="font-mono font-semibold text-[#000000]">{o.order_number}</span> 
    },
    { 
      header: 'Customer', 
      render: (o: DatabaseOrder) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#000000]">{o.customer_name}</span>
          <span className="text-[0.7rem] text-[#71717a] font-mono">{o.customer_phone}</span>
        </div>
      ) 
    },
    { 
      header: 'Date', 
      render: (o: DatabaseOrder) => (
        <span className="text-[0.75rem] text-[#71717a] font-medium">
          {new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ) 
    },
    { 
      header: 'Payment', 
      render: (o: DatabaseOrder) => (
        <div className="flex flex-col items-start gap-0.5">
          <span className="uppercase text-[0.65rem] font-semibold text-[#71717a]">
            {o.payment_method.replace('online_razorpay', 'razorpay')}
          </span>
          <AdminStatusBadge status={o.payment_status} />
        </div>
      ) 
    },
    { 
      header: 'Fulfillment Status', 
      render: (o: DatabaseOrder) => <AdminStatusBadge status={o.order_status} /> 
    },
    { 
      header: 'Total', 
      render: (o: DatabaseOrder) => <span className="font-mono font-semibold text-[#000000]">₹{o.total_amount?.toLocaleString('en-IN')}</span> 
    },
    { 
      header: 'Action', 
      render: (o: DatabaseOrder) => (
        <button 
          type="button" 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/orders/${o.id}`);
          }}
          className="admin-btn-outline !min-h-[32px] !py-1 !px-3 text-xs"
          aria-label={`View details for order ${o.order_number}`}
        >
          <Eye size={14} />
          <span>View</span>
        </button>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Page Subtitle & Summary Filter Pills */}
        <div className="flex flex-col gap-3 pb-3 border-b border-[#e4e4e7]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Order Management Workspace</span>
              <p className="text-xs text-[#71717a] margin-0">Review, process, and update customer order lifecycles</p>
            </div>
          </div>

          {/* Category Summary Count Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'all' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('new')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'new' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              New ({counts.new})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'confirmed' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              Confirmed ({counts.confirmed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'processing' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              Processing ({counts.processing})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('shipped')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'shipped' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              Shipped ({counts.shipped})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'delivered' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              Delivered ({counts.delivered})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === 'cancelled' 
                  ? 'bg-[#000000] text-[#ffffff]' 
                  : 'bg-[#ffffff] text-[#71717a] border border-[#e4e4e7] hover:bg-[#f4f4f0]'
              }`}
            >
              Cancelled ({counts.cancelled})
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search order ID, customer name, or phone number..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Status"
          />
        </AdminCard>

        {/* Main Workspace List */}
        {loading ? (
          <AdminSkeleton type="table" rows={6} />
        ) : error ? (
          <AdminEmptyState
            title="Unable to Sync Orders"
            description={error}
            actionLabel="Retry Sync"
            onActionClick={fetchOrders}
          />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Purchase Orders Found"
            description={
              searchQuery || statusFilter !== 'all'
                ? 'No purchase orders match your search and filter criteria.'
                : 'There are currently no purchase orders stored in the database.'
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedOrders}
                  keyExtractor={(o) => o.id}
                  onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {paginatedOrders.map((o) => (
                <AdminMobileRecord
                  key={o.id}
                  title={o.order_number}
                  subtitle={o.customer_name}
                  meta={`₹${o.total_amount} · ${o.payment_method.replace('online_razorpay', 'razorpay').toUpperCase()} · ${new Date(o.created_at).toLocaleDateString('en-IN')}`}
                  badge={<AdminStatusBadge status={o.order_status} />}
                  actionUrl={`/admin/orders/${o.id}`}
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
