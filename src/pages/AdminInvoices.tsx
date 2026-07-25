import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type DatabaseInvoice } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Receipt, MagnifyingGlass, DownloadSimple, ArrowClockwise, FileText, CheckCircle, Warning } from '@phosphor-icons/react';

export default function AdminInvoices() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<DatabaseInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [pdfFilter, setPdfFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRetryPdf = async (invoiceId: string) => {
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

  const handleDownloadPdf = async (inv: DatabaseInvoice) => {
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

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Receipt size={28} className="text-[#C5A059]" />
              <span>GST Tax Invoices & Financial Documents</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative, immutable financial snapshots for issued tax invoices and bills of supply.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <AdminCard className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Invoice # or Customer Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Document Types</option>
                <option value="TAX_INVOICE">Tax Invoice</option>
                <option value="BILL_OF_SUPPLY">Bill of Supply</option>
              </select>
            </div>
            <div>
              <select
                value={pdfFilter}
                onChange={(e) => setPdfFilter(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All PDF Statuses</option>
                <option value="generated">PDF Generated</option>
                <option value="pending">PDF Pending</option>
                <option value="failed">PDF Failed</option>
              </select>
            </div>
          </div>
        </AdminCard>

        {/* Invoices List */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredInvoices.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <FileText size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Issued Invoices Found</h3>
              <p className="text-xs text-slate-500 mt-1">Invoices will appear here as orders reach packed/shipped eligibility.</p>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Document Type</th>
                    <th>Customer</th>
                    <th>Financial Year</th>
                    <th>Taxable Value</th>
                    <th>Grand Total</th>
                    <th>PDF Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-mono font-bold text-[#1D3A28]">{inv.invoice_number}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          inv.invoice_type === 'TAX_INVOICE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inv.invoice_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="font-bold text-[#1D3A28]">{inv.customer_name}</div>
                        {inv.customer_gstin && <div className="text-[10px] font-mono text-slate-500">GSTIN: {inv.customer_gstin}</div>}
                      </td>
                      <td className="font-mono text-center">{inv.financial_year}</td>
                      <td className="font-mono">₹{inv.taxable_value}</td>
                      <td className="font-mono font-bold text-[#1D3A28]">₹{inv.grand_total}</td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase inline-flex items-center gap-1 ${
                          inv.pdf_status === 'generated' ? 'bg-green-100 text-green-800' :
                          inv.pdf_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.pdf_status === 'generated' && <CheckCircle size={12} />}
                          {inv.pdf_status === 'failed' && <Warning size={12} />}
                          <span>{inv.pdf_status}</span>
                        </span>
                      </td>
                      <td className="text-right space-x-2">
                        {inv.pdf_status === 'generated' && (
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-colors inline-flex items-center gap-1"
                          >
                            <DownloadSimple size={12} weight="bold" />
                            <span>PDF</span>
                          </button>
                        )}
                        {(inv.pdf_status === 'failed' || inv.pdf_status === 'pending') && (
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleRetryPdf(inv.id)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-colors inline-flex items-center gap-1"
                          >
                            <ArrowClockwise size={12} weight="bold" />
                            <span>Generate PDF</span>
                          </button>
                        )}
                        <Link
                          to={`/admin/orders/${inv.order_id}`}
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-2.5 py-1 text-[11px] font-bold rounded border border-slate-300 inline-block"
                        >
                          Order
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminLayout>
  );
}
