import { useState, useEffect } from 'react';
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
      setError('Unable to retrieve orders. Please check database permissions.');
      showToast('Error syncing orders list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
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
    { label: 'Preparing', value: 'preparing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  const columns = [
    { header: 'Order ID', render: (o: DatabaseOrder) => <span className="font-mono font-bold text-[#1D3A28]">{o.order_number}</span> },
    { header: 'Customer', render: (o: DatabaseOrder) => <span>{o.customer_name}</span> },
    { header: 'Phone', render: (o: DatabaseOrder) => <span className="font-mono text-slate-500">{o.customer_phone}</span> },
    { header: 'Method', render: (o: DatabaseOrder) => <span className="uppercase text-[10px] font-bold text-slate-500">{o.payment_method.replace('online_razorpay', 'razorpay')}</span> },
    { header: 'Payment Status', render: (o: DatabaseOrder) => <AdminStatusBadge status={o.payment_status} /> },
    { header: 'Order Status', render: (o: DatabaseOrder) => <AdminStatusBadge status={o.order_status} /> },
    { header: 'Total Amount', render: (o: DatabaseOrder) => <span className="font-mono font-bold">₹{o.total_amount}</span> },
    { 
      header: 'Actions', 
      render: (o: DatabaseOrder) => (
        <button 
          type="button" 
          onClick={() => window.location.href = `/admin/orders/${o.id}`}
          className="admin-btn-action"
          aria-label={`View order ${o.order_number}`}
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
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">Commerce Module</h2>
            <h1 className="text-xl font-bold font-display text-[#1D3A28]">Customer Purchase Orders</h1>
          </div>
        </div>

        {/* Filter controls */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search order number, customer name, or mobile..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Order Status"
          />
        </AdminCard>

        {/* Main List Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={6} />
        ) : error ? (
          <AdminEmptyState
            title="Operational Error"
            description={error}
            actionLabel="Retry Sync"
            onActionClick={fetchOrders}
          />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Orders Found"
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
                  onRowClick={(o) => window.location.href = `/admin/orders/${o.id}`}
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
