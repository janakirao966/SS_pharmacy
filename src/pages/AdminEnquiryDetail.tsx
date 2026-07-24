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
        <div className="space-y-6">
          <div className="skeleton-pulse w-36 h-6 rounded" />
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
            <ChatCircleText size={48} className="text-[#B91C1C] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1D3A28] font-display">Operational Failure</h2>
            <p className="text-sm text-[#B91C1C] mt-2 font-medium">{error || 'Enquiry record not found.'}</p>
            <Link to="/admin/enquiries" className="admin-btn-primary mt-6 inline-block">
              Back to Enquiries
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
          <Link to="/admin/enquiries" className="admin-btn-back">
            <CaretLeft size={16} weight="bold" />
            <span>Enquiries List</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">ID: {enquiry.id}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main message card */}
          <div className="lg:col-span-2 space-y-6">
            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Submitted Message Comments</h3>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Product / Subject Source</span>
                <span className="text-sm font-bold text-[#1D3A28] block">
                  {enquiry.company_name.replace('Enquiry: ', '')}
                </span>
                
                <span className="text-[10px] font-bold text-slate-400 block uppercase pt-2">Message Body</span>
                <p className="text-sm text-slate-700 leading-relaxed font-sans bg-[#FAF8F5] border border-[#E8E2D5] rounded-xl p-4 whitespace-pre-wrap">
                  {enquiry.notes || 'No message description submitted.'}
                </p>
              </div>
            </AdminCard>
          </div>

          {/* Sidebar details panel */}
          <div className="space-y-6">
            {/* Contact details */}
            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <User size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Contact Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <User size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-[#1D3A28]">{enquiry.contact_person}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Envelope size={16} className="text-slate-400" />
                  <a href={`mailto:${enquiry.email}`} className="text-xs text-[#8A6B29] font-mono hover:underline truncate block">
                    {enquiry.email}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={16} className="text-slate-400" />
                  <a href={`tel:${enquiry.phone}`} className="text-xs text-[#8A6B29] font-mono hover:underline block">
                    {enquiry.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="text-xs text-slate-600">{enquiry.city}, {enquiry.state}</span>
                </div>
              </div>
            </AdminCard>

            {/* Status Manager */}
            <AdminCard className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckCircle size={18} className="text-[#C5A059]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Workflow Action</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Current Status</span>
                  <AdminStatusBadge status={enquiry.status === 'approved' ? 'resolved' : enquiry.status === 'under_review' ? 'in_progress' : enquiry.status} />
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
                      In Progress
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
                      Resolve
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
        message={`Are you sure you want to change this customer enquiry's operational status to "${
          pendingStatus === 'approved' ? 'RESOLVED' : pendingStatus === 'under_review' ? 'IN PROGRESS' : pendingStatus.toUpperCase()
        }"?`}
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
