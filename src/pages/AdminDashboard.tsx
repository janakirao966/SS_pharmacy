import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { 
  AdminLayout 
} from '../components/admin/AdminLayout';
import { 
  AdminStatCard, 
  AdminAttentionItem, 
  AdminCard, 
  AdminQuickAction, 
  AdminStatusBadge, 
  AdminDataTable, 
  AdminMobileRecord, 
  AdminSkeleton 
} from '../components/admin/AdminPrimitives';
import { 
  Coins, 
  ShoppingBag, 
  Receipt, 
  ChatCircleText, 
  Handshake, 
  Calendar,
  Plus,
  Envelope,
  UserCheck,
  FileText,
  Warning
} from '@phosphor-icons/react';

type DateFilter = 'today' | '7days' | '30days' | 'this_month';

interface DashboardStats {
  revenue: number;
  ordersCount: number;
  aov: number;
  enquiriesCount: number;
  leadsCount: number;
  attentionItems: {
    pendingOrders: number;
    unreadEnquiries: number;
    pendingDistributors: number;
  };
}

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    ordersCount: 0,
    aov: 0,
    enquiriesCount: 0,
    leadsCount: 0,
    attentionItems: { pendingOrders: 0, unreadEnquiries: 0, pendingDistributors: 0 }
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<any[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Set timestamp filter values based on selection
      let dateString = '';
      const now = new Date();
      if (dateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateString = today.toISOString();
      } else if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateString = sevenDaysAgo.toISOString();
      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateString = thirtyDaysAgo.toISOString();
      } else if (dateFilter === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateString = startOfMonth.toISOString();
      }

      // 1. Fetch Orders within date filter
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateString) {
        ordersQuery = ordersQuery.gte('created_at', dateString);
      }

      const { data: orderData, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // 2. Fetch Distributor Applications within date filter
      let leadsQuery = supabase
        .from('distributor_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateString) {
        leadsQuery = leadsQuery.gte('created_at', dateString);
      }

      const { data: applicationData, error: applicationsError } = await leadsQuery;
      if (applicationsError) throw applicationsError;

      // 3. Process metrics
      const activeOrders = orderData || [];
      const activeApplications = applicationData || [];

      // Calculate paid order metrics (schema compliant: payment_status = 'paid')
      const paidOrders = activeOrders.filter(o => o.payment_status === 'paid');
      const revenueVal = paidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const paidCount = paidOrders.length;
      const averageValue = paidCount > 0 ? Math.round(revenueVal / paidCount) : 0;

      // Separate Enquiries vs. Distributor Leads
      // Enquiries are where company_name starts with 'Enquiry:' or is 'General Contact Enquiry'
      const enquiries = activeApplications.filter(a => 
        a.company_name.startsWith('Enquiry:') || a.company_name === 'General Contact Enquiry'
      );
      const distributorLeads = activeApplications.filter(a => 
        !a.company_name.startsWith('Enquiry:') && a.company_name !== 'General Contact Enquiry'
      );

      // 4. Process Attention Required totals (non-fabricated, actual database checks)
      const pendingOrdersCount = activeOrders.filter(o => o.order_status === 'new').length;
      const unreadEnquiriesCount = enquiries.filter(e => e.status === 'new').length;
      const pendingDistributorsCount = distributorLeads.filter(d => d.status === 'new' || d.status === 'under_review').length;

      setStats({
        revenue: revenueVal,
        ordersCount: activeOrders.length,
        aov: averageValue,
        enquiriesCount: enquiries.length,
        leadsCount: distributorLeads.length,
        attentionItems: {
          pendingOrders: pendingOrdersCount,
          unreadEnquiries: unreadEnquiriesCount,
          pendingDistributors: pendingDistributorsCount
        }
      });

      // Save recent items
      setRecentOrders(activeOrders.slice(0, 5));
      setRecentEnquiries(enquiries.slice(0, 5));
      setRecentLeads(distributorLeads.slice(0, 5));

    } catch (err: any) {
      console.error('Failed to load dashboard statistics:', err);
      setError('Unable to compile operational metrics. Please check Supabase connectivity.');
      showToast('Error syncing dashboard metrics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div className="skeleton-pulse w-48 h-8 rounded-lg" />
            <div className="skeleton-pulse w-32 h-10 rounded-lg" />
          </div>
          <AdminSkeleton type="kpi" />
          <AdminSkeleton type="table" rows={4} />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <AdminCard className="admin-error-boundary">
          <div className="admin-error-content text-center py-12">
            <Warning size={48} className="text-[#B91C1C] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1D3A28] font-display">Operational Failure</h2>
            <p className="text-sm text-[#B91C1C] mt-2 font-medium">{error}</p>
            <button 
              type="button" 
              onClick={fetchDashboardData} 
              className="admin-btn-primary mt-6"
            >
              Retry Sync
            </button>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  // Define table render arrays
  const ordersColumns = [
    { header: 'Order #', render: (o: any) => <span className="font-mono font-bold text-[#1D3A28]">{o.order_number}</span> },
    { header: 'Customer', render: (o: any) => <span>{o.customer_name}</span> },
    { header: 'Method', render: (o: any) => <span className="uppercase text-[10px] font-bold text-slate-500">{o.payment_method.replace('online_razorpay', 'razorpay')}</span> },
    { header: 'Amount', render: (o: any) => <span className="font-mono font-semibold">₹{o.total_amount}</span> },
    { header: 'Status', render: (o: any) => <AdminStatusBadge status={o.order_status} /> }
  ];

  const enquiriesColumns = [
    { header: 'Person', render: (e: any) => <span className="font-bold text-[#1D3A28]">{e.contact_person}</span> },
    { header: 'Location', render: (e: any) => <span>{e.city}</span> },
    { header: 'Contact', render: (e: any) => <span className="text-slate-500 font-mono text-[11px]">{e.phone}</span> },
    { header: 'Date', render: (e: any) => <span className="text-[10px] font-medium text-slate-400">{new Date(e.created_at).toLocaleDateString('en-IN')}</span> },
    { header: 'Status', render: (e: any) => <AdminStatusBadge status={e.status} /> }
  ];

  const leadsColumns = [
    { header: 'Company', render: (l: any) => <span className="font-bold text-[#1D3A28]">{l.company_name}</span> },
    { header: 'Person', render: (l: any) => <span>{l.contact_person}</span> },
    { header: 'Location', render: (l: any) => <span>{l.city}</span> },
    { header: 'Expected Vol.', render: (l: any) => <span className="font-medium text-slate-600">{l.expected_monthly_volume || 'N/A'}</span> },
    { header: 'Status', render: (l: any) => <AdminStatusBadge status={l.status} /> }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Header Block & Date Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xs text-[#8A6B29] font-bold uppercase tracking-widest">S.S. Pharmacy</h2>
            <h1 className="text-2xl font-bold font-display text-[#1D3A28] mt-0.5">Control Center Overview</h1>
          </div>

          <div className="flex items-center gap-2 bg-[#FEFDF8] border border-[#E8E2D5] px-3 py-1.5 rounded-xl">
            <Calendar size={16} className="text-[#8A6B29]" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="text-xs font-bold text-[#1D3A28] bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        {/* 5-KPI PRIMARY SYSTEM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <AdminStatCard
            label="Revenue"
            value={`₹${stats.revenue.toLocaleString('en-IN')}`}
            subtext="Paid transactions"
            icon={<Coins size={22} />}
          />
          <AdminStatCard
            label="Orders"
            value={stats.ordersCount}
            subtext="Placed orders count"
            icon={<ShoppingBag size={22} />}
            actionUrl="/admin/orders"
            actionLabel="View orders"
          />
          <AdminStatCard
            label="Average Order Value"
            value={`₹${stats.aov.toLocaleString('en-IN')}`}
            subtext="Per paid receipt"
            icon={<Receipt size={22} />}
          />
          <AdminStatCard
            label="Enquiries"
            value={stats.enquiriesCount}
            subtext="Contact submissions"
            icon={<ChatCircleText size={22} />}
            actionUrl="/admin/enquiries"
            actionLabel="View messages"
          />
          <AdminStatCard
            label="Distributor Leads"
            value={stats.leadsCount}
            subtext="Partner applications"
            icon={<Handshake size={22} />}
            actionUrl="/admin/distributors"
            actionLabel="View applications"
          />
        </div>

        {/* ATTENTION REQUIRED & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attention Required Card */}
          <AdminCard className="lg:col-span-2 flex flex-col" topAccent={true} accentColor="#B91C1C">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Needs Attention</h3>
            <div className="divide-y divide-slate-100 flex-1">
              {stats.attentionItems.pendingOrders > 0 && (
                <AdminAttentionItem
                  label={`${stats.attentionItems.pendingOrders} orders awaiting confirmation`}
                  actionUrl="/admin/orders?status=new"
                  badgeText="New"
                  badgeType="warning"
                />
              )}
              {stats.attentionItems.unreadEnquiries > 0 && (
                <AdminAttentionItem
                  label={`${stats.attentionItems.unreadEnquiries} unread enquiries waiting for review`}
                  actionUrl="/admin/enquiries?status=new"
                  badgeText="Unread"
                  badgeType="info"
                />
              )}
              {stats.attentionItems.pendingDistributors > 0 && (
                <AdminAttentionItem
                  label={`${stats.attentionItems.pendingDistributors} distributor applications pending approval`}
                  actionUrl="/admin/distributors?status=new"
                  badgeText="Under Review"
                  badgeType="warning"
                />
              )}
              {stats.attentionItems.pendingOrders === 0 && 
               stats.attentionItems.unreadEnquiries === 0 && 
               stats.attentionItems.pendingDistributors === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                  ✓ Everything has been processed. No attention required.
                </div>
              )}
            </div>
          </AdminCard>

          {/* Quick Actions Card */}
          <AdminCard>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <AdminQuickAction
                title="Add New Product"
                description="Draft product in Catalog"
                icon={<Plus size={16} weight="bold" />}
                url="/admin/products/new"
              />
              <AdminQuickAction
                title="Pending Enquiries"
                description="Respond to contact logs"
                icon={<Envelope size={16} />}
                url="/admin/enquiries"
              />
              <AdminQuickAction
                title="Review Distributors"
                description="Assess wholesale applications"
                icon={<UserCheck size={16} />}
                url="/admin/distributors"
              />
              <AdminQuickAction
                title="Edit Homepage"
                description="Manage landing slider"
                icon={<FileText size={16} />}
                url="/admin/content"
              />
            </div>
          </AdminCard>
        </div>

        {/* RECENT OPERATIONAL LOGS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders Grid */}
          <AdminCard>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D3A28]">Recent Orders</h3>
              <Link to="/admin/orders" className="text-xs font-bold text-[#8A6B29] hover:underline">View All</Link>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No orders recorded in this range.</div>
              ) : (
                <AdminDataTable
                  columns={ordersColumns}
                  data={recentOrders}
                  keyExtractor={(o) => o.id}
                  onRowClick={(o) => window.location.href = `/admin/orders/${o.id}`}
                />
              )}
            </div>

            {/* Mobile Stacked Record View */}
            <div className="sm:hidden space-y-3">
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No orders recorded in this range.</div>
              ) : (
                recentOrders.map((o) => (
                  <AdminMobileRecord
                    key={o.id}
                    title={o.order_number}
                    subtitle={o.customer_name}
                    meta={`₹${o.total_amount} • ${o.payment_method.replace('online_razorpay', 'razorpay').toUpperCase()}`}
                    badge={<AdminStatusBadge status={o.order_status} />}
                    actionUrl={`/admin/orders/${o.id}`}
                  />
                ))
              )}
            </div>
          </AdminCard>

          {/* Recent Enquiries Grid */}
          <AdminCard>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D3A28]">Recent Enquiries</h3>
              <Link to="/admin/enquiries" className="text-xs font-bold text-[#8A6B29] hover:underline">View All</Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              {recentEnquiries.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No enquiries recorded in this range.</div>
              ) : (
                <AdminDataTable
                  columns={enquiriesColumns}
                  data={recentEnquiries}
                  keyExtractor={(e) => e.id}
                  onRowClick={(e) => window.location.href = `/admin/enquiries/${e.id}`}
                />
              )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {recentEnquiries.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No enquiries recorded in this range.</div>
              ) : (
                recentEnquiries.map((e) => (
                  <AdminMobileRecord
                    key={e.id}
                    title={e.contact_person}
                    subtitle={e.city}
                    meta={e.phone}
                    badge={<AdminStatusBadge status={e.status} />}
                    actionUrl={`/admin/enquiries/${e.id}`}
                  />
                ))
              )}
            </div>
          </AdminCard>

          {/* Recent Distributor Applications */}
          <AdminCard className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D3A28]">Recent Distributor Applications</h3>
              <Link to="/admin/distributors" className="text-xs font-bold text-[#8A6B29] hover:underline">View All</Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              {recentLeads.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No B2B applications received in this range.</div>
              ) : (
                <AdminDataTable
                  columns={leadsColumns}
                  data={recentLeads}
                  keyExtractor={(l) => l.id}
                  onRowClick={(l) => window.location.href = `/admin/distributors/${l.id}`}
                />
              )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {recentLeads.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No B2B applications received in this range.</div>
              ) : (
                recentLeads.map((l) => (
                  <AdminMobileRecord
                    key={l.id}
                    title={l.company_name}
                    subtitle={l.contact_person}
                    meta={`${l.city} • Vol: ${l.expected_monthly_volume || 'N/A'}`}
                    badge={<AdminStatusBadge status={l.status} />}
                    actionUrl={`/admin/distributors/${l.id}`}
                  />
                ))
              )}
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
}
