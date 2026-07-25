import { useState, useEffect } from 'react';
import { supabase, type DatabaseExecutiveKPIs } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { TrendUp, DownloadSimple, ShieldWarning } from '@phosphor-icons/react';

type DateFilter = '7days' | '30days' | 'this_month' | 'this_year';

export default function AdminAnalytics() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [kpis, setKpis] = useState<DatabaseExecutiveKPIs | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      if (dateFilter === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      } else if (dateFilter === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (dateFilter === 'this_year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      const { data, error } = await supabase.rpc('get_executive_dashboard_kpis', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      setKpis(data);
    } catch (err: any) {
      console.error('Fetch executive KPIs error:', err);
      showToast('Failed to load executive analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const handleExportCSV = async (reportType: string) => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_report_dataset', {
        p_report_type: reportType,
        p_format: 'csv'
      });

      if (error || !data?.success) throw new Error(error?.message || 'Export failed');

      showToast(`Report export queued. Export ID: #${data.export_id}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <TrendUp size={28} className="text-[#C5A059]" />
              <span>Executive Business Intelligence & Analytics</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative sales revenue, historical batch COGS, gross margins, tax liabilities, and risk metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['7days', '30days', 'this_month', 'this_year'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors min-h-[36px] ${
                  dateFilter === filter
                    ? 'bg-[#1D3A28] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Data Freshness Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-100 p-2.5 rounded-lg border border-slate-200">
          <span>Data Freshness: Live Real-Time PostgreSQL Views</span>
          <span>Query Period: {kpis?.query_start_date || 'N/A'} to {kpis?.query_end_date || 'N/A'}</span>
        </div>

        {/* Executive KPI Cards */}
        {loading ? (
          <AdminSkeleton type="card" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <AdminCard className="bg-emerald-50/70 border-l-4 border-l-emerald-600">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Revenue</span>
              <span className="text-2xl font-bold font-mono text-emerald-950">₹{kpis?.net_sales?.toLocaleString('en-IN') || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Gross Sales: ₹{kpis?.gross_sales?.toLocaleString('en-IN') || 0}</span>
            </AdminCard>

            <AdminCard className="bg-amber-50/70 border-l-4 border-l-amber-600">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Historical Batch COGS</span>
              <span className="text-2xl font-bold font-mono text-amber-950">₹{kpis?.historical_cogs?.toLocaleString('en-IN') || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Committed Batch Cost</span>
            </AdminCard>

            <AdminCard className="bg-blue-50/70 border-l-4 border-l-blue-600">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Gross Profit</span>
              <span className="text-2xl font-bold font-mono text-blue-950">₹{kpis?.gross_profit?.toLocaleString('en-IN') || 0}</span>
              <span className="text-[10px] font-bold text-blue-700 block mt-1">Margin: {kpis?.gross_margin_pct || 0}%</span>
            </AdminCard>

            <AdminCard className="bg-purple-50/70 border-l-4 border-l-purple-600">
              <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Total Paid Orders</span>
              <span className="text-2xl font-bold font-mono text-purple-950">{kpis?.orders_count || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-1">AOV: ₹{kpis?.average_order_value || 0}</span>
            </AdminCard>
          </div>
        )}

        {/* Risk & Operational Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminCard className="space-y-3">
            <h3 className="font-bold text-sm text-[#1D3A28] flex items-center gap-2 m-0">
              <ShieldWarning size={18} className="text-red-600" />
              <span>Expired Inventory Loss Valuation</span>
            </h3>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-1">
              <span className="text-xs text-red-800 font-bold block">Asset Value at Risk (Cost Basis)</span>
              <span className="text-2xl font-bold font-mono text-red-950">₹{kpis?.expired_stock_loss?.toLocaleString('en-IN') || 0}</span>
              <p className="text-[11px] text-red-900 m-0 pt-1">
                Value of inventory batches reaching expiry_date. Blocked automatically from FEFO checkout.
              </p>
            </div>
          </AdminCard>

          <AdminCard className="space-y-3">
            <h3 className="font-bold text-sm text-[#1D3A28] flex items-center gap-2 m-0">
              <DownloadSimple size={18} className="text-[#C5A059]" />
              <span>Export Executive & Financial Reports</span>
            </h3>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleExportCSV('sales_summary')}
                disabled={isExporting}
                className="w-full bg-[#2D5016] hover:bg-[#1D3A28] text-white p-2.5 text-xs font-bold rounded-lg shadow-sm flex items-center justify-between min-h-[38px]"
              >
                <span>Export Sales Summary CSV</span>
                <DownloadSimple size={16} />
              </button>

              <button
                onClick={() => handleExportCSV('gstr1_b2c')}
                disabled={isExporting}
                className="w-full bg-[#1D3A28] hover:bg-black text-white p-2.5 text-xs font-bold rounded-lg shadow-sm flex items-center justify-between min-h-[38px]"
              >
                <span>Export GSTR-1 Preparation Report CSV</span>
                <DownloadSimple size={16} />
              </button>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
}
