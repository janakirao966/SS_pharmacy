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
import { Eye, CheckSquare } from '@phosphor-icons/react';

export default function AdminEnquiries() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query distributor_applications table
      const { data, error: dbError } = await supabase
        .from('distributor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // Filter local enquiries (where company_name starts with 'Enquiry:' or is 'General Contact Enquiry')
      const list = (data || []).filter(item => 
        item.company_name.startsWith('Enquiry:') || item.company_name === 'General Contact Enquiry'
      );
      setEnquiries(list);

    } catch (err: any) {
      console.error('Failed to fetch enquiries:', err);
      setError('Unable to retrieve customer enquiries from Supabase.');
      showToast('Error syncing enquiries list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Filter logic
  const filteredList = enquiries.filter((e) => {
    const matchesSearch = 
      e.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.phone.includes(searchQuery) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalRecords = filteredList.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Handle page resets when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleQuickResolve = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Map Resolved to 'approved' status (satisfies DB CHECK constraint)
      const { error: dbError } = await supabase
        .from('distributor_applications')
        .update({ status: 'approved' })
        .eq('id', id);

      if (dbError) throw dbError;

      setEnquiries(prev => 
        prev.map(item => item.id === id ? { ...item, status: 'approved' } : item)
      );
      showToast(`Marked enquiry from "${name}" as Resolved.`, 'success');
    } catch (err: any) {
      console.error('Failed to update enquiry status:', err);
      showToast('Database write failed.', 'error');
    }
  };

  const filterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'New / Unread', value: 'new' },
    { label: 'In Progress', value: 'under_review' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Resolved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' }
  ];

  const columns = [
    { header: 'Contact Name', render: (e: any) => <span className="font-bold text-[#1D3A28]">{e.contact_person}</span> },
    { header: 'Source Type', render: (e: any) => <span className="text-slate-500 font-semibold">{e.company_name.replace('Enquiry: ', '')}</span> },
    { header: 'Email Address', render: (e: any) => <span className="font-mono text-xs">{e.email}</span> },
    { header: 'Phone Number', render: (e: any) => <span className="font-mono text-xs">{e.phone}</span> },
    { header: 'Received Date', render: (e: any) => <span className="text-[10px] text-slate-400 font-medium">{new Date(e.created_at).toLocaleDateString('en-IN')}</span> },
    { header: 'Status', render: (e: any) => <AdminStatusBadge status={e.status === 'approved' ? 'resolved' : e.status === 'under_review' ? 'in_progress' : e.status} /> },
    {
      header: 'Actions',
      render: (e: any) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => window.location.href = `/admin/enquiries/${e.id}`}
            className="admin-btn-action"
            title="Open message preview"
          >
            <Eye size={12} />
            <span>Open</span>
          </button>
          {e.status !== 'approved' && (
            <button
              type="button"
              onClick={(event) => handleQuickResolve(e.id, e.contact_person, event)}
              className="admin-btn-action success-accent"
              title="Quick Resolve"
            >
              <CheckSquare size={12} />
            </button>
          )}
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">Customer Relations</h2>
            <h1 className="text-xl font-bold font-display text-[#1D3A28]">Website Enquiries & Contacts</h1>
          </div>
        </div>

        {/* Filter controls */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search contact name, email, phone, or comments..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Filter Status"
          />
        </AdminCard>

        {/* Workspace Listings */}
        {loading ? (
          <AdminSkeleton type="table" rows={6} />
        ) : error ? (
          <AdminEmptyState
            title="Operational Error"
            description={error}
            actionLabel="Retry Sync"
            onActionClick={fetchEnquiries}
          />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Enquiries Found"
            description={
              searchQuery || statusFilter !== 'all'
                ? 'No contact submissions match your search and filter criteria.'
                : 'There are currently no customer enquiries stored in the database.'
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedList}
                  keyExtractor={(e) => e.id}
                  onRowClick={(e) => window.location.href = `/admin/enquiries/${e.id}`}
                />
              </AdminCard>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedList.map((e) => (
                <AdminMobileRecord
                  key={e.id}
                  title={e.contact_person}
                  subtitle={e.company_name.replace('Enquiry: ', '')}
                  meta={`${e.phone} · Received: ${new Date(e.created_at).toLocaleDateString('en-IN')}`}
                  badge={<AdminStatusBadge status={e.status === 'approved' ? 'resolved' : e.status === 'under_review' ? 'in_progress' : e.status} />}
                  actionUrl={`/admin/enquiries/${e.id}`}
                />
              ))}
            </div>

            {/* Pagination controls */}
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
