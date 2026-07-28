import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton, AdminStatusBadge, AdminTextarea, AdminSelect } from '../components/admin/AdminPrimitives';
import { CaretLeft, PaperPlane, ShieldWarning } from '@phosphor-icons/react';

export default function AdminSupportDetail() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!ticketNumber) return;
    setLoading(true);
    try {
      const { data: tData, error: tErr } = await supabase
        .from('support_tickets')
        .select('*, orders(*)')
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (tErr) throw tErr;
      setTicket(tData);

      if (tData) {
        const { data: mData } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', tData.id)
          .order('created_at', { ascending: true });

        setMessages(mData || []);
      }
    } catch (err: any) {
      console.error('Fetch ticket detail error:', err);
      showToast('Failed to load support ticket details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNumber]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    const text = isInternalNote ? noteText : replyText;
    if (!text.trim()) {
      showToast('Message text cannot be empty.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isInternalNote) {
        const { data, error } = await supabase.rpc('add_support_internal_note', {
          p_ticket_id: ticket.id,
          p_note: text.trim()
        });
        if (error || !data?.success) throw new Error(error?.message || 'Note failed');
        showToast('Internal note saved.', 'success');
        setNoteText('');
      } else {
        const { data, error } = await supabase.rpc('reply_support_ticket', {
          p_ticket_id: ticket.id,
          p_message: text.trim(),
          p_sender_type: 'admin'
        });
        if (error || !data?.success) throw new Error(error?.message || 'Reply failed');
        showToast('Reply sent to customer.', 'success');
        setReplyText('');
      }
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit response.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSafetyReview = async () => {
    if (!ticket) return;
    const newStatus = !ticket.requires_safety_review;
    const reason = prompt(`Enter reason for ${newStatus ? 'flagging' : 'clearing'} Pharmaceutical Safety Review:`);
    if (!reason || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('update_support_safety_review', {
        p_ticket_id: ticket.id,
        p_requires_safety: newStatus,
        p_reason: reason.trim()
      });
      if (error || !data?.success) throw new Error(error?.message || 'Update failed');

      showToast(`Pharmaceutical Safety Review ${newStatus ? 'flagged' : 'cleared'}.`, 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to update safety review status.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!ticket) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      if (error) throw error;
      showToast(`Priority updated to ${newPriority}.`, 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to update priority.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!ticket) return;
    setIsSubmitting(true);
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'resolved') updateData.resolved_at = new Date().toISOString();
      if (newStatus === 'closed') updateData.closed_at = new Date().toISOString();

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;

      await supabase.from('support_status_history').insert({
        ticket_id: ticket.id,
        from_status: ticket.status,
        to_status: newStatus,
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        source: 'admin',
        note: `Status set to ${newStatus}`
      });

      showToast(`Ticket status updated to ${newStatus}.`, 'success');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
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
        {/* Navigation Topbar */}
        <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/support" className="admin-btn-icon" aria-label="Back to support list">
              <CaretLeft size={16} weight="bold" />
            </Link>
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Support Case Detail</span>
              <h2 className="text-base font-bold text-[#000000] font-mono">Ticket #{ticket?.ticket_number}</h2>
            </div>
          </div>
        </div>

        {/* Pharmaceutical Safety Review Flag Banner */}
        {ticket?.requires_safety_review && (
          <div className="p-3.5 bg-[#fbfbf5] border border-[#dc2626] rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldWarning size={20} className="text-[#dc2626] shrink-0" />
              <div>
                <span className="font-semibold text-[#dc2626] block uppercase">Pharmaceutical Safety Review Flagged</span>
                <span className="text-[0.7rem] text-[#71717a]">
                  This case contains keywords indicating possible adverse reaction or safety concern. Requires clinical review.
                </span>
              </div>
            </div>
            <button
              onClick={handleToggleSafetyReview}
              className="admin-btn-secondary !border-[#dc2626] !text-[#dc2626] hover:!bg-[#fef2f2] text-xs shrink-0"
            >
              Clear Flag
            </button>
          </div>
        )}

        {/* Ticket Header & Status Manager */}
        <AdminCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-3 mb-3">
            <div>
              <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider block">Subject</span>
              <h3 className="font-bold text-sm text-[#000000] m-0">{ticket?.subject}</h3>
              <p className="text-xs text-[#71717a] m-0">Customer: {ticket?.customer_name} • Email: {ticket?.customer_email || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2">
              <AdminSelect
                value={ticket?.priority}
                onChange={(e) => handleUpdatePriority(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-[#e4e4e7] bg-[#ffffff] text-[#000000]"
                options={[
                  { label: "Low Priority", value: "low" },
                  { label: "Normal Priority", value: "normal" },
                  { label: "High Priority", value: "high" },
                  { label: "Urgent Priority", value: "urgent" }
                ]}
              />

              <AdminSelect
                value={ticket?.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-[#e4e4e7] bg-[#ffffff] text-[#000000]"
                options={[
                  { label: "Open", value: "open" },
                  { label: "Assigned", value: "assigned" },
                  { label: "Waiting for Customer", value: "waiting_for_customer" },
                  { label: "Waiting for Internal", value: "waiting_for_internal" },
                  { label: "Resolved", value: "resolved" },
                  { label: "Closed", value: "closed" }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Category</span>
              <span className="font-semibold text-[#000000]">{ticket?.category}</span>
            </div>
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Priority</span>
              <AdminStatusBadge status={ticket?.priority} />
            </div>
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Status</span>
              <AdminStatusBadge status={ticket?.status} />
            </div>
            <div>
              <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Linked Order</span>
              <span className="font-semibold text-[#000000]">{ticket?.orders?.order_number || 'None'}</span>
            </div>
          </div>
        </AdminCard>

        {/* 2-Column Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Conversation & Response Section */}
          <div className="lg:col-span-2 space-y-5">
            {/* Conversation Log */}
            <AdminCard className="space-y-4">
              <div className="border-b border-[#f4f4f0] pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Case Message History</h3>
              </div>

              {messages.length === 0 ? (
                <p className="text-xs text-[#71717a] italic py-2">No conversation messages recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isInternal = msg.is_internal;
                    const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'support_rep';

                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border text-xs space-y-1 ${
                          isInternal 
                            ? 'bg-[#fbfbf5] border-[#e4e4e7]' 
                            : isAdmin 
                            ? 'bg-[#f4f4f0] border-[#e4e4e7]' 
                            : 'bg-[#ffffff] border-[#e4e4e7]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[0.7rem] text-[#71717a]">
                          <span className="font-semibold text-[#000000]">
                            {isInternal ? '🔒 Internal Admin Note' : isAdmin ? 'Support Representative' : ticket.customer_name}
                          </span>
                          <span className="font-mono">{new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-[#000000] leading-relaxed whitespace-pre-wrap margin-0">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminCard>

            {/* Response / Note Input Editor */}
            <AdminCard className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#f4f4f0] pb-2">
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="response_type"
                      checked={!isInternalNote}
                      onChange={() => setIsInternalNote(false)}
                      className="accent-[#000000]"
                    />
                    <span className="font-semibold text-[#000000]">Customer Reply</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="response_type"
                      checked={isInternalNote}
                      onChange={() => setIsInternalNote(true)}
                      className="accent-[#000000]"
                    />
                    <span className="font-semibold text-[#71717a]">🔒 Internal Note Only</span>
                  </label>
                </div>
              </div>

              <form onSubmit={handleSendReply} className="space-y-3 text-xs">
                {isInternalNote ? (
                  <AdminTextarea
                    rows={3}
                    placeholder="Add an internal operational note (not visible to customer)..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="bg-[#fbfbf5] focus:outline-none focus:border-[#000000]"
                  />
                ) : (
                  <AdminTextarea
                    rows={4}
                    placeholder="Type response to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="focus:outline-none focus:border-[#000000]"
                  />
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="admin-btn-primary"
                  >
                    <PaperPlane size={14} weight="bold" />
                    <span>{isSubmitting ? 'Sending...' : isInternalNote ? 'Save Internal Note' : 'Send Reply to Customer'}</span>
                  </button>
                </div>
              </form>
            </AdminCard>
          </div>

          {/* Customer Metadata Sidebar */}
          <div className="space-y-5">
            <AdminCard className="space-y-3">
              <div className="border-b border-[#f4f4f0] pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Customer Information</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[0.68rem] text-[#71717a] block uppercase font-semibold">Name</span>
                  <span className="font-semibold text-[#000000]">{ticket?.customer_name}</span>
                </div>
                <div>
                  <span className="text-[0.68rem] text-[#71717a] block uppercase font-semibold">Phone</span>
                  <span className="font-mono text-[#000000]">{ticket?.customer_phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[0.68rem] text-[#71717a] block uppercase font-semibold">Email</span>
                  <span className="font-mono text-[#000000]">{ticket?.customer_email || 'N/A'}</span>
                </div>
              </div>
            </AdminCard>

            <AdminCard className="space-y-3">
              <div className="border-b border-[#f4f4f0] pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Case Audit Timestamps</h3>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Created</span>
                  <span className="text-[#000000]">{new Date(ticket?.created_at).toLocaleString('en-IN')}</span>
                </div>
                {ticket?.resolved_at && (
                  <div>
                    <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Resolved</span>
                    <span className="text-[#16a34a] font-semibold">{new Date(ticket?.resolved_at).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {ticket?.closed_at && (
                  <div>
                    <span className="text-[0.68rem] text-[#71717a] block uppercase font-sans">Closed</span>
                    <span className="text-[#000000]">{new Date(ticket?.closed_at).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </AdminCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
