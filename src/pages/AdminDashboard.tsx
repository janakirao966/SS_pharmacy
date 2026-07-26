import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    confirmedOrders: number;
    processingOrders: number;
    packedOrders: number;
    shippedOrders: number;
    outForDeliveryOrders: number;
    unreadEnquiries: number;
    pendingDistributors: number;
  };
}

export default function AdminDashboard() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [stats, setStats] = useState<DashboardStats>({
    revenue: 0,
    ordersCount: 0,
    aov: 0,
    enquiriesCount: 0,
    leadsCount: 0,
    attentionItems: { 
      pendingOrders: 0, 
      confirmedOrders: 0,
      processingOrders: 0,
      packedOrders: 0,
      shippedOrders: 0,
      outForDeliveryOrders: 0,
      unreadEnquiries: 0, 
      pendingDistributors: 0 
    }
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
      const enquiries = activeApplications.filter(a => 
        a.company_name.startsWith('Enquiry:') || a.company_name === 'General Contact Enquiry'
      );
      const distributorLeads = activeApplications.filter(a => 
        !a.company_name.startsWith('Enquiry:') && a.company_name !== 'General Contact Enquiry'
      );

      // 4. Process Attention Required totals
      const pendingOrdersCount = activeOrders.filter(o => o.order_status === 'new').length;
      const confirmedOrdersCount = activeOrders.filter(o => o.order_status === 'confirmed').length;
      const processingOrdersCount = activeOrders.filter(o => o.order_status === 'processing').length;
      const packedOrdersCount = activeOrders.filter(o => o.order_status === 'packed').length;
      const shippedOrdersCount = activeOrders.filter(o => o.order_status === 'shipped').length;
      const outForDeliveryOrdersCount = activeOrders.filter(o => o.order_status === 'out_for_delivery').length;

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
          confirmedOrders: confirmedOrdersCount,
          processingOrders: processingOrdersCount,
          packedOrders: packedOrdersCount,
          shippedOrders: shippedOrdersCount,
          outForDeliveryOrders: outForDeliveryOrdersCount,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-[#e4e4e7]">
            <div className="skeleton-pulse w-36 h-6 rounded-md" />
            <div className="skeleton-pulse w-32 h-9 rounded-md" />
          </div>
          <AdminSkeleton type="kpi" />
          <AdminSkeleton type="table" rows={5} />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <AdminCard className="admin-error-boundary">
          <div className="admin-error-content text-center py-12">
            <Warning size={44} className="text-[#dc2626] mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#000000]">Operational Failure</h2>
            <p className="text-xs text-[#71717a] mt-1.5 font-medium max-w-md mx-auto">{error}</p>
            <button 
              type="button" 
              onClick={fetchDashboardData} 
              className="admin-btn-primary mt-5"
            >
              Retry Operational Sync
            </button>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  // Define table render arrays
  const ordersColumns = [
    { header: 'Order #', render: (o: any) => <span className="font-mono font-semibold text-[#000000]">{o.order_number}</span> },
    { header: 'Customer', render: (o: any) => <span className="font-medium text-[#000000]">{o.customer_name}</span> },
    { header: 'Method', render: (o: any) => <span className="uppercase text-[0.65rem] font-semibold text-[#71717a]">{o.payment_method.replace('online_razorpay', 'razorpay')}</span> },
    { header: 'Amount', render: (o: any) => <span className="font-mono font-semibold text-[#000000]">₹{o.total_amount?.toLocaleString('en-IN')}</span> },
    { header: 'Status', render: (o: any) => <AdminStatusBadge status={o.order_status} /> }
  ];

  const enquiriesColumns = [
    { header: 'Person', render: (e: any) => <span className="font-semibold text-[#000000]">{e.contact_person}</span> },
    { header: 'Location', render: (e: any) => <span className="text-[#71717a]">{e.city}</span> },
    { header: 'Contact', render: (e: any) => <span className="text-[#71717a] font-mono text-[0.75rem]">{e.phone}</span> },
    { header: 'Date', render: (e: any) => <span className="text-[0.7rem] font-medium text-[#71717a]">{new Date(e.created_at).toLocaleDateString('en-IN')}</span> },
    { header: 'Status', render: (e: any) => <AdminStatusBadge status={e.status} /> }
  ];

  const leadsColumns = [
    { header: 'Company', render: (l: any) => <span className="font-semibold text-[#000000]">{l.company_name}</span> },
    { header: 'Person', render: (l: any) => <span className="text-[#000000]">{l.contact_person}</span> },
    { header: 'Location', render: (l: any) => <span className="text-[#71717a]">{l.city}</span> },
    { header: 'Expected Vol.', render: (l: any) => <span className="font-medium text-[#71717a]">{l.expected_monthly_volume || 'N/A'}</span> },
    { header: 'Status', render: (l: any) => <AdminStatusBadge status={l.status} /> }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Date Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e4e7]">
          <div>
            <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">Dashboard Overview</span>
            <p className="text-xs text-[#71717a] margin-0">Operational indicators & transaction logs</p>
          </div>

          <div className="flex items-center gap-2 bg-[#ffffff] border border-[#e4e4e7] px-3 py-1.5 rounded-lg min-h-[36px]">
            <Calendar size={15} className="text-[#71717a]" />
            <span className="text-xs text-[#71717a] font-medium">Period:</span>
            <select
              value={dateFilter}
              aria-label="Filter dashboard by time period"
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="text-xs font-semibold text-[#000000] bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        {/* 5-KPI PRIMARY GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <AdminStatCard
            label="Revenue"
            value={`₹${stats.revenue.toLocaleString('en-IN')}`}
            subtext="Paid receipts total"
            icon={<Coins size={18} />}
          />
          <AdminStatCard
            label="Orders"
            value={stats.ordersCount.toString()}
            subtext="Placed orders count"
            icon={<ShoppingBag size={18} />}
            actionUrl="/admin/orders"
            actionLabel="View orders"
          />
          <AdminStatCard
            label="Average Order Value"
            value={`₹${stats.aov.toLocaleString('en-IN')}`}
            subtext="Per paid order"
            icon={<Receipt size={18} />}
          />
          <AdminStatCard
            label="Enquiries"
            value={stats.enquiriesCount.toString()}
            subtext="Customer messages"
            icon={<ChatCircleText size={18} />}
            actionUrl="/admin/enquiries"
            actionLabel="View inbox"
          />
          <AdminStatCard
            label="Distributor Leads"
            value={stats.leadsCount.toString()}
            subtext="B2B partner applications"
            icon={<Handshake size={18} />}
            actionUrl="/admin/distributors"
            actionLabel="View leads"
          />
        </div>

        {/* ATTENTION REQUIRED & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Operational Status & Attention Card */}
          <AdminCard className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#f4f4f0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Operational Status & Attention</h3>
              <span className="text-[0.7rem] font-medium text-[#71717a]">Live Queue</span>
            </div>
            <div className="divide-y divide-[#f4f4f0] flex-1 grid grid-cols-1 gap-1">
              <AdminAttentionItem
                label={`${stats.attentionItems.pendingOrders} New Pending Orders`}
                actionUrl="/admin/orders"
                badgeText={stats.attentionItems.pendingOrders.toString()}
                badgeType={stats.attentionItems.pendingOrders > 0 ? "danger" : "neutral"}
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.confirmedOrders} Confirmed Orders`}
                actionUrl="/admin/orders"
                badgeText={stats.attentionItems.confirmedOrders.toString()}
                badgeType="warning"
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.processingOrders} Orders In Processing`}
                actionUrl="/admin/orders"
                badgeText={stats.attentionItems.processingOrders.toString()}
                badgeType="warning"
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.packedOrders} Packed Orders Ready`}
                actionUrl="/admin/orders"
                badgeText={stats.attentionItems.packedOrders.toString()}
                badgeType="success"
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.shippedOrders} Shipped Orders`}
                actionUrl="/admin/orders"
                badgeText={stats.attentionItems.shippedOrders.toString()}
                badgeType="success"
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.outForDeliveryOrders} Out For Delivery`}
                actionUrl="/admin/orders"
                badgeText={stats.attentionItems.outForDeliveryOrders.toString()}
                badgeType="info"
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.unreadEnquiries} Unread Customer Enquiries`}
                actionUrl="/admin/enquiries"
                badgeText={stats.attentionItems.unreadEnquiries.toString()}
                badgeType="warning"
              />
              <AdminAttentionItem
                label={`${stats.attentionItems.pendingDistributors} Pending Distributor Applications`}
                actionUrl="/admin/distributors"
                badgeText={stats.attentionItems.pendingDistributors.toString()}
                badgeType="warning"
              />
            </div>
          </AdminCard>

          {/* Quick Actions Shortcuts */}
          <AdminCard>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#f4f4f0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Quick Actions</h3>
              <span className="text-[0.7rem] text-[#71717a]">Shortcuts</span>
            </div>
            <div className="space-y-2.5">
              <AdminQuickAction
                title="Add New Product"
                description="Create draft in Catalog"
                icon={<Plus size={16} weight="bold" />}
                url="/admin/products/new"
              />
              <AdminQuickAction
                title="Customer Enquiries"
                description="Review pending inbox"
                icon={<Envelope size={16} />}
                url="/admin/enquiries"
              />
              <AdminQuickAction
                title="Distributor Applications"
                description="Evaluate partner leads"
                icon={<UserCheck size={16} />}
                url="/admin/distributors"
              />
              <AdminQuickAction
                title="CMS Site Content"
                description="Update homepage text & banners"
                icon={<FileText size={16} />}
                url="/admin/content"
              />
            </div>
          </AdminCard>
        </div>

        {/* RECENT OPERATIONAL LOGS TABLES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Orders Table */}
          <AdminCard>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#f4f4f0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#000000]">Recent Orders</h3>
              <Link to="/admin/orders" className="text-xs font-semibold text-[#000000] hover:underline">View All Orders ↗</Link>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] text-xs">No orders recorded in this time range.</div>
              ) : (
                <AdminDataTable
                  columns={ordersColumns}
                  data={recentOrders}
                  keyExtractor={(o) => o.id}
                  onRowClick={(o) => navigate(`/admin/orders/${o.id}`)}
                />
              )}
            </div>

            {/* Mobile Stacked Record View */}
            <div className="sm:hidden space-y-2.5">
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] text-xs">No orders recorded in this time range.</div>
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

          {/* Recent Enquiries Table */}
          <AdminCard>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#f4f4f0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#000000]">Recent Enquiries</h3>
              <Link to="/admin/enquiries" className="text-xs font-semibold text-[#000000] hover:underline">View Inbox ↗</Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              {recentEnquiries.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] text-xs">No enquiries recorded in this time range.</div>
              ) : (
                <AdminDataTable
                  columns={enquiriesColumns}
                  data={recentEnquiries}
                  keyExtractor={(e) => e.id}
                  onRowClick={(e) => navigate(`/admin/enquiries/${e.id}`)}
                />
              )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2.5">
              {recentEnquiries.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] text-xs">No enquiries recorded in this time range.</div>
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
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#f4f4f0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#000000]">Recent Distributor Applications</h3>
              <Link to="/admin/distributors" className="text-xs font-semibold text-[#000000] hover:underline">View All Leads ↗</Link>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              {recentLeads.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] text-xs">No B2B applications received in this time range.</div>
              ) : (
                <AdminDataTable
                  columns={leadsColumns}
                  data={recentLeads}
                  keyExtractor={(l) => l.id}
                  onRowClick={(l) => navigate(`/admin/distributors/${l.id}`)}
                />
              )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2.5">
              {recentLeads.length === 0 ? (
                <div className="py-8 text-center text-[#71717a] text-xs">No B2B applications received in this time range.</div>
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
