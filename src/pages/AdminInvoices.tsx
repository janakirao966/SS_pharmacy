import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, type DatabaseInvoice } from '../lib/supabase';
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
import { DownloadSimple, ArrowClockwise } from '@phosphor-icons/react';

export default function AdminInvoices() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<DatabaseInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [pdfFilter, setPdfFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data || []) as DatabaseInvoice[]);
    } catch (err: any) {
      console.error('Fetch invoices error:', err);
      showToast('Failed to load invoices from Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetryPdf = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoiceId }
      });

      if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'PDF generation failed');

      showToast('Invoice PDF regenerated successfully.', 'success');
      await fetchInvoices();
    } catch (err: any) {
      console.error('Regenerate PDF error:', err);
      showToast(err.message || 'Failed to regenerate invoice PDF.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async (inv: DatabaseInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inv.pdf_storage_path) {
      showToast('PDF storage path not available. Regenerate PDF first.', 'error');
      return;
    }

    try {
      const { data, error } = await supabase.storage.from('invoices').createSignedUrl(inv.pdf_storage_path, 60);
      if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');

      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      console.error('Signed URL error:', err);
      showToast('Failed to download invoice PDF.', 'error');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
                          inv.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || inv.invoice_type === typeFilter;
    const matchesPdf = pdfFilter === 'ALL' || inv.pdf_status === pdfFilter;
    return matchesSearch && matchesType && matchesPdf;
  });

  // Pagination calculations
  const totalRecords = filteredInvoices.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, pdfFilter]);

  // Aggregate metrics
  const totalTaxable = invoices.reduce((acc, i) => acc + (i.taxable_value || 0), 0);
  const totalGrand = invoices.reduce((acc, i) => acc + (i.grand_total || 0), 0);

  const filterOptions = [
    { label: 'All Document Types', value: 'ALL' },
    { label: 'Tax Invoices', value: 'TAX_INVOICE' },
    { label: 'Bills of Supply', value: 'BILL_OF_SUPPLY' }
  ];

  const columns = [
    { 
      header: 'Invoice #', 
      render: (inv: DatabaseInvoice) => <span className="font-mono font-semibold text-[#000000]">{inv.invoice_number}</span> 
    },
    { 
      header: 'Doc Type', 
      render: (inv: DatabaseInvoice) => <AdminStatusBadge status={inv.invoice_type.toLowerCase()} /> 
    },
    { 
      header: 'Customer Info', 
      render: (inv: DatabaseInvoice) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{inv.customer_name}</span>
          {inv.customer_gstin && <span className="text-[0.68rem] font-mono text-[#71717a]">GSTIN: {inv.customer_gstin}</span>}
        </div>
      ) 
    },
    { 
      header: 'FY', 
      render: (inv: DatabaseInvoice) => <span className="font-mono text-xs text-[#71717a]">{inv.financial_year}</span> 
    },
    { 
      header: 'Taxable Value', 
      render: (inv: DatabaseInvoice) => <span className="font-mono text-xs font-semibold text-[#000000]">₹{inv.taxable_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    },
    { 
      header: 'Grand Total', 
      render: (inv: DatabaseInvoice) => <span className="font-mono text-xs font-bold text-[#000000]">₹{inv.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    },
    { 
      header: 'PDF Status', 
      render: (inv: DatabaseInvoice) => <AdminStatusBadge status={inv.pdf_status} /> 
    },
    { 
      header: 'Actions', 
      render: (inv: DatabaseInvoice) => (
        <div className="flex items-center justify-end gap-1.5">
          {inv.pdf_status === 'generated' && (
            <button
              onClick={(e) => handleDownloadPdf(inv, e)}
              className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
              aria-label={`Download PDF for invoice ${inv.invoice_number}`}
            >
              <DownloadSimple size={13} weight="bold" />
              <span>PDF</span>
            </button>
          )}
          {(inv.pdf_status === 'failed' || inv.pdf_status === 'pending') && (
            <button
              disabled={isSubmitting}
              onClick={(e) => handleRetryPdf(inv.id, e)}
              className="admin-btn-secondary text-[0.7rem] !py-1 !px-2"
            >
              <ArrowClockwise size={13} weight="bold" />
              <span>Generate</span>
            </button>
          )}
          <Link
            to={`/admin/orders/${inv.order_id}`}
            className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
            onClick={(e) => e.stopPropagation()}
          >
            Order
          </Link>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Financial Administration & Tax Records</span>
          <p className="text-xs text-[#71717a] margin-0">Authoritative tax invoices, bills of supply, and GST accounting documents</p>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Total Invoices</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{invoices.length}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Total Taxable Value</span>
            <span className="text-xl font-bold font-mono text-[#000000]">₹{totalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Total Billing Value</span>
            <span className="text-xl font-bold font-mono text-[#000000]">₹{totalGrand.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">PDF Storage Status</span>
            <span className="text-xl font-bold font-mono text-[#000000]">
              {invoices.filter(i => i.pdf_status === 'generated').length} / {invoices.length}
            </span>
          </AdminCard>
        </div>

        {/* Search & Filters Bar */}
        <AdminCard className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminFilterBar
              searchQuery={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search Invoice # or Customer Name..."
              selectedFilter={typeFilter}
              onFilterChange={setTypeFilter}
              filterOptions={filterOptions}
              filterLabel="Doc Type"
            />
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase">PDF Status:</span>
              <select
                value={pdfFilter}
                onChange={(e) => setPdfFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-[#e4e4e7] bg-[#ffffff] text-[#000000]"
              >
                <option value="ALL">All PDF Statuses</option>
                <option value="generated">Generated</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </AdminCard>

        {/* Invoices Workspace */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : totalRecords === 0 ? (
          <AdminEmptyState
            title="No Invoices Found"
            description="No issued tax invoices match your search and filter parameters."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <AdminCard className="p-0 overflow-hidden">
                <AdminDataTable
                  columns={columns}
                  data={paginatedInvoices}
                  keyExtractor={(inv) => inv.id}
                  onRowClick={(inv) => navigate(`/admin/orders/${inv.order_id}`)}
                />
              </AdminCard>
            </div>

            {/* Mobile Stacked Record View */}
            <div className="md:hidden space-y-3">
              {paginatedInvoices.map((inv) => (
                <AdminMobileRecord
                  key={inv.id}
                  title={inv.invoice_number}
                  subtitle={inv.customer_name}
                  meta={`Total: ₹${inv.grand_total?.toLocaleString('en-IN')} · FY: ${inv.financial_year}`}
                  badge={<AdminStatusBadge status={inv.pdf_status} />}
                  actionUrl={`/admin/orders/${inv.order_id}`}
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
