import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminSkeleton } from '../components/admin/AdminPrimitives';
import { ArrowClockwise, MagnifyingGlass } from '@phosphor-icons/react';

export default function AdminReturns() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*, orders(order_number, customer_name, customer_phone, total_amount), return_items(*)')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setReturnsList(data || []);
    } catch (err: any) {
      console.error('Fetch returns error:', err);
      showToast('Failed to load returns list from Supabase.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const filteredReturns = returnsList.filter(r => {
    const returnNo = r.return_number || '';
    const orderNo = r.orders?.order_number || '';
    const custName = r.orders?.customer_name || '';

    const matchesSearch = returnNo.toLowerCase().includes(search.toLowerCase()) ||
                          orderNo.toLowerCase().includes(search.toLowerCase()) ||
                          custName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRequests = returnsList.length;
  const pendingReview = returnsList.filter(r => r.status === 'requested' || r.status === 'under_review').length;
  const inTransit = returnsList.filter(r => r.status === 'pickup_scheduled' || r.status === 'in_transit' || r.status === 'received').length;
  const awaitingInspection = returnsList.filter(r => r.status === 'inspection').length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-[#1D3A28] flex items-center gap-2">
              <ArrowClockwise size={28} className="text-[#C5A059]" />
              <span>Production Returns & Reverse Logistics</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage merchandise return requests, physical inspections, COD payouts, and GST Credit Notes.
            </p>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <AdminCard className="bg-[#FAF8F5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Return Requests</span>
            <span className="text-2xl font-bold font-mono text-[#1D3A28]">{totalRequests}</span>
          </AdminCard>

          <AdminCard className="bg-amber-50/60 border-l-4 border-l-amber-500">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Awaiting Review</span>
            <span className="text-2xl font-bold font-mono text-amber-900">{pendingReview}</span>
          </AdminCard>

          <AdminCard className="bg-blue-50/60 border-l-4 border-l-blue-500">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">In Reverse Transit</span>
            <span className="text-2xl font-bold font-mono text-blue-900">{inTransit}</span>
          </AdminCard>

          <AdminCard className="bg-purple-50/60 border-l-4 border-l-purple-500">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Awaiting Inspection</span>
            <span className="text-2xl font-bold font-mono text-purple-900">{awaitingInspection}</span>
          </AdminCard>
        </div>

        {/* Search & Filter */}
        <AdminCard className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Return #, Order #, or Customer Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs"
              >
                <option value="ALL">All Return Statuses</option>
                <option value="requested">Requested (New)</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="pickup_scheduled">Pickup Scheduled</option>
                <option value="in_transit">In Reverse Transit</option>
                <option value="received">Received at Warehouse</option>
                <option value="inspection">Under Inspection</option>
                <option value="inspection_completed">Inspection Completed</option>
                <option value="completed">Completed & Refunded</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </AdminCard>

        {/* Returns Table */}
        {loading ? (
          <AdminSkeleton type="table" rows={4} />
        ) : filteredReturns.length === 0 ? (
          <AdminCard>
            <div className="text-center py-12">
              <ArrowClockwise size={48} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-[#1D3A28]">No Return Requests Found</h3>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="p-0 overflow-hidden">
            <div className="admin-table-container overflow-x-auto">
              <table className="admin-data-table min-w-full text-xs">
                <thead>
                  <tr>
                    <th>Return Number</th>
                    <th>Order Details</th>
                    <th>Reason</th>
                    <th>Return Items</th>
                    <th>Status</th>
                    <th>Requested At</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-[#1D3A28]">{r.return_number}</td>
                      <td>
                        <div className="font-bold">{r.orders?.customer_name}</div>
                        <div className="font-mono text-[11px] text-slate-500">Order: #{r.orders?.order_number}</div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded uppercase">
                          {r.reason_code.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="font-mono text-slate-700">
                        {r.return_items?.length || 0} Item(s)
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          r.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                          r.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          r.status === 'completed' ? 'bg-green-100 text-green-800' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-slate-500">
                        {new Date(r.requested_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/admin/returns/${r.id}`}
                          className="bg-[#2D5016] hover:bg-[#1D3A28] text-white px-3 py-1 text-[11px] font-bold rounded shadow-sm inline-block"
                        >
                          Review Detail
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
