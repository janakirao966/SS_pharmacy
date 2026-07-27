import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import Container from '../components/layout/Container';
import CleanCard from '../components/cards/CleanCard';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { ArrowLeft, Send } from 'lucide-react';

export default function CustomerSupportDetail() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!ticketNumber) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_customer_ticket_detail', {
        p_ticket_number: ticketNumber
      });

      if (error || !data?.success) throw new Error(error?.message || 'Ticket not found');

      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Fetch customer ticket detail error:', err);
      showToast('Failed to load support ticket.', 'error');
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
    if (!ticket || !replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('reply_support_ticket', {
        p_ticket_id: ticket.id,
        p_message: replyText.trim(),
        p_sender_type: 'customer'
      });

      if (error || !data?.success) throw new Error(error?.message || 'Reply failed');

      showToast('Reply submitted successfully.', 'success');
      setReplyText('');
      await fetchDetail();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reply.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FEFDF8] min-h-screen py-12 text-center text-xs text-slate-500">
        Loading support ticket conversation...
      </div>
    );
  }

  return (
    <div className="bg-[#FEFDF8] min-h-screen py-12">
      <SEO title={`Support Case #${ticket?.ticket_number} - S.S. PHARMACY`} description="View customer support ticket discussion and status." />
      <Container>
        <div className="max-w-3xl mx-auto space-y-6">
          <Link to="/account/support" className="inline-flex items-center gap-1 text-xs text-[#2D5016] font-bold hover:underline">
            <ArrowLeft size={14} /> Back to Support Center
          </Link>

          {/* Ticket Summary Header */}
          <CleanCard className="p-6 space-y-3 bg-[#FAF8F5] border-l-4 border-l-[#C5A059]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#8A6B29] uppercase tracking-wider block">Ticket #{ticket?.ticket_number}</span>
                <h1 className="text-lg font-bold font-display text-[#1D3A28] m-0">{ticket?.subject}</h1>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded uppercase ${
                ticket?.status === 'open' ? 'bg-amber-100 text-amber-800' :
                ticket?.status === 'resolved' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {ticket?.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Category</span>
                <span className="font-bold">{ticket?.category}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Order Number</span>
                <span>{ticket?.orders?.order_number ? `#${ticket.orders.order_number}` : 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Submitted On</span>
                <span>{new Date(ticket?.created_at).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          </CleanCard>

          {/* Conversation Thread */}
          <CleanCard className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-[#1D3A28] m-0">Discussion History</h3>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {messages.map(m => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl text-xs space-y-1 ${
                    m.sender_type === 'admin'
                      ? 'bg-[#1D3A28] text-white ml-2 sm:ml-6'
                      : 'bg-slate-100 text-slate-800 mr-2 sm:mr-6'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-80 border-b border-black/10 pb-1">
                    <span className="font-bold uppercase">
                      {m.sender_type === 'admin' ? 'S.S. Pharmacy Support Specialist' : 'You'}
                    </span>
                    <span className="font-mono">{new Date(m.created_at).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="m-0 whitespace-pre-wrap leading-relaxed">{m.message}</p>
                </div>
              ))}
            </div>

            {/* Customer Reply Form */}
            {ticket?.status !== 'closed' ? (
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-slate-200">
                <textarea
                  rows={3}
                  placeholder="Type your message or response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#2D5016] text-white font-bold px-5 py-2 text-xs flex items-center gap-2"
                  >
                    <Send size={14} />
                    <span>Send Message</span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-100 text-center text-xs text-slate-600 rounded-lg font-bold">
                This support ticket has been closed.
              </div>
            )}
          </CleanCard>
        </div>
      </Container>
    </div>
  );
}
