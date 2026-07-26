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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="space-y-5">
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
            <Building size={44} className="text-[#dc2626] mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#000000]">Operational Failure</h2>
            <p className="text-xs text-[#71717a] mt-1.5 font-medium">{error || 'Application record not found.'}</p>
            <Link to="/admin/distributors" className="admin-btn-primary mt-5 inline-block">
              Back to Distributors List
            </Link>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Header & Back Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-3">
            <Link to="/admin/distributors" className="admin-btn-icon" aria-label="Back to distributor list">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Distributor Application</span>
              <h2 className="text-base font-bold text-[#000000]">{lead.company_name}</h2>
            </div>
          </div>
          <span className="font-mono text-xs text-[#71717a]">ID: {lead.id}</span>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-5">
            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <Building size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Business Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Company / Business Name</span>
                  <span className="font-bold text-[#000000]">{lead.company_name}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">GSTIN Registration</span>
                  <span className="font-mono text-[#000000] font-semibold">{lead.gstin || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Expected Monthly Volume</span>
                  <span className="font-semibold text-[#000000]">{lead.expected_monthly_volume || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Submission Date</span>
                  <span className="font-mono text-[#000000]">{new Date(lead.created_at).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <Chat size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Application Notes / Experience</h3>
              </div>
              <p className="text-xs text-[#000000] leading-relaxed font-sans bg-[#fbfbf5] border border-[#e4e4e7] rounded-lg p-3.5 whitespace-pre-wrap margin-0">
                {lead.notes || 'No notes submitted.'}
              </p>
            </AdminCard>
          </div>

          {/* Contact Person & Status Manager */}
          <div className="space-y-5">
            {/* Contact Card */}
            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <User size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Contact Person</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#71717a]" />
                  <span className="font-semibold text-[#000000]">{lead.contact_person}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Envelope size={15} className="text-[#71717a]" />
                  <a href={`mailto:${lead.email}`} className="text-[#000000] font-mono hover:underline truncate block">
                    {lead.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={15} className="text-[#71717a]" />
                  <a href={`tel:${lead.phone}`} className="text-[#000000] font-mono hover:underline block">
                    {lead.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#71717a]" />
                  <span className="text-[#71717a]">{lead.city}, {lead.state}</span>
                </div>
              </div>
            </AdminCard>

            {/* Workflow status */}
            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <CheckSquare size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Workflow Action</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase mb-1">Current Application Status</span>
                  <AdminStatusBadge status={lead.status} />
                </div>

                <div className="pt-2 border-t border-[#f4f4f0]">
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase mb-2">Update Application Status:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={selectedStatus === 'under_review'}
                      onClick={() => handleStatusChangeAttempt('under_review')}
                      className="admin-btn-secondary text-[0.7rem] justify-center text-center"
                    >
                      Under Review
                    </button>
                    <button
                      type="button"
                      disabled={selectedStatus === 'contacted'}
                      onClick={() => handleStatusChangeAttempt('contacted')}
                      className="admin-btn-secondary text-[0.7rem] justify-center text-center"
                    >
                      Contacted
                    </button>
                    <button
                      type="button"
                      disabled={selectedStatus === 'approved'}
                      onClick={() => handleStatusChangeAttempt('approved')}
                      className="admin-btn-primary text-[0.7rem] justify-center text-center"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={selectedStatus === 'rejected'}
                      onClick={() => handleStatusChangeAttempt('rejected')}
                      className="admin-btn-secondary !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2] text-[0.7rem] justify-center text-center"
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

      {/* Confirmation Modal */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={`Update B2B Application Status to ${pendingStatus.toUpperCase()}?`}
        message={`Are you sure you want to change the status of ${lead.company_name} to ${pendingStatus.toUpperCase()}?`}
        confirmLabel="Confirm Status Change"
        cancelLabel="Cancel"
        isDestructive={pendingStatus === 'rejected'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
