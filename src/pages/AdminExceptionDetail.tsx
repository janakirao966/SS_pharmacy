import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton, AdminStatusBadge, AdminTextarea } from '../components/admin/AdminPrimitives';
import { CaretLeft } from '@phosphor-icons/react';

export default function AdminExceptionDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [exception, setException] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('operational_exceptions')
        .select('*, orders(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setException(data);
    } catch (err: any) {
      console.error('Fetch exception error:', err);
      showToast('Failed to load operational exception detail.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdateStatus = async (newStatus: 'investigating' | 'resolved' | 'ignored') => {
    if (!exception) return;
    if ((newStatus === 'resolved' || newStatus === 'ignored') && !resolutionNote.trim()) {
      showToast('Resolution note is mandatory for resolved or ignored exceptions.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' || newStatus === 'ignored') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution_note = resolutionNote.trim();
      }

      const { error } = await supabase
        .from('operational_exceptions')
        .update(updateData)
        .eq('id', exception.id);

      if (error) throw error;

      await supabase.from('admin_activity_logs').insert({
        action: `EXCEPTION_SET_${newStatus.toUpperCase()}`,
        entity_type: 'operational_exception',
        entity_id: exception.id,
        details: { note: resolutionNote.trim(), fingerprint: exception.fingerprint }
      });

      showToast(`Exception status updated to ${newStatus}.`, 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to update exception.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-5">
          <AdminSkeleton type="card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/operations" className="admin-btn-icon" aria-label="Back to operations">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Operational Exception Detail</span>
              <h2 className="text-base font-bold text-[#000000] font-mono">{exception?.title}</h2>
            </div>
          </div>
          <span className="font-mono text-xs text-[#71717a]">ID: {exception?.id}</span>
        </div>

        {/* Master Exception Summary Card */}
        <AdminCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-3 mb-3">
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Subsystem & Type</span>
              <h3 className="font-bold text-sm text-[#000000] m-0">{exception?.exception_type}</h3>
              <p className="text-xs text-[#71717a] m-0">Source: {exception?.source}</p>
            </div>
            <div className="flex items-center gap-2">
              <AdminStatusBadge status={exception?.severity} />
              <AdminStatusBadge status={exception?.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Fingerprint</span>
              <span className="font-semibold text-[#000000] truncate block">{exception?.fingerprint}</span>
            </div>
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Occurrences</span>
              <span className="font-bold text-[#000000]">{exception?.occurrence_count}</span>
            </div>
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">First Detected</span>
              <span className="text-[#71717a]">{new Date(exception?.first_detected_at).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Last Detected</span>
              <span className="text-[#71717a]">{new Date(exception?.last_detected_at).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </AdminCard>

        {/* 2-Column Split: Context vs Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AdminCard className="space-y-3">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Description & Context</h3>
            </div>
            <p className="text-xs text-[#000000] leading-relaxed bg-[#fbfbf5] p-3 rounded-lg border border-[#e4e4e7] margin-0">
              {exception?.description || 'No detailed text description available.'}
            </p>
            {exception?.orders?.order_number && (
              <div className="text-xs pt-1">
                <span className="font-semibold text-[#71717a]">Associated Order: </span>
                <Link to={`/admin/orders/${exception.order_id}`} className="font-mono font-bold text-[#000000] underline">
                  #{exception.orders.order_number}
                </Link>
              </div>
            )}
          </AdminCard>

          <AdminCard className="space-y-3">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Sanitized Operational Metadata</h3>
            </div>
            <pre className="text-[0.7rem] font-mono bg-[#1a1a1a] text-[#ffffff] p-3 rounded-lg overflow-x-auto margin-0">
              {JSON.stringify(exception?.metadata || {}, null, 2)}
            </pre>
          </AdminCard>
        </div>

        {/* Incident Resolution Panel */}
        <AdminCard className="space-y-3">
          <div className="border-b border-[#f4f4f0] pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Incident Triage & Resolution</h3>
          </div>

          {exception?.status === 'resolved' || exception?.status === 'ignored' ? (
            <div className="p-3 bg-[#fbfbf5] rounded-lg border border-[#e4e4e7] text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#000000] uppercase">Status: {exception.status}</span>
                <span className="font-mono text-[#71717a]">{new Date(exception.resolved_at).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[#71717a] margin-0">Resolution Note: {exception.resolution_note}</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <AdminTextarea
                label="Mandatory Resolution Note"
                required
                rows={2}
                placeholder="State investigation findings or resolution reason..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('investigating')}
                  disabled={isSubmitting}
                  className="admin-btn-secondary"
                >
                  Mark Investigating
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={isSubmitting}
                  className="admin-btn-primary"
                >
                  Mark Resolved
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('ignored')}
                  disabled={isSubmitting}
                  className="admin-btn-outline"
                >
                  Ignore Exception
                </button>
              </div>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
