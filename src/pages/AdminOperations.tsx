import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type DatabaseOperationalException, type DatabaseBackgroundJob, type DatabaseHealthCheck } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { 
  AdminCard, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminSkeleton, 
  AdminEmptyState 
} from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { ArrowClockwise, Eye } from '@phosphor-icons/react';

export default function AdminOperations() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthChecks, setHealthChecks] = useState<DatabaseHealthCheck[]>([]);
  const [exceptions, setExceptions] = useState<DatabaseOperationalException[]>([]);
  const [failedJobs, setFailedJobs] = useState<DatabaseBackgroundJob[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'FAILED_JOBS' | 'WEBHOOKS'>('ALL');
  const [isReconciling, setIsReconciling] = useState(false);
  const [isConfirmReconcileOpen, setIsConfirmReconcileOpen] = useState(false);

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
    setIsConfirmReconcileOpen(false);
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

  const exceptionColumns = [
    { 
      header: 'Severity', 
      render: (e: DatabaseOperationalException) => <AdminStatusBadge status={e.severity} /> 
    },
    { 
      header: 'Title & Subsystem', 
      render: (e: DatabaseOperationalException) => (
        <div>
          <span className="font-semibold text-[#000000] block text-xs">{e.title}</span>
          <span className="text-[0.68rem] text-[#71717a] font-mono">Source: {e.source} · Type: {e.exception_type}</span>
        </div>
      ) 
    },
    { 
      header: 'Status', 
      render: (e: DatabaseOperationalException) => <AdminStatusBadge status={e.status} /> 
    },
    { 
      header: 'Occurrences', 
      render: (e: DatabaseOperationalException) => <span className="font-mono text-xs text-[#000000]">{e.occurrence_count}</span>,
      className: 'text-right'
    },
    { 
      header: 'First / Last Detected', 
      render: (e: DatabaseOperationalException) => (
        <span className="font-mono text-[0.7rem] text-[#71717a]">
          {new Date(e.last_detected_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
        </span>
      ) 
    },
    { 
      header: 'Action', 
      render: (e: DatabaseOperationalException) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/operations/exceptions/${e.id}`)}
          className="admin-btn-outline !min-h-[30px] !py-1 !px-2 text-[0.7rem]"
          aria-label={`Investigate exception ${e.title}`}
        >
          <Eye size={13} />
          <span>Investigate</span>
        </button>
      ),
      className: 'text-right'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Subheader & Reconciliation CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Production Operations & System Health</span>
            <p className="text-xs text-[#71717a] margin-0">Reconciliation suite, background job queues, and exception tracking</p>
          </div>

          <button
            onClick={() => setIsConfirmReconcileOpen(true)}
            disabled={isReconciling}
            className="admin-btn-primary self-start sm:self-auto"
          >
            <ArrowClockwise size={14} className={isReconciling ? 'animate-spin' : ''} weight="bold" />
            <span>{isReconciling ? 'Reconciling System...' : 'Trigger System Reconciliation'}</span>
          </button>
        </div>

        {/* Health Check Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {healthChecks.map(h => (
            <AdminCard key={h.id} className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase tracking-wider">{h.component.replace('_', ' ')}</span>
                <AdminStatusBadge status={h.status} />
              </div>
              <span className="text-[0.7rem] text-[#71717a] font-mono block truncate">{h.details?.message || 'Operational'}</span>
            </AdminCard>
          ))}
        </div>

        {/* KPI Operational Exception Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <AdminCard className="!border-[#dc2626]">
            <span className="text-[0.7rem] font-semibold text-[#dc2626] uppercase tracking-wider block">Critical Exceptions</span>
            <span className="text-xl font-bold font-mono text-[#dc2626]">{openCritical}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">High Priority Exceptions</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{openHigh}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Failed Background Jobs</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{countFailedJobs}</span>
          </AdminCard>

          <AdminCard>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Jobs Retrying</span>
            <span className="text-xl font-bold font-mono text-[#000000]">{countRetryingJobs}</span>
          </AdminCard>
        </div>

        {/* Subsystem Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#e4e4e7] pb-2">
          {(['ALL', 'CRITICAL', 'FAILED_JOBS', 'WEBHOOKS'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-[#000000] text-[#ffffff]'
                  : 'bg-[#f4f4f0] text-[#71717a] hover:bg-[#e4e4e7]'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Operational Workspace */}
        {activeTab === 'FAILED_JOBS' ? (
          <AdminCard className="space-y-3 p-0 overflow-hidden">
            <div className="p-3.5 border-b border-[#f4f4f0]">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a] m-0">Failed & Retrying Background Jobs</h3>
            </div>
            {failedJobs.length === 0 ? (
              <p className="text-xs text-[#71717a] p-4 text-center italic">No failed background jobs found.</p>
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
                          <div className="font-semibold text-[#000000]">{j.job_type}</div>
                          <div className="font-mono text-[0.7rem] text-[#71717a]">{j.id}</div>
                        </td>
                        <td className="font-mono text-[#71717a]">{j.entity_type} {j.order_id ? `(#${j.order_id.substring(0, 8)})` : ''}</td>
                        <td className="font-mono font-semibold text-[#000000]">{j.attempt_count} / {j.max_attempts}</td>
                        <td>
                          <AdminStatusBadge status={j.status} />
                        </td>
                        <td className="text-[#dc2626] font-mono text-xs max-w-xs truncate">{j.last_error_message || 'N/A'}</td>
                        <td className="text-right">
                          <button
                            onClick={() => handleRetryJob(j.id)}
                            className="admin-btn-secondary text-[0.7rem] !py-1 !px-2"
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
          loading ? (
            <AdminSkeleton type="table" rows={5} />
          ) : filteredExceptions.length === 0 ? (
            <AdminEmptyState
              title="No Operational Exceptions Found"
              description="All subsystems are fully reconciled and operating normally."
            />
          ) : (
            <AdminCard className="p-0 overflow-hidden">
              <AdminDataTable
                columns={exceptionColumns}
                data={filteredExceptions}
                keyExtractor={(e) => e.id}
                onRowClick={(e) => navigate(`/admin/operations/exceptions/${e.id}`)}
              />
            </AdminCard>
          )
        )}
      </div>

      {/* Confirmation Dialog for Reconciliation */}
      <AdminConfirmDialog
        isOpen={isConfirmReconcileOpen}
        title="Execute Full System Reconciliation?"
        message="This will evaluate and synchronize all payment states, inventory reservations, order statuses, and tax invoice RPCs. Proceed?"
        confirmLabel="Run Reconciliation"
        cancelLabel="Cancel"
        onConfirm={handleRunReconciliation}
        onCancel={() => setIsConfirmReconcileOpen(false)}
      />
    </AdminLayout>
  );
}
