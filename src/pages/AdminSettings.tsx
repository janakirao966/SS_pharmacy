import { useState, useEffect } from 'react';
import { supabase, type DatabaseTaxSettings } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminCard } from '../components/admin/AdminPrimitives';
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

      showToast('Tax configuration draft saved.', 'success');
      await fetchTaxSettings();
    } catch (err: any) {
      console.error('Save tax settings error:', err);
      showToast(err.message || 'Failed to save tax settings.', 'error');
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

      showToast('Tax configuration officially VERIFIED. Production invoice issuance enabled.', 'success');
      setIsVerifyModalOpen(false);
      await fetchTaxSettings();
    } catch (err: any) {
      console.error('Verify tax settings error:', err);
      showToast(err.message || 'Failed to verify tax settings.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-[10px] uppercase font-bold text-[#8A6B29] tracking-wider">System Configuration</h2>
            <h1 className="text-xl font-bold font-display text-[#1D3A28] mt-0.5">Tax, GST & Financial Settings</h1>
          </div>
        </div>

        {/* Tax Configuration Status Card */}
        <AdminCard className={`border-l-4 ${
          taxSettings.configuration_status === 'VERIFIED' ? 'bg-green-50/50 border-l-green-600' :
          taxSettings.configuration_status === 'DRAFT' ? 'bg-amber-50/50 border-l-amber-500' :
          'bg-red-50/50 border-l-red-600'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={24} className="text-[#1D3A28]" />
              <div>
                <h3 className="font-bold text-base text-[#1D3A28] m-0">TAX CONFIGURATION SAFETY GATE</h3>
                <p className="text-xs text-slate-600 m-0">Controls tax calculation rules and document generation for invoices & credit notes.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                taxSettings.configuration_status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                taxSettings.configuration_status === 'DRAFT' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {taxSettings.configuration_status}
              </span>
            </div>
          </div>

          {taxSettings.configuration_status === 'UNCONFIGURED' && (
            <div className="flex items-center gap-2 text-xs text-red-800 bg-red-100/70 p-3 rounded-lg border border-red-200">
              <Warning size={18} className="shrink-0" />
              <span>Tax configuration is incomplete. Production invoice generation is blocked until verified settings are provided.</span>
            </div>
          )}

          <form onSubmit={handleSaveDraft} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">GST Registration Type *</label>
                <select
                  value={taxSettings.tax_mode}
                  onChange={(e) => setTaxSettings({ ...taxSettings, tax_mode: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="UNCONFIGURED">UNCONFIGURED (Blocked)</option>
                  <option value="GST_REGISTERED">GST Registered (Tax Invoice)</option>
                  <option value="COMPOSITION">Composition Scheme (Bill of Supply)</option>
                  <option value="NON_GST">Non-GST / Exempt (Bill of Supply)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pricing Tax Mode</label>
                <select
                  value={taxSettings.pricing_tax_mode || 'TAX_INCLUSIVE'}
                  onChange={(e) => setTaxSettings({ ...taxSettings, pricing_tax_mode: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="TAX_INCLUSIVE">TAX INCLUSIVE (MRP includes GST)</option>
                  <option value="TAX_EXCLUSIVE">TAX EXCLUSIVE (GST added on top)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier GSTIN (15 Digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 37AAAAA0000A1Z5"
                  value={taxSettings.gstin || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, gstin: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Legal Registered Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. S.S. Pharmacy Ayurvedic Private Limited"
                  value={taxSettings.legal_business_name || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, legal_business_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trade Name / Brand Name</label>
                <input
                  type="text"
                  value={taxSettings.trade_name || 'S.S. PHARMACY'}
                  onChange={(e) => setTaxSettings({ ...taxSettings, trade_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  placeholder="D. No. 1-2-211, Prakash Nagar"
                  value={taxSettings.registered_address_line1 || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, registered_address_line1: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State Name *</label>
                <input
                  type="text"
                  placeholder="Andhra Pradesh"
                  value={taxSettings.state || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, state: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State Code *</label>
                <input
                  type="text"
                  placeholder="37"
                  value={taxSettings.state_code || ''}
                  onChange={(e) => setTaxSettings({ ...taxSettings, state_code: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5"
              >
                <FloppyDisk size={16} />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsVerifyModalOpen(true)}
                className="bg-[#2D5016] hover:bg-[#1D3A28] text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck size={16} />
                <span>Verify Configuration</span>
              </button>
            </div>
          </form>
        </AdminCard>
      </div>

      {/* Verification Confirmation Modal */}
      <AdminConfirmDialog
        isOpen={isVerifyModalOpen}
        title="Verify & Lock Tax Configuration?"
        message="Verifying tax settings enables production GST invoice generation for all eligible purchase orders. Ensure all legal GSTIN, state code, and address details have been verified by your accountant."
        confirmLabel={isSubmitting ? 'Verifying...' : 'Verify Tax Settings'}
        cancelLabel="Review Draft"
        isDestructive={false}
        onConfirm={handleConfirmVerify}
        onCancel={() => setIsVerifyModalOpen(false)}
      />
    </AdminLayout>
  );
}
