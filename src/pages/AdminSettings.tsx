import { useState, useEffect } from 'react';
import { supabase, type DatabaseTaxSettings } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard, AdminStatusBadge } from '../components/admin/AdminPrimitives';
import { AdminConfirmDialog } from '../components/admin/AdminConfirmDialog';
import { FloppyDisk, ShieldCheck, Warning, Receipt } from '@phosphor-icons/react';

export default function AdminSettings() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const [taxSettings, setTaxSettings] = useState<DatabaseTaxSettings>({
    id: '',
    tax_mode: 'UNCONFIGURED',
    configuration_status: 'UNCONFIGURED',
    legal_business_name: '',
    trade_name: 'S.S. PHARMACY',
    gstin: '',
    registered_address_line1: '',
    registered_address_line2: '',
    city: '',
    state: '',
    state_code: '',
    postal_code: '',
    country: 'India',
    invoice_prefix: 'SSP',
    credit_note_prefix: 'CN',
    pricing_tax_mode: 'TAX_INCLUSIVE',
    default_hsn_code: '',
    default_gst_rate: 12.00,
    delivery_gst_rate: 18.00,
    invoice_terms: 'Goods once sold are subject to S.S. PHARMACY terms.',
    support_email: 'support@sspharmacy.in',
    support_phone: '',
    updated_at: ''
  });

  const fetchTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_tax_settings')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        setTaxSettings(data as DatabaseTaxSettings);
      }
    } catch (err: any) {
      console.error('Fetch tax settings error:', err);
    }
  };

  useEffect(() => {
    fetchTaxSettings();
  }, []);

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...taxSettings,
        configuration_status: taxSettings.configuration_status === 'VERIFIED' ? 'VERIFIED' : 'DRAFT',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('business_tax_settings')
        .upsert(payload);

      if (error) throw error;

      showToast('System configuration saved successfully.', 'success');
      await fetchTaxSettings();
    } catch (err: any) {
      console.error('Save tax settings error:', err);
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVerify = async () => {
    setIsSubmitting(true);
    try {
      if (!taxSettings.legal_business_name || !taxSettings.registered_address_line1 || !taxSettings.state || !taxSettings.state_code) {
        showToast('Legal Business Name, Address, State, and State Code are required for verification.', 'error');
        setIsVerifyModalOpen(false);
        setIsSubmitting(false);
        return;
      }

      if (taxSettings.tax_mode === 'GST_REGISTERED' && !taxSettings.gstin) {
        showToast('GSTIN is mandatory when tax mode is set to GST Registered.', 'error');
        setIsVerifyModalOpen(false);
        setIsSubmitting(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      const payload = {
        ...taxSettings,
        configuration_status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        verified_by: userData.user?.id || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('business_tax_settings')
        .upsert(payload);

      if (error) throw error;

      showToast('Tax & business configuration verified. Production invoicing active.', 'success');
      setIsVerifyModalOpen(false);
      await fetchTaxSettings();
    } catch (err: any) {
      console.error('Verify tax settings error:', err);
      showToast(err.message || 'Failed to verify settings.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Title Header */}
        <div className="pb-3 border-b border-[#e4e4e7]">
          <span className="text-[0.7rem] font-semibold text-[#71717a] uppercase tracking-wider">System Settings & Configuration</span>
          <p className="text-xs text-[#71717a] margin-0">Ayurvedic manufacturing credentials, business details, tax rates, and document prefixes</p>
        </div>

        {/* Configuration Safety Gate Header Card */}
        <AdminCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4f4f0] pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <Receipt size={22} className="text-[#000000]" />
              <div>
                <h3 className="font-bold text-sm text-[#000000] m-0">Business & Tax Safety Gate</h3>
                <p className="text-xs text-[#71717a] m-0">Controls tax calculation rules and document generation for invoices & credit notes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#71717a]">Status:</span>
              <AdminStatusBadge status={taxSettings.configuration_status.toLowerCase()} />
            </div>
          </div>

          {taxSettings.configuration_status === 'UNCONFIGURED' && (
            <div className="p-3 bg-[#fbfbf5] border border-[#dc2626] rounded-xl flex items-center gap-2 text-xs text-[#dc2626]">
              <Warning size={18} className="shrink-0" />
              <span>Tax configuration is incomplete. Production invoice generation is blocked until verified settings are saved.</span>
            </div>
          )}
        </AdminCard>

        {/* Settings Form */}
        <form onSubmit={handleSaveDraft} className="space-y-5">
          {/* Section 1: Business Identity & Licensing */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">1. Business Identity & Ayurvedic Licensing</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Trade Name / Brand</label>
                <input
                  type="text"
                  value={taxSettings.trade_name || 'S.S. PHARMACY'}
                  onChange={(e) => setTaxSettings({ ...taxSettings, trade_name: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Legal Registered Entity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. S.S. PHARMACY Ayurvedic Pvt Ltd"
                  value={taxSettings.legal_business_name || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, legal_business_name: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-[#fbfbf5] border border-[#e4e4e7] rounded-lg text-xs font-mono">
              <span className="text-[0.68rem] font-semibold text-[#71717a] uppercase block font-sans">Licensed Manufacturing License</span>
              <span className="font-semibold text-[#000000]">Mfg. Lic. No. R-1970/Ayur (Authoritative Ayush License)</span>
            </div>
          </AdminCard>

          {/* Section 2: Tax & GST Configuration */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">2. Tax & GST Accounting Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">GST Registration Mode *</label>
                <select
                  value={taxSettings.tax_mode}
                  onChange={(e) => setTaxSettings({ ...taxSettings, tax_mode: e.target.value as any })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs bg-[#ffffff]"
                >
                  <option value="UNCONFIGURED">UNCONFIGURED (Blocked)</option>
                  <option value="GST_REGISTERED">GST Registered (Tax Invoice)</option>
                  <option value="COMPOSITION">Composition Scheme (Bill of Supply)</option>
                  <option value="NON_GST">Non-GST / Exempt (Bill of Supply)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Pricing Tax Mode</label>
                <select
                  value={taxSettings.pricing_tax_mode || 'TAX_INCLUSIVE'}
                  onChange={(e) => setTaxSettings({ ...taxSettings, pricing_tax_mode: e.target.value as any })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs bg-[#ffffff]"
                >
                  <option value="TAX_INCLUSIVE">TAX INCLUSIVE (MRP includes GST)</option>
                  <option value="TAX_EXCLUSIVE">TAX EXCLUSIVE (GST added on top)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Supplier GSTIN (15 Digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 37AAAAA0000A1Z5"
                  value={taxSettings.gstin || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, gstin: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Default HSN Code</label>
                <input
                  type="text"
                  placeholder="e.g. 30049011"
                  value={taxSettings.default_hsn_code || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, default_hsn_code: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Default Product GST Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxSettings.default_gst_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, default_gst_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Delivery Charge GST Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={taxSettings.delivery_gst_rate}
                  onChange={(e) => setTaxSettings({ ...taxSettings, delivery_gst_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </AdminCard>

          {/* Section 3: Registered Business Address */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">3. Registered Business Address</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  placeholder="D. No. 1-2-211, Prakash Nagar"
                  value={taxSettings.registered_address_line1 || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, registered_address_line1: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Narsipatnam, Anakapalli Dist"
                  value={taxSettings.registered_address_line2 || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, registered_address_line2: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">City *</label>
                <input
                  type="text"
                  placeholder="Narsipatnam"
                  value={taxSettings.city || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, city: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">State *</label>
                <input
                  type="text"
                  placeholder="Andhra Pradesh"
                  value={taxSettings.state || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, state: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">State Code (2 Digits) *</label>
                <input
                  type="text"
                  placeholder="37"
                  maxLength={2}
                  value={taxSettings.state_code || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, state_code: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Pincode *</label>
                <input
                  type="text"
                  placeholder="531116"
                  maxLength={6}
                  value={taxSettings.postal_code || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, postal_code: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </AdminCard>

          {/* Section 4: Document Prefixes & Terms */}
          <AdminCard className="space-y-4">
            <div className="border-b border-[#f4f4f0] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">4. Invoice Prefixes & Support Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#000000] mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={taxSettings.invoice_prefix || 'SSP'}
                  onChange={(e) => setTaxSettings({ ...taxSettings, invoice_prefix: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Credit Note Prefix</label>
                <input
                  type="text"
                  value={taxSettings.credit_note_prefix || 'CN'}
                  onChange={(e) => setTaxSettings({ ...taxSettings, credit_note_prefix: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Support Email</label>
                <input
                  type="email"
                  value={taxSettings.support_email || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, support_email: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#000000] mb-1">Support Phone</label>
                <input
                  type="text"
                  value={taxSettings.support_phone || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, support_phone: e.target.value })}
                  className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-[#000000] mb-1">Invoice Terms & Conditions</label>
              <textarea
                rows={2}
                value={taxSettings.invoice_terms || ''}
                onChange={(e) => setTaxSettings({ ...taxSettings, invoice_terms: e.target.value })}
                className="w-full p-2.5 border border-[#e4e4e7] rounded-lg text-xs"
              />
            </div>
          </AdminCard>

          {/* Form Action Controls */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="admin-btn-secondary"
            >
              <FloppyDisk size={14} weight="bold" />
              <span>Save Configuration Draft</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsVerifyModalOpen(true)}
              className="admin-btn-primary"
            >
              <ShieldCheck size={14} weight="bold" />
              <span>Verify & Enable Production</span>
            </button>
          </div>
        </form>
      </div>

      {/* Verification Confirmation Modal */}
      <AdminConfirmDialog
        isOpen={isVerifyModalOpen}
        title="Verify & Enable Tax Configuration?"
        message="Verification locks official business details and activates production GST invoice issuance. Are you sure all legal details are accurate?"
        confirmLabel="Confirm & Verify Settings"
        cancelLabel="Cancel"
        onConfirm={handleConfirmVerify}
        onCancel={() => setIsVerifyModalOpen(false)}
      />
    </AdminLayout>
  );
}
