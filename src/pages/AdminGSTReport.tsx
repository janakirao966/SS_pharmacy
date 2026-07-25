import { useState, useEffect } from 'react';
import { supabase, type DatabaseGSTReportRow } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Receipt, DownloadSimple, CheckCircle } from '@phosphor-icons/react';

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

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Receipt size={28} className="text-[#C5A059]" />
              <span>GSTR-1 Preparation Report & Sales Register</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              State-wise Place of Supply, HSN B2B/B2C summary, CGST, SGST, IGST tax breakdown derived from invoice line snapshots.
            </p>
          </div>

          <button
            onClick={handleExportGSTR1}
            disabled={isExporting}
            className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-4 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 min-h-[36px]"
          >
            <DownloadSimple size={16} />
            <span>Export GSTR-1 CSV</span>
          </button>
        </div>

        {/* GST Report Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : rows.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Tax Invoices Found for GSTR-1</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Issued GST tax invoices will populate state-wise tax data here.
              </p>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Place of Supply (State)</th>
                    <th>HSN Code</th>
                    <th>GST Rate</th>
                    <th>Quantity</th>
                    <th>Taxable Value</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="font-mono">{r.report_month}</td>
                      <td className="font-bold">{r.place_of_supply}</td>
                      <td className="font-mono font-bold">{r.hsn_code}</td>
                      <td className="font-mono">{r.gst_rate}%</td>
                      <td className="font-mono">{r.total_quantity}</td>
                      <td className="font-mono font-bold">₹{r.total_taxable_value}</td>
                      <td className="font-mono text-slate-600">₹{r.total_cgst}</td>
                      <td className="font-mono text-slate-600">₹{r.total_sgst}</td>
                      <td className="font-mono text-slate-600">₹{r.total_igst}</td>
                      <td className="font-mono font-bold text-[#1D3A28]">₹{r.total_invoice_value}</td>
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
