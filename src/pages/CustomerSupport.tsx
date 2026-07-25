import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type DatabaseSupportTicket } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import Container from '../components/layout/Container';
import CleanCard from '../components/cards/CleanCard';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { Headset, Plus, CheckCircle } from 'lucide-react';

export default function CustomerSupport() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<DatabaseSupportTicket[]>([]);

  const fetchCustomerTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_customer_support_tickets');
      if (error) throw error;
      setTickets(data?.tickets || []);
    } catch (err: any) {
      console.error('Fetch customer tickets error:', err);
      showToast('Failed to load your support cases.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-[#FEFDF8] min-h-screen py-12">
      <SEO title="Customer Support Center - S.S. PHARMACY" description="Manage your customer service tickets, order inquiries, and product support requests." />
      <Container>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold font-display text-[#1D3A28] flex items-center gap-2">
                <Headset className="text-[#C5A059]" />
                <span>Customer Support Center</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Track your active support cases, order inquiries, and product quality concerns.
              </p>
            </div>
            <Link to="/account/support/new">
              <Button className="bg-[#2D5016] text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm">
                <Plus size={16} />
                <span>Submit New Ticket</span>
              </Button>
            </Link>
          </div>

          {/* Ticket List */}
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-500">Loading your support tickets...</div>
          ) : tickets.length === 0 ? (
            <CleanCard className="text-center py-12 space-y-3">
              <CheckCircle size={48} className="text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Support Cases Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Need help with an order or product? Click below to submit a support ticket.
              </p>
              <Link to="/account/support/new" className="inline-block pt-2">
                <Button className="bg-[#2D5016] text-white text-xs font-bold px-4 py-2">
                  Create Support Request
                </Button>
              </Link>
            </CleanCard>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <CleanCard key={t.id} className="p-4 hover:border-[#C5A059] transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#1D3A28]">{t.ticket_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 uppercase text-slate-700">
                        {t.category.replace('_', ' ')}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase w-max ${
                      t.status === 'open' ? 'bg-amber-100 text-amber-800' :
                      t.status === 'waiting_for_customer' ? 'bg-blue-100 text-blue-800' :
                      t.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#1D3A28] mb-1">{t.subject}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{t.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Created: {new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                    <Link to={`/account/support/${t.ticket_number}`} className="text-[#2D5016] font-bold hover:underline">
                      View Discussion & Details →
                    </Link>
                  </div>
                </CleanCard>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
