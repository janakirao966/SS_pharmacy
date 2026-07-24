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
import { Eye } from '@phosphor-icons/react';

export default function AdminDistributors() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('distributor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      // Filter B2B applications (exclude enquiries where company_name starts with 'Enquiry:' or is 'General Contact Enquiry')
      const list = (data || []).filter(item => 
        !item.company_name.startsWith('Enquiry:') && item.company_name !== 'General Contact Enquiry'
      );
      setLeads(list);

    } catch (err: any) {
      console.error('Failed to fetch distributor applications:', err);
      setError('Unable to retrieve distributor applications from Supabase.');
      showToast('Error syncing B2B leads list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filter logic
  const filteredList = leads.filter((l) => {
    const matchesSearch = 
      l.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;

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

  const filterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'New / Unread', value: 'new' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' }
  ];

  const columns = [
    { header: 'Business / Company', render: (l: any) => <span className="font-bold text-[#1D3A28]">{l.company_name}</span> },
    { header: 'Contact Person', render: (l: any) => <span>{l.contact_person}</span> },
    { header: 'Phone Number', render: (l: any) => <span className="font-mono text-xs">{l.phone}</span> },
    { header: 'City / Location', render: (l: any) => <span>{l.city}</span> },
    { header: 'Expected Vol.', render: (l: any) => <span className="font-medium text-slate-500">{l.expected_monthly_volume || 'Not Specified'}</span> },
    { header: 'Received Date', render: (l: any) => <span className="text-[10px] text-slate-400 font-medium">{new Date(l.created_at).toLocaleDateString('en-IN')}</span> },
    { header: 'Status', render: (l: any) => <AdminStatusBadge status={l.status} /> },
    {
      header: 'Actions',
      render: (l: any) => (
        <button
          type="button"
          onClick={() => window.location.href = `/admin/distributors/${l.id}`}
          className="admin-btn-action"
          aria-label={`View distributor application ${l.company_name}`}
        >
          <Eye size={12} />
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
            <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">B2B Channel Partners</h2>
            <h1 className="text-xl font-bold font-display text-[#1D3A28]">Distributor Wholesale Applications</h1>
          </div>
        </div>

        {/* Filter controls */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search business name, contact person, city, or phone..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Application Status"
          />
        </AdminCard>

        {/* Listings Workplace */}
        {loading ? (
          <AdminSkeleton type="table" rows={6} />
        ) : error ? (
          <AdminEmptyState
            title="Operational Error"
            description={error}
            actionLabel="Retry Sync"
            onActionClick={fetchLeads}
          />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Applications Found"
            description={
              searchQuery || statusFilter !== 'all'
                ? 'No distributor applications match your search and filter criteria.'
                : 'There are currently no B2B distributor applications stored in the database.'
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
                  keyExtractor={(l) => l.id}
                  onRowClick={(l) => window.location.href = `/admin/distributors/${l.id}`}
                />
              </AdminCard>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedList.map((l) => (
                <AdminMobileRecord
                  key={l.id}
                  title={l.company_name}
                  subtitle={l.contact_person}
                  meta={`${l.city} · Expected Vol: ${l.expected_monthly_volume || 'N/A'}`}
                  badge={<AdminStatusBadge status={l.status} />}
                  actionUrl={`/admin/distributors/${l.id}`}
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
