import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { CaretLeft, Envelope, Phone, MapPin, User, FileText, CheckCircle, ChatCircleText } from '@phosphor-icons/react';

export default function AdminEnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [enquiry, setEnquiry] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Status updates states
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');

  const fetchEnquiryDetail = async () => {
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
      setEnquiry(data);
      setSelectedStatus(data.status);
    } catch (err: any) {
      console.error('Failed to query enquiry details:', err);
      setError('Unable to retrieve enquiry details from Supabase.');
      showToast('Error syncing enquiry info.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiryDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChangeAttempt = (status: string) => {
    setPendingStatus(status);
    setIsConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!id || !pendingStatus || !enquiry) return;
    setIsConfirmOpen(false);

    try {
      const { error: dbError } = await supabase
        .from('distributor_applications')
        .update({ status: pendingStatus })
        .eq('id', id);

      if (dbError) throw dbError;

      setEnquiry((prev: any) => prev ? { ...prev, status: pendingStatus } : null);
      setSelectedStatus(pendingStatus);
      showToast('Enquiry status updated successfully.', 'success');
    } catch (err: any) {
      console.error('Status mutation error:', err);
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

  if (error || !enquiry) {
    return (
      <AdminLayout>
        <AdminCard className="admin-error-boundary">
          <div className="text-center py-12">
            <ChatCircleText size={44} className="text-[#dc2626] mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#000000]">Operational Failure</h2>
            <p className="text-xs text-[#71717a] mt-1.5 font-medium">{error || 'Enquiry record not found.'}</p>
            <Link to="/admin/enquiries" className="admin-btn-primary mt-5 inline-block">
              Back to Enquiries List
            </Link>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div className="flex items-center gap-3">
            <Link to="/admin/enquiries" className="admin-btn-icon" aria-label="Back to enquiries">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Customer Enquiry Detail</span>
              <h2 className="text-base font-bold text-[#000000]">{enquiry.contact_person}</h2>
            </div>
          </div>
          <span className="font-mono text-xs text-[#71717a]">ID: {enquiry.id}</span>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Submitted Message Card */}
          <div className="lg:col-span-2 space-y-5">
            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <FileText size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Submitted Message Comments</h3>
              </div>
              <div className="space-y-2 text-xs">
                <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase">Product / Subject Source</span>
                <span className="font-bold text-[#000000] block text-sm">
                  {enquiry.company_name.replace('Enquiry: ', '')}
                </span>
                
                <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase pt-2">Message Body</span>
                <p className="text-[#000000] leading-relaxed font-sans bg-[#fbfbf5] border border-[#e4e4e7] rounded-lg p-3.5 whitespace-pre-wrap margin-0">
                  {enquiry.notes || 'No message description submitted.'}
                </p>
              </div>
            </AdminCard>
          </div>

          {/* Sidebar details panel */}
          <div className="space-y-5">
            {/* Contact details */}
            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <User size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Contact Details</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#71717a]" />
                  <span className="font-semibold text-[#000000]">{enquiry.contact_person}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Envelope size={15} className="text-[#71717a]" />
                  <a href={`mailto:${enquiry.email}`} className="text-[#000000] font-mono hover:underline truncate block">
                    {enquiry.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={15} className="text-[#71717a]" />
                  <a href={`tel:${enquiry.phone}`} className="text-[#000000] font-mono hover:underline block">
                    {enquiry.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#71717a]" />
                  <span className="text-[#71717a]">{enquiry.city}, {enquiry.state}</span>
                </div>
              </div>
            </AdminCard>

            {/* Workflow Action Status Manager */}
            <AdminCard className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#f4f4f0] pb-2">
                <CheckCircle size={16} className="text-[#000000]" />
                <h3 className="font-semibold text-xs uppercase tracking-wider text-[#71717a]">Workflow Action</h3>
              </div>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase mb-1">Current Status</span>
                  <AdminStatusBadge status={enquiry.status === 'approved' ? 'resolved' : enquiry.status === 'under_review' ? 'in_progress' : enquiry.status} />
                </div>

                <div className="pt-2 border-t border-[#f4f4f0]">
                  <span className="text-[0.7rem] font-semibold text-[#71717a] block uppercase mb-2">Update Status:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={selectedStatus === 'under_review'}
                      onClick={() => handleStatusChangeAttempt('under_review')}
                      className="admin-btn-secondary text-[0.7rem] justify-center text-center"
                    >
                      In Progress
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
                      Resolved
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

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={isConfirmOpen}
        title={`Update Status to ${pendingStatus.toUpperCase()}?`}
        message={`Are you sure you want to update the status of this enquiry to ${pendingStatus.toUpperCase()}?`}
        confirmLabel="Confirm Status"
        cancelLabel="Cancel"
        isDestructive={pendingStatus === 'rejected'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </AdminLayout>
  );
}
