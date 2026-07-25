import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { Headset, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';

export default function AdminSupport() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'OPEN' | 'SAFETY_REVIEW' | 'URGENT' | 'UNASSIGNED' | 'RESOLVED'>('ALL');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, orders(order_number)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Fetch tickets error:', err);
      showToast('Failed to load support tickets from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTickets = tickets.filter(t => {
    const tNum = t.ticket_number || '';
    const custName = t.customer_name || '';
    const custEmail = t.customer_email || '';
    const custPhone = t.customer_phone || '';
    const orderNo = t.orders?.order_number || '';

    const matchesSearch = tNum.toLowerCase().includes(search.toLowerCase()) ||
                          custName.toLowerCase().includes(search.toLowerCase()) ||
                          custEmail.toLowerCase().includes(search.toLowerCase()) ||
                          custPhone.includes(search) ||
                          orderNo.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'OPEN') return t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_for_internal';
    if (filterTab === 'SAFETY_REVIEW') return t.requires_safety_review;
    if (filterTab === 'URGENT') return t.priority === 'urgent';
    if (filterTab === 'UNASSIGNED') return !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved';
    if (filterTab === 'RESOLVED') return t.status === 'resolved' || t.status === 'closed';
    return true;
  });

  const countOpen = tickets.filter(t => t.status === 'open' || t.status === 'assigned' || t.status === 'waiting_for_internal').length;
  const countUrgent = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length;
  const countSafety = tickets.filter(t => t.requires_safety_review && t.status !== 'closed').length;
  const countUnassigned = tickets.filter(t => !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved').length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <Headset size={28} className="text-[#C5A059]" />
              <span>Customer Service Desk & Support Center</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Order issues, product complaints, pharmaceutical safety reviews, and customer inquiries.
            </p>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AdminCard className="bg-amber-50/70 border-l-4 border-l-amber-600">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Open Cases</span>
            <span className="text-2xl font-bold font-mono text-amber-900">{countOpen}</span>
          </AdminCard>

          <AdminCard className="bg-red-50/70 border-l-4 border-l-red-600">
            <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">Urgent Priority</span>
            <span className="text-2xl font-bold font-mono text-red-900">{countUrgent}</span>
          </AdminCard>

          <AdminCard className="bg-purple-50/70 border-l-4 border-l-purple-600">
            <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Safety Reviews</span>
            <span className="text-2xl font-bold font-mono text-purple-950">{countSafety}</span>
          </AdminCard>

          <AdminCard className="bg-blue-50/70 border-l-4 border-l-blue-600">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Unassigned Cases</span>
            <span className="text-2xl font-bold font-mono text-blue-900">{countUnassigned}</span>
          </AdminCard>
        </div>

        {/* Search & Filter Pills */}
        <AdminCard className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Ticket #, Name, Phone, Email, or Order #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {(['ALL', 'OPEN', 'SAFETY_REVIEW', 'URGENT', 'UNASSIGNED', 'RESOLVED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors min-h-[36px] ${
                    filterTab === tab
                      ? 'bg-[#1D3A28] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </AdminCard>

        {/* Tickets Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredTickets.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <CheckCircle size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Support Tickets Found</h3>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Ticket Number</th>
                    <th>Customer Info</th>
                    <th>Category & Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Safety Review</th>
                    <th>Created At</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => (
                    <tr key={t.id}>
                      <td className="font-mono font-bold text-[#1D3A28]">{t.ticket_number}</td>
                      <td>
                        <div className="font-bold">{t.customer_name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{t.customer_email || t.customer_phone}</div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded uppercase block w-max mb-1">
                          {t.category.replace('_', ' ')}
                        </span>
                        <span className="font-medium text-slate-800 line-clamp-1">{t.subject}</span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          t.priority === 'urgent' ? 'bg-red-100 text-red-800 border border-red-300' :
                          t.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          t.status === 'open' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          t.status === 'closed' ? 'bg-slate-100 text-slate-600' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {t.requires_safety_review ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 rounded uppercase">
                            FLAGGED
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="font-mono text-[11px] text-slate-500">
                        {new Date(t.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/admin/support/${t.ticket_number}`}
                          className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-3 py-1.5 text-[11px] font-bold rounded shadow-sm inline-block min-h-[36px]"
                        >
                          Manage Case
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminLayout>
  );
}
