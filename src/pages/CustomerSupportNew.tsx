import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import Container from '../components/layout/Container';
import CleanCard from '../components/cards/CleanCard';
import Button from '../components/ui/Button';
import SEO from '../components/ui/SEO';
import { ArrowLeft, Send } from 'lucide-react';

export default function CustomerSupportNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'GENERAL',
    order_id: '',
    subject: '',
    description: '',
    priority: 'normal'
  });

  useEffect(() => {
    const fetchUserAndOrders = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setFormData(prev => ({
          ...prev,
          name: userData.user.user_metadata?.full_name || 'Valued Customer',
          email: userData.user.email || '',
          phone: userData.user.user_metadata?.phone || ''
        }));

        const { data: orderData } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, created_at')
          .order('created_at', { ascending: false });

        setOrders(orderData || []);
      }
    };
    fetchUserAndOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      showToast('Subject and description are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_customer_name: formData.name.trim() || 'Valued Customer',
        p_customer_email: formData.email.trim(),
        p_customer_phone: formData.phone.trim(),
        p_category: formData.category,
        p_subject: formData.subject.trim(),
        p_description: formData.description.trim(),
        p_order_id: formData.order_id || null,
        p_priority: formData.priority,
        p_source: 'customer_account'
      });

      if (error || !data?.success) throw new Error(error?.message || 'Submission failed');

      showToast(`Support Ticket #${data.ticket_number} created successfully!`, 'success');
      navigate('/account/support');
    } catch (err: any) {
      console.error('Create ticket error:', err);
      showToast(err.message || 'Failed to submit support ticket.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FEFDF8] min-h-screen py-12">
      <SEO title="Submit Support Ticket - S.S. PHARMACY" description="Create a new customer support ticket for order, delivery, or product quality assistance." />
      <Container>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link to="/account/support" className="inline-flex items-center gap-1 text-xs text-[#2D5016] font-bold hover:underline">
            <ArrowLeft size={14} /> Back to Support Center
          </Link>

          <CleanCard className="p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold font-display text-[#1D3A28]">Submit Support Request</h1>
              <p className="text-xs text-slate-500 mt-1">Please provide details regarding your inquiry or issue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="GENERAL">General Inquiry</option>
                    <option value="ORDER">Order Issue</option>
                    <option value="DELIVERY">Delivery / Shipment Issue</option>
                    <option value="PAYMENT">Payment Issue</option>
                    <option value="PRODUCT">Product Specification</option>
                    <option value="DAMAGED_PRODUCT">Damaged Packaging / Product</option>
                    <option value="WRONG_PRODUCT">Wrong Item Received</option>
                    <option value="QUALITY_CONCERN">Quality Concern</option>
                    <option value="SAFETY_CONCERN">Adverse Reaction / Safety Report</option>
                    <option value="RETURN">Return Request</option>
                    <option value="REFUND">Refund Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Related Order (Optional)</label>
                  <select
                    value={formData.order_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_id: e.target.value }))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">No Order Selected</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        Order #{o.order_number} (₹{o.total_amount})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of your inquiry..."
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe your issue, order details, or product concerns..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#2D5016] text-white font-bold px-6 py-2.5 text-xs flex items-center gap-2"
                >
                  <Send size={14} />
                  <span>{loading ? 'Submitting...' : 'Submit Support Request'}</span>
                </Button>
              </div>
            </form>
          </CleanCard>
        </div>
      </Container>
    </div>
  );
}
