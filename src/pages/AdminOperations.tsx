import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type DatabaseOperationalException, type DatabaseBackgroundJob, type DatabaseHealthCheck } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { CheckCircle, ArrowClockwise, Cpu } from '@phosphor-icons/react';

export default function AdminOperations() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthChecks, setHealthChecks] = useState<DatabaseHealthCheck[]>([]);
  const [exceptions, setExceptions] = useState<DatabaseOperationalException[]>([]);
  const [failedJobs, setFailedJobs] = useState<DatabaseBackgroundJob[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'FAILED_JOBS' | 'WEBHOOKS'>('ALL');
  const [isReconciling, setIsReconciling] = useState(false);

  const fetchOperationsData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Health Statuses
      const { data: healthData } = await supabase
        .from('system_health_checks')
        .select('*')
        .order('component', { ascending: true });

      setHealthChecks(healthData || []);

      // 2. Fetch Operational Exceptions
      const { data: excData } = await supabase
        .from('operational_exceptions')
        .select('*, orders(order_number)')
        .order('created_at', { ascending: false });

      setExceptions(excData || []);

      // 3. Fetch Failed / Retrying Background Jobs
      const { data: jobData } = await supabase
        .from('background_jobs')
        .select('*')
        .in('status', ['failed', 'retry_scheduled'])
        .order('created_at', { ascending: false });

      setFailedJobs(jobData || []);

    } catch (err: any) {
      console.error('Fetch operations data error:', err);
      showToast('Failed to load system operations data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRunReconciliation = async () => {
    setIsReconciling(true);
    try {
      await supabase.rpc('reconcile_payment_state');
      await supabase.rpc('reconcile_refund_state_suite');
      await supabase.rpc('reconcile_order_state');
      await supabase.rpc('reconcile_shipment_state');
      await supabase.rpc('reconcile_notification_state');
      await supabase.rpc('reconcile_inventory_state');
      await supabase.rpc('reconcile_invoice_state');
      await supabase.rpc('reconcile_return_rto_state');

      showToast('Full system reconciliation suite executed successfully.', 'success');
      await fetchOperationsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to run reconciliation suite.', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const { data, error } = await supabase.rpc('retry_failed_job', { p_job_id: jobId });
      if (error || !data?.success) throw new Error(error?.message || 'Retry failed');

      showToast('Background job queued for safe worker retry.', 'success');
      await fetchOperationsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to queue job retry.', 'error');
    }
  };

  const openCritical = exceptions.filter(e => e.severity === 'critical' && (e.status === 'open' || e.status === 'investigating')).length;
  const openHigh = exceptions.filter(e => e.severity === 'high' && (e.status === 'open' || e.status === 'investigating')).length;
  const countFailedJobs = failedJobs.filter(j => j.status === 'failed').length;
  const countRetryingJobs = failedJobs.filter(j => j.status === 'retry_scheduled').length;

  const filteredExceptions = exceptions.filter(e => {
    if (activeTab === 'CRITICAL') return e.severity === 'critical';
    if (activeTab === 'WEBHOOKS') return e.source === 'razorpay-webhook';
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Cpu size={28} className="text-[#C5A059]" />
              <span>Production Operations & System Health</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Reconciliation suite, durable background jobs, fingerprinted exception tracking, and webhooks ledger.
            </p>
          </div>
          <button
            onClick={handleRunReconciliation}
            disabled={isReconciling}
            className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-4 py-2.5 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 shrink-0 justify-center min-h-[44px]"
          >
            <ArrowClockwise size={16} className={isReconciling ? 'animate-spin' : ''} />
            <span>{isReconciling ? 'Reconciling System...' : 'Trigger Full System Reconciliation'}</span>
          </button>
        </div>

        {/* System Health Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {healthChecks.map(h => (
            <AdminCard key={h.id} className="p-3 bg-white border-l-4 border-l-green-500 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h.component.replace('_', ' ')}</span>
                <CheckCircle size={14} className="text-green-600" />
              </div>
              <div className="text-xs font-bold text-[#1D3A28] uppercase">{h.status}</div>
              <span className="text-[10px] text-slate-400 font-mono block truncate">{h.details?.message || 'Operational'}</span>
            </AdminCard>
          ))}
        </div>

        {/* Real KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AdminCard className="bg-red-50/70 border-l-4 border-l-red-600">
            <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Open Critical Exceptions</span>
            <span className="text-2xl font-bold font-mono text-red-900">{openCritical}</span>
          </AdminCard>

          <AdminCard className="bg-amber-50/70 border-l-4 border-l-amber-600">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">High Priority Exceptions</span>
            <span className="text-2xl font-bold font-mono text-amber-900">{openHigh}</span>
          </AdminCard>

          <AdminCard className="bg-purple-50/70 border-l-4 border-l-purple-600">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Failed Jobs (Dead-Letter)</span>
            <span className="text-2xl font-bold font-mono text-purple-900">{countFailedJobs}</span>
          </AdminCard>

          <AdminCard className="bg-blue-50/70 border-l-4 border-l-blue-600">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Jobs Retrying</span>
            <span className="text-2xl font-bold font-mono text-blue-900">{countRetryingJobs}</span>
          </AdminCard>
        </div>

        {/* Subsystem Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          {(['ALL', 'CRITICAL', 'FAILED_JOBS', 'WEBHOOKS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors min-h-[44px] sm:min-h-[auto] ${
                activeTab === tab
                  ? 'bg-[#1D3A28] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Failed Jobs Table View */}
        {activeTab === 'FAILED_JOBS' ? (
          <AdminCard className="space-y-3 p-4">
            <h3 className="font-bold text-sm text-[#1D3A28] m-0">Failed & Retrying Background Jobs</h3>
            {failedJobs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No failed background jobs found.</p>
            ) : (
              <div className="admin-table-container overflow-x-auto">
                <table className="admin-data-table min-w-full text-xs">
                  <thead>
                    <tr>
                      <th>Job ID & Type</th>
                      <th>Entity / Order</th>
                      <th>Attempts</th>
                      <th>Status</th>
                      <th>Last Error</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedJobs.map(j => (
                      <tr key={j.id}>
                        <td>
                          <div className="font-bold text-[#1D3A28]">{j.job_type}</div>
                          <div className="font-mono text-[10px] text-slate-400">{j.id}</div>
                        </td>
                        <td className="font-mono text-slate-600">{j.entity_type} {j.order_id ? `(#${j.order_id.substring(0, 8)})` : ''}</td>
                        <td className="font-mono font-bold">{j.attempt_count} / {j.max_attempts}</td>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            j.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="text-red-700 font-mono text-[11px] max-w-xs truncate">{j.last_error_message || 'N/A'}</td>
                        <td className="text-right">
                          <button
                            onClick={() => handleRetryJob(j.id)}
                            className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-2.5 py-1 text-[11px] font-bold rounded shadow-sm min-h-[36px]"
                          >
                            Queue Retry
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        ) : (
          /* Operational Exceptions Table View */
          loading ? (
            <AdminSkeleton type="table" rows={4} />
          ) : filteredExceptions.length === 0 ? (
            <AdminCard>
              <div className="text-center py-12">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                <h3 className="font-bold text-sm text-[#1D3A28]">No Open Operational Exceptions</h3>
                <p className="text-xs text-slate-500">All subsystems are fully reconciled and operating normally.</p>
              </div>
            </AdminCard>
          ) : (
            <AdminCard className="p-0 overflow-hidden">
              <div className="admin-table-container overflow-x-auto">
                <table className="admin-data-table min-w-full text-xs">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Title & Exception Type</th>
                      <th>Related Entity / Order</th>
                      <th>Occurrences</th>
                      <th>Status</th>
                      <th>First / Last Detected</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExceptions.map((exc) => (
                      <tr key={exc.id}>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            exc.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                            exc.severity === 'high' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {exc.severity}
                          </span>
                        </td>
                        <td>
                          <div className="font-bold text-[#1D3A28]">{exc.title}</div>
                          <div className="font-mono text-[10px] text-slate-500">{exc.exception_type}</div>
                        </td>
                        <td>
                          <span className="font-mono text-slate-700">{exc.entity_type}</span>
                          {exc.orders?.order_number && (
                            <span className="font-mono text-slate-500 block">Order: #{exc.orders.order_number}</span>
                          )}
                        </td>
                        <td className="font-mono font-bold text-slate-800">{exc.occurrence_count}</td>
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            exc.status === 'open' ? 'bg-red-100 text-red-800' :
                            exc.status === 'investigating' ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {exc.status}
                          </span>
                        </td>
                        <td className="font-mono text-[11px] text-slate-500">
                          <div>{new Date(exc.first_detected_at).toLocaleDateString('en-IN')}</div>
                          <div className="text-[10px] text-slate-400">{new Date(exc.last_detected_at).toLocaleTimeString('en-IN')}</div>
                        </td>
                        <td className="text-right">
                          <Link
                            to={`/admin/operations/exceptions/${exc.id}`}
                            className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-3 py-1.5 text-[11px] font-bold rounded shadow-sm inline-block min-h-[36px]"
                          >
                            Investigate
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )
        )}
      </div>
    </AdminLayout>
  );
}
