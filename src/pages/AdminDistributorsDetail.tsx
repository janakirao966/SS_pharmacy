import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, Building, User, Phone, Envelope, MapPin, CheckSquare, Chat } from '@phosphor-icons/react';

export default function AdminDistributorsDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Status mutation states
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');

  const fetchLeadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('distributor_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError) throw dbError;
      setLead(data);
      setSelectedStatus(data.status);
    } catch (err: any) {
      console.error('Failed to query B2B lead details:', err);
      setError('Unable to retrieve distributor application details from Supabase.');
      showToast('Error syncing B2B application info.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetail();
  }, [id]);

  const handleStatusChangeAttempt = (status: string) => {
    setPendingStatus(status);
    setIsConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!id || !pendingStatus || !lead) return;
    setIsConfirmOpen(false);

    try {
      const { error: dbError } = await supabase
        .from('distributor_applications')
        .update({ status: pendingStatus })
        .eq('id', id);

      if (dbError) throw dbError;

      setLead((prev: any) => prev ? { ...prev, status: pendingStatus } : null);
      setSelectedStatus(pendingStatus);
      showToast('B2B application status updated successfully.', 'success');
    } catch (err: any) {
      console.error('Status update error:', err);
      showToast('Database write failed.', 'error');
    } finally {
      setPendingStatus('');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="skeleton-pulse w-36 h-6 rounded" />
          <AdminSkeleton type="card" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !lead) {
    return (
      <AdminLayout>
        <AdminCard className="admin-error-boundary">
          <div className="text-center py-12">
            <Building size={48} className="text-[#B91C1C] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1D3A28] font-display">Operational Failure</h2>
            <p className="text-sm text-[#B91C1C] mt-2 font-medium">{error || 'Application record not found.'}</p>
            <Link to="/admin/distributors" className="admin-btn-primary mt-6 inline-block">
              Back to Distributors
            </Link>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Back button header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <Link to="/admin/distributors" className="admin-btn-back">
            <CaretLeft size={16} weight="bold" />
            <span>Applications List</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">ID: {lead.id}</span>
          </div>
        </div>

        {/* 2-Column Split: Detailed Info on left, Status & Contacts on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Business Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Company / Business Name</span>
                  <span className="font-bold text-[#1D3A28]">{lead.company_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">GSTIN Registration</span>
                  <span className="font-mono text-slate-700 font-semibold">{lead.gstin || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Expected Monthly Volume</span>
                  <span className="font-semibold text-slate-800">{lead.expected_monthly_volume || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Submission Date</span>
                  <span className="text-slate-700">{new Date(lead.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Chat size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Application Notes / Experience</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-sans bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl p-4 whitespace-pre-wrap">
                {lead.notes || 'No notes submitted.'}
              </p>
            </AdminCard>
          </div>

          {/* Contact Person & Status Manager */}
          <div className="space-y-6">
            {/* Contact Card */}
            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <User size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Contact Person</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-[#1D3A28]">{lead.contact_person}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Envelope size={16} className="text-slate-400" />
                  <a href={`mailto:${lead.email}`} className="text-xs text-[#8A6B29] font-mono hover:underline truncate block">
                    {lead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={16} className="text-slate-400" />
                  <a href={`tel:${lead.phone}`} className="text-xs text-[#8A6B29] font-mono hover:underline block">
                    {lead.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="text-xs text-slate-600">{lead.city}, {lead.state}</span>
                </div>
              </div>
            </AdminCard>

            {/* Workflow status */}
            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckSquare size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Workflow Action</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Current Status</span>
                  <AdminStatusBadge status={lead.status} />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 block uppercase mb-2">Change Status To:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={selectedStatus === 'under_review'}
                      onClick={() => handleStatusChangeAttempt('under_review')}
                      className="admin-btn-action text-[11px] justify-center text-center font-bold"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      disabled={selectedStatus === 'contacted'}
                      onClick={() => handleStatusChangeAttempt('contacted')}
                      className="admin-btn-action text-[11px] justify-center text-center font-bold"
                    >
                      Contacted
                    </button>
                    <button
                      type="button"
                      disabled={selectedStatus === 'approved'}
                      onClick={() => handleStatusChangeAttempt('approved')}
                      className="admin-btn-action success text-[11px] justify-center text-center font-bold"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={selectedStatus === 'rejected'}
                      onClick={() => handleStatusChangeAttempt('rejected')}
                      className="admin-btn-action danger text-[11px] justify-center text-center font-bold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirm Status Change?"
        message={`Are you sure you want to change this B2B partner application status to "${pendingStatus.toUpperCase()}"?`}
        confirmLabel="Update status"
        cancelLabel="Keep Current"
        isDestructive={pendingStatus === 'rejected'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => {
          setIsConfirmOpen(false);
          setPendingStatus('');
        }}
      />
    </AdminLayout>
  );
}
