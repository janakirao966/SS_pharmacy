import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
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

      // Log admin action to admin_activity_logs
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
        <div className="space-y-6">
          <AdminSkeleton type="card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <Link to="/admin/operations" className="admin-btn-back text-xs">
            <CaretLeft size={16} weight="bold" />
            <span>Back to Operations Center</span>
          </Link>
          <span className="font-mono text-xs text-slate-500">ID: {exception?.id}</span>
        </div>

        {/* Exception Banner */}
        <AdminCard className="bg-[#FAF8F5] border-l-4 border-l-red-600 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Operational Incident Investigation</span>
              <h2 className="font-bold text-xl text-[#1D3A28] font-display m-0">{exception?.title}</h2>
              <p className="text-xs text-slate-500 m-0">Type: {exception?.exception_type} • Source: {exception?.source}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase ${
                exception?.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                exception?.severity === 'high' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {exception?.severity} Severity
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase ${
                exception?.status === 'open' ? 'bg-red-100 text-red-800' :
                exception?.status === 'investigating' ? 'bg-amber-100 text-amber-800' :
                'bg-green-100 text-green-800'
              }`}>
                {exception?.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Fingerprint</span>
              <span className="font-bold text-slate-700 truncate block">{exception?.fingerprint}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Occurrences</span>
              <span className="font-bold text-[#1D3A28]">{exception?.occurrence_count}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">First Detected</span>
              <span>{new Date(exception?.first_detected_at).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Last Detected</span>
              <span>{new Date(exception?.last_detected_at).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </AdminCard>

        {/* Detailed Metadata & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdminCard className="space-y-3">
            <h3 className="font-bold text-sm text-[#1D3A28] m-0">Description & Context</h3>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 m-0">
              {exception?.description || 'No detailed text description available.'}
            </p>
            {exception?.orders?.order_number && (
              <div className="text-xs">
                <span className="font-bold text-slate-600">Associated Order: </span>
                <Link to={`/admin/orders/${exception.order_id}`} className="text-[#2D5016] underline font-mono font-bold">
                  #{exception.orders.order_number}
                </Link>
              </div>
            )}
          </AdminCard>

          <AdminCard className="space-y-3">
            <h3 className="font-bold text-sm text-[#1D3A28] m-0">Sanitized Operational Metadata</h3>
            <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto m-0">
              {JSON.stringify(exception?.metadata || {}, null, 2)}
            </pre>
          </AdminCard>
        </div>

        {/* Resolution Control Panel */}
        <AdminCard className="space-y-4">
          <h3 className="font-bold text-sm text-[#1D3A28] m-0">Incident Management & Resolution</h3>

          {exception?.status === 'resolved' || exception?.status === 'ignored' ? (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-xs">
              <span className="font-bold text-green-900">Resolved at: </span>
              <span>{new Date(exception.resolved_at).toLocaleString('en-IN')}</span>
              <p className="text-green-800 m-0 mt-1"><span className="font-bold">Note: </span>{exception.resolution_note}</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Resolution Note *</label>
                <textarea
                  rows={2}
                  placeholder="State investigation findings or reason for resolving/ignoring..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus('investigating')}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-lg min-h-[44px]"
                >
                  Mark Investigating
                </button>

                <button
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={isSubmitting}
                  className="bg-[#2D5016] hover:bg-[#1D3A28] text-white font-bold px-4 py-2 rounded-lg min-h-[44px]"
                >
                  Mark Resolved
                </button>

                <button
                  onClick={() => handleUpdateStatus('ignored')}
                  disabled={isSubmitting}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-lg min-h-[44px]"
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
