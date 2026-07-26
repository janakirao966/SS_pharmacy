import { useState, useEffect } from 'react';
import { supabase, type DatabaseSupplier } from '../lib/supabase';
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

export default function AdminSuppliers() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<DatabaseSupplier[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      console.error('Fetch suppliers error:', err);
      showToast('Failed to load supplier directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = 
      s.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier_code.toLowerCase().includes(search.toLowerCase()) ||
      (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalRecords = filteredSuppliers.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const filterOptions = [
    { label: 'All Vendor Statuses', value: 'all' },
    { label: 'Active Suppliers', value: 'active' },
    { label: 'Inactive / Suspended', value: 'inactive' }
  ];

  const columns = [
    { 
      header: 'Supplier Code', 
      render: (s: DatabaseSupplier) => <span className="font-mono font-semibold text-[#000000]">{s.supplier_code}</span> 
    },
    { 
      header: 'Legal Name / Trade Name', 
      render: (s: DatabaseSupplier) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{s.legal_name}</span>
          {s.trade_name && <span className="text-[0.68rem] text-[#71717a]">{s.trade_name}</span>}
        </div>
      ) 
    },
    { 
      header: 'GSTIN', 
      render: (s: DatabaseSupplier) => <span className="font-mono text-xs text-[#71717a]">{s.gstin || 'Unconfigured'}</span> 
    },
    { 
      header: 'Drug License #', 
      render: (s: DatabaseSupplier) => <span className="font-mono text-xs text-[#71717a]">{s.drug_license_number || 'N/A'}</span> 
    },
    { 
      header: 'Contact Info', 
      render: (s: DatabaseSupplier) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{s.contact_person || 'N/A'}</span>
          <span className="text-[0.68rem] text-[#71717a] font-mono">{s.phone || s.email}</span>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      render: (s: DatabaseSupplier) => <AdminStatusBadge status={s.status} /> 
    },
    { 
      header: 'Created Date', 
      render: (s: DatabaseSupplier) => <span className="font-mono text-xs text-[#71717a]">{new Date(s.created_at).toLocaleDateString('en-IN')}</span> 
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Pharmaceutical Suppliers Directory</span>
          <p className="text-xs text-[#71717a] margin-0">Licensed Ayurvedic raw material & finished goods vendors, GSTIN credentials, and drug licenses</p>
        </div>

        {/* Filter Bar */}
        <AdminCard>
          <AdminFilterBar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search Supplier Name, Code, GSTIN..."
            selectedFilter={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={filterOptions}
            filterLabel="Vendor Status"
          />
        </AdminCard>

        {/* Suppliers Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Registered Suppliers Found"
            description="Vendor records will appear here as procurement purchase orders and raw material suppliers are configured."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedSuppliers}
                  keyExtractor={(s) => s.id}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {paginatedSuppliers.map((s) => (
                <AdminMobileRecord
                  key={s.id}
                  title={s.supplier_code}
                  subtitle={s.legal_name}
                  meta={`GSTIN: ${s.gstin || 'N/A'} · Contact: ${s.contact_person || 'N/A'}`}
                  badge={<AdminStatusBadge status={s.status} />}
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
