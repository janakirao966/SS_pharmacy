import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  RefreshCw, 
  Filter, 
  Search, 
  TrendingUp, 
  ShoppingBag, 
  CreditCard, 
  ChevronDown,
  Inbox,
  Building2
} from 'lucide-react';
import { AdminLayout } from '../components/admin/AdminLayout';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { supabase, type DatabaseOrder } from '../lib/supabase';

interface B2BLead {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin?: string;
  city: string;
  state: string;
  expected_monthly_volume?: string;
  status: 'new' | 'under_review' | 'contacted' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('ssp-admin-auth') === 'true';
  });
  const [activeTab, setActiveTab] = useState<'orders' | 'inquiries'>('orders');
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [leads, setLeads] = useState<B2BLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Check session storage for admin login & fetch data
  useEffect(() => {
    const isAuth = sessionStorage.getItem('ssp-admin-auth') === 'true';
    if (isAuth) {
      if (!authenticated) setAuthenticated(true);
      fetchData();
    }
  }, [authenticated]);

  // 400ms Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Orders
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderData && orderData.length > 0) {
        setOrders(orderData as DatabaseOrder[]);
      } else {
        // Mock data fallback if Supabase table is empty
        setOrders([
          {
            id: '1',
            order_number: 'SSP-1001',
            customer_name: 'Ravi Kumar',
            customer_phone: '9876543210',
            customer_email: 'ravi@example.com',
            shipping_address: 'Door 4/12, Main Bazaar, Kadapa Road',
            city: 'Yerraguntla',
            state: 'Andhra Pradesh',
            pincode: '516309',
            subtotal: 2999,
            delivery_charge: 0,
            total_amount: 2999,
            payment_method: 'online_razorpay',
            payment_status: 'paid',
            order_status: 'new',
            razorpay_payment_id: 'pay_Pxl91823910',
            created_at: new Date().toISOString()
          }
        ]);
      }

      // Fetch B2B Distributor Inquiries
      const { data: leadData } = await supabase
        .from('distributor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadData && leadData.length > 0) {
        setLeads(leadData as B2BLead[]);
      } else {
        setLeads([
          {
            id: 'b1',
            company_name: 'Venkateswara Pharma Distributors',
            contact_person: 'Venkatesh Rao',
            phone: '9494323211',
            email: 'venkatesh@vpharma.com',
            gstin: '37AAAAA0000A1Z5',
            city: 'Tirupati',
            state: 'Andhra Pradesh',
            expected_monthly_volume: '500-1000 Units',
            status: 'new',
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string, 
    field: 'order_status' | 'payment_status', 
    newValue: string
  ) => {
    try {
      await supabase
        .from('orders')
        .update({ [field]: newValue })
        .eq('id', orderId);

      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, [field]: newValue } : o))
      );
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: B2BLead['status']) => {
    try {
      await supabase
        .from('distributor_applications')
        .update({ status: newStatus })
        .eq('id', leadId);

      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      console.error('Lead update error:', err);
    }
  };

  // Filtered orders using debounced search and status tabs
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      !debouncedSearch ||
      o.order_number.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer_phone.includes(debouncedSearch);

    const matchesStatus = filterStatus === 'all' || o.order_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate Primetek-style KPI Metrics
  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const activeOrdersCount = orders.filter(o => o.order_status === 'new' || o.order_status === 'preparing').length;
  const paidOrdersCount = orders.filter(o => o.payment_status === 'paid').length;
  const pendingLeadsCount = leads.filter(l => l.status === 'new' || l.status === 'under_review').length;

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout>
      <SEO title="Admin Dashboard | S.S. PHARMACY" description="Administrative order fulfillment and distributor lead portal." />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#1D3A28]">Store & Operations Overview</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time order fulfillment, live status updates, and distributor lead manager.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} className="text-xs flex items-center gap-1.5 border-slate-300">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Portal</span>
            </Button>
          </div>
        </div>

        {/* ─── PRIMETEK-STYLE HIGH-DENSITY MICRO KPI CARDS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FEFDF8] rounded-2xl p-4 border border-[#C5A059]/30 shadow-sm relative overflow-hidden group hover:border-[#1D3A28] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-[#2D5016]/10 text-[#2D5016] flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1D3A28] font-mono">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-[#2D5016] font-semibold mt-1 inline-block">Paid transactions</span>
          </div>

          <div className="bg-[#FEFDF8] rounded-2xl p-4 border border-[#C5A059]/30 shadow-sm relative overflow-hidden group hover:border-[#1D3A28] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Orders</span>
              <div className="w-8 h-8 rounded-xl bg-[#1D3A28]/10 text-[#1D3A28] flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1D3A28] font-mono">
              {activeOrdersCount}
              {activeOrdersCount > 0 && <span className="inline-block w-2 h-2 rounded-full bg-[#2D5016] animate-pulse ml-1.5" />}
            </p>
            <span className="text-[10px] text-slate-500 font-semibold mt-1 inline-block">New & Preparing</span>
          </div>

          <div className="bg-[#FEFDF8] rounded-2xl p-4 border border-[#C5A059]/30 shadow-sm relative overflow-hidden group hover:border-[#1D3A28] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid Orders</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1D3A28] font-mono">{paidOrdersCount}</p>
            <span className="text-[10px] text-blue-600 font-semibold mt-1 inline-block">Verified payments</span>
          </div>

          <div className="bg-[#FEFDF8] rounded-2xl p-4 border border-[#C5A059]/30 shadow-sm relative overflow-hidden group hover:border-[#1D3A28] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">B2B Leads</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Inbox size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1D3A28] font-mono">{pendingLeadsCount}</p>
            <span className="text-[10px] text-amber-700 font-semibold mt-1 inline-block">Distributor requests</span>
          </div>
        </div>

        {/* Navigation Tabs (Orders vs B2B Inquiries) */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-[#1D3A28] text-[#1D3A28]'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <ShoppingBag size={18} />
            <span>Customer Orders ({filteredOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'inquiries'
                ? 'border-[#1D3A28] text-[#1D3A28]'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building2 size={18} />
            <span>Distributor B2B Applications ({leads.length})</span>
          </button>
        </div>

        {/* ─── ORDERS SECTION ─── */}
        {activeTab === 'orders' && (
          <div className="bg-[#FEFDF8] border border-[#C5A059]/30 rounded-2xl p-6 shadow-md space-y-6">
            {/* Search Bar & Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              {/* 400ms Debounced Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by Order #, Customer Name, or Phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#1D3A28]"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Filter size={14} className="text-[#8A6B29] mr-1" />
                {['all', 'new', 'preparing', 'shipped', 'delivered', 'cancelled'].map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${
                      filterStatus === st
                        ? 'bg-[#1D3A28] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* BSR-Style Expandable Order Accordion */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No orders found matching criteria.
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                    {/* Header Row */}
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      className="w-full p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-sm font-bold font-mono text-[#1D3A28] block">{order.order_number}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{order.customer_name}</span>
                          <span className="text-[11px] text-slate-500">{order.customer_phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.payment_status === 'paid' ? 'bg-[#2D5016]/10 text-[#2D5016]' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.payment_status}
                        </span>

                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                          {order.order_status}
                        </span>

                        <span className="text-sm font-bold text-[#1D3A28] font-mono">₹{order.total_amount}</span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {/* Accordion Expanded Detail Body */}
                    {expandedOrderId === order.id && (
                      <div className="p-5 border-t border-slate-100 bg-[#FAF7F2] space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                          <div>
                            <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Customer Info</span>
                            <p className="font-semibold text-slate-800">{order.customer_name}</p>
                            <p className="text-slate-600">📞 {order.customer_phone}</p>
                            {order.customer_email && <p className="text-slate-600">✉️ {order.customer_email}</p>}
                          </div>

                          <div>
                            <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Shipping Address</span>
                            <p className="text-slate-700">{order.shipping_address}</p>
                            <p className="text-slate-600">{order.city}, {order.state} - {order.pincode}</p>
                          </div>

                          <div>
                            <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Payment Method</span>
                            <p className="font-semibold text-slate-800 uppercase">{order.payment_method}</p>
                            {order.razorpay_payment_id && (
                              <p className="text-[10px] font-mono text-slate-500 mt-1">ID: {order.razorpay_payment_id}</p>
                            )}
                          </div>
                        </div>

                        {/* Live Dropdown Status Selectors */}
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <div className="flex items-center gap-2">
                            <label className="font-bold text-slate-600 text-[11px] uppercase">Order Status:</label>
                            <select
                              value={order.order_status}
                              onChange={e => handleUpdateOrderStatus(order.id, 'order_status', e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:border-[#1D3A28]"
                            >
                              <option value="new">New</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="preparing">Preparing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="font-bold text-slate-600 text-[11px] uppercase">Payment Status:</label>
                            <select
                              value={order.payment_status}
                              onChange={e => handleUpdateOrderStatus(order.id, 'payment_status', e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:border-[#1D3A28]"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="cod_pending">COD Pending</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── DISTRIBUTOR B2B LEADS SECTION ─── */}
        {activeTab === 'inquiries' && (
          <div className="bg-[#FEFDF8] border border-[#C5A059]/30 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A6B29]">Wholesale & Distributor Applications</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#FAF7F2] text-[#1D3A28] uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">City / State</th>
                    <th className="py-3 px-4">Expected Volume</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#1D3A28]">{lead.company_name}</td>
                      <td className="py-3.5 px-4 font-medium">{lead.contact_person}</td>
                      <td className="py-3.5 px-4">{lead.phone}</td>
                      <td className="py-3.5 px-4">{lead.city}, {lead.state}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{lead.expected_monthly_volume || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={lead.status}
                          onChange={e => handleUpdateLeadStatus(lead.id, e.target.value as B2BLead['status'])}
                          className="px-2.5 py-1 rounded border border-slate-300 text-[11px] bg-white"
                        >
                          <option value="new">New</option>
                          <option value="under_review">Under Review</option>
                          <option value="contacted">Contacted</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
