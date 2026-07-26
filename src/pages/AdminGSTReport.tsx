import { useState, useEffect } from 'react';
import { supabase, type DatabaseGSTReportRow } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton, AdminDataTable, AdminEmptyState } from '../components/admin/AdminPrimitives';
import { DownloadSimple } from '@phosphor-icons/react';

export default function AdminGSTReport() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DatabaseGSTReportRow[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const fetchGSTData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_gst_r1_prep_report')
        .select('*')
        .order('report_month', { ascending: false });

      if (error) throw error;
      setRows(data || []);
    } catch (err: any) {
      console.error('Fetch GST report error:', err);
      showToast('Failed to load GST Preparation Report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGSTData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportGSTR1 = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_report_dataset', {
        p_report_type: 'gstr1_b2c',
        p_format: 'csv'
      });

      if (error || !data?.success) throw new Error(error?.message || 'Export failed');

      showToast(`GSTR-1 report export queued. Export ID: #${data.export_id}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export GSTR-1 report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Aggregate Tax Summary
  const totalTaxable = rows.reduce((acc, r) => acc + (r.total_taxable_value || 0), 0);
  const totalCGST = rows.reduce((acc, r) => acc + (r.total_cgst || 0), 0);
  const totalSGST = rows.reduce((acc, r) => acc + (r.total_sgst || 0), 0);
  const totalIGST = rows.reduce((acc, r) => acc + (r.total_igst || 0), 0);
  const totalInvoiceVal = rows.reduce((acc, r) => acc + (r.total_invoice_value || 0), 0);

  const columns = [
    { 
      header: 'Report Month', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs font-semibold text-[#000000]">{r.report_month}</span> 
    },
    { 
      header: 'Place of Supply', 
      render: (r: DatabaseGSTReportRow) => <span className="font-semibold text-xs text-[#000000]">{r.place_of_supply}</span> 
    },
    { 
      header: 'HSN Code', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs font-semibold text-[#000000]">{r.hsn_code}</span> 
    },
    { 
      header: 'GST Rate', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs text-[#71717a]">{r.gst_rate}%</span> 
    },
    { 
      header: 'Quantity', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs text-[#000000]">{r.total_quantity}</span>,
      className: 'text-right'
    },
    { 
      header: 'Taxable Value', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs font-semibold text-[#000000]">₹{r.total_taxable_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    },
    { 
      header: 'CGST (9%)', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs text-[#71717a]">₹{r.total_cgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    },
    { 
      header: 'SGST (9%)', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs text-[#71717a]">₹{r.total_sgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    },
    { 
      header: 'IGST (18%)', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs text-[#71717a]">₹{r.total_igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    },
    { 
      header: 'Total Value', 
      render: (r: DatabaseGSTReportRow) => <span className="font-mono text-xs font-bold text-[#000000]">₹{r.total_invoice_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">GST Compliance & Tax Reporting</span>
            <p className="text-xs text-[#71717a] margin-0">State-wise Place of Supply, HSN B2B/B2C summary, CGST, SGST, IGST tax breakdown</p>
          </div>

          <button
            onClick={handleExportGSTR1}
            disabled={isExporting}
            className="admin-btn-primary self-start sm:self-auto"
          >
            <DownloadSimple size={14} weight="bold" />
            <span>{isExporting ? 'Exporting...' : 'Export GSTR-1 CSV'}</span>
          </button>
        </div>

        {/* Aggregate Tax Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">Taxable Value</span>
            <span className="text-lg font-bold font-mono text-[#000000]">₹{totalTaxable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">CGST (9%)</span>
            <span className="text-lg font-bold font-mono text-[#000000]">₹{totalCGST.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">SGST (9%)</span>
            <span className="text-lg font-bold font-mono text-[#000000]">₹{totalSGST.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">IGST (18%)</span>
            <span className="text-lg font-bold font-mono text-[#000000]">₹{totalIGST.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider block">Total Sales</span>
            <span className="text-lg font-bold font-mono text-[#000000]">₹{totalInvoiceVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </AdminCard>
        </div>

        {/* GST Report Data Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={5} />
        ) : rows.length === 0 ? (
          <AdminEmptyState
            title="No Tax Data Recorded"
            description="Issued GST tax invoices will populate state-wise tax data automatically."
          />
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <AdminDataTable
              columns={columns}
              data={rows}
              keyExtractor={(r) => `${r.report_month}-${r.hsn_code}-${r.place_of_supply}`}
            />
          </AdminCard>
        )}
      </div>
    </AdminLayout>
  );
}
