import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { CaretLeft, ShieldWarning, PaperPlane, LockKey } from '@phosphor-icons/react';

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
          <Link to="/admin/support" className="admin-btn-back text-xs">
            <CaretLeft size={16} weight="bold" />
            <span>Back to Support Center</span>
          </Link>
          <span className="font-mono text-xs text-slate-500">Key: {ticket?.ticket_number}</span>
        </div>

        {/* Pharmaceutical Safety Review Banner */}
        {ticket?.requires_safety_review && (
          <div className="p-4 bg-purple-100 border-l-4 border-l-purple-700 text-purple-950 rounded-xl space-y-2 text-xs animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldWarning size={20} className="text-purple-800" />
                <span>PHARMACEUTICAL SAFETY REVIEW FLAGGED</span>
              </div>
              <button
                onClick={handleToggleSafetyReview}
                className="bg-purple-900 hover:bg-purple-950 text-white px-3 py-1 text-[11px] font-bold rounded"
              >
                Clear Safety Flag
              </button>
            </div>
            <p className="m-0 text-purple-900">
              This case contains keywords indicating possible adverse reaction, allergic response, or product quality concern. Requires qualified clinical review.
            </p>
          </div>
        )}

        {/* Ticket Header Card */}
        <AdminCard className="bg-[#FAF8F5] border-l-4 border-l-[#C5A059] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[10px] font-bold text-[#8A6B29] uppercase tracking-wider block">Ticket #{ticket?.ticket_number}</span>
              <h2 className="font-bold text-xl text-[#1D3A28] font-display m-0">{ticket?.subject}</h2>
              <p className="text-xs text-slate-500 m-0">Customer: {ticket?.customer_name} • Email: {ticket?.customer_email || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ticket?.priority}
                onChange={(e) => handleUpdatePriority(e.target.value)}
                className="py-1 px-2.5 text-xs font-bold rounded uppercase border border-slate-300 bg-white"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>

              <select
                value={ticket?.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="py-1 px-2.5 text-xs font-bold rounded uppercase border border-slate-300 bg-white"
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="waiting_for_customer">Waiting for Customer</option>
                <option value="waiting_for_internal">Waiting for Internal</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Category</span>
              <span className="font-bold">{ticket?.category}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Linked Order</span>
              <span>{ticket?.orders?.order_number ? `#${ticket.orders.order_number}` : 'None'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">First Response Due</span>
              <span>{ticket?.first_response_due_at ? new Date(ticket.first_response_due_at).toLocaleTimeString('en-IN') : 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Created At</span>
              <span>{new Date(ticket?.created_at).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </AdminCard>

        {/* Message Thread */}
        <AdminCard className="space-y-4">
          <h3 className="font-bold text-sm text-[#1D3A28] m-0">Conversation Thread & Notes</h3>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.map(m => (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl text-xs space-y-1 ${
                  m.visibility === 'internal'
                    ? 'bg-amber-100/80 border border-amber-300 text-amber-950 ml-4'
                    : m.sender_type === 'admin'
                    ? 'bg-[#1D3A28] text-white ml-6'
                    : 'bg-slate-100 text-slate-800 mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-80 border-b border-black/10 pb-1">
                  <span className="font-bold uppercase flex items-center gap-1">
                    {m.visibility === 'internal' && <LockKey size={12} />}
                    {m.sender_type === 'admin' ? 'Support Specialist (Admin)' : 'Customer'}
                    {m.visibility === 'internal' && ' • INTERNAL NOTE (HIDDEN FROM CUSTOMER)'}
                  </span>
                  <span className="font-mono">{new Date(m.created_at).toLocaleString('en-IN')}</span>
                </div>
                <p className="m-0 whitespace-pre-wrap leading-relaxed">{m.message}</p>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="responseType"
                  checked={!isInternalNote}
                  onChange={() => setIsInternalNote(false)}
                />
                <span className="font-bold text-[#1D3A28]">Reply to Customer</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="responseType"
                  checked={isInternalNote}
                  onChange={() => setIsInternalNote(true)}
                />
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <LockKey size={14} /> Add Internal Admin Note (Private)
                </span>
              </label>
            </div>

            <textarea
              rows={3}
              placeholder={isInternalNote ? 'Write private team note (never visible to customer)...' : 'Type reply message to customer...'}
              value={isInternalNote ? noteText : replyText}
              onChange={(e) => isInternalNote ? setNoteText(e.target.value) : setReplyText(e.target.value)}
              className={`w-full p-3 border rounded-xl text-xs ${
                isInternalNote ? 'border-amber-400 bg-amber-50/50' : 'border-slate-300 bg-white'
              }`}
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm flex items-center gap-2 ${
                  isInternalNote ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#2D5016] hover:bg-[#1D3A28]'
                }`}
              >
                <PaperPlane size={14} />
                <span>{isInternalNote ? 'Save Internal Note' : 'Send Reply to Customer'}</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
