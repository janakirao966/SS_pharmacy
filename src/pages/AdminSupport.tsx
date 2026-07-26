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

export default function AdminSupport() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'OPEN' | 'SAFETY_REVIEW' | 'URGENT' | 'UNASSIGNED' | 'RESOLVED'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, orders(order_number)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Fetch tickets error:', err);
      showToast('Failed to load support tickets from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTickets = tickets.filter(t => {
    const tNum = t.ticket_number || '';
    const custName = t.customer_name || '';
    const custEmail = t.customer_email || '';
    const custPhone = t.customer_phone || '';
    const orderNo = t.orders?.order_number || '';

    const matchesSearch = tNum.toLowerCase().includes(search.toLowerCase()) ||
                          custName.toLowerCase().includes(search.toLowerCase()) ||
                          custEmail.toLowerCase().includes(search.toLowerCase()) ||
                          custPhone.includes(search) ||
                          orderNo.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'OPEN') return t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_for_internal';
    if (filterTab === 'SAFETY_REVIEW') return t.requires_safety_review;
    if (filterTab === 'URGENT') return t.priority === 'urgent';
    if (filterTab === 'UNASSIGNED') return !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved';
    if (filterTab === 'RESOLVED') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  // Pagination calculations
  const totalRecords = filteredTickets.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTab]);

  const countOpen = tickets.filter(t => t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_for_internal').length;
  const countUrgent = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length;
  const countSafety = tickets.filter(t => t.requires_safety_review && t.status !== 'closed').length;
  const countUnassigned = tickets.filter(t => !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved').length;

  const filterOptions = [
    { label: 'All Cases', value: 'ALL' },
    { label: 'Open Queue', value: 'OPEN' },
    { label: 'Safety Reviews', value: 'SAFETY_REVIEW' },
    { label: 'Urgent Cases', value: 'URGENT' },
    { label: 'Unassigned', value: 'UNASSIGNED' },
    { label: 'Resolved / Closed', value: 'RESOLVED' }
  ];

  const columns = [
    { 
      header: 'Ticket #', 
      render: (t: any) => <span className="font-mono font-semibold text-[#000000]">{t.ticket_number}</span> 
    },
    { 
      header: 'Customer Info', 
      render: (t: any) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{t.customer_name}</span>
          <span className="text-[0.7rem] text-[#71717a] font-mono">{t.customer_email || t.customer_phone}</span>
        </div>
      ) 
    },
    { 
      header: 'Category & Subject', 
      render: (t: any) => (
        <div>
          <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase block">{t.category?.replace('_', ' ')}</span>
          <span className="font-medium text-[#000000] text-xs line-clamp-1">{t.subject}</span>
        </div>
      ) 
    },
    { 
      header: 'Priority', 
      render: (t: any) => <AdminStatusBadge status={t.priority} /> 
    },
    { 
      header: 'Status', 
      render: (t: any) => <AdminStatusBadge status={t.status} /> 
    },
    { 
      header: 'Safety Review', 
      render: (t: any) => (
        t.requires_safety_review ? (
          <span className="px-2 py-0.5 text-[0.68rem] font-semibold rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#dc2626]">
            FLAGGED
          </span>
        ) : (
          <span className="text-[#71717a] text-[0.7rem]">None</span>
        )
      ) 
    },
    { 
      header: 'Created', 
      render: (t: any) => <span className="font-mono text-xs text-[#71717a]">{new Date(t.created_at).toLocaleDateString('en-IN')}</span> 
    },
    { 
      header: 'Action', 
      render: (t: any) => (
        <button 
          type="button" 
          onClick={() => navigate(`/admin/support/${t.ticket_number}`)}
          className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
          aria-label={`Manage ticket ${t.ticket_number}`}
        >
          <Eye size={13} />
          <span>Manage</span>
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
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Customer Support Workspace</span>
          <p className="text-xs text-[#71717a] margin-0">Order issues, product complaints, pharmaceutical safety reviews, and support queue</p>
        </div>

        {/* Operational Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Open Cases</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{countOpen}</span>
          </AdminCard>

          <AdminCard className="!border-[#dc2626]">
            <span className="text-[0.7rem] font-semibold text-[#dc2626] uppercase tracking-wider block">Urgent Priority</span>
            <span className="text-xl font-bold font-mono text-[#dc2626]">{countUrgent}</span>
          </AdminCard>

          <AdminCard className="!border-[#dc2626]">
            <span className="text-[0.7rem] font-semibold text-[#dc2626] uppercase tracking-wider block">Safety Reviews</span>
            <span className="text-xl font-bold font-mono text-[#dc2626]">{countSafety}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Unassigned Cases</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{countUnassigned}</span>
          </AdminCard>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search Ticket #, customer name, email, phone, or order #..."
            selectedFilter={filterTab}
            onFilterChange={(v) => setFilterTab(v as any)}
            filterOptions={filterOptions}
            filterLabel="Filter Queue"
          />
        </AdminCard>

        {/* Support Queue Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Support Tickets Found"
            description="No customer support cases match your search and filter parameters."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedTickets}
                  keyExtractor={(t) => t.id}
                  onRowClick={(t) => navigate(`/admin/support/${t.ticket_number}`)}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {paginatedTickets.map((t) => (
                <AdminMobileRecord
                  key={t.id}
                  title={t.ticket_number}
                  subtitle={t.customer_name}
                  meta={`${t.subject} · Category: ${t.category}`}
                  badge={<AdminStatusBadge status={t.status} />}
                  actionUrl={`/admin/support/${t.ticket_number}`}
                />
              ))}
            </div>

            {/* Pagination */}
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
